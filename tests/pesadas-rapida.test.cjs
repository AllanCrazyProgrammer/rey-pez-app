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

test('traste manual: siempre decimal menor a 1 kg, con punto por default', async () => {
  const { parsearTraste, formatearTrasteManual } = await helpers;
  assert.equal(parsearTraste('0.5'), 0.5);
  assert.equal(parsearTraste('.7'), 0.7);
  assert.equal(parsearTraste('4'), 0.4);
  assert.equal(parsearTraste('7'), 0.7);
  assert.equal(parsearTraste('2'), 0.2);
  assert.equal(parsearTraste('0'), 0);
  assert.equal(parsearTraste(''), null);
  assert.throws(() => parsearTraste('4.5'), /menor a 1/);
  assert.throws(() => parsearTraste('1.5'), /menor a 1/);
  assert.throws(() => parsearTraste('0.25'), /máximo un decimal/);
  assert.equal(formatearTrasteManual('2'), '0.2');
  assert.equal(formatearTrasteManual('05'), '0.5');
  assert.equal(formatearTrasteManual('.7'), '0.7');
  assert.equal(formatearTrasteManual('0'), '0.');
  assert.equal(formatearTrasteManual('0.5'), '0.5');
  assert.equal(formatearTrasteManual('1.5'), '1.5');
  assert.equal(formatearTrasteManual(''), '');
});

test('siguiente medida: la de después de la última con kilos', async () => {
  const { siguienteMedida } = await helpers;
  const columnas = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(siguienteMedida(columnas, { a: 5, b: 0, c: 0 })?.id, 'b');
  assert.equal(siguienteMedida(columnas, { a: 5, b: 3, c: 0 })?.id, 'c');
  assert.equal(siguienteMedida(columnas, { a: 5, b: 3, c: 1 }), null);
  assert.equal(siguienteMedida(columnas, { a: 0, b: 0, c: 0 }), null);
  assert.equal(siguienteMedida(columnas, { a: 0, b: 0, c: 4 }), null);
});

test('sugerencias de medida: las ya hechas, similares a lo escrito', async () => {
  const { sugerenciasMedida } = await helpers;
  const columnas = [
    { id: 'a', medida: '41/50' },
    { id: 'b', medida: '51/60' },
    { id: 'c', medida: '41/50' },
    { id: 'd', medida: '' }
  ];
  assert.deepEqual(sugerenciasMedida(columnas, 'd', '41'), ['41/50']);
  assert.deepEqual(sugerenciasMedida(columnas, 'd', ''), ['41/50', '51/60']);
  assert.deepEqual(sugerenciasMedida(columnas, 'a', ''), ['51/60', '41/50']);
  assert.deepEqual(sugerenciasMedida(columnas, 'd', '61'), []);
});

test('medidas por defecto: se limpian, sin vacías ni repetidas', async () => {
  const { normalizarMedidasPorDefecto } = await helpers;
  assert.deepEqual(normalizarMedidasPorDefecto([' 51/60 ', 'golfo', '', '  ', 'PIOJO', 'piojo', '51/60']), ['51/60', 'golfo', 'PIOJO']);
  assert.deepEqual(normalizarMedidasPorDefecto([]), []);
  assert.deepEqual(normalizarMedidasPorDefecto(null), []);
});

test('sugerencias de medida: primero las por defecto, luego las ya hechas hoy', async () => {
  const { sugerenciasMedida } = await helpers;
  const columnas = [
    { id: 'a', medida: '41/50' },
    { id: 'b', medida: '51/60' },
    { id: 'd', medida: '' }
  ];
  const porDefecto = ['51/60', 'golfo', 'piojo'];
  // Por defecto primero (en su orden), sin repetir la 51/60 ya hecha hoy.
  assert.deepEqual(sugerenciasMedida(columnas, 'd', '', porDefecto), ['51/60', 'golfo', 'piojo', '41/50']);
  // El término filtra también las por defecto.
  assert.deepEqual(sugerenciasMedida(columnas, 'd', 'gol', porDefecto), ['golfo']);
  assert.deepEqual(sugerenciasMedida(columnas, 'd', '51', porDefecto), ['51/60']);
  // Sin por defecto, igual que antes.
  assert.deepEqual(sugerenciasMedida(columnas, 'd', ''), ['41/50', '51/60']);
  assert.deepEqual(sugerenciasMedida(columnas, 'd', '', []), ['41/50', '51/60']);
});

test('precio de columna: decimal positivo o cero, una décima', async () => {
  const { parsearPrecioColumna } = await helpers;
  assert.equal(parsearPrecioColumna('12.5'), 12.5);
  assert.equal(parsearPrecioColumna('.5'), 0.5);
  assert.equal(parsearPrecioColumna('0'), 0);
  assert.throws(() => parsearPrecioColumna(''), /número/);
  assert.throws(() => parsearPrecioColumna('-1'), /positivo/);
});

test('kilos brutos deben ser positivos', async () => {
  const { parsearKilosBrutos } = await helpers;
  assert.equal(parsearKilosBrutos('12.4'), 12.4);
  assert.equal(parsearKilosBrutos('.7'), 0.7);
  assert.throws(() => parsearKilosBrutos('0'), /kilos/);
  assert.throws(() => parsearKilosBrutos(''), /kilos|número/);
});

test('sugerencias incluyen a quien pesó hoy aunque no esté registrada', async () => {
  const { sugerenciasPesada } = await helpers;
  const kilosHoy = new Map([['pedro', 5], ['nayeli', 3]]);
  const personasDia = [{ nombre: 'Pedro', kilos: 5 }, { nombre: 'Nayeli', kilos: 3 }];
  const resultado = sugerenciasPesada(registradas, personasDia, 'ped', kilosHoy);
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].nombre, 'Pedro');
  assert.equal(resultado[0].yaPeso, true);
  assert.equal(resultado[0].kilosHoy, 5);
  // Sin término: Pedro aparece junto al catálogo, y Nayeli no se duplica.
  const todas = sugerenciasPesada(registradas, personasDia, '', kilosHoy);
  assert.deepEqual(todas.map(item => item.nombre), ['Nayeli', 'Pedro', 'María José', 'Sandra']);
  assert.equal(todas.find(item => item.nombre === 'Nayeli').apodo, 'Nay');
});
