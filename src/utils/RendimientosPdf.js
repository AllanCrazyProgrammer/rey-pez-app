import pdfMake from 'pdfmake/build/pdfmake';
import vfsFonts from 'pdfmake/build/vfs_fonts';

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

export const generarPDFRendimientos = async (datosRendimientos, embarqueData) => {
  try {
    const logoBase64 = await loadImageAsBase64('https://res.cloudinary.com/hwkcovsmr/image/upload/v1620946647/samples/REY_PEZ_LOGO_nsotww.png');
    
    const nombresMedidasPersonalizados = embarqueData?.nombresMedidasPersonalizados || {};

    const docDefinition = {
      content: [
        {
          columns: [
            {
              image: logoBase64,
              width: 80,
              alignment: 'left',
              margin: [0, 0, 0, 5]
            },
            {
              text: 'Reporte de Rendimientos',
              style: 'header',
              alignment: 'center',
              margin: [0, 10, 0, 0]
            },
            {
              stack: [
                {
                  text: `Fecha: ${new Date().toLocaleDateString()}`,
                  alignment: 'right',
                  margin: [0, 10, 0, 0]
                },
              ]
            }
          ]
        },
        { text: '\n', height: 5 },
        generarTablaRendimientos(datosRendimientos, nombresMedidasPersonalizados)
      ],
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          color: '#3760b0',
          margin: [0, 0, 0, 5]
        },
        tableHeader: {
          bold: true,
          fontSize: 20,
          color: 'white',
          fillColor: '#3760b0'
        },
        rendimientoAlto: {
          color: '#27ae60',
          bold: true
        },
        rendimientoBajo: {
          color: '#000000'
        }
      },
      defaultStyle: {
        fontSize: 18
      },
      footer: function(currentPage, pageCount) {
        return {
          columns: [
            { 
              text: '© 2024 Rey Pez - Tampico, Tamps.', 
              alignment: 'center', 
              margin: [0, 5, 0, 0],
              fontSize: 8,
              color: '#3760b0'
            },
          ]
        };
      }
    };

    // Después de agregar toda la información de rendimientos, agregar la nota
    if (embarqueData.notaRendimientos) {
      docDefinition.content.push({
        text: '\n',
        height: 5
      });
      docDefinition.content.push({
        text: 'Nota:',
        style: 'header',
        color: 'red',
        alignment: 'center',
        margin: [0, 10, 0, 0]
      });
      docDefinition.content.push({
        text: ' ' + embarqueData.notaRendimientos,
        style: 'header',
        alignment: 'center',
        color: 'black',
        margin: [0, 10, 0, 0]
      });
    }

    pdfMake.createPdf(docDefinition).open();
  } catch (error) {
    console.error('Error al generar el PDF de rendimientos:', error);
  }
};

function generarTablaRendimientos(datosRendimientos, nombresMedidasPersonalizados) {
  const body = [
    [
      { text: 'Medida', style: 'tableHeader' },
      { text: 'Kilos en Crudo', style: 'tableHeader' },
      { text: 'Total Embarcado', style: 'tableHeader' },
      { text: 'Rendimiento', style: 'tableHeader' }
    ],
    ...datosRendimientos.map(dato => {
      const rendimiento = dato.rendimiento;
      const rendimientoStyle = rendimiento > 1 ? 'rendimientoAlto' : 'rendimientoBajo';
      
      const nombreMedida = nombresMedidasPersonalizados[dato.medida] || dato.medida;
      
      return [
        nombreMedida,
        formatearKilos(dato.kilosCrudos),
        formatearKilos(dato.totalEmbarcado),
        {
          text: formatearRendimiento(rendimiento),
          style: rendimientoStyle
        }
      ];
    })
  ];

  return {
    table: {
      headerRows: 1,
      widths: ['*', '*', '*', '*'],
      body: body
    },
    layout: {
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
    }
  };
}

function formatearKilos(kilos) {
  if (typeof kilos === 'object' && kilos !== null) {
    // Para medidas mix que tienen medida1 y medida2
    const total = (Number(kilos.medida1) || 0) + (Number(kilos.medida2) || 0);
    return (total % 1 === 0 ? Math.floor(total) : total.toFixed(1)) + ' kg';
  }
  const numero = Number(kilos);
  return (numero % 1 === 0 ? Math.floor(numero) : numero.toFixed(1)) + ' kg';
}

function formatearRendimiento(rendimiento) {
  return Number(rendimiento).toFixed(2);
}

function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      resolve(dataURL);
    };
    img.onerror = reject;
    img.src = url;
  });
}
