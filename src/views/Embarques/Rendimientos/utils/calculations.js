/**
 * Funciones de cálculo para rendimientos
 */

/**
 * Calcular total de bolsas para producto tipo c/h20
 * @param {Object} producto - Objeto producto
 * @returns {number} Total de bolsas
 */
export function calcularTotalBolsas(producto) {
  const reporteTaras = producto.reporteTaras || [];
  const reporteBolsas = producto.reporteBolsas || [];
  let sumaTotalKilos = 0;

  for (let i = 0; i < reporteTaras.length; i++) {
    const taras = parseInt(reporteTaras[i]) || 0;
    const bolsa = parseInt(reporteBolsas[i]) || 0;
    sumaTotalKilos += taras * bolsa;
  }

  return sumaTotalKilos;
}

/**
 * Calcular total de taras
 * @param {Object} producto - Objeto producto
 * @returns {number} Total de taras
 */
export function calcularTotalTaras(producto) {
  const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
  const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
  return tarasNormales + tarasExtra;
}

/**
 * Calcular total de kilos de un producto
 * @param {Object} producto - Objeto producto
 * @returns {number} Total de kilos
 */
export function calcularTotalKilos(producto) {
  if (!producto.kilos) return 0;
  
  const sumaKilos = producto.kilos.reduce((total, kilo) => total + (Number(kilo) || 0), 0);
  const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
  const descuentoTaras = producto.restarTaras ? tarasNormales * 3 : 0;
  
  return sumaKilos - descuentoTaras;
}

/**
 * Calcular kilos de un item de crudo
 * @param {Object} item - Item de crudo
 * @param {number} pesoTaraVenta - Peso de tara para ventas
 * @returns {number} Kilos totales
 */
export function calcularKilosCrudosItem(item, pesoTaraVenta = 20) {
  let kilosTotales = 0;
  
  // Procesar taras principales
  if (item.taras) {
    const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
    if (formatoGuion) {
      const cantidad = parseInt(formatoGuion[1]) || 0;
      let peso = parseInt(formatoGuion[2]) || 0;
      
      if (peso === 19) {
        peso = pesoTaraVenta;
      }
      
      kilosTotales += cantidad * peso;
    } else {
      const [cantidad, peso] = item.taras.split('-').map(Number);
      kilosTotales += (cantidad || 0) * (peso || 0);
    }
  }
  
  // Procesar sobrantes
  if (item.sobrante) {
    const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
    if (formatoGuion) {
      const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
      let pesoSobrante = parseInt(formatoGuion[2]) || 0;
      
      if (pesoSobrante === 19) {
        pesoSobrante = pesoTaraVenta;
      }
      
      kilosTotales += cantidadSobrante * pesoSobrante;
    } else {
      const [cantidadSobrante, pesoSobrante] = item.sobrante.split('-').map(Number);
      kilosTotales += (cantidadSobrante || 0) * (pesoSobrante || 0);
    }
  }
  
  return kilosTotales;
}

/**
 * Verificar si una medida es de tipo mix
 * @param {string} medida - Nombre de la medida
 * @returns {boolean} True si es medida mix
 */
export function esMedidaMix(medida) {
  return medida.toLowerCase().includes('mix');
}

/**
 * Calcular costo final de una medida
 * @param {string} medida - Nombre de la medida
 * @param {Object} embarqueData - Datos del embarque
 * @param {number} rendimiento - Rendimiento calculado
 * @returns {number} Costo final
 */
export function calcularCostoFinal(medida, embarqueData, rendimiento) {
  const costosEmbarque = embarqueData?.costosPorMedida || {};
  const costo = Number(costosEmbarque[medida]) || 0;
  const costoExtra = Number(embarqueData?.costoExtra) || 18;
  
  const esMedidaOzunaMaquila = medida.includes('Maquila Ozuna');
  const esMedidaNumerica = /^\d+\/\d+$/.test(medida.trim()) || /^\d+$/.test(medida.trim());
  
  if (esMedidaOzunaMaquila || !esMedidaNumerica) {
    return Math.round(costo * rendimiento);
  } else {
    return Math.round((costo * rendimiento) + costoExtra);
  }
}

/**
 * Calcular ganancia de maquila
 * @param {string} medida - Nombre de la medida
 * @param {number} totalEmbarcado - Total embarcado
 * @param {number} precioMaquila - Precio de maquila
 * @returns {number} Ganancia de maquila
 */
export function calcularGananciaMaquila(medida, totalEmbarcado, precioMaquila) {
  return totalEmbarcado * (precioMaquila || 0);
}