<template>
  <div class="resumen-wrap">
    <div class="resumen-card">
      <div class="corner tl"></div>
      <div class="corner tr"></div>
      <div class="corner bl"></div>
      <div class="corner br"></div>

      <div class="resumen-title">&gt; RESUMEN DEL DÍA</div>
      <div class="resumen-grand" :class="{ pulse: false }">{{ granTotal }}</div>
      <div class="resumen-sub">
        {{ camionetasCount }} {{ camionetasCount === 1 ? 'camioneta' : 'camionetas' }} ·
        {{ medidas.length }} {{ medidas.length === 1 ? 'medida' : 'medidas' }}
      </div>
    </div>

    <div class="section-title">
      <span>&gt; TOTAL POR MEDIDA</span>
    </div>

    <div v-if="medidas.length === 0" class="resumen-empty">
      // Sin cajas registradas en ninguna camioneta
    </div>

    <ul v-else class="medida-list">
      <li v-for="m in medidas" :key="m.name" class="medida-row">
        <span class="medida-name">{{ m.name }}</span>
        <span class="medida-bar">
          <span class="medida-fill" :style="{ width: barWidth(m.total) }"></span>
        </span>
        <span class="medida-total">{{ m.total }}</span>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: 'ResumenDescarga',
  props: {
    // [{ name: String, total: Number }] ya ordenado desc por total
    medidas: { type: Array, required: true },
    granTotal: { type: Number, required: true },
    camionetasCount: { type: Number, default: 0 }
  },
  computed: {
    maxTotal() {
      return this.medidas.reduce((m, x) => Math.max(m, Number(x.total) || 0), 0);
    }
  },
  methods: {
    barWidth(total) {
      if (!this.maxTotal) return '0%';
      const pct = (Number(total) || 0) / this.maxTotal * 100;
      return Math.max(4, pct) + '%';
    }
  }
};
</script>

<style scoped>
.resumen-wrap {
  margin: 0 14px;
}

.resumen-card {
  position: relative;
  margin: 14px 0 0;
  padding: 22px 18px;
  background: rgba(0, 30, 0, 0.85);
  border: 2px solid var(--matrix-green);
  text-align: center;
  box-shadow: 0 0 25px var(--matrix-green-glow), inset 0 0 30px rgba(0, 255, 65, 0.04);
  font-family: 'VT323', 'Share Tech Mono', monospace;
}

.corner {
  position: absolute;
  width: 14px;
  height: 14px;
  border-color: var(--amber);
  border-style: solid;
}
.corner.tl { top: 4px; left: 4px; border-width: 2px 0 0 2px; }
.corner.tr { top: 4px; right: 4px; border-width: 2px 2px 0 0; }
.corner.bl { bottom: 4px; left: 4px; border-width: 0 0 2px 2px; }
.corner.br { bottom: 4px; right: 4px; border-width: 0 2px 2px 0; }

.resumen-title {
  font-size: 0.95rem;
  letter-spacing: 3px;
  color: var(--amber);
  text-shadow: 0 0 10px var(--amber-glow);
}

.resumen-grand {
  font-family: 'Share Tech Mono', monospace;
  font-size: 76px;
  font-weight: 700;
  line-height: 1;
  margin: 8px 0 6px;
  color: var(--matrix-green);
  text-shadow: 0 0 25px var(--matrix-green), 0 0 8px var(--matrix-green);
  letter-spacing: 2px;
}

.resumen-sub {
  font-size: 1rem;
  color: var(--matrix-green-dark-text);
  letter-spacing: 1px;
}

.section-title {
  font-size: 1rem;
  letter-spacing: 2px;
  color: var(--amber);
  text-shadow: 0 0 8px var(--amber-glow);
  margin: 18px 4px 8px;
}

.resumen-empty {
  color: var(--matrix-green-dark-text);
  font-family: 'VT323', 'Share Tech Mono', monospace;
  font-size: 1rem;
  letter-spacing: 1px;
  opacity: 0.6;
  padding: 16px 4px;
}

.medida-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.medida-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--matrix-green-dark);
  background: rgba(0, 255, 65, 0.03);
  margin-bottom: 6px;
  font-family: 'VT323', 'Share Tech Mono', monospace;
}

.medida-name {
  flex: 0 0 34%;
  min-width: 0;
  font-size: 1.2rem;
  letter-spacing: 1px;
  color: var(--matrix-green);
  text-shadow: 0 0 6px var(--matrix-green-glow);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.medida-bar {
  flex: 1;
  height: 12px;
  background: rgba(0, 255, 65, 0.06);
  border: 1px solid var(--matrix-green-dim);
  position: relative;
  overflow: hidden;
}

.medida-fill {
  display: block;
  height: 100%;
  background: var(--matrix-green);
  box-shadow: 0 0 10px var(--matrix-green-glow);
  transition: width 0.3s ease;
}

.medida-total {
  flex: 0 0 auto;
  min-width: 48px;
  text-align: right;
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--matrix-green);
  text-shadow: 0 0 8px var(--matrix-green);
}

@media (max-width: 480px) {
  .medida-name { flex-basis: 40%; font-size: 1.05rem; }
  .medida-total { font-size: 1.2rem; min-width: 40px; }
}
</style>
