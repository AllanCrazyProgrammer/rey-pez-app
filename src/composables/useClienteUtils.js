/**
 * Composable que proporciona utilidades para trabajar con clientes
 * Incluye funciones para generar colores basados en nombres de clientes
 * y otras utilidades comunes relacionadas con clientes
 */
export function useClienteUtils() {
  /**
   * Genera un color basado en el nombre del cliente
   * @param {string} nombreCliente - Nombre del cliente
   * @returns {string} - Color en formato HSL
   */
  const obtenerColorCliente = (nombreCliente) => {
    if (!nombreCliente) return 'hsl(0, 0%, 80%)';
    
    let hash = 0;
    for (let i = 0; i < nombreCliente.length; i++) {
      hash = nombreCliente.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${hash % 360}, 70%, 60%)`;
    return color;
  };

  /**
   * Determina si el texto debe ser claro u oscuro basado en el nombre del cliente
   * @param {string} nombreCliente - Nombre del cliente
   * @returns {string} - Color del texto (#333 para oscuro, #fff para claro)
   */
  const obtenerColorTextoCliente = (nombreCliente) => {
    if (!nombreCliente) return '#333';
    
    let hash = 0;
    for (let i = 0; i < nombreCliente.length; i++) {
      hash = nombreCliente.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    // Si el tono está en un rango que suele ser claro, usamos texto oscuro
    return (hue > 40 && hue < 200) ? '#333' : '#fff';
  };

  /**
   * Formatea el nombre del cliente para mostrar
   * @param {string} nombreCliente - Nombre del cliente
   * @returns {string} - Nombre formateado
   */
  const formatearNombreCliente = (nombreCliente) => {
    if (!nombreCliente) return '';
    
    // Capitalizar primera letra de cada palabra
    return nombreCliente
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1).toLowerCase())
      .join(' ');
  };

  return {
    obtenerColorCliente,
    obtenerColorTextoCliente,
    formatearNombreCliente
  };
} 