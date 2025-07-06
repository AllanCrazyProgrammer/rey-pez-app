import { formatearPrecio } from '../formatters';

export const generarResumenGananciasTotal = (gananciasCalculadas, gananciasVisiblesMaquila, gananciasVisiblesCrudos) => {
  // Calcular totales por categoría
  const totalGananciasNormales = Object.values(gananciasCalculadas).reduce((total, ganancia) => {
    return total + (ganancia.gananciaTotal || 0);
  }, 0);

  const totalGananciasMaquila = Object.values(gananciasVisiblesMaquila).reduce((total, ganancia) => {
    return total + (ganancia.gananciaTotal || 0);
  }, 0);

  const totalGananciasCrudos = Object.values(gananciasVisiblesCrudos).reduce((total, ganancia) => {
    return total + (ganancia.gananciaTotal || 0);
  }, 0);

  const totalGeneral = totalGananciasNormales + totalGananciasMaquila + totalGananciasCrudos;

  // Si no hay datos, no mostrar nada
  if (totalGeneral === 0) {
    return { text: '', margin: [0, 0, 0, 0] };
  }

  return {
    text: `TOTAL GENERAL: $${formatearPrecio(totalGeneral)}`,
    style: totalGeneral >= 0 ? 'tableTotal' : 'tableTotalNegativo',
    alignment: 'center',
    fontSize: 28,
    margin: [0, 10, 0, 0]
  };
};