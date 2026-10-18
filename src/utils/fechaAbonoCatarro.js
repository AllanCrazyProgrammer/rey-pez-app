// Fecha local de los abonos de Catarro. México ya no cambia el horario:
// America/Mexico_City es UTC-6 todo el año, pero se consulta la zona por si cambia.
export const ZONA_HORARIA_CATARRO = 'America/Mexico_City';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Acepta el texto con o sin acentos y el mes de septiembre como "sep" o "sept".
const PATRON_FECHA_ABONO = /(?:lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+\d{1,2}\/(?:ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic)\/\d{2}/i;

export function fechaISOEnMexico(fecha = new Date()) {
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  const valor = fecha instanceof Date ? fecha : new Date(fecha);
  const origen = Number.isNaN(valor.getTime()) ? new Date() : valor;
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA_CATARRO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(origen);
  const mapa = {};
  partes.forEach(parte => {
    if (parte.type !== 'literal') mapa[parte.type] = parte.value;
  });
  return `${mapa.year}-${mapa.month}-${mapa.day}`;
}

export function formatearFechaAbonoCatarro(fecha = new Date()) {
  const iso = fechaISOEnMexico(fecha);
  const [anio, mes, dia] = iso.split('-').map(Number);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return `${DIAS[diaSemana]} ${String(dia).padStart(2, '0')}/${MESES[mes - 1]}/${String(anio).slice(-2)}`;
}

export function descripcionTieneFechaAbono(texto) {
  return PATRON_FECHA_ABONO.test(String(texto || ''));
}

// Vacío → solo la fecha. Texto sin fecha → "<texto> - <fecha>".
// Si la descripción ya trae una fecha con este formato, se deja igual.
export function componerDescripcionAbonoCatarro(texto, fecha = new Date()) {
  const fechaTexto = formatearFechaAbonoCatarro(fecha);
  const limpio = String(texto == null ? '' : texto).trim();
  if (!limpio) return fechaTexto;
  if (descripcionTieneFechaAbono(limpio)) return limpio;
  return `${limpio} - ${fechaTexto}`;
}

export function crearAbonoCatarro(fecha = new Date(), monto = 0) {
  const fechaAbono = fechaISOEnMexico(fecha);
  return {
    descripcion: formatearFechaAbonoCatarro(fechaAbono),
    monto,
    fechaAbono,
  };
}

// Los abonos viejos no tienen fechaAbono: se devuelven tal cual.
export function normalizarAbonoCatarro(abono) {
  if (!abono || typeof abono !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(abono.fechaAbono || '')) return abono;
  const descripcion = componerDescripcionAbonoCatarro(abono.descripcion, abono.fechaAbono);
  if (descripcion === abono.descripcion) return abono;
  return { ...abono, descripcion };
}

export function fechaReferenciaAbono(abono, fechaCuenta) {
  const cuenta = String(fechaCuenta || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(cuenta)) return cuenta;
  if (/^\d{4}-\d{2}-\d{2}$/.test(abono?.fechaAbono || '')) return abono.fechaAbono;
  return '';
}

export function listarAbonosCuentasCatarro(cuentas) {
  const filas = [];
  (cuentas || []).forEach(cuenta => {
    const fechaCuenta = String(cuenta?.fecha || '').slice(0, 10);
    (cuenta?.abonos || []).forEach((abono, indice) => {
      const monto = Number(abono?.monto);
      const descripcion = String(abono?.descripcion || '').trim();
      filas.push({
        id: `${cuenta?.id || fechaCuenta}-${indice}`,
        fechaCuenta,
        monto: Number.isFinite(monto) ? monto : 0,
        descripcion: descripcion || 'Sin descripción',
        fechaAbono: abono?.fechaAbono || null,
        fechaReferencia: fechaReferenciaAbono(abono, fechaCuenta),
        indice,
      });
    });
  });
  filas.sort((a, b) => {
    const porCuenta = (b.fechaCuenta || '').localeCompare(a.fechaCuenta || '');
    if (porCuenta) return porCuenta;
    const porAbono = String(b.fechaAbono || '').localeCompare(String(a.fechaAbono || ''));
    if (porAbono) return porAbono;
    return b.indice - a.indice;
  });
  return filas;
}

export function filtrarAbonosCatarro(abonos, { mes = '', desde = '', hasta = '' } = {}) {
  return (abonos || []).filter(abono => {
    const fecha = abono.fechaReferencia || abono.fechaCuenta || '';
    if (mes && !fecha.startsWith(mes)) return false;
    if (desde && (!fecha || fecha < desde)) return false;
    if (hasta && (!fecha || fecha > hasta)) return false;
    return true;
  });
}

export function totalAbonosCatarro(abonos) {
  return (abonos || []).reduce((suma, abono) => suma + (Number(abono.monto) || 0), 0);
}
