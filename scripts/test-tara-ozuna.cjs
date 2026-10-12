#!/usr/bin/env node
// Taras por cliente en pedidos limpio (kg S/H20): Ozuna/Joselito/Lorena 25 kg, Otilio/Catarro/temporal 27 kg.
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
const ctx = { factorAgua: () => 0.65, kilosPorTara: () => 20 };
vm.createContext(ctx);
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
  console.log(`✓ ${impl}: ${casos.length + 2} casos`);
}
console.log('OK');
