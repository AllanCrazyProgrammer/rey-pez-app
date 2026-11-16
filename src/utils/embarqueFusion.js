/**
 * Fusión de tres vías del documento `embarques/{id}` para el editor.
 *
 * Una sola función (`fusionarDocEditor`) decide qué queda cuando dos
 * pantallas editaron a la vez. Se usa en los tres puntos donde antes había
 * tres lógicas distintas:
 *
 *   1. Dentro de la transacción de subida: (base, lo que mando, servidor)
 *      → lo que se escribe. Ya no hay "conflicto → salir → esperar → reintentar".
 *   2. Al recibir un snapshot o confirmar una subida: (base, lo que hay en
 *      pantalla, servidor) → lo que debe verse en pantalla.
 *   3. En la cola offline, para subir pendientes de un editor que ya se cerró.
 *
 * Regla: gana lo local en lo que esta pantalla cambió desde su base, salvo que
 * el servidor haya cambiado ESE MISMO campo a otro valor (ahí gana lo ya
 * confirmado y se cuenta como conflicto). Productos, filas y crudos se
 * comparan por identidad, nunca por posición.
 */
import { estadoDesdeDoc, fusionarEdicion } from './embarqueColaboracion';
import { equivalentes } from './embarqueRevision';
import { embarqueTieneContenidoOperativoDoc } from './embarqueContenido';
import { normalizarFechaISO } from './dateUtils';

export const MAPAS_POR_CLIENTE = [
  'clientesJuntarMedidas',
  'clientesReglaOtilio',
  'clientesIncluirPrecios',
  'clientesCuentaEnPdf',
  'clientesSumarKgCatarro',
];

// Estado de pantalla del renglón: cada editor conserva el suyo.
export const UI_PRODUCTO = ['showSuggestions', 'isEditing', 'isNew'];

const CAMPOS_DEL_ARBOL = new Set(['fecha', 'cargaCon', 'camionNumero', 'clientes', 'productosEliminados', 'borrador']);

export function fechaDeDoc(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor.toDate === 'function') return normalizarFechaISO(valor.toDate());
  if (valor instanceof Date) return normalizarFechaISO(valor);
  // Un Timestamp que pasó por JSON (copia offline) queda como {seconds, nanoseconds}.
  if (typeof valor === 'object' && Number.isFinite(valor.seconds)) return normalizarFechaISO(new Date(valor.seconds * 1000));
  if (typeof valor === 'string') return normalizarFechaISO(valor);
  return valor;
}

const estadoDe = doc => estadoDesdeDoc({ ...(doc || {}), fecha: fechaDeDoc(doc && doc.fecha) });

function tresVias(base, local, remoto) {
  if (equivalentes(local, base)) return { valor: remoto, conflicto: false };
  if (equivalentes(remoto, base) || equivalentes(remoto, local)) return { valor: local, conflicto: false };
  return { valor: remoto, conflicto: true };
}

function fusionarMapa(nombre, base, local, remoto, conflictos) {
  // Esta pantalla no tocó el mapa: se toma el del servidor tal cual (aunque
  // no exista: los valores por defecto se calculan al mostrar).
  if (local === undefined || equivalentes(local, base)) return remoto;
  const b = base || {};
  const l = local || {};
  const r = remoto || {};
  const salida = {};
  new Set([...Object.keys(r), ...Object.keys(l)]).forEach(clave => {
    const { valor, conflicto } = tresVias(b[clave], l[clave], r[clave]);
    if (conflicto) conflictos.push(`${nombre}.${clave}`);
    if (valor !== undefined) salida[clave] = valor;
  });
  return salida;
}

function fusionarListaPorId(nombre, base, local, remoto, conflictos) {
  if (local === undefined || equivalentes(local, base)) return remoto;
  const indice = lista => new Map((Array.isArray(lista) ? lista : []).map(item => [String(item && item.id), item]));
  const b = indice(base);
  const l = indice(local);
  const r = indice(remoto);
  const salida = [];
  const resolver = id => {
    const { valor, conflicto } = tresVias(b.get(id), l.get(id), r.get(id));
    if (conflicto) conflictos.push(`${nombre}.${id}`);
    if (valor !== undefined) salida.push(valor);
  };
  r.forEach((_, id) => resolver(id));
  l.forEach((_, id) => { if (!r.has(id)) resolver(id); });
  return salida;
}

/**
 * Arma `clientes` (la forma del documento) a partir del estado fusionado.
 * La lista de clientes también se fusiona: un cliente vacío que el otro lado
 * quitó no se vuelve a crear solo porque esta pantalla aún lo listaba.
 */
function clientesDesdeEstado(estado, { base, local, remoto, uiLocal }) {
  const indice = doc => new Map((Array.isArray(doc && doc.clientes) ? doc.clientes : []).map(c => [String(c.id), c]));
  const b = indice(base);
  const l = indice(local);
  const r = indice(remoto);
  const productosPor = new Map();
  (estado.productos || []).forEach(producto => {
    const clave = String(producto.clienteId);
    if (!productosPor.has(clave)) productosPor.set(clave, []);
    productosPor.get(clave).push(producto);
  });
  const crudosPor = estado.clienteCrudos || {};
  const orden = [...l.keys()];
  const agregar = clave => { if (!orden.includes(clave)) orden.push(clave); };
  r.forEach((_, clave) => agregar(clave));
  productosPor.forEach((_, clave) => agregar(clave));
  Object.keys(crudosPor).forEach(clave => { if ((crudosPor[clave] || []).length) agregar(clave); });

  const salida = [];
  orden.forEach(clave => {
    const productos = (productosPor.get(clave) || []).map(producto => {
      const propio = uiLocal.get(producto.id);
      return propio ? { ...producto, ...propio } : producto;
    });
    const crudos = crudosPor[clave] || [];
    if (!productos.length && !crudos.length && b.has(clave)) {
      // Estaba en la base y ya no tiene nada: si uno de los dos lados lo
      // quitó de su lista, queda quitado.
      if (!l.has(clave) || !r.has(clave)) return;
    }
    const fuente = l.get(clave) || r.get(clave);
    const nombre = tresVias(b.get(clave) && b.get(clave).nombre, l.get(clave) && l.get(clave).nombre, r.get(clave) && r.get(clave).nombre).valor;
    salida.push({
      id: fuente ? fuente.id : clave,
      nombre: nombre || (fuente && fuente.nombre) || (productos[0] && productos[0].nombreCliente) || '',
      productos,
      crudos,
    });
  });
  return salida;
}

const firmaClientes = clientes => (Array.isArray(clientes) ? clientes : [])
  .map(c => `${String(c.id)}\u0000${c.nombre || ''}`).sort().join('\u0001');

/**
 * @param {Object} args
 * @param {Object|null} args.base   Campos del editor tal como estaban en el
 *   servidor la última vez que esta pantalla los adoptó. Sin base, el
 *   servidor se toma como ancestro (lo local gana en lo que difiera).
 * @param {Object} args.local  Campos del editor como los tiene esta pantalla.
 * @param {Object} args.remoto Documento actual del servidor.
 * @returns {{campos:Object, cambios:Object, omitidas:number, conflictos:string[]}}
 *   `campos`: los campos del editor ya fusionados. `cambios`: solo los que
 *   difieren del servidor (lo que hay que escribir; vacío = nada pendiente).
 */
export function fusionarDocEditor({ base, local, remoto }) {
  const servidor = remoto || {};
  const ancestro = base || servidor;
  const propio = local || {};
  const conflictos = [];

  const estadoRemoto = estadoDe(servidor);
  const estadoLocal = estadoDe(propio);
  const fusion = fusionarEdicion(estadoDe(ancestro), estadoLocal, estadoRemoto);
  fusion.rechazadas.forEach(op => conflictos.push(op.ruta.join('/')));

  const uiLocal = new Map((estadoLocal.productos || []).map(producto => {
    const ui = {};
    UI_PRODUCTO.forEach(clave => { if (producto[clave] !== undefined) ui[clave] = producto[clave]; });
    return [producto.id, ui];
  }));

  const campos = {
    fecha: fusion.estado.fecha,
    cargaCon: fusion.estado.cargaCon,
    camionNumero: fusion.estado.camionNumero,
    productosEliminados: fusion.estado.productosEliminados || {},
    clientes: clientesDesdeEstado(fusion.estado, { base: ancestro, local: propio, remoto: servidor, uiLocal }),
  };

  Object.keys(propio).forEach(clave => {
    if (CAMPOS_DEL_ARBOL.has(clave)) return;
    if (MAPAS_POR_CLIENTE.includes(clave)) {
      campos[clave] = fusionarMapa(clave, ancestro[clave], propio[clave], servidor[clave], conflictos);
    } else if (clave === 'clientesPersonalizados') {
      campos[clave] = fusionarListaPorId(clave, ancestro[clave], propio[clave], servidor[clave], conflictos);
    } else {
      const { valor, conflicto } = tresVias(ancestro[clave], propio[clave], servidor[clave]);
      if (conflicto) conflictos.push(clave);
      campos[clave] = valor;
    }
  });
  if (Object.prototype.hasOwnProperty.call(propio, 'borrador')) {
    campos.borrador = !embarqueTieneContenidoOperativoDoc({ cargaCon: campos.cargaCon, clientes: campos.clientes });
  }

  const cambios = {};
  if (campos.fecha !== estadoRemoto.fecha && campos.fecha) cambios.fecha = campos.fecha;
  if (campos.cargaCon !== estadoRemoto.cargaCon) cambios.cargaCon = campos.cargaCon;
  if (campos.camionNumero !== estadoRemoto.camionNumero) cambios.camionNumero = campos.camionNumero;
  if (!equivalentes(campos.productosEliminados, servidor.productosEliminados || {})) {
    cambios.productosEliminados = campos.productosEliminados;
  }
  const tocoContenido = fusion.aplicadas.some(op => op.ruta[0] === 'productos' || op.ruta[0] === 'crudos');
  if (tocoContenido || firmaClientes(campos.clientes) !== firmaClientes(servidor.clientes)) {
    cambios.clientes = campos.clientes;
  }
  Object.keys(campos).forEach(clave => {
    if (CAMPOS_DEL_ARBOL.has(clave) && clave !== 'borrador') return;
    if (campos[clave] === undefined) return;
    if (!equivalentes(campos[clave], servidor[clave])) cambios[clave] = campos[clave];
  });

  return { campos, cambios, omitidas: conflictos.length, conflictos };
}
