// Keep reads bounded: large accounts must not start hundreds of requests at once.
export async function mapConcurrent(items, mapper, concurrency = 8) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index], index);
    }
  }));
  return results;
}

export function fechaMovimiento(value) {
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value.seconds === 'number') return value.seconds * 1000;
  return new Date(value || 0).getTime() || 0;
}

export function agruparPrestamos(prestamos, persona) {
  const cuentas = new Map();
  for (const prestamo of prestamos) {
    const id = prestamo[`${persona}Id`];
    if (!cuentas.has(id)) cuentas.set(id, {
      [`${persona}Id`]: id,
      [`${persona}Nombre`]: prestamo[`${persona}Nombre`] || 'Sin nombre',
      totalPrestado: 0, totalAbonado: 0, saldoPendiente: 0, prestamos: []
    });
    const cuenta = cuentas.get(id);
    cuenta.totalPrestado += Number(prestamo.montoInicial) || 0;
    cuenta.totalAbonado += prestamo.abonosCuenta.reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0);
    cuenta.prestamos.push(prestamo);
  }
  return Array.from(cuentas.values()).map(cuenta => ({
    ...cuenta,
    saldoPendiente: Math.round((cuenta.totalPrestado - cuenta.totalAbonado) * 100) / 100 || 0,
    porcentajePagado: cuenta.totalPrestado > 0
      ? Math.max(0, Math.min(100, Math.round(cuenta.totalAbonado / cuenta.totalPrestado * 100))) : 0
  }));
}

export function movimientosCuenta(cuenta) {
  return cuenta.prestamos.flatMap(prestamo => [
    { ...prestamo, tipo: 'prestamo', monto: Number(prestamo.montoInicial) || 0,
      descripcion: prestamo.descripcion || 'Préstamo otorgado' },
    ...prestamo.abonosCuenta.map(abono => ({ ...abono, tipo: 'abono', prestamoId: prestamo.id,
      descripcion: abono.descripcion || 'Abono recibido' }))
  ]).sort((a, b) => fechaMovimiento(b.fecha) - fechaMovimiento(a.fecha)
    || fechaMovimiento(b.fechaCreacion) - fechaMovimiento(a.fechaCreacion));
}

// A payment may cover older loans while attached to the newest loan. Net each
// person's balances before counting debt; filtering out paid loans overstates it.
export function resumirSaldos(prestamos) {
  const saldos = new Map();
  prestamos.forEach(prestamo => {
    saldos.set(prestamo.cuentaId, (saldos.get(prestamo.cuentaId) || 0) + (Number(prestamo.saldoPendiente) || 0));
  });
  const pendientes = Array.from(saldos.values()).map(s => Math.round(s * 100) / 100).filter(s => s > 0);
  return { cuentasConDeuda: pendientes.length, totalPendiente: Math.round(pendientes.reduce((a, b) => a + b, 0) * 100) / 100 };
}
