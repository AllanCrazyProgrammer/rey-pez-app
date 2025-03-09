/**
 * Composable que proporciona funciones de cálculo para embarques
 * Incluye funciones para calcular totales, taras, kilos, etc.
 */
import { computed } from 'vue';

export function useEmbarqueCalculos(items) {
  /**
   * Calcula el total de taras para productos limpios
   * @returns {number} - Total de taras limpias
   */
  const calcularTarasLimpio = () => {
    return items
      .filter(item => item.tipo && item.tipo.toLowerCase().includes('limpio'))
      .reduce((total, item) => total + item.cantidad, 0);
  };

  /**
   * Calcula el total de taras para productos crudos
   * @returns {number} - Total de taras crudas
   */
  const calcularTarasCrudo = () => {
    return items
      .filter(item => item.tipo && item.tipo.toLowerCase().includes('crudo'))
      .reduce((total, item) => total + item.cantidad, 0);
  };

  /**
   * Calcula el total de todas las taras
   * @returns {number} - Total de taras
   */
  const calcularTotalTaras = () => {
    return calcularTarasLimpio() + calcularTarasCrudo();
  };

  /**
   * Calcula el total de kilos para productos limpios
   * @returns {number} - Total de kilos limpios
   */
  const calcularKilosLimpio = () => {
    return items
      .filter(item => item.tipo && item.tipo.toLowerCase().includes('limpio'))
      .reduce((total, item) => {
        // Si tiene camaronNeto, aplicar el porcentaje
        if (item.camaronNeto) {
          return total + (item.kilos * item.camaronNeto);
        }
        return total + item.kilos;
      }, 0);
  };

  /**
   * Calcula el total de kilos para productos crudos
   * @returns {number} - Total de kilos crudos
   */
  const calcularKilosCrudo = () => {
    return items
      .filter(item => item.tipo && item.tipo.toLowerCase().includes('crudo'))
      .reduce((total, item) => {
        // Si tiene camaronNeto, aplicar el porcentaje
        if (item.camaronNeto) {
          return total + (item.kilos * item.camaronNeto);
        }
        return total + item.kilos;
      }, 0);
  };

  /**
   * Calcula el total de todos los kilos
   * @returns {number} - Total de kilos
   */
  const calcularTotalKilos = () => {
    return calcularKilosLimpio() + calcularKilosCrudo();
  };

  /**
   * Calcula el total de precio para todos los productos
   * @returns {number} - Total de precio
   */
  const calcularTotalPrecio = () => {
    return items.reduce((total, item) => total + item.total, 0);
  };

  /**
   * Genera un resumen por cliente
   * @returns {Object} - Objeto con resumen por cliente
   */
  const generarResumenPorCliente = () => {
    const resumen = {};
    
    items.forEach(item => {
      if (!resumen[item.cliente]) {
        resumen[item.cliente] = {
          kilos: 0,
          total: 0,
          cantidad: 0
        };
      }
      
      resumen[item.cliente].kilos += item.kilos;
      resumen[item.cliente].total += item.total;
      resumen[item.cliente].cantidad += item.cantidad;
    });
    
    return resumen;
  };

  return {
    calcularTarasLimpio,
    calcularTarasCrudo,
    calcularTotalTaras,
    calcularKilosLimpio,
    calcularKilosCrudo,
    calcularTotalKilos,
    calcularTotalPrecio,
    generarResumenPorCliente
  };
} 