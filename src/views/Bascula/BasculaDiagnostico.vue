<template>
  <div class="bascula-diag">
    <h2>Báscula Bluetooth</h2>
    <p class="ayuda">
      Enciende la báscula y conéctala de una de estas dos formas. Pon algo encima y revisa que el
      peso coincida con su pantalla.
    </p>
    <ul class="ayuda">
      <li>
        <strong>Puerto serie</strong> (la NVK-K02): primero empareja la báscula en Ajustes del
        Sistema → Bluetooth (PIN 1234); luego toca el botón y elige el puerto que se llama como ella,
        por ejemplo <code>cu.NVK-K02</code>.
      </li>
      <li>
        <strong>Bluetooth BLE</strong>: no la emparejes en Ajustes; toca el botón y elígela en la
        lista de Chrome.
      </li>
    </ul>

    <p v-if="!soportado && !serialSoportado" class="error">
      Este navegador no soporta Bluetooth ni puertos serie. Abre esta página en <strong>Chrome</strong>
      (Android o computadora), en la app de escritorio (Mac) o en la APK de Android.
      No funciona en iPhone.
    </p>

    <div class="acciones">
      <button :disabled="!serialSoportado || conectando" @click="conectarSerie">
        {{ conectando ? 'Conectando…' : (conectado && modo === 'serie' ? 'Reconectar por puerto serie' : 'Conectar por puerto serie') }}
      </button>
      <button :disabled="!soportado || conectando" @click="conectar">
        {{ conectando ? 'Conectando…' : (conectado && modo === 'ble' ? 'Reconectar por BLE' : 'Conectar por BLE') }}
      </button>
      <button v-if="conectado && modo === 'ble'" class="secundario" @click="leer">Leer una vez</button>
      <button v-if="conectado" class="secundario" @click="desconectar">Desconectar</button>
      <button v-if="servicios.length || log.length" class="secundario" @click="copiarLog">Copiar log</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="nombre" class="tarjeta">
      <p>
        <strong>Dispositivo:</strong> {{ nombre }}
        <span :class="conectado ? 'ok' : 'mal'">{{ conectado ? '● conectado' : '● desconectado' }}</span>
      </p>
      <div v-if="ultimoPeso" class="peso-box">
        <span class="peso">{{ ultimoPeso.kilos.toFixed(2) }} kg</span>
        <span v-if="ultimoPeso.estable === true" class="ok">Estable</span>
        <span v-else-if="ultimoPeso.estable === false" class="aviso">Inestable</span>
        <small v-if="ultimaTrama" class="ayuda">de la trama <code>{{ ultimaTrama }}</code></small>
      </div>
      <p v-else-if="conectado" class="ayuda">Esperando datos de la báscula…</p>
    </div>

    <div v-if="servicios.length" class="tarjeta">
      <h3>Servicios encontrados</h3>
      <div v-for="s in servicios" :key="s.uuid" class="servicio">
        <code>{{ s.uuid }}</code>
        <ul>
          <li v-for="c in s.caracteristicas" :key="c.uuid">
            <code>{{ c.uuid }}</code> — {{ c.props.join(', ') || 'sin propiedades' }}
          </li>
        </ul>
      </div>
    </div>

    <div v-if="log.length" class="tarjeta">
      <h3>Datos recibidos (últimos {{ log.length }})</h3>
      <div v-for="(l, i) in log" :key="i" class="linea">
        <small>{{ corto(l.uuid) }}</small>
        <code>{{ l.hex || l.error }}</code>
        <span v-if="l.texto">"{{ l.texto }}"</span>
      </div>
    </div>
  </div>
</template>

<script>
import {
  bluetoothDisponible,
  conectarBascula,
  conectarSerial,
  descubrir,
  escucharTodo,
  leerTodo,
  serialDisponible,
} from '@/services/bascula';
import { capacitorDisponible, conectarBasculaCapacitor } from '@/services/basculaCapacitor';
import { crearLectorPeso } from '@/utils/bascula';

const MAX_LOG = 40;

export default {
  name: 'BasculaDiagnostico',
  data() {
    return {
      soportado: bluetoothDisponible() || capacitorDisponible(),
      serialSoportado: serialDisponible(),
      conectando: false,
      conectado: false,
      modo: '', // 'ble' | 'serie'
      nombre: '',
      servicios: [],
      log: [],
      ultimoPeso: null,
      ultimaTrama: '',
      error: '',
    };
  },
  created() {
    this.device = null;
    this.serial = null;
    this.capacitor = null;
    this.lector = crearLectorPeso();
  },
  beforeDestroy() {
    this.desconectar();
  },
  methods: {
    async conectar() {
      this.error = '';
      this.conectando = true;
      try {
        await this.desconectar();
        // APK de Android: BLE nativo (el WebView no trae Web Bluetooth).
        if (capacitorDisponible()) {
          const conexion = await conectarBasculaCapacitor(
            datos => this.recibir(datos, true),
            () => this.alDesconectar(),
          );
          this.capacitor = conexion;
          this.nombre = conexion.nombre;
          this.servicios = conexion.servicios;
          this.conectado = true;
          this.modo = 'ble';
          return;
        }
        const { device, server } = await conectarBascula();
        this.device = device;
        this.nombre = device.name || '(sin nombre)';
        this.conectado = true;
        this.modo = 'ble';
        device.addEventListener('gattserverdisconnected', this.alDesconectar);

        this.servicios = await descubrir(server);
        if (!this.servicios.length) {
          this.error = 'Se conectó, pero no se encontraron servicios conocidos. Toca "Copiar log" y mándalo.';
          return;
        }
        const suscritas = await escucharTodo(this.servicios, this.recibir);
        if (!suscritas) await this.leer();
      } catch (e) {
        // NotFoundError = el usuario cerró la lista sin elegir.
        if (e.name !== 'NotFoundError') this.error = e.message;
        if (!this.device) this.conectado = false;
      } finally {
        this.conectando = false;
      }
    },
    async conectarSerie() {
      this.error = '';
      this.conectando = true;
      try {
        await this.desconectar();
        this.serial = await conectarSerial(datos => this.recibir(datos, false), this.alCortarSerie);
        this.modo = 'serie';
        this.nombre = 'Puerto serie';
        this.servicios = [];
        this.conectado = true;
      } catch (e) {
        // NotFoundError = el usuario cerró la lista sin elegir.
        if (e.name === 'NetworkError') {
          this.error = 'No se pudo abrir el puerto. ¿La báscula está encendida, emparejada en Ajustes del Sistema y sin otra app usando el puerto?';
        } else if (e.name !== 'NotFoundError') {
          this.error = e.message;
        }
      } finally {
        this.conectando = false;
      }
    },
    async leer() {
      if (this.capacitor) return; // En la APK no hay lectura única por característica web.
      const lecturas = await leerTodo(this.servicios);
      lecturas.forEach(l => this.agregarLog(l));
    },
    // paqueteCompleto: ver crearLectorPeso (BLE manda paquetes enteros; por serie los cortes son
    // arbitrarios).
    recibir(datos, paqueteCompleto = true) {
      this.agregarLog(datos);
      const lectura = this.lector.procesar(datos.texto, paqueteCompleto);
      if (lectura) {
        this.ultimoPeso = lectura.peso;
        this.ultimaTrama = lectura.trama;
      }
    },
    agregarLog(entrada) {
      this.log.unshift(entrada);
      if (this.log.length > MAX_LOG) this.log.pop();
    },
    alDesconectar() {
      this.conectado = false;
      this.error = 'La báscula se desconectó.';
    },
    alCortarSerie(falla) {
      this.serial = null;
      this.conectado = false;
      this.error = 'El puerto serie se cortó' + (falla ? ` (${falla.message})` : '')
        + '. Revisa que la báscula siga encendida y vuelve a conectar.';
    },
    async desconectar() {
      const serial = this.serial;
      this.serial = null;
      if (serial) {
        try {
          await serial.cerrar();
        } catch (e) {
          // Ya estaba cerrado.
        }
      }
      const capacitor = this.capacitor;
      this.capacitor = null;
      if (capacitor) {
        try { await capacitor.desconectar(); } catch (e) { /* ya estaba desconectada */ }
      }
      if (this.device) {
        this.device.removeEventListener('gattserverdisconnected', this.alDesconectar);
        if (this.device.gatt.connected) this.device.gatt.disconnect();
      }
      this.device = null;
      this.conectado = false;
      this.lector = crearLectorPeso();
    },
    corto(uuid) {
      return uuid && uuid.startsWith('0000') ? uuid.slice(4, 8) : String(uuid || '').slice(0, 8);
    },
    async copiarLog() {
      const resumen = [
        `Dispositivo: ${this.nombre}`,
        `Conexión: ${this.modo === 'serie' ? 'puerto serie' : 'Bluetooth BLE'}`,
        ...this.servicios.map(s =>
          `Servicio ${s.uuid}: ` + s.caracteristicas.map(c => `${c.uuid} [${c.props.join(',')}]`).join(' | ')
        ),
        '--- Datos (más reciente primero) ---',
        ...this.log.map(l => `${this.corto(l.uuid)}  ${l.hex || l.error}  "${l.texto || ''}"`),
      ].join('\n');
      try {
        await navigator.clipboard.writeText(resumen);
        alert('Log copiado. Pégalo en el chat con Claude.');
      } catch (e) {
        window.prompt('Copia este texto:', resumen);
      }
    },
  },
};
</script>

<style scoped>
.bascula-diag {
  max-width: 800px;
  margin: 20px auto;
  padding: 20px;
  background-color: #e8f0fe;
  border-radius: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
h2, h3 { color: #3760b0; }
.ayuda { color: #555; }
.acciones { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px; }
button {
  background-color: #3760b0;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
}
button:disabled { background-color: #999; cursor: default; }
button.secundario { background-color: #757575; }
.error { color: #dc3545; font-weight: bold; }
.tarjeta { background: #fff; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
.peso-box { display: flex; align-items: baseline; gap: 12px; }
.peso { font-size: 2.4em; font-weight: bold; color: #28a745; }
.ok { color: #28a745; font-weight: bold; }
.mal { color: #dc3545; }
.aviso { color: #d39e00; font-weight: bold; }
.linea { display: flex; gap: 8px; font-size: 0.85em; border-bottom: 1px solid #eee; padding: 4px 0; flex-wrap: wrap; }
code { word-break: break-all; }
</style>
