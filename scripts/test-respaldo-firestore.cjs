// Respaldo diario de Firestore (functions/respaldo.js) con Google Cloud simulado: sin red.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const R = require(path.join(__dirname, '..', 'functions', 'respaldo.js'));

// Cliente de export que solo permite databasePath y exportDocuments.
function clienteSimulado({ falla } = {}) {
  const eventos = [];
  const permitido = {
    databasePath: (proyecto, base) => `projects/${proyecto}/databases/${base}`,
    exportDocuments: async req => {
      eventos.push(['export', req]);
      if (falla) throw falla;
      return [{ name: 'operations/abc123', promise: async () => { eventos.push(['export-terminado']); } }];
    }
  };
  const cliente = new Proxy(permitido, { get(o, p) { if (p in o) return o[p]; if (p === 'then') return undefined; throw new Error(`El respaldo no debe usar ${String(p)}`); } });
  return { cliente, eventos };
}
function storageSimulado(nombres, { fallaListar } = {}) {
  const borrados = [];
  return {
    borrados,
    getFiles: async ({ prefix }) => {
      if (fallaListar) throw new Error('sin permiso para listar');
      assert.equal(prefix, 'respaldos/firestore/', 'solo debe listar dentro de respaldos/firestore/');
      return [nombres.filter(n => n.startsWith(prefix)).map(name => ({ name, delete: async () => { borrados.push(name); } }))];
    }
  };
}
function dbSimulada(eventos) {
  const docs = {};
  return { docs, doc: ruta => ({ set: async (data, opts) => { eventos && eventos.push(['estado', data.estado]); docs[ruta] = { ...(docs[ruta] || {}), ...data, _merge: opts && opts.merge }; } }) };
}
const AHORA = new Date('2026-11-06T09:15:00Z'); // 03:15 en México

test('destino: sin configurar usa la carpeta de Storage del proyecto; off apaga; gs:// personaliza', () => {
  assert.equal(R.resolverBucket({ valorEnv: '', bucketDelProyecto: 'reypezapp-1ced2.firebasestorage.app' }), 'reypezapp-1ced2.firebasestorage.app');
  assert.equal(R.resolverBucket({ valorEnv: 'off', bucketDelProyecto: 'x' }), null);
  assert.equal(R.resolverBucket({ valorEnv: 'OFF', bucketDelProyecto: 'x' }), null);
  assert.equal(R.resolverBucket({ valorEnv: 'gs://mis-respaldos/', bucketDelProyecto: 'x' }), 'mis-respaldos');
  assert.throws(() => R.resolverBucket({ valorEnv: 'mis-respaldos', bucketDelProyecto: 'x' }), /inválido/);
  assert.throws(() => R.resolverBucket({ valorEnv: '', bucketDelProyecto: '' }), /RESPALDO_BUCKET/);
});

test('carpeta por fecha y hora de México', () => {
  assert.equal(R.carpetaDelRespaldo(AHORA), 'respaldos/firestore/2026-11-06_0315');
  assert.equal(R.carpetaDelRespaldo(new Date('2026-11-06T05:30:00Z')), 'respaldos/firestore/2026-11-05_2330');
});

test('respaldo completo: exporta todo, espera a que termine, borra solo lo viejo y deja el estado', async () => {
  const { cliente, eventos } = clienteSimulado();
  const storage = storageSimulado([
    'respaldos/firestore/2026-11-06_0315/a.export_metadata',      // hoy: se queda
    'respaldos/firestore/2026-10-08_0315/b.export_metadata',      // 29 días: se queda
    'respaldos/firestore/2026-10-06_0315/c.export_metadata',      // 31 días: se borra
    'respaldos/firestore/2026-10-06_0315/all_namespaces/d',       // 31 días: se borra
    'respaldos/firestore/2025-01-01/e',                           // formato sin hora, viejo: se borra
    'respaldos/firestore/no-es-fecha/f',                          // no es fecha: no se toca
    'respaldos/firestore/archivo-suelto',                         // sin carpeta: no se toca
    'respaldos/otra/2020-01-01/g',                                // fuera del prefijo: no se lista
    'bitacoras/x/foto.jpg'                                        // fotos: nunca
  ]);
  const db = dbSimulada(eventos);
  const r = await R.ejecutarRespaldo({ projectId: 'reypezapp-1ced2', bucket: 'reypezapp-1ced2.firebasestorage.app', cliente, storageBucket: storage, db, dias: 30, ahora: AHORA, marcaServidor: 'TS' });
  assert.deepEqual(eventos[0], ['export', { name: 'projects/reypezapp-1ced2/databases/(default)', outputUriPrefix: 'gs://reypezapp-1ced2.firebasestorage.app/respaldos/firestore/2026-11-06_0315', collectionIds: [] }]);
  assert.deepEqual(eventos.map(e => e[0]), ['export', 'export-terminado', 'estado'], 'el estado se escribe después de que el export termina');
  assert.deepEqual(storage.borrados.sort(), ['respaldos/firestore/2025-01-01/e', 'respaldos/firestore/2026-10-06_0315/all_namespaces/d', 'respaldos/firestore/2026-10-06_0315/c.export_metadata']);
  assert.equal(r.estado, 'completo'); assert.equal(r.carpetasBorradas, 2);
  const estado = db.docs['sistema/respaldos'];
  assert.equal(estado.estado, 'completo'); assert.equal(estado.ultimoRespaldo, 'TS'); assert.equal(estado.error, null); assert.equal(estado._merge, true);
  assert.equal(estado.ultimaCarpeta, 'gs://reypezapp-1ced2.firebasestorage.app/respaldos/firestore/2026-11-06_0315');
});

test('sin permiso para exportar: deja el error explicado en el estado, no borra nada y avisa a Cloud Functions', async () => {
  const falla = Object.assign(new Error('7 PERMISSION_DENIED: The caller does not have permission'), { code: 7 });
  const { cliente } = clienteSimulado({ falla });
  const storage = storageSimulado(['respaldos/firestore/2020-01-01_0315/x']);
  const db = dbSimulada();
  await assert.rejects(R.ejecutarRespaldo({ projectId: 'p', bucket: 'b-r', cliente, storageBucket: storage, db, ahora: AHORA, marcaServidor: 'TS' }), /PERMISSION_DENIED/);
  assert.equal(storage.borrados.length, 0, 'si el respaldo falla no se borra ningún respaldo anterior');
  const estado = db.docs['sistema/respaldos'];
  assert.equal(estado.estado, 'error'); assert.match(estado.error, /Cloud Datastore Import Export Admin/); assert.equal(estado.fechaError, 'TS');
});

test('si la limpieza falla, el respaldo igual queda completo con un aviso', async () => {
  const { cliente } = clienteSimulado();
  const db = dbSimulada();
  const r = await R.ejecutarRespaldo({ projectId: 'p', bucket: 'b-r', cliente, storageBucket: storageSimulado([], { fallaListar: true }), db, ahora: AHORA, marcaServidor: 'TS' });
  assert.equal(r.estado, 'completo'); assert.match(r.aviso, /no se pudieron borrar/);
});

test('functions/index.js exporta la función programada (03:15 hora de México, 9 min de límite)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
  assert.match(src, /exports\.respaldoDiarioFirestore = require\('\.\/respaldo'\)\.respaldoDiarioFirestore/);
  const ep = R.respaldoDiarioFirestore.__endpoint;
  assert.equal(ep.scheduleTrigger.schedule, '15 3 * * *');
  assert.equal(ep.scheduleTrigger.timeZone, 'America/Mexico_City');
  assert.equal(ep.timeoutSeconds, 540);
});
