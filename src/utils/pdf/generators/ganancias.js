import { formatearPrecio, formatearNumero } from '../formatters';
import { layoutTablaConTotal } from '../config';

export const generarTablaGanancias = (gananciasCalculadas, nombresMedidasPersonalizados, embarqueData, gananciasVisiblesMaquila = {}) => {
  // Verificar si hay datos de ganancias normales o de maquila
  const tieneGananciasNormales = gananciasCalculadas && Object.keys(gananciasCalculadas).length > 0;
  const tieneGananciasMaquila = gananciasVisiblesMaquila && Object.keys(gananciasVisiblesMaquila).length > 0;

  if (!tieneGananciasNormales && !tieneGananciasMaquila) {
    return {
      text: 'No hay datos de ganancias disponibles',
      style: 'header',
      alignment: 'center',
      margin: [0, 10, 0, 10]
    };
  }

  // Filtrar medidas que no estén ocultas
  const medidasOcultas = embarqueData?.medidaOculta || {};
  const gananciasVisibles = tieneGananciasNormales ? 
    Object.entries(gananciasCalculadas).filter(([medida]) => !medidasOcultas[medida]) : [];

  // Preparar las filas de ganancias normales
  const filasGananciasNormales = gananciasVisibles.map(([medida, ganancia]) => {
    const nombreMedida = nombresMedidasPersonalizados[medida] || medida;
    const gananciaUnitaria = ganancia.gananciaUnitaria || 0;
    const gananciaTotal = ganancia.gananciaTotal || 0;
    const totalEmbarcado = ganancia.totalEmbarcado || 0;
    const precioVenta = ganancia.precioVenta || 0;
    const costoBase = ganancia.costoBase || 0;
    const costoFinal = ganancia.costoFinal || 0;
    
    return [
      nombreMedida,
      `${formatearNumero(totalEmbarcado)} kg`,
      {
        stack: [
          {
            text: `Compra: $${formatearPrecio(costoBase)}`,
            fontSize: 14,
            alignment: 'center',
            margin: [0, 0, 0, 2],
            color: '#e74c3c'
          },
          {
            text: `Costo Final: $${formatearPrecio(costoFinal)}`,
            fontSize: 14,
            alignment: 'center',
            margin: [0, 0, 0, 2],
            color: '#f39c12'
          },
          {
            text: `Venta: $${formatearPrecio(precioVenta)}`,
            fontSize: 14,
            alignment: 'center',
            color: '#27ae60'
          }
        ],
        alignment: 'center'
      },
      {
        text: `$${formatearPrecio(gananciaUnitaria)}`,
        style: gananciaUnitaria >= 0 ? 'gananciaPositiva' : 'gananciaNegativa'
      },
      {
        text: `$${formatearPrecio(gananciaTotal)}`,
        style: gananciaTotal >= 0 ? 'gananciaPositiva' : 'gananciaNegativa'
      }
    ];
  });

  // Preparar las filas de ganancias de maquila
  const filasGananciasMaquila = Object.entries(gananciasVisiblesMaquila).map(([medida, ganancia]) => {
    const nombreMedida = nombresMedidasPersonalizados[medida] || medida;
    const precioMaquila = ganancia.precioMaquila || 0;
    const gananciaTotal = ganancia.gananciaTotal || 0;
    const totalEmbarcado = ganancia.totalEmbarcado || 0;
    
    return [
      `${nombreMedida} (Maquila)`,
      `${formatearNumero(totalEmbarcado)} kg`,
      {
        stack: [
          {
            text: `Compra: N/A`,
            fontSize: 14,
            alignment: 'center',
            margin: [0, 0, 0, 2],
            color: '#6c757d'
          },
          {
            text: `Venta: $${formatearPrecio(precioMaquila)}`,
            fontSize: 14,
            alignment: 'center',
            color: '#27ae60'
          }
        ],
        alignment: 'center'
      },
      {
        text: `$${formatearPrecio(precioMaquila)}`,
        style: 'gananciaPositiva'
      },
      {
        text: `$${formatearPrecio(gananciaTotal)}`,
        style: 'gananciaPositiva'
      }
    ];
  });

  // Calcular totales
  const totalGananciasNormales = gananciasVisibles.reduce((total, [medida, ganancia]) => {
    return total + (ganancia.gananciaTotal || 0);
  }, 0);

  const totalGananciasMaquila = Object.values(gananciasVisiblesMaquila).reduce((total, ganancia) => {
    return total + (ganancia.gananciaTotal || 0);
  }, 0);

  const totalGeneral = totalGananciasNormales + totalGananciasMaquila;

  // Si no hay datos para mostrar después del filtro
  if (filasGananciasNormales.length === 0 && filasGananciasMaquila.length === 0) {
    return {
      text: 'No hay datos de ganancias para mostrar',
      style: 'header',
      alignment: 'center',
      margin: [0, 10, 0, 10]
    };
  }

  const body = [
    [
      { text: 'Medida', style: 'tableHeader' },
      { text: 'Kilos', style: 'tableHeader' },
      { text: 'Precios', style: 'tableHeader' },
      { text: 'Ganancia/kg', style: 'tableHeader' },
      { text: 'Ganancia Total', style: 'tableHeader' }
    ],
    ...filasGananciasNormales,
    ...filasGananciasMaquila,
    // Fila del total
    [
      { text: 'TOTAL GANANCIAS', style: 'tableTotal' },
      { text: '', style: 'tableTotal' },
      { text: '', style: 'tableTotal' },
      { text: '', style: 'tableTotal' },
      { 
        text: `$${formatearPrecio(totalGeneral)}`, 
        style: totalGeneral >= 0 ? 'tableTotal' : 'tableTotalNegativo' 
      }
    ]
  ];

  return {
    stack: [
      {
        text: 'Resumen de limpios',
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: ['25%', '15%', '25%', '15%', '20%'],
          body: body
        },
        layout: layoutTablaConTotal
      }
    ]
  };
};