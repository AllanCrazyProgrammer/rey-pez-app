export function obtenerBufferPdf(pdf) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('La generación del PDF tardó demasiado. Intenta de nuevo.')), 60000);
    try {
      pdf.getBuffer(buffer => {
        clearTimeout(timeout);
        resolve(buffer);
      });
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

export async function entregarPdf(pdf, filename, webAction = 'download', buffer = null, notePeriod = null) {
  if (window.desktop) {
    if (!window.desktop.savePdf) throw new Error('Cierra y actualiza ReyPez para guardar el PDF.');
    const bytes = buffer || await obtenerBufferPdf(pdf);
    return window.desktop.savePdf(new Uint8Array(bytes), filename, notePeriod);
  }
  return webAction === 'open' ? pdf.open() : pdf.download(filename);
}
