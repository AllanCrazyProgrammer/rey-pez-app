const colores = ['#2563eb', '#9333ea', '#047857', '#c2410c', '#be185d', '#0e7490'];
export const VIGENCIA_PRESENCIA = 90000;
export function colorSesion(id) {
  const hash = Array.from(String(id)).reduce((n, c) => ((n * 31) + c.charCodeAt(0)) >>> 0, 0);
  return colores[hash % colores.length];
}
export function normalizarCampo(valor) {
  if (!valor || typeof valor !== 'object' || typeof valor.campo !== 'string') return null;
  const texto = k => typeof valor[k] === 'string' && valor[k] ? valor[k] : null;
  const salida = { tipo: valor.tipo, campo: valor.campo };
  if (valor.tipo === 'cabecera' && ['fecha', 'cargaCon'].includes(valor.campo)) return salida;
  if (valor.tipo === 'producto' && texto('productoId')) {
    salida.productoId = texto('productoId');
    if (['kilos', 'taras', 'tarasExtra', 'reporteTaras', 'reporteBolsas'].includes(valor.campo)) {
      if (!texto('filaId')) return null;
      salida.filaId = texto('filaId');
    } else if (!['medida', 'tipo', 'tipoPersonalizado', 'camaronNeto', 'restarTaras', 'esVenta', 'noSumarKilos', 'refrigerar', 'precio', 'nota', 'hilos', 'nombreAlternativoPDF', 'textoAlternativo'].includes(valor.campo)) return null;
    return salida;
  }
  if (valor.tipo === 'crudo' && texto('crudoId') && texto('itemId') &&
      ['talla', 'barco', 'taras', 'sobrante', 'sobrante2', 'precio', 'esVenta', 'nota', 'hilos', 'textoAlternativo'].includes(valor.campo)) {
    return { ...salida, crudoId: texto('crudoId'), itemId: texto('itemId') };
  }
  return null;
}
export const claveCampo = valor => JSON.stringify(normalizarCampo(valor));
export function editoresVigentes(valores, propiaSesion, ahora) {
  return Object.entries(valores || {}).filter(([id, info]) => id !== propiaSesion && info &&
    typeof info.username === 'string' && typeof info.actualizadoEn === 'number' &&
    ahora - info.actualizadoEn < VIGENCIA_PRESENCIA && info.actualizadoEn <= ahora + VIGENCIA_PRESENCIA
  ).map(([sesionId, info]) => ({
    sesionId, username: info.username, userId: info.userId, color: colorSesion(sesionId),
    campo: normalizarCampo(info.campo),
    escribiendo: info.escribiendo === true && ahora - info.actualizadoEn < 3000,
  })).sort((a, b) => a.sesionId.localeCompare(b.sesionId));
}
export function campoDesdeElemento(elemento) {
  const valor = elemento?.closest?.('[data-colab-campo]')?.getAttribute('data-colab-campo');
  try { return normalizarCampo(JSON.parse(valor)); } catch (_) { return null; }
}
export function describirCampo(campo, embarque, clienteCrudos, nombreCliente) {
  if (!campo) return 'Viendo el embarque';
  const etiquetas = { fecha: 'Fecha', cargaCon: 'Responsable de carga', medida: 'Medida', tipo: 'Tipo', tipoPersonalizado: 'Tipo', kilos: 'Kilos', taras: 'Taras', tarasExtra: 'Taras extra', reporteTaras: 'Taras reportadas', reporteBolsas: 'Bolsas', camaronNeto: 'Valor neto', restarTaras: 'Descuento de taras', esVenta: 'Venta', noSumarKilos: 'Sumar kilos', refrigerar: 'Refrigeración', talla: 'Talla', barco: 'Barco', sobrante: 'Sobrante', sobrante2: 'Segundo sobrante', precio: 'Precio', nota: 'Nota', hilos: 'Hilos', nombreAlternativoPDF: 'Nombre para PDF', textoAlternativo: 'Texto alternativo' };
  const etiqueta = etiquetas[campo.campo] || campo.campo;
  if (campo.tipo === 'cabecera') return etiqueta;
  if (campo.tipo === 'producto') {
    const p = (embarque.productos || []).find(p => p.id === campo.productoId);
    if (!p) return 'Producto eliminado';
    const lista = ['kilos', 'taras'].includes(campo.campo) ? 'pesadasIds' : campo.campo === 'tarasExtra' ? 'tarasExtraIds' : 'reportesIds';
    const indice = campo.filaId ? (p[lista] || []).indexOf(campo.filaId) : -1;
    if (campo.filaId && indice < 0) return 'Fila eliminada';
    return `${nombreCliente(p.clienteId)} · ${p.medida || 'Producto nuevo'} · ${etiqueta}${indice >= 0 ? ' ' + (indice + 1) : ''}`;
  }
  for (const [clienteId, grupos] of Object.entries(clienteCrudos || {})) {
    const g = grupos.find(g => g.id === campo.crudoId);
    const item = g?.items?.find(i => i.id === campo.itemId);
    if (item) return `${nombreCliente(clienteId)} · Crudo ${item.talla || ''} · ${etiqueta}`;
  }
  return 'Crudo eliminado';
}
