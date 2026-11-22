// Helpers puros de dos piezas del día de pesadas:
//
// 1) Trastes "Otro" del día. Al registrar una pesada con un traste escrito a mano, ese valor se
//    guarda en el día (`trastesDia.t5 = 0.5`) y aparece como botón junto a los predefinidos.
//
// 2) Pesada a granel (después de "Terminé de pesar"). Se pesan las taras donde cada señora vació
//    su camarón, con todo y tara. Por cada medida (columna del día) hay renglones de
//    { taras, kilos }: `granel.<columnaId>.<filaId> = { taras, kilos, orden }`. Cada tara pesa
//    2 kg por default (tara sin tapa); el día puede cambiarlo con `granelKgPorTara`.
//    Neto = kilos − taras × kg por tara. Kilos con máximo un decimal, como el resto de la hoja.

import { decimalPesada, elementosPesadas } from './pesadas';

export const KG_POR_TARA_GRANEL = 2;

// ---- Trastes del día ----

export function claveTrasteDia(valor) {
  return `t${Math.round(Number(valor) * 10)}`;
}

function trasteValido(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 && numero < 1;
}

// Predefinidos + los guardados en el día, sin repetir y de menor a mayor.
export function trastesDelDia(data, predefinidos) {
  const decimas = new Set(predefinidos.map(valor => Math.round(valor * 10)));
  Object.values((data && data.trastesDia) || {}).forEach(valor => {
    if (trasteValido(valor)) decimas.add(Math.round(Number(valor) * 10));
  });
  return [...decimas].sort((a, b) => a - b).map(valor => valor / 10);
}

// ---- Pesada a granel ----

export function kgPorTaraGranel(data) {
  const valor = Number(data && data.granelKgPorTara);
  return Number.isFinite(valor) && valor > 0 ? valor : KG_POR_TARA_GRANEL;
}

export function parsearTarasGranel(valor) {
  const texto = String(valor == null ? '' : valor).trim();
  if (!texto) return null;
  if (!/^\d{1,4}$/.test(texto)) throw new Error('Las taras van en número entero, ej. 12.');
  return Number(texto);
}

export function parsearKilosGranel(valor) {
  return decimalPesada(String(valor == null ? '' : valor).trim().replace(',', '.'), true, false);
}

export function parsearKgPorTara(valor) {
  const numero = decimalPesada(String(valor == null ? '' : valor).trim().replace(',', '.'), false, false);
  if (numero == null || numero <= 0) throw new Error('El peso por tara debe ser mayor a cero.');
  return numero;
}

const decimas = valor => Math.round(Number(valor || 0) * 10);

export function filasGranel(data, columnaId) {
  return elementosPesadas(((data && data.granel) || {})[columnaId] || {});
}

export function netoFilaGranel(fila, kgPorTara) {
  if (fila.kilos == null || fila.kilos === '') return null;
  return (decimas(fila.kilos) - (Number(fila.taras) || 0) * decimas(kgPorTara)) / 10;
}

export function resumenFilasGranel(filas, kgPorTara) {
  let taras = 0;
  let bruto = 0;
  filas.forEach(fila => {
    taras += Number(fila.taras) || 0;
    bruto += decimas(fila.kilos);
  });
  const tara = taras * decimas(kgPorTara);
  return { taras, bruto: bruto / 10, tara: tara / 10, neto: (bruto - tara) / 10 };
}

// Hora del renglón: `hora` (ms, se guarda al escribir los kilos). Los renglones de antes no la
// tienen; ahí se toma del `orden`, que empieza con Date.now() de cuando se creó.
export function horaFilaGranel(fila) {
  const hora = Number(fila && fila.hora);
  if (Number.isFinite(hora) && hora > 0) return hora;
  const desdeOrden = Number(String((fila && fila.orden) || '').split('-')[0]);
  return Number.isFinite(desdeOrden) && desdeOrden > 1e12 ? desdeOrden : null;
}

// "3:05 p.m." (12 horas, hora local).
export function formatoHora12(ms) {
  if (ms == null) return '—';
  const fecha = new Date(ms);
  const horas = fecha.getHours();
  return `${horas % 12 || 12}:${String(fecha.getMinutes()).padStart(2, '0')} ${horas < 12 ? 'a.m.' : 'p.m.'}`;
}

// Kilos en crudo de cada medida (se capturan al editar la pesada a granel desde la hoja):
// `granelCrudo.<columnaId> = 84.6`. Rendimiento = crudo ÷ neto a granel, con dos decimales (1.20).
export function crudoGranel(data, columnaId) {
  const valor = Number(((data && data.granelCrudo) || {})[columnaId]);
  return Number.isFinite(valor) && valor > 0 ? valor : null;
}

export function rendimientoGranel(crudo, neto) {
  if (!(Number(crudo) > 0) || !(Number(neto) > 0)) return null;
  return Math.round((Number(crudo) / Number(neto)) * 100) / 100;
}

export function formatoRendimiento(valor) {
  return valor == null ? '' : Number(valor).toFixed(2);
}

// Por medida (en el orden de las columnas del día) y el total. `kilosPorColumna` es lo que
// registraron las despicadoras (resumenPesadas) para comparar contra lo pesado a granel.
export function resumenGranel(data, columnas, kilosPorColumna = {}) {
  const kgPorTara = kgPorTaraGranel(data);
  const medidas = columnas.map(columna => {
    const filas = filasGranel(data, columna.id).filter(fila => fila.kilos != null && fila.kilos !== '' || Number(fila.taras) > 0);
    const despicadoras = kilosPorColumna[columna.id] || 0;
    const resumen = resumenFilasGranel(filas, kgPorTara);
    const detalle = filas.map(fila => ({ id: fila.id, taras: Number(fila.taras) || 0, kilos: fila.kilos == null || fila.kilos === '' ? null : Number(fila.kilos),
      neto: netoFilaGranel(fila, kgPorTara), hora: horaFilaGranel(fila) }));
    const crudo = crudoGranel(data, columna.id);
    return { id: columna.id, medida: columna.medida || 'Sin medida', filas: filas.length, detalle, ...resumen,
      crudo, rendimiento: rendimientoGranel(crudo, resumen.neto), despicadoras, diferencia: (decimas(resumen.neto) - decimas(despicadoras)) / 10 };
  }).filter(medida => medida.filas > 0);
  const total = resumenFilasGranel(medidas.map(medida => ({ taras: medida.taras, kilos: medida.bruto })), kgPorTara);
  const despicadoras = medidas.reduce((suma, medida) => suma + decimas(medida.despicadoras), 0) / 10;
  return { kgPorTara, medidas, total: { ...total, despicadoras, diferencia: (decimas(total.neto) - decimas(despicadoras)) / 10 } };
}
