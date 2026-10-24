const assert = require('node:assert/strict')
const PdfPrinter = require('pdfmake')
const vfs = require('pdfmake/build/vfs_fonts')
const m = require('../src/utils/pedidosCrudoEscalaImpresion')
const fonts = Object.fromEntries(Object.entries({ normal: 'Regular', bold: 'Medium', italics: 'Italic', bolditalics: 'MediumItalic' }).map(([key, name]) => [key, Buffer.from(vfs[`Roboto-${name}.ttf`], 'base64')]))
const printer = new PdfPrinter({ Roboto: fonts })
const encabezados = ['Cliente', 'Med c/c', 'Med-gde c/c', 'Gde c/c', 'Extra c/c', 'Jumbo c/c', 'Med-Esp c/c', 'Cam s/c', 'Lag gde c/c']
const filas = ['8a', 'Otilio', 'Veronica'].map(cliente => ({ cliente, fillColor: '#f1c40f', color: '#000000', celdas: [5, 3, 10, 4, 1, 12, 7, 2].map(texto => ({ texto: String(texto), marcada: true })) }))
const datos = { titulo: 'Pedido de Crudos - Sábado 2026-10-24', encabezados, filas, taras: [15, 9, 30, 12, 3, 36, 21, 6], kilos: [285, 171, 570, 228, 57, 684, 399, 114], barcos: encabezados.slice(1).map(etiqueta => ({ etiqueta, texto: 'Barco de prueba' })) }
function render(doc) {
  const pdf = printer.createPdfKitDocument(doc)
  const paginas = pdf._pdfMakePages
  const textos = []
  let maxX = 0
  paginas.forEach(pagina => pagina.items.forEach(item => {
    const dibujo = item.item
    if (item.type === 'line') dibujo.inlines.forEach(inline => {
      const x = dibujo.x + inline.x
      maxX = Math.max(maxX, x + inline.width)
      textos.push({ texto: inline.text, x, fin: x + inline.width })
    })
    if (item.type === 'vector') maxX = Math.max(maxX, dibujo.type === 'rect' ? dibujo.x + dibujo.w : Math.max(dibujo.x1 || 0, dibujo.x2 || 0))
  }))
  pdf.on('data', () => {})
  pdf.end()
  return { paginas, textos, maxX }
}
const escala = m.escalaAutoAjuste(encabezados, filas, datos.barcos, datos.taras, datos.kilos)
const doc = m.construirDocumentoPedidoCrudos({ ...datos, escala })
const resultado = render(doc)
assert(resultado.maxX <= 802.39, `Dibujo fuera del margen: ${resultado.maxX}`)
assert.equal(resultado.paginas.length, 1)
// Reconstruir cada encabezado por columna, incluyendo los cortes de pdfmake.
const primerClienteY = resultado.paginas[0].items.find(i => i.type === 'line' && i.item.inlines.some(t => t.text === '8a')).item.y
let inicio = 40
const anchos = m.anchosTabla(encabezados, filas, escala, datos.taras, datos.kilos)
encabezados.forEach((encabezado, columna) => {
  const fin = inicio + anchos[columna] + 2 * m.parametrosTabla(escala, 8).padding + 1
  const fragmentos = resultado.paginas[0].items.filter(i => i.type === 'line' && i.item.y >= 95 && i.item.y < primerClienteY && i.item.x >= inicio && i.item.x < fin)
  const texto = fragmentos.map(i => i.item.inlines.map(t => t.text).join('')).join('').replace(/\s/g, '')
  assert.equal(texto, encabezado.replace(/\s/g, ''), `Encabezado ${columna} dentro de su columna`)
  inicio = fin
})
assert(resultado.textos.every(t => t.x >= 39.5 && t.fin <= 802.39))
// El tope del slider tampoco puede cortar columnas, ni con nombres de cliente largos.
;[filas, filas.map((f, i) => i ? f : { ...f, cliente: 'Comercializadora Galileo' })].forEach(conjunto => {
  const maxima = Math.floor(m.escalaMaximaQueCabe(encabezados, conjunto, datos.taras, datos.kilos) * 100) / 100
  const enTope = render(m.construirDocumentoPedidoCrudos({ ...datos, filas: conjunto, escala: maxima }))
  assert(enTope.maxX <= 802.39, `Tope del slider ${maxima} fuera del margen: ${enTope.maxX}`)
  assert(enTope.textos.every(t => t.fin <= 802.39), `Texto cortado en tope ${maxima}`)
})
const viejo = m.construirDocumentoPedidoCrudos({ ...datos, escala: 1 })
viejo.content[1].table.widths = encabezados.map(() => '*')
const desbordado = render(viejo)
assert(desbordado.maxX > 841.89, `La prueba debe reproducir el recorte: ${desbordado.maxX}`)
assert.equal(m.normalizarEscala(NaN), null)
assert.equal(m.normalizarEscala(''), null)
assert.equal(m.normalizarEscala(null), null)
assert.equal(m.normalizarEscala(-5), .4)
assert.equal(m.normalizarEscala(5, .7), .7)
const storage = { datos: {}, getItem(k) { return this.datos[k] ?? null }, setItem(k, v) { this.datos[k] = v } }
assert.equal(m.leerEscalaGuardada(storage), null)
m.guardarEscala(storage, .65)
assert.equal(storage.datos[m.CLAVE_STORAGE], '0.65')
assert.equal(m.leerEscalaGuardada(storage), .65)
const roto = { getItem() { throw Error('denegado') }, setItem() { throw Error('denegado') } }
assert.equal(m.leerEscalaGuardada(roto), null)
m.guardarEscala(roto, .7)
m.guardarEscala(null, .7)
assert.equal(m.leerEscalaGuardada(null), null)
assert.equal(doc.styles.header.fontSize, 34)
assert.equal(viejo.styles.header.fontSize, 34)
assert(doc.defaultStyle.fontSize < viejo.defaultStyle.fontSize)
assert.equal(m.escalaAutoAjuste(encabezados.slice(0, 3), filas.map(f => ({ ...f, celdas: f.celdas.slice(0, 2) })), datos.barcos.slice(0, 2)), 1)
console.log(`PASS escala de impresión: pdfmake real, 8 medidas, una página, escala ${escala}, x máximo ${resultado.maxX.toFixed(2)}; bug previo x=${desbordado.maxX.toFixed(2)}; storage y normalización`)
