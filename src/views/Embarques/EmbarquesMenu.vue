<template>
  <div class="embarques-menu">
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
          <span class="terminal-title">EMBARQUES_SYSTEM v2.4.80</span>
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
            <span class="typing-text">MENU_EMBARQUES</span>
            <span class="cursor-blink">_</span>
          </h1>
          <p class="subtitle">
            <span class="line-prefix">[SYS]</span> Gestiona todos tus embarques de manera eficiente
          </p>
          <p class="system-status">
            <span class="status-item"><span class="status-dot online"></span> SISTEMA: ONLINE</span>
            <span class="status-item"><span class="status-dot"></span> CONEXIÓN: ACTIVA</span>
          </p>
        </div>
      </div>
      
      <div class="menu-options">
        <div class="menu-label">&gt;&gt; SELECCIONE UNA OPCIÓN:</div>
        <button @click="nuevoEmbarque" class="btn-action btn-nuevo-embarque">
          <span class="btn-prefix">[1]</span>
          <span class="btn-icon">+</span>
          <span class="btn-text">NUEVO_EMBARQUE</span>
        </button>
        <button @click="verCuentaFletes" class="btn-action btn-cuenta-fletes">
          <span class="btn-prefix">[2]</span>
          <span class="btn-icon">$</span>
          <span class="btn-text">CUENTA_FLETES</span>
        </button>
        <button @click="recuperacionEmergencia" class="btn-action btn-emergencia">
          <span class="btn-prefix">[!]</span>
          <span class="btn-icon">⚠</span>
          <span class="btn-text">RECUPERAR_DATOS</span>
        </button>
      </div>
    </div>
    
    <div class="matrix-rain" aria-hidden="true">
      <span v-for="n in 20" :key="n" class="rain-column" :style="{ '--delay': n * 0.3 + 's', '--left': (n * 5) + '%' }">
        {{ randomChars }}
      </span>
    </div>
  </div>
    
    <ListaEmbarques />
  </div>
</template>

<script>
import ListaEmbarques from './ListaEmbarques.vue'

export default {
  name: 'EmbarquesMenu',
  components: {
    ListaEmbarques
  },
  data() {
    return {
    }
  },
  computed: {
    randomChars() {
      const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン01234567890';
      let result = '';
      for (let i = 0; i < 30; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length)) + '\n';
      }
      return result;
    }
  },
  methods: {
    nuevoEmbarque() {
      this.$router.push({ name: 'NuevoEmbarque', params: { id: 'nuevo' } });
    },
    verCuentaFletes() {
      this.$router.push({ name: 'CuentaFletes' });
    },
    recuperacionEmergencia() {
      this.$router.push('/embarques/recuperacion-emergencia');
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap');

/* Variables de colores Matrix/Terminal */
.embarques-menu {
  --matrix-green: #00ff41;
  --matrix-green-dark: #008f11;
  --matrix-green-glow: #00ff4180;
  --terminal-bg: #0a0a0a;
  --terminal-border: #00ff4140;
  --amber: #ffb000;
  --red-alert: #ff0040;
  --scanline-opacity: 0.03;
}

.embarques-menu {
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

.btn-prefix {
  color: var(--amber);
  font-weight: bold;
  min-width: 35px;
}

.btn-action:hover .btn-prefix {
  color: var(--terminal-bg);
}

.btn-icon {
  font-size: 1.5rem;
  min-width: 25px;
}

.btn-text {
  flex: 1;
  text-align: left;
}

/* Botón nuevo embarque */
.btn-nuevo-embarque {
  border-color: var(--matrix-green);
}

.btn-nuevo-embarque:hover::before {
  background: var(--matrix-green);
}

/* Botón cuenta fletes */
.btn-cuenta-fletes {
  border-color: var(--amber);
  color: var(--amber);
}

.btn-cuenta-fletes:hover {
  color: var(--terminal-bg);
}

.btn-cuenta-fletes:hover::before {
  background: var(--amber);
}

.btn-cuenta-fletes .btn-prefix {
  color: var(--matrix-green);
}

/* Botón emergencia */
.btn-emergencia {
  border-color: var(--red-alert);
  color: var(--red-alert);
  animation: emergency-pulse 2s infinite;
}

.btn-emergencia:hover {
  color: var(--terminal-bg);
  animation: none;
}

.btn-emergencia:hover::before {
  background: var(--red-alert);
}

.btn-emergencia .btn-prefix {
  color: var(--red-alert);
}

@keyframes emergency-pulse {
  0%, 100% { 
    box-shadow: 0 0 5px var(--red-alert);
    border-color: var(--red-alert);
  }
  50% { 
    box-shadow: 0 0 20px var(--red-alert), 0 0 40px rgba(255, 0, 64, 0.3);
    border-color: #ff4060;
  }
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

@media (min-width: 1024px) {
  .menu-layout {
    flex-direction: row;
    align-items: stretch;
  }

  .header-section,
  .menu-options {
    flex: 1 1 50%;
    height: 100%;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .embarques-menu {
    padding: 15px;
  }

  .header-section {
    margin-bottom: 20px;
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
}

@media (max-width: 480px) {
  .embarques-menu {
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

  .btn-icon {
    font-size: 1.2rem;
  }

  .rain-column {
    font-size: 0.9rem;
  }
}
</style>
