/**
 * Estilos compartidos para nota de venta: impresión del navegador (Ctrl+P / ventana Imprimir).
 * Blanco y negro, sin fondos de color — optimizado para consumo de tinta.
 */
export const NOTA_VENTA_PDF_INLINE_CSS = `.nota-venta-print-root {
  font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  font-size: 14pt;
  color: #000000;
  background: #ffffff !important;
  max-width: 720px;
  margin: 0 auto;
  padding: 28px 32px 36px;
  box-sizing: border-box;
  line-height: 1.5;
  -webkit-print-color-adjust: economy;
  print-color-adjust: economy;
}
.nota-venta-print-root .folio-date {
  text-align: center;
  margin-bottom: 1.15rem;
  padding: 1rem 1.25rem 1.1rem;
  background: #ffffff !important;
  border: 1px solid #000000;
  border-radius: 4px;
  box-shadow: none;
}
.nota-venta-print-root .folio-date p {
  margin: 0.4em 0;
  font-size: 16pt;
  color: #000000;
}
.nota-venta-print-root .folio-date strong {
  color: #000000;
  font-weight: 700;
}
.nota-venta-print-root h3 {
  text-align: center;
  color: #000000;
  font-size: 18pt;
  margin: 1.2em 0 0.75em;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.nota-venta-print-root table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 auto 1rem;
  font-size: 14pt;
  box-shadow: none;
  border: 1px solid #000000;
  border-radius: 0;
  overflow: visible;
}
.nota-venta-print-root table tbody tr:nth-child(even),
.nota-venta-print-root table tbody tr:nth-child(odd) {
  background: #ffffff !important;
}
.nota-venta-print-root table th,
.nota-venta-print-root table td {
  border: 1px solid #000000;
  padding: 13px 18px;
  text-align: center;
  vertical-align: middle;
}
.nota-venta-print-root table th {
  background: #ffffff !important;
  color: #000000 !important;
  font-weight: 700;
  font-size: 14pt;
}
.nota-venta-print-root .pdf-flete-line {
  margin: 0;
  font-size: 15pt;
  color: #000000;
}
.nota-venta-print-root .pdf-flete-line strong { color: #000000; }
.nota-venta-print-root .flete-section {
  margin-top: 1rem;
  padding: 0.9rem 1rem;
  background: #ffffff !important;
  border: 1px solid #000000;
  border-radius: 4px;
  text-align: center;
}
.nota-venta-print-root .total-general {
  margin-top: 1rem;
  text-align: center;
  padding: 1.1rem 1.2rem;
  background: #ffffff !important;
  border: 1px solid #000000;
  border-radius: 4px;
  box-shadow: none;
  page-break-after: avoid;
  break-after: avoid;
}
.nota-venta-print-root .total-general h3 {
  margin: 0.45em 0;
  font-size: 15pt;
  color: #000000;
}
.nota-venta-print-root .total-line-sub {
  font-size: 14pt !important;
  font-weight: 600;
  color: #000000 !important;
  margin: 0.35em 0 !important;
}
.nota-venta-print-root .total-final {
  font-size: 22pt !important;
  font-weight: 700;
  color: #000000 !important;
  border-top: 1px solid #000000;
  padding-top: 0.55em;
  margin-top: 0.55em;
}
.nota-venta-print-root .observaciones-resumen {
  border-left: 3px solid #000000;
  padding: 0.85rem 1.1rem;
  background: #ffffff !important;
  margin-bottom: 1rem;
  border-radius: 0;
  color: #000000;
  font-size: 15pt;
}
.nota-venta-print-root .resumen-saldos-acumulados {
  margin-top: 1.15rem;
}
.nota-venta-print-root .resumen-saldos-titulo {
  margin: 0 0 0.55rem;
  font-size: 13pt;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-align: center;
  color: #000000;
}
.nota-venta-print-root .resumen-saldos-en-total-general {
  margin-top: 0.85rem;
  padding-top: 0.75rem;
  border-top: 1px dashed #000000;
}
.nota-venta-print-root .resumen-saldos-inner {
  border: 1px solid #000000;
  border-radius: 4px;
  overflow: hidden;
  max-width: 540px;
  margin: 0 auto;
  background: #ffffff !important;
  box-shadow: none;
}
.nota-venta-print-root .resumen-saldos-row {
  display: table !important;
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid #000000;
  font-size: 15pt;
  color: #000000;
  box-sizing: border-box;
  background: #ffffff !important;
}
.nota-venta-print-root .resumen-saldos-row:last-child { border-bottom: none; }
.nota-venta-print-root .resumen-saldos-label {
  display: table-cell !important;
  width: 58%;
  padding: 0.65rem 0.5rem 0.65rem 0.85rem !important;
  vertical-align: middle;
  text-align: left !important;
  font-weight: 600;
  color: #000000 !important;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
.nota-venta-print-root .resumen-saldos-value {
  display: table-cell !important;
  width: 42%;
  padding: 0.65rem 0.85rem 0.65rem 0.5rem !important;
  vertical-align: middle;
  text-align: right !important;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: #000000 !important;
  white-space: nowrap;
}
.nota-venta-print-root .resumen-saldos-row--anterior {
  background: #ffffff !important;
}
.nota-venta-print-root .resumen-saldos-row--bold .resumen-saldos-label,
.nota-venta-print-root .resumen-saldos-row--bold .resumen-saldos-value {
  font-weight: 700 !important;
  color: #000000 !important;
}
.nota-venta-print-root .resumen-saldos-row--nuevo {
  background: #ffffff !important;
  border-top: 1px solid #000000;
}
.nota-venta-print-root .resumen-saldos-row--nuevo .resumen-saldos-value {
  color: #000000 !important;
  font-size: 15pt;
}
.nota-venta-print-root .resumen-saldos-value--destacado {
  font-size: 18pt !important;
  font-weight: 700 !important;
}
.nota-venta-print-root .abonos-container {
  border-top: 1px solid #000000;
  margin-top: 1.15rem;
  padding-top: 1rem;
  page-break-inside: avoid;
  break-inside: avoid;
}
.nota-venta-print-root .abonos-section h3 { color: #000000; }
.nota-venta-print-root .abonos-section .table-responsive {
  overflow: visible !important;
  page-break-inside: avoid;
  break-inside: avoid;
}
.nota-venta-print-root .abonos-table {
  page-break-inside: avoid;
  break-inside: avoid;
}
.nota-venta-print-root .abonos-summary {
  text-align: center;
  margin-top: 0.9rem;
  font-size: 15pt;
  color: #000000;
  page-break-inside: avoid;
  break-inside: avoid;
  page-break-before: avoid;
  break-before: avoid;
}
.nota-venta-print-root .abonos-summary .pagado { color: #000000 !important; }
.nota-venta-print-root .abonos-summary .no-pagado { color: #000000 !important; font-weight: 700; text-decoration: underline; }
@media print {
  /* Tabla detallada de abonos: solo en pantalla; en impresión evita 2ª página y el resumen ya está en "Saldos con el cliente". */
  .nota-venta-print-root .abonos-container {
    display: none !important;
  }
}`;

export function getNotaVentaPrintMediaCss() {
  return `@media print {
  .back-button-container,
  .sale-note-title,
  .precios-venta-toolbar,
  .sale-note > form:first-of-type,
  .action-buttons,
  .nota-venta-print-root .flete-edit-row,
  .nota-venta-print-root .flete-inline-edit,
  .nota-venta-print-root .abonos-section form,
  .nota-venta-print-root button {
    display: none !important;
  }
  .flete-print-line {
    display: block !important;
    margin: 0;
    text-align: center;
    font-size: 15pt;
    color: #000000 !important;
  }
  .sale-note {
    background: #fff !important;
    color: #000000 !important;
    border: none !important;
    box-shadow: none !important;
    max-width: 100% !important;
  }
  .nota-venta-print-root .abonos-section > h3:first-of-type {
    display: none !important;
  }
  .nota-venta-print-root .abonos-container {
    display: none !important;
  }
  .nota-venta-print-root td:nth-child(5),
  .nota-venta-print-root th:nth-child(5),
  .nota-venta-print-root .abonos-table td:nth-child(3),
  .nota-venta-print-root .abonos-table th:nth-child(3) {
    display: none !important;
  }

${NOTA_VENTA_PDF_INLINE_CSS}
}`;
}
