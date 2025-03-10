/**
 * Composable que proporciona utilidades para trabajar con clientes
 * Incluye funciones para generar colores basados en nombres de clientes
 * y otras utilidades comunes relacionadas con clientes
 */
export function useClienteUtils() {
  /**
   * Colores específicos para clientes predefinidos
   * @type {Object}
   */
  const COLORES_CLIENTES = {
    'Joselito': '#3498db', // Azul
    'Catarro': '#e74c3c',  // Rojo
    'Ozuna': '#2ecc71',    // Verde
    'Otilio': '#f1c40f'    // Amarillo
  };
  
  /**
   * Genera un color basado en el nombre del cliente
   * @param {string} nombreCliente - Nombre del cliente
   * @returns {string} - Color en formato HSL o hexadecimal para clientes predefinidos
   */
  const obtenerColorCliente = (nombreCliente) => {
    if (!nombreCliente) return 'hsl(0, 0%, 80%)';
    
    // Verificar si es un cliente con color predefinido
    if (COLORES_CLIENTES[nombreCliente]) {
      return COLORES_CLIENTES[nombreCliente];
    }
    
    // Para otros clientes, generar color dinámicamente
    let hash = 0;
    for (let i = 0; i < nombreCliente.length; i++) {
      hash = nombreCliente.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = `hsl(${hash % 360}, 70%, 60%)`;
    return color;
  };

  /**
   * Determina si el texto debe ser claro u oscuro basado en el color de fondo
   * @param {string} nombreCliente - Nombre del cliente
   * @returns {string} - Color del texto (#333 para oscuro, #fff para claro)
   */
  const obtenerColorTextoCliente = (nombreCliente) => {
    if (!nombreCliente) return '#333';

    // Para clientes predefinidos, definir colores de texto específicos
    if (nombreCliente === 'Joselito') return '#ffffff'; // Texto blanco para fondo azul
    if (nombreCliente === 'Catarro') return '#ffffff';  // Texto blanco para fondo rojo
    if (nombreCliente === 'Ozuna') return '#ffffff';    // Texto blanco para fondo verde
    if (nombreCliente === 'Otilio') return '#333333';   // Texto negro para fondo amarillo
    
    // Para otros clientes, calcular dinámicamente
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
    formatearNombreCliente,
    COLORES_CLIENTES
  };
} 