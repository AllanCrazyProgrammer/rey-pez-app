<template>
  <div class="menu-rapido">
    <!-- Efecto de scanlines CRT -->
    <div class="crt-overlay"></div>
    <div class="crt-flicker"></div>

    <div class="terminal-container">
      <div class="menu-layout">
        <div class="header-section">
          <div class="terminal-header">
            <span class="terminal-dots">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </span>
            <span class="terminal-title">MENU_RAPIDO</span>
          </div>
          <div class="header-content">
            <pre class="ascii-ship">
     |    |    |
    )_)  )_)  )_)
   )___))___))___)
  )____)____)_____)
_____|____|____|______
\                   /
 \_________________/
            </pre>
            <h1 class="main-title">
              <span class="prompt">&gt;</span>
              <span class="typing-text">MENU_RAPIDO</span>
              <span class="cursor-blink">_</span>
            </h1>
            <p class="subtitle">
              <span class="line-prefix">[SYS]</span> Acceso rápido a lo que más usas
            </p>
            <p class="system-status">
              <span class="status-item"><span class="status-dot"></span> {{ fechaHoy }}</span>
              <span class="status-item"><span class="status-dot online"></span> {{ online ? 'CON CONEXIÓN' : 'SIN INTERNET' }}</span>
            </p>
          </div>
        </div>

        <div class="menu-options">
          <div class="menu-label">&gt;&gt; SELECCIONE UNA OPCIÓN:</div>

          <!-- Pedidos -->
          <div class="menu-fila">
            <router-link to="/procesos/pedidos" class="btn-action">
              <span class="btn-prefix">[1]</span>
              <span class="btn-text">PEDIDOS</span>
            </router-link>
            <router-link to="/procesos/pedidos/limpio" class="btn-action btn-atajo">
              <span class="btn-prefix">&raquo;</span>
              <span class="btn-text">LIMPIO_HOY</span>
            </router-link>
          </div>

          <!-- Embarques -->
          <div class="menu-fila">
            <router-link to="/embarques-menu" class="btn-action">
              <span class="btn-prefix">[2]</span>
              <span class="btn-text">EMBARQUES</span>
            </router-link>
            <button class="btn-action btn-atajo" :disabled="embarqueHoyEstado === 'cargando'" @click="irEmbarqueHoy">
              <span class="btn-prefix">&raquo;</span>
              <span class="btn-text">EMBARQUE_HOY
                <small v-if="embarqueHoyEstado === 'existe'">HOY SÍ HAY EMBARQUE</small>
                <small v-else-if="embarqueHoyEstado === 'no-existe'">HOY NO HAY EMBARQUE</small>
                <small v-else-if="embarqueHoyEstado === 'sin-conexion'">SIN CONEXIÓN</small>
              </span>
            </button>
          </div>

          <!-- Sacadas -->
          <div class="menu-fila">
            <router-link to="/sacadas" class="btn-action">
              <span class="btn-prefix">[3]</span>
              <span class="btn-text">SACADAS</span>
            </router-link>
            <router-link to="/sacadas/new" class="btn-action btn-atajo">
              <span class="btn-prefix">&raquo;</span>
              <span class="btn-text">SACADAS_HOY</span>
            </router-link>
          </div>

          <!-- Cuentas -->
          <div class="menu-fila">
            <router-link to="/cuentas-mexico" class="btn-action">
              <span class="btn-prefix">[4]</span>
              <span class="btn-text">CUENTAS</span>
            </router-link>
          </div>

          <!-- Precios (modal de Precios de Venta que vive en Cuentas) -->
          <div class="menu-fila">
            <router-link :to="{ path: '/cuentas-mexico', query: { precios: '1' } }" class="btn-action">
              <span class="btn-prefix">[5]</span>
              <span class="btn-text">PRECIOS</span>
            </router-link>
          </div>

          <!-- Existencias -->
          <div class="menu-fila">
            <router-link to="/existencias" class="btn-action">
              <span class="btn-prefix">[6]</span>
              <span class="btn-text">EXISTENCIAS</span>
            </router-link>
          </div>

          <!-- Existencias crudos -->
          <div class="menu-fila">
            <router-link to="/existencias-crudos" class="btn-action">
              <span class="btn-prefix">[7]</span>
              <span class="btn-text">EXISTENCIAS_CRUDOS</span>
            </router-link>
          </div>

          <!-- Pesadas -->
          <div class="menu-fila">
            <router-link to="/pesadas" class="btn-action">
              <span class="btn-prefix">[8]</span>
              <span class="btn-text">PESADAS</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <div class="matrix-rain" aria-hidden="true">
      <span v-for="n in 20" :key="n" class="rain-column" :style="{ '--delay': n * 0.3 + 's', '--left': (n * 5) + '%' }">
        {{ randomChars }}
      </span>
    </div>
  </div>
</template>

<script>
import moment from 'moment';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { obtenerFechaActualISO, normalizarFechaISO } from '@/utils/dateUtils';

export default {
  name: 'MenuRapido',
  data() {
    return {
      embarqueHoyId: null,
      // cargando | existe | no-existe | sin-conexion
      embarqueHoyEstado: 'cargando',
      online: typeof navigator !== 'undefined' ? navigator.onLine : true
    };
  },
  computed: {
    fechaHoy() {
      return moment().format('dddd, D [de] MMMM [de] YYYY');
    },
    randomChars() {
      const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン01234567890';
      let result = '';
      for (let i = 0; i < 30; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length)) + '\n';
      }
      return result;
    }
  },
  created() {
    // Este menú es solo para la APK de Android: en web/escritorio se vuelve al inicio.
    if (process.env.VUE_APP_TARGET !== 'android') {
      this.$router.replace('/');
      return;
    }
    this.buscarEmbarqueHoy();
  },
  mounted() {
    window.addEventListener('online', this.actualizarConexion);
    window.addEventListener('offline', this.actualizarConexion);
  },
  beforeDestroy() {
    window.removeEventListener('online', this.actualizarConexion);
    window.removeEventListener('offline', this.actualizarConexion);
  },
  methods: {
    actualizarConexion() {
      this.online = navigator.onLine;
    },
    async buscarEmbarqueHoy() {
      try {
        const hoyISO = obtenerFechaActualISO();
        const db = getFirestore();
        const embarquesRef = collection(db, 'embarques');
        const q = query(embarquesRef, orderBy('fecha', 'desc'), limit(100));
        const snapshot = await getDocs(q);
        const embarqueHoy = snapshot.docs.find((docSnap) => {
          const data = docSnap.data();
          let fechaEmbarque = null;
          if (data.fecha && typeof data.fecha.toDate === 'function') {
            fechaEmbarque = data.fecha.toDate();
          } else if (data.fecha instanceof Date) {
            fechaEmbarque = data.fecha;
          } else if (typeof data.fecha === 'string') {
            const parsed = new Date(data.fecha);
            fechaEmbarque = Number.isNaN(parsed.getTime()) ? null : parsed;
          }
          if (!fechaEmbarque) return false;
          return normalizarFechaISO(fechaEmbarque) === hoyISO;
        });
        if (embarqueHoy) {
          this.embarqueHoyId = embarqueHoy.id;
          this.embarqueHoyEstado = 'existe';
        } else {
          this.embarqueHoyEstado = 'no-existe';
        }
      } catch (error) {
        // Sin internet (o error de lectura): el botón lleva a la lista, que sí trabaja offline.
        console.warn('[MenuRapido] No se pudo buscar el embarque de hoy:', error);
        this.embarqueHoyEstado = 'sin-conexion';
      }
    },
    irEmbarqueHoy() {
      if (this.embarqueHoyId) {
        this.$router.push(`/embarques/${this.embarqueHoyId}`);
      } else {
        this.$router.push('/embarques');
      }
    }
  }
};
</script>

<style scoped>
/* Mismo estilo terminal de Embarques (EmbarquesMenu.vue) */
.menu-rapido {
  --matrix-green: #00ff41;
  --matrix-green-dark: #008f11;
  --matrix-green-glow: #00ff4180;
  --terminal-bg: #0a0a0a;
  --terminal-border: #00ff4140;
  --amber: #ffb000;
  --red-alert: #ff0040;
  --scanline-opacity: 0.03;
}

.menu-rapido {
  min-height: 100vh;
  background: var(--terminal-bg);
  padding: 20px;
  color: var(--matrix-green);
  font-family: 'VT323', 'Share Tech Mono', monospace;
  position: relative;
  overflow: hidden;
}

/* Efecto de monitor CRT - scanlines */
.crt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, var(--scanline-opacity)),
    rgba(0, 0, 0, var(--scanline-opacity)) 1px,
    transparent 1px,
    transparent 2px
  );
}

.crt-flicker {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999;
  background: radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.3) 100%);
  animation: flicker 0.15s infinite;
}

@keyframes flicker {
  0% { opacity: 0.97; }
  50% { opacity: 1; }
  100% { opacity: 0.98; }
}

/* Contenedor principal tipo terminal */
.terminal-container {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

.menu-layout {
  display: flex;
  flex-direction: column;
  gap: 25px;
  margin-bottom: 30px;
}

/* Header estilo ventana de terminal */
.header-section {
  background: rgba(0, 20, 0, 0.9);
  border: 2px solid var(--matrix-green);
  border-radius: 0;
  margin-bottom: 0;
  box-shadow:
    0 0 20px var(--matrix-green-glow),
    inset 0 0 60px rgba(0, 255, 65, 0.05);
  overflow: hidden;
}

.terminal-header {
  background: linear-gradient(90deg, #001a00 0%, #002200 100%);
  padding: 8px 15px;
  border-bottom: 1px solid var(--matrix-green);
  display: flex;
  align-items: center;
  gap: 15px;
}

.terminal-dots {
  display: flex;
  gap: 6px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--matrix-green-dark);
  box-shadow: 0 0 5px var(--matrix-green);
}

.dot:first-child { background: #ff5f56; box-shadow: 0 0 5px #ff5f56; }
.dot:nth-child(2) { background: #ffbd2e; box-shadow: 0 0 5px #ffbd2e; }
.dot:last-child { background: var(--matrix-green); }

.terminal-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.9rem;
  color: var(--matrix-green);
  text-shadow: 0 0 10px var(--matrix-green);
  letter-spacing: 2px;
}

.header-content {
  padding: 25px;
  text-align: center;
}

/* Arte ASCII del barco */
.ascii-ship {
  color: var(--matrix-green);
  font-family: 'VT323', monospace;
  font-size: 1rem;
  line-height: 1.2;
  margin: 0 0 20px 0;
  text-shadow: 0 0 10px var(--matrix-green-glow);
  white-space: pre;
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { text-shadow: 0 0 10px var(--matrix-green-glow); }
  50% { text-shadow: 0 0 20px var(--matrix-green), 0 0 30px var(--matrix-green-glow); }
}

/* Título principal */
.main-title {
  font-family: 'VT323', monospace;
  font-size: 3rem;
  font-weight: 400;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--matrix-green);
  text-shadow:
    0 0 10px var(--matrix-green),
    0 0 20px var(--matrix-green-glow),
    0 0 40px var(--matrix-green-glow);
}

.prompt {
  color: var(--amber);
  text-shadow: 0 0 10px var(--amber);
}

.typing-text {
  animation: typing-glow 1.5s ease-in-out infinite;
}

@keyframes typing-glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.cursor-blink {
  animation: blink 1s step-end infinite;
  color: var(--matrix-green);
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.subtitle {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.1rem;
  margin: 0 0 15px 0;
  color: var(--matrix-green);
  opacity: 0.8;
}

.line-prefix {
  color: var(--amber);
  margin-right: 8px;
}

/* Estado del sistema */
.system-status {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin: 0;
  font-size: 0.95rem;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--matrix-green);
  opacity: 0.9;
  text-transform: uppercase;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--matrix-green);
  box-shadow: 0 0 10px var(--matrix-green);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

.status-dot.online {
  background: var(--matrix-green);
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.8); }
}

/* Opciones del menú */
.menu-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 0;
  background: rgba(0, 20, 0, 0.8);
  border: 2px solid var(--matrix-green);
  padding: 25px;
  box-shadow: 0 0 20px var(--matrix-green-glow);
}

.menu-label {
  font-family: 'VT323', monospace;
  font-size: 1.3rem;
  color: var(--amber);
  text-shadow: 0 0 10px var(--amber);
  margin-bottom: 10px;
  letter-spacing: 2px;
}

.menu-fila {
  display: flex;
  gap: 10px;
}

/* Botones estilo terminal */
.btn-action {
  background: transparent;
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  padding: 15px 20px;
  font-family: 'VT323', monospace;
  font-size: 1.4rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: all 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 3px;
  position: relative;
  overflow: hidden;
  width: 100%;
  min-height: 62px;
  touch-action: manipulation;
  text-decoration: none;
  flex: 1;
}

.btn-action::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 0;
  background: var(--matrix-green);
  transition: width 0.3s ease;
  z-index: -1;
}

.btn-action:hover {
  color: var(--terminal-bg);
  text-shadow: none;
  box-shadow:
    0 0 20px var(--matrix-green),
    inset 0 0 20px rgba(0, 255, 65, 0.1);
}

.btn-action:hover::before {
  width: 100%;
}

.btn-action:focus-visible {
  outline: 2px solid var(--amber);
  outline-offset: 3px;
}

.btn-action:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-action:disabled::before {
  width: 0;
}

.btn-prefix {
  color: var(--amber);
  font-weight: bold;
  min-width: 35px;
}

.btn-action:hover .btn-prefix {
  color: var(--terminal-bg);
}

.btn-text {
  flex: 1;
  text-align: left;
}

.btn-text small {
  display: block;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 1px;
  opacity: 0.85;
  margin-top: 2px;
}

/* Atajos "de hoy": variante ámbar */
.btn-atajo {
  flex: 0 0 42%;
  border-color: var(--amber);
  color: var(--amber);
  font-size: 1.2rem;
  letter-spacing: 2px;
}

.btn-atajo::before {
  background: var(--amber);
}

.btn-atajo:hover {
  box-shadow:
    0 0 20px var(--amber),
    inset 0 0 20px rgba(255, 176, 0, 0.1);
}

.btn-atajo .btn-prefix {
  color: var(--matrix-green);
}

.btn-atajo:hover .btn-prefix {
  color: var(--terminal-bg);
}

/* Efecto lluvia Matrix */
.matrix-rain {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  opacity: 0.15;
}

.rain-column {
  position: absolute;
  top: -100%;
  left: var(--left);
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
  color: var(--matrix-green);
  white-space: pre;
  line-height: 1.5;
  text-shadow: 0 0 10px var(--matrix-green);
  animation: rain-fall 8s linear infinite;
  animation-delay: var(--delay);
}

@keyframes rain-fall {
  0% { transform: translateY(0); }
  100% { transform: translateY(250vh); }
}

/* Responsive */
@media (max-width: 768px) {
  .menu-rapido {
    padding: 15px;
  }

  .header-content {
    padding: 20px 15px;
  }

  .ascii-ship {
    font-size: 0.7rem;
    transform: scale(0.9);
  }

  .main-title {
    font-size: 2rem;
    flex-wrap: wrap;
  }

  .subtitle {
    font-size: 1rem;
  }

  .system-status {
    flex-direction: column;
    gap: 10px;
  }

  .menu-options {
    padding: 20px 15px;
    gap: 12px;
  }

  .menu-label {
    font-size: 1.1rem;
  }

  .btn-action {
    padding: 12px 15px;
    font-size: 1.2rem;
    letter-spacing: 1px;
  }

  .btn-prefix {
    min-width: 30px;
  }

  .btn-atajo {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .menu-rapido {
    padding: 10px;
  }

  .terminal-header {
    padding: 6px 10px;
  }

  .terminal-title {
    font-size: 0.75rem;
    letter-spacing: 1px;
  }

  .header-content {
    padding: 15px 10px;
  }

  .ascii-ship {
    font-size: 0.55rem;
    transform: scale(0.8);
    margin-bottom: 15px;
  }

  .main-title {
    font-size: 1.5rem;
    gap: 5px;
  }

  .subtitle {
    font-size: 0.9rem;
  }

  .menu-options {
    padding: 15px 10px;
    gap: 10px;
  }

  .menu-label {
    font-size: 1rem;
  }

  .btn-action {
    padding: 10px 12px;
    font-size: 1rem;
    gap: 10px;
  }

  .btn-text {
    overflow-wrap: anywhere;
  }

  .rain-column {
    font-size: 0.9rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .crt-flicker,
  .ascii-ship,
  .typing-text,
  .cursor-blink,
  .status-dot,
  .btn-action,
  .btn-action::before,
  .rain-column {
    animation: none !important;
    transition: none !important;
  }
}
</style>
