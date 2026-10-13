/**
 * Abonos de clientes con la misma forma que StashModalV2.
 * Cascada: nota pendiente más antigua primero, un stashItemId compartido,
 * ventana de las 50 notas más recientes (igual que la UI).
 */

const LIMITE_NOTAS_UI = 50;
const UMBRAL = 0.01;

const CLIENTES = {
  veronica: { clave: 'veronica', coleccion: 'cuentasVeronica', stash: 'stash_veronica', historial: 'historial_aplicaciones_veronica', ozuna: false },
  otilio: { clave: 'otilio', coleccion: 'cuentasOtilio', stash: 'stash_otilio', historial: 'historial_aplicaciones_otilio', ozuna: false },
  catarro: { clave: 'catarro', coleccion: 'cuentasCatarro', stash: 'stash_catarro', historial: 'historial_aplicaciones_catarro', ozuna: false },
  joselito: { clave: 'joselito', coleccion: 'cuentasJoselito', stash: 'stash_joselito', historial: 'historial_aplicaciones_joselito', ozuna: false },
  ozuna: { clave: 'ozuna', coleccion: 'cuentasOzuna', stash: 'stash_ozuna', historial: 'historial_aplicaciones_ozuna', ozuna: true },
  otilioIndependiente: { clave: 'otilioIndependiente', coleccion: 'cuentasOtilioIndependiente', stash: 'stash_otilioIndependiente', historial: 'historial_aplicaciones_otilioIndependiente', ozuna: false }
};

function quitarAcentos(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function resolverClienteAbono(entrada) {
  const clave = quitarAcentos(entrada).trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (clave === 'veronica' || clave === 'lorena') return CLIENTES.veronica;
  if (clave === 'otilio') return CLIENTES.otilio;
  if (clave === 'otilioindependiente') return CLIENTES.otilioIndependiente;
  if (clave === 'catarro') return CLIENTES.catarro;
  if (clave === 'joselito') return CLIENTES.joselito;
  if (clave === 'ozuna') return CLIENTES.ozuna;
  return null;
}

function clientesDisponibles() {
  return ['veronica', 'lorena', 'otilio', 'catarro', 'joselito', 'ozuna', 'otilioIndependiente'];
}

function redondearMonto(monto) {
  return Math.round((Number(monto) || 0) * 100) / 100;
}

function sumarMontos(lista) {
  return (lista || []).reduce((suma, item) => suma + (parseFloat(item?.monto) || 0), 0);
}

function tiempoFecha(fecha) {
  if (!fecha) return 0;
  if (typeof fecha.toDate === 'function') return fecha.toDate().getTime();
  const segundos = fecha.seconds ?? fecha._seconds;
  if (typeof segundos === 'number') return segundos * 1000;
  const tiempo = new Date(fecha).getTime();
  return Number.isNaN(tiempo) ? 0 : tiempo;
}

function canonMetodo(valor) {
  const clave = quitarAcentos(valor).trim().toLowerCase();
  if (clave === 'transferencia') return 'Transferencia';
  if (clave === 'efectivo') return 'Efectivo';
  if (clave === 'deposito') return 'Deposito';
  return null;
}

function normalizarFechaSeleccionada(fecha) {
  if (!fecha) return new Date().toISOString();
  const texto = String(fecha);
  if (texto.includes('T')) return texto;
  const [year, month, day] = texto.split('-').map(Number);
  if (!year || !month || !day) return new Date().toISOString();
  const pad = (value) => String(value).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}T00:00:00`;
}

function descripcionAbono(fecha, metodo) {
  const iso = String(fecha).split('T')[0];
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year} - ${metodo}`;
}

/**
 * Saldo pendiente de la nota, igual que cargarCuentasDisponibles.
 * Ozuna no tiene totalGeneralVenta: la UI usa nuevoSaldoAcumulado.
 */
function saldoPendienteNota(data, ozuna) {
  if (ozuna) return Number(data?.nuevoSaldoAcumulado) || 0;
  const totalCobros = sumarMontos(data?.cobros);
  const totalCorrecciones = sumarMontos(data?.correcciones);
  const totalAbonos = sumarMontos(data?.abonos);
  return (data?.totalGeneralVenta || 0) - totalCobros - totalCorrecciones - totalAbonos;
}

function ordenarMasAntiguaPrimero(cuentas) {
  return [...cuentas].sort((a, b) => tiempoFecha(a.fecha) - tiempoFecha(b.fecha));
}

/**
 * Replica el filtro de la UI sobre la ventana ya recortada a 50 notas.
 */
function notasPendientesDesdeDocs(docs, ozuna) {
  const mapeadas = docs.map((doc) => {
    const data = doc.data ? doc.data() : doc.data;
    const saldoPendiente = saldoPendienteNota(data, ozuna);
    return {
      id: doc.id,
      fecha: data.fecha,
      data,
      saldoPendiente,
      estadoPagado: !!data.estadoPagado,
      nuevoSaldoAcumulado: typeof data.nuevoSaldoAcumulado === 'number' ? data.nuevoSaldoAcumulado : null,
      totalGeneralVenta: data.totalGeneralVenta || 0
    };
  });

  if (ozuna) {
    return ordenarMasAntiguaPrimero(mapeadas.filter((cuenta) => cuenta.fecha));
  }

  return ordenarMasAntiguaPrimero(
    mapeadas.filter((cuenta) => !cuenta.estadoPagado && cuenta.saldoPendiente > 0)
  );
}

function construirAbono(meta, monto) {
  return {
    descripcion: meta.descripcion,
    monto: redondearMonto(monto),
    fecha: normalizarFechaSeleccionada(meta.fecha),
    fechaOriginalStash: meta.fechaOriginalStash,
    esEfectivo: !!meta.esEfectivo,
    stashItemId: meta.stashItemId
  };
}

/**
 * Una sola pieza de stash, el mismo ciclo que aplicarAbonosEnCascada.
 * El tope de cada nota es el saldo que la UI vuelve a leer antes de aplicar.
 */
function distribuirCascada(notas, monto, meta, ozuna) {
  const abono = { montoRestante: redondearMonto(monto) };
  const aplicaciones = [];

  for (const nota of notas) {
    if (abono.montoRestante <= UMBRAL) break;
    const saldoActual = ozuna
      ? (Number(nota.data?.nuevoSaldoAcumulado) || 0)
      : saldoPendienteNota(nota.data, false);
    if (saldoActual <= 0) continue;

    const montoAAplicar = Math.min(abono.montoRestante, saldoActual);
    if (montoAAplicar <= UMBRAL) continue;

    const aplicado = redondearMonto(montoAAplicar);
    aplicaciones.push({
      notaId: nota.id,
      fecha: nota.fecha,
      saldoPendienteAntes: redondearMonto(saldoActual),
      monto: aplicado,
      abono: construirAbono(meta, aplicado)
    });
    abono.montoRestante = redondearMonto(abono.montoRestante - aplicado);
  }

  const sobrante = abono.montoRestante > UMBRAL ? abono.montoRestante : 0;
  return {
    aplicaciones,
    sobrante,
    totalAplicado: redondearMonto(aplicaciones.reduce((suma, aplicacion) => suma + aplicacion.monto, 0))
  };
}

function camposSaldoTrasAbono(data, abonosNuevos, ozuna, montoAplicadoEnEstaNota) {
  if (ozuna) {
    const nuevoSaldo = redondearMonto((Number(data.nuevoSaldoAcumulado) || 0) - montoAplicadoEnEstaNota);
    const update = {
      abonos: abonosNuevos,
      nuevoSaldoAcumulado: Math.max(0, nuevoSaldo),
      ultimaActualizacion: new Date().toISOString()
    };
    if (typeof data.totalSaldo === 'number') {
      update.totalSaldo = Math.max(0, redondearMonto(data.totalSaldo - montoAplicadoEnEstaNota));
    }
    return {
      update,
      saldoPendienteDespues: update.nuevoSaldoAcumulado,
      nuevoSaldoAcumulado: update.nuevoSaldoAcumulado,
      estadoPagado: false
    };
  }

  const totalCobros = sumarMontos(data.cobros);
  const totalCorrecciones = sumarMontos(data.correcciones);
  const totalAbonos = sumarMontos(abonosNuevos);
  const totalDia = (data.totalGeneralVenta || 0) - totalCobros - totalCorrecciones - totalAbonos;
  const nuevoSaldoAcumulado = (data.saldoAcumuladoAnterior || 0) + totalDia;
  return {
    update: {
      abonos: abonosNuevos,
      nuevoSaldoAcumulado: Math.max(0, nuevoSaldoAcumulado),
      estadoPagado: nuevoSaldoAcumulado <= UMBRAL,
      ultimaActualizacion: new Date().toISOString()
    },
    saldoPendienteDespues: redondearMonto(totalDia),
    nuevoSaldoAcumulado: Math.max(0, nuevoSaldoAcumulado),
    estadoPagado: nuevoSaldoAcumulado <= UMBRAL
  };
}

function abonoCoincide(guardado, esperado) {
  if (!guardado || !esperado) return false;
  return guardado.stashItemId === esperado.stashItemId
    && redondearMonto(guardado.monto) === redondearMonto(esperado.monto)
    && guardado.descripcion === esperado.descripcion
    && guardado.fecha === esperado.fecha
    && !!guardado.esEfectivo === !!esperado.esEfectivo;
}

function crearHandlersAbonos({ db, admin, errorResponse }) {
  function fechaValida(fecha) {
    return typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  }

  async function leerVentana(coleccion) {
    const snap = await db.collection(coleccion).orderBy('fecha', 'desc').limit(LIMITE_NOTAS_UI).get();
    return snap.docs;
  }

  async function handleGetAbonos(req, res) {
    const cliente = resolverClienteAbono(req.query.cliente);
    if (!req.query.cliente) {
      return errorResponse(res, 400, 'CLIENTE_REQUERIDO', 'Indica el cliente', { clientes: clientesDisponibles() });
    }
    if (!cliente) {
      return errorResponse(res, 400, 'CLIENTE_DESCONOCIDO', `Cliente "${req.query.cliente}" no tiene cuentas de abonos`, {
        clientes: clientesDisponibles()
      });
    }

    try {
      const [recientes, todas] = await Promise.all([
        leerVentana(cliente.coleccion),
        db.collection(cliente.coleccion).get()
      ]);
      const idsEnCascada = new Set(recientes.map((doc) => doc.id));
      const notas = notasPendientesDesdeDocs(todas.docs, cliente.ozuna)
        .filter((nota) => cliente.ozuna ? nota.saldoPendiente > 0 : true)
        .map((nota) => ({
          id: nota.id,
          fecha: nota.fecha,
          saldoPendiente: redondearMonto(nota.saldoPendiente),
          nuevoSaldoAcumulado: nota.nuevoSaldoAcumulado,
          estadoPagado: nota.estadoPagado,
          totalGeneralVenta: nota.totalGeneralVenta,
          enCascada: idsEnCascada.has(nota.id)
        }));

      let saldoActual = 0;
      if (recientes.length > 0) {
        const ultima = recientes[0].data();
        saldoActual = typeof ultima.nuevoSaldoAcumulado === 'number'
          ? ultima.nuevoSaldoAcumulado
          : saldoPendienteNota(ultima, cliente.ozuna) + (ultima.saldoAcumuladoAnterior || 0);
      }

      return res.json({
        success: true,
        cliente: cliente.clave,
        alias: quitarAcentos(req.query.cliente).trim().toLowerCase() === 'lorena' ? 'lorena' : undefined,
        coleccion: cliente.coleccion,
        saldoActual: redondearMonto(saldoActual),
        limiteCascada: LIMITE_NOTAS_UI,
        notas
      });
    } catch (error) {
      console.error('Error en GET /abonos:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al consultar abonos: ' + error.message);
    }
  }

  async function resolverNotaExplicita(coleccion, nota) {
    const directo = await db.collection(coleccion).doc(String(nota)).get();
    if (directo.exists) return { snap: directo };
    const porFecha = await db.collection(coleccion).where('fecha', '==', String(nota)).get();
    if (porFecha.empty) return { snap: null };
    if (porFecha.size > 1) {
      return {
        ambiguo: porFecha.docs.map((doc) => ({ id: doc.id, fecha: doc.data().fecha }))
      };
    }
    return { snap: porFecha.docs[0] };
  }

  async function handlePostAbonos(req, res) {
    const {
      cliente: clienteEntrada,
      monto,
      metodo: metodoEntrada,
      fecha,
      modo,
      nota,
      idempotencyKey,
      dryRun = false
    } = req.body || {};

    const cliente = resolverClienteAbono(clienteEntrada);
    if (!cliente) {
      return errorResponse(res, 400, 'CLIENTE_DESCONOCIDO', 'Cliente no reconocido', { clientes: clientesDisponibles() });
    }
    const montoNumero = redondearMonto(monto);
    if (!Number.isFinite(Number(monto)) || montoNumero <= 0) {
      return errorResponse(res, 400, 'MONTO_INVALIDO', 'El monto debe ser mayor a 0');
    }
    const metodo = canonMetodo(metodoEntrada);
    if (!metodo) {
      return errorResponse(res, 400, 'METODO_INVALIDO', 'El método debe ser Transferencia, Efectivo o Deposito');
    }
    if (!fechaValida(fecha)) {
      return errorResponse(res, 400, 'FECHA_INVALIDA', 'La fecha es requerida y debe estar en formato YYYY-MM-DD');
    }
    const modoNormalizado = String(modo || '').trim().toLowerCase();
    if (!['cascada', 'nota'].includes(modoNormalizado)) {
      return errorResponse(res, 400, 'MODO_INVALIDO', 'El modo debe ser "cascada" o "nota"');
    }
    if (modoNormalizado === 'nota' && (nota === undefined || nota === null || String(nota).trim() === '')) {
      return errorResponse(res, 400, 'NOTA_REQUERIDA', 'En modo nota indica el id o la fecha de la nota');
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.includes('/')) {
      return errorResponse(res, 400, 'IDEMPOTENCY_KEY_REQUERIDA', 'idempotencyKey es requerido y no puede contener "/"');
    }

    try {
      const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
      const idemSnap = await idemRef.get();
      if (idemSnap.exists && idemSnap.data().operation === 'abonos_create') {
        return res.json(idemSnap.data().response);
      }

      const metaBase = {
        descripcion: descripcionAbono(fecha, metodo),
        fecha: normalizarFechaSeleccionada(fecha),
        fechaOriginalStash: fecha,
        esEfectivo: metodo === 'Efectivo'
      };

      let plan;
      let stashItemId = db.collection(cliente.stash).doc().id;

      if (modoNormalizado === 'nota') {
        const encontrada = await resolverNotaExplicita(cliente.coleccion, String(nota).trim());
        if (encontrada.ambiguo) {
          return errorResponse(res, 409, 'NOTA_AMBIGUA', 'Hay más de una nota con esa fecha', { notas: encontrada.ambiguo });
        }
        if (!encontrada.snap) {
          return errorResponse(res, 404, 'NOTA_NO_ENCONTRADA', `No existe la nota "${nota}" en ${cliente.coleccion}`);
        }
        const data = encontrada.snap.data();
        const abono = construirAbono({ ...metaBase, stashItemId }, montoNumero);
        plan = {
          modo: 'nota',
          aplicaciones: [{
            notaId: encontrada.snap.id,
            fecha: data.fecha,
            saldoPendienteAntes: redondearMonto(saldoPendienteNota(data, cliente.ozuna)),
            monto: montoNumero,
            abono
          }],
          sobrante: 0,
          totalAplicado: montoNumero,
          notasFuente: [{ id: encontrada.snap.id, data }]
        };
      } else {
        const ventana = await leerVentana(cliente.coleccion);
        const pendientes = notasPendientesDesdeDocs(ventana, cliente.ozuna);
        const distribuido = distribuirCascada(
          pendientes,
          montoNumero,
          { ...metaBase, stashItemId },
          cliente.ozuna
        );
        plan = {
          modo: 'cascada',
          ...distribuido,
          notasFuente: pendientes,
          ventanaIds: ventana.map((doc) => doc.id)
        };
      }

      const fuentes = new Map(plan.notasFuente.map((nota) => [nota.id, nota.data]));
      const aplicaciones = plan.aplicaciones.map((aplicacion) => {
        const data = fuentes.get(aplicacion.notaId) || {};
        const abonosNuevos = [...(data.abonos || []), aplicacion.abono];
        const saldos = camposSaldoTrasAbono(data, abonosNuevos, cliente.ozuna, aplicacion.monto);
        return {
          notaId: aplicacion.notaId,
          fecha: aplicacion.fecha,
          monto: aplicacion.monto,
          saldoPendienteAntes: aplicacion.saldoPendienteAntes,
          saldoPendienteDespues: saldos.saldoPendienteDespues,
          nuevoSaldoAcumulado: saldos.nuevoSaldoAcumulado,
          estadoPagado: saldos.estadoPagado,
          abono: aplicacion.abono,
          update: saldos.update
        };
      });

      let stashSobrante = null;
      if (plan.sobrante > 0) {
        stashSobrante = {
          id: db.collection(cliente.stash).doc().id,
          data: {
            fecha,
            descripcion: metaBase.descripcion,
            monto: plan.sobrante,
            fechaCreacion: metaBase.fecha,
            esEfectivo: metaBase.esEfectivo,
            metodo
          }
        };
      }

      const response = {
        success: true,
        operation: 'abonos_create',
        cliente: cliente.clave,
        coleccion: cliente.coleccion,
        modo: plan.modo,
        monto: montoNumero,
        metodo,
        fecha,
        stashItemId: aplicaciones.length ? stashItemId : (stashSobrante ? stashSobrante.id : stashItemId),
        aplicaciones: aplicaciones.map(({ update, ...publica }) => publica),
        totalAplicado: plan.totalAplicado,
        sobrante: plan.sobrante,
        stashSobranteId: stashSobrante ? stashSobrante.id : null
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
        if (idemActual.exists && idemActual.data().operation === 'abonos_create') {
          throw { code: 'IDEMPOTENTE', response: idemActual.data().response };
        }

        let aplicadas = aplicaciones;
        let sobranteFinal = plan.sobrante;
        let totalFinal = plan.totalAplicado;

        if (plan.modo === 'cascada') {
          const snapsVentana = [];
          for (const id of plan.ventanaIds) {
            snapsVentana.push(await transaction.get(db.collection(cliente.coleccion).doc(id)));
          }
          const pendientes = notasPendientesDesdeDocs(snapsVentana.filter((snap) => snap.exists), cliente.ozuna);
          const distribuido = distribuirCascada(
            pendientes,
            montoNumero,
            { ...metaBase, stashItemId },
            cliente.ozuna
          );
          const fuentesFrescas = new Map(pendientes.map((nota) => [nota.id, nota.data]));
          aplicadas = distribuido.aplicaciones.map((aplicacion) => {
            const data = fuentesFrescas.get(aplicacion.notaId) || {};
            const saldos = camposSaldoTrasAbono(data, [...(data.abonos || []), aplicacion.abono], cliente.ozuna, aplicacion.monto);
            return {
              notaId: aplicacion.notaId,
              fecha: aplicacion.fecha,
              monto: aplicacion.monto,
              saldoPendienteAntes: aplicacion.saldoPendienteAntes,
              saldoPendienteDespues: saldos.saldoPendienteDespues,
              nuevoSaldoAcumulado: saldos.nuevoSaldoAcumulado,
              estadoPagado: saldos.estadoPagado,
              abono: aplicacion.abono,
              update: saldos.update
            };
          });
          sobranteFinal = distribuido.sobrante;
          totalFinal = distribuido.totalAplicado;
        } else {
          const snaps = [];
          for (const aplicacion of aplicadas) {
            snaps.push(await transaction.get(db.collection(cliente.coleccion).doc(aplicacion.notaId)));
          }
          snaps.forEach((snap, index) => {
            if (!snap.exists) {
              throw { code: 'NOTA_NO_ENCONTRADA', message: `La nota ${aplicadas[index].notaId} ya no existe`, status: 404 };
            }
            const data = snap.data();
            const saldos = camposSaldoTrasAbono(data, [...(data.abonos || []), aplicadas[index].abono], cliente.ozuna, aplicadas[index].monto);
            aplicadas[index].update = saldos.update;
            aplicadas[index].saldoPendienteDespues = saldos.saldoPendienteDespues;
            aplicadas[index].nuevoSaldoAcumulado = saldos.nuevoSaldoAcumulado;
            aplicadas[index].estadoPagado = saldos.estadoPagado;
          });
        }

        aplicadas.forEach((aplicacion) => {
          transaction.update(db.collection(cliente.coleccion).doc(aplicacion.notaId), aplicacion.update);
        });

        const sobranteDoc = sobranteFinal > 0 ? {
          ...(stashSobrante ? stashSobrante.data : {
            fecha,
            descripcion: metaBase.descripcion,
            fechaCreacion: metaBase.fecha,
            esEfectivo: metaBase.esEfectivo,
            metodo
          }),
          monto: sobranteFinal
        } : null;
        const sobranteId = sobranteFinal > 0
          ? (stashSobrante ? stashSobrante.id : db.collection(cliente.stash).doc().id)
          : null;
        if (sobranteId) {
          transaction.set(db.collection(cliente.stash).doc(sobranteId), sobranteDoc);
        }

        if (aplicadas.length) {
          transaction.set(db.collection(cliente.historial).doc(), {
            tipo: plan.modo === 'nota' ? 'nota' : 'cascada',
            fecha: new Date().toISOString(),
            abonosAplicados: aplicadas.map((aplicacion) => ({
              cuentaId: aplicacion.notaId,
              fecha: aplicacion.fecha,
              abonos: [aplicacion.abono],
              totalAplicado: aplicacion.monto,
              saldoAntes: aplicacion.saldoPendienteAntes,
              saldoDespues: Math.max(0, aplicacion.saldoPendienteDespues)
            })),
            totalAplicado: totalFinal,
            cuentasAfectadas: aplicadas.length,
            descripcion: `Aplicación en ${plan.modo === 'nota' ? 'nota' : 'cascada'} a ${aplicadas.length} cuenta(s)`
          });
        }

        const respuestaFinal = {
          ...response,
          stashItemId: aplicadas.length ? stashItemId : (sobranteId || stashItemId),
          aplicaciones: aplicadas.map(({ update, ...publica }) => publica),
          totalAplicado: totalFinal,
          sobrante: sobranteFinal,
          stashSobranteId: sobranteId
        };

        const logRef = db.collection('asistenteLog').doc();
        transaction.set(logRef, {
          operation: 'abonos_create',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          idempotencyKey,
          cliente: cliente.clave,
          coleccion: cliente.coleccion,
          stash: cliente.stash,
          modo: plan.modo,
          stashItemId: respuestaFinal.stashItemId,
          stashSobranteId: sobranteId,
          sobrante: sobranteFinal,
          aplicaciones: aplicadas.map((aplicacion) => ({
            notaId: aplicacion.notaId,
            abono: aplicacion.abono,
            monto: aplicacion.monto
          })),
          request: { cliente: clienteEntrada, monto: montoNumero, metodo, fecha, modo: modoNormalizado, nota: nota || null }
        });

        transaction.set(idemRef, {
          operation: 'abonos_create',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          response: respuestaFinal
        });
      });

      const guardada = await idemRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) return errorResponse(res, error.status || 500, error.code, error.message, error.details);
      console.error('Error en POST /abonos:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al registrar el abono: ' + error.message);
    }
  }

  async function handlePostAbonosDeshacer(req, res) {
    const { idempotencyKey, undoIdempotencyKey, dryRun = false } = req.body || {};
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return errorResponse(res, 400, 'IDEMPOTENCY_KEY_REQUERIDA', 'Indica el idempotencyKey del abono a deshacer');
    }
    const undoKey = undoIdempotencyKey || `undo:${idempotencyKey}`;
    if (undoKey.includes('/')) {
      return errorResponse(res, 400, 'UNDO_IDEMPOTENCY_KEY_INVALIDA', 'undoIdempotencyKey no puede contener "/"');
    }

    try {
      const undoRef = db.collection('asistenteIdem').doc(undoKey);
      const undoSnap = await undoRef.get();
      if (undoSnap.exists && undoSnap.data().operation === 'abonos_undo') {
        return res.json(undoSnap.data().response);
      }

      const logs = await db.collection('asistenteLog').where('idempotencyKey', '==', idempotencyKey).get();
      const original = logs.docs.map((doc) => ({ id: doc.id, ...doc.data() })).find((log) => log.operation === 'abonos_create');
      if (!original) {
        return errorResponse(res, 404, 'OPERACION_NO_ENCONTRADA', 'No se encontró un abono del asistente con ese idempotencyKey');
      }
      const ya = logs.docs.some((doc) => doc.data().operation === 'abonos_undo' && doc.data().originalIdempotencyKey === idempotencyKey);
      if (ya) {
        return errorResponse(res, 400, 'YA_DESHECHO', 'Este abono ya fue deshecho');
      }

      const cliente = CLIENTES[original.cliente];
      if (!cliente) {
        return errorResponse(res, 400, 'CLIENTE_DESCONOCIDO', 'El log no tiene un cliente reconocido');
      }

      if (dryRun) {
        return res.json({
          dryRun: true,
          operation: 'abonos_undo',
          cliente: cliente.clave,
          aplicaciones: original.aplicaciones || [],
          stashSobranteId: original.stashSobranteId || null
        });
      }

      const response = {
        success: true,
        operation: 'abonos_undo',
        cliente: cliente.clave,
        notasActualizadas: [],
        stashSobranteEliminado: false
      };

      await db.runTransaction(async (transaction) => {
        const undoActual = await transaction.get(undoRef);
        if (undoActual.exists && undoActual.data().operation === 'abonos_undo') {
          throw { code: 'IDEMPOTENTE', response: undoActual.data().response };
        }

        const aplicaciones = original.aplicaciones || [];
        const refs = aplicaciones.map((aplicacion) => db.collection(cliente.coleccion).doc(aplicacion.notaId));
        const snaps = [];
        for (const ref of refs) snaps.push(await transaction.get(ref));

        snaps.forEach((snap, index) => {
          const esperado = aplicaciones[index];
          if (!snap.exists) {
            throw { code: 'NOTA_NO_ENCONTRADA', message: `La nota ${esperado.notaId} ya no existe`, status: 404 };
          }
          const data = snap.data();
          const abonos = data.abonos || [];
          const encontrado = abonos.find((abono) => abonoCoincide(abono, esperado.abono));
          if (!encontrado) {
            const mismoStash = abonos.find((abono) => abono.stashItemId === esperado.abono.stashItemId);
            if (mismoStash) {
              throw {
                code: 'FILA_MODIFICADA',
                message: 'El abono fue modificado después de registrarse. No se puede deshacer.',
                status: 409,
                details: { notaId: esperado.notaId, abonoActual: mismoStash, abonoOriginal: esperado.abono }
              };
            }
            throw {
              code: 'FILA_NO_ENCONTRADA',
              message: 'El abono ya no está en la nota.',
              status: 404,
              details: { notaId: esperado.notaId }
            };
          }
          const restantes = abonos.filter((abono) => abono !== encontrado);
          const saldos = camposSaldoTrasAbono(data, restantes, cliente.ozuna, 0);
          if (cliente.ozuna) {
            const devuelto = redondearMonto((Number(data.nuevoSaldoAcumulado) || 0) + esperado.monto);
            saldos.update.nuevoSaldoAcumulado = devuelto;
            if (typeof data.totalSaldo === 'number') {
              saldos.update.totalSaldo = redondearMonto(data.totalSaldo + esperado.monto);
            }
          }
          transaction.update(refs[index], saldos.update);
          response.notasActualizadas.push({
            notaId: esperado.notaId,
            saldoPendiente: cliente.ozuna ? saldos.update.nuevoSaldoAcumulado : saldos.saldoPendienteDespues,
            nuevoSaldoAcumulado: saldos.update.nuevoSaldoAcumulado,
            estadoPagado: saldos.update.estadoPagado === true
          });
        });

        if (original.stashSobranteId) {
          const stashRef = db.collection(cliente.stash).doc(original.stashSobranteId);
          const stashSnap = await transaction.get(stashRef);
          if (stashSnap.exists) {
            const actual = stashSnap.data();
            if (redondearMonto(actual.monto) !== redondearMonto(original.sobrante)) {
              throw {
                code: 'FILA_MODIFICADA',
                message: 'El sobrante del stash fue modificado. No se puede deshacer.',
                status: 409
              };
            }
            transaction.delete(stashRef);
            response.stashSobranteEliminado = true;
          }
        }

        transaction.set(db.collection('asistenteLog').doc(), {
          operation: 'abonos_undo',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          idempotencyKey,
          undoIdempotencyKey: undoKey,
          originalIdempotencyKey: idempotencyKey,
          originalLogId: original.id,
          cliente: cliente.clave
        });
        transaction.set(undoRef, {
          operation: 'abonos_undo',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          response
        });
      });

      const guardada = await undoRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) return errorResponse(res, error.status || 500, error.code, error.message, error.details);
      console.error('Error en POST /abonos/deshacer:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al deshacer el abono: ' + error.message);
    }
  }

  return { handleGetAbonos, handlePostAbonos, handlePostAbonosDeshacer };
}

module.exports = {
  LIMITE_NOTAS_UI,
  CLIENTES,
  resolverClienteAbono,
  redondearMonto,
  saldoPendienteNota,
  notasPendientesDesdeDocs,
  distribuirCascada,
  construirAbono,
  descripcionAbono,
  normalizarFechaSeleccionada,
  canonMetodo,
  camposSaldoTrasAbono,
  crearHandlersAbonos
};
