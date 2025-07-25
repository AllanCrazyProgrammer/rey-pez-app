/**
 * Funciones utilitarias para manejar precios históricos
 */
import { 
  normalizarFechaISO, 
  obtenerFechaActualISO, 
  esFechaValida 
} from './dateUtils';

/**
 * Normaliza una medida para comparación
 */
export const normalizarMedida = (medida) => {
  if (!medida) return '';
  return medida.toString()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\[\]()]/g, '')
    .replace(/-/g, '/')
    .trim();
};

/**
 * Filtra precios por fecha del embarque
 * 
 * IMPORTANTE: Incluye modificaciones del mismo día del embarque
 * Ejemplo: Si el embarque es del 15-01-2025 y hay precios modificados 
 * ese mismo día, usará el precio más reciente del 15-01-2025
 * 
 * @param {Array} preciosActuales - Array de precios disponibles  
 * @param {string} fechaEmbarque - Fecha del embarque (YYYY-MM-DD)
 * @param {string} clienteId - ID del cliente (opcional, para precios específicos)
 * @returns {Map} - Mapa con los precios relevantes por medida normalizada
 */
export const obtenerPreciosParaFecha = (preciosActuales, fechaEmbarque, clienteId = null) => {
  if (!Array.isArray(preciosActuales)) {
    console.warn('[PRECIOS] preciosActuales no es un array válido');
    return new Map();
  }
  
  // Si no hay fecha del embarque, usar la fecha actual como fallback
  if (!fechaEmbarque) {
    console.warn('[PRECIOS] No hay fecha del embarque, usando fecha actual como fallback');
    fechaEmbarque = obtenerFechaActualISO();
  }

  // Normalizar la fecha del embarque
  const fechaLimiteISO = normalizarFechaISO(fechaEmbarque);
  
  console.log(`[PRECIOS] Filtrando precios para fecha embarque: ${fechaLimiteISO}, cliente: ${clienteId || 'general'}`);
  console.log(`[PRECIOS] Incluirá precios hasta la fecha del embarque (inclusive) para capturar modificaciones del mismo día`);
  console.log(`[PRECIOS] Total de precios a evaluar: ${preciosActuales.length}`);
  
  // Mapa para almacenar los precios más recientes por medida
  const preciosPorMedida = new Map();
  // Mapa para precios específicos del cliente
  const preciosEspecificos = new Map();
  
  // Ordenar precios por fecha y luego por timestamp para garantizar orden correcto
  const preciosOrdenados = [...preciosActuales].sort((a, b) => {
    // Normalizar fechas para comparación
    const fechaA = normalizarFechaISO(a.fecha);
    const fechaB = normalizarFechaISO(b.fecha);
    
    if (fechaA !== fechaB) {
      return fechaA < fechaB ? -1 : 1; // Más antiguos primero
    }
    
    // Si misma fecha, ordenar por timestamp (más recientes al final)
    const timestampA = a.timestamp || 0;
    const timestampB = b.timestamp || 0;
    return timestampA - timestampB;
  });
  
  console.log(`[PRECIOS] Precios ordenados por fecha y timestamp:`, preciosOrdenados.map(p => ({
    producto: p.producto,
    fecha: p.fecha,
    precio: p.precio,
    timestamp: p.timestamp,
    clienteId: p.clienteId
  })));
  
  // Filtrar y organizar precios (ahora usando el array ordenado)
  preciosOrdenados.forEach(precio => {
    if (!precio.fecha || !precio.producto) return;
    
    const fechaPrecioISO = normalizarFechaISO(precio.fecha);
    
    // Usar la nueva utilidad para validar fechas
    if (esFechaValida(fechaPrecioISO, fechaLimiteISO)) {
      const medidaNormalizada = normalizarMedida(precio.producto);
      
              // Si es un precio específico para este cliente, tiene prioridad
        if (precio.clienteId === clienteId) {
          const precioExistente = preciosEspecificos.get(medidaNormalizada);
          
          // Debido al ordenamiento, siempre actualizar si:
          // 1. No existe precio previo
          // 2. Es una fecha más reciente 
          // 3. Es la misma fecha (será más reciente por el ordenamiento)
          if (!precioExistente || fechaPrecioISO >= precioExistente.fecha) {
            
            const esActualizacionMismoDia = precioExistente && fechaPrecioISO === precioExistente.fecha;
            if (esActualizacionMismoDia) {
              console.log(`[PRECIOS] Actualizando precio específico ${clienteId} para ${medidaNormalizada} - MISMO DÍA: $${precioExistente.precio} → $${precio.precio} (fecha: ${fechaPrecioISO}, timestamp: ${precio.timestamp})`);
            } else {
              console.log(`[PRECIOS] Estableciendo precio específico ${clienteId} para ${medidaNormalizada}: $${precio.precio} (fecha: ${fechaPrecioISO}, timestamp: ${precio.timestamp})`);
            }
            
            preciosEspecificos.set(medidaNormalizada, {
              precio: precio.precio,
              fecha: fechaPrecioISO,
              clienteId: precio.clienteId,
              timestamp: precio.timestamp || new Date().getTime()
            });
          }
        } 
        // Para precios generales, almacenar el más reciente
        else if (!precio.clienteId) {
          const precioExistente = preciosPorMedida.get(medidaNormalizada);
          
          // Misma lógica para precios generales
          if (!precioExistente || fechaPrecioISO >= precioExistente.fecha) {
            
            const esActualizacionMismoDia = precioExistente && fechaPrecioISO === precioExistente.fecha;
            if (esActualizacionMismoDia) {
              console.log(`[PRECIOS] Actualizando precio general para ${medidaNormalizada} - MISMO DÍA: $${precioExistente.precio} → $${precio.precio} (fecha: ${fechaPrecioISO}, timestamp: ${precio.timestamp})`);
            } else {
              console.log(`[PRECIOS] Estableciendo precio general para ${medidaNormalizada}: $${precio.precio} (fecha: ${fechaPrecioISO}, timestamp: ${precio.timestamp})`);
            }
            
            preciosPorMedida.set(medidaNormalizada, {
              precio: precio.precio,
              fecha: fechaPrecioISO,
              clienteId: null,
              timestamp: precio.timestamp || new Date().getTime()
            });
          }
        }
    }
  });
  
  // Combinar ambos mapas, dando prioridad a los precios específicos
  const preciosFinales = new Map();
  
  // Agregar precios generales
  for (const [medida, precio] of preciosPorMedida) {
    preciosFinales.set(medida, precio.precio);
  }
  
  // Sobrescribir con precios específicos si existen
  for (const [medida, precio] of preciosEspecificos) {
    preciosFinales.set(medida, precio.precio);
  }
  
  console.log(`[PRECIOS] ✅ Precios filtrados para ${fechaLimiteISO}:`, Array.from(preciosFinales.entries()));
  console.log(`[PRECIOS] Total de medidas con precios: ${preciosFinales.size}`);
  
  return preciosFinales;
};

/**
 * Obtiene el precio para una medida específica basado en la fecha del embarque
 * @param {Array} preciosActuales - Array de precios disponibles
 * @param {string} medida - Medida del producto
 * @param {string} fechaEmbarque - Fecha del embarque
 * @param {string} clienteId - ID del cliente (opcional)
 * @returns {number|null} - Precio encontrado o null
 */
export const obtenerPrecioParaMedida = (preciosActuales, medida, fechaEmbarque, clienteId = null) => {
  const preciosParaFecha = obtenerPreciosParaFecha(preciosActuales, fechaEmbarque, clienteId);
  const medidaNormalizada = normalizarMedida(medida);
  return preciosParaFecha.get(medidaNormalizada) || null;
}; 