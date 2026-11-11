/**
 * Correcciones y observaciones en la cuenta del día de un cliente.
 *
 * Una corrección es {descripcion, monto} en el array `correcciones[]` del
 * documento de la cuenta (colecciones cuentasJoselito, cuentasOtilio,
 * cuentasVeronica, cuentasCatarro, cuentasOzuna,
 * cuentasOtilioIndependiente), igual que en
 * src/views/CuentasClientes/CuentaCliente.vue. La app la muestra como
 * -monto y la resta en el total del día:
 *
 *   totalDia = totalGeneralVenta - cobros - correcciones - abonos
 *   nuevoSaldoAcumulado = max(0, saldoAcumuladoAnterior + totalDia)
 *   estadoPagado = nuevoSaldoAcumulado <= 0.01
 *
 * Una observación es el texto `observacion` del documento de la cuenta
 * con su bandera `tieneObservacion` (true cuando el texto no está vacío),
 * igual que en CuentaCliente.vue y en
 * src/components/Clientes/ObservacionesModal.vue, que lista las cuentas
 * con tieneObservacion === true y eliminar pone
 * {observacion: '', tieneObservacion: false}.
 *
 * Excepción Ozuna: su vista (CuentasOzuna.vue) no tiene correcciones ni
 * observaciones y su fórmula no usa totalGeneralVenta
 * (totalSaldo = saldoAcumuladoAnterior + totalGeneral + cobros - abonos).
 * POST /cuentas/correcciones rechaza a Ozuna con CORRECCIONES_NO_APLICAN
 * para no corromper sus saldos. Las observaciones sí se guardan para
 * todos los clientes (son solo dos campos de texto, la app los ignora si
 * su vista no los muestra).
 *
 * Alcance: solo se actualiza el documento del día pedido. Los días
 * posteriores conservan su saldoAcumuladoAnterior hasta que la app los
 * recalcula al guardar desde la UI (actualizarCuentasPosteriores en
 * CuentaCliente.vue), igual que hace POST /abonos, que solo toca las
 * notas aplicadas.
 *
 * Rutas:
 *   POST /cuentas/correcciones {cliente, fecha, descripcion, monto,
 *     dryRun, idempotencyKey}
 *   POST /cuentas/correcciones/deshacer {idempotencyKey,
 *     undoIdempotencyKey?, dryRun}
 *   POST /cuentas/observaciones {cliente, fecha, texto,
 *     dryRun, idempotencyKey}
 *   POST /cuentas/observaciones/deshacer {idempotencyKey,
 *     undoIdempotencyKey?, dryRun}
 *
 * Nunca crean el documento del día: 404 CUENTA_NO_ENCONTRADA si no hay
 * cuenta ese día. dryRun simula sin escribir. Todo cambio es idempotente
 * por idempotencyKey (colección asistenteIdem) y queda registrado en
 * asistenteLog para poder deshacerse.
 */

const { CLIENTES_CUENTAS, normalizarClaveCliente } = require('./cuentasLectura');
const { fechaValida } = require('./embarquesLectura');

const admin = require('firebase-admin');

const UMBRAL_PAGADO = 0.01;

function redondear2(valor) {
  return Math.round(Number(valor || 0) * 100) / 100;
}

function sumarMontos(lista) {
  if (!Array.isArray(lista)) return 0;
  return redondear2(lista.reduce((total, item) => total + (Number(item?.monto) || 0), 0));
}

function clientesDisponibles() {
  return ['veronica', 'lorena', 'otilio', 'catarro', 'joselito', 'ozuna', 'otilioIndependiente'];
}

function validarIdempotencyKey(idempotencyKey, errorResponse, res) {
  if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.includes('/')) {
    return errorResponse(res, 400, 'IDEMPOTENCY_KEY_REQUERIDA', 'idempotencyKey es requerido y no puede contener "/"');
  }
  return null;
}

/**
 * Busca el documento de la cuenta del cliente en la fecha pedida, con el
 * mismo criterio que GET /cuentas: fecha como texto y respaldo por rango
 * UTC si la fecha se guardó como Timestamp. Devuelve { docs: [{id, data}] }.
 */
async function buscarCuentaDelDia(db, coleccion, fechaISO) {
  let snapshot = await db.collection(coleccion).where('fecha', '==', fechaISO).get();
  let docs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }));

  if (docs.length === 0) {
    const inicio = admin.firestore.Timestamp.fromDate(new Date(`${fechaISO}T00:00:00.000Z`));
    const fin = admin.firestore.Timestamp.fromDate(new Date(`${fechaISO}T23:59:59.999Z`));
    snapshot = await db.collection(coleccion)
      .where('fecha', '>=', inicio)
      .where('fecha', '<=', fin)
      .get();
    docs = snapshot.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }));
  }

  return { docs };
}

/**
 * Saldos del día con una lista de correcciones dada. Solo se recalculan
 * cuando el documento trae totalGeneralVenta (todos menos Ozuna).
 */
function calcularSaldosTrasCorreccion(data, correccionesNuevas) {
  const correccionesTotal = sumarMontos(correccionesNuevas);
  const totalGeneralVenta = Number(data.totalGeneralVenta);
  if (!Number.isFinite(totalGeneralVenta)) {
    return { correccionesTotal, totalDia: null, nuevoSaldoAcumulado: null, estadoPagado: null, saldosRecalculados: false };
  }
  const totalDia = redondear2(
    totalGeneralVenta - sumarMontos(data.cobros) - correccionesTotal - sumarMontos(data.abonos)
  );
  const nuevoSaldoAcumulado = Math.max(0, redondear2((Number(data.saldoAcumuladoAnterior) || 0) + totalDia));
  return {
    correccionesTotal,
    totalDia,
    nuevoSaldoAcumulado,
    estadoPagado: nuevoSaldoAcumulado <= UMBRAL_PAGADO,
    saldosRecalculados: true
  };
}

function crearHandlersCuentasEscritura({ db, admin: adminSdk, errorResponse, generarAsistenteId }) {
  async function resolverCuenta(req, res) {
    const clienteClave = normalizarClaveCliente(req.body?.cliente);
    if (!clienteClave) {
      errorResponse(res, 400, 'CLIENTE_DESCONOCIDO', 'Cliente desconocido. Usa veronica, otilio, catarro, joselito, ozuna u otilioIndependiente.', { clientes: clientesDisponibles() });
      return null;
    }
    const fechaISO = req.body?.fecha;
    if (!fechaValida(fechaISO)) {
      errorResponse(res, 400, 'FECHA_INVALIDA', 'Fecha inválida. Usa el formato YYYY-MM-DD.');
      return null;
    }
    const coleccion = CLIENTES_CUENTAS[clienteClave];
    const { docs } = await buscarCuentaDelDia(db, coleccion, fechaISO);
    if (docs.length === 0) {
      errorResponse(res, 404, 'CUENTA_NO_ENCONTRADA', `No hay cuenta de ${clienteClave} el ${fechaISO}.`);
      return null;
    }
    if (docs.length > 1) {
      errorResponse(res, 409, 'CUENTA_AMBIGUA', `Hay más de una cuenta de ${clienteClave} el ${fechaISO}.`, {
        cuentas: docs.map((doc) => ({ id: doc.id, fecha: doc.data.fecha }))
      });
      return null;
    }
    return { clienteClave, coleccion, fechaISO, cuenta: docs[0] };
  }

  async function handlePostCuentasCorrecciones(req, res) {
    const { descripcion, monto, idempotencyKey, dryRun = false } = req.body || {};

    const resuelto = await resolverCuenta(req, res);
    if (!resuelto) return;
    const { clienteClave, coleccion, fechaISO, cuenta } = resuelto;

    if (clienteClave === 'ozuna') {
      return errorResponse(res, 400, 'CORRECCIONES_NO_APLICAN', 'Ozuna no usa correcciones en la app: su cuenta no tiene totalGeneralVenta ni fórmula con correcciones.');
    }
    const descripcionLimpia = typeof descripcion === 'string' ? descripcion.trim() : '';
    if (!descripcionLimpia) {
      return errorResponse(res, 400, 'DESCRIPCION_REQUERIDA', 'La descripción de la corrección es requerida.');
    }
    const montoNumero = Number(monto);
    if (!Number.isFinite(montoNumero)) {
      return errorResponse(res, 400, 'MONTO_INVALIDO', 'El monto debe ser un número.');
    }
    const montoRedondeado = redondear2(montoNumero);
    const errorClave = validarIdempotencyKey(idempotencyKey, errorResponse, res);
    if (errorClave) return errorClave;

    try {
      const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
      const idemSnap = await idemRef.get();
      if (idemSnap.exists && idemSnap.data().operation === 'cuentas_correcciones_create') {
        return res.json(idemSnap.data().response);
      }

      const asistenteId = generarAsistenteId();
      const correccion = { descripcion: descripcionLimpia, monto: montoRedondeado, _asistenteId: asistenteId };
      const correccionesAntes = Array.isArray(cuenta.data.correcciones) ? cuenta.data.correcciones : [];
      const correccionesNuevas = [...correccionesAntes, correccion];
      const saldosAntes = calcularSaldosTrasCorreccion(cuenta.data, correccionesAntes);
      const saldosDespues = calcularSaldosTrasCorreccion(cuenta.data, correccionesNuevas);

      const response = {
        success: true,
        operation: 'cuentas_correcciones_create',
        cliente: clienteClave,
        coleccion,
        cuentaId: cuenta.id,
        fecha: fechaISO,
        correccion,
        correccionesTotalAntes: saldosAntes.correccionesTotal,
        correccionesTotalDespues: saldosDespues.correccionesTotal,
        totalDiaAntes: saldosAntes.totalDia,
        totalDiaDespues: saldosDespues.totalDia,
        nuevoSaldoAcumuladoAntes: Number(cuenta.data.nuevoSaldoAcumulado) || 0,
        nuevoSaldoAcumuladoDespues: saldosDespues.nuevoSaldoAcumulado,
        estadoPagado: saldosDespues.estadoPagado,
        saldosRecalculados: saldosDespues.saldosRecalculados
      };

      if (dryRun) {
        return res.json({
          ...response,
          dryRun: true,
          message: 'Simulación exitosa (sin escribir a Firestore)'
        });
      }

      const update = { correcciones: correccionesNuevas, ultimaActualizacion: new Date().toISOString() };
      if (saldosDespues.saldosRecalculados) {
        update.nuevoSaldoAcumulado = saldosDespues.nuevoSaldoAcumulado;
        update.estadoPagado = saldosDespues.estadoPagado;
      }

      await db.runTransaction(async (transaction) => {
        const idemActual = await transaction.get(idemRef);
        if (idemActual.exists && idemActual.data().operation === 'cuentas_correcciones_create') {
          throw { code: 'IDEMPOTENTE', response: idemActual.data().response };
        }
        const ref = db.collection(coleccion).doc(cuenta.id);
        const fresco = await transaction.get(ref);
        if (!fresco.exists) {
          throw { code: 'CUENTA_NO_ENCONTRADA', message: `La cuenta ${cuenta.id} ya no existe`, status: 404 };
        }
        const dataFresca = fresco.data();
        const correccionesFrescas = Array.isArray(dataFresca.correcciones) ? dataFresca.correcciones : [];
        const saldosFrescos = calcularSaldosTrasCorreccion(dataFresca, [...correccionesFrescas, correccion]);
        const updateFresco = { correcciones: [...correccionesFrescas, correccion], ultimaActualizacion: new Date().toISOString() };
        if (saldosFrescos.saldosRecalculados) {
          updateFresco.nuevoSaldoAcumulado = saldosFrescos.nuevoSaldoAcumulado;
          updateFresco.estadoPagado = saldosFrescos.estadoPagado;
        }
        transaction.update(ref, updateFresco);

        transaction.set(db.collection('asistenteLog').doc(), {
          operation: 'cuentas_correcciones_create',
          timestamp: adminSdk.firestore.FieldValue.serverTimestamp(),
          idempotencyKey,
          cliente: clienteClave,
          coleccion,
          cuentaId: cuenta.id,
          fecha: fechaISO,
          correccion,
          request: { cliente: req.body?.cliente, fecha: fechaISO, descripcion: descripcionLimpia, monto: montoRedondeado }
        });
        transaction.set(idemRef, {
          operation: 'cuentas_correcciones_create',
          timestamp: adminSdk.firestore.FieldValue.serverTimestamp(),
          response
        });
      });

      const guardada = await idemRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) return errorResponse(res, error.status || 500, error.code, error.message, error.details);
      console.error('Error en POST /cuentas/correcciones:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al registrar la corrección: ' + error.message);
    }
  }

  async function handlePostCuentasCorreccionesDeshacer(req, res) {
    const { idempotencyKey, undoIdempotencyKey, dryRun = false } = req.body || {};
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return errorResponse(res, 400, 'IDEMPOTENCY_KEY_REQUERIDA', 'Indica el idempotencyKey de la corrección a deshacer');
    }
    const undoKey = undoIdempotencyKey || `undo:${idempotencyKey}`;
    if (undoKey.includes('/')) {
      return errorResponse(res, 400, 'UNDO_IDEMPOTENCY_KEY_INVALIDA', 'undoIdempotencyKey no puede contener "/"');
    }

    try {
      const undoRef = db.collection('asistenteIdem').doc(undoKey);
      const undoSnap = await undoRef.get();
      if (undoSnap.exists && undoSnap.data().operation === 'cuentas_correcciones_undo') {
        return res.json(undoSnap.data().response);
      }

      const logs = await db.collection('asistenteLog').where('idempotencyKey', '==', idempotencyKey).get();
      const original = logs.docs.map((doc) => ({ id: doc.id, ...doc.data() })).find((log) => log.operation === 'cuentas_correcciones_create');
      if (!original) {
        return errorResponse(res, 404, 'OPERACION_NO_ENCONTRADA', 'No se encontró una corrección del asistente con ese idempotencyKey');
      }
      const ya = logs.docs.some((doc) => doc.data().operation === 'cuentas_correcciones_undo' && doc.data().originalIdempotencyKey === idempotencyKey);
      if (ya) {
        return errorResponse(res, 400, 'YA_DESHECHO', 'Esta corrección ya fue deshecha');
      }

      const coleccion = original.coleccion;
      const cuentaId = original.cuentaId;
      const correccionOriginal = original.correccion || {};
      const ref = db.collection(coleccion).doc(cuentaId);
      const snap = await ref.get();
      if (!snap.exists) {
        return errorResponse(res, 404, 'CUENTA_NO_ENCONTRADA', `La cuenta ${cuentaId} ya no existe`);
      }
      const data = snap.data();
      const correcciones = Array.isArray(data.correcciones) ? data.correcciones : [];
      const encontrada = correcciones.find((item) => item?._asistenteId === correccionOriginal._asistenteId);
      if (!encontrada) {
        return errorResponse(res, 404, 'FILA_NO_ENCONTRADA', 'La corrección ya no está en la cuenta.', { cuentaId });
      }
      if (encontrada.descripcion !== correccionOriginal.descripcion || redondear2(encontrada.monto) !== redondear2(correccionOriginal.monto)) {
        return errorResponse(res, 409, 'FILA_MODIFICADA', 'La corrección fue modificada después de registrarse. No se puede deshacer.', {
          cuentaId,
          correccionActual: encontrada,
          correccionOriginal
        });
      }

      const restantes = correcciones.filter((item) => item !== encontrada);
      const saldosDespues = calcularSaldosTrasCorreccion(data, restantes);

      if (dryRun) {
        return res.json({
          dryRun: true,
          operation: 'cuentas_correcciones_undo',
          cliente: original.cliente,
          coleccion,
          cuentaId,
          fecha: original.fecha,
          correccionEliminada: correccionOriginal,
          totalDiaDespues: saldosDespues.totalDia,
          nuevoSaldoAcumuladoDespues: saldosDespues.nuevoSaldoAcumulado
        });
      }

      const response = {
        success: true,
        operation: 'cuentas_correcciones_undo',
        cliente: original.cliente,
        coleccion,
        cuentaId,
        fecha: original.fecha,
        correccionEliminada: correccionOriginal,
        totalDiaDespues: saldosDespues.totalDia,
        nuevoSaldoAcumuladoDespues: saldosDespues.nuevoSaldoAcumulado,
        estadoPagado: saldosDespues.estadoPagado
      };

      await db.runTransaction(async (transaction) => {
        const undoActual = await transaction.get(undoRef);
        if (undoActual.exists && undoActual.data().operation === 'cuentas_correcciones_undo') {
          throw { code: 'IDEMPOTENTE', response: undoActual.data().response };
        }
        const fresco = await transaction.get(ref);
        if (!fresco.exists) {
          throw { code: 'CUENTA_NO_ENCONTRADA', message: `La cuenta ${cuentaId} ya no existe`, status: 404 };
        }
        const dataFresca = fresco.data();
        const listaFresca = Array.isArray(dataFresca.correcciones) ? dataFresca.correcciones : [];
        const encontradaFresca = listaFresca.find((item) => item?._asistenteId === correccionOriginal._asistenteId);
        if (!encontradaFresca) {
          throw { code: 'FILA_NO_ENCONTRADA', message: 'La corrección ya no está en la cuenta.', status: 404, details: { cuentaId } };
        }
        if (encontradaFresca.descripcion !== correccionOriginal.descripcion || redondear2(encontradaFresca.monto) !== redondear2(correccionOriginal.monto)) {
          throw {
            code: 'FILA_MODIFICADA',
            message: 'La corrección fue modificada después de registrarse. No se puede deshacer.',
            status: 409,
            details: { cuentaId, correccionActual: encontradaFresca, correccionOriginal }
          };
        }
        const restantesFrescos = listaFresca.filter((item) => item !== encontradaFresca);
        const saldosFrescos = calcularSaldosTrasCorreccion(dataFresca, restantesFrescos);
        const updateFresco = { correcciones: restantesFrescos, ultimaActualizacion: new Date().toISOString() };
        if (saldosFrescos.saldosRecalculados) {
          updateFresco.nuevoSaldoAcumulado = saldosFrescos.nuevoSaldoAcumulado;
          updateFresco.estadoPagado = saldosFrescos.estadoPagado;
        }
        transaction.update(ref, updateFresco);

        transaction.set(db.collection('asistenteLog').doc(), {
          operation: 'cuentas_correcciones_undo',
          timestamp: adminSdk.firestore.FieldValue.serverTimestamp(),
          idempotencyKey,
          undoIdempotencyKey: undoKey,
          originalIdempotencyKey: idempotencyKey,
          originalLogId: original.id,
          cliente: original.cliente,
          coleccion,
          cuentaId
        });
        transaction.set(undoRef, {
          operation: 'cuentas_correcciones_undo',
          timestamp: adminSdk.firestore.FieldValue.serverTimestamp(),
          response
        });
      });

      const guardada = await undoRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) return errorResponse(res, error.status || 500, error.code, error.message, error.details);
      console.error('Error en POST /cuentas/correcciones/deshacer:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al deshacer la corrección: ' + error.message);
    }
  }

  async function handlePostCuentasObservaciones(req, res) {
    const { texto, idempotencyKey, dryRun = false } = req.body || {};

    const resuelto = await resolverCuenta(req, res);
    if (!resuelto) return;
    const { clienteClave, coleccion, fechaISO, cuenta } = resuelto;

    if (typeof texto !== 'string') {
      return errorResponse(res, 400, 'TEXTO_INVALIDO', 'El texto de la observación es requerido (usa "" para eliminarla).');
    }
    const errorClave = validarIdempotencyKey(idempotencyKey, errorResponse, res);
    if (errorClave) return errorClave;

    try {
      const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
      const idemSnap = await idemRef.get();
      if (idemSnap.exists && idemSnap.data().operation === 'cuentas_observaciones_create') {
        return res.json(idemSnap.data().response);
      }

      const observacionAnterior = typeof cuenta.data.observacion === 'string' ? cuenta.data.observacion : '';
      const tieneObservacionAnterior = cuenta.data.tieneObservacion === true;
      const tieneObservacionNueva = texto.trim() !== '';

      const response = {
        success: true,
        operation: 'cuentas_observaciones_create',
        cliente: clienteClave,
        coleccion,
        cuentaId: cuenta.id,
        fecha: fechaISO,
        observacionAnterior,
        tieneObservacionAnterior,
        observacion: texto,
        tieneObservacion: tieneObservacionNueva
      };

      if (dryRun) {
        return res.json({
          ...response,
          dryRun: true,
          message: 'Simulación exitosa (sin escribir a Firestore)'
        });
      }

      await db.runTransaction(async (transaction) => {
        const idemActual = await transaction.get(idemRef);
        if (idemActual.exists && idemActual.data().operation === 'cuentas_observaciones_create') {
          throw { code: 'IDEMPOTENTE', response: idemActual.data().response };
        }
        const ref = db.collection(coleccion).doc(cuenta.id);
        const fresco = await transaction.get(ref);
        if (!fresco.exists) {
          throw { code: 'CUENTA_NO_ENCONTRADA', message: `La cuenta ${cuenta.id} ya no existe`, status: 404 };
        }
        transaction.update(ref, {
          observacion: texto,
          tieneObservacion: tieneObservacionNueva,
          ultimaActualizacion: new Date().toISOString()
        });

        transaction.set(db.collection('asistenteLog').doc(), {
          operation: 'cuentas_observaciones_create',
          timestamp: adminSdk.firestore.FieldValue.serverTimestamp(),
          idempotencyKey,
          cliente: clienteClave,
          coleccion,
          cuentaId: cuenta.id,
          fecha: fechaISO,
          observacionAnterior,
          tieneObservacionAnterior,
          observacion: texto,
          tieneObservacion: tieneObservacionNueva,
          request: { cliente: req.body?.cliente, fecha: fechaISO, texto }
        });
        transaction.set(idemRef, {
          operation: 'cuentas_observaciones_create',
          timestamp: adminSdk.firestore.FieldValue.serverTimestamp(),
          response
        });
      });

      const guardada = await idemRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) return errorResponse(res, error.status || 500, error.code, error.message, error.details);
      console.error('Error en POST /cuentas/observaciones:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al guardar la observación: ' + error.message);
    }
  }

  async function handlePostCuentasObservacionesDeshacer(req, res) {
    const { idempotencyKey, undoIdempotencyKey, dryRun = false } = req.body || {};
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return errorResponse(res, 400, 'IDEMPOTENCY_KEY_REQUERIDA', 'Indica el idempotencyKey de la observación a deshacer');
    }
    const undoKey = undoIdempotencyKey || `undo:${idempotencyKey}`;
    if (undoKey.includes('/')) {
      return errorResponse(res, 400, 'UNDO_IDEMPOTENCY_KEY_INVALIDA', 'undoIdempotencyKey no puede contener "/"');
    }

    try {
      const undoRef = db.collection('asistenteIdem').doc(undoKey);
      const undoSnap = await undoRef.get();
      if (undoSnap.exists && undoSnap.data().operation === 'cuentas_observaciones_undo') {
        return res.json(undoSnap.data().response);
      }

      const logs = await db.collection('asistenteLog').where('idempotencyKey', '==', idempotencyKey).get();
      const original = logs.docs.map((doc) => ({ id: doc.id, ...doc.data() })).find((log) => log.operation === 'cuentas_observaciones_create');
      if (!original) {
        return errorResponse(res, 404, 'OPERACION_NO_ENCONTRADA', 'No se encontró una observación del asistente con ese idempotencyKey');
      }
      const ya = logs.docs.some((doc) => doc.data().operation === 'cuentas_observaciones_undo' && doc.data().originalIdempotencyKey === idempotencyKey);
      if (ya) {
        return errorResponse(res, 400, 'YA_DESHECHO', 'Esta observación ya fue deshecha');
      }

      const coleccion = original.coleccion;
      const cuentaId = original.cuentaId;
      const ref = db.collection(coleccion).doc(cuentaId);
      const snap = await ref.get();
      if (!snap.exists) {
        return errorResponse(res, 404, 'CUENTA_NO_ENCONTRADA', `La cuenta ${cuentaId} ya no existe`);
      }
      const data = snap.data();
      const observacionActual = typeof data.observacion === 'string' ? data.observacion : '';
      const tieneActual = data.tieneObservacion === true;
      if (observacionActual !== original.observacion || tieneActual !== original.tieneObservacion) {
        return errorResponse(res, 409, 'FILA_MODIFICADA', 'La observación fue modificada después de guardarse. No se puede deshacer.', {
          cuentaId,
          observacionActual,
          tieneObservacionActual: tieneActual,
          observacionOriginal: original.observacion
        });
      }

      if (dryRun) {
        return res.json({
          dryRun: true,
          operation: 'cuentas_observaciones_undo',
          cliente: original.cliente,
          coleccion,
          cuentaId,
          fecha: original.fecha,
          observacionRestaurada: original.observacionAnterior,
          tieneObservacionRestaurada: original.tieneObservacionAnterior
        });
      }

      const response = {
        success: true,
        operation: 'cuentas_observaciones_undo',
        cliente: original.cliente,
        coleccion,
        cuentaId,
        fecha: original.fecha,
        observacionRestaurada: original.observacionAnterior,
        tieneObservacionRestaurada: original.tieneObservacionAnterior
      };

      await db.runTransaction(async (transaction) => {
        const undoActual = await transaction.get(undoRef);
        if (undoActual.exists && undoActual.data().operation === 'cuentas_observaciones_undo') {
          throw { code: 'IDEMPOTENTE', response: undoActual.data().response };
        }
        const fresco = await transaction.get(ref);
        if (!fresco.exists) {
          throw { code: 'CUENTA_NO_ENCONTRADA', message: `La cuenta ${cuentaId} ya no existe`, status: 404 };
        }
        const dataFresca = fresco.data();
        const observacionFresca = typeof dataFresca.observacion === 'string' ? dataFresca.observacion : '';
        const tieneFresca = dataFresca.tieneObservacion === true;
        if (observacionFresca !== original.observacion || tieneFresca !== original.tieneObservacion) {
          throw {
            code: 'FILA_MODIFICADA',
            message: 'La observación fue modificada después de guardarse. No se puede deshacer.',
            status: 409,
            details: { cuentaId, observacionActual: observacionFresca, observacionOriginal: original.observacion }
          };
        }
        transaction.update(ref, {
          observacion: original.observacionAnterior,
          tieneObservacion: original.tieneObservacionAnterior,
          ultimaActualizacion: new Date().toISOString()
        });

        transaction.set(db.collection('asistenteLog').doc(), {
          operation: 'cuentas_observaciones_undo',
          timestamp: adminSdk.firestore.FieldValue.serverTimestamp(),
          idempotencyKey,
          undoIdempotencyKey: undoKey,
          originalIdempotencyKey: idempotencyKey,
          originalLogId: original.id,
          cliente: original.cliente,
          coleccion,
          cuentaId
        });
        transaction.set(undoRef, {
          operation: 'cuentas_observaciones_undo',
          timestamp: adminSdk.firestore.FieldValue.serverTimestamp(),
          response
        });
      });

      const guardada = await undoRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) return errorResponse(res, error.status || 500, error.code, error.message, error.details);
      console.error('Error en POST /cuentas/observaciones/deshacer:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al deshacer la observación: ' + error.message);
    }
  }

  return {
    handlePostCuentasCorrecciones,
    handlePostCuentasCorreccionesDeshacer,
    handlePostCuentasObservaciones,
    handlePostCuentasObservacionesDeshacer
  };
}

module.exports = {
  crearHandlersCuentasEscritura,
  buscarCuentaDelDia,
  calcularSaldosTrasCorreccion
};
