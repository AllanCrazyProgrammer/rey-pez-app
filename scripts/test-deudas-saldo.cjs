// Pruebas de la lógica pura de saldo de deudas (sin Firestore).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../src/utils/deudas.js'), 'utf8');
const puro = src
  .replace(/^import .*$/gm, '')
  .replace(/export (async )?function (mutarDeuda|registrarAbono|eliminarAbono|agregarProducto|actualizarProducto|eliminarProducto|aplicarAbonoGeneral|proveedorTieneDeudas)[\s\S]*?\n}\n/g, '')
  .replace(/export /g, '');
const m = {};
new Function('m', puro + '\nObject.assign(m,{redondear,totalProducto,calcularSaldo,validarProducto});')(m);

test('redondea a centavos', () => {
  assert.strictEqual(m.totalProducto(103.65, 85), 8810.25);
  assert.strictEqual(m.redondear(0.1 + 0.2), 0.3);
});
test('saldo = productos − abonos', () => {
  const r = m.calcularSaldo([{ total: 30400 }, { total: 23800 }], [{ monto: 54200 }]);
  assert.deepStrictEqual(r, { total: 54200, totalAbonos: 54200, saldoPendiente: 0, estado: 'pagado' });
  const p = m.calcularSaldo([{ total: 8810.25 }], []);
  assert.strictEqual(p.estado, 'pendiente');
});
test('fracciones de centavo no dejan pendiente', () => {
  assert.strictEqual(m.calcularSaldo([{ total: 100.004 }], [{ monto: 100 }]).estado, 'pagado');
});
test('sobrepago queda negativo (no 0)', () => {
  assert.strictEqual(m.calcularSaldo([{ total: 100 }], [{ monto: 150 }]).saldoPendiente, -50);
});
test('valida kilos y precio > 0', () => {
  assert.ok(m.validarProducto({ producto: 'x', kilos: 0, precio: 10 }));
  assert.ok(m.validarProducto({ producto: 'x', kilos: 5, precio: -1 }));
  assert.strictEqual(m.validarProducto({ producto: 'Pac ch', kilos: 103.65, precio: 85 }), null);
});
