// Real view, synthetic data, and no Firebase calls. Covers responsive inventory presentation.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const compiler = require('vue-template-compiler');
const babel = require('@babel/core');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const parsed = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/ExistenciasCrudos.vue'), 'utf8'));
assert.deepEqual(compiler.compile(parsed.template.content).errors, []);
const script = babel.transformSync(parsed.script.content, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
const runtime = `
const exports = {};
function require(name) {
  if (name === '@/utils/formatters') return {formatNumber: n => Number(n).toLocaleString('es-MX', {minimumFractionDigits:2,maximumFractionDigits:2})};
  if (name === '@/stores/ui') return {useUIStore:()=>({openModal(){},closeModal(){}})};
  if (name === 'firebase/firestore') return {getDocs(){throw Error('No database allowed in UI fixture')}};
  return {__esModule:true,default:{template:'<span></span>'}};
}
${script}
const component = exports.default;
component.template = ${JSON.stringify(parsed.template.content)};
component.mounted = component.created = undefined;
component.components['router-link'] = {template:'<a><slot /></a>'};
const row = (key, data = {}) => ({clave:key,nombre:key,producto:key,proveedor:'Galileo',kilos:685.1,cuarto:'s/c',piezas:null,ultimoPrecio:0,valor:0,...data});
window.app = new Vue(component).$mount('#app');
app.isLoadingExistencias = false; app.isLoadingRegistros = false;
app.existenciasPorProveedor = {
 Galileo:[row('Pac Ch',{piezas:41,cuarto:'Cuarto 1',ultimoPrecio:80,valor:54808}), row('Pacotilla chica Otilio con nombre muy largo',{piezas:0})],
 'María Guadalupe':[row('Chico',{cuarto:'Cuarto 1'}),row('Rechazo',{cuarto:'Cuarto 2'})],
 'Memo con nombre largo de proveedor':[row('Chico hilo rojo'),row('Pac Ch hilo verde')]
};
window.historyClicks = 0; app.abrirModalHistorialProducto = () => window.historyClicks++;
`;
const html = `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif}*{box-sizing:border-box}${parsed.styles.map(s=>s.content).join('\n')}</style></head><body><div id="app"></div><script>${fs.readFileSync(path.join(root, 'node_modules/vue/dist/vue.js'),'utf8')}</script><script>${runtime}</script></body></html>`;
const out = process.env.PREVIEW_OUTPUT || '/tmp/reypez-responsive-preview';
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'index.html'),html);
(async()=>{
 if (process.argv.includes('--dom')) {
  try { require('canvas'); } catch (_) { try { const id = require.resolve('canvas'); require.cache[id] = { id, filename:id, loaded:true, exports:{} }; } catch (_) {} }
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html.replace(/<style>[\s\S]*?<\/style>/, ''),{runScripts:'dangerously',url:'https://fixture.invalid'});
  const w = dom.window; const tick = () => w.Vue.nextTick(); await tick();
  const cards = () => [...w.document.querySelectorAll('.proveedor-card')];
  const headers = i => [...cards()[i].querySelectorAll('th')].map(e=>e.textContent);
  assert.deepEqual(headers(0),['Medida','Pcz','Cuarto','Kilos','Taras','Precio/kg','Valor']);
  assert.deepEqual(headers(1),['Medida','Cuarto','Kilos','Taras']);
  assert.deepEqual(headers(2),['Medida','Kilos','Taras']);
  assert.equal(cards()[0].querySelectorAll('[data-label="Pcz"]')[1].textContent,'0');
  w.document.querySelector('.medida-button').click();assert.equal(w.historyClicks,1);
  w.document.querySelector('.asignar-cuarto').click();await tick();assert(w.document.querySelector('.modal-cambio-cuarto'));
  w.document.querySelector('.modal-cambio-cuarto .secondary-button').click();await tick();assert(!w.document.querySelector('.modal-cambio-cuarto'));
  w.app.filtroCuarto='Cuarto 2';await tick();assert.equal(cards().length,1);assert.deepEqual(headers(0),['Medida','Cuarto','Kilos','Taras']);
  w.app.filtroCuarto='Todos los cuartos';await tick();assert.equal(cards().length,3);
  w.app.soloInventario=true;await tick();assert(!headers(0).includes('Taras'));
  w.app.existenciasPorProveedor={};await tick();assert(w.document.querySelector('.no-existencias'));
  dom.window.close();console.log('PASS DOM columns, zero Pcz, filters, history/room actions, inventory mode, empty state. Layout requires browser run.');return;
 }
 const browser = await chromium.launch({headless:true,executablePath:process.env.PREVIEW_CHROME || '/usr/bin/chromium',args:['--no-sandbox']});
 const page = await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(html);await page.waitForSelector('.proveedor-card');
 const headers = i => page.locator('.proveedor-card').nth(i).locator('th').allTextContents();
 assert.deepEqual(await headers(0),['Medida','Pcz','Cuarto','Kilos','Taras','Precio/kg','Valor']);
 assert.deepEqual(await headers(1),['Medida','Cuarto','Kilos','Taras']);
 assert.deepEqual(await headers(2),['Medida','Kilos','Taras']);
 assert.equal(await page.locator('.proveedor-card').first().locator('[data-label="Pcz"]').last().textContent(),'0');
 await page.locator('.medida-button').first().click();assert.equal(await page.evaluate(()=>historyClicks),1);
 await page.locator('.asignar-cuarto').first().click();assert.equal(await page.locator('.modal-cambio-cuarto').count(),1);
 await page.locator('.modal-cambio-cuarto .secondary-button').click();assert.equal(await page.locator('.modal-cambio-cuarto').count(),0);
 for(const width of [320,360,390,768,1024,1440]){
  await page.setViewportSize({width,height:1000});
  const overflow=await page.evaluate(()=>({viewport:innerWidth,page:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('.proveedor-card')].map(e=>({width:e.clientWidth,scroll:e.scrollWidth}))}));
  assert(overflow.page<=width,JSON.stringify(overflow));
  assert(overflow.cards.every(c=>c.scroll<=c.width+1),JSON.stringify(overflow));
  await page.screenshot({path:path.join(out,`width-${width}.png`),fullPage:true});
 }
 await page.selectOption('.filters-cuarto select','Cuarto 2');
 assert.equal(await page.locator('.proveedor-card').count(),1);assert.deepEqual(await headers(0),['Medida','Cuarto','Kilos','Taras']);
 await page.selectOption('.filters-cuarto select','Todos los cuartos');assert.equal(await page.locator('.proveedor-card').count(),3);
 await page.evaluate(()=>{app.soloInventario=true});await page.waitForTimeout(30);assert(!(await headers(0)).includes('Taras'));
 await page.evaluate(()=>{app.existenciasPorProveedor={}});await page.waitForTimeout(30);assert.equal(await page.locator('.no-existencias').count(),1);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS responsive 320/360/390/768/1024/1440; columns, zero Pcz, room filters, inventory mode, empty state, history and room actions');
})().catch(e=>{console.error(e);process.exit(1)});
