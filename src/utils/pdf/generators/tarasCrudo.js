import { formatearPrecio } from '../formatters';
import { layoutTablaConTotal } from '../config';

export const generarTablaTarasCrudo = (tarasCrudosPorMedida, gananciasVisiblesCrudos = {}) => {
  // No mostrar la tabla si no hay ganancias de crudos para analizar
  if (Object.keys(gananciasVisiblesCrudos).length === 0) {
    return { text: '' };
  }

  // Calcular totales a partir de los datos ya calculados en el componente
  const totalGanancias = Object.values(gananciasVisiblesCrudos).reduce((total, ganancia) => {
    return total + (ganancia.gananciaTotal || 0);
  }, 0);

  const totalKilosCosto = Object.values(gananciasVisiblesCrudos).reduce((total, ganancia) => {
    return total + (ganancia.totalKilosCosto || 0);
  }, 0);
  
  const totalKilosVenta = Object.values(gananciasVisiblesCrudos).reduce((total, ganancia) => {
    return total + (ganancia.totalKilos || 0); // 'totalKilos' corresponde a Kilos Venta
  }, 0);

  const body = [
    [
      { text: 'Medida', style: 'tableHeader' },
      { text: 'Kilos', style: 'tableHeader' },
      { text: 'Precio', style: 'tableHeader' },
      { text: 'Costo', style: 'tableHeader' },
      { text: 'Ganancia', style: 'tableHeader' }
    ],
    ...Object.entries(gananciasVisiblesCrudos).map(([medida, gananciaCrudo]) => {
      
      const kilosVenta = gananciaCrudo.totalKilos || 0;
      const kilosCosto = gananciaCrudo.totalKilosCosto || 0;
      const precio = gananciaCrudo.precioVenta || 0;
      const costo = gananciaCrudo.costoBase || 0;
      const gananciaTotal = gananciaCrudo.gananciaTotal;
      
      return [
        medida,
        {
          stack: [
            { text: `Kilos C: ${Math.floor(kilosCosto)} kg`, fontSize: 14, alignment: 'center', margin: [0, 0, 0, 2] },
            { text: `Kilos V: ${Math.floor(kilosVenta)} kg`, fontSize: 14, alignment: 'center' }
          ],
          alignment: 'center'
        },
        { text: `$${formatearPrecio(precio)}`, alignment: 'center', style: 'gananciaPositiva' },
        { text: `$${costo.toFixed(1)}`, alignment: 'center', style: 'costoStyle' },
        {
          text: `$${formatearPrecio(gananciaTotal)}`,
          alignment: 'center',
          style: gananciaTotal >= 0 ? 'gananciaPositiva' : 'gananciaNegativa'
        }
      ];
    }),
    // Fila del total
    [
      { text: 'TOTAL', style: 'tableTotal' },
      {
        stack: [
          { text: `Kilos C: ${Math.floor(totalKilosCosto)} kg`, fontSize: 14, alignment: 'center', margin: [0, 0, 0, 2], bold: true },
          { text: `Kilos V: ${Math.floor(totalKilosVenta)} kg`, fontSize: 14, alignment: 'center', bold: true }
        ],
        alignment: 'center',
        fillColor: '#e8f4f8'
      },
      { text: '', style: 'tableTotal' },
      { text: '', style: 'tableTotal' },
      { 
        text: `$${formatearPrecio(totalGanancias)}`, 
        style: totalGanancias >= 0 ? 'tableTotal' : 'tableTotalNegativo', 
        alignment: 'center' 
      }
    ]
  ];

  return {
    stack: [
      { text: 'Resumen de Crudos', style: 'header', alignment: 'center', margin: [0, 0, 0, 10] },
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