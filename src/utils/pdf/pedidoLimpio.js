import pdfMake from 'pdfmake/build/pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts';

const fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
};
const vfs = vfsFonts.pdfMake?.vfs || vfsFonts.vfs || vfsFonts;

export function crearDocumentoPedidoLimpio(definicion) {
  // Pasar las fuentes por documento evita depender de internet o de la
  // configuración global que otras pantallas cambian al generar sus PDFs.
  return pdfMake.createPdf(definicion, undefined, fonts, vfs);
}

export function crearPreviewPedidoLimpio(definicion) {
  return new Promise((resolve, reject) => {
    // Con fuentes locales, getStream sin callback permite capturar también
    // los errores de maquetación en esta promesa (el callback los perdía).
    const stream = crearDocumentoPedidoLimpio(definicion).getStream();
    const chunks = [];
    stream.on('error', reject);
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => {
      try {
        resolve({
          blob: new Blob(chunks, { type: 'application/pdf' }),
          pageCount: Math.max(1, stream._pdfMakePages?.length || 1)
        });
      } catch (error) {
        reject(error);
      }
    });
    stream.end();
  });
}
