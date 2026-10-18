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

export const METODOS_PAGO_CATARRO = [
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'deposito', etiqueta: 'Depósito' },
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'otro', etiqueta: 'Otro' },
];

const ETIQUETA_POR_METODO = METODOS_PAGO_CATARRO.reduce((mapa, metodo) => {
  mapa[metodo.valor] = metodo.etiqueta;
  return mapa;
}, {});

// Los abonos viejos no traen la propiedad. Los nuevos la traen, aunque todavía esté vacía.
export function abonoUsaMetodoPago(abono) {
  return Boolean(abono) && Object.prototype.hasOwnProperty.call(abono, 'metodoPago');
}

export function etiquetaMetodoPagoCatarro(metodoPago, metodoPagoOtro = '') {
  if (metodoPago === 'otro') return String(metodoPagoOtro || '').trim();
  return ETIQUETA_POR_METODO[metodoPago] || '';
}

// Texto para listas. Otro incluye lo escrito; un abono viejo no tiene etiqueta.
export function textoMetodoPagoVisible(abono) {
  if (!abono || !abono.metodoPago) return '';
  if (abono.metodoPago === 'otro') {
    const texto = String(abono.metodoPagoOtro || '').trim();
    return texto ? `Otro: ${texto}` : 'Otro';
  }
  return ETIQUETA_POR_METODO[abono.metodoPago] || '';
}

export function descripcionAutomaticaMetodoPago(metodoPago, metodoPagoOtro, fecha) {
  const etiqueta = etiquetaMetodoPagoCatarro(metodoPago, metodoPagoOtro);
  if (!etiqueta) return formatearFechaAbonoCatarro(fecha);
  return componerDescripcionAbonoCatarro(etiqueta, fecha);
}

function descripcionSiguePlantilla(descripcion, fecha, plantillaAnterior) {
  const actual = String(descripcion || '').trim();
  if (!actual) return true;
  if (actual === formatearFechaAbonoCatarro(fecha)) return true;
  return actual === plantillaAnterior;
}

// Cambia el tipo y recompone la descripción solo si todavía es la automática.
export function aplicarMetodoPagoAbono(abono, metodoPago, metodoPagoOtro = '') {
  const base = abono && typeof abono === 'object' ? abono : {};
  const fecha = base.fechaAbono;
  const plantillaAnterior = descripcionAutomaticaMetodoPago(base.metodoPago, base.metodoPagoOtro, fecha);
  const otro = metodoPago === 'otro' ? String(metodoPagoOtro == null ? '' : metodoPagoOtro) : '';
  const siguiente = {
    ...base,
    metodoPago,
    metodoPagoOtro: metodoPago === 'otro' ? otro : '',
  };
  const actual = String(base.descripcion || '').trim();
  if (descripcionSiguePlantilla(actual, fecha, plantillaAnterior)) {
    siguiente.descripcion = descripcionAutomaticaMetodoPago(metodoPago, otro, fecha);
  } else {
    siguiente.descripcion = componerDescripcionAbonoCatarro(actual, fecha);
  }
  return siguiente;
}

export function errorMetodoPagoAbono(abono) {
  if (!abonoUsaMetodoPago(abono)) return '';
  if (!abono.metodoPago) return 'Elige el tipo de pago del abono.';
  if (!ETIQUETA_POR_METODO[abono.metodoPago]) return 'Elige un tipo de pago válido.';
  if (abono.metodoPago === 'otro' && !String(abono.metodoPagoOtro || '').trim()) {
    return 'Escribe el tipo de pago.';
  }
  return '';
}

export function validarAbonosCatarro(abonos) {
  const lista = abonos || [];
  for (let indice = 0; indice < lista.length; indice += 1) {
    const mensaje = errorMetodoPagoAbono(lista[indice]);
    if (mensaje) return { valido: false, indice, mensaje };
  }
  return { valido: true, indice: -1, mensaje: '' };
}

export function crearAbonoCatarro(fecha = new Date(), monto = 0) {
  const fechaAbono = fechaISOEnMexico(fecha);
  return {
    descripcion: formatearFechaAbonoCatarro(fechaAbono),
    monto,
    fechaAbono,
    metodoPago: '',
    metodoPagoOtro: '',
  };
}

function descripcionNormalizadaAbono(abono) {
  if (abonoUsaMetodoPago(abono) && abono.metodoPago) {
    const soloFecha = formatearFechaAbonoCatarro(abono.fechaAbono);
    const limpio = String(abono.descripcion || '').trim();
    if (!limpio || limpio === soloFecha) {
      return descripcionAutomaticaMetodoPago(abono.metodoPago, abono.metodoPagoOtro, abono.fechaAbono);
    }
    return componerDescripcionAbonoCatarro(limpio, abono.fechaAbono);
  }
  return componerDescripcionAbonoCatarro(abono.descripcion, abono.fechaAbono);
}

// Los abonos viejos no tienen fechaAbono: se devuelven tal cual.
export function normalizarAbonoCatarro(abono) {
  if (!abono || typeof abono !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(abono.fechaAbono || '')) return abono;
  const descripcion = descripcionNormalizadaAbono(abono);
  if (descripcion === abono.descripcion) return abono;
  return { ...abono, descripcion };
}

// Quita el texto de Otro cuando el tipo no lo usa, para no guardarlo de más.
export function abonoCatarroParaGuardar(abono) {
  const normalizado = normalizarAbonoCatarro(abono);
  if (!abonoUsaMetodoPago(normalizado)) return normalizado;
  const salida = { ...normalizado, metodoPago: normalizado.metodoPago };
  if (normalizado.metodoPago === 'otro') salida.metodoPagoOtro = String(normalizado.metodoPagoOtro || '').trim();
  else delete salida.metodoPagoOtro;
  return salida;
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
      const metodoPago = ETIQUETA_POR_METODO[abono?.metodoPago] ? abono.metodoPago : '';
      filas.push({
        id: `${cuenta?.id || fechaCuenta}-${indice}`,
        fechaCuenta,
        monto: Number.isFinite(monto) ? monto : 0,
        descripcion: descripcion || 'Sin descripción',
        fechaAbono: abono?.fechaAbono || null,
        fechaReferencia: fechaReferenciaAbono(abono, fechaCuenta),
        metodoPago,
        metodoPagoOtro: metodoPago === 'otro' ? String(abono?.metodoPagoOtro || '').trim() : '',
        etiquetaMetodo: textoMetodoPagoVisible(abono),
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

export function filtrarAbonosCatarro(abonos, { mes = '', desde = '', hasta = '', metodo = '' } = {}) {
  return (abonos || []).filter(abono => {
    const fecha = abono.fechaReferencia || abono.fechaCuenta || '';
    if (mes && !fecha.startsWith(mes)) return false;
    if (desde && (!fecha || fecha < desde)) return false;
    if (hasta && (!fecha || fecha > hasta)) return false;
    if (metodo === 'sin-tipo') return !abono.metodoPago;
    if (metodo && abono.metodoPago !== metodo) return false;
    return true;
  });
}

export function totalAbonosCatarro(abonos) {
  return (abonos || []).reduce((suma, abono) => suma + (Number(abono.monto) || 0), 0);
}
