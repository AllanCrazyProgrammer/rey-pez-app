// Inicio de sesión con Firebase Auth contra el EMULADOR de Auth (nunca contra el proyecto real).
//
// Preparación (desde la raíz del repo):
//   1) Emulador:  npx firebase emulators:start --only auth --project demo-reypez
//   2) Builds:    VUE_APP_AUTH_EMULATOR=http://127.0.0.1:9099 npx vue-cli-service build --dest /tmp/rp-transicion
//                 VUE_APP_AUTH_EMULATOR=http://127.0.0.1:9099 VUE_APP_LOGIN_LOCAL=off npx vue-cli-service build --dest /tmp/rp-final
//   3) node scripts/test-login-firebase.cjs /tmp/rp-transicion /tmp/rp-final
// El script crea sus propias cuentas de prueba en el emulador.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const [distTransicion, distFinal] = process.argv.slice(2).map(p => path.resolve(p || ''));
const EMULADOR = process.env.AUTH_EMULATOR || 'http://127.0.0.1:9099';
if (!distTransicion || !distFinal) { console.error('Uso: node scripts/test-login-firebase.cjs <distTransicion> <distFinal>'); process.exit(2); }

const tipos = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
function servir(dist) {
  const server = http.createServer((req, res) => {
    let p = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(dist) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(dist, 'index.html');
    res.writeHead(200, { 'Content-Type': tipos[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function crearCuenta(email, password) {
  const r = await fetch(`${EMULADOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const j = await r.json();
  if (!r.ok && j.error?.message !== 'EMAIL_EXISTS') throw new Error('No se pudo crear la cuenta de prueba: ' + JSON.stringify(j));
}

async function intentar(browser, base, usuario, contrasena, sesionPrevia) {
  const ctx = await browser.newContext({ serviceWorkers: 'block' });
  if (sesionPrevia) await ctx.addInitScript(v => localStorage.setItem('user', v), JSON.stringify(sesionPrevia));
  const page = await ctx.newPage();
  const errores = []; page.on('pageerror', e => errores.push(e.message));
  await page.goto(base + '/login', { waitUntil: 'domcontentloaded' });
  if (usuario !== null) {
    await page.fill('#username', usuario);
    await page.fill('#password', contrasena);
    await page.click('button[type="submit"]');
  }
  await page.waitForTimeout(2500);
  const r = {
    ruta: new URL(page.url()).pathname,
    sesion: await page.evaluate(() => JSON.parse(localStorage.getItem('user') || 'null')),
    error: (await page.locator('.error-message').textContent().catch(() => '') || '').trim(),
    errores, page, ctx
  };
  return r;
}

(async () => {
  await crearCuenta('qa-allan@reypez.app', 'clave-qa-larga-1');
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const [sa, sb] = await Promise.all([servir(distTransicion), servir(distFinal)]);
  const A = `http://127.0.0.1:${sa.address().port}`, B = `http://127.0.0.1:${sb.address().port}`;
  try {
    // --- Transición (VUE_APP_LOGIN_LOCAL encendido) ---
    let r = await intentar(browser, A, 'qa-allan', 'clave-qa-larga-1');
    assert.notEqual(r.ruta, '/login', 'transición: la cuenta de Firebase entra');
    assert.equal(r.sesion.username, 'qa-allan'); assert.equal(r.sesion.firebase, true);
    await r.ctx.close();
    console.log('PASS transición: cuenta de Firebase Auth inicia sesión (firebase: true)');

    r = await intentar(browser, A, 'edgar', 'noseno');
    assert.notEqual(r.ruta, '/login', 'transición: el login anterior todavía entra');
    assert.equal(r.sesion.firebase, false);
    await r.ctx.close();
    console.log('PASS transición: el login anterior sigue funcionando mientras se crean las cuentas');

    r = await intentar(browser, A, 'edgar', 'equivocada');
    assert.equal(r.ruta, '/login'); assert.equal(r.sesion, null); assert.match(r.error, /incorrectos/);
    await r.ctx.close();
    console.log('PASS transición: contraseña equivocada se rechaza con mensaje claro');

    // --- Final (VUE_APP_LOGIN_LOCAL=off) ---
    r = await intentar(browser, B, 'edgar', 'noseno');
    assert.equal(r.ruta, '/login', 'final: el login anterior ya no entra'); assert.equal(r.sesion, null);
    await r.ctx.close();
    console.log('PASS final: el login anterior ya no funciona');

    r = await intentar(browser, B, 'qa-allan', 'clave-qa-larga-1');
    assert.notEqual(r.ruta, '/login'); assert.equal(r.sesion.firebase, true);
    await r.page.goto(B + '/procesos', { waitUntil: 'domcontentloaded' });
    await r.page.waitForTimeout(2500);
    assert.equal(new URL(r.page.url()).pathname, '/procesos', 'final: la sesión de Firebase se conserva al recargar');
    await r.ctx.close();
    console.log('PASS final: la cuenta de Firebase entra y la sesión se conserva al recargar');

    // Sesión vieja (sin cuenta de Firebase) escrita una sola vez, como la dejaría la versión anterior.
    r = await intentar(browser, B, null, null);
    await r.page.evaluate(() => localStorage.setItem('user', JSON.stringify({ username: 'edgar', userId: 'sesion-vieja' })));
    await r.page.goto(B + '/procesos', { waitUntil: 'domcontentloaded' });
    await r.page.waitForTimeout(3000);
    assert.equal(new URL(r.page.url()).pathname, '/login', 'final: sesión vieja sin Firebase vuelve al login');
    assert.equal(await r.page.evaluate(() => localStorage.getItem('user')), null);
    await r.ctx.close();
    console.log('PASS final: una sesión vieja sin cuenta de Firebase debe iniciar sesión otra vez');

    // Sin internet: la sesión de Firebase guardada en el equipo basta para seguir trabajando.
    {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(B + '/login', { waitUntil: 'load' });
      await page.waitForFunction(() => navigator.serviceWorker.getRegistration().then(r => r && r.active), null, { timeout: 60000 });
      await page.fill('#username', 'qa-allan'); await page.fill('#password', 'clave-qa-larga-1');
      await page.click('button[type="submit"]');
      await page.waitForFunction(() => location.pathname !== '/login', null, { timeout: 15000 });
      await page.waitForTimeout(3000); // deja que el service worker termine de guardar la app
      await ctx.setOffline(true);
      await page.goto(B + '/procesos', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3500);
      assert.equal(new URL(page.url()).pathname, '/procesos', 'sin internet la sesión de Firebase debe conservarse');
      assert.notEqual(await page.evaluate(() => localStorage.getItem('user')), null);
      await ctx.close();
      console.log('PASS final: sin internet, la sesión de Firebase guardada permite seguir trabajando');
    }

    const conClave = d => fs.readdirSync(path.join(d, 'js')).filter(f => fs.readFileSync(path.join(d, 'js', f), 'utf8').includes('noseno')).length;
    assert.equal(conClave(distFinal), 0, 'final: las contraseñas anteriores no deben estar en el build');
    console.log(`PASS final: las contraseñas anteriores no están en el build (transición: ${conClave(distTransicion)} archivo)`);
  } finally {
    await browser.close(); sa.close(); sb.close();
  }
})().catch(e => { console.error('FALLO', e.message); process.exit(1); });
