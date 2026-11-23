const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Carga src/services/basculaCapacitor.js sin sus imports (alias @/ y plugin
// nativo), con stubs, igual que tests/bascula.test.cjs hace con el servicio web.
const utilsFuente = fs.readFileSync(path.join(__dirname, '../src/utils/bascula.js'), 'utf8');
const servicioFuente = fs.readFileSync(
  path.join(__dirname, '../src/services/basculaCapacitor.js'), 'utf8',
).replace(/^import .*$/gm, '');
const stub = `
const SERVICIOS_CONOCIDOS = [0xffe0, 0xfff0, 0xffb0, 0xffd0, 0xfee7, 0x181d, 0x18f0,
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', '49535343-fe7d-4a8b-a1b7-8fb1f9b0bda2',
  'battery_service', 'device_information'];
const Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android' };
const BleClient = null;
function numberToUUID(value) { return '0000' + value.toString(16).padStart(4, '0') + '-0000-1000-8000-00805f9b34fb'; }
function dataViewToNumbers(value) { return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)); }
`;
const modulo = import('data:text/javascript;base64,' + Buffer.from(
  utilsFuente + '\n' + stub + '\n' + servicioFuente,
).toString('base64'));

function dataView(texto) {
  return new DataView(Uint8Array.from(Buffer.from(texto)).buffer);
}

test('capacitor: servicios en UUID 128 bits, sin duplicados', async () => {
  const { serviciosCapacitor } = await modulo;
  const uuids = serviciosCapacitor();
  assert.ok(uuids.includes('0000ffe0-0000-1000-8000-00805f9b34fb'));
  assert.ok(uuids.includes('0000180f-0000-1000-8000-00805f9b34fb')); // battery_service
  assert.ok(uuids.includes('0000180a-0000-1000-8000-00805f9b34fb')); // device_information
  assert.ok(uuids.includes('6e400001-b5a3-f393-e0a9-e50e24dcca9e'));
  assert.equal(new Set(uuids).size, uuids.length);
  assert.ok(uuids.every(u => /^[0-9a-f-]{36}$/.test(u)));
});

test('capacitor: DataView -> bytes/hex/texto y el parser NVK da 1.90 kg', async () => {
  const { datosDesdeDataView, crearLectorPeso } = await modulo;
  const datos = datosDesdeDataView(dataView('=09.1000'));
  assert.equal(datos.hex, '3d 30 39 2e 31 30 30 30');
  assert.equal(datos.texto, '=09.1000');
  const lector = crearLectorPeso();
  assert.deepEqual(lector.procesar(datos.texto, true).peso, { kilos: 1.9, estable: null });
});

test('capacitor: normaliza servicios de BleClient al formato web', async () => {
  const { serviciosDesdeBle } = await modulo;
  assert.deepEqual(serviciosDesdeBle([{
    uuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
    characteristics: [{ uuid: '0000ffe1-0000-1000-8000-00805f9b34fb',
      properties: { notify: true, read: false, write: false } }],
  }]), [{
    uuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
    caracteristicas: [{ uuid: '0000ffe1-0000-1000-8000-00805f9b34fb', props: ['notify'] }],
  }]);
});

function bleFalso({ conNotify = true } = {}) {
  const llamadas = [];
  const callbacks = {};
  return {
    llamadas,
    async initialize() { llamadas.push('initialize'); },
    async isEnabled() { return true; },
    async requestDevice() { return { deviceId: 'AA:BB', name: 'NVK-K02' }; },
    async connect(deviceId, onDisconnect) {
      llamadas.push(['connect', deviceId]);
      callbacks.desconectar = onDisconnect;
    },
    async getServices() {
      return [{
        uuid: '0000ffe0-0000-1000-8000-00805f9b34fb',
        characteristics: [{
          uuid: '0000ffe1-0000-1000-8000-00805f9b34fb',
          properties: { notify: conNotify, indicate: false, read: true },
        }],
      }];
    },
    async startNotifications(deviceId, service, characteristic, callback) {
      llamadas.push(['startNotifications', service, characteristic]);
      callbacks.notificar = callback;
      // La báscula manda la trama invertida de la NVK.
      callback(dataView('=09.1000'));
    },
    async disconnect(deviceId) { llamadas.push(['disconnect', deviceId]); },
    callbacks,
  };
}

test('capacitor: conectar pide dispositivo, se suscribe y entrega el peso', async () => {
  const { conectarBasculaCapacitor } = await modulo;
  const ble = bleFalso();
  const recibidos = [];
  const conexion = await conectarBasculaCapacitor(
    datos => recibidos.push(datos), () => {}, ble,
  );
  assert.equal(conexion.deviceId, 'AA:BB');
  assert.equal(conexion.nombre, 'NVK-K02');
  assert.equal(conexion.servicios.length, 1);
  assert.equal(recibidos.length, 1);
  assert.equal(recibidos[0].texto, '=09.1000');
  await conexion.desconectar();
  assert.ok(ble.llamadas.some(l => Array.isArray(l) && l[0] === 'disconnect'));
});

test('capacitor: sin característica notify, no deja la conexión a medias', async () => {
  const { conectarBasculaCapacitor } = await modulo;
  const ble = bleFalso({ conNotify: false });
  await assert.rejects(
    conectarBasculaCapacitor(() => {}, () => {}, ble),
    /no manda el peso por Bluetooth/,
  );
  assert.ok(ble.llamadas.some(l => Array.isArray(l) && l[0] === 'disconnect'));
});

test('capacitor: escucha solo servicios de báscula, no los genéricos de Android', async () => {
  const { serviciosAEscuchar } = await modulo;
  const generico = { uuid: '00001801-0000-1000-8000-00805f9b34fb', caracteristicas: [] };
  const acceso = { uuid: '00001800-0000-1000-8000-00805f9b34fb', caracteristicas: [] };
  const ffe0 = { uuid: '0000ffe0-0000-1000-8000-00805f9b34fb', caracteristicas: [] };
  const raro = { uuid: '0000abcd-0000-1000-8000-00805f9b34fb', caracteristicas: [] };
  assert.deepEqual(serviciosAEscuchar([acceso, generico, ffe0, raro]), [ffe0]);
  // Sin servicios conocidos: todo menos los genéricos.
  assert.deepEqual(serviciosAEscuchar([acceso, generico, raro]), [raro]);
});

test('capacitor: el resumen dice qué escucha, qué falló y qué se leyó', async () => {
  const { abrirEnlaceCapacitor } = await modulo;
  const ble = bleFalso();
  ble.read = async () => dataView('=09.1000');
  const { resumen } = await abrirEnlaceCapacitor('AA:BB', () => {}, () => {}, ble);
  assert.equal(resumen, 'servicios: ffe0 · escucha: ffe1 · lectura: ffe1=«=09.1000» [3d 30 39 2e 31 30 30 30]');
});
