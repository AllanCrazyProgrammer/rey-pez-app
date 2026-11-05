const test = require('node:test')
const assert = require('node:assert/strict')
const { kilosDisponiblesFifo } = require('../src/utils/kilosDisponiblesFifo')

test('entradas y salidas normales', () => {
  assert.equal(kilosDisponiblesFifo([
    { tipo: 'entrada', kilos: 400, cuarto: 's/c' },
    { tipo: 'salida', kilos: 38.5, cuarto: 's/c' }
  ]), 361.5)
})

test('salida que excede lotes previos no deja negativo (igual que Existencias)', () => {
  // salida procesada antes de la entrada: Existencias muestra 361.5, restar totales daría 0
  assert.equal(kilosDisponiblesFifo([
    { tipo: 'salida', kilos: 361.5, cuarto: 's/c' },
    { tipo: 'entrada', kilos: 361.5, cuarto: 's/c' }
  ]), 361.5)
})

test('cada cuarto consume solo sus lotes y se puede filtrar', () => {
  const movs = [
    { tipo: 'entrada', kilos: 100, cuarto: 'A' },
    { tipo: 'entrada', kilos: 50, cuarto: 'B' },
    { tipo: 'salida', kilos: 70, cuarto: 'B' }
  ]
  assert.equal(kilosDisponiblesFifo(movs, c => c === 'A'), 100)
  assert.equal(kilosDisponiblesFifo(movs, c => c === 'B'), 0)
  assert.equal(kilosDisponiblesFifo(movs), 100)
})
