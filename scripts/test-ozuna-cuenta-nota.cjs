// Nota PDF de Ozuna: crea la cuenta del día una vez y solo la reescribe si cambió el embarque.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadSource } = require('./helpers/embarques-source.cjs');
const m = loadSource('src/utils/ozunaCuentaNota.js');

const fecha = '2026-11-02';
const nueva = (kilos = 100, tarasVenta = 0) => ({
  fecha, saldoAcumuladoAnterior: 500, cobros: [],
  items: [{ kilos, medida: '41/50', costo: 20, total: kilos * 20, esVenta: false }],
  abonos: tarasVenta ? [{ descripcion: `Venta de limpio: ${tarasVenta} taras × $100`, monto: tarasVenta * 100 }] : [],
  ultimaActualizacion: new Date().toISOString(),
});
function repoMemoria(inicial = {}) {
  const docs = new Map(Object.entries(inicial));
  const escrituras = [];
  return {
    docs, escrituras,
    buscarPorFecha: async (f) => [...docs].filter(([, d]) => d.fecha === f).map(([id, data]) => ({ id, data: structuredClone(data) })),
    crear: async (f, d) => { if (docs.has(f)) throw new Error('duplicada'); docs.set(f, structuredClone(d)); escrituras.push(['crear', f]); return f; },
    actualizar: async (id, d) => { docs.set(id, structuredClone(d)); escrituras.push(['actualizar', id]); },
  };
}
const sync = (repo, datos, embarqueId = 'emb1') => m.sincronizarCuentaOzunaNota({ embarqueId, nueva: datos, repo });

test('primera impresión crea la cuenta ligada al embarque', async () => {
  const repo = repoMemoria();
  const r = await sync(repo, nueva());
  assert.equal(r.accion, 'crear');
  assert.deepEqual(repo.escrituras, [['crear', fecha]]);
  assert.equal(repo.docs.get(fecha).embarqueId, 'emb1');
  assert.ok(repo.docs.get(fecha).firmaEmbarque);
});

test('reimprimir sin cambios no escribe y no duplica', async () => {
  const repo = repoMemoria();
  await sync(repo, nueva());
  const r = await sync(repo, nueva());
  assert.equal(r.accion, 'reusar');
  assert.equal(repo.escrituras.length, 1);
  assert.equal(repo.docs.size, 1);
});

test('reimprimir con cambios actualiza la misma cuenta y conserva cobros/abonos manuales', async () => {
  const repo = repoMemoria();
  await sync(repo, nueva(100));
  const d = repo.docs.get(fecha);
  d.cobros = [{ descripcion: 'Flete', monto: 50 }];
  d.abonos = [{ descripcion: 'Efectivo', monto: 300 }];
  const r = await sync(repo, nueva(120, 2));
  assert.equal(r.accion, 'actualizar');
  assert.equal(repo.docs.size, 1);
  const g = repo.docs.get(fecha);
  assert.equal(g.items[0].kilos, 120);
  assert.deepEqual(g.cobros, [{ descripcion: 'Flete', monto: 50 }]);
  assert.deepEqual(g.abonos.map((a) => a.monto), [200, 300]);
  assert.equal(g.totalGeneral, 2400);
  assert.equal(g.nuevoSaldoAcumulado, 500 + 2400 + 50 - 200 - 300);
  assert.equal((await sync(repo, nueva(120, 2))).accion, 'reusar');
});

test('cuenta hecha a mano o editada a mano no se pisa', async () => {
  const manual = { fecha, items: [{ kilos: 7, medida: 'x', costo: 1, total: 7 }], abonos: [], cobros: [] };
  const repo = repoMemoria({ abc: manual });
  const r = await sync(repo, nueva());
  assert.equal(r.accion, 'manual');
  assert.match(r.aviso, /a mano/);
  assert.equal(repo.escrituras.length, 0);
  assert.equal(r.datos.items[0].kilos, 7);

  const repo2 = repoMemoria();
  await sync(repo2, nueva());
  repo2.docs.get(fecha).items[0].costo = 25; // editada en Cuentas Ozuna
  const r2 = await sync(repo2, nueva(150));
  assert.equal(r2.accion, 'manual');
  assert.equal(repo2.escrituras.length, 1);
});

test('la página del PDF trae las tablas de la cuenta', () => {
  const pagina = m.paginaCuentaOzunaPdf({ ...nueva(100, 1), cobros: [] });
  const texto = JSON.stringify(pagina);
  for (const t of ['Cuentas Ozuna', 'Detalles de la cuenta', 'Resumen de saldo', '41/50', 'Saldo Anterior', 'Venta de limpio: 1 taras']) assert.ok(texto.includes(t), t);
});

test('reimprimir con saldo anterior desfasado lo corrige y recalcula el total', async () => {
  const repo = repoMemoria();
  await sync(repo, nueva(100, 2));
  const r = await sync(repo, { ...nueva(100, 2), saldoAcumuladoAnterior: 800 });
  assert.equal(r.accion, 'actualizar');
  assert.equal(r.datos.saldoAcumuladoAnterior, 800);
  assert.equal(r.datos.totalSaldo, 800 + 2000 - 200);
  assert.equal(repo.docs.get(fecha).nuevoSaldoAcumulado, 2600);
  // Después, sin cambios, ya se reusa.
  assert.equal((await sync(repo, { ...nueva(100, 2), saldoAcumuladoAnterior: 800 })).accion, 'reusar');
});

test('cuenta editada a mano se imprime con el saldo anterior recalculado sin escribirla', async () => {
  const repo = repoMemoria({ [fecha]: { ...nueva(), saldoAcumuladoAnterior: 100 } });
  const r = await sync(repo, { ...nueva(), saldoAcumuladoAnterior: 900 });
  assert.equal(r.accion, 'manual');
  assert.equal(r.datos.saldoAcumuladoAnterior, 900);
  assert.equal(r.datos.totalSaldo, 900 + 2000);
  assert.equal(repo.escrituras.length, 0);
});
