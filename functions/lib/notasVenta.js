/**
 * Notas de venta de "Notas por Cliente" (colección `notes`), con la misma forma
 * que guarda src/views/SaleNote.vue y el mismo efecto sobre `clientBalances`.
 *
 * `clientBalances/{cliente}.balance` es el SALDO A FAVOR del cliente (dinero que sobró
 * de un abono en NoteMenu), no su deuda. La deuda se calcula al vuelo con las notas
 * (src/utils/notaVentaSaldosCliente.js: saldoRestanteNota). Al agregar el primer producto,
 * SaleNote.applyClientBalanceAsAbono mete todo el saldo a favor como abono de la nota y
 * deja el balance en 0. Esta API hace lo mismo.
 */

const OPERACION = 'notas_create';
const OPERACION_UNDO = 'notas_undo';

function quitarAcentos(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function claveCliente(nombre) {
  return quitarAcentos(nombre).trim().toLowerCase().replace(/\s+/g, ' ');
}

function redondear(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** lineTotalProductoNotaVenta (src/utils/notaVentaSaldosCliente.js). */
function totalLinea(p) {
  if (p == null) return 0;
  if (p.total != null && p.total !== '') {
    const t = Number(p.total);
    if (!Number.isNaN(t)) return t;
  }
  return (Number(p.kilos) || 0) * (Number(p.pricePerKilo) || 0);
}

/** totalFinalNota: suma de productos MENOS flete (igual que SaleNote.totalFinal). */
function totalFinalNota(note) {
  const products = Array.isArray(note.products) ? note.products : [];
  return products.reduce((s, p) => s + totalLinea(p), 0) - (Number(note.flete) || 0);
}

function totalAbonadoNota(note) {
  const abonos = Array.isArray(note.abonos) ? note.abonos : [];
  return abonos.reduce((s, a) => s + (Number(a.monto) || 0), 0);
}

/** saldoRestanteNota: 0 si isPaid; si no, max(0, totalFinal - abonado). */
function saldoRestanteNota(note) {
  if (note.isPaid) return 0;
  const r = totalFinalNota(note) - totalAbonadoNota(note);
  return r > 0 ? r : 0;
}

/** Fecha local de México (YYYY-MM-DD), como obtenerFechaActualISO en el teléfono. */
function hoyMexico(ahora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(ahora);
}

function fechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

function tiempoNota(v) {
  if (!v) return 0;
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function mismoValor(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function crearHandlersNotas({ db, FieldValue, errorResponse, generarAsistenteId }) {
  const fallo = (status, code, message, details) => { throw { status, code, message, details }; };

  function manejarError(res, err, ruta) {
    if (err && err.code && err.status) return errorResponse(res, err.status, err.code, err.message, err.details || null);
    console.error(`Error en ${ruta}:`, err);
    return errorResponse(res, 500, 'ERROR_INTERNO', `Error en ${ruta}: ` + (err && err.message));
  }

  async function resolverCliente(entrada, transaction) {
    if (typeof entrada !== 'string' || !entrada.trim()) {
      fallo(400, 'CLIENTE_REQUERIDO', 'Indica el cliente');
    }
    const ref = db.collection('clients');
    const snap = transaction ? await transaction.get(ref) : await ref.get();
    const nombres = snap.docs.map((d) => d.data().name).filter((n) => typeof n === 'string' && n.trim());
    const buscado = claveCliente(entrada);
    const nombre = nombres.find((n) => n.trim() === entrada.trim())
      || nombres.find((n) => claveCliente(n) === buscado);
    if (!nombre) {
      fallo(400, 'CLIENTE_DESCONOCIDO', `El cliente "${entrada}" no está en la lista de clientes de Notas por Cliente`, { clientes: nombres });
    }
    return nombre;
  }

  /** Notas del cliente con el filtro de SaleNote: String(client).trim() === nombre. */
  async function notasDelCliente(nombre) {
    const snap = await db.collection('notes').get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((n) => String(n.client || '').trim() === nombre.trim());
  }

  function validarCuerpo(body) {
    const { folio, fecha, lineas, flete, dryRun = false, idempotencyKey, observaciones } = body;
    if (typeof dryRun !== 'boolean') fallo(400, 'VALIDACION_ERROR', 'dryRun debe ser boolean');
    if (idempotencyKey !== undefined && idempotencyKey !== null
      && (typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.includes('/'))) {
      fallo(400, 'IDEMPOTENCY_KEY_INVALIDA', 'idempotencyKey debe ser un texto no vacío y sin "/"');
    }
    if (!dryRun && !idempotencyKey) {
      fallo(400, 'IDEMPOTENCY_KEY_REQUERIDA', 'idempotencyKey es requerido para crear la nota (sirve para reintentos y para deshacer)');
    }
    const folioNum = typeof folio === 'string' && /^\d+$/.test(folio.trim()) ? Number(folio.trim()) : folio;
    if (!Number.isInteger(folioNum) || folioNum < 0) fallo(400, 'FOLIO_INVALIDO', 'folio debe ser un entero >= 0');
    if (!fechaValida(fecha)) fallo(400, 'FECHA_INVALIDA', 'fecha es requerida en formato YYYY-MM-DD');
    if (!Array.isArray(lineas) || !lineas.length) fallo(400, 'LINEAS_REQUERIDAS', 'lineas debe ser un arreglo no vacío');
    const products = lineas.map((l, i) => {
      const producto = l && typeof l.producto === 'string' ? l.producto.trim() : '';
      const kg = l ? Number(l.kg) : NaN;
      const precio = l ? Number(l.precio) : NaN;
      if (!producto) fallo(400, 'LINEA_INVALIDA', `lineas[${i}].producto es requerido`);
      if (typeof l.kg !== 'number' || !Number.isFinite(kg) || kg <= 0) fallo(400, 'LINEA_INVALIDA', `lineas[${i}].kg debe ser un número > 0`);
      if (typeof l.precio !== 'number' || !Number.isFinite(precio) || precio < 0) fallo(400, 'LINEA_INVALIDA', `lineas[${i}].precio debe ser un número >= 0`);
      // Misma forma que SaleNote.addProduct: { product, kilos, pricePerKilo, total = kilos * pricePerKilo }
      return { product: producto, kilos: kg, pricePerKilo: precio, total: kg * precio };
    });
    let fleteNum = 0;
    if (flete !== undefined && flete !== null) {
      if (typeof flete !== 'number' || !Number.isFinite(flete) || flete < 0) fallo(400, 'FLETE_INVALIDO', 'flete debe ser un número >= 0');
      fleteNum = flete;
    }
    if (observaciones !== undefined && observaciones !== null && typeof observaciones !== 'string') {
      fallo(400, 'VALIDACION_ERROR', 'observaciones debe ser texto');
    }
    return {
      folio: folioNum,
      fecha,
      products,
      flete: fleteNum,
      observaciones: typeof observaciones === 'string' ? observaciones.trim().slice(0, 500) : '',
      dryRun,
      idempotencyKey: idempotencyKey || null
    };
  }

  /** Arma el documento como SaleNote.saveNote (nota nueva) + applyClientBalanceAsAbono. */
  function construirNota(datos, cliente, saldoAFavor, ahora) {
    const abonos = [];
    if (saldoAFavor > 0) {
      // SaleNote: { monto: clientBalance, fecha: new Date().toISOString().substr(0, 10) }
      abonos.push({ monto: saldoAFavor, fecha: ahora.toISOString().slice(0, 10) });
    }
    const borrador = { products: datos.products, abonos, flete: datos.flete };
    const saldoRestante = totalFinalNota(borrador) - totalAbonadoNota(borrador);
    return {
      folio: datos.folio,
      client: cliente,
      currentDate: datos.fecha,
      observaciones: datos.observaciones,
      products: datos.products,
      abonos,
      flete: datos.flete,
      // watch saldoRestante en SaleNote: isPaid = saldoRestante <= 0
      isPaid: saldoRestante <= 0,
      creationDate: hoyMexico(ahora)
    };
  }

  function resumenNota(id, n) {
    return {
      id,
      folio: n.folio,
      folioFormateado: `F-${String(n.folio ?? '').padStart(4, '0')}`,
      currentDate: n.currentDate,
      creationDate: n.creationDate,
      observaciones: n.observaciones || '',
      products: n.products || [],
      flete: Number(n.flete) || 0,
      abonos: n.abonos || [],
      subtotal: redondear(totalFinalNota(n) + (Number(n.flete) || 0)),
      totalFinal: redondear(totalFinalNota(n)),
      totalAbonado: redondear(totalAbonadoNota(n)),
      saldoPendiente: redondear(saldoRestanteNota(n)),
      isPaid: !!n.isPaid
    };
  }

  async function handlePostNotas(req, res) {
    try {
      const body = req.body || {};
      const datos = validarCuerpo(body);
      const idemRef = datos.idempotencyKey ? db.collection('asistenteIdem').doc(datos.idempotencyKey) : null;
      const noteRef = db.collection('notes').doc();
      const asistenteId = generarAsistenteId();
      const ahora = new Date();

      const response = await db.runTransaction(async (transaction) => {
        if (idemRef && !datos.dryRun) {
          const idemSnap = await transaction.get(idemRef);
          if (idemSnap.exists) {
            if (idemSnap.data().operation === OPERACION) return { ...idemSnap.data().response, replay: true };
            fallo(409, 'IDEMPOTENCY_KEY_EN_USO', 'Ese idempotencyKey ya se usó en otra operación');
          }
        }
        const cliente = await resolverCliente(body.cliente, transaction);
        // Folio duplicado = mismo folio en el MISMO cliente. En la app el folio es un número al azar
        // (Math.random() * 10000) y no se valida, así que entre clientes sí puede repetirse.
        const mismoFolio = (await transaction.get(
          db.collection('notes').where('folio', 'in', [datos.folio, String(datos.folio)])
        )).docs.map((d) => ({ id: d.id, ...d.data() }));
        const duplicada = mismoFolio.find((n) => String(n.client || '').trim() === cliente.trim());
        const folioEnOtrosClientes = [...new Set(mismoFolio.map((n) => String(n.client || '').trim()))];
        const notas = (await transaction.get(db.collection('notes').where('client', '==', cliente)))
          .docs.map((d) => ({ id: d.id, ...d.data() }));
        if (duplicada) {
          fallo(409, 'FOLIO_DUPLICADO', `El cliente ${cliente} ya tiene la nota con folio ${datos.folio}`, {
            noteId: duplicada.id, currentDate: duplicada.currentDate
          });
        }
        const balanceRef = db.collection('clientBalances').doc(cliente);
        const balanceSnap = await transaction.get(balanceRef);
        const saldoAFavorAntes = balanceSnap.exists ? (Number(balanceSnap.data().balance) || 0) : 0;
        const aplicado = saldoAFavorAntes > 0 ? saldoAFavorAntes : 0;
        const nota = construirNota(datos, cliente, aplicado, ahora);
        const deudaAntes = notas.reduce((s, n) => s + saldoRestanteNota(n), 0);
        const totalFinal = totalFinalNota(nota);
        const saldoRestante = totalFinal - totalAbonadoNota(nota);

        const resp = {
          success: true,
          operation: OPERACION,
          dryRun: datos.dryRun,
          noteId: datos.dryRun ? null : noteRef.id,
          cliente,
          nota,
          totales: {
            subtotal: redondear(totalFinal + nota.flete),
            flete: nota.flete,
            totalFinal: redondear(totalFinal),
            totalAbonado: redondear(totalAbonadoNota(nota)),
            saldoRestante: redondear(saldoRestante)
          },
          saldoAFavor: {
            descripcion: 'clientBalances/{cliente}.balance = saldo a favor (no es deuda)',
            antes: saldoAFavorAntes,
            aplicadoComoAbono: aplicado,
            despues: aplicado > 0 ? 0 : saldoAFavorAntes,
            // SaleNote aplica TODO el saldo a favor aunque sea mayor que la nota; el excedente no regresa a clientBalances.
            excedenteNoDevuelto: aplicado > 0 && saldoRestante < 0 ? redondear(-saldoRestante) : 0
          },
          deudaPendienteNotas: {
            descripcion: 'Suma de saldoPendiente de las notas no pagadas del cliente',
            antes: redondear(deudaAntes),
            despues: redondear(deudaAntes + saldoRestanteNota(nota))
          },
          folioEnOtrosClientes
        };

        if (datos.dryRun) {
          return { ...resp, message: 'Simulación exitosa (sin escribir a Firestore)' };
        }

        const guardada = { ...nota, _asistenteId: asistenteId };
        transaction.set(noteRef, guardada);
        if (aplicado > 0) {
          // SaleNote.updateClientBalance(cliente, 0) → setDoc(..., { balance: 0 }, { merge: true })
          transaction.set(balanceRef, { balance: 0 }, { merge: true });
        }
        transaction.set(db.collection('asistenteLog').doc(), {
          operation: OPERACION,
          timestamp: FieldValue.serverTimestamp(),
          idempotencyKey: datos.idempotencyKey,
          noteId: noteRef.id,
          _asistenteId: asistenteId,
          cliente,
          folio: datos.folio,
          after: guardada,
          saldoAFavorAntes,
          saldoAFavorAplicado: aplicado,
          request: {
            cliente: body.cliente, folio: body.folio, fecha: body.fecha, lineas: body.lineas,
            flete: body.flete ?? null, observaciones: body.observaciones ?? null
          }
        });
        const final = { ...resp, nota: guardada };
        transaction.set(idemRef, { operation: OPERACION, timestamp: FieldValue.serverTimestamp(), response: final });
        return final;
      });
      return res.json(response);
    } catch (err) {
      return manejarError(res, err, 'POST /notas');
    }
  }

  async function handleGetNotas(req, res) {
    try {
      const cliente = await resolverCliente((req.query || {}).cliente);
      const [notas, balanceSnap] = await Promise.all([
        notasDelCliente(cliente),
        db.collection('clientBalances').doc(cliente).get()
      ]);
      // Mismo orden que NoteMenu: currentDate descendente.
      notas.sort((a, b) => tiempoNota(b.currentDate) - tiempoNota(a.currentDate));
      const lista = notas.map((n) => resumenNota(n.id, n));
      const soloPendientes = String((req.query || {}).pendientes || '') === 'true';
      const deuda = lista.reduce((s, n) => s + n.saldoPendiente, 0);
      return res.json({
        success: true,
        cliente,
        saldoAFavorGuardado: {
          descripcion: 'clientBalances/{cliente}.balance tal como está en Firestore (saldo a favor, no deuda)',
          existe: balanceSnap.exists,
          balance: balanceSnap.exists ? (Number(balanceSnap.data().balance) || 0) : 0
        },
        deudaPendienteNotas: {
          descripcion: 'Suma de saldoPendiente (totalFinal - abonos, 0 si isPaid) de las notas del cliente',
          total: redondear(deuda),
          notasPendientes: lista.filter((n) => n.saldoPendiente > 0).length
        },
        totalNotas: lista.length,
        notas: soloPendientes ? lista.filter((n) => n.saldoPendiente > 0) : lista
      });
    } catch (err) {
      return manejarError(res, err, 'GET /notas');
    }
  }

  async function handlePostNotasDeshacer(req, res) {
    try {
      const { idempotencyKey, undoIdempotencyKey, dryRun = false } = req.body || {};
      if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.includes('/')) {
        fallo(400, 'IDEMPOTENCY_KEY_REQUERIDA', 'Indica el idempotencyKey de la nota a deshacer');
      }
      const undoKey = undoIdempotencyKey || `undo:${idempotencyKey}`;
      if (typeof undoKey !== 'string' || undoKey.includes('/')) {
        fallo(400, 'UNDO_IDEMPOTENCY_KEY_INVALIDA', 'undoIdempotencyKey no puede contener "/"');
      }
      const undoRef = db.collection('asistenteIdem').doc(undoKey);
      const undoSnap = await undoRef.get();
      if (undoSnap.exists) {
        if (undoSnap.data().operation === OPERACION_UNDO) return res.json(undoSnap.data().response);
        fallo(409, 'IDEMPOTENCY_KEY_EN_USO', 'Ese undoIdempotencyKey ya se usó en otra operación');
      }
      const logs = await db.collection('asistenteLog').where('idempotencyKey', '==', idempotencyKey).get();
      const original = logs.docs.map((d) => ({ id: d.id, ...d.data() })).find((l) => l.operation === OPERACION);
      if (!original) fallo(404, 'OPERACION_NO_ENCONTRADA', 'No se encontró una nota creada por el asistente con ese idempotencyKey');
      if (logs.docs.some((d) => d.data().operation === OPERACION_UNDO)) fallo(400, 'YA_DESHECHO', 'Esta nota ya fue deshecha');

      const response = await db.runTransaction(async (transaction) => {
        const undoActual = await transaction.get(undoRef);
        if (undoActual.exists && undoActual.data().operation === OPERACION_UNDO) return undoActual.data().response;
        const noteRef = db.collection('notes').doc(original.noteId);
        const balanceRef = db.collection('clientBalances').doc(original.cliente);
        const [snap, balanceSnap] = [await transaction.get(noteRef), await transaction.get(balanceRef)];
        if (!snap.exists) fallo(404, 'NOTA_NO_ENCONTRADA', `La nota ${original.noteId} ya no existe`);
        const actual = snap.data();
        const campos = ['folio', 'client', 'currentDate', 'products', 'abonos', 'flete', 'isPaid', '_asistenteId'];
        const cambiados = campos.filter((c) => !mismoValor(actual[c], original.after[c]));
        if (cambiados.length) {
          fallo(409, 'NOTA_MODIFICADA', 'La nota se modificó después de crearla (abonos, productos o pago). No se puede deshacer.', { noteId: original.noteId, camposCambiados: cambiados });
        }
        const balanceActual = balanceSnap.exists ? (Number(balanceSnap.data().balance) || 0) : 0;
        const devolver = Number(original.saldoAFavorAplicado) || 0;
        const resp = {
          success: true,
          operation: OPERACION_UNDO,
          dryRun,
          noteId: original.noteId,
          cliente: original.cliente,
          folio: original.folio,
          notaEliminada: !dryRun,
          saldoAFavor: { antes: balanceActual, devuelto: devolver, despues: redondear(balanceActual + devolver) }
        };
        if (dryRun) return resp;
        transaction.delete(noteRef);
        if (devolver > 0) transaction.set(balanceRef, { balance: redondear(balanceActual + devolver) }, { merge: true });
        transaction.set(db.collection('asistenteLog').doc(), {
          operation: OPERACION_UNDO,
          timestamp: FieldValue.serverTimestamp(),
          idempotencyKey,
          undoIdempotencyKey: undoKey,
          originalIdempotencyKey: idempotencyKey,
          originalLogId: original.id,
          noteId: original.noteId,
          cliente: original.cliente,
          before: actual,
          saldoAFavorDevuelto: devolver
        });
        transaction.set(undoRef, { operation: OPERACION_UNDO, timestamp: FieldValue.serverTimestamp(), response: resp });
        return resp;
      });
      return res.json(response);
    } catch (err) {
      return manejarError(res, err, 'POST /notas/deshacer');
    }
  }

  return { handlePostNotas, handleGetNotas, handlePostNotasDeshacer };
}

module.exports = { crearHandlersNotas, totalFinalNota, saldoRestanteNota, hoyMexico };
