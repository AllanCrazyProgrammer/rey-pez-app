// Progreso del embarque frente al pedido del día (src/utils/progresoEmbarque.js).
// Fija el denominador: kilos pedidos en limpios (kilos directos + taras × 20)
// y en crudos (taras × 19, sin duplicar la medida normalizada).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { transformSync } = require('@babel/core')

const root = path.resolve(__dirname, '..')
function cargarModulo(file) {
  const code = transformSync(fs.readFileSync(path.join(root, file), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(() => ({}), module, module.exports)
  return module.exports
}
const u = cargarModulo('src/utils/progresoEmbarque.js')

// Índice limpio con la forma de construirIndicePedidoReferencia: por cliente,
// porMedida { kilos, taras }.
const pedidoLimpio = {
  1: { porMedida: { '51/60': { kilos: 500, taras: 0 }, '36/40': { kilos: 0, taras: 10 } } },
  2: { porMedida: { '71/90': { kilos: 230, taras: 0 } } },
}

test('kilosPedidoLimpio: kilos directos + taras sueltas × 20 kg', () => {
  // 500 + (10 × 20) + 230 = 930
  assert.equal(u.kilosPedidoLimpio(pedidoLimpio), 930)
  assert.equal(u.kilosPedidoLimpio({}), 0)
  assert.equal(u.kilosPedidoLimpio(), 0)
})

test('kilosPedidoCrudo: taras × 19 kg sin duplicar la medida normalizada', () => {
  // El índice trae "Med" y "Med c/c" con las mismas taras: es el mismo pedido.
  const pedidoCrudo = {
    2: { Med: { taras: 4 }, 'Med c/c': { taras: 4 }, 'Pac ch': { taras: 5 } },
    1: { Jumbo: { taras: 2 }, 'Jumbo c/c': { taras: 2 } },
  }
  // (4 + 5 + 2) × 19 = 209, no 380
  assert.equal(u.kilosPedidoCrudo(pedidoCrudo), 209)
  assert.equal(u.kilosPedidoCrudo({}), 0)
})

test('calcularProgresoEmbarque: limpios + crudos, de 0 a 100', () => {
  const pesado = { limpio: { taras: 20, kilos: 400 }, crudo: { taras: 5, kilos: 100 } }
  const pedidoCrudo = { 2: { Med: { taras: 4 }, 'Med c/c': { taras: 4 } } }
  const p = u.calcularProgresoEmbarque(pesado, pedidoLimpio, pedidoCrudo)
  // Pedido: 930 limpio + 76 crudo (4 taras × 19) = 1,006.
  // Pesado: 400 limpio + 5 taras × 19 = 495 de 1,006 ≈ 49 %.
  // El crudo se cuenta por taras: los 100 kg del resumen del embarque
  // (5 × 20) no se usan, para no inflar el pedido.
  assert.equal(p.pedidoLimpio, 930)
  assert.equal(p.pedidoCrudo, 76)
  assert.equal(p.pedidoTotal, 1006)
  assert.equal(p.pesadoTotal, 495)
  assert.equal(p.porcentaje, 49)
  assert.equal(p.porcentajeLimpio, 43)
  assert.equal(p.porcentajeCrudo, 100)
  assert.equal(p.faltante, 511)
  assert.equal(p.tienePedido, true)
  assert.equal(p.completo, false)
})

test('calcularProgresoEmbarque: sin pedido no inventa porcentaje; pesado de más se topa en 100', () => {
  const sinPedido = u.calcularProgresoEmbarque({ limpio: { kilos: 100 }, crudo: { kilos: 0 } }, {}, {})
  assert.equal(sinPedido.porcentaje, 0)
  assert.equal(sinPedido.tienePedido, false)
  assert.equal(sinPedido.completo, false)

  const deMas = u.calcularProgresoEmbarque(
    { limpio: { kilos: 1000 }, crudo: { kilos: 0 } },
    { 1: { porMedida: { '51/60': { kilos: 500, taras: 0 } } } },
    {}
  )
  assert.equal(deMas.porcentaje, 100)
  assert.equal(deMas.completo, true)
  assert.equal(deMas.faltante, 0)
})
