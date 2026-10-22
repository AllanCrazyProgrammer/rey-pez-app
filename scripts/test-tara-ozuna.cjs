#!/usr/bin/env node
// Conversión de kg S/H20 a taras: Ozuna/Joselito/Lorena 25 kg, Otilio/Catarro/temporal 27 kg.
process.env.NODE_ENV = 'test';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

// Función (backend)
const admin = require(path.join(root, 'functions', 'node_modules', 'firebase-admin'));
admin.initializeApp({ projectId: 'demo-reypez-pedidos' }, 'pedidos-tests');
const back = require(path.join(root, 'functions', 'asistente.js'))._testHandlers.calcularTotalesClientePedidoLimpio;

// UI (ESM con alias @): se evalúa con stubs de factorAgua
let src = fs.readFileSync(path.join(root, 'src/utils/calculosPedidoLimpio.js'), 'utf8')
  .replace(/^import .*$/gm, '').replace(/^export /gm, '');
const ctx = {};
const factorSrc = fs.readFileSync(path.join(root, 'src/utils/factorAgua.js'), 'utf8')
  .replace(/^export /gm, '');
vm.createContext(ctx);
vm.runInContext(factorSrc, ctx);
vm.runInContext(src + '\nthis.front = calcularTotalesClientePedidoLimpio;', ctx);
const front = ctx.front;

const casos = [
  ['ozuna', 250, 10], ['joselito', 250, 10], ['lorena', 250, 10],
  ['otilio', 270, 10], ['catarro', 270, 10], ['ozuna', 299, 12]
];
for (const [impl, f] of [['funcion', back], ['ui', front]]) {
  for (const [cli, kg, esperado] of casos) {
    const t = f([{ kilos: kg, medida: '36/40', tipo: 'S/H20', esTara: false }], cli).tarasTotal;
    assert.equal(t, esperado, `${impl} ${cli} ${kg}kg`);
  }
  assert.equal(f([{ kilos: 250, medida: '36/40', tipo: 'C/H20', esTara: false }], 'ozuna').tarasTotal, 0, `${impl} C/H20 kg = 0`);
  assert.equal(f([{ kilos: 9, medida: '36/40', tipo: 'S/H20', esTara: true }], 'ozuna').tarasTotal, 9, `${impl} taras directas`);
  const bloque = [
    { kilos: 40, medida: 'macuil', tipo: 'S/H20' },
    { kilos: 10, medida: '36/40', tipo: 'S/H20', esTara: true }
  ];
  for (const cliente of ['ozuna', 'joselito', 'lorena', 'otilio', 'catarro', 'temporal']) {
    const kilosEsperados = ['ozuna', 'joselito', 'lorena'].includes(cliente) ? 290 : 340;
    assert.equal(f(bloque, cliente).kilosTotal, kilosEsperados, `${impl} bloque ${cliente}`);
    assert.equal(f([{ ...bloque[1], kilos: 1, nota: 'sellado' }], cliente).kilosTotal, 25, `${impl} ${cliente} sellado`);
  }
  assert.equal(f([{ ...bloque[1], esMaquila: true }], 'ozuna').kilosTotal, 250, `${impl} Ozuna Maq`);
  assert.equal(f([{ ...bloque[1], tipo: '1.4' }], 'otilio').kilosTotal, 280, `${impl} Otilio base 20`);
  assert.equal(f([{ ...bloque[1], tipo: '1.5' }], 'ozuna').kilosTotal, 300, `${impl} Ozuna base 20`);
  assert.equal(f([{ ...bloque[1], tipo: 'C/H20', agua: 0.7 }], 'ozuna').kilosTotal, 175, `${impl} Ozuna agua personalizada`);
  console.log(`✓ ${impl}: ${casos.length + 18} casos`);
}
console.log('OK');
