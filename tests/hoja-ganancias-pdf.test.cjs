// Hoja "Análisis de ganancia" del PDF de Rendimientos (src/utils/pdf/generators/hojaGanancias.js).
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { transformSync } = require('@babel/core')

const root = path.resolve(__dirname, '..')
function cargarModulo (file) {
  const code = transformSync(fs.readFileSync(path.join(root, file), 'utf8'), {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(() => ({}), module, module.exports)
  return module.exports
}
const h = cargarModulo('src/utils/pdf/generators/hojaGanancias.js')
const g = cargarModulo('src/utils/gananciasRendimientos.js')

function renderizar (contenido) {
  const PdfPrinter = require('pdfmake')
  const vfsMod = require('pdfmake/build/vfs_fonts')
  const vfs = (vfsMod.pdfMake && vfsMod.pdfMake.vfs) || vfsMod.vfs || vfsMod
  const fuente = (n) => Buffer.from(vfs[n], 'base64')
  const printer = new PdfPrinter({ Roboto: { normal: fuente('Roboto-Regular.ttf'), bold: fuente('Roboto-Medium.ttf'), italics: fuente('Roboto-Italic.ttf'), bolditalics: fuente('Roboto-MediumItalic.ttf') } })
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument({ content: [contenido], defaultStyle: { fontSize: 18 } })
    const partes = []
    doc.on('data', p => partes.push(p))
    doc.on('end', () => resolve(Buffer.concat(partes)))
    doc.on('error', reject)
    doc.end()
  })
}

const limpio = (lineas, extra = {}) => ({
  ...g.calcularGananciaLimpio(lineas, 135),
  costoBase: 103, costoFuente: 'catalogo', proveedorCosto: 'Selecta', kilosCrudo: 400,
  rendimientoUsado: 1.14, rendimientoTexto: '', costoExtraAplicado: 18, ...extra
})

test('fecha como en el cuaderno: "Jueves" y "26/nov/26"', () => {
  assert.deepEqual(h.fechaCuaderno('2026-11-26'), { dia: 'Jueves', fecha: '26/nov/26' })
  assert.deepEqual(h.fechaCuaderno({ seconds: new Date(2026, 0, 5, 12).getTime() / 1000 }), { dia: 'Lunes', fecha: '5/ene/26' })
  assert.deepEqual(h.fechaCuaderno(null), { dia: '', fecha: '' })
})

test('formatos: dinero, precio con centavos solo si los tiene, kilos sin decimales, neto ".65"', () => {
  assert.equal(h.dinero(10500), '$10,500')
  assert.equal(h.dinero(-1200.4), '-$1,200')
  assert.equal(h.precioTexto(165), '$165')
  assert.equal(h.precioTexto(199.5), '$199.50')
  assert.equal(h.kilosTexto(1124.9), '1,124')
  assert.equal(h.factorTexto(0.65), '.65')
  assert.equal(h.factorTexto(1.2), '1.2')
})

test('renglones de limpio: precio principal por kilos, distintos en óvalo, refri aparte', () => {
  const r = h.filasLimpio(limpio([
    { cliente: 'Catarro', kilos: 30, precio: 180 },
    { cliente: 'Joselito', kilos: 194.35, precio: 199, bolsas: 299, factorBolsa: 0.65 },
    { cliente: 'Otilio', kilos: 304, precio: 180 },
    { cliente: 'refri', kilos: 5, precio: 180 }
  ]))
  assert.equal(r.principal, 180)
  assert.equal(r.total, 30 + 194 + 304)
  const joselito = r.vendidos.find(f => f.cliente === 'Joselito')
  assert.equal(joselito.precioDistinto, true)
  assert.equal(joselito.bolsas, 299)
  assert.equal(r.vendidos.find(f => f.cliente === 'Otilio').precioDistinto, false)
  assert.deepEqual(r.refri, [{ cliente: 'refri', kilos: 5 }])
})

test('renglones de crudo: se agrupan por cliente y precio con kilos enteros', () => {
  const r = h.filasCrudo({ detallesPorCliente: [
    { cliente: 'Catarro', kilos: 100.6, precioVenta: 120 },
    { cliente: 'Catarro', kilos: 50.6, precioVenta: 120 },
    { cliente: 'Ozuna', kilos: 140.2, precioVenta: 118 }
  ] })
  assert.deepEqual(r.vendidos.map(f => [f.cliente, f.kilos, f.precioDistinto]), [['Catarro', 151, false], ['Ozuna', 140, true]])
  assert.equal(r.total, 291)
})

test('hoja: medidas ocultas fuera, resumen con limpios + maquila + crudos', () => {
  const datos = {
    gananciasLimpios: {
      '71/90': limpio([{ cliente: 'Catarro', kilos: 350, precio: 165 }]),
      '41/50': limpio([{ cliente: 'Otilio', kilos: 10, precio: 200 }])
    },
    gananciasMaquila: { '71/90 Maquila Ozuna': { totalEmbarcado: 125, precioMaquila: 23, gananciaTotal: 2875 } },
    gananciasCrudos: { 'Med c/c': { totalKilos: 290, totalKilosCosto: 300, costoBase: 98.5, gananciaUnitaria: 17, gananciaTotal: 5066, detallesPorCliente: [] } },
    embarqueData: { fecha: '2026-11-26', medidaOculta: { '41/50': true } }
  }
  assert.deepEqual(h.totalesHojaGanancias(datos), { limpios: 10500, maquila: 2875, crudos: 5066, total: 18441 })
  const hoja = h.generarHojaGanancias(datos)
  const tabla = hoja.stack.find(n => n.table).table
  assert.deepEqual(tabla.widths, ['*', '*'])
  const celdas = tabla.body.flat()
  // 71/90 + maquila + crudo + resumen (41/50 oculta)
  assert.equal(celdas.length, 4)
  assert.equal(celdas[3].border.every(b => b === false), true, 'el resumen no lleva recuadro')
  assert.match(JSON.stringify(celdas[3]), /\$18,441/)
})

test('hoja sin medidas analizadas: aviso en lugar de tabla', () => {
  const hoja = h.generarHojaGanancias({})
  assert.match(hoja.text, /No hay medidas/)
})

test('el PDF se genera de verdad con pdfmake (7 recuadros en máximo 2 hojas)', async () => {
  const gananciasLimpios = {}
  ;['71/90', '51/60', '36/40', '61/70', '41/50'].forEach((m, i) => {
    gananciasLimpios[m] = limpio([
      { cliente: 'Joselito', kilos: 97.5, precio: 165, bolsas: 150, factorBolsa: 0.65 },
      { cliente: 'Catarro', kilos: 95, precio: 165 + i },
      { cliente: 'refri', kilos: 6, precio: 165 }
    ])
  })
  const buffer = await renderizar(h.generarHojaGanancias({
    gananciasLimpios,
    gananciasMaquila: { 'x Maquila Ozuna': { totalEmbarcado: 125, precioMaquila: 23, gananciaTotal: 2875 } },
    gananciasCrudos: { 'Med c/c': { totalKilos: 290, totalKilosCosto: 300, costoBase: 98.5, costoSinSobrecosto: 95, sobrecostoKg: 3.5, gananciaTotal: 5066,
      detallesPorCliente: [{ cliente: 'Catarro', kilos: 150, precioVenta: 120 }, { cliente: 'Ozuna', kilos: 140, precioVenta: 118 }] } },
    embarqueData: { fecha: '2026-11-26' }
  }))
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-')
  const paginas = (buffer.toString('latin1').match(/\/Type \/Page\b/g) || []).length
  assert.ok(paginas >= 1 && paginas <= 2, `páginas: ${paginas}`)
})

test('página 1: usa el rendimiento de la pantalla (refri del día anterior, total sin decimales)', () => {
  const compilar = (file, requerir) => {
    const code = transformSync(fs.readFileSync(path.join(root, file), 'utf8'), {
      configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
    }).code
    const module = { exports: {} }
    new Function('require', 'module', 'exports', code)(requerir, module, module.exports)
    return module.exports
  }
  const formatters = compilar('src/utils/pdf/formatters.js', () => ({}))
  const { generarTablaRendimientos } = compilar('src/utils/pdf/generators/rendimientos.js', id => (id === '../formatters' ? formatters : { layoutTabla: {} }))
  const tabla = generarTablaRendimientos([
    { medida: '51/60 tirado', kilosCrudos: 200, totalEmbarcado: 158.7, rendimiento: 200 / 158, costoFinal: 172, incluyeCostoFinal: true },
    { medida: '71/90 refri', kilosCrudos: 0, totalEmbarcado: 310, rendimiento: 1.17, costoFinal: 139, incluyeCostoFinal: true },
    { medida: 'Saladero', kilosCrudos: 17, totalEmbarcado: 8.4, costoFinal: 167, incluyeCostoFinal: true }
  ], {}, { mostrarColumnaCosto: true })
  const texto = JSON.stringify(tabla)
  assert.match(texto, /\(1\.27\)/, '200 / 158 = 1.27, no 200 / 158.7 = 1.26')
  assert.match(texto, /\(1\.17\)/, 'refri: rendimiento del día anterior, no 0.00')
  assert.match(texto, /\(2\.13\)/, 'sin rendimiento: kilos / total embarcado entero (17 / 8)')
  assert.doesNotMatch(texto, /\(0\.00\)/)
})

test('medidas sin costo: aviso en el recuadro y en el resumen', () => {
  const hoja = h.generarHojaGanancias({
    gananciasLimpios: { macuil: limpio([{ cliente: 'Veronica', kilos: 328, precio: 125 }], { costoFuente: null, proveedorCosto: '' }) },
    gananciasCrudos: { 'med ch': { totalKilos: 160, totalKilosCosto: 152, costoBase: 3.5, gananciaTotal: 14368, costoFuente: null, detallesPorCliente: [] } },
    embarqueData: { fecha: '2026-11-25' }
  })
  const texto = JSON.stringify(hoja)
  assert.match(texto, /Sin costo: esta ganancia sale inflada/)
  assert.match(texto, /crudo · sin costo/)
  assert.match(texto, /macuil \(-?\$/)
  assert.match(texto, /med ch \(\$14,368\)/)
})

test('precio en cada renglón; "prom" en el total solo si hay varios precios', () => {
  const unPrecio = JSON.stringify(h.generarHojaGanancias({
    gananciasLimpios: { '71/90': limpio([{ cliente: 'Catarro', kilos: 95, precio: 165 }, { cliente: 'Otilio', kilos: 255, precio: 165 }]) }
  }))
  assert.doesNotMatch(unPrecio, /"prom"/)
  const varios = JSON.stringify(h.generarHojaGanancias({
    gananciasLimpios: { '51/60': limpio([{ cliente: 'Catarro', kilos: 731, precio: 180 }, { cliente: 'Joselito', kilos: 194, precio: 199 }]) }
  }))
  assert.match(varios, /"prom"/)
  // (731×180 + 194×199) / 925 = 183.98 -> $184
  assert.match(varios, /\$184/)
  assert.match(varios, /"\$180"/)
})

test('costo: división del crudo entre los kilos embarcados', () => {
  const texto = JSON.stringify(h.generarHojaGanancias({
    gananciasLimpios: { '71/90': limpio([{ cliente: 'Otilio', kilos: 350, precio: 165 }], { kilosCrudo: 420, kilosEmbarcadosRendimiento: 357, rendimientoUsado: 1.18, costoFinal: 140 }) }
  }))
  assert.match(texto, /420 kg × \$103/)
  assert.match(texto, /= \$43,260/)
  assert.match(texto, /÷ 357 kg /)
  assert.match(texto, /= \$121\.18 \/kg/) // 43,260 / 357
  assert.match(texto, /\$103 × 1\.18 \+ \$18 extra/)
})
