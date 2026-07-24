// Generación de PDF del Reporte de Consumo por Medida (jsPDF + autotable).
// Dos versiones: detallada (todas las secciones con tablas completas) y
// resumen ejecutivo (1-2 páginas con lo esencial). Las gráficas se dibujan
// vectorialmente con primitivas de jsPDF para que impriman nítidas.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatNumber } from '@/utils/formatters';

const PAGINA = { ancho: 612, alto: 792, margen: 40 };
const ALTO_ENCABEZADO = 74;
const ALTO_ENCABEZADO_CONT = 30;

const COLOR = {
  azulOscuro: [26, 82, 118],
  azul: [41, 128, 185],
  azulSuave: [234, 242, 248],
  azulBorde: [200, 219, 233],
  filaProveedor: [242, 247, 251],
  verde: [39, 174, 96],
  naranja: [230, 126, 34],
  naranjaOscuro: [156, 100, 12],
  naranjaSuave: [254, 245, 231],
  grisTexto: [93, 109, 126],
  grisLinea: [230, 238, 245],
  texto: [44, 62, 80],
  blanco: [255, 255, 255]
};

// Paleta para series de gráficas (dona / barras).
const SERIE = [
  [41, 128, 185],
  [39, 174, 96],
  [230, 126, 34],
  [142, 68, 173],
  [192, 57, 43],
  [22, 160, 133],
  [243, 156, 18],
  [52, 73, 94],
  [211, 84, 0],
  [127, 140, 141]
];

const kg = n => `${formatNumber(n, 0)} kg`;
const pct = (parte, total) => (total > 0 ? `${formatNumber((parte / total) * 100, 1)}%` : '0.0%');

function fechaCorta(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function ahoraLegible() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

function nuevoDocumento() {
  return new jsPDF({ unit: 'pt', format: 'letter' });
}

// ---------------------------------------------------------------- encabezados

function dibujarEncabezado(doc, subtitulo, rango) {
  doc.setFillColor(...COLOR.azulOscuro);
  doc.rect(0, 0, PAGINA.ancho, ALTO_ENCABEZADO, 'F');
  doc.setFillColor(...COLOR.azul);
  doc.rect(0, ALTO_ENCABEZADO, PAGINA.ancho, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('R E Y   P E Z', PAGINA.margen, 24);
  doc.setFontSize(18);
  doc.text('Reporte de Consumo por Medida', PAGINA.margen, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(190, 215, 235);
  doc.text(subtitulo, PAGINA.margen, 62);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Del ${fechaCorta(rango.desde)} al ${fechaCorta(rango.hasta)}`, PAGINA.ancho - PAGINA.margen, 40, { align: 'right' });
  doc.setTextColor(190, 215, 235);
  doc.setFontSize(8);
  doc.text(`Generado el ${ahoraLegible()}`, PAGINA.ancho - PAGINA.margen, 54, { align: 'right' });

  return ALTO_ENCABEZADO + 24;
}

function dibujarEncabezadoContinuacion(doc, subtitulo) {
  doc.setFillColor(...COLOR.azulOscuro);
  doc.rect(0, 0, PAGINA.ancho, ALTO_ENCABEZADO_CONT - 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Rey Pez · Reporte de Consumo por Medida — ${subtitulo}`, PAGINA.margen, 14);
  doc.setFont('helvetica', 'normal');
}

function encabezadoContinuacionSiHaceFalta(doc, subtitulo) {
  if (doc.internal.getCurrentPageInfo().pageNumber > 1) {
    dibujarEncabezadoContinuacion(doc, subtitulo);
  }
}

function asegurarEspacio(ctx, y, altoNecesario) {
  if (y + altoNecesario <= PAGINA.alto - 46) return y;
  ctx.doc.addPage();
  dibujarEncabezadoContinuacion(ctx.doc, ctx.subtitulo);
  return ALTO_ENCABEZADO_CONT + 14;
}

function dibujarPiesDePagina(doc) {
  const paginas = doc.internal.getNumberOfPages();
  for (let i = 1; i <= paginas; i += 1) {
    doc.setPage(i);
    doc.setDrawColor(...COLOR.azulBorde);
    doc.setLineWidth(0.75);
    doc.line(PAGINA.margen, PAGINA.alto - 32, PAGINA.ancho - PAGINA.margen, PAGINA.alto - 32);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR.grisTexto);
    doc.text('Rey Pez · Tampico, Tamps.', PAGINA.margen, PAGINA.alto - 20);
    doc.text(`Página ${i} de ${paginas}`, PAGINA.ancho - PAGINA.margen, PAGINA.alto - 20, { align: 'right' });
  }
}

// ------------------------------------------------------------------ secciones

function tituloSeccion(ctx, y, texto, nota, color = COLOR.azulOscuro, colorLinea = COLOR.azul) {
  // Se pide espacio de sobra para que el título nunca quede huérfano al
  // final de la página (siempre le sigue al menos un bloque).
  y = asegurarEspacio(ctx, y, 110);
  const { doc } = ctx;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...color);
  doc.text(texto, PAGINA.margen, y);
  const anchoTitulo = doc.getTextWidth(texto);
  if (nota) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.grisTexto);
    doc.text(nota, PAGINA.margen + anchoTitulo + 8, y);
  }
  doc.setDrawColor(...colorLinea);
  doc.setLineWidth(1.5);
  doc.line(PAGINA.margen, y + 5, PAGINA.ancho - PAGINA.margen, y + 5);
  return y + 20;
}

function dibujarTiles(doc, y, tiles) {
  const gap = 10;
  const ancho = (PAGINA.ancho - 2 * PAGINA.margen - gap * (tiles.length - 1)) / tiles.length;
  const alto = 52;
  tiles.forEach((tile, i) => {
    const x = PAGINA.margen + i * (ancho + gap);
    doc.setFillColor(...(tile.fondo || COLOR.azulSuave));
    doc.setDrawColor(...(tile.borde || COLOR.azulBorde));
    doc.setLineWidth(0.75);
    doc.roundedRect(x, y, ancho, alto, 4, 4, 'FD');
    doc.setFillColor(...(tile.acento || COLOR.azul));
    doc.roundedRect(x, y, 3.5, alto, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.7);
    doc.setTextColor(...COLOR.grisTexto);
    doc.text(String(tile.etiqueta).toUpperCase(), x + 11, y + 14);
    doc.setFontSize(14.5);
    doc.setTextColor(...COLOR.azulOscuro);
    doc.text(tile.valor, x + 11, y + 32);
    if (tile.sub) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLOR.grisTexto);
      doc.text(tile.sub, x + 11, y + 44);
    }
  });
  return y + alto + 16;
}

// ------------------------------------------------------------------- gráficas

function dibujarBarrasHorizontales(doc, x, y, ancho, items, opciones = {}) {
  const altoBarra = opciones.altoBarra || 11;
  const gap = opciones.gap || 5.5;
  const anchoEtiqueta = opciones.anchoEtiqueta || 92;
  const maximo = Math.max(...items.map(i => i.valor), 1);
  const anchoUtil = ancho - anchoEtiqueta - 84;

  items.forEach((item, idx) => {
    const yBarra = y + idx * (altoBarra + gap);
    doc.setFont('helvetica', item.destacar ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.texto);
    doc.text(String(item.etiqueta), x + anchoEtiqueta - 6, yBarra + altoBarra - 3, { align: 'right' });

    // Riel de fondo + barra.
    doc.setFillColor(238, 243, 248);
    doc.roundedRect(x + anchoEtiqueta, yBarra, anchoUtil, altoBarra, 2, 2, 'F');
    const w = Math.max((item.valor / maximo) * anchoUtil, 1.5);
    doc.setFillColor(...(item.color || COLOR.azul));
    doc.roundedRect(x + anchoEtiqueta, yBarra, w, altoBarra, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR.azulOscuro);
    const texto = item.textoValor || kg(item.valor);
    doc.text(texto, x + anchoEtiqueta + anchoUtil + 6, yBarra + altoBarra - 3);
  });
  return y + items.length * (altoBarra + gap) + 4;
}

function dibujarBarrasPorAnio(doc, x, y, ancho, alto, anios, series) {
  // series: [{nombre, color, porAnio}]
  const maximo = Math.max(
    ...anios.map(a => Math.max(...series.map(s => s.porAnio[a] || 0))),
    1
  );
  const baseY = y + alto;
  const anchoGrupo = ancho / anios.length;
  const anchoBarra = Math.min(26, (anchoGrupo - 24) / series.length);

  doc.setDrawColor(...COLOR.azulBorde);
  doc.setLineWidth(0.75);
  doc.line(x, baseY, x + ancho, baseY);

  anios.forEach((anio, i) => {
    const centro = x + i * anchoGrupo + anchoGrupo / 2;
    const inicio = centro - (anchoBarra * series.length + 3 * (series.length - 1)) / 2;
    series.forEach((serie, j) => {
      const valor = serie.porAnio[anio] || 0;
      const h = (valor / maximo) * (alto - 16);
      const bx = inicio + j * (anchoBarra + 3);
      if (valor > 0) {
        doc.setFillColor(...serie.color);
        doc.roundedRect(bx, baseY - h, anchoBarra, h, 1.5, 1.5, 'F');
        // Tapa el redondeo inferior para que la barra "nazca" plana del eje.
        doc.rect(bx, baseY - Math.min(h, 3), anchoBarra, Math.min(h, 3), 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...COLOR.texto);
      doc.text(formatNumber(valor, 0), bx + anchoBarra / 2, baseY - h - 3.5, { align: 'center' });
    });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR.grisTexto);
    doc.text(String(anio), centro, baseY + 12, { align: 'center' });
  });

  // Leyenda.
  let lx = x;
  const ly = baseY + 26;
  series.forEach(serie => {
    doc.setFillColor(...serie.color);
    doc.rect(lx, ly - 6, 7, 7, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR.texto);
    doc.text(serie.nombre, lx + 10, ly);
    lx += 10 + doc.getTextWidth(serie.nombre) + 14;
  });
  return ly + 12;
}

function dibujarDona(doc, cx, cy, rExt, rInt, segmentos, centro) {
  const total = segmentos.reduce((s, seg) => s + seg.valor, 0);
  if (total <= 0) return;
  const paso = (2 * Math.PI) / 240;
  let angulo = -Math.PI / 2;
  segmentos.forEach(seg => {
    const fin = angulo + (seg.valor / total) * 2 * Math.PI;
    doc.setFillColor(...seg.color);
    for (let a = angulo; a < fin; a += paso) {
      const b = Math.min(a + paso * 1.5, fin);
      doc.triangle(
        cx, cy,
        cx + rExt * Math.cos(a), cy + rExt * Math.sin(a),
        cx + rExt * Math.cos(b), cy + rExt * Math.sin(b),
        'F'
      );
    }
    angulo = fin;
  });
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, rInt, 'F');
  if (centro) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR.azulOscuro);
    doc.text(centro.valor, cx, cy - 1, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR.grisTexto);
    doc.text(centro.etiqueta, cx, cy + 8, { align: 'center' });
  }
}

function dibujarLeyenda(doc, x, y, items, anchoMax) {
  items.forEach((item, i) => {
    const ly = y + i * 15;
    doc.setFillColor(...item.color);
    doc.roundedRect(x, ly - 6.5, 7.5, 7.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...COLOR.texto);
    const etiqueta = doc.splitTextToSize(item.etiqueta, anchoMax - 70)[0];
    doc.text(etiqueta, x + 12, ly);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.3);
    doc.setTextColor(...COLOR.grisTexto);
    doc.text(item.detalle, x + anchoMax, ly, { align: 'right' });
  });
  return y + items.length * 15;
}

// ------------------------------------------------------------------ utilidades

function totalMaquilaPorAnio(maquilas) {
  const porAnio = {};
  maquilas.forEach(maq => {
    Object.keys(maq.porAnio || {}).forEach(anio => {
      porAnio[anio] = (porAnio[anio] || 0) + maq.porAnio[anio];
    });
  });
  return porAnio;
}

const porKilosDesc = (a, b) => b.kilos - a.kilos;

function topConOtros(items, limite, mapear) {
  const mapeados = items.map(mapear);
  if (mapeados.length <= limite) return mapeados;
  const visibles = mapeados.slice(0, limite - 1);
  const resto = mapeados.slice(limite - 1);
  visibles.push({
    etiqueta: 'Otros',
    valor: resto.reduce((s, i) => s + i.valor, 0)
  });
  return visibles;
}

function entradasDeProveedorAgrupado(prov) {
  if (prov.proveedoresIndividuales) {
    return prov.entradas;
  }
  return prov.entradas;
}

function nombreArchivo(tipo, rango) {
  return `reporte-consumo-${tipo}-${rango.desde}-a-${rango.hasta}.pdf`;
}

function opcionesTablaBase(ctx, startY, extras = {}) {
  return {
    startY,
    margin: { left: PAGINA.margen, right: PAGINA.margen, top: ALTO_ENCABEZADO_CONT + 12, bottom: 46 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.8,
      cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
      textColor: COLOR.texto,
      lineColor: COLOR.grisLinea,
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: COLOR.azulOscuro,
      textColor: 255,
      fontSize: 7.8,
      fontStyle: 'bold',
      lineColor: COLOR.azulOscuro
    },
    didDrawPage: () => encabezadoContinuacionSiHaceFalta(ctx.doc, ctx.subtitulo),
    ...extras
  };
}

// Estructura las columnas numéricas (años + entradas + precio + kilos + %).
function alinearNumericasDerecha(dataCell) {
  if (dataCell.column.index > 0) {
    dataCell.cell.styles.halign = 'right';
  }
}

// --------------------------------------------------------- contenido: resumen

function tilesPrincipales(reporte) {
  return [
    {
      etiqueta: 'Compras propias',
      valor: kg(reporte.totalKilos),
      sub: `${reporte.totalEntradas} entradas`,
      acento: COLOR.azul
    },
    {
      etiqueta: 'Maquila (Ozuna / Joselito)',
      valor: kg(reporte.maquilaKilos),
      sub: `${reporte.maquilaEntradas} entradas`,
      fondo: COLOR.naranjaSuave,
      borde: [245, 217, 168],
      acento: COLOR.naranja
    },
    {
      etiqueta: 'Volumen total procesado',
      valor: kg(reporte.totalKilos + reporte.maquilaKilos),
      sub: `${reporte.totalEntradas + reporte.maquilaEntradas} entradas`,
      fondo: [232, 248, 240],
      borde: [184, 230, 206],
      acento: COLOR.verde
    }
  ];
}

function segmentosProveedores(proveedores, limite) {
  const ordenados = [...proveedores].sort(porKilosDesc);
  const items = topConOtros(ordenados, limite, p => ({
    etiqueta: p.nombre,
    valor: p.kilos
  }));
  return items.map((item, i) => ({
    ...item,
    color: item.etiqueta === 'Otros' ? [176, 190, 197] : SERIE[i % SERIE.length]
  }));
}

// ================================================================== RESUMEN

export function generarReporteConsumoResumenPDF(datos) {
  const { reporte, proveedores, maquilas } = datos;
  const medidas = [...datos.medidas].sort(porKilosDesc);
  const rango = { desde: datos.fechaDesde, hasta: datos.fechaHasta };
  const doc = nuevoDocumento();
  const ctx = { doc, subtitulo: 'Resumen ejecutivo' };

  let y = dibujarEncabezado(doc, 'Resumen ejecutivo · Entradas de producto', rango);

  // ---- KPIs
  y = dibujarTiles(doc, y, tilesPrincipales(reporte));
  y += 8;

  // ---- Gráficas: barras de medidas (izq) + dona de proveedores (der)
  y = tituloSeccion(ctx, y, 'Consumo por medida y proveedor', '(compras propias)');
  if (medidas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.grisTexto);
    doc.text('Sin entradas en este período.', PAGINA.margen, y + 8);
    y += 28;
  } else {
    const yGraficas = y + 6;
    const anchoIzq = 300;
    const barras = topConOtros(medidas, 8, m => ({
      etiqueta: m.base,
      valor: m.kilos
    })).map(item => ({
      ...item,
      color: item.etiqueta === 'Otros' ? [176, 190, 197] : COLOR.azul,
      textoValor: `${formatNumber(item.valor, 0)} · ${pct(item.valor, reporte.totalKilos)}`
    }));
    const yFinBarras = dibujarBarrasHorizontales(doc, PAGINA.margen, yGraficas, anchoIzq, barras);

    const segmentos = segmentosProveedores(proveedores, 6);
    const cx = PAGINA.margen + anchoIzq + 78;
    const cy = yGraficas + 52;
    dibujarDona(doc, cx, cy, 50, 30, segmentos, {
      valor: formatNumber(reporte.totalKilos / 1000, 0) + 'k',
      etiqueta: 'kg propios'
    });
    const yFinLeyenda = dibujarLeyenda(
      doc,
      PAGINA.margen + anchoIzq + 24,
      cy + 66,
      segmentos.map(s => ({
        color: s.color,
        etiqueta: s.etiqueta,
        detalle: pct(s.valor, reporte.totalKilos)
      })),
      PAGINA.ancho - PAGINA.margen - (PAGINA.margen + anchoIzq + 24)
    );

    y = Math.max(yFinBarras, yFinLeyenda) + 14;
  }

  // ---- Tabla compacta por medida
  y = tituloSeccion(ctx, y, 'Kilos por medida y año', '(compras propias)');
  const filasMedidas = topConOtros(medidas, 12, m => ({
    etiqueta: m.base,
    valor: m.kilos,
    porAnio: m.porAnio,
    entradas: m.entradas
  }));
  autoTable(doc, opcionesTablaBase(ctx, y, {
    head: [['Medida', ...reporte.anios.map(String), 'Entradas', 'Kilos', '% del total']],
    body: filasMedidas.map(m => [
      m.etiqueta,
      ...reporte.anios.map(a => (m.porAnio && m.porAnio[a] ? formatNumber(m.porAnio[a], 0) : '—')),
      m.entradas != null ? String(m.entradas) : '—',
      formatNumber(m.valor, 0),
      pct(m.valor, reporte.totalKilos)
    ]),
    foot: [[
      'Total compras propias',
      ...reporte.anios.map(a => formatNumber(reporte.porAnio[a] || 0, 0)),
      String(reporte.totalEntradas),
      formatNumber(reporte.totalKilos, 0),
      reporte.totalKilos > 0 ? '100%' : '—'
    ]],
    footStyles: {
      fillColor: COLOR.azulSuave,
      textColor: COLOR.azulOscuro,
      fontStyle: 'bold',
      fontSize: 7.8,
      lineColor: COLOR.azulBorde
    },
    showFoot: 'lastPage',
    didParseCell: data => {
      alinearNumericasDerecha(data);
    }
  }));
  y = doc.lastAutoTable.finalY + 16;

  // ---- Maquila en una línea
  if (maquilas.length > 0) {
    y = asegurarEspacio(ctx, y, 46);
    doc.setFillColor(...COLOR.naranjaSuave);
    doc.setDrawColor(245, 217, 168);
    doc.setLineWidth(0.75);
    doc.roundedRect(PAGINA.margen, y, PAGINA.ancho - 2 * PAGINA.margen, 34, 4, 4, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.naranjaOscuro);
    doc.text('MAQUILA (PRODUCTO DE TERCEROS)', PAGINA.margen + 12, y + 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR.texto);
    const detalle = maquilas
      .map(maq => `${maq.nombre}: ${kg(maq.kilos)} (${maq.entradas} entradas)`)
      .join('   ·   ');
    doc.text(detalle, PAGINA.margen + 12, y + 26);
    y += 34;
  }

  dibujarPiesDePagina(doc);
  doc.save(nombreArchivo('resumen', rango));
}

// ================================================================= DETALLADO

export function generarReporteConsumoDetalladoPDF(datos) {
  const { reporte, proveedores, maquilas, mostrarPrecios } = datos;
  const medidas = [...datos.medidas].sort(porKilosDesc);
  const rango = { desde: datos.fechaDesde, hasta: datos.fechaHasta };
  const doc = nuevoDocumento();
  const ctx = { doc, subtitulo: 'Versión detallada' };

  let y = dibujarEncabezado(doc, 'Versión detallada · Entradas de producto', rango);

  // ---- KPIs principales + por año
  y = dibujarTiles(doc, y, tilesPrincipales(reporte));
  if (reporte.anios.length > 0) {
    y = dibujarTiles(doc, y - 6, reporte.anios.map(anio => ({
      etiqueta: `Compras ${anio}`,
      valor: kg(reporte.porAnio[anio] || 0),
      acento: COLOR.azul
    })));
  }

  // ---- Gráficas
  y = tituloSeccion(ctx, y, 'Resumen visual', '(compras propias)');
  if (medidas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.grisTexto);
    doc.text('Sin entradas en este período.', PAGINA.margen, y + 8);
    y += 28;
  } else {
    const yGraficas = y + 6;
    const barras = topConOtros(medidas, 10, m => ({
      etiqueta: m.base,
      valor: m.kilos
    })).map(item => ({
      ...item,
      color: item.etiqueta === 'Otros' ? [176, 190, 197] : COLOR.azul,
      textoValor: `${formatNumber(item.valor, 0)} · ${pct(item.valor, reporte.totalKilos)}`
    }));
    const yFinBarras = dibujarBarrasHorizontales(doc, PAGINA.margen, yGraficas, 330, barras);

    // Dona de proveedores a la derecha de las barras.
    const segmentos = segmentosProveedores(proveedores, 6);
    const cxDona = PAGINA.margen + 330 + 90;
    const cyDona = yGraficas + 52;
    dibujarDona(doc, cxDona, cyDona, 52, 31, segmentos, {
      valor: formatNumber(reporte.totalKilos / 1000, 0) + 'k',
      etiqueta: 'kg propios'
    });
    const yLeyenda = dibujarLeyenda(
      doc,
      PAGINA.margen + 330 + 26,
      cyDona + 68,
      segmentos.map(s => ({
        color: s.color,
        etiqueta: s.etiqueta,
        detalle: pct(s.valor, reporte.totalKilos)
      })),
      PAGINA.ancho - PAGINA.margen - (PAGINA.margen + 330 + 26)
    );
    y = Math.max(yFinBarras, yLeyenda) + 14;

    // Barras por año: compras propias vs maquila.
    y = asegurarEspacio(ctx, y, 150);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR.azulOscuro);
    doc.text('Kilos por año', PAGINA.margen, y + 4);
    const seriesAnio = [
      { nombre: 'Compras propias', color: COLOR.azul, porAnio: reporte.porAnio }
    ];
    const maquilaPorAnio = totalMaquilaPorAnio(maquilas);
    if (Object.keys(maquilaPorAnio).length > 0) {
      seriesAnio.push({ nombre: 'Maquila', color: COLOR.naranja, porAnio: maquilaPorAnio });
    }
    y = dibujarBarrasPorAnio(doc, PAGINA.margen + 10, y + 14, PAGINA.ancho - 2 * PAGINA.margen - 20, 100, reporte.anios, seriesAnio) + 10;
  }

  // ---- Global por medida
  y = tituloSeccion(ctx, y, 'Global por medida', '(compras propias, sin maquila)');
  medidas.forEach(medida => {
    y = asegurarEspacio(ctx, y, 90);

    // Encabezado de la medida.
    doc.setFillColor(...COLOR.azulSuave);
    doc.roundedRect(PAGINA.margen, y, PAGINA.ancho - 2 * PAGINA.margen, 20, 3, 3, 'F');
    doc.setFillColor(...COLOR.azul);
    doc.roundedRect(PAGINA.margen, y, 3.5, 20, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR.azulOscuro);
    doc.text(medida.base, PAGINA.margen + 12, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.grisTexto);
    const resumenMedida = [
      kg(medida.kilos),
      `${pct(medida.kilos, reporte.totalKilos)} del total`,
      `${medida.entradas} entradas`
    ];
    if (mostrarPrecios && medida.precioPromedio) {
      resumenMedida.push(`prom. $${formatNumber(medida.precioPromedio)}`);
    }
    doc.text(resumenMedida.join('  ·  '), PAGINA.ancho - PAGINA.margen - 8, y + 14, { align: 'right' });
    y += 26;

    // Filas: proveedor (subtotal) + variantes.
    const cuerpo = [];
    const tipos = [];
    medida.proveedores.forEach(prov => {
      cuerpo.push([
        prov.nombre,
        ...reporte.anios.map(a => (prov.porAnio[a] ? formatNumber(prov.porAnio[a], 0) : '—')),
        String(prov.entradas),
        ...(mostrarPrecios ? [prov.precioPromedio ? `$${formatNumber(prov.precioPromedio)}` : '—'] : []),
        formatNumber(prov.kilos, 0)
      ]);
      tipos.push('proveedor');
      if (prov.variantes.length > 1 || (prov.variantes[0] && prov.variantes[0].medida !== medida.base)) {
        prov.variantes.forEach(variante => {
          cuerpo.push([
            `    ${variante.medida}`,
            ...reporte.anios.map(a => (variante.porAnio[a] ? formatNumber(variante.porAnio[a], 0) : '—')),
            String(variante.entradas),
            ...(mostrarPrecios ? [variante.precioPromedio ? `$${formatNumber(variante.precioPromedio)}` : '—'] : []),
            formatNumber(variante.kilos, 0)
          ]);
          tipos.push('variante');
        });
      }
    });

    autoTable(doc, opcionesTablaBase(ctx, y, {
      head: [[
        'Proveedor / Medida',
        ...reporte.anios.map(String),
        'Entradas',
        ...(mostrarPrecios ? ['Precio prom.'] : []),
        'Kilos'
      ]],
      body: cuerpo,
      foot: [[
        `Total ${medida.base}`,
        ...reporte.anios.map(a => (medida.porAnio[a] ? formatNumber(medida.porAnio[a], 0) : '—')),
        String(medida.entradas),
        ...(mostrarPrecios ? [medida.precioPromedio ? `$${formatNumber(medida.precioPromedio)}` : '—'] : []),
        formatNumber(medida.kilos, 0)
      ]],
      footStyles: {
        fillColor: COLOR.azulSuave,
        textColor: COLOR.azulOscuro,
        fontStyle: 'bold',
        fontSize: 7.8,
        lineColor: COLOR.azulBorde
      },
      showFoot: 'lastPage',
      didParseCell: data => {
        alinearNumericasDerecha(data);
        if (data.section === 'body') {
          const tipo = tipos[data.row.index];
          if (tipo === 'proveedor') {
            data.cell.styles.fillColor = COLOR.filaProveedor;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [33, 97, 140];
          } else if (data.column.index === 0) {
            data.cell.styles.textColor = COLOR.grisTexto;
          }
        }
      }
    }));
    y = doc.lastAutoTable.finalY + 14;
  });
  if (medidas.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.grisTexto);
    doc.text('Sin entradas en este período.', PAGINA.margen, y + 4);
    y += 24;
  }

  // ---- Por proveedor
  y = tituloSeccion(ctx, y, 'Por proveedor', '(compras propias)');
  if (proveedores.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...COLOR.grisTexto);
    doc.text('Sin entradas en este período.', PAGINA.margen, y + 4);
    y += 24;
  }
  proveedores.forEach(prov => {
    y = asegurarEspacio(ctx, y, 90);

    doc.setFillColor(...COLOR.azulSuave);
    doc.roundedRect(PAGINA.margen, y, PAGINA.ancho - 2 * PAGINA.margen, 20, 3, 3, 'F');
    doc.setFillColor(...COLOR.verde);
    doc.roundedRect(PAGINA.margen, y, 3.5, 20, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...COLOR.azulOscuro);
    doc.text(prov.nombre, PAGINA.margen + 12, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.grisTexto);
    doc.text(
      [kg(prov.kilos), `${pct(prov.kilos, reporte.totalKilos)} del total`, `${entradasDeProveedorAgrupado(prov)} entradas`].join('  ·  '),
      PAGINA.ancho - PAGINA.margen - 8,
      y + 14,
      { align: 'right' }
    );
    y += 26;

    const cuerpo = [];
    const tipos = [];
    const porcentajes = [];

    if (prov.proveedoresIndividuales) {
      prov.proveedoresIndividuales.forEach(indiv => {
        const entradasIndiv = indiv.medidas.reduce((s, m) => s + m.entradas, 0);
        cuerpo.push([
          indiv.nombre,
          ...reporte.anios.map(a => (indiv.porAnio[a] ? formatNumber(indiv.porAnio[a], 0) : '—')),
          String(entradasIndiv),
          ...(mostrarPrecios ? [''] : []),
          formatNumber(indiv.kilos, 0),
          pct(indiv.kilos, prov.kilos)
        ]);
        tipos.push('proveedor');
        porcentajes.push(prov.kilos > 0 ? indiv.kilos / prov.kilos : 0);
        indiv.medidas.forEach(med => {
          cuerpo.push([
            `    ${med.nombre}`,
            ...reporte.anios.map(a => (med.porAnio[a] ? formatNumber(med.porAnio[a], 0) : '—')),
            String(med.entradas),
            ...(mostrarPrecios ? [med.precioPromedio ? `$${formatNumber(med.precioPromedio)}` : '—'] : []),
            formatNumber(med.kilos, 0),
            pct(med.kilos, indiv.kilos)
          ]);
          tipos.push('variante');
          porcentajes.push(indiv.kilos > 0 ? med.kilos / indiv.kilos : 0);
        });
      });
    } else {
      prov.medidas.forEach(med => {
        cuerpo.push([
          med.nombre,
          ...reporte.anios.map(a => (med.porAnio[a] ? formatNumber(med.porAnio[a], 0) : '—')),
          String(med.entradas),
          ...(mostrarPrecios ? [med.precioPromedio ? `$${formatNumber(med.precioPromedio)}` : '—'] : []),
          formatNumber(med.kilos, 0),
          pct(med.kilos, prov.kilos)
        ]);
        tipos.push('medida');
        porcentajes.push(prov.kilos > 0 ? med.kilos / prov.kilos : 0);
      });
    }

    const columnaPorcentaje = 1 + reporte.anios.length + 1 + (mostrarPrecios ? 1 : 0) + 1;

    autoTable(doc, opcionesTablaBase(ctx, y, {
      head: [[
        'Medida',
        ...reporte.anios.map(String),
        'Entradas',
        ...(mostrarPrecios ? ['Precio prom.'] : []),
        'Kilos',
        '% Prov.'
      ]],
      body: cuerpo,
      foot: [[
        `Total ${prov.nombre}`,
        ...reporte.anios.map(a => (prov.porAnio[a] ? formatNumber(prov.porAnio[a], 0) : '—')),
        String(entradasDeProveedorAgrupado(prov)),
        ...(mostrarPrecios ? [''] : []),
        formatNumber(prov.kilos, 0),
        '100%'
      ]],
      footStyles: {
        fillColor: COLOR.azulSuave,
        textColor: COLOR.azulOscuro,
        fontStyle: 'bold',
        fontSize: 7.8,
        lineColor: COLOR.azulBorde
      },
      showFoot: 'lastPage',
      didParseCell: data => {
        alinearNumericasDerecha(data);
        if (data.section === 'body') {
          const tipo = tipos[data.row.index];
          if (tipo === 'proveedor') {
            data.cell.styles.fillColor = COLOR.filaProveedor;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [33, 97, 140];
          } else if (tipo === 'variante' && data.column.index === 0) {
            data.cell.styles.textColor = COLOR.grisTexto;
          }
        }
      },
      willDrawCell: data => {
        // Micro-barra de porcentaje detrás del texto en la columna % Prov.
        if (data.section === 'body' && data.column.index === columnaPorcentaje) {
          const fraccion = porcentajes[data.row.index] || 0;
          const anchoBarra = Math.max((data.cell.width - 8) * Math.min(fraccion, 1), 0);
          if (anchoBarra > 0.5) {
            doc.setFillColor(214, 234, 248);
            doc.rect(data.cell.x + 4, data.cell.y + 2.5, anchoBarra, data.cell.height - 5, 'F');
          }
        }
      }
    }));
    y = doc.lastAutoTable.finalY + 14;
  });

  // ---- Maquila
  if (maquilas.length > 0) {
    y = tituloSeccion(ctx, y, 'Maquila', '(producto de terceros — dimensiona la capacidad de trabajo)', COLOR.naranjaOscuro, COLOR.naranja);
    maquilas.forEach(maq => {
      y = asegurarEspacio(ctx, y, 80);

      doc.setFillColor(...COLOR.naranjaSuave);
      doc.roundedRect(PAGINA.margen, y, PAGINA.ancho - 2 * PAGINA.margen, 20, 3, 3, 'F');
      doc.setFillColor(...COLOR.naranja);
      doc.roundedRect(PAGINA.margen, y, 3.5, 20, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...COLOR.naranjaOscuro);
      doc.text(`${maq.nombre} (Maquila)`, PAGINA.margen + 12, y + 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLOR.grisTexto);
      doc.text(
        [kg(maq.kilos), `${maq.entradas} entradas`].join('  ·  '),
        PAGINA.ancho - PAGINA.margen - 8,
        y + 14,
        { align: 'right' }
      );
      y += 26;

      autoTable(doc, opcionesTablaBase(ctx, y, {
        head: [['Medida', ...reporte.anios.map(String), 'Entradas', 'Kilos']],
        headStyles: {
          fillColor: COLOR.naranja,
          textColor: 255,
          fontSize: 7.8,
          fontStyle: 'bold',
          lineColor: COLOR.naranja
        },
        body: maq.medidas.map(med => [
          med.nombre,
          ...reporte.anios.map(a => (med.porAnio[a] ? formatNumber(med.porAnio[a], 0) : '—')),
          String(med.entradas),
          formatNumber(med.kilos, 0)
        ]),
        foot: [[
          `Total ${maq.nombre}`,
          ...reporte.anios.map(a => (maq.porAnio[a] ? formatNumber(maq.porAnio[a], 0) : '—')),
          String(maq.entradas),
          formatNumber(maq.kilos, 0)
        ]],
        footStyles: {
          fillColor: COLOR.naranjaSuave,
          textColor: COLOR.naranjaOscuro,
          fontStyle: 'bold',
          fontSize: 7.8,
          lineColor: [245, 217, 168]
        },
        showFoot: 'lastPage',
        didParseCell: data => alinearNumericasDerecha(data)
      }));
      y = doc.lastAutoTable.finalY + 14;
    });
  }

  dibujarPiesDePagina(doc);
  doc.save(nombreArchivo('detallado', rango));
}
