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

// Android entrega todos los servicios, también los genéricos del sistema (1800 Generic Access,
// 1801 Generic Attribute). Chrome no los deja ver, y ahí la báscula funciona: se escuchan solo los
// servicios conocidos de básculas, como en web. Si la báscula no trae ninguno conocido, se escucha
// todo menos los genéricos.
const SERVICIOS_GENERICOS = ['00001800-0000-1000-8000-00805f9b34fb', '00001801-0000-1000-8000-00805f9b34fb'];

export function serviciosAEscuchar(servicios) {
  const conocidos = serviciosCapacitor();
  const deBascula = servicios.filter(s => conocidos.includes(String(s.uuid).toLowerCase()));
  if (deBascula.length) return deBascula;
  return servicios.filter(s => !SERVICIOS_GENERICOS.includes(String(s.uuid).toLowerCase()));
}

// UUID corto para mostrar: 0000ffe1-0000-1000-8000-00805f9b34fb -> ffe1.
export function uuidCorto(uuid) {
  const texto = String(uuid || '').toLowerCase();
  const base = texto.match(/^0000([0-9a-f]{4})-0000-1000-8000-00805f9b34fb$/);
  return base ? base[1] : texto.slice(0, 8);
}

// Resumen de lo que pasó al conectar, para verlo en la APK (no hay consola a la mano):
// servicios encontrados, características escuchadas, fallas y una lectura directa.
export function resumenDiagnostico({ servicios = [], escuchadas = [], fallas = [], lecturas = [] }) {
  const partes = [
    `servicios: ${servicios.map(s => uuidCorto(s.uuid)).join(', ') || 'ninguno'}`,
    `escucha: ${escuchadas.map(uuidCorto).join(', ') || 'nada'}`,
  ];
  if (fallas.length) partes.push(`fallas: ${fallas.map(f => `${uuidCorto(f.uuid)} (${f.error})`).join(', ')}`);
  if (lecturas.length) {
    partes.push(`lectura: ${lecturas.map(l => `${uuidCorto(l.uuid)}=${l.error ? `error ${l.error}` : `«${l.texto}» [${l.hex}]`}`).join(', ')}`);
  }
  return partes.join(' · ');
}

export async function abrirEnlaceCapacitor(deviceId, onDatos, onDesconectar, ble = BleClient) {
  await ble.connect(deviceId, () => onDesconectar && onDesconectar(deviceId));
  try {
    const servicios = serviciosDesdeBle(await ble.getServices(deviceId));
    const aEscuchar = serviciosAEscuchar(servicios);
    const escuchadas = [];
    const fallas = [];
    for (const servicio of aEscuchar) {
      for (const caracteristica of servicio.caracteristicas) {
        if (!propsIncluyen(caracteristica.props, 'notify', 'indicate')) continue;
        try {
          await ble.startNotifications(deviceId, servicio.uuid, caracteristica.uuid, value => {
            onDatos({ uuid: caracteristica.uuid, ...datosDesdeDataView(value) });
          });
          escuchadas.push(caracteristica.uuid);
        } catch (e) {
          fallas.push({ uuid: caracteristica.uuid, error: (e && e.message) || String(e) });
          console.warn('No se pudo escuchar', caracteristica.uuid, e);
        }
      }
    }
    if (!escuchadas.length) throw new Error('la báscula no manda el peso por Bluetooth');
    // Una lectura directa de lo que se pueda leer: dice si el peso está ahí aunque no lleguen avisos.
    const lecturas = [];
    for (const servicio of aEscuchar) {
      for (const caracteristica of servicio.caracteristicas) {
        if (!propsIncluyen(caracteristica.props, 'read') || lecturas.length >= 4) continue;
        try {
          const value = await ble.read(deviceId, servicio.uuid, caracteristica.uuid, { timeout: 2000 });
          lecturas.push({ uuid: caracteristica.uuid, ...datosDesdeDataView(value) });
        } catch (e) {
          lecturas.push({ uuid: caracteristica.uuid, error: (e && e.message) || String(e) });
        }
      }
    }
    const resumen = resumenDiagnostico({ servicios, escuchadas, fallas, lecturas });
    console.info('[bascula] conectada:', resumen);
    return { servicios, suscritas: escuchadas.length, escuchadas, fallas, lecturas, resumen };
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
  const { servicios, resumen } = await abrirEnlaceCapacitor(device.deviceId, onDatos, onDesconectar, ble);
  return {
    deviceId: device.deviceId,
    nombre: device.name || 'Báscula',
    servicios,
    resumen,
    async desconectar() {
      try { await ble.disconnect(device.deviceId); } catch (_ignorado) { /* ya estaba desconectada */ }
    },
  };
}
