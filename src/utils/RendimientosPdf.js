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

    // Función auxiliar para formatear la fecha
    const formatearFecha = (fecha) => {
      if (!fecha) return 'Sin fecha';
      
      let fechaObj;
      // Si la fecha es un objeto Timestamp de Firestore
      if (fecha && typeof fecha.toDate === 'function') {
        fechaObj = fecha.toDate();
      } 
      // Si la fecha es una cadena ISO
      else if (typeof fecha === 'string') {
        fechaObj = new Date(fecha);
      }
      // Si ya es un objeto Date
      else if (fecha instanceof Date) {
        fechaObj = fecha;
      }
      
      // Verificar si la fecha es válida
      if (isNaN(fechaObj.getTime())) {
        return 'Fecha inválida';
      }

      // Ajustar la zona horaria a la hora local de México
      const fechaLocal = new Date(fechaObj.getTime() + (fechaObj.getTimezoneOffset() * 60000));
      
      // Formatear la fecha
      return fechaLocal.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Mexico_City'
      });
    };

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
                  text: `Fecha: ${formatearFecha(embarqueData.fecha)}`,
                  alignment: 'right',
                  margin: [0, 10, 0, 0]
                },
              ]
            }
          ]
        },
        { text: '\n', height: 5 },
        generarTablaRendimientos(datosRendimientos, nombresMedidasPersonalizados, embarqueData)
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
        },
        costoStyle: {
          color: '#e74c3c',
          bold: true
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

function generarTablaRendimientos(datosRendimientos, nombresMedidasPersonalizados, embarqueData) {
  const datosAgrupados = datosRendimientos.reduce((acc, dato) => {
    const nombreMedida = nombresMedidasPersonalizados[dato.medida] || dato.medida;
    
    // Condicional simple para detectar "mixta" o "Mixta"
    if (nombreMedida.includes('mixta') || nombreMedida.includes('Mixta')) {
      if (!acc['Mixta']) {
        acc['Mixta'] = {
          medida: 'Mixta',
          kilosCrudos: 0,
          totalEmbarcado: 0,
          costoFinal: dato.costoFinal
        };
      }
      
      // Sumamos los kilos crudos
      if (dato.kilosCrudos) {
        if (typeof dato.kilosCrudos === 'object') {
          acc['Mixta'].kilosCrudos += 
            (parseFloat(dato.kilosCrudos.medida1) || 0) + 
            (parseFloat(dato.kilosCrudos.medida2) || 0);
        } else {
          acc['Mixta'].kilosCrudos += parseFloat(dato.kilosCrudos) || 0;
        }
      }
      
      // Sumamos el total embarcado
      acc['Mixta'].totalEmbarcado += parseFloat(dato.totalEmbarcado) || 0;
    } else {
      // Si no es mixta, la procesamos normalmente
      acc[nombreMedida] = {
        medida: nombreMedida,
        kilosCrudos: parseFloat(dato.kilosCrudos) || 0,
        totalEmbarcado: parseFloat(dato.totalEmbarcado) || 0,
        costoFinal: dato.costoFinal
      };
    }
    return acc;
  }, {});

  // Verificar si hay al menos un costo final con valor
  const hayCostosFinales = Object.values(datosAgrupados).some(dato => 
    dato.costoFinal && dato.costoFinal !== '0' && dato.costoFinal !== 0
  );

  const mostrarColumnaCosto = embarqueData.mostrarColumnaCosto && hayCostosFinales;

  const body = [
    [
      { text: 'Kilos en Crudo', style: 'tableHeader' },
      { text: 'Medida', style: 'tableHeader' },
      { text: 'Rendimiento', style: 'tableHeader' },
      ...(mostrarColumnaCosto ? [{ text: 'Costo Final', style: 'tableHeader' }] : [])
    ],
    ...Object.values(datosAgrupados).map(dato => {
      const rendimiento = dato.totalEmbarcado > 0 ? dato.kilosCrudos / dato.totalEmbarcado : 0;
      const rendimientoStyle = rendimiento > 1 ? 'rendimientoAlto' : 'rendimientoBajo';
      
      // Preparamos el texto de la medida
      let medidaTexto = dato.medida;
      if (dato.medidasIncluidas) {
        const medidasArray = Array.from(dato.medidasIncluidas);
        medidaTexto = `Mixta (${medidasArray.join(', ')})`;
      }
      
      return [
        formatearKilos(dato.kilosCrudos),
        medidaTexto,
        {
          text: `(${formatearRendimiento(rendimiento)})`,
          style: rendimientoStyle
        },
        ...(mostrarColumnaCosto ? [{
          text: dato.costoFinal ? `$${Number(dato.costoFinal).toFixed(1)}` : '',
          style: 'costoStyle'
        }] : [])
      ];
    })
  ];

  return {
    table: {
      headerRows: 1,
      widths: mostrarColumnaCosto ? ['*', '*', '*', '*'] : ['*', '*', '*'],
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
  if (typeof kilos === 'number') {
    return (kilos % 1 === 0 ? Math.floor(kilos) : kilos.toFixed(1)) + ' kg';
  }
  // Para medidas mixtas que tienen medida1 y medida2
  if (typeof kilos === 'object' && kilos !== null) {
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
