const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
function load(file, globals = {}, mocks = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, console, Uint8Array, Blob, setTimeout, clearTimeout, ...globals, require(id) {
    if (id in mocks) return mocks[id];
    if (id.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), id + '.js')), globals, mocks);
    return require(id);
  } }, { filename });
  return module.exports;
}
function browser() {
  const blobs = [], links = [], timers = [], revoked = [];
  const globals = { window: {}, URL: { createObjectURL(blob) { blobs.push(blob); return 'blob:test'; }, revokeObjectURL(url) { revoked.push(url); } },
    document: { body: { appendChild(link) { links.push(link); } }, createElement() { return { clicks: 0, click() { this.clicks++; }, remove() { this.removed = true; } }; } },
    setTimeout(fn, delay) { timers.push({ fn, delay }); return timers.length; }, clearTimeout() {} };
  return { globals, blobs, links, timers, revoked };
}
const noRender = { getBuffer() { throw Error('second render'); }, download() { throw Error('second download'); }, open() { throw Error('second open'); } };
test('web downloads identical buffered bytes once and cleans up link and URL', async () => {
  const b = browser(), bytes = new Uint8Array([37,80,68,70]);
  await load('src/utils/pdf/delivery.js', b.globals).entregarPdf(noRender, 'resumen.pdf', 'download', bytes);
  assert.equal(b.blobs.length, 1); assert.equal(b.blobs[0].type, 'application/pdf');
  assert.deepEqual(new Uint8Array(await b.blobs[0].arrayBuffer()), bytes);
  assert.equal(b.links.length, 1); assert.equal(b.links[0].download, 'resumen.pdf');
  assert.equal(b.links[0].clicks, 1); assert.equal(b.links[0].removed, true);
  assert.equal(b.timers[0].delay, 60000); b.timers[0].fn(); assert.deepEqual(b.revoked, ['blob:test']);
});
test('buffered open reuses bytes; unbuffered browser paths retain existing behavior', async () => {
  const b = browser(), calls = [];
  const d = load('src/utils/pdf/delivery.js', b.globals);
  await d.entregarPdf(noRender, 'resumen.pdf', 'open', new Uint8Array([37]));
  assert.equal(b.links[0].target, '_blank'); assert.equal(b.links[0].rel, 'noopener'); assert.equal(b.links[0].download, undefined);
  const pdf = { download(name) { calls.push(name); }, open() { calls.push('open'); } };
  await d.entregarPdf(pdf, 'nota.pdf'); await d.entregarPdf(pdf, 'nota.pdf', 'open');
  assert.deepEqual(calls, ['nota.pdf', 'open']);
});
test('Electron preserves bytes, period, cancellation and one save; renders only if bytes absent', async () => {
  const calls = [], period = { year: 2026, month: 10, day: 12 }, bytes = new Uint8Array([37]);
  const d = load('src/utils/pdf/delivery.js', { window: { desktop: { savePdf(...args) { calls.push(args); return { canceled: true }; } } } });
  assert.deepEqual(await d.entregarPdf(noRender, 'nota.pdf', 'download', bytes, period), { canceled: true });
  assert.equal(calls.length, 1); assert.deepEqual(calls[0], [bytes, 'nota.pdf', period]);
  let renders = 0; await d.entregarPdf({ getBuffer(cb) { renders++; cb(bytes); } }, 'nota.pdf');
  assert.equal(renders, 1); assert.equal(calls.length, 2);
  await assert.rejects(load('src/utils/pdf/delivery.js', { window: { desktop: {} } }).entregarPdf(noRender, 'nota.pdf'), /actualiza ReyPez/);
});
test('real clean summary renders once and its preview equals the Drive bytes', async () => {
  // Flujo actual: pregunta si sube a Drive, muestra vista previa (no descarga sola) y sube resumen + reportes.
  const b = browser(), queued = [], previews = []; let renders = 0;
  const real = require('pdfmake/build/pdfmake'), wrapped = Object.create(real);
  wrapped.createPdf = (...args) => { const pdf = real.createPdf(...args), get = pdf.getBuffer.bind(pdf); pdf.getBuffer = (...args) => { renders++; return get(...args); }; return pdf; };
  const ui = { useUIStore: () => ({ showPdfPreview: (data, name) => previews.push({ data, name }), showPdfAlert: text => { throw new Error('alerta inesperada: ' + text); } }) };
  const summary = load('src/utils/pdf/resumenEmbarque.js', b.globals, { 'pdfmake/build/pdfmake': wrapped, '@/stores/ui': ui });
  const mixin = load('src/views/Embarques/mixins/pdfGenerationMixin.js', b.globals, {
    '@/utils/pdfGenerator': { generarNotaVentaPDF: async () => ({ data: new Uint8Array([37]), name: 'nota.pdf' }) }, '@/utils/pdf/resumenTaras': { generarResumenTarasPDF: async () => ({ data: new Uint8Array([37]), name: 'taras.pdf' }) },
    '@/services/RendimientosReport': { generarRendimientosParaResumen: async () => ({ data: new Uint8Array([37]), name: 'rendimientos.pdf' }) },
    '@/utils/pdf/reportDelivery': { guardarYRespaldarReporte: async () => {} },
    '@/utils/pdf/resumenEmbarque': summary, '@/utils/pdf/filename': load('src/utils/pdf/filename.js'), '@/utils/pdf/delivery': load('src/utils/pdf/delivery.js', b.globals),
    '@/services/DriveNotasSync': { agruparRespaldoDrive: async work => work(), driveNotasDisponible: () => true, encolarNotaDrive: async data => queued.push(data) },
    '@/stores/ui': ui,
    '@/services/EmbarqueCuentasService': { sincronizarCuentaOzunaParaNota: async () => { throw new Error('no debe sincronizar cuentas en esta prueba'); } },
    '@/utils/ozunaCuentaNota': load('src/utils/ozunaCuentaNota.js')
  }).default;
  const products = [{ clienteId: '1', medida: 'Golfo', tipo: 's/h20', taras: [3], kilos: [85], restarTaras: true, precio: 170, reporteTaras: [1,2], reporteBolsas: [26,25] }];
  const instance = { ...mixin.methods, embarque: { id: 'qa-summary', fecha: '2026-10-12', cargaCon: 'QA', productos: products }, clienteCrudos: {}, productosPorCliente: { '1': products }, clientesDisponibles: [{ id: '1', nombre: 'Joselito' }], obtenerNombreCliente: () => 'Joselito', $refs: { subirResumen: { solicitar: async () => true } } };
  await instance.generarPDFResumen(100);
  assert.equal(renders, 1, 'must not render mutated canvas a second time');
  assert.equal(previews.length, 1, 'one preview, no automatic download');
  assert.equal(b.links.length, 0, 'the preview does not download by itself');
  assert.deepEqual(queued.slice(0, 3).map(n => n.id.split('-')[0]), ['resumen', 'taras', 'rendimientos']);
  assert.equal(queued.length, 4, 'resumen, taras, rendimientos y la nota del cliente');
  assert.deepEqual(Buffer.from(previews[0].data), Buffer.from(queued[0].data), 'Drive receives the exact bytes shown');
  assert.equal(previews[0].name, queued[0].name); assert.equal(Buffer.from(queued[0].data).subarray(0,5).toString(), '%PDF-');
});
