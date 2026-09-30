import { formatoFechaPesadas, formatoPagoPesada, formatoPesada, resumenPesadas } from '../pesadas';

export function documentoPesadas(fecha, data) {
  const resumen = resumenPesadas(data);
  if (!resumen.personas.length) throw new Error('Agrega al menos una despicadora.');
  if (resumen.personas.some(row => row.pago < 0)) throw new Error('Corrige los pagos negativos antes de imprimir.');
  const filas = resumen.personas.map(row => [row.nombre, formatoPagoPesada(row.pagoRedondeado)]);
  filas.push(['Baños', formatoPesada(resumen.banos)]);
  const content = [];
  // Cuatro listas verticales de hasta 24 nombres por hoja. Las filas pueden
  // crecer para nombres largos; pdfmake repite el encabezado si se desbordan.
  for (let inicio = 0; inicio < filas.length; inicio += 96) {
    const grupo = filas.slice(inicio, inicio + 96);
    const alto = Math.ceil(grupo.length / 4);
    const body = [Array.from({ length: 8 }, (_, i) => ({
      text: i % 2 ? 'Pago' : 'Nombre', bold: true,
      alignment: 'center', fillColor: '#eeeeee'
    }))];
    for (let fila = 0; fila < alto; fila++) {
      const celdas = [];
      for (let columna = 0; columna < 4; columna++) {
        const registro = grupo[columna * alto + fila];
        celdas.push({ text: registro ? registro[0] : '', alignment: 'center' },
          { text: registro ? registro[1] : '', alignment: 'center', bold: true });
      }
      body.push(celdas);
    }
    content.push({
      ...(inicio ? { pageBreak: 'before' } : {}),
      table: { widths: ['*', 56, '*', 56, '*', 56, '*', 56], headerRows: 1, dontBreakRows: true, body },
      layout: {
        hLineWidth: () => 0.4, vLineWidth: i => i % 2 === 0 ? 0.6 : 0.4,
        hLineColor: () => '#cccccc', vLineColor: i => i % 2 === 0 ? '#999999' : '#cccccc',
        paddingLeft: () => 2, paddingRight: () => 2,
        paddingTop: () => 5, paddingBottom: () => 5
      }
    });
  }
  return {
    pageSize: 'LETTER', pageOrientation: 'portrait', pageMargins: [18, 64, 18, 30],
    info: { title: `Pesadas ${formatoFechaPesadas(fecha)}`, author: 'Rey Pez' },
    defaultStyle: { font: 'Roboto', fontSize: 18, color: '#000000' },
    header: { text: `Pesadas · ${formatoFechaPesadas(fecha)}`, alignment: 'center', fontSize: 24, bold: true, margin: [24, 22, 24, 0] },
    footer: (pagina, total) => ({ text: `${pagina} / ${total}`, alignment: 'center', fontSize: 10, margin: [0, 10, 0, 0] }),
    content
  };
}

export async function crearPdfPesadas(fecha, data) {
  const definition = documentoPesadas(fecha, data);
  const [pdfModule, fontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')
  ]);
  const pdfMake = pdfModule.default || pdfModule;
  const fontFiles = fontsModule.default || fontsModule;
  const vfs = fontFiles.pdfMake?.vfs || fontFiles.vfs || fontFiles;
  const fonts = {
    Roboto: {
      normal: 'Roboto-Regular.ttf',
      bold: 'Roboto-Medium.ttf',
      italics: 'Roboto-Italic.ttf',
      bolditalics: 'Roboto-MediumItalic.ttf'
    }
  };
  // Las fuentes pertenecen a este documento; otras pantallas pueden cambiar
  // el VFS o las fuentes globales de pdfmake.
  const pdf = pdfMake.createPdf(definition, undefined, fonts, vfs);
  const blob = await new Promise((resolve, reject) => {
    // getBlob pierde los errores de maquetación en su callback interno.
    // El stream permite rechazarlos y quitar el estado de carga de la vista.
    const stream = pdf.getStream();
    const chunks = [];
    stream.on('error', reject);
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => {
      try { resolve(new Blob(chunks, { type: 'application/pdf' })); }
      catch (error) { reject(error); }
    });
    stream.end();
  });
  return { pdf, blob };
}
