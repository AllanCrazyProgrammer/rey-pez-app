// Chips de 'Medidas del pedido' (editor móvil de embarques).
// Grupos: 'pendiente' (rojo: sin referencia de pedido, o en 0 sin ningún kilo
// pesado) → 'incompleto' (naranja: pedido incompleto, con reporte o sin
// reporte) → 'falta-reportar' (amarillo: pedido completo pero faltan taras
// por reportar) → 'hecho' (verde).
export const ORDEN_GRUPOS_MEDIDA = ['pendiente', 'incompleto', 'falta-reportar', 'hecho'];

export function grupoMedidaMovil(opcion) {
  if (opcion && opcion.cubierto) return 'hecho';
  // En 0, sin nada pesado: rojo, aunque tenga referencia de pedido.
  if (opcion && (opcion.sinPesar || opcion.etiqueta === 'Pendiente')) return 'pendiente';
  if (opcion && opcion.etiqueta === 'Falta reportar' && opcion.pedidoCubierto) return 'falta-reportar';
  if (opcion && (opcion.etiqueta === 'Pendiente · Reportado' || opcion.etiqueta === 'Falta reportar')) return 'incompleto';
  // Algo pesado pero pedido incompleto (incluye el chip de Crudos, sin etiqueta).
  if (opcion && opcion.sinPesar === false) return 'incompleto';
  return 'pendiente';
}

// Orden estable: conserva el orden relativo dentro de cada grupo.
export function ordenarMedidasMovil(opciones) {
  return (opciones || [])
    .map((opcion, i) => ({ opcion: { ...opcion, grupo: grupoMedidaMovil(opcion) }, i }))
    .sort((a, b) => ORDEN_GRUPOS_MEDIDA.indexOf(a.opcion.grupo) - ORDEN_GRUPOS_MEDIDA.indexOf(b.opcion.grupo) || a.i - b.i)
    .map(x => x.opcion);
}
