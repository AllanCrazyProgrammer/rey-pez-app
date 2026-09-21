/* Isolated UI tests; never accesses Firebase. Run: node scripts/test-marea-ui.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const webpack = require('webpack');
const VueLoaderPlugin = require('vue-loader/lib/plugin');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'marea-ui-'));

async function run() {
  await new Promise((resolve, reject) => webpack({
    mode: 'development', context: root, entry: path.join(__dirname, 'fixtures/marea-app.js'),
    output: { path: output, filename: 'app.js', publicPath: '/' },
    resolve: { extensions: ['.js', '.vue'], alias: { '@': path.join(root, 'src'), 'vue$': 'vue/dist/vue.runtime.esm.js' } },
    module: { rules: [
      { test: /\.vue$/, loader: 'vue-loader' },
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader', options: { configFile: false, babelrc: false } },
      { test: /\.css$/, use: ['vue-style-loader', 'css-loader'] }
    ] }, plugins: [new VueLoaderPlugin()], devtool: false
  }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString('errors-only'))) : resolve()));
  const html = '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Marea QA</title><style>body{margin:0}</style><div id="app"></div><script src="/app.js"></script></html>';
  const server = http.createServer((req, res) => {
    const js = req.url === '/app.js'; res.setHeader('Content-Type', js ? 'application/javascript' : 'text/html');
    res.end(js ? fs.readFileSync(path.join(output, 'app.js')) : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    const installedChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    browser = await chromium.launch({ headless: true, ...(fs.existsSync(installedChrome) ? { executablePath: installedChrome } : {}) });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Used only in this fixture to shorten the end-of-round wait, not to exercise actions.
    const attach = async () => page.evaluate(() => {
      const find = vm => vm.$options.name === 'MareaArcade' ? vm : vm.$children.map(find).find(Boolean);
      window.qaGame = find(document.querySelector('.marea').__vue__);
    });
    const fit = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const finish = async () => { await page.evaluate(() => { window.qaGame._game.remaining = 0.02; }); await page.locator('.marea-result').waitFor(); };
    const home = async () => { await page.getByRole('button', { name: 'Elegir otro juego', exact: true }).click(); };
    const start = async id => { await page.locator(`.marea-mode--${id}`).click(); await page.getByRole('button', { name: '¡A jugar!' }).click(); await page.locator('.marea-game').waitFor(); };
    await page.goto(base + '/procesos');
    await page.getByRole('link', { name: 'Jugar Marea Arcade: camarones y despicadoras' }).click();
    await attach(); await fit();
    await page.screenshot({ path: path.join(output, 'home-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.screenshot({ path: path.join(output, 'home-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await start('limpiar');
    await page.getByRole('button', { name: 'Limpiar camarón', exact: true }).tap();
    let size = await page.locator('.marea-size-chip').innerText();
    await page.getByRole('button', { name: 'Tara ' + size, exact: true }).tap();
    assert.equal(await page.evaluate(() => window.qaGame._game.score), 10);
    // A real touch swipe cleans; a second drag drops into the matching basket.
    const cdp = await context.newCDPSession(page);
    let box = await page.locator('.marea-shrimp').boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 45, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await page.evaluate(() => window.qaGame._game.shrimp.clean), true);
    size = await page.locator('.marea-size-chip').innerText();
    const target = await page.getByRole('button', { name: 'Tara ' + size, exact: true }).boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target.x + target.width / 2, y: target.y + target.height / 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal(await page.evaluate(() => window.qaGame._game.score), 20);
    await page.getByRole('button', { name: 'Pausar partida' }).click();
    const remaining = await page.evaluate(() => window.qaGame._game.remaining);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.qaGame._game.remaining), remaining);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.marea-overlay').count(), 0);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.getByRole('button', { name: 'Seguir jugando' }).click();
    await page.screenshot({ path: path.join(output, 'clean-mobile.png'), fullPage: true });
    await finish(); assert.match(await page.locator('.marea-result-score').innerText(), /20/);
    await home(); await page.reload(); await attach();
    assert.equal(await page.evaluate(() => window.qaGame.records.limpiar), 20);
    await start('equipo');
    const first = page.locator('.marea-order').first();
    const orderSize = await first.locator('strong').innerText();
    await first.tap(); await page.getByRole('button', { name: new RegExp('Asignar a .*, especialidad ' + orderSize) }).tap();
    await page.waitForFunction(() => window.qaGame._game.completed >= 1);
    assert.equal(await page.evaluate(() => window.qaGame._game.score), 30);
    await fit(); await page.screenshot({ path: path.join(output, 'team-mobile.png'), fullPage: true });
    await finish(); await home(); await start('atrapar');
    const canvas = page.locator('canvas'); box = await canvas.boundingBox();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width * .3, y: box.y + box.height * .85 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * .7, y: box.y + box.height * .85 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok(Math.abs(await page.evaluate(() => window.qaGame._game.basket) - .7) < .02);
    await canvas.focus(); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(180); await page.keyboard.up('ArrowLeft');
    assert.ok(await page.evaluate(() => window.qaGame._game.basket) < .7);
    // Deterministic collision, through the live animation loop.
    await page.evaluate(() => { const g = window.qaGame._game; g.drops = [{ x: g.basket, y: .76, speed: .3, kind: 'gold' }]; });
    await page.waitForFunction(() => window.qaGame._game.score === 30);
    await fit(); await page.screenshot({ path: path.join(output, 'catch-mobile.png'), fullPage: true });
    await finish(); await page.screenshot({ path: path.join(output, 'result-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Otra partida' }).click();
    assert.equal(await page.evaluate(() => window.qaGame._game.score), 0);
    assert.equal(await page.evaluate(() => window.qaGame._game.lives), 3);
    for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) { await page.setViewportSize(viewport); await fit(); }
    await page.getByRole('button', { name: 'Pausar partida' }).click();
    await page.getByRole('button', { name: 'Salir al menú de juegos' }).click();
    assert.equal(await page.evaluate(() => window.qaGame._frame), null);
    // Graceful result even if the browser rejects local persistence.
    await page.evaluate(() => { Storage.prototype.setItem = () => { throw Error('unavailable'); }; });
    await start('limpiar'); await finish();
    await page.getByText('No se pudo guardar el récord; se conserva durante esta sesión.').waitFor();
    await home(); await page.getByRole('link', { name: '← Procesos' }).click();
    assert.deepEqual(errors, []);
    console.log('PASS: 3 modes, mobile touch + drag, keyboard, pause/resume, time expiry, records/reload, replay, blocked storage, 320px/landscape, navigation.');
    console.log('Screenshots: ' + output);
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
