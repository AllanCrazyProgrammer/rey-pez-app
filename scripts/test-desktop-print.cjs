// Actual packaged accounts + native HTML-to-PDF delivery, without production data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const { _electron: electron } = require('playwright');
const root = path.resolve(__dirname, '..');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'reypez-print-qa-'));
const executablePath = process.env.REYPEZ_DESKTOP_EXECUTABLE || path.join(root, `release/offline-${require('../package.json').version}/mac-arm64/ReyPez.app/Contents/MacOS/ReyPez`);

// Exercise the real inventory report function with isolated Firebase reads.
async function inventoryHtml() {
  const source = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/components/Existencias.vue'), 'utf8')).script.content;
  const component = new Module(path.join(root, 'src/components/Existencias.print.test.js'), module);
  component.require = request => {
    if (request === 'vue') return {
      ref: value => ({ value }), computed: fn => ({ get value() { return fn(); } }),
      onMounted() {}, onUnmounted() {}, watchEffect() {}
    };
    if (request === '@/firebase') return { db: {} };
    if (request === 'firebase/firestore') return {
      collection: (_, name) => ({ name }), query: ref => ref, where: () => ({}), orderBy: () => ({}),
      getDocs: async () => ({ docs: [], forEach() {} })
    };
    if (request === '@/utils/formatters') return { formatNumber: value => Number(value || 0).toFixed(2), formatearFecha: () => '' };
    if (request.endsWith('.vue')) return {};
    return require(request);
  };
  component._compile(babel.transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code, component.id);
  const vm = component.exports.default.setup();
  vm.inventarioListo.value = true;
  vm.existencias.value = { 'Proveedor QA': { '51/60': { medida: '51/60', kilos: 100, precio: 150 } } };
  let result;
  global.window = {
    desktop: { printHtml: async (html, filename, options) => { result = { html, filename, options }; } },
    open() { throw new Error('Desktop reports must not open popups'); },
    alert(message) { throw new Error(message); }
  };
  try { await vm.imprimirReporte(); } finally { delete global.window; }
  assert.ok(result.html.includes('Proveedor QA') && result.html.includes('51/60'));
  assert.equal(result.options.landscape, true);
  return result;
}

let desktop;
(async () => {
  try {
    const inventory = await inventoryHtml();
    desktop = await electron.launch({ executablePath, args: [`--user-data-dir=${profile}`, '--proxy-server=http://127.0.0.1:9', '--host-resolver-rules=MAP * ~NOTFOUND'] });
    await desktop.evaluate(({ session, dialog, shell }, folder) => {
      session.defaultSession.enableNetworkEmulation({ offline: true });
      session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'wss://*/*'] }, (_, cb) => cb({ cancel: true }));
      global.printQA = { opened: [], cancel: false };
      dialog.showSaveDialog = async (_, options) => global.printQA.cancel ? { canceled: true } : { canceled: false, filePath: folder + '/' + options.defaultPath.split('/').pop() };
      shell.openPath = async file => { global.printQA.opened.push(file); return ''; };
    }, profile);
    const page = await desktop.firstWindow();
    page.setDefaultTimeout(30000);
    const alerts = [];
    page.on('dialog', d => { alerts.push(d.message()); d.dismiss(); });
    await page.locator('#username').fill('allan');
    const auth = fs.readFileSync(path.join(root, 'src/stores/auth.js'), 'utf8');
    await page.locator('#password').fill(auth.match(/username: 'allan', password: '([^']+)'/)[1]);
    await page.locator('button[type=submit]').click();
    await page.locator('.lista-embarques').waitFor();
    await page.evaluate(() => {
      localStorage.setItem('reypez.pesadas.pending.2026-10-01:qa', JSON.stringify({ order: 1, fields: {
        fecha: '2026-10-01', 'columnas.c1.precio': 1, 'columnas.c1.orden': '0',
        'personas.p1.nombre': 'Persona QA 1', 'personas.p1.orden': '0',
        'personas.p2.nombre': 'Persona QA 2', 'personas.p2.orden': '1',
        'pesos.p1.c1': 11, 'pesos.p2.c1': 11
      } }));
      location.hash = '/pesadas/2026-10-01';
    });
    await page.getByRole('button', { name: /Sacar cuentas/i }).click();
    await page.waitForFunction(() => document.querySelector('.total-value')?.textContent === '$22');
    await page.getByRole('button', { name: /PRINT_REPORT/ }).click();
    await page.waitForFunction(() => !document.querySelector('.cuentas-container').__vue__.imprimiendo);
    const cuentas = path.join(profile, 'cuentas-2026-10-01.pdf');
    assert.equal(fs.readFileSync(cuentas).subarray(0, 5).toString(), '%PDF-');
    assert.ok(fs.statSync(cuentas).size > 5000);
    assert.equal(await page.locator('[role="alert"]').count(), 0);
    console.log('PASS packaged Pesadas includes bathrooms ($22) and prints accounts without popups');
    const result = await page.evaluate(input => window.desktop.printHtml(input.html, input.filename, input.options), inventory);
    assert.equal(result.canceled, false);
    assert.equal(fs.readFileSync(result.filePath).subarray(0, 5).toString(), '%PDF-');
    assert.ok(fs.statSync(result.filePath).size > 5000);
    console.log('PASS actual clean inventory report rendered with native Chromium to landscape PDF');
    const opened = await desktop.evaluate(() => global.printQA.opened);
    assert.ok(opened.includes(cuentas) && opened.includes(result.filePath));
    await desktop.evaluate(() => { global.printQA.cancel = true; });
    assert.equal((await page.evaluate(input => window.desktop.printHtml(input.html, 'cancelado.pdf'), inventory)).canceled, true);
    assert.equal(fs.existsSync(path.join(profile, 'cancelado.pdf')), false);
    await assert.rejects(page.evaluate(() => window.desktop.printHtml('', 'invalido.pdf')), /no es válido/);
    assert.equal(await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 1);
    assert.deepEqual(alerts, []);
    await page.screenshot({ path: path.join(profile, 'cuentas-desktop.png'), fullPage: true });
    console.log('PASS viewer opening, save cancellation, invalid content and temporary window cleanup');
    console.log('QA PDFs and screenshot: ' + profile);
  } finally { if (desktop) await desktop.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
