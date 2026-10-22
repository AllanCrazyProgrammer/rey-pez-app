// Monta el componente real y su módulo real, sin llamadas a Firebase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const compiler = require('vue-template-compiler');
const babel = require('@babel/core');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const parsed = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/Procesos/PedidosCrudo.vue'), 'utf8'));
assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
const script = babel.transformSync(parsed.script.content, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
const totals = fs.readFileSync(path.join(root, 'src/utils/pedidosCrudoTotales.js'), 'utf8');
const runtime = `
const module = {exports:{}};
(function(module){${totals}})(module);
const exports = {};
function require(name) {
 if(name === '@/utils/pedidosCrudoTotales') return module.exports;
 if(name === '@/utils/medidasPedidoCrudo') return {formatearMedidaPedidoCrudo: value => value};
 if(name === '@/firebase') return {db:{}};
 if(name === 'firebase/firestore') return {};
 throw Error('Unexpected import: '+name);
}
${script}
const component = exports.default;
component.template = ${JSON.stringify(parsed.template.content)};
component.beforeCreate = function(){this.$route = {query:{}}};
window.app = new Vue(component).$mount('#app');
`;
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}#shell{display:flex;flex-direction:column}${parsed.styles.map(s => s.content).join('\n')}</style></head><body><div id="shell"><div id="app"></div></div><script>${fs.readFileSync(require.resolve('vue/dist/vue.js'), 'utf8')}</script><script>${runtime}</script></body></html>`;
(async () => {
 if (process.argv.includes('--dom')) {
  try { require('canvas'); } catch (_) {
   try { const id = require.resolve('canvas'); require.cache[id] = {id, filename:id, loaded:true, exports:{}}; } catch (_) { /* Canvas es opcional. */ }
  }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html, {runScripts:'dangerously', url:'https://fixture.invalid'});
  try {
   const w = dom.window;
   await w.Vue.nextTick();
   const input = w.document.querySelector('.numero-input');
   input.value = '3'; input.dispatchEvent(new w.Event('input', {bubbles:true}));
   await w.Vue.nextTick();
   const rows = () => [...w.document.querySelectorAll('.fila-totales')];
   assert.deepEqual(rows().map(row => row.children[0].textContent.trim()), ['Taras', 'Kilos']);
   assert.equal(rows()[0].children[1].textContent.trim(), '3');
   assert.equal(rows()[1].children[1].textContent.trim(), '57');
   w.app.nuevaColumna = 'Adicional'; w.app.agregarColumna();
   w.app.$set(w.app.pedidos.Catarro, 'adicional', 2);
   await w.Vue.nextTick();
   assert.equal(rows()[0].lastElementChild.textContent.trim(), '2');
   assert.equal(rows()[1].lastElementChild.textContent.trim(), '38');
   w.app.eliminarColumna('Adicional'); await w.Vue.nextTick();
   assert.equal(w.app.tarasCrudo, 3);
   console.log('PASS DOM: componente real, edición y totales reactivos; agregar/eliminar medida. Layout requiere Chrome.');
  } finally { dom.window.close(); }
  return;
 }
 const browser = await chromium.launch({headless:true, executablePath:process.env.PREVIEW_CHROME || ['/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find(file => fs.existsSync(file)), args:['--no-sandbox']});
 try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setContent(html);
  await page.waitForSelector('.tabla-pedidos table');
  for (const width of [390, 1440]) {
   await page.setViewportSize({width, height:844});
   const sizes = await page.evaluate(() => {
    const container = document.querySelector('.tabla-pedidos');
    container.scrollLeft = 100;
    return {page:document.documentElement.scrollWidth, viewport:innerWidth, client:container.clientWidth, scroll:container.scrollWidth, left:container.scrollLeft, overflow:getComputedStyle(container).overflowX};
   });
   const totalsStyle = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.fila-totales')];
    const client = document.querySelector('.tabla-pedidos tbody tr');
    return {
     labels: rows.map(row => row.cells[0].textContent.trim()),
     backgrounds: rows.map(row => getComputedStyle(row).backgroundColor),
     clientBackground: getComputedStyle(client).backgroundColor,
     heights: rows.map(row => row.getBoundingClientRect().height),
     clientHeight: client.getBoundingClientRect().height
    };
   });
   assert.deepEqual(totalsStyle.labels, ['Taras', 'Kilos']);
   assert.notEqual(totalsStyle.backgrounds[0], totalsStyle.backgrounds[1]);
   for (const background of totalsStyle.backgrounds) {
    assert.notEqual(background, totalsStyle.clientBackground);
   }
   for (const height of totalsStyle.heights) {
    assert(height < totalsStyle.clientHeight, `Totales compactos a ${width}px: ${JSON.stringify(totalsStyle)}`);
   }
   assert(sizes.page <= sizes.viewport, JSON.stringify(sizes));
   if (width === 390) {
    assert(sizes.scroll > sizes.client, JSON.stringify(sizes));
    assert(sizes.left > 0, 'El contenedor debe desplazarse');
    assert.equal(sizes.overflow, 'auto');
   }
  }
  await page.locator('.numero-input').first().fill('3');
  await page.waitForFunction(() => document.querySelector('.fila-totales td:nth-child(2)').textContent.trim() === '3');
  assert.equal((await page.locator('.fila-totales').nth(1).locator('td').nth(1).textContent()).trim(), '57');
  await page.evaluate(() => {window.app.nuevaColumna = 'Medida adicional'; window.app.agregarColumna(); window.app.$set(window.app.pedidos.Catarro, 'medida adicional', 2)});
  await page.waitForFunction(() => document.querySelector('.fila-totales').lastElementChild.textContent.trim() === '2');
  assert.equal((await page.locator('.fila-totales').nth(1).locator('td').last().textContent()).trim(), '38');
  if (process.env.SCREENSHOT_PATH) {
   await page.setViewportSize({width:390, height:844});
   await page.evaluate(async () => {
    const app = window.app;
    app.eliminarColumna('Medida adicional');
    for (const cliente of app.clientes) {
     for (const columna of app.columnas) app.$set(app.pedidos[cliente], columna.toLowerCase(), 0);
    }
    app.$set(app.pedidos.Otilio, app.columnas[0].toLowerCase(), 5);
    app.$set(app.pedidos.Veronica, app.columnas[0].toLowerCase(), 4);
    await app.$nextTick();
    document.querySelector('.tabla-pedidos').scrollLeft = 0;
   });
   assert.equal((await page.locator('.fila-total-taras td').nth(1).textContent()).trim(), '9');
   await page.locator('.tabla-pedidos').screenshot({path:process.env.SCREENSHOT_PATH});
  }
  assert.deepEqual(errors, []);
  console.log('PASS responsive 390/1440, scroll interno y totales reactivos con columna adicional');
 } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
