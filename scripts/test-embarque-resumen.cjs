// Resumen del embarque completo: mismas fórmulas que los chips por cliente.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Vue = require('vue');
const { loadSource, vueOptions } = require('./helpers/embarques-source.cjs');
const totales = loadSource('src/utils/embarqueTotales.js');
const pedido = loadSource('src/utils/embarquePedidoEstado.js');
const { calcularTotalesPesadas } = loadSource('src/utils/embarquePesadas.js');
const base = 'src/views/Embarques/';
const cliente = vueOptions(base + 'components/ClienteProductos.vue', ['computed', 'methods'], { calcularTotalesPesadas, ...pedido, ...totales });
const nuevo = vueOptions(base + 'NuevoEmbarque.vue', ['computed'], { ...totales, resumenEmbarque: totales.resumenEmbarque });
const pick = (o, k) => Object.fromEntries(k.map(x => [x, o[x]]));

const productos = {
  '1': [{ tipo: 's/h20', kilos: [100, 50.5], taras: [5, 3] }, { tipo: 'c/h20', reporteTaras: [2], reporteBolsas: [10], camaronNeto: 0.65 }],
  '2': [{ tipo: 's/h20', kilos: [200], taras: [10], tarasExtra: [1] }],
  '3': [],
};
const crudos = {
  '1': [{ items: [{ taras: '2-19', sobrante: '1-15' }] }],
  '2': [{ items: [{ taras: '3-20' }, { taras: '1-19', sobrante2: '1-10' }] }],
};

function chips(id) {
  const c = new Vue({ data: () => ({ productos: productos[id], crudos: crudos[id] || [] }),
    computed: pick(cliente.computed, ['pesadasPorProducto', 'totalesLimpioCliente', 'calcularTotalLimpioCliente', 'calcularKilosLimpioCliente', 'totalesCrudoCliente', 'calcularTotalCrudoCliente', 'calcularKilosCrudoCliente']) });
  const r = { lt: c.calcularTotalLimpioCliente, lk: c.calcularKilosLimpioCliente, ct: c.calcularTotalCrudoCliente, ck: c.calcularKilosCrudoCliente };
  c.$destroy(); return r;
}

test('resumen suma todos los clientes con limpio y crudo', () => {
  const r = totales.resumenEmbarque(productos, crudos);
  assert.deepEqual(JSON.parse(JSON.stringify(r)), { limpio: { taras: 19, kilos: 363.5 }, crudo: { taras: 8, kilos: 145 } });
  assert.equal(totales.textoResumenEmbarque(r), 'Limpio 19T / 363.5 kg · Crudo 8T / 145 kg');
});

test('el resumen es la suma exacta de los chips por cliente', () => {
  const s = ['1', '2', '3'].map(chips).reduce((a, b) => ({ lt: a.lt + b.lt, lk: a.lk + b.lk, ct: a.ct + b.ct, ck: a.ck + b.ck }));
  const r = totales.resumenEmbarque(productos, crudos);
  assert.deepEqual([s.lt, s.lk, s.ct, s.ck], [r.limpio.taras, r.limpio.kilos, r.crudo.taras, r.crudo.kilos]);
});

test('NuevoEmbarque lo calcula en vivo y lo pinta arriba de Deshacer', () => {
  const vm = new Vue({ data: () => ({ pc: { '1': [{ tipo: 's/h20', kilos: [10], taras: [1] }] }, clienteCrudos: {} }),
    computed: { productosPorCliente() { return this.pc; }, resumenEmbarqueTotal: nuevo.computed.resumenEmbarqueTotal } });
  try {
    assert.equal(vm.resumenEmbarqueTotal.limpio.kilos, 10);
    vm.pc['1'][0].kilos.push(5);
    Vue.set(vm.clienteCrudos, '2', [{ items: [{ taras: '1-20' }] }]);
    assert.equal(vm.resumenEmbarqueTotal.limpio.kilos, 15);
    assert.deepEqual([vm.resumenEmbarqueTotal.crudo.taras, vm.resumenEmbarqueTotal.crudo.kilos], [1, 20]);
  } finally { vm.$destroy(); }
  const src = fs.readFileSync(path.resolve(__dirname, '..', base + 'NuevoEmbarque.vue'), 'utf8');
  assert.ok(src.indexOf('resumen-embarque-total') < src.indexOf('class="botones-undo-redo"'));
});
