import { entregarPdf } from './delivery';
import pdfMake, { configurarPdfMake, estilosPdf, configuracionDocumento } from './config';
import { loadImageAsBase64, formatearFecha } from './formatters';
import { generarTablaRendimientos } from './generators/rendimientos';
import { generarTablaGanancias } from './generators/ganancias';
import { generarTablaTarasCrudo } from './generators/tarasCrudo';
import { generarResumenGananciasTotal } from './generators/resumen';
import {
  buildResumenMedidasSacadaContent,
  estilosResumenMedidasSacada,
  normalizarGruposListaMedidasParaPdf,
  TITULO_RESUMEN_MEDIDAS_DESDE_RENDIMIENTOS
} from './sacadas';

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
  gananciasVisiblesMaquila = {},
  gruposListaMedidasDiaEmbarque = null
) => {
  try {
    // Rendimientos debe poder generarse con los datos locales, aunque no haya internet.
    let logoBase64 = '';
    try {
      logoBase64 = await loadImageAsBase64(`${process.env.BASE_URL}pdf/rey-pez.png`);
    } catch (logoError) {
      console.warn('[Rendimientos PDF] Logo remoto no disponible; se generará sin logo.', logoError);
    }
    
    const nombresMedidasPersonalizados = embarqueData?.nombresMedidasPersonalizados || {};

    const gruposResumenSacada = Array.isArray(gruposListaMedidasDiaEmbarque)
      ? normalizarGruposListaMedidasParaPdf(gruposListaMedidasDiaEmbarque)
      : [];
    const incluirPaginaResumenSacada = gruposResumenSacada.length > 0;
    const fechaTextoEmbarque = formatearFecha(embarqueData?.fecha);

    const contenidoTrasRendimientos = incluirPaginaResumenSacada
      ? [
          { text: '', pageBreak: 'after' },
          ...buildResumenMedidasSacadaContent({
            fecha: fechaTextoEmbarque,
            grupos: gruposResumenSacada,
            tituloPrincipal: TITULO_RESUMEN_MEDIDAS_DESDE_RENDIMIENTOS
          }),
          { text: '', pageBreak: 'after' }
        ]
      : [{ text: '', pageBreak: 'after' }];

    const docDefinition = {
      content: [
        // PRIMERA PÁGINA - RENDIMIENTOS
        {
          columns: [
            ...(logoBase64 ? [{
              image: logoBase64,
              width: 80,
              alignment: 'left',
              margin: [0, 0, 0, 5]
            }] : []),
            {
              text: 'Reporte de Rendimientos',
              style: 'header',
              alignment: 'center',
              margin: [0, 10, 0, 0]
            },
            {
              stack: [
                {
                  text: `Fecha: ${fechaTextoEmbarque}`,
                  alignment: 'right',
                  margin: [0, 10, 0, 0]
                },
              ]
            }
          ]
        },
        { text: '\n', height: 5 },
        generarTablaRendimientos(datosRendimientos, nombresMedidasPersonalizados, embarqueData),
        ...contenidoTrasRendimientos,
        // Página(s) de resúmenes (ganancias, taras)
        generarTablaGanancias(gananciasCalculadas, nombresMedidasPersonalizados, embarqueData, gananciasVisiblesMaquila),
        { text: '\n', height: 10 },
        generarTablaTarasCrudo(tarasCrudosPorMedida, gananciasVisiblesCrudos, costosCrudos, configuracionPesos),
        { text: '\n', height: 10 },
        generarResumenGananciasTotal(gananciasCalculadas, gananciasVisiblesMaquila, gananciasVisiblesCrudos)
      ],
      styles: { ...estilosPdf, ...estilosResumenMedidasSacada },
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

    await entregarPdf(pdfMake.createPdf(docDefinition), 'rendimientos.pdf', 'open');
  } catch (error) {
    console.error('Error al generar el PDF de rendimientos:', error);
    throw error;
  }
};
