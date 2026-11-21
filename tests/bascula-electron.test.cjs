// Selector de dispositivos Bluetooth de la app de escritorio (electron/bluetooth.js).
const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { instalarSelectorBluetooth, ordenarDispositivos, etiquetaDispositivo } = require('../electron/bluetooth');

const anonimo = (id, mac) => ({ deviceId: id, deviceName: `Dispositivo desconocido o no compatible (${mac})` });

test('ordena: básculas primero, luego con nombre, al final anónimos; sin repetidos', () => {
  const lista = [
    anonimo('a', '03:ED:B7:A2:F3:64'),
    { deviceId: 'b', deviceName: 'AirPods' },
    { deviceId: 'c', deviceName: 'NVK-K02' },
    { deviceId: 'c', deviceName: 'NVK-K02' },
  ];
  assert.deepEqual(ordenarDispositivos(lista).map(d => d.deviceId), ['c', 'b', 'a']);
  assert.equal(etiquetaDispositivo({ deviceId: 'XX:YY:12345', deviceName: '' }), 'Sin nombre (12345)');
  assert.equal(etiquetaDispositivo(anonimo('XX:YY:12345', '03:ED')), 'Sin nombre (12345)');
});

function ventanaFalsa(respuesta) {
  const webContents = new EventEmitter();
  const win = new EventEmitter();
  win.webContents = webContents;
  win.isDestroyed = () => false;
  const dialogos = [];
  const dialog = {
    async showMessageBox(_win, opciones) {
      dialogos.push(opciones);
      return { response: typeof respuesta === 'function' ? respuesta(opciones) : respuesta };
    },
  };
  instalarSelectorBluetooth(win, dialog);
  const elegido = [];
  let prevenido = false;
  const emitir = lista => webContents.emit(
    'select-bluetooth-device', { preventDefault: () => { prevenido = true; } }, lista, id => elegido.push(id)
  );
  return { dialogos, emitir, elegido, prevenido: () => prevenido };
}

const vaciarPromesas = () => new Promise(resolve => setImmediate(resolve));

test('espera a la báscula y abre la lista en cuanto aparece', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  try {
    const v = ventanaFalsa(0); // primer botón
    v.emitir([anonimo('x1', '03:ED'), { deviceId: 'x', deviceName: 'AirPods' }]);
    assert.equal(v.prevenido(), true, 'evita que Electron cancele la petición');
    mock.timers.tick(6000);
    await vaciarPromesas();
    assert.equal(v.dialogos.length, 0, 'sin báscula a la vista, sigue buscando');
    v.emitir([anonimo('x1', '03:ED'), { deviceId: 'x', deviceName: 'AirPods' }, { deviceId: 'nvk', deviceName: 'NVK-K02' }]);
    await vaciarPromesas();
    assert.deepEqual(v.dialogos[0].buttons, ['NVK-K02', 'AirPods', 'Sin nombre (x1)', 'Cancelar']);
    assert.deepEqual(v.elegido, ['nvk']);
  } finally {
    mock.timers.reset();
  }
});

test('sin báscula, a los 10 s muestra lo encontrado', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  try {
    const v = ventanaFalsa(0);
    v.emitir([{ deviceId: 'x', deviceName: 'AirPods' }]);
    mock.timers.tick(10000);
    await vaciarPromesas();
    assert.deepEqual(v.dialogos[0].buttons, ['AirPods', 'Cancelar']);
    assert.deepEqual(v.elegido, ['x']);
  } finally {
    mock.timers.reset();
  }
});

test('Cancelar responde vacío (la página recibe NotFoundError)', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  try {
    const v = ventanaFalsa(opciones => opciones.cancelId);
    v.emitir([{ deviceId: 'nvk', deviceName: 'NVK-K02' }]);
    await vaciarPromesas();
    assert.deepEqual(v.elegido, ['']);
  } finally {
    mock.timers.reset();
  }
});

test('si no aparece ningún dispositivo, avisa y cancela', async () => {
  mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  try {
    const v = ventanaFalsa(0);
    v.emitir([]);
    for (let i = 0; i < 25; i++) { mock.timers.tick(1000); await vaciarPromesas(); }
    assert.deepEqual(v.elegido, ['']);
    assert.match(v.dialogos[0].message, /No se encontró ninguna báscula/);
  } finally {
    mock.timers.reset();
  }
});
