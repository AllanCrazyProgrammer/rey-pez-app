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
const modal = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/components/ModalDetalleCrudo.vue'), 'utf8'));
assert.deepEqual(compiler.compile(modal.template.content).errors, []);
const modalScript = babel.transformSync(modal.script.content, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
const runtime = `
const exports = {};
function require(name) {
  if (name === '@/components/ModalDetalleCrudo.vue') return modalExports;
  if (name === '@/utils/formatters') return {formatNumber: n => Number(n).toLocaleString('es-MX', {minimumFractionDigits:2,maximumFractionDigits:2})};
  if (name === '@/stores/ui') return {useUIStore:()=>({openModal(){},closeModal(){}})};
  if (name === 'firebase/firestore') return {getDocs(){throw Error('No database allowed in UI fixture')}};
  return {__esModule:true,default:{template:'<span></span>'}};
}
const modalExports = {};
(function(exports){ ${modalScript} })(modalExports);
modalExports.default.template = ${JSON.stringify(modal.template.content)};
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
const html = `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif}*{box-sizing:border-box}${[...parsed.styles,...modal.styles].map(s=>s.content).join('\n')}</style></head><body><div id="app"></div><script>${fs.readFileSync(path.join(root, 'node_modules/vue/dist/vue.js'),'utf8')}</script><script>${runtime}</script></body></html>`;
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
  const firstCard = w.document.querySelector('.crudo-tarjeta');
  firstCard.focus(); firstCard.click(); await tick(); await tick();
  assert(w.document.querySelector('[role="dialog"]'));assert.equal(w.document.activeElement.getAttribute('aria-label'),'Cerrar detalle');
  assert(w.document.querySelector('[role="dialog"]').textContent.includes('54,808'));
  assert.equal(w.document.body.style.overflow,'hidden');
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));
  assert.equal(w.document.activeElement.textContent,'Cerrar');
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
  assert.equal(w.document.activeElement.getAttribute('aria-label'),'Cerrar detalle');
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await tick();
  assert(!w.document.querySelector('[role="dialog"]'));assert.equal(w.document.activeElement,firstCard);assert.equal(w.document.body.style.overflow,'');
  firstCard.click();await tick();w.document.querySelector('.detalle-crudo-overlay').click();await tick();assert(!w.document.querySelector('[role="dialog"]'));
  firstCard.click();await tick();w.document.querySelector('.detalle-crudo-acciones button').click();await tick();await tick();assert.equal(w.historyClicks,2);
  const noPriceCard=cards()[1].querySelector('.crudo-tarjeta');noPriceCard.click();await tick();assert(!w.document.querySelector('[role="dialog"]').textContent.includes('Precio/kg'));w.app.cerrarDetalleCrudo();await tick();
  const before=JSON.stringify(w.app.existenciasPorProveedor);
  const grouped=w.app.existenciasPorProveedor.Galileo[0];
  w.app.abrirDetalleCrudo({...grouped,cuarto:'Varios cuartos',cuartos:[{cuarto:'Cuarto 1',kilos:10},{cuarto:'Cuarto 2',kilos:20}]},'Galileo',[grouped]);await tick();
  assert.equal(w.document.querySelectorAll('.detalle-crudo-cuartos dd').length,2);
  w.document.querySelectorAll('.detalle-crudo-acciones button')[1].click();await tick();await tick();
  assert.equal(w.app.modalDesgloseCuartos.abierto,true);assert(!w.document.querySelector('[role="dialog"]'));w.app.cerrarModalDesgloseCuartos();await tick();
  assert.equal(JSON.stringify(w.app.existenciasPorProveedor),before);
  firstCard.click();await tick();w.document.querySelectorAll('.detalle-crudo-acciones button')[1].click();await tick();await tick();
  assert.equal(w.app.modalCambioCuarto.abierto,true);w.app.cerrarModalCambioCuarto();await tick();
  w.app.soloInventario=true;w.app.abrirDetalleCrudo(w.app.existenciasPorProveedor.Galileo[1],'Galileo',w.app.existenciasPorProveedor.Galileo);await tick();
  assert(![...w.document.querySelectorAll('[role="dialog"] dt')].some(e=>e.textContent==='Taras'));
  assert.equal(w.document.querySelector('[role="dialog"] dd').textContent,'0');
  w.document.querySelector('[aria-label="Cerrar detalle"]').click();await tick();assert.equal(w.document.body.style.overflow,'');w.app.soloInventario=false;await tick();
  w.app.filtroCuarto='Cuarto 2';await tick();assert.equal(cards().length,1);assert.deepEqual(headers(0),['Medida','Cuarto','Kilos','Taras']);
  w.app.filtroCuarto='Todos los cuartos';await tick();assert.equal(cards().length,3);
  w.app.soloInventario=true;await tick();assert(!headers(0).includes('Taras'));
  w.app.existenciasPorProveedor={};await tick();assert(w.document.querySelector('.no-existencias'));
  dom.window.close();console.log('PASS DOM cards and grouping; detail fields, zero Pcz, price visibility, solo inventory; Escape/backdrop/button, focus trap/restore; history and single/multi-room actions; filters and empty state. Layout requires browser run.');return;
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
  if (width <= 768) {
   assert.equal(await page.locator('.crudos-tarjetas-movil').first().evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),2);
   await page.locator('.crudo-tarjeta').first().click();
   await page.locator('[role="dialog"]').waitFor();
   assert.equal(await page.locator('[aria-label="Cerrar detalle"]').evaluate(e=>document.activeElement===e),true);
   const bounds=await page.locator('[role="dialog"]').boundingBox();assert(bounds.x>=0 && bounds.x+bounds.width<=width);
   await page.screenshot({path:path.join(out,`detail-${width}.png`)});
   await page.keyboard.press('Escape');assert.equal(await page.locator('[role="dialog"]').count(),0);
  }
  await page.screenshot({path:path.join(out,`width-${width}.png`),fullPage:true});
 }
 await page.selectOption('.filters-cuarto select','Cuarto 2');
 assert.equal(await page.locator('.proveedor-card').count(),1);assert.deepEqual(await headers(0),['Medida','Cuarto','Kilos','Taras']);
 await page.selectOption('.filters-cuarto select','Todos los cuartos');assert.equal(await page.locator('.proveedor-card').count(),3);
 await page.evaluate(()=>{app.soloInventario=true});await page.waitForTimeout(30);assert(!(await headers(0)).includes('Taras'));
 await page.evaluate(()=>{app.existenciasPorProveedor={}});await page.waitForTimeout(30);assert.equal(await page.locator('.no-existencias').count(),1);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS responsive 320/360/390/768/1024/1440; columns, zero Pcz, room filters, inventory mode, empty state, history and room actions');
})().catch(e=>{console.error(e);process.exit(1)});
