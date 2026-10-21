const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const crypto = require('crypto');
const {
  normalizeCuarto,
  fechaRegistroAdmin,
  medianocheMexico,
  finDiaMexico,
  inicioDiaMexico,
  calcularDisponibles,
  obtenerOpcionesDisponibles
} = require('./lib/inventario');
const { construirLineasPedidoLimpio } = require('./lib/pedidosLimpioLineas');
const { crearHandlersAbonos } = require('./lib/abonosClientes');
const { crearHandlersPedidosCrudo } = require('./lib/pedidosCrudo');
const { crearHandlersPrecios } = require('./lib/preciosVenta');
const { crearHandlersRefrigerados } = require('./lib/pedidosLimpioRefrigerados');

/**
 * Genera un ID único para identificar filas creadas por el asistente.
 */
function generarAsistenteId() {
  return crypto.randomUUID();
}

// La API key vive como secreto de Firebase (nunca en el código):
//   firebase functions:secrets:set ASISTENTE_API_KEY
const asistenteApiKey = defineSecret('ASISTENTE_API_KEY');

// Inicializar Admin SDK solo si aún no está inicializado (skip en tests)
if (!admin.apps.length && process.env.NODE_ENV !== 'test') {
  admin.initializeApp();
}

function firestoreParaTests() {
  const apps = admin.apps.filter(Boolean);
  const preferida = apps.find((app) => app.name === 'pedidos-tests') || apps[0];
  if (!preferida) {
    throw new Error('Firebase app no inicializada para tests del asistente');
  }
  return admin.firestore(preferida);
}

// En tests, usar la app que ya fue inicializada por el test.
// Se prefiere 'pedidos-tests' para no romper ese script; el resto usa la app activa.
const db = process.env.NODE_ENV === 'test'
  ? firestoreParaTests()
  : admin.firestore();

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
 * true si el body trae un cuarto. Vacío, null u omitido no cuentan: normalizeCuarto()
 * los convierte en 's/c', que también es un cuarto real. 's/c' explícito sí cuenta.
 */
function cuartoFueIndicado(cuarto) {
  if (cuarto === undefined || cuarto === null) return false;
  return String(cuarto).trim() !== '';
}

function preciosCoinciden(precioOpcion, precioNorm) {
  const opcion = precioOpcion === undefined ? null : precioOpcion;
  if (precioNorm === null || precioNorm === undefined) return opcion === null;
  return Number(opcion) === Number(precioNorm);
}

/**
 * Hay que revisar ambigüedad cuando el caller no cerró la combinación.
 * Precio y cuarto explícitos (incluido 's/c') identifican una sola opción.
 * "Todos los cuartos" es una instrucción de descuento, no una combinación ambigua.
 */
function debeRevisarAmbiguedad(precioNorm, cuarto, { todosLosCuartos = false } = {}) {
  if (todosLosCuartos && normalizeCuarto(cuarto) === 'Todos los cuartos') return false;
  const precioDado = precioNorm !== null && precioNorm !== undefined;
  return !precioDado || !cuartoFueIndicado(cuarto);
}

/**
 * Deja solo las opciones compatibles con el precio y/o cuarto indicados.
 * Si no se indicó ninguno, devuelve la lista completa.
 */
function filtrarOpcionesIndicadas(opciones, precioNorm, cuarto) {
  const precioDado = precioNorm !== null && precioNorm !== undefined;
  const cuartoDado = cuartoFueIndicado(cuarto);
  const cuartoNorm = normalizeCuarto(cuarto);
  return opciones.filter((opcion) => {
    const coincidePrecio = !precioDado || preciosCoinciden(opcion.precio, precioNorm);
    const coincideCuarto = !cuartoDado || opcion.cuarto === cuartoNorm;
    return coincidePrecio && coincideCuarto;
  });
}

function errorPrecioCuartoAmbiguo(etiqueta, opciones) {
  return {
    code: 'PRECIO_CUARTO_AMBIGUO',
    message: `Hay múltiples precios/cuartos disponibles para ${etiqueta}. Especifica "precio" y/o "cuarto" para desambiguar`,
    status: 400,
    details: {
      opcionesDisponibles: opciones.map((o) => ({
        precio: o.precio,
        cuarto: o.cuarto,
        kilosDisponibles: o.kilos
      }))
    }
  };
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
      
      // Ambiguo solo si, con el precio y/o cuarto indicados, sigue habiendo
      // más de una opción. Un precio que identifica un único lote (aunque su
      // cuarto sea 's/c', explícito u omitido) no es ambiguo. Sin precio ni
      // cuarto, varias opciones siguen siéndolo.
      if (debeRevisarAmbiguedad(precioNorm, cuarto)) {
        const opciones = obtenerOpcionesDisponibles({
          proveedor,
          medidaBase: medida,
          sacadas,
          fechaLimite: fecha,
          entradasLocales: diaData.entradas || [],
          sacadaIdActual: sacadaRef.id
        });
        const coincidentes = filtrarOpcionesIndicadas(opciones, precioNorm, cuarto);

        if (coincidentes.length > 1) {
          const totalDisponible = coincidentes.reduce((sum, o) => sum + o.kilos, 0);
          if (totalDisponible >= kilos) {
            throw errorPrecioCuartoAmbiguo(`${proveedor} - ${medida}`, coincidentes);
          }
        }
      }
      
      // Construir la nueva salida (igual que la UI)
      const asistenteId = generarAsistenteId();
      const nuevaSalida = {
        tipo: 'proveedor',
        proveedor,
        medida,
        precio: precioNorm,
        kilos,
        cajas,
        cuartoFrio: cuartoNorm,
        _asistenteId: asistenteId
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
        sacadaId: sacadaRef.id,
        asistenteId: asistenteId,
        row: nuevaSalida,
        idempotencyKey: idempotencyKey || null
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
      const asistenteId = generarAsistenteId();
      const nuevaEntrada = {
        proveedor,
        producto,
        kilos,
        precio: precioNorm,
        piezas: piezasNorm,
        cuartoFrio: cuartoNorm,
        _asistenteId: asistenteId
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
        crudoId: crudoRef.id,
        asistenteId: asistenteId,
        row: nuevaEntrada,
        idempotencyKey: idempotencyKey || null
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
 * Calcula disponibles de crudos siguiendo la lógica de RegistroCrudos.vue.
 * Las salidas descuentan en orden FIFO por FECHA (no por precio), igual que la UI.
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
  
  // Construir lotes disponibles siguiendo RegistroCrudos.vue loadProductosDisponibles
  const lotesDisponibles = [];
  let ordenLote = 0;
  
  const fechaLimiteDate = finDiaMexico(fechaLimite);
  
  // Función para registrar una entrada como lote
  const registrarEntrada = (entrada, fechaRegistro) => {
    if (entrada.proveedor !== proveedor || entrada.producto !== producto) return;
    
    const kilos = Number(entrada.kilos) || 0;
    if (kilos <= 0) return;
    
    const precioEntrada = entrada.precio !== null && entrada.precio !== undefined ? entrada.precio : null;
    const cuartoEntrada = normalizeCuarto(entrada.cuartoFrio);
    
    lotesDisponibles.push({
      precio: precioEntrada,
      cuarto: cuartoEntrada,
      kilos,
      fecha: fechaRegistro,
      fechaMs: fechaRegistro.getTime(),
      orden: ordenLote++
    });
  };
  
  // Función para descontar una salida de los lotes (FIFO por fecha)
  const descontarSalida = (salida) => {
    if (salida.proveedor !== proveedor || salida.producto !== producto) return;
    
    const usarTodosLosCuartos = normalizeCuarto(salida.cuartoFrio) === 'Todos los cuartos';
    const cuartoSalida = normalizeCuarto(salida.cuartoFrio);
    
    let restante = Number(salida.kilos) || 0;
    if (restante <= 0) return;
    
    // Descontar de lotes en orden (ya están en orden de fecha por construcción)
    for (const lote of lotesDisponibles) {
      if (restante <= 0) break;
      if (lote.kilos <= 0) continue;
      if (!usarTodosLosCuartos && lote.cuarto !== cuartoSalida) continue;
      
      const descuento = Math.min(restante, lote.kilos);
      lote.kilos = Number((lote.kilos - descuento).toFixed(1));
      restante = Number((restante - descuento).toFixed(1));
    }
  };
  
  // Procesar registros históricos en orden de fecha
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
      registrarEntrada(entrada, registroDate);
    }
    
    // Procesar salidas (FIFO por fecha, no por precio)
    const salidas = registro.salidas || [];
    for (const salida of salidas) {
      descontarSalida(salida);
    }
  }
  
  // Procesar movimientos locales
  const fechaActual = new Date();
  for (const entrada of entradasLocales) {
    registrarEntrada(entrada, fechaActual);
  }
  
  for (const salida of salidasLocales) {
    descontarSalida(salida);
  }
  
  // Calcular disponibles para la combinación específica solicitada
  let disponibles = 0;
  const lotesResultado = [];
  
  for (const lote of lotesDisponibles) {
    if (lote.kilos <= 0) continue;
    
    // Filtrar por precio y cuarto
    const coincidePrecio = precioNormalizado === null 
      ? lote.precio === null 
      : lote.precio === precioNormalizado;
    
    const coincideCuarto = todosLosCuartos || lote.cuarto === cuartoNormalizado;
    
    if (coincidePrecio && coincideCuarto) {
      disponibles += lote.kilos;
      lotesResultado.push(lote);
    }
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
      
      // Misma regla que limpios: filtrar por el precio y/o cuarto indicados
      // y solo marcar ambigüedad si queda más de una opción.
      if (debeRevisarAmbiguedad(precioNorm, cuarto, { todosLosCuartos: true })) {
        const opciones = obtenerOpcionesDisponiblesCrudos({
          proveedor,
          producto,
          registros,
          fechaLimite: fecha,
          entradasLocales: diaData.entradas || [],
          registroIdActual: crudoRef.id
        });
        const coincidentes = filtrarOpcionesIndicadas(opciones, precioNorm, cuarto);

        if (coincidentes.length > 1) {
          const totalDisponible = coincidentes.reduce((sum, o) => sum + o.kilos, 0);
          if (totalDisponible >= kilos) {
            throw errorPrecioCuartoAmbiguo(`${proveedor} - ${producto}`, coincidentes);
          }
        }
      }
      
      // Construir la nueva salida (igual que la UI)
      const asistenteId = generarAsistenteId();
      const nuevaSalida = {
        proveedor,
        producto,
        kilos,
        cuartoFrio: cuartoNorm,
        _asistenteId: asistenteId
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
        crudoId: crudoRef.id,
        asistenteId: asistenteId,
        row: nuevaSalida,
        idempotencyKey: idempotencyKey || null
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
 * POST /deshacer
 * Deshace una salida de limpios registrada previamente por el asistente.
 */
async function handlePostDeshacer(req, res) {
  const {
    idempotencyKey,
    logId,
    dryRun = false,
    undoIdempotencyKey
  } = req.body;
  
  // Validación: debe especificar idempotencyKey o logId
  if (!idempotencyKey && !logId) {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'Debes especificar "idempotencyKey" o "logId" para identificar la operación a deshacer');
  }
  
  // DryRun nunca debe usar idempotencia
  if (!dryRun && undoIdempotencyKey) {
    // Verificar idempotencia del undo (namespace separado)
    const undoIdemRef = db.collection('asistenteIdem').doc(`undo:${undoIdempotencyKey}`);
    const undoIdemSnap = await undoIdemRef.get();
    if (undoIdemSnap.exists) {
      const resultado = undoIdemSnap.data();
      return res.status(200).json({
        success: true,
        idempotent: true,
        message: 'Operación de deshacer ya procesada anteriormente',
        data: resultado.data
      });
    }
  }
  
  try {
    // Buscar el log original
    let logSnap;
    
    if (idempotencyKey) {
      // Buscar por idempotencyKey en los logs de la operación ORIGINAL
      const logsQuery = await db.collection('asistenteLog')
        .where('idempotencyKey', '==', idempotencyKey)
        .where('tipo', '==', 'salida')
        .limit(1)
        .get();
      
      if (logsQuery.empty) {
        return errorResponse(res, 404, 'OPERACION_NO_ENCONTRADA', 
          'No se encontró ninguna operación de salida con ese idempotencyKey. Solo se pueden deshacer operaciones creadas por el asistente.');
      }
      
      logSnap = logsQuery.docs[0];
    } else {
      // Buscar por logId directamente
      logSnap = await db.collection('asistenteLog').doc(logId).get();
      
      if (!logSnap.exists) {
        return errorResponse(res, 404, 'OPERACION_NO_ENCONTRADA', 
          'No se encontró ninguna operación con ese logId');
      }
      
      if (logSnap.data().tipo !== 'salida') {
        return errorResponse(res, 400, 'TIPO_INVALIDO', 
          'El log especificado no es una salida de limpios. Usa /crudos/deshacer para crudos.');
      }
    }
    
    const logData = logSnap.data();
    const { sacadaId, asistenteId, row: rowOriginal, fecha } = logData;
    
    if (!sacadaId) {
      return errorResponse(res, 500, 'LOG_INCOMPLETO', 
        'El log de auditoría no tiene sacadaId. No se puede deshacer.');
    }
    
    if (!asistenteId) {
      return errorResponse(res, 400, 'NO_DESHACIBLE', 
        'Esta operación fue creada antes de que existiera soporte para deshacer. Solo se pueden deshacer operaciones con identificador de asistente.');
    }
    
    // Verificar si ya fue deshecha
    const undoLogsQuery = await db.collection('asistenteLog')
      .where('tipo', '==', 'deshacer')
      .where('originalLogId', '==', logSnap.id)
      .limit(1)
      .get();
    
    if (!undoLogsQuery.empty) {
      const undoLogData = undoLogsQuery.docs[0].data();
      return res.status(200).json({
        success: true,
        alreadyUndone: true,
        message: 'Esta operación ya fue deshecha anteriormente',
        data: {
          fecha,
          originalLogId: logSnap.id,
          undoTimestamp: undoLogData.timestamp,
          row: rowOriginal
        }
      });
    }
    
    const resultado = await db.runTransaction(async (transaction) => {
      // Obtener el documento del día
      const sacadaRef = db.collection('sacadas').doc(sacadaId);
      const sacadaSnap = await transaction.get(sacadaRef);
      
      if (!sacadaSnap.exists) {
        throw {
          code: 'DIA_NO_ENCONTRADO',
          message: 'El día donde se registró la salida ya no existe',
          status: 404
        };
      }
      
      const diaData = sacadaSnap.data();
      const salidas = diaData.salidas || [];
      
      // Buscar la fila por _asistenteId
      let indiceEncontrado = salidas.findIndex(s => s._asistenteId === asistenteId);
      let metodoEncontrado = 'asistenteId';
      
      // Fallback: buscar por contenido exacto (sin _asistenteId)
      if (indiceEncontrado === -1 && rowOriginal) {
        const rowSinId = { ...rowOriginal };
        delete rowSinId._asistenteId;
        
        indiceEncontrado = salidas.findIndex(s => {
          const sSinId = { ...s };
          delete sSinId._asistenteId;
          return JSON.stringify(sSinId) === JSON.stringify(rowSinId);
        });
        
        if (indiceEncontrado !== -1) {
          metodoEncontrado = 'contenido';
        }
      }
      
      if (indiceEncontrado === -1) {
        throw {
          code: 'FILA_NO_ENCONTRADA',
          message: 'No se encontró la fila en el documento del día. Es posible que ya haya sido eliminada o editada manualmente.',
          status: 404,
          details: {
            busquedaPor: 'asistenteId y contenido exacto',
            filaOriginal: rowOriginal,
            salidasActuales: salidas.length
          }
        };
      }
      
      // Verificar si la fila fue modificada manualmente (solo si la encontramos por ID)
      if (metodoEncontrado === 'asistenteId' && rowOriginal) {
        const filaActual = salidas[indiceEncontrado];
        const filaActualSinId = { ...filaActual };
        delete filaActualSinId._asistenteId;
        const rowOriginalSinId = { ...rowOriginal };
        delete rowOriginalSinId._asistenteId;
        
        if (JSON.stringify(filaActualSinId) !== JSON.stringify(rowOriginalSinId)) {
          throw {
            code: 'FILA_MODIFICADA',
            message: 'La fila fue modificada manualmente después de ser registrada. No se puede deshacer.',
            status: 409,
            details: {
              filaOriginal: rowOriginalSinId,
              filaActual: filaActualSinId
            }
          };
        }
      }
      
      // Remover la fila
      const salidasActualizadas = salidas.filter((_, i) => i !== indiceEncontrado);
      const totalSalidasActualizado = salidasActualizadas.reduce(
        (sum, s) => sum + (Number(s.kilos) || 0), 0
      );
      
      const dataParaRespuesta = {
        fecha,
        originalLogId: logSnap.id,
        filaEliminada: salidas[indiceEncontrado],
        metodoEncontrado,
        totalSalidasAntes: diaData.totalSalidas || 0,
        totalSalidasDespues: totalSalidasActualizado
      };
      
      if (dryRun) {
        return {
          dryRun: true,
          message: 'Simulación exitosa (sin escribir a Firestore)',
          ...dataParaRespuesta
        };
      }
      
      // Actualizar el documento
      const actualizacion = {
        salidas: salidasActualizadas,
        totalSalidas: totalSalidasActualizado,
        version: admin.firestore.FieldValue.increment(1),
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
      };
      
      transaction.update(sacadaRef, actualizacion);
      
      // Escribir log de deshacer
      const undoLogRef = db.collection('asistenteLog').doc();
      transaction.set(undoLogRef, {
        tipo: 'deshacer',
        fecha,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        originalLogId: logSnap.id,
        originalRequest: logData.request,
        originalRow: rowOriginal,
        asistenteId: asistenteId,
        before: {
          totalSalidas: diaData.totalSalidas || 0,
          numSalidas: salidas.length
        },
        after: {
          totalSalidas: totalSalidasActualizado,
          numSalidas: salidasActualizadas.length
        },
        sacadaId: sacadaId,
        metodoEncontrado: metodoEncontrado
      });
      
      // Guardar idempotencia del undo (namespace separado con prefijo 'undo:')
      if (undoIdempotencyKey) {
        const undoIdemRef = db.collection('asistenteIdem').doc(`undo:${undoIdempotencyKey}`);
        transaction.set(undoIdemRef, {
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
    if (error.code) {
      return errorResponse(res, error.status || 500, error.code, error.message, error.details);
    }
    
    console.error('Error en POST /deshacer:', error);
    return errorResponse(res, 500, 'ERROR_INTERNO', 
      'Error inesperado al deshacer la operación: ' + error.message);
  }
}

/**
 * POST /crudos/deshacer
 * Deshace una entrada o salida de crudos registrada previamente por el asistente.
 */
async function handlePostCrudosDeshacer(req, res) {
  const {
    idempotencyKey,
    logId,
    dryRun = false,
    undoIdempotencyKey
  } = req.body;
  
  // Validación: debe especificar idempotencyKey o logId
  if (!idempotencyKey && !logId) {
    return errorResponse(res, 400, 'PARAMETRO_INVALIDO', 
      'Debes especificar "idempotencyKey" o "logId" para identificar la operación a deshacer');
  }
  
  // DryRun nunca debe usar idempotencia
  if (!dryRun && undoIdempotencyKey) {
    // Verificar idempotencia del undo (namespace separado)
    const undoIdemRef = db.collection('asistenteIdem').doc(`undo:${undoIdempotencyKey}`);
    const undoIdemSnap = await undoIdemRef.get();
    if (undoIdemSnap.exists) {
      const resultado = undoIdemSnap.data();
      return res.status(200).json({
        success: true,
        idempotent: true,
        message: 'Operación de deshacer ya procesada anteriormente',
        data: resultado.data
      });
    }
  }
  
  try {
    // Buscar el log original
    let logSnap;
    
    if (idempotencyKey) {
      // Buscar por idempotencyKey en los logs de la operación ORIGINAL
      const logsQuery = await db.collection('asistenteLog')
        .where('idempotencyKey', '==', idempotencyKey)
        .where('tipo', 'in', ['entrada-crudo', 'salida-crudo'])
        .limit(1)
        .get();
      
      if (logsQuery.empty) {
        return errorResponse(res, 404, 'OPERACION_NO_ENCONTRADA', 
          'No se encontró ninguna operación de crudos con ese idempotencyKey. Solo se pueden deshacer operaciones creadas por el asistente.');
      }
      
      logSnap = logsQuery.docs[0];
    } else {
      // Buscar por logId directamente
      logSnap = await db.collection('asistenteLog').doc(logId).get();
      
      if (!logSnap.exists) {
        return errorResponse(res, 404, 'OPERACION_NO_ENCONTRADA', 
          'No se encontró ninguna operación con ese logId');
      }
      
      const tipo = logSnap.data().tipo;
      if (tipo !== 'entrada-crudo' && tipo !== 'salida-crudo') {
        return errorResponse(res, 400, 'TIPO_INVALIDO', 
          'El log especificado no es una entrada/salida de crudos. Usa /deshacer para limpios.');
      }
    }
    
    const logData = logSnap.data();
    const { crudoId, asistenteId, row: rowOriginal, fecha, tipo } = logData;
    
    if (!crudoId) {
      return errorResponse(res, 500, 'LOG_INCOMPLETO', 
        'El log de auditoría no tiene crudoId. No se puede deshacer.');
    }
    
    if (!asistenteId) {
      return errorResponse(res, 400, 'NO_DESHACIBLE', 
        'Esta operación fue creada antes de que existiera soporte para deshacer. Solo se pueden deshacer operaciones con identificador de asistente.');
    }
    
    // Verificar si ya fue deshecha
    const undoLogsQuery = await db.collection('asistenteLog')
      .where('tipo', '==', 'deshacer-crudo')
      .where('originalLogId', '==', logSnap.id)
      .limit(1)
      .get();
    
    if (!undoLogsQuery.empty) {
      const undoLogData = undoLogsQuery.docs[0].data();
      return res.status(200).json({
        success: true,
        alreadyUndone: true,
        message: 'Esta operación ya fue deshecha anteriormente',
        data: {
          fecha,
          originalLogId: logSnap.id,
          undoTimestamp: undoLogData.timestamp,
          row: rowOriginal,
          tipoOriginal: tipo
        }
      });
    }
    
    const esEntrada = tipo === 'entrada-crudo';
    const campoArray = esEntrada ? 'entradas' : 'salidas';
    const campoTotal = esEntrada ? 'totalEntradas' : 'totalSalidas';
    
    const resultado = await db.runTransaction(async (transaction) => {
      // Obtener el documento del día
      const crudoRef = db.collection('existenciasCrudos').doc(crudoId);
      const crudoSnap = await transaction.get(crudoRef);
      
      if (!crudoSnap.exists) {
        throw {
          code: 'DIA_NO_ENCONTRADO',
          message: 'El día donde se registró la operación ya no existe',
          status: 404
        };
      }
      
      const diaData = crudoSnap.data();
      const registros = diaData[campoArray] || [];
      
      // Buscar la fila por _asistenteId
      let indiceEncontrado = registros.findIndex(r => r._asistenteId === asistenteId);
      let metodoEncontrado = 'asistenteId';
      
      // Fallback: buscar por contenido exacto (sin _asistenteId)
      if (indiceEncontrado === -1 && rowOriginal) {
        const rowSinId = { ...rowOriginal };
        delete rowSinId._asistenteId;
        
        indiceEncontrado = registros.findIndex(r => {
          const rSinId = { ...r };
          delete rSinId._asistenteId;
          return JSON.stringify(rSinId) === JSON.stringify(rowSinId);
        });
        
        if (indiceEncontrado !== -1) {
          metodoEncontrado = 'contenido';
        }
      }
      
      if (indiceEncontrado === -1) {
        throw {
          code: 'FILA_NO_ENCONTRADA',
          message: `No se encontró la fila en el documento del día. Es posible que ya haya sido eliminada o editada manualmente.`,
          status: 404,
          details: {
            busquedaPor: 'asistenteId y contenido exacto',
            tipoOperacion: tipo,
            filaOriginal: rowOriginal,
            registrosActuales: registros.length
          }
        };
      }
      
      // Verificar si la fila fue modificada manualmente (solo si la encontramos por ID)
      if (metodoEncontrado === 'asistenteId' && rowOriginal) {
        const filaActual = registros[indiceEncontrado];
        const filaActualSinId = { ...filaActual };
        delete filaActualSinId._asistenteId;
        const rowOriginalSinId = { ...rowOriginal };
        delete rowOriginalSinId._asistenteId;
        
        if (JSON.stringify(filaActualSinId) !== JSON.stringify(rowOriginalSinId)) {
          throw {
            code: 'FILA_MODIFICADA',
            message: 'La fila fue modificada manualmente después de ser registrada. No se puede deshacer.',
            status: 409,
            details: {
              filaOriginal: rowOriginalSinId,
              filaActual: filaActualSinId
            }
          };
        }
      }
      
      // Remover la fila
      const registrosActualizados = registros.filter((_, i) => i !== indiceEncontrado);
      const totalActualizado = registrosActualizados.reduce(
        (sum, r) => sum + (Number(r.kilos) || 0), 0
      );
      
      const dataParaRespuesta = {
        fecha,
        originalLogId: logSnap.id,
        tipoOriginal: tipo,
        filaEliminada: registros[indiceEncontrado],
        metodoEncontrado,
        [`${campoTotal}Antes`]: diaData[campoTotal] || 0,
        [`${campoTotal}Despues`]: totalActualizado
      };
      
      if (dryRun) {
        return {
          dryRun: true,
          message: 'Simulación exitosa (sin escribir a Firestore)',
          ...dataParaRespuesta
        };
      }
      
      // Actualizar el documento
      const actualizacion = {
        [campoArray]: registrosActualizados,
        [campoTotal]: totalActualizado,
        version: admin.firestore.FieldValue.increment(1),
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
      };
      
      transaction.update(crudoRef, actualizacion);
      
      // Escribir log de deshacer
      const undoLogRef = db.collection('asistenteLog').doc();
      transaction.set(undoLogRef, {
        tipo: 'deshacer-crudo',
        fecha,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        originalLogId: logSnap.id,
        originalTipo: tipo,
        originalRequest: logData.request,
        originalRow: rowOriginal,
        asistenteId: asistenteId,
        before: {
          [campoTotal]: diaData[campoTotal] || 0,
          [`num${esEntrada ? 'Entradas' : 'Salidas'}`]: registros.length
        },
        after: {
          [campoTotal]: totalActualizado,
          [`num${esEntrada ? 'Entradas' : 'Salidas'}`]: registrosActualizados.length
        },
        crudoId: crudoId,
        metodoEncontrado: metodoEncontrado
      });
      
      // Guardar idempotencia del undo (namespace separado con prefijo 'undo:')
      if (undoIdempotencyKey) {
        const undoIdemRef = db.collection('asistenteIdem').doc(`undo:${undoIdempotencyKey}`);
        transaction.set(undoIdemRef, {
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
    if (error.code) {
      return errorResponse(res, error.status || 500, error.code, error.message, error.details);
    }
    
    console.error('Error en POST /crudos/deshacer:', error);
    return errorResponse(res, 500, 'ERROR_INTERNO', 
      'Error inesperado al deshacer la operación: ' + error.message);
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

// =============================
// PEDIDOS LIMPIO - Calculation Logic
// =============================

/**
 * Factor de agua para medidas C/H20 (neto por defecto 65%).
 */
const AGUA_DEFAULT = 0.65;

const FACTORES_POR_TIPO = {
  '1.4': 1.4,
  '1.5': 1.5,
  '1.35 y .15': 1.35,
  '1.3 y .2': 1.3,
  '1.5 y .3': 1.5,
  '.7 y .3': 0.7,
  '.9 y .1': 0.9,
  '.9': 0.9
};

const KILOS_BASE_TARA_POR_TIPO = {
  '1.4': 20,
  '1.5': 20
};

const CLIENTES_CON_TARA_DE_27 = new Set(['otilio', 'catarro', 'temporal']);
const CLIENTES_FIJOS = ['otilio', 'catarro', 'joselito', 'lorena', 'ozuna'];

function numeroPositivo(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : 0;
}

function normalizarCliente(clienteId) {
  const cliente = String(clienteId || 'temporal').trim().toLowerCase();
  return CLIENTES_FIJOS.includes(cliente) ? cliente : 'temporal';
}

function factorAgua(item) {
  if (!item) return AGUA_DEFAULT;
  const valor = Number(item.agua);
  return Number.isFinite(valor) && valor > 0 ? valor : AGUA_DEFAULT;
}

function kilosPorTara(item, kilosDefault = 30) {
  const nota = String(item?.nota || '').trim().toLowerCase();
  return nota === 'sellado' ? 25 : kilosDefault;
}

function factorPorTipo(item) {
  const tipo = String(item?.tipo || '').trim();
  if (tipo === 'C/H20') return factorAgua(item);
  return FACTORES_POR_TIPO[tipo] || 1;
}

function calcularKilosItemPedidoLimpio(item) {
  const cantidad = numeroPositivo(item?.kilos);
  if (!cantidad) return 0;

  if (item?.esTara) {
    const tipo = String(item?.tipo || '').trim();
    if (KILOS_BASE_TARA_POR_TIPO[tipo]) {
      return cantidad * KILOS_BASE_TARA_POR_TIPO[tipo] * FACTORES_POR_TIPO[tipo];
    }

    const kilosBase = cantidad * kilosPorTara(item);
    return tipo === 'C/H20' ? kilosBase * factorAgua(item) : kilosBase;
  }

  return cantidad * factorPorTipo(item);
}

function calcularTarasItemPedidoLimpio(item, clienteId = 'temporal') {
  const cantidad = numeroPositivo(item?.kilos);
  if (!cantidad) return 0;
  if (item?.esTara) return cantidad;

  const tipo = String(item?.tipo || '').trim();
  if (tipo === 'C/H20') return 0;

  if (tipo === 'S/H20' || !tipo) {
    const cliente = normalizarCliente(clienteId);
    const kilosPorTaraSinAgua = CLIENTES_CON_TARA_DE_27.has(cliente) ? 27 : 25;
    return cantidad / kilosPorTaraSinAgua;
  }

  return cantidad / 25;
}

function calcularTotalesClientePedidoLimpio(items, clienteId = 'temporal') {
  const filas = Array.isArray(items) ? items : [];
  const kilos = filas.reduce((total, item) => total + calcularKilosItemPedidoLimpio(item), 0);
  const taras = filas.reduce(
    (total, item) => total + calcularTarasItemPedidoLimpio(item, clienteId),
    0
  );

  return {
    kilosTotal: Math.round(kilos),
    tarasTotal: Math.round(taras)
  };
}

function calcularTotalesPedidoLimpio(pedido) {
  if (!pedido || typeof pedido !== 'object') return { kilosTotal: 0, tarasTotal: 0 };

  const grupos = CLIENTES_FIJOS.map(clienteId => ({
    clienteId,
    items: pedido[clienteId]
  }));

  const temporales = pedido.clientesTemporales && typeof pedido.clientesTemporales === 'object'
    ? Object.values(pedido.clientesTemporales).map(cliente => ({
      clienteId: 'temporal',
      items: Array.isArray(cliente) ? cliente : cliente?.pedidos
    }))
    : [];

  return [...grupos, ...temporales].reduce((acumulado, grupo) => {
    const totales = calcularTotalesClientePedidoLimpio(grupo.items, grupo.clienteId);
    acumulado.kilosTotal += totales.kilosTotal;
    acumulado.tarasTotal += totales.tarasTotal;
    return acumulado;
  }, { kilosTotal: 0, tarasTotal: 0 });
}

// =============================
// PEDIDOS LIMPIO - Handlers
// =============================

/**
 * POST /pedidos/limpio
 * Crea o actualiza un pedido limpio con líneas por cliente.
 */
async function handlePostPedidosLimpio(req, res) {
  const {
    fecha,
    lineas = [],
    idempotencyKey,
    dryRun = false
  } = req.body;

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return errorResponse(res, 400, 'FECHA_INVALIDA', 
      'La fecha es requerida y debe estar en formato YYYY-MM-DD');
  }

  if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
    return errorResponse(res, 400, 'IDEMPOTENCY_KEY_REQUERIDA',
      'El campo idempotencyKey es requerido y debe ser único');
  }

  if (!Array.isArray(lineas) || lineas.length === 0) {
    return errorResponse(res, 400, 'LINEAS_REQUERIDAS',
      'Debe proporcionar al menos una línea en el campo lineas');
  }

  try {
    // Verificar idempotencia (sin importar dryRun)
    const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
    const idemSnap = await idemRef.get();
    
    if (idemSnap.exists) {
      const idemData = idemSnap.data();
      if (idemData.operation === 'pedidos_limpio_create' || idemData.operation === 'pedidos_limpio_update') {
        return res.json(idemData.response);
      }
    }

    // Validar medidas - handle duplicates: valid if ANY doc has tipo granja/especial
    const medidasSnapshot = await db.collection('medidas').get();
    const validMedidaNombres = new Set(); // Nombres válidos (case-insensitive)
    const medidaNombresMap = new Map(); // Map lowercase -> exact nombre for suggestions
    
    medidasSnapshot.forEach(doc => {
      const data = doc.data();
      const nombreKey = data.nombre.toLowerCase();
      
      // Track exact nombre (prefer granja/especial version if duplicates exist)
      if (!medidaNombresMap.has(nombreKey) || 
          data.tipo === 'granja' || data.tipo === 'especial') {
        medidaNombresMap.set(nombreKey, data.nombre);
      }
      
      // Mark as valid if ANY doc with this nombre has tipo granja/especial
      if (data.tipo === 'granja' || data.tipo === 'especial') {
        validMedidaNombres.add(nombreKey);
      }
    });

    // Agregar macuil y maquila especiales
    validMedidaNombres.add('macuil');
    validMedidaNombres.add('maquila');
    medidaNombresMap.set('macuil', 'macuil');
    medidaNombresMap.set('maquila', 'maquila');

    // Los botones de etiqueta viven en el pedido del día. Hay que conocerlos
    // antes de aceptar item.etiqueta.
    const pedidosExistentes = await db.collection('pedidos')
      .where('fecha', '==', fecha)
      .where('tipo', '==', 'limpio')
      .get();
    const etiquetasDisponibles = pedidosExistentes.empty
      ? []
      : (Array.isArray(pedidosExistentes.docs[0].data().etiquetas)
        ? pedidosExistentes.docs[0].data().etiquetas
        : []);

    const { errores, lineasNormalizadas, pedidoPorCliente } = construirLineasPedidoLimpio(lineas, {
      validMedidaNombres,
      medidaNombresMap,
      etiquetasDisponibles,
      generarAsistenteId
    });

    if (errores.length > 0) {
      return errorResponse(res, 400, 'VALIDACION_ERROR', 
        'Errores de validación en las líneas', { errores });
    }

    // Calcular totales
    const totales = calcularTotalesPedidoLimpio(pedidoPorCliente);

    // Preparar documento base (sin _asistenteId - solo para nuevos)
    const pedidoData = {
      fecha,
      tipo: 'limpio',
      otilio: pedidoPorCliente.otilio,
      catarro: pedidoPorCliente.catarro,
      joselito: pedidoPorCliente.joselito,
      ozuna: pedidoPorCliente.ozuna,
      lorena: pedidoPorCliente.lorena,
      clientesTemporales: pedidoPorCliente.clientesTemporales,
      etiquetas: [],
      etiquetasColores: {},
      rendimientos: {},
      divisores: {},
      completados: {},
      kilosRefrigerados: {}
    };

    if (dryRun) {
      return res.json({
        dryRun: true,
        document: {
          ...pedidoData,
          createdAt: new Date().toISOString()
        },
        totales: {
          taras: totales.tarasTotal,
          kilos: totales.kilosTotal
        }
      });
    }
    
    let pedidoId;
    let operation;
    let before = null;

    // Collect assistant line IDs for audit log
    const assistantLineIds = [];
    ['otilio', 'catarro', 'joselito', 'lorena', 'ozuna'].forEach(cliente => {
      pedidoPorCliente[cliente].forEach(item => {
        if (item._asistenteId) assistantLineIds.push(item._asistenteId);
      });
    });
    Object.values(pedidoPorCliente.clientesTemporales).forEach(clienteData => {
      const pedidos = Array.isArray(clienteData) ? clienteData : clienteData.pedidos;
      if (Array.isArray(pedidos)) {
        pedidos.forEach(item => {
          if (item._asistenteId) assistantLineIds.push(item._asistenteId);
        });
      }
    });

    if (!pedidosExistentes.empty) {
      // APPEND lines to existing document - ALL writes in ONE transaction
      const docExistente = pedidosExistentes.docs[0];
      pedidoId = docExistente.id;
      before = docExistente.data();
      operation = 'pedidos_limpio_update';
      
      // Use transaction for pedido update, audit log, and idempotency (all-or-nothing)
      await db.runTransaction(async (transaction) => {
        const pedidoRef = db.collection('pedidos').doc(pedidoId);
        const freshSnap = await transaction.get(pedidoRef);
        
        if (!freshSnap.exists) {
          throw { code: 'PEDIDO_ELIMINADO', message: 'El pedido fue eliminado durante la operación', status: 409 };
        }
        
        const currentData = freshSnap.data();
        const etiquetasFrescas = Array.isArray(currentData.etiquetas) ? currentData.etiquetas : [];
        const etiquetaFuera = lineasNormalizadas.find((linea) =>
          linea.etiqueta && !etiquetasFrescas.includes(linea.etiqueta)
        );
        if (etiquetaFuera) {
          throw {
            code: 'ETIQUETA_DESCONOCIDA',
            message: `La etiqueta "${etiquetaFuera.etiqueta}" ya no está entre los botones de este pedido`,
            status: 400,
            details: { disponibles: etiquetasFrescas }
          };
        }
        
        // APPEND assistant lines to existing arrays
        const updatedData = {
          otilio: [...(currentData.otilio || []), ...pedidoPorCliente.otilio],
          catarro: [...(currentData.catarro || []), ...pedidoPorCliente.catarro],
          joselito: [...(currentData.joselito || []), ...pedidoPorCliente.joselito],
          ozuna: [...(currentData.ozuna || []), ...pedidoPorCliente.ozuna],
          lorena: [...(currentData.lorena || []), ...pedidoPorCliente.lorena]
        };
        
        // Merge clientesTemporales
        const mergedTemporales = { ...(currentData.clientesTemporales || {}) };
        Object.keys(pedidoPorCliente.clientesTemporales).forEach(clienteId => {
          if (mergedTemporales[clienteId]) {
            // Append to existing
            const existing = mergedTemporales[clienteId];
            const newLines = pedidoPorCliente.clientesTemporales[clienteId];
            if (Array.isArray(existing)) {
              mergedTemporales[clienteId] = [...existing, ...(Array.isArray(newLines) ? newLines : newLines.pedidos)];
            } else if (existing.pedidos) {
              existing.pedidos = [...existing.pedidos, ...(Array.isArray(newLines) ? newLines : newLines.pedidos)];
            }
          } else {
            mergedTemporales[clienteId] = pedidoPorCliente.clientesTemporales[clienteId];
          }
        });
        updatedData.clientesTemporales = mergedTemporales;
        
        // DO NOT set document-level _asistenteId on existing docs
        // DO NOT increment version (UI doesn't use it, so we can't rely on it)
        
        transaction.update(pedidoRef, updatedData);
        
        // Write audit log in same transaction
        const logRef = db.collection('asistenteLog').doc();
        transaction.set(logRef, {
          operation,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          idempotencyKey,
          pedidoId,
          fecha,
          assistantLineIds, // Store line IDs (never undefined)
          before: currentData,
          addedLines: pedidoPorCliente, // Snapshot of what we added
          totales,
          request: {
            fecha,
            lineas: lineasNormalizadas
          }
        });
        
        // Write idempotency record in same transaction
        transaction.set(idemRef, {
          operation,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          response: {
            success: true,
            operation,
            pedidoId,
            fecha,
            totales: {
              taras: totales.tarasTotal,
              kilos: totales.kilosTotal
            }
          }
        });
      });
    } else {
      // Create new document - use transaction for audit + idempotency
      operation = 'pedidos_limpio_create';
      pedidoData.createdAt = admin.firestore.FieldValue.serverTimestamp();
      pedidoData.version = 1;
      const docLevelAsistenteId = generarAsistenteId(); // Only set on new docs
      pedidoData._asistenteId = docLevelAsistenteId;
      
      await db.runTransaction(async (transaction) => {
        const docRef = db.collection('pedidos').doc();
        pedidoId = docRef.id;
        
        transaction.set(docRef, pedidoData);
        
        // Write audit log in same transaction
        const logRef = db.collection('asistenteLog').doc();
        const afterData = { ...pedidoData };
        delete afterData.createdAt; // Remove FieldValue for serialization
        
        transaction.set(logRef, {
          operation,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          idempotencyKey,
          pedidoId,
          fecha,
          _asistenteId: docLevelAsistenteId, // Document-level ID for creates
          assistantLineIds, // Line-level IDs
          before: null,
          after: afterData,
          totales,
          request: {
            fecha,
            lineas: lineasNormalizadas
          }
        });
        
        // Write idempotency record in same transaction
        transaction.set(idemRef, {
          operation,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          response: {
            success: true,
            operation,
            pedidoId,
            fecha,
            totales: {
              taras: totales.tarasTotal,
              kilos: totales.kilosTotal
            }
          }
        });
      });
    }

    const response = {
      success: true,
      operation,
      pedidoId,
      fecha,
      totales: {
        taras: totales.tarasTotal,
        kilos: totales.kilosTotal
      }
    };

    return res.json(response);

  } catch (error) {
    if (error.code) {
      return errorResponse(res, error.status || 500, error.code, error.message, error.details);
    }
    
    console.error('Error en POST /pedidos/limpio:', error);
    return errorResponse(res, 500, 'ERROR_INTERNO', 
      'Error inesperado al procesar el pedido limpio: ' + error.message);
  }
}

/**
 * GET /pedidos/limpio?fecha=YYYY-MM-DD
 * Obtiene el pedido limpio de una fecha específica.
 */
async function handleGetPedidosLimpio(req, res) {
  const { fecha } = req.query;

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return errorResponse(res, 400, 'FECHA_INVALIDA', 
      'La fecha es requerida y debe estar en formato YYYY-MM-DD');
  }

  try {
    const pedidosSnapshot = await db.collection('pedidos')
      .where('fecha', '==', fecha)
      .where('tipo', '==', 'limpio')
      .get();

    if (pedidosSnapshot.empty) {
      return res.json({
        fecha,
        exists: false,
        pedido: null
      });
    }

    const doc = pedidosSnapshot.docs[0];
    const data = doc.data();
    const totales = calcularTotalesPedidoLimpio(data);

    return res.json({
      fecha,
      exists: true,
      pedido: {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null
      },
      totales: {
        taras: totales.tarasTotal,
        kilos: totales.kilosTotal
      }
    });

  } catch (error) {
    console.error('Error en GET /pedidos/limpio:', error);
    return errorResponse(res, 500, 'ERROR_INTERNO', 
      'Error inesperado al obtener el pedido limpio: ' + error.message);
  }
}

/**
 * POST /pedidos/limpio/deshacer
 * Deshace un pedido limpio creado por el asistente.
 */
async function handlePostPedidosLimpioDeshacer(req, res) {
  const {
    idempotencyKey: originalKey,
    id: pedidoId,
    undoIdempotencyKey,
    dryRun = false
  } = req.body;

  if (!originalKey && !pedidoId) {
    return errorResponse(res, 400, 'KEY_O_ID_REQUERIDO',
      'Debe proporcionar idempotencyKey o id del pedido a deshacer');
  }

  const lookupKey = originalKey || pedidoId;
  const undoKey = undoIdempotencyKey || `undo:${lookupKey}`;

  if (!undoKey || typeof undoKey !== 'string' || !undoKey.trim()) {
    return errorResponse(res, 400, 'UNDO_IDEMPOTENCY_KEY_REQUERIDA',
      'El campo idempotencyKey para el undo es requerido');
  }

  try {
    // Verificar idempotencia del undo
    const undoIdemRef = db.collection('asistenteIdem').doc(undoKey);
    const undoIdemSnap = await undoIdemRef.get();
    
    if (undoIdemSnap.exists) {
      return res.json(undoIdemSnap.data().response);
    }

    // Verificar si ya fue deshecho (antes de buscar el pedido)
    if (originalKey) {
      const undoLogSnapshot = await db.collection('asistenteLog')
        .where('operation', '==', 'pedidos_limpio_undo')
        .where('originalIdempotencyKey', '==', originalKey)
        .get();

      if (!undoLogSnapshot.empty) {
        const undoLog = undoLogSnapshot.docs[0].data();
        return errorResponse(res, 400, 'YA_DESHECHO',
          'Este pedido ya fue deshecho previamente', {
            undoneAt: undoLog.timestamp?.toDate?.()?.toISOString()
          });
      }
    }

    // Buscar el pedido a deshacer
    let pedidoRef;
    let pedidoSnap;
    let logEntry = null;

    if (originalKey) {
      // Buscar por idempotency key en audit log
      const logSnapshot = await db.collection('asistenteLog')
        .where('idempotencyKey', '==', originalKey)
        .where('operation', 'in', ['pedidos_limpio_create', 'pedidos_limpio_update'])
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      if (logSnapshot.empty) {
        return errorResponse(res, 404, 'PEDIDO_NO_ENCONTRADO',
          `No se encontró un pedido con idempotencyKey: ${originalKey}`);
      }

      logEntry = { id: logSnapshot.docs[0].id, ...logSnapshot.docs[0].data() };
      pedidoRef = db.collection('pedidos').doc(logEntry.pedidoId);
      pedidoSnap = await pedidoRef.get();
    } else {
      // Buscar por ID directo
      pedidoRef = db.collection('pedidos').doc(pedidoId);
      pedidoSnap = await pedidoRef.get();
    }

    if (!pedidoSnap.exists) {
      return errorResponse(res, 404, 'PEDIDO_NO_ENCONTRADO',
        'El pedido ya no existe o fue eliminado');
    }

    const pedidoData = pedidoSnap.data();

    // Determinar el tipo de operación original y los IDs a remover
    const operation = logEntry?.operation || 'pedidos_limpio_create';
    const assistantLineIds = logEntry?.assistantLineIds || [];
    const assistantIds = new Set(assistantLineIds);
    
    // For creates, also track doc-level _asistenteId
    if (operation === 'pedidos_limpio_create' && logEntry?._asistenteId) {
      assistantIds.add(logEntry._asistenteId);
    }
    
    // Store snapshot of original lines for verification
    const originalLines = logEntry?.addedLines || logEntry?.after;
    
    if (dryRun) {
      return res.json({
        dryRun: true,
        operation: operation === 'pedidos_limpio_create' ? 'delete_or_remove_lines' : 'remove_lines',
        pedidoId: pedidoSnap.id,
        assistantIdsToRemove: Array.from(assistantIds),
        wouldRemoveLineCount: assistantIds.size
      });
    }

    let response;
    let undoAction; // Track action for audit log

    // Use transaction to check for concurrent modifications
    await db.runTransaction(async (transaction) => {
      const freshSnap = await transaction.get(pedidoRef);
      
      if (!freshSnap.exists) {
        throw {
          code: 'PEDIDO_ELIMINADO',
          message: 'El pedido fue eliminado durante la operación de undo',
          status: 409
        };
      }
      
      const currentData = freshSnap.data();
      
      // Check if assistant's lines were modified/removed (works without UI version support)
      if (originalLines && assistantLineIds.length > 0) {
        // Collect current assistant lines and verify they match original snapshot
        const currentAssistantLines = [];
        ['otilio', 'catarro', 'joselito', 'lorena', 'ozuna'].forEach(cliente => {
          if (Array.isArray(currentData[cliente])) {
            currentData[cliente].forEach(item => {
              if (assistantIds.has(item._asistenteId)) {
                currentAssistantLines.push({ cliente, ...item });
              }
            });
          }
        });
        
        if (currentData.clientesTemporales) {
          Object.keys(currentData.clientesTemporales).forEach(clienteId => {
            const clienteTemp = currentData.clientesTemporales[clienteId];
            const pedidos = Array.isArray(clienteTemp) ? clienteTemp : clienteTemp?.pedidos;
            if (Array.isArray(pedidos)) {
              pedidos.forEach(item => {
                if (assistantIds.has(item._asistenteId)) {
                  currentAssistantLines.push({ cliente: clienteId, ...item });
                }
              });
            }
          });
        }
        
        // If count doesn't match, lines were removed/modified
        if (currentAssistantLines.length !== assistantLineIds.length) {
          throw {
            code: 'CONFLICT',
            message: 'Las líneas del asistente fueron modificadas o eliminadas. No se puede deshacer sin pérdida de datos.',
            status: 409,
            details: {
              expectedLineCount: assistantLineIds.length,
              currentLineCount: currentAssistantLines.length
            }
          };
        }
        
        // Verify each line hasn't been modified (compare key fields)
        if (originalLines) {
          for (const line of currentAssistantLines) {
            const originalClientLines = originalLines[line.cliente];
            if (!originalClientLines) continue;
            
            const originalLine = (Array.isArray(originalClientLines) ? originalClientLines : originalClientLines.pedidos || [])
              .find(ol => ol._asistenteId === line._asistenteId);
            
            if (originalLine) {
              // Compare key fields (kilos, medida, tipo can't change)
              if (originalLine.kilos !== line.kilos || 
                  originalLine.medida !== line.medida || 
                  originalLine.tipo !== line.tipo) {
                throw {
                  code: 'CONFLICT',
                  message: 'Las líneas del asistente fueron modificadas. No se puede deshacer sin pérdida de datos.',
                  status: 409,
                  details: {
                    modifiedLine: line._asistenteId
                  }
                };
              }
            }
          }
        }
      }
      
      // Decide: full delete or partial remove
      let isFullDelete = false;
      
      if (operation === 'pedidos_limpio_create') {
        // Check if doc ONLY contains this request's lines
        let totalLines = 0;
        let assistantLinesCount = 0;
        
        ['otilio', 'catarro', 'joselito', 'lorena', 'ozuna'].forEach(cliente => {
          if (Array.isArray(currentData[cliente])) {
            totalLines += currentData[cliente].length;
            assistantLinesCount += currentData[cliente].filter(item => assistantIds.has(item._asistenteId)).length;
          }
        });
        
        if (currentData.clientesTemporales) {
          Object.values(currentData.clientesTemporales).forEach(clienteTemp => {
            const pedidos = Array.isArray(clienteTemp) ? clienteTemp : clienteTemp?.pedidos;
            if (Array.isArray(pedidos)) {
              totalLines += pedidos.length;
              assistantLinesCount += pedidos.filter(item => assistantIds.has(item._asistenteId)).length;
            }
          });
        }
        
        // Only delete whole doc if it ONLY has assistant lines
        isFullDelete = (totalLines === assistantLinesCount && assistantLinesCount > 0);
      }

      if (isFullDelete) {
        // El documento solo contiene líneas del asistente - eliminarlo completamente
        transaction.delete(pedidoRef);
        undoAction = 'deleted_document';
        
        response = {
          success: true,
          operation: 'pedidos_limpio_undo',
          action: undoAction,
          pedidoId: freshSnap.id,
          fecha: currentData.fecha
        };
      } else {
        // Remover solo las líneas del asistente (doc tiene otras líneas)
        const updatedData = {};
        let removedCount = 0;
        
        // Filtrar líneas del asistente de cada cliente
        ['otilio', 'catarro', 'joselito', 'lorena', 'ozuna'].forEach(cliente => {
          if (Array.isArray(currentData[cliente])) {
            const filtered = currentData[cliente].filter(item => !assistantIds.has(item._asistenteId));
            removedCount += currentData[cliente].length - filtered.length;
            updatedData[cliente] = filtered;
          }
        });
        
        // Filtrar de clientes temporales
        if (currentData.clientesTemporales) {
          const mergedTemporales = { ...currentData.clientesTemporales };
          Object.keys(mergedTemporales).forEach(clienteId => {
            const clienteTemp = mergedTemporales[clienteId];
            const pedidos = Array.isArray(clienteTemp) ? clienteTemp : clienteTemp?.pedidos;
            
            if (Array.isArray(pedidos)) {
              const filtered = pedidos.filter(item => !assistantIds.has(item._asistenteId));
              removedCount += pedidos.length - filtered.length;
              
              if (Array.isArray(clienteTemp)) {
                mergedTemporales[clienteId] = filtered;
              } else if (clienteTemp?.pedidos) {
                mergedTemporales[clienteId].pedidos = filtered;
              }
            }
          });
          updatedData.clientesTemporales = mergedTemporales;
        }
        
        // Remover _asistenteId del documento principal si era del asistente
        if (currentData._asistenteId && assistantIds.has(currentData._asistenteId)) {
          updatedData._asistenteId = admin.firestore.FieldValue.delete();
        }
        
        // Actualizar el documento sin las líneas del asistente
        transaction.update(pedidoRef, updatedData);
        undoAction = 'removed_lines';
        
        response = {
          success: true,
          operation: 'pedidos_limpio_undo',
          action: undoAction,
          pedidoId: freshSnap.id,
          fecha: currentData.fecha,
          linesRemoved: removedCount
        };
      }
    });

    // Guardar audit log del undo
    await db.collection('asistenteLog').add({
      operation: 'pedidos_limpio_undo',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      undoIdempotencyKey: undoKey,
      originalIdempotencyKey: originalKey || null,
      originalOperation: operation,
      pedidoId: pedidoSnap.id,
      before: pedidoData,
      action: undoAction,
      assistantIdsRemoved: Array.from(assistantIds)
    });

    // Guardar idempotencia del undo
    await undoIdemRef.set({
      operation: 'pedidos_limpio_undo',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      response
    });

    return res.json(response);

  } catch (error) {
    if (error.code) {
      return errorResponse(res, error.status || 500, error.code, error.message, error.details);
    }
    
    console.error('Error en POST /pedidos/limpio/deshacer:', error);
    return errorResponse(res, 500, 'ERROR_INTERNO', 
      'Error inesperado al deshacer el pedido limpio: ' + error.message);
  }
}

// Export handlers for testing
const refrigeradosHandlers = crearHandlersRefrigerados({ db, errorResponse });
const abonosHandlers = crearHandlersAbonos({ db, admin, errorResponse });
const pedidosCrudoHandlers = crearHandlersPedidosCrudo({ db, admin, errorResponse, generarAsistenteId });
const preciosHandlers = crearHandlersPrecios({ db, admin, errorResponse });

if (process.env.NODE_ENV === 'test') {
  exports._testHandlers = {
    handlePostPedidosLimpio,
    handleGetPedidosLimpio,
    handlePostPedidosLimpioDeshacer,
    calcularTotalesClientePedidoLimpio,
    handlePostSalida,
    handlePostCrudosSalida,
    ...refrigeradosHandlers,
    ...abonosHandlers,
    ...pedidosCrudoHandlers,
    ...preciosHandlers
  };
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
    
    if (path === '/deshacer' && method === 'POST') {
      return handlePostDeshacer(req, res);
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
    
    if (path === '/crudos/deshacer' && method === 'POST') {
      return handlePostCrudosDeshacer(req, res);
    }
    
    if (path === '/pedidos/limpio/refrigerados' && method === 'GET') {
      return refrigeradosHandlers.handleGetPedidosLimpioRefrigerados(req, res);
    }
    if (path === '/pedidos/limpio/refrigerados' && method === 'POST') {
      return refrigeradosHandlers.handlePostPedidosLimpioRefrigerados(req, res);
    }

    // Rutas de pedidos limpio
    if (path === '/pedidos/limpio' && method === 'POST') {
      return handlePostPedidosLimpio(req, res);
    }
    
    if (path === '/pedidos/limpio' && method === 'GET') {
      return handleGetPedidosLimpio(req, res);
    }
    
    if (path === '/pedidos/limpio/deshacer' && method === 'POST') {
      return handlePostPedidosLimpioDeshacer(req, res);
    }

    if (path === '/pedidos/crudo/deshacer' && method === 'POST') {
      return pedidosCrudoHandlers.handlePostPedidosCrudoDeshacer(req, res);
    }

    if (path === '/pedidos/crudo' && method === 'POST') {
      return pedidosCrudoHandlers.handlePostPedidosCrudo(req, res);
    }

    if (path === '/pedidos/crudo' && method === 'GET') {
      return pedidosCrudoHandlers.handleGetPedidosCrudo(req, res);
    }

    if (path === '/abonos/deshacer' && method === 'POST') {
      return abonosHandlers.handlePostAbonosDeshacer(req, res);
    }

    if (path === '/abonos' && method === 'POST') {
      return abonosHandlers.handlePostAbonos(req, res);
    }

    if (path === '/abonos' && method === 'GET') {
      return abonosHandlers.handleGetAbonos(req, res);
    }

    if (path === '/precios' && method === 'POST') {
      return preciosHandlers.handlePostPrecios(req, res);
    }

    if (path === '/precios' && method === 'GET') {
      return preciosHandlers.handleGetPrecios(req, res);
    }
    
    return res.status(404).json({ 
      error: 'Ruta no encontrada. Rutas disponibles: GET /pedidos/limpio/refrigerados, POST /pedidos/limpio/refrigerados, POST /salida, POST /deshacer, GET /existencias, GET /dia, POST /crudos/entrada, POST /crudos/salida, POST /crudos/deshacer, GET /crudos/existencias, GET /crudos/dia, POST /pedidos/limpio, GET /pedidos/limpio, POST /pedidos/limpio/deshacer, POST /pedidos/crudo, GET /pedidos/crudo, POST /pedidos/crudo/deshacer, POST /abonos, GET /abonos, POST /abonos/deshacer, POST /precios, GET /precios'
    });
  }
);
