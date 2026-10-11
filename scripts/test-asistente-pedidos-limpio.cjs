#!/usr/bin/env node
/**
 * Test script para endpoints de pedidos limpio del Cloud Function asistente.
 * Ejecuta los handlers reales con firebase-admin + emulador de Firestore.
 * 
 * Uso:
 *   FIRESTORE_EMULATOR_JAR=path/to/jar node scripts/test-asistente-pedidos-limpio.cjs
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const projectId = 'demo-reypez-pedidos';

// Usar Admin SDK desde functions/node_modules
const admin = require(path.join(root, 'functions', 'node_modules', 'firebase-admin'));

let testsPassed = 0;
let testsFailed = 0;

async function puertoLibre() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

// Helper para simular req/res y llamar al handler directamente
function mockRequest(method, path, headers = {}, body = null) {
  const url = new URL(path, 'http://localhost:5001');
  return {
    method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers,
    body: body || {}
  };
}

function mockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    }
  };
  return res;
}

async function callHandler(method, path, body = null) {
  const req = mockRequest(method, path, { authorization: 'Bearer test-key' }, body);
  const res = mockResponse();
  
  // Call the exported asistente function
  const { asistente } = require(path.join(root, 'functions', 'asistente.js'));
  await asistente(req, res);
  
  return { status: res.statusCode, body: res.body };
}

async function run() {
  // Check that FIRESTORE_EMULATOR_JAR is set
  const jar = process.env.FIRESTORE_EMULATOR_JAR;
  if (!jar || !fs.existsSync(jar)) {
    console.error('❌ ERROR: Este script requiere FIRESTORE_EMULATOR_HOST estar configurado.');
    console.error('   Configura FIRESTORE_EMULATOR_JAR con el JAR del emulador de Firestore.');
    console.error('   Ejemplo: FIRESTORE_EMULATOR_JAR=~/.cache/firebase/emulators/cloud-firestore-emulator-v1.19.8.jar');
    process.exit(1);
  }
  
  const port = await puertoLibre();
  const emulator = spawn('java', [
    '-jar', jar,
    '--host', '127.0.0.1',
    '--port', String(port),
    '--project_id', projectId,
    '--single_project_mode',
    '--single_project_mode_error',
    '--rules', path.join(__dirname, 'fixtures/sacadas-emulator.rules')
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  
  let log = '';
  emulator.stdout.on('data', chunk => { log = (log + chunk).slice(-8000); });
  emulator.stderr.on('data', chunk => { log = (log + chunk).slice(-8000); });
  
  let app; let db;
  try {
    // Esperar a que el emulador esté listo
    let listo = false;
    for (let i = 0; i < 150; i++) {
      if (emulator.exitCode !== null) throw new Error(log);
      try { 
        await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(200) }); 
        listo = true; 
        break; 
      } catch (_) { 
        await new Promise(resolve => setTimeout(resolve, 100)); 
      }
    }
    assert.ok(listo, 'El emulador no inició: ' + log);
    
    // Inicializar Admin SDK con el emulador
    process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${port}`;
    process.env.GCLOUD_PROJECT = projectId;
    
    app = admin.initializeApp({
      projectId
    }, 'pedidos-test-admin');
    
    db = admin.firestore(app);
    
    console.log('✓ Emulador iniciado y Admin SDK configurado');
    
    // Setup: Create medidas in Firestore
    console.log('✓ Configurando medidas...');
    const medidas = [
      { nombre: '51/60', tipo: 'granja' },
      { nombre: '36/40', tipo: 'granja' },
      { nombre: '41/50', tipo: 'especial' },
      { nombre: '26/30', tipo: 'granja' }
    ];
    
    for (const medida of medidas) {
      await db.collection('medidas').add(medida);
    }
    console.log('✓ Medidas configuradas');
    
    // Mock the secret for auth
    process.env.ASISTENTE_API_KEY = 'test-key';
    
    // ========================================================================
    // TESTS
    // ========================================================================
    
    // Test 1: DryRun con caso del usuario (Otilio, 20 taras 51/60 s/h2o + 12 taras 36/40 c/h2o = 32T/834kg)
    console.log('\n📝 Test: POST /pedidos/limpio con dryRun');
    let response = await callHandler('POST', '/pedidos/limpio', {
      fecha: '2026-10-11',
      idempotencyKey: 'test-dry-run-' + Date.now(),
      dryRun: true,
      lineas: [
        { cliente: 'otilio', cantidad: 20, unidad: 'taras', medida: '51/60', tipo: 'S/H20' },
        { cliente: 'otilio', cantidad: 12, unidad: 'taras', medida: '36/40', tipo: 'C/H20' }
      ]
    });
    assert.equal(response.status, 200, 'Status debe ser 200');
    assert.equal(response.body.dryRun, true, 'dryRun debe ser true');
    assert.ok(response.body.document, 'Debe incluir document');
    assert.ok(response.body.totales, 'Debe incluir totales');
    assert.equal(response.body.totales.taras, 32, 'Total taras debe ser 32');
    assert.equal(response.body.totales.kilos, 834, 'Total kilos debe ser 834');
    console.log('✅ Test dryRun exitoso - Totales:', response.body.totales);
    testsPassed++;
    
    // Test 2: Crear pedido
    console.log('\n📝 Test: POST /pedidos/limpio - crear pedido');
    const createKey = 'test-create-' + Date.now();
    const fecha1 = '2026-10-12';
    response = await callHandler('POST', '/pedidos/limpio', {
      fecha: fecha1,
      idempotencyKey: createKey,
      lineas: [
        { cliente: 'catarro', cantidad: 10, unidad: 'taras', medida: '51/60', tipo: 'S/H20' },
        { cliente: 'joselito', cantidad: 15, unidad: 'kg', medida: '36/40', tipo: '' }
      ]
    });
    assert.equal(response.status, 200, 'Status debe ser 200');
    assert.ok(response.body.success, 'success debe ser true');
    assert.equal(response.body.operation, 'pedidos_limpio_create', 'operation debe ser create');
    assert.ok(response.body.pedidoId, 'Debe incluir pedidoId');
    console.log('✅ Pedido creado - ID:', response.body.pedidoId);
    testsPassed++;
    const pedidoId1 = response.body.pedidoId;
    
    // Test 3: GET pedido
    console.log('\n📝 Test: GET /pedidos/limpio');
    response = await callHandler('GET', `/pedidos/limpio?fecha=${fecha1}`);
    assert.equal(response.status, 200, 'Status debe ser 200');
    assert.ok(response.body.exists, 'exists debe ser true');
    assert.ok(response.body.pedido, 'Debe incluir pedido');
    assert.equal(response.body.pedido.fecha, fecha1, 'Fecha debe coincidir');
    console.log('✅ Pedido obtenido - ID:', response.body.pedido.id);
    testsPassed++;
    
    // Test 4: Idempotencia
    console.log('\n📝 Test: Idempotencia - misma key devuelve misma respuesta');
    response = await callHandler('POST', '/pedidos/limpio', {
      fecha: fecha1,
      idempotencyKey: createKey,
      lineas: [
        { cliente: 'lorena', cantidad: 999, unidad: 'taras', medida: '51/60', tipo: 'S/H20' }
      ]
    });
    assert.equal(response.status, 200, 'Status debe ser 200');
    assert.ok(response.body.success, 'success debe ser true');
    assert.equal(response.body.operation, 'pedidos_limpio_create', 'Debe devolver la respuesta original');
    console.log('✅ Idempotencia funcionando');
    testsPassed++;
    
    // Test 5: Validación de medida inválida
    console.log('\n📝 Test: Validación de medida inválida');
    response = await callHandler('POST', '/pedidos/limpio', {
      fecha: '2026-10-13',
      idempotencyKey: 'test-validacion-' + Date.now(),
      lineas: [
        { cliente: 'otilio', cantidad: 10, unidad: 'taras', medida: 'MEDIDA_INEXISTENTE_123', tipo: 'S/H20' }
      ]
    });
    assert.equal(response.status, 400, 'Status debe ser 400');
    assert.ok(response.body.error, 'Debe incluir error');
    assert.equal(response.body.error.code, 'VALIDACION_ERROR', 'Código debe ser VALIDACION_ERROR');
    console.log('✅ Validación de medida funcionando');
    testsPassed++;
    
    // Test 6: APPEND - agregar líneas a pedido existente de UI
    console.log('\n📝 Test: APPEND - agregar líneas a pedido existente (UI)');
    const fecha2 = '2026-10-17';
    const uiDocRef = await db.collection('pedidos').add({
      fecha: fecha2,
      tipo: 'limpio',
      otilio: [{
        kilos: 5,
        esTara: true,
        medida: '51/60',
        tipo: 'S/H20',
        nota: '',
        esProveedor: false,
        proveedor: '',
        etiqueta: ''
        // Sin _asistenteId = creado por UI
      }],
      catarro: [],
      joselito: [],
      ozuna: [],
      lorena: [],
      clientesTemporales: {},
      etiquetas: [],
      etiquetasColores: {},
      rendimientos: {},
      divisores: {},
      completados: {},
      kilosRefrigerados: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      version: 1
    });
    
    const appendKey = 'test-append-' + Date.now();
    response = await callHandler('POST', '/pedidos/limpio', {
      fecha: fecha2,
      idempotencyKey: appendKey,
      lineas: [
        { cliente: 'otilio', cantidad: 10, unidad: 'taras', medida: '36/40', tipo: 'C/H20' },
        { cliente: 'catarro', cantidad: 8, unidad: 'taras', medida: '51/60', tipo: 'S/H20' }
      ]
    });
    assert.equal(response.status, 200, 'Agregar líneas debe ser exitoso');
    assert.equal(response.body.operation, 'pedidos_limpio_update', 'Debe ser update');
    
    const afterAppend = await db.collection('pedidos').doc(uiDocRef.id).get();
    const afterAppendData = afterAppend.data();
    assert.equal(afterAppendData.otilio.length, 2, 'Debe tener 2 líneas en otilio (1 UI + 1 asistente)');
    assert.equal(afterAppendData.catarro.length, 1, 'Debe tener 1 línea en catarro (asistente)');
    assert.ok(!afterAppendData._asistenteId, 'NO debe tener _asistenteId a nivel documento (solo en líneas)');
    console.log('✅ APPEND funcionando - líneas UI preservadas');
    testsPassed++;
    
    // Test 7: Partial undo - remover solo líneas del asistente
    console.log('\n📝 Test: Partial undo - remover solo líneas del asistente');
    response = await callHandler('POST', '/pedidos/limpio/deshacer', {
      idempotencyKey: appendKey,
      undoIdempotencyKey: 'test-undo-partial-' + Date.now()
    });
    assert.equal(response.status, 200, 'Undo debe ser exitoso');
    assert.equal(response.body.action, 'removed_lines', 'Debe ser removed_lines');
    assert.equal(response.body.linesRemoved, 2, 'Debe remover 2 líneas');
    
    const afterUndo = await db.collection('pedidos').doc(uiDocRef.id).get();
    const afterUndoData = afterUndo.data();
    assert.equal(afterUndoData.otilio.length, 1, 'Debe quedar 1 línea en otilio (UI)');
    assert.equal(afterUndoData.catarro.length, 0, 'Catarro debe estar vacío');
    assert.equal(afterUndoData.otilio[0].kilos, 5, 'La línea UI debe conservar sus valores');
    assert.ok(!afterUndoData.otilio[0]._asistenteId, 'La línea UI no debe tener _asistenteId');
    console.log('✅ Partial undo funcionando - líneas UI preservadas');
    testsPassed++;
    
    await db.collection('pedidos').doc(uiDocRef.id).delete();
    
    // Test 8: Full undo - eliminar documento completo
    console.log('\n📝 Test: Full undo - eliminar documento completo creado por asistente');
    const fullKey = 'test-full-' + Date.now();
    const fecha3 = '2026-10-18';
    response = await callHandler('POST', '/pedidos/limpio', {
      fecha: fecha3,
      idempotencyKey: fullKey,
      lineas: [
        { cliente: 'ozuna', cantidad: 10, unidad: 'taras', medida: '51/60', tipo: 'S/H20' }
      ]
    });
    assert.equal(response.status, 200, 'Crear debe ser exitoso');
    const pedidoId3 = response.body.pedidoId;
    
    response = await callHandler('POST', '/pedidos/limpio/deshacer', {
      idempotencyKey: fullKey,
      undoIdempotencyKey: 'test-undo-full-' + Date.now()
    });
    assert.equal(response.status, 200, 'Undo debe ser exitoso');
    assert.equal(response.body.action, 'deleted_document', 'Debe ser deleted_document');
    
    const deleted = await db.collection('pedidos').doc(pedidoId3).get();
    assert.ok(!deleted.exists, 'Documento debe estar eliminado');
    console.log('✅ Full undo funcionando - documento eliminado');
    testsPassed++;
    
    // Test 9: Double undo - debe retornar YA_DESHECHO
    console.log('\n📝 Test: Double undo - debe retornar YA_DESHECHO');
    response = await callHandler('POST', '/pedidos/limpio/deshacer', {
      idempotencyKey: fullKey,
      undoIdempotencyKey: 'test-undo-double-' + Date.now()
    });
    assert.equal(response.status, 400, 'Status debe ser 400');
    assert.ok(response.body.error, 'Debe incluir error');
    assert.equal(response.body.error.code, 'YA_DESHECHO', 'Código debe ser YA_DESHECHO');
    console.log('✅ Double undo protección funcionando');
    testsPassed++;
    
    // Test 10: Concurrent edit detection with version checking
    console.log('\n📝 Test: Concurrent edit detection (version conflict)');
    const fecha4 = '2026-10-19';
    const concurrentKey = 'test-concurrent-' + Date.now();
    
    // Create a pedido with UI
    const concurrentDocRef = await db.collection('pedidos').add({
      fecha: fecha4,
      tipo: 'limpio',
      otilio: [{
        kilos: 5,
        esTara: true,
        medida: '51/60',
        tipo: 'S/H20',
        nota: '',
        esProveedor: false,
        proveedor: '',
        etiqueta: ''
      }],
      catarro: [],
      joselito: [],
      ozuna: [],
      lorena: [],
      clientesTemporales: {},
      etiquetas: [],
      etiquetasColores: {},
      rendimientos: {},
      divisores: {},
      completados: {},
      kilosRefrigerados: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      version: 1
    });
    
    // Assistant adds lines
    response = await callHandler('POST', '/pedidos/limpio', {
      fecha: fecha4,
      idempotencyKey: concurrentKey,
      lineas: [
        { cliente: 'catarro', cantidad: 10, unidad: 'taras', medida: '51/60', tipo: 'S/H20' }
      ]
    });
    assert.equal(response.status, 200, 'Primera update debe ser exitosa');
    
    // Simulate UI editing the document (change version)
    await db.collection('pedidos').doc(concurrentDocRef.id).update({
      otilio: admin.firestore.FieldValue.arrayUnion({
        kilos: 20,
        esTara: true,
        medida: '36/40',
        tipo: '',
        nota: '',
        esProveedor: false,
        proveedor: '',
        etiqueta: ''
      }),
      version: admin.firestore.FieldValue.increment(1)
    });
    
    // Try to undo - should detect version conflict
    response = await callHandler('POST', '/pedidos/limpio/deshacer', {
      idempotencyKey: concurrentKey,
      undoIdempotencyKey: 'test-undo-concurrent-' + Date.now()
    });
    assert.equal(response.status, 409, 'Debe retornar 409 por version conflict');
    assert.ok(response.body.error, 'Debe incluir error');
    assert.equal(response.body.error.code, 'VERSION_CONFLICT', 'Código debe ser VERSION_CONFLICT');
    console.log('✅ Concurrent edit detection funcionando - rechaza con 409');
    testsPassed++;
    
    await db.collection('pedidos').doc(concurrentDocRef.id).delete();
    
    // Test 11: Verify agua field is set for C/H20 lines
    console.log('\n📝 Test: Verificar campo agua en líneas C/H20');
    const aguaKey = 'test-agua-' + Date.now();
    const fecha5 = '2026-10-20';
    response = await callHandler('POST', '/pedidos/limpio', {
      fecha: fecha5,
      idempotencyKey: aguaKey,
      lineas: [
        { cliente: 'otilio', cantidad: 10, unidad: 'taras', medida: '36/40', tipo: 'C/H20' }
      ]
    });
    assert.equal(response.status, 200, 'Crear debe ser exitoso');
    
    const aguaDoc = await db.collection('pedidos').doc(response.body.pedidoId).get();
    const aguaData = aguaDoc.data();
    assert.ok(aguaData.otilio[0].agua !== undefined, 'Línea C/H20 debe tener campo agua');
    assert.equal(aguaData.otilio[0].agua, 0.65, 'Campo agua debe ser 0.65 por defecto');
    console.log('✅ Campo agua en C/H20 funcionando - valor:', aguaData.otilio[0].agua);
    testsPassed++;
    
    await db.collection('pedidos').doc(response.body.pedidoId).delete();
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Todos los tests pasaron! (${testsPassed} tests exitosos)`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error(`❌ Tests fallaron`);
    console.error('='.repeat(60));
    console.error('\nError:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (app) await app.delete();
    if (emulator && emulator.exitCode === null) emulator.kill();
  }
}

run().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
