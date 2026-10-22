const assert = require('node:assert/strict');
const { calcularTotalesPedidosCrudo } = require('../src/utils/pedidosCrudoTotales');
const pedidos = {
  '8a': { med: 3, extra: '2.5', jumbo: '' },
  Catarro: { med: '4', extra: 'invalido', jumbo: null },
  OtroCliente: { med: 1.5, extra: '3abc', jumbo: Infinity },
  Vacio: null,
  Otros: { med: undefined, extra: NaN, jumbo: true }
};
const antes = JSON.stringify(pedidos);
assert.deepEqual(calcularTotalesPedidosCrudo(pedidos, ['Med', 'Extra', 'Jumbo', 'Nueva']), {
  med: { taras: 8.5, kilos: 161.5 }, extra: { taras: 2.5, kilos: 47.5 },
  jumbo: { taras: 0, kilos: 0 }, nueva: { taras: 0, kilos: 0 }
});
assert.equal(JSON.stringify(pedidos), antes);
assert.deepEqual(calcularTotalesPedidosCrudo(), {});
assert.deepEqual(calcularTotalesPedidosCrudo(null, ['Med']), { med: { taras: 0, kilos: 0 } });
assert.deepEqual(calcularTotalesPedidosCrudo({ A: { med: '  ', extra: 'Infinity' } }, ['Med', 'Extra']), {
  med: { taras: 0, kilos: 0 }, extra: { taras: 0, kilos: 0 }
});
console.log('PASS totales reales: clientes, medidas adicionales, decimales y valores inválidos');
