import { redondearCentavos, sumarMontos } from './dinero';

export function saldoDiaCatarro(cuenta) {
  return redondearCentavos((Number(cuenta.totalGeneralVenta) || 0)
    - sumarMontos((cuenta.cobros || []).map(item => item.monto))
    - sumarMontos((cuenta.correcciones || []).map(item => item.monto))
    - sumarMontos((cuenta.abonos || []).map(item => item.monto)));
}

// Centavos enteros: un residuo menor a medio centavo (0.004, o 8292.20 − 8292.1999)
// no deja la cuenta como "No pagado".
export function estaPagadoCatarro(saldo) {
  const centavos = Math.round(Number(saldo) * 100);
  return Number.isFinite(centavos) && centavos <= 0;
}

// El saldo negativo es crédito. Se arrastra una sola vez como saldo anterior,
// sin crear otro abono que descontaría el mismo dinero por segunda vez.
export function encadenarSaldosCatarro(cuentas, saldoInicial = 0) {
  let saldo = redondearCentavos(saldoInicial);
  return [...cuentas].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))
    || String(a.id).localeCompare(String(b.id))).map(cuenta => {
    const saldoAcumuladoAnterior = saldo;
    saldo = redondearCentavos(saldo + saldoDiaCatarro(cuenta));
    return {
      ...cuenta,
      saldoAcumuladoAnterior,
      nuevoSaldoAcumulado: saldo,
      estadoPagado: estaPagadoCatarro(saldo),
    };
  });
}

// La cuenta que se está guardando entra una sola vez, con los datos del formulario,
// y la cadena arranca en el saldo anterior a ese día (no en el saldo que ya lo incluye).
export function aplicarCadenaCatarro({ saldoAnterior = 0, cuentaActual, cuentas = [] }) {
  const fechaActual = cuentaActual.fecha;
  const porId = new Map();
  for (const cuenta of cuentas) {
    if (!cuenta || cuenta.fecha < fechaActual || cuenta.id === cuentaActual.id) continue;
    porId.set(cuenta.id, cuenta);
  }
  porId.set(cuentaActual.id, { ...cuentaActual, fecha: fechaActual });
  return encadenarSaldosCatarro([...porId.values()], saldoAnterior);
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
