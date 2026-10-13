const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const compiler = require('vue-template-compiler')
const { transformSync } = require('@babel/core')
const source = fs.readFileSync(path.join(__dirname, '../src/utils/kilosRefrigerados.js'), 'utf8')
const helpers = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
const component = compiler.parseComponent(fs.readFileSync(path.join(__dirname, '../src/views/Procesos/PedidoLimpioImpresion.vue'), 'utf8'))
function loadComponent(docs = []) {
  const module = { exports: {} }
  const requireMock = name => {
    if (name === 'firebase/firestore') return {collection: () => ({}), getDocs: async () => ({docs: docs.map(data => ({id:data.id,data:()=>data}))})}
    if (name === '@/utils/dateUtils') return { normalizarFechaValor: value => typeof value === 'string' ? value.slice(0,10) : null }
    if (name === '@/utils/kilosRefrigerados') return { desglosarRefriEmbarques: rows => rows.flatMap(row => row.filas || []) }
    return {}
  }
  new Function('require', 'module', 'exports', transformSync(component.script.content, {configFile:false,babelrc:false,plugins:['@babel/plugin-transform-modules-commonjs']}).code)(requireMock,module,module.exports)
  return module.exports.default
}
const product = (extra = {}) => ({id:'p1',medida:'36/40',tipo:'S/H20',kilos:[100],...extra})
const shipment = (products, extra = {}) => ({id:'e1',clientes:[{nombre:'Refri',productos:products}],...extra})
test('plantilla Vue compila sin errores', () => assert.deepEqual(compiler.compile(component.template.content).errors, []))
test('solo Refri, descuenta taras y respeta noSumarKilos y ceros', async () => {
 const {desglosarRefriEmbarques: rows}=await helpers
 const data=shipment([product({restarTaras:true,taras:[2]}),product({id:'ignorado',noSumarKilos:true}),product({id:'cero',kilos:[0]})])
 data.clientes.push({nombre:'Otilio',productos:[product({kilos:[9999]})]})
 assert.deepEqual(rows([data]).map(x=>x.kilos), [94])
})
test('respeta agua personalizada y reporte de bolsas; conserva etiquetas y nombres',async()=>{
 const {desglosarRefriEmbarques: rows}=await helpers
 const result=rows([shipment([product({tipo:'C/H20',camaronNeto:0.7,reporteTaras:[2],reporteBolsas:[20],etiqueta:'Selecta',proveedor:'Proveedor',nombreAlternativoPDF:'36/40 especial'})])])
 assert.equal(result[0].kilos,28);assert.equal(result[0].agua,0.7);assert.equal(result[0].medida,'36/40 especial');assert.equal(result[0].etiqueta,'Selecta')
})
test('variantes quedan separadas aunque tengan misma talla; sin filtro por pedido',async()=>{
 const {desglosarRefriEmbarques: rows}=await helpers
 assert.equal(rows([shipment([product(),product({id:'p2',etiqueta:'Ahumada'}),product({id:'p3',medida:'91/110'})])]).length,3)
})
test('esquema antiguo compatible y esquema doble no se suma dos veces',async()=>{
 const {desglosarRefriEmbarques: rows}=await helpers
 const old={id:'old',clientesPersonalizados:[{nombre:'Refri',id:'r'}],productos:[product({clienteId:'r'})]}
 assert.equal(rows([old])[0].kilos,100)
 assert.equal(rows([{...old,...shipment([product()])}]).length,1)
 assert.equal(rows([shipment([product(),product()]),shipment([product()])]).length,1)
})
test('elige solo fecha del último embarque anterior, ignora borradores, hoy y futuros',async()=>{
 const options=loadComponent([{id:'viejo',fecha:'2026-10-09'},{id:'anterior',fecha:'2026-10-11'},{id:'otro',fecha:'2026-10-11'},{id:'borrador',fecha:'2026-10-12',borrador:true},{id:'hoy',fecha:'2026-10-13'},{id:'futuro',fecha:'2026-10-14'}])
 const result=await options.methods.obtenerEmbarquesDelDiaAnterior.call({fecha:'2026-10-13'})
 assert.equal(result.fecha,'2026-10-11');assert.deepEqual(result.embarques.map(x=>x.id),['anterior','otro'])
})
test('no busca sobrantes viejos si el último embarque no tiene Refri',async()=>{
 const options=loadComponent([{id:'viejo',fecha:'2026-10-11',filas:[{kilos:99}]},{id:'nuevo',fecha:'2026-10-12',filas:[]}])
 const state={fecha:'2026-10-13',refriAnteriorSolicitud:0,...options.methods}
 await state.cargarRefriAnterior(); assert.deepEqual(state.refriAnterior.filas,[])
})
test('cambio de fecha no conserva resultado anterior ni acepta respuestas atrasadas',async()=>{
 const options=loadComponent();let resolveFirst
 const state={refriAnteriorSolicitud:0,refriAnterior:{filas:[{kilos:999}]},obtenerEmbarquesDelDiaAnterior:()=>new Promise(resolve=>{resolveFirst=resolve})}
 const first=options.methods.cargarRefriAnterior.call(state);assert.deepEqual(state.refriAnterior.filas,[])
 state.obtenerEmbarquesDelDiaAnterior=async()=>({fecha:'2026-10-12',embarques:[{filas:[{kilos:10}]}]})
 await options.methods.cargarRefriAnterior.call(state)
 resolveFirst({fecha:'2026-10-10',embarques:[{filas:[{kilos:99}]}]});await first
 assert.equal(state.refriAnterior.fecha,'2026-10-12');assert.equal(state.refriAnterior.filas[0].kilos,10)
})
test('fallo de lectura se informa sin mostrar cantidades antiguas',async()=>{
 const state={refriAnteriorSolicitud:0,refriAnterior:{filas:[{kilos:999}]},obtenerEmbarquesDelDiaAnterior:async()=>{throw Error('offline')}}
 await loadComponent().methods.cargarRefriAnterior.call(state)
 assert.deepEqual(state.refriAnterior.filas,[]);assert.match(state.refriAnterior.error,/No se pudo/)
})
