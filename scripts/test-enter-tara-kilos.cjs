// Enter en Tara N → Kilo N en móvil (Android). Usa el módulo real y revisa el cableado de ProductoItem.vue.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadSource } = require('./helpers/embarques-source.cjs');
const { destinoEnterPesada, esEnterPesada, inputDestinoEnter } = loadSource('src/utils/pesadasEnterFoco.js');

test('Enter en tara N va a kilo N; en kilo N a tara N+1', () => {
  assert.deepEqual(destinoEnterPesada('tara', 1, 3), { campo: 'kilo', indice: 1 });
  assert.deepEqual(destinoEnterPesada('kilo', 1, 3), { campo: 'tara', indice: 2 });
  assert.equal(destinoEnterPesada('kilo', 2, 3), null);
});

test('reconoce las formas de Enter de teclados Android', () => {
  assert.equal(esEnterPesada({ type: 'keydown', key: 'Enter', keyCode: 13 }), true);
  assert.equal(esEnterPesada({ type: 'keyup', key: 'Enter', keyCode: 13 }), true);
  assert.equal(esEnterPesada({ type: 'keydown', key: 'Unidentified', keyCode: 229 }), false);
  assert.equal(esEnterPesada({ type: 'beforeinput', inputType: 'insertLineBreak' }), true);
  assert.equal(esEnterPesada({ type: 'beforeinput', inputType: 'insertText' }), false);
});

test('destino sale del DOM (no de $refs desordenados)', () => {
  const mk = (n) => ({ n });
  const taras = [mk('t1'), mk('t2'), mk('t3')], kilos = [mk('k1'), mk('k2'), mk('k3')];
  const cont = { querySelectorAll: (s) => (s.startsWith('.tara') ? taras : kilos) };
  assert.equal(inputDestinoEnter(cont, 'tara', taras[1]), kilos[1]);
  assert.equal(inputDestinoEnter(cont, 'kilo', kilos[1]), taras[2]);
  assert.equal(inputDestinoEnter(cont, 'kilo', kilos[2]), null);
});

test('ProductoItem.vue atiende keydown, keyup y beforeinput en taras y kilos', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src/views/Embarques/components/ProductoItem.vue'), 'utf8');
  for (const c of ['tara', 'kilo']) for (const ev of ['keydown', 'keyup', 'beforeinput'])
    assert.match(src, new RegExp(`@${ev}="handlePesadaEnter\\(\\$event, '${c}'\\)"`), `${ev} ${c}`);
  assert.equal((src.match(/enterkeyhint="enter"/g) || []).length, 2);
  assert.match(src, /@keydown\.tab="handleTaraTab/);
  assert.match(src, /@keydown\.tab="handleKiloTab/);
});
