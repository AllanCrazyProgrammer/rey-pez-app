// Quién carga en el embarque según el día de la semana (regla de Allan, 2026-11-13).
// Lun, jue, sáb → Caminante; mar, mié, vie → Porro; domingo sin regla → ''.
// Misma regla que src/utils/cargaEmbarque.js (app): si una cambia, cambiar las dos.
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
const u = cargarModulo('src/utils/cargaEmbarque.js')

test('responsableCargaParaFecha: lunes, jueves y sábado → Caminante', () => {
  assert.equal(u.responsableCargaParaFecha('2026-11-16'), 'Caminante') // lunes
  assert.equal(u.responsableCargaParaFecha('2026-11-19'), 'Caminante') // jueves
  assert.equal(u.responsableCargaParaFecha('2026-11-14'), 'Caminante') // sábado
})

test('responsableCargaParaFecha: martes, miércoles y viernes → Porro', () => {
  assert.equal(u.responsableCargaParaFecha('2026-11-17'), 'Porro') // martes
  assert.equal(u.responsableCargaParaFecha('2026-11-18'), 'Porro') // miércoles
  assert.equal(u.responsableCargaParaFecha('2026-11-13'), 'Porro') // viernes, hoy
})

test('responsableCargaParaFecha: domingo sin regla, y fechas inválidas → vacío', () => {
  assert.equal(u.responsableCargaParaFecha('2026-11-15'), '') // domingo
  assert.equal(u.responsableCargaParaFecha(''), '')
  assert.equal(u.responsableCargaParaFecha(null), '')
  assert.equal(u.responsableCargaParaFecha('2026-02-30'), '')
  assert.equal(u.responsableCargaParaFecha('13/11/2026'), '')
})
