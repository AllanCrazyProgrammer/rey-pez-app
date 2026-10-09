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
  const code = babel.transformSync(source + suffix, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const context = { exports: {}, console: quiet, navigator: { onLine: true }, require(name) {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.endsWith('.vue')) return {};
    const resolved = name.startsWith('@/') ? 'src/' + name.slice(2) : name.startsWith('.') ? path.join(path.dirname(file), name) : null;
    if (resolved) return load(resolved.endsWith('.js') ? resolved : resolved + '.js', mocks);
    if (name === 'uuid') return require(name);
    if (name === 'moment' || name.startsWith('moment/')) return require(name);
    throw new Error('Unexpected dependency: ' + name);
  } };
  vm.runInNewContext(code, context, { filename: file });
  return context.exports;
}
const { normalizarMedidaCrudoEmbarque: normalizar } = load('src/utils/medidasPedidoCrudo.js');
const Generator = load('src/views/Embarques/components/GenerarEsqueletoEmbarqueButton.vue', { 'firebase/firestore': {} }).default;
const { embarquePedidoMixin: Mixin } = load('src/views/Embarques/mixins/embarquePedidoMixin.js', { 'firebase/firestore': {} });
const Crudo = load('src/views/Embarques/components/CrudoItem.vue').default;
const generar = pedidos => {
  const result = {};
  Generator.methods.agregarCrudosAlEsqueleto(result, pedidos);
  return result;
};
const pedido = medidas => [{ tipo: 'crudo', pedidos: { '8a': medidas } }];
const cases = [
  ['chico','Chico c/c'], ['med','Med c/c'], ['Med-Esp','Med-Esp c/c'],
  ['Med-gde','Med-Gde c/c'], ['gde','Gde c/c'], ['extra','Extra c/c'],
  ['jumbo','Jumbo c/c'], ['lag gde','Lag gde c/c'], ['gde c/ extra','Gde c/ Extra c/c'],
  ['Med Esp c/c','Med-Esp c/c'], ['Med Gde c/c','Med-Gde c/c']
];
test('only known head-on pedido names acquire c/c; explicit names are idempotent', () => {
  for (const [input, expected] of cases) {
    assert.equal(normalizar(input), expected);
    assert.equal(normalizar(normalizar(input)), expected);
  }
  for (const input of ['Cam s/c','Med Esp s/c','Med-Esp s/c','PacSC','Pac SC',
    '51/60','51/60 s/c','Linea','Rechazo','Acamaya','Med especial','Otra talla','Extra s/c']) {
    assert.equal(normalizar(input), input);
  }
  assert.equal(normalizar(null), '');
});
test('generation maps head-on sizes, retains order, references, distinct s/c and clean products, without source writes', () => {
  const inputs = pedido(Object.fromEntries(cases.map(([name], i) => [name, i + 1])));
  Object.assign(inputs[0].pedidos['8a'], {'Cam s/c': '2,5', PacSC: 3, Linea: 4, cero: 0, vacio: ''});
  const original = JSON.stringify(inputs);
  const limpio = { medida: 'Med-Esp', tipo: 's/h20', precio: 777 };
  const result = { '1': [limpio] };
  Generator.methods.agregarCrudosAlEsqueleto(result, inputs);
  assert.equal(result['1'][0], limpio);
  assert.equal(limpio.medida, 'Med-Esp');
  assert.equal(limpio.precio, 777);
  const names = result['1'].slice(1).map(item => item.medida);
  assert.deepEqual(Array.from(names.slice(0,6)), ['Med c/c','Med-Esp c/c','Lag gde c/c','Med-Gde c/c','Gde c/c','Extra c/c']);
  assert.equal(names.filter(n => n === 'Med-Esp c/c').length, 1);
  assert.equal(names.filter(n => n === 'Med-Gde c/c').length, 1);
  assert.equal(result['1'].find(i => i.medida === 'Cam s/c').pedidoReferencia.taras, 2.5);
  assert(names.includes('PacSC'));
  assert(!names.includes('cero'));
  assert.equal(JSON.stringify(inputs), original);
  const once = JSON.stringify(result);
  Generator.methods.agregarCrudosAlEsqueleto(result, inputs);
  assert.equal(JSON.stringify(result), once);
});
function context(existing = []) {
  return {
    embarque: { productos: [], fecha: '2026-10-09' }, clienteCrudos: { '1': [{items: existing}] },
    clientesModificados: {}, productosNuevosPendientes: new Map(),
    obtenerNombreCliente: () => 'Joselito', limpiarProductosSinMedida() {},
    actualizarMedidasUsadas() {}, $forceUpdate() {}, mostrarMensaje() {},
    guardarCambiosEnTiempoReal() { throw new Error('No persisted shipment in this test'); },
    $set(o,k,v) {o[k]=v;}
  };
}
test('applying and repeating skeleton creates canonical raw rows without rewriting historical or manual rows', () => {
  const old = { medida: 'med-esp', talla: 'med-esp', precio: 777, precioOrigen: 'manual' };
  const existing = [old, {medida: 'Med Gde c/c', precio: 888}];
  const before = JSON.stringify(existing);
  const ctx = context(existing);
  const skeleton = generar(pedido({'med-esp': 1, 'med-gde': 2, extra: 3, 'Extra s/c': 4}));
  Mixin.methods.aplicarEsqueletoDesdePedido.call(ctx, skeleton);
  const items = ctx.clienteCrudos['1'][0].items;
  assert.equal(existing.length, 4);
  assert.equal(items.length, 4);
  assert.equal(items[0], old);
  assert.equal(JSON.stringify(existing.slice(0,2)), before);
  assert.equal(items[2].medida, 'Extra c/c');
  assert.equal(items[2].talla, 'Extra c/c');
  assert.equal(items[2].pedidoReferencia.taras, 3);
  assert.equal(items[3].medida, 'Extra s/c');
  const once = JSON.stringify(items);
  Mixin.methods.aplicarEsqueletoDesdePedido.call(ctx, skeleton);
  assert.equal(JSON.stringify(ctx.clienteCrudos['1'][0].items), once);
});
test('generated raw rows resolve the client and historical price, preserve manual/cleared prices, and never borrow s/c prices', () => {
  for (const [bare, alias, canonical] of [['med-esp','Med Esp c/c','Med-Esp c/c'], ['med-gde','Med Gde c/c','Med-Gde c/c']]) {
    const ctx = context();
    Mixin.methods.aplicarEsqueletoDesdePedido.call(ctx, generar(pedido({[bare]: 2, PacSC: 1, 'Cam s/c': 1})));
    const catalog = [
      {producto: alias, precio: 100, fecha: '2026-09-01'},
      {producto: canonical, precio: 110, fecha: '2026-10-01'},
      {producto: alias, precio: 90, fecha: '2026-10-02', clienteId: 'joselito'},
      {producto: canonical, precio: 999, fecha: '2026-12-01', clienteId: 'joselito'},
      {producto: canonical, precio: 555, fecha: '2026-10-03', clienteId: 'otro'},
      {producto: 'Cam s/c', precio: 50, fecha: '2026-10-01'}
    ];
    const priceCtx = {nombreCliente:'Joselito',fechaEmbarque:'2026-10-09',preciosActuales:catalog,
      crudoData: ctx.clienteCrudos['1'][0],$set(o,k,v){o[k]=v;},$delete(o,k){delete o[k];}};
    const before = JSON.stringify(catalog);
    Crudo.methods.asignarPrecioAutomaticoCrudo.call(priceCtx);
    const row = priceCtx.crudoData.items.find(i => i.medida === canonical);
    assert.equal(row.precio, 90);
    assert.equal(row.precioClienteId, 'joselito');
    assert.equal(priceCtx.crudoData.items.find(i => i.medida === 'PacSC').precio, null);
    assert.equal(priceCtx.crudoData.items.find(i => i.medida === 'Cam s/c').precio, 50);
    row.precio = 777; row.precioOrigen = 'manual';
    Crudo.methods.asignarPrecioAutomaticoCrudo.call(priceCtx);
    assert.equal(row.precio, 777);
    row.precio = null; row.precioBorradoManualmente = true;
    Crudo.methods.asignarPrecioAutomaticoCrudo.call(priceCtx);
    assert.equal(row.precio, null);
    assert.equal(JSON.stringify(catalog), before);
  }
});
test('clean order generation stays unchanged, including water, label, supplier and Ozuna sale mode', () => {
  const result = Generator.methods.construirEsqueletoPorCliente.call(Generator.methods, [{
    joselito: [{medida:'51/60',tipo:'.7 y .3',kilos:10,etiqueta:'Selecta',proveedor:'Proveedor',nota:'Sellado'}],
    ozuna: [{medida:'Med-Esp',tipo:'s/h20',kilos:2,esMaquila:true}]
  }]);
  assert.equal(result['1'][0].medida, '51/60 selecta');
  assert.equal(result['1'][0].camaronNeto, 0.7);
  assert.equal(result['1'][0].nombreAlternativoPDF, '51/60 selecta Proveedor sellado');
  assert.equal(result['4'][0].medida, 'Med-Esp');
  assert.equal(result['4'][0].esVenta, false);
});

test('raw rows entered through a mixed order also use c/c, while clean rows keep their measure', () => {
  const result = Generator.methods.construirEsqueletoPorCliente.call(Generator.methods, [{
    joselito: [{medida:'Med-Esp',tipo:'crudo',kilos:2,esTara:true},
      {medida:'PacSC',tipo:'crudo',kilos:1}, {medida:'Med-Esp',tipo:'s/h20',kilos:3}]
  }]);
  assert.equal(result['1'][0].medida, 'Med-Esp c/c');
  assert.equal(result['1'][1].medida, 'PacSC');
  assert.equal(result['1'][2].medida, 'Med-Esp');
  Generator.methods.agregarCrudosAlEsqueleto(result, pedido({'med-esp':2}));
  assert.equal(result['1'].filter(i => i.tipo === 'crudo' && i.medida === 'Med-Esp c/c').length, 1);
});

test('new raw rows get prices in a mounted block without recalculating existing rows', async () => {
  const Vue = require('vue');
  const ExistingCrudo = Vue.extend(Crudo);
  const old = {medida:'Cam s/c',precio:777};
  const ctx = context([old]);
  const block = Vue.observable(ctx.clienteCrudos['1'][0]);
  const component = new ExistingCrudo({propsData:{crudo:block,nombreCliente:'Joselito',
    fechaEmbarque:'2026-10-09',preciosActuales:[{producto:'Med c/c',precio:100,fecha:'2026-10-01'}]}});
  // Preserve the price captured after the component's initial load.
  old.precio = 777;
  Mixin.methods.aplicarEsqueletoDesdePedido.call(ctx, generar(pedido({med:1})));
  await Vue.nextTick();
  assert.equal(block.items[1].precio,100);
  assert.equal(old.precio,777);
  component.$destroy();
});

test('merged aliases retain the sum of requested taras in skeleton and lookup without doubling on repeat', () => {
  const pedidos = pedido({'med-esp':2,'Med Esp c/c':3,'Med-Esp c/c':4});
  const result = generar(pedidos);
  assert.equal(result['1'].length,1);
  assert.equal(result['1'][0].pedidoReferencia.taras,9);
  const index = Mixin.methods.construirIndicePedidoReferenciaCrudos.call(Mixin.methods,pedidos);
  assert.equal(index['1']['Med-Esp c/c'].taras,9);
  assert.equal(index['1']['med-esp'].taras,2);
  Generator.methods.agregarCrudosAlEsqueleto(result,pedidos);
  assert.equal(result['1'][0].pedidoReferencia.taras,9);
});

test('existing non-head-on reference keys remain compatible', () => {
  const result = Mixin.methods.construirIndicePedidoReferenciaCrudos.call(Mixin.methods,
    pedido({linea:1,acamaya:2,rechazo:3,'cam s/c':4,PacSC:5}));
  for (const [name,taras] of [['Linea',1],['Acamaya',2],['Rechazo',3],['Cam s/c',4],['PacSC',5]]) {
    assert.equal(result['1'][name].taras,taras);
  }
});
