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

const embarqueEjemplo = () => ([
  { nombre: 'Catarro', productos: [
    { id: 1, medida: '51/60', precio: 185, precioOrigen: 'general' },
    { id: 2, medida: '41/50', precio: 230, precioOrigen: 'general' }
  ] },
  { nombre: 'Otilio', productos: [
    { id: 3, medida: '51/60', precio: 180, precioOrigen: 'especifico', precioClienteId: 'otilio' },
    { id: 4, medida: '51/60', precio: 180, precioOrigen: 'especifico', refrigerar: true }
  ] },
  { nombre: 'Joselito', productos: [{ id: 5, medida: '51/60', precio: 190, precioOrigen: 'manual', precioMedidaBase: '51/60' }] },
  { nombre: 'guayaba', productos: [{ id: 6, medida: '51/60 ' }] },
  { nombre: 'Ozuna', productos: [
    { id: 7, medida: '51/60', precio: 21, esVenta: false },
    { id: 8, medida: '51/60', precio: 185, esVenta: true, precioOrigen: 'general' }
  ] }
])
const precioDe = (clientes, id) => clientes.flatMap(c => c.productos).find(p => p.id === id)

test('editar precio solo en este embarque: líneas del cliente quedan manuales', () => {
  const original = embarqueEjemplo()
  const copia = JSON.stringify(original)
  const r = g.aplicarPrecioEnClientes(original, { medida: '51/60', precio: 188, alcance: 'embarque', cliente: 'catarro', fecha: '2026-11-27' })
  assert.equal(JSON.stringify(original), copia, 'no muta la entrada')
  assert.equal(r.cambiadas, 1)
  const linea = precioDe(r.clientes, 1)
  assert.equal(linea.precio, 188)
  assert.equal(linea.precioOrigen, 'manual')
  assert.equal(linea.precioMedidaBase, '51/60')
  assert.equal(precioDe(r.clientes, 2).precio, 230, 'otra medida no cambia')
  assert.equal(precioDe(r.clientes, 8).precio, 185, 'otro cliente no cambia')
})

test('editar precio específico del cliente: sus líneas pasan a 📌 (refrigerados no)', () => {
  const r = g.aplicarPrecioEnClientes(embarqueEjemplo(), { medida: '51/60', precio: 178, alcance: 'cliente', cliente: 'Otilio', fecha: '2026-11-27', clienteId: 'otilio' })
  assert.equal(r.cambiadas, 1)
  assert.equal(precioDe(r.clientes, 3).precio, 178)
  assert.equal(precioDe(r.clientes, 3).precioOrigen, 'especifico')
  assert.equal(precioDe(r.clientes, 4).precio, 180)
})

test('nuevo precio general: cambia lo que sigue al general; respeta manual y propio de otros', () => {
  const r = g.aplicarPrecioEnClientes(embarqueEjemplo(), { medida: '51/60', precio: 190, alcance: 'general', cliente: 'Catarro', fecha: '2026-11-27' })
  assert.equal(precioDe(r.clientes, 1).precio, 190)
  assert.equal(precioDe(r.clientes, 6).precio, 190, 'línea sin precio toma el general')
  assert.equal(precioDe(r.clientes, 8).precio, 190, 'venta de Ozuna sigue el general')
  assert.equal(precioDe(r.clientes, 7).precio, 21, 'maquila de Ozuna no se toca')
  assert.equal(precioDe(r.clientes, 3).precio, 180, 'Otilio conserva su precio propio')
  assert.equal(precioDe(r.clientes, 5).precio, 190 , 'Joselito manual ya estaba en 190')
  assert.equal(precioDe(r.clientes, 5).precioOrigen, 'manual', 'manual de otro cliente no se toca')
  assert.equal(r.cambiadas, 3)
})

test('nuevo precio general desde un cliente con precio propio: quitarPropio decide', () => {
  const conserva = g.aplicarPrecioEnClientes(embarqueEjemplo(), { medida: '51/60', precio: 195, alcance: 'general', cliente: 'Otilio', fecha: '2026-11-27' })
  assert.equal(precioDe(conserva.clientes, 3).precio, 180)
  const quita = g.aplicarPrecioEnClientes(embarqueEjemplo(), { medida: '51/60', precio: 195, alcance: 'general', cliente: 'Otilio', fecha: '2026-11-27', quitarPropio: true })
  assert.equal(precioDe(quita.clientes, 3).precio, 195)
  assert.equal(precioDe(quita.clientes, 3).precioOrigen, 'general')
  assert.equal(precioDe(quita.clientes, 3).precioClienteId, null)
})

test('origen de línea y categoría de catálogo', () => {
  assert.equal(g.origenPrecioLinea({ precio: 0 }), null)
  assert.equal(g.origenPrecioLinea({ precio: 10 }), 'general')
  assert.equal(g.origenPrecioLinea({ precio: 10, precioOrigen: 'manual' }), 'manual')
  assert.equal(g.categoriaProductoPrecio('51/60'), 'Camarón S/C')
  assert.equal(g.categoriaProductoPrecio('Med-Gde c/c'), 'Camarón C/C')
  assert.equal(g.categoriaProductoPrecio('Piojo'), 'Otros')
})

test('costo recordado: medida nueva va al catálogo sin proveedor', () => {
  const ahora = new Date(2026, 10, 27, 10)
  const e = g.entradaCatalogoCosto({ medida: ' Piojo  Panga ', costo: '95', fecha: '2026-11-27', ahora })
  assert.equal(e.medida, 'Piojo  Panga')
  assert.equal(e.costoKey, 'piojo panga__sin-proveedor')
  assert.equal(e.costoBase, 95)
  assert.equal(e.tipoCosto, 'limpio')
  assert.equal(e.nuevo, true)
  assert.equal(e.archivado, false)
  assert.equal(e.timestamp, ahora)
  assert.equal(g.generarCostoKey('51 / 60 - Tirado', ' Tirado  Sur '), '51/60-tirado__tirado sur')
})

test('costo recordado: misma medida del catálogo actualiza su medida + proveedor', () => {
  const detalle = { medidaEncontrada: '51/60 Tirado', proveedorNombre: 'Tirado', proveedorId: 'x', costo: 121 }
  const e = g.entradaCatalogoCosto({ medida: '51/60 tirado', costo: 125, fecha: '2026-11-27', detalle })
  assert.equal(e.medida, '51/60 Tirado')
  assert.equal(e.proveedorNombre, 'Tirado')
  assert.equal(e.costoKey, '51/60 tirado__tirado')
  assert.equal(e.nuevo, false)
})

test('costo recordado: si venía de la talla base no cambia la talla base', () => {
  const detalle = { medidaEncontrada: '51/60', proveedorNombre: 'Selecta', costo: 149 }
  const e = g.entradaCatalogoCosto({ medida: '51/60 tirado', costo: 121, fecha: '2026-11-27', detalle, tipoCosto: 'crudo' })
  assert.equal(e.medida, '51/60 tirado')
  assert.equal(e.proveedorNombre, '')
  assert.equal(e.costoKey, '51/60 tirado__sin-proveedor')
  assert.equal(e.tipoCosto, 'crudo')
})

test('proveedor activo: embarque > default general > nada', () => {
  assert.equal(g.proveedorActivoParaMedida('51/60', { '51/60': 'a' }, { '51/60': 'b' }), 'a')
  assert.equal(g.proveedorActivoParaMedida('51/60', {}, { '51/60': 'b' }), 'b')
  assert.equal(g.proveedorActivoParaMedida('51/60', undefined, undefined), null)
})

test('respaldo sin elección: sin proveedor primero, luego el más reciente; archivados fuera', () => {
  const lista = [
    { costoKey: 'selecta', proveedorNombre: '41 y 61 prime selecta', fecha: '2026-04-28' },
    { costoKey: 'tirado', proveedorNombre: 'Tirado', fecha: '2026-11-23' },
    { costoKey: 'honduras', proveedorNombre: 'Honduras', fecha: '2026-04-28', timestamp: 5 },
    { costoKey: 'viejo', proveedorNombre: 'X', fecha: '2026-12-01', archivado: true }
  ]
  assert.deepEqual(g.ordenarProveedoresDefault(lista).map(e => e.costoKey), ['tirado', 'honduras', 'selecta'])
  assert.equal(g.ordenarProveedoresDefault([...lista, { costoKey: 'base', proveedorNombre: '', fecha: '2026-01-01' }])[0].costoKey, 'base')
})

test('clonar foto: copia mapas pero conserva Timestamps', () => {
  class Timestamp { constructor (s) { this.seconds = s } }
  const ts = new Timestamp(10)
  const original = { mapa: { '51/60': 'a' }, lista: [{ x: 1 }], fecha: ts }
  const copia = g.clonarDatosPlanos(original)
  copia.mapa['51/60'] = 'b'
  copia.lista[0].x = 2
  assert.equal(original.mapa['51/60'], 'a')
  assert.equal(original.lista[0].x, 1)
  assert.equal(copia.fecha, ts)
})
