const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/bascula.js'), 'utf8');
const helpers = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('parsea tramas típicas de indicadores', async () => {
  const { parsearPeso } = await helpers;
  assert.deepEqual(parsearPeso('ST,GS,+  12.34kg'), { kilos: 12.34, estable: true });
  assert.deepEqual(parsearPeso('US,NT,-0.50 kg'), { kilos: -0.5, estable: false });
  assert.deepEqual(parsearPeso('=  45.20'), { kilos: 45.2, estable: null });
  assert.deepEqual(parsearPeso('wn0012.30kg'), { kilos: 12.3, estable: null });
  assert.deepEqual(parsearPeso('1500 g'), { kilos: 1.5, estable: null });
  assert.equal(parsearPeso('····'), null);
  assert.equal(parsearPeso(''), null);
});

test('junta fragmentos partidos en líneas completas', async () => {
  const { crearAcumulador } = await helpers;
  const acc = crearAcumulador();
  assert.deepEqual(acc.agregar('ST,GS,+  1'), []);
  assert.deepEqual(acc.agregar('2.34kg\r\nST,GS'), ['ST,GS,+  12.34kg']);
  assert.equal(acc.pendiente(), 'ST,GS');
});

test('convierte bytes a hex y texto', async () => {
  const { bytesAHex, bytesATexto } = await helpers;
  assert.equal(bytesAHex([0x53, 0x54, 0x0d]), '53 54 0d');
  assert.equal(bytesATexto([0x53, 0x54, 0x0d]), 'ST·');
});
