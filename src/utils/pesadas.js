// Money is calculated with integer tenths/hundredths, never rounded per cell.
export function decimalPesada(value, allowEmpty = true) {
  const text = String(value == null ? '' : value).trim().replace(',', '.');
  if (!text && allowEmpty) return null;
  if (!/^\d+(?:\.\d)?$/.test(text)) {
    throw new Error('Usa un número positivo o cero, con máximo un decimal.');
  }
  const [whole, fraction = '0'] = text.split('.');
  const tenths = Number(whole) * 10 + Number(fraction);
  if (!Number.isSafeInteger(tenths) || tenths > 10000000) {
    throw new Error('El valor máximo es 1000000.');
  }
  return tenths / 10;
}

export const formatoPesada = value => new Intl.NumberFormat('es-MX', {
  maximumFractionDigits: 1
}).format(value || 0);

export function fechaPesadasHoy(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function fechaPesadasValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '') || fecha < '1900-01-01') return false;
  const parsed = new Date(`${fecha}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === fecha;
}

export function formatoFechaPesadas(fecha) {
  const [year, month, day] = fecha.split('-');
  return `${Number(day)}/${Number(month)}/${year}`;
}

export function elementosPesadas(map = {}) {
  const numeroOrden = value => {
    const match = String(value == null ? '' : value).match(/^-?\d+/);
    return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
  };
  return Object.entries(map).map(([id, value]) => ({ ...value, id }))
    .filter(value => !value.eliminado)
    .sort((a, b) => numeroOrden(a.orden) - numeroOrden(b.orden)
      || String(a.orden).localeCompare(String(b.orden)) || a.id.localeCompare(b.id));
}

export function resumenPesadas(data) {
  const columns = elementosPesadas(data.columnas);
  let totalKilosDecimas = 0;
  let totalBrutoDecimas = 0;
  const personas = elementosPesadas(data.personas).filter(row => (row.nombre || '').trim()).map(row => {
    let kilosDecimas = 0;
    let importeCentesimas = 0;
    columns.forEach(column => {
      const kilos = Math.round((data.pesos?.[row.id]?.[column.id] || 0) * 10);
      const precio = Math.round(column.precio * 10);
      kilosDecimas += kilos;
      importeCentesimas += kilos * precio;
    });
    if (!Number.isSafeInteger(importeCentesimas) || !Number.isSafeInteger(kilosDecimas)) {
      throw new Error('El total supera el límite de cálculo. Revisa los valores capturados.');
    }
    const brutoDecimas = Math.floor((importeCentesimas + 5) / 10);
    totalKilosDecimas += kilosDecimas;
    totalBrutoDecimas += brutoDecimas;
    return { id: row.id, nombre: row.nombre.trim(), kilos: kilosDecimas / 10,
      bruto: brutoDecimas / 10, pago: (brutoDecimas - 10) / 10 };
  });
  const kilos = totalKilosDecimas / 10;
  const bruto = totalBrutoDecimas / 10;
  const pagos = (totalBrutoDecimas - personas.length * 10) / 10;
  const mejor = personas.length ? personas.reduce((current, person) => {
    if (!current || person.pago > current.pago || (person.pago === current.pago && person.kilos > current.kilos)) return person;
    return current;
  }, null) : null;
  return { personas, banos: personas.length, kilos, bruto, pagos, mejor,
    pagoPromedio: personas.length ? pagos / personas.length : 0,
    precioPromedio: kilos ? bruto / kilos : 0 };
}

// Field paths are generated internally with stable IDs, never from names/measures.
export function aplicarCamposPesadas(base, fields) {
  const result = JSON.parse(JSON.stringify(base || {}));
  Object.entries(fields).forEach(([path, value]) => {
    const keys = path.split('.');
    let parent = result;
    keys.slice(0, -1).forEach(key => { parent = parent[key] || (parent[key] = {}); });
    parent[keys[keys.length - 1]] = value;
  });
  return result;
}
