import { formatoFechaPesadas, formatoPesada, resumenPesadas } from '../pesadas';

export function documentoPesadas(fecha, data) {
  const resumen = resumenPesadas(data);
  if (!resumen.personas.length) throw new Error('Agrega al menos una despicadora.');
  if (resumen.personas.some(row => row.pago < 0)) throw new Error('Corrige los pagos negativos antes de imprimir.');
  return {
    pageSize: 'LETTER', pageOrientation: 'portrait', pageMargins: [32, 30, 32, 30],
    info: { title: `Pesadas ${formatoFechaPesadas(fecha)}`, author: 'Rey Pez' },
    defaultStyle: { font: 'Roboto', fontSize: 26, bold: true, color: '#000000' },
    content: [{
      table: {
        widths: ['*', '36%'], headerRows: 1, dontBreakRows: true,
        body: [
          [{ text: formatoFechaPesadas(fecha), colSpan: 2, alignment: 'center',
            fontSize: 38, italics: true, decoration: 'underline', margin: [0, 4, 0, 6] }, {}],
          ...resumen.personas.map(row => [
            { text: row.nombre, margin: [0, 5, 0, 5] },
            { text: formatoPesada(row.pago), alignment: 'right', margin: [0, 5, 0, 5] }
          ]),
          [{ text: 'Baños', margin: [0, 5, 0, 5] },
            { text: formatoPesada(resumen.banos), alignment: 'right', margin: [0, 5, 0, 5] }]
        ]
      },
      layout: {
        hLineWidth: () => 0.5, vLineWidth: () => 0.5,
        hLineColor: () => '#999999', vLineColor: () => '#999999',
        paddingLeft: () => 10, paddingRight: () => 10,
        paddingTop: () => 5, paddingBottom: () => 5
      }
    }]
  };
}

export async function crearPdfPesadas(fecha, data) {
  const definition = documentoPesadas(fecha, data);
  const [pdfModule, fontsModule] = await Promise.all([
    import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')
  ]);
  const pdfMake = pdfModule.default || pdfModule;
  const fonts = fontsModule.default || fontsModule;
  pdfMake.vfs = fonts.pdfMake?.vfs || fonts.vfs || fonts;
  const pdf = pdfMake.createPdf(definition);
  const blob = await new Promise(resolve => pdf.getBlob(resolve));
  return { pdf, blob };
}
