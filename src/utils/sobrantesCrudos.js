// Utilitario para trabajar con los sobrantes de los items de crudo del embarque.
//
// Un item de crudo puede tener uno o varios sobrantes. Históricamente solo se
// admitía uno, guardado como string en `item.sobrante` (formato "cantidad-peso",
// ej. "1-15"). Ahora se admite una lista, guardada en `item.sobrantes` como
// array de strings con el mismo formato. Para compatibilidad hacia atrás con
// datos y consumidores viejos, cuando hay varios sobrantes se sigue
// sincronizando `item.sobrante` con el primero de la lista.

/**
 * Devuelve todos los sobrantes de un item como array de strings.
 *
 * - Si el item tiene `sobrantes` como array, se devuelve la lista completa
 *   (filtrando los vacíos).
 * - Si no, se cae al legacy `item.sobrante` (un solo sobrante).
 * - Si no hay ninguno, se devuelve `[]`.
 */
export function obtenerSobrantesDeItem(item) {
  if (!item) return [];
  if (Array.isArray(item.sobrantes)) {
    return item.sobrantes
      .map(s => (s === null || s === undefined ? '' : String(s).trim()))
      .filter(s => s !== '');
  }
  const legacy = item.sobrante;
  if (legacy !== null && legacy !== undefined && String(legacy).trim() !== '') {
    return [String(legacy).trim()];
  }
  return [];
}

/**
 * Suma el resultado de aplicar `fn` a cada sobrante del item.
 * `fn` recibe el string del sobrante y debe devolver un número.
 */
export function sumarSobrantes(item, fn) {
  return obtenerSobrantesDeItem(item).reduce(
    (total, sobrante) => total + (Number(fn(sobrante)) || 0),
    0
  );
}

/**
 * Devuelve `true` si el item tiene al menos un sobrante con contenido.
 */
export function tieneSobrantes(item) {
  return obtenerSobrantesDeItem(item).length > 0;
}
