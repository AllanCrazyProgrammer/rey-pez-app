// Funciones puras de la pantalla de Rendimientos (src/utils/rendimientosCalculos.js).
// Fijan el comportamiento que tenían como methods de Rendimientos.vue antes de moverse.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { transformSync } = require('@babel/core')
const compiler = require('vue-template-compiler')

const root = path.resolve(__dirname, '..')
function cargarModulo(file) {
  const code = transformSync(fs.readFileSync(path.join(root, file), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(() => ({}), module, module.exports)
  return module.exports
}
const u = cargarModulo('src/utils/rendimientosCalculos.js')

test('formatos de kilos, precios y números', () => {
  assert.equal(u.formatearKg(1234.56), '1,234.6')
  assert.equal(u.formatearKg(null), '0.0')
  assert.equal(u.formatearPrecio(1234.5), '1,235')
  assert.equal(u.formatearPrecioConDecimales(1234.5), '1,234.50')
  assert.equal(u.formatearNumero(1234.567), '1,234')
})

test('toLocalYMD acepta texto, Date y Timestamp de Firebase', () => {
  assert.equal(u.toLocalYMD('2026-09-26'), '2026-09-26')
  assert.equal(u.toLocalYMD(new Date(2026, 8, 26, 23, 59)), '2026-09-26')
  assert.equal(u.toLocalYMD({ seconds: new Date(2026, 8, 26, 12).getTime() / 1000 }), '2026-09-26')
  assert.equal(u.toLocalYMD(''), '')
  assert.equal(u.toLocalYMD(null), '')
})

test('totales de kilos, taras y bolsas de un producto', () => {
  const producto = { kilos: [10, '5.5', null, 'x'], taras: [1, '2', null], reporteTaras: ['3', 2, 'x'], reporteBolsas: [10, '5', 7] }
  assert.equal(u.calcularTotalKilos(producto), 15.5)
  assert.equal(u.calcularTotalTaras(producto), 3)
  assert.equal(u.calcularTotalBolsas(producto), 3 * 10 + 2 * 5)
  assert.equal(u.calcularTotalBolsas({}), 0)
})

test('kilos en crudo: combinar suma; fusionar solo llena medidas vacías', () => {
  const destino = { '51/60': 5 }
  u.combinarKilosCrudos(destino, { '51/60': '7.5', '41/50': 3 })
  assert.deepEqual(destino, { '51/60': 12.5, '41/50': 3 })

  const conMedidas = { '51/60': { medida1: 1, medida2: 2, etiqueta1: 'A' } }
  u.combinarKilosCrudos(conMedidas, { '51/60': { medida1: '3', medida2: 4, etiqueta2: 'B' } })
  assert.deepEqual(conMedidas, { '51/60': { medida1: 4, medida2: 6, etiqueta1: 'A', etiqueta2: 'B' } })

  const parcial = { '51/60': 8, '41/50': 0 }
  u.fusionarKilosCrudosSiVacio(parcial, { '51/60': 99, '41/50': 4, '61/70': 2 })
  assert.deepEqual(parcial, { '51/60': 8, '41/50': 4, '61/70': 2 })
})

test('clientes, medidas y clon profundo', () => {
  assert.equal(u.obtenerClienteIdParaPrecios('Lorena'), 'veronica')
  assert.equal(u.obtenerClienteIdParaPrecios('CATARRO'), 'catarro')
  assert.equal(u.obtenerClienteIdParaPrecios('Otro'), null)
  assert.equal(u.obtenerNombreClienteDeId('ozuna'), 'Ozuna')
  assert.equal(u.obtenerNombreClienteDeId('nuevo'), 'nuevo')
  assert.equal(u.esMedidaMix('Mix 41/50'), true)
  assert.equal(u.esMedidaRefri('51/60 refri'), true)
  const original = { a: [1, { b: 2 }] }
  const copia = u.deepClone(original)
  assert.deepEqual(copia, original)
  assert.notEqual(copia.a[1], original.a[1])
})

test('Rendimientos.vue sigue exponiendo las mismas funciones en methods', () => {
  const source = compiler.parseComponent(fs.readFileSync(path.join(root, 'src/views/Embarques/Rendimientos.vue'), 'utf8')).script.content
  for (const nombre of Object.keys(u)) {
    assert.match(source, new RegExp(`\\n\\s+${nombre},\\n`), `${nombre} debe seguir en methods`)
  }
})
