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
 * Genera las claves de búsqueda de una medida, en orden de prioridad:
 * 1. El texto completo (coincidencia exacta).
 * 2. La talla numérica inicial, por ejemplo "71/90" en
 *    "71/90 61 selecta" (coincidencia base).
 *
 * De esta forma un precio registrado específicamente como
 * "71/90 selecta" gana sobre "71/90", pero cualquier descripción sin
 * registro exacto todavía puede heredar el precio de la talla base.
 */
export const obtenerClavesBusquedaMedida = (medida) => {
  const claveExacta = normalizarMedida(medida);
  if (!claveExacta) return [];

  const texto = String(medida).trim();
  const coincidenciaBase = texto.match(
    /^(\d+(?:[.,]\d+)?\s*\/\s*\d+(?:[.,]\d+)?)(?=\s|[-–—]|$)/
  );
  const claveBase = coincidenciaBase
    ? normalizarMedida(coincidenciaBase[1])
    : '';

  return claveBase && claveBase !== claveExacta
    ? [claveExacta, claveBase]
    : [claveExacta];
};

const obtenerCoincidenciaDeMedida = (preciosParaFecha, medida) => {
  const claves = obtenerClavesBusquedaMedida(medida);

  for (let indice = 0; indice < claves.length; indice += 1) {
    const detalle = preciosParaFecha.get(claves[indice]);
    if (detalle) {
      return {
        ...detalle,
        tipoCoincidencia: indice === 0 ? 'exacta' : 'base',
        medidaBuscada: String(medida),
        medidaCoincidente: detalle.producto
      };
    }
  }

  return null;
};

const obtenerTimestampComparable = (timestamp) => {
  if (!timestamp) return 0;
  if (typeof timestamp === 'number') return timestamp;
  if (typeof timestamp?.toMillis === 'function') return timestamp.toMillis();

  const seconds = timestamp?.seconds ?? timestamp?._seconds;
  const nanoseconds = timestamp?.nanoseconds ?? timestamp?._nanoseconds ?? 0;
  if (typeof seconds === 'number') {
    return (seconds * 1000) + Math.floor(nanoseconds / 1000000);
  }

  const parsed = Number(timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const compararPreciosMasAntiguosPrimero = (a, b) => {
  const fechaA = normalizarFechaISO(a?.fecha);
  const fechaB = normalizarFechaISO(b?.fecha);

  if (fechaA !== fechaB) {
    return fechaA < fechaB ? -1 : 1;
  }

  return obtenerTimestampComparable(a?.timestamp) - obtenerTimestampComparable(b?.timestamp);
};

/**
 * Devuelve el precio junto con la fecha y el alcance que lo originaron.
 * Mantiene la regla histórica de la app: un precio específico del cliente
 * tiene prioridad sobre el general.
 */
export const obtenerDetallesPreciosParaFecha = (preciosActuales, fechaEmbarque, clienteId = null) => {
  if (!Array.isArray(preciosActuales)) {
    console.warn('[PRECIOS] preciosActuales no es un array válido');
    return new Map();
  }

  const fechaLimiteISO = normalizarFechaISO(fechaEmbarque || obtenerFechaActualISO());
  const preciosGenerales = new Map();
  const preciosEspecificos = new Map();
  const preciosOrdenados = [...preciosActuales].sort(compararPreciosMasAntiguosPrimero);

  preciosOrdenados.forEach((precio) => {
    if (!precio?.fecha || !precio?.producto) return;

    const fechaPrecioISO = normalizarFechaISO(precio.fecha);
    if (!esFechaValida(fechaPrecioISO, fechaLimiteISO)) return;

    const medidaNormalizada = normalizarMedida(precio.producto);
    const detalleBase = {
      precio: precio.precio,
      fecha: fechaPrecioISO,
      timestamp: obtenerTimestampComparable(precio.timestamp),
      producto: precio.producto
    };

    if (clienteId && precio.clienteId === clienteId) {
      preciosEspecificos.set(medidaNormalizada, {
        ...detalleBase,
        origen: 'especifico',
        clienteId: precio.clienteId
      });
    } else if (!precio.clienteId) {
      preciosGenerales.set(medidaNormalizada, {
        ...detalleBase,
        origen: 'general',
        clienteId: null
      });
    }
  });

  return new Map([...preciosGenerales, ...preciosEspecificos]);
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
  const detalles = obtenerDetallesPreciosParaFecha(preciosActuales, fechaEmbarque, clienteId);
  return new Map([...detalles].map(([medida, detalle]) => [medida, detalle.precio]));
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
  const preciosParaFecha = obtenerDetallesPreciosParaFecha(preciosActuales, fechaEmbarque, clienteId);
  return obtenerCoincidenciaDeMedida(preciosParaFecha, medida)?.precio ?? null;
};

export const obtenerDetallePrecioParaMedida = (preciosActuales, medida, fechaEmbarque, clienteId = null) => {
  const preciosParaFecha = obtenerDetallesPreciosParaFecha(preciosActuales, fechaEmbarque, clienteId);
  return obtenerCoincidenciaDeMedida(preciosParaFecha, medida);
};

/**
 * Igual que obtenerPreciosParaFecha pero para la colección `preciosNotaVenta`:
 * precios específicos usan el campo `clienteNombre` (texto del select de la nota).
 */
export const obtenerPreciosParaFechaNotaVenta = (preciosActuales, fechaEmbarque, clienteNombre = null) => {
  if (!Array.isArray(preciosActuales)) {
    return new Map();
  }

  const cliente = clienteNombre && String(clienteNombre).trim() ? String(clienteNombre).trim() : null;

  if (!fechaEmbarque) {
    fechaEmbarque = obtenerFechaActualISO();
  }

  const fechaLimiteISO = normalizarFechaISO(fechaEmbarque);
  const preciosPorMedida = new Map();
  const preciosEspecificos = new Map();

  const preciosOrdenados = [...preciosActuales].sort((a, b) => {
    const fechaA = normalizarFechaISO(a.fecha);
    const fechaB = normalizarFechaISO(b.fecha);
    if (fechaA !== fechaB) {
      return fechaA < fechaB ? -1 : 1;
    }
    const timestampA = a.timestamp || 0;
    const timestampB = b.timestamp || 0;
    return timestampA - timestampB;
  });

  preciosOrdenados.forEach((precio) => {
    if (!precio.fecha || !precio.producto) return;

    const fechaPrecioISO = normalizarFechaISO(precio.fecha);
    if (!esFechaValida(fechaPrecioISO, fechaLimiteISO)) return;

    const medidaNormalizada = normalizarMedida(precio.producto);
    const cn = precio.clienteNombre && String(precio.clienteNombre).trim();

    if (cliente && cn === cliente) {
      const precioExistente = preciosEspecificos.get(medidaNormalizada);
      if (!precioExistente || fechaPrecioISO >= precioExistente.fecha) {
        preciosEspecificos.set(medidaNormalizada, {
          precio: precio.precio,
          fecha: fechaPrecioISO,
          timestamp: precio.timestamp || new Date().getTime()
        });
      }
    } else if (!cn) {
      const precioExistente = preciosPorMedida.get(medidaNormalizada);
      if (!precioExistente || fechaPrecioISO >= precioExistente.fecha) {
        preciosPorMedida.set(medidaNormalizada, {
          precio: precio.precio,
          fecha: fechaPrecioISO,
          timestamp: precio.timestamp || new Date().getTime()
        });
      }
    }
  });

  const preciosFinales = new Map();
  for (const [medida, p] of preciosPorMedida) {
    preciosFinales.set(medida, p.precio);
  }
  for (const [medida, p] of preciosEspecificos) {
    preciosFinales.set(medida, p.precio);
  }

  return preciosFinales;
};

/**
 * Precio sugerido para nota de venta (colección preciosNotaVenta).
 * @param {string|null} clienteNombre - Mismo valor que el select "Cliente" de la nota.
 */
export const obtenerPrecioParaMedidaNotaVenta = (preciosActuales, medida, fechaEmbarque, clienteNombre = null) => {
  const preciosParaFecha = obtenerPreciosParaFechaNotaVenta(preciosActuales, fechaEmbarque, clienteNombre);
  const claves = obtenerClavesBusquedaMedida(medida);
  for (const clave of claves) {
    if (preciosParaFecha.has(clave)) return preciosParaFecha.get(clave);
  }
  return null;
};

/** Nombre fijo del “producto” en la colección `precios` para el precio por kg de maquila de Ozuna. */
export const PRODUCTO_PRECIO_MAQUILA_OZUNA = 'Precio maquila Ozuna';

/** Si no hay registro en Firestore, se usa este valor (histórico en la app). */
export const PRECIO_MAQUILA_OZUNA_FALLBACK = 21;

/**
 * Precio por kg por defecto para líneas Ozuna con maquila (Venta desmarcada).
 * Usa la misma lógica de fechas que el resto de precios (incl. específico cliente ozuna).
 */
export const obtenerPrecioMaquilaOzunaDefault = (preciosActuales, fechaEmbarque) => {
  if (!Array.isArray(preciosActuales) || preciosActuales.length === 0) {
    return PRECIO_MAQUILA_OZUNA_FALLBACK;
  }
  const especifico = obtenerPrecioParaMedida(
    preciosActuales,
    PRODUCTO_PRECIO_MAQUILA_OZUNA,
    fechaEmbarque,
    'ozuna'
  );
  if (especifico != null && !Number.isNaN(Number(especifico))) {
    return Number(especifico);
  }
  const general = obtenerPrecioParaMedida(
    preciosActuales,
    PRODUCTO_PRECIO_MAQUILA_OZUNA,
    fechaEmbarque,
    null
  );
  if (general != null && !Number.isNaN(Number(general))) {
    return Number(general);
  }
  return PRECIO_MAQUILA_OZUNA_FALLBACK;
};
