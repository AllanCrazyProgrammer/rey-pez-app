import moment from 'moment';
import 'moment/locale/es';

// Configurar Moment.js para usar el idioma español
moment.locale('es');

// Formato estándar para mostrar fechas en la aplicación
const DATE_FORMAT = 'DD [de] MMMM [de] YYYY';

export const formatDate = (date) => {
  return moment(date).format(DATE_FORMAT);
};

export const parseDate = (date) => {
  return moment(date).toDate();
};

export const getCurrentDate = () => {
  return moment().toDate();
};

export const isValidDate = (date) => {
  return moment(date).isValid();
};

export const convertToFirestoreTimestamp = (date) => {
  return moment(date).toDate();
};

export const convertFromFirestoreTimestamp = (timestamp) => {
  return moment(timestamp.toDate());
};

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD sin problemas de zona horaria
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const obtenerFechaActualISO = () => {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
};

/**
 * Convierte una fecha a formato YYYY-MM-DD de manera segura
 * @param {string|Date} fecha - Fecha a convertir
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const normalizarFechaISO = (fecha) => {
  if (!fecha) return obtenerFechaActualISO();
  
  // Si ya está en formato correcto, devolverla
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return fecha;
  }

  // Si es un string ISO con tiempo, extraer la parte de fecha sin TZ
  if (typeof fecha === 'string') {
    const match = fecha.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }
  }
  
  // Convertir Date object o string a YYYY-MM-DD
  const fechaObj = new Date(fecha);
  if (isNaN(fechaObj.getTime())) {
    console.warn(`Fecha inválida recibida: ${fecha}, usando fecha actual`);
    return obtenerFechaActualISO();
  }
  
  // Usar métodos UTC para evitar problemas de zona horaria
  const año = fechaObj.getUTCFullYear();
  const mes = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fechaObj.getUTCDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
};

/**
 * Normaliza cualquier representación de fecha (string ISO, string con hora,
 * Timestamp de Firestore, Date) a 'YYYY-MM-DD', o null si no es interpretable.
 *
 * IMPORTANTE: los strings ISO con hora se recortan directamente (sin pasar por
 * Date/zonas horarias) — convertir a hora local y de vuelta desplazaba la fecha
 * un día y provocaba falsos "sin nota" en los menús de cuentas.
 * @param {*} valor - Valor de fecha a normalizar
 * @returns {string|null} Fecha en formato YYYY-MM-DD o null
 */
export const normalizarFechaValor = (valor) => {
  if (!valor) return null;
  try {
    const formatearUTC = (fechaObj) => {
      if (!(fechaObj instanceof Date) || Number.isNaN(fechaObj.getTime())) return null;
      const año = fechaObj.getUTCFullYear();
      const mes = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
      const dia = String(fechaObj.getUTCDate()).padStart(2, '0');
      return `${año}-${mes}-${dia}`;
    };
    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
      return valor.slice(0, 10);
    }
    if (typeof valor?.toDate === 'function') {
      return formatearUTC(valor.toDate());
    }
    // Timestamps de Firestore, incluida la forma serializada por JSON ({_seconds})
    const segundos = valor?.seconds ?? valor?._seconds;
    if (typeof segundos === 'number') {
      return formatearUTC(new Date(segundos * 1000));
    }
    if (valor instanceof Date) {
      return formatearUTC(valor);
    }
    return formatearUTC(new Date(valor));
  } catch (_) {
    return null;
  }
};

/**
 * Compara dos fechas en formato YYYY-MM-DD
 * @param {string} fecha1 - Primera fecha
 * @param {string} fecha2 - Segunda fecha
 * @returns {number} -1 si fecha1 < fecha2, 0 si iguales, 1 si fecha1 > fecha2
 */
export const compararFechas = (fecha1, fecha2) => {
  const f1 = normalizarFechaISO(fecha1);
  const f2 = normalizarFechaISO(fecha2);
  
  if (f1 < f2) return -1;
  if (f1 > f2) return 1;
  return 0;
};

/**
 * Verifica si una fecha está dentro del rango permitido (anterior o igual a fechaLimite)
 * @param {string} fechaPrecio - Fecha del precio
 * @param {string} fechaLimite - Fecha límite (fecha del embarque)
 * @returns {boolean} true si está dentro del rango
 */
export const esFechaValida = (fechaPrecio, fechaLimite) => {
  const precio = normalizarFechaISO(fechaPrecio);
  const limite = normalizarFechaISO(fechaLimite);
  return precio <= limite;
};

/**
 * Obtiene un timestamp único para ordenamiento
 * @returns {number} Timestamp en milisegundos
 */
export const obtenerTimestamp = () => {
  return Date.now();
};

/**
 * Formatea una fecha para mostrar en la UI
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {string} Fecha formateada para mostrar
 */
export const formatearFechaParaMostrar = (fecha) => {
  if (!fecha) return '';
  
  try {
    const fechaNormalizada = normalizarFechaISO(fecha);
    const fechaObj = new Date(fechaNormalizada + 'T00:00:00'); // Evitar problemas de zona horaria
    return fechaObj.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (error) {
    console.warn(`Error al formatear fecha: ${fecha}`, error);
    return fecha;
  }
};