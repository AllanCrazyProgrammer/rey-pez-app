// Destino opcional de cada salida de crudo (existenciasCrudos/{dia}.salidas[]).
// Sin destino = salida anterior a este campo ("Sin especificar"); no cambia totales ni existencias.
// La misma lista vive en functions/lib/destinoSalida.js (el asistente); test-salidas-destino.cjs exige que coincidan.
export const DESTINOS_SALIDA = [
  { valor: 'embarque', etiqueta: 'Embarque cliente' },
  { valor: 'macuil', etiqueta: 'Macuil' },
  { valor: 'venta_local', etiqueta: 'Venta local' },
  { valor: 'otro', etiqueta: 'Otro' }
];
export const FILTRO_SIN_DESTINO = 'sin_destino';
export const DETALLE_MAX = 80;

const VALORES = DESTINOS_SALIDA.map(d => d.valor);

// Devuelve { destino, destinoDetalle } listo para guardar, {} si no hay destino, o { error }.
export function normalizarDestino(destino, detalle) {
  const valor = destino == null ? '' : String(destino).trim();
  if (!valor) return {};
  if (!VALORES.includes(valor)) return { error: `Destino inválido: ${valor}` };
  if (valor !== 'otro') return { destino: valor };
  const texto = detalle == null ? '' : String(detalle).trim();
  if (texto.length > DETALLE_MAX) return { error: `El detalle del destino admite hasta ${DETALLE_MAX} caracteres` };
  return texto ? { destino: valor, destinoDetalle: texto } : { destino: valor };
}

// Pone (o quita) el destino en una salida sin tocar sus demás campos. Usa `set` (this.$set) si se pasa.
export function aplicarDestino(salida, destino, detalle, set) {
  const r = normalizarDestino(destino, detalle);
  if (r.error) return r;
  const poner = set || ((o, k, v) => { o[k] = v; });
  delete salida.destino;
  delete salida.destinoDetalle;
  if (r.destino) poner(salida, 'destino', r.destino);
  if (r.destinoDetalle) poner(salida, 'destinoDetalle', r.destinoDetalle);
  return r;
}

export function etiquetaDestino(salida) {
  const d = DESTINOS_SALIDA.find(x => x.valor === (salida && salida.destino));
  if (!d) return '';
  return d.valor === 'otro' && salida.destinoDetalle ? `Otro: ${salida.destinoDetalle}` : d.etiqueta;
}

// [{ salida, indice }] donde indice es la posición real en el arreglo (para editar/borrar con filtro activo).
// filtro '' = todas; FILTRO_SIN_DESTINO = sin destino o con un valor desconocido.
export function filtrarPorDestino(salidas, filtro) {
  return (salidas || [])
    .map((salida, indice) => ({ salida, indice }))
    .filter(({ salida }) => {
      if (!filtro) return true;
      const valor = salida && VALORES.includes(salida.destino) ? salida.destino : '';
      return filtro === FILTRO_SIN_DESTINO ? !valor : valor === filtro;
    });
}
