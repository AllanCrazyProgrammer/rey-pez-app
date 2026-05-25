/**
 * Utilidades para saldos acumulados de cuentas Ozuna (por fecha, sin incluir días posteriores).
 */

export function normalizarFechaOzuna(valor) {
  if (!valor) return null;
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
  if (valor?.seconds) {
    return new Date(valor.seconds * 1000).toISOString().split('T')[0];
  }
  if (valor instanceof Date) {
    return valor.toISOString().split('T')[0];
  }
  const d = new Date(valor);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return null;
}

export function netoDiaCuentaOzuna(data = {}) {
  const totalGeneral = Number(data.totalGeneral) || 0;
  const totalCobros = (data.cobros || []).reduce(
    (sum, cobro) => sum + (Number(cobro.monto) || 0),
    0
  );
  const totalAbonos = (data.abonos || []).reduce(
    (sum, abono) => sum + (Number(abono.monto) || 0),
    0
  );
  return totalGeneral + totalCobros - totalAbonos;
}

/**
 * Total acumulado incluyendo el día de cada cuenta (orden cronológico).
 * @param {Array<{ id: string, fecha: string, data: object }>} cuentas
 * @returns {Map<string, number>} id -> total hasta ese día (inclusive)
 */
export function totalesAcumuladosPorCuenta(cuentas) {
  const map = new Map();
  const ordenadas = [...cuentas]
    .map((c) => ({
      ...c,
      fechaNorm: normalizarFechaOzuna(c.fecha)
    }))
    .filter((c) => c.fechaNorm)
    .sort((a, b) => a.fechaNorm.localeCompare(b.fechaNorm));

  let acumulado = 0;
  for (const cuenta of ordenadas) {
    acumulado += netoDiaCuentaOzuna(cuenta.data ?? cuenta);
    map.set(cuenta.id, acumulado);
  }
  return map;
}

/**
 * Saldo acumulado de todos los días estrictamente anteriores a `fecha`.
 */
export function saldoAcumuladoAntesDeFecha(cuentas, fecha) {
  const fechaNorm = normalizarFechaOzuna(fecha);
  if (!fechaNorm) return 0;

  return [...cuentas]
    .filter((c) => {
      const f = normalizarFechaOzuna(c.fecha);
      return f && f < fechaNorm;
    })
    .sort((a, b) =>
      normalizarFechaOzuna(a.fecha).localeCompare(normalizarFechaOzuna(b.fecha))
    )
    .reduce((sum, cuenta) => sum + netoDiaCuentaOzuna(cuenta.data ?? cuenta), 0);
}
