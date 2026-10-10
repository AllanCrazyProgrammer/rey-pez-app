const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
const clone = value => JSON.parse(JSON.stringify(value));
const stored = new Map();
let writes = 0, adds = 0;
const firestore = {
  collection: () => 'entradasProductoBarcos', doc: (db, collection, id) => id,
  async addDoc(collection, data) { adds++; await Promise.resolve(); const id = 'test-' + adds; stored.set(id, clone(data)); writes++; return { id }; },
  async updateDoc(id, data) { stored.set(id, clone(data)); writes++; },
  query() {}, where() {}, orderBy() {}, async getDocs() { return { docs: [] }; }
};
function load(file) {
  let source = fs.readFileSync(path.join(root, file), 'utf8');
  if (file.endsWith('.vue')) source = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  const code = babel.transformSync(source, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const ctx = { exports: {}, console, document: { addEventListener() {}, removeEventListener() {} }, setTimeout() {}, alert(message) { throw Error(message); }, require(name) {
    if (name === '@/firebase') return { db: {} };
    if (name === 'firebase/firestore') return firestore;
    if (name.endsWith('.vue')) return {};
    if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.js');
    if (name.startsWith('.')) return load(path.join(path.dirname(file), name) + '.js');
    if (name === 'moment' || name.startsWith('moment/')) return require(name);
    throw Error(name);
  } };
  vm.runInNewContext(code, ctx, { filename: file });
  return ctx.exports;
}
const utils = load('src/utils/coloresHilo.js');
const View = load('src/views/Barcos/EntradaProductoBarco.vue').default;
const Selector = load('src/components/Barcos/SelectorColoresHilo.vue').default;
function context(component, props = {}) {
  const ctx = { ...props };
  Object.assign(ctx, component.data.call(ctx));
  for (const [name, fn] of Object.entries(component.methods)) ctx[name] = fn.bind(ctx);
  for (const [name, fn] of Object.entries(component.computed)) Object.defineProperty(ctx, name, { get: fn.bind(ctx) });
  return ctx;
}
test('normalization accepts only known colors, no duplicates, max two, legacy safe', () => {
  for (const value of [undefined, null, '', 'rojo', {}]) assert.deepEqual(clone(utils.normalizarColoresHilo(value)), []);
  assert.deepEqual(clone(utils.normalizarColoresHilo(['rojo', 'rojo', 'invalid', 'azul', 'verde'])), ['rojo', 'azul']);
  assert.equal(utils.descripcionColoresHilo(['rojo', 'azul']), 'Rojo + Azul');
  assert.deepEqual(clone(utils.estiloColoresHilo([])), {});
  assert.match(utils.estiloColoresHilo(['rojo', 'azul']).background, /linear-gradient/);
});
test('single, dual, third blocked, deselect, clearing and changed measure mode', () => {
  const c = context(Selector, { value: [], medida: {} });
  c.$emit = (event, value) => { assert.equal(event, 'input'); c.value = value; };
  c.seleccionar('rojo'); c.seleccionar('azul');
  assert.deepEqual(clone(c.value), ['azul']);
  c.cambiarCombinacion(true); c.seleccionar('rojo'); c.seleccionar('verde');
  assert.deepEqual(clone(c.value), ['azul', 'rojo']);
  c.seleccionar('azul'); c.seleccionar('verde');
  assert.deepEqual(clone(c.value), ['rojo', 'verde']);
  c.cambiarCombinacion(false); assert.deepEqual(clone(c.value), ['rojo']);
  c.limpiar(); assert.deepEqual(clone(c.value), []);
  c.value = ['azul', 'verde']; Selector.watch.medida.call(c); assert.equal(c.combinar, true);
  c.value = []; Selector.watch.medida.call(c); assert.equal(c.combinar, false);
});
test('create/save/reload/edit/clear uses same document, protects legacy rows and totals, repeated clicks do not duplicate', async () => {
  const c = context(View); c.barcoSeleccionado = 'galileo';
  c.nuevaDescarga();
  assert.deepEqual(clone(c.medidaActiva.coloresHilo), []);
  c.medidaActiva.nombre = 'Pac ch'; c.medidaActiva.filas = [{ taras: 2, kilos: 30 }];
  c.medidaActiva.coloresHilo = ['rojo'];
  const initialAdds = adds;
  await Promise.all([c.guardarDescarga(), c.guardarDescarga()]);
  assert.equal(adds, initialAdds + 1);
  const id = c.editandoId;
  assert.equal(stored.get(id).medidas[0].totalKilos, 24);
  c.editarDescarga({ id, ...clone(stored.get(id)) });
  assert.deepEqual(clone(c.medidaActiva.coloresHilo), ['rojo']);
  c.medidaActiva.coloresHilo.push('azul');
  await c.autoGuardar();
  c.editarDescarga({ id, ...clone(stored.get(id)) });
  assert.deepEqual(clone(c.medidaActiva.coloresHilo), ['rojo', 'azul']);
  c.medidaActiva.coloresHilo = [];
  await c.guardarDescarga();
  c.editarDescarga({ id, ...clone(stored.get(id)) });
  assert.deepEqual(clone(c.medidaActiva.coloresHilo), []);
  assert.equal(adds, initialAdds + 1);
  assert.equal(stored.get(id).medidas[0].nombre, 'Pac ch');
  assert.deepEqual(stored.get(id).medidas[0].filas, [{ taras: 2, kilos: 30 }]);
  const legacy = { id: 'legacy', fecha: '2026-10-10', medidas: [{ nombre: 'Pac gde', filas: [{ taras: 3, kilos: 50 }] }] };
  const before = JSON.stringify(legacy);
  c.editarDescarga(legacy);
  assert.deepEqual(clone(c.medidaActiva.coloresHilo), []);
  c.medidaActiva.coloresHilo.push('verde');
  assert.equal(JSON.stringify(legacy), before);
  assert.equal(c.prepararMedidasParaGuardar()[0].totalKilos, 41);
  assert(writes >= 3);
});
test('Vue templates compile without errors', () => {
  const compiler = require('vue-template-compiler');
  for (const file of ['src/components/Barcos/SelectorColoresHilo.vue', 'src/views/Barcos/EntradaProductoBarco.vue']) {
    const sfc = compiler.parseComponent(fs.readFileSync(path.join(root, file), 'utf8'));
    assert.deepEqual(compiler.compile(sfc.template.content).errors, []);
  }
});
test('Vue 2 reacts to initialized legacy colors and same-index measure replacement', async () => {
  const Vue = require('vue');
  const view = new Vue(View);
  view.editarDescarga({ id: 'legacy', fecha: '2026-10-10', medidas: [{ nombre: 'Pac ch', filas: [{ taras: 1, kilos: 20 }] }] });
  let notifications = 0;
  view.$watch(() => view.medidaActiva.coloresHilo, () => notifications++);
  view.medidaActiva.coloresHilo = ['azul', 'amarillo'];
  await Vue.nextTick();
  assert.equal(notifications, 1);
  const child = new Vue({ ...Selector, propsData: { value: [], medida: { nombre: 'primera' } } });
  child.value = ['rojo', 'azul']; child.medida = { nombre: 'segunda' };
  await Vue.nextTick(); assert.equal(child.combinar, true);
  child.value = []; child.medida = { nombre: 'tercera' };
  await Vue.nextTick(); assert.equal(child.combinar, false);
  view.$destroy(); child.$destroy();
});
test('compact menu opens, dismisses outside and restores keyboard focus without changing selection', () => {
  const c = context(Selector, { value: ['azul', 'rojo'], medida: {} });
  let focus = '', pending;
  c.$refs = { botonColor: { focus() { focus = 'button'; } }, panel: { querySelector() { return { focus() { focus = 'checkbox'; } }; } } };
  c.$nextTick = fn => { pending = fn; };
  const inside = {};
  c.$el = { contains: target => target === inside };
  assert.equal(c.abierto, false);
  c.alternarMenu(); assert.equal(c.abierto, true); pending(); assert.equal(focus, 'checkbox');
  c.cerrarDesdeFuera({ target: inside }); assert.equal(c.abierto, true);
  c.cerrarDesdeFuera({ target: {} }); assert.equal(c.abierto, false);
  c.abrirMenu(); c.cerrarMenu(true); pending(); assert.equal(focus, 'button');
  assert.equal(c.abierto, false);
  c.alternarMenu(); c.alternarMenu(); assert.equal(c.abierto, false);
  c.abrirMenu(); Selector.watch.medida.call(c); assert.equal(c.abierto, false);
  assert.deepEqual(clone(c.value), ['azul', 'rojo']);
});
