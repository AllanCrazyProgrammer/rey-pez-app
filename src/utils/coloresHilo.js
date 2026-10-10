// Stable IDs are stored independently from measure names and quantities.
export const COLORES_HILO = Object.freeze([
  { id: 'blanco', nombre: 'Blanco', muestra: '#ffffff', fondo: '#ffffff' },
  { id: 'amarillo', nombre: 'Amarillo', muestra: '#facc15', fondo: '#fef3b0' },
  { id: 'naranja', nombre: 'Naranja', muestra: '#f97316', fondo: '#ffdbb5' },
  { id: 'rojo', nombre: 'Rojo', muestra: '#dc2626', fondo: '#fecaca' },
  { id: 'rosa', nombre: 'Rosa', muestra: '#ec4899', fondo: '#fbcfe8' },
  { id: 'morado', nombre: 'Morado', muestra: '#9333ea', fondo: '#e9d5ff' },
  { id: 'azul', nombre: 'Azul', muestra: '#2563eb', fondo: '#bfdbfe' },
  { id: 'verde', nombre: 'Verde', muestra: '#16a34a', fondo: '#bbf7d0' },
  { id: 'cafe', nombre: 'Café', muestra: '#92400e', fondo: '#e7c9ab' },
  { id: 'negro', nombre: 'Negro', muestra: '#111827', fondo: '#cbd5e1' }
]);

export function normalizarColoresHilo(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(id => COLORES_HILO.some(color => color.id === id)))].slice(0, 2);
}

export function descripcionColoresHilo(value) {
  const colors = normalizarColoresHilo(value);
  return colors.length
    ? colors.map(id => COLORES_HILO.find(color => color.id === id).nombre).join(' + ')
    : 'Sin color';
}

export function estiloColoresHilo(value) {
  const colors = normalizarColoresHilo(value).map(id => COLORES_HILO.find(color => color.id === id).fondo);
  if (!colors.length) return {};
  return {
    background: colors.length === 1 ? colors[0] : `linear-gradient(90deg, ${colors[0]} 0%, ${colors[0]} 50%, ${colors[1]} 50%, ${colors[1]} 100%)`,
    color: '#111827'
  };
}
