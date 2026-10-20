import { elementosPesadas, fechaPesadasValida, resumenPesadas } from './pesadas';

function ymdDesdeFecha(fecha, utc) {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;
  const año = utc ? fecha.getUTCFullYear() : fecha.getFullYear();
  const mes = String((utc ? fecha.getUTCMonth() : fecha.getMonth()) + 1).padStart(2, '0');
  const dia = String(utc ? fecha.getUTCDate() : fecha.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

/**
 * Día de pesadas que le corresponde a un embarque.
 * Las jornadas viven en `pesadasDiarias` con id y campo `fecha` en YYYY-MM-DD,
 * la misma cadena de `/pesadas/:fecha`. No se sustituye por "hoy" si el
 * embarque no trae fecha: eso abriría la jornada equivocada.
 * - `YYYY-MM-DD` o ISO: se conserva el prefijo, sin recorrer zonas horarias.
 * - Timestamp (`seconds`, `_seconds` o `toDate`): componentes UTC, igual que
 *   al abrir Preparación desde el embarque.
 * - `Date`: componentes del calendario local.
 */
export function fechaPesadasDelEmbarque(valor) {
  if (valor == null || valor === '') return null;
  let iso = null;
  if (typeof valor === 'string') {
    const match = valor.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    iso = match ? match[1] : null;
  } else if (valor instanceof Date) {
    iso = ymdDesdeFecha(valor, false);
  } else if (typeof valor === 'object') {
    if (typeof valor.toDate === 'function') {
      iso = ymdDesdeFecha(valor.toDate(), true);
    } else {
      const seconds = valor.seconds ?? valor._seconds;
      if (typeof seconds === 'number') iso = ymdDesdeFecha(new Date(seconds * 1000), true);
    }
  }
  return fechaPesadasValida(iso) ? iso : null;
}

function claveMedida(medida) {
  return String(medida || '').trim().replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/').toLocaleLowerCase('es-MX');
}

// La hoja de despique suele usar la talla corta (36) y el embarque la completa
// (36/40). Mantener separados otros rangos, sufijos y nombres de producto.
function claveComparacion(medida) {
  const clave = claveMedida(medida);
  const tallas = ['26/30', '31/35', '36/40', '41/50', '51/60', '61/70', '71/90', '91/110'];
  return tallas.includes(clave) ? clave.split('/')[0] : clave;
}

export function compararDespiqueEmbarcado(despique = [], embarcado = []) {
  const filas = new Map();
  const obtener = medida => {
    const clave = claveComparacion(medida) || 'sin medida';
    if (!filas.has(clave)) filas.set(clave, {
      medida: String(medida || '').trim() || 'Sin medida',
      despique: null,
      embarcado: 0
    });
    return filas.get(clave);
  };
  const centavos = valor => Number.isFinite(Number(valor)) ? Math.round(Number(valor) * 100) : 0;
  despique.forEach(grupo => {
    const fila = obtener(grupo.medida);
    fila.despique = (fila.despique || 0) + centavos(grupo.kilos);
  });
  embarcado.forEach(grupo => {
    obtener(grupo.medida).embarcado += centavos(grupo.kilos);
  });
  const grupos = [...filas.values()].map(fila => ({
    medida: fila.medida,
    despique: fila.despique === null ? null : fila.despique / 100,
    embarcado: fila.embarcado / 100,
    diferencia: fila.despique === null ? null : (fila.despique - fila.embarcado) / 100
  }));
  const despiqueTotal = [...filas.values()].reduce((total, fila) => total + (fila.despique || 0), 0);
  const embarcadoTotal = [...filas.values()].reduce((total, fila) => total + fila.embarcado, 0);
  return {
    grupos,
    totalDespique: despiqueTotal / 100,
    totalEmbarcado: embarcadoTotal / 100,
    // Si falta una medida del despique, no presentar un faltante inventado.
    diferencia: grupos.length && grupos.every(fila => fila.despique !== null)
      ? (despiqueTotal - embarcadoTotal) / 100 : null
  };
}

export function filtrarPesadasPorDia(jornadas, fecha) {
  const objetivo = fechaPesadasDelEmbarque(fecha);
  if (!objetivo) return [];
  return (Array.isArray(jornadas) ? jornadas : []).filter(jornada => {
    if (!jornada || jornada.eliminado) return false;
    const dia = fechaPesadasDelEmbarque(jornada.fecha != null ? jornada.fecha : jornada.id);
    return dia === objetivo;
  });
}

function personasConNombre(data) {
  return elementosPesadas(data.personas).filter(row => (row.nombre || '').trim());
}

function decimasTara(valor) {
  if (valor == null || valor === '') return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return Math.round(numero * 10);
}

/**
 * Agrupa una jornada de `pesadasDiarias` por medida.
 * Los kilos siguen el mismo criterio que la hoja del día (filas con nombre,
 * columnas vivas, décimas enteras). Las taras salen de `taras[personaId][columnaId]`
 * cuando la jornada las trae; si no existen, `tieneTaras` queda en falso.
 */
export function agruparPesadasPorMedida(jornada) {
  const data = jornada || {};
  const resumen = resumenPesadas(data);
  const columns = elementosPesadas(data.columnas);
  const personas = personasConNombre(data);
  const tarasDecimasEnOrden = [];
  const indiceMedida = new Map();
  let totalTarasDecimas = 0;
  let tieneTaras = false;
  let tienePesadas = false;

  columns.forEach(column => {
    const key = claveMedida(column.medida);
    if (!indiceMedida.has(key)) {
      indiceMedida.set(key, tarasDecimasEnOrden.length);
      tarasDecimasEnOrden.push(0);
    }
    const indice = indiceMedida.get(key);
    personas.forEach(persona => {
      const peso = data.pesos?.[persona.id]?.[column.id];
      if (peso != null && peso !== '') tienePesadas = true;
      const decimas = decimasTara(data.taras?.[persona.id]?.[column.id]);
      if (decimas == null) return;
      tieneTaras = true;
      tienePesadas = true;
      tarasDecimasEnOrden[indice] += decimas;
      totalTarasDecimas += decimas;
    });
  });

  const grupos = resumen.kilosPorMedida.map((grupo, indice) => ({
    medida: grupo.medida,
    kilos: grupo.kilos,
    taras: (tarasDecimasEnOrden[indice] || 0) / 10
  }));

  return {
    grupos,
    totalKilos: resumen.kilos,
    totalTaras: totalTarasDecimas / 10,
    tieneTaras,
    tienePesadas
  };
}
