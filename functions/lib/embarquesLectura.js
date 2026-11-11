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

  async function handleGetEmbarquesRango(req, res) {
    const desde = req.query && req.query.desde;
    const hasta = req.query && req.query.hasta;
    if (!fechaValida(desde) || !fechaValida(hasta)) {
      return errorResponse(
        res,
        400,
        'FECHA_INVALIDA',
        'Los parámetros "desde" y "hasta" son obligatorios y deben ser fechas reales en formato YYYY-MM-DD'
      );
    }
    if (hasta < desde) {
      return errorResponse(res, 400, 'RANGO_INVALIDO', 'hasta debe ser mayor o igual que desde');
    }
    const dias = Math.floor(
      (Date.parse(`${hasta}T00:00:00.000Z`) - Date.parse(`${desde}T00:00:00.000Z`)) / 86400000
    ) + 1;
    if (dias > 31) {
      return errorResponse(res, 400, 'RANGO_INVALIDO', 'El rango máximo es de 31 días');
    }

    try {
      const inicioMs = Date.parse(`${desde}T00:00:00.000Z`);
      const inicio = admin.firestore.Timestamp.fromMillis(inicioMs);
      const fin = admin.firestore.Timestamp.fromMillis(Date.parse(`${hasta}T00:00:00.000Z`) + 24 * 60 * 60 * 1000);
      const coleccion = db.collection('embarques');
      const [texto, legado] = await Promise.all([
        coleccion.where('fecha', '>=', desde).where('fecha', '<=', hasta).get(),
        coleccion.where('fecha', '>=', inicio).where('fecha', '<', fin).get(),
      ]);

      const porId = new Map();
      texto.docs.forEach((doc) => {
        const data = doc.data() || {};
        if (typeof data.fecha !== 'string' || data.fecha < desde || data.fecha > hasta) return;
        porId.set(doc.id, { id: doc.id, data });
      });
      legado.docs.forEach((doc) => {
        if (porId.has(doc.id)) return;
        const data = doc.data() || {};
        if (!esTimestamp(data.fecha)) return;
        const fechaDoc = fechaUtcDeTimestamp(data.fecha);
        if (fechaDoc < desde || fechaDoc > hasta) return;
        porId.set(doc.id, { id: doc.id, data });
      });

      const embarques = Array.from(porId.values()).sort((a, b) => {
        const fechaA = typeof a.data.fecha === 'string' ? a.data.fecha : fechaUtcDeTimestamp(a.data.fecha);
        const fechaB = typeof b.data.fecha === 'string' ? b.data.fecha : fechaUtcDeTimestamp(b.data.fecha);
        if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
        const camionA = camionNumeroDe(a.data);
        const camionB = camionNumeroDe(b.data);
        if (camionA !== camionB) return camionA - camionB;
        return String(a.id).localeCompare(String(b.id));
      });

      return res.status(200).json({
        success: true,
        desde,
        hasta,
        total: embarques.length,
        criterio: 'Colección embarques. Rango máximo 31 días. Los clientes van resumidos (id, nombre, kilosTotales, nProductos, nCrudos); el detalle completo se pide con ?fecha=.',
        calculados: false,
        nota: 'kilosCrudos y rendimientos son los valores guardados. El cociente kilosCrudos/totalEmbarcado lo calcula Rendimientos.vue en pantalla y no se persiste, salvo rendimientoManual.',
        embarques: embarques.map(({ id, data }) => resumirEmbarque(id, data)),
      });
    } catch (error) {
      console.error('Error en GET /embarques por rango:', error && error.message);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'No se pudieron listar los embarques del rango');
    }
  }

  return { handleGetEmbarques, handleGetEmbarquesRango };
}

// Kilos de un producto del embarque: suma de kilos[] menos 3 kg por tara
// normal cuando restarTaras (misma fórmula que Rendimientos.vue).
function calcularTotalKilosProducto(producto) {
  if (!producto || !Array.isArray(producto.kilos)) return 0;
  const sumaKilos = producto.kilos.reduce((total, kilo) => total + (Number(kilo) || 0), 0);
  const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
  return sumaKilos - (producto.restarTaras ? tarasNormales * 3 : 0);
}

// Kilos de un item de crudo ("cantidad-peso", sobrante y sobrante2). Si el
// peso es 19 se usa el peso de venta (20), como en Rendimientos.vue.
function calcularKilosCrudosItem(item, pesoTaraVenta = 20) {
  if (!item) return 0;
  let kilosTotales = 0;
  [item.taras, item.sobrante, item.sobrante2].forEach((texto) => {
    if (!texto) return;
    const formatoGuion = /^(\d+)-(\d+)$/.exec(String(texto));
    if (formatoGuion) {
      const cantidad = parseInt(formatoGuion[1], 10) || 0;
      let peso = parseInt(formatoGuion[2], 10) || 0;
      if (peso === 19) peso = pesoTaraVenta;
      kilosTotales += cantidad * peso;
    } else {
      const [cantidad, peso] = String(texto).split('-').map(Number);
      kilosTotales += (cantidad || 0) * (peso || 0);
    }
  });
  return kilosTotales;
}

function resumirCliente(cliente) {
  const productos = Array.isArray(cliente.productos) ? cliente.productos : [];
  const crudos = Array.isArray(cliente.crudos) ? cliente.crudos : [];
  let kilosTotales = productos.reduce((total, producto) => total + calcularTotalKilosProducto(producto), 0);
  let nCrudos = 0;
  crudos.forEach((crudo) => {
    (crudo && crudo.items ? crudo.items : []).forEach((item) => {
      nCrudos += 1;
      kilosTotales += calcularKilosCrudosItem(item);
    });
  });
  return {
    id: cliente.id == null ? null : cliente.id,
    nombre: cliente.nombre || '',
    kilosTotales: Math.round(kilosTotales * 100) / 100,
    nProductos: productos.length,
    nCrudos,
  };
}

function resumirEmbarque(id, data) {
  const completo = armarEmbarque(id, data);
  const clientes = Array.isArray(data.clientes) ? data.clientes : [];
  completo.clientes = clientes.map(resumirCliente);
  return completo;
}

module.exports = { crearHandlerEmbarques, fechaValida, serializar };
