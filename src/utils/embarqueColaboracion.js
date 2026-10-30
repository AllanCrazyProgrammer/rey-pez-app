import { v4 as uuid } from 'uuid';

export const copiar = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
const estable = v => {
  if (v === undefined) return 'undefined';
  if (Array.isArray(v)) return '[' + v.map(estable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + estable(v[k])).join(',') + '}';
  return JSON.stringify(v);
};
export const iguales = (a, b) => estable(a) === estable(b);
export const nuevoIdEdicion = () => uuid();
const poner = (obj, k, v) => { obj[k] = v; };
export const LISTAS_PRODUCTO = [
  { ids: 'pesadasIds', campos: ['taras', 'kilos'] },
  { ids: 'reportesIds', campos: ['reporteTaras', 'reporteBolsas'] },
  { ids: 'tarasExtraIds', campos: ['tarasExtra'] },
];
const ui = new Set(['showSuggestions', 'isEditing', 'isNew', 'nombreCliente']);

// La migración es determinista: dos lectores del mismo documento antiguo
// identifican la misma fila. Las altas posteriores SIEMPRE reciben UUID.
export function identificarProducto(p, set = poner) {
  for (const lista of LISTAS_PRODUCTO) {
    const largo = Math.max(...lista.campos.map(k => (p[k] || []).length));
    if (!Array.isArray(p[lista.ids])) {
      set(p, lista.ids, Array.from({ length: largo }, (_, i) => `legacy:${p.id}:${lista.ids}:${i}`));
    } else if (p[lista.ids].length !== largo || new Set(p[lista.ids]).size !== largo) {
      throw new Error('Las identidades de las pesadas no coinciden con sus filas. Recarga antes de guardar.');
    }
  }
  return p;
}

export function identificarEstado(estado, set = poner) {
  (estado.productos || []).forEach(p => identificarProducto(p, set));
  Object.entries(estado.clienteCrudos || {}).forEach(([cliente, grupos]) => grupos.forEach((grupo, i) => {
    if (!grupo.id) set(grupo, 'id', `legacy:crudo:${cliente}:${i}`);
    (grupo.items || []).forEach((item, j) => {
      if (!item.id) set(item, 'id', `legacy:${grupo.id}:item:${j}`);
    });
  }));
  return estado;
}

// Mantener las listas numéricas públicas conserva cálculos/PDF y consumidores
// existentes. Sus IDs se modifican en el mismo evento que agrega/borra la fila.
export function insertarFilaProducto(p, ids, set = poner) {
  identificarProducto(p, set);
  const lista = LISTAS_PRODUCTO.find(l => l.ids === ids);
  p[ids].push(uuid());
  lista.campos.forEach(k => {
    if (!Array.isArray(p[k])) set(p, k, []);
    while (p[k].length < p[ids].length - 1) p[k].push(null);
    p[k].push(null);
  });
}
export function eliminarFilaProducto(p, ids, indice, set = poner) {
  identificarProducto(p, set);
  const lista = LISTAS_PRODUCTO.find(l => l.ids === ids);
  p[ids].splice(indice, 1);
  lista.campos.forEach(k => { if (Array.isArray(p[k])) p[k].splice(indice, 1); });
}

const mapa = filas => Object.fromEntries(filas.map(fila => [fila.id, fila]));
const datos = objeto => Object.fromEntries(Object.entries(objeto).filter(([k]) => !ui.has(k)));
export function aArbol(estado) {
  const e = identificarEstado(copiar(estado));
  const productos = (e.productos || []).map(p => {
    const salida = datos(p);
    if (salida.clienteId !== undefined) salida.clienteId = String(salida.clienteId);
    for (const lista of LISTAS_PRODUCTO) {
      salida[lista.ids] = Object.fromEntries(p[lista.ids].map((id, i) => [id,
        Object.fromEntries(lista.campos.map(k => [k, p[k]?.[i] === undefined ? null : p[k][i]]))
      ]));
      lista.campos.forEach(k => { delete salida[k]; });
    }
    return salida;
  });
  const crudos = Object.entries(e.clienteCrudos || {}).flatMap(([clienteId, grupos]) => grupos.map(g => ({
    ...datos(g), clienteId, items: mapa((g.items || []).map(datos)),
  })));
  return { fecha: e.fecha, cargaCon: e.cargaCon, camionNumero: e.camionNumero, productos: mapa(productos), crudos: mapa(crudos) };
}

export function deArbol(arbol, original) {
  const salida = copiar(original);
  ['fecha', 'cargaCon', 'camionNumero'].forEach(k => { salida[k] = arbol[k]; });
  salida.productos = Object.values(arbol.productos).map(p => {
    const previo = (original.productos || []).find(v => v.id === p.id) || {};
    const producto = { ...Object.fromEntries(Object.entries(previo).filter(([k]) => ui.has(k))), ...copiar(p) };
    for (const lista of LISTAS_PRODUCTO) {
      producto[lista.ids] = Object.keys(p[lista.ids]);
      lista.campos.forEach(k => {
        producto[k] = Object.values(p[lista.ids]).map(fila => fila[k] === undefined ? null : fila[k]);
      });
    }
    return producto;
  });
  salida.clienteCrudos = {};
  Object.values(arbol.crudos).forEach(g => {
    const { clienteId, ...grupo } = copiar(g);
    grupo.items = Object.values(grupo.items);
    if (!salida.clienteCrudos[clienteId]) salida.clienteCrudos[clienteId] = [];
    salida.clienteCrudos[clienteId].push(grupo);
  });
  return salida;
}

export function diferencias(antes, despues, ruta = []) {
  if (iguales(antes, despues)) return [];
  if (antes && despues && !Array.isArray(antes) && !Array.isArray(despues) &&
      typeof antes === 'object' && typeof despues === 'object') {
    return [...new Set([...Object.keys(antes), ...Object.keys(despues)])].flatMap(k =>
      diferencias(antes[k], despues[k], [...ruta, k]).map(op => op.ruta.length === ruta.length + 1
        ? { ...op, indiceAntes: Object.keys(antes).indexOf(k), indiceDespues: Object.keys(despues).indexOf(k) } : op));
  }
  return [{ ruta, antes: copiar(antes), despues: copiar(despues) }];
}
export const leerRuta = (arbol, ruta) => ruta.reduce((obj, k) => obj && obj[k], arbol);
export function aplicarOperaciones(arbol, operaciones, inversa = false) {
  const salida = copiar(arbol);
  const aplicadas = [];
  for (const op of (inversa ? operaciones.slice().reverse() : operaciones)) {
    const esperado = inversa ? op.despues : op.antes;
    const valor = inversa ? op.antes : op.despues;
    const padre = leerRuta(salida, op.ruta.slice(0, -1));
    const clave = op.ruta[op.ruta.length - 1];
    // No recrear padres eliminados por otra persona.
    if (!padre || !iguales(padre[clave], esperado)) continue;
    if (valor === undefined) delete padre[clave];
    else if (esperado !== undefined) padre[clave] = copiar(valor);
    else {
      const entradas = Object.entries(padre);
      const indice = inversa ? op.indiceAntes : op.indiceDespues;
      entradas.splice(indice >= 0 ? Math.min(indice, entradas.length) : entradas.length, 0, [clave, copiar(valor)]);
      Object.keys(padre).forEach(k => { delete padre[k]; });
      entradas.forEach(([k, v]) => { padre[k] = v; });
    }
    aplicadas.push(op);
  }
  return { arbol: salida, aplicadas: inversa ? aplicadas.reverse() : aplicadas, omitidas: operaciones.length - aplicadas.length };
}

export function estadoDesdeDoc(doc = {}) {
  return identificarEstado({
    fecha: doc.fecha, cargaCon: doc.cargaCon || '', camionNumero: doc.camionNumero || 1,
    productos: (doc.clientes || []).flatMap(c => (c.productos || []).filter(p => !doc.productosEliminados?.[p.id]).map(p => ({ ...copiar(p), clienteId: String(c.id), nombreCliente: c.nombre || p.nombreCliente || '' }))),
    clienteCrudos: Object.fromEntries((doc.clientes || []).map(c => [String(c.id), copiar(c.crudos || [])])),
    productosEliminados: copiar(doc.productosEliminados || {}),
  });
}

export function fusionarEdicion(base, local, remoto) {
  const a = aArbol(base), b = aArbol(local), c = aArbol(remoto);
  const ops = diferencias(a, b);
  const permitidas = ops.filter(op => !(op.ruta[0] === 'productos' && op.ruta.length === 2 && op.antes === undefined &&
    !iguales(base.productosEliminados?.[op.ruta[1]], remoto.productosEliminados?.[op.ruta[1]])));
  const resultado = aplicarOperaciones(c, permitidas);
  const estado = deArbol(resultado.arbol, remoto);
  estado.productosEliminados = { ...(remoto.productosEliminados || {}) };
  const actuales = new Set(estado.productos.map(p => p.id));
  (remoto.productos || []).forEach(p => {
    if (!actuales.has(p.id)) estado.productosEliminados[p.id] = local.productosEliminados?.[p.id] || Date.now();
  });
  estado.productos.forEach(p => { if (estado.productosEliminados[p.id]) estado.productosEliminados[p.id] = null; });
  // Un cambio ya presente en remoto es un eco, no un conflicto.
  const omitidas = ops.filter(op => !resultado.aplicadas.includes(op) && !iguales(leerRuta(c, op.ruta), op.despues)).length;
  return { estado, omitidas };
}
