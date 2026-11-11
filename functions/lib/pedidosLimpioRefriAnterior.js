// Refri del embarque anterior (solo lectura).
// Replica la lógica de src/utils/kilosRefrigerados.js del app (desglosarRefriEmbarques
// y sumarKilosRefriPorMedida): del embarque más reciente anterior a la fecha pedida
// (sin borrador), toma los productos de los clientes llamados "refri" y suma sus
// kilos netos por medida. La página de pedidos lo suma al refrigerado normal del día.
//
// GET /pedidos/limpio/refri-anterior?fecha=YYYY-MM-DD
// Respuesta: { success, fecha (del embarque anterior), fechaPedido, kilosPorMedida,
//   filas: [{ medida, etiqueta, proveedor, tipo, kilos }], totalKilos }
// Sin embarque anterior: kilosPorMedida {}, filas [], totalKilos 0, fecha null.

const { normalizarClaveMedida } = require('./pedidosLimpioRefrigerados');

const redondearUnDecimal = (valor) => Math.round((Number(valor) || 0) * 10) / 10;

// Igual que calcularKilosProductoEmbarque en src/utils/kilosRefrigerados.js.
function calcularKilosProductoEmbarque(producto = {}) {
  if (producto.noSumarKilos) return 0;
  const kilosCapturados = (Array.isArray(producto.kilos) ? producto.kilos : [])
    .reduce((total, kilo) => total + (Number(kilo) || 0), 0);
  const tarasNormales = (Array.isArray(producto.taras) ? producto.taras : [])
    .reduce((total, tara) => total + (Number(tara) || 0), 0);
  if ((producto.tipo || '').toString().trim().toLowerCase() === 'c/h20') {
    const reporteTaras = Array.isArray(producto.reporteTaras) ? producto.reporteTaras : [];
    const reporteBolsas = Array.isArray(producto.reporteBolsas) ? producto.reporteBolsas : [];
    const kilosReporte = reporteTaras.reduce((total, taras, index) => (
      total + (Number(taras) || 0) * (Number(reporteBolsas[index]) || 0)
    ), 0);
    const kilosBase = kilosReporte > 0 ? kilosReporte : kilosCapturados;
    return Math.max(0, redondearUnDecimal(kilosBase * (Number(producto.camaronNeto) || 0.65)));
  }
  const descuentoTaras = producto.restarTaras ? tarasNormales * 3 : 0;
  return Math.max(0, redondearUnDecimal(kilosCapturados - descuentoTaras));
}

// Igual que obtenerProductosRefri en src/utils/kilosRefrigerados.js.
function obtenerProductosRefri(embarque = {}) {
  const clientes = Array.isArray(embarque.clientes) ? embarque.clientes : [];
  const clientesRefri = clientes.filter(
    (cliente) => normalizarClaveMedida(cliente?.nombre) === 'refri'
  );
  if (clientesRefri.length) {
    return clientesRefri.flatMap((cliente) => (
      Array.isArray(cliente.productos) ? cliente.productos : []
    ));
  }
  const idsRefri = new Set(
    (Array.isArray(embarque.clientesPersonalizados) ? embarque.clientesPersonalizados : [])
      .filter((cliente) => normalizarClaveMedida(cliente?.nombre) === 'refri')
      .map((cliente) => (cliente?.id ?? '').toString())
  );
  return (Array.isArray(embarque.productos) ? embarque.productos : []).filter((producto) => {
    const nombreEsRefri = normalizarClaveMedida(producto?.nombreCliente) === 'refri';
    const idEsRefri = idsRefri.has((producto?.clienteId ?? '').toString());
    return nombreEsRefri || idEsRefri;
  });
}

function crearHandlersRefriAnterior({ db, errorResponse }) {
  const fallo = (status, code, message) => { throw { status, code, message }; };

  // Medidas del pedido limpio de la fecha (para resolver la medida del refri a
  // la medida del pedido, igual que sumarKilosRefriPorMedida). Si no hay pedido,
  // se usa la medida tal como viene del embarque.
  async function medidasDelPedido(fecha) {
    const snap = await db.collection('pedidos')
      .where('fecha', '==', fecha).where('tipo', '==', 'limpio').limit(1).get();
    if (snap.empty) return [];
    const data = snap.docs[0].data();
    const medidas = new Map();
    const procesar = (items, ozuna = false) => {
      if (!Array.isArray(items)) return;
      items.forEach((item) => {
        if (!item?.medida) return;
        const etiqueta = item.etiqueta || (item.esSelecta ? 'Selecta' : (item.esHonduras ? 'Honduras' : ''));
        const medida = item.medida + (ozuna && item.esMaquila ? ' Maq' : '') + (etiqueta ? ' ' + etiqueta : '');
        const clave = normalizarClaveMedida(medida);
        if (!medidas.has(clave)) medidas.set(clave, medida);
      });
    };
    ['otilio', 'catarro', 'joselito', 'lorena', 'ozuna'].forEach((cliente) => procesar(data[cliente], cliente === 'ozuna'));
    Object.values(data.clientesTemporales || {}).forEach((cliente) => procesar(cliente?.pedidos));
    return [...medidas.values()];
  }

  function resolverMedida(medidasPedido, medidaFuente) {
    const clave = normalizarClaveMedida(medidaFuente);
    if (!clave) return null;
    const exacta = medidasPedido.find((m) => normalizarClaveMedida(m) === clave);
    if (exacta) return exacta;
    // Coincidencia por prefijo inequívoca (ej. "Golfo" en el pedido vs "Golfo" del refri).
    const candidatas = medidasPedido.filter((m) => normalizarClaveMedida(m).startsWith(clave + ' '));
    if (candidatas.length === 1) return candidatas[0];
    return medidaFuente;
  }

  async function handleGetRefriAnterior(req, res) {
    try {
      const fechaPedido = typeof req.query?.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.fecha)
        ? req.query.fecha : '';
      if (!fechaPedido) fallo(400, 'FECHA_REQUERIDA', 'Debe proporcionar fecha en formato YYYY-MM-DD');

      // Embarque más reciente anterior a la fecha (sin borrador), igual que
      // obtenerEmbarquesDelDiaAnterior en PedidoLimpioImpresion.vue.
      const snap = await db.collection('embarques').get();
      const anteriores = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .map((embarque) => ({ embarque, fecha: typeof embarque.fecha === 'string' ? embarque.fecha : '' }))
        .filter(({ embarque, fecha }) => fecha && fecha < fechaPedido && embarque.borrador !== true);
      if (!anteriores.length) {
        return res.json({
          success: true, fecha: null, fechaPedido,
          kilosPorMedida: {}, filas: [], totalKilos: 0, embarques: 0
        });
      }
      const fechaAnterior = anteriores.reduce((ultima, item) => (
        !ultima || item.fecha > ultima ? item.fecha : ultima
      ), null);
      const embarques = anteriores
        .filter((item) => item.fecha === fechaAnterior)
        .map((item) => item.embarque);

      const medidasPedido = await medidasDelPedido(fechaPedido);
      const filas = [];
      const kilosPorMedida = {};
      const vistos = new Set();
      embarques.forEach((embarque, indiceEmbarque) => {
        const embarqueId = embarque.id || `embarque-${indiceEmbarque}`;
        obtenerProductosRefri(embarque).forEach((producto, indiceProducto) => {
          const id = `${embarqueId}:${producto.id || `producto-${indiceProducto}`}`;
          if (vistos.has(id)) return;
          vistos.add(id);
          const kilos = calcularKilosProductoEmbarque(producto);
          if (!(kilos > 0) || !Number.isFinite(kilos)) return;
          const medidaFuente = producto.nombreAlternativoPDF || producto.medida || 'Sin medida';
          const medida = resolverMedida(medidasPedido, medidaFuente);
          const tipo = (producto.tipo || '').toString().trim();
          filas.push({
            id,
            medida,
            etiqueta: producto.etiqueta || '',
            proveedor: producto.proveedor || '',
            tipo: tipo === 'Otro' ? (producto.tipoPersonalizado || tipo) : tipo,
            kilos
          });
          kilosPorMedida[medida] = redondearUnDecimal((kilosPorMedida[medida] || 0) + kilos);
        });
      });
      const totalKilos = redondearUnDecimal(Object.values(kilosPorMedida).reduce((t, k) => t + (Number(k) || 0), 0));
      return res.json({
        success: true, fecha: fechaAnterior, fechaPedido,
        kilosPorMedida, filas, totalKilos, embarques: embarques.length
      });
    } catch (err) {
      if (err.code && err.status) return errorResponse(res, err.status, err.code, err.message);
      console.error('Error en GET /pedidos/limpio/refri-anterior:', err);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error inesperado al consultar el refri anterior: ' + err.message);
    }
  }

  return { handleGetRefriAnterior };
}

module.exports = { crearHandlersRefriAnterior };
