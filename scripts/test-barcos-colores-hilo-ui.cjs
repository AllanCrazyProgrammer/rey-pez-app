// Isolated browser fixture using the real Vue components; Firebase is never loaded.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.PREVIEW_OUTPUT || '/tmp/reypez-hilos-preview';
fs.mkdirSync(out, { recursive: true });
const files = {
  '@/utils/coloresHilo': 'src/utils/coloresHilo.js',
  '@/components/Barcos/SelectorColoresHilo.vue': 'src/components/Barcos/SelectorColoresHilo.vue',
  view: 'src/views/Barcos/EntradaProductoBarco.vue'
};
let css = '', modules = '';
for (const [name, file] of Object.entries(files)) {
  let source = fs.readFileSync(path.join(root, file), 'utf8'), template = '';
  if (file.endsWith('.vue')) {
    const parsed = compiler.parseComponent(source);
    source = parsed.script.content; template = parsed.template.content;
    css += parsed.styles.map(style => style.content).join('\n');
  }
  const code = babel.transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  modules += 'factories[' + JSON.stringify(name) + '] = function(exports, require) {' + code + (template ? '\nexports.default.template = ' + JSON.stringify(template) + ';' : '') + '};\n';
}
const runtime = `
const records = new Map(); let adds = 0;
const factories = {}, cache = {
  '@/firebase': { db: {} },
  '@/utils/formatters': { formatNumber: (n, d = 2) => Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }) },
  '@/components/BackButton.vue': { default: { template: '<span></span>' } },
  'firebase/firestore': {
    collection: () => 'test', doc: (db, col, id) => id, query() {}, where() {}, orderBy() {},
    async getDocs() { return { docs: [...records].map(([id, data]) => ({ id, data: () => JSON.parse(JSON.stringify(data)) })) }; },
    async addDoc(col, data) { const id = 'fixture-' + (++adds); records.set(id, JSON.parse(JSON.stringify(data))); return { id }; },
    async updateDoc(id, data) { records.set(id, JSON.parse(JSON.stringify(data))); }
  }
};
function require(name) { if (!cache[name]) { cache[name] = {}; factories[name](cache[name], require); } return cache[name]; }
${modules}
const Component = require('view').default; Component.mounted = function() { this.barcoSeleccionado = 'galileo'; this.nuevaDescarga(); this.medidaActiva.nombre = 'Pac ch'; this.medidaActiva.filas = [{ taras: 2, kilos: 30 }]; };
window.app = new Vue(Component).$mount('#app');
window.fixture = { records, get adds() { return adds; } };
`;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PREVIEW_CHROME || '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => route.abort());
  await page.setContent('<html lang="es"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif}*{box-sizing:border-box}' + css + '</style><div id="app"></div></html>');
  await page.addScriptTag({ content: fs.readFileSync(path.join(root, 'node_modules/vue/dist/vue.js'), 'utf8') });
  await page.addScriptTag({ content: runtime });
  const color = name => page.getByRole('button', { name, exact: false }).filter({ has: page.locator('.muestra-hilo') });
  await color('Rojo').click();
  assert.equal(await page.locator('.medida-input').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(254, 202, 202)');
  await page.getByLabel('Combinar dos colores').check(); await color('Azul').click();
  assert.match(await page.locator('.medida-input').evaluate(el => getComputedStyle(el).backgroundImage), /linear-gradient/);
  await page.locator('.medida-card').screenshot({ path: path.join(out, 'hilos-dos-colores-movil.png') });
  await page.evaluate(async () => { await Promise.all([app.guardarDescarga(), app.guardarDescarga()]); app.editarDescarga({ id: app.editandoId, ...fixture.records.get(app.editandoId) }); });
  assert.equal(await page.evaluate(() => fixture.adds), 1);
  assert(await page.getByLabel('Combinar dos colores').isChecked());
  assert.match(await page.locator('.estado-hilos').innerText(), /Rojo \+ Azul/);
  // Switching, adding, deleting and reopening preserve independent measure colors.
  await page.evaluate(() => { app.form.medidas.push({ nombre: 'Pac gde', coloresHilo: ['verde'], filas: [{ taras: 1, kilos: 10 }] }); app.seleccionarMedida(1); });
  assert(!(await page.getByLabel('Combinar dos colores').isChecked()));
  await page.evaluate(() => app.seleccionarMedida(0));
  assert(await page.getByLabel('Combinar dos colores').isChecked());
  page.on('dialog', dialog => dialog.accept());
  await page.evaluate(() => { app.eliminarMedida(0); });
  assert(!(await page.getByLabel('Combinar dos colores').isChecked()));
  assert.match(await page.locator('.estado-hilos').innerText(), /Verde/);
  await page.getByRole('button', { name: 'Sin color', exact: true }).click();
  assert.equal(await page.locator('.medida-input').evaluate(el => el.style.background), '');
  await page.evaluate(async () => { await app.guardarDescarga(); app.editarDescarga({ id: app.editandoId, ...fixture.records.get(app.editandoId) }); });
  assert.match(await page.locator('.estado-hilos').innerText(), /Sin color/);
  assert.equal(await page.evaluate(() => fixture.adds), 1);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    assert(await page.locator('.colores-hilo').evaluate(el => el.scrollWidth <= el.clientWidth), 'Color selector overflow at ' + width);
  }
  await color('Amarillo').click();
  await page.locator('.medida-card').screenshot({ path: path.join(out, 'hilos-un-color-escritorio.png') });
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS: mobile/desktop UI, real Vue reactivity, dual/single/none, isolated save/reopen, repeat save, same-index delete, per-measure separation; no Firebase/network writes.');
})().catch(error => { console.error(error); process.exit(1); });
