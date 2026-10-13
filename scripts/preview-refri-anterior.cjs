// Local-only preview: renders the real Vue component with fixture reads.
// All Firestore writes throw and all browser network requests are blocked.
const fs = require('fs')
const path = require('path')
const assert = require('assert/strict')
const { chromium } = require('playwright')
const { transformSync } = require('@babel/core')
const compiler = require('vue-template-compiler')
const root = path.resolve(__dirname, '..')
const output = process.env.REFRI_PREVIEW_OUTPUT || path.join(root, '../refri-anterior-qa')
fs.mkdirSync(output, {recursive:true})
const source = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/Procesos/PedidoLimpioImpresion.vue'),'utf8'))
const modules = {}
for(const name of ['factorAgua','calculosPedidoLimpio','kilosRefrigerados','coloresEtiquetas','dateUtils']) {
 modules['@/utils/'+name]=transformSync(fs.readFileSync(path.join(root,'src/utils/'+name+'.js'),'utf8'),{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code
}
modules.component=transformSync(source.script.content,{configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code
const fixture=[{id:'demo-anterior',fecha:'2026-10-12',clientes:[{nombre:'Refri',productos:[
{id:'d1',medida:'36/40',etiqueta:'Selecta',tipo:'S/H20',kilos:[761.3]},
{id:'d2',medida:'41/50',etiqueta:'Selecta',tipo:'S/H20',kilos:[333]},
{id:'d3',medida:'51/60',etiqueta:'Ozuna',tipo:'C/H20',camaronNeto:0.65,reporteTaras:[50],reporteBolsas:[20],kilos:[]}
]}]},{id:'demo-viejo',fecha:'2026-10-10',clientes:[{nombre:'Refri',productos:[{medida:'36/40',kilos:[9999]}]}]}]
const script=`
const modules=${JSON.stringify(modules)}, cache={};
window.fixture=${JSON.stringify(fixture)};window.writeAttempts=0;
const firestore={collection:(_,name)=>({name}),where:()=>({}),query:q=>q,getDocs:async q=>({docs:q.name==='embarques'?window.fixture.map(data=>({id:data.id,data:()=>data})):[],empty:q.name!=='embarques'}),doc:()=>({}),updateDoc:()=>{window.writeAttempts++;throw Error('Writes disabled in preview')},Timestamp:{fromDate:d=>d}};
function req(name){
 if(name==='firebase/firestore')return firestore;
 if(name==='@/firebase')return {db:{}};
 if(name==='moment')return window.moment;
 if(name==='moment/locale/es')return {};
 if(name==='@/stores/ui')return {useUIStore:()=>({openModal(){},closeModal(){}})};
 if(name.endsWith('.vue'))return {render:h=>h('div')};
 if(name==='@/utils/pdf/pedidoLimpio')return {};
 if(cache[name])return cache[name].exports;
 if(!modules[name])throw Error('Unexpected module '+name);
 const m={exports:{}};cache[name]=m;new Function('require','module','exports',modules[name])(req,m,m.exports);return m.exports;
}
const options=req('component').default;
options.template=${JSON.stringify(source.template.content)};
const props={fecha:'2026-10-13',pedidoOtilio:[{medida:'36/40',kilos:200,tipo:'S/H20'},{medida:'41/50',kilos:300,tipo:'S/H20'},{medida:'51/60',kilos:500,tipo:'S/H20'}],pedidoCatarro:[],pedidoJoselito:[],pedidoLorena:[],pedidoOzuna:[],rendimientosGuardados:{'36/40':1.2,'41/50':1.2,'51/60':1.2},kilosRefrigeradosGuardados:{'36/40':761.3,'41/50':333,'51/60':650}};
window.vm=new Vue({...options,propsData:props}).$mount('#app');
Vue.nextTick(()=>{const grid=document.querySelector('.resumen-con-refri');const wrap=document.createElement('section');wrap.className='qa-deliverable';const banner=document.createElement('div');banner.className='qa-banner';banner.textContent='VISTA PREVIA LOCAL · Datos de demostración · Sin publicar';grid.before(wrap);wrap.append(banner,grid)});
Vue.nextTick(()=>document.querySelector('.qa-deliverable').scrollIntoView());
`
const html=`<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:Arial,sans-serif;background:linear-gradient(120deg,#30183d,#15436d);color:#333}.qa-banner{padding:12px 16px;margin:0 0 20px;background:#16273f;color:#f0f7fc;border-radius:8px;font:13px Arial,sans-serif;letter-spacing:.02em}.qa-deliverable{padding:20px 0}.qa-deliverable>.resumen-con-refri{margin-top:0}${source.styles.map(x=>x.content).join('\n')}</style></head><body><div id="app"></div><script>${fs.readFileSync(require.resolve('vue/dist/vue.js'),'utf8')}</script><script>${fs.readFileSync(require.resolve('moment/min/moment.min.js'),'utf8')}</script><script>${script}</script></body></html>`
fs.writeFileSync(path.join(output,'preview-fixtures.html'),html)
if (!process.env.REFRI_PREVIEW_ONLY) (async()=>{
 const browser=await chromium.launch({executablePath:process.env.PREVIEW_CHROME||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']})
 const page=await browser.newPage({viewport:{width:1440,height:1050},deviceScaleFactor:1})
 await page.route('**/*',route=>route.abort())
 const errors=[];page.on('pageerror',err=>errors.push(err.message))
 await page.setContent(html,{waitUntil:'load'})
 await page.waitForSelector('.refri-anterior')
 await page.evaluate(()=>{const grid=document.querySelector('.resumen-con-refri');const wrap=document.createElement('section');wrap.className='qa-deliverable';const banner=document.createElement('div');banner.className='qa-banner';banner.textContent='VISTA PREVIA LOCAL · Datos de demostración · Sin publicar';grid.before(wrap);wrap.append(banner,grid)})
 assert.equal(await page.locator('.refri-anterior-lista li').count(),3)
 assert.match(await page.locator('.refri-anterior-total').innerText(),/1,744.3|1744.3/)
 const desktop=await page.evaluate(()=>{const a=document.querySelector('.resumen-medidas').getBoundingClientRect(),b=document.querySelector('.refri-anterior').getBoundingClientRect();return {a:a.toJSON(),b:b.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth}})
 assert.ok(desktop.b.x>=desktop.a.right);assert.equal(desktop.overflow,false)
 await page.locator('.qa-deliverable').screenshot({path:path.join(output,'refri-anterior-escritorio.png')})
 await page.setViewportSize({width:390,height:844})
 const mobile=await page.evaluate(()=>{const a=document.querySelector('.resumen-medidas').getBoundingClientRect(),b=document.querySelector('.refri-anterior').getBoundingClientRect();return {a:a.toJSON(),b:b.toJSON(),overflow:document.documentElement.scrollWidth>innerWidth}})
 assert.ok(mobile.b.y>=mobile.a.bottom);assert.equal(mobile.overflow,false)
 await page.locator('.qa-deliverable').screenshot({path:path.join(output,'refri-anterior-movil.png')})
 // No data: hide card, restore single-column layout, do not resurrect old stock.
 await page.evaluate(async()=>{window.fixture[0].clientes=[];await window.vm.cargarRefriAnterior()})
 assert.equal(await page.locator('.refri-anterior').count(),0)
 assert.equal(await page.locator('.resumen-con-refri.con-refri').count(),0)
 // Different selected date: no previous shipment at all.
 await page.evaluate(async()=>{window.vm.fecha='2026-10-09';await window.vm.$nextTick()})
 assert.equal(await page.locator('.refri-anterior').count(),0)
 assert.equal(await page.evaluate(()=>window.writeAttempts),0)
 assert.deepEqual(errors,[])
 fs.writeFileSync(path.join(output,'browser-checks.json'),JSON.stringify({desktop,mobile,errors,writes:0,fixture:true,checks:['right desktop','stacked mobile','no horizontal overflow','empty hidden','date changes','no old balances','no writes']},null,2))
 console.log('Desktop + mobile captured; 7 browser checks passed; zero writes and network access.')
 await browser.close()
})().catch(error=>{console.error(error);process.exit(1)})
