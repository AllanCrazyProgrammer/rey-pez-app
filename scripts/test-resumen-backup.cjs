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
  vm.runInNewContext(code, { module, exports: module.exports, window, console, Uint8Array,
    setTimeout, clearTimeout, require(id) {
      if (id in mocks) return mocks[id];
      if (id.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), id + '.js')), mocks, window);
      return require(id);
    }
  }, { filename });
  return module.exports;
}

test('real summary PDF uses shipment date and delivers identical bytes to local storage and Drive', async () => {
  const delivered = [];
  const queued = [];
  const window = { desktop: { savePdf: async (data, name, period) => { delivered.push({ data, name, period }); return { canceled: false }; } } };
  const filenames = load('src/utils/pdf/filename.js');
  const delivery = load('src/utils/pdf/delivery.js', {}, window);
  const summary = load('src/utils/pdf/resumenEmbarque.js', {}, window);
  const mixin = load('src/views/Embarques/mixins/pdfGenerationMixin.js', {
    '@/utils/pdfGenerator': {}, '@/utils/pdf/resumenTaras': {},
    '@/utils/pdf/resumenEmbarque': summary, '@/utils/pdf/filename': filenames,
    '@/utils/pdf/delivery': delivery,
    '@/services/DriveNotasSync': { driveNotasDisponible: () => true, encolarNotaDrive: async data => queued.push(data) }
  }).default;
  const instance = { ...mixin.methods, embarque: { id: 'shipment-1', fecha: '2025-02-03', cargaCon: 'José / Porro' },
    clienteCrudos: {}, productosPorCliente: {}, clientesDisponibles: [], obtenerNombreCliente: id => id };
  await instance.generarPDFResumen(100);
  assert.equal(queued.length, 1);
  assert.equal(delivered.length, 1);
  assert.equal(queued[0].name, 'Resumen-Embarque-Jose-Porro-3-feb-25.pdf');
  assert.equal(delivered[0].name, queued[0].name);
  assert.equal(JSON.stringify(delivered[0].period), '{"year":2025,"month":2,"day":3}');
  assert.deepEqual(Buffer.from(delivered[0].data), Buffer.from(queued[0].data));
  assert.equal(Buffer.from(queued[0].data).subarray(0, 5).toString(), '%PDF-');
  assert.ok(queued[0].data.length > 5000);
  await instance.generarPDFResumen(90);
  assert.equal(queued[0].id, queued[1].id, 'regeneration updates the same summary');
  instance.embarqueId = 'shipment-2';
  await instance.generarPDFResumen(100);
  assert.notEqual(queued[0].id, queued[2].id, 'another shipment has a distinct queue entry');
  assert.throws(() => filenames.nombreArchivoResumen({ fecha: 'invalid' }), /fecha/);
  assert.equal(filenames.nombreArchivoResumen({ fecha: { seconds: Date.UTC(2026, 8, 25) / 1000 } }), 'Resumen-Embarque-25-sept-26.pdf');
});
