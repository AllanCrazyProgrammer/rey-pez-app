// Helpers puros del modo rápido de pesadas (zoom in).
// El día guarda UN solo valor por despicadora x medida (pesos[personaId][columnaId]),
// así que cada pesada registrada en modo rápido SUMA al valor que ya lleva esa
// despicadora en esa medida, nunca lo sobrescribe.

import { decimalPesada, elementosPesadas } from './pesadas';

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

// Lo que se muestra en el campo "Otro" mientras se escribe: siempre con
// punto decimal por default, para que nunca se escriba 1 kg o más.
// "2" -> "0.2", "05" -> "0.5", ".7" -> "0.7", "0" -> "0.", "0.5" -> "0.5".
export function formatearTrasteManual(valor) {
  const texto = String(valor == null ? '' : valor).trim().replace(/[^0-9.]/g, '');
  if (texto === '') return '';
  if (texto === '0') return '0.';
  if (texto.startsWith('.')) return `0${texto}`;
  if (!texto.includes('.')) {
    const digitos = texto.replace(/^0+/, '');
    return `0.${digitos}`;
  }
  const [entero, ...resto] = texto.split('.');
  return `${entero}.${resto.join('')}`;
}

// Traste manual: SIEMPRE decimal menor a 1 kg, con punto por default.
// "2" es 0.2 kg, ".7" es 0.7 kg, "0.5" es 0.5 kg. Un valor de 1 kg o más
// no es traste: se rechaza (antes se aceptaba hasta 9.9).
export function parsearTraste(valor) {
  let texto = formatearTrasteManual(valor);
  if (texto === '') return null;
  if (texto.endsWith('.')) texto = texto.slice(0, -1);
  if (texto === '') return null;
  const numero = decimalPesada(texto, false, false);
  if (numero == null || numero >= 1) throw new Error('El traste debe ser menor a 1 kg, ej. 0.2.');
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

// Medidas por defecto (Ajustes > Medidas): se limpian, se quitan vacías y no se
// repiten (sin importar mayúsculas), en el orden en que se escribieron.
export function normalizarMedidasPorDefecto(medidas) {
  const vistas = new Set();
  const resultado = [];
  (medidas || []).forEach(medida => {
    const texto = String(medida || '').trim();
    if (!texto) return;
    const clave = normalizarTextoPesada(texto);
    if (vistas.has(clave)) return;
    vistas.add(clave);
    resultado.push(texto);
  });
  return resultado;
}

// Límite de una sola pesada para las medidas de limpio (Ajustes > Medidas).
// Una pesada de limpio no suele pasar de 30 kg; más de eso pide confirmar
// en Pesar rápido. Las medidas que NO están en la lista no tienen límite.
export const LIMITE_KILOS_MEDIDA_LIMPIO = 30;

// ¿Esta medida es una de las de limpio configuradas en Ajustes > Medidas?
export function esMedidaDeLimpio(medida, porDefecto) {
  const clave = normalizarTextoPesada(medida);
  if (!clave) return false;
  return (porDefecto || []).some(item => normalizarTextoPesada(item) === clave);
}

// ¿Esta pesada (neto de una sola pesada) excede el límite de medida de limpio?
export function excedeLimiteMedidaLimpio(medida, neto, porDefecto) {
  return esMedidaDeLimpio(medida, porDefecto) && Number(neto) > LIMITE_KILOS_MEDIDA_LIMPIO;
}

// Medidas para sugerir al escribir el nombre de una nueva columna: primero las
// por defecto (Ajustes > Medidas) y luego las ya hechas hoy. Excluye la columna
// que se está editando y no repite nombres.
export function sugerenciasMedida(columnas, idExcluir, termino, porDefecto = []) {
  const clave = normalizarTextoPesada(termino || '');
  const coincide = texto => !clave || normalizarTextoPesada(texto).includes(clave);
  const vistas = new Set();
  const resultado = [];
  normalizarMedidasPorDefecto(porDefecto).forEach(medida => {
    if (!coincide(medida)) return;
    const k = normalizarTextoPesada(medida);
    if (vistas.has(k)) return;
    vistas.add(k);
    resultado.push(medida);
  });
  columnas
    .filter(col => col.id !== idExcluir && (col.medida || '').trim())
    .filter(col => coincide(col.medida))
    .forEach(col => {
      const texto = col.medida.trim();
      const k = normalizarTextoPesada(texto);
      if (vistas.has(k)) return;
      vistas.add(k);
      resultado.push(texto);
    });
  return resultado;
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

// Pesadas que se pierden al eliminar una medida: despicadoras (no eliminadas) con kilos en esa
// columna y renglones de su pesada a granel. Si no hay ninguna, se borra sin preguntar.
export function pesadasDeMedida(datos, columnaId) {
  const pesos = (datos && datos.pesos) || {};
  const despicadoras = elementosPesadas((datos && datos.personas) || {})
    .filter(persona => {
      const valor = pesos[persona.id] && pesos[persona.id][columnaId];
      return valor != null && valor !== '';
    }).length;
  const granel = elementosPesadas(((datos && datos.granel) || {})[columnaId] || {}).length;
  return { despicadoras, granel, total: despicadoras + granel };
}
