const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/scrollContenido.js'), 'utf8');
const helpers = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('el scroll pasa a la página solo al chocar con el borde y en gestos verticales', async () => {
  const { chocaConBorde } = await helpers;
  const arriba = { scrollTop: 0, scrollHeight: 900, clientHeight: 400 };
  const enMedio = { scrollTop: 200, scrollHeight: 900, clientHeight: 400 };
  const abajo = { scrollTop: 500, scrollHeight: 900, clientHeight: 400 };
  assert.equal(chocaConBorde(arriba, 0, -10), true);
  assert.equal(chocaConBorde(arriba, 0, 10), false);
  assert.equal(chocaConBorde(enMedio, 0, -10), false);
  assert.equal(chocaConBorde(enMedio, 0, 10), false);
  assert.equal(chocaConBorde(abajo, 0, 10), true);
  assert.equal(chocaConBorde(abajo, 0, -10), false);
  assert.equal(chocaConBorde(arriba, 30, -10), false); // más horizontal: no estorbar
  assert.equal(chocaConBorde(arriba, 0, 0), false);
});

test('la rueda en líneas o páginas se convierte a píxeles', async () => {
  const { deltaEnPixeles } = await helpers;
  assert.equal(deltaEnPixeles({ deltaMode: 0, deltaY: -40 }), -40);
  assert.equal(deltaEnPixeles({ deltaMode: 1, deltaY: -3 }), -48);
  assert.equal(deltaEnPixeles({ deltaMode: 2, deltaY: 1 }, 700), 700);
});

test('al bajar, la página se mueve solo lo que falta para pegar la tabla debajo de la barra', async () => {
  const { faltaParaArriba } = await helpers;
  assert.equal(faltaParaArriba(300, 61, 1000), 239);
  assert.equal(faltaParaArriba(61, 61, 1000), 0); // ya está arriba
  assert.equal(faltaParaArriba(300, 61, 100), 100); // la página ya no puede bajar más que eso
  assert.equal(faltaParaArriba(300, 61, 0), 0);
  assert.equal(faltaParaArriba(20, 61, 1000), 0); // la tabla ya pasó la barra
});

test('la tabla mide la pantalla menos la barra y el pie, con un mínimo', async () => {
  const { altoParaPantalla } = await helpers;
  assert.equal(altoParaPantalla(723, 61, 75), 587);
  assert.equal(altoParaPantalla(723, 61, -5), 662); // nada debajo
  assert.equal(altoParaPantalla(300, 61, 75), 230); // pantalla muy chica: mínimo
});
