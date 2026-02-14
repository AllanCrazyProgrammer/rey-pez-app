<template>
  <div class="procesos-menu">
    <div class="terminal-window">
      <div class="terminal-header">
        <span class="terminal-dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </span>
        <span class="terminal-title">PROCESOS_SYSTEM.db — bash</span>
      </div>

      <div class="header-section">
        <div class="header-content">
          <pre class="ascii-title">
╔══════════════════════════════════════╗
║        MENU DE PROCESOS              ║
║        ════════════════              ║
╚══════════════════════════════════════╝</pre>
          <h1 class="main-title">
            <span class="prompt">&gt;</span>
            <span class="title-text">PROCESOS_MENU</span>
            <span class="cursor-blink">_</span>
          </h1>
          <p class="subtitle"><span class="prompt">$</span> Gestiona todos los procesos de tu negocio</p>
        </div>
      </div>
    </div>

    <div class="menu-options">
      <div class="menu-label">&gt;&gt; SELECCIONA UNA OPCIÓN:</div>
      <router-link 
        to="/procesos/pedidos" 
        class="btn-action btn-pedidos"
        aria-label="Gestionar pedidos"
      >
        <span class="btn-prefix">[1]</span>
        <span class="icon">📝</span>
        <span class="btn-text">PEDIDOS</span>
      </router-link>
      
      <router-link 
        to="/procesos/preparacion" 
        class="btn-action btn-preparacion"
        aria-label="Gestionar preparación"
      >
        <span class="btn-prefix">[2]</span>
        <span class="icon">👨‍🍳</span>
        <span class="btn-text">PREPARACION</span>
      </router-link>
      
      <router-link 
        to="/procesos/bitacoras" 
        class="btn-action btn-bitacoras"
        aria-label="Ver bitácoras de mantenimiento"
      >
        <span class="btn-prefix">[3]</span>
        <span class="icon">📋</span>
        <span class="btn-text">BITACORAS</span>
      </router-link>
      
      <router-link 
        to="/procesos/deudas" 
        class="btn-action btn-deudas"
        aria-label="Gestionar deudas"
      >
        <span class="btn-prefix">[4]</span>
        <span class="icon">💰</span>
        <span class="btn-text">DEUDAS</span>
      </router-link>
      
      <router-link 
        to="/barcos" 
        class="btn-action btn-barcos"
        aria-label="Gestionar deudas de barcos"
      >
        <span class="btn-prefix">[5]</span>
        <span class="icon">⛵</span>
        <span class="btn-text">BARCOS</span>
      </router-link>
      
      <router-link 
        to="/procesos/prestamos" 
        class="btn-action btn-prestamos"
        aria-label="Gestionar préstamos"
      >
        <span class="btn-prefix">[6]</span>
        <span class="icon">🏦</span>
        <span class="btn-text">PRESTAMOS</span>
      </router-link>

      <router-link 
        to="/noteMenu" 
        class="btn-action btn-notas"
        aria-label="Gestionar notas"
      >
        <span class="btn-prefix">[7]</span>
        <span class="icon">📓</span>
        <span class="btn-text">NOTAS</span>
      </router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ProcesosMenu'
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap');

.procesos-menu {
  --matrix-green: #00ff41;
  --matrix-green-dark: #008f11;
  --matrix-green-glow: #00ff4180;
  --matrix-green-dim: #00ff4130;
  --terminal-bg: #0a0a0a;
  --terminal-border: #00ff4140;
  --amber: #ffb000;
  --amber-glow: #ffb00080;
  --cyan: #00d4ff;
}

.procesos-menu {
  min-height: 100vh;
  background: var(--terminal-bg);
  padding: 20px;
  color: var(--matrix-green);
  font-family: 'VT323', 'Share Tech Mono', monospace;
}

.terminal-window {
  background: rgba(0, 20, 0, 0.95);
  border: 2px solid var(--matrix-green);
  margin-bottom: 25px;
  box-shadow: 
    0 0 30px var(--matrix-green-glow),
    inset 0 0 60px rgba(0, 255, 65, 0.03);
}

.terminal-header {
  background: linear-gradient(90deg, #001a00 0%, #002200 100%);
  padding: 10px 15px;
  border-bottom: 1px solid var(--matrix-green);
  display: flex;
  align-items: center;
  gap: 15px;
}

.terminal-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.dot.red { background: #ff5f56; box-shadow: 0 0 8px #ff5f56; }
.dot.yellow { background: #ffbd2e; box-shadow: 0 0 8px #ffbd2e; }
.dot.green { background: var(--matrix-green); box-shadow: 0 0 8px var(--matrix-green); }

.terminal-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.95rem;
  color: var(--matrix-green);
  text-shadow: 0 0 10px var(--matrix-green);
  letter-spacing: 2px;
}

/* Header moderno */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px;
  flex-wrap: wrap;
  gap: 20px;
}

.header-content {
  flex: 1;
}

.ascii-title {
  color: var(--matrix-green);
  font-family: 'VT323', monospace;
  font-size: 1rem;
  line-height: 1.3;
  margin: 0 0 15px 0;
  text-shadow: 0 0 10px var(--matrix-green-glow);
  white-space: pre;
}

.main-title {
  font-family: 'VT323', monospace;
  font-size: 2.6rem;
  font-weight: 400;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--matrix-green);
  text-shadow: 0 0 10px var(--matrix-green);
}

.prompt {
  color: var(--amber);
  text-shadow: 0 0 10px var(--amber);
}

.title-text {
  letter-spacing: 2px;
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
  margin: 0;
  color: var(--amber);
  text-shadow: 0 0 10px var(--amber-glow);
}

/* Opciones del menú */
.menu-options {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 15px;
  background: rgba(0, 20, 0, 0.8);
  border: 2px solid var(--matrix-green);
  padding: 25px;
  box-shadow: 0 0 20px var(--matrix-green-glow);
}

.menu-label {
  grid-column: 1 / -1;
  font-family: 'VT323', monospace;
  font-size: 1.3rem;
  color: var(--amber);
  text-shadow: 0 0 10px var(--amber-glow);
  letter-spacing: 2px;
}

/* Botones modernos */
.btn-action {
  padding: 14px 16px;
  border: 1px solid var(--matrix-green);
  border-radius: 0;
  cursor: pointer;
  font-weight: 400;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
  justify-content: flex-start;
  text-decoration: none;
  color: var(--matrix-green);
  text-transform: uppercase;
  letter-spacing: 2px;
  background: transparent;
}

.btn-action:hover {
  transform: translateY(-2px);
  text-decoration: none;
  color: var(--terminal-bg);
  background: var(--matrix-green);
  box-shadow: 0 0 15px var(--matrix-green-glow);
}

.btn-action:focus {
  outline: 2px solid var(--amber);
  outline-offset: 2px;
}

.btn-prefix {
  color: inherit;
  min-width: 32px;
}

.icon {
  font-size: 1.4rem;
  color: inherit;
}

.btn-text {
  flex: 1;
  text-align: left;
}

/* Colores por opción */
.btn-pedidos {
  border-color: #4bd3ff;
  color: #4bd3ff;
}

.btn-pedidos:hover {
  background: #4bd3ff;
  box-shadow: 0 0 15px rgba(75, 211, 255, 0.5);
}

.btn-preparacion {
  border-color: #00ff41;
  color: #00ff41;
}

.btn-preparacion:hover {
  background: #00ff41;
  box-shadow: 0 0 15px rgba(0, 255, 65, 0.5);
}

.btn-bitacoras {
  border-color: #ffb000;
  color: #ffb000;
}

.btn-bitacoras:hover {
  background: #ffb000;
  box-shadow: 0 0 15px rgba(255, 176, 0, 0.5);
}

.btn-deudas {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.btn-deudas:hover {
  background: #ff6b6b;
  box-shadow: 0 0 15px rgba(255, 107, 107, 0.5);
}

.btn-barcos {
  border-color: #7f8cff;
  color: #7f8cff;
}

.btn-barcos:hover {
  background: #7f8cff;
  box-shadow: 0 0 15px rgba(127, 140, 255, 0.5);
}

.btn-prestamos {
  border-color: #00cec9;
  color: #00cec9;
}

.btn-prestamos:hover {
  background: #00cec9;
  box-shadow: 0 0 15px rgba(0, 206, 201, 0.5);
}

.btn-notas {
  border-color: #e17055;
  color: #e17055;
}

.btn-notas:hover {
  background: #e17055;
  box-shadow: 0 0 15px rgba(225, 112, 85, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .procesos-menu {
    padding: 15px;
  }

  .header-section {
    padding: 20px;
    flex-direction: column;
    text-align: center;
  }

  .main-title {
    font-size: 2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .menu-options {
    padding: 20px 15px;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .btn-action {
    padding: 12px 14px;
    font-size: 1rem;
    letter-spacing: 1px;
  }
}

@media (max-width: 480px) {
  .procesos-menu {
    padding: 10px;
  }

  .terminal-header {
    padding: 8px 12px;
  }

  .terminal-title {
    font-size: 0.8rem;
    letter-spacing: 1px;
  }

  .ascii-title {
    font-size: 0.7rem;
    transform: scale(0.9);
  }

  .header-section {
    padding: 15px;
  }

  .main-title {
    font-size: 1.6rem;
    flex-direction: column;
    gap: 8px;
  }

  .btn-action {
    padding: 10px 12px;
    font-size: 0.95rem;
  }

  .menu-options {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1400px) {
  .menu-options {
    grid-template-columns: repeat(3, minmax(260px, 1fr));
    gap: 20px;
    padding: 35px;
  }

  .btn-action {
    padding: 18px 22px;
    font-size: 1.35rem;
    letter-spacing: 3px;
  }

  .icon {
    font-size: 1.8rem;
  }
}
</style> 