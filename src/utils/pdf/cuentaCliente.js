import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Leer las tablas del mismo HTML de impresión conserva conceptos, importes y colores.
export async function crearPdfCuentaCliente(html) {
  const iframe = document.createElement('iframe');
  iframe.title = 'Preparando PDF de la cuenta';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:816px;height:1056px;visibility:hidden;pointer-events:none';
  try {
    await new Promise((resolve, reject) => {
      iframe.onload = resolve;
      iframe.onerror = () => reject(new Error('No se pudo preparar la cuenta para generar el PDF.'));
      iframe.srcdoc = html;
      document.body.appendChild(iframe);
    });
    const contenido = iframe.contentDocument;
    const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
    const ancho = pdf.internal.pageSize.getWidth();
    const alto = pdf.internal.pageSize.getHeight();
    const margen = 44;
    const rojo = '#a91f27';
    pdf.setProperties({ title: contenido.title, author: 'Rey Pez' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(rojo);
    const titulo = pdf.splitTextToSize(contenido.querySelector('h1').textContent, ancho - margen * 2);
    pdf.text(titulo, ancho / 2, margen + 17, { align: 'center' });
    let y = margen + titulo.length * 24 + 18;

    for (const tabla of contenido.querySelectorAll('table')) {
      if (y > alto - margen - 100) { pdf.addPage(); y = margen; }
      const encabezado = tabla.previousElementSibling;
      pdf.setFillColor('#fff1f2');
      pdf.rect(margen, y, ancho - margen * 2, 27, 'F');
      pdf.setFillColor(rojo);
      pdf.rect(margen, y, 4, 27, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(rojo);
      pdf.text(encabezado.textContent, margen + 12, y + 18);
      autoTable(pdf, {
        html: tabla, useCss: true, theme: 'grid', startY: y + 35,
        margin: { top: margen, right: margen, bottom: margen, left: margen },
        tableWidth: ancho - margen * 2, tableLineColor: rojo, tableLineWidth: 2,
        styles: { font: 'helvetica', overflow: 'linebreak' },
        rowPageBreak: 'avoid', showFoot: 'lastPage',
      });
      y = pdf.lastAutoTable.finalY + 18;
    }
    for (let pagina = 1; pagina <= pdf.getNumberOfPages(); pagina++) {
      pdf.setPage(pagina);
      pdf.setDrawColor(rojo);
      pdf.setLineWidth(1.5);
      pdf.roundedRect(22, 22, ancho - 44, alto - 44, 8, 8);
    }
    return new Uint8Array(pdf.output('arraybuffer'));
  } finally {
    iframe.remove();
  }
}
