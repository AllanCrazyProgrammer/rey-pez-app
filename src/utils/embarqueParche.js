/**
 * Aplica un estado nuevo sobre el estado vivo del editor SIN reemplazar los
 * objetos: cada producto, fila y crudo conserva su identidad en memoria.
 *
 * Antes, cada cambio remoto reemplazaba `embarque.productos` completo por
 * objetos nuevos. Cualquier referencia tomada antes quedaba huérfana: un
 * modal de precio/hilos/nota abierto guardaba sobre un producto que ya no
 * estaba en pantalla y el dato se perdía sin aviso.
 */
import { copiar, iguales } from './embarqueColaboracion';

const ponerPlano = (objeto, clave, valor) => { objeto[clave] = valor; };
const quitarPlano = (objeto, clave) => { delete objeto[clave]; };
const tiene = (objeto, clave) => Object.prototype.hasOwnProperty.call(objeto, clave);
const esListaSimple = lista => Array.isArray(lista) && lista.every(valor => valor === null || typeof valor !== 'object');

function ayudantes(h = {}) {
  return { set: h.set || ponerPlano, del: h.del || quitarPlano };
}

function parcharValor(objeto, clave, nuevo, h) {
  const actual = objeto[clave];
  if (tiene(objeto, clave) && iguales(actual, nuevo)) return false;
  // kilos, taras y sus identidades: se conserva el arreglo que la vista ya observa.
  if (esListaSimple(actual) && esListaSimple(nuevo)) {
    actual.splice(0, actual.length, ...nuevo);
    return true;
  }
  h.set(objeto, clave, copiar(nuevo));
  return true;
}

function parcharObjeto(actual, nuevo, h, opciones) {
  const conservar = opciones.conservar || [];
  const hijos = opciones.hijos || {};
  let cambio = false;
  Object.keys(nuevo).forEach(clave => {
    if (hijos[clave]) {
      cambio = parcharListaPorId(actual, clave, nuevo[clave], h, hijos[clave]) || cambio;
      return;
    }
    if (conservar.includes(clave) && tiene(actual, clave)) return;
    cambio = parcharValor(actual, clave, nuevo[clave], h) || cambio;
  });
  Object.keys(actual).forEach(clave => {
    if (tiene(nuevo, clave) || conservar.includes(clave)) return;
    h.del(actual, clave);
    cambio = true;
  });
  return cambio;
}

/**
 * Deja `contenedor[clave]` con los elementos de `nuevos` (por `id`), en ese
 * orden, reutilizando los objetos que ya existían.
 * @returns {boolean} true si algo cambió.
 */
export function parcharListaPorId(contenedor, clave, nuevos, ayuda, opciones = {}) {
  const h = ayudantes(ayuda);
  const lista = Array.isArray(nuevos) ? nuevos : [];
  if (!Array.isArray(contenedor[clave])) h.set(contenedor, clave, []);
  const actual = contenedor[clave];
  const porId = new Map();
  actual.forEach(item => {
    if (item && item.id !== undefined && !porId.has(item.id)) porId.set(item.id, item);
  });
  const usados = new Set();
  let cambio = false;
  const final = lista.map(nuevo => {
    const previo = nuevo && nuevo.id !== undefined ? porId.get(nuevo.id) : undefined;
    if (previo && !usados.has(previo)) {
      usados.add(previo);
      cambio = parcharObjeto(previo, nuevo, h, opciones) || cambio;
      return previo;
    }
    cambio = true;
    return copiar(nuevo);
  });
  if (final.length !== actual.length || final.some((item, i) => item !== actual[i])) {
    actual.splice(0, actual.length, ...final);
    cambio = true;
  }
  return cambio;
}

/** Crudos: `{ clienteId: [grupo{ id, items:[{id,…}] }] }`. */
export function parcharCrudos(clienteCrudos, nuevos, ayuda) {
  const h = ayudantes(ayuda);
  const destino = nuevos || {};
  let cambio = false;
  Object.keys(destino).forEach(clienteId => {
    cambio = parcharListaPorId(clienteCrudos, clienteId, destino[clienteId], h, { hijos: { items: {} } }) || cambio;
  });
  Object.keys(clienteCrudos).forEach(clienteId => {
    if (tiene(destino, clienteId)) return;
    const lista = clienteCrudos[clienteId];
    if (Array.isArray(lista) && lista.length) {
      lista.splice(0, lista.length);
      cambio = true;
    }
  });
  return cambio;
}
