// Monta el PedidoCrudosImpresion.vue real (jsdom) con sus utilidades reales; solo Firebase y pdfmake van simulados.
// Verifica que la escala no se muestra junto a la tabla y que se abre al presionar "Generar PDF".
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const compiler = require('vue-template-compiler')
const babel = require('@babel/core')
const { JSDOM } = require('jsdom')
const root = path.resolve(__dirname, '..')
const cjs = code => babel.transformSync(code, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
const leer = rel => fs.readFileSync(path.join(root, rel), 'utf8')
const parsed = compiler.parseComponent(leer('src/views/Procesos/PedidoCrudosImpresion.vue'))
assert.deepEqual(compiler.compile(parsed.template.content).errors, [])
const modulos = {
  '@/utils/pedidosCrudoEscalaImpresion': leer('src/utils/pedidosCrudoEscalaImpresion.js'),
  '@/utils/pedidosCrudoTotales': leer('src/utils/pedidosCrudoTotales.js'),
  '@/utils/barcosPorMedida': cjs(leer('src/utils/barcosPorMedida.js'))
}
const runtime = `
const reales = {'@/utils/medidasPedidoCrudo': {formatearMedidaPedidoCrudo: v => v + ' c/c'}};
${Object.entries(modulos).map(([n, c]) => `reales[${JSON.stringify(n)}] = (function(){const module={exports:{}};const exports=module.exports;(function(module,exports,require){${c}})(module,exports,n=>{if(n==='./medidasPedidoCrudo')return reales['@/utils/medidasPedidoCrudo'];throw Error('import interno '+n)});return module.exports})();`).join('\n')}
window.descargas = [];
function require(name) {
  if (reales[name]) return reales[name];
  if (name.startsWith('@fontsource/')) return {};
  if (name === '@/firebase') return {db:{}};
  if (name === 'firebase/firestore') return {doc(){}, getDoc(){}, updateDoc(){}, FieldPath: function(){}};
  if (name === '@/utils/pdf/config') return {crearPdfConFuentesLocales: doc => ({download: nombre => window.descargas.push({doc, nombre})})};
  if (name === './components/FilaBarcoMedida.vue') return {__esModule:true, default:{props:['etiqueta','value'], template:'<div class="fila-barco">{{ etiqueta }}</div>'}};
  throw Error('Unexpected import: '+name);
}
const exports = {};
${cjs(parsed.script.content)}
const component = exports.default;
component.template = ${JSON.stringify(parsed.template.content)};
component.beforeCreate = function(){this.$route = {query:{}}; this.$router = {push(){}}};
window.app = new Vue({...component, propsData: {fecha: '2026-10-23', columnas: ['Med','Gde','Extra'], pedidos: {'8a': {gde: 5}, Otilio: {med: 5, gde: 5}, Veronica: {extra: 4}}}}).$mount('#app');
`
const html = `<!doctype html><html><body><div id="app"></div><script>${fs.readFileSync(require.resolve('vue/dist/vue.js'), 'utf8')}</script><script>${runtime}</script></body></html>`
;(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://fixture.invalid' })
  const w = dom.window, d = w.document
  try {
    await w.Vue.nextTick()
    const escala = () => d.querySelector('.escala-impresion')
    assert(d.querySelector('#pdfPreview .preview-table'), 'La tabla principal debe verse')
    assert.equal(escala(), null, 'La escala no debe mostrarse junto a la tabla (duplicado)')
    assert.equal(d.querySelectorAll('table').length, 1, 'Solo una tabla en la página')
    const btn = [...d.querySelectorAll('.buttons-container button')].find(b => b.textContent.includes('Generar PDF'))
    btn.click(); await w.Vue.nextTick()
    assert.equal(w.descargas.length, 0, 'Generar PDF primero abre la escala, no descarga')
    assert(escala(), 'La escala se abre al presionar Generar PDF')
    assert(d.querySelector('.modal-escala input[type=range]') && d.querySelector('.modal-escala .hoja-impresion'), 'Slider y hoja dentro del modal')
    // Cancelar cierra sin descargar
    d.querySelector('.btn-cancelar-escala').click(); await w.Vue.nextTick()
    assert.equal(escala(), null); assert.equal(w.descargas.length, 0)
    // Clic en el fondo cierra; clic dentro no
    btn.click(); await w.Vue.nextTick()
    escala().click(); await w.Vue.nextTick(); assert(escala(), 'Clic dentro del modal no lo cierra')
    d.querySelector('.modal-escala').click(); await w.Vue.nextTick(); assert.equal(escala(), null, 'Clic en el fondo cierra')
    // Confirmar genera el PDF con la escala elegida y cierra
    btn.click(); await w.Vue.nextTick()
    const slider = d.querySelector('#escala-tabla')
    slider.value = '70'; slider.dispatchEvent(new w.Event('input')); await w.Vue.nextTick()
    d.querySelector('.btn-confirmar-pdf').click(); await w.Vue.nextTick()
    assert.equal(w.descargas.length, 1)
    assert.equal(w.descargas[0].nombre, 'Ped-crudos-2026-10-23.pdf')
    assert.equal(w.app.escala, 0.7)
    const esperado = reales => reales.parametrosTabla(0.7, 3).fontSize
    assert.equal(w.descargas[0].doc.defaultStyle.fontSize, esperado(require('../src/utils/pedidosCrudoEscalaImpresion')), 'El PDF usa la escala elegida')
    assert.equal(escala(), null, 'El modal se cierra al generar')
    const css = parsed.styles.map(s => s.content).join('\n')
    assert(/@media print[\s\S]*\.modal-escala[^{]*\{\s*display:\s*none/.test(css), 'El modal no sale al imprimir desde el navegador')
    console.log('PASS impresión crudos: sin duplicado, escala en modal al presionar Generar PDF, cancelar/fondo cierran, PDF con escala 0.7')
  } finally { w.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
