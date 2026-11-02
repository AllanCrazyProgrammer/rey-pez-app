// Barcos para Entrada de Producto, incluido "Otros" (proveedores que no son barco).
// Las entradas de Otros usan la misma colección `entradasProductoBarcos` y la misma pesada,
// con barco: 'otros' + proveedorId/proveedorNombre. Los proveedores de Otros viven en
// `proveedoresOtrosBarcos` ({ nombre, createdAt }), separados de `proveedoresBarcos`
// (esos son a quienes los barcos les deben: diésel, hielo, etc.).
export const BARCO_OTROS = 'otros';
export const COLECCION_PROVEEDORES_OTROS = 'proveedoresOtrosBarcos';

export const BARCOS = [
  { id: 'galileo', nombre: 'El Galileo', icono: '🚢', gradiente: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' },
  { id: 'maria-guadalupe', nombre: 'María Guadalupe', icono: '🛥️', gradiente: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)' },
  { id: BARCO_OTROS, nombre: 'Otros', icono: '📦', gradiente: 'linear-gradient(135deg, #e67e22 0%, #d35400 100%)' }
];

export function esOtros(barco) {
  return barco === BARCO_OTROS;
}

export function infoBarco(barco) {
  return BARCOS.find(b => b.id === barco) || BARCOS[0];
}

// Nombre a mostrar: para Otros, el del proveedor si ya se eligió.
export function nombreEntrada(barco, proveedor) {
  if (esOtros(barco)) return proveedor && proveedor.nombre ? proveedor.nombre : 'Otros';
  return infoBarco(barco).nombre;
}

export function normalizarNombreProveedor(nombre) {
  return String(nombre || '').trim().replace(/\s+/g, ' ');
}

// Valida un proveedor nuevo contra los existentes (sin duplicados ignorando mayúsculas/acentos).
export function validarProveedorNuevo(nombre, existentes) {
  const limpio = normalizarNombreProveedor(nombre);
  if (!limpio) return { ok: false, error: 'Escribe el nombre del proveedor' };
  const clave = s => normalizarNombreProveedor(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const repetido = (existentes || []).find(p => clave(p.nombre) === clave(limpio));
  if (repetido) return { ok: false, error: `Ya existe el proveedor "${repetido.nombre}"`, existente: repetido };
  return { ok: true, nombre: limpio };
}

// Documento de entrada. Mismo modelo que los barcos; Otros agrega el proveedor.
export function construirEntrada({ barco, proveedor, fecha, medidas }) {
  if (esOtros(barco) && !(proveedor && proveedor.id)) {
    throw new Error('Selecciona un proveedor para registrar la entrada');
  }
  const data = {
    barco,
    nombreBarco: nombreEntrada(barco, proveedor),
    fecha,
    medidas,
    totalTaras: medidas.reduce((s, m) => s + (m.totalTaras || 0), 0),
    totalKilos: medidas.reduce((s, m) => s + (m.totalKilos || 0), 0)
  };
  if (esOtros(barco)) {
    data.proveedorId = proveedor.id;
    data.proveedorNombre = proveedor.nombre;
  }
  return data;
}

// Las descargas de Otros se filtran por proveedor; las de barco pasan todas.
export function filtrarDescargas(descargas, barco, proveedorId) {
  if (!esOtros(barco)) return descargas;
  if (!proveedorId) return [];
  return descargas.filter(d => d.proveedorId === proveedorId);
}
