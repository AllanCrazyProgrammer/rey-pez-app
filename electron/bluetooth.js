// Web Bluetooth en la app de escritorio.
//
// Chrome muestra su propia lista para elegir el dispositivo cuando la página llama a
// navigator.bluetooth.requestDevice(); Electron no: emite 'select-bluetooth-device' y, si nadie lo
// atiende, cancela la petición en silencio (por eso "Conectar báscula" no hacía nada).
// Aquí se juntan los dispositivos que va encontrando la búsqueda y se muestra un diálogo para
// elegir la báscula.

// Si aparece algo que parece báscula, la lista se muestra en ese momento. Si no, se sigue
// buscando: algunos dispositivos (la NVK-K02) tardan varios segundos en anunciar su nombre.
const BUSQUEDA_MS = 10000; // sin báscula a la vista, se muestra lo encontrado a los 10 s
const BUSQUEDA_MAX_MS = 20000; // si no aparece ningún dispositivo, se sigue buscando hasta aquí
const MAX_OPCIONES = 8;
const PARECE_BASCULA = /nvk|k-?9|k02|scale|b[aá]scula|weigh|hc-?0/i;
// Chromium pone este nombre a los dispositivos que no anuncian el suyo.
const NOMBRE_GENERICO = /^(dispositivo desconocido|unknown or unsupported device)/i;

function nombreDe(dispositivo) {
  const nombre = String((dispositivo && dispositivo.deviceName) || '').trim();
  return NOMBRE_GENERICO.test(nombre) ? '' : nombre;
}

function pareceBascula(dispositivo) {
  return PARECE_BASCULA.test(nombreDe(dispositivo));
}

// Básculas conocidas primero, luego los que tienen nombre y al final los anónimos.
function ordenarDispositivos(lista) {
  const prioridad = d => (pareceBascula(d) ? 0 : nombreDe(d) ? 1 : 2);
  const vistos = new Set();
  return (lista || [])
    .filter(d => d && d.deviceId && !vistos.has(d.deviceId) && vistos.add(d.deviceId))
    .sort((a, b) => prioridad(a) - prioridad(b) || nombreDe(a).localeCompare(nombreDe(b)));
}

function etiquetaDispositivo(dispositivo) {
  return nombreDe(dispositivo) || `Sin nombre (${String(dispositivo.deviceId).slice(-5)})`;
}

function instalarSelectorBluetooth(win, dialog) {
  let pendiente = null; // { callback, lista, inicio, temporizador, mostrando }

  const resolver = deviceId => {
    if (!pendiente) return;
    const { callback, temporizador } = pendiente;
    clearTimeout(temporizador);
    pendiente = null;
    try {
      callback(deviceId);
    } catch (error) {
      console.warn('[desktop] bluetooth: no se pudo responder la búsqueda:', error.message);
    }
  };

  const mostrarLista = async () => {
    if (!pendiente || win.isDestroyed()) return resolver('');
    const opciones = ordenarDispositivos(pendiente.lista).slice(0, MAX_OPCIONES);
    if (!opciones.length) {
      if (Date.now() - pendiente.inicio < BUSQUEDA_MAX_MS) {
        pendiente.temporizador = setTimeout(mostrarLista, 1000);
        return;
      }
      resolver('');
      dialog.showMessageBox(win, {
        type: 'warning',
        title: 'Conectar báscula',
        message: 'No se encontró ninguna báscula Bluetooth.',
        detail: 'Revisa que esté encendida y cerca, y vuelve a tocar "Conectar báscula".',
      });
      return;
    }
    pendiente.mostrando = true;
    const botones = [...opciones.map(etiquetaDispositivo), 'Cancelar'];
    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      title: 'Conectar báscula',
      message: 'Elige la báscula',
      detail: 'Dispositivos Bluetooth encontrados cerca.',
      buttons: botones,
      defaultId: 0,
      cancelId: botones.length - 1,
      noLink: true,
    });
    resolver(response < opciones.length ? opciones[response].deviceId : '');
  };

  win.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault();
    // La búsqueda emite este evento varias veces con la lista actualizada.
    if (pendiente) {
      pendiente.callback = callback;
      if (pendiente.mostrando) return;
      pendiente.lista = deviceList;
    } else {
      pendiente = { callback, lista: deviceList, inicio: Date.now(), temporizador: null, mostrando: false };
      pendiente.temporizador = setTimeout(mostrarLista, BUSQUEDA_MS);
    }
    // En cuanto aparece la báscula ya no hace falta esperar.
    if ((deviceList || []).some(pareceBascula)) {
      clearTimeout(pendiente.temporizador);
      mostrarLista();
    }
  });

  win.on('closed', () => {
    if (pendiente) clearTimeout(pendiente.temporizador);
    pendiente = null;
  });
}

module.exports = { instalarSelectorBluetooth, ordenarDispositivos, etiquetaDispositivo, pareceBascula };
