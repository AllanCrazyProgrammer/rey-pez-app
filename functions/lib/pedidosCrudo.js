/**
 * Pedido de camarón crudo como lo guarda PedidosCrudo.vue:
 * pedidos[Cliente][columna en minúsculas] = taras.
 * Lorena se alias a Veronica. Las celdas no enviadas se conservan.
 */

const CLIENTES = [
  { nombre: '8a', aliases: ['8a', '8-a', 'octava'] },
  { nombre: 'Catarro', aliases: ['catarro'] },
  { nombre: 'Otilio', aliases: ['otilio'] },
  { nombre: 'Ozuna', aliases: ['ozuna'] },
  { nombre: 'Veronica', aliases: ['veronica', 'verónica', 'lorena'] }
];

const COLUMNAS_BASE = [
  { nombre: 'Med', aliases: ['med', 'med c/c', 'mediano', 'mediano c/c'] },
  { nombre: 'Med-Esp', aliases: ['med-esp', 'med esp', 'med-esp c/c', 'med esp c/c'] },
  { nombre: 'Med-gde', aliases: ['med-gde', 'med gde', 'med-gde c/c', 'med gde c/c'] },
  { nombre: 'Gde', aliases: ['gde', 'gde c/c', 'grande', 'grande c/c'] },
  { nombre: 'Extra', aliases: ['extra', 'extra c/c'] },
  { nombre: 'Jumbo', aliases: ['jumbo', 'jumbo c/c'] },
  { nombre: 'Cam s/c', aliases: ['cam s/c', 'cams/c', 'cam sc'] }
];

function quitarAcentos(texto) {
  return String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function claveCliente(texto) {
  return quitarAcentos(texto).trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolverClienteCrudo(entrada) {
  const clave = claveCliente(entrada);
  return CLIENTES.find((cliente) => cliente.aliases.includes(clave)) || null;
}

function claveColumna(nombre) {
  return String(nombre || '').trim().toLowerCase();
}

function resolverColumna(entrada) {
  const clave = claveColumna(quitarAcentos(entrada)).replace(/\s+/g, ' ');
  const base = COLUMNAS_BASE.find((columna) => columna.aliases.includes(clave));
  if (base) return { nombre: base.nombre, clave: claveColumna(base.nombre), nueva: false };

  const sinSufijo = clave.replace(/\s+[cs]\s*\/\s*c$/, '').trim();
  const baseSinSufijo = COLUMNAS_BASE.find((columna) => columna.aliases.includes(sinSufijo));
  if (baseSinSufijo) {
    return { nombre: baseSinSufijo.nombre, clave: claveColumna(baseSinSufijo.nombre), nueva: false };
  }

  const nombre = String(entrada || '').trim();
  if (!nombre) return null;
  return { nombre, clave: claveColumna(nombre), nueva: true };
}

function leerCeldas(body) {
  if (Array.isArray(body?.celdas)) {
    return body.celdas.map((celda) => ({
      cliente: celda.cliente,
      medida: celda.medida || celda.columna,
      taras: celda.taras ?? celda.cantidad ?? celda.valor
    }));
  }
  if (body?.pedidos && typeof body.pedidos === 'object') {
    const celdas = [];
    Object.entries(body.pedidos).forEach(([cliente, columnas]) => {
      if (!columnas || typeof columnas !== 'object') return;
      Object.entries(columnas).forEach(([medida, taras]) => {
        celdas.push({ cliente, medida, taras });
      });
    });
    return celdas;
  }
  return null;
}

function totalesCrudo(pedidos) {
  let piezas = 0;
  Object.values(pedidos || {}).forEach((columnas) => {
    if (!columnas || typeof columnas !== 'object') return;
    Object.values(columnas).forEach((valor) => {
      if (valor && !isNaN(valor)) piezas += parseFloat(valor);
    });
  });
  return {
    kilos: Math.floor(piezas * 19),
    taras: Math.floor(piezas)
  };
}

function clonar(valor) {
  return JSON.parse(JSON.stringify(valor || {}));
}

/**
 * Fusiona celdas sobre un pedido existente (o uno vacío).
 * No rellena con ceros las celdas que la petición no menciona.
 */
function fusionarPedidoCrudo(existente, celdas) {
  const errores = [];
  const pedidos = clonar(existente?.pedidos);
  const columnas = Array.isArray(existente?.columnas) && existente.columnas.length
    ? existente.columnas.slice()
    : COLUMNAS_BASE.map((columna) => columna.nombre);
  const columnasAdicionales = Array.isArray(existente?.columnasAdicionales)
    ? existente.columnasAdicionales.slice()
    : [];
  const barcosPorPedido = clonar(existente?.barcosPorPedido);
  const cambiosPorCelda = new Map();
  const columnasAgregadas = [];

  CLIENTES.forEach((cliente) => {
    if (!pedidos[cliente.nombre] || typeof pedidos[cliente.nombre] !== 'object') pedidos[cliente.nombre] = {};
    if (!barcosPorPedido[cliente.nombre] || typeof barcosPorPedido[cliente.nombre] !== 'object') {
      barcosPorPedido[cliente.nombre] = {};
    }
  });

  celdas.forEach((celda, index) => {
    const cliente = resolverClienteCrudo(celda.cliente);
    if (!cliente) {
      errores.push({
        linea: index + 1,
        campo: 'cliente',
        mensaje: `Cliente "${celda.cliente}" no está en el pedido crudo`,
        disponibles: CLIENTES.map((item) => item.nombre).concat(['Lorena → Veronica'])
      });
      return;
    }
    const columna = resolverColumna(celda.medida);
    if (!columna) {
      errores.push({ linea: index + 1, campo: 'medida', mensaje: 'La medida es requerida' });
      return;
    }
    const taras = Number(celda.taras);
    if (!Number.isFinite(taras) || taras < 0) {
      errores.push({ linea: index + 1, campo: 'taras', mensaje: 'Las taras deben ser un número mayor o igual a 0' });
      return;
    }

    if (!pedidos[cliente.nombre]) pedidos[cliente.nombre] = {};
    if (!columnas.includes(columna.nombre)) {
      columnas.push(columna.nombre);
      if (columna.nueva && !columnasAdicionales.includes(columna.nombre)) {
        columnasAdicionales.push(columna.nombre);
        columnasAgregadas.push(columna.nombre);
      }
    }

    const llave = `${cliente.nombre}:${columna.clave}`;
    const antes = cambiosPorCelda.has(llave)
      ? cambiosPorCelda.get(llave).antes
      : (Object.prototype.hasOwnProperty.call(pedidos[cliente.nombre], columna.clave)
        ? pedidos[cliente.nombre][columna.clave]
        : null);
    cambiosPorCelda.set(llave, {
      cliente: cliente.nombre,
      columna: columna.clave,
      columnaNombre: columna.nombre,
      antes,
      despues: taras
    });
    pedidos[cliente.nombre][columna.clave] = taras;
  });

  const cambios = [...cambiosPorCelda.values()].filter((cambio) => cambio.antes !== cambio.despues);

  const totales = totalesCrudo(pedidos);
  return { errores, pedidos, columnas, columnasAdicionales, barcosPorPedido, cambios, columnasAgregadas, ...totales };
}

function revertirCambios(pedidos, cambios) {
  const copia = clonar(pedidos);
  const conflictos = [];
  cambios.forEach((cambio) => {
    if (!copia[cambio.cliente]) copia[cambio.cliente] = {};
    const actual = Object.prototype.hasOwnProperty.call(copia[cambio.cliente], cambio.columna)
      ? copia[cambio.cliente][cambio.columna]
      : null;
    if (actual !== cambio.despues) {
      conflictos.push({ ...cambio, actual });
      return;
    }
    if (cambio.antes === null || cambio.antes === undefined) delete copia[cambio.cliente][cambio.columna];
    else copia[cambio.cliente][cambio.columna] = cambio.antes;
  });
  return { pedidos: copia, conflictos };
}

function crearHandlersPedidosCrudo({ db, admin, errorResponse, generarAsistenteId }) {
  function fechaValida(fecha) {
    return typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  }

  function tiempoCreatedAt(valor) {
    if (!valor) return 0;
    if (typeof valor.toDate === 'function') return valor.toDate().getTime();
    const segundos = valor.seconds ?? valor._seconds;
    if (typeof segundos === 'number') return segundos * 1000;
    const tiempo = new Date(valor).getTime();
    return Number.isNaN(tiempo) ? 0 : tiempo;
  }

  async function buscarPedido(fecha) {
    const snap = await db.collection('pedidos').where('fecha', '==', fecha).where('tipo', '==', 'crudo').get();
    if (snap.empty) return { snap: null, cantidad: 0 };
    const elegido = [...snap.docs].sort((a, b) => tiempoCreatedAt(b.data().createdAt) - tiempoCreatedAt(a.data().createdAt))[0];
    return { snap: elegido, cantidad: snap.size };
  }

  function respuestaPedido(fecha, docSnap) {
    if (!docSnap) {
      return { success: true, fecha, exists: false, pedido: null };
    }
    const data = docSnap.data();
    const totales = totalesCrudo(data.pedidos);
    return {
      success: true,
      fecha,
      exists: true,
      pedido: {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null
      },
      totales
    };
  }

  async function handleGetPedidosCrudo(req, res) {
    const { fecha } = req.query;
    if (!fechaValida(fecha)) {
      return errorResponse(res, 400, 'FECHA_INVALIDA', 'La fecha es requerida y debe estar en formato YYYY-MM-DD');
    }
    try {
      const { snap, cantidad } = await buscarPedido(fecha);
      const body = respuestaPedido(fecha, snap);
      if (cantidad > 1) body.pedidosEnFecha = cantidad;
      return res.json(body);
    } catch (error) {
      console.error('Error en GET /pedidos/crudo:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al obtener el pedido crudo: ' + error.message);
    }
  }

  async function handlePostPedidosCrudo(req, res) {
    const body = req.body || {};
    const { fecha, idempotencyKey, dryRun = false } = body;
    if (!fechaValida(fecha)) {
      return errorResponse(res, 400, 'FECHA_INVALIDA', 'La fecha es requerida y debe estar en formato YYYY-MM-DD');
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.includes('/')) {
      return errorResponse(res, 400, 'IDEMPOTENCY_KEY_REQUERIDA', 'idempotencyKey es requerido y no puede contener "/"');
    }
    const celdas = leerCeldas(body);
    if (!celdas || celdas.length === 0) {
      return errorResponse(res, 400, 'CELDAS_REQUERIDAS', 'Indica celdas o un objeto pedidos con taras por cliente y medida');
    }

    try {
      const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
      const idemSnap = await idemRef.get();
      if (idemSnap.exists && (idemSnap.data().operation === 'pedidos_crudo_create' || idemSnap.data().operation === 'pedidos_crudo_update')) {
        return res.json(idemSnap.data().response);
      }

      const { snap: existente, cantidad } = await buscarPedido(fecha);
      const fusion = fusionarPedidoCrudo(existente ? existente.data() : null, celdas);
      if (fusion.errores.length) {
        return errorResponse(res, 400, 'VALIDACION_ERROR', 'Errores de validación en las celdas', { errores: fusion.errores });
      }

      const operation = existente ? 'pedidos_crudo_update' : 'pedidos_crudo_create';
      const asistenteId = existente?.data()?._asistenteId || generarAsistenteId();
      const document = {
        fecha,
        pedidos: fusion.pedidos,
        barcosPorPedido: fusion.barcosPorPedido,
        columnas: fusion.columnas,
        columnasAdicionales: fusion.columnasAdicionales,
        tipo: 'crudo',
        kilos: fusion.kilos,
        taras: fusion.taras
      };
      if (!existente) document._asistenteId = asistenteId;

      const response = {
        success: true,
        operation,
        pedidoId: existente ? existente.id : null,
        fecha,
        totales: { kilos: fusion.kilos, taras: fusion.taras },
        celdasActualizadas: fusion.cambios.length,
        cambios: fusion.cambios
      };
      if (cantidad > 1) response.pedidosEnFecha = cantidad;

      if (dryRun) {
        return res.json({
          dryRun: true,
          message: 'Simulación exitosa (sin escribir a Firestore)',
          document,
          ...response
        });
      }

      await db.runTransaction(async (transaction) => {
        const idemActual = await transaction.get(idemRef);
        if (idemActual.exists && (idemActual.data().operation === 'pedidos_crudo_create' || idemActual.data().operation === 'pedidos_crudo_update')) {
          throw { code: 'IDEMPOTENTE', response: idemActual.data().response };
        }

        let pedidoRef;
        let base;
        if (existente) {
          pedidoRef = db.collection('pedidos').doc(existente.id);
          const fresh = await transaction.get(pedidoRef);
          if (!fresh.exists) {
            throw { code: 'PEDIDO_ELIMINADO', message: 'El pedido fue eliminado durante la operación', status: 409 };
          }
          base = fresh.data();
          const otraVez = fusionarPedidoCrudo(base, celdas);
          if (otraVez.errores.length) {
            throw { code: 'VALIDACION_ERROR', message: 'Errores de validación en las celdas', status: 400, details: { errores: otraVez.errores } };
          }
          transaction.update(pedidoRef, {
            pedidos: otraVez.pedidos,
            barcosPorPedido: otraVez.barcosPorPedido,
            columnas: otraVez.columnas,
            columnasAdicionales: otraVez.columnasAdicionales,
            kilos: otraVez.kilos,
            taras: otraVez.taras
          });
          response.totales = { kilos: otraVez.kilos, taras: otraVez.taras };
          response.cambios = otraVez.cambios;
          response.celdasActualizadas = otraVez.cambios.length;
          fusion.cambios = otraVez.cambios;
          fusion.columnasAgregadas = otraVez.columnasAgregadas;
        } else {
          pedidoRef = db.collection('pedidos').doc();
          response.pedidoId = pedidoRef.id;
          transaction.set(pedidoRef, {
            ...document,
            _asistenteId: asistenteId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        transaction.set(db.collection('asistenteLog').doc(), {
          operation,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          idempotencyKey,
          pedidoId: pedidoRef.id,
          fecha,
          _asistenteId: existente ? null : asistenteId,
          cambios: fusion.cambios,
          columnasAgregadas: fusion.columnasAgregadas,
          request: { fecha, celdas }
        });
        transaction.set(idemRef, {
          operation,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          response
        });
      });

      const guardada = await idemRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) return errorResponse(res, error.status || 500, error.code, error.message, error.details);
      console.error('Error en POST /pedidos/crudo:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al guardar el pedido crudo: ' + error.message);
    }
  }

  async function handlePostPedidosCrudoDeshacer(req, res) {
    const { idempotencyKey, undoIdempotencyKey, dryRun = false } = req.body || {};
    if (!idempotencyKey) {
      return errorResponse(res, 400, 'IDEMPOTENCY_KEY_REQUERIDA', 'Indica el idempotencyKey del pedido crudo a deshacer');
    }
    const undoKey = undoIdempotencyKey || `undo:${idempotencyKey}`;
    if (String(undoKey).includes('/')) {
      return errorResponse(res, 400, 'UNDO_IDEMPOTENCY_KEY_INVALIDA', 'undoIdempotencyKey no puede contener "/"');
    }

    try {
      const undoRef = db.collection('asistenteIdem').doc(undoKey);
      const undoSnap = await undoRef.get();
      if (undoSnap.exists && undoSnap.data().operation === 'pedidos_crudo_undo') {
        return res.json(undoSnap.data().response);
      }

      const logs = await db.collection('asistenteLog').where('idempotencyKey', '==', idempotencyKey).get();
      const original = logs.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        .find((log) => log.operation === 'pedidos_crudo_create' || log.operation === 'pedidos_crudo_update');
      if (!original) {
        return errorResponse(res, 404, 'PEDIDO_NO_ENCONTRADO', 'No se encontró un pedido crudo del asistente con ese idempotencyKey');
      }
      if (logs.docs.some((doc) => doc.data().operation === 'pedidos_crudo_undo')) {
        return errorResponse(res, 400, 'YA_DESHECHO', 'Este pedido crudo ya fue deshecho');
      }

      const pedidoRef = db.collection('pedidos').doc(original.pedidoId);
      const pedidoSnap = await pedidoRef.get();
      if (!pedidoSnap.exists) {
        return errorResponse(res, 404, 'PEDIDO_NO_ENCONTRADO', 'El pedido ya no existe');
      }

      if (dryRun) {
        return res.json({
          dryRun: true,
          operation: 'pedidos_crudo_undo',
          pedidoId: original.pedidoId,
          accion: original.operation === 'pedidos_crudo_create' ? 'delete_or_revert_cells' : 'revert_cells',
          cambios: original.cambios || []
        });
      }

      const response = {
        success: true,
        operation: 'pedidos_crudo_undo',
        pedidoId: original.pedidoId,
        fecha: original.fecha
      };

      await db.runTransaction(async (transaction) => {
        const fresh = await transaction.get(pedidoRef);
        if (!fresh.exists) {
          throw { code: 'PEDIDO_ELIMINADO', message: 'El pedido fue eliminado durante la operación', status: 409 };
        }
        const data = fresh.data();
        const { pedidos, conflictos } = revertirCambios(data.pedidos, original.cambios || []);
        if (conflictos.length) {
          throw {
            code: 'FILA_MODIFICADA',
            message: 'Alguna celda cambió después de registrarse. No se puede deshacer.',
            status: 409,
            details: { conflictos }
          };
        }

        const quedoVacio = original.operation === 'pedidos_crudo_create'
          && data._asistenteId
          && data._asistenteId === original._asistenteId
          && !hayCeldasAjenas(pedidos, original.cambios || []);

        if (quedoVacio) {
          transaction.delete(pedidoRef);
          response.action = 'deleted_document';
        } else {
          let columnas = Array.isArray(data.columnas) ? data.columnas.slice() : [];
          let columnasAdicionales = Array.isArray(data.columnasAdicionales) ? data.columnasAdicionales.slice() : [];
          (original.columnasAgregadas || []).forEach((nombre) => {
            const clave = claveColumna(nombre);
            const sigueUsada = Object.values(pedidos).some((columnasCliente) =>
              columnasCliente && Object.prototype.hasOwnProperty.call(columnasCliente, clave)
            );
            if (!sigueUsada) {
              columnas = columnas.filter((columna) => columna !== nombre);
              columnasAdicionales = columnasAdicionales.filter((columna) => columna !== nombre);
            }
          });
          const totales = totalesCrudo(pedidos);
          const update = {
            pedidos,
            columnas,
            columnasAdicionales,
            kilos: totales.kilos,
            taras: totales.taras
          };
          if (data._asistenteId && data._asistenteId === original._asistenteId && original.operation === 'pedidos_crudo_create') {
            update._asistenteId = admin.firestore.FieldValue.delete();
          }
          transaction.update(pedidoRef, update);
          response.action = 'reverted_cells';
          response.totales = totales;
        }

        transaction.set(db.collection('asistenteLog').doc(), {
          operation: 'pedidos_crudo_undo',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          idempotencyKey,
          undoIdempotencyKey: undoKey,
          originalIdempotencyKey: idempotencyKey,
          pedidoId: original.pedidoId,
          action: response.action
        });
        transaction.set(undoRef, {
          operation: 'pedidos_crudo_undo',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          response
        });
      });

      const guardada = await undoRef.get();
      return res.json(guardada.data().response);
    } catch (error) {
      if (error.code === 'IDEMPOTENTE') return res.json(error.response);
      if (error.code) return errorResponse(res, error.status || 500, error.code, error.message, error.details);
      console.error('Error en POST /pedidos/crudo/deshacer:', error);
      return errorResponse(res, 500, 'ERROR_INTERNO', 'Error al deshacer el pedido crudo: ' + error.message);
    }
  }

  return { handleGetPedidosCrudo, handlePostPedidosCrudo, handlePostPedidosCrudoDeshacer };
}

function hayCeldasAjenas(pedidos, cambios) {
  const propias = new Set((cambios || []).map((cambio) => `${cambio.cliente}:${cambio.columna}`));
  return Object.entries(pedidos || {}).some(([cliente, columnas]) =>
    Object.entries(columnas || {}).some(([columna, valor]) => {
      if (valor === null || valor === undefined || valor === '' || valor === 0) return false;
      return !propias.has(`${cliente}:${columna}`);
    })
  );
}

module.exports = {
  CLIENTES,
  COLUMNAS_BASE,
  resolverClienteCrudo,
  resolverColumna,
  leerCeldas,
  totalesCrudo,
  fusionarPedidoCrudo,
  revertirCambios,
  crearHandlersPedidosCrudo
};
