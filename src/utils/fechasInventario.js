import { normalizarFechaValor } from './dateUtils';

// Fecha de calendario compartida por las pantallas y el guardado de inventarios.
export function fechaRegistro(valor) {
  if (!valor) return null;
  if (typeof valor === 'string') return normalizarFechaValor(valor);
  try {
    const segundos = valor.seconds ?? valor._seconds;
    const date = typeof valor.toDate === 'function' ? valor.toDate() : typeof segundos === 'number' ? new Date(segundos * 1000) : valor;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const parte = tipo => partes.find(p => p.type === tipo).value;
    return `${parte('year')}-${parte('month')}-${parte('day')}`;
  } catch (_) { return null; }
}
