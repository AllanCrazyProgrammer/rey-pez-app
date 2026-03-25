/**
 * Cálculo de saldos de nota de venta alineado con SaleNote.vue:
 * mismo orden temporal, isPaid y fórmula de "Nuevo saldo acumulado" sobre la última nota.
 */

import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

/** Misma lógica que grandTotal en SaleNote (fila no en edición: suma de product.total). */
export function lineTotalProductoNotaVenta(p) {
  if (p == null) return 0;
  if (p.total != null && p.total !== '') {
    const t = Number(p.total);
    if (!Number.isNaN(t)) return t;
  }
  return (Number(p.kilos) || 0) * (Number(p.pricePerKilo) || 0);
}

/**
 * Marca de tiempo para ordenar notas; coherente con fechas del DatePicker (es) e ISO.
 */
function parseNoteFieldTimeMs(v) {
  if (v == null || v === '') return 0;
  // Firestore Timestamp compat: { toDate() } o { seconds, nanoseconds }
  if (typeof v === 'object') {
    if (typeof v.toDate === 'function') {
      const d = v.toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d.getTime();
    }
    if (typeof v.seconds === 'number') {
      const ms = (v.seconds * 1000) + (Number(v.nanoseconds || 0) / 1e6);
      if (!Number.isNaN(ms)) return ms;
    }
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const m = moment(v, 'YYYY-MM-DD', true);
    return m.isValid() ? m.valueOf() : 0;
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.getTime();
  }
  const parsed = moment(v, ['YYYY-MM-DD', 'DD MMMM YYYY', moment.ISO_8601], 'es', true);
  if (parsed.isValid()) return parsed.valueOf();
  // Fallback no estricto para entradas con pequeñas variaciones de formato.
  if (typeof v === 'string') {
    const loose = moment(v, ['YYYY-MM-DD', 'DD MMMM YYYY', moment.ISO_8601], 'es');
    if (loose.isValid()) return loose.valueOf();
  }
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function compareNoteOrder(a, b) {
  const td = parseNoteFieldTimeMs(a.currentDate) - parseNoteFieldTimeMs(b.currentDate);
  if (td !== 0) return td;
  const tc = parseNoteFieldTimeMs(a.creationDate) - parseNoteFieldTimeMs(b.creationDate);
  if (tc !== 0) return tc;
  const f = (Number(a.folio) || 0) - (Number(b.folio) || 0);
  if (f !== 0) return f;
  return String(a.id || '').localeCompare(String(b.id || ''));
}

export function totalFinalNota(note) {
  const products = Array.isArray(note.products) ? note.products : [];
  const subtotal = products.reduce((sum, p) => sum + lineTotalProductoNotaVenta(p), 0);
  const flete = Number(note.flete) || 0;
  return subtotal - flete;
}

export function totalAbonadoNota(note) {
  const abonos = Array.isArray(note.abonos) ? note.abonos : [];
  return abonos.reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
}

/**
 * Pendiente de una nota (usado en cadenas de saldo acumulado).
 */
export function saldoRestanteNota(note) {
  if (note.isPaid) {
    return 0;
  }
  const totalFinal = totalFinalNota(note);
  const totalAbonado = totalAbonadoNota(note);
  const r = totalFinal - totalAbonado;
  return r > 0 ? r : 0;
}

/**
 * "Nuevo saldo acumulado" encadenado como en SaleNote.vue:
 * nuevo = max(0, nuevo_previo + totalFinalNota - totalAbonadoNota).
 *
 * Importante: devuelve el "Nuevo saldo acumulado" de la nota en `sorted[index]`.
 */
export function nuevoSaldoAcumuladoAtIndex(sorted, index) {
  if (!Array.isArray(sorted) || sorted.length === 0 || index < 0) return 0;
  if (index >= sorted.length) index = sorted.length - 1;

  let nuevo = 0;
  for (let i = 0; i <= index; i++) {
    const n = sorted[i];
    const tf = totalFinalNota(n);
    const ta = totalAbonadoNota(n);
    nuevo = Math.max(0, nuevo + tf - ta);
  }

  return nuevo;
}

/**
 * Valor para "Saldo acumulado anterior" en pantalla:
 * estrictamente copia el "Nuevo saldo acumulado" de la nota inmediatamente anterior
 * (según el mismo orden que compareNoteOrder).
 */
export function saldoAcumuladoAnteriorComoNuevoDeNotaPrevia(clientNotes, ref, noteId) {
  if (!Array.isArray(clientNotes) || clientNotes.length === 0) return 0;
  const sorted = [...clientNotes].sort(compareNoteOrder);

  if (noteId) {
    const idx = sorted.findIndex((n) => n.id === noteId);
    if (idx <= 0) return 0;
    return nuevoSaldoAcumuladoAtIndex(sorted, idx - 1);
  }
  let insertIndex = sorted.length;
  for (let i = 0; i < sorted.length; i++) {
    if (compareNoteOrder(sorted[i], ref) >= 0) {
      insertIndex = i;
      break;
    }
  }
  if (insertIndex === 0) return 0;
  return nuevoSaldoAcumuladoAtIndex(sorted, insertIndex - 1);
}

/**
 * Adeudo total del cliente como en "Nuevo saldo acumulado" de la nota más reciente
 * (mismo encadenado que SaleNote).
 */
export function nuevoSaldoAcumuladoGlobalCliente(clientNotes) {
  if (!Array.isArray(clientNotes) || clientNotes.length === 0) return 0;
  const sorted = [...clientNotes].sort(compareNoteOrder);
  return nuevoSaldoAcumuladoAtIndex(sorted, sorted.length - 1);
}
