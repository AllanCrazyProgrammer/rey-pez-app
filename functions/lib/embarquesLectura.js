/**
 * GET /embarques?fecha=YYYY-MM-DD
 *
 * Lee la colección `embarques`, que es donde NuevoEmbarque persiste el día
 * (`fecha` como texto YYYY-MM-DD en prepararDatosEmbarque). Un mismo día puede
 * tener varios documentos: el editor asigna `camionNumero` con el máximo ya
 * usado ese día más uno. Rendimientos, al abrir un id, fusiona los del día y
 * se queda con los kilosCrudos del principal; esta ruta no elige principal,
 * no fusiona y no filtra clientes: devuelve cada documento.
 *
 * Los embarques viejos pueden traer `fecha` como Timestamp. Esos se buscan
 * solo en el día UTC pedido (el mismo criterio que normalizarFechaISO), no
 * leyendo el histórico.
 *
 * kilosCrudos y los campos de CAMPOS_RENDIMIENTOS se devuelven como están
 * guardados. El cociente kilosCrudos / totalEmbarcado lo calcula
 * Rendimientos.vue en pantalla y no se persiste, salvo `rendimientoManual`.
 */

const admin = require('firebase-admin');

const CAMPOS_RENDIMIENTO = [
  'rendimientoManual',
  'medidaOculta',
  'analizarGanancia',
  'analizarGananciaCrudos',
  'analizarMaquilaGanancia',
  'precioMaquila',
  'pesoTaraCosto',
  'pesoTaraVenta',
  'nombresMedidasPersonalizados',
  'notaRendimientos',
  'totalGanancias',
  'costosPorMedida',
];

function fechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaUtc = new Date(Date.UTC(anio, mes - 1, dia));
  return fechaUtc.getUTCFullYear() === anio
    && fechaUtc.getUTCMonth() === mes - 1
    && fechaUtc.getUTCDate() === dia;
}

function fechaUtcDeTimestamp(timestamp) {
  const fecha = timestamp.toDate();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getUTCDate()).padStart(2, '0');
  return `${fecha.getUTCFullYear()}-${mes}-${dia}`;
}

function esTimestamp(valor) {
  return Boolean(valor)
    && typeof valor.toDate === 'function'
    && Number.isInteger(valor.seconds)
    && Number.isInteger(valor.nanoseconds);
}

function serializar(valor) {
  if (valor == null || typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
    return valor;
  }
  if (esTimestamp(valor)) {
    return {
      tipo: 'timestamp',
      seconds: valor.seconds,
      nanoseconds: valor.nanoseconds,
      iso: valor.toDate().toISOString(),
    };
  }
  if (valor instanceof Date) {
    return { tipo: 'date', iso: valor.toISOString() };
  }
  const clase = valor.constructor && valor.constructor.name;
  if (clase === 'Bytes' && typeof valor.toBase64 === 'function') {
    return { tipo: 'bytes', base64: valor.toBase64() };
  }
  if (clase === 'GeoPoint' && typeof valor.latitude === 'number') {
    return { tipo: 'geopoint', latitude: valor.latitude, longitude: valor.longitude };
  }
  if (clase === 'DocumentReference' && typeof valor.path === 'string') {
    return { tipo: 'referencia', path: valor.path };
  }
  if (Array.isArray(valor)) return valor.map(serializar);
  if (typeof valor === 'object') {
    const proto = Object.getPrototypeOf(valor);
    if (proto === Object.prototype || proto === null) {
      const salida = {};
      Object.keys(valor).forEach((clave) => {
        salida[clave] = serializar(valor[clave]);
      });
      return salida;
    }
  }
  return { tipo: 'desconocido', clase: clase || 'objeto' };
}

function camionNumeroDe(data) {
  const numero = Number(data.camionNumero);
  return Number.isFinite(numero) && numero > 0 ? numero : 1;
}

function armarEmbarque(id, data) {
  const rendimientos = {};
  CAMPOS_RENDIMIENTO.forEach((campo) => {
    if (Object.prototype.hasOwnProperty.call(data, campo)) {
      rendimientos[campo] = serializar(data[campo]);
    }
  });
  const rev = Number(data.rev);
  return {
    id,
    fecha: serializar(data.fecha),
    camionNumero: camionNumeroDe(data),
    cargaCon: data.cargaCon == null ? null : serializar(data.cargaCon),
    borrador: typeof data.borrador === 'boolean' ? data.borrador : null,
    rev: Number.isFinite(rev) ? rev : null,
    clientes: Array.isArray(data.clientes) ? serializar(data.clientes) : [],
    kilosCrudos: data.kilosCrudos && typeof data.kilosCrudos === 'object'
      ? serializar(data.kilosCrudos)
      : {},
    rendimientos,
    ultimaEdicion: data.ultimaEdicion ? serializar(data.ultimaEdicion) : null,
  };
}

function crearHandlerEmbarques({ db, errorResponse }) {
  async function handleGetEmbarques(req, res) {
    const fecha = req.query && req.query.fecha;
    if (!fechaValida(fecha)) {
      return errorResponse(
        res,
        400,
        'FECHA_INVALIDA',
        'El parámetro "fecha" es obligatorio y debe ser una fecha real en formato YYYY-MM-DD'
      );
    }

    try {
      const inicioMs = Date.parse(`${fecha}T00:00:00.000Z`);
      const inicio = admin.firestore.Timestamp.fromMillis(inicioMs);
      const fin = admin.firestore.Timestamp.fromMillis(inicioMs + 24 * 60 * 60 * 1000);
      const coleccion = db.collection('embarques');
      const [texto, legado] = await Promise.all([
        coleccion.where('fecha', '==', fecha).get(),
        coleccion.where('fecha', '>=', inicio).where('fecha', '<', fin).get(),
      ]);

      const porId = new Map();
      texto.docs.forEach((doc) => {
        const data = doc.data() || {};
        if (data.fecha !== fecha) return;
        porId.set(doc.id, armarEmbarque(doc.id, data));
      });
      legado.docs.forEach((doc) => {
        if (porId.has(doc.id)) return;
        const data = doc.data() || {};
        if (!esTimestamp(data.fecha) || fechaUtcDeTimestamp(data.fecha) !== fecha) return;
        porId.set(doc.id, armarEmbarque(doc.id, data));
      });

      const embarques = Array.from(porId.values()).sort((a, b) => {
        if (a.camionNumero !== b.camionNumero) return a.camionNumero - b.camionNumero;
        return String(a.id).localeCompare(String(b.id));
      });

      if (!embarques.length) {
        return errorResponse(
          res,
          404,
          'EMBARQUE_NO_ENCONTRADO',
          'No hay embarque guardado para esa fecha. No se devuelven documentos de otros días.'
        );
      }

      return res.status(200).json({
        fecha,
        total: embarques.length,
        criterio: 'Colección embarques. Incluye el texto fecha == YYYY-MM-DD que guarda NuevoEmbarque y, si existen, Timestamps de ese día UTC. Varios camiones del día se devuelven todos, ordenados por camionNumero y luego id. No se fusionan ni se filtra por cliente.',
        calculados: false,
        nota: 'kilosCrudos y rendimientos son los valores guardados. El cociente kilosCrudos/totalEmbarcado lo calcula Rendimientos.vue y no se persiste; rendimientoManual sí, cuando la pantalla lo guardó.',
        embarques,
      });
    } catch (error) {
      console.error('Error en GET /embarques:', error && error.message);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'No se pudieron leer los embarques de esa fecha');
    }
  }

  return { handleGetEmbarques };
}

module.exports = { crearHandlerEmbarques, fechaValida, serializar };
