import pdfMake from 'pdfmake/build/pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts';

// Configuración de fuentes para pdfMake
export const configurarPdfMake = () => {
  // Asignar las fuentes directamente desde el módulo vfsFonts
  if (typeof vfsFonts === 'object') {
    if (vfsFonts.pdfMake && vfsFonts.pdfMake.vfs) {
      pdfMake.vfs = vfsFonts.pdfMake.vfs;
    } else if (vfsFonts.vfs) {
      pdfMake.vfs = vfsFonts.vfs;
    } else {
      pdfMake.vfs = vfsFonts;
    }
  }

  // También necesitamos asegurarnos de que las fuentes estén disponibles globalmente
  if (typeof window !== 'undefined' && !window.pdfMake) {
    window.pdfMake = pdfMake;
  }
};

// Estilos para el PDF
export const estilosPdf = {
  header: {
    fontSize: 24,
    bold: true,
    color: '#3760b0',
    margin: [0, 0, 0, 5]
  },
  tableHeader: {
    bold: true,
    fontSize: 14,
    color: 'white',
    fillColor: '#3760b0'
  },
  rendimientoAlto: {
    color: '#27ae60',
    bold: true
  },
  rendimientoBajo: {
    color: '#000000'
  },
  costoStyle: {
    color: '#e74c3c',
    bold: true
  },
  gananciaPositiva: {
    color: '#27ae60',
    bold: true
  },
  gananciaNegativa: {
    color: '#e74c3c',
    bold: true
  },
  tableTotal: {
    bold: true,
    fontSize: 20,
    color: '#2c3e50',
    fillColor: '#e8f4f8'
  },
  tableTotalNegativo: {
    bold: true,
    fontSize: 20,
    color: '#e74c3c',
    fillColor: '#e8f4f8'
  }
};

// Configuración de layout para tablas
export const layoutTabla = {
  hLineWidth: function(i, node) { 
    return (i === 0 || i === node.table.body.length) ? 1.5 : 0.5;
  },
  vLineWidth: function(i, node) { 
    return (i === 0 || i === node.table.widths.length) ? 1.5 : 0.5;
  },
  hLineColor: function(i, node) { 
    return (i === 0 || i === node.table.body.length) ? '#3760b0' : '#cccccc';
  },
  vLineColor: function(i, node) { 
    return (i === 0 || i === node.table.widths.length) ? '#3760b0' : '#cccccc';
  },
  fillColor: function(rowIndex, node, columnIndex) {
    return (rowIndex % 2 === 0) ? '#f8f9fa' : null;
  },
  paddingLeft: function(i) { return 4; },
  paddingRight: function(i) { return 4; },
  paddingTop: function(i) { return 2; },
  paddingBottom: function(i) { return 2; }
};

// Configuración de layout para tablas con fila de total
export const layoutTablaConTotal = {
  hLineWidth: function(i, node) { 
    return (i === 0 || i === node.table.body.length || i === node.table.body.length - 1) ? 1.5 : 0.5;
  },
  vLineWidth: function(i, node) { 
    return (i === 0 || i === node.table.widths.length) ? 1.5 : 0.5;
  },
  hLineColor: function(i, node) { 
    return (i === 0 || i === node.table.body.length || i === node.table.body.length - 1) ? '#3760b0' : '#cccccc';
  },
  vLineColor: function(i, node) { 
    return (i === 0 || i === node.table.widths.length) ? '#3760b0' : '#cccccc';
  },
  fillColor: function(rowIndex, node, columnIndex) {
    if (rowIndex === node.table.body.length - 1) {
      return '#e8f4f8'; // Color de fondo para la fila del total
    }
    return (rowIndex % 2 === 0) ? '#f8f9fa' : null;
  },
  paddingLeft: function(i) { return 4; },
  paddingRight: function(i) { return 4; },
  paddingTop: function(i) { return 2; },
  paddingBottom: function(i) { return 2; }
};

// Configuración por defecto del documento
export const configuracionDocumento = {
  defaultStyle: {
    fontSize: 18
  },
  footer: function(currentPage, pageCount) {
    return {
      columns: [
        { 
          text: '© 2025 Rey Pez - Tampico, Tamps.', 
          alignment: 'center', 
          margin: [0, 5, 0, 0],
          fontSize: 8,
          color: '#3760b0'
        },
      ]
    };
  }
};

export default pdfMake;