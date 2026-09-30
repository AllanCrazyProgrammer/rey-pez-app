// Verifica la entrada de producción que se incluye en el APK, sin Firebase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'android-dist');

async function run() {
  const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  assert.match(html, /<script\b[^>]*\bsrc=/, 'La entrada Android debe ejecutar los scripts de la aplicación');
  const server = http.createServer((req, res) => {
    const relative = decodeURIComponent(req.url.split('?')[0]);
    const file = path.resolve(output, '.' + relative);
    if (!file.startsWith(output + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.statusCode = relative === '/' ? 200 : 404;
      return res.end(relative === '/' ? html : 'No encontrado');
    }
    const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    const chrome = process.env.INVENTARIOS_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    browser = await chromium.launch({ headless: true, ...(fs.existsSync(chrome) ? { executablePath: chrome } : {}) });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    const missing = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) missing.push(response.url()); });
    await page.goto(base);
    await page.getByRole('heading', { name: 'Iniciar Sesión', exact: true }).waitFor();
    assert.match(page.url(), /#\/login$/);
    assert.equal(await page.locator('#inventarios-app').count(), 1);
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    console.log('PASS: la compilación Android arranca y muestra el acceso con todos sus archivos locales.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
