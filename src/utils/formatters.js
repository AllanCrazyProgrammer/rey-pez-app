import moment from 'moment';
import { formatearFechaParaMostrar, normalizarFechaISO } from './dateUtils';

export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return decimals > 0 ? '0.00' : '0';
  }
  return Number(value).toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const formatCurrency = (value) => `$${formatNumber(value)}`;

export const formatearFecha = formatearFechaParaMostrar;

export const formatearFechaCorta = (fecha) => {
  if (!fecha) return '';
  try {
    const iso = normalizarFechaISO(fecha);
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
};

export { formatearFechaParaMostrar };

// --- Formatos que antes estaban copiados en varios componentes (mismo cuerpo, mismo resultado) ---

// Precio con 2 decimales; vacío o 0 → '0.00'. (Antes en 8 componentes de precios y crudos.)
export const formatearPrecio = (precio) => {
  return precio ? precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
};

// Moneda MXN con símbolo ($1,234.50). (Cuentas Allan Camarón.)
export const formatearMoneda = (value) => {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(Number(value) || 0);
};

// Número con 0 a 2 decimales. (Cuentas Allan Camarón.)
export const formatearNumeroMx = (value) => {
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value) || 0);
};

// Número con 0 a 2 decimales; lo que no sea finito → '0'. (Modales de salidas de embarques.)
export const formatearNumeroFinito = (valor) => {
  const numero = Number(valor || 0);
  return Number.isFinite(numero)
    ? numero.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : '0';
};

// Número con exactamente 1 decimal, formato en-US (1,234.5). (Pedidos limpios.)
export const formatearUnDecimal = (value) => {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
};

// Cantidad con signo + si es positiva (+5, -3, 0). (Taras.)
export const formatearCantidad = (valor) => {
  const numero = Number(valor) || 0;
  const prefijo = numero > 0 ? '+' : '';
  return `${prefijo}${numero}`;
};

// Date → 'YYYY-MM-DD' en hora local (para <input type="date">). (Reportes de cuentas.)
export const formatearFechaInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Fecha y hora 'DD/MM/YYYY HH:mm'. (Existencias de crudos.)
export const formatearFechaHora = (date) => {
  return moment(date).format('DD/MM/YYYY HH:mm');
};
