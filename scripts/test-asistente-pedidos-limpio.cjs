#!/usr/bin/env node
/**
 * Test script para endpoints de pedidos limpio del Cloud Function asistente.
 * 
 * Uso:
 *   node scripts/test-asistente-pedidos-limpio.cjs
 * 
 * Requiere que el emulador esté corriendo:
 *   firebase emulators:start
 */

const http = require('http');

// Configuración
const EMULATOR_HOST = 'localhost';
const EMULATOR_PORT = 5001;
const PROJECT_ID = 'rey-pez-app';
const REGION = 'us-central1';
const FUNCTION_NAME = 'asistente';
const API_KEY = 'test-secret-key-for-emulator';

const BASE_URL = `http://${EMULATOR_HOST}:${EMULATOR_PORT}/${PROJECT_ID}/${REGION}/${FUNCTION_NAME}`;

let testsFailed = 0;
let testsPassed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    testsFailed++;
    throw new Error(message);
  }
  testsPassed++;
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`❌ FAIL: ${message}`);
    console.error(`  Expected: ${JSON.stringify(expected)}`);
    console.error(`  Actual:   ${JSON.stringify(actual)}`);
    testsFailed++;
    throw new Error(message);
  }
  testsPassed++;
}

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testDryRun() {
  console.log('\n📝 Test: POST /pedidos/limpio con dryRun');
  
  const response = await makeRequest('POST', '/pedidos/limpio', {
    fecha: '2026-10-11',
    idempotencyKey: 'test-dry-run-' + Date.now(),
    dryRun: true,
    lineas: [
      {
        cliente: 'otilio',
        cantidad: 20,
        unidad: 'taras',
        medida: '51/60',
        tipo: 'S/H20'
      },
      {
        cliente: 'otilio',
        cantidad: 12,
        unidad: 'taras',
        medida: '36/40',
        tipo: 'C/H20'
      }
    ]
  });

  assertEqual(response.status, 200, 'Status debe ser 200');
  assert(response.body.dryRun === true, 'dryRun debe ser true');
  assert(response.body.document, 'Debe incluir document');
  assert(response.body.totales, 'Debe incluir totales');
  
  // Verificar totales: 20*30=600, 12*30*0.65=234 => 834 kg, 32 taras
  assertEqual(response.body.totales.taras, 32, 'Total taras debe ser 32');
  assertEqual(response.body.totales.kilos, 834, 'Total kilos debe ser 834');
  
  console.log('✅ Test dryRun exitoso');
  console.log('   Totales:', response.body.totales);
}

async function testCreatePedido() {
  console.log('\n📝 Test: POST /pedidos/limpio - crear pedido');
  
  const idempotencyKey = 'test-create-' + Date.now();
  const fecha = '2026-10-12';
  
  const response = await makeRequest('POST', '/pedidos/limpio', {
    fecha,
    idempotencyKey,
    lineas: [
      {
        cliente: 'catarro',
        cantidad: 10,
        unidad: 'taras',
        medida: '51/60',
        tipo: 'S/H20'
      },
      {
        cliente: 'joselito',
        cantidad: 15,
        unidad: 'kg',
        medida: '36/40',
        tipo: ''
      }
    ]
  });

  assertEqual(response.status, 200, 'Status debe ser 200');
  assert(response.body.success, 'success debe ser true');
  assertEqual(response.body.operation, 'pedidos_limpio_create', 'operation debe ser create');
  assert(response.body.pedidoId, 'Debe incluir pedidoId');
  assert(response.body.totales, 'Debe incluir totales');
  
  console.log('✅ Pedido creado exitosamente');
  console.log('   ID:', response.body.pedidoId);
  console.log('   Totales:', response.body.totales);
  
  return { idempotencyKey, pedidoId: response.body.pedidoId, fecha };
}

async function testGetPedido(fecha) {
  console.log('\n📝 Test: GET /pedidos/limpio');
  
  const response = await makeRequest('GET', `/pedidos/limpio?fecha=${fecha}`);
  
  assertEqual(response.status, 200, 'Status debe ser 200');
  assert(response.body.exists, 'exists debe ser true');
  assert(response.body.pedido, 'Debe incluir pedido');
  assertEqual(response.body.pedido.fecha, fecha, 'Fecha debe coincidir');
  assert(response.body.totales, 'Debe incluir totales');
  
  console.log('✅ Pedido obtenido exitosamente');
  console.log('   ID:', response.body.pedido.id);
  console.log('   Totales:', response.body.totales);
}

async function testIdempotency(idempotencyKey) {
  console.log('\n📝 Test: Idempotencia - misma key devuelve misma respuesta');
  
  const response = await makeRequest('POST', '/pedidos/limpio', {
    fecha: '2026-10-12',
    idempotencyKey,
    lineas: [
      {
        cliente: 'lorena',
        cantidad: 999,
        unidad: 'taras',
        medida: '51/60',
        tipo: 'S/H20'
      }
    ]
  });

  assertEqual(response.status, 200, 'Status debe ser 200');
  assert(response.body.success, 'success debe ser true');
  assertEqual(response.body.operation, 'pedidos_limpio_create', 'Debe devolver la respuesta original');
  
  console.log('✅ Idempotencia funcionando correctamente');
}

async function testValidacionMedida() {
  console.log('\n📝 Test: Validación de medida inválida');
  
  const response = await makeRequest('POST', '/pedidos/limpio', {
    fecha: '2026-10-13',
    idempotencyKey: 'test-validacion-' + Date.now(),
    lineas: [
      {
        cliente: 'otilio',
        cantidad: 10,
        unidad: 'taras',
        medida: 'MEDIDA_INEXISTENTE_123',
        tipo: 'S/H20'
      }
    ]
  });

  assertEqual(response.status, 400, 'Status debe ser 400');
  assert(response.body.error, 'Debe incluir error');
  assertEqual(response.body.error.code, 'VALIDACION_ERROR', 'Código debe ser VALIDACION_ERROR');
  assert(response.body.error.details, 'Debe incluir detalles de validación');
  assert(response.body.error.details.errores, 'Debe incluir array de errores');
  
  console.log('✅ Validación de medida funcionando correctamente');
  console.log('   Error:', response.body.error.details.errores[0].mensaje);
}

async function testDeshacer(idempotencyKey, pedidoId) {
  console.log('\n📝 Test: POST /pedidos/limpio/deshacer');
  
  const response = await makeRequest('POST', '/pedidos/limpio/deshacer', {
    idempotencyKey,
    undoIdempotencyKey: 'test-undo-' + Date.now()
  });

  assertEqual(response.status, 200, 'Status debe ser 200');
  assert(response.body.success, 'success debe ser true');
  assertEqual(response.body.operation, 'pedidos_limpio_undo', 'operation debe ser undo');
  assertEqual(response.body.pedidoId, pedidoId, 'pedidoId debe coincidir');
  
  console.log('✅ Deshacer exitoso');
  console.log('   Pedido eliminado:', response.body.pedidoId);
}

async function testDeshacerDobleVez(idempotencyKey) {
  console.log('\n📝 Test: Deshacer dos veces debe fallar');
  
  const response = await makeRequest('POST', '/pedidos/limpio/deshacer', {
    idempotencyKey,
    undoIdempotencyKey: 'test-undo-doble-' + Date.now()
  });

  assertEqual(response.status, 400, 'Status debe ser 400');
  assert(response.body.error, 'Debe incluir error');
  assertEqual(response.body.error.code, 'YA_DESHECHO', 'Código debe ser YA_DESHECHO');
  
  console.log('✅ Protección contra doble deshacer funcionando');
}

async function testUpdatePedido() {
  console.log('\n📝 Test: POST /pedidos/limpio - actualizar pedido existente');
  
  const fecha = '2026-10-14';
  
  // Crear pedido inicial
  const createResponse = await makeRequest('POST', '/pedidos/limpio', {
    fecha,
    idempotencyKey: 'test-update-1-' + Date.now(),
    lineas: [
      {
        cliente: 'ozuna',
        cantidad: 5,
        unidad: 'taras',
        medida: '51/60',
        tipo: 'S/H20'
      }
    ]
  });
  
  assertEqual(createResponse.status, 200, 'Primera creación debe ser exitosa');
  const pedidoId1 = createResponse.body.pedidoId;
  
  // Actualizar con nueva data
  const updateResponse = await makeRequest('POST', '/pedidos/limpio', {
    fecha,
    idempotencyKey: 'test-update-2-' + Date.now(),
    lineas: [
      {
        cliente: 'ozuna',
        cantidad: 10,
        unidad: 'taras',
        medida: '36/40',
        tipo: 'C/H20'
      },
      {
        cliente: 'lorena',
        cantidad: 20,
        unidad: 'kg',
        medida: '51/60',
        tipo: ''
      }
    ]
  });
  
  assertEqual(updateResponse.status, 200, 'Update debe ser exitoso');
  assertEqual(updateResponse.body.operation, 'pedidos_limpio_update', 'operation debe ser update');
  assertEqual(updateResponse.body.pedidoId, pedidoId1, 'Debe ser el mismo pedido');
  
  console.log('✅ Update de pedido exitoso');
  console.log('   ID:', updateResponse.body.pedidoId);
  console.log('   Totales:', updateResponse.body.totales);
}

async function testClienteTemporal() {
  console.log('\n📝 Test: Cliente temporal');
  
  const response = await makeRequest('POST', '/pedidos/limpio', {
    fecha: '2026-10-15',
    idempotencyKey: 'test-temporal-' + Date.now(),
    lineas: [
      {
        cliente: 'ClienteNuevo',
        cantidad: 8,
        unidad: 'taras',
        medida: '51/60',
        tipo: 'S/H20'
      }
    ]
  });

  assertEqual(response.status, 200, 'Status debe ser 200');
  assert(response.body.success, 'success debe ser true');
  
  console.log('✅ Cliente temporal creado exitosamente');
  console.log('   Totales:', response.body.totales);
}

async function testTiposGlaseo() {
  console.log('\n📝 Test: Diferentes tipos de glaseo');
  
  const idempotencyKey = 'test-glaseo-' + Date.now();
  const fecha = '2026-10-16';
  
  const response = await makeRequest('POST', '/pedidos/limpio', {
    fecha,
    idempotencyKey,
    lineas: [
      {
        cliente: 'otilio',
        cantidad: 10,
        unidad: 'taras',
        medida: '51/60',
        tipo: '1.4'
      },
      {
        cliente: 'otilio',
        cantidad: 5,
        unidad: 'taras',
        medida: '36/40',
        tipo: '1.5'
      }
    ]
  });

  assertEqual(response.status, 200, 'Status debe ser 200');
  assert(response.body.success, 'success debe ser true');
  
  // 1.4: 10 * 20 * 1.4 = 280
  // 1.5: 5 * 20 * 1.5 = 150
  // Total: 430 kg, 15 taras
  assertEqual(response.body.totales.taras, 15, 'Total taras debe ser 15');
  assertEqual(response.body.totales.kilos, 430, 'Total kilos debe ser 430');
  
  console.log('✅ Tipos de glaseo 1.4 y 1.5 funcionando correctamente');
  console.log('   Totales:', response.body.totales);
  
  return { idempotencyKey, pedidoId: response.body.pedidoId };
}

async function runAllTests() {
  console.log('🧪 Iniciando tests de pedidos limpio...');
  console.log(`📡 Usando emulador en ${BASE_URL}\n`);

  try {
    // Test 1: DryRun con caso del usuario
    await testDryRun();
    
    // Test 2: Crear pedido
    const { idempotencyKey, pedidoId, fecha } = await testCreatePedido();
    
    // Test 3: Obtener pedido
    await testGetPedido(fecha);
    
    // Test 4: Idempotencia
    await testIdempotency(idempotencyKey);
    
    // Test 5: Validación de medida
    await testValidacionMedida();
    
    // Test 6: Update de pedido existente
    await testUpdatePedido();
    
    // Test 7: Cliente temporal
    await testClienteTemporal();
    
    // Test 8: Tipos de glaseo
    const glaseoResult = await testTiposGlaseo();
    
    // Test 9: Deshacer (usar el pedido de glaseo)
    await testDeshacer(glaseoResult.idempotencyKey, glaseoResult.pedidoId);
    
    // Test 10: Intentar deshacer dos veces
    await testDeshacerDobleVez(glaseoResult.idempotencyKey);
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Todos los tests pasaron! (${testsPassed} aserciones exitosas)`);
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error(`❌ Tests fallaron: ${testsFailed} errores`);
    console.error('   Pasaron: ' + testsPassed + ' aserciones');
    console.error('='.repeat(60));
    console.error('\nError:', error.message);
    
    process.exit(1);
  }
}

runAllTests();
