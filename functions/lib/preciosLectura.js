/**
 * Lecturas secundarias de precios (solo lectura).
 *
 * La lectura principal (precios efectivos) ya existe en
 * functions/lib/preciosVenta.js (GET /precios). Aquí van los tres
 * huecos que solo lee el front directo de Firestore:
 *
 * 1. GET /precios/nota-venta?producto=<nombre>[&fecha][&cliente]
 *    Catálogo de precios sugeridos para la nota de venta (colección
 *    `preciosNotaVenta`). Distinto de `precios`: es lo que sugiere
 *    SaleNote al armar una nota, no lo que cobra el embarque.
 *    Devuelve el registro más reciente con fecha <= pedida (hoy por
 *    defecto). 404 PRECIO_NO_ENCONTRADO si no hay.
 *
 * 2. GET /precios/historial?producto&cliente&desde&hasta
 *    Historial de preparación de precios (colección `historialPrecios`),
 *    en orden cronológico. Solo lectura.
 *
 * 3. GET /precios/historial-crudos?producto&desde&hasta
 *    Mismo patrón para precios de crudos (colección
 *    `historialPreciosCrudos`); `producto` se compara con medidaNombre
 *    (o medidaId).
 *
 * Los tres usan la misma normalización de nombres que preciosVenta.js
 * (alias Med-Esp c/c, Med-Gde c/c) y la misma regla "más reciente con
 * fecha <= pedida". No escriben nada.
 */

const { normalizarFechaISO, normalizarNombreProductoPrecio, fechaHoyMexico } = require('./preciosVenta');
const { serializar, fechaValida } = require('./embarquesLectura');

// Fecha opcional de query: null si no viene; 400 si viene inválida.
// (normalizarFechaISO devuelve hoy cuando no recibe fecha, así que no
// sirve para distinguir "no viene" de "viene mal".)
function fechaQueryISO(valor) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return null;
  return fechaValida(valor) ? String(valor) : false;
}

const LIMITE_LECTURA = 1000;

function normalizarTexto(valor) {
  return normalizarNombreProductoPrecio(String(valor || '').trim()).toLowerCase().trim();
}

function fechaDeRegistro(registro) {
  return normalizarFechaISO(registro?.fecha);
}

function filtrarPorRango(registros, desdeISO, hastaISO) {
  return registros.filter((registro) => {
    const fecha = fechaDeRegistro(registro);
    if (!fecha) return false;
    if (desdeISO && fecha < desdeISO) return false;
    if (hastaISO && fecha > hastaISO) return false;
    return true;
  });
}

function ordenarCronologico(registros) {
  return registros.slice().sort((a, b) => {
    const fechaA = fechaDeRegistro(a) || '';
    const fechaB = fechaDeRegistro(b) || '';
    if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
    const creacionA = a.fechaCreacion?._seconds ?? a.fechaCreacion?.seconds ?? 0;
    const creacionB = b.fechaCreacion?._seconds ?? b.fechaCreacion?.seconds ?? 0;
    return creacionA - creacionB;
  });
}

function crearManejadorPreciosLectura({ db }) {
  async function obtenerPreciosNotaVenta(req, res) {
    const producto = String(req.query.producto || '').trim();
    if (!producto) {
      return res.status(400).json({
        success: false,
        error: 'PRODUCTO_REQUERIDO',
        message: 'El producto es requerido.'
      });
    }
    const fechaPedida = fechaQueryISO(req.query.fecha);
    if (fechaPedida === false) {
      return res.status(400).json({
        success: false,
        error: 'FECHA_INVALIDA',
        message: 'La fecha debe ser real en formato YYYY-MM-DD.'
      });
    }
    const fechaEfectiva = fechaPedida || fechaHoyMexico();
    const clientePedido = String(req.query.cliente || '').trim();
    const clienteNormalizado = clientePedido ? normalizarTexto(clientePedido) : '';

    try {
      const snapshot = await db.collection('preciosNotaVenta').limit(LIMITE_LECTURA).get();
      const registros = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      const productoNormalizado = normalizarTexto(producto);

      let candidatos = registros.filter((registro) => {
        if (normalizarTexto(registro.producto) !== productoNormalizado) return false;
        const fecha = fechaDeRegistro(registro);
        return fecha && fecha <= fechaEfectiva;
      });

      if (clienteNormalizado) {
        candidatos = candidatos.filter((registro) =>
          normalizarTexto(registro.clienteNombre) === clienteNormalizado);
      } else {
        // Sin cliente: el precio general (sin clienteNombre).
        const generales = candidatos.filter((registro) => !String(registro.clienteNombre || '').trim());
        if (generales.length > 0) candidatos = generales;
      }

      if (candidatos.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'PRECIO_NO_ENCONTRADO',
          message: `No hay precio de nota de venta para "${producto}" con fecha <= ${fechaEfectiva}.`
        });
      }

      candidatos.sort((a, b) => (fechaDeRegistro(b) || '').localeCompare(fechaDeRegistro(a) || ''));
      const elegido = candidatos[0];
      return res.json({
        success: true,
        producto: elegido.producto,
        precio: Number(elegido.precio),
        fecha: fechaEfectiva,
        clienteNombre: elegido.clienteNombre || null,
        origen: { id: elegido.id, fecha: fechaDeRegistro(elegido) }
      });
    } catch (error) {
      console.error('[PreciosLectura] Error al leer preciosNotaVenta:', error);
      return res.status(500).json({ success: false, error: 'ERROR_INTERNO', message: 'No se pudo leer el precio de nota de venta.' });
    }
  }

  async function obtenerHistorialPrecios(req, res) {
    const producto = String(req.query.producto || '').trim();
    const cliente = String(req.query.cliente || '').trim();
    const desdeISO = fechaQueryISO(req.query.desde);
    const hastaISO = fechaQueryISO(req.query.hasta);
    if (desdeISO === false || hastaISO === false) {
      return res.status(400).json({
        success: false,
        error: 'FECHA_INVALIDA',
        message: 'desde y hasta deben ser fechas reales en formato YYYY-MM-DD.'
      });
    }
    if (desdeISO && hastaISO && hastaISO < desdeISO) {
      return res.status(400).json({
        success: false,
        error: 'RANGO_INVALIDO',
        message: 'hasta debe ser mayor o igual que desde.'
      });
    }

    try {
      const snapshot = await db.collection('historialPrecios').limit(LIMITE_LECTURA).get();
      let registros = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      if (producto) {
        const productoNormalizado = normalizarTexto(producto);
        registros = registros.filter((registro) => normalizarTexto(registro.producto) === productoNormalizado);
      }
      if (cliente) {
        const clienteNormalizado = cliente.toLowerCase().trim();
        registros = registros.filter((registro) =>
          String(registro.proveedorId || '').toLowerCase().trim() === clienteNormalizado ||
          normalizarTexto(registro.proveedorNombre) === normalizarTexto(cliente));
      }
      registros = filtrarPorRango(registros, desdeISO, hastaISO);
      registros = ordenarCronologico(registros);
      return res.json({
        success: true,
        total: registros.length,
        desde: desdeISO || null,
        hasta: hastaISO || null,
        historial: registros.map(serializar)
      });
    } catch (error) {
      console.error('[PreciosLectura] Error al leer historialPrecios:', error);
      return res.status(500).json({ success: false, error: 'ERROR_INTERNO', message: 'No se pudo leer el historial de precios.' });
    }
  }

  async function obtenerHistorialPreciosCrudos(req, res) {
    const producto = String(req.query.producto || '').trim();
    const desdeISO = fechaQueryISO(req.query.desde);
    const hastaISO = fechaQueryISO(req.query.hasta);
    if (desdeISO === false || hastaISO === false) {
      return res.status(400).json({
        success: false,
        error: 'FECHA_INVALIDA',
        message: 'desde y hasta deben ser fechas reales en formato YYYY-MM-DD.'
      });
    }
    if (desdeISO && hastaISO && hastaISO < desdeISO) {
      return res.status(400).json({
        success: false,
        error: 'RANGO_INVALIDO',
        message: 'hasta debe ser mayor o igual que desde.'
      });
    }

    try {
      const snapshot = await db.collection('historialPreciosCrudos').limit(LIMITE_LECTURA).get();
      let registros = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      if (producto) {
        const productoNormalizado = normalizarTexto(producto);
        registros = registros.filter((registro) =>
          normalizarTexto(registro.medidaNombre) === productoNormalizado ||
          String(registro.medidaId || '').toLowerCase().trim() === producto.toLowerCase().trim());
      }
      registros = filtrarPorRango(registros, desdeISO, hastaISO);
      registros = ordenarCronologico(registros);
      return res.json({
        success: true,
        total: registros.length,
        desde: desdeISO || null,
        hasta: hastaISO || null,
        historial: registros.map(serializar)
      });
    } catch (error) {
      console.error('[PreciosLectura] Error al leer historialPreciosCrudos:', error);
      return res.status(500).json({ success: false, error: 'ERROR_INTERNO', message: 'No se pudo leer el historial de precios de crudos.' });
    }
  }

  return { obtenerPreciosNotaVenta, obtenerHistorialPrecios, obtenerHistorialPreciosCrudos };
}

module.exports = crearManejadorPreciosLectura;
