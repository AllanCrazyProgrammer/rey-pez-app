// Medidas en puntos; compartidas por pdfmake y la hoja de vista previa.
const HOJA = { ancho: 841.89, alto: 595.28, margen: 40 }
const ESCALA_MIN = 0.4
const ESCALA_MAX = 1
const FUENTE_BASE = columnas => columnas > 4 ? 28 : 34
const PADDING_BASE = 10
const CLAVE_STORAGE = 'pedidoCrudos.escalaImpresion'
const ANCHO_UTIL = HOJA.ancho - 2 * HOJA.margen
function parametrosTabla(escala, numColumnasMedida) {
  return { fontSize: FUENTE_BASE(numColumnasMedida) * escala, padding: PADDING_BASE * escala, casilla: 10 * escala, gap: 3 * escala }
}
function normalizarEscala(valor, maximo = ESCALA_MAX) {
  if ((typeof valor !== 'number' && typeof valor !== 'string') || String(valor).trim() === '' || !Number.isFinite(Number(valor))) return null
  return Math.max(ESCALA_MIN, Math.min(Number(valor), Math.max(ESCALA_MIN, Math.min(ESCALA_MAX, maximo))))
}
function leerEscalaGuardada(storage) {
  try { return storage ? normalizarEscala(storage.getItem(CLAVE_STORAGE)) : null } catch (_) { return null }
}
function guardarEscala(storage, valor) {
  try { const escala = normalizarEscala(valor); if (storage && escala !== null) storage.setItem(CLAVE_STORAGE, String(escala)) } catch (_) { /* Almacenamiento opcional. */ }
}
function palabraMayor(texto) {
  return Math.max(0, ...String(texto == null ? '' : texto).replace(/-/g, '- ').split(/\s+/).map(palabra => palabra.length))
}
function anchosMinimos(encabezados, filas, escala, taras = [], kilos = []) {
  const p = parametrosTabla(escala, encabezados.length - 1)
  return encabezados.map((encabezado, i) => {
    let ancho = palabraMayor(encabezado) * p.fontSize * 0.68
    const textos = i === 0 ? ['Cliente', 'Taras', 'Total', 'Kilos', ...filas.map(f => f.cliente)] : [taras[i - 1], kilos[i - 1]]
    textos.forEach(texto => { ancho = Math.max(ancho, palabraMayor(texto) * p.fontSize * 0.68) })
    if (i > 0) filas.forEach(f => {
      const celda = (f.celdas || [])[i - 1]
      if (celda && celda.texto) ancho = Math.max(ancho, palabraMayor(celda.texto) * p.fontSize * 0.68 + p.gap + p.casilla)
    })
    return ancho + 2 * p.padding
  })
}
function estimarAnchoMinimoTabla(encabezados, filas, escala, taras, kilos) {
  return anchosMinimos(encabezados, filas, escala, taras, kilos).reduce((a, b) => a + b, 0) + encabezados.length + 1
}
function escalaMaximaQueCabe(encabezados, filas, taras, kilos) {
  const bordes = encabezados.length + 1
  return Math.max(ESCALA_MIN, Math.min(1, (ANCHO_UTIL - bordes) / (estimarAnchoMinimoTabla(encabezados, filas, 1, taras, kilos) - bordes)))
}
function escalaAutoAjuste(encabezados, filas, barcos = [], taras, kilos) {
  const p = parametrosTabla(1, encabezados.length - 1)
  // Reserva dos líneas para encabezados y una por fila; el ancho reserva palabras completas.
  const altoTabla = (filas.length + (encabezados.length > 5 ? 5 : 4)) * p.fontSize * 1.2 + (filas.length + 3) * 2 * p.padding
  const altoDisponible = HOJA.alto - 80 - 34 * 1.2 - 20 - 8 - Math.ceil(barcos.length / 2) * 19
  return Math.max(ESCALA_MIN, Math.floor(Math.min(escalaMaximaQueCabe(encabezados, filas, taras, kilos), altoDisponible / altoTabla, 1) * 100) / 100)
}
function anchosTabla(encabezados, filas, escala, taras, kilos) {
  const minimos = anchosMinimos(encabezados, filas, escala, taras, kilos)
  const suma = minimos.reduce((a, b) => a + b, 0)
  const disponible = ANCHO_UTIL - encabezados.length - 1
  // pdfmake agrega padding y bordes fuera de widths.
  const padding = parametrosTabla(escala, encabezados.length - 1).padding
  return minimos.map(ancho => ancho + Math.max(0, disponible - suma) / minimos.length - 2 * padding)
}
function construirDocumentoPedidoCrudos({ titulo, encabezados, filas, taras = [], kilos = [], barcos = [], escala = 1 }) {
  const p = parametrosTabla(escala, encabezados.length - 1)
  const body = [encabezados.map(text => ({ text, alignment: 'center', fillColor: '#f2f2f2' }))]
  filas.forEach(fila => {
    body.push([{ text: fila.cliente, fillColor: fila.fillColor, color: fila.color }, ...fila.celdas.map(celda => {
      if (!celda.texto) return { text: '' }
      const lado = p.casilla
      const canvas = [{ type: 'rect', x: 0, y: 0, w: lado, h: lado, lineWidth: escala }]
      if (celda.marcada) canvas.push(
        { type: 'line', x1: lado * .2, y1: lado * .5, x2: lado * .4, y2: lado * .8, lineWidth: escala },
        { type: 'line', x1: lado * .4, y1: lado * .8, x2: lado * .8, y2: lado * .2, lineWidth: escala })
      return { columns: [{ text: String(celda.texto), width: '*', alignment: 'center' }, { canvas, width: lado, margin: [0, p.fontSize / 2 - lado / 2, 0, 0] }], columnGap: p.gap }
    })])
  })
  ;[['Total', taras], ['Kilos', kilos]].forEach(([etiqueta, valores]) => body.push([
    { text: etiqueta, fillColor: '#f8f9fa' }, ...valores.map(valor => ({ text: String(valor), alignment: 'center', italics: etiqueta === 'Total', fillColor: '#f8f9fa' }))
  ]))
  return {
    pageSize: 'A4', pageOrientation: 'landscape', pageMargins: [40, 40, 40, 40],
    defaultStyle: { font: 'Roboto', bold: true, fontSize: p.fontSize },
    styles: { header: { fontSize: 34, bold: true, margin: [0, 0, 0, 20], alignment: 'center' } },
    content: [{ text: titulo, style: 'header' }, {
      table: { headerRows: 1, widths: anchosTabla(encabezados, filas, escala, taras, kilos), body },
      layout: {
        hLineWidth: i => i >= body.length - 1 ? 2 : 1, vLineWidth: () => 1,
        hLineColor: () => '#000000', vLineColor: () => '#000000',
        paddingLeft: () => p.padding, paddingRight: () => p.padding,
        paddingTop: () => p.padding, paddingBottom: () => p.padding
      }
    },
          ...(barcos.length ? [{
            margin: [0, 8, 0, 0],
            fontSize: 11,
            bold: false,
            table: {
              widths: ['*', '*'],
              dontBreakRows: true,
              body: Array.from({ length: Math.ceil(barcos.length / 2) }, (_, fila) =>
                [0, 1].map(offset => {
                  const columna = barcos[fila * 2 + offset]
                  if (columna === undefined) return { text: '' }
                  return {
                    columnGap: 6,
                    columns: [
                      { text: columna.etiqueta, fontSize: 9, width: 'auto', noWrap: true },
                      {
                        width: '*',
                        table: {
                          widths: ['*'],
                          body: [[{
                            text: String(columna.texto || '').trim() || ' ',
                            border: [false, false, false, true],
                            margin: [0, 1, 0, 0]
                          }]]
                        },
                        layout: {
                          hLineWidth: () => 0.5,
                          paddingLeft: () => 0,
                          paddingRight: () => 0,
                          paddingTop: () => 0,
                          paddingBottom: () => 1
                        }
                      }
                    ],
                    margin: [0, 0, 8, 4]
                  }
                })
              )
            },
            layout: 'noBorders'
          }] : [])
    ]
  }
}
module.exports = { HOJA, ESCALA_MIN, ESCALA_MAX, FUENTE_BASE, PADDING_BASE, CLAVE_STORAGE, parametrosTabla, estimarAnchoMinimoTabla, escalaMaximaQueCabe, escalaAutoAjuste, normalizarEscala, leerEscalaGuardada, guardarEscala, anchosTabla, construirDocumentoPedidoCrudos }
