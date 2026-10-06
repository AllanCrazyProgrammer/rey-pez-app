const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function cargarServicio() {
  let cuenta;
  const firestore = {
    getFirestore: () => ({}),
    collection: (_, nombre) => nombre,
    doc: (_, nombre, id) => ({ nombre, id }),
    query: (ref, ...filtros) => ({ ref, filtros }),
    where: (...args) => args,
    orderBy: (...args) => args,
    limit: valor => valor,
    async getDocs(consulta) {
      const anterior = consulta.filtros.some(f => Array.isArray(f) && f[1] === '<');
      const docs = anterior ? [{ data: () => ({ nuevoSaldoAcumulado: 500 }) }] : [];
      return { docs, empty: !docs.length };
    },
    async runTransaction(_, callback) {
      await callback({
        get: async () => ({ exists: () => !!cuenta }),
        set: (_, data) => { cuenta = data; }
      });
    }
  };
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const module = { exports: {} };
    const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
      configFile: false, babelrc: false,
      plugins: ['@babel/plugin-transform-modules-commonjs']
    }).code;
    vm.runInNewContext(code, {
      module, exports: module.exports, console: { log() {}, error() {} },
      require(id) {
        if (id === 'firebase/firestore') return firestore;
        if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id + '.js'));
        return require(id);
      }
    }, { filename });
    cache.set(filename, module.exports);
    return module.exports;
  }
  return {
    servicio: load(path.resolve(__dirname, '../src/utils/services/EmbarqueCuentasService.js')),
    cuenta: () => cuenta
  };
}

async function crear(productos = [], crudos = []) {
  const contexto = cargarServicio();
  await contexto.servicio.crearCuentaOzuna({
    fecha: '2026-10-06', productos, clienteCrudos: { '4': [{ items: crudos }] }
  });
  return contexto;
}

test('Ozuna: abona $100 por tara de venta de limpio, incluyendo extras y c/h20', async () => {
  const { cuenta } = await crear([
    { medida: '41/50', kilos: [100], taras: [2, '3'], tarasExtra: [1], precio: 120, esVenta: true },
    { medida: '51/60', tipo: 'c/h20', reporteTaras: [2], reporteBolsas: [20], precio: 100, esVenta: true },
    { medida: '61/70', kilos: [50], taras: [5], precio: 21, esVenta: false }
  ]);
  const data = cuenta();
  assert.equal(data.abonos.length, 1);
  assert.equal(data.abonos[0].monto, 800);
  assert.match(data.abonos[0].descripcion, /limpio: 8 taras/);
  assert.equal(data.totalGeneral, 15650);
  assert.equal(data.totalSaldo, 15350);
  assert.equal(data.nuevoSaldoAcumulado, data.totalSaldo);
});

test('Ozuna: suma taras de crudo y sobrantes sin duplicar los campos históricos', async () => {
  const { cuenta } = await crear([], [
    { talla: 'Med c/c', taras: '10-19', sobrantes: ['1-7', '2-5'], sobrante: '1-7', precio: 50, esVenta: true },
    { talla: 'Gde', taras: '2', sobrante: '1-4', sobrante2: '1-3', mostrarSobrante2: false, precio: 50, esVenta: true },
    { talla: 'Ch', sobrante: '5', precio: 50, esVenta: true },
    { talla: 'Maquila', taras: '30-19', precio: 21, esVenta: false }
  ]);
  const data = cuenta();
  assert.equal(data.abonos.length, 1);
  assert.equal(data.abonos[0].monto, 1700);
  assert.match(data.abonos[0].descripcion, /crudo: 17 taras/);
  assert.equal(data.items[0].kilos, 212);
  assert.equal(data.totalSaldo, 500 + data.totalGeneral - 1700);
});

test('Ozuna: combina abonos de limpio y crudo y evita duplicar la cuenta', async () => {
  const contexto = await crear(
    [{ medida: '41/50', kilos: [40], taras: [2], precio: 100, esVenta: true }],
    [{ talla: 'Med', taras: '3-19', precio: 50, esVenta: true }]
  );
  assert.equal(contexto.cuenta().abonos.length, 2);
  assert.equal(contexto.cuenta().totalSaldo, 7000);
  await assert.rejects(contexto.servicio.crearCuentaOzuna({
    fecha: '2026-10-06', productos: [], clienteCrudos: {}
  }), error => error.code === 'cuenta-duplicada');
  assert.equal(contexto.cuenta().abonos.length, 2);
});

test('Ozuna: no genera abonos para maquila ni ventas sin kilos o sin taras', async () => {
  const { cuenta } = await crear([
    { medida: 'Maquila', kilos: [40], taras: [2], precio: 21 },
    { medida: 'Sin peso', kilos: [0], taras: [5], precio: 100, esVenta: true },
    { medida: 'Sin taras', kilos: [40], precio: 100, esVenta: true }
  ], [{ talla: 'Vacío', taras: '0-19', precio: 100, esVenta: true }]);
  assert.equal(cuenta().abonos.length, 0);
  assert.equal(cuenta().totalSaldo, 500 + cuenta().totalGeneral);
});
