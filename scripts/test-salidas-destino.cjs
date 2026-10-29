// Destino opcional por salida de crudo (existenciasCrudos/{dia}.salidas[].destino / destinoDetalle).
// 1) Módulo real de la app (src/utils/destinoSalida.js) compilado con Babel: normalizar, aplicar, etiqueta, filtro.
// 2) Handler real POST /crudos/salida del asistente contra el emulador de Firestore (project demo, nunca producción).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const net = require('node:net');
const path = require('node:path');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const projectId = 'demo-reypez-salidas-destino';

function compilar(archivo) {
  const source = fs.readFileSync(path.join(root, archivo), 'utf8');
  const codigo = babel.transformSync(source, {
    babelrc: false, configFile: false, filename: archivo,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const modulo = { exports: {} };
  vm.runInNewContext(codigo, { module: modulo, exports: modulo.exports, console }, { filename: archivo });
  return modulo.exports;
}
// Los valores creados dentro de vm tienen otros prototipos: comparar como JSON.
const plano = v => JSON.parse(JSON.stringify(v === undefined ? null : v));

function probarModuloApp() {
  const d = compilar('src/utils/destinoSalida.js');
  assert.deepEqual(plano(d.DESTINOS_SALIDA.map(x => x.valor)), ['embarque', 'macuil', 'venta_local', 'otro']);
  assert.deepEqual(plano(d.DESTINOS_SALIDA.map(x => x.etiqueta)), ['Embarque cliente', 'Macuil', 'Venta local', 'Otro']);
  const fn = require(path.join(root, 'functions', 'lib', 'destinoSalida.js'));
  assert.deepEqual(fn.DESTINOS_SALIDA, plano(d.DESTINOS_SALIDA.map(x => x.valor)), 'app y asistente deben aceptar los mismos destinos');

  assert.deepEqual(plano({ ...d.normalizarDestino('', 'x') }), {});
  assert.deepEqual(plano({ ...d.normalizarDestino(undefined) }), {});
  assert.deepEqual(plano({ ...d.normalizarDestino('macuil', 'ignorado') }), { destino: 'macuil' });
  assert.deepEqual(plano({ ...d.normalizarDestino('otro', '  Tienda Pepe ') }), { destino: 'otro', destinoDetalle: 'Tienda Pepe' });
  assert.deepEqual(plano({ ...d.normalizarDestino('otro', '   ') }), { destino: 'otro' });
  assert.ok(d.normalizarDestino('bodega').error);
  assert.ok(d.normalizarDestino('otro', 'x'.repeat(81)).error);

  // Aplicar no toca kilos/cuarto/proveedor y quitar destino deja la salida como antes (legacy).
  const salida = { proveedor: 'Galileo', producto: 'Pac Ch', kilos: 113, cuartoFrio: 'Cuarto 1' };
  const original = { ...salida };
  d.aplicarDestino(salida, 'otro', 'Mercado');
  assert.deepEqual({ ...salida }, { ...original, destino: 'otro', destinoDetalle: 'Mercado' });
  d.aplicarDestino(salida, 'venta_local', 'Mercado');
  assert.deepEqual({ ...salida }, { ...original, destino: 'venta_local' });
  d.aplicarDestino(salida, '', '');
  assert.deepEqual({ ...salida }, original);
  const r = d.aplicarDestino(salida, 'nope');
  assert.ok(r.error);
  assert.deepEqual({ ...salida }, original, 'un destino inválido no modifica la salida');

  assert.equal(d.etiquetaDestino({ destino: 'embarque' }), 'Embarque cliente');
  assert.equal(d.etiquetaDestino({ destino: 'otro', destinoDetalle: 'Mercado' }), 'Otro: Mercado');
  assert.equal(d.etiquetaDestino({ destino: 'otro' }), 'Otro');
  assert.equal(d.etiquetaDestino({}), '');

  const salidas = [
    { producto: 'A', kilos: 10, destino: 'macuil' },
    { producto: 'B', kilos: 20 },
    { producto: 'C', kilos: 30, destino: 'macuil' },
    { producto: 'D', kilos: 40, destino: 'raro' },
    { producto: 'E', kilos: 50, destino: 'otro', destinoDetalle: 'X' },
  ];
  const indices = f => d.filtrarPorDestino(salidas, f).map(x => x.indice);
  assert.deepEqual(plano(indices('')), [0, 1, 2, 3, 4]);
  assert.deepEqual(plano(indices('macuil')), [0, 2], 'el índice es la posición real (para editar/borrar)');
  assert.deepEqual(plano(indices(d.FILTRO_SIN_DESTINO)), [1, 3]);
  assert.deepEqual(plano(indices('otro')), [4]);
  assert.equal(d.filtrarPorDestino(salidas, 'macuil')[1].salida, salidas[2]);
  assert.deepEqual(plano(d.filtrarPorDestino(undefined, '')), []);
  console.log('✓ src/utils/destinoSalida.js: normalizar, aplicar, etiqueta y filtro');
}

function mockReq(body) {
  return { method: 'POST', path: '/crudos/salida', query: {}, headers: { authorization: 'Bearer test-key' }, body };
}
async function llamar(handler, body) {
  const res = { statusCode: 200, _body: null, status(c) { this.statusCode = c; return this; },
    json(b) { this._body = b; return this; }, send(b) { this._body = b; return this; }, setHeader() { return this; } };
  await handler(mockReq(body), res);
  return { status: res.statusCode, body: res._body };
}
async function puertoLibre() {
  const s = net.createServer();
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  const p = s.address().port;
  await new Promise(r => s.close(r));
  return p;
}

async function probarAsistente() {
  const jar = process.env.FIRESTORE_EMULATOR_JAR || path.join(os.homedir(), '.cache/firebase/emulators/cloud-firestore-emulator-v1.19.8.jar');
  assert.ok(fs.existsSync(jar), 'Configura FIRESTORE_EMULATOR_JAR');
  const port = await puertoLibre();
  const emu = spawn('java', ['-jar', jar, '--host', '127.0.0.1', '--port', String(port), '--project_id', projectId, '--single_project_mode'],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  emu.stdout.on('data', c => { log = (log + c).slice(-4000); });
  emu.stderr.on('data', c => { log = (log + c).slice(-4000); });
  let app;
  try {
    let listo = false;
    for (let i = 0; i < 150 && !listo; i++) {
      if (emu.exitCode !== null) throw new Error(log);
      try { await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(200) }); listo = true; } catch (_) { await new Promise(r => setTimeout(r, 100)); }
    }
    assert.ok(listo, 'El emulador no inició: ' + log);
    process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${port}`;
    process.env.GCLOUD_PROJECT = projectId;
    process.env.NODE_ENV = 'test';
    const admin = require(path.join(root, 'functions', 'node_modules', 'firebase-admin'));
    app = admin.initializeApp({ projectId }, 'salidas-destino-test');
    const db = admin.firestore(app);
    const { fechaRegistroAdmin } = require(path.join(root, 'functions', 'lib', 'inventario'));
    const handlers = require(path.join(root, 'functions', 'asistente.js'))._testHandlers;
    const post = body => llamar(handlers.handlePostCrudosSalida, body);

    await db.collection('existenciasCrudos').doc().set({
      fecha: admin.firestore.Timestamp.fromDate(new Date('2026-11-01T06:00:00Z')),
      entradas: [{ proveedor: 'Selecta', producto: '36/40', kilos: 1000, precio: 120, piezas: '', cuartoFrio: 's/c' }],
      salidas: [], totalEntradas: 1000, totalSalidas: 0, version: 1,
    });
    const base = { fecha: '2026-11-02', proveedor: 'Selecta', producto: '36/40', cuarto: 's/c', precio: 120 };

    const sinDestino = await post({ ...base, kilos: 100 });
    assert.equal(sinDestino.status, 200, JSON.stringify(sinDestino.body));
    assert.equal(Object.hasOwn(sinDestino.body.salida, 'destino'), false, 'sin destino no se escribe el campo (legacy)');

    const macuil = await post({ ...base, kilos: 50, destino: 'macuil' });
    assert.equal(macuil.status, 200, JSON.stringify(macuil.body));
    assert.equal(macuil.body.salida.destino, 'macuil');
    assert.equal(Object.hasOwn(macuil.body.salida, 'destinoDetalle'), false);

    const otro = await post({ ...base, kilos: 25, destino: 'otro', destinoDetalle: ' Tienda Pepe ' });
    assert.equal(otro.status, 200, JSON.stringify(otro.body));

    for (const malo of [{ destino: 'bodega' }, { destino: 'macuil', destinoDetalle: 'x' }, { destino: 'otro', destinoDetalle: 'x'.repeat(81) }]) {
      const r = await post({ ...base, kilos: 5, ...malo });
      assert.equal(r.status, 400, JSON.stringify(malo));
      assert.match(JSON.stringify(r.body), /PARAMETRO_INVALIDO/);
    }

    const snap = await db.collection('existenciasCrudos').get();
    const dia = snap.docs.find(doc => fechaRegistroAdmin(doc.data().fecha) === '2026-11-02').data();
    assert.equal(dia.salidas.length, 3, 'las peticiones inválidas no escriben');
    assert.deepEqual(dia.salidas.map(s => [s.kilos, s.destino ?? null, s.destinoDetalle ?? null]),
      [[100, null, null], [50, 'macuil', null], [25, 'otro', 'Tienda Pepe']]);
    assert.equal(dia.totalSalidas, 175, 'el destino no cambia totales');
    console.log('✓ POST /crudos/salida acepta destino/destinoDetalle opcionales y rechaza valores inválidos');
  } finally {
    if (app) await app.delete().catch(() => {});
    emu.kill('SIGTERM');
  }
}

(async () => {
  probarModuloApp();
  await probarAsistente();
  console.log('PASS test-salidas-destino');
})().catch(err => { console.error(err); process.exit(1); });
