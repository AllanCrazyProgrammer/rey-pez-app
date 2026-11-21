// Conexión con la báscula NVK NK-K9 (o cualquier indicador con módulo BLE-UART)
// usando Web Bluetooth. Funciona en Chrome/Edge (Android, Windows, Mac) con HTTPS.
// No funciona en iPhone ni dentro de la APK de Android (el WebView no trae Web Bluetooth).
// Más abajo hay una segunda vía, por puerto serie (Web Serial), para básculas con Bluetooth
// clásico que se emparejan con PIN desde los ajustes del sistema.
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

// --- Puerto serie (Web Serial) ------------------------------------------------------------
// Si la báscula se empareja desde Ajustes del Sistema / Bluetooth (pide PIN), el sistema crea un
// puerto serie (en Mac: /dev/cu.NVK-K02) y Chrome lo lee con Web Serial, sin pasar por BLE.
// Solo en Chrome/Edge de computadora, con HTTPS o localhost.
export function serialDisponible() {
  return typeof navigator !== 'undefined' && !!navigator.serial;
}

// Pide al usuario elegir un puerto, lo abre y entrega cada paquete a
// onDatos({ uuid: 'serie', bytes, hex, texto }). Los cortes entre paquetes son arbitrarios.
// onFin(falla) se llama si el puerto se corta solo (apagan la báscula, se sale de alcance);
// falla es el error, o null si el flujo simplemente terminó. Devuelve { cerrar() }.
// opciones.serial permite inyectar un navigator.serial falso en las pruebas.
export async function conectarSerial(onDatos, onFin, opciones = {}) {
  const { baudRate = 9600 } = opciones;
  const serial = opciones.serial || (typeof navigator !== 'undefined' ? navigator.serial : undefined);
  if (!serial) {
    throw new Error('Este navegador no soporta puertos serie. Abre la app en Chrome o Edge (computadora).');
  }
  const puerto = await serial.requestPort();
  // En enlaces Bluetooth (SPP) la velocidad no importa; para un cable serie común suele ser 9600.
  await puerto.open({ baudRate });

  let cerrando = false;
  let lector = null;

  const lectura = (async () => {
    let falla = null;
    try {
      lector = puerto.readable.getReader();
      for (;;) {
        const { value, done } = await lector.read();
        if (done) break;
        if (value && value.length) {
          onDatos({ uuid: 'serie', bytes: value, hex: bytesAHex(value), texto: bytesATexto(value) });
        }
      }
    } catch (e) {
      falla = e;
    } finally {
      try {
        lector.releaseLock();
      } catch (e) {
        // El lector ya estaba liberado o nunca se creó.
      }
      lector = null;
    }
    return falla;
  })();

  lectura.then(async falla => {
    if (cerrando) return; // lo cerró la pantalla con cerrar()
    cerrando = true;
    try {
      await puerto.close();
    } catch (e) {
      // El puerto ya estaba cerrado (se desconectó el dispositivo).
    }
    onFin(falla);
  });

  return {
    async cerrar() {
      if (cerrando) return;
      cerrando = true;
      try {
        if (lector) await lector.cancel();
      } catch (e) {
        // Ya estaba cerrado.
      }
      await lectura;
      try {
        await puerto.close();
      } catch (e) {
        // Ya estaba cerrado.
      }
    },
  };
}
