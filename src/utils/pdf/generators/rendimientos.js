import { formatearKilos, formatearRendimiento } from '../formatters.js';
import { layoutTabla } from '../config.js';

export const generarTablaRendimientos = (datosRendimientos, nombresMedidasPersonalizados, embarqueData) => {
  const datosAgrupados = datosRendimientos.reduce((acc, dato) => {
    const nombreMedida = nombresMedidasPersonalizados[dato.medida] || dato.medida;
    
    // Condicional simple para detectar "mixta" o "Mixta"
    if (nombreMedida.includes('mixta') || nombreMedida.includes('Mixta')) {
      if (!acc['Mixta']) {
        acc['Mixta'] = {
          medida: 'Mixta',
          kilosCrudos: 0,
          totalEmbarcado: 0,
          costoFinal: 0
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
      
      // Sumamos el costo final
      acc['Mixta'].costoFinal += parseFloat(dato.costoFinal) || 0;
    } else {
      // Si no es mixta, la procesamos normalmente
      acc[nombreMedida] = {
        medida: nombreMedida,
        kilosCrudos: parseFloat(dato.kilosCrudos) || 0,
        totalEmbarcado: parseFloat(dato.totalEmbarcado) || 0,
        costoFinal: dato.costoFinal || 0
      };
    }
    return acc;
  }, {});

  // Siempre mostrar la columna de costos si está habilitada
  const mostrarColumnaCosto = embarqueData.mostrarColumnaCosto;

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
          text: dato.costoFinal ? `$${Number(dato.costoFinal).toFixed(1)}` : '$0.0',
          style: 'costoStyle'
        }] : [])
      ];
    })
  ];

  return {
    table: {
      headerRows: 1,
      widths: mostrarColumnaCosto ? ['25%', '25%', '25%', '25%'] : ['35%', '35%', '30%'],
      body: body
    },
    layout: layoutTabla
  };
};