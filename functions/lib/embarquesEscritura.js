/**
 * Escritura de embarques por API.
 *
 * Hasta 2026-11-12 los embarques solo se podían crear/llenar desde la app
 * (navegador) o con ajustes directos en Firestore: no había rutas API.
 * Estas rutas reproducen lo que hace la app (NuevoEmbarque +
 * prepararDatosEmbarque + ProductoItem/CrudoItem), con el mismo patrón del
 * resto del asistente: dryRun + idempotencyKey, log en asistenteLog y
 * respuesta guardada en asistenteIdem.
 *
 * Rutas:
 * - POST /embarques           crear embarque (fecha, camionNumero?,
 *        cargaCon?). Si ya existe un embarque ese día con ese camión,
 *        devuelve 409 en vez de duplicar. Sin camionNumero usa máx+1 del
 *        día, como la app (obtenerCamionNumeroParaFecha).
 * - POST /embarques/cliente   agregar líneas limpias a un cliente del
 *        embarque (lo crea si no existe). Si la línea (medida+tipo+esVenta)
 *        ya existe, SUMA los kilos a la línea (como los pedidos limpios).
 * - POST /embarques/crudos    agregar items crudos a un cliente del
 *        embarque (medida/talla, taras "N-P", barco?).
 * - POST /embarques/linea     editar una línea limpia existente (kilos
 *        y/o precio). Solo cambia los campos enviados.
 *
 * Precios de línea (NUNCA se toca el precio general):
 * - Si el caller manda precio, se guarda en la línea como precio manual
 *   (precioOrigen 'manual', precioFecha null, precioClienteId = id del
 *   cliente en el embarque), igual que cuando el usuario escribe el precio
 *   con el botón "$" en la app. Para Ozuna maquila (esVenta false) el
 *   origen es 'maquila' y además se guarda precioMaquila.
 * - Si no manda precio, se resuelve el que corresponde con la misma lógica
 *   de la app (obtenerPrecioVentaParaFecha de rendimientos.js: específico
 *   del cliente si es más reciente, si no el general; para embarques
 *   recientes el más reciente sin mirar la fecha). Para Ozuna maquila se
 *   usa el "Precio maquila Ozuna" de la colección precios (fallback 21).
 * - Un precio resuelto se guarda SOLO en la línea (precio/precioOrigen/
 *   precioFecha/precioClienteId/precioMedidaBase). Jamás se escribe en la
 *   colección precios.
 *
 * rev: cada escritura sube rev en 1. El editor de la app ignora un snapshot
 * cuya rev no se movió (lo trata como eco de su propio guardado), así que
 * sin el incremento la escritura desaparecería en pantalla.
 * borrador: se recalcula como la app (embarqueTieneContenidoOperativo):
 * cargaCon, kilos/taras en productos o items de crudo => no es borrador.
 *
 * Limitaciones conocidas:
 * - Tipo C/H20: los kilos se guardan en kilos[], como en las demás líneas.
 *   La vista de rendimientos calcula los kilos de una línea C/H20 desde
 *   reporteTaras x reporteBolsas x camaronNeto, no desde kilos[], así que
 *   una línea C/H20 creada por API sin reporte muestra 0 en rendimientos
 *   hasta que el reporte se llene en la app.
 * - No hay deshacer para estas rutas (las de rendimientos/barcos sí lo
 *   tienen); si hace falta, se revierte editando la línea con
 *   POST /embarques/linea.
 */

const admin = require('firebase-admin');
const { fechaValida } = require('./embarquesLectura');
const { normalizarNombreProductoPrecio } = require('./preciosVenta');
const {
  obtenerPrecioVentaParaFecha,
  obtenerClienteIdParaPrecios,
} = require('./rendimientos')._internos;

const PRECIO_MAQUILA_OZUNA_PRODUCTO = 'Precio maquila Ozuna';
const PRECIO_MAQUILA_OZUNA_FALLBACK = 21;

const CLIENTES_PREDEFINIDOS = [
  { id: '1', nombre: 'Joselito' },
  { id: '2', nombre: 'Catarro' },
  { id: '3', nombre: 'Otilio' },
  { id: '4', nombre: 'Ozuna' },
  { id: '5', nombre: 'Veronica' },
];

const MAPAS_CLIENTES = [
  'clientesReglaOtilio',
  'clientesJuntarMedidas',
  'clientesSumarKgCatarro',
  'clientesIncluirPrecios',
  'clientesCuentaEnPdf',
];

function deepClone(valor) {
  if (valor === undefined || valor === null) return valor;
  try {
    return JSON.parse(JSON.stringify(valor));
  } catch (error) {
    return valor;
  }
}

function normalizarNombre(nombre) {
  return String(nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function validarIdempotencyKey(body) {
  const key = body && body.idempotencyKey;
  if (!key || typeof key !== 'string' || !key.trim() || key.includes('/')) {
    return { error: 'IDEMPOTENCY_KEY_REQUERIDA', message: 'idempotencyKey es requerido y no puede contener "/"' };
  }
  return null;
}

function validarTipo(tipo) {
  if (typeof tipo !== 'string' || !tipo.trim()) return null;
  const t = tipo.trim().toLowerCase();
  if (t === 's/h20' || t === 'c/h20' || t === 'otro') return t;
  if (/^\d+(\.\d+)?$/.test(t)) return t;
  return null;
}

function validarKilos(valor, { permitirCero = false } = {}) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0 || (!permitirCero && n <= 0)) return null;
  return n;
}

function validarPrecio(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function buscarCliente(clientes, nombre) {
  const buscadoExacto = String(nombre || '').trim();
  // Primero coincidencia exacta: el embarque puede tener dos clientes que
  // solo difieren por mayúsculas (ej. "alito" vacío y "Alito" con kilos).
  const exacto = (clientes || []).find((c) => String(c.nombre || '').trim() === buscadoExacto);
  if (exacto) return exacto;
  const buscado = normalizarNombre(nombre);
  const alias = buscado === 'lorena' ? 'veronica' : buscado;
  return (clientes || []).find((c) => {
    const n = normalizarNombre(c.nombre);
    return n === buscado || n === alias;
  }) || null;
}

function predefinidoPorNombre(nombre) {
  const buscado = normalizarNombre(nombre);
  const alias = buscado === 'lorena' ? 'veronica' : buscado;
  return CLIENTES_PREDEFINIDOS.find((c) => {
    const n = normalizarNombre(c.nombre);
    return n === buscado || n === alias;
  }) || null;
}

function esOzuna(nombre) {
  return normalizarNombre(nombre) === 'ozuna';
}

/**
 * Devuelve { clientes, cliente, creado, cambios } donde cambios trae los
 * campos extra a escribir además de `clientes` (clientesPersonalizados y
 * los mapas por cliente) cuando el cliente no existía.
 */
function asegurarCliente(data, nombre, generarAsistenteId) {
  const clientes = Array.isArray(data.clientes) ? [...data.clientes] : [];
  const existente = buscarCliente(clientes, nombre);
  if (existente) {
    return { clientes, cliente: existente, creado: false, cambios: {} };
  }
  const pre = predefinidoPorNombre(nombre);
  let cliente;
  const cambios = {};
  if (pre) {
    cliente = { id: pre.id, nombre: pre.nombre, productos: [], crudos: [] };
  } else {
    const id = generarAsistenteId();
    cliente = { id, nombre: String(nombre).trim(), productos: [], crudos: [] };
    const personalizados = Array.isArray(data.clientesPersonalizados)
      ? [...data.clientesPersonalizados]
      : [];
    personalizados.push({
      id,
      nombre: String(nombre).trim(),
      personalizado: true,
      editable: true,
      key: `personalizado_${id}`,
    });
    cambios.clientesPersonalizados = personalizados;
  }
  clientes.push(cliente);
  MAPAS_CLIENTES.forEach((campo) => {
    const mapa = { ...(data[campo] || {}) };
    if (mapa[cliente.id] === undefined) {
      mapa[cliente.id] = campo === 'clientesReglaOtilio' && cliente.id === '3';
    }
    cambios[campo] = mapa;
  });
  return { clientes, cliente, creado: true, cambios };
}

function tieneContenidoOperativo(data) {
  if (String(data.cargaCon || '').trim()) return true;
  for (const cliente of (data.clientes || [])) {
    for (const p of (cliente.productos || [])) {
      if ((p.kilos || []).some((k) => Number(k) > 0)) return true;
      if ((p.taras || []).some((t) => Number(t) > 0)) return true;
      if ((p.tarasExtra || []).some((t) => Number(t) > 0)) return true;
      if ((p.reporteTaras || []).some((t) => Number(t) > 0)) return true;
    }
    for (const crudo of (cliente.crudos || [])) {
      for (const item of (crudo.items || [])) {
        if (item.taras || item.sobrante || item.sobrante2) return true;
        if (Number(item.kilos) > 0) return true;
      }
    }
  }
  return false;
}

function ultimaEdicionAsistente() {
  return { username: 'asistente', timestamp: new Date().toISOString() };
}

// Precios de la colección `precios` (misma carga que rendimientos.js) +
// el precio de maquila de Ozuna (el más reciente, fallback 21).
async function cargarPreciosVenta(db) {
  const snap = await db.collection('precios').orderBy('fecha', 'desc').get();
  const preciosVenta = {};
  let precioMaquila = null;
  snap.docs.forEach((docSnap) => {
    const precio = { id: docSnap.id, ...docSnap.data() };
    if (String(precio.producto || '').trim() === PRECIO_MAQUILA_OZUNA_PRODUCTO) {
      if (precioMaquila === null) {
        const valor = Number(precio.precio);
        precioMaquila = Number.isFinite(valor) && valor > 0 ? valor : null;
      }
      return;
    }
    const clave = normalizarNombreProductoPrecio(precio.producto).toLowerCase().trim();
    if (!clave) return;
    if (!preciosVenta[clave]) preciosVenta[clave] = [];
    preciosVenta[clave].push(precio);
  });
  Object.values(preciosVenta).forEach((lista) =>
    lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)));
  return {
    preciosVenta,
    precioMaquila: precioMaquila === null ? PRECIO_MAQUILA_OZUNA_FALLBACK : precioMaquila,
  };
}

// Precio que le corresponde a una línea si el caller no manda uno explícito.
// Devuelve null si no hay precio en el sistema para esa medida.
function resolverPrecio({ medida, fechaEmbarque, nombreCliente, esOzunaMaquila, preciosVenta, precioMaquila }) {
  if (esOzunaMaquila) {
    return {
      precio: precioMaquila,
      precioOrigen: 'maquila',
      precioFecha: fechaEmbarque,
      precioClienteId: 'ozuna',
      precioMedidaBase: medida,
    };
  }
  const clienteIdPrecios = obtenerClienteIdParaPrecios(nombreCliente);
  const registro = obtenerPrecioVentaParaFecha(medida, fechaEmbarque, clienteIdPrecios, preciosVenta);
  if (!registro) return null;
  return {
    precio: Number(registro.precio),
    precioOrigen: registro.clienteId ? 'especifico' : 'general',
    precioFecha: registro.fecha,
    precioClienteId: registro.clienteId || null,
    precioMedidaBase: medida,
  };
}

// Precio escrito a mano en la línea (botón "$" en la app): origen manual
// (maquila si es Ozuna sin venta), fecha null, cliente = id del cliente en
// el embarque. Nunca toca la colección precios.
function precioManual({ precio, medida, clienteIdEmbarque, esOzunaMaquila }) {
  const base = {
    precio: Number(precio),
    precioFecha: null,
    precioMedidaBase: medida,
    precioBorradoManualmente: false,
  };
  if (esOzunaMaquila) {
    return {
      ...base,
      precioMaquila: Number(precio),
      precioOrigen: 'maquila',
      precioClienteId: 'ozuna',
    };
  }
  return { ...base, precioOrigen: 'manual', precioClienteId: clienteIdEmbarque || null };
}

function crearProductoLimpio({ generarAsistenteId, clienteId, nombreCliente, medida, tipo, kilos, nota, esVenta, precioCampos }) {
  const producto = {
    id: generarAsistenteId(),
    clienteId,
    medida,
    tipo,
    tipoPersonalizado: '',
    nota: nota || '',
    pesadasIds: [],
    reportesIds: [],
    tarasExtraIds: [],
    taras: [null],
    kilos: [kilos],
    reporteTaras: [],
    reporteBolsas: [],
    tarasExtra: [],
    restarTaras: true,
    camaronNeto: 0.65,
    multiplicadorBolsas: 1,
    showSuggestions: false,
    esVenta: Boolean(esVenta),
    isEditing: true,
    isNew: true,
    noSumarKilos: false,
    refrigerar: false,
    pedidoReferencia: null,
    nombreCliente,
  };
  if (precioCampos) Object.assign(producto, precioCampos);
  return producto;
}

function crearCrudoItem({ generarAsistenteId, medida, taras, barco, precioCampos, esVenta }) {
  const cantidad = parseInt(String(taras).split('-')[0], 10) || 0;
  const item = {
    id: generarAsistenteId(),
    talla: medida,
    medida,
    barco: barco || '',
    taras,
    sobrante: null,
    sobrante2: null,
    mostrarSobrante: false,
    mostrarSobrante2: false,
    pedidoReferencia: { taras: cantidad },
  };
  if (esVenta !== undefined) item.esVenta = Boolean(esVenta);
  if (precioCampos) Object.assign(item, precioCampos);
  return item;
}

// Misma medida + mismo tipo + mismo esVenta (Ozuna maquila y venta con la
// misma medida son líneas distintas en rendimientos).
function mismaLinea(a, b) {
  return String(a.medida || '').trim().toLowerCase() === String(b.medida || '').trim().toLowerCase()
    && String(a.tipo || '').trim().toLowerCase() === String(b.tipo || '').trim().toLowerCase()
    && Boolean(a.esVenta) === Boolean(b.esVenta);
}

function kilosTotalesLinea(producto) {
  const suma = (producto.kilos || []).reduce((t, k) => t + (Number(k) || 0), 0);
  const taras = (producto.taras || []).reduce((t, v) => t + (Number(v) || 0), 0);
  return suma - (producto.restarTaras ? taras * 3 : 0);
}

// Embarques de una fecha (texto y legado Timestamp), como el GET.
// `leer` es la función que ejecuta una query: q.get() fuera de una
// transacción, o transaction.get(q) dentro de ella.
async function embarquesDeFecha(db, fecha, leer) {
  const get = leer || ((q) => q.get());
  const inicioMs = Date.parse(`${fecha}T00:00:00.000Z`);
  const inicio = admin.firestore.Timestamp.fromMillis(inicioMs);
  const fin = admin.firestore.Timestamp.fromMillis(inicioMs + 24 * 60 * 60 * 1000);
  const coleccion = db.collection('embarques');
  const [texto, legado] = await Promise.all([
    get(coleccion.where('fecha', '==', fecha)),
    get(coleccion.where('fecha', '>=', inicio).where('fecha', '<', fin)),
  ]);
  const porId = new Map();
  texto.docs.forEach((doc) => {
    const data = doc.data() || {};
    if (data.fecha !== fecha) return;
    porId.set(doc.id, data);
  });
  legado.docs.forEach((doc) => {
    if (porId.has(doc.id)) return;
    const data = doc.data() || {};
    if (!data.fecha || typeof data.fecha.toDate !== 'function') return;
    const f = data.fecha.toDate();
    const iso = `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`;
    if (iso !== fecha) return;
    porId.set(doc.id, data);
  });
  return Array.from(porId.entries()).map(([id, data]) => ({ id, data }));
}

function crearHandlersEmbarquesEscritura({ db, admin: adminDep, errorResponse, generarAsistenteId }) {
  const adminRef = adminDep || admin;

  async function revisarIdem(idemRef, operation) {
    const snap = await idemRef.get();
    if (snap.exists && snap.data().operation === operation) {
      return snap.data().response;
    }
    return null;
  }

  // --- POST /embarques: crear embarque ---
  async function handlePostEmbarques(req, res) {
    const body = req.body || {};
    const { fecha, cargaCon } = body;
    let { camionNumero } = body;
    const { idempotencyKey, dryRun = false } = body;
    const operation = 'embarques_crear';

    if (!fechaValida(fecha)) {
      return errorResponse(res, 400, 'FECHA_INVALIDA', 'La fecha es requerida y debe ser una fecha real en formato YYYY-MM-DD');
    }
    const keyError = validarIdempotencyKey(body);
    if (keyError) return errorResponse(res, 400, keyError.error, keyError.message);
    if (camionNumero !== undefined && camionNumero !== null) {
      camionNumero = Number(camionNumero);
      if (!Number.isInteger(camionNumero) || camionNumero < 1) {
        return errorResponse(res, 400, 'CAMION_INVALIDO', 'camionNumero debe ser un entero mayor o igual a 1');
      }
    }
    if (cargaCon !== undefined && cargaCon !== null && typeof cargaCon !== 'string') {
      return errorResponse(res, 400, 'CARGA_CON_INVALIDA', 'cargaCon debe ser texto');
    }
    const cargaConLimpia = typeof cargaCon === 'string' ? cargaCon.trim() : '';

    try {
      const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
      const ya = await revisarIdem(idemRef, operation);
      if (ya) return res.json(ya);

      const existentes = await embarquesDeFecha(db, fecha);
      let camion = camionNumero;
      if (camion === undefined || camion === null) {
        const maximo = existentes.reduce((m, e) => Math.max(m, Number(e.data.camionNumero) || 1), 0);
        camion = maximo + 1;
      } else {
        const duplicado = existentes.find((e) => Number(e.data.camionNumero) === camion);
        if (duplicado) {
          return errorResponse(res, 409, 'EMBARQUE_YA_EXISTE',
            `Ya existe un embarque para ${fecha} con camión ${camion} (id ${duplicado.id}). Usa otro camión o edita ese embarque.`,
            { embarqueId: duplicado.id, fecha, camionNumero: camion });
        }
      }

      const embarqueId = generarAsistenteId();
      const clientes = CLIENTES_PREDEFINIDOS.map((c) => ({
        id: c.id, nombre: c.nombre, productos: [], crudos: [],
      }));
      const mapasBase = {};
      CLIENTES_PREDEFINIDOS.forEach((c) => {
        mapasBase[c.id] = false;
      });
      const doc = {
        fecha,
        cargaCon: cargaConLimpia,
        camionNumero: camion,
        productosEliminados: {},
        borrador: !cargaConLimpia,
        clientesJuntarMedidas: { ...mapasBase },
        clientesReglaOtilio: { ...mapasBase, 3: true },
        clientesIncluirPrecios: { ...mapasBase },
        clientesCuentaEnPdf: { ...mapasBase },
        clientesSumarKgCatarro: { ...mapasBase },
        clientesPersonalizados: [],
        embarqueBloqueado: false,
        clientes,
        rev: 1,
        ultimaEdicion: ultimaEdicionAsistente(),
      };

      const response = {
        success: true,
        operation,
        embarqueId,
        fecha,
        camionNumero: camion,
        cargaCon: cargaConLimpia,
        clientes: CLIENTES_PREDEFINIDOS.map((c) => c.nombre),
        rev: 1,
        nota: 'El número REC (REC_001, REC_002...) es un índice de la lista en la app, no se guarda en el documento: el embarque se identifica por su id.',
      };

      if (dryRun) {
        return res.json({ ...response, dryRun: true, message: 'Simulación exitosa (sin escribir a Firestore)' });
      }

      await db.runTransaction(async (transaction) => {
        const idemActual = await transaction.get(idemRef);
        if (idemActual.exists && idemActual.data().operation === operation) {
          throw { code: 'IDEMPOTENTE', response: idemActual.data().response };
        }
        const frescos = await embarquesDeFecha(db, fecha, (q) => transaction.get(q));
        const duplicado = frescos.find((e) => Number(e.data.camionNumero) === camion);
        if (duplicado) {
          throw {
            code: 'EMBARQUE_YA_EXISTE',
            message: `Ya existe un embarque para ${fecha} con camión ${camion} (id ${duplicado.id}).`,
            status: 409,
            details: { embarqueId: duplicado.id, fecha, camionNumero: camion },
          };
        }
        const ref = db.collection('embarques').doc(embarqueId);
        transaction.set(ref, doc);
        const logRef = db.collection('asistenteLog').doc();
        transaction.set(logRef, {
          operation,
          timestamp: adminRef.firestore.FieldValue.serverTimestamp(),
          idempotencyKey,
          embarqueId,
          fecha,
          camionNumero: camion,
          cargaCon: cargaConLimpia,
          request: { fecha, camionNumero: camion, cargaCon: cargaConLimpia },
        });
        transaction.set(idemRef, {
          operation,
          timestamp: adminRef.firestore.FieldValue.serverTimestamp(),
          response,
          logId: logRef.id,
        });
      });

      const guardada = await idemRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) return errorResponse(res, error.status || 500, error.code, error.message, error.details);
      console.error('Error en POST /embarques:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al crear el embarque: ' + error.message);
    }
  }

  // Carga el embarque o responde 404. Devuelve { ref, data }.
  async function cargarEmbarque(embarqueId, res) {
    const ref = db.collection('embarques').doc(embarqueId);
    const snap = await ref.get();
    if (!snap.exists) {
      errorResponse(res, 404, 'EMBARQUE_NO_ENCONTRADO', `No existe el embarque ${embarqueId}.`);
      return null;
    }
    return { ref, data: snap.data() || {} };
  }

  // Aplica los campos calculados dentro de la transacción (rev+1, log, idem).
  async function escribirCambios({ transaction, idemRef, operation, response, logExtra, embarqueRef, campos, request }) {
    const idemActual = await transaction.get(idemRef);
    if (idemActual.exists && idemActual.data().operation === operation) {
      throw { code: 'IDEMPOTENTE', response: idemActual.data().response };
    }
    const frescoSnap = await transaction.get(embarqueRef);
    if (!frescoSnap.exists) {
      throw { code: 'EMBARQUE_NO_ENCONTRADO', message: 'El embarque fue eliminado durante la operación.', status: 404 };
    }
    const dataFresca = frescoSnap.data() || {};
    const revNueva = (Number(dataFresca.rev) || 0) + 1;
    transaction.update(embarqueRef, { ...campos, rev: revNueva, ultimaEdicion: ultimaEdicionAsistente() });
    const logRef = db.collection('asistenteLog').doc();
    transaction.set(logRef, {
      operation,
      timestamp: adminRef.firestore.FieldValue.serverTimestamp(),
      idempotencyKey: request.idempotencyKey,
      embarqueId: embarqueRef.id,
      revNueva,
      ...logExtra,
      request,
    });
    transaction.set(idemRef, {
      operation,
      timestamp: adminRef.firestore.FieldValue.serverTimestamp(),
      response: { ...response, rev: revNueva },
      logId: logRef.id,
    });
    return revNueva;
  }

  // --- POST /embarques/cliente: líneas limpias a un cliente ---
  async function handlePostEmbarquesCliente(req, res) {
    const body = req.body || {};
    const { embarqueId, cliente, productos } = body;
    const { idempotencyKey, dryRun = false } = body;
    const operation = 'embarques_cliente';

    if (!embarqueId || typeof embarqueId !== 'string') {
      return errorResponse(res, 400, 'EMBARQUE_ID_REQUERIDO', 'embarqueId es requerido.');
    }
    if (!cliente || typeof cliente !== 'string' || !cliente.trim()) {
      return errorResponse(res, 400, 'CLIENTE_REQUERIDO', 'cliente (nombre) es requerido.');
    }
    const keyError = validarIdempotencyKey(body);
    if (keyError) return errorResponse(res, 400, keyError.error, keyError.message);
    if (!Array.isArray(productos) || productos.length === 0) {
      return errorResponse(res, 400, 'PRODUCTOS_REQUERIDOS', 'productos debe ser una lista con al menos una línea.');
    }
    const normalizados = [];
    for (let i = 0; i < productos.length; i += 1) {
      const p = productos[i] || {};
      const medida = typeof p.medida === 'string' ? p.medida.trim() : '';
      if (!medida) {
        return errorResponse(res, 400, 'MEDIDA_REQUERIDA', `productos[${i}].medida es requerida.`);
      }
      const tipo = validarTipo(p.tipo);
      if (!tipo) {
        return errorResponse(res, 400, 'TIPO_INVALIDO', `productos[${i}].tipo debe ser S/H20, C/H20 u otro factor (ej. 1.5).`);
      }
      const kilos = validarKilos(p.kilos);
      if (kilos === null) {
        return errorResponse(res, 400, 'KILOS_INVALIDOS', `productos[${i}].kilos debe ser un número mayor a 0.`);
      }
      let precio = null;
      if (p.precio !== undefined && p.precio !== null) {
        precio = validarPrecio(p.precio);
        if (precio === null) {
          return errorResponse(res, 400, 'PRECIO_INVALIDO', `productos[${i}].precio debe ser un número mayor a 0.`);
        }
      }
      if (p.nota !== undefined && p.nota !== null && typeof p.nota !== 'string') {
        return errorResponse(res, 400, 'NOTA_INVALIDA', `productos[${i}].nota debe ser texto.`);
      }
      if (p.esVenta !== undefined && typeof p.esVenta !== 'boolean') {
        return errorResponse(res, 400, 'ES_VENTA_INVALIDO', `productos[${i}].esVenta debe ser true o false.`);
      }
      normalizados.push({
        medida, tipo, kilos, precio,
        nota: typeof p.nota === 'string' ? p.nota : '',
        esVenta: p.esVenta === true,
      });
    }

    try {
      const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
      const ya = await revisarIdem(idemRef, operation);
      if (ya) return res.json(ya);

      const cargado = await cargarEmbarque(embarqueId, res);
      if (!cargado) return null;
      const { ref: embarqueRef, data } = cargado;
      const { preciosVenta, precioMaquila } = await cargarPreciosVenta(db);
      const fechaEmbarque = typeof data.fecha === 'string' ? data.fecha : null;

      const calcular = (docData) => {
        const asegurado = asegurarCliente(docData, cliente, generarAsistenteId);
        const { cliente: clienteDoc } = asegurado;
        const productosAntes = deepClone(clienteDoc.productos || []);
        const lineas = [];
        normalizados.forEach((p) => {
          const esOzunaMaquila = esOzuna(clienteDoc.nombre) && !p.esVenta;
          const existente = (clienteDoc.productos || []).find((prod) => mismaLinea(prod, p));
          let precioCampos = null;
          let origenPrecio = null;
          if (p.precio !== null) {
            precioCampos = precioManual({
              precio: p.precio, medida: p.medida,
              clienteIdEmbarque: clienteDoc.id, esOzunaMaquila,
            });
            origenPrecio = 'manual';
          } else if (!existente || existente.precio === undefined || existente.precio === null) {
            const resuelto = resolverPrecio({
              medida: p.medida, fechaEmbarque, nombreCliente: clienteDoc.nombre,
              esOzunaMaquila, preciosVenta, precioMaquila,
            });
            if (resuelto) {
              precioCampos = resuelto;
              origenPrecio = resuelto.precioOrigen;
            }
          }
          if (existente) {
            const kilosAntes = kilosTotalesLinea(existente);
            const kilosArr = Array.isArray(existente.kilos) ? [...existente.kilos] : [];
            if (kilosArr.length === 0) kilosArr.push(p.kilos);
            else kilosArr[0] = (Number(kilosArr[0]) || 0) + p.kilos;
            existente.kilos = kilosArr;
            if (p.nota) existente.nota = p.nota;
            if (precioCampos) Object.assign(existente, precioCampos);
            lineas.push({
              medida: p.medida, tipo: p.tipo, accion: 'sumada',
              kilosAntes, kilosDespues: kilosTotalesLinea(existente),
              precio: existente.precio !== undefined ? existente.precio : null,
              precioOrigen: existente.precioOrigen || null,
            });
          } else {
            const nuevo = crearProductoLimpio({
              generarAsistenteId,
              clienteId: clienteDoc.id,
              nombreCliente: clienteDoc.nombre,
              medida: p.medida, tipo: p.tipo, kilos: p.kilos,
              nota: p.nota, esVenta: p.esVenta, precioCampos,
            });
            if (!clienteDoc.productos) clienteDoc.productos = [];
            clienteDoc.productos.push(nuevo);
            lineas.push({
              medida: p.medida, tipo: p.tipo, accion: 'creada',
              kilosAntes: 0, kilosDespues: p.kilos,
              precio: nuevo.precio !== undefined ? nuevo.precio : null,
              precioOrigen: nuevo.precioOrigen || null,
            });
          }
        });
        const campos = {
          clientes: asegurado.clientes,
          ...asegurado.cambios,
          borrador: tieneContenidoOperativo({ ...docData, clientes: asegurado.clientes }) ? false : Boolean(docData.borrador),
        };
        return { campos, lineas, clienteDoc, creado: asegurado.creado, productosAntes };
      };

      const calc = calcular(deepClone(data));
      const response = {
        success: true,
        operation,
        embarqueId,
        cliente: { id: calc.clienteDoc.id, nombre: calc.clienteDoc.nombre, creado: calc.creado },
        lineas: calc.lineas,
        rev: (Number(data.rev) || 0) + 1,
      };

      if (dryRun) {
        return res.json({ ...response, dryRun: true, message: 'Simulación exitosa (sin escribir a Firestore)' });
      }

      await db.runTransaction(async (transaction) => {
        const frescoSnap = await transaction.get(embarqueRef);
        if (!frescoSnap.exists) {
          throw { code: 'EMBARQUE_NO_ENCONTRADO', message: 'El embarque fue eliminado durante la operación.', status: 404 };
        }
        const calcFresco = calcular(deepClone(frescoSnap.data() || {}));
        // La respuesta se construye COMPLETA desde el cálculo dentro de la
        // transacción: el cálculo previo genera uuids (cliente/producto)
        // que se descartan, y reportar esos ids sería mentir.
        const respuesta = {
          success: true,
          operation,
          embarqueId,
          cliente: { id: calcFresco.clienteDoc.id, nombre: calcFresco.clienteDoc.nombre, creado: calcFresco.creado },
          lineas: calcFresco.lineas,
          rev: (Number(frescoSnap.data().rev) || 0) + 1,
        };
        await escribirCambios({
          transaction, idemRef, operation,
          response: respuesta,
          logExtra: {
            cliente: calcFresco.clienteDoc.nombre,
            clienteId: calcFresco.clienteDoc.id,
            clienteCreado: calcFresco.creado,
            lineas: calcFresco.lineas,
            productosAntes: calcFresco.productosAntes,
          },
          embarqueRef,
          campos: calcFresco.campos,
          request: { embarqueId, cliente, productos: normalizados, idempotencyKey },
        });
      });

      const guardada = await idemRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) return errorResponse(res, error.status || 500, error.code, error.message, error.details);
      console.error('Error en POST /embarques/cliente:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al agregar el cliente al embarque: ' + error.message);
    }
  }

  // --- POST /embarques/crudos: items crudos a un cliente ---
  async function handlePostEmbarquesCrudos(req, res) {
    const body = req.body || {};
    const { embarqueId, cliente, items } = body;
    const { idempotencyKey, dryRun = false } = body;
    const operation = 'embarques_crudos';

    if (!embarqueId || typeof embarqueId !== 'string') {
      return errorResponse(res, 400, 'EMBARQUE_ID_REQUERIDO', 'embarqueId es requerido.');
    }
    if (!cliente || typeof cliente !== 'string' || !cliente.trim()) {
      return errorResponse(res, 400, 'CLIENTE_REQUERIDO', 'cliente (nombre) es requerido.');
    }
    const keyError = validarIdempotencyKey(body);
    if (keyError) return errorResponse(res, 400, keyError.error, keyError.message);
    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(res, 400, 'ITEMS_REQUERIDOS', 'items debe ser una lista con al menos un item.');
    }
    const normalizados = [];
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i] || {};
      const medida = typeof it.medida === 'string' ? it.medida.trim() : '';
      if (!medida) {
        return errorResponse(res, 400, 'MEDIDA_REQUERIDA', `items[${i}].medida (talla, ej. "Gde c/c") es requerida.`);
      }
      const taras = typeof it.taras === 'string' ? it.taras.trim() : '';
      if (!/^(\d+)-(\d+)$/.test(taras)) {
        return errorResponse(res, 400, 'TARAS_INVALIDAS', `items[${i}].taras debe ser "cantidad-peso", ej. "5-19".`);
      }
      if (it.barco !== undefined && it.barco !== null && typeof it.barco !== 'string') {
        return errorResponse(res, 400, 'BARCO_INVALIDO', `items[${i}].barco debe ser texto.`);
      }
      if (it.esVenta !== undefined && typeof it.esVenta !== 'boolean') {
        return errorResponse(res, 400, 'ES_VENTA_INVALIDO', `items[${i}].esVenta debe ser true o false.`);
      }
      // esVenta solo si viene: undefined no es valor válido en Firestore
      // (el log guarda el request tal cual).
      const norm = {
        medida, taras,
        barco: typeof it.barco === 'string' ? it.barco.trim() : '',
      };
      if (it.esVenta !== undefined) norm.esVenta = it.esVenta;
      normalizados.push(norm);
    }

    try {
      const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
      const ya = await revisarIdem(idemRef, operation);
      if (ya) return res.json(ya);

      const cargado = await cargarEmbarque(embarqueId, res);
      if (!cargado) return null;
      const { ref: embarqueRef, data } = cargado;
      const { preciosVenta, precioMaquila } = await cargarPreciosVenta(db);
      const fechaEmbarque = typeof data.fecha === 'string' ? data.fecha : null;

      const calcular = (docData) => {
        const asegurado = asegurarCliente(docData, cliente, generarAsistenteId);
        const { cliente: clienteDoc } = asegurado;
        const crudosAntes = deepClone(clienteDoc.crudos || []);
        if (!Array.isArray(clienteDoc.crudos)) clienteDoc.crudos = [];
        let grupo = clienteDoc.crudos[0];
        if (!grupo || !Array.isArray(grupo.items)) {
          grupo = { id: generarAsistenteId(), items: [] };
          clienteDoc.crudos[0] = grupo;
        }
        const agregados = [];
        normalizados.forEach((it) => {
          const esOzunaMaquila = esOzuna(clienteDoc.nombre) && it.esVenta === false;
          let precioCampos = null;
          if (!esOzunaMaquila) {
            const resuelto = resolverPrecio({
              medida: it.medida, fechaEmbarque, nombreCliente: clienteDoc.nombre,
              esOzunaMaquila: false, preciosVenta, precioMaquila,
            });
            if (resuelto) precioCampos = resuelto;
          }
          const nuevo = crearCrudoItem({
            generarAsistenteId,
            medida: it.medida, taras: it.taras, barco: it.barco,
            precioCampos, esVenta: it.esVenta,
          });
          grupo.items.push(nuevo);
          agregados.push({
            medida: it.medida, taras: it.taras, barco: it.barco || null,
            precio: nuevo.precio !== undefined ? nuevo.precio : null,
            precioOrigen: nuevo.precioOrigen || null,
          });
        });
        const campos = {
          clientes: asegurado.clientes,
          ...asegurado.cambios,
          borrador: tieneContenidoOperativo({ ...docData, clientes: asegurado.clientes }) ? false : Boolean(docData.borrador),
        };
        return { campos, agregados, clienteDoc, creado: asegurado.creado, crudosAntes };
      };

      const calc = calcular(deepClone(data));
      const response = {
        success: true,
        operation,
        embarqueId,
        cliente: { id: calc.clienteDoc.id, nombre: calc.clienteDoc.nombre, creado: calc.creado },
        itemsAgregados: calc.agregados,
        rev: (Number(data.rev) || 0) + 1,
      };

      if (dryRun) {
        return res.json({ ...response, dryRun: true, message: 'Simulación exitosa (sin escribir a Firestore)' });
      }

      await db.runTransaction(async (transaction) => {
        const frescoSnap = await transaction.get(embarqueRef);
        if (!frescoSnap.exists) {
          throw { code: 'EMBARQUE_NO_ENCONTRADO', message: 'El embarque fue eliminado durante la operación.', status: 404 };
        }
        const calcFresco = calcular(deepClone(frescoSnap.data() || {}));
        // La respuesta se construye COMPLETA desde el cálculo dentro de la
        // transacción: el cálculo previo genera uuids que se descartan.
        const respuesta = {
          success: true,
          operation,
          embarqueId,
          cliente: { id: calcFresco.clienteDoc.id, nombre: calcFresco.clienteDoc.nombre, creado: calcFresco.creado },
          itemsAgregados: calcFresco.agregados,
          rev: (Number(frescoSnap.data().rev) || 0) + 1,
        };
        await escribirCambios({
          transaction, idemRef, operation,
          response: respuesta,
          logExtra: {
            cliente: calcFresco.clienteDoc.nombre,
            clienteId: calcFresco.clienteDoc.id,
            clienteCreado: calcFresco.creado,
            itemsAgregados: calcFresco.agregados,
            crudosAntes: calcFresco.crudosAntes,
          },
          embarqueRef,
          campos: calcFresco.campos,
          request: { embarqueId, cliente, items: normalizados, idempotencyKey },
        });
      });

      const guardada = await idemRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) return errorResponse(res, error.status || 500, error.code, error.message, error.details);
      console.error('Error en POST /embarques/crudos:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al agregar los crudos al embarque: ' + error.message);
    }
  }

  // --- POST /embarques/linea: editar una línea limpia existente ---
  async function handlePostEmbarquesLinea(req, res) {
    const body = req.body || {};
    const { embarqueId, cliente, medida, tipo, kilos, precio, esVenta } = body;
    const { idempotencyKey, dryRun = false } = body;
    const operation = 'embarques_linea';

    if (!embarqueId || typeof embarqueId !== 'string') {
      return errorResponse(res, 400, 'EMBARQUE_ID_REQUERIDO', 'embarqueId es requerido.');
    }
    if (!cliente || typeof cliente !== 'string' || !cliente.trim()) {
      return errorResponse(res, 400, 'CLIENTE_REQUERIDO', 'cliente (nombre) es requerido.');
    }
    if (!medida || typeof medida !== 'string' || !medida.trim()) {
      return errorResponse(res, 400, 'MEDIDA_REQUERIDA', 'medida es requerida.');
    }
    const keyError = validarIdempotencyKey(body);
    if (keyError) return errorResponse(res, 400, keyError.error, keyError.message);
    const tipoNorm = tipo === undefined || tipo === null ? null : validarTipo(tipo);
    if (tipo !== undefined && tipo !== null && !tipoNorm) {
      return errorResponse(res, 400, 'TIPO_INVALIDO', 'tipo debe ser S/H20, C/H20 u otro factor (ej. 1.5).');
    }
    let kilosNum = null;
    if (kilos !== undefined && kilos !== null) {
      kilosNum = validarKilos(kilos, { permitirCero: true });
      if (kilosNum === null) {
        return errorResponse(res, 400, 'KILOS_INVALIDOS', 'kilos debe ser un número mayor o igual a 0.');
      }
    }
    let precioNum = null;
    if (precio !== undefined && precio !== null) {
      precioNum = validarPrecio(precio);
      if (precioNum === null) {
        return errorResponse(res, 400, 'PRECIO_INVALIDO', 'precio debe ser un número mayor a 0.');
      }
    }
    if (kilosNum === null && precioNum === null) {
      return errorResponse(res, 400, 'CAMPOS_REQUERIDOS', 'Indica al menos kilos o precio para editar la línea.');
    }
    if (esVenta !== undefined && typeof esVenta !== 'boolean') {
      return errorResponse(res, 400, 'ES_VENTA_INVALIDO', 'esVenta debe ser true o false.');
    }

    try {
      const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
      const ya = await revisarIdem(idemRef, operation);
      if (ya) return res.json(ya);

      const cargado = await cargarEmbarque(embarqueId, res);
      if (!cargado) return null;
      const { ref: embarqueRef, data } = cargado;

      const calcular = (docData) => {
        const clienteDoc = buscarCliente(docData.clientes, cliente);
        if (!clienteDoc) {
          throw { code: 'CLIENTE_NO_ENCONTRADO', message: `El cliente "${cliente}" no está en el embarque ${embarqueId}.`, status: 404 };
        }
        const medidaNorm = String(medida).trim().toLowerCase();
        let candidatas = (clienteDoc.productos || []).filter((p) =>
          String(p.medida || '').trim().toLowerCase() === medidaNorm
          && String(p.medida || '').trim() !== '');
        if (tipoNorm) {
          candidatas = candidatas.filter((p) => String(p.tipo || '').trim().toLowerCase() === tipoNorm);
        }
        if (esVenta !== undefined) {
          candidatas = candidatas.filter((p) => Boolean(p.esVenta) === Boolean(esVenta));
        }
        if (candidatas.length === 0) {
          throw {
            code: 'LINEA_NO_ENCONTRADA',
            message: `No hay línea ${medida}${tipoNorm ? ` (${tipoNorm})` : ''} para "${clienteDoc.nombre}" en el embarque.`,
            status: 404,
          };
        }
        if (candidatas.length > 1) {
          throw {
            code: 'LINEA_AMBIGUA',
            message: `Hay ${candidatas.length} líneas ${medida} para "${clienteDoc.nombre}": indica tipo${esVenta === undefined ? ' (y esVenta si aplica)' : ''} para elegir una.`,
            status: 400,
            details: {
              lineas: candidatas.map((p) => ({
                medida: p.medida, tipo: p.tipo, esVenta: Boolean(p.esVenta), kilos: kilosTotalesLinea(p), precio: p.precio || null,
              })),
            },
          };
        }
        const linea = candidatas[0];
        const antes = { kilos: kilosTotalesLinea(linea), precio: linea.precio !== undefined ? linea.precio : null, tipo: linea.tipo };
        if (kilosNum !== null) {
          linea.kilos = [kilosNum];
        }
        if (precioNum !== null) {
          const esOzunaMaquila = esOzuna(clienteDoc.nombre) && !linea.esVenta;
          Object.assign(linea, precioManual({
            precio: precioNum, medida: linea.medida,
            clienteIdEmbarque: clienteDoc.id, esOzunaMaquila,
          }));
        }
        const despues = { kilos: kilosTotalesLinea(linea), precio: linea.precio !== undefined ? linea.precio : null, tipo: linea.tipo };
        const campos = {
          clientes: docData.clientes,
          borrador: tieneContenidoOperativo(docData) ? false : Boolean(docData.borrador),
        };
        return { campos, clienteDoc, antes, despues, linea };
      };

      const calc = calcular(deepClone(data));
      const response = {
        success: true,
        operation,
        embarqueId,
        cliente: { id: calc.clienteDoc.id, nombre: calc.clienteDoc.nombre },
        medida: calc.linea.medida,
        tipo: calc.linea.tipo,
        antes: calc.antes,
        despues: calc.despues,
        rev: (Number(data.rev) || 0) + 1,
      };

      if (dryRun) {
        return res.json({ ...response, dryRun: true, message: 'Simulación exitosa (sin escribir a Firestore)' });
      }

      await db.runTransaction(async (transaction) => {
        const frescoSnap = await transaction.get(embarqueRef);
        if (!frescoSnap.exists) {
          throw { code: 'EMBARQUE_NO_ENCONTRADO', message: 'El embarque fue eliminado durante la operación.', status: 404 };
        }
        const calcFresco = calcular(deepClone(frescoSnap.data() || {}));
        // La respuesta se construye COMPLETA desde el cálculo dentro de la
        // transacción (ver /embarques/cliente).
        const respuesta = {
          success: true,
          operation,
          embarqueId,
          cliente: { id: calcFresco.clienteDoc.id, nombre: calcFresco.clienteDoc.nombre },
          medida: calcFresco.linea.medida,
          tipo: calcFresco.linea.tipo,
          antes: calcFresco.antes,
          despues: calcFresco.despues,
          rev: (Number(frescoSnap.data().rev) || 0) + 1,
        };
        await escribirCambios({
          transaction, idemRef, operation,
          response: respuesta,
          logExtra: {
            cliente: calcFresco.clienteDoc.nombre,
            clienteId: calcFresco.clienteDoc.id,
            medida: calcFresco.linea.medida,
            antes: calcFresco.antes,
            despues: calcFresco.despues,
          },
          embarqueRef,
          campos: calcFresco.campos,
          request: { embarqueId, cliente, medida, tipo: tipoNorm, kilos: kilosNum, precio: precioNum, idempotencyKey },
        });
      });

      const guardada = await idemRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) return errorResponse(res, error.status || 500, error.code, error.message, error.details);
      console.error('Error en POST /embarques/linea:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al editar la línea del embarque: ' + error.message);
    }
  }

  return {
    handlePostEmbarques,
    handlePostEmbarquesCliente,
    handlePostEmbarquesCrudos,
    handlePostEmbarquesLinea,
  };
}

module.exports = { crearHandlersEmbarquesEscritura };
module.exports._internos = {
  deepClone,
  normalizarNombre,
  validarTipo,
  buscarCliente,
  predefinidoPorNombre,
  asegurarCliente,
  tieneContenidoOperativo,
  resolverPrecio,
  precioManual,
  crearProductoLimpio,
  crearCrudoItem,
  mismaLinea,
  kilosTotalesLinea,
  CLIENTES_PREDEFINIDOS,
};
