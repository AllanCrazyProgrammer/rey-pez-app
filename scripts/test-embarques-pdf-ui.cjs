// Isolated UI regression: no production account, network or shipment data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const compiler = require('vue-template-compiler');
const { chromium } = require('playwright');
const { jsPDF } = require('jspdf');
const root = path.resolve(__dirname, '..');
function transpile(source) {
  return babel.transformSync(source, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
}
function component(file) {
  const sfc = compiler.parseComponent(fs.readFileSync(path.join(root, file), 'utf8'));
  return { script: transpile(sfc.script.content), template: sfc.template.content, styles: sfc.styles.map(s => s.content).join('\n') };
}
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
    const errors = [];
    const downloads = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('download', file => downloads.push(file));
    await page.route('https://**/*', route => route.abort());
    await page.setContent('<div id="app"></div>');
    await page.addScriptTag({ path: require.resolve('vue/dist/vue.js') });
    const components = {
      Preview: component('src/components/PdfPreview.vue'),
      Prompt: component('src/views/Embarques/components/modals/SubirResumenModal.vue'),
      Backup: component('src/components/DriveBackupNotice.vue')
    };
    await page.addStyleTag({ content: Object.values(components).map(c => c.styles).join('\n') });
    await page.evaluate(({ components, storeSource }) => {
      const load = (script, mocks) => {
        const module = { exports: {} };
        new Function('require', 'module', 'exports', script)(id => {
          if (!(id in mocks)) throw new Error('Unexpected import: ' + id);
          return mocks[id];
        }, module, module.exports);
        return module.exports;
      };
      const pinia = { defineStore: (_id, definition) => {
        const state = Vue.observable(definition.state());
        for (const [name, fn] of Object.entries(definition.actions)) state[name] = fn.bind(state);
        return () => state;
      } };
      const storeModule = load(storeSource, { pinia });
      window.ui = storeModule.useUIStore();
      window.revoked = [];
      const revoke = URL.revokeObjectURL.bind(URL);
      URL.revokeObjectURL = url => { window.revoked.push(url); revoke(url); };
      window.driveState = Vue.observable({ pending: 1, syncing: false, error: '', replacementRequest: null });
      const mocks = {
        '@/stores/ui': storeModule,
        '@/services/DriveNotasSync': {
          estadoDrive: window.driveState, iniciarSincronizacionDrive() {},
          responderReemplazoDrive() { window.driveState.replacementRequest = null; }
        }
      };
      const registered = {};
      for (const [name, source] of Object.entries(components)) {
        registered[name] = { ...load(source.script, mocks).default, template: source.template };
      }
      window.vm = new Vue({ el: '#app', components: registered,
        template: '<main><Preview /><Prompt ref="prompt" /><Backup /></main>' });
    }, { components, storeSource: transpile(fs.readFileSync(path.join(root, 'src/stores/ui.js'), 'utf8')) });

    for (const [label, expected] of [['No, solo ver PDF', false], ['Sí, subir a la nube', true], ['Cerrar', null]]) {
      await page.evaluate(() => { window.choice = 'waiting'; vm.$refs.prompt.solicitar().then(value => { window.choice = value; }); });
      await page.locator('.subir-resumen').getByRole('button', { name: label, exact: true }).click();
      assert.equal(await page.evaluate(() => window.choice), expected);
    }
    await page.evaluate(() => { vm.$refs.prompt.solicitar().then(value => { window.choice = value; }); });
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => window.choice), null);

    const pdf = new jsPDF();
    pdf.text('Resumen de embarque - prueba del visor', 15, 20);
    await page.evaluate(data => ui.showPdfPreview(new Uint8Array(data), 'Resumen-Embarque.pdf'), [...new Uint8Array(pdf.output('arraybuffer'))]);
    await page.locator('.pdf-preview[open] iframe').waitFor();
    const url = await page.locator('.pdf-preview iframe').getAttribute('src');
    assert.match(url, /^blob:/);
    assert.equal(await page.evaluate(async url => (await (await fetch(url)).text()).slice(0, 5), url), '%PDF-');
    assert.equal(downloads.length, 0, 'opening preview must not download');
    // Allow Chromium's PDF renderer to paint for visual inspection.
    await page.waitForTimeout(1500);
    await page.screenshot({ path: '/tmp/reypez-pdf-preview.png' });
    await page.evaluate(() => ui.showPdfAlert('El resumen está listo, pero no se pudo completar el respaldo.'));
    await page.locator('.pdf-alert[open]').getByRole('button', { name: 'Cerrar' }).click();
    assert.equal(await page.evaluate(() => ui.pdfAlert), '');
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Guardar PDF' }).click();
    assert.equal((await download).suggestedFilename(), 'Resumen-Embarque.pdf');
    await page.locator('.pdf-preview').getByRole('button', { name: 'Cerrar' }).click();
    assert.equal(await page.evaluate(() => ui.pdfPreview), null);
    assert.ok((await page.evaluate(() => window.revoked)).includes(url));
    await page.locator('.drive-progress').getByRole('button', { name: 'Cerrar' }).click();
    assert.equal(await page.locator('.drive-progress').count(), 0);
    assert.equal(await page.evaluate(() => driveState.pending), 1, 'closing an alert does not discard backups');
    assert.deepEqual(errors, []);
    console.log('PASS PDF preview, manual save, consent/decline/cancel, closing alerts and blob cleanup');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
