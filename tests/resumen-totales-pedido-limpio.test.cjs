const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { transformSync } = require('@babel/core')
const compiler = require('vue-template-compiler')
const Vue = require('vue')

const root = path.resolve(__dirname, '..')
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  let source = fs.readFileSync(path.join(root, file), 'utf8')
  if (file.endsWith('.vue')) source = compiler.parseComponent(source).script.content
  const module = { exports: {} }
  const requireMock = name => /^@\/utils\/(resumenTotalesPedidoLimpio|analisisPedidosLimpio|calculosPedidoLimpio|factorAgua)$/.test(name)
    ? load(`src/${name.slice(2)}.js`)
    : {}
  const code = transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code
  new Function('require', 'module', 'exports', code)(requireMock, module, module.exports)
  cache.set(file, module.exports)
  return module.exports
}

const { resumirTotalesPedidoLimpio: resumen } = load('src/utils/resumenTotalesPedidoLimpio.js')
const componentPath = 'src/views/Procesos/PedidoLimpioImpresion.vue'
const component = load(componentPath).default
const parsed = compiler.parseComponent(fs.readFileSync(path.join(root, componentPath), 'utf8'))
const item = (kilos, extra = {}) => ({ medida: '51/60', tipo: 'S/H20', kilos, ...extra })
const pedido = extra => ({ tipo: 'limpio', ...extra })

test('excluye Robalo normalizado de venta, maquila y total sin cambiar los datos', () => {
  const data = pedido({
    otilio: [item(500, { medida: '  RÓBALO  ', etiqueta: 'Selecta' }), item(120)],
    ozuna: [item(30, { medida: 'robalo', esMaquila: true })],
    clientesTemporales: { a: { pedidos: [item(40, { medida: 'RoBaLo', tipoOperacion: 'Maquila' })] } }
  })
  const original = JSON.stringify(data)
  assert.deepEqual(resumen(data), { venta: 120, maquila: 0, total: 120, tieneMaquila: false })
  assert.equal(JSON.stringify(data), original)
})

test('incluye los cinco clientes fijos y temporales actuales o legacy una sola vez', () => {
  assert.deepEqual(resumen(pedido({
    otilio: [item(1)], catarro: [item(2)], joselito: [item(3)], lorena: [item(4)], ozuna: [item(5)],
    clientesTemporales: { actual: { pedidos: [item(6)] }, legacy: [item(7)] }
  })), { venta: 28, maquila: 0, total: 28, tieneMaquila: false })
})

test('usa los controles explícitos de operación y las clasificaciones legacy de maquila', () => {
  assert.deepEqual(resumen(pedido({
    otilio: [item(1, { esMaquila: true })],
    joselito: [item(2, { medida: ' MACUIL ' }), item(3, { medida: 'Maquila' }), item(4)],
    ozuna: [item(5, { esMaquila: true }), item(6, { medida: 'maquila', esMaquila: false }), item(7, { esMaquila: false })],
    clientesTemporales: { a: { pedidos: [
      item(8, { tipoOperacion: ' MaQuIlA ' }),
      item(9, { tipoOperacion: 'Venta', esMaquila: true }),
      item(10, { tipoOperacion: '' })
    ] } }
  })), { venta: 30, maquila: 25, total: 55, tieneMaquila: true })
})

test('reutiliza las conversiones de agua, rendimiento, taras y Sellado', () => {
  assert.deepEqual(resumen(pedido({
    otilio: [item(2, { esTara: true, tipo: '1.4' }), item(10, { tipo: 'C/H20', agua: 0.7 })],
    ozuna: [item(2, { esTara: true, nota: 'Sellado', esMaquila: true }), item(2, { esTara: true, tipo: 'C/H20', esMaquila: true })]
  })), { venta: 63, maquila: 89, total: 152, tieneMaquila: true })
})

test('conserva decimales y el total coincide con la suma de las dos cantidades mostradas', () => {
  const data = pedido({ otilio: [item(0.1), item(0.2), item(0.145)], ozuna: [item(0.145, { esMaquila: true })] })
  const result = resumen(data)
  assert.deepEqual(result, { venta: 0.45, maquila: 0.15, total: 0.6, tieneMaquila: true })
  assert.equal(result.total, Number((result.venta + result.maquila).toFixed(2)))
})

test('vacíos, cantidades inválidas y maquila sin kilos no generan un subtotal de maquila', () => {
  const empty = { venta: 0, maquila: 0, total: 0, tieneMaquila: false }
  assert.deepEqual(resumen(null), empty)
  assert.deepEqual(resumen(pedido({ otilio: [null, item(-1), item('no'), item(50, { medida: '' })], ozuna: [item(0, { esMaquila: true })] })), empty)
})

test('redondea correctamente los medios centésimos tras convertir kilos con agua', () => {
  assert.deepEqual(resumen(pedido({
    otilio: [item(12.7, { tipo: 'C/H20', agua: 0.65 })],
    ozuna: [item(10.075, { esMaquila: true })]
  })), { venta: 8.26, maquila: 10.08, total: 18.34, tieneMaquila: true })
})

test('mantiene la tarjeta Robalo y las claves de rendimiento del resumen por medida', () => {
  const props = { pedidoOtilio: [item(500, { medida: 'Robalo' }), item(100)], pedidoOzuna: [item(50, { esMaquila: true, etiqueta: 'Honduras' })] }
  const cards = component.methods.calcularTotalesPorMedida.call(props)
  assert.deepEqual(cards, [
    { medida: '51/60', total: 100 }, { medida: '51/60 Maq Honduras', total: 50 }, { medida: 'Robalo', total: 500 }
  ])
  assert.deepEqual(component.computed.totalesResumen.call(props), { venta: 100, maquila: 50, total: 150, tieneMaquila: true })
})

test('la fila renderiza Venta y Total, y añade Maquila reactivamente solo cuando hay kilos', () => {
  const template = parsed.template.content.trim()
  const compiled = compiler.compile(template, { outputSourceRange: true })
  assert.deepEqual(compiled.errors, [])
  function find(node) {
    if (node.attrsMap?.class === 'medidas-total-general') return node
    return (node.children || []).map(find).find(Boolean)
  }
  const footer = find(compiled.ast)
  const footerTemplate = template.slice(footer.start, footer.end)
  assert.deepEqual(compiler.compile(footerTemplate).errors, [])
  const render = compiler.compileToFunctions(footerTemplate)
  const vm = new Vue({
    data: () => ({ pedidoOtilio: [item(20)], pedidoOzuna: [] }),
    computed: component.computed,
    ...render
  })
  const labels = () => vm._render().children.filter(node => node.tag).map(node => node.children.find(child => child.tag === 'span').children[0].text)
  assert.deepEqual(labels(), ['Venta', 'Total'])
  vm.pedidoOzuna.push(item(5, { esMaquila: true }))
  assert.deepEqual(labels(), ['Venta', 'Maquila', 'Total'])
  assert.equal(vm.totalesResumen.total, 25)
  assert.equal(vm._render().data.class['con-maquila'], true)
  vm.pedidoOzuna[0].kilos = 0
  assert.deepEqual(labels(), ['Venta', 'Total'])
})
