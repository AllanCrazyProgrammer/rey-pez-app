import { redondearCentavos, sumarMontos } from './dinero';

export function saldoDiaCatarro(cuenta) {
  return redondearCentavos((Number(cuenta.totalGeneralVenta) || 0)
    - sumarMontos((cuenta.cobros || []).map(item => item.monto))
    - sumarMontos((cuenta.correcciones || []).map(item => item.monto))
    - sumarMontos((cuenta.abonos || []).map(item => item.monto)));
}

// El saldo negativo es crédito. Se arrastra una sola vez como saldo anterior,
// sin crear otro abono que descontaría el mismo dinero por segunda vez.
export function encadenarSaldosCatarro(cuentas, saldoInicial = 0) {
  let saldo = redondearCentavos(saldoInicial);
  return [...cuentas].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(cuenta => {
    const saldoAcumuladoAnterior = saldo;
    saldo = redondearCentavos(saldo + saldoDiaCatarro(cuenta));
    return { ...cuenta, saldoAcumuladoAnterior, nuevoSaldoAcumulado: saldo, estadoPagado: saldo <= 0 };
  });
}

export function resumenExcedenteCatarro(saldo, posteriores = []) {
  const excedente = Math.max(0, redondearCentavos(-saldo));
  let aFavor = excedente;
  const aplicaciones = [];
  for (const cuenta of [...posteriores].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    const monto = redondearCentavos(Math.min(aFavor, Math.max(0, saldoDiaCatarro(cuenta))));
    if (monto > 0) aplicaciones.push({ id: cuenta.id, fecha: cuenta.fecha, monto });
    aFavor = redondearCentavos(aFavor - monto);
    if (aFavor === 0) break;
  }
  return { excedente, aplicaciones, aFavor };
}
