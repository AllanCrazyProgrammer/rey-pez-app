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
    if (name === 'moment' || name.startsWith('moment/')) return require(name);
    throw new Error('Unexpected dependency: ' + name);
  } };
  vm.runInNewContext(code, context, { filename: file });
  return context.exports;
}
const prices = load('src/utils/preciosHistoricos.js');
const pairs = [['Med Esp c/c', 'Med-Esp c/c'], ['Med Gde c/c', 'Med-Gde c/c']];
function fixture(oldName, newName) {
  return [
    { producto: oldName, precio: 100, fecha: '2026-09-01', timestamp: 1 },
    { producto: newName, precio: 110, fecha: '2026-10-01', timestamp: 2 },
    { producto: oldName, precio: 115, fecha: '2026-10-01', timestamp: { seconds: 1, nanoseconds: 0 } },
    { producto: oldName, precio: 90, fecha: '2026-09-02', timestamp: 3, clienteId: 'joselito' },
    { producto: newName, precio: 95, fecha: '2026-10-02', timestamp: 4, clienteId: 'joselito' },
    { producto: newName, precio: 999, fecha: '2026-12-01', timestamp: 5 },
    { producto: newName, precio: 1, fecha: '2026-10-03', timestamp: 6, clienteId: 'otro' }
  ];
}
test('canonical names and lookup aliases share only the two c/c families', () => {
  for (const [oldName, newName] of pairs) {
    for (const name of [oldName, newName, oldName.toUpperCase(), '  ' + oldName.replace(' ', '  ') + '  ']) {
      assert.equal(prices.normalizarNombreProductoPrecio(name), newName);
      assert.equal(prices.normalizarMedida(name), prices.normalizarMedida(newName));
    }
  }
  for (const [a,b] of [['Med Esp s/c','Med-Esp s/c'], ['Med Esp c/c','Med Esp s/c'], ['granja100','granja'], ['Med Esp c/c extra','Med-Esp c/c'], ['Med Gde c/c','Med Esp c/c']]) {
    assert.notEqual(prices.normalizarMedida(a), prices.normalizarMedida(b));
  }
  assert.equal(prices.normalizarMedida('51-60'), prices.normalizarMedida('51/60'));
  assert.equal(prices.normalizarMedida(null), '');
  assert.equal(prices.normalizarNombreProductoPrecio('constructor'), 'constructor');
});
test('old/current references survive canonical renaming with date, timestamp and client precedence intact', () => {
  for (const [oldName, newName] of pairs) {
    const before = fixture(oldName, newName);
    const snapshot = JSON.stringify(before);
    const after = before.map(p => ({ ...p, producto: prices.normalizarNombreProductoPrecio(p.producto) }));
    for (const catalog of [before, after]) for (const name of [oldName,newName]) {
      assert.equal(prices.obtenerPrecioParaMedida(catalog,name,'2026-08-31'),null);
      assert.equal(prices.obtenerPrecioParaMedida(catalog,name,'2026-09-01'),100);
      assert.equal(prices.obtenerPrecioParaMedida(catalog,name,'2026-10-01'),115);
      assert.equal(prices.obtenerPrecioParaMedida(catalog,name,'2026-10-01','joselito'),90);
      assert.equal(prices.obtenerPrecioParaMedida(catalog,name,'2026-10-03','joselito'),95);
      assert.equal(prices.obtenerPrecioParaMedida(catalog,name,'2026-10-03','desconocido'),115);
      assert.equal(prices.obtenerDetallePrecioParaMedida(catalog,name,'2026-10-03').tipoCoincidencia,'exacta');
    }
    assert.equal(JSON.stringify(before),snapshot);
  }
});
test('numeric exact/base precedence and unrelated product semantics are unchanged', () => {
  const catalog = [
    { producto:'71/90', precio:50, fecha:'2026-10-01', clienteId:'joselito' },
    { producto:'71/90 selecta', precio:60, fecha:'2026-10-01' },
    { producto:'granja', precio:70, fecha:'2026-10-01' },
    { producto:'Med-Esp s/c', precio:80, fecha:'2026-10-01' }
  ];
  assert.equal(prices.obtenerPrecioParaMedida(catalog,'71/90 selecta','2026-10-09','joselito'),60);
  const base=prices.obtenerDetallePrecioParaMedida(catalog,'71/90 61 selecta','2026-10-09','joselito');
  assert.equal(base.precio,50); assert.equal(base.tipoCoincidencia,'base');
  assert.equal(prices.obtenerPrecioParaMedida(catalog,'granja100','2026-10-09'),null);
  assert.equal(prices.obtenerPrecioParaMedida(catalog,'Med-Esp c/c','2026-10-09'),null);
});
test('sale-note resolver keeps client names and alias history after renaming', () => {
  const catalog = fixture(...pairs[0]).map(p => ({...p, clienteNombre:p.clienteId, clienteId:undefined}));
  for (const name of pairs[0]) {
    assert.equal(prices.obtenerPrecioParaMedidaNotaVenta(catalog,name,'2026-10-03','joselito'),95);
    assert.equal(prices.obtenerPrecioParaMedidaNotaVenta(catalog,name,'2026-09-01'),100);
  }
});
test('shipment product/crudo paths preserve manual and intentionally cleared prices across aliases', () => {
  const Product = load('src/views/Embarques/components/ProductoItem.vue').default;
  const Crudo = load('src/views/Embarques/components/CrudoItem.vue').default;
  for (const [oldName,newName] of pairs) {
    for (const manual of [true,false]) {
      const producto = {medida:oldName,precio:777,precioOrigen:manual?'manual':'general',precioMedidaBase:newName};
      const ctx = {producto,nombreCliente:'Joselito',fechaEmbarque:'2026-10-03',preciosActuales:fixture(oldName,newName),medidaPrecioAnteriorNormalizada:prices.normalizarMedida(newName),$emit(){},establecerDatoPrecio(k,v){producto[k]=v;},limpiarDatosPrecioAutomatico(){throw new Error('Unexpected clear');}};
      Product.methods.asignarPrecioAutomatico.call(ctx);
      assert.equal(producto.precio,manual?777:95);
      const item={medida:oldName,precio:777,precioOrigen:manual?'manual':'general',precioMedidaBase:newName};
      Crudo.methods.asignarPrecioAutomaticoCrudo.call({...ctx,$set(o,k,v){o[k]=v;},$delete(o,k){delete o[k];}},item);
      assert.equal(item.precio,manual?777:95);
    }
    const producto={medida:oldName,precio:null,precioBorradoManualmente:true};
    Product.methods.asignarPrecioAutomatico.call({producto,nombreCliente:'Joselito',medidaPrecioAnteriorNormalizada:prices.normalizarMedida(newName)});
    assert.equal(producto.precio,null);
    Crudo.methods.asignarPrecioAutomaticoCrudo.call({nombreCliente:'Joselito',fechaEmbarque:'2026-10-03'},producto);
    assert.equal(producto.precio,null);
  }
});
test('account service existing normalization remains compatible before/after canonical renaming', async () => {
  for (const [oldName,newName] of pairs) for (const renamed of [false,true]) {
    const catalog=fixture(oldName,newName).map(p=>({...p,producto:renamed?prices.normalizarNombreProductoPrecio(p.producto):p.producto})).sort((a,b)=>prices.compararPreciosMasAntiguosPrimero(b,a));
    const firestore={getFirestore:()=>({}),collection:()=>({}),query:()=>({}),orderBy:()=>({}),getDocs:async()=>({docs:catalog.map(p=>({data:()=>p}))})};
    const service=load('src/utils/services/EmbarqueCuentasService.js',{'firebase/firestore':firestore},'\nexport { normalizarMedida, obtenerPreciosVenta };');
    assert.equal(service.normalizarMedida(oldName),service.normalizarMedida(newName));
    const general=await service.obtenerPreciosVenta('desconocido','2026-10-03');
    const specific=await service.obtenerPreciosVenta('joselito','2026-10-03');
    assert.equal(general.get(service.normalizarMedida(oldName)),115);
    assert.equal(specific.get(service.normalizarMedida(newName)),95);
  }
});
test('price panel groups the same aliases without changing records, identities, client scopes or history', async () => {
  const docs=fixture(...pairs[0]).map((p,i)=>({...p,id:'price-'+i}));
  const snapshot=JSON.stringify(docs);
  const firestore={collection:()=>({}),getDocs:async()=>({docs:docs.map(p=>({id:p.id,data:()=>p}))})};
  const panel=load('src/components/PreciosHistorialModal.vue',{'firebase/firestore':firestore,'@/firebase':{db:{}}}).default;
  const ctx={normalizarNombreProducto:panel.methods.normalizarNombreProducto,sincronizarFormMaquilaOzuna(){}};
  await panel.methods.cargarPreciosActuales.call(ctx);
  assert.equal(ctx.preciosActuales.length,3);
  assert.equal(ctx.preciosFirestoreRaw.length,docs.length);
  assert.equal(ctx.preciosActuales.flatMap(p=>p.historial).length,docs.length);
  for(const entry of ctx.preciosActuales) assert.equal(entry.producto,'Med-Esp c/c');
  assert.equal(ctx.preciosActuales.find(p=>p.clienteId==='joselito').precio,95);
  assert.equal(new Set(ctx.preciosActuales.flatMap(p=>p.historial.map(h=>h.id))).size,docs.length);
  assert.equal(JSON.stringify(docs),snapshot);
});
