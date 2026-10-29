// Destino opcional de una salida de crudo; misma lista que src/utils/destinoSalida.js (la app).
const DESTINOS_SALIDA = ['embarque', 'macuil', 'venta_local', 'otro'];
const DETALLE_MAX = 80;

// {} sin destino, { destino[, destinoDetalle] } o { error }.
function normalizarDestino(destino, detalle) {
  const valor = destino == null ? '' : String(destino).trim();
  if (!valor) return {};
  if (!DESTINOS_SALIDA.includes(valor)) {
    return { error: `El campo "destino" debe ser uno de: ${DESTINOS_SALIDA.join(', ')}` };
  }
  if (valor !== 'otro') {
    if (detalle != null && String(detalle).trim()) return { error: 'El campo "destinoDetalle" solo aplica con destino "otro"' };
    return { destino: valor };
  }
  const texto = detalle == null ? '' : String(detalle).trim();
  if (texto.length > DETALLE_MAX) return { error: `El campo "destinoDetalle" admite hasta ${DETALLE_MAX} caracteres` };
  return texto ? { destino: valor, destinoDetalle: texto } : { destino: valor };
}

module.exports = { DESTINOS_SALIDA, DETALLE_MAX, normalizarDestino };
