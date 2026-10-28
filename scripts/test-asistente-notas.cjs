#!/usr/bin/env node
/**
 * Notas de venta (Notas por Cliente, colección `notes`) por el asistente.
 * Mismo documento que SaleNote.vue y mismo efecto en clientBalances (saldo a favor).
 *
 *   NODE_ENV=test node scripts/test-asistente-notas.cjs
 */
const assert = require('node:assert/strict');
const { conEmulador, callHandler } = require('./lib/asistente-emulator.cjs');

conEmulador('demo-reypez-notas', async ({ db, handlers }) => {
  const { handlePostNotas, handleGetNotas, handlePostNotasDeshacer } = handlers;
  assert.equal(typeof handlePostNotas, 'function', 'falta handlePostNotas en functions/asistente.js');

  for (const name of ['Joel Sonny', 'Catarro', 'Chila', 'Lalo Reyes', 'Oscar Silva']) {
    await db.collection('clients').add({ name });
  }
  // Nota previa de Joel sin pagar (forma de SaleNote) y saldo a favor en 0, como reporta producción.
  await db.collection('notes').doc('previa-joel').set({
    folio: 1234, client: 'Joel Sonny', currentDate: '2026-10-20', observaciones: '',
    products: [{ product: '51/60', kilos: 100, pricePerKilo: '200', total: 20000 }],
    abonos: [{ monto: 5000, fecha: '2026-10-21' }], flete: 0, isPaid: false, creationDate: '2026-10-20'
  });
  await db.collection('notes').doc('otro-cliente').set({
    folio: 5798, client: 'Chila', currentDate: '2026-10-01', observaciones: '',
    products: [{ product: '41/50', kilos: 10, pricePerKilo: 100, total: 1000 }],
    abonos: [], flete: 0, isPaid: false, creationDate: '2026-10-01'
  });
  await db.collection('clientBalances').doc('Joel Sonny').set({ balance: 0 });

  const ejemplo = {
    cliente: 'joel sonny', folio: 5798, fecha: '2026-10-28',
    lineas: [{ producto: '71/90', kg: 88, precio: 180 }], idempotencyKey: 'nota-5798'
  };

  // Validaciones
  let r = await callHandler(handlePostNotas, 'POST', '/notas', { ...ejemplo, cliente: 'Pancho' });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'CLIENTE_DESCONOCIDO');
  assert.ok(r.body.error.details.clientes.includes('Joel Sonny'));
  r = await callHandler(handlePostNotas, 'POST', '/notas', { ...ejemplo, idempotencyKey: 'a/b' });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'IDEMPOTENCY_KEY_INVALIDA');
  r = await callHandler(handlePostNotas, 'POST', '/notas', { ...ejemplo, idempotencyKey: undefined });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'IDEMPOTENCY_KEY_REQUERIDA');
  r = await callHandler(handlePostNotas, 'POST', '/notas', { ...ejemplo, fecha: '28/10/2026' });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'FECHA_INVALIDA');
  r = await callHandler(handlePostNotas, 'POST', '/notas', { ...ejemplo, lineas: [{ producto: '71/90', kg: '88', precio: 180 }] });
  assert.equal(r.status, 400); assert.equal(r.body.error.code, 'LINEA_INVALIDA');
  console.log('✓ Validaciones: cliente fuera de la lista, idempotencyKey, fecha, kg');

  // dryRun no escribe
  const antes = (await db.collection('notes').get()).size;
  r = await callHandler(handlePostNotas, 'POST', '/notas', { ...ejemplo, dryRun: true, idempotencyKey: undefined });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.dryRun, true);
  assert.equal(r.body.noteId, null);
  assert.equal(r.body.totales.totalFinal, 15840);
  assert.equal((await db.collection('notes').get()).size, antes);
  assert.equal((await db.collection('asistenteLog').get()).size, 0);
  console.log('✓ dryRun calcula $15,840 y no escribe');

  // Ejemplo de Ally: folio 5798, 28/10/2026, Joel Sonny, 71/90, 88 kg a $180
  r = await callHandler(handlePostNotas, 'POST', '/notas', ejemplo);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const noteId = r.body.noteId;
  assert.ok(noteId);
  assert.equal(r.body.cliente, 'Joel Sonny');
  assert.deepEqual(r.body.folioEnOtrosClientes, ['Chila']);
  const doc = (await db.collection('notes').doc(noteId).get()).data();
  const { _asistenteId, creationDate, ...resto } = doc;
  assert.ok(_asistenteId);
  assert.match(creationDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(resto, {
    folio: 5798, client: 'Joel Sonny', currentDate: '2026-10-28', observaciones: '',
    products: [{ product: '71/90', kilos: 88, pricePerKilo: 180, total: 15840 }],
    abonos: [], flete: 0, isPaid: false
  });
  assert.equal((await db.collection('clientBalances').doc('Joel Sonny').get()).data().balance, 0);
  assert.equal(r.body.deudaPendienteNotas.antes, 15000);
  assert.equal(r.body.deudaPendienteNotas.despues, 30840);
  const logs = (await db.collection('asistenteLog').where('idempotencyKey', '==', 'nota-5798').get()).docs.map((d) => d.data());
  assert.equal(logs.length, 1); assert.equal(logs[0].operation, 'notas_create'); assert.equal(logs[0].noteId, noteId);
  console.log('✓ POST /notas crea la nota con la forma de SaleNote (folio 5798, $15,840) y log');

  // Reintento con la misma llave: misma respuesta, sin segunda nota
  r = await callHandler(handlePostNotas, 'POST', '/notas', ejemplo);
  assert.equal(r.status, 200); assert.equal(r.body.noteId, noteId); assert.equal(r.body.replay, true);
  assert.equal((await db.collection('notes').where('folio', '==', 5798).get()).size, 2);
  console.log('✓ Reintento idempotente devuelve la misma nota');

  // Folio duplicado en el mismo cliente (otra llave)
  r = await callHandler(handlePostNotas, 'POST', '/notas', { ...ejemplo, idempotencyKey: 'nota-5798-b' });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, 'FOLIO_DUPLICADO');
  r = await callHandler(handlePostNotas, 'POST', '/notas', { ...ejemplo, folio: '1234', idempotencyKey: 'nota-1234' });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, 'FOLIO_DUPLICADO');
  console.log('✓ Folio duplicado del mismo cliente → 409 (también si llega como texto)');

  // Llave usada en otra operación
  await db.collection('asistenteIdem').doc('llave-abono').set({ operation: 'abonos_create', response: {} });
  r = await callHandler(handlePostNotas, 'POST', '/notas', { ...ejemplo, folio: 7000, idempotencyKey: 'llave-abono' });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, 'IDEMPOTENCY_KEY_EN_USO');
  console.log('✓ idempotencyKey de otra operación → 409 IDEMPOTENCY_KEY_EN_USO');

  // GET /notas: notas + saldo a favor guardado + deuda calculada, separados
  r = await callHandler(handleGetNotas, 'GET', '/notas?cliente=Joel%20Sonny');
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.saldoAFavorGuardado.balance, 0);
  assert.equal(r.body.deudaPendienteNotas.total, 30840);
  assert.deepEqual(r.body.notas.map((n) => n.folio), [5798, 1234]);
  assert.equal(r.body.notas[1].saldoPendiente, 15000);
  console.log('✓ GET /notas: saldo a favor 0 y deuda de notas $30,840 por separado');

  // Flete se resta del total (SaleNote.totalFinal = grandTotal - flete) y saldo a favor se aplica como abono
  await db.collection('clientBalances').doc('Lalo Reyes').set({ balance: 1000 });
  r = await callHandler(handlePostNotas, 'POST', '/notas', {
    cliente: 'Lalo Reyes', folio: 42, fecha: '2026-10-27', flete: 500, idempotencyKey: 'nota-lalo',
    lineas: [{ producto: '21/25', kg: 10, precio: 300 }, { producto: '31/40', kg: 5.5, precio: 200 }]
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.totales.subtotal, 4100);
  assert.equal(r.body.totales.totalFinal, 3600);
  assert.equal(r.body.totales.saldoRestante, 2600);
  assert.equal(r.body.saldoAFavor.aplicadoComoAbono, 1000);
  const lalo = (await db.collection('notes').doc(r.body.noteId).get()).data();
  assert.equal(lalo.flete, 500);
  assert.equal(lalo.abonos.length, 1); assert.equal(lalo.abonos[0].monto, 1000);
  assert.equal(lalo.isPaid, false);
  assert.equal((await db.collection('clientBalances').doc('Lalo Reyes').get()).data().balance, 0);
  console.log('✓ Flete resta del total; saldo a favor $1,000 entra como abono y clientBalances queda en 0');

  // Undo revierte nota + saldo a favor
  r = await callHandler(handlePostNotasDeshacer, 'POST', '/notas/deshacer', { idempotencyKey: 'nota-lalo' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await db.collection('notes').doc(r.body.noteId).get()).exists, false);
  assert.equal((await db.collection('clientBalances').doc('Lalo Reyes').get()).data().balance, 1000);
  const otraVez = await callHandler(handlePostNotasDeshacer, 'POST', '/notas/deshacer', { idempotencyKey: 'nota-lalo' });
  assert.equal(otraVez.status, 200); assert.deepEqual(otraVez.body, r.body);
  assert.equal((await db.collection('clientBalances').doc('Lalo Reyes').get()).data().balance, 1000);
  console.log('✓ Deshacer borra la nota y devuelve el saldo a favor; repetir no lo duplica');

  // Undo rechazado si la nota cambió (abono desde NoteMenu)
  await db.collection('notes').doc(noteId).update({ abonos: [{ monto: 840, fecha: '2026-10-28' }] });
  r = await callHandler(handlePostNotasDeshacer, 'POST', '/notas/deshacer', { idempotencyKey: 'nota-5798' });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, 'NOTA_MODIFICADA');
  assert.equal((await db.collection('notes').doc(noteId).get()).exists, true);
  r = await callHandler(handlePostNotasDeshacer, 'POST', '/notas/deshacer', { idempotencyKey: 'no-existe' });
  assert.equal(r.status, 404);
  console.log('✓ Deshacer se niega si la nota ya tiene cambios (409) y 404 sin la operación');

  console.log('PASS asistente notas');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
