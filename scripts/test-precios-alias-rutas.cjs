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

test('Catarro PDF reads the sales catalog and retains alias, client priority and date tie behavior', async () => {
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
      assert.equal(calls.at(-1).ref, 'precios');
      assert.equal(calls.at(-1).filters.length, 0);
    }
    assert.equal(await obtenerPrecioProductoCatarro('Med Esp s/c'), null);
    assert.equal(calls.at(-1).filters.length, 0);
    assert.equal(JSON.stringify(records), before);
  }
});

const caseFixture = () => [
  { producto: 'Piojo', fecha: '2020-01-01', precio: 160, timestamp: 1 },
  { producto: 'PIOJO', fecha: '2020-01-02', precio: 170, timestamp: 2 },
  { producto: 'piojo', fecha: '2020-01-01', precio: 180, clienteId: 'catarro' },
  { producto: 'Piojo panga', fecha: '2020-01-03', precio: 190 },
  { producto: 'Piojo panga', fecha: '2020-01-02', precio: 195, clienteId: 'catarro' },
  { producto: 'PIOJO', fecha: '2020-01-04', precio: 1, clienteId: 'otro' },
  { producto: 'Tirado', fecha: '2020-01-04', precio: 122 }
];
function mixedCatalog(records) {
  return records.reduce((catalog, p) => {
    (catalog[p.producto] ||= []).push(p);
    return catalog;
  }, {});
}

test('editor historical lookup is case insensitive with exact names, dates and client precedence', () => {
  const records = caseFixture();
  const before = JSON.stringify(records);
  for (const name of ['piojo', 'Piojo', 'PIOJO']) {
    assert.equal(prices.obtenerPrecioParaMedida(records, name, '2020-01-02'), 170);
    assert.equal(prices.obtenerPrecioParaMedida(records, name, '2020-01-02', 'catarro'), 180);
    assert.equal(prices.obtenerPrecioParaMedida(records, name, '2019-12-31'), null);
  }
  for (const name of ['piojo panga', 'Piojo panga', 'PIOJO PANGA']) {
    assert.equal(prices.obtenerPrecioParaMedida(records, name, '2020-01-03'), 190);
    assert.equal(prices.obtenerPrecioParaMedida(records, name, '2020-01-03', 'catarro'), 195);
    assert.equal(prices.obtenerPrecioParaMedida(records, name, '2020-01-01'), null);
  }
  assert.equal(prices.obtenerPrecioParaMedida(records, 'Piojo extra', '2020-01-04'), null);
  assert.equal(JSON.stringify(records), before);
});

test('both Rendimientos price routes merge mixed-case cache groups without mixing product names', () => {
  const records = caseFixture();
  const catalog = mixedCatalog(records);
  const before = JSON.stringify(catalog);
  const screen = load('src/views/Embarques/Rendimientos.vue', screenMocks(firestoreFor([]))).default;
  const { useGanancias } = load('src/views/Embarques/Rendimientos/composables/useGanancias.js', {
    vue: { ref: value => ({ value }), computed: fn => ({ value: fn() }) },
    'firebase/firestore': firestoreFor([]), '../utils/calculations': {}
  });
  const ctx = useGanancias();
  ctx.preciosVenta.value = catalog;
  for (const name of ['piojo', 'Piojo', 'PIOJO']) {
    const result = screen.methods.encontrarPreciosParaMedida.call({ preciosVenta: catalog }, name);
    assert.equal(result.precios.filter(p => !p.clienteId)[0].precio, 170);
    assert.equal(result.precios.length, 4);
    assert.equal(ctx.obtenerPrecioVentaParaFecha(name, '2020-01-02').precio, 170);
    assert.equal(ctx.obtenerPrecioVentaParaFecha(name, '2020-01-02', 'catarro').precio, 180);
  }
  for (const name of ['piojo panga', 'Piojo panga', 'PIOJO PANGA']) {
    const result = screen.methods.encontrarPreciosParaMedida.call({ preciosVenta: catalog }, name);
    assert.equal(result.precios.filter(p => !p.clienteId)[0].precio, 190);
    assert.equal(ctx.obtenerPrecioVentaParaFecha(name, '2020-01-03').precio, 190);
    assert.equal(ctx.obtenerPrecioVentaParaFecha(name, '2020-01-03', 'catarro').precio, 195);
  }
  for (const [name, available] of [['Piojo', 'Piojo panga'], ['Piojo panga', 'Piojo']]) {
    const onlyOther = { [available]: records.filter(p => p.producto === available) };
    assert.equal(screen.methods.encontrarPreciosParaMedida.call({ preciosVenta: onlyOther }, name), null);
    ctx.preciosVenta.value = onlyOther;
    assert.equal(ctx.obtenerPrecioVentaParaFecha(name, '2020-01-03'), null);
  }
  assert.equal(JSON.stringify(catalog), before);
});

test('PDF resolves every letter-case variant from sales prices only with client priority', async () => {
  for (const clientPrices of [false, true]) {
    const records = caseFixture().filter(p => clientPrices || !p.clienteId);
    const calls = [];
    const { obtenerPrecioProductoCatarro } = load('src/utils/pdfGenerator.js', {
      'firebase/firestore': firestoreFor(records, calls), '@/firebase': { db: {} },
      'pdfmake/build/pdfmake': {}, 'pdfmake/build/vfs_fonts': {},
      './pdf/delivery': {}, './pdf/filename': {}
    }, '\nexport { obtenerPrecioProductoCatarro };');
    for (const name of ['piojo', 'Piojo', 'PIOJO']) {
      assert.equal(await obtenerPrecioProductoCatarro(name), clientPrices ? 180 : 170);
    }
    for (const name of ['piojo panga', 'Piojo panga', 'PIOJO PANGA']) {
      assert.equal(await obtenerPrecioProductoCatarro(name), clientPrices ? 195 : 190);
    }
    assert.equal(await obtenerPrecioProductoCatarro('Piojo extra'), null);
    assert.equal(await obtenerPrecioProductoCatarro(''), null);
    assert.ok(calls.every(q => q.ref === 'precios'));
  }
});

test('full PDF generation shares one sales read for clean/raw products and reloads newly created prices', async () => {
  const records = caseFixture().filter(p => !p.clienteId && p.producto !== 'Piojo panga');
  const calls = [];
  const definitions = [];
  const { generarNotaVentaPDF } = load('src/utils/pdfGenerator.js', {
    'firebase/firestore': firestoreFor(records, calls), '@/firebase': { db: {} },
    'pdfmake/build/pdfmake': { createPdf: definition => { definitions.push(definition); return {}; } },
    'pdfmake/build/vfs_fonts': {},
    './pdf/delivery': { obtenerBufferPdf: async () => new Uint8Array([37, 80, 68, 70]), entregarPdf: async () => {} },
    './pdf/filename': { nombreArchivoNota: () => 'test.pdf', periodoNota: () => ({}) }
  });
  const clients = [{ id: 'qa', nombre: 'Catarro' }];
  const shipment = () => ({
    fecha: '2026-10-10', cargaCon: 'Prueba',
    productos: [
      { id: 'a', clienteId: 'qa', medida: 'PIOJO', kilos: [20], taras: [1], tipo: 'Limpio', restarTaras: false },
      { id: 'b', clienteId: 'qa', medida: 'piojo panga', kilos: [20], taras: [1], tipo: 'Limpio', restarTaras: false },
      { id: 'c', clienteId: 'qa', medida: 'Piojo', kilos: [20], taras: [1], tipo: 'Limpio', precio: 777 },
      { id: 'd', clienteId: 'qa', medida: 'Piojo', kilos: [20], taras: [1], tipo: 'Limpio', precioBorradoManualmente: true }
    ].map(p => ({ tarasExtra: [], reporteTaras: [], reporteBolsas: [], ...p })),
    clienteCrudos: { qa: [{ items: [{ talla: 'PiOjO PaNgA', taras: '1', precio: null }] }] }
  });
  await generarNotaVentaPDF(shipment(), clients, {}, {}, { qa: true });
  assert.equal(calls.length, 1);
  assert.ok(!JSON.stringify(definitions.at(-1)).includes('$190'));
  records.push({ producto: 'Piojo panga', fecha: '2026-10-10', precio: 190 });
  const next = shipment();
  await generarNotaVentaPDF(next, clients, {}, {}, { qa: true });
  assert.equal(calls.length, 2, 'new PDF must refresh the catalog once');
  assert.equal(next.clienteCrudos.qa[0].items[0].precio, 190);
  const output = JSON.stringify(definitions.at(-1));
  assert.ok(output.includes('$190'));
  assert.ok(output.includes('$170'));
  assert.ok(output.includes('$777'));
  assert.equal(next.productos[3].precio, undefined, 'manual clearing stays intact');
  assert.equal(next.productos[0].medida, 'PIOJO');
  assert.equal(next.productos[1].medida, 'piojo panga');
  assert.ok(calls.every(q => q.ref === 'precios'));
  // Alternate Lorena/Verónica page uses the same loader parameter.
  await generarNotaVentaPDF(shipment(), [{ id: 'qa', nombre: 'Veronica' }], {}, {}, { qa: true });
  assert.equal(calls.length, 3);
});

test('clean/raw editors apply case-equivalent prices and retain manual overrides without rewriting names', () => {
  const Product = load('src/views/Embarques/components/ProductoItem.vue').default;
  const Crudo = load('src/views/Embarques/components/CrudoItem.vue').default;
  for (const name of ['piojo', 'Piojo', 'PIOJO', 'piojo panga', 'Piojo panga', 'PIOJO PANGA']) {
    for (const manual of [false, true]) {
      const expected = manual ? 777 : name.toLowerCase() === 'piojo' ? 180 : 195;
      const producto = { medida: name, precio: 777, precioOrigen: manual ? 'manual' : 'general', precioMedidaBase: name.toLowerCase() };
      const ctx = { producto, nombreCliente: 'Catarro', fechaEmbarque: '2020-01-03', preciosActuales: caseFixture(), medidaPrecioAnteriorNormalizada: prices.normalizarMedida(name), $emit() {}, establecerDatoPrecio(k, v) { producto[k] = v; }, limpiarDatosPrecioAutomatico() { throw Error('Unexpected clear'); } };
      Product.methods.asignarPrecioAutomatico.call(ctx);
      assert.equal(producto.precio, expected);
      assert.equal(producto.medida, name);
      const item = { medida: name, precio: 777, precioOrigen: manual ? 'manual' : 'general', precioMedidaBase: name.toLowerCase() };
      Crudo.methods.asignarPrecioAutomaticoCrudo.call({ ...ctx, $set(o,k,v) { o[k]=v; }, $delete(o,k) { delete o[k]; } }, item);
      assert.equal(item.precio, expected);
      assert.equal(item.medida, name);
    }
  }
});

test('Rendimientos numeric fallback preserves exact priority without crossing distinct sizes', () => {
  const screen = load('src/views/Embarques/Rendimientos.vue', screenMocks(firestoreFor([]))).default;
  const find = (catalog, name) => screen.methods.encontrarPreciosParaMedida.call({ preciosVenta: catalog }, name);
  const base = { fecha: '2020-01-01', precio: 100 };
  const exact = { fecha: '2020-01-01', precio: 110 };
  assert.equal(find({ '71/90': [base], '71/90 Selecta': [exact] }, '71/90 SELECTA').precios[0], exact);
  assert.equal(find({ '71/90': [base] }, '71/90 61 selecta').precios[0], base);
  assert.equal(find({ '71/90': [base] }, '171/90'), null);
  assert.equal(find({ '71/90 selecta': [exact] }, '71/90'), null);
});
