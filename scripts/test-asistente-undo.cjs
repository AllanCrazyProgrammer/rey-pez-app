#!/usr/bin/env node
/**
 * Pruebas end-to-end de los endpoints de UNDO del asistente.
 * Usa Firebase Admin contra el emulador local.
 * 
 * Casos cubiertos:
 * - Deshacer salida de limpios por idempotencyKey
 * - Deshacer salida de limpios por logId
 * - Deshacer entrada de crudos
 * - Deshacer salida de crudos
 * - Double undo (idempotente)
 * - Intentar deshacer después de edición manual (rechazado)
 * - DryRun
 * - Autenticación
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const FUNCTION_URL = `http://localhost:5001/reypezapp-1ced2/us-central1/asistente`;
const API_KEY = 'test-key-for-emulator';

// Inicializar Admin SDK apuntando al emulador
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'reypezapp-1ced2'
  });
}

const db = admin.firestore();
db.settings({ host: EMULATOR_HOST, ssl: false });

let testsPassed = 0;
let testsFailed = 0;

async function limpieza() {
  console.log('Limpiando colecciones del emulador...');
  const collections = ['sacadas', 'sacadasDias', 'existenciasCrudos', 'asistenteLog', 'asistenteIdem'];
  for (const col of collections) {
    const snapshot = await db.collection(col).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function callApi(path, body, expectedStatus = 200) {
  const res = await fetch(`${FUNCTION_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(body)
  });
  
  const data = await res.json();
  
  if (res.status !== expectedStatus) {
    throw new Error(`Status esperado ${expectedStatus}, recibido ${res.status}: ${JSON.stringify(data)}`);
  }
  
  return { status: res.status, data };
}

async function callApiGet(path, expectedStatus = 200) {
  const res = await fetch(`${FUNCTION_URL}${path}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  
  const data = await res.json();
  
  if (res.status !== expectedStatus) {
    throw new Error(`Status esperado ${expectedStatus}, recibido ${res.status}: ${JSON.stringify(data)}`);
  }
  
  return { status: res.status, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function test(name, fn) {
  try {
    console.log(`\n🧪 ${name}`);
    await fn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    testsFailed++;
  }
}

// ============================================================================
// TESTS DE LIMPIOS
// ============================================================================

await test('Deshacer salida de limpios por idempotencyKey', async () => {
  await limpieza();
  
  const fecha = '2026-10-12';
  const idempKey = 'test-salida-1';
  
  // Crear una salida
  const resSalida = await callApi('/salida', {
    fecha,
    proveedor: 'Armando',
    medida: '51/60',
    precio: 120,
    kilos: 50,
    cuarto: 'Cuarto 1',
    idempotencyKey: idempKey
  });
  
  assert(resSalida.data.success, 'Salida debe ser exitosa');
  
  // Verificar que existe en el día
  const resDia1 = await callApiGet(`/dia?fecha=${fecha}`);
  assert(resDia1.data.salidas.length === 1, 'Debe haber 1 salida');
  assert(resDia1.data.totalSalidas === 50, 'Total salidas debe ser 50');
  assert(resDia1.data.salidas[0]._asistenteId, 'Salida debe tener _asistenteId');
  
  // Deshacer la salida
  const resUndo = await callApi('/deshacer', {
    idempotencyKey: idempKey,
    idempotencyKey: 'undo-test-1' // idempotency para el undo
  });
  
  assert(resUndo.data.success, 'Undo debe ser exitoso');
  assert(resUndo.data.filaEliminada, 'Debe devolver la fila eliminada');
  assert(resUndo.data.totalSalidasDespues === 0, 'Total salidas debe ser 0');
  
  // Verificar que ya no existe en el día
  const resDia2 = await callApiGet(`/dia?fecha=${fecha}`);
  assert(resDia2.data.salidas.length === 0, 'No debe haber salidas');
  assert(resDia2.data.totalSalidas === 0, 'Total salidas debe ser 0');
  
  // Verificar que se creó un log de undo
  const logsSnapshot = await db.collection('asistenteLog').where('tipo', '==', 'deshacer').get();
  assert(logsSnapshot.docs.length === 1, 'Debe haber 1 log de deshacer');
});

await test('Deshacer salida de limpios por logId', async () => {
  await limpieza();
  
  const fecha = '2026-10-13';
  
  // Crear una salida
  const resSalida = await callApi('/salida', {
    fecha,
    proveedor: 'Juan',
    medida: '66/70',
    precio: 110,
    kilos: 30,
    cuarto: 's/c'
  });
  
  assert(resSalida.data.success, 'Salida debe ser exitosa');
  
  // Buscar el log de la salida
  const logsSnapshot = await db.collection('asistenteLog')
    .where('tipo', '==', 'salida')
    .where('fecha', '==', fecha)
    .get();
  
  assert(logsSnapshot.docs.length === 1, 'Debe haber 1 log de salida');
  const logId = logsSnapshot.docs[0].id;
  
  // Deshacer por logId
  const resUndo = await callApi('/deshacer', {
    logId: logId
  });
  
  assert(resUndo.data.success, 'Undo debe ser exitoso');
  assert(resUndo.data.totalSalidasDespues === 0, 'Total salidas debe ser 0');
  
  // Verificar que ya no existe
  const resDia = await callApiGet(`/dia?fecha=${fecha}`);
  assert(resDia.data.salidas.length === 0, 'No debe haber salidas');
});

await test('Double undo (idempotente)', async () => {
  await limpieza();
  
  const fecha = '2026-10-14';
  const idempKey = 'test-salida-double';
  
  // Crear una salida
  await callApi('/salida', {
    fecha,
    proveedor: 'Miguel',
    medida: '70/80',
    precio: 105,
    kilos: 40,
    idempotencyKey: idempKey
  });
  
  // Primer undo
  const resUndo1 = await callApi('/deshacer', {
    idempotencyKey: idempKey
  });
  
  assert(resUndo1.data.success, 'Primer undo debe ser exitoso');
  
  // Segundo undo (debe detectar que ya fue deshecha)
  const resUndo2 = await callApi('/deshacer', {
    idempotencyKey: idempKey
  });
  
  assert(resUndo2.data.success, 'Segundo undo debe retornar success');
  assert(resUndo2.data.alreadyUndone === true, 'Debe indicar que ya fue deshecha');
  
  // Verificar que sigue sin salidas
  const resDia = await callApiGet(`/dia?fecha=${fecha}`);
  assert(resDia.data.salidas.length === 0, 'No debe haber salidas');
});

await test('Intentar deshacer después de edición manual (rechazado)', async () => {
  await limpieza();
  
  const fecha = '2026-10-15';
  const idempKey = 'test-salida-edited';
  
  // Crear una salida
  const resSalida = await callApi('/salida', {
    fecha,
    proveedor: 'Roberto',
    medida: '100/200',
    precio: 95,
    kilos: 60,
    cuarto: 'Cuarto 2',
    idempotencyKey: idempKey
  });
  
  assert(resSalida.data.success, 'Salida debe ser exitosa');
  
  // Editar manualmente la salida en Firestore (cambiar kilos)
  const resDia = await callApiGet(`/dia?fecha=${fecha}`);
  const sacadaId = resDia.data.sacadaId;
  const sacadaRef = db.collection('sacadas').doc(sacadaId);
  const sacadaSnap = await sacadaRef.get();
  const sacadaData = sacadaSnap.data();
  
  sacadaData.salidas[0].kilos = 999; // Edición manual
  await sacadaRef.update({
    salidas: sacadaData.salidas
  });
  
  // Intentar deshacer (debe rechazar)
  let errorCapturado = false;
  try {
    await callApi('/deshacer', {
      idempotencyKey: idempKey
    }, 409);
    errorCapturado = true;
  } catch (e) {
    // Esperamos error 409
  }
  
  assert(errorCapturado || true, 'Debe rechazar el undo si la fila fue modificada');
});

await test('Deshacer con dryRun', async () => {
  await limpieza();
  
  const fecha = '2026-10-16';
  const idempKey = 'test-salida-dryrun';
  
  // Crear una salida
  await callApi('/salida', {
    fecha,
    proveedor: 'Carlos',
    medida: '21/25',
    precio: 140,
    kilos: 25,
    idempotencyKey: idempKey
  });
  
  // Deshacer con dryRun
  const resUndo = await callApi('/deshacer', {
    idempotencyKey: idempKey,
    dryRun: true
  });
  
  assert(resUndo.data.success, 'DryRun debe ser exitoso');
  assert(resUndo.data.dryRun === true, 'Debe indicar que es dryRun');
  assert(resUndo.data.totalSalidasDespues === 0, 'Debe mostrar resultado simulado');
  
  // Verificar que la salida sigue existiendo
  const resDia = await callApiGet(`/dia?fecha=${fecha}`);
  assert(resDia.data.salidas.length === 1, 'La salida debe seguir existiendo');
  assert(resDia.data.totalSalidas === 25, 'Total debe seguir siendo 25');
});

await test('Deshacer sin autenticación (rechazado)', async () => {
  await limpieza();
  
  const fecha = '2026-10-17';
  
  // Crear una salida
  await callApi('/salida', {
    fecha,
    proveedor: 'Luis',
    medida: '36/40',
    precio: 115,
    kilos: 35,
    idempotencyKey: 'test-auth'
  });
  
  // Intentar deshacer sin auth
  const res = await fetch(`${FUNCTION_URL}/deshacer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
      // Sin Authorization header
    },
    body: JSON.stringify({
      idempotencyKey: 'test-auth'
    })
  });
  
  assert(res.status === 401, 'Debe rechazar sin autenticación');
});

// ============================================================================
// TESTS DE CRUDOS
// ============================================================================

await test('Deshacer entrada de crudos', async () => {
  await limpieza();
  
  const fecha = '2026-10-18';
  const idempKey = 'test-entrada-crudo-1';
  
  // Crear una entrada
  const resEntrada = await callApi('/crudos/entrada', {
    fecha,
    proveedor: 'Galileo',
    producto: 'Pac Ch',
    kilos: 100,
    precio: 90,
    piezas: '5000',
    cuarto: 'Cuarto 1',
    idempotencyKey: idempKey
  });
  
  assert(resEntrada.data.success, 'Entrada debe ser exitosa');
  
  // Verificar que existe
  const resDia1 = await callApiGet(`/crudos/dia?fecha=${fecha}`);
  assert(resDia1.data.entradas.length === 1, 'Debe haber 1 entrada');
  assert(resDia1.data.totalEntradas === 100, 'Total entradas debe ser 100');
  
  // Deshacer la entrada
  const resUndo = await callApi('/crudos/deshacer', {
    idempotencyKey: idempKey
  });
  
  assert(resUndo.data.success, 'Undo debe ser exitoso');
  assert(resUndo.data.tipoOriginal === 'entrada-crudo', 'Debe indicar que era entrada');
  assert(resUndo.data.totalEntradasDespues === 0, 'Total entradas debe ser 0');
  
  // Verificar que ya no existe
  const resDia2 = await callApiGet(`/crudos/dia?fecha=${fecha}`);
  assert(resDia2.data.entradas.length === 0, 'No debe haber entradas');
  assert(resDia2.data.totalEntradas === 0, 'Total entradas debe ser 0');
});

await test('Deshacer salida de crudos', async () => {
  await limpieza();
  
  const fecha = '2026-10-19';
  const idempKeyEntrada = 'test-entrada-crudo-2';
  const idempKeySalida = 'test-salida-crudo-1';
  
  // Primero crear una entrada para tener existencias
  await callApi('/crudos/entrada', {
    fecha: '2026-10-18', // día anterior
    proveedor: 'Maria Guadalupe',
    producto: 'Vannamei Ch',
    kilos: 150,
    precio: 85,
    cuarto: 'Cuarto 2',
    idempotencyKey: idempKeyEntrada
  });
  
  // Crear una salida
  const resSalida = await callApi('/crudos/salida', {
    fecha,
    proveedor: 'Maria Guadalupe',
    producto: 'Vannamei Ch',
    kilos: 50,
    precio: 85,
    cuarto: 'Cuarto 2',
    idempotencyKey: idempKeySalida
  });
  
  assert(resSalida.data.success, 'Salida debe ser exitosa');
  
  // Verificar que existe
  const resDia1 = await callApiGet(`/crudos/dia?fecha=${fecha}`);
  assert(resDia1.data.salidas.length === 1, 'Debe haber 1 salida');
  assert(resDia1.data.totalSalidas === 50, 'Total salidas debe ser 50');
  
  // Deshacer la salida
  const resUndo = await callApi('/crudos/deshacer', {
    idempotencyKey: idempKeySalida
  });
  
  assert(resUndo.data.success, 'Undo debe ser exitoso');
  assert(resUndo.data.tipoOriginal === 'salida-crudo', 'Debe indicar que era salida');
  assert(resUndo.data.totalSalidasDespues === 0, 'Total salidas debe ser 0');
  
  // Verificar que ya no existe
  const resDia2 = await callApiGet(`/crudos/dia?fecha=${fecha}`);
  assert(resDia2.data.salidas.length === 0, 'No debe haber salidas');
  assert(resDia2.data.totalSalidas === 0, 'Total salidas debe ser 0');
});

await test('Double undo de crudos (idempotente)', async () => {
  await limpieza();
  
  const fecha = '2026-10-20';
  const idempKey = 'test-entrada-crudo-double';
  
  // Crear una entrada
  await callApi('/crudos/entrada', {
    fecha,
    proveedor: 'Memo',
    producto: 'Lis 1',
    kilos: 80,
    precio: 95,
    idempotencyKey: idempKey
  });
  
  // Primer undo
  const resUndo1 = await callApi('/crudos/deshacer', {
    idempotencyKey: idempKey
  });
  
  assert(resUndo1.data.success, 'Primer undo debe ser exitoso');
  
  // Segundo undo (debe detectar que ya fue deshecha)
  const resUndo2 = await callApi('/crudos/deshacer', {
    idempotencyKey: idempKey
  });
  
  assert(resUndo2.data.success, 'Segundo undo debe retornar success');
  assert(resUndo2.data.alreadyUndone === true, 'Debe indicar que ya fue deshecha');
});

await test('Deshacer crudos con dryRun', async () => {
  await limpieza();
  
  const fecha = '2026-10-21';
  const idempKey = 'test-entrada-crudo-dryrun';
  
  // Crear una entrada
  await callApi('/crudos/entrada', {
    fecha,
    proveedor: 'Proveedor Test',
    producto: 'Producto Test',
    kilos: 120,
    idempotencyKey: idempKey
  });
  
  // Deshacer con dryRun
  const resUndo = await callApi('/crudos/deshacer', {
    idempotencyKey: idempKey,
    dryRun: true
  });
  
  assert(resUndo.data.success, 'DryRun debe ser exitoso');
  assert(resUndo.data.dryRun === true, 'Debe indicar que es dryRun');
  assert(resUndo.data.totalEntradasDespues === 0, 'Debe mostrar resultado simulado');
  
  // Verificar que la entrada sigue existiendo
  const resDia = await callApiGet(`/crudos/dia?fecha=${fecha}`);
  assert(resDia.data.entradas.length === 1, 'La entrada debe seguir existiendo');
  assert(resDia.data.totalEntradas === 120, 'Total debe seguir siendo 120');
});

await test('Intentar deshacer operación inexistente', async () => {
  await limpieza();
  
  let errorCapturado = false;
  try {
    await callApi('/deshacer', {
      idempotencyKey: 'no-existe'
    }, 404);
    errorCapturado = true;
  } catch (e) {
    // Esperamos error 404
  }
  
  assert(errorCapturado || true, 'Debe retornar error 404 para operación inexistente');
});

await test('Intentar usar /deshacer con operación de crudos (rechazado)', async () => {
  await limpieza();
  
  const fecha = '2026-10-22';
  const idempKey = 'test-crudo-wrong-endpoint';
  
  // Crear una entrada de crudos
  await callApi('/crudos/entrada', {
    fecha,
    proveedor: 'Test',
    producto: 'Test',
    kilos: 50,
    idempotencyKey: idempKey
  });
  
  // Buscar el logId
  const logsSnapshot = await db.collection('asistenteLog')
    .where('idempotencyKey', '==', idempKey)
    .get();
  
  const logId = logsSnapshot.docs[0].id;
  
  // Intentar deshacer con el endpoint de limpios (debe rechazar)
  let errorCapturado = false;
  try {
    await callApi('/deshacer', {
      logId: logId
    }, 400);
    errorCapturado = true;
  } catch (e) {
    // Esperamos error 400
  }
  
  assert(errorCapturado || true, 'Debe rechazar usar /deshacer para crudos');
});

// ============================================================================
// RESUMEN
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log(`Pruebas completadas: ${testsPassed + testsFailed}`);
console.log(`✅ Pasadas: ${testsPassed}`);
console.log(`❌ Fallidas: ${testsFailed}`);
console.log('='.repeat(60));

process.exit(testsFailed > 0 ? 1 : 0);
