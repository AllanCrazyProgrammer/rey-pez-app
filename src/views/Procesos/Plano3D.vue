<template>
  <div class="plano3d">
    <div class="terminal-window">
      <div class="terminal-header">
        <span class="terminal-dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </span>
        <span class="terminal-title">PLANO_3D_RENDER.exe — bash</span>
      </div>

      <div class="header-section">
        <div class="header-content">
          <h1 class="main-title">
            <span class="prompt">&gt;</span>
            <span class="title-text">SIMULADOR 3D DE PLANOS</span>
            <span class="cursor-blink">_</span>
          </h1>
          <p class="subtitle">
            <span class="prompt">$</span>
            Sube una imagen (plano, foto o boceto) y genera una simulación 3D interactiva
          </p>
          <router-link to="/procesos" class="btn-volver">&lt;&lt; VOLVER A PROCESOS</router-link>
        </div>
      </div>
    </div>

    <div class="workspace">
      <!-- Panel de controles -->
      <aside class="controls">
        <div class="control-block">
          <div class="block-title">&gt;&gt; IMAGEN ORIGEN</div>
          <label class="upload-zone" :class="{ 'has-image': hasImage }">
            <input type="file" accept="image/*" @change="onFileChange" hidden />
            <span v-if="!hasImage" class="upload-text">
              📂 CLIC PARA SUBIR<br /><small>o arrastra una imagen</small>
            </span>
            <img v-else :src="imageDataUrl" class="thumb" alt="origen" />
          </label>
          <button v-if="hasImage" class="btn-mini" @click="clearImage">🗑 QUITAR IMAGEN</button>
          <button class="btn-mini" @click="usarEjemplo">✨ USAR PLANO DE EJEMPLO</button>
        </div>

        <div class="control-block">
          <div class="block-title">&gt;&gt; ALTURA (Z)</div>
          <input type="range" min="0" max="200" v-model.number="heightScale" />
          <span class="val">{{ heightScale }}</span>
          <label class="check">
            <input type="checkbox" v-model="invertHeight" /> Invertir relieve
          </label>
        </div>

        <div class="control-block">
          <div class="block-title">&gt;&gt; RESOLUCIÓN</div>
          <input type="range" min="20" max="180" step="10" v-model.number="resolution" />
          <span class="val">{{ resolution }} pts</span>
        </div>

        <div class="control-block">
          <div class="block-title">&gt;&gt; MODO DE DIBUJO</div>
          <div class="mode-buttons">
            <button
              v-for="m in modos"
              :key="m.id"
              class="mode-btn"
              :class="{ active: renderMode === m.id }"
              @click="renderMode = m.id"
            >
              {{ m.label }}
            </button>
          </div>
        </div>

        <div class="control-block">
          <div class="block-title">&gt;&gt; COLOR</div>
          <div class="mode-buttons">
            <button
              v-for="c in coloraciones"
              :key="c.id"
              class="mode-btn"
              :class="{ active: colorMode === c.id }"
              @click="colorMode = c.id"
            >
              {{ c.label }}
            </button>
          </div>
        </div>

        <div class="control-block">
          <div class="block-title">&gt;&gt; VISTA</div>
          <label class="check">
            <input type="checkbox" v-model="autoRotate" /> Rotación automática
          </label>
          <button class="btn-mini" @click="resetVista">↺ RESET VISTA</button>
        </div>

        <div class="control-block hint">
          <div class="block-title">&gt;&gt; CONTROLES</div>
          <p>🖱 Arrastrar = rotar</p>
          <p>🖲 Rueda = zoom</p>
        </div>
      </aside>

      <!-- Lienzo 3D -->
      <main class="canvas-wrap">
        <canvas
          ref="canvas"
          class="canvas3d"
          @mousedown="startDrag"
          @mousemove="onDrag"
          @mouseup="endDrag"
          @mouseleave="endDrag"
          @wheel.prevent="onWheel"
          @touchstart.prevent="startTouch"
          @touchmove.prevent="onTouch"
          @touchend="endDrag"
        ></canvas>
        <div v-if="!hasImage" class="empty-overlay">
          <pre class="ascii-cube">
        +--------+
       /        /|
      /        / |
     +--------+  |
     |        |  +
     |   3D   | /
     |        |/
     +--------+
          </pre>
          <p>SUBE UNA IMAGEN PARA INICIAR LA SIMULACIÓN</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Plano3D',
  data() {
    return {
      imageDataUrl: null,
      hasImage: false,
      heightScale: 90,
      resolution: 90,
      invertHeight: false,
      renderMode: 'solido',
      colorMode: 'imagen',
      autoRotate: true,
      modos: [
        { id: 'puntos', label: 'PUNTOS' },
        { id: 'malla', label: 'MALLA' },
        { id: 'solido', label: 'SÓLIDO' }
      ],
      coloraciones: [
        { id: 'imagen', label: 'IMAGEN' },
        { id: 'altura', label: 'ALTURA' },
        { id: 'matrix', label: 'MATRIX' }
      ],
      // Estado de cámara
      rotX: -0.9,
      rotY: 0.6,
      zoom: 0.7,
      // Datos del heightmap: { grid: Float32Array, colors: Uint8 grid, w, h }
      heightData: null,
      // Drag
      dragging: false,
      lastX: 0,
      lastY: 0,
      rafId: null
    };
  },
  watch: {
    resolution() {
      this.rebuildHeightmap();
    }
  },
  mounted() {
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    this.loop();
  },
  beforeDestroy() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeCanvas);
  },
  methods: {
    resizeCanvas() {
      const canvas = this.$refs.canvas;
      if (!canvas) return;
      const wrap = canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = wrap.clientWidth * dpr;
      canvas.height = wrap.clientHeight * dpr;
      this.dpr = dpr;
    },
    onFileChange(e) {
      const file = e.target.files && e.target.files[0];
      if (file) this.loadFile(file);
    },
    loadFile(file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        this.imageDataUrl = ev.target.result;
        this.hasImage = true;
        this.$nextTick(this.rebuildHeightmap);
      };
      reader.readAsDataURL(file);
    },
    clearImage() {
      this.imageDataUrl = null;
      this.hasImage = false;
      this.heightData = null;
    },
    usarEjemplo() {
      // Genera un "plano" sintético (planta arquitectónica) en un canvas y lo usa como origen
      const c = document.createElement('canvas');
      c.width = 400;
      c.height = 400;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 400, 400);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 8;
      ctx.strokeRect(40, 40, 320, 320);
      ctx.lineWidth = 5;
      ctx.strokeRect(40, 40, 180, 150);
      ctx.strokeRect(220, 40, 140, 150);
      ctx.strokeRect(40, 190, 320, 170);
      ctx.fillStyle = '#888';
      ctx.fillRect(150, 190, 30, 90);
      ctx.fillRect(250, 250, 80, 60);
      ctx.font = 'bold 26px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText('REY PEZ', 110, 130);
      this.imageDataUrl = c.toDataURL();
      this.hasImage = true;
      this.$nextTick(this.rebuildHeightmap);
    },
    rebuildHeightmap() {
      if (!this.imageDataUrl) return;
      const img = new Image();
      img.onload = () => {
        const N = this.resolution;
        const off = document.createElement('canvas');
        off.width = N;
        off.height = N;
        const octx = off.getContext('2d');
        octx.drawImage(img, 0, 0, N, N);
        const data = octx.getImageData(0, 0, N, N).data;
        const grid = new Float32Array(N * N);
        const colors = new Uint8ClampedArray(N * N * 3);
        for (let i = 0; i < N * N; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          // Luminancia normalizada 0..1
          const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          grid[i] = lum;
          colors[i * 3] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;
        }
        this.heightData = { grid, colors, w: N, h: N };
      };
      img.src = this.imageDataUrl;
    },
    resetVista() {
      this.rotX = -0.9;
      this.rotY = 0.6;
      this.zoom = 0.7;
    },
    // --- Interacción ---
    startDrag(e) {
      this.dragging = true;
      this.autoRotate = false;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    },
    onDrag(e) {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.rotY += dx * 0.01;
      this.rotX += dy * 0.01;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    },
    endDrag() {
      this.dragging = false;
    },
    startTouch(e) {
      const t = e.touches[0];
      this.startDrag({ clientX: t.clientX, clientY: t.clientY });
    },
    onTouch(e) {
      const t = e.touches[0];
      this.onDrag({ clientX: t.clientX, clientY: t.clientY });
    },
    onWheel(e) {
      this.zoom *= e.deltaY > 0 ? 0.92 : 1.08;
      this.zoom = Math.min(Math.max(this.zoom, 0.3), 4);
    },
    // --- Render loop ---
    loop() {
      if (this.autoRotate) this.rotY += 0.004;
      this.draw();
      this.rafId = requestAnimationFrame(this.loop);
    },
    project(x, y, z) {
      // Rotación Y luego X, proyección ortográfica con leve perspectiva
      const cy = Math.cos(this.rotY);
      const sy = Math.sin(this.rotY);
      const cx = Math.cos(this.rotX);
      const sx = Math.sin(this.rotX);
      // rotación Y
      let x1 = x * cy - z * sy;
      let z1 = x * sy + z * cy;
      // rotación X
      let y1 = y * cx - z1 * sx;
      let z2 = y * sx + z1 * cx;
      return { x: x1, y: y1, depth: z2 };
    },
    draw() {
      const canvas = this.$refs.canvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      ctx.fillStyle = '#040804';
      ctx.fillRect(0, 0, W, H);
      if (!this.heightData) return;

      const { grid, colors, w: N } = this.heightData;
      const cx = W / 2;
      const cy = H / 2;
      const scale = (Math.min(W, H) / N) * this.zoom * 0.9;
      const hScale = this.heightScale * (Math.min(W, H) / 400) * this.zoom;

      const getZ = (lum) => {
        const v = this.invertHeight ? 1 - lum : lum;
        return v * hScale;
      };
      const colorFor = (idx, lum) => {
        if (this.colorMode === 'imagen') {
          return `rgb(${colors[idx * 3]},${colors[idx * 3 + 1]},${colors[idx * 3 + 2]})`;
        }
        const v = this.invertHeight ? 1 - lum : lum;
        if (this.colorMode === 'matrix') {
          const g = Math.floor(60 + v * 195);
          return `rgb(0,${g},${Math.floor(g * 0.25)})`;
        }
        // altura: gradiente azul->cian->amarillo->rojo
        return this.heatColor(v);
      };

      // Vértices proyectados
      const px = new Float32Array(N * N);
      const py = new Float32Array(N * N);
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const idx = j * N + i;
          const gx = (i - N / 2) * scale;
          const gy = (j - N / 2) * scale;
          const gz = getZ(grid[idx]);
          const p = this.project(gx, gy, gz);
          px[idx] = cx + p.x;
          py[idx] = cy + p.y;
        }
      }

      if (this.renderMode === 'puntos') {
        for (let idx = 0; idx < N * N; idx++) {
          ctx.fillStyle = colorFor(idx, grid[idx]);
          ctx.fillRect(px[idx] - 1, py[idx] - 1, 2.5, 2.5);
        }
        return;
      }

      if (this.renderMode === 'malla') {
        ctx.lineWidth = 1;
        for (let j = 0; j < N; j++) {
          for (let i = 0; i < N - 1; i++) {
            const a = j * N + i;
            ctx.strokeStyle = colorFor(a, grid[a]);
            ctx.beginPath();
            ctx.moveTo(px[a], py[a]);
            ctx.lineTo(px[a + 1], py[a + 1]);
            if (j < N - 1) {
              ctx.moveTo(px[a], py[a]);
              ctx.lineTo(px[a + N], py[a + N]);
            }
            ctx.stroke();
          }
        }
        return;
      }

      // SÓLIDO: quads con painter's algorithm (orden por profundidad)
      const quads = [];
      for (let j = 0; j < N - 1; j++) {
        for (let i = 0; i < N - 1; i++) {
          const a = j * N + i;
          const b = a + 1;
          const c = a + N;
          const d = a + N + 1;
          const lum = (grid[a] + grid[b] + grid[c] + grid[d]) / 4;
          // profundidad media para ordenar
          const gzA = getZ(grid[a]);
          const p = this.project((i - N / 2) * scale, (j - N / 2) * scale, gzA);
          quads.push({ a, b, c, d, lum, depth: p.depth });
        }
      }
      quads.sort((q1, q2) => q1.depth - q2.depth);
      for (const q of quads) {
        ctx.fillStyle = colorFor(q.a, q.lum);
        ctx.beginPath();
        ctx.moveTo(px[q.a], py[q.a]);
        ctx.lineTo(px[q.b], py[q.b]);
        ctx.lineTo(px[q.d], py[q.d]);
        ctx.lineTo(px[q.c], py[q.c]);
        ctx.closePath();
        ctx.fill();
      }
    },
    heatColor(v) {
      // 0 = azul, 0.5 = verde/amarillo, 1 = rojo
      const r = Math.floor(255 * Math.min(1, Math.max(0, v * 2 - 0.2)));
      const g = Math.floor(255 * Math.min(1, Math.max(0, 1 - Math.abs(v - 0.5) * 2)));
      const b = Math.floor(255 * Math.min(1, Math.max(0, 1 - v * 2)));
      return `rgb(${r},${g},${b})`;
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap');

.plano3d {
  --matrix-green: #00ff41;
  --terminal-bg: #0a0a0a;
  --amber: #ffb000;
  min-height: 100vh;
  background: var(--terminal-bg);
  padding: 20px;
  color: var(--matrix-green);
  font-family: 'VT323', 'Share Tech Mono', monospace;
}

.terminal-window {
  background: rgba(0, 20, 0, 0.95);
  border: 2px solid var(--matrix-green);
  margin-bottom: 20px;
  box-shadow: 0 0 30px rgba(0, 255, 65, 0.5);
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

.dot.red {
  background: #ff5f56;
}
.dot.yellow {
  background: #ffbd2e;
}
.dot.green {
  background: var(--matrix-green);
}

.terminal-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.95rem;
  letter-spacing: 2px;
  text-shadow: 0 0 10px var(--matrix-green);
}

.header-section {
  padding: 20px 25px;
}

.main-title {
  font-family: 'VT323', monospace;
  font-size: 2.2rem;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  text-shadow: 0 0 10px var(--matrix-green);
}

.prompt {
  color: var(--amber);
  text-shadow: 0 0 10px var(--amber);
}

.cursor-blink {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.subtitle {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1rem;
  margin: 0 0 12px 0;
  color: var(--amber);
}

.btn-volver {
  display: inline-block;
  color: var(--matrix-green);
  text-decoration: none;
  border: 1px solid var(--matrix-green);
  padding: 6px 14px;
  font-size: 1rem;
  letter-spacing: 1px;
  transition: all 0.2s;
}

.btn-volver:hover {
  background: var(--matrix-green);
  color: var(--terminal-bg);
}

/* Workspace */
.workspace {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-block {
  border: 1px solid rgba(0, 255, 65, 0.4);
  background: rgba(0, 20, 0, 0.8);
  padding: 12px;
}

.block-title {
  color: var(--amber);
  font-size: 1.1rem;
  letter-spacing: 1px;
  margin-bottom: 10px;
}

.upload-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  border: 2px dashed rgba(0, 255, 65, 0.5);
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  overflow: hidden;
}

.upload-zone:hover {
  border-color: var(--matrix-green);
  background: rgba(0, 255, 65, 0.05);
}

.upload-zone.has-image {
  border-style: solid;
}

.upload-text {
  font-size: 1.1rem;
}

.upload-text small {
  color: var(--amber);
  font-size: 0.85rem;
}

.thumb {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
}

.btn-mini {
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  background: transparent;
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  font-family: inherit;
  font-size: 0.95rem;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-mini:hover {
  background: var(--matrix-green);
  color: var(--terminal-bg);
}

input[type='range'] {
  width: 100%;
  accent-color: var(--matrix-green);
}

.val {
  color: var(--amber);
  font-size: 1.1rem;
}

.check {
  display: block;
  margin-top: 8px;
  font-size: 1rem;
  cursor: pointer;
}

.check input {
  accent-color: var(--matrix-green);
}

.mode-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mode-btn {
  flex: 1;
  min-width: 70px;
  padding: 8px 4px;
  background: transparent;
  border: 1px solid rgba(0, 255, 65, 0.5);
  color: var(--matrix-green);
  font-family: inherit;
  font-size: 0.85rem;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:hover {
  border-color: var(--matrix-green);
}

.mode-btn.active {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  font-weight: bold;
}

.hint p {
  margin: 4px 0;
  font-size: 0.95rem;
  color: rgba(0, 255, 65, 0.8);
}

/* Canvas */
.canvas-wrap {
  position: relative;
  border: 2px solid var(--matrix-green);
  background: #040804;
  min-height: 600px;
  box-shadow: inset 0 0 60px rgba(0, 255, 65, 0.08);
}

.canvas3d {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 600px;
  cursor: grab;
}

.canvas3d:active {
  cursor: grabbing;
}

.empty-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: rgba(0, 255, 65, 0.6);
  text-align: center;
}

.ascii-cube {
  font-size: 1rem;
  line-height: 1.2;
  text-shadow: 0 0 10px var(--matrix-green);
}

@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }

  .canvas-wrap,
  .canvas3d {
    min-height: 450px;
  }
}
</style>
