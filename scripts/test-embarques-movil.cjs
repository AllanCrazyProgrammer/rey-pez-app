const { test } = require('node:test');
const assert = require('node:assert/strict');
const Vue = require('vue');
const { vueOptions, loadSource } = require('./helpers/embarques-source.cjs');
const base = 'src/views/Embarques/components/';
const pedido = loadSource('src/utils/embarquePedidoEstado.js');
const { calcularTotalesPesadas } = loadSource('src/utils/embarquePesadas.js');
const opciones = vueOptions(base + 'ClienteProductos.vue', ['data', 'computed'], { ...pedido, calcularTotalesPesadas });
function cliente(productos = [], crudos = []) {
  return new Vue({
    data: () => ({ ...opciones.data(), productos, crudos, clienteId: 'c1', pedidoReferenciaCrudosPorCliente: {}, pedidoReferenciaPorCliente: {} }),
    computed: {
      pesadasPorProducto: opciones.computed.pesadasPorProducto,
      totalesAgrupadosPorClave: opciones.computed.totalesAgrupadosPorClave,
      opcionesMedidasMovil: opciones.computed.opcionesMedidasMovil,
      medidaMovilSeleccionada: opciones.computed.medidaMovilSeleccionada,
    },
  });
}

test('los menús empiezan cerrados y las opciones de cada cliente son independientes', () => {
  const h = vueOptions(base + 'HeaderEmbarque.vue', ['data']);
  assert.equal(h.data.call({ embarque: { fecha: '', cargaCon: '' } }).menuMovilAbierto, false);
  const a = cliente(), b = cliente();
  try {
    assert.equal(a.menuClienteAbierto, false);
    a.menuClienteAbierto = true;
    assert.equal(b.menuClienteAbierto, false);
  } finally { a.$destroy(); b.$destroy(); }
});

test('las medidas manuales y del esqueleto aparecen junto a las tallas de crudo', () => {
  const c = cliente([
    { id: 'manual', medida: '16/20', tipo: 's/h20' },
    { id: 'esqueleto', medida: 'Mediano', tipo: 'c/h20', pedidoReferencia: { kilos: 100 } },
    { id: 'nuevo', medida: '', tipo: 'otro', tipoPersonalizado: 'Sellado' },
  ], [{ id: 'g1', items: [{ id: 'i1', talla: 'Gde' }, { id: 'i2', talla: 'Chico' }] }]);
  try {
    assert.deepEqual(c.opcionesMedidasMovil.map(o => [o.medida, o.tipo]), [
      ['16/20', 's/h20'], ['Mediano', 'c/h20'], ['Producto nuevo', 'Sellado'], ['Gde', 'Crudo'], ['Chico', 'Crudo'],
    ]);
    c.medidaMovilActiva = 'crudo:g1:i2';
    assert.equal(c.medidaMovilSeleccionada.itemId, 'i2');
    assert.equal(c.medidaMovilSeleccionada.crudoId, 'g1');
  } finally { c.$destroy(); }
});

test('seleccionar una medida no modifica la captura y sigue al producto tras cambios remotos', () => {
  const productos = [{ id: 'p1', medida: 'Gde', kilos: [20] }, { id: 'p2', medida: 'Gde', kilos: [30] }];
  const c = cliente(productos), original = JSON.stringify(productos);
  try {
    c.medidaMovilActiva = 'producto:p2';
    assert.equal(JSON.stringify(productos), original);
    c.productos.reverse();
    c.productos[0].medida = 'Nueva medida';
    assert.equal(c.medidaMovilSeleccionada.productoId, 'p2');
    assert.equal(c.medidaMovilSeleccionada.medida, 'Nueva medida');
    c.productos.splice(0, 1);
    assert.equal(c.medidaMovilSeleccionada, null, 'si eliminan la selección se vuelve a mostrar todo');
  } finally { c.$destroy(); }
});

test('pendientes primero; completar una medida no cambia la selección ni el orden de la captura', () => {
  const productos = [
    { id: 'listo', medida: '16/20', tipo: 's/h20', kilos: [50], pedidoReferencia: { kilos: 50 } },
    { id: 'pendiente', medida: '21/25', tipo: 'c/h2o', kilos: [5], pedidoReferencia: { kilos: 20 } },
    { id: 'sin-pedido', medida: '31/35', kilos: [1000] },
  ];
  const c = cliente(productos);
  try {
    assert.deepEqual(c.opcionesMedidasMovil.map(o => o.productoId), ['pendiente', 'sin-pedido', 'listo']);
    assert.equal(c.opcionesMedidasMovil[0].categoria, 'con-agua');
    assert.equal(c.opcionesMedidasMovil[2].categoria, 'sin-agua');
    assert.equal(c.opcionesMedidasMovil[1].tieneReferencia, false);
    c.medidaMovilActiva = 'producto:pendiente';
    Vue.set(productos[1].kilos, 0, 20);
    assert.equal(c.medidaMovilSeleccionada.cubierto, true);
    assert.deepEqual(c.opcionesMedidasMovil.map(o => o.productoId), ['sin-pedido', 'listo', 'pendiente']);
    assert.deepEqual(productos.map(p => p.id), ['listo', 'pendiente', 'sin-pedido']);
  } finally { c.$destroy(); }
});

test('botones y tarjetas usan el mismo total agrupado y criterio de pedido', () => {
  const productos = [
    { id: 'p1', medida: 'Gde', nombreAlternativoPDF: 'Gde sellado', tipo: 's/h20', kilos: [30], pedidoReferencia: { kilos: '50,0', taras: 999 } },
    { id: 'p2', medida: 'Gde', nombreAlternativoPDF: 'Gde sellado', tipo: 's/h20', kilos: [20], pedidoReferencia: { kilos: 50 } },
  ];
  const c = cliente(productos);
  const tarjeta = vueOptions(base + 'ProductoItem.vue', ['computed'], pedido).computed;
  try {
    assert.ok(c.opcionesMedidasMovil.every(o => o.cubierto));
    assert.equal(c.opcionesMedidasMovil[0].medida, 'Gde sellado');
    const estado = tarjeta.estadoPedidoReferencia.call({ pedidoReferenciaEfectiva: productos[0].pedidoReferencia, totalesCompartidos: c.totalesAgrupadosPorClave[pedido.claveReferenciaProducto(productos[0])] });
    assert.equal(estado.cubierto, c.opcionesMedidasMovil[0].cubierto);
    assert.equal(tarjeta.pedidoCubierto.call({ estadoPedidoReferencia: estado }), true);
  } finally { c.$destroy(); }
});

test('crudos compara taras por talla y respeta la referencia del cliente', () => {
  const c = cliente([], [{ id: 'g1', items: [
    { id: 'i1', talla: 'Gde', taras: '2-19', sobrante: '1-10', pedidoReferencia: { taras: 9 } },
    { id: 'i2', talla: 'Gde', taras: '1-19' },
    { id: 'i3', talla: 'Chico', taras: '1-19', pedidoReferencia: { taras: 3 } },
  ] }]);
  try {
    c.pedidoReferenciaCrudosPorCliente = { c1: { Gde: { taras: 4 } } };
    assert.deepEqual(c.opcionesMedidasMovil.map(o => [o.itemId, o.cubierto]), [['i3', false], ['i1', true], ['i2', true]]);
    assert.ok(c.opcionesMedidasMovil.every(o => o.categoria === 'crudo'));
    const tarjeta = vueOptions(base + 'CrudoItem.vue', ['computed'], pedido).computed;
    assert.equal(tarjeta.totalTarasPorTalla.call({ crudoData: c.crudos[0] }).Gde, 4);
  } finally { c.$destroy(); }
});

test('el reporte de taras tiene la misma prioridad que el contorno de la tarjeta', () => {
  const c = cliente([
    { id: 'sin-ref', medida: '51/60 refri', taras: [5,5], reporteTaras: [10], kilos: [200] },
    { id: 'pedido-cubierto', medida: '21/25', taras: [5], reporteTaras: [2], kilos: [100], pedidoReferencia: { kilos: 100 } },
    { id: 'pedido-pendiente', medida: '16/20', taras: [5], reporteTaras: ['5'], kilos: [50], pedidoReferencia: { kilos: 100 } },
  ]);
  try {
    assert.deepEqual(c.opcionesMedidasMovil.map(o => [o.productoId,o.cubierto,o.etiqueta]), [
      ['pedido-cubierto', false, 'Falta reportar'], ['sin-ref', true, 'Reportado'], ['pedido-pendiente', true, 'Reportado'],
    ]);
    const tarjeta = vueOptions(base + 'ProductoItem.vue', ['computed'], pedido).computed;
    c.productos.forEach(p => {
      const total = tarjeta.totalTarasReportadas.call({ producto: p });
      const coincide = tarjeta.coincideTaras.call({ totalTaras: calcularTotalesPesadas(p).totalTaras, totalTarasReportadas: total });
      assert.equal(c.opcionesMedidasMovil.find(o => o.productoId === p.id).cubierto, coincide);
    });
  } finally { c.$destroy(); }
});

test('51/60 refri se compara por su nombre PDF 51/60 contra el índice real del pedido', () => {
  const { embarquePedidoMixin } = loadSource('src/views/Embarques/mixins/embarquePedidoMixin.js');
  const productor = { ...embarquePedidoMixin.methods, clientesPersonalizados: [] };
  const indice = productor.construirIndicePedidoReferencia([{ tipo: 'limpio', otilio: [
    { medida: '51/60', tipo: 's/h20', kilos: 100 },
    { medida: '51/60 refri', tipo: 's/h20', kilos: 5 },
    { medida: '51/60', tipo: 'c/h20', kilos: 20 },
  ] }]);
  const p = { id: 'refri', medida: '51/60 refri', nombreAlternativoPDF: '51/60', tipo: 's/h2o', kilos: [10], pedidoReferencia: null };
  const c = cliente([p]);
  const opcionesTarjeta = vueOptions(base + 'ProductoItem.vue', ['computed'], pedido).computed;
  const tarjeta = new Vue({
    data: () => ({ producto: p, pedidoReferenciaCliente: indice['3'], totalesCompartidos: { totalKilos: 10, totalTaras: 0 } }),
    computed: { pedidoReferenciaEfectiva: opcionesTarjeta.pedidoReferenciaEfectiva, estadoPedidoReferencia: opcionesTarjeta.estadoPedidoReferencia },
  });
  try {
    c.clienteId = '3'; c.pedidoReferenciaPorCliente = indice;
    assert.equal(c.opcionesMedidasMovil[0].tieneReferencia, true);
    assert.equal(c.opcionesMedidasMovil[0].cubierto, false);
    assert.equal(tarjeta.pedidoReferenciaEfectiva.kilos, 100, 'usar el PDF antes del nombre de captura y sin mezclar tipos');
    assert.equal(tarjeta.estadoPedidoReferencia.cubierto, false);
    p.medida = '51/60 refrigerado';
    assert.equal(tarjeta.pedidoReferenciaEfectiva.kilos, 100);
    assert.equal(c.opcionesMedidasMovil[0].tieneReferencia, true);
    assert.equal(p.pedidoReferencia, null, 'la comparación no escribe referencias derivadas en el embarque');
    p.tipo = 'c/h20';
    assert.equal(tarjeta.pedidoReferenciaEfectiva.kilos, 20);
  } finally { c.$destroy(); tarjeta.$destroy(); }
});

test('cambiar el nombre PDF y recibir un pedido nuevo recalcula la referencia sin watchers que escriban', () => {
  const p = { id: 'p1', medida: 'Captura', nombreAlternativoPDF: 'Gde', tipo: 's/h20', kilos: [50] };
  const c = cliente([p]);
  try {
    c.pedidoReferenciaPorCliente = { c1: { porClave: { 'gde__s/h20__': { kilos: 50 }, 'chico__s/h20__': { kilos: 100 } } } };
    assert.equal(c.opcionesMedidasMovil[0].cubierto, true);
    p.nombreAlternativoPDF = 'Chico';
    assert.equal(c.opcionesMedidasMovil[0].cubierto, false);
    c.pedidoReferenciaPorCliente = { c1: { porClave: { 'chico__s/h20__': { kilos: 40 } } } };
    assert.equal(c.opcionesMedidasMovil[0].cubierto, true);
    assert.equal(p.medida, 'Captura');
  } finally { c.$destroy(); }
});

test('sin índice disponible se conserva la referencia del esqueleto; un índice conocido no inventa coincidencias', () => {
  const p = { medida: 'Gde', tipo: 's/h20', pedidoReferencia: { kilos: 50 } };
  assert.deepEqual(pedido.referenciaPedidoProducto(p, null), { kilos: 50 });
  assert.equal(pedido.referenciaPedidoProducto(p, { porClave: { 'gde__c/h20__': { kilos: 100 } } }), null);
});

test('pedido real con (hacer 4 t): mostrar 27 T por el nombre PDF sin sumar las 5 T selladas', () => {
  const { embarquePedidoMixin } = loadSource('src/views/Embarques/mixins/embarquePedidoMixin.js');
  const productor = { ...embarquePedidoMixin.methods, clientesPersonalizados: [] };
  const indice = productor.construirIndicePedidoReferencia([{ tipo: 'limpio', otilio: [
    { medida: '51/60', proveedor: '(hacer 4 t)', tipo: 'S/H20', kilos: 27, esTara: true },
    { medida: '51/60', nota: 'sellado', tipo: 'S/H20', kilos: 5, esTara: true },
    { medida: '51/60', tipo: 'C/H20', kilos: 5, esTara: true },
  ] }])['3'];
  const referencia = pedido.referenciaPedidoProducto({ medida: '51/60 refri', nombreAlternativoPDF: '51/60', tipo: 's/h20' }, indice);
  assert.deepEqual(referencia, { kilos: 0, taras: 27 });
  assert.ok(indice.porClave['51/60 (hacer 4 t)__s/h20__'], 'conservar la anotación original');
  const indicador = Vue.extend(vueOptions(base + 'PedidoReferencia.vue', ['props','computed','methods'], pedido));
  const vm = new indicador({ propsData: { pedidoReferencia: referencia, totalTaras: 25 } });
  try {
    assert.equal(vm.tieneReferencia, true);
    assert.equal(vm.textoReferencia, '27 T');
    assert.equal(vm.claseCumplimiento, 'falta');
  } finally { vm.$destroy(); }
});

test('las variantes con distintas anotaciones no se fusionan por aproximación', () => {
  const { embarquePedidoMixin } = loadSource('src/views/Embarques/mixins/embarquePedidoMixin.js');
  const productor = { ...embarquePedidoMixin.methods, clientesPersonalizados: [] };
  const construir = items => productor.construirIndicePedidoReferencia([{ tipo:'limpio', otilio:items }])['3'];
  const a = { medida:'51/60', proveedor:'(ya esta)', tipo:'S/H20', kilos:20 };
  const b = { medida:'51/60', proveedor:'(hacer 4 t)', tipo:'S/H20', kilos:50 };
  const p = { medida:'51/60', tipo:'s/h20' };
  assert.deepEqual(pedido.referenciaPedidoProducto(p, construir([a])), { kilos:20, taras:0 });
  assert.equal(pedido.referenciaPedidoProducto(p, construir([a,b])), null);
  assert.deepEqual(pedido.referenciaPedidoProducto({ ...p, nombreAlternativoPDF:'51/60 (ya esta)' }, construir([a,b])), { kilos:20, taras:0 });
});

test('el encabezado muestra el día y la fecha del embarque sin desplazamiento de zona horaria', () => {
  const h = vueOptions(base + 'HeaderEmbarque.vue', ['computed']);
  const texto = h.computed.fechaResumen.call({ embarque: { fecha: '2026-10-22' } });
  assert.match(texto, /jue/i); assert.match(texto, /22\/10\/2026/);
  assert.equal(h.computed.fechaResumen.call({ embarque: { fecha: '' } }), 'Sin fecha');
});
