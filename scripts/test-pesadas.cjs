/* Run with: node scripts/test-pesadas.cjs. No Firebase account or network needed. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
const originalJs = require.extensions['.js'];
require.extensions['.js'] = (module, filename) => {
  if (!filename.startsWith(path.join(root, 'src'))) return originalJs(module, filename);
  const result = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
  });
  module._compile(result.code, filename);
};
const { decimalPesada, elementosPesadas, resumenPesadas, aplicarCamposPesadas, fechaPesadasHoy, fechaPesadasValida, formatoPesada } = require('../src/utils/pesadas');
const { documentoPesadas } = require('../src/utils/pdf/pesadas');
const { PesadasOutbox } = require('../src/services/pesadasOutbox');

const sample = () => ({
  columnas: { c1: { precio: 10, orden: '0', medida: '51' }, c2: { precio: 12, orden: '1', medida: 'laguna' } },
  personas: { p1: { nombre: 'Luisa', orden: '0' }, p2: { nombre: '', orden: '1' } },
  pesos: { p1: { c1: 2.9, c2: 4.1 }, p2: { c1: 99 } }
});
const storage = () => {
  const map = new Map();
  return { get length() { return map.size; }, key: index => [...map.keys()][index], getItem: key => map.get(key) || null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
};
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };

test('accepts one decimal, comma, zero and blank kilos; rejects silent rounding', () => {
  for (const [input, expected] of [['2,9', 2.9], ['0', 0], ['10.0', 10], ['', null], [' 3.1 ', 3.1]]) assert.equal(decimalPesada(input), expected);
  for (const input of ['1.25', '2,90', '-1', 'Infinity', 'NaN', '1e3', '2.', '1,2.3']) assert.throws(() => decimalPesada(input));
  assert.throws(() => decimalPesada('', false));
  assert.throws(() => decimalPesada('999999999999999999'));
  assert.equal(formatoPesada(10), '10');
  assert.equal(formatoPesada(77.2), '77.2');
});

test('new timestamp-ordered columns stay after the initial weighing columns', () => {
  const columns = elementosPesadas({
    c1: { orden: '0' }, c2: { orden: '1' }, c3: { orden: '2' },
    newest: { orden: '1757270000000-a1b2' }
  });
  assert.deepEqual(columns.map(column => column.id), ['c1', 'c2', 'c3', 'newest']);
});

test('calculates mixed column prices and deducts bathrooms once per named person', () => {
  const summary = resumenPesadas(sample());
  assert.deepEqual(summary.personas[0], { id: 'p1', nombre: 'Luisa', kilos: 7, bruto: 78.2, pago: 77.2 });
  assert.equal(summary.banos, 1);
  assert.equal(summary.pagos, 77.2);
  assert.equal(summary.bruto, 78.2);
  assert.equal(summary.pagoPromedio, 77.2);
  assert.deepEqual(summary.mejor, summary.personas[0]);
  assert.equal(Math.round(summary.precioPromedio * 10) / 10, 11.2);
});

test('rounds once per person, half up, and totals rounded payments', () => {
  const data = sample();
  data.columnas.c1.precio = 1.5;
  data.columnas.c2.precio = 1.5;
  data.pesos.p1 = { c1: 1.1, c2: 1.1 };
  assert.equal(resumenPesadas(data).personas[0].bruto, 3.3);
  data.pesos.p1 = { c1: 1.1, c2: 0 };
  assert.equal(resumenPesadas(data).personas[0].bruto, 1.7);
  data.personas.p2.nombre = 'Sandra';
  data.pesos.p2 = { c1: 1.1 };
  assert.equal(resumenPesadas(data).bruto, 3.4);
  assert.equal(resumenPesadas(data).pagos, 1.4);
});

test('editing tariffs and deleting rows or columns recalculates without orphan weights', () => {
  let data = sample();
  data = aplicarCamposPesadas(data, { 'columnas.c1.precio': 20 });
  assert.equal(resumenPesadas(data).personas[0].bruto, 107.2);
  data = aplicarCamposPesadas(data, { 'columnas.c2.eliminado': true });
  assert.equal(resumenPesadas(data).personas[0].bruto, 58);
  data = aplicarCamposPesadas(data, { 'personas.p1.eliminado': true });
  assert.equal(resumenPesadas(data).banos, 0);
  assert.equal(resumenPesadas(data).kilos, 0);
});

test('named zero-weight rows count for bathrooms; negative pay blocks print', () => {
  const data = sample();
  data.personas.p2.nombre = 'Sandra';
  data.pesos.p2 = {};
  assert.equal(resumenPesadas(data).banos, 2);
  assert.equal(resumenPesadas(data).personas[1].pago, -1);
  assert.throws(() => documentoPesadas('2026-09-05', data), /negativos/);
  assert.throws(() => documentoPesadas('2026-09-05', {}), /despicadora/);
});

test('PDF uses the same one-decimal payments, named rows only, date header and last bathrooms row', () => {
  const pdf = documentoPesadas('2026-09-05', sample());
  assert.equal(pdf.pageSize, 'LETTER');
  const table = pdf.content[0].table;
  assert.equal(table.headerRows, 1);
  assert.equal(table.dontBreakRows, true);
  assert.equal(table.body.length, 3);
  assert.equal(table.body[0][0].text, '5/9/2026');
  assert.equal(table.body[1][1].text, '77.2');
  assert.equal(table.body[2][0].text, 'Baños');
  assert.equal(table.body[2][1].text, '1');
});

test('dates use Mexico City local day and reject invalid dates', () => {
  assert.equal(fechaPesadasHoy(new Date('2026-09-06T03:00:00Z')), '2026-09-05');
  assert.equal(fechaPesadasValida('2026-02-29'), false);
  assert.equal(fechaPesadasValida('2024-02-29'), true);
  assert.equal(fechaPesadasValida('2026-13-01'), false);
});

test('durable queue survives reload and isolates dates', async () => {
  const disk = storage();
  const box = new PesadasOutbox({ fecha: '2026-09-05', storage: disk, write: async () => {}, delay: 100000 });
  box.edit({ 'pesos.p1.c1': 2.9 });
  box.dispose();
  let sent;
  const resumed = new PesadasOutbox({ fecha: '2026-09-05', storage: disk, write: async fields => { sent = fields; }, delay: 100000 });
  const otherDay = new PesadasOutbox({ fecha: '2026-09-06', storage: disk, write: async () => {} });
  assert.deepEqual(otherDay.fields, {});
  await resumed.flush();
  assert.deepEqual(sent, { 'pesos.p1.c1': 2.9 });
  assert.equal(disk.length, 0);
  resumed.dispose(); otherDay.dispose();
});

test('older acknowledgements preserve newer edits of the same cell', async () => {
  const request = deferred();
  const box = new PesadasOutbox({ fecha: '2026-09-05', storage: storage(), write: () => request.promise, delay: 100000 });
  box.edit({ 'pesos.p1.c1': 2.9 });
  const save = box.flush();
  box.edit({ 'pesos.p1.c1': 4.1 });
  request.resolve();
  await save;
  assert.deepEqual(box.fields, { 'pesos.p1.c1': 4.1 });
  box.dispose();
});

test('failed writes retain pending data and retry successfully', async () => {
  let fail = true;
  const box = new PesadasOutbox({ fecha: '2026-09-05', storage: storage(), write: async () => { if (fail) throw new Error('offline'); }, delay: 100000 });
  box.edit({ 'pesos.p1.c1': 3.2 });
  await box.flush();
  assert.match(box.error, /offline/);
  assert.equal(box.fields['pesos.p1.c1'], 3.2);
  fail = false;
  await box.flush();
  assert.deepEqual(box.fields, {});
  assert.equal(box.error, '');
  box.dispose();
});

test('two tabs preserve edits to different cells without writing entire maps', async () => {
  const disk = storage();
  let remote = {};
  const writes = [];
  const write = async fields => { writes.push(fields); remote = aplicarCamposPesadas(remote, fields); };
  const a = new PesadasOutbox({ fecha: '2026-09-05', storage: disk, write, delay: 100000 });
  const b = new PesadasOutbox({ fecha: '2026-09-05', storage: disk, write, delay: 100000 });
  a.edit({ 'pesos.p1.c1': 2.9 });
  b.edit({ 'pesos.p2.c2': 4.1 });
  await a.flush();
  b.syncStorage();
  await b.flush();
  assert.deepEqual(remote.pesos, { p1: { c1: 2.9 }, p2: { c2: 4.1 } });
  assert.equal(writes.length, 1);
  a.dispose(); b.dispose();
});

test('newer remote snapshot is not rolled back when an older save resolves', async () => {
  const request = deferred();
  const box = new PesadasOutbox({ fecha: '2026-09-05', storage: storage(), write: () => request.promise, delay: 100000 });
  box.edit({ 'pesos.p1.c1': 2.9 });
  const save = box.flush();
  box.receive({ pesos: { p1: { c1: 4.1 } } });
  request.resolve();
  await save;
  assert.equal(box.remote.pesos.p1.c1, 4.1);
  box.dispose();
});

test('simultaneous edits from stale tab snapshots append distinct durable records', async () => {
  const disk = storage();
  let remote = {};
  const write = async fields => { remote = aplicarCamposPesadas(remote, fields); };
  const a = new PesadasOutbox({ fecha: '2026-09-05', storage: disk, write, delay: 100000 });
  const b = new PesadasOutbox({ fecha: '2026-09-05', storage: disk, write, delay: 100000 });
  const readB = b.read;
  b.read = () => {}; // Both tabs saw an empty outbox before either wrote.
  a.edit({ 'pesos.p1.c1': 2.9 });
  b.edit({ 'pesos.p2.c1': 3.2 });
  b.read = readB;
  assert.equal(disk.length, 2);
  await a.flush();
  assert.deepEqual(remote.pesos, { p1: { c1: 2.9 }, p2: { c1: 3.2 } });
  assert.equal(disk.length, 0);
  a.dispose(); b.dispose();
});

test('editing never rewrites another operation that another tab may be acknowledging', () => {
  const disk = storage();
  const calls = [];
  const set = disk.setItem;
  disk.setItem = (key, value) => { calls.push(key); set(key, value); };
  const box = new PesadasOutbox({ fecha: '2026-09-05', storage: disk, write: async () => {}, delay: 100000 });
  box.edit({ 'pesos.p1.c1': 2.9 });
  box.edit({ 'pesos.p2.c1': 3.2 });
  assert.equal(calls.length, 2);
  assert.equal(new Set(calls).size, 2);
  box.dispose();
});

test('storage failure keeps edits until both remote save and local cleanup succeed', async () => {
  let blocked = true;
  const disk = { get length() { if (blocked) throw new Error('blocked'); return 0; }, getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { if (blocked) throw new Error('blocked'); } };
  let sent;
  const box = new PesadasOutbox({ fecha: '2026-09-05', storage: disk, write: async fields => { sent = fields; }, delay: 100000 });
  box.edit({ 'pesos.p1.c1': 8.2 });
  assert.equal(box.storageError, true);
  await box.flush();
  assert.equal(sent['pesos.p1.c1'], 8.2);
  assert.equal(box.fields['pesos.p1.c1'], 8.2);
  blocked = false;
  await box.flush();
  assert.deepEqual(box.fields, {});
  box.dispose();
});

// Compile the actual Vue script to exercise keyboard behavior without a DOM dependency.
const compiler = require('vue-template-compiler');
const source = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/Pesadas/PesadasDia.vue'), 'utf8')).script.content;
const componentModule = new Module(path.join(root, 'src/views/Pesadas/PesadasDia.test.js'), module);
componentModule.filename = componentModule.id;
componentModule.paths = module.paths;
componentModule.require = request => {
  if (request.endsWith('.vue') || request.endsWith('.css') || request.includes('pesadas.service')) return {};
  return require(request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request);
};
componentModule._compile(babel.transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code, componentModule.filename);
const methods = componentModule.exports.default.methods;

test('Enter on name moves to existing next row or adds exactly one new row', () => {
  const calls = [];
  const vm = { personas: [{ id: 'p1', nombre: 'Luisa' }, { id: 'p2', nombre: '' }], confirmar: value => calls.push(['confirmar', value]), enfocar: value => calls.push(['focus', value]), agregarPersona: value => calls.push(['add', value]) };
  methods.enterNombre.call(vm, 'p1');
  assert.deepEqual(calls.pop(), ['focus', 'nombre-p2']);
  const count = calls.length;
  methods.enterNombre.call(vm, 'p2');
  assert.equal(calls.length, count);
  vm.personas[1].nombre = 'Sandra';
  methods.enterNombre.call(vm, 'p2');
  assert.deepEqual(calls.pop(), ['add', true]);
});

test('Enter on kilos skips unnamed rows and never creates people', () => {
  let focused;
  const vm = { errores: {}, personas: [{ id: 'p1', nombre: 'Luisa' }, { id: 'p2', nombre: '' }, { id: 'p3', nombre: 'Sandra' }], confirmar() {}, enfocar: value => { focused = value; } };
  methods.enterPeso.call(vm, { personaId: 'p1', columnaId: 'c1' });
  assert.equal(focused, 'peso-p3-c1');
  focused = null;
  methods.enterPeso.call(vm, { personaId: 'p3', columnaId: 'c1' });
  assert.equal(focused, null);
  vm.errores['pesos.p1.c1'] = 'Invalid';
  methods.enterPeso.call(vm, { personaId: 'p1', columnaId: 'c1' });
  assert.equal(focused, null);
});

test('Enter moves vertically from a measure to its price and weighings', () => {
  const focused = [];
  const confirmed = [];
  const vm = {
    errores: {},
    columnas: [{ id: 'c1' }, { id: 'c2' }],
    personas: [{ id: 'p1', nombre: 'Luisa' }, { id: 'p2', nombre: '' }],
    confirmar: path => confirmed.push(path), enfocar: ref => focused.push(ref)
  };
  methods.enterMedida.call(vm, 'c1');
  assert.deepEqual(focused.pop(), 'precio-c1');
  methods.enterPrecio.call(vm, 'c1');
  assert.deepEqual(focused.pop(), 'peso-p1-c1');
  vm.personas = [{ id: 'p1', nombre: '' }];
  methods.enterPrecio.call(vm, 'c2');
  assert.deepEqual(focused.pop(), 'nombre-p1');
  vm.errores['columnas.c1.precio'] = 'Inválido';
  const confirmationsBeforeError = confirmed.length;
  methods.enterPrecio.call(vm, 'c1');
  assert.equal(confirmed.length, confirmationsBeforeError);
});

test('horizontal swipe at table edges never propagates to browser history', () => {
  let prevented = 0;
  const atEdge = (scrollLeft, deltaX) => ({ deltaX, deltaY: 0,
    target: { closest: () => ({ scrollLeft, clientWidth: 200, scrollWidth: 600 }) },
    preventDefault: () => { prevented++; } });
  methods.bloquearRetrocesoHorizontal(atEdge(0, -20));
  methods.bloquearRetrocesoHorizontal(atEdge(400, 20));
  methods.bloquearRetrocesoHorizontal(atEdge(150, 20));
  assert.equal(prevented, 2);
  methods.bloquearRetrocesoHorizontal({ deltaX: 30, deltaY: 0, target: { closest: () => null }, preventDefault: () => { prevented++; } });
  assert.equal(prevented, 3);
});

const cuentasSource = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/Cuentas.vue'), 'utf8')).script.content;
const cuentasModule = new Module(path.join(root, 'src/Cuentas.test.js'), module);
cuentasModule.require = () => ({});
cuentasModule._compile(babel.transformSync(cuentasSource, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code, cuentasModule.id);
const cuentas = cuentasModule.exports.default;
const cashVm = admitirDecimales => {
  const vm = { admitirDecimales };
  Object.assign(vm, cuentas.data.call(vm));
  Object.entries(cuentas.methods).forEach(([name, fn]) => { vm[name] = fn.bind(vm); });
  return vm;
};
test('cash breakdown preserves tenths per worker and both coin choices', () => {
  const vm = cashVm(true);
  for (const isTwo of [true, false]) {
    vm.procesarDatos({ data: ['77.2', '2.9', '0', '119'], isTwo });
    assert.equal(cuentas.computed.totalGeneral.call(vm), 199.1);
    assert.equal(vm.billetes[0.5], 1);
    assert.equal(vm.billetes[0.2], 3);
    assert.equal(vm.billetes[2] > 0, isTwo);
  }
  vm.procesarDatos({ data: ['3', '3'], isTwo: true });
  assert.equal(vm.billetes[5], 0); // Separate envelopes, not one breakdown of the total.
  assert.equal(vm.billetes[2], 2);
});
test('legacy accounts preserve whole-peso mode', () => {
  const vm = cashVm(false);
  vm.procesarDatos({ data: ['77.2'], isTwo: true });
  assert.equal(cuentas.computed.totalGeneral.call(vm), 77);
});
test('weighing cash uses final named payments and blocks invalid sheets', () => {
  let flushed = false;
  const vm = { puedeImprimir: true, _outbox: { flush() { flushed = true; } }, resumen: resumenPesadas(sample()) };
  methods.abrirCuentas.call(vm);
  assert.equal(vm.cuentasDatos, '77.2');
  assert.equal(vm.cuentasAbiertas, true);
  assert.equal(flushed, true);
  const invalid = { puedeImprimir: false };
  methods.abrirCuentas.call(invalid);
  assert.equal(invalid.cuentasAbiertas, undefined);
});

test('weighing cash opens with one-peso coins by default', () => {
  let input;
  const vm = { cuentasDatos: '77.2\n19', $refs: { cuentas: { procesarDatos(value) { input = value; } } } };
  methods.calcularCuentas.call(vm);
  assert.deepEqual(input, { data: ['77.2', '19'], isTwo: false });
});
