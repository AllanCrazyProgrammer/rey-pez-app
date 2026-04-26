<template>
  <div class="cuenta-fletes-shell">
    <div class="crt-overlay" aria-hidden="true"></div>
    <div class="crt-flicker" aria-hidden="true"></div>

    <section class="terminal-window">
      <div class="terminal-header">
        <span class="terminal-dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </span>
        <span class="terminal-title">CUENTA_FLETES.db - terminal</span>
      </div>

      <header class="hero">
        <div>
          <p class="system-line">[SYS] Modulo de fletes activo</p>
          <h1><span>&gt;</span> CUENTA_FLETES<span class="cursor">_</span></h1>
          <p class="subtitle">Control de pagos por chofer, abonos y saldos pendientes.</p>
        </div>
        <div class="status-stack">
          <span class="status-pill">CHOFER={{ chofer }}</span>
          <span class="status-pill online">ONLINE</span>
        </div>
      </header>

      <slot name="toolbar"></slot>
      <slot name="status"></slot>
      <slot></slot>
    </section>
  </div>
</template>

<script>
export default {
  name: 'CuentaFletesShell',
  props: {
    chofer: {
      type: String,
      required: true
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap');

.cuenta-fletes-shell {
  --matrix-green: #00ff41;
  --matrix-green-dark: #008f11;
  --matrix-green-dim: rgba(0, 255, 65, 0.16);
  --matrix-green-glow: rgba(0, 255, 65, 0.5);
  --terminal-bg: #060806;
  --terminal-panel: rgba(0, 18, 6, 0.9);
  --terminal-border: rgba(0, 255, 65, 0.36);
  --amber: #ffb000;
  --danger: #ff4d6d;
  --info: #4bd3ff;

  min-height: 100vh;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  padding: clamp(12px, 2vw, 28px);
  background:
    radial-gradient(circle at 20% 0%, rgba(0, 255, 65, 0.12), transparent 26rem),
    radial-gradient(circle at 90% 10%, rgba(75, 211, 255, 0.08), transparent 22rem),
    var(--terminal-bg);
  color: var(--matrix-green);
  font-family: 'VT323', 'Share Tech Mono', monospace;
  box-sizing: border-box;
  position: relative;
  overflow-x: hidden;
}

.crt-overlay,
.crt-flicker {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.crt-overlay {
  z-index: 20;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.06),
    rgba(0, 0, 0, 0.06) 1px,
    transparent 1px,
    transparent 3px
  );
}

.crt-flicker {
  z-index: 19;
  background: radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.35) 100%);
  animation: flicker 0.22s infinite;
}

@keyframes flicker {
  0% { opacity: 0.96; }
  50% { opacity: 1; }
  100% { opacity: 0.98; }
}

.terminal-window {
  position: relative;
  z-index: 1;
  max-width: 1500px;
  margin: 0 auto;
  border: 2px solid var(--terminal-border);
  background: rgba(0, 8, 2, 0.84);
  box-shadow: 0 0 24px var(--matrix-green-dim), inset 0 0 60px rgba(0, 255, 65, 0.04);
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--terminal-border);
  background: rgba(0, 0, 0, 0.48);
}

.terminal-dots {
  display: flex;
  gap: 7px;
}

.dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  display: inline-block;
}

.dot.red { background: #ff4d6d; }
.dot.yellow { background: #ffb000; }
.dot.green { background: var(--matrix-green); box-shadow: 0 0 8px var(--matrix-green); }

.terminal-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.95rem;
  color: var(--amber);
  letter-spacing: 1px;
}

.hero {
  display: flex;
  justify-content: space-between;
  gap: 22px;
  padding: clamp(18px, 3vw, 34px);
  border-bottom: 1px solid var(--terminal-border);
  background: linear-gradient(135deg, rgba(0, 255, 65, 0.07), transparent);
}

.system-line,
.subtitle {
  margin: 0;
  font-family: 'Share Tech Mono', monospace;
  color: #9ef8b5;
}

h1 {
  margin: 8px 0;
  font-size: clamp(2.4rem, 6vw, 5rem);
  line-height: 0.9;
  letter-spacing: 2px;
  text-shadow: 0 0 16px var(--matrix-green-glow);
}

.cursor {
  animation: blink 1s steps(2, start) infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

.status-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 10px;
}

.status-pill {
  border: 1px solid var(--terminal-border);
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.45);
  color: var(--amber);
  font-family: 'Share Tech Mono', monospace;
  white-space: nowrap;
}

.status-pill.online {
  color: var(--matrix-green);
  box-shadow: 0 0 12px var(--matrix-green-dim);
}

@media (max-width: 720px) {
  .hero {
    flex-direction: column;
  }

  .status-stack {
    align-items: stretch;
  }
}
</style>
