// Conexión con la báscula NVK NK-K9 (o cualquier indicador con módulo BLE-UART)
// usando Web Bluetooth. Funciona en Chrome/Edge (Android, Windows, Mac) con HTTPS.
// No funciona en iPhone ni dentro de la APK de Android (el WebView no trae Web Bluetooth).
import { bytesAHex, bytesATexto } from '@/utils/bascula';

// Web Bluetooth exige declarar por adelantado los servicios que se quieren leer.
// Estos son los que usan los módulos BLE de indicadores de peso chinos.
export const SERVICIOS_CONOCIDOS = [
  0xffe0, // HM-10 / CC2541 (el más común)
  0xfff0, // Chipsea / genéricos
  0xffb0,
  0xffd0,
  0xfee7,
  0x181d, // Weight Scale Service estándar
  0x18f0, // serial BLE de impresoras
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART
  '49535343-fe7d-4a8b-a1b7-8fb1f9b0bda2', // Microchip/ISSC transparent UART
  'battery_service',
  'device_information',
];

const PROPIEDADES = ['read', 'write', 'writeWithoutResponse', 'notify', 'indicate'];

export function bluetoothDisponible() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

export async function conectarBascula() {
  if (!bluetoothDisponible()) {
    throw new Error('Este navegador no soporta Bluetooth. Abre la app en Chrome (Android o computadora).');
  }
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: SERVICIOS_CONOCIDOS,
  });
  const server = await device.gatt.connect();
  return { device, server };
}

// Lista todos los servicios y características accesibles.
export async function descubrir(server) {
  const resultado = [];
  const servicios = await server.getPrimaryServices();
  for (const servicio of servicios) {
    const caracteristicas = await servicio.getCharacteristics();
    resultado.push({
      uuid: servicio.uuid,
      caracteristicas: caracteristicas.map(c => ({
        caracteristica: c,
        uuid: c.uuid,
        props: PROPIEDADES.filter(p => c.properties[p]),
      })),
    });
  }
  return resultado;
}

// Se suscribe a todas las características que mandan datos.
// onDatos recibe { uuid, bytes, hex, texto }.
export async function escucharTodo(servicios, onDatos) {
  let suscritas = 0;
  for (const s of servicios) {
    for (const c of s.caracteristicas) {
      if (!c.props.includes('notify') && !c.props.includes('indicate')) continue;
      try {
        await c.caracteristica.startNotifications();
        c.caracteristica.addEventListener('characteristicvaluechanged', e => {
          const value = e.target.value;
          const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
          onDatos({ uuid: c.uuid, bytes, hex: bytesAHex(bytes), texto: bytesATexto(bytes) });
        });
        suscritas++;
      } catch (e) {
        console.warn('No se pudo escuchar', c.uuid, e);
      }
    }
  }
  return suscritas;
}

// Lee una vez las características que se pueden leer (algunas básculas no notifican).
export async function leerTodo(servicios) {
  const lecturas = [];
  for (const s of servicios) {
    for (const c of s.caracteristicas) {
      if (!c.props.includes('read')) continue;
      try {
        const value = await c.caracteristica.readValue();
        const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        lecturas.push({ uuid: c.uuid, bytes, hex: bytesAHex(bytes), texto: bytesATexto(bytes) });
      } catch (e) {
        lecturas.push({ uuid: c.uuid, error: e.message });
      }
    }
  }
  return lecturas;
}
