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
  // pdfMake mutates its layout while rendering. Reuse the bytes already made
  // for Drive instead of rendering the same document again in the browser.
  if (buffer) {
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
    try {
      const link = document.createElement('a');
      link.href = url;
      if (webAction === 'open') {
        link.target = '_blank';
        link.rel = 'noopener';
      } else {
        link.download = filename;
      }
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
      }
    } finally {
      // Allow browser viewers/downloads time to consume the object URL.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
    return;
  }
  return webAction === 'open' ? pdf.open() : pdf.download(filename);
}
