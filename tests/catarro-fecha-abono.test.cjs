const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function load(filename) {
  const module = { exports: {} };
  const code = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  vm.runInNewContext(code, { module, exports: module.exports, require });
  return module.exports;
}

const {
  formatearFechaAbonoCatarro,
  fechaISOEnMexico,
  componerDescripcionAbonoCatarro,
  crearAbonoCatarro,
  normalizarAbonoCatarro,
  listarAbonosCuentasCatarro,
  filtrarAbonosCatarro,
  totalAbonosCatarro,
} = load(path.resolve(__dirname, '../src/utils/fechaAbonoCatarro.js'));

const domingoMexico = new Date('2026-10-19T05:30:00.000Z');
const lunesMexico = new Date('2026-10-19T06:00:00.000Z');
const plano = valor => JSON.parse(JSON.stringify(valor));

test('formatea el día local de America/Mexico_City en minúsculas', () => {
  assert.equal(fechaISOEnMexico(domingoMexico), '2026-10-18');
  assert.equal(formatearFechaAbonoCatarro(domingoMexico), 'domingo 18/oct/26');
  assert.equal(fechaISOEnMexico(lunesMexico), '2026-10-19');
  assert.equal(formatearFechaAbonoCatarro('2026-10-21'), 'miércoles 21/oct/26');
  assert.equal(formatearFechaAbonoCatarro('2026-10-24'), 'sábado 24/oct/26');
  assert.equal(formatearFechaAbonoCatarro('2026-05-01'), 'viernes 01/may/26');
  assert.equal(formatearFechaAbonoCatarro('2026-09-01'), 'martes 01/sep/26');
});

test('compone la descripción una sola vez y conserva el texto del usuario', () => {
  assert.equal(componerDescripcionAbonoCatarro('', domingoMexico), 'domingo 18/oct/26');
  assert.equal(componerDescripcionAbonoCatarro('   ', '2026-10-18'), 'domingo 18/oct/26');
  assert.equal(componerDescripcionAbonoCatarro('spei', '2026-10-18'), 'spei - domingo 18/oct/26');
  assert.equal(componerDescripcionAbonoCatarro('  chofer  ', '2026-10-18'), 'chofer - domingo 18/oct/26');
  assert.equal(
    componerDescripcionAbonoCatarro('spei - domingo 18/oct/26', '2026-10-18'),
    'spei - domingo 18/oct/26'
  );
  assert.equal(
    componerDescripcionAbonoCatarro('chofer- domingo 18/oct/26', '2026-10-18'),
    'chofer- domingo 18/oct/26'
  );
  assert.equal(componerDescripcionAbonoCatarro('domingo 18/oct/26', '2026-10-18'), 'domingo 18/oct/26');
  assert.equal(
    componerDescripcionAbonoCatarro('SPEI - Domingo 18/Oct/26', '2026-10-19'),
    'SPEI - Domingo 18/Oct/26'
  );
});

test('el abono nuevo guarda la fecha ISO y no reescribe abonos anteriores', () => {
  const nuevo = crearAbonoCatarro(domingoMexico, 1500);
  assert.deepEqual(plano(nuevo), {
    descripcion: 'domingo 18/oct/26',
    monto: 1500,
    fechaAbono: '2026-10-18',
  });

  const viejo = { descripcion: 'spei', monto: 100 };
  assert.equal(normalizarAbonoCatarro(viejo), viejo);
  assert.equal(normalizarAbonoCatarro({ descripcion: '', monto: 1 }).fechaAbono, undefined);

  const conFecha = { descripcion: 'spei', monto: 80, fechaAbono: '2026-10-18', otro: true };
  const normalizado = normalizarAbonoCatarro(conFecha);
  assert.equal(normalizado.descripcion, 'spei - domingo 18/oct/26');
  assert.equal(normalizado.fechaAbono, '2026-10-18');
  assert.equal(normalizado.monto, 80);
  assert.equal(normalizado.otro, true);
  assert.notEqual(normalizado, conFecha);

  const listo = { descripcion: 'spei - domingo 18/oct/26', monto: 1, fechaAbono: '2026-10-18' };
  assert.equal(normalizarAbonoCatarro(listo), listo);
});

test('lista todos los abonos del más reciente al más antiguo y filtra el periodo', () => {
  const cuentas = [
    {
      id: 'vieja',
      fecha: '2026-10-15',
      abonos: [
        { descripcion: 'primero', monto: '10.5' },
        { descripcion: 'segundo', monto: 20, fechaAbono: '2026-10-18' },
      ],
    },
    { id: 'media', fecha: '2026-10-17', abonos: [{ descripcion: 'chofer- domingo 17/oct/26', monto: 5 }] },
    { id: 'vacia', fecha: '2026-10-16' },
    { id: 'mala', fecha: '2026-09-30', abonos: [{ descripcion: '', monto: 'no-num' }] },
  ];
  const lista = listarAbonosCuentasCatarro(cuentas);
  assert.deepEqual(plano(lista.map(abono => [abono.descripcion, abono.fechaCuenta, abono.fechaReferencia, abono.monto])), [
    ['chofer- domingo 17/oct/26', '2026-10-17', '2026-10-17', 5],
    ['segundo', '2026-10-15', '2026-10-15', 20],
    ['primero', '2026-10-15', '2026-10-15', 10.5],
    ['Sin descripción', '2026-09-30', '2026-09-30', 0],
  ]);

  const octubre = filtrarAbonosCatarro(lista, { mes: '2026-10' });
  assert.equal(octubre.length, 3);
  assert.equal(totalAbonosCatarro(octubre), 35.5);
  const soloDia = filtrarAbonosCatarro(lista, { desde: '2026-10-17', hasta: '2026-10-17' });
  assert.deepEqual(plano(soloDia.map(abono => abono.descripcion)), ['chofer- domingo 17/oct/26']);
  assert.deepEqual(plano(filtrarAbonosCatarro(lista, { mes: '2026-09', desde: '2026-10-01' })), []);
  assert.deepEqual(plano(listarAbonosCuentasCatarro(null)), []);
});
