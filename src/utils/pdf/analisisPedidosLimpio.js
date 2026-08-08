import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const AZUL = [22, 55, 91]
const CELESTE = [25, 143, 218]
const NARANJA = [230, 81, 0]
const VERDE = [35, 160, 105]
const GRIS = [91, 108, 130]
const FONDO = [246, 249, 252]

const numero = valor => new Intl.NumberFormat('es-MX', {
  maximumFractionDigits: 1
}).format(Number(valor) || 0)

const fecha = valor => {
  if (!valor) return '-'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${valor}T00:00:00Z`))
}

const dibujarTarjeta = (doc, { x, y, ancho, titulo, valor, color }) => {
  doc.setFillColor(...FONDO)
  doc.roundedRect(x, y, ancho, 54, 6, 6, 'F')
  doc.setFillColor(...color)
  doc.roundedRect(x, y, 5, 54, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...AZUL)
  doc.setFontSize(18)
  doc.text(String(valor), x + 13, y + 23)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS)
  doc.setFontSize(9.5)
  doc.text(titulo.toUpperCase(), x + 13, y + 42)
}

export function generarAnalisisPedidosLimpioPDF(analisis) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const altoPagina = doc.internal.pageSize.getHeight()
  const margen = 40
  const anchoUtil = anchoPagina - (margen * 2)
  const resumen = analisis?.resumen || {}

  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, anchoPagina, altoPagina, 'F')
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(1.5)
  doc.roundedRect(margen, 16, anchoUtil, 82, 7, 7, 'S')
  doc.setDrawColor(...NARANJA)
  doc.setLineWidth(4)
  doc.line(margen, 16, margen + 72, 16)
  doc.setTextColor(...AZUL)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(25)
  doc.text('Análisis de Pedido Limpio', margen + 12, 44)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text(
    `${fecha(analisis?.rango?.fechaInicio)} - ${fecha(analisis?.rango?.fechaFin)}`,
    margen + 12,
    70
  )
  doc.setTextColor(...GRIS)
  doc.setFontSize(10)
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, margen + 12, 89)

  const separacion = 8
  const anchoTarjeta = (anchoUtil - separacion * 3) / 4
  const tarjetas = [
    { titulo: 'Kilos pedidos', valor: `${numero(resumen.kilosTotal)} kg`, color: CELESTE },
    { titulo: 'Taras estimadas', valor: `${numero(resumen.tarasTotal)} T`, color: NARANJA },
    { titulo: 'Pedidos incluidos', valor: numero(resumen.pedidos), color: VERDE },
    { titulo: 'Promedio diario', valor: `${numero(resumen.promedioDiario)} kg`, color: [126, 87, 194] }
  ]
  tarjetas.forEach((tarjeta, index) => dibujarTarjeta(doc, {
    ...tarjeta,
    x: margen + index * (anchoTarjeta + separacion),
    y: 120,
    ancho: anchoTarjeta
  }))

  let y = 198
  doc.setTextColor(...AZUL)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('Distribución principal por medida', margen, y)
  y += 18

  const topMedidas = (analisis?.porMedida || []).slice(0, 6)
  const maxKilos = Math.max(...topMedidas.map(item => item.kilos), 1)
  topMedidas.forEach(item => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    doc.setTextColor(...AZUL)
    doc.text(item.nombre, margen, y + 10, { maxWidth: 105 })
    const barraX = margen + 118
    const barraAncho = anchoUtil - 202
    doc.setFillColor(229, 236, 244)
    doc.roundedRect(barraX, y, barraAncho, 12, 4, 4, 'F')
    doc.setFillColor(...CELESTE)
    doc.roundedRect(barraX, y, Math.max(3, barraAncho * (item.kilos / maxKilos)), 12, 4, 4, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.text(`${numero(item.kilos)} kg`, anchoPagina - margen, y + 10, { align: 'right' })
    y += 25
  })

  y += 9
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...AZUL)
  doc.text('Detalle por medida', margen, y)

  autoTable(doc, {
    startY: y + 13,
    margin: { left: margen, right: margen },
    head: [['Medida', 'Kilos', 'Taras', 'Días', 'Participación']],
    body: (analisis?.porMedida || []).map(item => [
      item.nombre,
      numero(item.kilos),
      numero(item.taras),
      numero(item.dias),
      `${numero(item.porcentaje)}%`
    ]),
    theme: 'grid',
    styles: { fontSize: 12.5, cellPadding: 6.5, overflow: 'linebreak', lineColor: [174, 188, 203], lineWidth: 0.5 },
    headStyles: { fillColor: [255, 255, 255], textColor: AZUL, fontStyle: 'bold', fontSize: 12, lineColor: AZUL, lineWidth: 1 },
    columnStyles: {
      0: { cellWidth: 170 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' }
    }
  })

  // Página 2: clientes y comportamiento diario. Se fuerza el salto para que
  // el reporte mantenga una composición estable y legible de dos páginas.
  doc.addPage()
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, anchoPagina, altoPagina, 'F')
  doc.setDrawColor(...AZUL)
  doc.setLineWidth(1.5)
  doc.roundedRect(margen, 12, anchoUtil, 52, 7, 7, 'S')
  doc.setDrawColor(...NARANJA)
  doc.setLineWidth(4)
  doc.line(margen, 12, margen + 72, 12)
  doc.setTextColor(...AZUL)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(19)
  doc.text('Detalle de venta por cliente y fecha', margen + 12, 32)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.setTextColor(...GRIS)
  doc.text(`${fecha(analisis?.rango?.fechaInicio)} - ${fecha(analisis?.rango?.fechaFin)}`, margen + 12, 51)

  y = 88
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...AZUL)
  doc.text('Detalle por cliente (pedido completo del rango)', margen, y)

  autoTable(doc, {
    startY: y + 13,
    margin: { left: margen, right: margen },
    head: [['Cliente', 'Kilos', 'Taras', 'Días']],
    body: (analisis?.porCliente || []).map(item => [
      item.nombre,
      numero(item.kilos),
      numero(item.taras),
      numero(Array.isArray(item.dias) ? item.dias.length : item.dias)
    ]),
    theme: 'grid',
    styles: { fontSize: 12, cellPadding: 6, lineColor: [174, 188, 203], lineWidth: 0.5 },
    headStyles: { fillColor: [255, 255, 255], textColor: NARANJA, fontStyle: 'bold', fontSize: 11.5, lineColor: NARANJA, lineWidth: 1 },
    columnStyles: {
      0: { cellWidth: 220 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  })

  y = doc.lastAutoTable.finalY + 30
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...AZUL)
  doc.text('Comportamiento por fecha (venta, sin maquilas de Ozuna ni Joselito)', margen, y)

  const fechas = analisis?.porFecha || []
  const corteFechas = Math.ceil(fechas.length / 2)
  const bloquesFechas = [fechas.slice(0, corteFechas), fechas.slice(corteFechas)]
  const separacionFechas = 12
  const anchoBloqueFechas = (anchoUtil - separacionFechas) / 2
  const cuerpoFecha = bloque => bloque.map(item => [
    fecha(item.fecha),
    numero(item.kilos),
    numero(item.taras)
  ])

  bloquesFechas.forEach((bloque, index) => {
    if (!bloque.length) return
    const x = margen + index * (anchoBloqueFechas + separacionFechas)
    autoTable(doc, {
      startY: y + 13,
      margin: { left: x, right: anchoPagina - x - anchoBloqueFechas },
      tableWidth: anchoBloqueFechas,
      head: [['Fecha', 'Kilos', 'Taras']],
      body: cuerpoFecha(bloque),
      theme: 'grid',
      headStyles: { fillColor: [255, 255, 255], textColor: VERDE, fontStyle: 'bold', fontSize: 10.5, lineColor: VERDE, lineWidth: 1 },
      styles: { fontSize: 11, cellPadding: 5, overflow: 'linebreak', lineColor: [174, 188, 203], lineWidth: 0.5 },
      columnStyles: {
        0: { cellWidth: 104 },
        1: { halign: 'right' },
        2: { halign: 'right' }
      }
    })
  })

  const totalPaginas = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
    doc.setPage(pagina)
    const alto = doc.internal.pageSize.getHeight()
    doc.setDrawColor(220, 228, 238)
    doc.line(margen, alto - 27, anchoPagina - margen, alto - 27)
    doc.setTextColor(...GRIS)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Rey Pez · Análisis informativo de pedidos limpios', margen, alto - 14)
    doc.text(`Página ${pagina} de ${totalPaginas}`, anchoPagina - margen, alto - 14, { align: 'right' })
  }

  const nombreArchivo = `analisis-pedido-limpio-${analisis?.rango?.fechaInicio || 'inicio'}-${analisis?.rango?.fechaFin || 'fin'}.pdf`
  doc.save(nombreArchivo)
}
