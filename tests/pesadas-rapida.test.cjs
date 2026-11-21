const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/pesadasRapida.js'), 'utf8');
const pesadasSource = fs.readFileSync(path.join(__dirname, '../src/utils/pesadas.js'), 'utf8');
// pesadasRapida importa decimalPesada de ./pesadas: se inyecta ese módulo en el
// mismo data: URL con un import map mínimo reescribiendo la ruta relativa.
const pesadasUrl = 'data:text/javascript;base64,' + Buffer.from(pesadasSource).toString('base64');
const patched = source.replace("from './pesadas'", `from '${pesadasUrl}'`);
const helpers = import('data:text/javascript;base64,' + Buffer.from(patched).toString('base64'));

const registradas = [
  { id: '1', nombre: 'Nayeli', apodo: 'Nay' },
  { id: '2', nombre: 'Sandra', apodo: '' },
  { id: '3', nombre: 'María José', apodo: 'Majo' }
];

test('normaliza acentos y mayúsculas para buscar', async () => {
  const { normalizarTextoPesada } = await helpers;
  assert.equal(normalizarTextoPesada('María'), 'maria');
  assert.equal(normalizarTextoPesada('  NAY '), 'nay');
});

test('busca por nombre o por apodo', async () => {
  const { buscarDespicadoras } = await helpers;
  assert.deepEqual(buscarDespicadoras(registradas, 'nay', new Map()).map(item => item.nombre), ['Nayeli']);
  assert.deepEqual(buscarDespicadoras(registradas, 'majo', new Map()).map(item => item.nombre), ['María José']);
  assert.deepEqual(buscarDespicadoras(registradas, 'san', new Map()).map(item => item.nombre), ['Sandra']);
  assert.equal(buscarDespicadoras(registradas, 'zzz', new Map()).length, 0);
});

test('resalta primero a las que ya pesaron hoy, con sus kilos', async () => {
  const { buscarDespicadoras } = await helpers;
  const kilosHoy = new Map([['sandra', 12.4]]);
  const resultado = buscarDespicadoras(registradas, '', kilosHoy);
  assert.equal(resultado[0].nombre, 'Sandra');
  assert.equal(resultado[0].yaPeso, true);
  assert.equal(resultado[0].kilosHoy, 12.4);
  assert.equal(resultado[1].yaPeso, false);
});

test('neto = bruto menos traste, sin errores de flotante', async () => {
  const { calcularNetoPesada } = await helpers;
  assert.equal(calcularNetoPesada(5, 0.2), 4.8);
  assert.equal(calcularNetoPesada(10.3, 0.3), 10);
  assert.equal(calcularNetoPesada(0.2, 0.2), 0);
  assert.equal(calcularNetoPesada(3.7, 0), 3.7);
});

test('sumar pesada acumula sobre lo que ya lleva, a una décima', async () => {
  const { sumarPesada } = await helpers;
  assert.equal(sumarPesada(12.4, 4.8), 17.2);
  assert.equal(sumarPesada(null, 4.8), 4.8);
  assert.equal(sumarPesada(0, 0.1), 0.1);
});

test('traste manual: decimal de 0 a 9.9, una décima', async () => {
  const { parsearTraste } = await helpers;
  assert.equal(parsearTraste('0.5'), 0.5);
  assert.equal(parsearTraste(''), null);
  assert.throws(() => parsearTraste('10'), /0 a 9.9/);
  assert.throws(() => parsearTraste('0.25'), /máximo un decimal/);
});

test('kilos brutos deben ser positivos', async () => {
  const { parsearKilosBrutos } = await helpers;
  assert.equal(parsearKilosBrutos('12.4'), 12.4);
  assert.throws(() => parsearKilosBrutos('0'), /kilos/);
  assert.throws(() => parsearKilosBrutos(''), /kilos|número/);
});
