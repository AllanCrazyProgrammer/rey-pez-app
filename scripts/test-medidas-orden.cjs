// Chips 'Medidas del pedido' (móvil): 'Falta reportar' con el pedido completo → borde amarillo
// y al final, antes de las hechas. Usa los módulos reales y el computed real de ClienteProductos.vue.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Vue = require('vue');
const { vueOptions, loadSource } = require('./helpers/embarques-source.cjs');
const orden = loadSource('src/utils/medidasMovilOrden.js');
const pedido = loadSource('src/utils/embarquePedidoEstado.js');
const { calcularTotalesPesadas } = loadSource('src/utils/embarquePesadas.js');
const archivo = 'src/views/Embarques/components/ClienteProductos.vue';
const opciones = vueOptions(archivo, ['data', 'computed'], { ...pedido, calcularTotalesPesadas, ...orden });

function cliente(productos) {
  return new Vue({
    data: () => ({ ...opciones.data(), productos, crudos: [], clienteId: 'c1', pedidoReferenciaCrudosPorCliente: {}, pedidoReferenciaPorCliente: {} }),
    computed: {
      pesadasPorProducto: opciones.computed.pesadasPorProducto,
      totalesAgrupadosPorClave: opciones.computed.totalesAgrupadosPorClave,
      opcionesMedidasMovil: opciones.computed.opcionesMedidasMovil,
    },
  });
}

test('grupos: hecho, falta-reportar solo con pedido completo, resto pendiente', () => {
  assert.equal(orden.grupoMedidaMovil({ cubierto: true, etiqueta: 'Reportado' }), 'hecho');
  assert.equal(orden.grupoMedidaMovil({ cubierto: true, etiqueta: 'Completo' }), 'hecho');
  assert.equal(orden.grupoMedidaMovil({ cubierto: false, etiqueta: 'Falta reportar', pedidoCubierto: true }), 'falta-reportar');
  assert.equal(orden.grupoMedidaMovil({ cubierto: false, etiqueta: 'Falta reportar', pedidoCubierto: false }), 'pendiente');
  assert.equal(orden.grupoMedidaMovil({ cubierto: false, etiqueta: 'Pendiente' }), 'pendiente');
  assert.equal(orden.grupoMedidaMovil({ cubierto: false, etiqueta: 'Sin referencia' }), 'pendiente');
});

test('orden pendientes → falta reportar → hechas, estable dentro de cada grupo', () => {
  const r = orden.ordenarMedidasMovil([
    { id: 'h1', cubierto: true }, { id: 'f1', etiqueta: 'Falta reportar', pedidoCubierto: true },
    { id: 'p1', etiqueta: 'Pendiente' }, { id: 'f2', etiqueta: 'Falta reportar', pedidoCubierto: true },
    { id: 'h2', cubierto: true }, { id: 'p2', etiqueta: 'Falta reportar', pedidoCubierto: false },
  ]);
  assert.deepEqual(r.map(o => o.id), ['p1', 'p2', 'f1', 'f2', 'h1', 'h2']);
  assert.deepEqual(r.map(o => o.grupo), ['pendiente', 'pendiente', 'falta-reportar', 'falta-reportar', 'hecho', 'hecho']);
});

test('estadoMedidaProducto conserva si el pedido está completo cuando falta reportar', () => {
  const p = { medida: 'Golfo', tipo: 's/h20', kilos: [131], taras: [5], reporteTaras: [], pedidoReferencia: { kilos: 100 } };
  const t = calcularTotalesPesadas(p);
  const e = pedido.estadoMedidaProducto(p, t, t);
  assert.equal(e.etiqueta, 'Falta reportar');
  assert.equal(e.cubierto, false);
  assert.equal(e.pedidoCubierto, true);
});

test('caso Golfo de la captura: completo pero falta reportar va al final y amarillo', () => {
  const c = cliente([
    { id: 'golfo', medida: 'Golfo', tipo: 's/h20', kilos: [131], taras: [5], reporteTaras: [], pedidoReferencia: { kilos: 100 } },
    { id: 'hecho', medida: '41/50', tipo: 's/h20', kilos: [60], taras: [3], reporteTaras: ['3'], pedidoReferencia: { kilos: 50 } },
    { id: '5160', medida: '51/60', tipo: 's/h20', kilos: [10], pedidoReferencia: { kilos: 50 } },
    { id: 'incompleto', medida: '71/90', tipo: 's/h20', kilos: [10], taras: [1], reporteTaras: [], pedidoReferencia: { kilos: 80 } },
  ]);
  try {
    const o = c.opcionesMedidasMovil;
    assert.deepEqual(o.map(x => x.productoId), ['5160', 'incompleto', 'golfo', 'hecho']);
    assert.deepEqual(o.map(x => x.grupo), ['pendiente', 'pendiente', 'falta-reportar', 'hecho']);
  } finally { c.$destroy(); }
  const vue = fs.readFileSync(path.resolve(__dirname, '..', archivo), 'utf8');
  assert.match(vue, /'falta-reportar': 'medida-falta-reportar'/);
  assert.match(vue, /\.medida-movil-chip\.medida-falta-reportar \{ border: 2px solid #facc15; \}/);
});
