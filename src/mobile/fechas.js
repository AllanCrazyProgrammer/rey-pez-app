import { fechaRegistro } from '@/utils/fechasInventario';
export { fechaRegistro };
export function mostrarFecha(valor, corta = false) {
  const iso = fechaRegistro(valor);
  if (!iso) return 'Sin fecha';
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
    day: 'numeric', month: corta ? 'short' : 'long', year: 'numeric'
  });
}
export function fechaSiguiente(valor) {
  const iso = fechaRegistro(valor);
  if (!iso) return null;
  const [year, month, day] = iso.split('-').map(Number);
  // Sumar sobre el calendario evita desplazar el día por la zona horaria.
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}
export const buscarTexto = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
