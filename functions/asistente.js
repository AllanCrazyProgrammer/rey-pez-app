const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');
const {
  normalizeCuarto,
  fechaRegistroAdmin,
  medianocheMexico,
  calcularDisponibles,
  obtenerOpcionesDisponibles
} = require('./lib/inventario');

// La API key vive como secreto de Firebase (nunca en el código):
//   firebase functions:secrets:set ASISTENTE_API_KEY
const asistenteApiKey = defineSecret('ASISTENTE_API_KEY');

// Inicializar Admin SDK solo si aún no está inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Compara dos strings en tiempo constante para evitar timing attacks.
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifica que la petición esté autenticada con el Bearer token correcto.
 */
function verificarAuth(req, secret) {
  const auth = req.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return { error: 'Falta el header Authorization: Bearer <token>', status: 401 };
  }
  const token = auth.substring(7);
  if (!timingSafeEqual(token, secret)) {
    return { error: 'Token de autorización inválido', status: 401 };
  }
  return null;
}

/**
 * Función auxiliar para crear respuestas de error consistentes.
 */
function errorResponse(res, status, code, message, details = null) {
  const body = { error: { code, message } };
  if (details) body.error.details = details;
  return res.status(status).json(body);
}

/**
 * Obtiene o crea el documento del día en sacadas, verificando duplicados.
 */
async function obtenerOCrearDia(transaction, fecha, sacadaIdExistente = null) {
  const indice = db.collection('sacadasDias').doc(fecha);
  const indiceSnap = await transaction.get(indice);
  
  if (indiceSnap.exists) {
    const sacadaId = indiceSnap.data().sacadaId;
    if (sacadaIdExistente && sacadaId !== sacadaIdExistente) {
      throw new Error('DIA_DUPLICADO');
    }
    const sacadaRef = db.collection('sacadas').doc(sacadaId);
    const sacadaSnap = await transaction.get(sacadaRef);
    
    if (!sacadaSnap.exists) {
      throw new Error('DIA_ELIMINADO');
    }
    
    const fechaSacada = fechaRegistroAdmin(sacadaSnap.data().fecha);
    if (fechaSacada !== fecha) {
      throw new Error('DIA_DUPLICADO');
    }
    
    return { sacadaRef, sacadaSnap, indice };
  }
  
  // Verificar duplicados en documentos antiguos sin índice
  const todasSacadas = await transaction.get(db.collection('sacadas'));
  const duplicados = todasSacadas.docs.filter(doc => 
    doc.id !== sacadaIdExistente && fechaRegistroAdmin(doc.data().fecha) === fecha
  );
  
  if (duplicados.length > 0) {
    throw new Error('DIA_DUPLICADO');
  }
  
  // Crear nuevo documento
  const sacadaRef = db.collection('sacadas').doc();
  const nuevoDia = {
    fecha: admin.firestore.Timestamp.fromDate(medianocheMexico(fecha)),
    entradas: [],
    salidas: [],
    totalEntradas: 0,
    totalSalidas: 0,
    version: 1,
    actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
  };
  
  transaction.set(sacadaRef, nuevoDia);
  transaction.set(indice, { fecha, sacadaId: sacadaRef.id });
  
  return { 
    sacadaRef, 
    sacadaSnap: { exists: false, data: () => nuevoDia }, 
    indice 
  };
}

/**
 * POST /salida
 * Registra una salida de limpios con validación FIFO y actualización transaccional.
 */
async function handlePostSalida(req, res) {
  const {
    fecha,
    proveedor,
    medida,
    precio,
    kilos: kilosParam,
    cajas: cajasParam,
    cuarto,
    dryRun = false,
    idempotencyKey
  } = req.body;
  
  // Validación de parámetros
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "fecha" es requerido y debe estar en formato YYYY-MM-DD');
  }
  if (!proveedor || typeof proveedor !== 'string') {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "proveedor" es requerido');
  }
  if (!medida || typeof medida !== 'string') {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "medida" es requerido (medida base, e.g. "51/60")');
  }
  
  // Validar que se proporcione kilos o cajas
  const kilos = kilosParam !== undefined ? Number(kilosParam)
    : cajasParam !== undefined ? Number(cajasParam) * 20
    : null;
  
  if (kilos === null || isNaN(kilos) || kilos <= 0) {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'Debes especificar "kilos" o "cajas" (mayor a 0)');
  }
  
  const precioNorm = precio !== undefined && precio !== null ? Number(precio) : null;
  if (precioNorm !== null && (isNaN(precioNorm) || precioNorm < 0)) {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "precio" debe ser un número no negativo');
  }
  
  const cuartoNorm = normalizeCuarto(cuarto);
  const cajas = Number((kilos / 20).toFixed(2));
  
  // Verificar idempotencia
  if (idempotencyKey) {
    const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
    const idemSnap = await idemRef.get();
    if (idemSnap.exists) {
      const resultado = idemSnap.data();
      return res.status(200).json({
        success: true,
        idempotent: true,
        message: 'Operación ya procesada anteriormente',
        data: resultado.data
      });
    }
  }
  
  try {
    const resultado = await db.runTransaction(async (transaction) => {
      // Obtener todas las sacadas ordenadas
      const sacadasSnap = await transaction.get(
        db.collection('sacadas').orderBy('fecha', 'asc')
      );
      const sacadas = sacadasSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Obtener o crear el documento del día
      const { sacadaRef, sacadaSnap } = await obtenerOCrearDia(transaction, fecha);
      const diaData = sacadaSnap.exists ? sacadaSnap.data() : {
        entradas: [],
        salidas: [],
        totalEntradas: 0,
        totalSalidas: 0,
        version: 1
      };
      
      // Calcular disponibles para la combinación solicitada
      const { disponibles, lotes } = calcularDisponibles({
        proveedor,
        medidaBase: medida,
        precio: precioNorm,
        cuarto: cuartoNorm,
        sacadas,
        fechaLimite: fecha,
        entradasLocales: diaData.entradas || [],
        salidasLocales: diaData.salidas || [],
        sacadaIdActual: sacadaRef.id,
        todosLosCuartos: false
      });
      
      // Verificar si hay suficiente stock
      if (kilos > disponibles) {
        // Buscar opciones disponibles para dar feedback útil
        const opciones = obtenerOpcionesDisponibles({
          proveedor,
          medidaBase: medida,
          sacadas,
          fechaLimite: fecha,
          entradasLocales: diaData.entradas || [],
          sacadaIdActual: sacadaRef.id
        });
        
        if (opciones.length === 0) {
          throw {
            code: 'SIN_EXISTENCIAS',
            message: `No hay existencias de ${proveedor} - ${medida}`,
            status: 400
          };
        }
        
        // Si hay opciones pero no la solicitada
        const opcionSolicitada = opciones.find(o => 
          (o.precio === precioNorm || (o.precio === null && precioNorm === null)) &&
          o.cuarto === cuartoNorm
        );
        
        if (!opcionSolicitada) {
          throw {
            code: 'PRECIO_CUARTO_NO_DISPONIBLE',
            message: `No hay existencias de ${proveedor} - ${medida} con precio ${precioNorm !== null ? '$' + precioNorm : 'sin precio'} y cuarto ${cuartoNorm}`,
            status: 400,
            details: {
              opcionesDisponibles: opciones.map(o => ({
                precio: o.precio,
                cuarto: o.cuarto,
                kilosDisponibles: o.kilos
              }))
            }
          };
        }
        
        throw {
          code: 'KILOS_INSUFICIENTES',
          message: `Kilos insuficientes. Solicitados: ${kilos} kg, disponibles: ${disponibles} kg`,
          status: 400,
          details: {
            solicitados: kilos,
            disponibles,
            faltante: kilos - disponibles
          }
        };
      }
      
      // Si hay múltiples opciones con diferentes precios/cuartos, advertir
      if (precioNorm === null || cuartoNorm === 's/c') {
        const opciones = obtenerOpcionesDisponibles({
          proveedor,
          medidaBase: medida,
          sacadas,
          fechaLimite: fecha,
          entradasLocales: diaData.entradas || [],
          sacadaIdActual: sacadaRef.id
        });
        
        if (opciones.length > 1) {
          const totalDisponible = opciones.reduce((sum, o) => sum + o.kilos, 0);
          if (totalDisponible >= kilos) {
            throw {
              code: 'PRECIO_CUARTO_AMBIGUO',
              message: `Hay múltiples precios/cuartos disponibles para ${proveedor} - ${medida}. Especifica "precio" y/o "cuarto" para desambiguar`,
              status: 400,
              details: {
                opcionesDisponibles: opciones.map(o => ({
                  precio: o.precio,
                  cuarto: o.cuarto,
                  kilosDisponibles: o.kilos
                }))
              }
            };
          }
        }
      }
      
      // Construir la nueva salida (igual que la UI)
      const nuevaSalida = {
        tipo: 'proveedor',
        proveedor,
        medida,
        precio: precioNorm,
        kilos,
        cajas,
        cuartoFrio: cuartoNorm
      };
      
      const salidasActualizadas = [...(diaData.salidas || []), nuevaSalida];
      const totalSalidasActualizado = salidasActualizadas.reduce(
        (sum, s) => sum + (Number(s.kilos) || 0), 0
      );
      
      const actualizacion = {
        salidas: salidasActualizadas,
        totalSalidas: totalSalidasActualizado,
        version: admin.firestore.FieldValue.increment(1),
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const dataParaRespuesta = {
        fecha,
        salida: nuevaSalida,
        totalSalidas: totalSalidasActualizado,
        kilosDisponiblesAntes: disponibles,
        kilosDisponiblesDespues: disponibles - kilos
      };
      
      if (dryRun) {
        return {
          dryRun: true,
          message: 'Simulación exitosa (sin escribir a Firestore)',
          ...dataParaRespuesta
        };
      }
      
      // Escribir la actualización      
      if (sacadaSnap.exists) {
        transaction.update(sacadaRef, actualizacion);
      } else {
        transaction.set(sacadaRef, {
          fecha: admin.firestore.Timestamp.fromDate(medianocheMexico(fecha)),
          entradas: diaData.entradas || [],
          totalEntradas: diaData.totalEntradas || 0,
          ...actualizacion,
          version: 1
        });
      }
      
      // Escribir log de auditoría
      const logRef = db.collection('asistenteLog').doc();
      transaction.set(logRef, {
        tipo: 'salida',
        fecha,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        request: {
          proveedor,
          medida,
          precio: precioNorm,
          kilos,
          cajas,
          cuarto: cuartoNorm
        },
        before: {
          totalSalidas: diaData.totalSalidas || 0,
          numSalidas: (diaData.salidas || []).length
        },
        after: {
          totalSalidas: totalSalidasActualizado,
          numSalidas: salidasActualizadas.length
        },
        sacadaId: sacadaRef.id
      });
      
      // Guardar idempotencia
      if (idempotencyKey) {
        const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
        transaction.set(idemRef, {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          data: dataParaRespuesta,
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
          )
        });
      }
      
      return dataParaRespuesta;
    });
    
    return res.status(200).json({
      success: true,
      ...resultado
    });
    
  } catch (error) {
    if (error.code === 'DIA_DUPLICADO') {
      return errorResponse(res, 409, 'DIA_DUPLICADO', 
        'Ya existe un registro de limpios para esta fecha');
    }
    if (error.code === 'DIA_ELIMINADO') {
      return errorResponse(res, 410, 'DIA_ELIMINADO', 
        'El día fue eliminado desde otro equipo');
    }
    if (error.code) {
      return errorResponse(res, error.status || 500, error.code, error.message, error.details);
    }
    
    console.error('Error en POST /salida:', error);
    return errorResponse(res, 500, 'ERROR_INTERNO', 
      'Error inesperado al procesar la salida: ' + error.message);
  }
}

/**
 * GET /existencias
 * Devuelve las existencias actuales agrupadas por proveedor+medida+precio+cuarto.
 */
async function handleGetExistencias(req, res) {
  const { proveedor: proveedorFiltro, medida: medidaFiltro } = req.query;
  
  try {
    // Obtener todas las sacadas
    const sacadasSnap = await db.collection('sacadas')
      .orderBy('fecha', 'asc')
      .get();
    
    const sacadas = sacadasSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Obtener la fecha actual en la zona de inventario
    const hoy = new Date().toLocaleDateString('en-CA', { 
      timeZone: 'America/Mexico_City' 
    });
    
    // Recolectar todas las combinaciones únicas de proveedor+medida+precio+cuarto
    const combinaciones = new Map();
    
    for (const sacada of sacadas) {
      const entradas = sacada.entradas || [];
      for (const entrada of entradas) {
        const key = `${entrada.proveedor}|${entrada.medida}|${entrada.precio ?? 'null'}|${normalizeCuarto(entrada.cuartoFrio)}`;
        if (!combinaciones.has(key)) {
          combinaciones.set(key, {
            proveedor: entrada.proveedor,
            medida: entrada.medida,
            precio: entrada.precio ?? null,
            cuarto: normalizeCuarto(entrada.cuartoFrio)
          });
        }
      }
    }
    
    // Calcular disponibles para cada combinación
    const existencias = [];
    
    for (const [key, { proveedor, medida, precio, cuarto }] of combinaciones) {
      // Aplicar filtros si se especificaron
      if (proveedorFiltro && proveedor !== proveedorFiltro) continue;
      if (medidaFiltro && medida !== medidaFiltro) continue;
      
      const { disponibles } = calcularDisponibles({
        proveedor,
        medidaBase: medida,
        precio,
        cuarto,
        sacadas,
        fechaLimite: hoy,
        entradasLocales: [],
        salidasLocales: [],
        sacadaIdActual: null,
        todosLosCuartos: false
      });
      
      if (disponibles > 0) {
        existencias.push({
          proveedor,
          medida,
          precio,
          cuarto,
          kilos: disponibles,
          cajas: Number((disponibles / 20).toFixed(2))
        });
      }
    }
    
    // Ordenar por proveedor, medida, precio, cuarto
    existencias.sort((a, b) => {
      if (a.proveedor !== b.proveedor) return a.proveedor.localeCompare(b.proveedor);
      if (a.medida !== b.medida) return a.medida.localeCompare(b.medida);
      const precioA = a.precio ?? -1;
      const precioB = b.precio ?? -1;
      if (precioA !== precioB) return precioA - precioB;
      return a.cuarto.localeCompare(b.cuarto);
    });
    
    return res.status(200).json({
      success: true,
      fecha: hoy,
      existencias,
      total: existencias.length
    });
    
  } catch (error) {
    console.error('Error en GET /existencias:', error);
    return errorResponse(res, 500, 'ERROR_INTERNO', 
      'Error inesperado al obtener existencias: ' + error.message);
  }
}

/**
 * GET /dia
 * Devuelve las entradas y salidas de un día específico.
 */
async function handleGetDia(req, res) {
  const { fecha } = req.query;
  
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El parámetro "fecha" es requerido y debe estar en formato YYYY-MM-DD');
  }
  
  try {
    // Buscar el día en el índice
    const indiceSnap = await db.collection('sacadasDias').doc(fecha).get();
    
    if (!indiceSnap.exists) {
      // Buscar en documentos antiguos sin índice
      const sacadasSnap = await db.collection('sacadas').get();
      const dia = sacadasSnap.docs.find(doc => 
        fechaRegistroAdmin(doc.data().fecha) === fecha
      );
      
      if (!dia) {
        return res.status(200).json({
          success: true,
          fecha,
          encontrado: false,
          message: 'No hay registro para esta fecha'
        });
      }
      
      const data = dia.data();
      return res.status(200).json({
        success: true,
        fecha,
        encontrado: true,
        sacadaId: dia.id,
        entradas: data.entradas || [],
        salidas: data.salidas || [],
        totalEntradas: data.totalEntradas || 0,
        totalSalidas: data.totalSalidas || 0
      });
    }
    
    const sacadaId = indiceSnap.data().sacadaId;
    const sacadaSnap = await db.collection('sacadas').doc(sacadaId).get();
    
    if (!sacadaSnap.exists) {
      return errorResponse(res, 404, 'DIA_NO_ENCONTRADO', 
        'El índice apunta a un documento que no existe');
    }
    
    const data = sacadaSnap.data();
    
    return res.status(200).json({
      success: true,
      fecha,
      encontrado: true,
      sacadaId,
      entradas: data.entradas || [],
      salidas: data.salidas || [],
      totalEntradas: data.totalEntradas || 0,
      totalSalidas: data.totalSalidas || 0,
      version: data.version || 1,
      actualizadoEn: data.actualizadoEn
    });
    
  } catch (error) {
    console.error('Error en GET /dia:', error);
    return errorResponse(res, 500, 'ERROR_INTERNO', 
      'Error inesperado al obtener el día: ' + error.message);
  }
}

/**
 * Obtiene o crea el documento del día en existenciasCrudos, verificando duplicados.
 */
async function obtenerOCrearDiaCrudos(transaction, fecha, crudoIdExistente = null) {
  // No hay índice separado para crudos, buscar directamente en la colección
  const todosLosCrudos = await transaction.get(db.collection('existenciasCrudos'));
  
  // Buscar día existente
  const existente = todosLosCrudos.docs.find(doc => {
    if (doc.id === crudoIdExistente) return false;
    return fechaRegistroAdmin(doc.data().fecha) === fecha;
  });
  
  if (existente) {
    if (crudoIdExistente && existente.id !== crudoIdExistente) {
      throw new Error('DIA_DUPLICADO');
    }
    return { crudoRef: db.collection('existenciasCrudos').doc(existente.id), crudoSnap: existente };
  }
  
  // Si estamos editando y el doc no existe, falló
  if (crudoIdExistente) {
    const docRef = db.collection('existenciasCrudos').doc(crudoIdExistente);
    const docSnap = await transaction.get(docRef);
    if (!docSnap.exists) {
      throw new Error('DIA_ELIMINADO');
    }
    const fechaDoc = fechaRegistroAdmin(docSnap.data().fecha);
    if (fechaDoc !== fecha) {
      throw new Error('DIA_DUPLICADO');
    }
    return { crudoRef: docRef, crudoSnap: docSnap };
  }
  
  // Crear nuevo documento
  const crudoRef = db.collection('existenciasCrudos').doc();
  const nuevoDia = {
    fecha: admin.firestore.Timestamp.fromDate(medianocheMexico(fecha)),
    entradas: [],
    salidas: [],
    totalEntradas: 0,
    totalSalidas: 0,
    version: 1,
    actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
  };
  
  transaction.set(crudoRef, nuevoDia);
  
  return { 
    crudoRef, 
    crudoSnap: { exists: false, data: () => nuevoDia } 
  };
}

/**
 * POST /crudos/entrada
 * Registra una entrada de crudos con validación y actualización transaccional.
 */
async function handlePostCrudosEntrada(req, res) {
  const {
    fecha,
    proveedor,
    producto,
    kilos: kilosParam,
    precio,
    piezas,
    cuarto,
    dryRun = false,
    idempotencyKey
  } = req.body;
  
  // Validación de parámetros
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "fecha" es requerido y debe estar en formato YYYY-MM-DD');
  }
  if (!proveedor || typeof proveedor !== 'string') {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "proveedor" es requerido');
  }
  if (!producto || typeof producto !== 'string') {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "producto" es requerido');
  }
  
  const kilos = kilosParam !== undefined ? Number(kilosParam) : null;
  
  if (kilos === null || isNaN(kilos) || kilos <= 0) {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "kilos" es requerido y debe ser mayor a 0');
  }
  
  const precioNorm = precio !== undefined && precio !== null ? Number(precio) : null;
  if (precioNorm !== null && (isNaN(precioNorm) || precioNorm < 0)) {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "precio" debe ser un número no negativo');
  }
  
  const cuartoNorm = normalizeCuarto(cuarto);
  const piezasNorm = piezas !== undefined && piezas !== null ? String(piezas).trim() : '';
  
  // Verificar idempotencia
  if (idempotencyKey) {
    const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
    const idemSnap = await idemRef.get();
    if (idemSnap.exists) {
      const resultado = idemSnap.data();
      return res.status(200).json({
        success: true,
        idempotent: true,
        message: 'Operación ya procesada anteriormente',
        data: resultado.data
      });
    }
  }
  
  try {
    const resultado = await db.runTransaction(async (transaction) => {
      // Obtener o crear el documento del día
      const { crudoRef, crudoSnap } = await obtenerOCrearDiaCrudos(transaction, fecha);
      const diaData = crudoSnap.exists ? crudoSnap.data() : {
        entradas: [],
        salidas: [],
        totalEntradas: 0,
        totalSalidas: 0,
        version: 1
      };
      
      // Construir la nueva entrada (igual que la UI)
      const nuevaEntrada = {
        proveedor,
        producto,
        kilos,
        precio: precioNorm,
        piezas: piezasNorm,
        cuartoFrio: cuartoNorm
      };
      
      const entradasActualizadas = [...(diaData.entradas || []), nuevaEntrada];
      const totalEntradasActualizado = entradasActualizadas.reduce(
        (sum, e) => sum + (Number(e.kilos) || 0), 0
      );
      
      const actualizacion = {
        entradas: entradasActualizadas,
        totalEntradas: totalEntradasActualizado,
        version: admin.firestore.FieldValue.increment(1),
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const dataParaRespuesta = {
        fecha,
        entrada: nuevaEntrada,
        totalEntradas: totalEntradasActualizado
      };
      
      if (dryRun) {
        return {
          dryRun: true,
          message: 'Simulación exitosa (sin escribir a Firestore)',
          ...dataParaRespuesta
        };
      }
      
      // Escribir la actualización      
      if (crudoSnap.exists) {
        transaction.update(crudoRef, actualizacion);
      } else {
        transaction.set(crudoRef, {
          fecha: admin.firestore.Timestamp.fromDate(medianocheMexico(fecha)),
          salidas: diaData.salidas || [],
          totalSalidas: diaData.totalSalidas || 0,
          ...actualizacion,
          version: 1
        });
      }
      
      // Escribir log de auditoría
      const logRef = db.collection('asistenteLog').doc();
      transaction.set(logRef, {
        tipo: 'entrada-crudo',
        fecha,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        request: {
          proveedor,
          producto,
          kilos,
          precio: precioNorm,
          piezas: piezasNorm,
          cuarto: cuartoNorm
        },
        before: {
          totalEntradas: diaData.totalEntradas || 0,
          numEntradas: (diaData.entradas || []).length
        },
        after: {
          totalEntradas: totalEntradasActualizado,
          numEntradas: entradasActualizadas.length
        },
        crudoId: crudoRef.id
      });
      
      // Guardar idempotencia
      if (idempotencyKey) {
        const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
        transaction.set(idemRef, {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          data: dataParaRespuesta,
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          )
        });
      }
      
      return dataParaRespuesta;
    });
    
    return res.status(200).json({
      success: true,
      ...resultado
    });
    
  } catch (error) {
    if (error.code === 'DIA_DUPLICADO') {
      return errorResponse(res, 409, 'DIA_DUPLICADO', 
        'Ya existe un registro de crudos para esta fecha');
    }
    if (error.code === 'DIA_ELIMINADO') {
      return errorResponse(res, 410, 'DIA_ELIMINADO', 
        'El día fue eliminado desde otro equipo');
    }
    if (error.code) {
      return errorResponse(res, error.status || 500, error.code, error.message, error.details);
    }
    
    console.error('Error en POST /crudos/entrada:', error);
    return errorResponse(res, 500, 'ERROR_INTERNO', 
      'Error inesperado al procesar la entrada: ' + error.message);
  }
}

/**
 * Calcula disponibles de crudos siguiendo la lógica de la UI.
 * Las salidas descuentan de TODOS los precios para el mismo proveedor+producto+cuarto, en orden FIFO.
 */
function calcularDisponiblesCrudos({
  proveedor,
  producto,
  precio,
  cuarto,
  registros,
  fechaLimite,
  entradasLocales = [],
  salidasLocales = [],
  registroIdActual = null,
  todosLosCuartos = false
}) {
  const precioNormalizado = precio !== null && precio !== undefined ? precio : null;
  const cuartoNormalizado = normalizeCuarto(cuarto);
  
  // Construir el inventario completo primero (todas las combinaciones de proveedor+producto+precio+cuarto)
  const existencias = {};
  
  const fechaLimiteDate = finDiaMexico(fechaLimite);
  
  for (const registro of registros) {
    if (registroIdActual && registro.id === registroIdActual) continue;
    
    const registroFecha = registro.fecha;
    const registroDate = registroFecha instanceof Date ? registroFecha
      : typeof registroFecha.toDate === 'function' ? registroFecha.toDate()
      : new Date(registroFecha);
    
    if (registroDate > fechaLimiteDate) continue;
    
    // Procesar entradas
    const entradas = registro.entradas || [];
    for (const entrada of entradas) {
      if (entrada.proveedor !== proveedor || entrada.producto !== producto) continue;
      
      const precioEntrada = entrada.precio !== null && entrada.precio !== undefined ? entrada.precio : null;
      const cuartoEntrada = normalizeCuarto(entrada.cuartoFrio);
      const key = `${precioEntrada}__${cuartoEntrada}`;
      
      if (!existencias[key]) {
        existencias[key] = {
          precio: precioEntrada,
          cuarto: cuartoEntrada,
          lotes: []
        };
      }
      
      existencias[key].lotes.push({
        kilos: Number(entrada.kilos) || 0,
        fecha: registroDate
      });
    }
    
    // Procesar salidas (descuentan de todas las combinaciones de precio para el mismo cuarto)
    const salidas = registro.salidas || [];
    for (const salida of salidas) {
      if (salida.proveedor !== proveedor || salida.producto !== producto) continue;
      
      const usarTodosLosCuartos = normalizeCuarto(salida.cuartoFrio) === 'Todos los cuartos';
      const cuartoSalida = normalizeCuarto(salida.cuartoFrio);
      
      // Filtrar las claves que coinciden con el cuarto de la salida
      const keysCoincidentes = Object.keys(existencias).filter(key => {
        const cuartoClave = existencias[key].cuarto;
        return usarTodosLosCuartos || cuartoClave === cuartoSalida;
      });
      
      // Ordenar por precio (FIFO por precio más bajo primero)
      keysCoincidentes.sort((a, b) => {
        const precioA = existencias[a].precio ?? -1;
        const precioB = existencias[b].precio ?? -1;
        return precioA - precioB;
      });
      
      let kilosPendientes = Number(salida.kilos) || 0;
      
      for (const key of keysCoincidentes) {
        if (kilosPendientes <= 0) break;
        
        const lotes = existencias[key].lotes;
        lotes.sort((a, b) => a.fecha - b.fecha);
        
        for (let i = 0; i < lotes.length && kilosPendientes > 0; i++) {
          const lote = lotes[i];
          if (lote.kilos >= kilosPendientes) {
            lote.kilos -= kilosPendientes;
            kilosPendientes = 0;
          } else {
            kilosPendientes -= lote.kilos;
            lote.kilos = 0;
          }
        }
        
        existencias[key].lotes = lotes.filter(l => l.kilos > 0);
      }
    }
  }
  
  // Procesar entradas locales
  for (const entrada of entradasLocales) {
    if (entrada.proveedor !== proveedor || entrada.producto !== producto) continue;
    
    const precioEntrada = entrada.precio !== null && entrada.precio !== undefined ? entrada.precio : null;
    const cuartoEntrada = normalizeCuarto(entrada.cuartoFrio);
    const key = `${precioEntrada}__${cuartoEntrada}`;
    
    if (!existencias[key]) {
      existencias[key] = {
        precio: precioEntrada,
        cuarto: cuartoEntrada,
        lotes: []
      };
    }
    
    existencias[key].lotes.push({
      kilos: Number(entrada.kilos) || 0,
      fecha: new Date()
    });
  }
  
  // Procesar salidas locales
  for (const salida of salidasLocales) {
    if (salida.proveedor !== proveedor || salida.producto !== producto) continue;
    
    const usarTodosLosCuartos = normalizeCuarto(salida.cuartoFrio) === 'Todos los cuartos';
    const cuartoSalida = normalizeCuarto(salida.cuartoFrio);
    
    const keysCoincidentes = Object.keys(existencias).filter(key => {
      const cuartoClave = existencias[key].cuarto;
      return usarTodosLosCuartos || cuartoClave === cuartoSalida;
    });
    
    keysCoincidentes.sort((a, b) => {
      const precioA = existencias[a].precio ?? -1;
      const precioB = existencias[b].precio ?? -1;
      return precioA - precioB;
    });
    
    let kilosPendientes = Number(salida.kilos) || 0;
    
    for (const key of keysCoincidentes) {
      if (kilosPendientes <= 0) break;
      
      const lotes = existencias[key].lotes;
      lotes.sort((a, b) => a.fecha - b.fecha);
      
      for (let i = 0; i < lotes.length && kilosPendientes > 0; i++) {
        const lote = lotes[i];
        if (lote.kilos >= kilosPendientes) {
          lote.kilos -= kilosPendientes;
          kilosPendientes = 0;
        } else {
          kilosPendientes -= lote.kilos;
          lote.kilos = 0;
        }
      }
      
      existencias[key].lotes = lotes.filter(l => l.kilos > 0);
    }
  }
  
  // Calcular disponibles para la combinación específica solicitada
  const keyBuscada = `${precioNormalizado}__${cuartoNormalizado}`;
  const lotesResultado = existencias[keyBuscada] ? existencias[keyBuscada].lotes : [];
  const disponibles = lotesResultado.reduce((sum, lote) => sum + lote.kilos, 0);
  
  // Para todosLosCuartos, sumar todos los cuartos
  if (todosLosCuartos) {
    let totalDisponibles = 0;
    const todosLosLotes = [];
    
    for (const key in existencias) {
      const [precioKey, cuartoKey] = key.split('__');
      if (precioNormalizado === null || Number(precioKey) === precioNormalizado || precioKey === 'null') {
        for (const lote of existencias[key].lotes) {
          totalDisponibles += lote.kilos;
          todosLosLotes.push(lote);
        }
      }
    }
    
    return {
      disponibles: Number(totalDisponibles.toFixed(1)),
      lotes: todosLosLotes,
      totalEntradas: 0,
      totalSalidas: 0
    };
  }
  
  return {
    disponibles: Number(disponibles.toFixed(1)),
    lotes: lotesResultado,
    totalEntradas: 0,
    totalSalidas: 0
  };
}

/**
 * Obtiene opciones disponibles para un producto en crudos
 */
function obtenerOpcionesDisponiblesCrudos({
  proveedor,
  producto,
  registros,
  fechaLimite,
  entradasLocales = [],
  registroIdActual = null
}) {
  const opciones = new Map();
  
  const fechaLimiteDate = finDiaMexico(fechaLimite);
  
  // Recolectar todas las combinaciones de precio+cuarto de entradas
  for (const registro of registros) {
    if (registroIdActual && registro.id === registroIdActual) continue;
    
    const registroFecha = registro.fecha;
    const registroDate = registroFecha instanceof Date ? registroFecha
      : typeof registroFecha.toDate === 'function' ? registroFecha.toDate()
      : new Date(registroFecha);
    
    if (registroDate > fechaLimiteDate) continue;
    
    const entradas = registro.entradas || [];
    for (const entrada of entradas) {
      if (entrada.proveedor === proveedor && entrada.producto === producto) {
        const precioNorm = entrada.precio !== null && entrada.precio !== undefined 
          ? entrada.precio : null;
        const cuartoNorm = normalizeCuarto(entrada.cuartoFrio);
        const key = `${precioNorm}__${cuartoNorm}`;
        
        if (!opciones.has(key)) {
          opciones.set(key, { precio: precioNorm, cuarto: cuartoNorm });
        }
      }
    }
  }
  
  // Incluir entradas locales
  for (const entrada of entradasLocales) {
    if (entrada.proveedor === proveedor && entrada.producto === producto) {
      const precioNorm = entrada.precio !== null && entrada.precio !== undefined 
        ? entrada.precio : null;
      const cuartoNorm = normalizeCuarto(entrada.cuartoFrio);
      const key = `${precioNorm}__${cuartoNorm}`;
      
      if (!opciones.has(key)) {
        opciones.set(key, { precio: precioNorm, cuarto: cuartoNorm });
      }
    }
  }
  
  // Para cada opción, calcular disponibles
  const resultado = [];
  for (const [key, { precio, cuarto }] of opciones) {
    const { disponibles, lotes } = calcularDisponiblesCrudos({
      proveedor,
      producto,
      precio,
      cuarto,
      registros,
      fechaLimite,
      entradasLocales,
      salidasLocales: [],
      registroIdActual,
      todosLosCuartos: false
    });
    
    if (disponibles > 0) {
      const primeraFecha = lotes.length > 0 ? lotes[0].fecha : null;
      resultado.push({ precio, cuarto, kilos: disponibles, primeraFecha });
    }
  }
  
  // Ordenar por fecha más antigua primero (FIFO)
  resultado.sort((a, b) => {
    if (!a.primeraFecha) return 1;
    if (!b.primeraFecha) return -1;
    return a.primeraFecha - b.primeraFecha;
  });
  
  return resultado;
}

/**
 * POST /crudos/salida
 * Registra una salida de crudos con validación FIFO y actualización transaccional.
 */
async function handlePostCrudosSalida(req, res) {
  const {
    fecha,
    proveedor,
    producto,
    kilos: kilosParam,
    precio,
    cuarto,
    dryRun = false,
    idempotencyKey
  } = req.body;
  
  // Validación de parámetros
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "fecha" es requerido y debe estar en formato YYYY-MM-DD');
  }
  if (!proveedor || typeof proveedor !== 'string') {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "proveedor" es requerido');
  }
  if (!producto || typeof producto !== 'string') {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "producto" es requerido');
  }
  
  const kilos = kilosParam !== undefined ? Number(kilosParam) : null;
  
  if (kilos === null || isNaN(kilos) || kilos <= 0) {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "kilos" es requerido y debe ser mayor a 0');
  }
  
  const precioNorm = precio !== undefined && precio !== null ? Number(precio) : null;
  if (precioNorm !== null && (isNaN(precioNorm) || precioNorm < 0)) {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El campo "precio" debe ser un número no negativo');
  }
  
  const cuartoNorm = normalizeCuarto(cuarto);
  
  // Verificar idempotencia
  if (idempotencyKey) {
    const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
    const idemSnap = await idemRef.get();
    if (idemSnap.exists) {
      const resultado = idemSnap.data();
      return res.status(200).json({
        success: true,
        idempotent: true,
        message: 'Operación ya procesada anteriormente',
        data: resultado.data
      });
    }
  }
  
  try {
    const resultado = await db.runTransaction(async (transaction) => {
      // Obtener todos los registros ordenados
      const registrosSnap = await transaction.get(
        db.collection('existenciasCrudos').orderBy('fecha', 'asc')
      );
      const registros = registrosSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Obtener o crear el documento del día
      const { crudoRef, crudoSnap } = await obtenerOCrearDiaCrudos(transaction, fecha);
      const diaData = crudoSnap.exists ? crudoSnap.data() : {
        entradas: [],
        salidas: [],
        totalEntradas: 0,
        totalSalidas: 0,
        version: 1
      };
      
      // Calcular disponibles para la combinación solicitada
      const { disponibles, lotes } = calcularDisponiblesCrudos({
        proveedor,
        producto,
        precio: precioNorm,
        cuarto: cuartoNorm,
        registros,
        fechaLimite: fecha,
        entradasLocales: diaData.entradas || [],
        salidasLocales: diaData.salidas || [],
        registroIdActual: crudoRef.id,
        todosLosCuartos: cuartoNorm === 'Todos los cuartos'
      });
      
      // Verificar si hay suficiente stock
      if (kilos > disponibles) {
        // Buscar opciones disponibles para dar feedback útil
        const opciones = obtenerOpcionesDisponiblesCrudos({
          proveedor,
          producto,
          registros,
          fechaLimite: fecha,
          entradasLocales: diaData.entradas || [],
          registroIdActual: crudoRef.id
        });
        
        if (opciones.length === 0) {
          throw {
            code: 'SIN_EXISTENCIAS',
            message: `No hay existencias de ${proveedor} - ${producto}`,
            status: 400
          };
        }
        
        // Si hay opciones pero no la solicitada
        const opcionSolicitada = opciones.find(o => 
          (o.precio === precioNorm || (o.precio === null && precioNorm === null)) &&
          (cuartoNorm === 'Todos los cuartos' || o.cuarto === cuartoNorm)
        );
        
        if (!opcionSolicitada) {
          throw {
            code: 'PRECIO_CUARTO_NO_DISPONIBLE',
            message: `No hay existencias de ${proveedor} - ${producto} con precio ${precioNorm !== null ? '$' + precioNorm : 'sin precio'} y cuarto ${cuartoNorm}`,
            status: 400,
            details: {
              opcionesDisponibles: opciones.map(o => ({
                precio: o.precio,
                cuarto: o.cuarto,
                kilosDisponibles: o.kilos
              }))
            }
          };
        }
        
        throw {
          code: 'KILOS_INSUFICIENTES',
          message: `Kilos insuficientes. Solicitados: ${kilos} kg, disponibles: ${disponibles} kg`,
          status: 400,
          details: {
            solicitados: kilos,
            disponibles,
            faltante: kilos - disponibles
          }
        };
      }
      
      // Si hay múltiples opciones con diferentes precios/cuartos, advertir
      if ((precioNorm === null || cuartoNorm === 's/c') && cuartoNorm !== 'Todos los cuartos') {
        const opciones = obtenerOpcionesDisponiblesCrudos({
          proveedor,
          producto,
          registros,
          fechaLimite: fecha,
          entradasLocales: diaData.entradas || [],
          registroIdActual: crudoRef.id
        });
        
        if (opciones.length > 1) {
          const totalDisponible = opciones.reduce((sum, o) => sum + o.kilos, 0);
          if (totalDisponible >= kilos) {
            throw {
              code: 'PRECIO_CUARTO_AMBIGUO',
              message: `Hay múltiples precios/cuartos disponibles para ${proveedor} - ${producto}. Especifica "precio" y/o "cuarto" para desambiguar`,
              status: 400,
              details: {
                opcionesDisponibles: opciones.map(o => ({
                  precio: o.precio,
                  cuarto: o.cuarto,
                  kilosDisponibles: o.kilos
                }))
              }
            };
          }
        }
      }
      
      // Construir la nueva salida (igual que la UI)
      const nuevaSalida = {
        proveedor,
        producto,
        kilos,
        cuartoFrio: cuartoNorm
      };
      
      const salidasActualizadas = [...(diaData.salidas || []), nuevaSalida];
      const totalSalidasActualizado = salidasActualizadas.reduce(
        (sum, s) => sum + (Number(s.kilos) || 0), 0
      );
      
      const actualizacion = {
        salidas: salidasActualizadas,
        totalSalidas: totalSalidasActualizado,
        version: admin.firestore.FieldValue.increment(1),
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const dataParaRespuesta = {
        fecha,
        salida: nuevaSalida,
        totalSalidas: totalSalidasActualizado,
        kilosDisponiblesAntes: disponibles,
        kilosDisponiblesDespues: disponibles - kilos
      };
      
      if (dryRun) {
        return {
          dryRun: true,
          message: 'Simulación exitosa (sin escribir a Firestore)',
          ...dataParaRespuesta
        };
      }
      
      // Escribir la actualización      
      if (crudoSnap.exists) {
        transaction.update(crudoRef, actualizacion);
      } else {
        transaction.set(crudoRef, {
          fecha: admin.firestore.Timestamp.fromDate(medianocheMexico(fecha)),
          entradas: diaData.entradas || [],
          totalEntradas: diaData.totalEntradas || 0,
          ...actualizacion,
          version: 1
        });
      }
      
      // Escribir log de auditoría
      const logRef = db.collection('asistenteLog').doc();
      transaction.set(logRef, {
        tipo: 'salida-crudo',
        fecha,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        request: {
          proveedor,
          producto,
          kilos,
          precio: precioNorm,
          cuarto: cuartoNorm
        },
        before: {
          totalSalidas: diaData.totalSalidas || 0,
          numSalidas: (diaData.salidas || []).length
        },
        after: {
          totalSalidas: totalSalidasActualizado,
          numSalidas: salidasActualizadas.length
        },
        crudoId: crudoRef.id
      });
      
      // Guardar idempotencia
      if (idempotencyKey) {
        const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
        transaction.set(idemRef, {
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          data: dataParaRespuesta,
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          )
        });
      }
      
      return dataParaRespuesta;
    });
    
    return res.status(200).json({
      success: true,
      ...resultado
    });
    
  } catch (error) {
    if (error.code === 'DIA_DUPLICADO') {
      return errorResponse(res, 409, 'DIA_DUPLICADO', 
        'Ya existe un registro de crudos para esta fecha');
    }
    if (error.code === 'DIA_ELIMINADO') {
      return errorResponse(res, 410, 'DIA_ELIMINADO', 
        'El día fue eliminado desde otro equipo');
    }
    if (error.code) {
      return errorResponse(res, error.status || 500, error.code, error.message, error.details);
    }
    
    console.error('Error en POST /crudos/salida:', error);
    return errorResponse(res, 500, 'ERROR_INTERNO', 
      'Error inesperado al procesar la salida: ' + error.message);
  }
}

/**
 * GET /crudos/existencias
 * Devuelve las existencias actuales agrupadas por proveedor+producto+precio+cuarto.
 */
async function handleGetCrudosExistencias(req, res) {
  const { proveedor: proveedorFiltro, producto: productoFiltro } = req.query;
  
  try {
    // Obtener todos los registros
    const registrosSnap = await db.collection('existenciasCrudos')
      .orderBy('fecha', 'asc')
      .get();
    
    const registros = registrosSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Obtener la fecha actual en la zona de inventario
    const hoy = new Date().toLocaleDateString('en-CA', { 
      timeZone: 'America/Mexico_City' 
    });
    
    // Recolectar todas las combinaciones únicas de proveedor+producto+precio+cuarto
    const combinaciones = new Map();
    
    for (const registro of registros) {
      const entradas = registro.entradas || [];
      for (const entrada of entradas) {
        const key = `${entrada.proveedor}|${entrada.producto}|${entrada.precio ?? 'null'}|${normalizeCuarto(entrada.cuartoFrio)}`;
        if (!combinaciones.has(key)) {
          combinaciones.set(key, {
            proveedor: entrada.proveedor,
            producto: entrada.producto,
            precio: entrada.precio ?? null,
            cuarto: normalizeCuarto(entrada.cuartoFrio)
          });
        }
      }
    }
    
    // Calcular disponibles para cada combinación
    const existencias = [];
    
    for (const [key, { proveedor, producto, precio, cuarto }] of combinaciones) {
      // Aplicar filtros si se especificaron
      if (proveedorFiltro && proveedor !== proveedorFiltro) continue;
      if (productoFiltro && producto !== productoFiltro) continue;
      
      const { disponibles } = calcularDisponiblesCrudos({
        proveedor,
        producto,
        precio,
        cuarto,
        registros,
        fechaLimite: hoy,
        entradasLocales: [],
        salidasLocales: [],
        registroIdActual: null,
        todosLosCuartos: false
      });
      
      if (disponibles > 0) {
        existencias.push({
          proveedor,
          producto,
          precio,
          cuarto,
          kilos: disponibles,
          taras: Number((disponibles / 19).toFixed(1)),
          valor: precio ? Number((disponibles * precio).toFixed(2)) : 0
        });
      }
    }
    
    // Ordenar por proveedor, producto, precio, cuarto
    existencias.sort((a, b) => {
      if (a.proveedor !== b.proveedor) return a.proveedor.localeCompare(b.proveedor);
      if (a.producto !== b.producto) return a.producto.localeCompare(b.producto);
      const precioA = a.precio ?? -1;
      const precioB = b.precio ?? -1;
      if (precioA !== precioB) return precioA - precioB;
      return a.cuarto.localeCompare(b.cuarto);
    });
    
    return res.status(200).json({
      success: true,
      fecha: hoy,
      existencias,
      total: existencias.length
    });
    
  } catch (error) {
    console.error('Error en GET /crudos/existencias:', error);
    return errorResponse(res, 500, 'ERROR_INTERNO', 
      'Error inesperado al obtener existencias: ' + error.message);
  }
}

/**
 * GET /crudos/dia
 * Devuelve las entradas y salidas de un día específico de crudos.
 */
async function handleGetCrudosDia(req, res) {
  const { fecha } = req.query;
  
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'El parámetro "fecha" es requerido y debe estar en formato YYYY-MM-DD');
  }
  
  try {
    // Buscar el día directamente en la colección
    const registrosSnap = await db.collection('existenciasCrudos').get();
    const dia = registrosSnap.docs.find(doc => 
      fechaRegistroAdmin(doc.data().fecha) === fecha
    );
    
    if (!dia) {
      return res.status(200).json({
        success: true,
        fecha,
        encontrado: false,
        message: 'No hay registro para esta fecha'
      });
    }
    
    const data = dia.data();
    return res.status(200).json({
      success: true,
      fecha,
      encontrado: true,
      crudoId: dia.id,
      entradas: data.entradas || [],
      salidas: data.salidas || [],
      totalEntradas: data.totalEntradas || 0,
      totalSalidas: data.totalSalidas || 0,
      version: data.version || 1,
      actualizadoEn: data.actualizadoEn
    });
    
  } catch (error) {
    console.error('Error en GET /crudos/dia:', error);
    return errorResponse(res, 500, 'ERROR_INTERNO', 
      'Error inesperado al obtener el día: ' + error.message);
  }
}

/**
 * Cloud Function principal que maneja todas las rutas.
 */
exports.asistente = onRequest(
  {
    secrets: [asistenteApiKey],
    timeoutSeconds: 60,
    memory: '256MiB',
    region: 'us-central1',
    cors: false
  },
  async (req, res) => {
    // Verificar autenticación
    const authError = verificarAuth(req, asistenteApiKey.value());
    if (authError) {
      return res.status(authError.status).json({ error: authError.error });
    }
    
    // Routing
    const path = req.path;
    const method = req.method;
    
    // Rutas de limpios
    if (path === '/salida' && method === 'POST') {
      return handlePostSalida(req, res);
    }
    
    if (path === '/existencias' && method === 'GET') {
      return handleGetExistencias(req, res);
    }
    
    if (path === '/dia' && method === 'GET') {
      return handleGetDia(req, res);
    }
    
    // Rutas de crudos
    if (path === '/crudos/entrada' && method === 'POST') {
      return handlePostCrudosEntrada(req, res);
    }
    
    if (path === '/crudos/salida' && method === 'POST') {
      return handlePostCrudosSalida(req, res);
    }
    
    if (path === '/crudos/existencias' && method === 'GET') {
      return handleGetCrudosExistencias(req, res);
    }
    
    if (path === '/crudos/dia' && method === 'GET') {
      return handleGetCrudosDia(req, res);
    }
    
    return res.status(404).json({ 
      error: 'Ruta no encontrada. Rutas disponibles: POST /salida, GET /existencias, GET /dia, POST /crudos/entrada, POST /crudos/salida, GET /crudos/existencias, GET /crudos/dia' 
    });
  }
);
