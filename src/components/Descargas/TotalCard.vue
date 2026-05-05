<template>
  <div class="total-card">
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>
    <div class="total-label">&gt; TOTAL DE CAJAS</div>
    <div class="total-num" :class="{ pulse: pulsing }">{{ total }}</div>
    <div class="total-sub">{{ activeCount }} {{ activeCount === 1 ? 'categoría' : 'categorías' }} con cajas</div>
  </div>
</template>

<script>
export default {
  name: 'TotalCard',
  props: {
    total: { type: Number, required: true },
    activeCount: { type: Number, required: true },
    pulsing: { type: Boolean, default: false }
  }
};
</script>

<style scoped>
.total-card {
  position: relative;
  margin: 14px 14px 0;
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

.total-label {
  font-size: 0.95rem;
  letter-spacing: 3px;
  color: var(--amber);
  text-shadow: 0 0 10px var(--amber-glow);
}

.total-num {
  font-family: 'Share Tech Mono', monospace;
  font-size: 76px;
  font-weight: 700;
  line-height: 1;
  margin: 8px 0 6px;
  color: var(--matrix-green);
  text-shadow: 0 0 25px var(--matrix-green), 0 0 8px var(--matrix-green);
  letter-spacing: 2px;
}

.total-sub {
  font-size: 1rem;
  color: var(--matrix-green-dark-text);
  letter-spacing: 1px;
}

@keyframes total-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); text-shadow: 0 0 35px var(--matrix-green), 0 0 15px var(--matrix-green); }
  100% { transform: scale(1); }
}

.total-num.pulse {
  animation: total-pulse 0.35s ease;
}
</style>
