const { test } = require('node:test');
const assert = require('node:assert/strict');
const Vue = require('vue');
const { loadSource, vueOptions } = require('./helpers/embarques-source.cjs');
const { calcularTotalesPesadas } = loadSource('src/utils/embarquePesadas.js');
const base = 'src/views/Embarques/components/';
const cliente = vueOptions(base + 'ClienteProductos.vue', ['computed'], { calcularTotalesPesadas }).computed;
const producto = vueOptions(base + 'ProductoItem.vue', ['computed'], { calcularTotalesPesadas }).computed;
const PedidoReferencia = Vue.extend(vueOptions(base + 'PedidoReferencia.vue', ['props', 'computed', 'methods']));
const seleccionar = (opciones, claves) => Object.fromEntries(claves.map(k => [k, opciones[k]]));
const crearCliente = productos => new Vue({
  data: () => ({ productos }),
  computed: seleccionar(cliente, ['pesadasPorProducto', 'calcularTotalLimpioCliente', 'calcularKilosLimpioCliente', 'totalesAgrupadosPorClave']),
});
const crearProducto = p => new Vue({
  data: () => ({ producto: p }),
  computed: seleccionar(producto, ['totalesPesadas', 'totalTaras', 'totalKilos']),
});

test('regresión 00xx0: los totales reales de producto, cliente y pedido reciben números', () => {
  const p = { medida: 'Gde', tipo: 's/h20', taras: [0, 'xx'], tarasExtra: [0], kilos: [10], restarTaras: true };
  const copia = JSON.stringify(p), c = crearCliente([p]), item = crearProducto(p);
  const avisos = [], anterior = Vue.config.warnHandler;
  Vue.config.warnHandler = aviso => avisos.push(aviso);
  let referencia;
  try {
    const agrupado = c.totalesAgrupadosPorClave['gde__s/h20__'];
    referencia = new PedidoReferencia({ propsData: { ...agrupado, pedidoReferencia: { taras: 2 } } });
    assert.equal(item.totalTaras, 0); assert.equal(c.calcularTotalLimpioCliente, 0);
    assert.deepEqual(agrupado, { totalKilos: 10, totalTaras: 0 });
    assert.equal(referencia.claseCumplimiento, 'falta');
    assert.equal(item.totalesPesadas.hayValoresInvalidos, true);
    assert.deepEqual(item.totalesPesadas.invalidos.taras, [1]);
    assert.deepEqual(avisos, []);
    assert.equal(JSON.stringify(p), copia, 'no borrar ni convertir los datos compartidos');
  } finally { Vue.config.warnHandler = anterior; referencia?.$destroy(); c.$destroy(); item.$destroy(); }
});

test('números guardados como texto se suman y las taras extra no descuentan kilos', () => {
  const c = crearCliente([
    { medida: 'Gde', tipo: 's/h20', kilos: ['20.5', 10], taras: ['2'], tarasExtra: ['1'], restarTaras: true },
    { medida: 'Gde', tipo: 's/h20', kilos: [5], taras: [1] },
  ]);
  try {
    assert.equal(c.calcularTotalLimpioCliente, 4);
    assert.equal(c.calcularKilosLimpioCliente, 29.5);
    assert.deepEqual(c.totalesAgrupadosPorClave['gde__s/h20__'], { totalKilos: 29.5, totalTaras: 4 });
  } finally { c.$destroy(); }
});

test('corregir una tara reactiva actualiza el total y retira la marca de inválido', async () => {
  const item = crearProducto({ kilos: [30], taras: ['xx'], restarTaras: true });
  try {
    assert.equal(item.totalesPesadas.hayValoresInvalidos, true);
    Vue.set(item.producto.taras, 0, 2); await Vue.nextTick();
    assert.equal(item.totalTaras, 2); assert.equal(item.totalKilos, 24);
    assert.equal(item.totalesPesadas.hayValoresInvalidos, false);
  } finally { item.$destroy(); }
});

test('capturas vacías son neutras; texto parcial y valores no finitos se señalan', () => {
  const r = calcularTotalesPesadas({ kilos: ['2,5', '12xx', NaN, Infinity, true], taras: ['', null, undefined, ' '] });
  assert.equal(r.totalKilos, 2.5); assert.equal(r.totalTaras, 0);
  assert.deepEqual(r.invalidos, { kilos: [1, 2, 3, 4], taras: [], tarasExtra: [] });
});

test('el resumen conserva el cálculo especial del producto con agua', () => {
  const c = crearCliente([{ tipo: 'c/h20', reporteTaras: [2], reporteBolsas: [4], camaronNeto: 0.65 }]);
  try { assert.equal(c.calcularKilosLimpioCliente, 5.2); } finally { c.$destroy(); }
});
