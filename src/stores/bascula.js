import { defineStore } from 'pinia';
import { bluetoothDisponible, conectarBascula, descubrir, escucharTodo } from '@/services/bascula';
import {
  abrirEnlaceCapacitor,
  capacitorDisponible,
  conectarBasculaCapacitor,
} from '@/services/basculaCapacitor';
import { crearLectorPeso } from '@/utils/bascula';
import { useUIStore } from '@/stores/ui';

// Estado compartido de la báscula Bluetooth (BLE). La conecta el botón "Conectar báscula" del
// embarque y la leen los campos de kilos. Se queda aquí, y no en un componente, para que siga
// conectada aunque el encabezado se vuelva a dibujar.
//
// Dos transportes, mismo parser y mismo estado:
// - Web / escritorio (Electron, Mac): Web Bluetooth (navigator.bluetooth). En Electron los
//   selectores los resuelve electron/main.js (select-bluetooth-device).
// - APK de Android: BLE nativo con BleClient, porque el WebView no trae Web Bluetooth.
//
// Los objetos del navegador / nativos (dispositivo, lector) van fuera del estado:
// no deben volverse reactivos.
let dispositivo = null;
let conexionCapacitor = null;
let deviceIdCapacitor = '';
let lector = crearLectorPeso();

function avisarPerdida() {
  useBasculaStore().alPerderEnlace();
}

function olvidarEnlace() {
  if (dispositivo) {
    dispositivo.removeEventListener('gattserverdisconnected', avisarPerdida);
    if (dispositivo.gatt && dispositivo.gatt.connected) dispositivo.gatt.disconnect();
  }
}

async function olvidarCapacitor() {
  if (!conexionCapacitor) return;
  const conexion = conexionCapacitor;
  conexionCapacitor = null;
  try { await conexion.desconectar(); } catch (_ignorado) { /* ya estaba desconectada */ }
}

export const useBasculaStore = defineStore('bascula', {
  state: () => ({
    soportada: bluetoothDisponible() || capacitorDisponible(),
    // 'web' | 'capacitor' | '' (sin conectar aún)
    transporte: '',
    conectando: false,
    conectada: false,
    nombre: '',
    // Última lectura: kilos (número), si la trama dice que está estable (true/false/null),
    // la trama tal cual llegó y cuándo (ms) para saber si la lectura sigue vigente.
    kilos: null,
    estable: null,
    trama: '',
    ultimaLecturaMs: 0,
    // Diagnóstico: cuántos paquetes llegaron desde que se conectó y el último tal cual llegó
    // (aunque no traiga un peso legible). Sirve para saber si "Sin lectura" es que no llega nada
    // o que llega algo que el parser no entiende.
    paquetes: 0,
    ultimoCrudo: '',
    // APK: servicios/características que se escuchan al conectar y una lectura directa.
    diagnostico: '',
  }),

  getters: {
    // Se conectó antes y se perdió el enlace: se puede reconectar sin volver a elegir la báscula.
    puedeReconectar: (state) => Boolean(state.nombre) && !state.conectada && !state.conectando,
  },

  actions: {
    // Conecta la báscula. Si ya se había conectado antes y se perdió el enlace (se apagó, se salió
    // del alcance), se reconecta directo; si no, abre el selector (Chrome en web/escritorio,
    // selector nativo de Android en la APK).
    async conectar() {
      if (this.conectando || !this.soportada) return;
      this.conectando = true;
      const ui = useUIStore();
      try {
        if (capacitorDisponible()) {
          await this.conectarCapacitor();
          // El diagnóstico (servicios, lectura) ya no va en el aviso: solo sale bajo el peso
          // flotante del embarque si no llega lectura.
          ui.notify(`Báscula conectada: ${this.nombre}`, 'success');
          return;
        }
        if (dispositivo) {
          try {
            await this.abrirEnlace(dispositivo);
            ui.notify('Báscula reconectada.', 'success');
            return;
          } catch (e) {
            // La báscula ya no responde: se olvida y el siguiente toque abre la lista de Chrome.
            // (No se abre aquí: Chrome exige que la lista salga justo después del toque.)
            this.olvidar();
            ui.notify('No se pudo reconectar la báscula. Enciéndela y toca "Conectar báscula" otra vez.', 'warning', 5000);
            return;
          }
        }
        const { device } = await conectarBascula();
        await this.abrirEnlace(device);
        ui.notify(`Báscula conectada: ${this.nombre}`, 'success');
      } catch (e) {
        // NotFoundError = el usuario cerró la lista sin elegir.
        // En Android, cancelar el selector también llega como error y no se muestra.
        if (e.name !== 'NotFoundError' && !/cancel/i.test(e.message || '')) {
          ui.notify(`No se pudo conectar la báscula: ${e.message}`, 'error', 6000);
        }
        this.olvidar();
      } finally {
        this.conectando = false;
      }
    },

    async conectarCapacitor() {
      lector = crearLectorPeso();
      this.paquetes = 0;
      this.ultimoCrudo = '';
      const alRecibir = datos => this.alRecibir(datos);
      if (deviceIdCapacitor) {
        try {
          const { resumen } = await abrirEnlaceCapacitor(deviceIdCapacitor, alRecibir, avisarPerdida);
          this.diagnostico = resumen;
          conexionCapacitor = {
            deviceId: deviceIdCapacitor,
            desconectar: async () => {
              const { BleClient } = await import('@capacitor-community/bluetooth-le');
              await BleClient.disconnect(deviceIdCapacitor);
            },
          };
          this.transporte = 'capacitor';
          this.conectada = true;
          this.kilos = null;
          this.estable = null;
          this.trama = '';
          return;
        } catch (e) {
          // La báscula ya no responde: se olvida el id y se abre el selector.
          deviceIdCapacitor = '';
          conexionCapacitor = null;
        }
      }
      const conexion = await conectarBasculaCapacitor(alRecibir, avisarPerdida);
      conexionCapacitor = conexion;
      deviceIdCapacitor = conexion.deviceId;
      this.diagnostico = conexion.resumen || '';
      this.transporte = 'capacitor';
      this.nombre = conexion.nombre;
      this.kilos = null;
      this.estable = null;
      this.trama = '';
      this.conectada = true;
    },

    async abrirEnlace(device) {
      olvidarEnlace();
      lector = crearLectorPeso();
      this.paquetes = 0;
      this.ultimoCrudo = '';
      try {
        const server = await device.gatt.connect();
        const servicios = await descubrir(server);
        const suscritas = await escucharTodo(servicios, datos => this.alRecibir(datos));
        if (!suscritas) throw new Error('la báscula no manda el peso por Bluetooth');
      } catch (e) {
        // No dejar la conexión a medias: ocuparía la báscula sin que nadie la use.
        if (device.gatt && device.gatt.connected) device.gatt.disconnect();
        throw e;
      }
      dispositivo = device;
      device.addEventListener('gattserverdisconnected', avisarPerdida);
      this.transporte = 'web';
      this.nombre = device.name || 'Báscula';
      this.kilos = null;
      this.estable = null;
      this.trama = '';
      this.conectada = true;
    },

    alRecibir(datos) {
      this.paquetes += 1;
      this.ultimoCrudo = String(datos.texto || datos.hex || '').slice(0, 24);
      const lectura = lector.procesar(datos.texto, true);
      if (!lectura) return;
      this.kilos = lectura.peso.kilos;
      this.estable = lectura.peso.estable;
      this.trama = lectura.trama;
      this.ultimaLecturaMs = Date.now();
    },

    // Se apagó la báscula o se salió del alcance. Se conserva el dispositivo para reconectar.
    alPerderEnlace() {
      if (!this.conectada) return;
      this.conectada = false;
      this.kilos = null;
      this.estable = null;
      useUIStore().notify('La báscula se desconectó.', 'warning', 5000);
    },

    // El usuario la desconecta a propósito: la siguiente vez se elige de nuevo en la lista.
    desconectar() {
      this.olvidar();
      useUIStore().notify('Báscula desconectada.', 'info');
    },

    olvidar() {
      olvidarEnlace();
      void olvidarCapacitor();
      dispositivo = null;
      deviceIdCapacitor = '';
      this.transporte = '';
      this.conectada = false;
      this.nombre = '';
      this.kilos = null;
      this.estable = null;
      this.trama = '';
    },
  },
});
