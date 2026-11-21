// Helpers puros del modo rápido de pesadas (zoom in).
// El día guarda UN solo valor por despicadora x medida (pesos[personaId][columnaId]),
// así que cada pesada registrada en modo rápido SUMA al valor que ya lleva esa
// despicadora en esa medida, nunca lo sobrescribe.

import { decimalPesada } from './pesadas';

export const TRASTES_PREDEFINIDOS = [0.1, 0.2, 0.3, 0.4];
export const CLAVE_TRASTE_LOCAL = 'pesadas-traste';

export function normalizarTextoPesada(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es').trim();
}

// `registradas`: [{ id, nombre, apodo }] del menú de despicadoras.
// `kilosHoy`: Map (o objeto) nombre normalizado -> kilos que ya lleva hoy.
// Devuelve las coincidencias por nombre o apodo, con las que ya pesaron hoy primero.
export function buscarDespicadoras(registradas, termino, kilosHoy) {
  const texto = normalizarTextoPesada(termino);
  const kilosDe = nombre => {
    const clave = normalizarTextoPesada(nombre);
    if (kilosHoy instanceof Map) return kilosHoy.get(clave) || 0;
    return (kilosHoy && kilosHoy[clave]) || 0;
  };
  return (registradas || [])
    .filter(item => item && (item.nombre || '').trim())
    .filter(item => !texto
      || normalizarTextoPesada(item.nombre).includes(texto)
      || normalizarTextoPesada(item.apodo).includes(texto))
    .map(item => {
      const kilos = kilosDe(item.nombre);
      return { ...item, kilosHoy: kilos, yaPeso: kilos > 0 };
    })
    .sort((a, b) => (b.yaPeso - a.yaPeso)
      || normalizarTextoPesada(a.nombre).localeCompare(normalizarTextoPesada(b.nombre), 'es'));
}

// Neto de una pesada: kilos brutos menos el traste, con una décima exacta.
// Usa décimas enteras para no arrastrar errores de punto flotante (10.3 - 0.3 = 10.0).
export function calcularNetoPesada(bruto, traste) {
  const brutoDecimas = Math.round(Number(bruto) * 10);
  const trasteDecimas = Math.round(Number(traste || 0) * 10);
  if (!Number.isSafeInteger(brutoDecimas) || !Number.isSafeInteger(trasteDecimas)) return null;
  return (brutoDecimas - trasteDecimas) / 10;
}

// Suma una pesada neta al valor que la despicadora ya lleva en esa medida.
export function sumarPesada(actual, neto) {
  const actualDecimas = Math.round(Number(actual || 0) * 10);
  const netoDecimas = Math.round(Number(neto) * 10);
  return (actualDecimas + netoDecimas) / 10;
}

// Traste manual: decimal positivo o cero, máximo una décima (0 a 9.9).
export function parsearTraste(valor) {
  if (String(valor == null ? '' : valor).trim() === '') return null;
  const numero = decimalPesada(valor, false, false);
  if (numero == null || numero > 9.9) throw new Error('El traste debe ser de 0 a 9.9 kg.');
  return numero;
}

// Kilos brutos de la pesada: decimal positivo, máximo una décima.
export function parsearKilosBrutos(valor) {
  const numero = decimalPesada(valor, false, false);
  if (numero == null || numero <= 0) throw new Error('Escribe los kilos de la pesada.');
  return numero;
}
