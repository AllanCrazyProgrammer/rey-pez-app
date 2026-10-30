// Enter en Tara N → Kilo N (Android "siguiente" saltaba a la siguiente Tara).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/embarques-source.cjs');
const { destinoEnterPesada } = loadSource('src/utils/pesadasEnterFoco.js');

test('Enter en tara N va a kilo N', () => {
  assert.deepEqual(destinoEnterPesada('tara', 0, 3), { campo: 'kilo', indice: 0 });
  assert.deepEqual(destinoEnterPesada('tara', 2, 3), { campo: 'kilo', indice: 2 });
});
test('Enter en kilo N va a tara N+1 si existe', () => {
  assert.deepEqual(destinoEnterPesada('kilo', 0, 3), { campo: 'tara', indice: 1 });
  assert.equal(destinoEnterPesada('kilo', 2, 3), null);
});
test('ProductoItem.vue conecta Enter y enterkeyhint en taras y kilos', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src/views/Embarques/components/ProductoItem.vue'), 'utf8');
  assert.match(src, /handlePesadaEnter\(\$event, 'tara', taraIndex\)/);
  assert.match(src, /handlePesadaEnter\(\$event, 'kilo', kiloIndex\)/);
  assert.equal((src.match(/enterkeyhint="enter"/g) || []).length, 2);
  assert.match(src, /@keydown\.tab="handleTaraTab/);
  assert.match(src, /@keydown\.tab="handleKiloTab/);
});
