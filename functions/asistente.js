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
    
    if (path === '/salida' && method === 'POST') {
      return handlePostSalida(req, res);
    }
    
    if (path === '/existencias' && method === 'GET') {
      return handleGetExistencias(req, res);
    }
    
    if (path === '/dia' && method === 'GET') {
      return handleGetDia(req, res);
    }
    
    return res.status(404).json({ 
      error: 'Ruta no encontrada. Rutas disponibles: POST /salida, GET /existencias, GET /dia' 
    });
  }
);
