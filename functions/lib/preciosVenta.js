/**
 * Precios de venta de la colección `precios`, con la misma forma que
 * PreciosHistorialModal.vue y las reglas de src/utils/preciosHistoricos.js.
 * Los alias canónicos son los de normalizarNombreProductoPrecio.
 */

const PRODUCTO_PRECIO_MAQUILA_OZUNA = 'Precio maquila Ozuna';
const CLIENTES_PRECIO = ['joselito', 'catarro', 'otilio', 'ozuna', 'veronica'];

const NOMBRES_PRODUCTO_PRECIO = Object.freeze({
  'medespc/c': 'Med-Esp c/c',
  'med/espc/c': 'Med-Esp c/c',
  'medgdec/c': 'Med-Gde c/c',
  'med/gdec/c': 'Med-Gde c/c'
});

function quitarAcentos(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizarClaveMedida(medida) {
  if (!medida) return '';
  return medida.toString()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[\[\]()]/g, '')
    .replace(/-/g, '/')
    .trim();
}

function normalizarNombreProductoPrecio(nombre) {
  if (!nombre) return nombre;
  const clave = normalizarClaveMedida(nombre);
  return Object.prototype.hasOwnProperty.call(NOMBRES_PRODUCTO_PRECIO, clave)
    ? NOMBRES_PRODUCTO_PRECIO[clave]
    : String(nombre).trim();
}

function normalizarMedida(medida) {
  return normalizarClaveMedida(normalizarNombreProductoPrecio(medida));
}

function obtenerClavesBusquedaMedida(medida) {
  const claveExacta = normalizarMedida(medida);
  if (!claveExacta) return [];
  const texto = String(medida).trim();
  const coincidenciaBase = texto.match(/^(\d+(?:[.,]\d+)?\s*\/\s*\d+(?:[.,]\d+)?)(?=\s|[-–—]|$)/);
  const claveBase = coincidenciaBase ? normalizarMedida(coincidenciaBase[1]) : '';
  return claveBase && claveBase !== claveExacta ? [claveExacta, claveBase] : [claveExacta];
}

function normalizarFechaISO(fecha) {
  if (!fecha) return fechaHoyMexico();
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  if (typeof fecha === 'string') {
    const match = fecha.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const fechaObj = new Date(fecha);
  if (Number.isNaN(fechaObj.getTime())) return fechaHoyMexico();
  const año = fechaObj.getUTCFullYear();
  const mes = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(fechaObj.getUTCDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

function fechaHoyMexico() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function horaMexico() {
  return new Date().toLocaleTimeString('es-ES', { timeZone: 'America/Mexico_City' });
}

function obtenerTimestampComparable(timestamp) {
  if (!timestamp) return 0;
  if (typeof timestamp === 'number') return timestamp;
  if (typeof timestamp?.toMillis === 'function') return timestamp.toMillis();
  const seconds = timestamp?.seconds ?? timestamp?._seconds;
  const nanoseconds = timestamp?.nanoseconds ?? timestamp?._nanoseconds ?? 0;
  if (typeof seconds === 'number') return (seconds * 1000) + Math.floor(nanoseconds / 1000000);
  const parsed = Number(timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compararPreciosMasAntiguosPrimero(a, b) {
  const fechaA = normalizarFechaISO(a?.fecha);
  const fechaB = normalizarFechaISO(b?.fecha);
  if (fechaA !== fechaB) return fechaA < fechaB ? -1 : 1;
  return obtenerTimestampComparable(a?.timestamp) - obtenerTimestampComparable(b?.timestamp);
}

function esFechaValida(fechaPrecio, fechaLimite) {
  return normalizarFechaISO(fechaPrecio) <= normalizarFechaISO(fechaLimite);
}

function obtenerDetallesPreciosParaFecha(preciosActuales, fechaEmbarque, clienteId = null) {
  if (!Array.isArray(preciosActuales)) return new Map();
  const fechaLimiteISO = normalizarFechaISO(fechaEmbarque || fechaHoyMexico());
  const preciosGenerales = new Map();
  const preciosEspecificos = new Map();
  const preciosOrdenados = [...preciosActuales].sort(compararPreciosMasAntiguosPrimero);

  preciosOrdenados.forEach((precio) => {
    if (!precio?.fecha || !precio?.producto) return;
    const fechaPrecioISO = normalizarFechaISO(precio.fecha);
    if (!esFechaValida(fechaPrecioISO, fechaLimiteISO)) return;
    const medidaNormalizada = normalizarMedida(precio.producto);
    const detalleBase = {
      precio: precio.precio,
      fecha: fechaPrecioISO,
      timestamp: obtenerTimestampComparable(precio.timestamp),
      producto: precio.producto
    };
    if (clienteId && precio.clienteId === clienteId) {
      preciosEspecificos.set(medidaNormalizada, { ...detalleBase, origen: 'especifico', clienteId: precio.clienteId });
    } else if (!precio.clienteId) {
      preciosGenerales.set(medidaNormalizada, { ...detalleBase, origen: 'general', clienteId: null });
    }
  });

  return new Map([...preciosGenerales, ...preciosEspecificos]);
}

function obtenerCoincidenciaDeMedida(preciosParaFecha, medida) {
  const claves = obtenerClavesBusquedaMedida(medida);
  for (let indice = 0; indice < claves.length; indice += 1) {
    const detalle = preciosParaFecha.get(claves[indice]);
    if (detalle) {
      return {
        ...detalle,
        tipoCoincidencia: indice === 0 ? 'exacta' : 'base',
        medidaBuscada: String(medida),
        medidaCoincidente: detalle.producto
      };
    }
  }
  return null;
}

function categoriaDeProducto(producto) {
  const nombre = String(producto || '').toLowerCase();
  if (nombre.includes('s/c') || nombre.match(/\d+\/\d+/)) return 'Camarón S/C';
  if (nombre.includes('c/c')) return 'Camarón C/C';
  return 'Otros';
}

function resolverClientePrecio(entrada) {
  if (entrada === undefined || entrada === null || String(entrada).trim() === '') return { clienteId: null };
  const clave = quitarAcentos(entrada).trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (clave === 'lorena') return { clienteId: 'veronica', alias: 'lorena' };
  if (CLIENTES_PRECIO.includes(clave)) return { clienteId: clave };
  return { error: true };
}

function distancia(a, b) {
  const fila = Array.from({ length: b.length + 1 }, (_, indice) => indice);
  for (let i = 1; i <= a.length; i += 1) {
    let previo = i - 1;
    fila[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const actual = fila[j];
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + costo);
      previo = actual;
    }
  }
  return fila[b.length];
}

function sugerirProductos(nombre, catalogo, limite = 5) {
  const clave = normalizarMedida(nombre);
  return catalogo
    .map((producto) => {
      const otra = normalizarMedida(producto);
      let score = distancia(clave, otra);
      if (otra.includes(clave) || clave.includes(otra)) score -= 5;
      return { producto, score };
    })
    .sort((a, b) => a.score - b.score || a.producto.localeCompare(b.producto, 'es'))
    .filter((item) => item.score <= Math.max(4, Math.ceil(clave.length / 2)))
    .slice(0, limite)
    .map((item) => item.producto);
}

function catalogoDesdePrecios(precios) {
  const porClave = new Map();
  function agregar(nombre) {
    const normalizado = normalizarNombreProductoPrecio(nombre);
    if (!normalizado) return;
    const clave = normalizarMedida(normalizado);
    if (!clave || porClave.has(clave)) return;
    porClave.set(clave, normalizado);
  }
  Object.values(NOMBRES_PRODUCTO_PRECIO).forEach(agregar);
  agregar(PRODUCTO_PRECIO_MAQUILA_OZUNA);
  (precios || []).forEach((precio) => agregar(precio.producto));
  (precios || []).forEach((precio) => {
    const normalizado = normalizarNombreProductoPrecio(precio.producto);
    const clave = normalizarMedida(normalizado);
    if (!clave) return;
    const alias = NOMBRES_PRODUCTO_PRECIO[clave];
    if (alias) porClave.set(clave, alias);
  });
  return porClave;
}

function resolverProductoCatalogo(nombre, porClave) {
  const normalizado = normalizarNombreProductoPrecio(nombre);
  const clave = normalizarMedida(normalizado);
  if (!clave || !porClave.has(clave)) {
    return { ok: false, sugerencias: sugerirProductos(nombre, [...porClave.values()]) };
  }
  return { ok: true, producto: porClave.get(clave), clave };
}

function listaEfectiva(precios, fecha, clienteId) {
  const detalles = obtenerDetallesPreciosParaFecha(precios, fecha, clienteId);
  return [...detalles.values()]
    .map((detalle) => ({
      producto: detalle.producto,
      precio: detalle.precio,
      fecha: detalle.fecha,
      origen: detalle.origen,
      clienteId: detalle.clienteId,
      timestamp: detalle.timestamp
    }))
    .sort((a, b) => String(a.producto).localeCompare(String(b.producto), 'es'));
}

function crearHandlersPrecios({ db, admin, errorResponse }) {
  async function cargarPrecios() {
    const snap = await db.collection('precios').get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async function handleGetPrecios(req, res) {
    const fecha = req.query.fecha ? normalizarFechaISO(req.query.fecha) : fechaHoyMexico();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return errorResponse(res, 400, 'FECHA_INVALIDA', 'La fecha debe estar en formato YYYY-MM-DD');
    }
    const cliente = resolverClientePrecio(req.query.cliente);
    if (cliente.error) {
      return errorResponse(res, 400, 'CLIENTE_DESCONOCIDO', 'Cliente no reconocido para precios', { clientes: CLIENTES_PRECIO });
    }

    try {
      const precios = await cargarPrecios();
      if (req.query.cliente) {
        let lista = listaEfectiva(precios, fecha, cliente.clienteId);
        if (req.query.producto) {
          const detalle = obtenerCoincidenciaDeMedida(
            obtenerDetallesPreciosParaFecha(precios, fecha, cliente.clienteId),
            req.query.producto
          );
          lista = detalle ? [{
            producto: detalle.producto,
            precio: detalle.precio,
            fecha: detalle.fecha,
            origen: detalle.origen,
            clienteId: detalle.clienteId,
            timestamp: detalle.timestamp,
            tipoCoincidencia: detalle.tipoCoincidencia
          }] : [];
        }
        return res.json({
          success: true,
          fecha,
          clienteId: cliente.clienteId,
          precios: lista
        });
      }

      const porCliente = {};
      CLIENTES_PRECIO.forEach((id) => {
        porCliente[id] = listaEfectiva(precios, fecha, id);
      });
      return res.json({
        success: true,
        fecha,
        generales: listaEfectiva(precios, fecha, null),
        porCliente
      });
    } catch (error) {
      console.error('Error en GET /precios:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al consultar precios: ' + error.message);
    }
  }

  async function handlePostPrecios(req, res) {
    const body = req.body || {};
    const { producto, precio, fecha, idempotencyKey, dryRun = false } = body;
    if (!producto || !String(producto).trim()) {
      return errorResponse(res, 400, 'PRODUCTO_REQUERIDO', 'El producto es requerido');
    }
    const precioNumero = Number(precio);
    if (!Number.isFinite(precioNumero) || precioNumero < 0) {
      return errorResponse(res, 400, 'PRECIO_INVALIDO', 'El precio debe ser un número mayor o igual a 0');
    }
    const fechaNormalizada = normalizarFechaISO(fecha);
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fechaNormalizada)) {
      return errorResponse(res, 400, 'FECHA_INVALIDA', 'La fecha es requerida y debe estar en formato YYYY-MM-DD');
    }
    const cliente = resolverClientePrecio(body.clienteId ?? body.cliente);
    if (cliente.error) {
      return errorResponse(res, 400, 'CLIENTE_DESCONOCIDO', 'Cliente no reconocido para precios', { clientes: CLIENTES_PRECIO });
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.includes('/')) {
      return errorResponse(res, 400, 'IDEMPOTENCY_KEY_REQUERIDA', 'idempotencyKey es requerido y no puede contener "/"');
    }

    try {
      const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
      const idemSnap = await idemRef.get();
      if (idemSnap.exists && idemSnap.data().operation === 'precios_create') {
        return res.json(idemSnap.data().response);
      }

      const existentes = await cargarPrecios();
      const catalogo = catalogoDesdePrecios(existentes);
      const resuelto = resolverProductoCatalogo(producto, catalogo);
      if (!resuelto.ok) {
        return errorResponse(res, 400, 'PRODUCTO_DESCONOCIDO', `El producto "${String(producto).trim()}" no está en el catálogo de precios`, {
          sugerencias: resuelto.sugerencias
        });
      }

      const documento = {
        producto: resuelto.producto,
        precio: parseFloat(precioNumero),
        fecha: fechaNormalizada,
        categoria: categoriaDeProducto(resuelto.producto),
        timestamp: Date.now(),
        fechaCreacion: fechaHoyMexico(),
        horaCreacion: horaMexico()
      };
      if (cliente.clienteId) documento.clienteId = cliente.clienteId;

      const response = {
        success: true,
        operation: 'precios_create',
        precio: documento
      };

      if (dryRun) {
        return res.json({ ...response, dryRun: true, message: 'Simulación exitosa (sin escribir a Firestore)' });
      }

      const ref = db.collection('precios').doc();
      await db.runTransaction(async (transaction) => {
        const idemActual = await transaction.get(idemRef);
        if (idemActual.exists && idemActual.data().operation === 'precios_create') {
          throw { code: 'IDEMPOTENTE', response: idemActual.data().response };
        }
        transaction.set(ref, documento);
        response.precioId = ref.id;
        transaction.set(db.collection('asistenteLog').doc(), {
          operation: 'precios_create',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          idempotencyKey,
          precioId: ref.id,
          documento,
          request: { producto, precio: precioNumero, fecha: fechaNormalizada, clienteId: cliente.clienteId }
        });
        transaction.set(idemRef, {
          operation: 'precios_create',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          response
        });
      });

      const guardada = await idemRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) return errorResponse(res, error.status || 500, error.code, error.message, error.details);
      console.error('Error en POST /precios:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al guardar el precio: ' + error.message);
    }
  }

  return { handleGetPrecios, handlePostPrecios };
}

module.exports = {
  PRODUCTO_PRECIO_MAQUILA_OZUNA,
  CLIENTES_PRECIO,
  normalizarNombreProductoPrecio,
  normalizarMedida,
  obtenerClavesBusquedaMedida,
  obtenerDetallesPreciosParaFecha,
  obtenerCoincidenciaDeMedida,
  compararPreciosMasAntiguosPrimero,
  categoriaDeProducto,
  catalogoDesdePrecios,
  resolverProductoCatalogo,
  resolverClientePrecio,
  listaEfectiva,
  fechaHoyMexico,
  crearHandlersPrecios
};
