// Documento de pedido limpio vacío, con los mismos campos que crea la app
// (src/views/Procesos/PedidosLimpio.vue: guardarPedido y los actualizar* que
// hacen addDoc en `pedidos` cuando el día aún no existe). Mantener en sincronía.
function pedidoLimpioVacio(fecha) {
  return {
    fecha,
    tipo: 'limpio',
    otilio: [],
    catarro: [],
    joselito: [],
    ozuna: [],
    lorena: [],
    clientesTemporales: {},
    etiquetas: [],
    etiquetasColores: {},
    rendimientos: {},
    divisores: {},
    completados: {},
    kilosRefrigerados: {}
  };
}

// Campos que agrega el asistente al crear el documento (igual que POST /pedidos/limpio).
function pedidoLimpioNuevoAsistente(fecha, { FieldValue, generarAsistenteId }) {
  return {
    ...pedidoLimpioVacio(fecha),
    createdAt: FieldValue.serverTimestamp(),
    version: 1,
    _asistenteId: generarAsistenteId()
  };
}

// true si el pedido no tiene líneas ni nada capturado: es exactamente el día vacío.
function pedidoLimpioEstaVacio(data) {
  if (!data) return true;
  const vacioObj = v => !v || (typeof v === 'object' && Object.keys(v).length === 0);
  const vacioArr = v => !Array.isArray(v) || v.length === 0;
  return ['otilio', 'catarro', 'joselito', 'ozuna', 'lorena', 'etiquetas'].every(k => vacioArr(data[k]))
    && ['clientesTemporales', 'etiquetasColores', 'rendimientos', 'divisores', 'completados', 'kilosRefrigerados']
      .every(k => vacioObj(data[k]));
}

module.exports = { pedidoLimpioVacio, pedidoLimpioNuevoAsistente, pedidoLimpioEstaVacio };
