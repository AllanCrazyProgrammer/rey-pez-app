const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');
function compile(source, mocks, globals = {}) {
  const module = { exports: {} };
  const code = babel.transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  vm.runInNewContext(code, { module, exports: module.exports, console, navigator: { onLine: false }, ...globals, require: id => {
    if (id in mocks) return mocks[id];
    throw new Error('Unexpected dependency: ' + id);
  } });
  return module.exports;
}
test('automatic report reuses real screen calculations, includes current products and never saves shipment edits', async () => {
  const calls = [];
  const base = { id: 'shipment', docData: { fecha: '2026-09-26', kilosCrudos: { '51/60': 180 }, analizarGanancia: {}, clientes: [] } };
  const extra = { id: 'second-truck', docData: { fecha: '2026-09-26', clientes: [{ id: '1', nombre: 'Joselito', productos: [{ medida: '51/60', tipo: 's/c', restarTaras: true, kilos: [20], taras: [1] }], crudos: [] }] } };
  const records = [base, extra];
  const before = JSON.stringify(records);
  const offline = { init: async () => {}, getAll: async () => records, getById: async () => base };
  const firestore = { getFirestore: () => ({}), collection: () => ({}), getDocs: async () => ({ docs: [], forEach: () => {} }) };
  const screen = compile(fs.readFileSync('src/views/Embarques/Rendimientos.vue', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1], {
    'firebase/firestore': firestore, lodash: {}, '@/utils/RendimientosPdf': { generarPDFRendimientos: async (...args) => { calls.push(args); return { data: new Uint8Array([37,80,68,70]), name: 'rendimientos.pdf' }; } },
    '@/utils/pdf/reportDelivery': { prepararGuardadoReporte: () => { throw new Error('automatic export must not open another save picker'); } },
    '@/utils/pdf/sacadas': {}, '@/components/MedidasParaHoyCards.vue': {}, '@/services/EmbarquesOfflineService': offline, '@/utils/formatters': { formatearFecha: value => value }
  }).default;
  const source = fs.readFileSync('src/services/RendimientosReport.js', 'utf8').replace("await import('@/views/Embarques/Rendimientos.vue')", '({ default: injectedScreen })');
  const { generarRendimientosParaResumen } = compile(source, { './EmbarquesOfflineService': offline, 'firebase/firestore': firestore }, { injectedScreen: screen });
  const report = await generarRendimientosParaResumen({ id: 'shipment', fecha: '2026-09-26', cargaCon: 'Caminante', clientes: [{ id: '1', nombre: 'Joselito', productos: [{ medida: '51/60', tipo: 's/c', restarTaras: true, kilos: [100], taras: [2] }], crudos: [] }] });
  assert.equal(report.name, 'rendimientos.pdf');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0].length, 1);
  assert.equal(calls[0][0][0].medida, '51/60');
  assert.equal(calls[0][0][0].kilosCrudos, 180);
  assert.equal(calls[0][0][0].totalEmbarcado, 111);
  assert.equal(calls[0][1].id, 'shipment');
  assert.equal(calls[0][9].returnForDrive, true);
  assert.equal(JSON.stringify(records), before, 'PDF generation cannot modify cached shipment records');
});
