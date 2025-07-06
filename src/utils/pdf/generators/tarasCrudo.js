import { formatearPrecio } from '../formatters.js';
import { layoutTablaConTotal } from '../config.js';

export const generarTablaTarasCrudo = (tarasCrudosPorMedida, gananciasVisiblesCrudos = {}, costosCrudos = {}, configuracionPesos = {}) => {
  if (!tarasCrudosPorMedida || Object.keys(tarasCrudosPorMedida).length === 0) {
    return {
      text: 'No hay datos de taras de crudo disponibles',
      style: 'header',
      alignment: 'center',
      margin: [0, 10, 0, 10]
    };
  }

  // Obtener pesos configurados o usar valores por defecto
  const pesoTaraCosto = configuracionPesos.pesoTaraCosto || 19;
  const pesoTaraVenta = configuracionPesos.pesoTaraVenta || 20;

  // Función para calcular kilos usando un peso específico
  const calcularKilosConPeso = (medida, pesoTara) => {
    const data = tarasCrudosPorMedida[medida];
    if (!data || !data.detalles) return 0;

    let totalKilos = 0;
    data.detalles.forEach(detalle => {
      // Procesar taras principales
      if (detalle.taras) {
        const formatoGuion = /^(\d+)-(\d+)$/.exec(detalle.taras);
        if (formatoGuion) {
          const cantidad = parseInt(formatoGuion[1]) || 0;
          let peso = parseInt(formatoGuion[2]) || 0;
          
          // Si el peso original es 19, usar el peso configurado
          if (peso === 19) {
            peso = pesoTara;
          }
          
          totalKilos += cantidad * peso;
        }
      }

      // Procesar sobrantes
      if (detalle.sobrante) {
        const formatoGuion = /^(\d+)-(\d+)$/.exec(detalle.sobrante);
        if (formatoGuion) {
          const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
          let pesoSobrante = parseInt(formatoGuion[2]) || 0;
          
          // Si el peso original es 19, usar el peso configurado
          if (pesoSobrante === 19) {
            pesoSobrante = pesoTara;
          }
          
          totalKilos += cantidadSobrante * pesoSobrante;
        }
      }
    });

    return totalKilos;
  };

  // Calcular totales para costos (usando peso de costo)
  const totalKilosCosto = Object.keys(tarasCrudosPorMedida).reduce((total, medida) => {
    return total + calcularKilosConPeso(medida, pesoTaraCosto);
  }, 0);

  // Calcular totales para ventas (usando peso de venta)
  const totalKilosVenta = Object.keys(tarasCrudosPorMedida).reduce((total, medida) => {
    return total + calcularKilosConPeso(medida, pesoTaraVenta);
  }, 0);

  // Calcular total de ganancias
  const totalGanancias = Object.entries(tarasCrudosPorMedida).reduce((total, [medida, data]) => {
    const gananciaCrudo = gananciasVisiblesCrudos[medida];
    const costoCrudo = costosCrudos[medida];
    
    if (gananciaCrudo && costoCrudo) {
      const kilosVenta = calcularKilosConPeso(medida, pesoTaraVenta);
      const kilosCosto = calcularKilosConPeso(medida, pesoTaraCosto);
      
      if (kilosVenta > 0 && kilosCosto > 0) {
        const ingresoTotal = gananciaCrudo.precioVenta * kilosVenta;
        const costoTotal = costoCrudo.costoFinal * kilosCosto;
        const gananciaTotal = ingresoTotal - costoTotal;
        return total + gananciaTotal;
      }
    }
    return total;
  }, 0);

  const body = [
    [
      { text: 'Medida', style: 'tableHeader' },
      { text: 'Kilos', style: 'tableHeader' },
      { text: 'Precio', style: 'tableHeader' },
      { text: 'Costo', style: 'tableHeader' },
      { text: 'Ganancia', style: 'tableHeader' }
    ],
    ...Object.entries(tarasCrudosPorMedida).map(([medida, data]) => {
      // Calcular kilos para venta y costo por separado
      const kilosVenta = calcularKilosConPeso(medida, pesoTaraVenta);
      const kilosCosto = calcularKilosConPeso(medida, pesoTaraCosto);
      
      // Obtener el precio desde las ganancias de crudos
      const gananciaCrudo = gananciasVisiblesCrudos[medida];
      const precio = gananciaCrudo ? gananciaCrudo.precioVenta : null;
      
      // Obtener el costo desde los costos de crudos
      const costoCrudo = costosCrudos[medida];
      const costo = costoCrudo ? costoCrudo.costoFinal : null;
      
      // Calcular ganancia total para esta medida
      let gananciaTotal = null;
      if (precio && costo && kilosVenta > 0 && kilosCosto > 0) {
        const ingresoTotal = precio * kilosVenta;
        const costoTotal = costo * kilosCosto;
        gananciaTotal = ingresoTotal - costoTotal;
      }
      
      return [
        medida,
        {
          stack: [
            {
              text: `Kilos C: ${Math.floor(kilosCosto)} kg`,
              fontSize: 14,
              alignment: 'center',
              margin: [0, 0, 0, 2]
            },
            {
              text: `Kilos V: ${Math.floor(kilosVenta)} kg`,
              fontSize: 14,
              alignment: 'center'
            }
          ],
          alignment: 'center'
        },
        {
          text: precio ? `$${formatearPrecio(precio)}` : 'N/A',
          alignment: 'center',
          style: precio ? 'gananciaPositiva' : 'rendimientoBajo'
        },
        {
          text: costo ? `$${costo.toFixed(2)}` : 'N/A',
          alignment: 'center',
          style: costo ? 'costoStyle' : 'rendimientoBajo'
        },
        {
          text: gananciaTotal !== null ? `$${formatearPrecio(gananciaTotal)}` : 'N/A',
          alignment: 'center',
          style: gananciaTotal !== null ? (gananciaTotal >= 0 ? 'gananciaPositiva' : 'gananciaNegativa') : 'rendimientoBajo'
        }
      ];
    }),
    // Fila del total
    [
      { text: 'TOTAL', style: 'tableTotal' },
      {
        stack: [
          {
            text: `Kilos C: ${Math.floor(totalKilosCosto)} kg`,
            fontSize: 14,
            alignment: 'center',
            margin: [0, 0, 0, 2],
            bold: true
          },
          {
            text: `Kilos V: ${Math.floor(totalKilosVenta)} kg`,
            fontSize: 14,
            alignment: 'center',
            bold: true
          }
        ],
        alignment: 'center',
        fillColor: '#e8f4f8'
      },
      { text: '', style: 'tableTotal', alignment: 'center' },
      { text: '', style: 'tableTotal', alignment: 'center' },
      { 
        text: `$${formatearPrecio(totalGanancias)}`, 
        style: totalGanancias >= 0 ? 'tableTotal' : 'tableTotalNegativo', 
        alignment: 'center' 
      }
    ]
  ];

  return {
    stack: [
      {
        text: 'Resumen de Crudos',
        style: 'header',
        alignment: 'center',
        margin: [0, 0, 0, 10]
      },
      {
        table: {
          headerRows: 1,
          widths: ['25%', '20%', '18%', '18%', '19%'],
          body: body
        },
        layout: layoutTablaConTotal
      }
    ]
  };
};