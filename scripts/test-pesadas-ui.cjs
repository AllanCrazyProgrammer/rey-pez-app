/* Requires Playwright in NODE_PATH (or installed locally).
 * Runs actual Vue screens against an isolated browser-test service; no Firebase writes.
 * Usage: NODE_PATH=/path/to/runtime/node_modules node scripts/test-pesadas-ui.cjs
 */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'pesadas-ui-'));
console.log('QA artifacts: ' + output);

async function run() {
  await new Promise((resolve, reject) => webpack({
    mode: 'development', context: root, entry: path.join(__dirname, 'fixtures/pesadas-app.js'),
    output: { path: output, filename: 'app.js', publicPath: '/' },
    resolve: { extensions: ['.js', '.vue'], alias: {
      '@/services/pesadas.service$': path.join(__dirname, 'fixtures/pesadas-service.js'),
      '@': path.join(root, 'src'), 'vue$': 'vue/dist/vue.runtime.esm.js'
    } },
    module: { rules: [
      { test: /\.mjs$/, type: 'javascript/auto' },
      { test: /\.vue$/, loader: 'vue-loader' },
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader', options: { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-optional-chaining'] } },
      { test: /\.css$/, use: ['vue-style-loader', 'css-loader'] }
    ] },
    plugins: [new VueLoaderPlugin()],
    devtool: false
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString('errors-only'))) : resolve()));
  fs.writeFileSync(path.join(output, 'index.html'), '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Pesadas QA</title><style>body{margin:0;background:linear-gradient(150deg,#160b2c,#23325d);min-height:100vh;font-family:Arial}#app{min-height:100vh}</style><div id="app"></div><script src="/app.js"></script></html>');
  const server = http.createServer((req, res) => {
    const requested = path.join(output, decodeURIComponent(req.url.split('?')[0]));
    const file = fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(output, 'index.html');
    res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.PESADAS_CHROME_PATH ? { executablePath: process.env.PESADAS_CHROME_PATH } : {}) });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
    await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    const day = base + '/pesadas/2026-09-05';
    await page.goto(day);
    await page.getByLabel('Nombre despicadora 1', { exact: true }).fill('Luisa');
    await page.getByLabel('Nombre despicadora 1', { exact: true }).press('Enter');
    await page.waitForFunction(() => document.activeElement.getAttribute('aria-label') === 'Nombre despicadora 2');
    await page.getByLabel('Nombre despicadora 2', { exact: true }).fill('Sandra');
    await page.getByLabel('Nombre despicadora 2', { exact: true }).press('Enter');
    await page.getByLabel('Nombre despicadora 3', { exact: true }).press('Enter');
    assert.equal(await page.locator('.pesadas-grid tbody tr').count(), 3);
    await page.getByLabel('Medida columna 1', { exact: true }).fill('51');
    await page.getByLabel('Kilos de Luisa, columna 1', { exact: true }).fill('2,9');
    await page.getByLabel('Kilos de Luisa, columna 1', { exact: true }).press('Enter');
    await page.waitForFunction(() => document.activeElement.getAttribute('aria-label') === 'Kilos de Sandra, columna 1');
    await page.getByLabel('Kilos de Sandra, columna 1', { exact: true }).fill('1.2');
    await page.getByLabel('Medida columna 2', { exact: true }).fill('laguna');
    await page.getByLabel('Precio por kilo columna 2', { exact: true }).fill('12');
    await page.getByLabel('Kilos de Luisa, columna 2', { exact: true }).fill('4.1');
    await page.getByLabel('Kilos de Sandra, columna 2', { exact: true }).fill('2.3');
    await page.getByLabel('Kilos de Sandra, columna 2', { exact: true }).press('Tab');
    await page.getByLabel('Agregar columna', { exact: true }).click();
    await page.getByLabel('Medida columna 4', { exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('.pesadas-status').textContent === 'Guardado');
    assert.match(await page.locator('.pesadas-grid tbody tr').nth(0).innerText(), /\$77\.2/);
    assert.match(await page.locator('.pesadas-grid tbody tr').nth(1).innerText(), /\$38\.6/);
    await page.getByLabel('Precio por kilo columna 2', { exact: true }).fill('12.34');
    await page.getByLabel('Precio por kilo columna 2', { exact: true }).press('Tab');
    assert.equal(await page.getByRole('button', { name: 'Resumen / imprimir' }).isDisabled(), true);
    assert.equal(await page.getByLabel('Precio por kilo columna 2', { exact: true }).getAttribute('aria-invalid'), 'true');
    await page.getByLabel('Precio por kilo columna 2', { exact: true }).fill('12');
    await page.getByLabel('Precio por kilo columna 2', { exact: true }).press('Tab');
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.pesadas-grid tbody tr').length === 3);
    assert.equal(await page.getByLabel('Kilos de Luisa, columna 2', { exact: true }).inputValue(), '4.1');
    await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true, animations: 'disabled' });
    const second = await context.newPage();
    await second.goto(day);
    await Promise.all([
      page.getByLabel('Kilos de Luisa, columna 2', { exact: true }).fill('5.1'),
      second.getByLabel('Kilos de Sandra, columna 1', { exact: true }).fill('2.2')
    ]);
    await page.getByLabel('Kilos de Luisa, columna 2', { exact: true }).press('Tab');
    await second.getByLabel('Kilos de Sandra, columna 1', { exact: true }).press('Tab');
    await page.waitForFunction(() => document.querySelector('[aria-label="Kilos de Sandra, columna 1"]').value === '2.2');
    await second.waitForFunction(() => document.querySelector('[aria-label="Kilos de Luisa, columna 2"]').value === '5.1');
    await second.close();
    await context.setOffline(true);
    await page.getByLabel('Kilos de Luisa, columna 1', { exact: true }).fill('9.8');
    await page.getByLabel('Kilos de Luisa, columna 1', { exact: true }).press('Tab');
    await page.waitForFunction(() => document.querySelector('.pesadas-status').textContent.includes('Sin conexión'));
    const pending = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('reypez.pesadas.pending.2026-09-05:')).map(key => localStorage.getItem(key)).join(''));
    assert.ok(pending.includes('9.8'));
    await context.setOffline(false);
    await page.waitForFunction(() => document.querySelector('.pesadas-status').textContent === 'Guardado');
    // Exercise repeated Enter and real PDF pagination, including a long name.
    for (let index = 3; index <= 26; index++) {
      const nombre = index === 3 ? 'María de los Ángeles Hernández de la Cruz y Rodríguez' : `Despicadora ${index}`;
      await page.getByLabel(`Nombre despicadora ${index}`, { exact: true }).fill(nombre);
      await page.getByLabel(`Nombre despicadora ${index}`, { exact: true }).press('Enter');
      await page.getByLabel(`Kilos de ${nombre}, columna 1`, { exact: true }).fill('1.1');
      await page.getByLabel(`Kilos de ${nombre}, columna 1`, { exact: true }).press('Tab');
    }
    await page.waitForFunction(() => document.querySelector('.pesadas-status').textContent === 'Guardado');
    await page.getByRole('button', { name: 'Resumen / imprimir' }).click();
    await page.locator('.pesadas-pdf-frame').waitFor();
    await page.screenshot({ path: path.join(output, 'preview.png'), fullPage: true, animations: 'disabled' });
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar PDF', exact: true }).click();
    const download = await downloadEvent;
    await download.saveAs(path.join(output, 'resumen.pdf'));
    await page.getByRole('button', { name: 'Cerrar vista previa' }).click();
    await page.getByRole('link', { name: '← Historial de pesadas' }).click();
    await page.getByRole('heading', { name: 'Historial de jornadas' }).waitFor();
    assert.equal(await page.locator('.pesadas-history li').count(), 1);
    const fechaNueva = page.getByLabel('Fecha de pesadas', { exact: true });
    const hoySeleccionado = await fechaNueva.inputValue();
    await page.getByRole('button', { name: 'Mañana', exact: true }).click();
    assert.ok((await fechaNueva.inputValue()) > hoySeleccionado);
    await page.getByLabel('Fecha de pesadas', { exact: true }).fill('2026-09-06');
    await page.getByRole('button', { name: 'Crear día', exact: true }).click();
    await page.getByLabel('Nombre despicadora 1', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Nombre despicadora 1', { exact: true }).inputValue(), '');
    await page.goto(day);
    await page.getByLabel('Kilos de Luisa, columna 1', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Kilos de Luisa, columna 1', { exact: true }).inputValue(), '9.8');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, 'mobile.png'), fullPage: true, animations: 'disabled' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.getByRole('button', { name: 'Abrir menú de navegación' }).click();
    await page.getByRole('link', { name: 'Registrar pesadas de despicadoras' }).filter({ visible: true }).click();
    await page.getByRole('heading', { name: 'Historial de jornadas' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Abrir menú de navegación' }).getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator('.pesadas-history li').count(), 2);
    // Delete only isolated test data; cancellation preserves the day.
    page.removeAllListeners('dialog');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Eliminar día 5/9/2026', exact: true }).click();
    assert.equal(await page.locator('.pesadas-history li').count(), 2);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Eliminar día 5/9/2026', exact: true }).click();
    await page.getByRole('button', { name: 'Eliminar día 6/9/2026', exact: true }).waitFor();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Eliminar día 6/9/2026', exact: true }).click();
    await page.getByText('Todavía no hay pesadas registradas.', { exact: false }).waitFor();
    await page.reload();
    await page.getByText('Todavía no hay pesadas registradas.', { exact: false }).waitFor();
    await page.goto(day);
    await page.getByText('Esta jornada fue eliminada.', { exact: false }).waitFor();
    assert.equal(await page.locator('.pesadas-grid').count(), 0);
    await page.getByRole('button', { name: 'Crear esta jornada de nuevo', exact: true }).click();
    await page.getByLabel('Nombre despicadora 1', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Nombre despicadora 1', { exact: true }).inputValue(), '');
    assert.deepEqual(errors, []);
    console.log('PASS: Enter, precision, totals, reload, separate days, two tabs, offline recovery, PDF download, mobile navigation, cancel/confirm deletion and reload.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
