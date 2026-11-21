<template>
  <div class="bascula-diag">
    <h2>Báscula Bluetooth</h2>
    <p class="ayuda">
      Enciende la báscula, toca <strong>Conectar báscula</strong> y elige la que aparezca
      (NVK, BLE, HC-…). Pon algo encima y revisa que el peso coincida con la pantalla.
    </p>

    <p v-if="!soportado" class="error">
      Este navegador no soporta Bluetooth. Abre esta página en <strong>Chrome</strong>
      (Android o computadora). No funciona en iPhone ni dentro de la APK.
    </p>

    <div class="acciones">
      <button :disabled="!soportado || conectando" @click="conectar">
        {{ conectando ? 'Conectando…' : (conectado ? 'Reconectar' : 'Conectar báscula') }}
      </button>
      <button v-if="conectado" class="secundario" @click="leer">Leer una vez</button>
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
import { bluetoothDisponible, conectarBascula, descubrir, escucharTodo, leerTodo } from '@/services/bascula';
import { parsearPeso, crearAcumulador } from '@/utils/bascula';

const MAX_LOG = 40;

export default {
  name: 'BasculaDiagnostico',
  data() {
    return {
      soportado: bluetoothDisponible(),
      conectando: false,
      conectado: false,
      nombre: '',
      servicios: [],
      log: [],
      ultimoPeso: null,
      error: '',
    };
  },
  created() {
    this.device = null;
    this.acumulador = crearAcumulador();
  },
  beforeDestroy() {
    this.desconectar();
  },
  methods: {
    async conectar() {
      this.error = '';
      this.conectando = true;
      try {
        this.desconectar();
        const { device, server } = await conectarBascula();
        this.device = device;
        this.nombre = device.name || '(sin nombre)';
        this.conectado = true;
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
    async leer() {
      const lecturas = await leerTodo(this.servicios);
      lecturas.forEach(l => this.agregarLog(l));
    },
    recibir(datos) {
      this.agregarLog(datos);
      const lineas = this.acumulador.agregar(datos.texto);
      // Si la báscula no manda fin de línea, se intenta con el paquete tal cual.
      const candidatos = lineas.length ? lineas : [datos.texto];
      for (let i = candidatos.length - 1; i >= 0; i--) {
        const peso = parsearPeso(candidatos[i]);
        if (peso) {
          this.ultimoPeso = peso;
          break;
        }
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
    desconectar() {
      if (this.device) {
        this.device.removeEventListener('gattserverdisconnected', this.alDesconectar);
        if (this.device.gatt.connected) this.device.gatt.disconnect();
      }
      this.device = null;
      this.conectado = false;
    },
    corto(uuid) {
      return uuid && uuid.startsWith('0000') ? uuid.slice(4, 8) : String(uuid || '').slice(0, 8);
    },
    async copiarLog() {
      const resumen = [
        `Dispositivo: ${this.nombre}`,
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
