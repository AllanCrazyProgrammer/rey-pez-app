// Medidas de maquila: "cam s/c" y "Cam s/c" son la misma medida.
// Las entradas de Joselito se guardaron con mayúsculas distintas según el
// día (18/11 y 20/11 "cam s/c", 23/11 "Cam s/c") y el formulario de Salidas
// las trataba como dos medidas: solo veía los 568 kg del lote con la
// capitalización del catálogo y escondía el resto.
const test = require('node:test');
const assert = require('node:assert/strict');
const { mismaMedida, claveMedida, mismoProveedor } = require('../src/utils/kilosDisponiblesFifo.js');

test('mismaMedida ignora mayúsculas y espacios', () => {
  assert.equal(mismaMedida('cam s/c', 'Cam s/c'), true);
  assert.equal(mismaMedida('Cam s/c', 'cam s/c'), true);
  assert.equal(mismaMedida(' cam s/c ', 'Cam s/c'), true);
  assert.equal(mismaMedida('piojo', 'Piojo'), true);
  assert.equal(mismaMedida('piojo', 'granja s/c'), false);
  assert.equal(mismaMedida('cam s/c', 'cam s/c'), true);
});

test('claveMedida normaliza a minúsculas para agrupar el stock', () => {
  assert.equal(claveMedida('Cam s/c'), 'cam s/c');
  assert.equal(claveMedida('cam s/c'), 'cam s/c');
  assert.equal(claveMedida(' Piojo '), 'piojo');
  // Los tres lotes de cam s/c de Joselito caen en la misma clave
  const lotes = ['cam s/c', 'cam s/c', 'Cam s/c'];
  const claves = new Set(lotes.map(claveMedida));
  assert.equal(claves.size, 1);
  assert.equal([...claves][0], 'cam s/c');
});

test('mismoProveedor sigue funcionando', () => {
  assert.equal(mismoProveedor('Rey mar', 'Rey Mar '), true);
  assert.equal(mismoProveedor('Joselito', 'Ozuna'), false);
});
