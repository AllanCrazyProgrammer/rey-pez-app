// Barcos › Otros: lista de barcos, proveedor inline y entrada con el mismo modelo que los barcos.
// Carga el módulo REAL src/utils/barcosEntrada.js compilado con Babel.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
function compilar(archivo) {
  const codigo = babel.transformSync(fs.readFileSync(path.join(root, archivo), 'utf8'), {
    babelrc: false, configFile: false, filename: archivo,
    plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const modulo = { exports: {} };
  vm.runInNewContext(codigo, { module: modulo, exports: modulo.exports, console, String, Error }, { filename: archivo });
  return modulo.exports;
}
const B = compilar('src/utils/barcosEntrada.js');
const plano = v => JSON.parse(JSON.stringify(v));

assert.deepEqual(plano(B.BARCOS.map(b => b.id)), ['galileo', 'maria-guadalupe', 'otros']);
assert.equal(B.nombreEntrada('galileo'), 'El Galileo');
assert.equal(B.nombreEntrada('otros'), 'Otros');
assert.equal(B.nombreEntrada('otros', { id: 'p1', nombre: 'Pesca Juan' }), 'Pesca Juan');

// Proveedor nuevo
assert.equal(B.validarProveedorNuevo('   ', []).ok, false);
assert.deepEqual(plano(B.validarProveedorNuevo('  Pesca   Juan ', [])), { ok: true, nombre: 'Pesca Juan' });
const dup = B.validarProveedorNuevo('pesca juán', [{ id: 'p1', nombre: 'Pesca Juan' }]);
assert.equal(dup.ok, false); assert.equal(dup.existente.id, 'p1');

// Entrada
const medidas = [{ nombre: '21/25', filas: [{ taras: 2, kilos: 50 }], totalTaras: 2, totalKilos: 44 },
  { nombre: '26/30', filas: [{ taras: 1, kilos: 30 }], totalTaras: 1, totalKilos: 27 }];
const barco = plano(B.construirEntrada({ barco: 'galileo', fecha: '2026-11-02', medidas }));
assert.deepEqual(Object.keys(barco).sort(), ['barco', 'fecha', 'medidas', 'nombreBarco', 'totalKilos', 'totalTaras']);
assert.equal(barco.totalKilos, 71);
const otros = plano(B.construirEntrada({ barco: 'otros', proveedor: { id: 'p1', nombre: 'Pesca Juan' }, fecha: '2026-11-02', medidas }));
assert.deepEqual([otros.barco, otros.nombreBarco, otros.proveedorId, otros.proveedorNombre, otros.totalTaras, otros.totalKilos],
  ['otros', 'Pesca Juan', 'p1', 'Pesca Juan', 3, 71]);
assert.throws(() => B.construirEntrada({ barco: 'otros', fecha: '2026-11-02', medidas }), /proveedor/);

// Filtro
const ds = [{ id: 'a', proveedorId: 'p1' }, { id: 'b', proveedorId: 'p2' }];
assert.deepEqual(plano(B.filtrarDescargas(ds, 'otros', 'p1').map(d => d.id)), ['a']);
assert.deepEqual(B.filtrarDescargas(ds, 'otros', '').length, 0);
assert.equal(B.filtrarDescargas(ds, 'galileo').length, 2);
console.log('test-barcos-otros OK');
