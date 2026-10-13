#!/usr/bin/env node
/**
 * Pedido crudo: mezcla celdas sin borrar las demás. Lorena → Veronica.
 *
 *   node scripts/test-asistente-pedidos-crudo.cjs
 */
const assert = require('node:assert/strict');
const { fusionarPedidoCrudo } = require('../functions/lib/pedidosCrudo');
const { conEmulador, callHandler } = require('./lib/asistente-emulator.cjs');

const fusion = fusionarPedidoCrudo({
  pedidos: {
    '8a': { med: 3, 'cam s/c': 1 },
    Catarro: { gde: 7 },
    Otilio: {},
    Ozuna: {},
    Veronica: { med: 2 }
  },
  columnas: ['Med', 'Med-Esp', 'Med-gde', 'Gde', 'Extra', 'Jumbo', 'Cam s/c'],
  columnasAdicionales: [],
  barcosPorPedido: { '8a': { med: 'Galileo' } }
}, [
  { cliente: 'Lorena', medida: 'Med c/c', taras: 10 },
  { cliente: '8a', medida: 'Cam s/c', taras: 4 }
]);
assert.equal(fusion.errores.length, 0);
assert.equal(fusion.pedidos.Veronica.med, 10);
assert.equal(fusion.pedidos['8a']['cam s/c'], 4);
assert.equal(fusion.pedidos['8a'].med, 3);
assert.equal(fusion.pedidos.Catarro.gde, 7);
assert.equal(fusion.barcosPorPedido['8a'].med, 'Galileo');
assert.equal(fusion.pedidos.Lorena, undefined);
console.log('✓ Fusión en memoria: Lorena escribe Veronica y no pisa otras celdas');

conEmulador('demo-reypez-crudo', async ({ db, handlers }) => {
  await db.collection('pedidos').add({
    fecha: '2026-10-11',
    tipo: 'crudo',
    pedidos: {
      '8a': { med: 3 },
      Catarro: { gde: 7 },
      Otilio: {},
      Ozuna: {},
      Veronica: {}
    },
    barcosPorPedido: { Catarro: { gde: 'Maria' } },
    columnas: ['Med', 'Med-Esp', 'Med-gde', 'Gde', 'Extra', 'Jumbo', 'Cam s/c'],
    columnasAdicionales: [],
    tipoPedido: 'ui',
    kilos: 0,
    taras: 0
  });

  const mezcla = await callHandler(handlers.handlePostPedidosCrudo, 'POST', '/pedidos/crudo', {
    fecha: '2026-10-11',
    idempotencyKey: 'crudo-mezcla',
    celdas: [
      { cliente: 'lorena', medida: 'Med c/c', taras: 10 },
      { cliente: '8a', medida: 'Jumbo c/c', taras: 2 }
    ]
  });
  assert.equal(mezcla.status, 200, JSON.stringify(mezcla.body));
  assert.equal(mezcla.body.operation, 'pedidos_crudo_update');
  const guardado = await db.collection('pedidos').doc(mezcla.body.pedidoId).get();
  const data = guardado.data();
  assert.equal(data.pedidos.Veronica.med, 10);
  assert.equal(data.pedidos['8a'].med, 3);
  assert.equal(data.pedidos['8a'].jumbo, 2);
  assert.equal(data.pedidos.Catarro.gde, 7);
  assert.equal(data.barcosPorPedido.Catarro.gde, 'Maria');
  assert.equal(data.pedidos.Lorena, undefined);
  assert.equal(data.kilos, Math.floor((3 + 2 + 7 + 10) * 19));
  console.log('✓ POST mezcla sobre el pedido de la UI sin borrar celdas');

  const nuevo = await callHandler(handlers.handlePostPedidosCrudo, 'POST', '/pedidos/crudo', {
    fecha: '2026-10-12',
    idempotencyKey: 'crudo-nuevo',
    pedidos: { Ozuna: { 'Cam s/c': 5 }, Otilio: { 'Med-Esp c/c': 1 } }
  });
  assert.equal(nuevo.body.operation, 'pedidos_crudo_create');
  const creado = (await db.collection('pedidos').doc(nuevo.body.pedidoId).get()).data();
  assert.equal(creado.tipo, 'crudo');
  assert.equal(creado.pedidos.Ozuna['cam s/c'], 5);
  assert.equal(creado.pedidos.Otilio['med-esp'], 1);
  assert.ok(creado._asistenteId);
  assert.ok(creado.columnas.includes('Cam s/c'));
  console.log('✓ Crea el pedido crudo si no existe, con la clave en minúsculas');

  const consulta = await callHandler(handlers.handleGetPedidosCrudo, 'GET', '/pedidos/crudo?fecha=2026-10-12');
  assert.equal(consulta.body.exists, true);
  assert.equal(consulta.body.pedido.pedidos.Ozuna['cam s/c'], 5);
  console.log('✓ GET devuelve el pedido del día');

  const undoNuevo = await callHandler(handlers.handlePostPedidosCrudoDeshacer, 'POST', '/pedidos/crudo/deshacer', {
    idempotencyKey: 'crudo-nuevo'
  });
  assert.equal(undoNuevo.status, 200, JSON.stringify(undoNuevo.body));
  assert.equal(undoNuevo.body.action, 'deleted_document');
  assert.equal((await db.collection('pedidos').doc(nuevo.body.pedidoId).get()).exists, false);
  console.log('✓ Deshacer un pedido creado por el asistente elimina el documento');

  const undoMezcla = await callHandler(handlers.handlePostPedidosCrudoDeshacer, 'POST', '/pedidos/crudo/deshacer', {
    idempotencyKey: 'crudo-mezcla'
  });
  assert.equal(undoMezcla.body.action, 'reverted_cells');
  const restaurado = (await db.collection('pedidos').doc(mezcla.body.pedidoId).get()).data();
  assert.equal(restaurado.pedidos.Veronica.med, undefined);
  assert.equal(restaurado.pedidos['8a'].jumbo, undefined);
  assert.equal(restaurado.pedidos['8a'].med, 3);
  assert.equal(restaurado.pedidos.Catarro.gde, 7);
  console.log('✓ Deshacer la mezcla revierte solo las celdas del asistente');
}).then(() => {
  console.log('\nTodos los tests de pedido crudo pasaron');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
