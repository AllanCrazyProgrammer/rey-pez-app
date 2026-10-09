const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
const quiet = { log() {}, warn() {}, error() {} };

function load(file, mocks = {}, suffix = '') {
  let source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.vue')) source = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  const code = babel.transformSync(source + suffix, {
    configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
  }).code;
  const context = { exports: {}, console: quiet, process, navigator: { onLine: true }, require(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.endsWith('.vue')) return {};
    const resolved = name.startsWith('@/') ? 'src/' + name.slice(2)
      : name.startsWith('.') ? path.join(path.dirname(file), name) : null;
    if (resolved) return load(resolved.endsWith('.js') ? resolved : resolved + '.js', mocks);
    if (name === 'moment' || name.startsWith('moment/')) return require(name);
    throw new Error('Unexpected dependency: ' + name);
  } };
  vm.runInNewContext(code, context, { filename: file });
  return context.exports;
}

const prices = load('src/utils/preciosHistoricos.js');
const { obtenerGrupoPreciosPorAlias } = load('src/utils/preciosAliasCatalogo.js');
const pairs = [['Med Esp c/c', 'Med-Esp c/c'], ['Med Gde c/c', 'Med-Gde c/c']];
const fixture = (oldName, newName) => [
  { producto: oldName, fecha: '2020-01-03', precio: 103, timestamp: 1 },
  { producto: newName, fecha: '2020-01-03', precio: 999, timestamp: 900 },
  { producto: oldName, fecha: '2020-01-02', precio: 82, clienteId: 'catarro' },
  { producto: newName, fecha: '2020-01-01', precio: 101 },
  { producto: oldName, fecha: '2020-01-01', precio: 81, clienteId: 'catarro' }
];
function firestoreFor(records, calls = []) {
  return {
    getFirestore: () => ({}), collection: (_, name) => name,
    where: (...args) => args, orderBy: (...args) => args,
    query: (ref, ...filters) => ({ ref, filters }),
    getDocs: async query => {
      calls.push(query);
      const productFilter = query.filters.find(f => f[0] === 'producto');
      const selected = productFilter ? records.filter(p => productFilter[1] === 'in'
        ? productFilter[2].includes(p.producto) : p.producto === productFilter[2]) : records;
      return { empty: selected.length === 0, docs: selected.map((p, i) => ({ id: String(i), data: () => p })) };
    }
  };
}
const screenMocks = firestore => ({
  'firebase/firestore': firestore, lodash: {}, '@/utils/RendimientosPdf': {},
  '@/utils/pdf/reportDelivery': {}, '@/utils/pdf/sacadas': {},
  '@/services/EmbarquesOfflineService': {}, '@/utils/formatters': {}
});

test('old offline alias groups merge by the existing date order, keep ties stable and never mutate inputs', () => {
  for (const [oldName, newName] of pairs) {
    const records = fixture(oldName, newName);
    const catalog = {
      [oldName.toLowerCase()]: records.filter(p => p.producto === oldName),
      [newName.toLowerCase()]: records.filter(p => p.producto === newName),
      'med esp s/c': [{ fecha: '2099-01-01', precio: 777 }]
    };
    const before = JSON.stringify(catalog);
    for (const name of [oldName, newName]) {
      const result = obtenerGrupoPreciosPorAlias(catalog, name);
      assert.equal(result.medidaEncontrada, newName);
      assert.equal(result.precios.length, records.length);
      assert.equal(result.precios[0].precio, 103, 'a timestamp must not introduce a new tie rule');
      assert.equal(result.precios[1].precio, 999);
      assert.equal(result.precios[2].precio, 82);
    }
    assert.equal(JSON.stringify(catalog), before);
    assert.equal(obtenerGrupoPreciosPorAlias(catalog, 'Med Esp s/c'), null);
    assert.equal(obtenerGrupoPreciosPorAlias(catalog, oldName + ' extra'), null);
  }
});

test('a legacy grouped cache preserves its available tie order; lost cross-group interleaving is not reconstructed', () => {
  const [oldName, newName] = pairs[0];
  const a = { producto: oldName, fecha: '2020-01-03', precio: 100 };
  const b = { producto: newName, fecha: '2020-01-03', clienteId: 'catarro', precio: 120 };
  const c = { producto: oldName, fecha: '2020-01-03', clienteId: 'catarro', precio: 130 };
  // The legacy cache already lost the original A, B, C interleaving.
  const legacy = { [oldName.toLowerCase()]: [a, c], [newName.toLowerCase()]: [b] };
  const fresh = { [newName.toLowerCase()]: [a, b, c] };
  const before = JSON.stringify(legacy);
  for (const name of [oldName, newName]) {
    const cached = obtenerGrupoPreciosPorAlias(legacy, name).precios;
    const refreshed = obtenerGrupoPreciosPorAlias(fresh, name).precios;
    assert.equal(cached.find(p => p.clienteId === 'catarro').precio, 130);
    assert.equal(refreshed.find(p => p.clienteId === 'catarro').precio, 120);
  }
  assert.equal(JSON.stringify(legacy), before);
});

test('Rendimientos screen and service group aliases identically before and after renaming, preserving date ties', async () => {
  for (const [oldName, newName] of pairs) for (const renamed of [false, true]) {
    const records = fixture(oldName, newName).map(p => ({ ...p,
      producto: renamed ? prices.normalizarNombreProductoPrecio(p.producto) : p.producto
    }));
    const before = JSON.stringify(records);
    const firestore = firestoreFor(records);
    const { RendimientosService } = load('src/views/Embarques/Rendimientos/services/rendimientosService.js', { 'firebase/firestore': firestore });
    const serviceCatalog = await new RendimientosService().cargarPreciosVenta();
    const screen = load('src/views/Embarques/Rendimientos.vue', screenMocks(firestore)).default;
    const context = { preciosVenta: {}, embarqueData: null, actualizarOfflineRendimientos: async () => {} };
    await screen.methods.cargarPreciosVenta.call(context);
    assert.equal(JSON.stringify(serviceCatalog), JSON.stringify(context.preciosVenta));
    assert.equal(Object.keys(serviceCatalog).length, 1);
    for (const name of [oldName, newName]) {
      const result = screen.methods.encontrarPreciosParaMedida.call(context, name);
      assert.equal(result.precios[0].precio, 103);
      assert.equal(result.precios[1].precio, 999);
      assert.equal(result.precios.length, records.length);
    }
    assert.equal(JSON.stringify(records), before);
  }
});

test('useGanancias keeps client and historical date selection with mixed offline and renamed catalogs', () => {
  const { useGanancias } = load('src/views/Embarques/Rendimientos/composables/useGanancias.js', {
    vue: { ref: value => ({ value }), computed: fn => ({ value: fn() }) },
    'firebase/firestore': firestoreFor([]), '../utils/calculations': {}
  });
  for (const [oldName, newName] of pairs) for (const renamed of [false, true]) {
    const records = fixture(oldName, newName);
    const catalog = renamed ? { [newName.toLowerCase()]: records } : {
      [oldName.toLowerCase()]: records.filter(p => p.producto === oldName),
      [newName.toLowerCase()]: records.filter(p => p.producto === newName)
    };
    const before = JSON.stringify(catalog);
    const ctx = useGanancias();
    ctx.preciosVenta.value = catalog;
    for (const name of [oldName, newName]) {
      assert.equal(ctx.obtenerPrecioVentaParaFecha(name, '2020-01-02', 'catarro').precio, 82);
      assert.equal(ctx.obtenerPrecioVentaParaFecha(name, '2020-01-01', 'catarro').precio, 81);
      assert.equal(ctx.obtenerPrecioVentaParaFecha(name, '2020-01-02').precio, 101);
      assert.equal(ctx.obtenerPrecioVentaParaFecha(name, '2099-01-01').precio, 103);
    }
    assert.equal(JSON.stringify(catalog), before);
  }
});

test('Catarro PDF queries only each authorized pair together and retains client priority and date tie behavior', async () => {
  for (const [oldName, newName] of pairs) for (const renamed of [false, true]) {
    const records = fixture(oldName, newName).map(p => ({ ...p,
      producto: renamed ? prices.normalizarNombreProductoPrecio(p.producto) : p.producto
    }));
    const before = JSON.stringify(records);
    const calls = [];
    const { obtenerPrecioProductoCatarro } = load('src/utils/pdfGenerator.js', {
      'firebase/firestore': firestoreFor(records, calls), '@/firebase': { db: {} },
      'pdfmake/build/pdfmake': {}, 'pdfmake/build/vfs_fonts': {},
      './pdf/delivery': {}, './pdf/filename': {}
    }, '\nexport { obtenerPrecioProductoCatarro };');
    for (const name of [oldName, newName]) {
      assert.equal(await obtenerPrecioProductoCatarro(name), 82);
      const filter = calls.at(-1).filters[0];
      assert.equal(filter[1], 'in');
      assert.deepEqual([...filter[2]].sort(), [oldName, newName].sort());
    }
    assert.equal(await obtenerPrecioProductoCatarro('Med Esp s/c'), null);
    assert.equal(calls.at(-1).filters[0][1], '==');
    assert.equal(JSON.stringify(records), before);
  }
});
