/**
 * Cálculo de saldos de nota de venta alineado con SaleNote.vue:
 * mismo orden temporal, isPaid y fórmula de "Nuevo saldo acumulado" sobre la última nota.
 */

export function compareNoteOrder(a, b) {
  const parseTime = (v) => {
    if (v == null || v === '') return 0;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? 0 : t;
  };
  const td = parseTime(a.currentDate) - parseTime(b.currentDate);
  if (td !== 0) return td;
  const tc = parseTime(a.creationDate) - parseTime(b.creationDate);
  if (tc !== 0) return tc;
  const f = (Number(a.folio) || 0) - (Number(b.folio) || 0);
  if (f !== 0) return f;
  return String(a.id || '').localeCompare(String(b.id || ''));
}

export function totalFinalNota(note) {
  const products = Array.isArray(note.products) ? note.products : [];
  const subtotal = products.reduce(
    (sum, p) => sum + (Number(p.kilos) || 0) * (Number(p.pricePerKilo) || 0),
    0
  );
  const flete = Number(note.flete) || 0;
  return subtotal - flete;
}

export function totalAbonadoNota(note) {
  const abonos = Array.isArray(note.abonos) ? note.abonos : [];
  return abonos.reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
}

/**
 * Pendiente de una nota (igual que saldoRestanteNota en fetchSaldoAcumuladoAnteriores de SaleNote).
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
 * Adeudo total del cliente como en "Nuevo saldo acumulado" de la nota más reciente
 * (suma de pendientes de notas anteriores + total de la última − abonos de la última, con piso en 0).
 */
export function nuevoSaldoAcumuladoGlobalCliente(clientNotes) {
  if (!Array.isArray(clientNotes) || clientNotes.length === 0) return 0;
  const sorted = [...clientNotes].sort(compareNoteOrder);
  const last = sorted[sorted.length - 1];
  let anterior = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    anterior += saldoRestanteNota(sorted[i]);
  }
  const tf = totalFinalNota(last);
  const ta = totalAbonadoNota(last);
  return Math.max(0, anterior + tf - ta);
}
