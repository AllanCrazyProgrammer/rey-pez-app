import { formatearKilos, formatearRendimiento } from '../formatters';
import { layoutTabla } from '../config';

export const generarTablaRendimientos = (datosRendimientos, nombresMedidasPersonalizados, embarqueData) => {
  const datosAgrupados = datosRendimientos.reduce((acc, dato) => {
    const nombreMedida = nombresMedidasPersonalizados[dato.medida] || dato.medida;
    const tieneCosto = Boolean(dato?.incluyeCostoFinal);
    const costoNumerico = Number(dato?.costoFinal);
    
    // Detectar si es maquila de Ozuna
    const esMaquilaOzuna = nombreMedida.includes('Maquila Ozuna');
    const medidaBase = esMaquilaOzuna ? nombreMedida.replace(' Maquila Ozuna', '') : nombreMedida;
    
    // Crear una clave única que distinga entre maquila y venta
    const claveAgrupacion = esMaquilaOzuna ? `${medidaBase}_MAQUILA_OZUNA` : nombreMedida;
    
    // Condicional simple para detectar "mixta" o "Mixta"
    if (medidaBase.includes('mixta') || medidaBase.includes('Mixta')) {
      const claveMixta = esMaquilaOzuna ? 'Mixta_MAQUILA_OZUNA' : 'Mixta';
      
      if (!acc[claveMixta]) {
        acc[claveMixta] = {
          medida: medidaBase,
          kilosCrudos: 0,
          totalEmbarcado: 0,
          costoFinal: 0,
          incluyeCostoFinal: false,
          esMaquilaOzuna: esMaquilaOzuna
        };
      }
      
      // Sumamos los kilos crudos
      if (dato.kilosCrudos) {
        if (typeof dato.kilosCrudos === 'object') {
          acc[claveMixta].kilosCrudos += 
            (parseFloat(dato.kilosCrudos.medida1) || 0) + 
            (parseFloat(dato.kilosCrudos.medida2) || 0);
        } else {
          acc[claveMixta].kilosCrudos += parseFloat(dato.kilosCrudos) || 0;
        }
      }
      
      // Sumamos el total embarcado
      acc[claveMixta].totalEmbarcado += parseFloat(dato.totalEmbarcado) || 0;
      
      // Sumamos el costo final solo cuando corresponde mostrarlo
      if (tieneCosto && Number.isFinite(costoNumerico)) {
        acc[claveMixta].costoFinal += costoNumerico;
        acc[claveMixta].incluyeCostoFinal = true;
      }
    } else {
      // Si no es mixta, la procesamos normalmente con la clave única
      acc[claveAgrupacion] = {
        medida: medidaBase,
        kilosCrudos: parseFloat(dato.kilosCrudos) || 0,
        totalEmbarcado: parseFloat(dato.totalEmbarcado) || 0,
        costoFinal: tieneCosto && Number.isFinite(costoNumerico) ? costoNumerico : null,
        incluyeCostoFinal: tieneCosto && Number.isFinite(costoNumerico),
        esMaquilaOzuna: esMaquilaOzuna
      };
    }
    return acc;
  }, {});

  const valoresAgrupados = Object.values(datosAgrupados);
  const hayCostosVisibles = valoresAgrupados.some(dato => dato.incluyeCostoFinal);

  // Verificar si todos los costos visibles son 0 para decidir si mostrar la columna
  const todosCostosEsCero = hayCostosVisibles && valoresAgrupados.every(dato => 
    !dato.incluyeCostoFinal || Number(dato.costoFinal) === 0
  );
  
  // Solo mostrar la columna de costos si está habilitada y hay valores que mostrar
  const mostrarColumnaCosto = embarqueData.mostrarColumnaCosto && hayCostosVisibles && !todosCostosEsCero;

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
      
      // Agregar etiqueta de maquila si corresponde
      if (dato.esMaquilaOzuna) {
        medidaTexto = `${medidaTexto} (Maquila)`;
      }
      
      return [
        formatearKilos(dato.kilosCrudos),
        medidaTexto,
        {
          text: `(${formatearRendimiento(rendimiento)})`,
          style: rendimientoStyle
        },
        ...(mostrarColumnaCosto ? [{
          text: dato.incluyeCostoFinal ? `$${Number(dato.costoFinal || 0).toFixed(1)}` : '',
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
