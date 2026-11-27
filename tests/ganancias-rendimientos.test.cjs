// Reglas del análisis de ganancia de Rendimientos (src/utils/gananciasRendimientos.js).
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
const g = cargarModulo('src/utils/gananciasRendimientos.js')

const catalogo = [
  { precio: 180, fecha: '2026-11-01', clienteId: 'catarro' },
  { precio: 200, fecha: '2026-11-20' },
  { precio: 190, fecha: '2026-11-10' },
  { precio: 175, fecha: '2026-12-05', clienteId: 'catarro' }
]

test('precio específico del cliente gana aunque el general sea más nuevo', () => {
  const r = g.resolverPrecioCatalogo(catalogo, '2026-11-25', 'catarro')
  assert.equal(r.precio, 180)
  assert.equal(r.origen, 'especifico')
  // Cliente sin precio específico: general vigente.
  assert.equal(g.resolverPrecioCatalogo(catalogo, '2026-11-25', 'otilio').precio, 200)
  assert.equal(g.resolverPrecioCatalogo(catalogo, '2026-11-25').origen, 'general')
})

test('solo cuentan precios con fecha <= embarque (no los capturados después)', () => {
  assert.equal(g.resolverPrecioCatalogo(catalogo, '2026-11-15').precio, 190)
  assert.equal(g.resolverPrecioCatalogo(catalogo, '2026-12-06', 'catarro').precio, 175)
  // Antes de cualquier precio: el más antiguo, marcado como posterior.
  const r = g.resolverPrecioCatalogo(catalogo, '2026-01-01')
  assert.equal(r.precio, 190)
  assert.equal(r.posterior, true)
  assert.equal(g.resolverPrecioCatalogo([], '2026-01-01'), null)
})

test('mismo día: gana la captura más reciente', () => {
  const lista = [
    { precio: 100, fecha: '2026-11-20', timestamp: 1 },
    { precio: 110, fecha: '2026-11-20', timestamp: 2 }
  ]
  assert.equal(g.resolverPrecioCatalogo(lista, '2026-11-20').precio, 110)
})

test('precio de la línea del embarque (manual o específico); maquila no cuenta', () => {
  assert.deepEqual(
    g.precioVentaDeProducto({ precio: 210, precioOrigen: 'manual', precioFecha: '2026-11-20' }),
    { precio: 210, origen: 'manual', fecha: '2026-11-20', clienteId: null, desdeEmbarque: true }
  )
  assert.equal(g.precioVentaDeProducto({ precio: '195', precioOrigen: 'especifico' }).origen, 'especifico')
  // Sin origen registrado (embarques viejos): general.
  assert.equal(g.precioVentaDeProducto({ precio: 200 }).origen, 'general')
  assert.equal(g.precioVentaDeProducto({ precio: 21 }, { esMaquila: true }), null)
  assert.equal(g.precioVentaDeProducto({ precio: 0 }), null)
  assert.equal(g.precioVentaDeProducto({}), null)
})

test('ganancia limpio: precio por cliente, promedio ponderado y kilos sin precio', () => {
  const r = g.calcularGananciaLimpio([
    { cliente: 'Catarro', kilos: 100, precio: 180, origen: 'especifico' },
    { cliente: 'Otilio', kilos: 50, precio: 200, origen: 'general' },
    { cliente: 'Otilio', kilos: 50, precio: 200, origen: 'general' },
    { cliente: 'Nuevo', kilos: 10, precio: null }
  ], 150)
  assert.equal(r.totalEmbarcado, 200)
  assert.equal(r.precioVenta, 190)
  assert.equal(r.gananciaTotal, 100 * 30 + 100 * 50)
  assert.equal(r.gananciaUnitaria, 40)
  assert.equal(r.kilosSinPrecio, 10)
  assert.deepEqual(r.clientesSinPrecio, ['Nuevo'])
  assert.equal(r.esPromedio, true)
  assert.deepEqual(r.clientesConEspecifico, ['Catarro'])
  assert.equal(r.detallesPorCliente.length, 2)
  const suma = r.detallesPorCliente.reduce((s, d) => s + d.gananciaTotal, 0)
  assert.equal(suma, r.gananciaTotal)
})

test('ganancia limpio respeta precios con centavos (no redondea antes de multiplicar)', () => {
  const r = g.calcularGananciaLimpio([{ cliente: 'A', kilos: 1000, precio: 152.5 }], 150)
  assert.equal(r.gananciaTotal, 2500)
  assert.equal(g.calcularGananciaLimpio([{ cliente: 'A', kilos: 10, precio: 0 }], 150), null)
})

test('costo: manual del embarque > catálogo > guardado', () => {
  const catalogoCosto = { costo: 121, medidaEncontrada: '51/60', proveedorNombre: 'Tirado' }
  assert.deepEqual(
    g.resolverCostoMedida({ medida: '51/60 tirado', catalogo: catalogoCosto, manuales: { '51/60 TIRADO': 130 }, guardados: { '51/60 tirado': 149 } }),
    { costo: 130, fuente: 'manual' }
  )
  const cat = g.resolverCostoMedida({ medida: '51/60 tirado', catalogo: catalogoCosto, guardados: { '51/60 tirado': 149 } })
  assert.equal(cat.costo, 121)
  assert.equal(g.describirFuenteCosto(cat), 'Catálogo: 51/60 – Tirado')
  assert.deepEqual(g.resolverCostoMedida({ medida: 'x', guardados: { X: 90 } }), { costo: 90, fuente: 'embarque' })
  assert.equal(g.resolverCostoMedida({ medida: 'x' }), null)
  assert.equal(g.describirFuenteCosto(null), 'Sin costo')
})

test('costo extra: 0 es válido; vacío usa 18', () => {
  assert.equal(g.normalizarCostoExtra(0), 0)
  assert.equal(g.normalizarCostoExtra('0'), 0)
  assert.equal(g.normalizarCostoExtra(undefined), 18)
  assert.equal(g.normalizarCostoExtra(''), 18)
  assert.equal(g.normalizarCostoExtra('abc'), 18)
  assert.equal(g.calcularCostoFinalKg({ costo: 100, rendimiento: 1.234, aplicarExtra: true, costoExtra: 0 }), 123)
  assert.equal(g.calcularCostoFinalKg({ costo: 100, rendimiento: 1.234, aplicarExtra: true }), 141)
  assert.equal(g.calcularCostoFinalKg({ costo: 100, rendimiento: 1.234 }), 123)
})

test('crudos: ganancia por cliente con su propio precio y suma exacta', () => {
  const r = g.calcularGananciaCrudo([
    { cliente: 'A', kilos: 60, precioVenta: 100 },
    { cliente: 'B', kilos: 40, precioVenta: 120 },
    { cliente: 'C', kilos: 0, precioVenta: 90 }
  ], 80, 110)
  assert.equal(r.totalKilos, 100)
  assert.equal(r.totalCosto, 8800)
  assert.equal(r.gananciaTotal, 6000 + 4800 - 8800)
  assert.equal(r.detalles.length, 2)
  assert.equal(r.detalles[0].gananciaUnitaria, 100 - 88)
  assert.equal(r.detalles[1].gananciaUnitaria, 120 - 88)
  assert.ok(Math.abs(r.detalles.reduce((s, d) => s + d.gananciaTotal, 0) - r.gananciaTotal) < 1e-9)
  assert.equal(g.calcularGananciaCrudo([], 80, 10), null)
})

test('precio de maquila ponderado de las líneas del embarque', () => {
  assert.equal(g.precioMaquilaPonderado([{ kilos: 100, precio: 21 }, { kilos: 100, precio: 23 }]), 22)
  assert.equal(g.precioMaquilaPonderado([{ kilos: 0, precio: 21 }]), 0)
})
