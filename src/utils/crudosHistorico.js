// Historial de crudos embarcados por día, para compararlos entre años.
// Lógica pura y sin imports (las pruebas la cargan como módulo suelto).
//
// Cada renglón de crudo guarda taras y hasta dos sobrantes como texto:
//   "10-19"   → 10 taras de 19 kg
//   "10-18.5" → 10 taras de 18.5 kg
//   "1-10"    → 1 tara de 10 kg (sobrante)
//   "10"      → 10 taras (se toman de 19 kg, el peso real de la tara)
// Taras: el primer número, igual que el "Total de taras" del embarque.
// Kilos: cantidad × peso (19 kg cuando no se escribe el peso).

export const VERSION_EXPORTACION = 1;
const PESO_TARA_KG = 19;

const redondear = (n) => Math.round(n * 10) / 10;

export function leerCampoTaras(valor) {
  const texto = String(valor == null ? '' : valor).trim();
  const conPeso = texto.match(/^(\d+)\s*-\s*(\d+(?:\.\d+)?)/);
  if (conPeso) {
    const taras = Number(conPeso[1]) || 0;
    return { taras, kilos: taras * (Number(conPeso[2]) || 0) };
  }
  const soloCantidad = texto.match(/^(\d+)/);
  if (soloCantidad) {
    const taras = Number(soloCantidad[1]) || 0;
    return { taras, kilos: taras * PESO_TARA_KG };
  }
  return { taras: 0, kilos: 0 };
}

export function medirCrudoItem(item) {
  if (!item) return { taras: 0, kilos: 0 };
  return [item.taras, item.sobrante, item.sobrante2]
    .map(leerCampoTaras)
    .reduce((t, c) => ({ taras: t.taras + c.taras, kilos: t.kilos + c.kilos }), { taras: 0, kilos: 0 });
}

// Misma regla que normalizarFechaValor (utils/dateUtils): fecha en UTC, AAAA-MM-DD.
export function fechaEmbarque(valor) {
  if (!valor) return null;
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) return valor.slice(0, 10);
  let fecha = null;
  if (typeof valor.toDate === 'function') fecha = valor.toDate();
  else if (typeof (valor.seconds ?? valor._seconds) === 'number') fecha = new Date((valor.seconds ?? valor._seconds) * 1000);
  else if (valor instanceof Date) fecha = valor;
  else fecha = new Date(valor);
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;
  return fecha.toISOString().slice(0, 10);
}

// Los embarques guardan los crudos en clientes[].crudos; los más viejos,
// en un mapa clienteCrudos { idCliente: [grupos] }.
function gruposPorCliente(embarque) {
  const clientes = Array.isArray(embarque.clientes) ? embarque.clientes : [];
  const conCrudos = clientes.filter(c => Array.isArray(c && c.crudos) && c.crudos.length);
  if (conCrudos.length) {
    return conCrudos.map(c => ({ cliente: String(c.nombre || c.id || 'Sin cliente'), grupos: c.crudos }));
  }
  const mapa = embarque.clienteCrudos || embarque.clientesCrudos || {};
  const nombres = new Map(clientes.map(c => [String(c && c.id), c && c.nombre]));
  return Object.entries(mapa)
    .filter(([, grupos]) => Array.isArray(grupos))
    .map(([id, grupos]) => ({ cliente: String(nombres.get(String(id)) || id), grupos }));
}

// Devuelve renglones { fecha, cliente, talla, taras, kilos, embarques },
// sumados por fecha + cliente + talla y ordenados por fecha.
export function filasCrudosDeEmbarques(embarques) {
  const acumulado = new Map();
  (embarques || []).forEach(embarque => {
    if (!embarque) return;
    const fecha = fechaEmbarque(embarque.fecha || embarque.fechaRegistro);
    if (!fecha) return;
    gruposPorCliente(embarque).forEach(({ cliente, grupos }) => {
      grupos.forEach(grupo => {
        const items = grupo && Array.isArray(grupo.items) ? grupo.items : [];
        items.forEach(item => {
          const talla = String((item && (item.talla || item.medida)) || '').trim();
          if (!talla) return;
          const { taras, kilos } = medirCrudoItem(item);
          if (!taras && !kilos) return;
          const clave = `${fecha}|${cliente}|${talla}`;
          const fila = acumulado.get(clave) || { fecha, cliente, talla, taras: 0, kilos: 0, embarques: new Set() };
          fila.taras += taras;
          fila.kilos += kilos;
          if (embarque.id) fila.embarques.add(embarque.id);
          acumulado.set(clave, fila);
        });
      });
    });
  });
  return [...acumulado.values()]
    .map(f => ({ ...f, kilos: redondear(f.kilos), embarques: f.embarques.size || 1 }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.cliente.localeCompare(b.cliente) || a.talla.localeCompare(b.talla));
}

export function exportarHistorialCrudos(embarques, generado = new Date()) {
  const filas = filasCrudosDeEmbarques(embarques);
  return {
    tipo: 'reypez-historial-crudos',
    version: VERSION_EXPORTACION,
    generado: generado.toISOString(),
    totalEmbarques: (embarques || []).length,
    filas: filas.map(({ fecha, cliente, talla, taras, kilos }) => ({ fecha, cliente, talla, taras, kilos }))
  };
}
