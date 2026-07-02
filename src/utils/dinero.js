/**
 * Utilidades para manejar dinero de forma consistente en toda la app.
 *
 * Reglas:
 * - Los montos se redondean a centavos; nunca se comparan flotantes con ===.
 * - Al consolidar lotes de un mismo producto, cada lote aporta su propio
 *   subtotal (kilos × su precio); no se recalcula todo al último precio.
 */

/**
 * Redondea un valor a centavos (2 decimales) de forma segura.
 * Devuelve 0 para valores no numéricos (undefined, null, NaN, strings vacíos).
 * @param {*} valor - Valor a redondear
 * @returns {number}
 */
export const redondearCentavos = (valor) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 0;
  return Math.round((numero + Number.EPSILON) * 100) / 100;
};

/**
 * Suma una lista de montos ignorando valores no numéricos y redondeando a centavos.
 * Evita el clásico `10 + "5" = "105"` cuando un monto viene como string.
 * @param {Array<*>} montos
 * @returns {number}
 */
export const sumarMontos = (montos) => {
  if (!Array.isArray(montos)) return 0;
  const total = montos.reduce((suma, monto) => suma + (Number(monto) || 0), 0);
  return redondearCentavos(total);
};

/**
 * Compara dos montos con tolerancia de medio centavo.
 * Úsese en lugar de `===`/`!==` para decidir si hay que reescribir un saldo;
 * comparar flotantes exactos provoca bucles infinitos de actualizaciones.
 * @param {*} a
 * @param {*} b
 * @param {number} [tolerancia=0.005]
 * @returns {boolean}
 */
export const sonMontosIguales = (a, b, tolerancia = 0.005) => {
  return Math.abs((Number(a) || 0) - (Number(b) || 0)) <= tolerancia;
};

/**
 * Acumula un lote (kilos a cierto precio) sobre un item ya consolidado.
 *
 * Si los precios coinciden (o el lote no trae precio propio) se conserva el
 * comportamiento clásico: sumar kilos y total = kilos × precio.
 * Si los precios difieren, se suman los subtotales de cada lote y el precio
 * unitario pasa a ser el promedio ponderado — recalcular todos los kilos al
 * último precio encontrado inventaba o perdía dinero.
 *
 * @param {{kilos: number, precio: number, total: number}} acumulado
 * @param {{kilos: number, precio: number}} lote
 * @returns {{kilos: number, precio: number, total: number}}
 */
export const acumularLote = (acumulado, lote) => {
  const kilosPrevios = Number(acumulado.kilos) || 0;
  const totalPrevio = Number(acumulado.total) || 0;
  const precioPrevio = Number(acumulado.precio) || 0;
  const kilosLote = Number(lote.kilos) || 0;
  const precioLote = Number(lote.precio) || precioPrevio;

  if (precioPrevio && precioLote && Math.abs(precioLote - precioPrevio) > 0.005) {
    const total = totalPrevio + kilosLote * precioLote;
    const kilos = kilosPrevios + kilosLote;
    return {
      kilos,
      precio: kilos > 0 ? total / kilos : precioLote,
      total
    };
  }

  const precio = precioLote || precioPrevio;
  const kilos = kilosPrevios + kilosLote;
  return { kilos, precio, total: kilos * precio };
};

export default {
  redondearCentavos,
  sumarMontos,
  sonMontosIguales,
  acumularLote
};
