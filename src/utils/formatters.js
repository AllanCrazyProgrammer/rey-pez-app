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
