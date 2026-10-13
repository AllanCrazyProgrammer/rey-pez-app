#!/usr/bin/env node
/**
 * Etiquetas y kilos en blanco de pedidos limpio.
 *
 *   node scripts/test-asistente-pedidos-limpio-lineas.cjs
 */
const assert = require('node:assert/strict');
const { conEmulador, callHandler } = require('./lib/asistente-emulator.cjs');

conEmulador('demo-reypez-limpio-lineas', async ({ db, handlers }) => {
  await db.collection('medidas').add({ nombre: '51/60', tipo: 'granja' });
  await db.collection('pedidos').add({
    fecha: '2026-10-20',
    tipo: 'limpio',
    otilio: [{ kilos: 5, esTara: true, medida: '51/60', tipo: '', nota: '', esProveedor: false, proveedor: '', etiqueta: '' }],
    catarro: [],
    joselito: [],
    ozuna: [],
    lorena: [],
    clientesTemporales: {},
    etiquetas: ['61 Selecta', 'Agua'],
    etiquetasColores: { '61 Selecta': 2, Agua: 0 },
    rendimientos: {},
    divisores: {},
    completados: {},
    kilosRefrigerados: {}
  });

  const desconocida = await callHandler(handlers.handlePostPedidosLimpio, 'POST', '/pedidos/limpio', {
    fecha: '2026-10-20',
    idempotencyKey: 'limpio-etiqueta-mala',
    lineas: [{ cliente: 'otilio', cantidad: 2, unidad: 'taras', medida: '51/60', etiqueta: '99 Fantasma' }]
  });
  assert.equal(desconocida.status, 400);
  assert.equal(desconocida.body.error.code, 'VALIDACION_ERROR');
  const detalle = desconocida.body.error.details.errores[0];
  assert.deepEqual(detalle.disponibles, ['61 Selecta', 'Agua']);
  console.log('✓ Etiqueta desconocida lista los botones del pedido');

  const puesta = await callHandler(handlers.handlePostPedidosLimpio, 'POST', '/pedidos/limpio', {
    fecha: '2026-10-20',
    idempotencyKey: 'limpio-etiqueta-ok',
    lineas: [{ cliente: 'otilio', cantidad: 2, unidad: 'taras', medida: '51/60', etiqueta: '61 selecta' }]
  });
  assert.equal(puesta.status, 200, JSON.stringify(puesta.body));
  const pedido = (await db.collection('pedidos').where('fecha', '==', '2026-10-20').where('tipo', '==', 'limpio').get()).docs[0].data();
  assert.equal(pedido.otilio.length, 2);
  assert.equal(pedido.otilio[0].etiqueta, '');
  assert.equal(pedido.otilio[1].etiqueta, '61 Selecta');
  assert.deepEqual(pedido.etiquetas, ['61 Selecta', 'Agua']);
  console.log('✓ La etiqueta se guarda con el texto exacto del botón');

  const vacia = await callHandler(handlers.handlePostPedidosLimpio, 'POST', '/pedidos/limpio', {
    fecha: '2026-10-20',
    idempotencyKey: 'limpio-kilos-vacios',
    lineas: [
      { cliente: 'otilio', medida: 'macuil', tipo: 'piojo con agua', cantidad: null },
      { cliente: 'catarro', medida: 'piojo con agua', kilos: '' }
    ]
  });
  assert.equal(vacia.status, 200, JSON.stringify(vacia.body));
  const despues = (await db.collection('pedidos').where('fecha', '==', '2026-10-20').where('tipo', '==', 'limpio').get()).docs[0].data();
  const macuil = despues.otilio.find((item) => item.medida === 'macuil');
  assert.equal(macuil.kilos, null);
  assert.equal(macuil.tipo, 'piojo con agua');
  assert.equal(macuil.esTara, true);
  assert.equal(macuil.etiqueta, '');
  const piojo = despues.catarro[0];
  assert.equal(piojo.medida, 'piojo con agua');
  assert.equal(piojo.kilos, null);
  assert.equal(piojo.tipo, 'S/H20');
  assert.equal(piojo.esTara, false);
  assert.equal(despues.otilio[0].kilos, 5);
  console.log('✓ Kilos en blanco se guardan como null, macuil conserva el tipo libre');
}).then(() => {
  console.log('\nTodos los tests de líneas limpio pasaron');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
