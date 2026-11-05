// Respaldo diario de Firestore (functions/respaldo.js) con un cliente simulado: sin red ni Google Cloud.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { exportarFirestore } = require(path.join(__dirname, '..', 'functions', 'respaldo.js'));

// Cliente que solo permite databasePath y exportDocuments: cualquier otra llamada falla la prueba.
function clienteSimulado() {
  const llamadas = [];
  const permitido = {
    databasePath: (proyecto, base) => `projects/${proyecto}/databases/${base}`,
    exportDocuments: async (req) => { llamadas.push(req); return [{ name: 'operations/abc123' }]; }
  };
  const cliente = new Proxy(permitido, {
    get(obj, prop) {
      if (prop in obj) return obj[prop];
      if (prop === 'then') return undefined;
      throw new Error(`El respaldo no debe usar ${String(prop)}`);
    }
  });
  return { cliente, llamadas };
}

test('sin RESPALDO_BUCKET no hace nada', async () => {
  const { cliente, llamadas } = clienteSimulado();
  const r = await exportarFirestore({ projectId: 'demo', bucket: '', cliente });
  assert.deepEqual(r, { omitido: true, motivo: 'RESPALDO_BUCKET sin configurar' });
  assert.equal(llamadas.length, 0);
});

test('exporta todas las colecciones a una carpeta por día (hora de México)', async () => {
  const { cliente, llamadas } = clienteSimulado();
  // 03:15 en México del 5 de noviembre = 09:15 UTC
  const r = await exportarFirestore({ projectId: 'reypezapp-1ced2', bucket: 'gs://reypez-respaldos/', cliente, ahora: new Date('2026-11-05T09:15:00Z') });
  assert.deepEqual(llamadas, [{
    name: 'projects/reypezapp-1ced2/databases/(default)',
    outputUriPrefix: 'gs://reypez-respaldos/firestore/2026-11-05',
    collectionIds: []
  }]);
  assert.deepEqual(r, { omitido: false, prefijo: 'gs://reypez-respaldos/firestore/2026-11-05', operacion: 'operations/abc123' });
});

test('el día se calcula en hora de México, no en UTC', async () => {
  const { cliente, llamadas } = clienteSimulado();
  // 23:30 del 4 de noviembre en México = 05:30 UTC del 5
  await exportarFirestore({ projectId: 'p', bucket: 'gs://b-respaldo', cliente, ahora: new Date('2026-11-05T05:30:00Z') });
  assert.equal(llamadas[0].outputUriPrefix, 'gs://b-respaldo/firestore/2026-11-04');
});

test('rechaza un bucket mal escrito y no llama a Google', async () => {
  const { cliente, llamadas } = clienteSimulado();
  await assert.rejects(exportarFirestore({ projectId: 'p', bucket: 'reypez-respaldos', cliente }), /RESPALDO_BUCKET inválido/);
  await assert.rejects(exportarFirestore({ projectId: 'p', bucket: 'gs://Mayus Y Espacios', cliente }), /RESPALDO_BUCKET inválido/);
  assert.equal(llamadas.length, 0);
});

test('functions/index.js exporta la función programada', () => {
  const src = require('node:fs').readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
  assert.match(src, /exports\.respaldoDiarioFirestore = require\('\.\/respaldo'\)\.respaldoDiarioFirestore/);
  const { respaldoDiarioFirestore } = require(path.join(__dirname, '..', 'functions', 'respaldo.js'));
  assert.equal(typeof respaldoDiarioFirestore, 'function');
  assert.equal(respaldoDiarioFirestore.__endpoint.scheduleTrigger.schedule, '15 3 * * *');
  assert.equal(respaldoDiarioFirestore.__endpoint.scheduleTrigger.timeZone, 'America/Mexico_City');
});
