/**
 * Deudas con proveedores de Procesos (colección `deudas`), con la misma forma que guarda
 * src/views/Procesos/NuevaDeuda.vue:
 *   deudas/{id}: { proveedorId, proveedorNombre, fecha 'YYYY-MM-DD', fechaCreacion (Timestamp),
 *                  total, saldoPendiente, estado: 'pendiente'|'pagado' }
 *   deudas/{id}/productos/{pid}: { kilos, producto, precio, total = redondear(kilos * precio) }
 *   deudas/{id}/abonos/{aid}:    { descripcion, monto, fecha, fechaCreacion, esAbonoGeneral }
 * El proveedor sale de `proveedoresDeuda` ({ nombre, color, telefono }). Crear una deuda no toca
 * ninguna otra colección.
 *
 * Importante: la app recalcula total/saldo desde la subcolección `productos` en cada abono
 * (src/utils/deudas.js: mutarDeuda/calcularSaldo/aplicarAbonoGeneral). Una deuda sin productos
 * queda con total 0 al primer abono, así que la API SIEMPRE crea al menos un producto.
 *
 * Igual que las deudas que el asistente ya escribió (asistente-20261023-memo-nota381,
 * asistente-20261024-memo-pacch): id `asistente-YYYYMMDD-<proveedor>-nota<nota>`, campo extra
 * `nota` y productos con id `<deudaId>-p1`, `-p2`...
 */

const OPERACION = 'deudas_create';
const OPERACION_UNDO = 'deudas_undo';
const TOLERANCIA = 0.005;

const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100;

function quitarAcentos(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function clave(nombre) {
  return quitarAcentos(nombre).trim().toLowerCase().replace(/\s+/g, ' ');
}

function slug(texto) {
  return clave(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function fechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

/** calcularSaldo de src/utils/deudas.js. */
function calcularSaldo(productos = [], abonos = []) {
  const total = redondear(productos.reduce((s, p) => s + (Number(p.total) || 0), 0));
  const totalAbonos = redondear(abonos.reduce((s, a) => s + (Number(a.monto) || 0), 0));
  const saldoPendiente = redondear(total - totalAbonos);
  return { total, totalAbonos, saldoPendiente, estado: saldoPendiente > TOLERANCIA ? 'pendiente' : 'pagado' };
}

/** Resumen por proveedor de DeudasMenu.vue: suma de saldoPendiente y notas con saldo > 0. */
function resumenProveedor(deudas) {
  return {
    totalPendiente: deudas.reduce((t, d) => redondear(t + (Number(d.saldoPendiente) || 0)), 0),
    notasPendientes: deudas.filter((d) => (Number(d.saldoPendiente) || 0) > 0).length
  };
}

function aIso(v) {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  return v ?? null;
}

function mismoValor(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function crearHandlersDeudas({ db, FieldValue, errorResponse }) {
  const fallo = (status, code, message, details) => { throw { status, code, message, details }; };

  function manejarError(res, err, ruta) {
    if (err && err.code && err.status) return errorResponse(res, err.status, err.code, err.message, err.details || null);
    console.error(`Error en ${ruta}:`, err);
    return errorResponse(res, 500, 'ERROR_INTERNO', `Error en ${ruta}: ` + (err && err.message));
  }

  /** Busca el proveedor en `proveedoresDeuda` por id o por nombre (exacto, luego sin acentos/mayúsculas). */
  async function resolverProveedor({ proveedor, proveedorId }, transaction) {
    const tieneId = typeof proveedorId === 'string' && proveedorId.trim();
    const tieneNombre = typeof proveedor === 'string' && proveedor.trim();
    if (!tieneId && !tieneNombre) fallo(400, 'PROVEEDOR_REQUERIDO', 'Indica proveedor (nombre) o proveedorId');
    const ref = db.collection('proveedoresDeuda');
    const snap = transaction ? await transaction.get(ref) : await ref.get();
    const lista = snap.docs.map((d) => ({ id: d.id, nombre: d.data().nombre }))
      .filter((p) => typeof p.nombre === 'string' && p.nombre.trim());
    let porId = null;
    if (tieneId) {
      porId = lista.find((p) => p.id === proveedorId.trim());
      if (!porId) fallo(400, 'PROVEEDOR_DESCONOCIDO', `No existe el proveedor con id "${proveedorId}" en proveedoresDeuda`, { proveedores: lista });
    }
    if (tieneNombre) {
      const porNombre = lista.find((p) => p.nombre.trim() === proveedor.trim())
        || lista.find((p) => clave(p.nombre) === clave(proveedor));
      if (!porNombre) fallo(400, 'PROVEEDOR_DESCONOCIDO', `El proveedor "${proveedor}" no está en proveedoresDeuda`, { proveedores: lista });
      if (porId && porId.id !== porNombre.id) {
        fallo(400, 'PROVEEDOR_NO_COINCIDE', `proveedorId ${porId.id} es "${porId.nombre}", no "${proveedor}"`, { proveedorId: porId.id, nombre: porId.nombre });
      }
      return porNombre;
    }
    return porId;
  }

  function validarCuerpo(body) {
    const { fecha, total, lineas, dryRun = false, idempotencyKey } = body;
    if (typeof dryRun !== 'boolean') fallo(400, 'VALIDACION_ERROR', 'dryRun debe ser boolean');
    if (idempotencyKey !== undefined && idempotencyKey !== null
      && (typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.includes('/'))) {
      fallo(400, 'IDEMPOTENCY_KEY_INVALIDA', 'idempotencyKey debe ser un texto no vacío y sin "/"');
    }
    if (!dryRun && !idempotencyKey) {
      fallo(400, 'IDEMPOTENCY_KEY_REQUERIDA', 'idempotencyKey es requerido para crear la deuda (sirve para reintentos y para deshacer)');
    }
    if (!fechaValida(fecha)) fallo(400, 'FECHA_INVALIDA', 'fecha es requerida en formato YYYY-MM-DD');
    const notaEntrada = body.nota ?? body.referencia;
    const nota = (typeof notaEntrada === 'number' && Number.isFinite(notaEntrada)) ? String(notaEntrada)
      : (typeof notaEntrada === 'string' ? notaEntrada.trim() : '');
    if (!nota || nota.length > 60 || !slug(nota)) fallo(400, 'NOTA_REQUERIDA', 'nota (o referencia) es requerida: el número de nota del proveedor');
    if (body.nota != null && body.referencia != null && String(body.nota).trim() !== String(body.referencia).trim()) {
      fallo(400, 'VALIDACION_ERROR', 'nota y referencia no coinciden; manda solo una');
    }

    let productos;
    if (lineas !== undefined && lineas !== null) {
      if (!Array.isArray(lineas) || !lineas.length) fallo(400, 'LINEAS_INVALIDAS', 'lineas debe ser un arreglo no vacío');
      // validarProducto de src/utils/deudas.js: nombre, kilos > 0, precio > 0.
      productos = lineas.map((l, i) => {
        const producto = l && typeof l.producto === 'string' ? l.producto.trim() : '';
        if (!producto) fallo(400, 'LINEA_INVALIDA', `lineas[${i}].producto es requerido`);
        if (typeof l.kg !== 'number' || !(l.kg > 0)) fallo(400, 'LINEA_INVALIDA', `lineas[${i}].kg debe ser un número > 0`);
        if (typeof l.precio !== 'number' || !(l.precio > 0)) fallo(400, 'LINEA_INVALIDA', `lineas[${i}].precio debe ser un número > 0`);
        return { kilos: l.kg, producto, precio: l.precio, total: redondear(l.kg * l.precio) };
      });
    }
    if (total !== undefined && total !== null && (typeof total !== 'number' || !(total > 0))) {
      fallo(400, 'TOTAL_INVALIDO', 'total debe ser un número > 0');
    }
    if (!productos) {
      if (total === undefined || total === null) fallo(400, 'TOTAL_REQUERIDO', 'Manda total o lineas');
      // La app necesita al menos un producto para calcular el saldo: una línea de 1 × total.
      const nombre = typeof body.producto === 'string' && body.producto.trim() ? body.producto.trim() : `Nota ${nota}`;
      productos = [{ kilos: 1, producto: nombre, precio: redondear(total), total: redondear(total) }];
    }
    const saldo = calcularSaldo(productos, []);
    if (total !== undefined && total !== null && Math.abs(saldo.total - redondear(total)) > TOLERANCIA) {
      fallo(400, 'TOTAL_NO_CUADRA', `La suma de lineas es ${saldo.total} y total es ${total}`, { sumaLineas: saldo.total, total });
    }
    return { fecha, nota, productos, saldo, dryRun, idempotencyKey: idempotencyKey || null };
  }

  async function deudasDelProveedor(proveedorId, transaction) {
    const q = db.collection('deudas').where('proveedorId', '==', proveedorId);
    const snap = transaction ? await transaction.get(q) : await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async function handlePostDeudas(req, res) {
    try {
      const body = req.body || {};
      const datos = validarCuerpo(body);
      const idemRef = datos.idempotencyKey ? db.collection('asistenteIdem').doc(datos.idempotencyKey) : null;
      const ahora = new Date();

      const response = await db.runTransaction(async (transaction) => {
        if (idemRef && !datos.dryRun) {
          const idemSnap = await transaction.get(idemRef);
          if (idemSnap.exists) {
            if (idemSnap.data().operation === OPERACION) return { ...idemSnap.data().response, replay: true };
            fallo(409, 'IDEMPOTENCY_KEY_EN_USO', 'Ese idempotencyKey ya se usó en otra operación');
          }
        }
        const proveedor = await resolverProveedor(body, transaction);
        const deudas = await deudasDelProveedor(proveedor.id, transaction);
        const duplicada = deudas.find((d) => d.nota != null && String(d.nota).trim() === datos.nota);
        if (duplicada) {
          fallo(409, 'DEUDA_DUPLICADA', `${proveedor.nombre} ya tiene una deuda con la nota ${datos.nota}`, {
            deudaId: duplicada.id, fecha: duplicada.fecha, saldoPendiente: duplicada.saldoPendiente, estado: duplicada.estado
          });
        }
        let deudaId = `asistente-${datos.fecha.replace(/-/g, '')}-${slug(proveedor.nombre).split('-')[0]}-nota${slug(datos.nota)}`;
        if ((await transaction.get(db.collection('deudas').doc(deudaId))).exists) {
          deudaId = `${deudaId}-${slug(proveedor.id).slice(0, 8)}`;
          if ((await transaction.get(db.collection('deudas').doc(deudaId))).exists) {
            fallo(409, 'DEUDA_ID_EN_USO', `Ya existe el documento deudas/${deudaId}`);
          }
        }
        const deudaRef = db.collection('deudas').doc(deudaId);
        const documento = {
          proveedorId: proveedor.id,
          proveedorNombre: proveedor.nombre,
          fecha: datos.fecha,
          fechaCreacion: ahora,
          total: datos.saldo.total,
          saldoPendiente: datos.saldo.saldoPendiente,
          estado: datos.saldo.estado,
          nota: datos.nota
        };
        const productos = datos.productos.map((p, i) => ({ id: `${deudaId}-p${i + 1}`, ...p }));
        const antes = resumenProveedor(deudas);
        const despues = resumenProveedor([...deudas, documento]);
        const resp = {
          success: true,
          operation: OPERACION,
          dryRun: datos.dryRun,
          deudaId: datos.dryRun ? null : deudaId,
          proveedor: { id: proveedor.id, nombre: proveedor.nombre },
          deuda: { ...documento, fechaCreacion: ahora.toISOString() },
          productos,
          pendienteProveedor: {
            descripcion: 'Suma de saldoPendiente de las deudas del proveedor (como DeudasMenu)',
            antes: antes.totalPendiente,
            despues: despues.totalPendiente,
            notasPendientesAntes: antes.notasPendientes,
            notasPendientesDespues: despues.notasPendientes
          }
        };
        if (datos.dryRun) return { ...resp, message: 'Simulación exitosa (sin escribir a Firestore)' };

        transaction.set(deudaRef, documento);
        for (const { id, ...p } of productos) transaction.set(deudaRef.collection('productos').doc(id), p);
        transaction.set(db.collection('asistenteLog').doc(), {
          operation: OPERACION,
          timestamp: FieldValue.serverTimestamp(),
          idempotencyKey: datos.idempotencyKey,
          deudaId,
          proveedorId: proveedor.id,
          proveedorNombre: proveedor.nombre,
          nota: datos.nota,
          after: documento,
          productos,
          request: {
            proveedor: body.proveedor ?? null, proveedorId: body.proveedorId ?? null, fecha: body.fecha,
            nota: body.nota ?? null, referencia: body.referencia ?? null, total: body.total ?? null,
            lineas: body.lineas ?? null, producto: body.producto ?? null
          }
        });
        transaction.set(idemRef, { operation: OPERACION, timestamp: FieldValue.serverTimestamp(), response: resp });
        return resp;
      });
      return res.json(response);
    } catch (err) {
      return manejarError(res, err, 'POST /deudas');
    }
  }

  function resumenDeuda(d) {
    return {
      id: d.id,
      proveedorId: d.proveedorId,
      proveedorNombre: d.proveedorNombre,
      fecha: d.fecha,
      nota: d.nota ?? null,
      total: Number(d.total) || 0,
      saldoPendiente: Number(d.saldoPendiente) || 0,
      estado: d.estado,
      fechaCreacion: aIso(d.fechaCreacion),
      creadaPorAsistente: String(d.id).startsWith('asistente-')
    };
  }

  async function handleGetDeudas(req, res) {
    try {
      const q = req.query || {};
      const soloPendientes = String(q.pendientes || '') === 'true';
      const porFecha = (a, b) => String(b.fecha || '').localeCompare(String(a.fecha || ''));
      if (q.proveedor || q.proveedorId) {
        const proveedor = await resolverProveedor({ proveedor: q.proveedor, proveedorId: q.proveedorId });
        const deudas = (await deudasDelProveedor(proveedor.id)).map(resumenDeuda).sort(porFecha);
        const r = resumenProveedor(deudas);
        return res.json({
          success: true,
          proveedor: { id: proveedor.id, nombre: proveedor.nombre },
          totalPendiente: r.totalPendiente,
          notasPendientes: r.notasPendientes,
          descripcion: 'totalPendiente = suma de saldoPendiente de las deudas del proveedor (igual que DeudasMenu)',
          totalDeudas: deudas.length,
          deudas: soloPendientes ? deudas.filter((d) => d.saldoPendiente > 0) : deudas
        });
      }
      const [deudasSnap, provSnap] = await Promise.all([db.collection('deudas').get(), db.collection('proveedoresDeuda').get()]);
      const deudas = deudasSnap.docs.map((d) => resumenDeuda({ id: d.id, ...d.data() })).sort(porFecha);
      const proveedores = provSnap.docs.map((d) => {
        const r = resumenProveedor(deudas.filter((x) => x.proveedorId === d.id));
        return { id: d.id, nombre: d.data().nombre, ...r };
      }).sort((a, b) => b.totalPendiente - a.totalPendiente || String(a.nombre).localeCompare(String(b.nombre)));
      return res.json({
        success: true,
        // Existencias.vue: suma de saldoPendiente de las deudas con estado 'pendiente'.
        saldoPendienteDeudas: redondear(deudas.filter((d) => d.estado === 'pendiente').reduce((s, d) => s + d.saldoPendiente, 0)),
        proveedores,
        totalDeudas: deudas.length,
        deudas: soloPendientes ? deudas.filter((d) => d.saldoPendiente > 0) : deudas
      });
    } catch (err) {
      return manejarError(res, err, 'GET /deudas');
    }
  }

  async function handlePostDeudasDeshacer(req, res) {
    try {
      const { idempotencyKey, undoIdempotencyKey, dryRun = false } = req.body || {};
      if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.includes('/')) {
        fallo(400, 'IDEMPOTENCY_KEY_REQUERIDA', 'Indica el idempotencyKey de la deuda a deshacer');
      }
      if (typeof dryRun !== 'boolean') fallo(400, 'VALIDACION_ERROR', 'dryRun debe ser boolean');
      const undoKey = undoIdempotencyKey || `undo:${idempotencyKey}`;
      if (typeof undoKey !== 'string' || undoKey.includes('/')) {
        fallo(400, 'UNDO_IDEMPOTENCY_KEY_INVALIDA', 'undoIdempotencyKey no puede contener "/"');
      }
      const undoRef = db.collection('asistenteIdem').doc(undoKey);
      const undoSnap = await undoRef.get();
      if (undoSnap.exists) {
        if (undoSnap.data().operation === OPERACION_UNDO) return res.json(undoSnap.data().response);
        fallo(409, 'IDEMPOTENCY_KEY_EN_USO', 'Ese undoIdempotencyKey ya se usó en otra operación');
      }
      const logs = await db.collection('asistenteLog').where('idempotencyKey', '==', idempotencyKey).get();
      const original = logs.docs.map((d) => ({ id: d.id, ...d.data() })).find((l) => l.operation === OPERACION);
      if (!original) fallo(404, 'OPERACION_NO_ENCONTRADA', 'No se encontró una deuda creada por el asistente con ese idempotencyKey');
      if (logs.docs.some((d) => d.data().operation === OPERACION_UNDO)) fallo(400, 'YA_DESHECHO', 'Esta deuda ya fue deshecha');

      const response = await db.runTransaction(async (transaction) => {
        const undoActual = await transaction.get(undoRef);
        if (undoActual.exists && undoActual.data().operation === OPERACION_UNDO) return undoActual.data().response;
        const deudaRef = db.collection('deudas').doc(original.deudaId);
        const snap = await transaction.get(deudaRef);
        if (!snap.exists) fallo(404, 'DEUDA_NO_ENCONTRADA', `La deuda ${original.deudaId} ya no existe`);
        const prodSnap = await transaction.get(deudaRef.collection('productos'));
        const abonosSnap = await transaction.get(deudaRef.collection('abonos'));
        const actual = snap.data();
        const campos = ['proveedorId', 'proveedorNombre', 'fecha', 'total', 'saldoPendiente', 'estado', 'nota'];
        const cambiados = campos.filter((c) => !mismoValor(actual[c], original.after[c]));
        if (actual.fechaActualizacion) cambiados.push('fechaActualizacion');
        if (!abonosSnap.empty) cambiados.push('abonos');
        const productosActuales = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.id.localeCompare(b.id));
        const productosOriginales = [...original.productos].sort((a, b) => a.id.localeCompare(b.id));
        const normal = (p) => ({ id: p.id, kilos: p.kilos, producto: p.producto, precio: p.precio, total: p.total });
        if (!mismoValor(productosActuales.map(normal), productosOriginales.map(normal))) cambiados.push('productos');
        if (cambiados.length) {
          fallo(409, 'DEUDA_MODIFICADA', 'La deuda tiene abonos o cambios después de crearla. No se puede deshacer.', {
            deudaId: original.deudaId, camposCambiados: cambiados, abonos: abonosSnap.size
          });
        }
        const resp = {
          success: true,
          operation: OPERACION_UNDO,
          dryRun,
          deudaId: original.deudaId,
          proveedor: { id: original.proveedorId, nombre: original.proveedorNombre },
          nota: original.nota,
          deudaEliminada: !dryRun,
          productosEliminados: dryRun ? 0 : prodSnap.size
        };
        if (dryRun) return resp;
        prodSnap.docs.forEach((d) => transaction.delete(d.ref));
        transaction.delete(deudaRef);
        transaction.set(db.collection('asistenteLog').doc(), {
          operation: OPERACION_UNDO,
          timestamp: FieldValue.serverTimestamp(),
          idempotencyKey,
          undoIdempotencyKey: undoKey,
          originalIdempotencyKey: idempotencyKey,
          originalLogId: original.id,
          deudaId: original.deudaId,
          proveedorId: original.proveedorId,
          before: { ...actual, fechaCreacion: aIso(actual.fechaCreacion) },
          productos: productosActuales
        });
        transaction.set(undoRef, { operation: OPERACION_UNDO, timestamp: FieldValue.serverTimestamp(), response: resp });
        return resp;
      });
      return res.json(response);
    } catch (err) {
      return manejarError(res, err, 'POST /deudas/deshacer');
    }
  }

  return { handlePostDeudas, handleGetDeudas, handlePostDeudasDeshacer };
}

module.exports = { crearHandlersDeudas, calcularSaldoDeuda: calcularSaldo };
