const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

export function periodoNota(embarque) {
  const fecha = embarque.fecha;
  const date = fecha && typeof fecha.toDate === 'function' ? fecha.toDate()
    : fecha && typeof fecha.seconds === 'number' ? new Date(fecha.seconds * 1000)
      : new Date(fecha);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function nombreArchivoNota(embarque, clientes = []) {
  const ids = new Set((embarque.productos || []).map(p => String(p.clienteId)));
  Object.entries(embarque.clienteCrudos || {}).forEach(([id, crudos]) => {
    if (Array.isArray(crudos) && crudos.length) ids.add(String(id));
  });
  const nombres = clientes.filter(c => ids.has(String(c.id)))
    .map(c => c.nombreNotas || c.nombre).filter(Boolean);
  const cliente = (nombres.join('-') || 'Nota')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'Nota';
  const fecha = embarque.fecha;
  const date = fecha && typeof fecha.toDate === 'function' ? fecha.toDate()
    : fecha && typeof fecha.seconds === 'number' ? new Date(fecha.seconds * 1000)
      : new Date(fecha);
  if (Number.isNaN(date.getTime())) return `${cliente}.pdf`;
  // Las notas muestran la fecha en UTC; el nombre debe usar el mismo día.
  return `${cliente}-${date.getUTCDate()}-${meses[date.getUTCMonth()]}-${String(date.getUTCFullYear()).slice(-2)}.pdf`;
}
