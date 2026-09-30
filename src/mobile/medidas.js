// Agrupación de presentación: conservar los nombres completos en el desglose
// y las cantidades originales de los lotes y movimientos.
import { buscarTexto } from './fechas';

const normalizarOrigen = valor => buscarTexto(valor).trim().replace(/\s+/g, ' ');
export function esMaquila(item, catalogo = []) {
  const nombre = normalizarOrigen(item.proveedor || item.nombre);
  return normalizarOrigen(item.tipo) === 'maquila' || ['ozuna', 'joselito'].includes(nombre) ||
    catalogo.some(origen => normalizarOrigen(origen.nombre) === nombre && normalizarOrigen(origen.tipo) === 'maquila');
}

export function agruparPorProveedor(items) {
  const grupos = new Map();
  for (const item of items) {
    const nombre = String(item.proveedor || 'Sin proveedor').trim();
    const key = normalizarOrigen(nombre);
    if (!grupos.has(key)) grupos.set(key, { key, nombre, kilos: 0, items: [] });
    const grupo = grupos.get(key);
    grupo.kilos += Number(item.kilos) || 0;
    grupo.items.push(item);
  }
  return [...grupos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function separarLimpios(items, catalogo = []) {
  const proveedores = items.filter(item => !esMaquila(item, catalogo));
  const maquilas = agruparPorProveedor(items.filter(item => esMaquila(item, catalogo)));
  return [
    ...(proveedores.length ? [{ key: 'proveedores', nombre: 'Proveedores', tipo: 'proveedor', items: proveedores }] : []),
    ...maquilas.map(maquila => ({ ...maquila, key: 'maquila-' + maquila.key, tipo: 'maquila' }))
  ].map(seccion => ({ ...seccion, kilos: seccion.items.reduce((total, item) => total + (Number(item.kilos) || 0), 0), grupos: agruparPorMedida(seccion.items) }));
}

export function medidaBase(valor) {
  const nombre = String(valor || '').trim().replace(/\s+/g, ' ');
  const rango = nombre.match(/^(\d+)\s*[/.–—-]\s*(\d+)(?=\s|$)/);
  if (rango) return `${rango[1]}/${rango[2]}`;
  const menor = nombre.match(/^u\s*\/\s*(\d+)(?=\s|$)/i);
  return menor ? `U/${menor[1]}` : nombre || 'Sin medida';
}

export function agruparPorMedida(items) {
  const grupos = new Map();
  for (const item of items) {
    const kilos = Number(item.kilos);
    if (!Number.isFinite(kilos) || kilos <= 0) continue;
    const medida = medidaBase(item.medida);
    const key = medida.toLocaleLowerCase('es');
    if (!grupos.has(key)) grupos.set(key, { key, medida, kilos: 0, items: [] });
    const grupo = grupos.get(key);
    grupo.kilos += kilos;
    grupo.items.push(item);
  }
  return [...grupos.values()].sort((a, b) => a.medida.localeCompare(b.medida, 'es', { numeric: true }));
}
