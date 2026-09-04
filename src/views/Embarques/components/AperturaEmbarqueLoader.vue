<template>
  <transition name="inmersion">
    <section
      v-if="visible"
      class="apertura-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apertura-embarque-titulo"
      aria-describedby="apertura-embarque-estado"
    >
      <div class="ocean-glow ocean-glow-a" aria-hidden="true"></div>
      <div class="ocean-glow ocean-glow-b" aria-hidden="true"></div>
      <div class="sonar-grid" aria-hidden="true"></div>
      <div class="scanlines" aria-hidden="true"></div>

      <div class="particle-field" aria-hidden="true">
        <span
          v-for="particula in particulas"
          :key="particula.id"
          class="data-particle"
          :style="particula.style"
        ></span>
      </div>

      <div class="bubble-field" aria-hidden="true">
        <span v-for="burbuja in 16" :key="burbuja" :class="`bubble bubble-${burbuja}`"></span>
      </div>

      <div class="apertura-shell">
        <header class="apertura-topbar">
          <div class="live-signal">
            <span class="signal-dot"></span>
            ENLACE SEGURO
          </div>
          <div class="terminal-path">REY_PEZ / EMBARQUES / {{ embarqueIdCorto }}</div>
          <div class="depth-meter">
            <span>SECUENCIA 05.00s</span>
            <span>PROF. {{ profundidad }}m</span>
          </div>
        </header>

        <div class="apertura-body">
          <div class="sonar-column" aria-hidden="true">
            <div class="sonar-console">
              <div class="depth-scale">
                <span>000</span><span>025</span><span>050</span><span>075</span><span>100</span>
                <i :style="{ top: `${Math.min(92, progreso)}%` }"></i>
              </div>

              <div class="sonar-stage" :style="{ '--sonar-progress': `${progreso * 3.6}deg` }">
              <span class="compass compass-n">N</span>
              <span class="compass compass-e">E</span>
              <span class="compass compass-s">S</span>
              <span class="compass compass-o">O</span>
              <div class="sonar-ring sonar-ring-1"></div>
              <div class="sonar-ring sonar-ring-2"></div>
              <div class="sonar-ring sonar-ring-3"></div>
              <div class="sonar-pulse sonar-pulse-a"></div>
              <div class="sonar-pulse sonar-pulse-b"></div>
              <div class="sonar-sweep"></div>
              <div class="sonar-axis sonar-axis-h"></div>
              <div class="sonar-axis sonar-axis-v"></div>
              <span class="sonar-blip blip-a"></span>
              <span class="sonar-blip blip-b"></span>
              <span class="sonar-blip blip-c"></span>

              <div class="vessel-core">
                <span class="vessel-halo"></span>
                <i class="fas fa-ship"></i>
              </div>

              <span class="orbit-icon orbit-fish"><i class="fas fa-fish"></i></span>
              <span class="orbit-icon orbit-box"><i class="fas fa-box-open"></i></span>
              <span class="orbit-icon orbit-snow"><i class="fas fa-snowflake"></i></span>
              </div>
            </div>

            <div class="coordinates">
              <span>LAT 27°56'N</span>
              <span>LON 110°54'W</span>
              <span>SONAR 04</span>
            </div>

            <div class="signal-console">
              <div class="signal-bars">
                <span
                  v-for="barra in 18"
                  :key="barra"
                  :style="{
                    height: `${5 + (barra % 8) * 2.5}px`,
                    animationDelay: `${barra * -0.055}s`
                  }"
                ></span>
              </div>
              <div class="signal-legend"><span>SEÑAL DE RETORNO</span><strong>98.7%</strong></div>
            </div>
          </div>

          <div class="data-column">
            <div class="eyebrow">
              <span>PROTOCOLO DE APERTURA</span>
              <span class="eyebrow-line"></span>
            </div>

            <h1 id="apertura-embarque-titulo">Abriendo embarque</h1>
            <p id="apertura-embarque-estado" class="phase-label" aria-live="polite">
              <span class="phase-index">0{{ fase + 1 }}</span>
              {{ mensaje }}
            </p>

            <div class="shipment-card">
              <div class="shipment-icon"><i class="fas fa-anchor"></i></div>
              <div class="shipment-main">
                <span class="shipment-label">REGISTRO SELECCIONADO</span>
                <strong>{{ fechaVisible }}</strong>
                <span>{{ cargaConVisible }}</span>
              </div>
              <div class="shipment-code">
                <span>ID</span>
                <strong>{{ embarqueIdCorto }}</strong>
              </div>
            </div>

            <div class="telemetry-grid" aria-hidden="true">
              <div v-for="dato in telemetria" :key="dato.label" class="telemetry-cell">
                <span><i :class="dato.icon"></i>{{ dato.label }}</span>
                <strong>{{ dato.value }}</strong>
                <small>{{ dato.unit }}</small>
              </div>
            </div>

            <div class="checkpoints" aria-hidden="true">
              <div
                v-for="(paso, indice) in pasos"
                :key="paso"
                class="checkpoint"
                :class="{ activo: indice === fase, completo: indice < fase }"
              >
                <span class="checkpoint-node">
                  <i v-if="indice < fase" class="fas fa-check"></i>
                  <span v-else>{{ indice + 1 }}</span>
                </span>
                <span>{{ paso }}</span>
              </div>
            </div>

            <div class="progress-panel">
              <div class="progress-meta">
                <span>SINCRONIZANDO BITÁCORA</span>
                <strong>{{ progreso }}%</strong>
              </div>
              <div
                class="progress-track"
                role="progressbar"
                aria-label="Progreso de apertura"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="progreso"
              >
                <span class="progress-fill" :style="{ width: `${progreso}%` }">
                  <span class="progress-shimmer"></span>
                </span>
                <span class="progress-vessel" :style="{ left: `${progreso}%` }">
                  <i class="fas fa-ship"></i>
                </span>
              </div>
              <div class="data-stream" aria-hidden="true">
                <span v-for="linea in lineasDatos" :key="linea">{{ linea }}</span>
              </div>
              <div class="scanner-strip" aria-hidden="true">
                <span class="scanner-beam"></span>
                <span v-for="bloque in 22" :key="bloque" class="scanner-block"></span>
              </div>
            </div>
          </div>
        </div>

        <footer class="apertura-footer">
          <span>
            <i :class="['fas', sonidoActivo ? 'fa-volume-up' : 'fa-volume-mute']"></i>
            {{ sonidoActivo ? 'SONIDO DE NAVEGACIÓN' : 'SONIDO SILENCIADO' }}
          </span>
          <span class="footer-pulse">●</span>
          <span>CANAL CIFRADO / ONLINE</span>
          <button type="button" class="skip-button" @click="$emit('omitir')">
            Omitir <span>↵</span>
          </button>
        </footer>
      </div>
    </section>
  </transition>
</template>

<script>
export default {
  name: 'AperturaEmbarqueLoader',
  props: {
    visible: { type: Boolean, default: false },
    progreso: { type: Number, default: 0 },
    fase: { type: Number, default: 0 },
    mensaje: { type: String, default: 'Localizando registro en la bitácora' },
    embarque: { type: Object, default: () => ({}) },
    sonidoActivo: { type: Boolean, default: true }
  },
  data() {
    return {
      pasos: ['Localizar', 'Verificar carga', 'Sincronizar', 'Listo'],
      lineasDatos: [
        'manifest.bin ........ OK',
        'clientes.index ...... OK',
        'carga.payload ....... OK'
      ],
      particulas: Array.from({ length: 26 }, (_, indice) => ({
        id: indice,
        style: {
          left: `${(indice * 37) % 97}%`,
          top: `${(indice * 53) % 91}%`,
          animationDelay: `${-(indice % 9) * 0.47}s`,
          animationDuration: `${3.2 + (indice % 6) * 0.46}s`,
          opacity: 0.18 + (indice % 5) * 0.08
        }
      }))
    };
  },
  computed: {
    embarqueIdCorto() {
      const id = String(this.embarque.id || 'NUEVO');
      return id.length > 9 ? `${id.slice(0, 5)}…${id.slice(-3)}`.toUpperCase() : id.toUpperCase();
    },
    fechaVisible() {
      return this.embarque.fechaVisible || 'Fecha por confirmar';
    },
    cargaConVisible() {
      const cargaCon = this.embarque.cargaCon || 'Carga sin asignar';
      return `Carga con ${cargaCon}`;
    },
    profundidad() {
      return Math.max(12, Math.round((this.progreso / 100) * 86));
    },
    telemetria() {
      return [
        { label: 'LIMPIOS', value: this.embarque.kilosLimpios || '0.0', unit: 'KG', icon: 'fas fa-fish' },
        { label: 'CRUDOS', value: this.embarque.kilosCrudos || '0.0', unit: 'KG', icon: 'fas fa-water' },
        { label: 'TARAS', value: this.embarque.totalTaras || 0, unit: 'UDS', icon: 'fas fa-boxes' },
        { label: 'UNIDAD', value: `#${this.embarque.camionNumero || 1}`, unit: 'CAMIÓN', icon: 'fas fa-truck' }
      ];
    }
  }
};
</script>

<style scoped>
.apertura-overlay {
  --aqua: #2fffd2;
  --cyan: #35cfff;
  --lime: #baff73;
  --ink: #020b13;
  --panel: rgba(3, 20, 30, 0.86);
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: clamp(14px, 3vw, 44px);
  color: #eaffff;
  background:
    radial-gradient(circle at 20% 18%, rgba(0, 162, 176, 0.17), transparent 30%),
    radial-gradient(circle at 82% 80%, rgba(19, 255, 180, 0.12), transparent 28%),
    linear-gradient(145deg, #01070e 0%, #031722 52%, #020b13 100%);
  font-family: 'Share Tech Mono', 'Courier New', monospace;
}

.sonar-grid {
  position: absolute;
  inset: -20%;
  opacity: 0.2;
  background-image:
    linear-gradient(rgba(48, 255, 214, 0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(48, 255, 214, 0.2) 1px, transparent 1px);
  background-size: 58px 58px;
  transform: perspective(520px) rotateX(63deg) translateY(19%);
  transform-origin: center bottom;
  animation: grid-drift 5s linear infinite;
}

.scanlines {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  opacity: 0.16;
  background: repeating-linear-gradient(180deg, transparent 0 4px, rgba(104, 255, 230, 0.08) 5px);
  mix-blend-mode: screen;
}

.particle-field { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.data-particle {
  position: absolute;
  width: 2px;
  height: 26px;
  border-radius: 999px;
  background: linear-gradient(180deg, transparent, var(--aqua), transparent);
  box-shadow: 0 0 8px rgba(47, 255, 210, 0.7);
  animation: data-fall 4s linear infinite;
}

.ocean-glow {
  position: absolute;
  width: 44vw;
  height: 44vw;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.13;
}
.ocean-glow-a { left: -18vw; top: -16vw; background: var(--cyan); }
.ocean-glow-b { right: -18vw; bottom: -18vw; background: var(--aqua); }

.apertura-shell {
  position: relative;
  width: min(1100px, 100%);
  max-height: calc(100vh - 28px);
  overflow: hidden;
  border: 1px solid rgba(86, 255, 220, 0.35);
  border-radius: 26px;
  background: linear-gradient(150deg, rgba(4, 26, 38, 0.96), rgba(2, 14, 23, 0.9));
  box-shadow: 0 0 0 1px rgba(43, 217, 255, 0.07), 0 40px 100px rgba(0, 0, 0, 0.55), 0 0 80px rgba(32, 255, 207, 0.08);
  backdrop-filter: blur(22px);
}

.apertura-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(105deg, transparent 20%, rgba(125, 255, 230, 0.045) 45%, transparent 70%);
  transform: translateX(-100%);
  animation: glass-pass 2.4s ease-in-out infinite;
}

.apertura-topbar,
.apertura-footer {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
  min-height: 58px;
  padding: 12px 22px;
  color: #8bc5ca;
  border-bottom: 1px solid rgba(111, 255, 226, 0.12);
  font-size: 0.76rem;
  letter-spacing: 0.13em;
}

.live-signal { display: flex; align-items: center; gap: 9px; color: var(--aqua); }
.signal-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--aqua);
  box-shadow: 0 0 0 5px rgba(47, 255, 210, 0.1), 0 0 16px var(--aqua);
  animation: signal 1.3s ease-in-out infinite;
}
.terminal-path { text-align: center; }
.depth-meter { display: flex; justify-self: end; gap: 18px; color: var(--cyan); }
.depth-meter span:first-child { color: #6c9fa5; }

.apertura-body {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(340px, 0.86fr) minmax(400px, 1.14fr);
  min-height: 570px;
}

.sonar-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 28px 34px;
  border-right: 1px solid rgba(111, 255, 226, 0.12);
  background: radial-gradient(circle at center, rgba(31, 252, 207, 0.08), transparent 62%);
}

.sonar-console { position: relative; display: flex; align-items: center; padding-left: 32px; }
.depth-scale {
  position: absolute;
  left: 0;
  top: 5%;
  bottom: 5%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 27px;
  color: #4d858b;
  border-right: 1px solid rgba(47, 255, 210, 0.2);
  font-size: 0.52rem;
}
.depth-scale::after {
  content: '';
  position: absolute;
  right: -4px;
  inset-block: 0;
  width: 7px;
  background: repeating-linear-gradient(180deg, rgba(47,255,210,.35) 0 1px, transparent 1px 12px);
}
.depth-scale i {
  position: absolute;
  z-index: 2;
  right: -7px;
  width: 13px;
  height: 2px;
  background: var(--lime);
  box-shadow: 0 0 10px var(--lime);
  transition: top 0.75s cubic-bezier(0.16, 1, 0.3, 1);
}

.sonar-stage {
  position: relative;
  width: min(330px, 72vw);
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid rgba(66, 255, 218, 0.38);
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(47, 255, 210, 0.08), transparent 58%),
    repeating-radial-gradient(circle, transparent 0 47px, rgba(47, 255, 210, 0.08) 48px 49px);
  box-shadow: inset 0 0 55px rgba(18, 231, 194, 0.07), 0 0 45px rgba(18, 231, 194, 0.07);
}
.sonar-stage::before {
  content: '';
  position: absolute;
  z-index: 5;
  inset: -1px;
  pointer-events: none;
  border-radius: 50%;
  background: conic-gradient(var(--aqua) var(--sonar-progress), transparent 0);
  -webkit-mask: radial-gradient(circle, transparent 0 calc(100% - 4px), #000 calc(100% - 3px));
  mask: radial-gradient(circle, transparent 0 calc(100% - 4px), #000 calc(100% - 3px));
  filter: drop-shadow(0 0 5px var(--aqua));
}

.compass { position: absolute; z-index: 4; color: rgba(186, 255, 115, 0.82); font-size: 0.58rem; text-shadow: 0 0 8px var(--lime); }
.compass-n { top: 5px; left: 50%; transform: translateX(-50%); }
.compass-e { top: 50%; right: 6px; transform: translateY(-50%); }
.compass-s { bottom: 5px; left: 50%; transform: translateX(-50%); }
.compass-o { top: 50%; left: 6px; transform: translateY(-50%); }

.sonar-ring { position: absolute; border: 1px solid rgba(73, 255, 219, 0.18); border-radius: 50%; }
.sonar-ring-1 { inset: 16%; }
.sonar-ring-2 { inset: 32%; }
.sonar-ring-3 { inset: 44%; border-color: rgba(73, 255, 219, 0.34); }
.sonar-pulse { position: absolute; left: 50%; top: 50%; width: 18%; height: 18%; border: 1px solid rgba(47, 255, 210, 0.55); border-radius: 50%; transform: translate(-50%, -50%); animation: radar-pulse 2.1s ease-out infinite; }
.sonar-pulse-b { animation-delay: 1.05s; }
.sonar-axis { position: absolute; background: rgba(73, 255, 219, 0.13); }
.sonar-axis-h { left: 6%; right: 6%; top: 50%; height: 1px; }
.sonar-axis-v { top: 6%; bottom: 6%; left: 50%; width: 1px; }

.sonar-sweep {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0deg 295deg, rgba(42, 255, 207, 0.02) 315deg, rgba(42, 255, 207, 0.35) 359deg);
  animation: sonar-spin 2.2s linear infinite;
}
.sonar-sweep::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 48%;
  height: 1px;
  background: linear-gradient(90deg, var(--aqua), transparent);
  box-shadow: 0 0 12px var(--aqua);
  transform-origin: left center;
}

.vessel-core {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  width: 76px;
  height: 76px;
  place-items: center;
  color: var(--ink);
  border: 1px solid rgba(255, 255, 255, 0.75);
  border-radius: 50%;
  background: linear-gradient(145deg, var(--lime), var(--aqua));
  box-shadow: 0 0 30px rgba(47, 255, 210, 0.38);
  transform: translate(-50%, -50%);
  font-size: 1.65rem;
}
.vessel-halo {
  position: absolute;
  inset: -12px;
  border: 1px solid rgba(47, 255, 210, 0.42);
  border-radius: 50%;
  animation: halo 1.6s ease-out infinite;
}

.orbit-icon {
  position: absolute;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  color: var(--aqua);
  border: 1px solid rgba(47, 255, 210, 0.36);
  border-radius: 12px;
  background: rgba(2, 20, 29, 0.86);
  box-shadow: 0 0 18px rgba(47, 255, 210, 0.12);
}
.orbit-fish { left: 18%; top: 28%; animation: float-a 2.8s ease-in-out infinite; }
.orbit-box { right: 17%; bottom: 22%; color: var(--cyan); animation: float-b 3.1s ease-in-out infinite; }
.orbit-snow { right: 22%; top: 20%; width: 30px; height: 30px; color: #d9ffff; animation: float-a 3.4s ease-in-out infinite reverse; }

.sonar-blip { position: absolute; width: 5px; height: 5px; border-radius: 50%; background: var(--lime); box-shadow: 0 0 10px var(--lime); animation: blip 1.6s ease-in-out infinite; }
.blip-a { left: 24%; bottom: 32%; }
.blip-b { right: 24%; top: 21%; animation-delay: 0.45s; }
.blip-c { right: 38%; bottom: 15%; animation-delay: 0.8s; }

.coordinates { display: flex; gap: 18px; color: #72aeb5; font-size: 0.7rem; letter-spacing: 0.08em; }

.signal-console { width: min(330px, 100%); padding: 9px 12px; border: 1px solid rgba(47, 255, 210, 0.12); border-radius: 10px; background: rgba(2, 14, 21, 0.54); }
.signal-bars { display: flex; align-items: center; gap: 3px; height: 29px; }
.signal-bars span { flex: 1; border-radius: 1px; background: linear-gradient(180deg, var(--lime), var(--aqua)); opacity: 0.62; transform-origin: center; animation: signal-wave 0.8s ease-in-out infinite alternate; }
.signal-legend { display: flex; justify-content: space-between; margin-top: 5px; color: #54848a; font-size: 0.54rem; letter-spacing: 0.1em; }
.signal-legend strong { color: var(--aqua); }

.data-column {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 27px clamp(30px, 4vw, 54px);
}
.eyebrow { display: flex; align-items: center; gap: 14px; color: var(--aqua); font-size: 0.75rem; letter-spacing: 0.18em; }
.eyebrow-line { flex: 1; height: 1px; background: linear-gradient(90deg, rgba(47, 255, 210, 0.5), transparent); }
h1 { margin: 13px 0 4px; font-family: 'VT323', 'Share Tech Mono', monospace; font-size: clamp(2.7rem, 6vw, 4.8rem); font-weight: 400; line-height: 0.95; letter-spacing: -0.02em; text-shadow: 0 0 28px rgba(52, 232, 255, 0.14); }
.phase-label { display: flex; align-items: center; gap: 10px; min-height: 26px; margin: 12px 0 26px; color: #9bd5d8; font-size: 0.94rem; }
.phase-index { display: grid; width: 28px; height: 28px; place-items: center; color: var(--ink); border-radius: 8px; background: var(--aqua); font-size: 0.74rem; font-weight: 700; }

.shipment-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
  padding: 15px;
  border: 1px solid rgba(86, 255, 220, 0.19);
  border-radius: 16px;
  background: linear-gradient(100deg, rgba(47, 255, 210, 0.07), rgba(53, 207, 255, 0.035));
}
.shipment-icon { display: grid; width: 45px; height: 45px; place-items: center; color: var(--aqua); border: 1px solid rgba(47, 255, 210, 0.28); border-radius: 13px; background: rgba(47, 255, 210, 0.07); }
.shipment-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.shipment-main strong { color: #fff; font-size: 1.08rem; }
.shipment-main > span:last-child { overflow: hidden; color: #81b6bc; font-size: 0.78rem; text-overflow: ellipsis; white-space: nowrap; }
.shipment-label { color: #5f969d; font-size: 0.62rem; letter-spacing: 0.13em; }
.shipment-code { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; color: #5f969d; font-size: 0.62rem; }
.shipment-code strong { color: var(--cyan); font-size: 0.86rem; }

.telemetry-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-top: 10px; }
.telemetry-cell { min-width: 0; padding: 9px 8px; border: 1px solid rgba(76, 206, 211, 0.13); border-radius: 10px; background: rgba(17, 78, 84, 0.08); }
.telemetry-cell > span { display: flex; align-items: center; gap: 5px; overflow: hidden; color: #558d93; font-size: 0.5rem; letter-spacing: 0.08em; white-space: nowrap; }
.telemetry-cell i { color: var(--cyan); }
.telemetry-cell strong { display: block; overflow: hidden; margin-top: 5px; color: #eaffff; font-size: 0.92rem; text-overflow: ellipsis; }
.telemetry-cell small { color: var(--aqua); font-size: 0.47rem; }

.checkpoints { display: grid; grid-template-columns: repeat(4, 1fr); margin: 18px 0; }
.checkpoint { position: relative; display: flex; flex-direction: column; align-items: center; gap: 7px; color: #4f7a80; font-size: 0.62rem; text-align: center; }
.checkpoint::before { content: ''; position: absolute; z-index: -1; top: 13px; right: 50%; width: 100%; height: 1px; background: #153d42; }
.checkpoint:first-child::before { display: none; }
.checkpoint-node { display: grid; width: 27px; height: 27px; place-items: center; border: 1px solid #28555a; border-radius: 50%; background: #061820; font-size: 0.66rem; }
.checkpoint.activo { color: #dffff9; }
.checkpoint.activo .checkpoint-node { color: var(--ink); border-color: var(--aqua); background: var(--aqua); box-shadow: 0 0 14px rgba(47, 255, 210, 0.45); animation: checkpoint-pulse 1s ease-in-out infinite; }
.checkpoint.completo { color: #8ccdc5; }
.checkpoint.completo .checkpoint-node { color: var(--aqua); border-color: rgba(47, 255, 210, 0.55); background: rgba(47, 255, 210, 0.08); }
.checkpoint.completo::before, .checkpoint.activo::before { background: linear-gradient(90deg, var(--aqua), rgba(47, 255, 210, 0.35)); }

.progress-panel { padding: 14px 0 0; }
.progress-meta { display: flex; justify-content: space-between; color: #76a9ae; font-size: 0.66rem; letter-spacing: 0.12em; }
.progress-meta strong { color: var(--aqua); font-size: 0.9rem; }
.progress-track { position: relative; height: 8px; margin: 12px 0 17px; border: 1px solid rgba(86, 255, 220, 0.16); border-radius: 999px; background: rgba(1, 8, 12, 0.7); }
.progress-fill { position: absolute; inset: 0 auto 0 0; overflow: hidden; border-radius: inherit; background: linear-gradient(90deg, #10b9c0, var(--aqua), var(--lime)); box-shadow: 0 0 18px rgba(47, 255, 210, 0.35); transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.progress-shimmer { position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.65), transparent); transform: translateX(-100%); animation: shimmer 1s ease-in-out infinite; }
.progress-vessel { position: absolute; top: 50%; color: #dfffee; filter: drop-shadow(0 0 7px var(--aqua)); transform: translate(-50%, -52%); transition: left 0.5s cubic-bezier(0.16, 1, 0.3, 1); font-size: 0.85rem; }
.data-stream { display: flex; justify-content: space-between; gap: 8px; color: #477981; font-size: 0.56rem; letter-spacing: 0.04em; }
.scanner-strip { position: relative; display: grid; grid-template-columns: repeat(22, 1fr); gap: 3px; overflow: hidden; height: 12px; margin-top: 11px; }
.scanner-block { border-radius: 2px; background: rgba(47, 255, 210, 0.1); }
.scanner-block:nth-child(3n) { background: rgba(53, 207, 255, 0.24); }
.scanner-beam { position: absolute; z-index: 2; inset-block: 0; width: 18%; background: linear-gradient(90deg, transparent, rgba(186, 255, 115, 0.85), transparent); filter: blur(1px); animation: scanner 1.2s linear infinite; }

.apertura-footer { grid-template-columns: auto auto 1fr auto; border-top: 1px solid rgba(111, 255, 226, 0.12); border-bottom: 0; }
.apertura-footer i { margin-right: 7px; color: var(--aqua); }
.footer-pulse { color: var(--aqua); text-shadow: 0 0 10px var(--aqua); animation: signal 1.2s ease-in-out infinite; }
.skip-button { justify-self: end; padding: 7px 11px; color: #92c8cb; border: 1px solid rgba(116, 205, 208, 0.25); border-radius: 8px; background: transparent; font: inherit; font-size: 0.68rem; letter-spacing: 0.08em; cursor: pointer; transition: 0.2s ease; }
.skip-button:hover, .skip-button:focus-visible { color: var(--ink); border-color: var(--aqua); outline: none; background: var(--aqua); box-shadow: 0 0 18px rgba(47, 255, 210, 0.24); }
.skip-button span { margin-left: 5px; }

.bubble-field { position: absolute; inset: 0; pointer-events: none; }
.bubble { position: absolute; bottom: -28px; width: 7px; height: 7px; border: 1px solid rgba(130, 255, 236, 0.48); border-radius: 50%; box-shadow: inset 1px 1px 2px rgba(255,255,255,.25); animation: bubble-rise 5s linear infinite; }
.bubble-1 { left: 5%; animation-delay: -1s; } .bubble-2 { left: 12%; width: 12px; height: 12px; animation-delay: -4s; }
.bubble-3 { left: 19%; animation-delay: -2.4s; } .bubble-4 { left: 27%; width: 4px; height: 4px; animation-delay: -3.2s; }
.bubble-5 { left: 35%; width: 10px; height: 10px; animation-delay: -0.5s; } .bubble-6 { left: 43%; animation-delay: -4.6s; }
.bubble-7 { left: 51%; width: 13px; height: 13px; animation-delay: -2s; } .bubble-8 { left: 58%; width: 5px; height: 5px; animation-delay: -3.7s; }
.bubble-9 { left: 66%; animation-delay: -1.7s; } .bubble-10 { left: 72%; width: 11px; height: 11px; animation-delay: -4.2s; }
.bubble-11 { left: 79%; width: 5px; height: 5px; animation-delay: -2.8s; } .bubble-12 { left: 87%; animation-delay: -0.8s; }
.bubble-13 { left: 94%; width: 12px; height: 12px; animation-delay: -3.4s; } .bubble-14 { left: 31%; width: 5px; height: 5px; animation-delay: -1.4s; }
.bubble-15 { left: 62%; width: 9px; height: 9px; animation-delay: -0.2s; } .bubble-16 { left: 82%; width: 4px; height: 4px; animation-delay: -2.2s; }

.inmersion-enter-active { animation: overlay-in 0.38s ease-out; }
.inmersion-leave-active { animation: overlay-in 0.2s ease-in reverse; }
.inmersion-enter-active .apertura-shell { animation: shell-in 0.52s cubic-bezier(0.16, 1, 0.3, 1); }

@keyframes overlay-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes shell-in { from { opacity: 0; transform: translateY(22px) scale(0.965); } to { opacity: 1; transform: none; } }
@keyframes sonar-spin { to { transform: rotate(360deg); } }
@keyframes radar-pulse { from { opacity: 0.8; transform: translate(-50%, -50%) scale(0.4); } to { opacity: 0; transform: translate(-50%, -50%) scale(5.1); } }
@keyframes grid-drift { to { background-position: 0 58px, 58px 0; } }
@keyframes data-fall { from { transform: translateY(-60px); } to { transform: translateY(110vh); } }
@keyframes glass-pass { 0%, 26% { transform: translateX(-110%); } 74%, 100% { transform: translateX(110%); } }
@keyframes signal { 50% { opacity: 0.38; transform: scale(0.82); } }
@keyframes halo { from { opacity: 0.8; transform: scale(0.82); } to { opacity: 0; transform: scale(1.2); } }
@keyframes blip { 0%, 100% { opacity: 0.2; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1.5); } }
@keyframes float-a { 50% { transform: translate(5px, -8px) rotate(-5deg); } }
@keyframes float-b { 50% { transform: translate(-7px, 5px) rotate(6deg); } }
@keyframes checkpoint-pulse { 50% { box-shadow: 0 0 22px rgba(47, 255, 210, 0.7); } }
@keyframes signal-wave { from { transform: scaleY(0.38); opacity: 0.25; } to { transform: scaleY(1); opacity: 0.9; } }
@keyframes shimmer { to { transform: translateX(100%); } }
@keyframes scanner { from { transform: translateX(-120%); } to { transform: translateX(660%); } }
@keyframes bubble-rise { 0% { opacity: 0; transform: translateY(0) translateX(0); } 12% { opacity: 0.65; } 85% { opacity: 0.25; } 100% { opacity: 0; transform: translateY(-110vh) translateX(30px); } }

@media (max-width: 760px) {
  .apertura-overlay { padding: 10px; }
  .apertura-shell { max-height: calc(100vh - 20px); overflow-y: auto; border-radius: 18px; }
  .apertura-topbar { grid-template-columns: 1fr auto; min-height: 48px; padding: 10px 14px; }
  .terminal-path { display: none; }
  .apertura-body { grid-template-columns: 1fr; min-height: 0; }
  .sonar-column { padding: 20px 20px 12px; border-right: 0; border-bottom: 1px solid rgba(111, 255, 226, 0.12); }
  .sonar-console { padding-left: 25px; }
  .sonar-stage { width: min(210px, 58vw); }
  .vessel-core { width: 58px; height: 58px; }
  .coordinates { display: none; }
  .data-column { padding: 24px 20px 20px; }
  h1 { font-size: clamp(2.6rem, 14vw, 4rem); }
  .phase-label { margin: 9px 0 17px; font-size: 0.8rem; }
  .shipment-card { padding: 11px; }
  .shipment-icon { width: 38px; height: 38px; }
  .shipment-code { display: none; }
  .telemetry-grid { grid-template-columns: repeat(2, 1fr); }
  .telemetry-cell { padding: 7px; }
  .checkpoints { margin: 18px 0; }
  .checkpoint { font-size: 0.55rem; }
  .data-stream { display: none; }
  .apertura-footer { grid-template-columns: 1fr auto; min-height: 48px; padding: 9px 14px; }
  .apertura-footer > span:nth-child(2), .apertura-footer > span:nth-child(3) { display: none; }
}

@media (max-height: 690px) and (min-width: 761px) {
  .apertura-body { min-height: 490px; }
  .sonar-stage { width: 250px; }
  .signal-console { width: 280px; }
  .data-column { padding-top: 18px; padding-bottom: 18px; }
  .checkpoints { margin: 12px 0; }
  .phase-label { margin-bottom: 16px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition-duration: 0.01ms !important; }
  .sonar-sweep { transform: rotate(42deg); }
}
</style>
