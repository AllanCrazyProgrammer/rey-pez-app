// Barcos de la impresión de crudos: sugerencia por cliente y campo propio.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

function formatearMedidaPedidoCrudo(medida) {
  const nombre = String(medida || '').trim()
  return /[cs]\s*\/\s*c$/i.test(nombre) ? nombre : `${nombre} c/c`
}

const src = fs.readFileSync(path.join(__dirname, '../src/utils/barcosPorMedida.js'), 'utf8')
const puro = src
  .replace(/^import .*$/gm, '')
  .replace(/export /g, '')
const m = {}
new Function(
  'm',
  'formatearMedidaPedidoCrudo',
  puro + '\nObject.assign(m,{CAMPO_BARCOS_POR_MEDIDA,claveBarcoPorMedida,sugerirBarcoPorMedida,textoGuardadoBarco,barcoInicial,cambioBarcoPorMedida,debePersistirBarco});'
)(m, formatearMedidaPedidoCrudo)

// Forma real de pedidos/gaSH49Gfm83IdlwN9foW (20/10/2026). Solo lectura de la prueba.
const pedido2010 = {
  barcosPorPedido: {
    Catarro: {},
    '8a': {
      'med-gde': 'chico maria',
      med: 'pac ch maria',
      'med-esp': '',
      'med ch c/c': 'pac ch memo'
    },
    Veronica: {
      extra: 'chico galileo',
      med: 'pac ch maria'
    },
    Otilio: {
      'med-gde': 'chico maria'
    },
    Ozuna: {}
  }
}

test('el 20/10/2026 sugiere un barco por medida, sin repetir y con Med-Esp vacío', () => {
  const sugerir = columna => m.sugerirBarcoPorMedida(columna, pedido2010.barcosPorPedido)
  assert.equal(sugerir('Med'), 'pac ch maria')
  assert.equal(sugerir('Med-Esp'), '')
  assert.equal(sugerir('Med-gde'), 'chico maria')
  assert.equal(sugerir('Extra'), 'chico galileo')
  assert.equal(sugerir('Med Ch c/c'), 'pac ch memo')
  assert.equal(sugerir('Gde'), '')
})

test('une barcos distintos con " / " en el orden de clientes y no duplica mayúsculas', () => {
  const barcos = {
    Veronica: { med: 'Galileo' },
    '8a': { med: 'pac ch maria' },
    Otilio: { med: 'PAC CH MARIA' }
  }
  assert.equal(m.sugerirBarcoPorMedida('Med', barcos), 'pac ch maria / Galileo')
})

test('barcosPorMedida con texto gana; vacío o ausente vuelve a la sugerencia', () => {
  const fuentes = {
    barcosPorMedida: { 'Med c/c': 'escrito a mano', 'Extra c/c': '  ' },
    barcosPorPedido: pedido2010.barcosPorPedido
  }
  assert.equal(m.barcoInicial('Med', fuentes), 'escrito a mano')
  assert.equal(m.barcoInicial('Extra', fuentes), 'chico galileo')
  assert.equal(m.barcoInicial('Med-gde', fuentes), 'chico maria')
  assert.equal(m.textoGuardadoBarco(fuentes.barcosPorMedida, 'Med'), 'escrito a mano')
  assert.equal(m.textoGuardadoBarco(fuentes.barcosPorMedida, 'Med-gde'), null)
})

test('el cambio solo describe barcosPorMedida y la clave impresa', () => {
  const cambio = m.cambioBarcoPorMedida('Med', '  pac ch maria  ')
  assert.deepEqual(cambio, {
    campo: 'barcosPorMedida',
    clave: 'Med c/c',
    valor: 'pac ch maria'
  })
  assert.equal(m.claveBarcoPorMedida('Med-Esp'), 'Med-Esp c/c')
  assert.equal(m.claveBarcoPorMedida('Med Ch c/c'), 'Med Ch c/c')
  assert.equal(m.CAMPO_BARCOS_POR_MEDIDA, 'barcosPorMedida')
  assert.equal(Object.prototype.hasOwnProperty.call(cambio, 'barcosPorPedido'), false)
})

test('no escribe la sugerencia hasta que la casilla se edita, y no repite el mismo texto', () => {
  assert.equal(m.debePersistirBarco({
    editado: false,
    pedidoId: 'gaSH49Gfm83IdlwN9foW',
    valor: 'pac ch maria',
    ultimoGuardado: undefined
  }), false)
  assert.equal(m.debePersistirBarco({
    editado: true,
    pedidoId: '',
    valor: 'otro',
    ultimoGuardado: undefined
  }), false)
  assert.equal(m.debePersistirBarco({
    editado: true,
    pedidoId: 'gaSH49Gfm83IdlwN9foW',
    valor: '  otro barco ',
    ultimoGuardado: undefined
  }), true)
  assert.equal(m.debePersistirBarco({
    editado: true,
    pedidoId: 'gaSH49Gfm83IdlwN9foW',
    valor: 'otro barco',
    ultimoGuardado: 'otro barco'
  }), false)
})
