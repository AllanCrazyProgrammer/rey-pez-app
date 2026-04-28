/**
 * Funciones de formateo para los datos de rendimientos
 */

/**
 * Formatear precio con separador de miles
 * @param {number} precio - Precio a formatear
 * @returns {string} Precio formateado
 */
export function formatearPrecio(precio) {
  if (!precio) return '0';
  const numeroRedondeado = Math.round(precio);
  return numeroRedondeado.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formatear precio conservando decimales
 * @param {number} precio - Precio a formatear
 * @param {number} decimales - Cantidad de decimales a mostrar
 * @returns {string} Precio formateado
 */
export function formatearPrecioConDecimales(precio, decimales = 2) {
  const numero = Number(precio) || 0;
  const [enteros, fraccion] = numero.toFixed(decimales).split('.');
  const enterosFormateados = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${enterosFormateados}.${fraccion}`;
}

/**
 * Formatear número eliminando decimales y agregando separador de miles
 * @param {number} numero - Número a formatear
 * @returns {string} Número formateado
 */
export function formatearNumero(numero) {
  if (!numero) return '0';
  const numeroSinDecimales = Math.floor(numero);
  return numeroSinDecimales.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formatear fecha a formato español
 * @param {string} fechaString - Fecha en formato string
 * @returns {string} Fecha formateada
 */
export function formatearFecha(fechaString) {
  if (!fechaString) return '';
  const fecha = new Date(fechaString);
  return fecha.toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}