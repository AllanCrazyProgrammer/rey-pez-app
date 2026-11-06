#!/usr/bin/env node
/**
 * Abonos en cascada y por nota. Replica StashModalV2 sobre el emulador.
 *
 *   node scripts/test-asistente-abonos.cjs
 */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { distribuirCascada, descripcionAbono } = require('../functions/lib/abonosClientes');
const { conEmulador, callHandler } = require('./lib/asistente-emulator.cjs');
const { loadSource } = require('./helpers/embarques-source.cjs');

function nota(id, fecha, venta, extra = {}) {
  return {
    id,
    fecha,
    data: {
      fecha,
      totalGeneralVenta: venta,
      saldoAcumuladoAnterior: 0,
      abonos: [],
      cobros: [],
      correcciones: [],
      estadoPagado: false,
      nuevoSaldoAcumulado: venta,
      ...extra
    }
  };
}

const meta = {
  descripcion: descripcionAbono('2026-10-13', 'Transferencia'),
  fecha: '2026-10-13T00:00:00',
  fechaOriginalStash: '2026-10-13',
  esEfectivo: false,
  stashItemId: 'stash-compartido'
};

const plan = distribuirCascada([
  nota('vieja', '2026-08-01', 400),
  nota('media', '2026-09-01', 700),
  nota('pagada', '2026-09-15', 900, { estadoPagado: true })
].filter((item) => !item.data.estadoPagado), 1000, meta, false);

assert.equal(plan.aplicaciones.length, 2);
assert.equal(plan.aplicaciones[0].notaId, 'vieja');
assert.equal(plan.aplicaciones[0].monto, 400);
assert.equal(plan.aplicaciones[1].monto, 600);
assert.equal(plan.aplicaciones[0].abono.stashItemId, plan.aplicaciones[1].abono.stashItemId);
assert.equal(plan.sobrante, 0);
assert.deepEqual(Object.keys(plan.aplicaciones[0].abono).sort(), [
  'descripcion', 'esEfectivo', 'fecha', 'fechaOriginalStash', 'monto', 'stashItemId'
]);

const ozuna = distribuirCascada([{
  id: 'oz',
  fecha: '2026-09-01',
  data: { fecha: '2026-09-01', nuevoSaldoAcumulado: 300, abonos: [] }
}], 100, meta, true);
assert.equal(ozuna.aplicaciones[0].monto, 100);
assert.equal(ozuna.sobrante, 0);
console.log('✓ Cascada en memoria: nota vieja primero, stashItemId compartido, Ozuna por saldo acumulado');

if (process.argv.includes('--handler-real')) {
  delete process.env.NODE_ENV;
  handlerRealMain().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else conEmulador('demo-reypez-abonos', async ({ db, handlers }) => {
  async function notaVeronica(fecha, venta, extra = {}) {
    await db.collection('cuentasVeronica').doc(fecha).set({
      fecha,
      totalGeneralVenta: venta,
      saldoAcumuladoAnterior: 0,
      abonos: [],
      cobros: [],
      correcciones: [],
      estadoPagado: false,
      nuevoSaldoAcumulado: venta,
      ...extra
    });
  }

  await notaVeronica('2026-08-01', 400);
  await notaVeronica('2026-09-01', 700);
  await notaVeronica('2026-09-15', 900, { estadoPagado: true });

  const pendiente = await callHandler(handlers.handleGetAbonos, 'GET', '/abonos?cliente=Lorena');
  assert.equal(pendiente.status, 200);
  assert.equal(pendiente.body.coleccion, 'cuentasVeronica');
  assert.deepEqual(pendiente.body.notas.map((notaItem) => notaItem.id), ['2026-08-01', '2026-09-01']);
  console.log('✓ GET /abonos alias Lorena → cuentasVeronica, omite la nota pagada');

  const seco = await callHandler(handlers.handlePostAbonos, 'POST', '/abonos', {
    cliente: 'lorena',
    monto: 1000,
    metodo: 'Transferencia',
    fecha: '2026-10-13',
    modo: 'cascada',
    idempotencyKey: 'abono-cascada-1',
    dryRun: true
  });
  assert.equal(seco.status, 200);
  assert.equal(seco.body.dryRun, true);
  assert.equal((await db.collection('cuentasVeronica').doc('2026-08-01').get()).data().abonos.length, 0);
  console.log('✓ dryRun no escribe');

  const creado = await callHandler(handlers.handlePostAbonos, 'POST', '/abonos', {
    cliente: 'verónica',
    monto: 1000,
    metodo: 'Transferencia',
    fecha: '2026-10-13',
    modo: 'cascada',
    idempotencyKey: 'abono-cascada-1'
  });
  assert.equal(creado.status, 200, JSON.stringify(creado.body));
  assert.equal(creado.body.aplicaciones.length, 2);
  const stashId = creado.body.aplicaciones[0].abono.stashItemId;
  assert.equal(creado.body.aplicaciones[1].abono.stashItemId, stashId);
  assert.equal(creado.body.aplicaciones[0].abono.descripcion, '13/10/2026 - Transferencia');
  assert.equal(creado.body.aplicaciones[0].abono.fecha, '2026-10-13T00:00:00');
  assert.equal(creado.body.aplicaciones[0].abono.fechaOriginalStash, '2026-10-13');
  assert.equal(creado.body.aplicaciones[0].abono.esEfectivo, false);
  assert.equal(creado.body.sobrante, 0);

  const vieja = (await db.collection('cuentasVeronica').doc('2026-08-01').get()).data();
  const media = (await db.collection('cuentasVeronica').doc('2026-09-01').get()).data();
  assert.equal(vieja.abonos.length, 1);
  assert.equal(vieja.abonos[0].monto, 400);
  assert.equal(vieja.estadoPagado, true);
  assert.equal(vieja.nuevoSaldoAcumulado, 0);
  assert.equal(media.abonos[0].monto, 600);
  assert.equal(media.nuevoSaldoAcumulado, 100);
  assert.equal(media.estadoPagado, false);
  assert.deepEqual(Object.keys(vieja.abonos[0]).sort(), [
    'descripcion', 'esEfectivo', 'fecha', 'fechaOriginalStash', 'monto', 'stashItemId'
  ]);
  console.log('✓ POST /abonos cascada parte la nota vieja y deja el saldo de la siguiente');

  const repetido = await callHandler(handlers.handlePostAbonos, 'POST', '/abonos', {
    cliente: 'veronica',
    monto: 9999,
    metodo: 'Efectivo',
    fecha: '2026-10-13',
    modo: 'cascada',
    idempotencyKey: 'abono-cascada-1'
  });
  assert.equal(repetido.body.totalAplicado, 1000);
  assert.equal((await db.collection('cuentasVeronica').doc('2026-08-01').get()).data().abonos.length, 1);
  console.log('✓ La misma idempotencyKey no duplica el abono');

  const explicita = await callHandler(handlers.handlePostAbonos, 'POST', '/abonos', {
    cliente: 'veronica',
    monto: 50,
    metodo: 'Deposito',
    fecha: '2026-10-14',
    modo: 'nota',
    nota: '2026-09-15',
    idempotencyKey: 'abono-nota-1'
  });
  assert.equal(explicita.status, 200, JSON.stringify(explicita.body));
  assert.equal(explicita.body.aplicaciones[0].monto, 50);
  assert.equal(explicita.body.aplicaciones[0].abono.esEfectivo, false);
  const pagada = (await db.collection('cuentasVeronica').doc('2026-09-15').get()).data();
  assert.equal(pagada.abonos[0].descripcion, '14/10/2026 - Deposito');
  assert.equal(pagada.abonos[0].monto, 50);
  console.log('✓ Modo nota aplica el monto completo a la nota indicada');

  const deshecho = await callHandler(handlers.handlePostAbonosDeshacer, 'POST', '/abonos/deshacer', {
    idempotencyKey: 'abono-cascada-1',
    undoIdempotencyKey: 'undo-abono-cascada-1'
  });
  assert.equal(deshecho.status, 200, JSON.stringify(deshecho.body));
  const viejaUndo = (await db.collection('cuentasVeronica').doc('2026-08-01').get()).data();
  const mediaUndo = (await db.collection('cuentasVeronica').doc('2026-09-01').get()).data();
  assert.deepEqual(viejaUndo.abonos, []);
  assert.equal(viejaUndo.estadoPagado, false);
  assert.equal(viejaUndo.nuevoSaldoAcumulado, 400);
  assert.equal(mediaUndo.abonos.length, 0);
  assert.equal(mediaUndo.nuevoSaldoAcumulado, 700);
  console.log('✓ Deshacer quita solo los abonos del asistente y restaura el saldo');

  const otraVez = await callHandler(handlers.handlePostAbonosDeshacer, 'POST', '/abonos/deshacer', {
    idempotencyKey: 'abono-cascada-1',
    undoIdempotencyKey: 'undo-abono-cascada-2'
  });
  assert.equal(otraVez.status, 400);
  assert.equal(otraVez.body.error.code, 'YA_DESHECHO');
  console.log('✓ El segundo deshacer responde YA_DESHECHO');

  const hoy = fechaHoyMexico();
  const viejaFecha = diasAntes(hoy, 40);
  await probarAbonosOzuna({
    db,
    call: (method, url, body) => callHandler(
      url === '/abonos/deshacer' ? handlers.handlePostAbonosDeshacer : handlers.handlePostAbonos,
      method, url, body
    ),
    hoy,
    viejaFecha
  });

  const real = await correrHandlerReal(process.env.FIRESTORE_EMULATOR_HOST);
  assert.equal(real, 0, 'el handler real asistente no pasó el abono de Ozuna y la nota del embarque');
  console.log('✓ Handler real de functions/index.js, sin NODE_ENV=test, contra el emulador');
}).then(() => {
  console.log('\nTodos los tests de abonos pasaron');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});

function fechaHoyMexico() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function diasAntes(iso, dias) {
  const [anio, mes, dia] = iso.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() - dias);
  return fecha.toISOString().slice(0, 10);
}

function notaViejaOzuna(fecha) {
  return {
    fecha,
    totalGeneral: 1000,
    items: [{ kilos: 10, medida: '36/40', costo: 100, total: 1000, esVenta: false }],
    cobros: [],
    abonos: [],
    saldoAcumuladoAnterior: 0,
    totalSaldo: 1000,
    nuevoSaldoAcumulado: 1000
  };
}

function notaHoyPreviaOzuna(fecha) {
  return {
    fecha,
    totalGeneral: 400,
    items: [{ kilos: 20, medida: '41/50', costo: 20, total: 400, esVenta: false }],
    cobros: [],
    abonos: [],
    saldoAcumuladoAnterior: 1000,
    totalSaldo: 1400,
    nuevoSaldoAcumulado: 1400
  };
}

function repoCuentasOzuna(db) {
  const col = () => db.collection('cuentasOzuna');
  return {
    buscarPorFecha: async (fecha) => (await col().where('fecha', '==', fecha).get())
      .docs.map((doc) => ({ id: doc.id, data: doc.data() })),
    crear: async (fecha, datos) => {
      await col().doc(fecha).set(datos);
      return fecha;
    },
    actualizar: async (id, datos) => {
      await col().doc(id).update(datos);
    }
  };
}

async function probarAbonosOzuna({ db, call, hoy, viejaFecha }) {
  const abonosMod = require('../functions/lib/abonosClientes');
  if (typeof abonosMod.fechaHoyMexico === 'function') {
    assert.equal(hoy, abonosMod.fechaHoyMexico(), 'el día de la prueba tiene que ser el hoy de México del módulo');
  }
  const notaMod = loadSource('src/utils/ozunaCuentaNota.js');
  await db.collection('cuentasOzuna').doc(viejaFecha).set(notaViejaOzuna(viejaFecha));
  await db.collection('cuentasOzuna').doc(hoy).set(notaHoyPreviaOzuna(hoy));
  const viejaAntes = (await db.collection('cuentasOzuna').doc(viejaFecha).get()).data();

  const previa = await call('POST', '/abonos', {
    cliente: 'ozuna',
    monto: 80,
    metodo: 'Efectivo',
    fecha: '2020-01-15',
    modo: 'cascada',
    idempotencyKey: 'ozuna-hoy-previa'
  });
  assert.equal(previa.status, 200, JSON.stringify(previa.body));
  assert.equal(previa.body.modo, 'hoy');
  assert.equal(previa.body.fechaNota, hoy);
  assert.equal(previa.body.notaCreada, false);
  assert.equal(previa.body.sobrante, 0);
  assert.equal(previa.body.stashSobranteId, null);
  assert.equal(previa.body.aplicaciones.length, 1);
  assert.equal(previa.body.aplicaciones[0].notaId, hoy);
  assert.equal(previa.body.aplicaciones[0].monto, 80);
  assert.equal(previa.body.aplicaciones[0].abono.descripcion, descripcionAbono('2020-01-15', 'Efectivo'));

  let hoyData = (await db.collection('cuentasOzuna').doc(hoy).get()).data();
  assert.equal(hoyData.abonos.length, 1);
  assert.equal(hoyData.abonos[0].monto, 80);
  assert.equal(hoyData.nuevoSaldoAcumulado, 1320);
  assert.equal(hoyData.totalSaldo, 1320);
  assert.equal(hoyData.totalGeneral, 400);
  assert.deepEqual((await db.collection('cuentasOzuna').doc(viejaFecha).get()).data(), viejaAntes);
  console.log('✓ Ozuna con nota de hoy: el abono entra ahí y la nota vieja no cambia');

  const repetida = await call('POST', '/abonos', {
    cliente: 'ozuna',
    monto: 9999,
    metodo: 'Transferencia',
    fecha: hoy,
    modo: 'cascada',
    idempotencyKey: 'ozuna-hoy-previa'
  });
  assert.equal(repetida.body.totalAplicado, 80);
  assert.equal((await db.collection('cuentasOzuna').doc(hoy).get()).data().abonos.length, 1);
  assert.deepEqual((await db.collection('cuentasOzuna').doc(viejaFecha).get()).data(), viejaAntes);
  console.log('✓ Reintento del abono sobre la nota de hoy no lo duplica');

  const deshecha = await call('POST', '/abonos/deshacer', {
    idempotencyKey: 'ozuna-hoy-previa',
    undoIdempotencyKey: 'undo-ozuna-hoy-previa'
  });
  assert.equal(deshecha.status, 200, JSON.stringify(deshecha.body));
  hoyData = (await db.collection('cuentasOzuna').doc(hoy).get()).data();
  assert.equal(hoyData.abonos.length, 0);
  assert.equal(hoyData.nuevoSaldoAcumulado, 1400);
  assert.equal(hoyData.items.length, 1);
  assert.equal(deshecha.body.notasActualizadas[0].eliminada, undefined);
  assert.deepEqual((await db.collection('cuentasOzuna').doc(viejaFecha).get()).data(), viejaAntes);
  console.log('✓ Deshacer el abono de la nota previa restaura el saldo y no borra la nota');

  await db.collection('cuentasOzuna').doc(hoy).delete();

  const temporal = await call('POST', '/abonos', {
    cliente: 'ozuna',
    monto: 40,
    metodo: 'Efectivo',
    fecha: '2020-01-15',
    modo: 'cascada',
    idempotencyKey: 'ozuna-placeholder-undo'
  });
  assert.equal(temporal.status, 200, JSON.stringify(temporal.body));
  assert.equal(temporal.body.notaCreada, true);
  assert.equal((await db.collection('cuentasOzuna').doc(hoy).get()).exists, true);
  const undoTemporal = await call('POST', '/abonos/deshacer', {
    idempotencyKey: 'ozuna-placeholder-undo',
    undoIdempotencyKey: 'undo-ozuna-placeholder'
  });
  assert.equal(undoTemporal.status, 200, JSON.stringify(undoTemporal.body));
  assert.equal(undoTemporal.body.notasActualizadas[0].eliminada, true);
  assert.equal((await db.collection('cuentasOzuna').doc(hoy).get()).exists, false);
  assert.deepEqual((await db.collection('cuentasOzuna').doc(viejaFecha).get()).data(), viejaAntes);
  console.log('✓ Deshacer el abono que creó la nota de hoy elimina esa nota vacía');

  const seco = await call('POST', '/abonos', {
    cliente: 'ozuna',
    monto: 1500,
    metodo: 'Transferencia',
    fecha: '2020-01-15',
    modo: 'cascada',
    idempotencyKey: 'ozuna-hoy-crea',
    dryRun: true
  });
  assert.equal(seco.status, 200, JSON.stringify(seco.body));
  assert.equal(seco.body.dryRun, true);
  assert.equal(seco.body.fechaNota, hoy);
  assert.equal(seco.body.notaCreada, true);
  assert.equal(seco.body.aplicaciones[0].monto, 1500);
  assert.equal(seco.body.sobrante, 0);
  assert.equal((await db.collection('cuentasOzuna').doc(hoy).get()).exists, false);

  const creado = await call('POST', '/abonos', {
    cliente: 'ozuna',
    monto: 1500,
    metodo: 'Transferencia',
    fecha: '2020-01-15',
    modo: 'cascada',
    idempotencyKey: 'ozuna-hoy-crea'
  });
  assert.equal(creado.status, 200, JSON.stringify(creado.body));
  assert.equal(creado.body.modo, 'hoy');
  assert.equal(creado.body.notaCreada, true);
  assert.equal(creado.body.aplicaciones.length, 1);
  assert.equal(creado.body.aplicaciones[0].notaId, hoy);
  assert.equal(creado.body.aplicaciones[0].monto, 1500);
  assert.equal(creado.body.sobrante, 0);
  assert.equal(creado.body.stashSobranteId, null);

  const creada = (await db.collection('cuentasOzuna').doc(hoy).get()).data();
  assert.equal(creada.fecha, hoy);
  assert.equal(creada.pendienteEmbarque, true);
  assert.equal(creada.origenAsistente, 'abono-ozuna');
  assert.deepEqual(creada.items, []);
  assert.equal(creada.abonos.length, 1);
  assert.equal(creada.abonos[0].monto, 1500);
  assert.equal(creada.abonos[0].descripcion, descripcionAbono('2020-01-15', 'Transferencia'));
  assert.equal(creada.saldoAcumuladoAnterior, 1000);
  assert.equal(creada.nuevoSaldoAcumulado, -500);
  assert.equal(creada.totalSaldo, -500);
  assert.equal((await db.collection('cuentasOzuna').where('fecha', '==', hoy).get()).size, 1);
  assert.equal((await db.collection('stash_ozuna').get()).size, 0);
  assert.deepEqual((await db.collection('cuentasOzuna').doc(viejaFecha).get()).data(), viejaAntes);
  console.log('✓ Sin nota de hoy se crea con el abono completo; la nota vieja y el stash no cambian');

  const reintento = await call('POST', '/abonos', {
    cliente: 'ozuna',
    monto: 1,
    metodo: 'Efectivo',
    fecha: hoy,
    modo: 'cascada',
    idempotencyKey: 'ozuna-hoy-crea'
  });
  assert.equal(reintento.body.totalAplicado, 1500);
  assert.equal(reintento.body.notaCreada, true);
  assert.equal((await db.collection('cuentasOzuna').doc(hoy).get()).data().abonos.length, 1);
  console.log('✓ Reintento al crear la nota de Ozuna no duplica el abono');

  const embarque = {
    fecha: hoy,
    saldoAcumuladoAnterior: 1000,
    cobros: [],
    items: [{ kilos: 40, medida: '41/50', costo: 20, total: 800, esVenta: false }],
    abonos: [],
    ultimaActualizacion: '2026-11-06T18:00:00.000Z'
  };
  const completada = await notaMod.sincronizarCuentaOzunaNota({
    embarqueId: 'emb-hoy',
    nueva: embarque,
    repo: repoCuentasOzuna(db)
  });
  assert.equal(completada.accion, 'actualizar');
  assert.equal(completada.id, hoy);
  let trasEmbarque = (await db.collection('cuentasOzuna').doc(hoy).get()).data();
  assert.equal(trasEmbarque.abonos.length, 1);
  assert.equal(trasEmbarque.abonos[0].monto, 1500);
  assert.equal(trasEmbarque.abonos[0].stashItemId, creada.abonos[0].stashItemId);
  assert.equal(trasEmbarque.items.length, 1);
  assert.equal(trasEmbarque.items[0].kilos, 40);
  assert.equal(trasEmbarque.totalGeneral, 800);
  assert.equal(trasEmbarque.nuevoSaldoAcumulado, 300);
  assert.equal(trasEmbarque.totalSaldo, 300);
  assert.equal(trasEmbarque.pendienteEmbarque, false);
  assert.equal(trasEmbarque.embarqueId, 'emb-hoy');
  assert.ok(trasEmbarque.firmaEmbarque);
  assert.equal((await db.collection('cuentasOzuna').where('fecha', '==', hoy).get()).size, 1);
  assert.deepEqual((await db.collection('cuentasOzuna').doc(viejaFecha).get()).data(), viejaAntes);

  const segunda = await notaMod.sincronizarCuentaOzunaNota({
    embarqueId: 'emb-hoy',
    nueva: embarque,
    repo: repoCuentasOzuna(db)
  });
  assert.equal(segunda.accion, 'reusar');
  assert.equal((await db.collection('cuentasOzuna').doc(hoy).get()).data().abonos.length, 1);
  console.log('✓ El embarque actualiza la misma nota, deja un abono y el saldo 300');

  const explicita = await call('POST', '/abonos', {
    cliente: 'ozuna',
    monto: 10,
    metodo: 'Deposito',
    fecha: hoy,
    modo: 'nota',
    nota: viejaFecha,
    idempotencyKey: 'ozuna-nota-explicita'
  });
  assert.equal(explicita.status, 200, JSON.stringify(explicita.body));
  assert.equal(explicita.body.modo, 'nota');
  assert.equal(explicita.body.aplicaciones[0].notaId, viejaFecha);
  assert.equal(explicita.body.aplicaciones[0].monto, 10);
  const viejaExplicita = (await db.collection('cuentasOzuna').doc(viejaFecha).get()).data();
  assert.equal(viejaExplicita.abonos.length, 1);
  assert.equal(viejaExplicita.abonos[0].monto, 10);
  assert.equal((await db.collection('cuentasOzuna').doc(hoy).get()).data().abonos.length, 1);
  console.log('✓ Modo nota de Ozuna sigue yendo a la nota indicada, no a la de hoy');
}

function correrHandlerReal(host) {
  return new Promise((resolve) => {
    const env = {
      ...process.env,
      FIRESTORE_EMULATOR_HOST: host,
      GCLOUD_PROJECT: 'demo-reypez-abonos',
      GOOGLE_CLOUD_PROJECT: 'demo-reypez-abonos',
      ASISTENTE_API_KEY: 'test-key'
    };
    delete env.NODE_ENV;
    const child = spawn(process.execPath, [__filename, '--handler-real'], { env, stdio: 'inherit' });
    child.on('exit', (code) => resolve(code == null ? 1 : code));
  });
}

async function vaciarColeccion(db, nombre) {
  const snap = await db.collection(nombre).get();
  const lote = db.batch();
  snap.docs.forEach((doc) => lote.delete(doc.ref));
  if (snap.size) await lote.commit();
}

async function llamarAsistente(asistente, method, url, body) {
  const req = {
    method,
    path: url,
    body,
    headers: { authorization: 'Bearer ' + process.env.ASISTENTE_API_KEY },
    get(name) { return this.headers[String(name).toLowerCase()]; }
  };
  const res = {
    statusCode: 200,
    _body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this._body = data; return this; },
    send(data) { this._body = data; return this; },
    setHeader() { return this; },
    getHeader() { return undefined; },
    on() { return this; }
  };
  await asistente(req, res);
  return { status: res.statusCode, body: res._body };
}

async function handlerRealMain() {
  if (process.env.NODE_ENV === 'test') {
    throw new Error('Este escenario tiene que correr sin NODE_ENV=test');
  }
  const projectId = process.env.GCLOUD_PROJECT || '';
  if (!projectId.startsWith('demo-')) {
    throw new Error('Solo proyectos demo-*: ' + projectId);
  }
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('Falta FIRESTORE_EMULATOR_HOST');
  }
  const { asistente } = require('../functions/index.js');
  const admin = require('../functions/node_modules/firebase-admin');
  const db = admin.firestore();
  for (const nombre of ['cuentasOzuna', 'stash_ozuna', 'historial_aplicaciones_ozuna', 'asistenteIdem', 'asistenteLog']) {
    await vaciarColeccion(db, nombre);
  }
  const hoy = fechaHoyMexico();
  await probarAbonosOzuna({
    db,
    call: (method, url, body) => llamarAsistente(asistente, method, url, body),
    hoy,
    viejaFecha: diasAntes(hoy, 40)
  });
  const hoySnap = await db.collection('cuentasOzuna').where('fecha', '==', hoy).get();
  assert.equal(hoySnap.size, 1);
  const data = hoySnap.docs[0].data();
  assert.equal(data.abonos.length, 1);
  assert.equal(data.abonos[0].monto, 1500);
  assert.equal(data.nuevoSaldoAcumulado, 300);
  assert.equal(data.items[0].total, 800);
  console.log('✓ Handler real: Firestore tiene un abono de 1500 y saldo 300 en la nota de hoy');
}
