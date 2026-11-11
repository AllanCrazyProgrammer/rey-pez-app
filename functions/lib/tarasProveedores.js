// Registro de Taras por Proveedor (tarasProveedores + subcolección movimientos).
// Controla el préstamo/devolución de las taras FÍSICAS (canastas) y sus tapas
// por proveedor. Cargo (+) = el proveedor deja taras en Rey Pez (se le deben);
// abono (−) = se le devuelven. Taras y tapas por separado.
// La pantalla /procesos/taras (Taras.vue) escribe directo en Firestore; estas
// rutas hacen lo mismo por API, para que el asistente pueda registrar
// movimientos sin entrar a la app. No tiene relación con pedidos, salidas,
// embarques ni cuentas: un movimiento aquí no mueve ni un kilo.
// A diferencia de la app, el movimiento y la actualización del saldo van en
// una sola transacción (la app hace dos escrituras separadas).
// Sin ruta de deshacer: quitar o corregir un movimiento se hace desde la app
// (editar/eliminar ajusta el saldo por la diferencia o resta el firmado).

function crearHandlersTaras({ db, errorResponse, FieldValue, generarAsistenteId }) {
  const OPERACION = 'taras_movimiento';
  const fallo = (status, code, message, details) => { throw { status, code, message, details }; };

  function hoyMexico() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
  }

  function validarFecha(fecha) {
    if (fecha === undefined || fecha === null || fecha === '') return hoyMexico();
    if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      fallo(400, 'FECHA_INVALIDA', 'fecha debe ser YYYY-MM-DD');
    }
    return fecha;
  }

  function validarEntero(valor, nombre) {
    if (valor === undefined || valor === null) return 0;
    if (!Number.isInteger(valor) || valor < 0) {
      fallo(400, 'VALIDACION_ERROR', `${nombre} debe ser un entero mayor o igual a 0`);
    }
    return valor;
  }

  async function buscarProveedor(nombre, transaction) {
    const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';
    if (!nombreLimpio) fallo(400, 'VALIDACION_ERROR', 'proveedor debe ser un texto no vacío');
    const consulta = db.collection('tarasProveedores');
    const resultado = await (transaction ? transaction.get(consulta) : consulta.get());
    const docs = resultado.docs.filter(d => {
      const n = d.data().nombre;
      return typeof n === 'string' && n.trim().toLowerCase() === nombreLimpio.toLowerCase();
    });
    if (!docs.length) {
      const nombres = resultado.docs
        .map(d => d.data().nombre)
        .filter(n => typeof n === 'string')
        .sort((a, b) => a.localeCompare(b));
      fallo(404, 'TARAS_PROVEEDOR_NO_ENCONTRADO',
        `No existe un proveedor de taras llamado "${nombreLimpio}"`, { proveedores: nombres });
    }
    const snap = docs[0];
    return { id: snap.id, ref: snap.ref, data: snap.data() };
  }

  function error(res, err, metodo) {
    if (err.code && err.status) return errorResponse(res, err.status, err.code, err.message, err.details);
    console.error(`Error en ${metodo} /taras:`, err);
    return errorResponse(res, 500, 'ERROR_INTERNO', 'Error inesperado en taras: ' + err.message);
  }

  async function handleGetTaras(req, res) {
    try {
      const snap = await db.collection('tarasProveedores').orderBy('nombre', 'asc').get();
      const proveedores = [];
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const movSnap = await db.collection('tarasProveedores')
          .doc(docSnap.id).collection('movimientos').orderBy('fecha', 'asc').get();
        const movimientos = movSnap.docs.map(m => ({ id: m.id, ...m.data() }));
        movimientos.sort((a, b) => {
          if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
          const ca = a.createdAt?._seconds ?? 0;
          const cb = b.createdAt?._seconds ?? 0;
          return ca - cb;
        });
        const sumaTaras = movimientos.reduce((s, m) => s + (Number(m.taras) || 0), 0);
        const sumaTapas = movimientos.reduce((s, m) => s + (Number(m.tapas) || 0), 0);
        const saldoTarasActual = Number(data.saldoTarasActual ?? data.saldoActual) || 0;
        const saldoTapasActual = Number(data.saldoTapasActual) || 0;
        proveedores.push({
          id: docSnap.id,
          nombre: data.nombre,
          contacto: data.contacto || '',
          saldoTarasActual,
          saldoTapasActual,
          saldoActual: Number(data.saldoActual) || 0,
          sumaMovimientosTaras: sumaTaras,
          sumaMovimientosTapas: sumaTapas,
          saldoCuadra: saldoTarasActual === sumaTaras && saldoTapasActual === sumaTapas,
          movimientos
        });
      }
      return res.json({ success: true, fecha: hoyMexico(), proveedores });
    } catch (err) { return error(res, err, 'GET'); }
  }

  async function handlePostTarasMovimiento(req, res) {
    try {
      const body = req.body || {};
      const fecha = validarFecha(body.fecha);
      const { proveedor, tipo, dryRun = false, idempotencyKey } = body;
      if (typeof dryRun !== 'boolean') fallo(400, 'VALIDACION_ERROR', 'dryRun debe ser boolean');
      if (idempotencyKey !== undefined && idempotencyKey !== null
        && (typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.includes('/'))) {
        fallo(400, 'IDEMPOTENCY_KEY_INVALIDA', 'idempotencyKey debe ser un texto no vacío y sin "/"');
      }
      if (tipo !== 'cargo' && tipo !== 'abono') {
        fallo(400, 'VALIDACION_ERROR', 'tipo debe ser "cargo" o "abono"');
      }
      const taras = validarEntero(body.taras, 'taras');
      const tapas = validarEntero(body.tapas, 'tapas');
      if (taras <= 0 && tapas <= 0) {
        fallo(400, 'VALIDACION_ERROR', 'Debes capturar al menos taras o tapas');
      }
      const signo = tipo === 'cargo' ? 1 : -1;
      const tarasFirmadas = taras * signo;
      const tapasFirmadas = tapas * signo;

      const idemRef = idempotencyKey && !dryRun ? db.collection('asistenteIdem').doc(idempotencyKey) : null;
      const response = await db.runTransaction(async transaction => {
        if (idemRef) {
          const idemSnap = await transaction.get(idemRef);
          if (idemSnap.exists) {
            if (idemSnap.data().operation === OPERACION) return idemSnap.data().response;
            fallo(409, 'IDEMPOTENCY_KEY_EN_USO', 'Ese idempotencyKey ya se usó en otra operación');
          }
        }
        const prov = await buscarProveedor(proveedor, transaction);
        const saldoTarasAntes = Number(prov.data.saldoTarasActual ?? prov.data.saldoActual) || 0;
        const saldoTapasAntes = Number(prov.data.saldoTapasActual) || 0;
        const saldoTarasDespues = saldoTarasAntes + tarasFirmadas;
        const saldoTapasDespues = saldoTapasAntes + tapasFirmadas;
        const advertencia = (saldoTarasDespues < 0 || saldoTapasDespues < 0)
          ? `El ${tipo} deja el saldo en negativo (taras ${saldoTarasDespues}, tapas ${saldoTapasDespues}). La app lo permite, pero verifica que sea lo que quieres.`
          : null;
        const movimientoRef = db.collection('tarasProveedores')
          .doc(prov.id).collection('movimientos').doc();
        const resp = {
          success: true,
          proveedorId: prov.id,
          proveedor: prov.data.nombre,
          movimientoId: movimientoRef.id,
          fecha,
          tipo,
          taras: tarasFirmadas,
          tapas: tapasFirmadas,
          dryRun,
          advertencia,
          antes: { saldoTarasActual: saldoTarasAntes, saldoTapasActual: saldoTapasAntes },
          despues: { saldoTarasActual: saldoTarasDespues, saldoTapasActual: saldoTapasDespues }
        };
        if (dryRun) return resp;
        transaction.set(movimientoRef, {
          fecha,
          tipo,
          taras: tarasFirmadas,
          tapas: tapasFirmadas,
          createdAt: FieldValue.serverTimestamp()
        });
        transaction.update(prov.ref, {
          saldoTarasActual: saldoTarasDespues,
          saldoTapasActual: saldoTapasDespues,
          saldoActual: saldoTarasDespues,
          updatedAt: FieldValue.serverTimestamp()
        });
        transaction.set(db.collection('asistenteLog').doc(), {
          operation: OPERACION,
          timestamp: FieldValue.serverTimestamp(),
          idempotencyKey: idempotencyKey || null,
          proveedorId: prov.id,
          proveedor: prov.data.nombre,
          movimientoId: movimientoRef.id,
          fecha,
          tipo,
          taras: tarasFirmadas,
          tapas: tapasFirmadas,
          _asistenteId: generarAsistenteId ? generarAsistenteId() : null,
          before: { saldoTarasActual: saldoTarasAntes, saldoTapasActual: saldoTapasAntes },
          after: { saldoTarasActual: saldoTarasDespues, saldoTapasActual: saldoTapasDespues }
        });
        if (idemRef) {
          transaction.set(idemRef, { operation: OPERACION, timestamp: FieldValue.serverTimestamp(), response: resp });
        }
        return resp;
      });
      return res.json(response);
    } catch (err) { return error(res, err, 'POST'); }
  }

  return { handleGetTaras, handlePostTarasMovimiento };
}

module.exports = { crearHandlersTaras };
