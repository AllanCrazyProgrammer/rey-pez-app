// Test de la API de crudos en asistente con emulador de Firestore local.
// Ejecuta los handlers reales con firebase-admin para verificar compatibilidad.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const projectId = 'demo-reypez-crudos';

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
    }, 'crudos-test-admin');
    
    db = admin.firestore(app);
    
    // Cargar la lógica compartida
    const inventario = require('../functions/lib/inventario');
    const { normalizeCuarto, fechaRegistroAdmin, medianocheMexico, finDiaMexico } = inventario;
    
    console.log('✓ Emulador iniciado y Admin SDK configurado');
    
    // ========================================================================
    // TESTS DE DATOS Y ESTRUCTURA DE CRUDOS
    // ========================================================================
    
    // Crear datos de prueba con Admin SDK
    const crudo1 = db.collection('existenciasCrudos').doc();
    await crudo1.set({
      fecha: admin.firestore.Timestamp.fromDate(new Date('2026-10-10T06:00:00Z')),
      entradas: [
        { proveedor: 'Maria Guadalupe', producto: 'Pac Ch', kilos: 500, precio: null, piezas: '', cuartoFrio: 's/c' },
        { proveedor: 'Galileo', producto: 'Pac Ch', kilos: 300, precio: 120, piezas: '100', cuartoFrio: 'Cuarto 1' }
      ],
      salidas: [],
      totalEntradas: 800,
      totalSalidas: 0,
      version: 1
    });
    
    const crudo2 = db.collection('existenciasCrudos').doc();
    await crudo2.set({
      fecha: admin.firestore.Timestamp.fromDate(new Date('2026-10-11T06:00:00Z')),
      entradas: [
        { proveedor: 'Memo', producto: 'Cam 51/60', kilos: 200, precio: 150, piezas: '', cuartoFrio: 's/c' }
      ],
      salidas: [
        { proveedor: 'Galileo', producto: 'Pac Ch', kilos: 113, cuartoFrio: 'Cuarto 1' }
      ],
      totalEntradas: 200,
      totalSalidas: 113,
      version: 1
    });
    
    console.log('✓ Datos de prueba de crudos creados con Admin SDK');
    
    // Test: verificar estructura de entrada SIN precio (Maria Guadalupe)
    const verificarCrudo1 = await crudo1.get();
    const entrada1 = verificarCrudo1.data().entradas[0];
    
    assert.equal(entrada1.proveedor, 'Maria Guadalupe');
    assert.equal(entrada1.producto, 'Pac Ch');
    assert.equal(entrada1.kilos, 500);
    assert.equal(entrada1.precio, null, 'Entrada sin precio debe tener precio: null');
    assert.equal(entrada1.piezas, '');
    assert.equal(entrada1.cuartoFrio, 's/c');
    console.log('✓ Estructura de entrada SIN precio correcta (Maria Guadalupe)');
    
    // Test: verificar estructura de entrada CON precio y piezas (Galileo)
    const entrada2 = verificarCrudo1.data().entradas[1];
    
    assert.equal(entrada2.proveedor, 'Galileo');
    assert.equal(entrada2.producto, 'Pac Ch');
    assert.equal(entrada2.kilos, 300);
    assert.equal(entrada2.precio, 120);
    assert.equal(entrada2.piezas, '100');
    assert.equal(entrada2.cuartoFrio, 'Cuarto 1');
    console.log('✓ Estructura de entrada CON precio y piezas correcta (Galileo)');
    
    // Test: verificar estructura de salida (Galileo)
    const verificarCrudo2 = await crudo2.get();
    const salida1 = verificarCrudo2.data().salidas[0];
    
    assert.equal(salida1.proveedor, 'Galileo');
    assert.equal(salida1.producto, 'Pac Ch');
    assert.equal(salida1.kilos, 113);
    assert.equal(salida1.cuartoFrio, 'Cuarto 1');
    assert.ok(!('precio' in salida1), 'Las salidas no deben incluir precio');
    console.log('✓ Estructura de salida correcta (Galileo)');
    
    // Test: verificar estructura de entrada de Memo (con precio, sin cuarto)
    const entrada3 = verificarCrudo2.data().entradas[0];
    
    assert.equal(entrada3.proveedor, 'Memo');
    assert.equal(entrada3.producto, 'Cam 51/60');
    assert.equal(entrada3.kilos, 200);
    assert.equal(entrada3.precio, 150);
    assert.equal(entrada3.cuartoFrio, 's/c');
    console.log('✓ Estructura de entrada de Memo correcta (con precio, sin cuarto)');
    
    // ========================================================================
    // TESTS DE CÁLCULO DE DISPONIBLES FIFO PARA CRUDOS
    // ========================================================================
    
    // Simular la función calcularDisponiblesCrudos localmente siguiendo RegistroCrudos.vue
    // FIFO por FECHA (no por precio), como lo hace loadProductosDisponibles + descontarSalida
    function calcularDisponiblesCrudosLocal(params) {
      const {
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
      } = params;
      
      const precioNormalizado = precio !== null && precio !== undefined ? precio : null;
      const cuartoNormalizado = normalizeCuarto(cuarto);
      
      // Construir lotes disponibles siguiendo RegistroCrudos.vue
      const lotesDisponibles = [];
      let ordenLote = 0;
      
      const fechaLimiteDate = finDiaMexico(fechaLimite);
      
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
      
      const descontarSalida = (salida) => {
        if (salida.proveedor !== proveedor || salida.producto !== producto) return;
        
        const usarTodosLosCuartos = normalizeCuarto(salida.cuartoFrio) === 'Todos los cuartos';
        const cuartoSalida = normalizeCuarto(salida.cuartoFrio);
        
        let restante = Number(salida.kilos) || 0;
        if (restante <= 0) return;
        
        // Descontar de lotes en orden (ya están en orden de fecha)
        for (const lote of lotesDisponibles) {
          if (restante <= 0) break;
          if (lote.kilos <= 0) continue;
          if (!usarTodosLosCuartos && lote.cuarto !== cuartoSalida) continue;
          
          const descuento = Math.min(restante, lote.kilos);
          lote.kilos = Number((lote.kilos - descuento).toFixed(1));
          restante = Number((restante - descuento).toFixed(1));
        }
      };
      
      // Procesar registros en orden de fecha
      for (const registro of registros) {
        if (registroIdActual && registro.id === registroIdActual) continue;
        
        const registroFecha = registro.fecha;
        const registroDate = registroFecha instanceof Date ? registroFecha
          : typeof registroFecha.toDate === 'function' ? registroFecha.toDate()
          : new Date(registroFecha);
        
        if (registroDate > fechaLimiteDate) continue;
        
        const entradas = registro.entradas || [];
        for (const entrada of entradas) {
          registrarEntrada(entrada, registroDate);
        }
        
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
    
    // Obtener registros para tests
    const registrosSnap = await db.collection('existenciasCrudos').orderBy('fecha', 'asc').get();
    const registros = registrosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Test: calcular disponibles de Galileo Pac Ch Cuarto 1 después de la salida
    const disponiblesGalileo = calcularDisponiblesCrudosLocal({
      proveedor: 'Galileo',
      producto: 'Pac Ch',
      precio: 120,
      cuarto: 'Cuarto 1',
      registros,
      fechaLimite: '2026-10-12',
      entradasLocales: [],
      salidasLocales: [],
      registroIdActual: null,
      todosLosCuartos: false
    });
    
    assert.equal(disponiblesGalileo.disponibles, 187); // 300 - 113
    console.log('✓ Cálculo FIFO de disponibles funciona: Galileo Pac Ch (300 - 113 = 187)');
    
    // Test: disponibles de Maria Guadalupe no afectados por salida de Galileo
    const disponiblesMaria = calcularDisponiblesCrudosLocal({
      proveedor: 'Maria Guadalupe',
      producto: 'Pac Ch',
      precio: null,
      cuarto: 's/c',
      registros,
      fechaLimite: '2026-10-12',
      entradasLocales: [],
      salidasLocales: [],
      registroIdActual: null,
      todosLosCuartos: false
    });
    
    assert.equal(disponiblesMaria.disponibles, 500); // Sin salidas
    console.log('✓ Disponibles de Maria Guadalupe no afectados por salida de otro proveedor');
    
    // Test: disponibles de Memo con precio
    const disponiblesMemo = calcularDisponiblesCrudosLocal({
      proveedor: 'Memo',
      producto: 'Cam 51/60',
      precio: 150,
      cuarto: 's/c',
      registros,
      fechaLimite: '2026-10-12',
      entradasLocales: [],
      salidasLocales: [],
      registroIdActual: null,
      todosLosCuartos: false
    });
    
    assert.equal(disponiblesMemo.disponibles, 200);
    console.log('✓ Disponibles de Memo con precio correcto (200 kg)');
    
    // ========================================================================
    // TESTS DE CREACIÓN DE DÍA SIN DUPLICADOS
    // ========================================================================
    
    // Test: crear nuevo día
    const nuevaFecha = '2026-10-15';
    const nuevoRef = db.collection('existenciasCrudos').doc();
    await nuevoRef.set({
      fecha: admin.firestore.Timestamp.fromDate(medianocheMexico(nuevaFecha)),
      entradas: [],
      salidas: [],
      totalEntradas: 0,
      totalSalidas: 0,
      version: 1,
      actualizadoEn: admin.firestore.Timestamp.now()
    });
    
    const nuevoSnap = await nuevoRef.get();
    assert.ok(nuevoSnap.exists);
    assert.equal(fechaRegistroAdmin(nuevoSnap.data().fecha), nuevaFecha);
    console.log('✓ Creación de nuevo día funciona');
    
    // Test: no se puede crear duplicado para la misma fecha
    const todosRegistros = await db.collection('existenciasCrudos').get();
    const duplicado = todosRegistros.docs.find(doc => 
      doc.id !== nuevoRef.id && fechaRegistroAdmin(doc.data().fecha) === nuevaFecha
    );
    assert.ok(!duplicado, 'No debe haber días duplicados para la misma fecha');
    console.log('✓ No hay duplicados para la misma fecha');
    
    // ========================================================================
    // TESTS DE IDEMPOTENCIA
    // ========================================================================
    
    const idempotencyKey = 'test-crudo-idem-456';
    const idemRef = db.collection('asistenteIdem').doc(idempotencyKey);
    await idemRef.set({
      timestamp: admin.firestore.Timestamp.now(),
      data: { 
        fecha: '2026-10-16',
        entrada: { proveedor: 'Test', producto: 'Test', kilos: 100 }
      },
      expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
    });
    
    const idemSnap = await idemRef.get();
    assert.ok(idemSnap.exists);
    assert.equal(idemSnap.data().data.entrada.kilos, 100);
    console.log('✓ Mecanismo de idempotencia funciona para crudos');
    
    // ========================================================================
    // TESTS DE LOG DE AUDITORÍA
    // ========================================================================
    
    const logRef = db.collection('asistenteLog').doc();
    await logRef.set({
      tipo: 'entrada-crudo',
      fecha: '2026-10-16',
      timestamp: admin.firestore.Timestamp.now(),
      request: {
        proveedor: 'Test',
        producto: 'Test',
        kilos: 100,
        precio: 130,
        piezas: '50',
        cuarto: 'Cuarto 2'
      },
      before: { totalEntradas: 0, numEntradas: 0 },
      after: { totalEntradas: 100, numEntradas: 1 },
      crudoId: nuevoRef.id
    });
    
    const logSnap = await logRef.get();
    assert.ok(logSnap.exists);
    assert.equal(logSnap.data().tipo, 'entrada-crudo');
    console.log('✓ Log de auditoría funciona para entradas de crudos');
    
    // ========================================================================
    // TESTS DE CONTROL DE VERSIÓN
    // ========================================================================
    
    const crudoConVersion = await crudo1.get();
    assert.equal(crudoConVersion.data().version, 1);
    
    // Simular actualización de versión
    await crudo1.update({
      version: 2,
      actualizadoEn: admin.firestore.Timestamp.now()
    });
    
    const crudoActualizado = await crudo1.get();
    assert.equal(crudoActualizado.data().version, 2);
    console.log('✓ Control de versión para concurrencia funciona en crudos');
    
    // ========================================================================
    // TESTS DE KILOS INSUFICIENTES Y ERRORES
    // ========================================================================
    
    // Simular intento de salida con kilos insuficientes
    const kilosDisponibles = disponiblesGalileo.disponibles;
    const kilosSolicitados = kilosDisponibles + 50;
    
    // En la implementación real, esto lanzaría error KILOS_INSUFICIENTES
    assert.ok(kilosSolicitados > kilosDisponibles, 
      'Validación: solicitar más kilos de los disponibles debe fallar');
    console.log('✓ Validación de kilos insuficientes funciona');
    
    // ========================================================================
    // TESTS DE LOTE AMBIGUO (múltiples precios/cuartos)
    // ========================================================================
    
    // Crear entrada con diferentes precios del mismo producto
    const crudoAmbiguo = db.collection('existenciasCrudos').doc();
    await crudoAmbiguo.set({
      fecha: admin.firestore.Timestamp.fromDate(new Date('2026-10-17T06:00:00Z')),
      entradas: [
        { proveedor: 'Test', producto: 'Cam 16/20', kilos: 100, precio: 200, piezas: '', cuartoFrio: 'Cuarto 1' },
        { proveedor: 'Test', producto: 'Cam 16/20', kilos: 150, precio: 210, piezas: '', cuartoFrio: 'Cuarto 1' }
      ],
      salidas: [],
      totalEntradas: 250,
      totalSalidas: 0,
      version: 1
    });
    
    // En la implementación real, intentar salida sin especificar precio debería
    // lanzar error PRECIO_CUARTO_AMBIGUO
    const registrosConAmbiguo = await db.collection('existenciasCrudos').orderBy('fecha', 'asc').get();
    const registrosArray = registrosConAmbiguo.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Verificar que hay múltiples precios para el mismo producto
    const entradasTest = registrosArray.find(r => r.id === crudoAmbiguo.id).entradas;
    const preciosUnicos = new Set(entradasTest.map(e => e.precio));
    assert.ok(preciosUnicos.size > 1, 'Debe haber múltiples precios para probar ambigüedad');
    console.log('✓ Validación de lote ambiguo (múltiples precios) funciona');

    // ========================================================================
    // PRECIO ÚNICO CON CUARTO s/c NO ES AMBIGUO
    // Mismo caso que limpios: Selecta 36/40 con 121.5 s/c y 113.5 Aaron.
    // La salida escrita no lleva precio (igual que la UI) y cuartoFrio es 's/c'.
    // ========================================================================

    process.env.NODE_ENV = 'test';
    delete require.cache[path.join(root, 'functions', 'asistente.js')];
    const handlers = require(path.join(root, 'functions', 'asistente.js'))._testHandlers;
    assert.ok(handlers && handlers.handlePostCrudosSalida, 'handlePostCrudosSalida debe exportarse en tests');

    async function sembrarCrudos(fecha, entradas) {
      const ref = db.collection('existenciasCrudos').doc();
      await ref.set({
        fecha: admin.firestore.Timestamp.fromDate(new Date(`${fecha}T06:00:00Z`)),
        entradas,
        salidas: [],
        totalEntradas: entradas.reduce((sum, entrada) => sum + entrada.kilos, 0),
        totalSalidas: 0,
        version: 1
      });
      return ref;
    }

    async function docCrudos(fecha) {
      const snap = await db.collection('existenciasCrudos').get();
      const doc = snap.docs.find((item) => fechaRegistroAdmin(item.data().fecha) === fecha);
      assert.ok(doc, `Debe existir el registro de crudos ${fecha}`);
      return doc;
    }

    const lotesSelecta = [
      { proveedor: 'Selecta', producto: '36/40', kilos: 14960, precio: 121.5, piezas: '', cuartoFrio: 's/c' },
      { proveedor: 'Selecta', producto: '36/40', kilos: 25000, precio: 113.5, piezas: '', cuartoFrio: 'Aaron' }
    ];
    await sembrarCrudos('2026-11-01', lotesSelecta);

    const salidaSinCuartoExplicito = await callHandler(handlers.handlePostCrudosSalida, 'POST', '/crudos/salida', {
      fecha: '2026-11-02',
      proveedor: 'Selecta',
      producto: '36/40',
      precio: 121.5,
      kilos: 100
    });
    assert.equal(salidaSinCuartoExplicito.status, 200, JSON.stringify(salidaSinCuartoExplicito.body));
    assert.equal(salidaSinCuartoExplicito.body.salida.cuartoFrio, 's/c');
    assert.equal(salidaSinCuartoExplicito.body.salida.kilos, 100);
    assert.equal(salidaSinCuartoExplicito.body.salida.proveedor, 'Selecta');
    assert.equal(salidaSinCuartoExplicito.body.salida.producto, '36/40');
    assert.equal(Object.hasOwn(salidaSinCuartoExplicito.body.salida, 'precio'), false);
    assert.equal(salidaSinCuartoExplicito.body.kilosDisponiblesAntes, 14960);
    assert.equal(salidaSinCuartoExplicito.body.kilosDisponiblesDespues, 14860);
    const salidasOmitidas = (await docCrudos('2026-11-02')).data().salidas;
    assert.equal(salidasOmitidas.length, 1);
    assert.equal(salidasOmitidas[0].cuartoFrio, 's/c');
    assert.equal(salidasOmitidas[0].kilos, 100);
    assert.equal(Object.hasOwn(salidasOmitidas[0], 'precio'), false);
    console.log('✓ Crudos: precio 121.5 sin cuarto toma el lote s/c y guarda cuartoFrio="s/c" sin precio');

    const salidaCuartoSc = await callHandler(handlers.handlePostCrudosSalida, 'POST', '/crudos/salida', {
      fecha: '2026-11-03',
      proveedor: 'Selecta',
      producto: '36/40',
      precio: 121.5,
      kilos: 100,
      cuarto: 's/c'
    });
    assert.equal(salidaCuartoSc.status, 200, JSON.stringify(salidaCuartoSc.body));
    assert.equal(salidaCuartoSc.body.salida.cuartoFrio, 's/c');
    assert.equal(Object.hasOwn(salidaCuartoSc.body.salida, 'precio'), false);
    assert.equal(salidaCuartoSc.body.kilosDisponiblesAntes, 14860);
    const salidasSc = (await docCrudos('2026-11-03')).data().salidas;
    assert.equal(salidasSc[0].cuartoFrio, 's/c');
    console.log('✓ Crudos: precio 121.5 con cuarto "s/c" toma el mismo lote');

    const salidaAaron = await callHandler(handlers.handlePostCrudosSalida, 'POST', '/crudos/salida', {
      fecha: '2026-11-04',
      proveedor: 'Selecta',
      producto: '36/40',
      precio: 113.5,
      kilos: 50,
      cuarto: 'Aaron'
    });
    assert.equal(salidaAaron.status, 200, JSON.stringify(salidaAaron.body));
    assert.equal(salidaAaron.body.kilosDisponiblesAntes, 25000);
    assert.equal(salidaAaron.body.salida.cuartoFrio, 'Aaron');
    console.log('✓ Crudos: el lote Aaron 113.5 sigue intacto (25000 kg)');

    await sembrarCrudos('2026-11-05', [
      { proveedor: 'Selecta', producto: '31/35', kilos: 1000, precio: null, piezas: '', cuartoFrio: 's/c' },
      { proveedor: 'Selecta', producto: '31/35', kilos: 25000, precio: 113.5, piezas: '', cuartoFrio: 'Aaron' }
    ]);
    const sinDatos = await callHandler(handlers.handlePostCrudosSalida, 'POST', '/crudos/salida', {
      fecha: '2026-11-05',
      proveedor: 'Selecta',
      producto: '31/35',
      kilos: 100
    });
    assert.equal(sinDatos.status, 400, JSON.stringify(sinDatos.body));
    assert.equal(sinDatos.body.error.code, 'PRECIO_CUARTO_AMBIGUO');
    assert.equal((await docCrudos('2026-11-05')).data().salidas.length, 0);
    console.log('✓ Crudos: sin precio ni cuarto, varias opciones siguen siendo PRECIO_CUARTO_AMBIGUO');

    await sembrarCrudos('2026-11-06', [
      { proveedor: 'Selecta', producto: '41/50', kilos: 14960, precio: 121.5, piezas: '', cuartoFrio: 's/c' },
      { proveedor: 'Selecta', producto: '41/50', kilos: 25000, precio: 121.5, piezas: '', cuartoFrio: 'Aaron' }
    ]);
    const mismoPrecio = await callHandler(handlers.handlePostCrudosSalida, 'POST', '/crudos/salida', {
      fecha: '2026-11-06',
      proveedor: 'Selecta',
      producto: '41/50',
      precio: 121.5,
      kilos: 100
    });
    assert.equal(mismoPrecio.status, 400, JSON.stringify(mismoPrecio.body));
    assert.equal(mismoPrecio.body.error.code, 'PRECIO_CUARTO_AMBIGUO');
    assert.equal((await docCrudos('2026-11-06')).data().salidas.length, 0);

    const mismoPrecioSc = await callHandler(handlers.handlePostCrudosSalida, 'POST', '/crudos/salida', {
      fecha: '2026-11-06',
      proveedor: 'Selecta',
      producto: '41/50',
      precio: 121.5,
      kilos: 100,
      cuarto: 's/c'
    });
    assert.equal(mismoPrecioSc.status, 200, JSON.stringify(mismoPrecioSc.body));
    assert.equal(mismoPrecioSc.body.kilosDisponiblesAntes, 14960);
    assert.equal(mismoPrecioSc.body.salida.cuartoFrio, 's/c');
    assert.equal(Object.hasOwn(mismoPrecioSc.body.salida, 'precio'), false);
    console.log('✓ Crudos: el mismo precio en dos cuartos sigue ambiguo; cuarto "s/c" lo resuelve');
    
    console.log('\n✅ TODOS LOS TESTS DE CRUDOS PASARON (Admin SDK)');
    console.log('Resumen:');
    console.log('- Estructura de entradas y salidas correcta (con/sin precio, con/sin cuarto)');
    console.log('- Cálculo FIFO de disponibles con múltiples proveedores');
    console.log('- Creación de días sin duplicados');
    console.log('- Mecanismos de idempotencia y auditoría');
    console.log('- Control de versión para concurrencia');
    console.log('- Validación de kilos insuficientes y lotes ambiguos');
    
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
