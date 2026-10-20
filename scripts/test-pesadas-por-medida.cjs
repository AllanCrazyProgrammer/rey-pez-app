/* Run with: node scripts/test-pesadas-por-medida.cjs. No Firebase account or network needed. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..');
const originalJs = require.extensions['.js'];
require.extensions['.js'] = (module, filename) => {
  if (!filename.startsWith(path.join(root, 'src'))) return originalJs(module, filename);
  const result = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs']
  });
  module._compile(result.code, filename);
};

const { resumenPesadas } = require('../src/utils/pesadas');
const {
  agruparPesadasPorMedida,
  fechaPesadasDelEmbarque,
  filtrarPesadasPorDia
} = require('../src/utils/pesadasPorMedida');

const jornada = (extra = {}) => ({
  fecha: '2026-10-18',
  columnas: {
    a: { orden: '0', precio: 10, medida: ' 51 / 60 ' },
    b: { orden: '1', precio: 12, medida: '51/60' },
    c: { orden: '2', precio: 8, medida: 'Laguna' },
    borrada: { orden: '3', precio: 10, medida: '71/90', eliminado: true }
  },
  personas: {
    p1: { nombre: 'Luisa', orden: '0' },
    p2: { nombre: '  ', orden: '1' },
    p3: { nombre: 'Marta', orden: '2' }
  },
  pesos: {
    p1: { a: 3.2, b: 1.1, c: 4 },
    p2: { a: 99, c: 50 },
    p3: { b: 2, c: 0.5, borrada: 80 }
  },
  taras: {
    p1: { a: 2, b: 1, c: 3 },
    p2: { a: 9 },
    p3: { b: 1, c: 1, borrada: 7 }
  },
  ...extra
});

test('la fecha del embarque apunta al documento de pesadas de ese día y no cae en hoy', () => {
  assert.equal(fechaPesadasDelEmbarque('2026-10-18'), '2026-10-18');
  assert.equal(fechaPesadasDelEmbarque('2026-10-18T23:30:00-06:00'), '2026-10-18');
  assert.equal(fechaPesadasDelEmbarque(new Date(2026, 9, 18, 22, 30)), '2026-10-18');
  assert.equal(fechaPesadasDelEmbarque({ seconds: Date.UTC(2026, 9, 18, 6) / 1000 }), '2026-10-18');
  assert.equal(fechaPesadasDelEmbarque({ _seconds: Date.UTC(2026, 9, 18, 0, 30) / 1000 }), '2026-10-18');
  assert.equal(fechaPesadasDelEmbarque({ toDate: () => new Date(Date.UTC(2026, 9, 18, 18)) }), '2026-10-18');
  assert.equal(fechaPesadasDelEmbarque(null), null);
  assert.equal(fechaPesadasDelEmbarque(undefined), null);
  assert.equal(fechaPesadasDelEmbarque(''), null);
  assert.equal(fechaPesadasDelEmbarque('2026-02-31'), null);
  assert.equal(fechaPesadasDelEmbarque('sin-fecha'), null);
});

test('filtra las jornadas del día y deja fuera otros días y las eliminadas', () => {
  const dias = [
    jornada(),
    jornada({ fecha: '2026-10-19', id: '2026-10-19' }),
    jornada({ eliminado: true }),
    { id: '2026-10-18', fecha: { seconds: Date.UTC(2026, 9, 18, 15) / 1000 }, columnas: {}, personas: {}, pesos: {} },
    { id: '2026-10-17', fecha: '2026-10-17' }
  ];
  const delDia = filtrarPesadasPorDia(dias, '2026-10-18T08:00:00.000Z');
  assert.equal(delDia.length, 2);
  assert.ok(delDia.every(dia => fechaPesadasDelEmbarque(dia.fecha) === '2026-10-18'));
  assert.equal(filtrarPesadasPorDia(dias, null).length, 0);
  assert.equal(filtrarPesadasPorDia(dias, '2026-02-31').length, 0);
  assert.equal(filtrarPesadasPorDia(null, '2026-10-18').length, 0);
});

test('agrupa kilos y taras por medida, ignora filas sin nombre y columnas eliminadas', () => {
  const data = jornada();
  const resumen = agruparPesadasPorMedida(data);
  const oficial = resumenPesadas(data);
  assert.deepEqual(resumen.grupos.map(({ medida, kilos }) => ({ medida, kilos })), oficial.kilosPorMedida);
  assert.equal(resumen.totalKilos, oficial.kilos);
  assert.deepEqual(resumen.grupos, [
    { medida: '51/60', kilos: 6.3, taras: 4 },
    { medida: 'Laguna', kilos: 4.5, taras: 4 }
  ]);
  assert.equal(resumen.totalKilos, 10.8);
  assert.equal(resumen.totalTaras, 8);
  assert.equal(resumen.tieneTaras, true);
  assert.equal(resumen.tienePesadas, true);
  assert.ok(!resumen.grupos.some(grupo => grupo.medida === '71/90'));
});

test('una medida en blanco conserva sus taras junto a Sin medida', () => {
  const resumen = agruparPesadasPorMedida({
    columnas: {
      a: { orden: '0', precio: 10, medida: '   ' },
      b: { orden: '1', precio: 10, medida: 'U10' }
    },
    personas: { p1: { nombre: 'Luisa', orden: '0' } },
    pesos: { p1: { a: 1, b: 2 } },
    taras: { p1: { a: 3, b: 4 } }
  });
  assert.deepEqual(resumen.grupos, [
    { medida: 'Sin medida', kilos: 1, taras: 3 },
    { medida: 'U10', kilos: 2, taras: 4 }
  ]);
});

test('un día sin celdas o sin taras no inventa pesadas ni taras', () => {
  const vacia = agruparPesadasPorMedida({ fecha: '2026-10-18', columnas: {}, personas: {}, pesos: {} });
  assert.deepEqual(vacia.grupos, []);
  assert.equal(vacia.totalKilos, 0);
  assert.equal(vacia.totalTaras, 0);
  assert.equal(vacia.tienePesadas, false);
  assert.equal(vacia.tieneTaras, false);

  const soloKilos = agruparPesadasPorMedida({
    columnas: { a: { orden: '0', precio: 10, medida: '71/90' } },
    personas: { p1: { nombre: 'Luisa', orden: '0' } },
    pesos: { p1: { a: 12.5 } }
  });
  assert.equal(soloKilos.tienePesadas, true);
  assert.equal(soloKilos.tieneTaras, false);
  assert.deepEqual(soloKilos.grupos, [{ medida: '71/90', kilos: 12.5, taras: 0 }]);
});

test('después de filtrar por día no se cuelan kilos de otra jornada', () => {
  const hoy = jornada();
  const otro = jornada({
    fecha: '2026-10-19',
    pesos: { p1: { a: 40 }, p3: { c: 20 } },
    taras: { p1: { a: 6 }, p3: { c: 2 } }
  });
  const [seleccion] = filtrarPesadasPorDia([otro, hoy], new Date(2026, 9, 18));
  const resumen = agruparPesadasPorMedida(seleccion);
  assert.equal(seleccion.fecha, '2026-10-18');
  assert.equal(resumen.totalKilos, 10.8);
  assert.equal(resumen.totalTaras, 8);
});
