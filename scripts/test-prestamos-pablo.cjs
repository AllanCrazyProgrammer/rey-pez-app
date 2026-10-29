// Préstamos › Pablo: saldo guardado = depósitos − retiros, validación e historial.
// Carga el módulo REAL src/utils/prestamosPablo.js compilado con Babel (nada reimplementado).
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
  vm.runInNewContext(codigo, { module: modulo, exports: modulo.exports, console, Date, Number, String, Math, isNaN }, { filename: archivo });
  return modulo.exports;
}
const P = compilar('src/utils/prestamosPablo.js');
const plano = v => JSON.parse(JSON.stringify(v));

// Saldo
const R0 = plano(P.resumenPablo([]));
assert.deepEqual([R0.depositos, R0.retiros, R0.saldoPablo, R0.deudaAllan, R0.efectivoReal], [0, 0, 0, 0, 0]);
const movs = [
  { id: 'a', fecha: '2026-10-01', tipo: 'deposito', monto: 5000, fechaCreacion: { seconds: 1 } },
  { id: 'b', fecha: '2026-10-10', tipo: 'retiro', monto: 1200.5, fechaCreacion: { seconds: 2 } },
  { id: 'c', fecha: '2026-10-10', tipo: 'deposito', monto: 300.1, fechaCreacion: { seconds: 3 } },
  { id: 'd', fecha: '2026-10-05', tipo: 'deposito', monto: '0.2' },
];
const R1 = P.resumenPablo(movs);
assert.deepEqual([R1.depositos, R1.retiros, R1.saldoPablo, R1.deudaAllan, R1.efectivoReal], [5300.3, 1200.5, 4099.8, 0, 4099.8], 'docs viejos (solo depósito/retiro) siguen igual');
assert.equal(P.resumenPablo([{ tipo: 'retiro', monto: 100 }]).saldo, -100, 'retiro de más queda negativo visible');
assert.equal(P.resumenPablo([{ tipo: 'otro', monto: 99 }]).saldo, 0, 'tipo desconocido no cuenta');

// Historial: más reciente primero, saldo acumulado correcto
const h = P.historialPablo(movs);
assert.deepEqual(plano(h.map(m => m.id)), ['c', 'b', 'd', 'a']);
assert.deepEqual(plano(h.map(m => m.saldoDespues)), [4099.8, 3799.7, 5000.2, 5000]);
assert.equal(h[0].saldoDespues, P.resumenPablo(movs).saldo);
assert.equal(movs[0].saldoDespues, undefined, 'no muta la entrada');

// Escenario Allan le debe a Pablo: depósito 60000, tomado 60000, abono 10000
const deuda = [
  { id: 'p1', fecha: '2026-10-01', tipo: 'deposito', monto: 60000 },
  { id: 'p2', fecha: '2026-10-02', tipo: 'tomado', monto: 60000 },
  { id: 'p3', fecha: '2026-10-15', tipo: 'abono', monto: 10000 },
];
const RD = P.resumenPablo(deuda);
assert.equal(RD.saldoPablo, 60000, 'Pablo debe tener 60000');
assert.equal(RD.deudaAllan, 50000, 'Allan debe 50000');
assert.equal(RD.efectivoReal, 10000, 'efectivo real 10000');
assert.equal(RD.avanceAbonos, 17);
const HD = P.historialPablo(deuda);
assert.deepEqual(plano(HD.map(m => m.etiqueta)), ['Abono de Allan', 'Allan tomó', 'Depósito de Pablo']);
assert.deepEqual(plano(HD.map(m => m.deudaDespues)), [50000, 60000, 0]);
assert.deepEqual(plano(HD.map(m => m.efectivoDespues)), [10000, 0, 60000]);
// abono que excede la deuda: rechazado; justo la deuda: aceptado; deuda nunca negativa
const exceso = P.validarMovimientoPablo({ fecha: '2026-10-20', tipo: 'abono', monto: 50000.01 }, deuda);
assert.equal(exceso.ok, false); assert.match(exceso.errores.join(' '), /excede la deuda/);
assert.equal(P.validarMovimientoPablo({ fecha: '2026-10-20', tipo: 'abono', monto: 50000 }, deuda).ok, true);
assert.equal(P.validarMovimientoPablo({ fecha: '2026-10-20', tipo: 'tomado', monto: 5 }, deuda).ok, true);
assert.equal(P.resumenPablo([{ tipo: 'abono', monto: 100 }]).deudaAllan, 0, 'deuda no negativa');
const saldada = P.resumenPablo([...deuda, { tipo: 'abono', monto: 50000 }]);
assert.deepEqual([saldada.deudaAllan, saldada.efectivoReal, saldada.avanceAbonos], [0, 60000, 100]);

// Validación
const ok = P.validarMovimientoPablo({ fecha: '2026-10-29', tipo: 'retiro', monto: '250.555', nota: '  gasolina ' });
assert.equal(ok.ok, true);
assert.deepEqual(plano(ok.movimiento), { fecha: '2026-10-29', tipo: 'retiro', monto: 250.56, nota: 'gasolina' });
for (const [m, msg] of [
  [{ fecha: '2026-10-29', tipo: 'deposito', monto: 0 }, 'monto'],
  [{ fecha: '2026-10-29', tipo: 'deposito', monto: -5 }, 'monto'],
  [{ fecha: '2026-10-29', tipo: 'deposito', monto: 'abc' }, 'monto'],
  [{ fecha: '29/10/2026', tipo: 'deposito', monto: 5 }, 'Fecha'],
  [{ fecha: '2026-10-29', tipo: 'prestamo', monto: 5 }, 'Tipo'],
  [{ fecha: '2026-10-29', tipo: 'deposito', monto: 5, nota: 'x'.repeat(201) }, 'nota'],
]) { const r = P.validarMovimientoPablo(m); assert.equal(r.ok, false); assert.match(r.errores.join(' '), new RegExp(msg)); }

// Cableado: ruta, tarjeta en el menú y vista usando el helper y la colección
const router = fs.readFileSync(path.join(root, 'src/router.js'), 'utf8');
assert.match(router, /path: '\/procesos\/prestamos\/pablo'/);
assert.match(fs.readFileSync(path.join(root, 'src/views/Procesos/PrestamosMenu.vue'), 'utf8'), /to="\/procesos\/prestamos\/pablo"/);
const vista = fs.readFileSync(path.join(root, 'src/views/Procesos/PrestamosPablo.vue'), 'utf8');
assert.match(vista, /from '@\/utils\/prestamosPablo'/);
assert.match(vista, /window\.confirm\(/, 'borrar pide confirmación');
assert.match(fs.readFileSync(path.join(root, 'src/services/prestamosPabloService.js'), 'utf8'), /COLECCION_PABLO = 'prestamosPablo'/);
console.log('PASS test-prestamos-pablo');
