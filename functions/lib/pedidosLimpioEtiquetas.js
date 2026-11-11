// Botones de etiqueta del pedido limpio del día (etiquetas[] y etiquetasColores{}).
// La app los crea desde el diálogo "Botones de etiqueta" (el botón "+" de cada
// fila). Esta ruta hace lo mismo por API, para que el asistente pueda crearlos
// sin entrar a la app. Poner una etiqueta en una línea ya funciona con
// POST /pedidos/limpio, pero solo si el botón ya existe en el pedido del día.
// Sin ruta de deshacer: quitar un botón que ya usan líneas dejaría etiquetas
// huérfanas; si hace falta quitarlo, se hace desde la app.
const { pedidoLimpioNuevoAsistente } = require('./pedidoLimpioDia');

// Colores del diálogo, en orden: 0 verde, 1 azul, 2 naranja, 3 morado, 4 rojo.
const COLOR_MIN = 0;
const COLOR_MAX = 4;

function crearHandlersEtiquetas({ db, errorResponse, FieldValue, generarAsistenteId }) {
  const OPERACION = 'pedidos_limpio_etiquetas';
  const fallo = (status, code, message) => { throw { status, code, message }; };

  function selector(datos) {
    const fecha = typeof datos.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha) ? datos.fecha : '';
    if (fecha) return { fecha };
    fallo(400, 'FECHA_INVALIDA', 'Debe proporcionar fecha en formato YYYY-MM-DD');
  }

  // Con { crearSiFalta: true } y selección por fecha, si el día no tiene pedido
  // limpio devuelve { nuevo: true, data } con el documento vacío que crea la
  // app (sin escribirlo; solo se escribe al aplicar, como en refrigerados).
  async function buscar(datos, transaction, { crearSiFalta = false } = {}) {
    const seleccion = selector(datos);
    const consulta = db.collection('pedidos').where('fecha', '==', seleccion.fecha).where('tipo', '==', 'limpio');
    const resultado = await (transaction ? transaction.get(consulta) : consulta.get());
    const snap = resultado.docs[0];
    if (!snap?.exists && crearSiFalta) {
      const ref = db.collection('pedidos').doc();
      return { id: ref.id, ref, nuevo: true, data: pedidoLimpioNuevoAsistente(seleccion.fecha, { FieldValue, generarAsistenteId }) };
    }
    if (!snap?.exists || snap.data().tipo !== 'limpio') {
      fallo(404, 'PEDIDO_NO_ENCONTRADO', 'No se encontró el pedido limpio');
    }
    return { id: snap.id, ref: snap.ref, nuevo: false, data: snap.data() };
  }

  function error(res, err, metodo) {
    if (err.code && err.status) return errorResponse(res, err.status, err.code, err.message);
    console.error(`Error en ${metodo} /pedidos/limpio/etiquetas:`, err);
    return errorResponse(res, 500, 'ERROR_INTERNO', 'Error inesperado al crear la etiqueta: ' + err.message);
  }

  async function handlePostPedidosLimpioEtiquetas(req, res) {
    try {
      const body = req.body || {};
      selector(body);
      const { nombre, color = COLOR_MIN, dryRun = false, idempotencyKey } = body;
      if (typeof dryRun !== 'boolean') fallo(400, 'VALIDACION_ERROR', 'dryRun debe ser boolean');
      if (idempotencyKey !== undefined && idempotencyKey !== null
        && (typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.includes('/'))) {
        fallo(400, 'IDEMPOTENCY_KEY_INVALIDA', 'idempotencyKey debe ser un texto no vacío y sin "/"');
      }
      const nombreLimpio = typeof nombre === 'string' ? nombre.trim() : '';
      if (!nombreLimpio || nombreLimpio.length > 80) {
        fallo(400, 'VALIDACION_ERROR', 'nombre debe ser un texto no vacío de máximo 80 caracteres');
      }
      if (!Number.isInteger(color) || color < COLOR_MIN || color > COLOR_MAX) {
        fallo(400, 'VALIDACION_ERROR', 'color debe ser un entero entre 0 y 4 (0 verde, 1 azul, 2 naranja, 3 morado, 4 rojo)');
      }
      const idemRef = idempotencyKey && !dryRun ? db.collection('asistenteIdem').doc(idempotencyKey) : null;
      const response = await db.runTransaction(async transaction => {
        if (idemRef) {
          const idemSnap = await transaction.get(idemRef);
          if (idemSnap.exists) {
            if (idemSnap.data().operation === OPERACION) return idemSnap.data().response;
            fallo(409, 'IDEMPOTENCY_KEY_EN_USO', 'Ese idempotencyKey ya se usó en otra operación');
          }
        }
        const pedido = await buscar(body, transaction, { crearSiFalta: true });
        const etiquetasAntes = Array.isArray(pedido.data.etiquetas) ? [...pedido.data.etiquetas] : [];
        const coloresAntes = { ...(pedido.data.etiquetasColores || {}) };
        const yaExiste = etiquetasAntes.includes(nombreLimpio);
        const etiquetasDespues = yaExiste ? etiquetasAntes : [...etiquetasAntes, nombreLimpio];
        const coloresDespues = { ...coloresAntes };
        if (!yaExiste) coloresDespues[nombreLimpio] = color;
        const resp = {
          success: true,
          pedidoId: pedido.id,
          fecha: pedido.data.fecha,
          nombre: nombreLimpio,
          color: coloresDespues[nombreLimpio],
          accion: yaExiste ? 'existe' : 'crear',
          pedidoCreado: pedido.nuevo,
          dryRun,
          antes: { etiquetas: etiquetasAntes, etiquetasColores: coloresAntes },
          despues: { etiquetas: etiquetasDespues, etiquetasColores: coloresDespues },
          etiquetas: etiquetasDespues,
          etiquetasColores: coloresDespues
        };
        if (dryRun) return resp;
        if (pedido.nuevo) {
          transaction.set(pedido.ref, { ...pedido.data, etiquetas: etiquetasDespues, etiquetasColores: coloresDespues });
        } else {
          transaction.update(pedido.ref, { etiquetas: etiquetasDespues, etiquetasColores: coloresDespues });
        }
        transaction.set(db.collection('asistenteLog').doc(), {
          operation: OPERACION,
          timestamp: FieldValue.serverTimestamp(),
          idempotencyKey: idempotencyKey || null,
          pedidoId: pedido.id,
          fecha: pedido.data.fecha,
          pedidoCreado: pedido.nuevo,
          _asistenteId: pedido.nuevo ? pedido.data._asistenteId : null,
          nombre: nombreLimpio,
          color: coloresDespues[nombreLimpio],
          accion: yaExiste ? 'existe' : 'crear',
          before: { etiquetas: etiquetasAntes, etiquetasColores: coloresAntes },
          after: { etiquetas: etiquetasDespues, etiquetasColores: coloresDespues }
        });
        if (idemRef) {
          transaction.set(idemRef, { operation: OPERACION, timestamp: FieldValue.serverTimestamp(), response: resp });
        }
        return resp;
      });
      return res.json(response);
    } catch (err) { return error(res, err, 'POST'); }
  }

  return { handlePostPedidosLimpioEtiquetas };
}

module.exports = { crearHandlersEtiquetas };
