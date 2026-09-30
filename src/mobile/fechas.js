import { normalizarFechaValor } from '@/utils/dateUtils';

// Convertir primero el Timestamp. Nunca sustituir una fecha inválida por hoy.
export function fechaRegistro(valor) {
  if (!valor) return null;
  // Las fechas de calendario conservan el día escrito; los instantes de
  // Firestore se muestran en el día del negocio, incluso cerca de medianoche.
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
export function mostrarFecha(valor, corta = false) {
  const iso = fechaRegistro(valor);
  if (!iso) return 'Sin fecha';
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
    day: 'numeric', month: corta ? 'short' : 'long', year: 'numeric'
  });
}
export const buscarTexto = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
