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

// Sugerencias del modo rápido: el catálogo más las despicadoras que ya tienen
// pesada en el día, aunque no estén registradas. El catálogo manda si el nombre
// se repite (conserva el apodo). `personasDia`: [{ nombre, kilos }] del resumen.
export function sugerenciasPesada(registradas, personasDia, termino, kilosHoy) {
  const mezcladas = [...(registradas || [])];
  const claves = new Set((registradas || []).map(item => normalizarTextoPesada(item.nombre)));
  (personasDia || []).forEach(row => {
    const clave = normalizarTextoPesada(row.nombre);
    if (clave && !claves.has(clave)) {
      claves.add(clave);
      mezcladas.push({ id: `dia:${clave}`, nombre: (row.nombre || '').trim(), apodo: '' });
    }
  });
  return buscarDespicadoras(mezcladas, termino, kilosHoy);
}

// Un valor como ".7" siempre es 0.7 kg: se le antepone el cero antes de validar.
function normalizarDecimal(valor) {
  const texto = String(valor == null ? '' : valor).trim();
  return texto.startsWith('.') ? `0${texto}` : texto;
}

// Traste manual: SIEMPRE decimal, nunca entero. Un dígito solo (1-9) se toma
// como décimas: "4" es 0.4 kg, ".7" es 0.7 kg, "0.5" es 0.5 kg. Máximo 9.9.
export function parsearTraste(valor) {
  const texto = normalizarDecimal(valor);
  if (texto === '') return null;
  if (/^[1-9]$/.test(texto)) return Number(texto) / 10;
  const numero = decimalPesada(texto, false, false);
  if (numero == null || numero > 9.9) throw new Error('El traste debe ser decimal, ej. 0.4 (no enteros).');
  return numero;
}

// La siguiente medida después de la última con kilos del día (por orden).
// Null si aún no se ha pesado nada o si la última con kilos es la última columna.
export function siguienteMedida(columnas, kilosPorColumna) {
  let ultimo = -1;
  columnas.forEach((col, index) => { if ((kilosPorColumna[col.id] || 0) > 0) ultimo = index; });
  if (ultimo < 0 || ultimo + 1 >= columnas.length) return null;
  return columnas[ultimo + 1];
}

// Medidas ya hechas hoy, para sugerir al escribir el nombre de una nueva.
// Excluye la columna que se está editando y no repite nombres.
export function sugerenciasMedida(columnas, idExcluir, termino) {
  const clave = normalizarTextoPesada(termino || '');
  const vistas = new Set();
  return columnas
    .filter(col => col.id !== idExcluir && (col.medida || '').trim())
    .filter(col => !clave || normalizarTextoPesada(col.medida).includes(clave))
    .filter(col => {
      const k = normalizarTextoPesada(col.medida);
      if (vistas.has(k)) return false;
      vistas.add(k);
      return true;
    })
    .map(col => col.medida.trim());
}

// Precio por kilo de una columna: decimal positivo o cero, máximo una décima.
export function parsearPrecioColumna(valor) {
  return decimalPesada(normalizarDecimal(valor), false, false);
}

// Kilos brutos de la pesada: decimal positivo, máximo una décima.
export function parsearKilosBrutos(valor) {
  const numero = decimalPesada(normalizarDecimal(valor), false, false);
  if (numero == null || numero <= 0) throw new Error('Escribe los kilos de la pesada.');
  return numero;
}
