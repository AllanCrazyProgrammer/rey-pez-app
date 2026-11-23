// Báscula en el embarque: lector de pesos compartido y posición del peso flotante.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cargar = archivo => import(
  'data:text/javascript;base64,' + Buffer.from(fs.readFileSync(path.join(__dirname, '../src/utils', archivo), 'utf8')).toString('base64')
);
const bascula = cargar('bascula.js');
const flotante = cargar('basculaFlotante.js');

test('lector: por BLE un paquete suelto se lee tal cual', async () => {
  const { crearLectorPeso } = await bascula;
  const lector = crearLectorPeso();
  assert.deepEqual(lector.procesar('=09.1000'), { peso: { kilos: 1.9, estable: null }, trama: '=09.1000' });
});

test('lector: con paquetes seguidos entrega la trama anterior completa (la última puede venir cortada)', async () => {
  const { crearLectorPeso } = await bascula;
  const lector = crearLectorPeso();
  lector.procesar('=09.1000');
  assert.equal(lector.procesar('=00.0000').peso.kilos, 1.9);
  assert.equal(lector.procesar('=00.0000').peso.kilos, 0);
});

test('lector: con varias tramas en un aviso se queda con la más reciente', async () => {
  const { crearLectorPeso } = await bascula;
  const lector = crearLectorPeso();
  const lectura = lector.procesar('=00.0000=09.1000=0');
  assert.equal(lectura.peso.kilos, 1.9);
  assert.equal(lectura.trama, '=09.1000');
});

test('lector: por puerto serie no usa fragmentos a medias', async () => {
  const { crearLectorPeso } = await bascula;
  const lector = crearLectorPeso();
  assert.equal(lector.procesar('=09.1', false), null);
  assert.equal(lector.procesar('000=09.1000=0', false).peso.kilos, 1.9);
});

test('lector: texto sin número no da lectura', async () => {
  const { crearLectorPeso } = await bascula;
  assert.equal(crearLectorPeso().procesar('····'), null);
});

test('flotante: va a la derecha del campo si cabe', async () => {
  const { posicionarFlotante } = await flotante;
  const campo = { left: 100, top: 200, right: 220, bottom: 238 };
  assert.deepEqual(
    posicionarFlotante(campo, { ancho: 150, alto: 34 }, { ancho: 1000, alto: 800 }),
    { left: 226, top: 202, lado: 'derecha' }
  );
});

test('flotante: si no cabe a la derecha, va arriba alineado al borde derecho del campo', async () => {
  const { posicionarFlotante } = await flotante;
  const campo = { left: 260, top: 300, right: 380, bottom: 338 };
  assert.deepEqual(
    posicionarFlotante(campo, { ancho: 150, alto: 34 }, { ancho: 400, alto: 800 }),
    { left: 230, top: 260, lado: 'arriba' }
  );
});

test('flotante: si no cabe ni a la derecha ni arriba, va abajo y no se sale de la ventana', async () => {
  const { posicionarFlotante } = await flotante;
  const campo = { left: 0, top: 10, right: 100, bottom: 48 };
  const pos = posicionarFlotante(campo, { ancho: 150, alto: 34 }, { ancho: 120, alto: 800 });
  assert.equal(pos.lado, 'abajo');
  assert.equal(pos.top, 54);
  assert.ok(pos.left >= 6, 'no se sale por la izquierda');
});

test('flotante: se esconde cuando el campo sale de la ventana', async () => {
  const { campoVisible } = await flotante;
  const ventana = { ancho: 1000, alto: 800 };
  assert.equal(campoVisible({ left: 10, top: 100, right: 130, bottom: 138 }, ventana), true);
  assert.equal(campoVisible({ left: 10, top: -80, right: 130, bottom: -42 }, ventana), false);
  assert.equal(campoVisible({ left: 10, top: 900, right: 130, bottom: 938 }, ventana), false);
});

test('flotante: solo aplica a campos de kilos habilitados', async () => {
  const { esCampoKilos } = await flotante;
  const campo = (extra = {}) => ({ matches: () => true, disabled: false, readOnly: false, ...extra });
  assert.equal(esCampoKilos(campo()), true);
  assert.equal(esCampoKilos(campo({ disabled: true })), false);
  assert.equal(esCampoKilos(campo({ readOnly: true })), false);
  assert.equal(esCampoKilos(campo({ matches: () => false })), false);
  assert.equal(esCampoKilos(null), false);
});

test('teclado: con la báscula se esconde y al salir vuelve como estaba', async () => {
  const { quitarTeclado, devolverTeclado } = await flotante;
  const campoFalso = (atributos = {}) => {
    const attrs = new Map(Object.entries(atributos));
    return {
      attrs,
      hasAttribute: n => attrs.has(n),
      getAttribute: n => (attrs.has(n) ? attrs.get(n) : null),
      setAttribute: (n, v) => attrs.set(n, String(v)),
      removeAttribute: n => attrs.delete(n),
    };
  };
  const sinModo = campoFalso();
  quitarTeclado(sinModo);
  quitarTeclado(sinModo); // dos veces no pierde el valor original
  assert.equal(sinModo.getAttribute('inputmode'), 'none');
  devolverTeclado(sinModo);
  assert.deepEqual([...sinModo.attrs.keys()], []);

  const decimal = campoFalso({ inputmode: 'decimal' });
  quitarTeclado(decimal);
  devolverTeclado(decimal);
  devolverTeclado(decimal);
  assert.deepEqual(Object.fromEntries(decimal.attrs), { inputmode: 'decimal' });
});

test('decimales: un decimal para Ozuna, Lorena y Joselito; dos para los demás', async () => {
  const { decimalesPorCliente, decimalesDeCampo, redondearKilos } = await flotante;
  for (const nombre of ['Ozuna', 'Lorena', 'Veronica', 'Joselito', ' joselito ']) assert.equal(decimalesPorCliente(nombre), 1, nombre);
  for (const nombre of ['Catarro', 'Otilio', 'Elizabeth', 'Cliente Nuevo', '', undefined]) assert.equal(decimalesPorCliente(nombre), 2, String(nombre));
  const campo = valor => ({ getAttribute: () => valor });
  assert.equal(decimalesDeCampo(campo('1')), 1);
  assert.equal(decimalesDeCampo(campo('2')), 2);
  assert.equal(decimalesDeCampo(campo(null)), 2);
  assert.equal(decimalesDeCampo(null), 2);
  assert.equal(redondearKilos(1.95, 1), 2);
  assert.equal(redondearKilos(1.94, 1), 1.9);
  assert.equal(redondearKilos(12.345, 2), 12.35);
  assert.equal(redondearKilos(1.9, 2), 1.9);
});

test('Enter registra el peso de la báscula solo en web/escritorio y si no se tecleó a mano', async () => {
  const { enterRegistraBascula } = await flotante;
  const base = { tecla: 'Enter', puedeRegistrar: true };
  assert.equal(enterRegistraBascula(base), true);
  assert.equal(enterRegistraBascula({ ...base, nativo: true }), false, 'en la APK no');
  assert.equal(enterRegistraBascula({ ...base, escritoAMano: true }), false, 'se tecleó un número');
  assert.equal(enterRegistraBascula({ ...base, puedeRegistrar: false }), false, 'sin lectura');
  assert.equal(enterRegistraBascula({ ...base, componiendo: true }), false);
  assert.equal(enterRegistraBascula({ ...base, tecla: 'Tab' }), false);
});
