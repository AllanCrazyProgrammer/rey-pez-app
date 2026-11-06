// Abre TODAS las rutas de src/router.js en un build de producción y reporta errores de JavaScript
// (excepciones no capturadas y errores de carga de chunks). Sirve para comparar builds antes/después
// de cambios de herramientas (p. ej. webpack 4 -> 5). Firebase no conecta aquí: los avisos de red de
// Firestore se ignoran; lo que importa es que cada pantalla cargue su código sin romperse.
//
// uso: node scripts/recorrer-rutas.cjs <carpetaDist> [puerto] [salida.json]
// Con login de Firebase obligatorio (VUE_APP_LOGIN_LOCAL=off) las rutas protegidas redirigen al
// login sin sesión; para recorrerlas, compila con VUE_APP_LOGIN_LOCAL distinto de off.
const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const dist = path.resolve(process.argv[2] || 'dist');
const port = Number(process.argv[3] || 5070);
const salida = process.argv[4];
const tipos = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  let p = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(dist) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(dist, 'index.html');
  res.writeHead(200, { 'Content-Type': tipos[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

const router = fs.readFileSync(path.join(__dirname, '..', 'src', 'router.js'), 'utf8');
// Rutas con comillas simples o dobles (p. ej. path: "/embarques/:id").
const rutas = [...new Set([...router.matchAll(/path:\s*(['"])([^'"]+)\1/g)].map(m => m[2]))]
  .map(r => r.replace(/:([a-zA-Z]+)\?/g, 'demo').replace(/:fecha/g, '2026-11-05').replace(/:([a-zA-Z]+)/g, 'demo'));

(async () => {
  await new Promise(r => server.listen(port, r));
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('user', JSON.stringify({ username: 'qa', userId: 'qa' })));
  const resultado = {};
  for (const ruta of rutas) {
    const page = await ctx.newPage();
    const errores = [];
    page.on('pageerror', e => errores.push('pageerror: ' + e.message.split('\n')[0].slice(0, 160)));
    page.on('console', m => {
      const t = m.text();
      if (m.type() === 'error' && /ChunkLoadError|Loading chunk|is not defined|is not a function|Cannot read prop|Unknown custom element|Failed to mount/i.test(t)) errores.push('console: ' + t.split('\n')[0].slice(0, 160));
    });
    await page.goto(`http://localhost:${port}${ruta}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => errores.push('goto: ' + e.message.slice(0, 120)));
    await page.waitForTimeout(2500);
    const montado = await page.evaluate(() => !!document.querySelector('#app') && document.querySelector('#app').children.length > 0).catch(() => false);
    if (!montado) errores.push('la app no montó');
    resultado[ruta] = [...new Set(errores)];
    await page.close();
  }
  await browser.close(); server.close();
  const conError = Object.entries(resultado).filter(([, e]) => e.length);
  console.log(`${rutas.length} rutas, ${rutas.length - conError.length} sin errores, ${conError.length} con errores`);
  conError.forEach(([r, e]) => console.log(' ', r, '->', e.join(' | ')));
  if (salida) fs.writeFileSync(salida, JSON.stringify(resultado, null, 1));
})().catch(e => { console.error('FALLO', e); process.exit(1); });
