/**
 * Arranca el emulador de Firestore y carga los handlers de functions/asistente.js.
 * Mismo esquema que scripts/test-asistente-pedidos-limpio.cjs.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const net = require('node:net');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '../..');

function jarEmulador() {
  return process.env.FIRESTORE_EMULATOR_JAR
    || path.join(os.homedir(), '.cache/firebase/emulators/cloud-firestore-emulator-v1.19.8.jar');
}

async function puertoLibre() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function conEmulador(projectId, prueba) {
  const jar = jarEmulador();
  if (!fs.existsSync(jar)) {
    throw new Error(`FIRESTORE_EMULATOR_JAR no existe: ${jar}`);
  }
  const admin = require(path.join(root, 'functions', 'node_modules', 'firebase-admin'));
  const port = await puertoLibre();
  const emulator = spawn('java', [
    '-jar', jar,
    '--host', '127.0.0.1',
    '--port', String(port),
    '--project_id', projectId,
    '--single_project_mode',
    '--single_project_mode_error',
    '--rules', path.join(root, 'scripts', 'fixtures', 'sacadas-emulator.rules')
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  let log = '';
  emulator.stdout.on('data', (chunk) => { log = (log + chunk).slice(-8000); });
  emulator.stderr.on('data', (chunk) => { log = (log + chunk).slice(-8000); });

  let app;
  try {
    let listo = false;
    for (let i = 0; i < 150; i += 1) {
      if (emulator.exitCode !== null) throw new Error(log);
      try {
        await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(200) });
        listo = true;
        break;
      } catch { /* sigue */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!listo) throw new Error('Emulador no respondió');

    app = admin.initializeApp({ projectId }, 'pedidos-tests');
    const db = app.firestore();
    db.settings({ host: `127.0.0.1:${port}`, ssl: false });
    process.env.NODE_ENV = 'test';
    process.env.ASISTENTE_API_KEY = 'test-key';
    process.env.FIRESTORE_EMULATOR_HOST = `127.0.0.1:${port}`;
    process.env.GCLOUD_PROJECT = projectId;
    delete require.cache[path.join(root, 'functions', 'asistente.js')];
    const handlers = require(path.join(root, 'functions', 'asistente.js'))._testHandlers;
    if (!handlers) throw new Error('Handlers no exportados');
    await prueba({ admin, db, handlers });
  } finally {
    if (app) await app.delete().catch(() => {});
    emulator.kill('SIGKILL');
  }
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

module.exports = { conEmulador, callHandler };
