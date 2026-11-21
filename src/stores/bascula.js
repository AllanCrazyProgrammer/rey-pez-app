import { defineStore } from 'pinia';
import { bluetoothDisponible, conectarBascula, descubrir, escucharTodo } from '@/services/bascula';
import { crearLectorPeso } from '@/utils/bascula';
import { useUIStore } from '@/stores/ui';

// Estado compartido de la báscula Bluetooth (BLE). La conecta el botón "Conectar báscula" del
// embarque y la leen los campos de kilos. Se queda aquí, y no en un componente, para que siga
// conectada aunque el encabezado se vuelva a dibujar.
//
// Los objetos del navegador (dispositivo, lector) van fuera del estado: no deben volverse reactivos.
let dispositivo = null;
let lector = crearLectorPeso();

function avisarPerdida() {
  useBasculaStore().alPerderEnlace();
}

function olvidarEnlace() {
  if (!dispositivo) return;
  dispositivo.removeEventListener('gattserverdisconnected', avisarPerdida);
  if (dispositivo.gatt && dispositivo.gatt.connected) dispositivo.gatt.disconnect();
}

export const useBasculaStore = defineStore('bascula', {
  state: () => ({
    soportada: bluetoothDisponible(),
    conectando: false,
    conectada: false,
    nombre: '',
    // Última lectura: kilos (número), si la trama dice que está estable (true/false/null),
    // la trama tal cual llegó y cuándo (ms) para saber si la lectura sigue vigente.
    kilos: null,
    estable: null,
    trama: '',
    ultimaLecturaMs: 0,
  }),

  getters: {
    // Se conectó antes y se perdió el enlace: se puede reconectar sin volver a elegir la báscula.
    puedeReconectar: (state) => Boolean(state.nombre) && !state.conectada && !state.conectando,
  },

  actions: {
    // Conecta la báscula. Si ya se había conectado antes y se perdió el enlace (se apagó, se salió
    // del alcance), se reconecta directo; si no, abre la lista de Chrome (pide un toque del usuario).
    async conectar() {
      if (this.conectando || !this.soportada) return;
      this.conectando = true;
      const ui = useUIStore();
      try {
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
        if (e.name !== 'NotFoundError') ui.notify(`No se pudo conectar la báscula: ${e.message}`, 'error', 6000);
        this.olvidar();
      } finally {
        this.conectando = false;
      }
    },

    async abrirEnlace(device) {
      olvidarEnlace();
      lector = crearLectorPeso();
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
      this.nombre = device.name || 'Báscula';
      this.kilos = null;
      this.estable = null;
      this.trama = '';
      this.conectada = true;
    },

    alRecibir(datos) {
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
      dispositivo = null;
      this.conectada = false;
      this.nombre = '';
      this.kilos = null;
      this.estable = null;
      this.trama = '';
    },
  },
});
