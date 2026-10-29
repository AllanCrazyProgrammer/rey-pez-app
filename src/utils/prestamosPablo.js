// Dinero que Pablo le deja guardado a Allan. Solo registro: no mueve dinero.
// Colección Firestore `prestamosPablo`: un documento por movimiento
// { fecha: 'YYYY-MM-DD', tipo: 'deposito' | 'retiro', monto: number > 0, nota?: string, fechaCreacion }.
export const TIPOS_PABLO = ['deposito', 'retiro'];

const redondear = n => Math.round(n * 100) / 100 || 0;

export function validarMovimientoPablo(mov) {
  const errores = [];
  const fecha = String((mov && mov.fecha) || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || isNaN(new Date(fecha + 'T00:00:00').getTime())) errores.push('Fecha inválida');
  if (!TIPOS_PABLO.includes(mov && mov.tipo)) errores.push('Tipo debe ser depósito o retiro');
  const monto = Number(mov && mov.monto);
  if (!Number.isFinite(monto) || monto <= 0) errores.push('El monto debe ser mayor a 0');
  const nota = String((mov && mov.nota) || '').trim();
  if (nota.length > 200) errores.push('La nota admite máximo 200 caracteres');
  if (errores.length) return { ok: false, errores };
  return { ok: true, movimiento: { fecha, tipo: mov.tipo, monto: redondear(monto), nota } };
}

export function resumenPablo(movimientos) {
  let depositos = 0, retiros = 0;
  for (const m of movimientos || []) {
    const monto = Number(m.monto) || 0;
    if (m.tipo === 'deposito') depositos += monto;
    else if (m.tipo === 'retiro') retiros += monto;
  }
  return { depositos: redondear(depositos), retiros: redondear(retiros), saldo: redondear(depositos - retiros) };
}

function ms(v) {
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  if (v && typeof v.seconds === 'number') return v.seconds * 1000;
  return new Date(v || 0).getTime() || 0;
}

// Más reciente primero; empate por fecha de captura. Agrega saldo acumulado tras cada movimiento.
export function historialPablo(movimientos) {
  const asc = [...(movimientos || [])].sort((a, b) =>
    String(a.fecha).localeCompare(String(b.fecha)) || ms(a.fechaCreacion) - ms(b.fechaCreacion));
  let saldo = 0;
  const conSaldo = asc.map(m => {
    saldo += (m.tipo === 'deposito' ? 1 : m.tipo === 'retiro' ? -1 : 0) * (Number(m.monto) || 0);
    return { ...m, saldoDespues: redondear(saldo) };
  });
  return conSaldo.reverse();
}
