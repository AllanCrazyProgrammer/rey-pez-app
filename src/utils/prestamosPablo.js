// Dinero que Pablo le deja guardado a Allan. Solo registro: no mueve dinero.
// Colección Firestore `prestamosPablo`: un documento por movimiento
// { fecha: 'YYYY-MM-DD', tipo: 'deposito' | 'retiro' | 'tomado' | 'abono', monto: number > 0, nota?: string, fechaCreacion }.
// deposito/retiro: Pablo mete o saca dinero (lo que Pablo debe tener).
// tomado/abono: Allan toma dinero de lo de Pablo / se lo regresa (deuda de Allan con Pablo).
export const TIPOS_PABLO = ['deposito', 'retiro', 'tomado', 'abono'];
export const ETIQUETAS_PABLO = { deposito: 'Depósito de Pablo', retiro: 'Retiro de Pablo', tomado: 'Allan tomó', abono: 'Abono de Allan' };
// Efecto de cada tipo sobre el efectivo real guardado.
const SIGNO_EFECTIVO = { deposito: 1, retiro: -1, tomado: -1, abono: 1 };

const redondear = n => Math.round(n * 100) / 100 || 0;

export function validarMovimientoPablo(mov, existentes) {
  const errores = [];
  const fecha = String((mov && mov.fecha) || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(new Date(fecha + 'T00:00:00').getTime())) errores.push('Fecha inválida');
  if (!TIPOS_PABLO.includes(mov && mov.tipo)) errores.push('Tipo debe ser depósito o retiro');
  const monto = Number(mov && mov.monto);
  if (!Number.isFinite(monto) || monto <= 0) errores.push('El monto debe ser mayor a 0');
  const nota = String((mov && mov.nota) || '').trim();
  if (nota.length > 200) errores.push('La nota admite máximo 200 caracteres');
  if (existentes && mov.tipo === 'abono' && Number.isFinite(monto) && monto > 0) {
    const deuda = resumenPablo(existentes).deudaAllan;
    if (redondear(monto) > deuda) errores.push(`El abono ($${redondear(monto)}) excede la deuda actual ($${deuda})`);
  }
  if (errores.length) return { ok: false, errores };
  return { ok: true, movimiento: { fecha, tipo: mov.tipo, monto: redondear(monto), nota } };
}

export function resumenPablo(movimientos) {
  const t = { deposito: 0, retiro: 0, tomado: 0, abono: 0 };
  for (const m of movimientos || []) if (m.tipo in t) t[m.tipo] += Number(m.monto) || 0;
  const saldoPablo = redondear(t.deposito - t.retiro);
  const deudaAllan = Math.max(0, redondear(t.tomado - t.abono));
  return {
    depositos: redondear(t.deposito), retiros: redondear(t.retiro),
    tomado: redondear(t.tomado), abonos: redondear(t.abono),
    saldoPablo, saldo: saldoPablo, deudaAllan,
    efectivoReal: redondear(saldoPablo - deudaAllan),
    avanceAbonos: t.tomado > 0 ? Math.min(100, Math.round(t.abono / t.tomado * 100)) : 0
  };
}

function ms(v) {
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  if (v && typeof v.seconds === 'number') return v.seconds * 1000;
  return new Date(v || 0).getTime() || 0;
}

// Más reciente primero; empate por fecha de captura. Agrega saldo, deuda y efectivo tras cada movimiento.
export function historialPablo(movimientos) {
  const asc = [...(movimientos || [])].sort((a, b) =>
    String(a.fecha).localeCompare(String(b.fecha)) || ms(a.fechaCreacion) - ms(b.fechaCreacion));
  const vistos = [];
  const conSaldo = asc.map(m => {
    vistos.push(m);
    const r = resumenPablo(vistos);
    return { ...m, etiqueta: ETIQUETAS_PABLO[m.tipo] || m.tipo, signo: SIGNO_EFECTIVO[m.tipo] || 0,
      saldoDespues: r.saldoPablo, deudaDespues: r.deudaAllan, efectivoDespues: r.efectivoReal };
  });
  return conSaldo.reverse();
}
