// Pruebas del auto-aplicador de actualizaciones de Android
// (src/mobile/autoAplicarActualizacion.js), sin teléfono:
//   node --test scripts/test-auto-aplicar-actualizacion.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');

const root = path.resolve(__dirname, '..');
function cargarEsm(archivo) {
  const code = transformSync(fs.readFileSync(path.join(root, archivo), 'utf8'), { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'] }).code;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}
const { crearAutoAplicador } = cargarEsm('src/mobile/autoAplicarActualizacion.js');

function documentoFalso() {
  const oyentes = {};
  return {
    hidden: false,
    oyentes,
    addEventListener: (tipo, fn) => { (oyentes[tipo] ||= []).push(fn); },
    removeEventListener: (tipo, fn) => { oyentes[tipo] = (oyentes[tipo] || []).filter(f => f !== fn); },
    emitir: tipo => (oyentes[tipo] || []).forEach(fn => fn()),
  };
}

function fuenteFalsa() {
  const oyentes = new Set();
  return {
    oyentes,
    estadoActual: { lista: null, requiereInstalador: null },
    aplicaciones: 0,
    alCambiar: handler => { oyentes.add(handler); return () => oyentes.delete(handler); },
    estado: async function () { return this.estadoActual; },
    avisar: function (estado) { this.estadoActual = estado; oyentes.forEach(h => h(estado)); },
    aplicar: async function () { this.aplicaciones += 1; return true; },
  };
}

const esperar = () => new Promise(r => setImmediate(r));

test('aplica sola al arrancar cuando la versión ya está lista', async () => {
  const fuente = fuenteFalsa();
  const documento = documentoFalso();
  let guardados = 0;
  const auto = crearAutoAplicador({
    fuente, documento, inicio: 1000, ahora: () => 5000,
    antesDeAplicar: async () => { guardados += 1; },
  });
  auto.iniciar();
  fuente.avisar({ lista: '0.3.22-999', requiereInstalador: null });
  await esperar(); await esperar();
  assert.equal(guardados, 1);
  assert.equal(fuente.aplicaciones, 1);
  auto.detener();
});

test('con la app abierta no recarga: espera a irse a segundo plano', async () => {
  const fuente = fuenteFalsa();
  const documento = documentoFalso();
  const auto = crearAutoAplicador({
    fuente, documento, inicio: 1000, ahora: () => 60000,
    antesDeAplicar: async () => {},
  });
  auto.iniciar();
  fuente.avisar({ lista: '0.3.22-999', requiereInstalador: null });
  await esperar(); await esperar();
  assert.equal(fuente.aplicaciones, 0);
  // Al mandar la app a segundo plano, se aplica sola.
  documento.hidden = true;
  documento.emitir('visibilitychange');
  await esperar(); await esperar();
  assert.equal(fuente.aplicaciones, 1);
  auto.detener();
});

test('aplica la versión que ya estaba lista antes de suscribirse', async () => {
  const fuente = fuenteFalsa();
  fuente.estadoActual = { lista: '0.3.22-999', requiereInstalador: null };
  const documento = documentoFalso();
  const auto = crearAutoAplicador({
    fuente, documento, inicio: 1000, ahora: () => 5000,
    antesDeAplicar: async () => {},
  });
  auto.iniciar();
  await esperar(); await esperar();
  assert.equal(fuente.aplicaciones, 1);
  auto.detener();
});

test('si guardar falla, no aplica y reintenta en el siguiente momento seguro', async () => {
  const fuente = fuenteFalsa();
  const documento = documentoFalso();
  let intentosGuardar = 0;
  const auto = crearAutoAplicador({
    fuente, documento, inicio: 1000, ahora: () => 5000,
    antesDeAplicar: async () => { intentosGuardar += 1; throw new Error('embarque creándose'); },
  });
  auto.iniciar();
  fuente.avisar({ lista: '0.3.22-999', requiereInstalador: null });
  await esperar(); await esperar();
  assert.equal(intentosGuardar, 1);
  assert.equal(fuente.aplicaciones, 0);
  auto.detener();
});

test('sin versión lista no hace nada', async () => {
  const fuente = fuenteFalsa();
  const documento = documentoFalso();
  const auto = crearAutoAplicador({
    fuente, documento, inicio: 1000, ahora: () => 5000,
    antesDeAplicar: async () => { throw new Error('no debería llamarse'); },
  });
  auto.iniciar();
  fuente.avisar({ lista: null, requiereInstalador: null });
  documento.hidden = true;
  documento.emitir('visibilitychange');
  await esperar(); await esperar();
  assert.equal(fuente.aplicaciones, 0);
  auto.detener();
});
