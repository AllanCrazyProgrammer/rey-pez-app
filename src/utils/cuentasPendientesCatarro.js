import { normalizarFechaValor } from './dateUtils';

export const INICIO_CUENTAS_PENDIENTES_CATARRO = '2026-10-15';

const esCatarro = cliente => String(cliente.id ?? cliente.clienteId ?? '') === '2' ||
  String(cliente.nombre || '').toLowerCase().includes('catarro');
const tieneProducto = producto => producto && (producto.medida ||
  (producto.kilos || []).some(kilos => Number(kilos) > 0));
const tieneCrudo = crudo => crudo && Array.isArray(crudo.items) &&
  crudo.items.some(item => item && (item.talla || item.taras || item.sobrante));

// Los embarques actuales guardan clientes[]. Los antiguos pueden guardar
// productos y clienteCrudos en la raíz. No sumar ambas representaciones.
export function datosCuentaCatarroDesdeEmbarque(embarque) {
  const clientes = (embarque.clientes || []).filter(esCatarro);
  const productosCliente = clientes.flatMap(cliente => cliente.productos || []);
  const crudosCliente = clientes.flatMap(cliente => cliente.crudos || []);
  const productos = productosCliente.length ? productosCliente :
    (embarque.productos || []).filter(producto => String(producto.clienteId ?? producto.cliente ?? '') === '2');
  const crudos = crudosCliente.length ? crudosCliente :
    (embarque.clienteCrudos || embarque.clientesCrudos || {})['2'] || [];
  if (!productos.some(tieneProducto) && !crudos.some(tieneCrudo)) return null;
  return {
    ...embarque,
    fecha: normalizarFechaValor(embarque.fecha),
    productos: productos.filter(tieneProducto),
    clienteCrudos: { '2': crudos.filter(tieneCrudo) },
  };
}

export function cuentasPendientesCatarro(cuentas, embarques) {
  const existentes = new Set(cuentas.map(cuenta => normalizarFechaValor(cuenta.fecha)));
  const fechas = new Set(embarques.map(embarque => {
    const datos = datosCuentaCatarroDesdeEmbarque(embarque);
    return datos && datos.fecha;
  }).filter(fecha => fecha && fecha >= INICIO_CUENTAS_PENDIENTES_CATARRO && !existentes.has(fecha)));
  return [...fechas].map(fecha => ({ id: `missing-${fecha}`, fecha, missingNota: true, estadoPagado: false }));
}

export function combinarEmbarquesCatarro(embarques, fecha) {
  const datos = embarques.map(datosCuentaCatarroDesdeEmbarque).filter(data => data && data.fecha === fecha);
  if (!datos.length) throw new Error('El embarque ya no tiene productos de Catarro para esta fecha.');
  if (datos.length === 1) return datos[0];
  return {
    ...datos[0],
    productos: datos.flatMap(data => data.productos.map(producto => ({
      ...producto,
      noSumarKilos: producto.noSumarKilos || data.clientesSumarKgCatarro?.['2'] === false,
    }))),
    clienteCrudos: { '2': datos.flatMap(data => data.clienteCrudos['2']) },
    clientesSumarKgCatarro: { ...datos[0].clientesSumarKgCatarro, '2': true },
  };
}
