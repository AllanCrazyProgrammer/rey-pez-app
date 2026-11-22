const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/historialCambios.js'), 'utf8');
const helpers = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

// Simula la hoja: aplica los campos sobre un objeto, como guardarCampos.
function hoja(datos, valorEnRuta) {
  return {
    datos,
    leer: ruta => valorEnRuta(datos, ruta),
    aplicar(campos) {
      Object.entries(campos).forEach(([ruta, valor]) => {
        const partes = ruta.split('.');
        let actual = datos;
        partes.slice(0, -1).forEach(parte => { actual[parte] = actual[parte] || {}; actual = actual[parte]; });
        actual[partes[partes.length - 1]] = valor;
      });
    }
  };
}

test('deshacer y rehacer un kilo, agrupando lo tecleado en la misma celda', async () => {
  const { crearHistorial, valorEnRuta } = await helpers;
  const h = crearHistorial();
  const s = hoja({ personas: { p1: { nombre: 'María' } }, pesos: { p1: { c1: 12.4 } } }, valorEnRuta);
  for (const valor of [1, 15, 15.2]) { h.registrar({ 'pesos.p1.c1': valor }, s.leer, 'pesos.p1.c1'); s.aplicar({ 'pesos.p1.c1': valor }); }
  h.cerrar();
  assert.equal(h.atras, 1);
  s.aplicar(h.deshacer());
  assert.equal(s.datos.pesos.p1.c1, 12.4);
  assert.equal(h.adelante, 1);
  s.aplicar(h.rehacer());
  assert.equal(s.datos.pesos.p1.c1, 15.2);
});

test('deshacer eliminar una fila la regresa con todo', async () => {
  const { crearHistorial, valorEnRuta } = await helpers;
  const h = crearHistorial();
  const s = hoja({ personas: { p1: { nombre: 'María', orden: '1' } }, pesos: { p1: { c1: 12.4 } } }, valorEnRuta);
  h.registrar({ 'personas.p1.eliminado': true }, s.leer);
  s.aplicar({ 'personas.p1.eliminado': true });
  s.aplicar(h.deshacer());
  assert.equal(s.datos.personas.p1.eliminado, null);
  assert.equal(s.datos.personas.p1.nombre, 'María');
  assert.equal(s.datos.pesos.p1.c1, 12.4);
});

test('deshacer una fila nueva la marca como eliminada; rehacer la regresa', async () => {
  const { crearHistorial, valorEnRuta } = await helpers;
  const h = crearHistorial();
  const s = hoja({ personas: {} }, valorEnRuta);
  const campos = { 'personas.n1.nombre': '', 'personas.n1.orden': '5' };
  h.registrar(campos, s.leer);
  s.aplicar(campos);
  assert.deepEqual(h.deshacer(), { 'personas.n1.eliminado': true });
  assert.deepEqual(h.rehacer(), { 'personas.n1.eliminado': false, 'personas.n1.nombre': '', 'personas.n1.orden': '5' });
});

test('un cambio nuevo borra lo que se podía rehacer; sin cambios no se registra nada', async () => {
  const { crearHistorial, valorEnRuta } = await helpers;
  const h = crearHistorial();
  const s = hoja({ pesos: { p1: { c1: 1 } } }, valorEnRuta);
  assert.equal(h.registrar({ 'pesos.p1.c1': 1 }, s.leer), false);
  h.registrar({ 'pesos.p1.c1': 2 }, s.leer); s.aplicar({ 'pesos.p1.c1': 2 });
  s.aplicar(h.deshacer());
  assert.equal(h.adelante, 1);
  h.registrar({ 'pesos.p1.c1': 3 }, s.leer);
  assert.equal(h.adelante, 0);
  assert.equal(h.deshacer()['pesos.p1.c1'], 1);
  assert.equal(h.deshacer(), null);
});

test('un campo que no existía vuelve a null al deshacer', async () => {
  const { crearHistorial, valorEnRuta } = await helpers;
  const h = crearHistorial();
  const s = hoja({ personas: { p1: { nombre: 'María' } } }, valorEnRuta);
  h.registrar({ 'pesos.p1.c2': 8.1 }, s.leer);
  assert.deepEqual(h.deshacer(), { 'pesos.p1.c2': null });
});
