import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

export const generarPDFRendimientos = async (datosRendimientos, embarqueData) => {
  try {
    const logoBase64 = await loadImageAsBase64('https://res.cloudinary.com/hwkcovsmr/image/upload/v1620946647/samples/REY_PEZ_LOGO_nsotww.png');
    
    const docDefinition = {
      content: [
        {
          columns: [
            {
              image: logoBase64,
              width: 100,
              alignment: 'left',
              margin: [0, 0, 0, 10]
            },
            {
              text: 'Reporte de Rendimientos',
              style: 'header',
              alignment: 'center',
              margin: [0, 20, 0, 0]
            },
            {
              stack: [
                {
                  text: `Fecha: ${new Date().toLocaleDateString()}`,
                  alignment: 'right',
                  margin: [0, 20, 0, 0]
                },
              ]
            }
          ]
        },
        { text: '\n' },
        generarTablaRendimientos(datosRendimientos)
      ],
      styles: {
        header: {
          fontSize: 30,
          bold: true,
          color: '#3760b0',
          margin: [0, 0, 0, 10]
        },
        tableHeader: {
          bold: true,
          fontSize: 28,
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
        fontSize: 25
      },
      footer: function(currentPage, pageCount) {
        return {
          columns: [
            { 
              text: '© 2024 Rey Pez - Tampico, Tamps.', 
              alignment: 'center', 
              margin: [0, 10, 0, 0],
              fontSize: 8,
              color: '#3760b0'
            },
          ]
        };
      }
    };

    pdfMake.createPdf(docDefinition).open();
  } catch (error) {
    console.error('Error al generar el PDF de rendimientos:', error);
  }
};

function generarTablaRendimientos(datosRendimientos) {
  const body = [
    [
      { text: 'Medida', style: 'tableHeader' },
      { text: 'Kilos en Crudo', style: 'tableHeader' },
      { text: 'Rendimiento', style: 'tableHeader' }
    ],
    ...datosRendimientos.map(dato => {
      const rendimiento = dato.rendimiento;
      const rendimientoStyle = rendimiento > 1 ? 'rendimientoAlto' : 'rendimientoBajo';
      
      return [
        dato.medida,
        formatearKilos(dato.kilosCrudos),
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
      widths: ['*', '*', '*'],
      body: body
    },
    layout: {
      hLineWidth: function(i, node) { 
        return (i === 0 || i === node.table.body.length) ? 2 : 1; 
      },
      vLineWidth: function(i, node) { 
        return (i === 0 || i === node.table.widths.length) ? 2 : 1; 
      },
      hLineColor: function(i, node) { 
        return (i === 0 || i === node.table.body.length) ? '#3760b0' : '#cccccc'; 
      },
      vLineColor: function(i, node) { 
        return (i === 0 || i === node.table.widths.length) ? '#3760b0' : '#cccccc'; 
      },
      fillColor: function(rowIndex, node, columnIndex) {
        return (rowIndex % 2 === 0) ? '#f8f9fa' : null;
      }
    }
  };
}

function formatearKilos(kilos) {
  if (typeof kilos === 'object' && kilos !== null) {
    // Para medidas mix que tienen medida1 y medida2
    const total = (Number(kilos.medida1) || 0) + (Number(kilos.medida2) || 0);
    return total.toFixed(1) + ' kg';
  }
  return Number(kilos).toFixed(1) + ' kg';
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
