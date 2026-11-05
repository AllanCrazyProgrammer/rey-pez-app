// Genera PDFs reales con los generadores de src/ usando el jsPDF/autotable de la carpeta indicada.
// uso: node generar.cjs <carpetaConNodeModules> <salida>
const fs = require('fs'), path = require('path'), vm = require('vm');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '../..');
if (process.argv.length < 4) { console.error('Uso: node scripts/pdf-regresion/generar.cjs <carpetaConNodeModules> <salida>'); process.exit(2); }
const libs = path.resolve(process.argv[2]) + '/node_modules/';
const out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
const jsPDFmod = require(libs + 'jspdf');
const autotable = require(libs + 'jspdf-autotable');
const FIXED = new Date('2026-11-05T12:00:00-06:00').getTime();
class FixedDate extends Date { constructor(...a) { super(...(a.length ? a : [FIXED])); } static now() { return FIXED; } }
const saved = [];
const Base = jsPDFmod.jsPDF || jsPDFmod.default;
class Capturador extends Base { constructor(...a) { super(...a); this.save = (name) => { saved.push({ name, data: Buffer.from(this.output('arraybuffer')) }); return this; }; } }
const jspdfParaApp = { __esModule: true, default: Capturador, jsPDF: Capturador };
const cache = {};
function load(file, mocks) {
  const filename = path.join(root, file);
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, console, Date: FixedDate, Intl, Math, Number, String, Array, Object, JSON, Uint8Array, Buffer, Map, Set, Promise, isNaN, parseFloat, parseInt,
    require(id) {
      if (id in mocks) return mocks[id];
      if (id === 'jspdf') return jspdfParaApp;
      if (id === 'jspdf-autotable') return autotable;
      if (id.startsWith('./')) return load(path.join(path.dirname(file), id + (id.endsWith('.js') ? '' : '.js')), mocks);
      if (id.startsWith('@/')) return load('src/' + id.slice(2) + '.js', mocks);
      return require(id);
    } }, { filename });
  return module.exports;
}
(async () => {
  const previews = [];
  const mocks = { '@/stores/ui': { useUIStore: () => ({ showPdfPreview: (data, name) => previews.push({ data, name }) }) } };
  // 1) Análisis de pedido limpio: autoTable(doc, ...) estilo función
  const { generarAnalisisPedidosLimpioPDF } = load('src/utils/pdf/analisisPedidosLimpio.js', mocks);
  const dias = ['2026-10-01', '2026-10-02', '2026-10-03'];
  generarAnalisisPedidosLimpioPDF({
    rango: { fechaInicio: '2026-10-01', fechaFin: '2026-10-31' },
    resumen: { pedidos: 12, kilosTotal: 15432.75, tarasTotal: 512, promedioDiario: 498.6 },
    porMedida: Array.from({ length: 28 }, (_, i) => ({ nombre: `${21 + i * 5}/${25 + i * 5}`, kilos: 1000 - i * 17.25, taras: 40 - i, porcentaje: 7.5 - i * 0.2, dias })),
    porCliente: ['Otilio', 'Catarro', 'Joselito', 'Lorena', 'Ozuna', 'Temporal Ñandú'].map((nombre, i) => ({ nombre, kilos: 3000 - i * 400.5, taras: 100 - i * 9, porcentaje: 25 - i * 3, dias })),
    porFecha: Array.from({ length: 31 }, (_, i) => ({ fecha: `2026-10-${String(i + 1).padStart(2, '0')}`, kilos: 500 + i * 3.3, taras: 15 + (i % 4) }))
  });
  // 2) Resumen de taras: doc.autoTable(...) estilo plugin
  const { generarResumenTarasPDF } = load('src/utils/pdf/resumenTaras.js', mocks);
  const embarque = { id: 'e1', fecha: '2026-09-26', cargaCon: 'José / Porro',
    clienteCrudos: { '2': [{ items: [{ taras: '3-2', sobrante: '1-1' }, { taras: '5' }] }], '4': [{ items: [{ taras: '10' }] }] },
    productos: [ { clienteId: 1, taras: [5, 6, 7], tarasExtra: [1] }, { clienteId: 2, taras: [10], tarasExtra: [] }, { clienteId: 3, taras: [2, 2], tarasExtra: [3, 4] }, { clienteId: 4, taras: [8] }, { clienteId: 5, taras: [1, 1, 1] } ] };
  const r = await generarResumenTarasPDF(embarque, [{ id: 'c1', nombre: 'Otilio' }, { id: 'c2', nombre: 'Catarro' }, { id: 'c3', nombre: 'Ozuna' }], { returnForDrive: true });
  saved.push({ name: 'resumen-taras.pdf', data: Buffer.from(r.data) });
  saved.forEach((s, i) => fs.writeFileSync(path.join(out, `${i + 1}-${s.name.replace(/[^\w.-]/g, '_')}`), s.data));
  console.log('jspdf', require(libs + 'jspdf/package.json').version, 'autotable', require(libs + 'jspdf-autotable/package.json').version, '->', saved.map(s => s.name + ' ' + s.data.length + 'B').join(', '));
})().catch(e => { console.error('FALLO', e); process.exit(1); });
