/**
 * Lógica pura de inventario compartida entre la Cloud Function y los tests.
 * No depende de Firebase ni de la UI; funciones puras para cálculos FIFO,
 * parsing de medidas, normalización de cuartos, etc.
 */

const ZONA_INVENTARIO = 'America/Mexico_City';

/**
 * Normaliza el cuarto frío a la representación canónica usada en el sistema.
 * @param {string} cuarto - Nombre del cuarto (puede ser vacío, null, undefined)
 * @returns {string} Cuarto normalizado ('s/c' si no especificado)
 */
function normalizeCuarto(cuarto) {
  const valor = cuarto && cuarto.trim() ? cuarto.trim() : 's/c';
  return valor.toLowerCase() === 'sin cuarto designado' ? 's/c' : valor;
}

/**
 * Parsea una medida de salida que puede incluir precio y cuarto.
 * Formatos esperados:
 * - "51/60"
 * - "51/60 ($120)"
 * - "51/60 ($120) - Cuarto: Cuarto 1"
 * - "🕐 51/60 ($120)" (más antiguo)
 * @param {string} display - Medida como se muestra en la UI
 * @returns {{medidaBase: string, precio: number|null, cuartoFrio: string}}
 */
function parseSalidaMedida(display) {
  if (!display) {
    return { medidaBase: '', precio: null, cuartoFrio: normalizeCuarto('') };
  }
  let texto = display.trim();
  // Remover emoji de "más antiguo"
  if (texto.startsWith('🕐 ')) {
    texto = texto.substring(2).trim();
  }

  let cuartoFrio = null;
  if (texto.includes(' - Cuarto: ')) {
    const partes = texto.split(' - Cuarto: ');
    texto = partes[0].trim();
    cuartoFrio = partes[1] ? partes[1].trim() : null;
  }

  let medidaBase = texto;
  let precio = null;

  if (texto.includes(' ($')) {
    const precioMatch = texto.match(/\(\$(\d+(?:\.\d+)?)\)/);
    if (precioMatch) {
      precio = Number(precioMatch[1]);
      medidaBase = texto.split(' ($')[0];
    }
  } else if (texto.includes(' - (')) {
    medidaBase = texto.split(' - (')[0];
    precio = null;
  }

  return { medidaBase, precio, cuartoFrio: normalizeCuarto(cuartoFrio) };
}

/**
 * Convierte un Timestamp de Admin SDK a fecha de calendario YYYY-MM-DD en la zona
 * de inventario (America/Mexico_City).
 * @param {admin.firestore.Timestamp|Date|string} valor - Timestamp a convertir
 * @returns {string|null} Fecha en formato YYYY-MM-DD o null si inválido
 */
function fechaRegistroAdmin(valor) {
  if (!valor) return null;
  if (typeof valor === 'string') {
    // Si ya está en formato YYYY-MM-DD, devolverlo
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
    // Si es ISO con hora, extraer la fecha
    if (/^\d{4}-\d{2}-\d{2}T/.test(valor)) return valor.slice(0, 10);
  }
  try {
    // Admin SDK: valor.seconds, valor.toDate()
    const segundos = valor.seconds ?? valor._seconds;
    const date = typeof valor.toDate === 'function' ? valor.toDate() 
      : typeof segundos === 'number' ? new Date(segundos * 1000) 
      : valor instanceof Date ? valor : new Date(valor);
    
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: ZONA_INVENTARIO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    
    const parte = tipo => partes.find(p => p.type === tipo).value;
    return `${parte('year')}-${parte('month')}-${parte('day')}`;
  } catch (_) {
    return null;
  }
}

/**
 * Crea un Date representando la medianoche del día de calendario dado en la zona de inventario.
 * @param {string} fechaStr - Fecha en formato YYYY-MM-DD
 * @returns {Date} Date a medianoche en America/Mexico_City
 */
function medianocheMexico(fechaStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    throw new Error(`Fecha inválida: ${fechaStr}, esperaba YYYY-MM-DD`);
  }
  // Crear un timestamp UTC "mediodía" para ese día de calendario y ajustar por offset
  const [año, mes, dia] = fechaStr.split('-').map(Number);
  const utcNoon = Date.UTC(año, mes - 1, dia, 12, 0, 0);
  const tempDate = new Date(utcNoon);
  
  // Obtener el offset en minutos para esa fecha específica
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA_INVENTARIO,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(tempDate);
  
  const number = name => Number(parts.find(part => part.type === name).value);
  const localAsUTC = Date.UTC(
    number('year'), number('month') - 1, number('day'),
    number('hour'), number('minute'), number('second')
  );
  const offset = (localAsUTC - (tempDate.getTime() - tempDate.getUTCMilliseconds())) / 60000;
  
  // Ahora crear medianoche UTC ajustada
  const midnightUTC = Date.UTC(año, mes - 1, dia, 0, 0, 0);
  return new Date(midnightUTC - offset * 60000);
}

/**
 * Calcula el fin del día (23:59:59.999) en la zona de inventario.
 * @param {string} fechaStr - Fecha en formato YYYY-MM-DD
 * @returns {Date} Date al final del día
 */
function finDiaMexico(fechaStr) {
  const midnight = medianocheMexico(fechaStr);
  // Sumar 24 horas y restar 1 ms
  return new Date(midnight.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Calcula los kilos disponibles para una combinación de proveedor+medida+precio+cuarto
 * usando FIFO hasta una fecha límite (inclusive).
 * 
 * @param {Object} params
 * @param {string} params.proveedor - Nombre del proveedor
 * @param {string} params.medidaBase - Medida base (e.g. '51/60')
 * @param {number|null} params.precio - Precio por kilo (null si sin precio)
 * @param {string} params.cuarto - Cuarto frío normalizado (o 's/c')
 * @param {Array} params.sacadas - Array de documentos de sacadas ordenados por fecha
 * @param {string} params.fechaLimite - Fecha límite en formato YYYY-MM-DD (inclusive)
 * @param {Array} params.entradasLocales - Entradas no guardadas del día actual
 * @param {Array} params.salidasLocales - Salidas no guardadas del día actual
 * @param {string} params.sacadaIdActual - ID de la sacada en edición (para excluirla)
 * @param {boolean} params.todosLosCuartos - Si true, suma todos los cuartos
 * @returns {{disponibles: number, lotes: Array, totalEntradas: number, totalSalidas: number}}
 */
function calcularDisponibles({
  proveedor,
  medidaBase,
  precio,
  cuarto,
  sacadas,
  fechaLimite,
  entradasLocales = [],
  salidasLocales = [],
  sacadaIdActual = null,
  todosLosCuartos = false
}) {
  const precioNormalizado = precio !== null && precio !== undefined ? precio : null;
  const cuartoNormalizado = normalizeCuarto(cuarto);
  
  const lotes = [];
  let totalEntradas = 0;
  let totalSalidas = 0;
  
  const fechaLimiteDate = finDiaMexico(fechaLimite);
  
  // Función auxiliar para verificar si un movimiento coincide
  const coincideMovimiento = (movimiento) => {
    const medidaCoincide = movimiento.proveedor === proveedor && movimiento.medida === medidaBase;
    const precioCoincide = precioNormalizado === null
      ? (movimiento.precio === null || movimiento.precio === undefined)
      : movimiento.precio === precioNormalizado;
    const cuartoCoincide = todosLosCuartos
      ? true
      : normalizeCuarto(movimiento.cuartoFrio) === cuartoNormalizado;
    
    return medidaCoincide && precioCoincide && cuartoCoincide;
  };
  
  // Procesar sacadas históricas
  for (const sacada of sacadas) {
    // Excluir la sacada en edición (se procesa desde los arrays locales)
    if (sacadaIdActual && sacada.id === sacadaIdActual) continue;
    
    const sacadaFecha = sacada.fecha;
    const sacadaDate = sacadaFecha instanceof Date ? sacadaFecha
      : typeof sacadaFecha.toDate === 'function' ? sacadaFecha.toDate()
      : new Date(sacadaFecha);
    
    if (sacadaDate > fechaLimiteDate) continue;
    
    // Procesar entradas
    const entradas = sacada.entradas || [];
    for (const entrada of entradas) {
      if (coincideMovimiento(entrada)) {
        const kilos = Number(entrada.kilos) || 0;
        totalEntradas += kilos;
        lotes.push({
          kilos,
          fecha: sacadaDate,
          cuartoFrio: normalizeCuarto(entrada.cuartoFrio)
        });
      }
    }
    
    // Procesar salidas con FIFO
    const salidas = sacada.salidas || [];
    for (const salida of salidas) {
      if (coincideMovimiento(salida)) {
        const kilos = Number(salida.kilos) || 0;
        totalSalidas += kilos;
        let kilosPendientes = kilos;
        
        // Ordenar lotes por fecha (FIFO)
        lotes.sort((a, b) => a.fecha - b.fecha);
        
        for (let i = 0; i < lotes.length && kilosPendientes > 0; i++) {
          const lote = lotes[i];
          if (lote.kilos >= kilosPendientes) {
            lote.kilos -= kilosPendientes;
            kilosPendientes = 0;
          } else {
            kilosPendientes -= lote.kilos;
            lote.kilos = 0;
          }
        }
        
        // Filtrar lotes vacíos
        lotes.splice(0, lotes.length, ...lotes.filter(l => l.kilos > 0));
      }
    }
  }
  
  // Procesar movimientos locales (no guardados)
  for (const entrada of entradasLocales) {
    if (coincideMovimiento(entrada)) {
      const kilos = Number(entrada.kilos) || 0;
      totalEntradas += kilos;
      lotes.push({
        kilos,
        fecha: new Date(),
        cuartoFrio: normalizeCuarto(entrada.cuartoFrio)
      });
    }
  }
  
  for (const salida of salidasLocales) {
    if (coincideMovimiento(salida)) {
      const kilos = Number(salida.kilos) || 0;
      totalSalidas += kilos;
      let kilosPendientes = kilos;
      
      lotes.sort((a, b) => a.fecha - b.fecha);
      
      for (let i = 0; i < lotes.length && kilosPendientes > 0; i++) {
        const lote = lotes[i];
        if (lote.kilos >= kilosPendientes) {
          lote.kilos -= kilosPendientes;
          kilosPendientes = 0;
        } else {
          kilosPendientes -= lote.kilos;
          lote.kilos = 0;
        }
      }
      
      lotes.splice(0, lotes.length, ...lotes.filter(l => l.kilos > 0));
    }
  }
  
  const disponibles = lotes.reduce((sum, lote) => sum + lote.kilos, 0);
  
  return {
    disponibles: Number(disponibles.toFixed(1)),
    lotes,
    totalEntradas,
    totalSalidas
  };
}

/**
 * Encuentra todas las combinaciones únicas de precio+cuarto para una medida de proveedor
 * con stock disponible (FIFO) hasta una fecha límite.
 * 
 * @param {Object} params
 * @param {string} params.proveedor - Nombre del proveedor
 * @param {string} params.medidaBase - Medida base (e.g. '51/60')
 * @param {Array} params.sacadas - Array de documentos de sacadas ordenados por fecha
 * @param {string} params.fechaLimite - Fecha límite en formato YYYY-MM-DD (inclusive)
 * @param {Array} params.entradasLocales - Entradas no guardadas del día actual
 * @param {string} params.sacadaIdActual - ID de la sacada en edición
 * @returns {Array<{precio: number|null, cuarto: string, kilos: number, primeraFecha: Date}>}
 */
function obtenerOpcionesDisponibles({
  proveedor,
  medidaBase,
  sacadas,
  fechaLimite,
  entradasLocales = [],
  sacadaIdActual = null
}) {
  const opciones = new Map();
  
  const fechaLimiteDate = finDiaMexico(fechaLimite);
  
  // Recolectar todas las combinaciones de precio+cuarto de entradas
  for (const sacada of sacadas) {
    if (sacadaIdActual && sacada.id === sacadaIdActual) continue;
    
    const sacadaFecha = sacada.fecha;
    const sacadaDate = sacadaFecha instanceof Date ? sacadaFecha
      : typeof sacadaFecha.toDate === 'function' ? sacadaFecha.toDate()
      : new Date(sacadaFecha);
    
    if (sacadaDate > fechaLimiteDate) continue;
    
    const entradas = sacada.entradas || [];
    for (const entrada of entradas) {
      if (entrada.proveedor === proveedor && entrada.medida === medidaBase) {
        const precioNorm = entrada.precio !== null && entrada.precio !== undefined 
          ? entrada.precio : null;
        const cuartoNorm = normalizeCuarto(entrada.cuartoFrio);
        const key = `${precioNorm}__${cuartoNorm}`;
        
        if (!opciones.has(key)) {
          opciones.set(key, { precio: precioNorm, cuarto: cuartoNorm });
        }
      }
    }
  }
  
  // Incluir entradas locales
  for (const entrada of entradasLocales) {
    if (entrada.proveedor === proveedor && entrada.medida === medidaBase) {
      const precioNorm = entrada.precio !== null && entrada.precio !== undefined 
        ? entrada.precio : null;
      const cuartoNorm = normalizeCuarto(entrada.cuartoFrio);
      const key = `${precioNorm}__${cuartoNorm}`;
      
      if (!opciones.has(key)) {
        opciones.set(key, { precio: precioNorm, cuarto: cuartoNorm });
      }
    }
  }
  
  // Para cada opción, calcular disponibles
  const resultado = [];
  for (const [key, { precio, cuarto }] of opciones) {
    const { disponibles, lotes } = calcularDisponibles({
      proveedor,
      medidaBase,
      precio,
      cuarto,
      sacadas,
      fechaLimite,
      entradasLocales,
      salidasLocales: [],
      sacadaIdActual,
      todosLosCuartos: false
    });
    
    if (disponibles > 0) {
      const primeraFecha = lotes.length > 0 ? lotes[0].fecha : null;
      resultado.push({ precio, cuarto, kilos: disponibles, primeraFecha });
    }
  }
  
  // Ordenar por fecha más antigua primero (FIFO)
  resultado.sort((a, b) => {
    if (!a.primeraFecha) return 1;
    if (!b.primeraFecha) return -1;
    return a.primeraFecha - b.primeraFecha;
  });
  
  return resultado;
}

module.exports = {
  normalizeCuarto,
  parseSalidaMedida,
  fechaRegistroAdmin,
  medianocheMexico,
  finDiaMexico,
  calcularDisponibles,
  obtenerOpcionesDisponibles,
  ZONA_INVENTARIO
};
