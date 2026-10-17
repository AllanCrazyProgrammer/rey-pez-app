const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function load(filename) {
  const module = { exports: {} };
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  vm.runInNewContext(code, { module, exports: module.exports, require(id) {
    return id.startsWith('.') ? load(path.resolve(path.dirname(filename), id + '.js')) : require(id);
  } });
  return module.exports;
}
const { cuentasPendientesCatarro, datosCuentaCatarroDesdeEmbarque, combinarEmbarquesCatarro } =
  load(path.resolve(__dirname, '../src/utils/cuentasPendientesCatarro.js'));
const producto = { medida: '41/50', kilos: [25.5], taras: [1], restarTaras: true, precio: 100 };
const crudo = { items: [{ talla: 'Med c/c', taras: '2-19', precio: 90 }] };
const embarque = (fecha, cliente = '2') => ({ fecha, clientes: [{ id: cliente, productos: [producto], crudos: [] }] });

test('solo muestra faltantes desde el 15 de octubre de 2026, sin duplicados ni otros clientes', () => {
  const pendientes = cuentasPendientesCatarro([{ fecha: '2026-10-16T00:00:00.000Z' }], [
    embarque('2026-10-14'), embarque('2026-10-15'), embarque('2026-10-15'),
    embarque('2026-10-16'), embarque('2026-10-17', '5'), embarque('2026-11-01'),
    { fecha: '2026-10-18', clientes: [{ id: '2', productos: [{}], crudos: [{ items: [{}] }] }] },
  ]);
  assert.deepEqual(Array.from(pendientes, nota => nota.fecha), ['2026-10-15', '2026-11-01']);
  assert.ok(pendientes.every(nota => nota.missingNota && !nota.estadoPagado));
});

test('detecta y prepara crudos sin productos y preserva las opciones y precios', () => {
  const datos = datosCuentaCatarroDesdeEmbarque({ fecha: '2026-10-15',
    clientes: [{ id: 2, productos: [{}], crudos: [crudo] }], clientesSumarKgCatarro: { '2': false } });
  assert.equal(datos.productos.length, 0);
  assert.equal(datos.clienteCrudos['2'][0].items[0].precio, 90);
  assert.equal(datos.clientesSumarKgCatarro['2'], false);
  assert.equal(cuentasPendientesCatarro([], [datos]).length, 1);
});

test('soporta embarques antiguos con productos y crudos en la raíz', () => {
  const datos = datosCuentaCatarroDesdeEmbarque({ fecha: '2026-10-16',
    productos: [{ ...producto, clienteId: 2 }, { ...producto, clienteId: '5' }],
    clientesCrudos: { '2': [crudo] } });
  assert.equal(datos.productos.length, 1);
  assert.equal(datos.productos[0].kilos[0], 25.5);
  assert.equal(datos.clienteCrudos['2'].length, 1);
});

test('no duplica productos cuando están en clientes y también en la raíz', () => {
  const datos = datosCuentaCatarroDesdeEmbarque({ ...embarque('2026-10-16'),
    productos: [{ ...producto, clienteId: '2' }] });
  assert.equal(datos.productos.length, 1);
});

test('dos embarques del mismo día generan una sola nota con todo el producto', () => {
  const primero = { ...embarque('2026-10-16'), clientesSumarKgCatarro: { '2': false } };
  const segundo = { ...embarque('2026-10-16'), clientes: [{ id: '2', productos: [producto], crudos: [crudo] }] };
  const datos = combinarEmbarquesCatarro([primero, segundo, embarque('2026-10-17')], '2026-10-16');
  assert.equal(datos.productos.length, 2);
  assert.equal(datos.productos[0].noSumarKilos, true);
  assert.equal(datos.productos[1].noSumarKilos, false);
  assert.equal(datos.clienteCrudos['2'].length, 1);
  assert.equal(datos.clientesSumarKgCatarro['2'], true);
  assert.equal(primero.clientes[0].productos[0].noSumarKilos, undefined, 'no modifica el embarque');
});

test('no crea una nota vacía si el embarque se borró o cambió de fecha', () => {
  assert.throws(() => combinarEmbarquesCatarro([], '2026-10-15'), /ya no tiene productos/);
  assert.throws(() => combinarEmbarquesCatarro([embarque('2026-10-16')], '2026-10-15'), /ya no tiene productos/);
});
