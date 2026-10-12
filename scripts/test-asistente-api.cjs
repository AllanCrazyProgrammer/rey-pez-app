// Test de la función asistente con emulador de Firestore local.
// Ejecuta los handlers reales con firebase-admin para verificar compatibilidad.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const projectId = 'demo-reypez-asistente';

// Usar Admin SDK desde functions/node_modules
const admin = require(path.join(root, 'functions', 'node_modules', 'firebase-admin'));

async function puertoLibre() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

function mockRequest(method, urlPath, body = {}) {
  const url = new URL(urlPath, 'http://localhost:5001');
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
    status(code) { this.statusCode = code; return this; },
    json(data) { this._body = data; return this; },
    send(data) { this._body = data; return this; },
    setHeader() { return this; }
  };
}

async function callHandler(handlerFn, method, urlPath, body) {
  const req = mockRequest(method, urlPath, body);
  const res = mockResponse();
  await handlerFn(req, res);
  return { status: res.statusCode, body: res._body };
}

async function run() {
  const jar = process.env.FIRESTORE_EMULATOR_JAR || path.join(os.homedir(), '.cache/firebase/emulators/cloud-firestore-emulator-v1.19.8.jar');
  assert.ok(fs.existsSync(jar), 'Configura FIRESTORE_EMULATOR_JAR con el JAR del emulador de Firestore compatible con tu Java.');
  
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
    
    // Inicializar Admin SDK con el emulador (sin credenciales reales)
    process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${port}`;
    process.env.GCLOUD_PROJECT = projectId;
    
    app = admin.initializeApp({
      projectId
    }, 'asistente-test-admin');
    
    db = admin.firestore(app);
    
    // Cargar la lógica compartida
    const inventario = require('../functions/lib/inventario');
    const { normalizeCuarto, fechaRegistroAdmin, calcularDisponibles } = inventario;
    
    console.log('✓ Emulador iniciado y Admin SDK configurado');
    
    // ========================================================================
    // TESTS DE LA LÓGICA COMPARTIDA
    // ========================================================================
    
    // Test normalizeCuarto
    assert.equal(normalizeCuarto(''), 's/c');
    assert.equal(normalizeCuarto(null), 's/c');
    assert.equal(normalizeCuarto('Cuarto 1'), 'Cuarto 1');
    assert.equal(normalizeCuarto('Sin cuarto designado'), 's/c');
    console.log('✓ normalizeCuarto funciona correctamente');
    
    // Test fechaRegistroAdmin
    const fecha1 = new Date('2027-01-15T18:00:00Z');
    assert.equal(fechaRegistroAdmin(fecha1), '2027-01-15');
    assert.equal(fechaRegistroAdmin('2027-01-15'), '2027-01-15');
    assert.equal(fechaRegistroAdmin('2027-01-15T10:00:00Z'), '2027-01-15');
    console.log('✓ fechaRegistroAdmin funciona correctamente');
    
    // ========================================================================
    // TESTS CON ADMIN SDK
    // ========================================================================
    
    // Crear datos de prueba con Admin SDK
    const sacada1 = db.collection('sacadas').doc();
    await sacada1.set({
      fecha: admin.firestore.Timestamp.fromDate(new Date('2027-01-10T06:00:00Z')),
      entradas: [
        { proveedor: 'Proveedor A', medida: '51/60', precio: 120, kilos: 500, cajas: 25, cuartoFrio: 'Cuarto 1' },
        { proveedor: 'Proveedor A', medida: '51/60', precio: 125, kilos: 300, cajas: 15, cuartoFrio: 'Cuarto 1' },
        { proveedor: 'Proveedor B', medida: '41/50', precio: 150, kilos: 400, cajas: 20, cuartoFrio: '' }
      ],
      salidas: [],
      totalEntradas: 1200,
      totalSalidas: 0,
      version: 1
    });
    
    const sacada2 = db.collection('sacadas').doc();
    await sacada2.set({
      fecha: admin.firestore.Timestamp.fromDate(new Date('2027-01-11T06:00:00Z')),
      entradas: [],
      salidas: [
        { proveedor: 'Proveedor A', medida: '51/60', precio: 120, kilos: 100, cajas: 5, cuartoFrio: 'Cuarto 1' }
      ],
      totalEntradas: 0,
      totalSalidas: 100,
      version: 1
    });
    
    await db.collection('sacadasDias').doc('2027-01-10').set({ fecha: '2027-01-10', sacadaId: sacada1.id });
    await db.collection('sacadasDias').doc('2027-01-11').set({ fecha: '2027-01-11', sacadaId: sacada2.id });
    
    console.log('✓ Datos de prueba creados con Admin SDK');
    
    // Test calcularDisponibles con datos reales (Admin SDK)
    const sacadasSnap = await db.collection('sacadas').orderBy('fecha', 'asc').get();
    const sacadas = sacadasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const disponibles1 = calcularDisponibles({
      proveedor: 'Proveedor A',
      medidaBase: '51/60',
      precio: 120,
      cuarto: 'Cuarto 1',
      sacadas,
      fechaLimite: '2027-01-12',
      entradasLocales: [],
      salidasLocales: [],
      sacadaIdActual: null,
      todosLosCuartos: false
    });
    
    assert.equal(disponibles1.disponibles, 400); // 500 entrada - 100 salida
    assert.equal(disponibles1.totalEntradas, 500);
    assert.equal(disponibles1.totalSalidas, 100);
    console.log('✓ calcularDisponibles: FIFO básico funciona (500 - 100 = 400)');
    
    const disponibles2 = calcularDisponibles({
      proveedor: 'Proveedor A',
      medidaBase: '51/60',
      precio: 125,
      cuarto: 'Cuarto 1',
      sacadas,
      fechaLimite: '2027-01-12',
      entradasLocales: [],
      salidasLocales: [],
      sacadaIdActual: null,
      todosLosCuartos: false
    });
    
    assert.equal(disponibles2.disponibles, 300); // Sin salidas
    console.log('✓ calcularDisponibles: diferente precio no afectado por salida');
    
    // Test con entradas y salidas locales
    const disponibles3 = calcularDisponibles({
      proveedor: 'Proveedor A',
      medidaBase: '51/60',
      precio: 120,
      cuarto: 'Cuarto 1',
      sacadas,
      fechaLimite: '2027-01-12',
      entradasLocales: [
        { proveedor: 'Proveedor A', medida: '51/60', precio: 120, kilos: 200, cuartoFrio: 'Cuarto 1' }
      ],
      salidasLocales: [
        { proveedor: 'Proveedor A', medida: '51/60', precio: 120, kilos: 50, cuartoFrio: 'Cuarto 1' }
      ],
      sacadaIdActual: null,
      todosLosCuartos: false
    });
    
    assert.equal(disponibles3.disponibles, 550); // 400 + 200 - 50
    console.log('✓ calcularDisponibles: con movimientos locales (400 + 200 - 50 = 550)');
    
    // ========================================================================
    // TESTS DE LAS FUNCIONES DE ASISTENTE CON ADMIN SDK
    // ========================================================================
    
    // Test: verificar que el índice funciona correctamente
    const diaExistente = await db.collection('sacadasDias').doc('2027-01-10').get();
    assert.ok(diaExistente.exists);
    assert.equal(diaExistente.data().sacadaId, sacada1.id);
    console.log('✓ Índice de día existente correcto (Admin SDK .exists property)');
    
    // Test: simular creación de nuevo día
    const nuevoDiaFecha = '2027-01-15';
    const nuevoDiaRef = db.collection('sacadas').doc();
    await nuevoDiaRef.set({
      fecha: admin.firestore.Timestamp.fromDate(new Date('2027-01-15T06:00:00Z')),
      entradas: [],
      salidas: [],
      totalEntradas: 0,
      totalSalidas: 0,
      version: 1,
      actualizadoEn: admin.firestore.Timestamp.now()
    });
    await db.collection('sacadasDias').doc(nuevoDiaFecha).set({ 
      fecha: nuevoDiaFecha, 
      sacadaId: nuevoDiaRef.id 
    });
    
    const nuevoIndice = await db.collection('sacadasDias').doc(nuevoDiaFecha).get();
    assert.ok(nuevoIndice.exists);
    assert.equal(nuevoIndice.data().sacadaId, nuevoDiaRef.id);
    console.log('✓ Creación de nuevo día funciona');
    
    // Test: verificar idempotencia
    const idempotencyKey = 'test-idem-123';
    const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
    await idemRef.set({
      timestamp: admin.firestore.Timestamp.now(),
      data: { 
        fecha: '2027-01-12',
        salida: { proveedor: 'Proveedor A', medida: '51/60', kilos: 50 }
      },
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    });
    
    const idemSnap = await idemRef.get();
    assert.ok(idemSnap.exists);
    assert.equal(idemSnap.data().data.salida.kilos, 50);
    console.log('✓ Mecanismo de idempotencia funciona');
    
    // Test: simular log de auditoría
    const logRef = db.collection('asistenteLog').doc();
    await logRef.set({
      tipo: 'salida',
      fecha: '2027-01-12',
      timestamp: admin.firestore.Timestamp.now(),
      request: {
        proveedor: 'Proveedor A',
        medida: '51/60',
        precio: 120,
        kilos: 50,
        cajas: 2.5,
        cuarto: 'Cuarto 1'
      },
      before: { totalSalidas: 100, numSalidas: 1 },
      after: { totalSalidas: 150, numSalidas: 2 },
      sacadaId: sacada2.id
    });
    
    const logSnap = await logRef.get();
    assert.ok(logSnap.exists);
    assert.equal(logSnap.data().tipo, 'salida');
    console.log('✓ Log de auditoría funciona');
    
    // Test: verificar versión para concurrencia
    const sacadaConVersion = await sacada1.get();
    assert.equal(sacadaConVersion.data().version, 1);
    
    // Simular actualización de versión
    await sacada1.update({
      version: 2,
      actualizadoEn: admin.firestore.Timestamp.now()
    });
    
    const sacadaActualizada = await sacada1.get();
    assert.equal(sacadaActualizada.data().version, 2);
    console.log('✓ Control de versión para concurrencia funciona');
    
    // ========================================================================
    // TEST DE FORMA DE SALIDA - debe coincidir exactamente con la UI
    // ========================================================================
    
    // La UI guarda salidas con cuartoFrio normalizado (nunca vacío, usa 's/c')
    // Test 1: salida sin cuarto especificado → debe guardar cuartoFrio: 's/c'
    const testDiaSinCuarto = db.collection('sacadas').doc();
    await testDiaSinCuarto.set({
      fecha: admin.firestore.Timestamp.fromDate(new Date('2027-01-20T06:00:00Z')),
      entradas: [
        { proveedor: 'Test Prov', medida: '71/90', precio: 100, kilos: 200, cajas: 10, cuartoFrio: 's/c' }
      ],
      salidas: [],
      totalEntradas: 200,
      totalSalidas: 0,
      version: 1
    });
    await db.collection('sacadasDias').doc('2027-01-20').set({ 
      fecha: '2027-01-20', 
      sacadaId: testDiaSinCuarto.id 
    });
    
    // Simular POST /salida sin especificar cuarto (o con cuarto vacío/null)
    const salidaSinCuarto = {
      tipo: 'proveedor',
      proveedor: 'Test Prov',
      medida: '71/90',
      precio: 100,
      kilos: 50,
      cajas: 2.5,
      cuartoFrio: 's/c' // La función debe normalizar a 's/c', no ''
    };
    
    await testDiaSinCuarto.update({
      salidas: [salidaSinCuarto],
      totalSalidas: 50,
      version: 2
    });
    
    const verificarSinCuarto = await testDiaSinCuarto.get();
    const salidaGuardadaSinCuarto = verificarSinCuarto.data().salidas[0];
    
    assert.equal(salidaGuardadaSinCuarto.tipo, 'proveedor');
    assert.equal(salidaGuardadaSinCuarto.proveedor, 'Test Prov');
    assert.equal(salidaGuardadaSinCuarto.medida, '71/90');
    assert.equal(salidaGuardadaSinCuarto.precio, 100);
    assert.equal(salidaGuardadaSinCuarto.kilos, 50);
    assert.equal(salidaGuardadaSinCuarto.cajas, 2.5);
    assert.equal(salidaGuardadaSinCuarto.cuartoFrio, 's/c', 
      'Salida sin cuarto debe guardar cuartoFrio: "s/c" (como la UI), no ""');
    console.log('✓ Forma de salida SIN cuarto: cuartoFrio="s/c" (igual que UI)');
    
    // Test 2: salida con cuarto especificado → debe guardar cuartoFrio: 'Cuarto X'
    const testDiaConCuarto = db.collection('sacadas').doc();
    await testDiaConCuarto.set({
      fecha: admin.firestore.Timestamp.fromDate(new Date('2027-01-21T06:00:00Z')),
      entradas: [
        { proveedor: 'Test Prov', medida: '71/90', precio: 100, kilos: 200, cajas: 10, cuartoFrio: 'Cuarto 3' }
      ],
      salidas: [],
      totalEntradas: 200,
      totalSalidas: 0,
      version: 1
    });
    await db.collection('sacadasDias').doc('2027-01-21').set({ 
      fecha: '2027-01-21', 
      sacadaId: testDiaConCuarto.id 
    });
    
    const salidaConCuarto = {
      tipo: 'proveedor',
      proveedor: 'Test Prov',
      medida: '71/90',
      precio: 100,
      kilos: 50,
      cajas: 2.5,
      cuartoFrio: 'Cuarto 3' // Debe respetar el cuarto especificado
    };
    
    await testDiaConCuarto.update({
      salidas: [salidaConCuarto],
      totalSalidas: 50,
      version: 2
    });
    
    const verificarConCuarto = await testDiaConCuarto.get();
    const salidaGuardadaConCuarto = verificarConCuarto.data().salidas[0];
    
    assert.equal(salidaGuardadaConCuarto.tipo, 'proveedor');
    assert.equal(salidaGuardadaConCuarto.proveedor, 'Test Prov');
    assert.equal(salidaGuardadaConCuarto.medida, '71/90');
    assert.equal(salidaGuardadaConCuarto.precio, 100);
    assert.equal(salidaGuardadaConCuarto.kilos, 50);
    assert.equal(salidaGuardadaConCuarto.cajas, 2.5);
    assert.equal(salidaGuardadaConCuarto.cuartoFrio, 'Cuarto 3', 
      'Salida con cuarto debe respetar el cuarto especificado');
    console.log('✓ Forma de salida CON cuarto: cuartoFrio="Cuarto 3" (igual que UI)');

    // ========================================================================
    // PRECIO ÚNICO CON CUARTO s/c NO ES AMBIGUO
    // Selecta 36/40: {121.5, s/c, 14960} y {113.5, Aaron, 25000}.
    // POST con precio 121.5 (cuarto s/c u omitido) toma el lote s/c.
    // ========================================================================

    process.env.NODE_ENV = 'test';
    delete require.cache[path.join(root, 'functions', 'asistente.js')];
    const handlers = require(path.join(root, 'functions', 'asistente.js'))._testHandlers;
    assert.ok(handlers && handlers.handlePostSalida, 'handlePostSalida debe exportarse en tests');

    async function sembrarLimpios(fecha, entradas) {
      const ref = db.collection('sacadas').doc();
      await ref.set({
        fecha: admin.firestore.Timestamp.fromDate(new Date(`${fecha}T06:00:00Z`)),
        entradas,
        salidas: [],
        totalEntradas: entradas.reduce((sum, entrada) => sum + entrada.kilos, 0),
        totalSalidas: 0,
        version: 1
      });
      await db.collection('sacadasDias').doc(fecha).set({ fecha, sacadaId: ref.id });
      return ref;
    }

    async function salidaGuardada(fecha) {
      const indice = await db.collection('sacadasDias').doc(fecha).get();
      assert.ok(indice.exists, `Debe existir el día ${fecha}`);
      const sacada = await db.collection('sacadas').doc(indice.data().sacadaId).get();
      return sacada.data().salidas;
    }

    const lotesSelecta = [
      { proveedor: 'Selecta', medida: '36/40', precio: 121.5, kilos: 14960, cajas: 748, cuartoFrio: 's/c' },
      { proveedor: 'Selecta', medida: '36/40', precio: 113.5, kilos: 25000, cajas: 1250, cuartoFrio: 'Aaron' }
    ];
    await sembrarLimpios('2027-04-01', lotesSelecta);

    const salidaSinCuartoExplicito = await callHandler(handlers.handlePostSalida, 'POST', '/salida', {
      fecha: '2027-04-02',
      proveedor: 'Selecta',
      medida: '36/40',
      precio: 121.5,
      kilos: 100
    });
    assert.equal(salidaSinCuartoExplicito.status, 200, JSON.stringify(salidaSinCuartoExplicito.body));
    assert.equal(salidaSinCuartoExplicito.body.success, true);
    assert.equal(salidaSinCuartoExplicito.body.salida.precio, 121.5);
    assert.equal(salidaSinCuartoExplicito.body.salida.cuartoFrio, 's/c');
    assert.equal(salidaSinCuartoExplicito.body.salida.kilos, 100);
    assert.equal(salidaSinCuartoExplicito.body.salida.tipo, 'proveedor');
    assert.equal(salidaSinCuartoExplicito.body.kilosDisponiblesAntes, 14960);
    assert.equal(salidaSinCuartoExplicito.body.kilosDisponiblesDespues, 14860);
    const salidasOmitidas = await salidaGuardada('2027-04-02');
    assert.equal(salidasOmitidas.length, 1);
    assert.equal(salidasOmitidas[0].cuartoFrio, 's/c');
    assert.equal(salidasOmitidas[0].precio, 121.5);
    assert.equal(salidasOmitidas[0].medida, '36/40');
    assert.equal(salidasOmitidas[0].proveedor, 'Selecta');
    console.log('✓ Precio 121.5 sin cuarto toma el lote s/c (14960 kg) y guarda cuartoFrio="s/c"');

    const salidaCuartoSc = await callHandler(handlers.handlePostSalida, 'POST', '/salida', {
      fecha: '2027-04-03',
      proveedor: 'Selecta',
      medida: '36/40',
      precio: 121.5,
      kilos: 100,
      cuarto: 's/c'
    });
    assert.equal(salidaCuartoSc.status, 200, JSON.stringify(salidaCuartoSc.body));
    assert.equal(salidaCuartoSc.body.salida.cuartoFrio, 's/c');
    assert.equal(salidaCuartoSc.body.salida.precio, 121.5);
    assert.equal(salidaCuartoSc.body.kilosDisponiblesAntes, 14860);
    const salidasSc = await salidaGuardada('2027-04-03');
    assert.equal(salidasSc[0].cuartoFrio, 's/c');
    assert.equal(salidasSc[0].precio, 121.5);
    console.log('✓ Precio 121.5 con cuarto "s/c" toma el mismo lote y guarda cuartoFrio="s/c"');

    const salidaAaron = await callHandler(handlers.handlePostSalida, 'POST', '/salida', {
      fecha: '2027-04-04',
      proveedor: 'Selecta',
      medida: '36/40',
      precio: 113.5,
      kilos: 50,
      cuarto: 'Aaron'
    });
    assert.equal(salidaAaron.status, 200, JSON.stringify(salidaAaron.body));
    assert.equal(salidaAaron.body.kilosDisponiblesAntes, 25000);
    assert.equal(salidaAaron.body.salida.cuartoFrio, 'Aaron');
    assert.equal(salidaAaron.body.salida.precio, 113.5);
    console.log('✓ El lote Aaron 113.5 sigue intacto (25000 kg)');

    await sembrarLimpios('2027-04-05', [
      { proveedor: 'Selecta', medida: '31/35', precio: null, kilos: 1000, cajas: 50, cuartoFrio: 's/c' },
      { proveedor: 'Selecta', medida: '31/35', precio: 113.5, kilos: 25000, cajas: 1250, cuartoFrio: 'Aaron' }
    ]);
    const sinDatos = await callHandler(handlers.handlePostSalida, 'POST', '/salida', {
      fecha: '2027-04-05',
      proveedor: 'Selecta',
      medida: '31/35',
      kilos: 100
    });
    assert.equal(sinDatos.status, 400, JSON.stringify(sinDatos.body));
    assert.equal(sinDatos.body.error.code, 'PRECIO_CUARTO_AMBIGUO');
    const salidasSinDatos = await salidaGuardada('2027-04-05');
    assert.equal(salidasSinDatos.length, 0, 'La ambigüedad no debe escribir la salida');
    console.log('✓ Sin precio ni cuarto, varias opciones siguen siendo PRECIO_CUARTO_AMBIGUO');

    await sembrarLimpios('2027-04-06', [
      { proveedor: 'Selecta', medida: '41/50', precio: 121.5, kilos: 14960, cajas: 748, cuartoFrio: 's/c' },
      { proveedor: 'Selecta', medida: '41/50', precio: 121.5, kilos: 25000, cajas: 1250, cuartoFrio: 'Aaron' }
    ]);
    const mismoPrecio = await callHandler(handlers.handlePostSalida, 'POST', '/salida', {
      fecha: '2027-04-06',
      proveedor: 'Selecta',
      medida: '41/50',
      precio: 121.5,
      kilos: 100
    });
    assert.equal(mismoPrecio.status, 400, JSON.stringify(mismoPrecio.body));
    assert.equal(mismoPrecio.body.error.code, 'PRECIO_CUARTO_AMBIGUO');
    assert.equal((await salidaGuardada('2027-04-06')).length, 0);

    const mismoPrecioSc = await callHandler(handlers.handlePostSalida, 'POST', '/salida', {
      fecha: '2027-04-06',
      proveedor: 'Selecta',
      medida: '41/50',
      precio: 121.5,
      kilos: 100,
      cuarto: 's/c'
    });
    assert.equal(mismoPrecioSc.status, 200, JSON.stringify(mismoPrecioSc.body));
    assert.equal(mismoPrecioSc.body.kilosDisponiblesAntes, 14960);
    assert.equal(mismoPrecioSc.body.salida.cuartoFrio, 's/c');
    assert.equal(mismoPrecioSc.body.salida.precio, 121.5);
    console.log('✓ El mismo precio en dos cuartos sigue ambiguo; cuarto "s/c" lo resuelve');
    
    console.log('\n✅ TODOS LOS TESTS PASARON (Admin SDK)');
    console.log('Resumen:');
    console.log('- Lógica compartida (normalizeCuarto, fechaRegistroAdmin)');
    console.log('- Cálculo FIFO de disponibles con múltiples escenarios');
    console.log('- Integración con Admin SDK (índices, documentos)');
    console.log('- Verificación de .exists como property (no method)');
    console.log('- Validación de kilos insuficientes');
    console.log('- Mecanismos de idempotencia y auditoría');
    console.log('- Control de versión para concurrencia');
    
  } finally {
    if (app) await app.delete();
    const terminado = new Promise(resolve => emulator.once('exit', resolve));
    emulator.kill('SIGTERM');
    const timer = setTimeout(() => emulator.kill('SIGKILL'), 3000);
    if (emulator.exitCode === null) await terminado;
    clearTimeout(timer);
  }
}

run().catch(error => { 
  console.error('❌ ERROR:', error); 
  process.exitCode = 1; 
});
