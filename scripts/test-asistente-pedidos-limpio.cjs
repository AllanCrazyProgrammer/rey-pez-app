#!/usr/bin/env node
/**
 * Test script para endpoints de pedidos limpio - calls REAL handlers.
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

const admin = require(path.join(root, 'functions', 'node_modules', 'firebase-admin'));

let testsPassed = 0;
let testsFailed = 0;

function mockRequest(method, path, body = {}) {
  const url = new URL(path, 'http://localhost:5001');
  return {
    method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: { authorization: 'Bearer test-key' },
    body
  };
}

function mockResponse() {
  return {
    statusCode: 200,
    _body: null,
    _headers: {},
    status(code) { this.statusCode = code; return this; },
    json(data) { this._body = data; return this; },
    send(data) { this._body = data; return this; },
    setHeader(key, val) { this._headers[key] = val; return this; }
  };
}

async function callHandler(handlerFn, method, path, body) {
  const req = mockRequest(method, path, body);
  const res = mockResponse();
  await handlerFn(req, res);
  return { status: res.statusCode, body: res._body };
}

async function puertoLibre() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function run() {
  const jar = process.env.FIRESTORE_EMULATOR_JAR;
  if (!jar || !fs.existsSync(jar)) {
    console.error('❌ ERROR: FIRESTORE_EMULATOR_JAR no está configurado o no existe.');
    console.error('   Ejemplo: FIRESTORE_EMULATOR_JAR=~/.cache/firebase/emulators/cloud-firestore-emulator-v1.22.0.jar');
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
  
  let app; let db; let handlers;
  try {
    // Esperar emulador
    let listo = false;
    for (let i = 0; i < 150; i++) {
      if (emulator.exitCode !== null) throw new Error(log);
      try { 
        await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(200) }); 
        listo = true;
        break;
      } catch {}
      await new Promise(r => setTimeout(r, 100));
    }
    if (!listo) throw new Error('Emulador no respondió');
    
    // Configurar Admin SDK
    app = admin.initializeApp({ projectId }, 'pedidos-tests');
    db = app.firestore();
    db.settings({ host: `127.0.0.1:${port}`, ssl: false });
    
    console.log('✓ Emulador y Admin SDK listos');
    
    // Setup medidas - include duplicates to test production scenario
    console.log('✓ Configurando medidas...');
    const medidas = [
      { nombre: '51/60', tipo: 'granja' },
      { nombre: '51/60', tipo: 'general' }, // Duplicate with different tipo
      { nombre: '36/40', tipo: 'granja' },
      { nombre: '36/40', tipo: 'general' }, // Duplicate with different tipo
      { nombre: '41/50', tipo: 'especial' },
      { nombre: '26/30', tipo: 'granja' }
    ];
    for (const medida of medidas) {
      await db.collection('medidas').add(medida);
    }
    console.log('✓ Medidas configuradas (con duplicados tipo granja + general)');
    
    // Set up env for handlers
    process.env.NODE_ENV = 'test';
    process.env.ASISTENTE_API_KEY = 'test-key';
    process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${port}`;
    process.env.GCLOUD_PROJECT = projectId;
    
    // Load handlers
    delete require.cache[path.join(root, 'functions', 'asistente.js')];
    handlers = require(path.join(root, 'functions', 'asistente.js'))._testHandlers;
    assert.ok(handlers, 'Handlers no exportados');
    console.log('✓ Handlers cargados');
    
    // ========================================================================
    // TEST 1: Create + undo
    // ========================================================================
    
    console.log('\n📝 Test 1: Create + undo');
    const key1 = 'test-create-' + Date.now();
    let res = await callHandler(handlers.handlePostPedidosLimpio, 'POST', '/pedidos/limpio', {
      fecha: '2026-10-11',
      idempotencyKey: key1,
      lineas: [
        { cliente: 'otilio', cantidad: 20, unidad: 'taras', medida: '51/60', tipo: 'S/H20' },
        { cliente: 'otilio', cantidad: 12, unidad: 'taras', medida: '36/40', tipo: 'C/H20' }
      ]
    });
    assert.equal(res.status, 200, 'Create debe retornar 200');
    assert.ok(res.body.success, 'Create debe ser exitoso');
    assert.equal(res.body.operation, 'pedidos_limpio_create', 'Debe ser create');
    const pedidoId1 = res.body.pedidoId;
    console.log('  ✓ Pedido creado:', pedidoId1);
    testsPassed++;
    
    // Verify audit log and idempotency were saved
    const idemSnap1 = await db.collection('asistenteIdem').doc(key1).get();
    assert.ok(idemSnap1.exists, 'Idempotency record debe existir');
    const logSnap1 = await db.collection('asistenteLog').where('idempotencyKey', '==', key1).get();
    assert.ok(!logSnap1.empty, 'Audit log debe existir');
    console.log('  ✓ Audit log e idempotency guardados');
    testsPassed++;
    
    // Undo
    res = await callHandler(handlers.handlePostPedidosLimpioDeshacer, 'POST', '/pedidos/limpio/deshacer', {
      idempotencyKey: key1,
      undoIdempotencyKey: 'undo-' + key1
    });
    assert.equal(res.status, 200, 'Undo debe retornar 200');
    assert.equal(res.body.action, 'deleted_document', 'Debe eliminar documento completo');
    const deletedSnap = await db.collection('pedidos').doc(pedidoId1).get();
    assert.ok(!deletedSnap.exists, 'Documento debe estar eliminado');
    console.log('  ✓ Undo eliminó documento completo');
    testsPassed++;
    
    // ========================================================================
    // TEST 2: Double undo returns 400 YA_DESHECHO
    // ========================================================================
    
    console.log('\n📝 Test 2: Double undo -> 400 YA_DESHECHO');
    res = await callHandler(handlers.handlePostPedidosLimpioDeshacer, 'POST', '/pedidos/limpio/deshacer', {
      idempotencyKey: key1,
      undoIdempotencyKey: 'undo-double-' + Date.now()
    });
    assert.equal(res.status, 400, 'Double undo debe retornar 400');
    assert.equal(res.body.error.code, 'YA_DESHECHO', 'Debe ser YA_DESHECHO');
    console.log('  ✓ Double undo rechazado correctamente');
    testsPassed++;
    
    // ========================================================================
    // TEST 3: Append to UI pedido - keeps UI lines, no doc tag, 200, audit saved
    // ========================================================================
    
    console.log('\n📝 Test 3: Append to UI pedido');
    const fecha3 = '2026-10-12';
    const uiDocRef = await db.collection('pedidos').add({
      fecha: fecha3,
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
        // Sin _asistenteId
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
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('  ✓ Pedido UI creado:', uiDocRef.id);
    
    const key3 = 'test-append-' + Date.now();
    res = await callHandler(handlers.handlePostPedidosLimpio, 'POST', '/pedidos/limpio', {
      fecha: fecha3,
      idempotencyKey: key3,
      lineas: [
        { cliente: 'otilio', cantidad: 10, unidad: 'taras', medida: '36/40', tipo: 'C/H20' },
        { cliente: 'catarro', cantidad: 8, unidad: 'taras', medida: '51/60', tipo: 'S/H20' }
      ]
    });
    assert.equal(res.status, 200, 'Append debe retornar 200');
    assert.ok(res.body.success, 'Append debe ser exitoso');
    assert.equal(res.body.operation, 'pedidos_limpio_update', 'Debe ser update');
    console.log('  ✓ Append exitoso (200)');
    testsPassed++;
    
    // Verify audit + idempotency saved
    const idemSnap3 = await db.collection('asistenteIdem').doc(key3).get();
    assert.ok(idemSnap3.exists, 'Idempotency record debe existir para append');
    const logSnap3 = await db.collection('asistenteLog').where('idempotencyKey', '==', key3).get();
    assert.ok(!logSnap3.empty, 'Audit log debe existir para append');
    console.log('  ✓ Audit log e idempotency guardados');
    testsPassed++;
    
    // Verify UI lines preserved + no doc-level _asistenteId
    const afterAppend = await uiDocRef.get();
    const afterAppendData = afterAppend.data();
    assert.equal(afterAppendData.otilio.length, 2, 'Debe tener 2 líneas en otilio');
    assert.equal(afterAppendData.catarro.length, 1, 'Debe tener 1 línea en catarro');
    assert.ok(!afterAppendData._asistenteId, 'NO debe tener _asistenteId a nivel documento');
    console.log('  ✓ Líneas UI preservadas, sin doc-level tag');
    testsPassed++;
    
    // ========================================================================
    // TEST 4: Retry with same key does NOT duplicate
    // ========================================================================
    
    console.log('\n📝 Test 4: Retry con misma key no duplica');
    res = await callHandler(handlers.handlePostPedidosLimpio, 'POST', '/pedidos/limpio', {
      fecha: fecha3,
      idempotencyKey: key3,
      lineas: [
        { cliente: 'lorena', cantidad: 999, unidad: 'taras', medida: '51/60', tipo: 'S/H20' }
      ]
    });
    assert.equal(res.status, 200, 'Retry debe retornar 200');
    assert.equal(res.body.operation, 'pedidos_limpio_update', 'Debe devolver respuesta original');
    
    const afterRetry = await uiDocRef.get();
    const afterRetryData = afterRetry.data();
    assert.equal(afterRetryData.otilio.length, 2, 'No debe duplicar (otilio)');
    assert.equal(afterRetryData.catarro.length, 1, 'No debe duplicar (catarro)');
    assert.equal(afterRetryData.lorena.length, 0, 'No debe agregar Lorena');
    console.log('  ✓ Retry no duplicó líneas');
    testsPassed++;
    
    // ========================================================================
    // TEST 5: Partial undo removes only assistant lines
    // ========================================================================
    
    console.log('\n📝 Test 5: Partial undo remueve solo líneas del asistente');
    res = await callHandler(handlers.handlePostPedidosLimpioDeshacer, 'POST', '/pedidos/limpio/deshacer', {
      idempotencyKey: key3,
      undoIdempotencyKey: 'undo-' + key3
    });
    assert.equal(res.status, 200, 'Partial undo debe retornar 200');
    assert.equal(res.body.action, 'removed_lines', 'Debe ser removed_lines');
    assert.equal(res.body.linesRemoved, 2, 'Debe remover 2 líneas');
    
    const afterUndo = await uiDocRef.get();
    const afterUndoData = afterUndo.data();
    assert.equal(afterUndoData.otilio.length, 1, 'Debe quedar 1 línea en otilio (UI)');
    assert.equal(afterUndoData.catarro.length, 0, 'Catarro debe estar vacío');
    assert.equal(afterUndoData.otilio[0].kilos, 5, 'Línea UI debe conservar valores');
    console.log('  ✓ Partial undo preservó líneas UI');
    testsPassed++;
    
    await uiDocRef.delete();
    
    // ========================================================================
    // TEST 6: Assistant-created doc + later UI line -> undo keeps UI line
    // ========================================================================
    
    console.log('\n📝 Test 6: Doc creado por asistente + línea UI posterior -> undo parcial');
    const key6 = 'test-mixed-' + Date.now();
    res = await callHandler(handlers.handlePostPedidosLimpio, 'POST', '/pedidos/limpio', {
      fecha: '2026-10-13',
      idempotencyKey: key6,
      lineas: [
        { cliente: 'ozuna', cantidad: 10, unidad: 'taras', medida: '51/60', tipo: 'S/H20' }
      ]
    });
    assert.equal(res.status, 200);
    const pedidoId6 = res.body.pedidoId;
    
    // Simular que Mari agregó una línea después
    const pedido6Ref = db.collection('pedidos').doc(pedidoId6);
    await pedido6Ref.update({
      ozuna: admin.firestore.FieldValue.arrayUnion({
        kilos: 20,
        esTara: true,
        medida: '36/40',
        tipo: '',
        nota: '',
        esProveedor: false,
        proveedor: '',
        etiqueta: ''
        // Sin _asistenteId = agregado por UI
      })
    });
    console.log('  ✓ UI agregó línea después');
    
    // Undo debe remover solo línea del asistente, no la de Mari
    res = await callHandler(handlers.handlePostPedidosLimpioDeshacer, 'POST', '/pedidos/limpio/deshacer', {
      idempotencyKey: key6,
      undoIdempotencyKey: 'undo-' + key6
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.action, 'removed_lines', 'Debe ser partial (removed_lines)');
    
    const afterMixed = await pedido6Ref.get();
    assert.ok(afterMixed.exists, 'Documento debe seguir existiendo');
    const afterMixedData = afterMixed.data();
    assert.equal(afterMixedData.ozuna.length, 1, 'Debe quedar 1 línea (UI)');
    assert.equal(afterMixedData.ozuna[0].kilos, 20, 'Debe ser la línea de Mari');
    console.log('  ✓ Undo mantuvo línea UI, removió línea asistente');
    testsPassed++;
    
    await pedido6Ref.delete();
    
    // ========================================================================
    // TEST 7: UI edit of assistant line before undo -> 409 no change
    // ========================================================================
    
    console.log('\n📝 Test 7: UI editó línea del asistente -> undo retorna 409');
    const key7 = 'test-conflict-' + Date.now();
    res = await callHandler(handlers.handlePostPedidosLimpio, 'POST', '/pedidos/limpio', {
      fecha: '2026-10-14',
      idempotencyKey: key7,
      lineas: [
        { cliente: 'joselito', cantidad: 15, unidad: 'taras', medida: '51/60', tipo: 'S/H20' }
      ]
    });
    assert.equal(res.status, 200);
    const pedidoId7 = res.body.pedidoId;
    
    // Simular que UI modificó la línea del asistente
    const pedido7Ref = db.collection('pedidos').doc(pedidoId7);
    const before7 = await pedido7Ref.get();
    const data7 = before7.data();
    const modifiedLine = { ...data7.joselito[0], kilos: 999 }; // Cambiar kilos
    await pedido7Ref.update({
      joselito: [modifiedLine]
    });
    console.log('  ✓ UI modificó línea del asistente');
    
    // Undo debe detectar conflicto
    res = await callHandler(handlers.handlePostPedidosLimpioDeshacer, 'POST', '/pedidos/limpio/deshacer', {
      idempotencyKey: key7,
      undoIdempotencyKey: 'undo-' + key7
    });
    assert.equal(res.status, 409, 'Debe retornar 409 CONFLICT');
    assert.ok(res.body.error.code === 'CONFLICT' || res.body.error.code === 'CONFLICT', 'Debe ser CONFLICT');
    
    // Documento no debe haber cambiado
    const afterConflict = await pedido7Ref.get();
    const afterConflictData = afterConflict.data();
    assert.equal(afterConflictData.joselito[0].kilos, 999, 'Línea no debe haber cambiado');
    console.log('  ✓ Undo rechazado con 409, sin cambios');
    testsPassed++;
    
    await pedido7Ref.delete();
    
    // ========================================================================
    // TEST 8: agua 0.65 on C/H20
    // ========================================================================
    
    console.log('\n📝 Test 8: Campo agua 0.65 en líneas C/H20');
    const key8 = 'test-agua-' + Date.now();
    res = await callHandler(handlers.handlePostPedidosLimpio, 'POST', '/pedidos/limpio', {
      fecha: '2026-10-15',
      idempotencyKey: key8,
      lineas: [
        { cliente: 'lorena', cantidad: 10, unidad: 'taras', medida: '36/40', tipo: 'C/H20' }
      ]
    });
    assert.equal(res.status, 200);
    
    const pedido8 = await db.collection('pedidos').doc(res.body.pedidoId).get();
    const data8 = pedido8.data();
    assert.ok(data8.lorena[0].agua !== undefined, 'Debe tener campo agua');
    assert.equal(data8.lorena[0].agua, 0.65, 'agua debe ser 0.65');
    console.log('  ✓ Campo agua presente con valor 0.65');
    testsPassed++;
    
    await db.collection('pedidos').doc(res.body.pedidoId).delete();

    // TEST 9: taras de 25 kg para Ozuna/Joselito/Lorena; Otilio sigue en 27
    console.log('\n📝 Test 9: Taras por cliente en kg (Ozuna 25, Otilio 27)');
    const casosTara = [
      ['ozuna', 250, 10, '2026-10-16'], ['joselito', 250, 10, '2026-10-17'],
      ['lorena', 250, 10, '2026-10-18'], ['otilio', 270, 10, '2026-10-19'], ['Ozuna', 250, 10, '2026-10-20']
    ];
    for (const [cli, kg, esperado, fecha] of casosTara) {
      res = await callHandler(handlers.handlePostPedidosLimpio, 'POST', '/pedidos/limpio', {
        fecha, idempotencyKey: `test-tara-${cli}-${Date.now()}`,
        lineas: [{ cliente: cli, cantidad: kg, unidad: 'kg', medida: '36/40', tipo: 'S/H20' }]
      });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const d = (await db.collection('pedidos').doc(res.body.pedidoId).get()).data();
      assert.ok(d, 'doc creado');
      assert.equal(res.body.totales.taras, esperado, `${cli} ${kg} kg -> ${esperado} taras (resp: ${res.body.totales.taras})`);
      console.log(`  ✓ ${cli} ${kg} kg -> ${res.body.totales.taras} taras`);
      await db.collection('pedidos').doc(res.body.pedidoId).delete();
    }
    testsPassed++;
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ TODOS LOS TESTS PASARON (${testsPassed} tests)`);
    console.log('='.repeat(60));
    console.log('\nFuncionalidades verificadas:');
    console.log('- Create + undo completo');
    console.log('- Double undo -> 400 YA_DESHECHO');
    console.log('- Append a pedido UI (preserva líneas, sin doc tag, audit guardado)');
    console.log('- Retry con misma key no duplica');
    console.log('- Partial undo (solo líneas asistente)');
    console.log('- Doc asistente + línea UI -> undo parcial');
    console.log('- UI editó línea asistente -> 409 CONFLICT');
    console.log('- Campo agua 0.65 en C/H20');
    
  } catch (error) {
    testsFailed++;
    console.error('\n' + '='.repeat(60));
    console.error('❌ TESTS FALLARON');
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
