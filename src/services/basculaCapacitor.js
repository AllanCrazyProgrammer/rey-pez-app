// Báscula NVK NK-K9 por BLE nativo en la APK de Android (Capacitor).
// El WebView de Android no trae Web Bluetooth, por eso aquí no se usa
// navigator.bluetooth: se usa el plugin @capacitor-community/bluetooth-le
// (BleClient), que habla BLE nativo. El parser de pesos es el mismo de
// siempre (src/utils/bascula.js, crearLectorPeso): este archivo solo entrega
// los bytes/tramas tal como llegan, igual que el transporte web.
// Solo BLE, no Bluetooth clásico / serie.
import { BleClient, dataViewToNumbers, numberToUUID } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import { SERVICIOS_CONOCIDOS, bytesAHex, bytesATexto } from '@/services/bascula';

export function capacitorDisponible() {
  return typeof Capacitor !== 'undefined'
    && Capacitor.isNativePlatform()
    && Capacitor.getPlatform() === 'android';
}

// Los servicios que ya usa la vía web, en UUID de 128 bits, que es lo que
// pide BleClient.requestDevice. 'battery_service' = 0x180f,
// 'device_information' = 0x180a.
const SERVICIOS_NOMBRADOS = { battery_service: 0x180f, device_information: 0x180a };

export function serviciosCapacitor() {
  const uuids = [];
  SERVICIOS_CONOCIDOS.forEach(servicio => {
    let uuid = null;
    if (typeof servicio === 'number') uuid = numberToUUID(servicio);
    else if (typeof servicio === 'string' && servicio.includes('-')) uuid = servicio.toLowerCase();
    else if (typeof servicio === 'string' && SERVICIOS_NOMBRADOS[servicio]) {
      uuid = numberToUUID(SERVICIOS_NOMBRADOS[servicio]);
    }
    if (uuid && !uuids.includes(uuid)) uuids.push(uuid);
  });
  return uuids;
}

// DataView (lo que entrega BleClient) -> mismo formato que el transporte web.
export function datosDesdeDataView(value) {
  const bytes = new Uint8Array(dataViewToNumbers(value));
  return { bytes, hex: bytesAHex(bytes), texto: bytesATexto(bytes) };
}

// Servicios de BleClient.getServices -> mismo formato que descubrir() web:
// [{ uuid, caracteristicas: [{ uuid, props: ['notify', ...] }] }]
export function serviciosDesdeBle(servicios) {
  return (servicios || []).map(servicio => ({
    uuid: servicio.uuid,
    caracteristicas: (servicio.characteristics || []).map(c => ({
      uuid: c.uuid,
      props: Object.entries(c.properties || {})
        .filter(([, activo]) => activo)
        .map(([nombre]) => nombre),
    })),
  }));
}

function propsIncluyen(props, ...nombres) {
  return nombres.some(nombre => props.includes(nombre));
}

export async function abrirEnlaceCapacitor(deviceId, onDatos, onDesconectar, ble = BleClient) {
  await ble.connect(deviceId, () => onDesconectar && onDesconectar(deviceId));
  try {
    const servicios = serviciosDesdeBle(await ble.getServices(deviceId));
    let suscritas = 0;
    for (const servicio of servicios) {
      for (const caracteristica of servicio.caracteristicas) {
        if (!propsIncluyen(caracteristica.props, 'notify', 'indicate')) continue;
        try {
          await ble.startNotifications(deviceId, servicio.uuid, caracteristica.uuid, value => {
            onDatos({ uuid: caracteristica.uuid, ...datosDesdeDataView(value) });
          });
          suscritas++;
        } catch (e) {
          console.warn('No se pudo escuchar', caracteristica.uuid, e);
        }
      }
    }
    if (!suscritas) throw new Error('la báscula no manda el peso por Bluetooth');
    return { servicios, suscritas };
  } catch (e) {
    try { await ble.disconnect(deviceId); } catch (_ignorado) { /* ya estaba desconectada */ }
    throw e;
  }
}

// Conecta por primera vez: abre el selector nativo de Android y devuelve
// { deviceId, nombre, servicios, desconectar() }. onDatos recibe
// { uuid, bytes, hex, texto }; onDesconectar se llama si se pierde el enlace.
export async function conectarBasculaCapacitor(onDatos, onDesconectar, ble = BleClient) {
  if (!capacitorDisponible()) {
    throw new Error('La báscula por BLE nativo solo está disponible dentro de la APK de Android.');
  }
  await ble.initialize({ androidNeverForLocation: true });
  if (!(await ble.isEnabled())) {
    await ble.requestEnable();
  }
  const device = await ble.requestDevice({ services: serviciosCapacitor() });
  const { servicios } = await abrirEnlaceCapacitor(device.deviceId, onDatos, onDesconectar, ble);
  return {
    deviceId: device.deviceId,
    nombre: device.name || 'Báscula',
    servicios,
    async desconectar() {
      try { await ble.disconnect(device.deviceId); } catch (_ignorado) { /* ya estaba desconectada */ }
    },
  };
}
