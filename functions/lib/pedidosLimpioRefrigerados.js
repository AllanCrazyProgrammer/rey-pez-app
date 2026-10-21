// Mantener esta normalización en sincronía con src/utils/kilosRefrigerados.js.
const normalizarClaveMedida = (valor) => (valor || '')
  .toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[()]/g, ' ')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

function medidasDelPedido(data) {
  const medidas = new Map();
  const procesar = (items, ozuna = false) => {
    if (!Array.isArray(items)) return;
    items.forEach(item => {
      if (!item?.medida) return;
      const etiqueta = item.etiqueta || (item.esSelecta ? 'Selecta' : (item.esHonduras ? 'Honduras' : ''));
      const medida = item.medida + (ozuna && item.esMaquila ? ' Maq' : '') + (etiqueta ? ' ' + etiqueta : '');
      const clave = normalizarClaveMedida(medida);
      if (!medidas.has(clave)) medidas.set(clave, medida);
    });
  };
  ['otilio', 'catarro', 'joselito', 'lorena', 'ozuna'].forEach(cliente => procesar(data[cliente], cliente === 'ozuna'));
  Object.values(data.clientesTemporales || {}).forEach(cliente => procesar(cliente?.pedidos));
  return [...medidas.values()];
}

function crearHandlersRefrigerados({ db, errorResponse }) {
  const fallo = (status, code, message) => { throw { status, code, message }; };
  function selector(datos) {
    const pedidoId = typeof datos.pedidoId === 'string' ? datos.pedidoId.trim() : '';
    const fecha = typeof datos.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha) ? datos.fecha : '';
    if (pedidoId && !pedidoId.includes('/')) return { pedidoId };
    if (fecha) return { fecha };
    fallo(400, 'PEDIDO_O_FECHA_REQUERIDO', 'Debe proporcionar pedidoId válido o fecha en formato YYYY-MM-DD');
  }
  async function buscar(datos, transaction) {
    const seleccion = selector(datos);
    const consulta = seleccion.pedidoId
      ? db.collection('pedidos').doc(seleccion.pedidoId)
      : db.collection('pedidos').where('fecha', '==', seleccion.fecha).where('tipo', '==', 'limpio');
    const resultado = await (transaction ? transaction.get(consulta) : consulta.get());
    const snap = seleccion.pedidoId ? resultado : resultado.docs[0];
    if (!snap?.exists || snap.data().tipo !== 'limpio') {
      fallo(404, 'PEDIDO_NO_ENCONTRADO', 'No se encontró el pedido limpio');
    }
    return snap;
  }
  function respuesta(snap, mapa) {
    return {
      success: true,
      pedidoId: snap.id,
      fecha: snap.data().fecha,
      kilosRefrigerados: mapa,
      totalKilos: Object.values(mapa).reduce((total, kilos) => total + (Number(kilos) || 0), 0),
      medidasPedido: medidasDelPedido(snap.data())
    };
  }
  function error(res, err, metodo) {
    if (err.code && err.status) return errorResponse(res, err.status, err.code, err.message);
    console.error(`Error en ${metodo} /pedidos/limpio/refrigerados:`, err);
    return errorResponse(res, 500, 'ERROR_INTERNO', 'Error inesperado al procesar refrigerados: ' + err.message);
  }
  async function handleGetPedidosLimpioRefrigerados(req, res) {
    try {
      const snap = await buscar(req.query || {});
      return res.json(respuesta(snap, snap.data().kilosRefrigerados || {}));
    } catch (err) { return error(res, err, 'GET'); }
  }
  async function handlePostPedidosLimpioRefrigerados(req, res) {
    try {
      const body = req.body || {};
      selector(body);
      const { medidas, dryRun = false } = body;
      if (typeof dryRun !== 'boolean') fallo(400, 'VALIDACION_ERROR', 'dryRun debe ser boolean');
      if (!medidas || typeof medidas !== 'object') fallo(400, 'VALIDACION_ERROR', 'medidas debe ser un mapa o arreglo no vacío');
      const entradas = Array.isArray(medidas) ? medidas : Object.entries(medidas).map(([medida, kilos]) => ({ medida, kilos }));
      if (!entradas.length || entradas.some(item => !item || typeof item.medida !== 'string' || !normalizarClaveMedida(item.medida)
        || !(item.kilos === null || (typeof item.kilos === 'number' && Number.isFinite(item.kilos) && item.kilos >= 0)))) {
        fallo(400, 'VALIDACION_ERROR', 'Cada medida debe tener una etiqueta y kilos numéricos finitos >= 0 o null');
      }
      const response = await db.runTransaction(async transaction => {
        const snap = await buscar(body, transaction);
        const antes = snap.data().kilosRefrigerados || {};
        let despues = { ...antes };
        const etiquetas = medidasDelPedido(snap.data());
        const cambios = entradas.map(({ medida, kilos }) => {
          medida = medida.trim();
          const normalizada = normalizarClaveMedida(medida);
          const clave = Object.keys(despues).find(k => normalizarClaveMedida(k) === normalizada)
            || etiquetas.find(k => normalizarClaveMedida(k) === normalizada) || medida;
          const anterior = Object.hasOwn(despues, clave) ? despues[clave] : null;
          const borrar = kilos === null || kilos === 0;
          if (borrar) delete despues[clave];
          else despues = { ...despues, [clave]: kilos };
          return { medida, clave, anterior, nuevo: borrar ? null : kilos, accion: borrar ? 'delete' : 'set' };
        });
        if (!dryRun) transaction.update(snap.ref, { kilosRefrigerados: despues });
        return { ...respuesta(snap, despues), dryRun, antes, despues, cambios };
      });
      return res.json(response);
    } catch (err) { return error(res, err, 'POST'); }
  }
  return { handleGetPedidosLimpioRefrigerados, handlePostPedidosLimpioRefrigerados };
}

module.exports = { normalizarClaveMedida, crearHandlersRefrigerados };
