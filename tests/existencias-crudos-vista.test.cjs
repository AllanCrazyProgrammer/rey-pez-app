// Resumen de Existencias de Crudos: un renglón por medida y crudo de Otilio resaltado.
const test = require('node:test')
const assert = require('node:assert/strict')
const { esCrudoDeOtilio, agruparLotesPorMedida } = require('../src/utils/existenciasCrudosVista')

const lote = (producto, cuarto, kilos, piezas = '', ultimoPrecio = 0) =>
  ({ nombre: producto, producto, cuarto, kilos, piezas, ultimoPrecio, proveedor: 'Maria Guadalupe' })

test('une las medidas del mismo nombre aunque tengan piezas o cuartos distintos', () => {
  const filas = agruparLotesPorMedida([
    lote('Pac Gde (med esp)', 'Cuarto 1', 592, '33'),
    lote('Pac Gde (med esp)', 'Cuarto 2', 1756, '54'),
    lote('Chcio (gde y med gde)', 'Cuarto 1', 279.5, '21'),
    lote('Chcio (gde y med gde)', 'Cuarto 2', 1475, '44'),
    lote('Rechazo', 'Cuarto 1', 18)
  ])
  assert.equal(filas.length, 3)
  const pacGde = filas.find(f => f.nombre === 'Pac Gde (med esp)')
  assert.equal(pacGde.kilos, 2348)
  assert.equal(pacGde.cuarto, '2 cuartos')
  assert.deepEqual(pacGde.cuartos.map(c => [c.cuarto, c.kilos]), [['Cuarto 1', 592], ['Cuarto 2', 1756]])
  assert.equal(filas.find(f => f.nombre === 'Rechazo').cuarto, 'Cuarto 1')
})

test('suma lotes del mismo cuarto y conserva el valor con precios distintos', () => {
  const [fila] = agruparLotesPorMedida([
    lote('Mediano', 'Cuarto 1', 100, '17', 50),
    lote('Mediano', 'Cuarto 1', 100, '24', 70)
  ])
  assert.equal(fila.cuartos.length, 1)
  assert.equal(fila.cuartos[0].kilos, 200)
  assert.equal(fila.cuartos[0].piezas, '')
  assert.equal(fila.valor, 12000)
  assert.equal(fila.ultimoPrecio, 60)
})

test('reconoce el crudo de Otilio', () => {
  assert.ok(esCrudoDeOtilio('Maria Guadalupe', 'Pac ch Otilio'))
  assert.ok(esCrudoDeOtilio('Ozuna', 'Mediano OTILIO'))
  assert.ok(esCrudoDeOtilio('Maria Guadalupe', 'Pac Ch'))
  assert.ok(esCrudoDeOtilio('María Guadalupe', 'Pac. Ch.'))
  assert.ok(esCrudoDeOtilio('Galileo', 'Pacotilla chica'))
  assert.ok(esCrudoDeOtilio('Barco Galileo', 'Pac Chica'))
  assert.ok(!esCrudoDeOtilio('Maria Guadalupe', 'Pac Gde (med esp)'))
  assert.ok(!esCrudoDeOtilio('Maria Guadalupe', 'Chcio (gde y med gde)'))
  assert.ok(!esCrudoDeOtilio('Ozuna', 'Pac Ch'))
})
