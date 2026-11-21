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

test('trama "=" de la NVK: el número viene escrito al revés', async () => {
  const { parsearPeso } = await helpers;
  // Medido: la báscula marcaba 1.9 kg y la lectura directa daba 9.1.
  assert.deepEqual(parsearPeso('=09.1000'), { kilos: 1.9, estable: null });
  assert.deepEqual(parsearPeso('=00.0000'), { kilos: 0, estable: null });
  // Con espacios no es esa trama: se lee como un número normal.
  assert.deepEqual(parsearPeso('=  45.20'), { kilos: 45.2, estable: null });
});

test('junta fragmentos partidos en líneas completas', async () => {
  const { crearAcumulador } = await helpers;
  const acc = crearAcumulador();
  assert.deepEqual(acc.agregar('ST,GS,+  1'), []);
  assert.deepEqual(acc.agregar('2.34kg\r\nST,GS'), ['ST,GS,+  12.34kg']);
  assert.equal(acc.pendiente(), 'ST,GS');
});

test('separa tramas que empiezan con "=" aunque no traigan fin de línea', async () => {
  const { crearAcumulador } = await helpers;
  const acc = crearAcumulador();
  assert.deepEqual(acc.agregar('=00.00'), []);
  assert.deepEqual(acc.agregar('00=00.0000=01'), ['=00.0000', '=00.0000']);
  assert.equal(acc.pendiente(), '=01');
  assert.deepEqual(acc.agregar('.5000\r\n'), ['=01.5000']);
});

test('convierte bytes a hex y texto', async () => {
  const { bytesAHex, bytesATexto } = await helpers;
  assert.equal(bytesAHex([0x53, 0x54, 0x0d]), '53 54 0d');
  assert.equal(bytesATexto([0x53, 0x54, 0x0d]), 'ST·');
});

// --- Puerto serie (Web Serial) con un puerto falso -------------------------------------
// El servicio importa '@/utils/bascula'; aquí se junta con las utilidades en un solo módulo.
const servicioFuente = fs
  .readFileSync(path.join(__dirname, '../src/services/bascula.js'), 'utf8')
  .replace(/^import .*$/m, '');
const servicio = import('data:text/javascript;base64,' + Buffer.from(source + '\n' + servicioFuente).toString('base64'));

function puertoFalso({ paquetes = [], cortaSolo = false } = {}) {
  const cola = paquetes.map(texto => Uint8Array.from(Buffer.from(texto)));
  const estado = { cerrado: false, bloqueado: false, cancelado: false, opciones: null };
  let esperando = null;
  const puerto = {
    estado,
    async open(opciones) { estado.opciones = opciones; },
    async close() {
      if (estado.bloqueado) throw new TypeError('el lector sigue bloqueando el puerto');
      estado.cerrado = true;
    },
    readable: {
      getReader() {
        estado.bloqueado = true;
        return {
          read() {
            if (cola.length) return Promise.resolve({ value: cola.shift(), done: false });
            if (cortaSolo) {
              puerto.readable = null;
              return Promise.resolve({ value: undefined, done: true });
            }
            return new Promise(resolve => { esperando = resolve; });
          },
          async cancel() {
            estado.cancelado = true;
            if (esperando) esperando({ value: undefined, done: true });
          },
          releaseLock() { estado.bloqueado = false; },
        };
      },
    },
  };
  return { serial: { async requestPort() { return puerto; } }, puerto };
}

const turno = () => new Promise(resolve => setImmediate(resolve));

test('puerto serie: entrega los paquetes y se cierra en orden', async () => {
  const { conectarSerial } = await servicio;
  const { serial, puerto } = puertoFalso({ paquetes: ['=00.00', '00=01.5000'] });
  const recibidos = [];
  const avisos = [];
  const conexion = await conectarSerial(d => recibidos.push(d), f => avisos.push(f), { serial });
  await turno();
  assert.deepEqual(puerto.estado.opciones, { baudRate: 9600 });
  assert.deepEqual(recibidos.map(d => d.texto), ['=00.00', '00=01.5000']);
  assert.equal(recibidos[0].uuid, 'serie');
  assert.equal(recibidos[0].hex, '3d 30 30 2e 30 30');
  await conexion.cerrar();
  assert.equal(puerto.estado.cancelado, true);
  assert.equal(puerto.estado.bloqueado, false);
  assert.equal(puerto.estado.cerrado, true);
  assert.deepEqual(avisos, []);
});

test('puerto serie: avisa y cierra el puerto cuando se corta solo', async () => {
  const { conectarSerial } = await servicio;
  const { serial, puerto } = puertoFalso({ paquetes: ['=00.0000'], cortaSolo: true });
  const avisos = [];
  await conectarSerial(() => {}, f => avisos.push(f), { serial });
  await turno();
  assert.equal(avisos.length, 1);
  assert.equal(puerto.estado.cerrado, true);
});

test('puerto serie: sin soporte del navegador da un error claro', async () => {
  const { conectarSerial } = await servicio;
  await assert.rejects(conectarSerial(() => {}, () => {}, { serial: null }), /no soporta puertos serie/);
});
