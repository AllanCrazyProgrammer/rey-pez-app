const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function load(file, mocks = {}, window = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, window, console, Uint8Array, Blob, URL, process,
    setTimeout, clearTimeout, require(id) {
      if (id in mocks) return mocks[id];
      if (id.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), id + '.js')), mocks, window);
      return require(id);
    }
  }, { filename });
  return module.exports;
}

const shipment = { id: 'shipment-1', fecha: '2026-09-26', cargaCon: 'José / Porro', productos: [], clienteCrudos: {} };
function setup(window = {}) {
  const queued = [];
  const mocks = { '@/services/DriveNotasSync': { driveNotasDisponible: () => true, encolarNotaDrive: async note => queued.push(note) } };
  return { queued, mocks, reports: load('src/utils/pdf/reportDelivery.js', mocks, window) };
}

test('web save picker gets dated filename and writes identical bytes to disk and Drive', async () => {
  const written = [];
  let closed = false;
  const window = { showSaveFilePicker: async options => {
    assert.equal(options.suggestedName, 'Resumen-Taras-Jose-Porro-26-sept-26.pdf');
    return { createWritable: async () => ({ write: async data => written.push(data), close: async () => { closed = true; } }) };
  } };
  const { reports, queued } = setup(window);
  const destination = await reports.prepararGuardadoReporte('taras', shipment);
  await reports.guardarYRespaldarReporte('taras', shipment, new Uint8Array([37,80,68,70]), destination);
  assert.equal(closed, true);
  assert.deepEqual(Buffer.from(written[0]), Buffer.from(queued[0].data));
  assert.equal(queued[0].id, 'taras-shipment-1-2026-9-26');
  assert.equal(JSON.stringify(queued[0].period), '{"year":2026,"month":9,"day":26}');
});

test('canceling the native save/replacement dialog does not write or enqueue', async () => {
  const { reports, queued } = setup({ showSaveFilePicker: async () => { throw Object.assign(new Error('cancel'), { name: 'AbortError' }); } });
  const destination = await reports.prepararGuardadoReporte('rendimientos', shipment);
  assert.equal(destination.canceled, true);
  const result = await reports.guardarYRespaldarReporte('rendimientos', shipment, new Uint8Array(), destination);
  assert.equal(result.canceled, true);
  assert.equal(queued.length, 0);
});

test('disk failure aborts the write and never claims or queues a successful local save', async () => {
  const { reports, queued } = setup();
  let aborted = false;
  const destination = { name: 'test.pdf', handle: { createWritable: async () => ({
    write: async () => { throw new Error('disk full'); }, abort: async () => { aborted = true; }
  }) } };
  await assert.rejects(reports.guardarYRespaldarReporte('taras', shipment, new Uint8Array(), destination), /disk full/);
  assert.equal(aborted, true);
  assert.equal(queued.length, 0);
});

test('real taras PDF is saved and queued with shipment identity and date', async () => {
  const saved = [];
  const window = { desktop: { savePdf: async (data, name, period) => { saved.push({ data, name, period }); return {}; } } };
  const { mocks, queued } = setup(window);
  const { generarResumenTarasPDF } = load('src/utils/pdf/resumenTaras.js', mocks, window);
  await generarResumenTarasPDF(shipment, []);
  assert.equal(saved.length, 1);
  assert.equal(queued.length, 1);
  assert.equal(saved[0].name, 'Resumen-Taras-Jose-Porro-26-sept-26.pdf');
  assert.equal(Buffer.from(saved[0].data).subarray(0,5).toString(), '%PDF-');
  assert.deepEqual(Buffer.from(saved[0].data), Buffer.from(queued[0].data));
});

test('rendimientos generates once, saves and queues the same PDF, and cancellation skips generation', async () => {
  const saved = [];
  let generated = 0;
  const window = { desktop: { savePdf: async (data, name) => { saved.push({ data, name }); return {}; } } };
  const { mocks, queued } = setup(window);
  const data = new Uint8Array([37,80,68,70,45,49]);
  const pdfMocks = {
    ...mocks,
    './config': { __esModule: true, default: { createPdf: () => { generated++; return { getBuffer: callback => callback(data) }; } }, configurarPdfMake: () => {}, estilosPdf: {}, configuracionDocumento: {} },
    './formatters': { loadImageAsBase64: async () => '', formatearFecha: () => '26/09/2026' },
    './generators/rendimientos': { generarTablaRendimientos: () => ({}) },
    './generators/ganancias': { generarTablaGanancias: () => ({}) },
    './generators/tarasCrudo': { generarTablaTarasCrudo: () => ({}) },
    './generators/resumen': { generarResumenGananciasTotal: () => ({}) },
    './sacadas': {}
  };
  const { generarPDFRendimientos } = load('src/utils/pdf/index.js', pdfMocks, window);
  await generarPDFRendimientos([], shipment, {});
  assert.equal(generated, 1);
  assert.equal(saved[0].name, 'Rendimientos-Jose-Porro-26-sept-26.pdf');
  assert.deepEqual(Buffer.from(saved[0].data), Buffer.from(queued[0].data));
  assert.equal(queued[0].id, 'rendimientos-shipment-1-2026-9-26');
  await generarPDFRendimientos([], shipment, {}, {}, {}, {}, {}, {}, null, { canceled: true });
  assert.equal(generated, 1);
});
