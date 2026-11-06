// Lógica pura del resumen de "Existencias de Crudos" (pruebas: tests/existenciasCrudosVista.test.cjs).

const normalizarTexto = (texto) => String(texto || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[.]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** El crudo pertenece a Otilio: cualquier medida cuyo nombre lo mencione. */
function esCrudoDeOtilio(nombre) {
  return normalizarTexto(nombre).includes('otilio');
}

/**
 * Une los lotes (calculados por medida + precio + cuarto + piezas) en un renglón
 * por medida, con desglose por cuarto. Los lotes del mismo cuarto se suman.
 */
function agruparLotesPorMedida(lotes) {
  const grupos = new Map();
  lotes.forEach(lote => {
    const clave = String(lote.producto).trim();
    if (!grupos.has(clave)) {
      grupos.set(clave, { ...lote, clave, kilos: 0, valor: 0, cuartos: new Map() });
    }
    const grupo = grupos.get(clave);
    const valorLote = lote.kilos * (lote.ultimoPrecio || 0);
    grupo.kilos += lote.kilos;
    grupo.valor += valorLote;
    const sub = grupo.cuartos.get(lote.cuarto);
    if (!sub) {
      grupo.cuartos.set(lote.cuarto, { ...lote, valor: valorLote });
    } else {
      sub.kilos += lote.kilos;
      sub.valor += valorLote;
      if (sub.piezas !== lote.piezas) sub.piezas = '';
      sub.ultimoPrecio = sub.kilos > 0 ? sub.valor / sub.kilos : 0;
    }
  });

  return [...grupos.values()].map(grupo => {
    const cuartos = [...grupo.cuartos.values()].sort((a, b) => a.cuarto.localeCompare(b.cuarto));
    const piezasDistintas = new Set(cuartos.map(c => c.piezas));
    return {
      ...grupo,
      cuartos,
      piezas: piezasDistintas.size === 1 ? cuartos[0].piezas : '',
      ultimoPrecio: grupo.kilos > 0 ? grupo.valor / grupo.kilos : 0,
      cuarto: cuartos.length === 1 ? cuartos[0].cuarto : `${cuartos.length} cuartos`
    };
  });
}

module.exports = { esCrudoDeOtilio, agruparLotesPorMedida };
