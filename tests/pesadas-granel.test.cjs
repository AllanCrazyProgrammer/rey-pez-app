const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/pesadasGranel.js'), 'utf8');
const pesadasSource = fs.readFileSync(path.join(__dirname, '../src/utils/pesadas.js'), 'utf8');
// Igual que pesadas-rapida.test.cjs: se inyecta ./pesadas como data: URL.
const pesadasUrl = 'data:text/javascript;base64,' + Buffer.from(pesadasSource).toString('base64');
const patched = source.replace("from './pesadas'", `from '${pesadasUrl}'`);
const helpers = import('data:text/javascript;base64,' + Buffer.from(patched).toString('base64'));

test('los trastes "Otro" del día se suman a los predefinidos sin repetir y en orden', async () => {
  const { trastesDelDia, claveTrasteDia } = await helpers;
  const data = { trastesDia: { [claveTrasteDia(0.7)]: 0.7, [claveTrasteDia(0.5)]: 0.5, t2: 0.2, malo: 3, otro: 'x' } };
  assert.deepEqual(trastesDelDia(data, [0.1, 0.2, 0.3, 0.4]), [0.1, 0.2, 0.3, 0.4, 0.5, 0.7]);
  assert.deepEqual(trastesDelDia({}, [0.1, 0.2]), [0.1, 0.2]);
  assert.equal(claveTrasteDia(0.5), 't5');
});

test('cada tara pesa 2 kg por default y el día lo puede cambiar', async () => {
  const { kgPorTaraGranel, parsearKgPorTara } = await helpers;
  assert.equal(kgPorTaraGranel({}), 2);
  assert.equal(kgPorTaraGranel({ granelKgPorTara: 1.8 }), 1.8);
  assert.equal(kgPorTaraGranel({ granelKgPorTara: 0 }), 2);
  assert.equal(parsearKgPorTara('2.5'), 2.5);
  assert.throws(() => parsearKgPorTara('0'));
  assert.throws(() => parsearKgPorTara('2.55'));
});

test('taras enteras y kilos con un decimal; vacío es null', async () => {
  const { parsearTarasGranel, parsearKilosGranel } = await helpers;
  assert.equal(parsearTarasGranel(' 12 '), 12);
  assert.equal(parsearTarasGranel(''), null);
  assert.throws(() => parsearTarasGranel('1.5'));
  assert.throws(() => parsearTarasGranel('-2'));
  assert.equal(parsearKilosGranel('84,6'), 84.6);
  assert.equal(parsearKilosGranel(''), null);
  assert.throws(() => parsearKilosGranel('84.65'));
});

test('neto por renglón y totales sin errores de redondeo', async () => {
  const { netoFilaGranel, resumenFilasGranel } = await helpers;
  assert.equal(netoFilaGranel({ taras: 3, kilos: 30.3 }, 2), 24.3);
  assert.equal(netoFilaGranel({ taras: 3, kilos: null }, 2), null);
  assert.deepEqual(resumenFilasGranel([{ taras: 3, kilos: 30.3 }, { taras: 2, kilos: 20.1 }, { taras: null, kilos: null }], 2),
    { taras: 5, bruto: 50.4, tara: 10, neto: 40.4 });
});

test('resumen por medida en orden de columnas, compara con lo registrado por despicadoras', async () => {
  const { resumenGranel } = await helpers;
  const columnas = [{ id: 'c1', medida: '21/25' }, { id: 'c2', medida: '26/30' }, { id: 'c3', medida: '31/35' }];
  const data = { granel: {
    c2: { f1: { taras: 4, kilos: 40.5, orden: '1' } },
    c1: { f1: { taras: 3, kilos: 30.3, orden: '1' }, f2: { taras: 2, kilos: 20.1, orden: '2' }, f3: { taras: 9, kilos: 99, orden: '3', eliminado: true } },
    c3: { f1: { taras: null, kilos: null, orden: '1' } }
  } };
  const resumen = resumenGranel(data, columnas, { c1: 39.8, c2: 32.5 });
  assert.equal(resumen.kgPorTara, 2);
  assert.deepEqual(resumen.medidas.map(m => [m.medida, m.taras, m.bruto, m.tara, m.neto, m.despicadoras, m.diferencia]), [
    ['21/25', 5, 50.4, 10, 40.4, 39.8, 0.6],
    ['26/30', 4, 40.5, 8, 32.5, 32.5, 0]
  ]);
  assert.deepEqual(resumen.total, { taras: 9, bruto: 90.9, tara: 18, neto: 72.9, despicadoras: 72.3, diferencia: 0.6 });
});

test('hora de cada renglón en 12 horas (de `hora` o, en los viejos, del orden)', async () => {
  const { horaFilaGranel, formatoHora12 } = await helpers;
  const tarde = new Date(2026, 10, 21, 15, 5).getTime();
  const manana = new Date(2026, 10, 21, 0, 30).getTime();
  assert.equal(horaFilaGranel({ hora: tarde }), tarde);
  assert.equal(horaFilaGranel({ orden: `${manana}-abc` }), manana);
  assert.equal(horaFilaGranel({ orden: '1' }), null);
  assert.equal(formatoHora12(tarde), '3:05 p.m.');
  assert.equal(formatoHora12(manana), '12:30 a.m.');
  assert.equal(formatoHora12(new Date(2026, 10, 21, 12, 0).getTime()), '12:00 p.m.');
  assert.equal(formatoHora12(null), '—');
});
