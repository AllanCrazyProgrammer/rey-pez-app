const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/prestamos.js'), 'utf8');
const helpers = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('dashboard nets legacy negative loan balances within each account only', async () => {
  const { resumirSaldos } = await helpers;
  assert.deepEqual(resumirSaldos([
    { cuentaId: 'trabajador:1', saldoPendiente: 1000 },
    { cuentaId: 'trabajador:1', saldoPendiente: -700 },
    { cuentaId: 'despicadora:1', saldoPendiente: 200 },
    { cuentaId: 'trabajador:2', saldoPendiente: -50 }
  ]), { cuentasConDeuda: 2, totalPendiente: 500 });
});

test('account balances include payments attached to another loan, including legacy negative loan balances', async () => {
  const { agruparPrestamos } = await helpers;
  for (const persona of ['trabajador', 'despicadora']) {
    const loans = [
      { id: 'a', [`${persona}Id`]: '1', montoInicial: '1000', abonosCuenta: [] },
      { id: 'b', [`${persona}Id`]: '1', montoInicial: 500, abonosCuenta: [{ monto: '1200' }] },
      { id: 'c', [`${persona}Id`]: '2', montoInicial: 200, abonosCuenta: [{ monto: 200 }] }
    ];
    const accounts = agruparPrestamos(loans, persona);
    assert.equal(accounts[0].totalPrestado, 1500);
    assert.equal(accounts[0].totalAbonado, 1200);
    assert.equal(accounts[0].saldoPendiente, 300);
    assert.equal(accounts[0].porcentajePagado, 80);
    assert.equal(accounts[1].saldoPendiente, 0);
  }
});

test('cent amounts round correctly and progress stays within bounds', async () => {
  const { agruparPrestamos } = await helpers;
  const [account] = agruparPrestamos([{ trabajadorId: '1', montoInicial: .3, abonosCuenta: [{ monto: .1 }, { monto: .2 }] }], 'trabajador');
  assert.equal(account.saldoPendiente, 0);
  assert.equal(account.porcentajePagado, 100);
});

test('history orders dates and Firestore timestamps without mutating the loans', async () => {
  const { movimientosCuenta } = await helpers;
  const loan = { id: 'a', fecha: '2026-09-01', fechaCreacion: { seconds: 100 }, montoInicial: 100,
    abonosCuenta: [{ id: 'payment', fecha: '2026-09-01', fechaCreacion: { seconds: 200 }, monto: 10 }] };
  const history = movimientosCuenta({ prestamos: [loan] });
  assert.equal(history[0].tipo, 'abono');
  assert.equal(history[0].prestamoId, 'a');
  assert.equal(history[1].tipo, 'prestamo');
  assert.equal(loan.tipo, undefined);
});

test('parallel reads are bounded, preserve order, and propagate failures', async () => {
  const { mapConcurrent } = await helpers;
  let active = 0, peak = 0;
  const results = await mapConcurrent(Array.from({ length: 24 }, (_, i) => i), async i => {
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, 2));
    active--;
    return i;
  });
  assert.equal(peak, 8);
  assert.deepEqual(results, Array.from({ length: 24 }, (_, i) => i));
  await assert.rejects(mapConcurrent([1], async () => { throw new Error('offline'); }), /offline/);
  assert.deepEqual(await mapConcurrent([], () => {}), []);
});

test('shared account reads reuse pending requests, refresh after writes, and retry failures', async () => {
  const { mapConcurrent, agruparPrestamos } = await helpers;
  const service = fs.readFileSync(path.join(__dirname, '../src/services/prestamosService.js'), 'utf8')
    .replace(/^import .*;$/gm, '').replace(/export (async )?function /g, (_, asyncKeyword = '') => `${asyncKeyword}function `);
  let reads = 0, fail = false;
  const getDocs = async ref => {
    reads++;
    if (fail) throw new Error('offline');
    return { docs: ref.endsWith('/abonos')
      ? [{ id: 'payment', data: () => ({ monto: 20 }) }]
      : [{ id: 'loan', data: () => ({ trabajadorId: '1', montoInicial: 100 }) }] };
  };
  const load = new Function('getDocs', 'collection', 'db', 'mapConcurrent', 'agruparPrestamos',
    service + '\nreturn cargarCuentasPrestamos;')(getDocs, (_, ...parts) => parts.join('/'), {}, mapConcurrent, agruparPrestamos);
  const [first, second] = await Promise.all([load('loans', 'trabajador'), load('loans', 'trabajador')]);
  assert.equal(first, second);
  assert.equal(reads, 2);
  assert.equal(first[0].saldoPendiente, 80);
  await load('loans', 'trabajador', true);
  assert.equal(reads, 4);
  fail = true;
  await assert.rejects(load('loans', 'trabajador', true), /offline/);
  fail = false;
  await load('loans', 'trabajador');
  assert.equal(reads, 7);
});

test('deleting an account removes payments before loans in bounded batches', async () => {
  const { mapConcurrent, agruparPrestamos } = await helpers;
  const service = fs.readFileSync(path.join(__dirname, '../src/services/prestamosService.js'), 'utf8')
    .replace(/^import .*;$/gm, '').replace(/export (async )?function /g, (_, asyncKeyword = '') => `${asyncKeyword}function `);
  const commits = [];
  const writeBatch = () => {
    const refs = [];
    return { delete: ref => refs.push(ref), commit: async () => commits.push(refs) };
  };
  const api = new Function('getDocs', 'collection', 'doc', 'writeBatch', 'db', 'mapConcurrent', 'agruparPrestamos',
    service + '\nreturn { eliminarCuentaPrestamos };')(
      async () => ({ docs: [] }), (_, ...parts) => parts.join('/'), (_, ...parts) => parts.join('/'),
      writeBatch, {}, mapConcurrent, agruparPrestamos
    );
  const abonosCuenta = Array.from({ length: 450 }, (_, id) => ({ id: String(id) }));
  await api.eliminarCuentaPrestamos('loans', { prestamos: [{ id: 'loan', abonosCuenta }] });
  assert.deepEqual(commits.map(batch => batch.length), [450, 1]);
  assert.match(commits[0][0], /loan\/abonos\/0$/);
  assert.match(commits[1][0], /loans\/loan$/);
});
