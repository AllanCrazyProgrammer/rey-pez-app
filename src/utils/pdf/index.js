import pdfMake, { configurarPdfMake, estilosPdf, configuracionDocumento } from './config';
import { loadImageAsBase64, formatearFecha } from './formatters';
import { generarTablaRendimientos } from './generators/rendimientos';
import { generarTablaGanancias } from './generators/ganancias';
import { generarTablaTarasCrudo } from './generators/tarasCrudo';
import { generarResumenGananciasTotal } from './generators/resumen';

// Configurar pdfMake al importar
configurarPdfMake();

export const generarPDFRendimientos = async (
  datosRendimientos, 
  embarqueData, 
  gananciasCalculadas, 
  tarasCrudosPorMedida = {}, 
  gananciasVisiblesCrudos = {}, 
  costosCrudos = {}, 
  configuracionPesos = {}, 
  gananciasVisiblesMaquila = {}
) => {
  try {
    const logoBase64 = await loadImageAsBase64('https://res.cloudinary.com/hwkcovsmr/image/upload/v1620946647/samples/REY_PEZ_LOGO_nsotww.png');
    
    const nombresMedidasPersonalizados = embarqueData?.nombresMedidasPersonalizados || {};

    const docDefinition = {
      content: [
        // PRIMERA PÁGINA - RENDIMIENTOS
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
        generarTablaRendimientos(datosRendimientos, nombresMedidasPersonalizados, embarqueData),
        
        // SALTO DE PÁGINA
        { text: '', pageBreak: 'after' },
        
        // SEGUNDA PÁGINA - RESÚMENES
        generarTablaGanancias(gananciasCalculadas, nombresMedidasPersonalizados, embarqueData, gananciasVisiblesMaquila),
        { text: '\n', height: 10 },
        generarTablaTarasCrudo(tarasCrudosPorMedida, gananciasVisiblesCrudos, costosCrudos, configuracionPesos),
        { text: '\n', height: 10 },
        generarResumenGananciasTotal(gananciasCalculadas, gananciasVisiblesMaquila, gananciasVisiblesCrudos)
      ],
      styles: estilosPdf,
      ...configuracionDocumento
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