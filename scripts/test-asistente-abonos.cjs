#!/usr/bin/env node
/**
 * Abonos en cascada y por nota. Replica StashModalV2 sobre el emulador.
 *
 *   node scripts/test-asistente-abonos.cjs
 */
const assert = require('node:assert/strict');
const { distribuirCascada, descripcionAbono } = require('../functions/lib/abonosClientes');
const { conEmulador, callHandler } = require('./lib/asistente-emulator.cjs');

function nota(id, fecha, venta, extra = {}) {
  return {
    id,
    fecha,
    data: {
      fecha,
      totalGeneralVenta: venta,
      saldoAcumuladoAnterior: 0,
      abonos: [],
      cobros: [],
      correcciones: [],
      estadoPagado: false,
      nuevoSaldoAcumulado: venta,
      ...extra
    }
  };
}

const meta = {
  descripcion: descripcionAbono('2026-10-13', 'Transferencia'),
  fecha: '2026-10-13T00:00:00',
  fechaOriginalStash: '2026-10-13',
  esEfectivo: false,
  stashItemId: 'stash-compartido'
};

const plan = distribuirCascada([
  nota('vieja', '2026-08-01', 400),
  nota('media', '2026-09-01', 700),
  nota('pagada', '2026-09-15', 900, { estadoPagado: true })
].filter((item) => !item.data.estadoPagado), 1000, meta, false);

assert.equal(plan.aplicaciones.length, 2);
assert.equal(plan.aplicaciones[0].notaId, 'vieja');
assert.equal(plan.aplicaciones[0].monto, 400);
assert.equal(plan.aplicaciones[1].monto, 600);
assert.equal(plan.aplicaciones[0].abono.stashItemId, plan.aplicaciones[1].abono.stashItemId);
assert.equal(plan.sobrante, 0);
assert.deepEqual(Object.keys(plan.aplicaciones[0].abono).sort(), [
  'descripcion', 'esEfectivo', 'fecha', 'fechaOriginalStash', 'monto', 'stashItemId'
]);

const ozuna = distribuirCascada([{
  id: 'oz',
  fecha: '2026-09-01',
  data: { fecha: '2026-09-01', nuevoSaldoAcumulado: 300, abonos: [] }
}], 100, meta, true);
assert.equal(ozuna.aplicaciones[0].monto, 100);
assert.equal(ozuna.sobrante, 0);
console.log('✓ Cascada en memoria: nota vieja primero, stashItemId compartido, Ozuna por saldo acumulado');

conEmulador('demo-reypez-abonos', async ({ db, handlers }) => {
  async function notaVeronica(fecha, venta, extra = {}) {
    await db.collection('cuentasVeronica').doc(fecha).set({
      fecha,
      totalGeneralVenta: venta,
      saldoAcumuladoAnterior: 0,
      abonos: [],
      cobros: [],
      correcciones: [],
      estadoPagado: false,
      nuevoSaldoAcumulado: venta,
      ...extra
    });
  }

  await notaVeronica('2026-08-01', 400);
  await notaVeronica('2026-09-01', 700);
  await notaVeronica('2026-09-15', 900, { estadoPagado: true });

  const pendiente = await callHandler(handlers.handleGetAbonos, 'GET', '/abonos?cliente=Lorena');
  assert.equal(pendiente.status, 200);
  assert.equal(pendiente.body.coleccion, 'cuentasVeronica');
  assert.deepEqual(pendiente.body.notas.map((notaItem) => notaItem.id), ['2026-08-01', '2026-09-01']);
  console.log('✓ GET /abonos alias Lorena → cuentasVeronica, omite la nota pagada');

  const seco = await callHandler(handlers.handlePostAbonos, 'POST', '/abonos', {
    cliente: 'lorena',
    monto: 1000,
    metodo: 'Transferencia',
    fecha: '2026-10-13',
    modo: 'cascada',
    idempotencyKey: 'abono-cascada-1',
    dryRun: true
  });
  assert.equal(seco.status, 200);
  assert.equal(seco.body.dryRun, true);
  assert.equal((await db.collection('cuentasVeronica').doc('2026-08-01').get()).data().abonos.length, 0);
  console.log('✓ dryRun no escribe');

  const creado = await callHandler(handlers.handlePostAbonos, 'POST', '/abonos', {
    cliente: 'verónica',
    monto: 1000,
    metodo: 'Transferencia',
    fecha: '2026-10-13',
    modo: 'cascada',
    idempotencyKey: 'abono-cascada-1'
  });
  assert.equal(creado.status, 200, JSON.stringify(creado.body));
  assert.equal(creado.body.aplicaciones.length, 2);
  const stashId = creado.body.aplicaciones[0].abono.stashItemId;
  assert.equal(creado.body.aplicaciones[1].abono.stashItemId, stashId);
  assert.equal(creado.body.aplicaciones[0].abono.descripcion, '13/10/2026 - Transferencia');
  assert.equal(creado.body.aplicaciones[0].abono.fecha, '2026-10-13T00:00:00');
  assert.equal(creado.body.aplicaciones[0].abono.fechaOriginalStash, '2026-10-13');
  assert.equal(creado.body.aplicaciones[0].abono.esEfectivo, false);
  assert.equal(creado.body.sobrante, 0);

  const vieja = (await db.collection('cuentasVeronica').doc('2026-08-01').get()).data();
  const media = (await db.collection('cuentasVeronica').doc('2026-09-01').get()).data();
  assert.equal(vieja.abonos.length, 1);
  assert.equal(vieja.abonos[0].monto, 400);
  assert.equal(vieja.estadoPagado, true);
  assert.equal(vieja.nuevoSaldoAcumulado, 0);
  assert.equal(media.abonos[0].monto, 600);
  assert.equal(media.nuevoSaldoAcumulado, 100);
  assert.equal(media.estadoPagado, false);
  assert.deepEqual(Object.keys(vieja.abonos[0]).sort(), [
    'descripcion', 'esEfectivo', 'fecha', 'fechaOriginalStash', 'monto', 'stashItemId'
  ]);
  console.log('✓ POST /abonos cascada parte la nota vieja y deja el saldo de la siguiente');

  const repetido = await callHandler(handlers.handlePostAbonos, 'POST', '/abonos', {
    cliente: 'veronica',
    monto: 9999,
    metodo: 'Efectivo',
    fecha: '2026-10-13',
    modo: 'cascada',
    idempotencyKey: 'abono-cascada-1'
  });
  assert.equal(repetido.body.totalAplicado, 1000);
  assert.equal((await db.collection('cuentasVeronica').doc('2026-08-01').get()).data().abonos.length, 1);
  console.log('✓ La misma idempotencyKey no duplica el abono');

  const explicita = await callHandler(handlers.handlePostAbonos, 'POST', '/abonos', {
    cliente: 'veronica',
    monto: 50,
    metodo: 'Deposito',
    fecha: '2026-10-14',
    modo: 'nota',
    nota: '2026-09-15',
    idempotencyKey: 'abono-nota-1'
  });
  assert.equal(explicita.status, 200, JSON.stringify(explicita.body));
  assert.equal(explicita.body.aplicaciones[0].monto, 50);
  assert.equal(explicita.body.aplicaciones[0].abono.esEfectivo, false);
  const pagada = (await db.collection('cuentasVeronica').doc('2026-09-15').get()).data();
  assert.equal(pagada.abonos[0].descripcion, '14/10/2026 - Deposito');
  assert.equal(pagada.abonos[0].monto, 50);
  console.log('✓ Modo nota aplica el monto completo a la nota indicada');

  const deshecho = await callHandler(handlers.handlePostAbonosDeshacer, 'POST', '/abonos/deshacer', {
    idempotencyKey: 'abono-cascada-1',
    undoIdempotencyKey: 'undo-abono-cascada-1'
  });
  assert.equal(deshecho.status, 200, JSON.stringify(deshecho.body));
  const viejaUndo = (await db.collection('cuentasVeronica').doc('2026-08-01').get()).data();
  const mediaUndo = (await db.collection('cuentasVeronica').doc('2026-09-01').get()).data();
  assert.deepEqual(viejaUndo.abonos, []);
  assert.equal(viejaUndo.estadoPagado, false);
  assert.equal(viejaUndo.nuevoSaldoAcumulado, 400);
  assert.equal(mediaUndo.abonos.length, 0);
  assert.equal(mediaUndo.nuevoSaldoAcumulado, 700);
  console.log('✓ Deshacer quita solo los abonos del asistente y restaura el saldo');

  const otraVez = await callHandler(handlers.handlePostAbonosDeshacer, 'POST', '/abonos/deshacer', {
    idempotencyKey: 'abono-cascada-1',
    undoIdempotencyKey: 'undo-abono-cascada-2'
  });
  assert.equal(otraVez.status, 400);
  assert.equal(otraVez.body.error.code, 'YA_DESHECHO');
  console.log('✓ El segundo deshacer responde YA_DESHECHO');

  await db.collection('cuentasOzuna').doc('2026-07-01').set({
    fecha: '2026-07-01',
    nuevoSaldoAcumulado: 300,
    totalSaldo: 300,
    abonos: []
  });
  const oz = await callHandler(handlers.handlePostAbonos, 'POST', '/abonos', {
    cliente: 'ozuna',
    monto: 80,
    metodo: 'Efectivo',
    fecha: '2026-10-13',
    modo: 'cascada',
    idempotencyKey: 'abono-ozuna-1'
  });
  assert.equal(oz.status, 200, JSON.stringify(oz.body));
  assert.equal(oz.body.aplicaciones[0].monto, 80);
  assert.equal(oz.body.aplicaciones[0].abono.esEfectivo, true);
  const ozData = (await db.collection('cuentasOzuna').doc('2026-07-01').get()).data();
  assert.equal(ozData.nuevoSaldoAcumulado, 220);
  assert.equal(ozData.abonos[0].monto, 80);
  console.log('✓ Ozuna descuenta nuevoSaldoAcumulado, no totalGeneralVenta');

  const sobra = await callHandler(handlers.handlePostAbonos, 'POST', '/abonos', {
    cliente: 'ozuna',
    monto: 500,
    metodo: 'Transferencia',
    fecha: '2026-10-13',
    modo: 'cascada',
    idempotencyKey: 'abono-ozuna-sobra'
  });
  assert.equal(sobra.body.sobrante, 280);
  assert.ok(sobra.body.stashSobranteId);
  const stash = await db.collection('stash_ozuna').doc(sobra.body.stashSobranteId).get();
  assert.equal(stash.data().monto, 280);
  assert.equal(stash.data().metodo, 'Transferencia');
  console.log('✓ El sobrante queda en el stash para no perder el pago');
}).then(() => {
  console.log('\nTodos los tests de abonos pasaron');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
