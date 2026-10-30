// Chips de 'Medidas del pedido' (editor móvil de embarques).
// Grupos: 'pendiente' (rojo) → 'falta-reportar' (amarillo: kilos/taras del pedido
// completos pero faltan taras por reportar) → 'hecho' (verde).
// 'Falta reportar' con el pedido aún incompleto sigue siendo pendiente.
export const ORDEN_GRUPOS_MEDIDA = ['pendiente', 'falta-reportar', 'hecho'];

export function grupoMedidaMovil(opcion) {
  if (opcion && opcion.cubierto) return 'hecho';
  if (opcion && opcion.etiqueta === 'Falta reportar' && opcion.pedidoCubierto) return 'falta-reportar';
  return 'pendiente';
}

// Orden estable: conserva el orden relativo dentro de cada grupo.
export function ordenarMedidasMovil(opciones) {
  return (opciones || [])
    .map((opcion, i) => ({ opcion: { ...opcion, grupo: grupoMedidaMovil(opcion) }, i }))
    .sort((a, b) => ORDEN_GRUPOS_MEDIDA.indexOf(a.opcion.grupo) - ORDEN_GRUPOS_MEDIDA.indexOf(b.opcion.grupo) || a.i - b.i)
    .map(x => x.opcion);
}
