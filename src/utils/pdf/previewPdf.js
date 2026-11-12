import * as pdfjsLib from 'pdfjs-dist';

// El WebView de Android no tiene visor de PDF: un iframe con el blob del PDF
// se ve en blanco (gris, sin contenido). Por eso la vista previa renderiza
// cada página a imagen con pdf.js, que sí funciona en todos lados.
//
// El worker se resuelve como asset del bundle (webpack 5 + Vue CLI 5):
// pdf.js lo carga con type: module porque el archivo es .mjs.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// Renderiza cada página del blob PDF a una imagen PNG (data URL) para
// mostrarla en la vista previa sin depender del visor de PDF del navegador.
// `escala` 2 da texto nítido en el teléfono sin pesar demasiado.
export async function renderizarPaginasPdf(blob, escala = 2) {
  const data = await blob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const imagenes = [];
  try {
    for (let n = 1; n <= pdf.numPages; n++) {
      const pagina = await pdf.getPage(n);
      const viewport = pagina.getViewport({ scale: escala });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await pagina.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      imagenes.push(canvas.toDataURL('image/png'));
    }
  } finally {
    await pdf.destroy();
  }
  return imagenes;
}
