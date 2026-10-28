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
  }
  for (const selector of [{ pedidoId: 'ausente' }, { pedidoId: 'crudo-refri' }]) {
    assert.equal((await post({ ...selector, medidas: { a: 1 } })).status, 404); // Por id no se crea nada.
  }
  assert.deepEqual((await ref.get()).data(), { ...base, kilosRefrigerados: {} });

  // idempotencyKey en un pedido existente: el reintento no reaplica aunque la app haya cambiado el valor.
  const primera = await post({ pedidoId: ref.id, medidas: { '21/25': 11 }, idempotencyKey: 'refri-existente-1' });
  assert.equal(primera.status, 200, JSON.stringify(primera.body));
  await ref.update({ kilosRefrigerados: { '21/25': 2 } });
  const segunda = await post({ pedidoId: ref.id, medidas: { '21/25': 11 }, idempotencyKey: 'refri-existente-1' });
  assert.deepEqual(segunda.body, primera.body);
  assert.deepEqual((await ref.get()).data().kilosRefrigerados, { '21/25': 2 }, 'misma key no se aplica dos veces');
  await ref.update({ kilosRefrigerados: {} });

  // Día sin pedido limpio: POST por fecha lo crea como la app y aplica los kilos.
  const pedidosDia = async f => (await db.collection('pedidos').where('fecha', '==', f).where('tipo', '==', 'limpio').get()).docs;
  const fechaNueva = '2026-11-05';
  assert.equal((await pedidosDia(fechaNueva)).length, 0);
  let dry = await post({ fecha: fechaNueva, medidas: { '21/25': 7 }, dryRun: true });
  assert.equal(dry.status, 200, JSON.stringify(dry.body));
  assert.equal(dry.body.pedidoCreado, true);
  assert.equal((await pedidosDia(fechaNueva)).length, 0, 'dryRun no crea');
  r = await post({ fecha: fechaNueva, medidas: { '21/25': 7 }, idempotencyKey: 'refri-nuevo-1' });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.pedidoCreado, true);
  let docs = await pedidosDia(fechaNueva);
  assert.equal(docs.length, 1);
  assert.equal(docs[0].id, r.body.pedidoId);
  const { createdAt, _asistenteId, version, ...campos } = docs[0].data();
  assert.ok(createdAt && typeof createdAt.toDate === 'function' && _asistenteId && version === 1);
  assert.deepEqual(campos, {
    fecha: fechaNueva, tipo: 'limpio', otilio: [], catarro: [], joselito: [], ozuna: [], lorena: [],
    clientesTemporales: {}, etiquetas: [], etiquetasColores: {}, rendimientos: {}, divisores: {},
    completados: {}, kilosRefrigerados: { '21/25': 7 }
  });
  // Mismo idempotencyKey: no se aplica dos veces y devuelve la misma respuesta.
  await docs[0].ref.update({ kilosRefrigerados: { '21/25': 9 } }); // La app lo cambió después.
  const repetido = await post({ fecha: fechaNueva, medidas: { '21/25': 7 }, idempotencyKey: 'refri-nuevo-1' });
  assert.deepEqual(repetido.body, r.body);
  assert.deepEqual((await docs[0].ref.get()).data().kilosRefrigerados, { '21/25': 9 }, 'reintento no reaplica');
  assert.equal((await pedidosDia(fechaNueva)).length, 1, 'no crea otro pedido');
  // Otra key sobre el día ya creado: actualiza ese mismo pedido.
  r = await post({ fecha: fechaNueva, medidas: { '16/20': 3 }, idempotencyKey: 'refri-nuevo-2' });
  assert.equal(r.body.pedidoCreado, false);
  assert.equal(r.body.pedidoId, docs[0].id);
  assert.deepEqual((await docs[0].ref.get()).data().kilosRefrigerados, { '21/25': 9, '16/20': 3 });
  const logs = await db.collection('asistenteLog').where('operation', '==', 'pedidos_limpio_refrigerados').where('fecha', '==', fechaNueva).get();
  assert.equal(logs.size, 2, 'un log por escritura aplicada');
  for (const key of ['', 'a/b', 5]) {
    assert.equal((await post({ fecha: fechaNueva, medidas: { a: 1 }, idempotencyKey: key })).status, 400);
  }
  await db.collection('asistenteIdem').doc('otra-op').set({ operation: 'pedidos_limpio_create', response: {} });
  assert.equal((await post({ fecha: fechaNueva, medidas: { a: 1 }, idempotencyKey: 'otra-op' })).status, 409);
  console.log('✓ Refrigerados: GET id/fecha, reemplazo, reintento, borrado, normalización, etiquetas, dryRun, validaciones, 404, crea el día faltante e idempotencyKey');
}).catch(err => { console.error(err); process.exitCode = 1; });
