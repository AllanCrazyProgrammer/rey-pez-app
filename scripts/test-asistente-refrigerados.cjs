#!/usr/bin/env node
const assert = require('node:assert/strict');
const { conEmulador, callHandler } = require('./lib/asistente-emulator.cjs');

conEmulador('demo-reypez-refrigerados', async ({ db, handlers }) => {
  const ref = db.collection('pedidos').doc('limpio-refri');
  const base = {
    tipo: 'limpio', fecha: '2026-10-21', kilosRefrigerados: { '41/50 Selecta': 10 },
    otilio: [{ medida: '41/50', etiqueta: 'Selecta' }, { medida: '21/25' }],
    ozuna: [{ medida: '36/40', esMaquila: true, etiqueta: 'Honduras' }],
    clientesTemporales: { uno: { pedidos: [{ medida: '16/20', esSelecta: true }] } }
  };
  await ref.set(base);
  const get = query => callHandler(handlers.handleGetPedidosLimpioRefrigerados, 'GET', '/pedidos/limpio/refrigerados' + query);
  const post = body => callHandler(handlers.handlePostPedidosLimpioRefrigerados, 'POST', '/pedidos/limpio/refrigerados', body);
  for (const query of ['?pedidoId=limpio-refri', '?fecha=2026-10-21']) {
    const r = await get(query);
    assert.equal(r.status, 200);
    assert.equal(r.body.pedidoId, ref.id);
    assert.equal(r.body.totalKilos, 10);
    assert.deepEqual(r.body.kilosRefrigerados, base.kilosRefrigerados);
    assert.deepEqual(r.body.medidasPedido, ['41/50 Selecta', '21/25', '36/40 Maq Honduras', '16/20 Selecta']);
  }
  let r = await post({ pedidoId: ref.id, medidas: { '41/50  selecta': 120, '21/25': 20 } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.antes, base.kilosRefrigerados);
  assert.deepEqual(r.body.despues, { '41/50 Selecta': 120, '21/25': 20 });
  assert.deepEqual(r.body.cambios[0], { medida: '41/50  selecta', clave: '41/50 Selecta', anterior: 10, nuevo: 120, accion: 'set' });
  r = await post({ fecha: base.fecha, medidas: [{ medida: '41/50 Selecta', kilos: 5 }] });
  assert.equal(r.body.despues['41/50 Selecta'], 5); // Reemplaza, no suma.
  await post({ fecha: base.fecha, medidas: [{ medida: '41/50 Selecta', kilos: 5 }] });
  assert.equal((await ref.get()).data().kilosRefrigerados['41/50 Selecta'], 5); // Reintento idempotente.
  const antesDry = (await ref.get()).data();
  r = await post({ pedidoId: ref.id, medidas: { '21/25': 0, '36/40 (maq) honduras': 8, ' nueva ': 3 }, dryRun: true });
  assert.equal(r.status, 200);
  assert.equal(r.body.dryRun, true);
  assert.deepEqual(r.body.despues, { '41/50 Selecta': 5, '36/40 Maq Honduras': 8, nueva: 3 });
  assert.deepEqual((await ref.get()).data(), antesDry);
  r = await post({ pedidoId: ref.id, medidas: { '41/50 Selecta': 0, '21/25': null } });
  assert.deepEqual(r.body.despues, {});
  assert.ok(r.body.cambios.every(c => c.accion === 'delete' && c.nuevo === null));
  assert.deepEqual((await ref.get()).data(), { ...base, kilosRefrigerados: {} });
  for (const kilos of [-1, '2', true, NaN, Infinity, -Infinity, undefined]) {
    assert.equal((await post({ pedidoId: ref.id, medidas: [{ medida: '41/50', kilos }] })).status, 400);
  }
  for (const medidas of [undefined, null, [], {}, 'hola', [{ kilos: 2 }], [{ medida: ' ', kilos: 2 }], [null]]) {
    assert.equal((await post({ pedidoId: ref.id, medidas })).status, 400);
  }
  assert.equal((await post({ pedidoId: ref.id, medidas: { a: 1 }, dryRun: 'false' })).status, 400);
  for (const query of ['', '?fecha=incorrecta', '?pedidoId=a/b&fecha=mal']) assert.equal((await get(query)).status, 400);
  for (const selector of [{}, { fecha: 'mal' }, { pedidoId: 123, fecha: 'mal' }]) {
    assert.equal((await post({ ...selector, medidas: { a: 1 } })).status, 400);
  }
  await db.collection('pedidos').doc('crudo-refri').set({ tipo: 'crudo', fecha: base.fecha });
  for (const selector of [{ pedidoId: 'ausente' }, { fecha: '2020-01-01' }, { pedidoId: 'crudo-refri' }]) {
    assert.equal((await get('?' + new URLSearchParams(selector))).status, 404);
    assert.equal((await post({ ...selector, medidas: { a: 1 } })).status, 404);
  }
  assert.deepEqual((await ref.get()).data(), { ...base, kilosRefrigerados: {} });
  console.log('✓ Refrigerados: GET id/fecha, reemplazo, reintento, borrado, normalización, etiquetas, dryRun, validaciones y 404');
}).catch(err => { console.error(err); process.exitCode = 1; });
