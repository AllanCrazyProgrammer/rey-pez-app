/**
 * Lectura de la cuenta de un cliente por fecha (solo lectura).
 *
 * Lee el documento de la colección de cuentas del cliente
 * (cuentasJoselito, cuentasOtilio, cuentasVeronica, cuentasCatarro,
 * cuentasOzuna, cuentasOtilioIndependiente) con `fecha` igual a la
 * pedida y devuelve el documento tal como está guardado más dos campos
 * calculados con las mismas fórmulas de la app
 * (functions/lib/abonosClientes.js y src/utils/cuentas.service.js):
 *
 *   totalDia       = totalGeneralVenta - cobros - correcciones - abonos
 *   saldoPendiente = max(0, totalDia)
 *
 * Montos redondeados a 2 decimales. Sin totalGeneralVenta no hay totalDia.
 * No escribe nada: sin dryRun ni idempotencyKey.
 *
 * Ruta: GET /cuentas?cliente=<clave>&fecha=YYYY-MM-DD
 * Claves de cliente: las mismas que GET /abonos (veronica = Lorena,
 * otilio, catarro, joselito, ozuna, otilioIndependiente).
 */

const admin = require('firebase-admin');
const { serializar, fechaValida } = require('./embarquesLectura');

const CLIENTES_CUENTAS = Object.freeze({
  veronica: 'cuentasVeronica',
  otilio: 'cuentasOtilio',
  catarro: 'cuentasCatarro',
  joselito: 'cuentasJoselito',
  ozuna: 'cuentasOzuna',
  otilioIndependiente: 'cuentasOtilioIndependiente'
});

function normalizarClaveCliente(valor) {
  const texto = String(valor || '').trim().toLowerCase();
  if (texto === 'veronica' || texto === 'verónica' || texto === 'lorena') return 'veronica';
  if (texto === 'otilio independiente' || texto === 'otilioindependiente') return 'otilioIndependiente';
  if (texto === 'otilio') return 'otilio';
  if (texto === 'catarro') return 'catarro';
  if (texto === 'joselito') return 'joselito';
  if (texto === 'ozuna') return 'ozuna';
  return null;
}

function redondear2(valor) {
  return Math.round(Number(valor || 0) * 100) / 100;
}

function sumarMontos(lista) {
  if (!Array.isArray(lista)) return 0;
  return redondear2(lista.reduce((total, item) => total + (Number(item?.monto) || 0), 0));
}

function calcularCuenta(doc) {
  const cuenta = serializar(doc);
  const cobrosTotal = sumarMontos(doc.cobros);
  const correccionesTotal = sumarMontos(doc.correcciones);
  const abonosTotal = sumarMontos(doc.abonos);
  cuenta.cobrosTotal = cobrosTotal;
  cuenta.correccionesTotal = correccionesTotal;
  cuenta.abonosTotal = abonosTotal;

  const totalGeneralVenta = Number(doc.totalGeneralVenta);
  if (Number.isFinite(totalGeneralVenta)) {
    const totalDia = redondear2(totalGeneralVenta - cobrosTotal - correccionesTotal - abonosTotal);
    cuenta.totalDia = totalDia;
    cuenta.saldoPendiente = Math.max(0, totalDia);
    const saldoAnterior = Number(doc.saldoAcumuladoAnterior);
    const nuevoSaldoGuardado = Number(doc.nuevoSaldoAcumulado);
    if (Number.isFinite(saldoAnterior) && Number.isFinite(nuevoSaldoGuardado)) {
      cuenta.saldoCoincide = redondear2(saldoAnterior + totalDia) === redondear2(nuevoSaldoGuardado);
    }
  }
  return cuenta;
}

function crearManejadorCuentas({ db }) {
  async function obtenerCuentas(req, res) {
    const clienteClave = normalizarClaveCliente(req.query.cliente);
    if (!clienteClave) {
      return res.status(400).json({
        success: false,
        error: 'CLIENTE_DESCONOCIDO',
        message: 'Cliente desconocido. Usa veronica, otilio, catarro, joselito, ozuna u otilioIndependiente.'
      });
    }

    const fechaISO = fechaValida(req.query.fecha) ? req.query.fecha : null;
    if (!fechaISO) {
      return res.status(400).json({
        success: false,
        error: 'FECHA_INVALIDA',
        message: 'Fecha inválida. Usa el formato YYYY-MM-DD.'
      });
    }

    const coleccion = CLIENTES_CUENTAS[clienteClave];
    try {
      let snapshot = await db.collection(coleccion).where('fecha', '==', fechaISO).get();
      let docs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

      // Respaldo por si la fecha se guardó como Timestamp (mismo patrón
      // que GET /embarques): rango UTC del día.
      if (docs.length === 0) {
        const inicio = admin.firestore.Timestamp.fromDate(new Date(`${fechaISO}T00:00:00.000Z`));
        const fin = admin.firestore.Timestamp.fromDate(new Date(`${fechaISO}T23:59:59.999Z`));
        snapshot = await db.collection(coleccion)
          .where('fecha', '>=', inicio)
          .where('fecha', '<=', fin)
          .get();
        docs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      }

      if (docs.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'CUENTA_NO_ENCONTRADA',
          message: `No hay cuenta de ${clienteClave} el ${fechaISO}.`
        });
      }

      docs.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      return res.json({
        success: true,
        cliente: clienteClave,
        coleccion,
        fecha: fechaISO,
        total: docs.length,
        cuentas: docs.map(calcularCuenta)
      });
    } catch (error) {
      console.error('[Cuentas] Error al leer la cuenta:', error);
      return res.status(500).json({
        success: false,
        error: 'ERROR_INTERNO',
        message: 'No se pudo leer la cuenta.'
      });
    }
  }

  return { obtenerCuentas };
}

module.exports = crearManejadorCuentas;
module.exports.CLIENTES_CUENTAS = CLIENTES_CUENTAS;
module.exports.normalizarClaveCliente = normalizarClaveCliente;
