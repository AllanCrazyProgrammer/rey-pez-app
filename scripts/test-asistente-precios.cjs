#!/usr/bin/env node
/**
 * Precios de venta: forma del modal y precio vigente de preciosHistoricos.js.
 *
 *   node scripts/test-asistente-precios.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const precios = require('../functions/lib/preciosVenta');
const { conEmulador, callHandler } = require('./lib/asistente-emulator.cjs');

function cargarHistoricos() {
  const file = 'src/utils/preciosHistoricos.js';
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = babel.transformSync(source, {
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code;
  const context = {
    exports: {},
    console: { log() {}, warn() {}, error() {} },
    require(name) {
      if (name === './dateUtils' || name.endsWith('/dateUtils')) {
        return {
          normalizarFechaISO: (fecha) => String(fecha).slice(0, 10),
          obtenerFechaActualISO: () => '2026-10-13',
          esFechaValida: (precioFecha, limite) => String(precioFecha).slice(0, 10) <= String(limite).slice(0, 10)
        };
      }
      throw new Error('Unexpected dependency: ' + name);
    }
  };
  vm.runInNewContext(code, context, { filename: file });
  return context.exports;
}

const historicos = cargarHistoricos();
for (const nombre of ['Med Esp c/c', 'MED-ESP c/c', 'Med Gde c/c', 'med-gde c/c']) {
  assert.equal(precios.normalizarNombreProductoPrecio(nombre), historicos.normalizarNombreProductoPrecio(nombre));
}
const muestra = [
  { producto: '51/60', precio: 100, fecha: '2026-09-01', timestamp: 1 },
  { producto: '51/60', precio: 130, fecha: '2026-10-01', timestamp: 2, clienteId: 'veronica' },
  { producto: 'Med Esp c/c', precio: 80, fecha: '2026-09-01', timestamp: 1 },
  { producto: 'Med-Esp c/c', precio: 90, fecha: '2026-10-02', timestamp: 3 },
  { producto: '51/60', precio: 999, fecha: '2026-12-01', timestamp: 9 }
];
assert.equal(
  precios.obtenerCoincidenciaDeMedida(precios.obtenerDetallesPreciosParaFecha(muestra, '2026-10-13', 'veronica'), '51/60').precio,
  historicos.obtenerPrecioParaMedida(muestra, '51/60', '2026-10-13', 'veronica')
);
assert.equal(
  precios.obtenerCoincidenciaDeMedida(precios.obtenerDetallesPreciosParaFecha(muestra, '2026-09-15', 'veronica'), '51/60').precio,
  historicos.obtenerPrecioParaMedida(muestra, '51/60', '2026-09-15', 'veronica')
);
assert.equal(
  precios.obtenerCoincidenciaDeMedida(precios.obtenerDetallesPreciosParaFecha(muestra, '2026-10-13', null), 'Med Esp c/c').precio,
  historicos.obtenerPrecioParaMedida(muestra, 'Med Esp c/c', '2026-10-13', null)
);
console.log('✓ El precio vigente coincide con preciosHistoricos.js');

conEmulador('demo-reypez-precios', async ({ db, handlers }) => {
  await db.collection('precios').add({
    producto: '51/60',
    precio: 100,
    fecha: '2026-09-01',
    categoria: 'Camarón S/C',
    timestamp: 1,
    fechaCreacion: '2026-09-01',
    horaCreacion: '10:00:00'
  });

  const alias = await callHandler(handlers.handlePostPrecios, 'POST', '/precios', {
    producto: 'Med esp c/c',
    precio: 185,
    fecha: '2026-10-13',
    idempotencyKey: 'precio-med-esp'
  });
  assert.equal(alias.status, 200, JSON.stringify(alias.body));
  assert.equal(alias.body.precio.producto, 'Med-Esp c/c');
  assert.equal(alias.body.precio.precio, 185);
  assert.equal(alias.body.precio.categoria, 'Camarón C/C');
  assert.equal(alias.body.precio.fecha, '2026-10-13');
  assert.equal(typeof alias.body.precio.timestamp, 'number');
  assert.equal(typeof alias.body.precio.fechaCreacion, 'string');
  assert.equal(typeof alias.body.precio.horaCreacion, 'string');
  assert.equal(alias.body.precio.clienteId, undefined);
  const guardado = (await db.collection('precios').doc(alias.body.precioId).get()).data();
  assert.equal(guardado.producto, 'Med-Esp c/c');
  assert.equal(Object.prototype.hasOwnProperty.call(guardado, 'clienteId'), false);
  console.log('✓ POST normaliza el alias y omite clienteId en el precio general');

  const especifico = await callHandler(handlers.handlePostPrecios, 'POST', '/precios', {
    producto: '51-60',
    precio: 140,
    fecha: '2026-10-01',
    clienteId: 'Lorena',
    idempotencyKey: 'precio-veronica'
  });
  assert.equal(especifico.status, 200, JSON.stringify(especifico.body));
  assert.equal(especifico.body.precio.producto, '51/60');
  assert.equal(especifico.body.precio.clienteId, 'veronica');
  assert.equal(especifico.body.precio.categoria, 'Camarón S/C');
  console.log('✓ 51-60 cae en el 51/60 del catálogo y Lorena se guarda como veronica');

  const raro = await callHandler(handlers.handlePostPrecios, 'POST', '/precios', {
    producto: 'camarón fantasma',
    precio: 10,
    fecha: '2026-10-13',
    idempotencyKey: 'precio-raro'
  });
  assert.equal(raro.status, 400);
  assert.equal(raro.body.error.code, 'PRODUCTO_DESCONOCIDO');
  assert.ok(Array.isArray(raro.body.error.details.sugerencias));
  console.log('✓ Un producto fuera del catálogo se rechaza con sugerencias');

  const vigente = await callHandler(handlers.handleGetPrecios, 'GET', '/precios?fecha=2026-10-13&cliente=veronica&producto=51/60');
  assert.equal(vigente.status, 200, JSON.stringify(vigente.body));
  assert.equal(vigente.body.precios[0].precio, 140);
  assert.equal(vigente.body.precios[0].origen, 'especifico');

  const antes = await callHandler(handlers.handleGetPrecios, 'GET', '/precios?fecha=2026-09-15&cliente=veronica&producto=51/60');
  assert.equal(antes.body.precios[0].precio, 100);
  assert.equal(antes.body.precios[0].origen, 'general');

  const lista = await callHandler(handlers.handleGetPrecios, 'GET', '/precios?fecha=2026-10-13');
  assert.ok(lista.body.generales.some((item) => item.producto === 'Med-Esp c/c' && item.precio === 185));
  assert.ok(lista.body.porCliente.veronica.some((item) => item.producto === '51/60' && item.precio === 140));
  assert.ok(lista.body.porCliente.otilio.some((item) => item.producto === '51/60' && item.precio === 100));
  console.log('✓ GET usa el precio del cliente y, si no hay, el general vigente a la fecha');
}).then(() => {
  console.log('\nTodos los tests de precios pasaron');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
