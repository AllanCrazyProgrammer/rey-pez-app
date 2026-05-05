<template>
  <div class="active-card">
    <div class="active-label">&gt; CONTANDO AHORA</div>
    <div class="active-name">{{ name }}</div>
    <div class="active-count" :class="{ pulse: pulsing }">{{ count }}</div>
    <div class="counter-row">
      <button
        type="button"
        class="btn btn-sub"
        @click.prevent="$emit('sub')"
        @touchstart.prevent="$emit('sub')"
      >− 1</button>
      <button
        type="button"
        class="btn btn-add"
        @click.prevent="$emit('add')"
        @touchstart.prevent="$emit('add')"
      >+ 1</button>
    </div>
    <button type="button" class="btn btn-stiba" @click="$emit('open-stiba')">
      ▦ Agregar estiba (4 × 6, etc.)
    </button>
  </div>
</template>

<script>
export default {
  name: 'ActiveCounter',
  props: {
    name: { type: String, default: '—' },
    count: { type: Number, default: 0 },
    pulsing: { type: Boolean, default: false }
  }
};
</script>

<style scoped>
.active-card {
  background: rgba(0, 20, 0, 0.85);
  border: 1px solid var(--matrix-green);
  padding: 14px;
  box-shadow: 0 0 15px var(--matrix-green-dim);
  font-family: 'VT323', 'Share Tech Mono', monospace;
}

.active-label {
  font-size: 0.85rem;
  letter-spacing: 2px;
  color: var(--amber);
  text-shadow: 0 0 8px var(--amber-glow);
  margin-bottom: 6px;
}

.active-name {
  font-size: 1.4rem;
  font-weight: 400;
  color: var(--matrix-green);
  margin-bottom: 4px;
  letter-spacing: 2px;
  text-shadow: 0 0 8px var(--matrix-green-dim);
}

.active-count {
  font-family: 'Share Tech Mono', monospace;
  font-size: 44px;
  font-weight: 700;
  color: var(--matrix-green);
  margin-bottom: 14px;
  text-shadow: 0 0 18px var(--matrix-green);
  letter-spacing: 2px;
}

.counter-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.btn {
  border: 1px solid var(--matrix-green);
  background: transparent;
  font-weight: 700;
  font-size: 1.4rem;
  padding: 22px 0;
  cursor: pointer;
  font-family: 'VT323', 'Share Tech Mono', monospace;
  letter-spacing: 2px;
  color: var(--matrix-green);
  min-height: 64px;
  transition: transform 0.08s, box-shadow 0.15s, background 0.15s;
  text-shadow: 0 0 8px var(--matrix-green-dim);
  touch-action: manipulation;
}

.btn:active {
  transform: scale(0.96);
}

.btn-add {
  background: rgba(0, 255, 65, 0.12);
  color: var(--matrix-green);
  border-color: var(--matrix-green);
  font-size: 1.7rem;
  box-shadow: 0 0 15px var(--matrix-green-dim);
}

.btn-add:hover {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 25px var(--matrix-green-glow);
}

.btn-sub {
  background: transparent;
  color: var(--amber);
  border-color: var(--amber);
  font-size: 1.5rem;
}

.btn-sub:hover {
  background: var(--amber);
  color: var(--terminal-bg);
  box-shadow: 0 0 20px var(--amber-glow);
}

.btn-stiba {
  width: 100%;
  background: rgba(0, 212, 255, 0.1);
  color: var(--cyan);
  border-color: var(--cyan);
  font-size: 1.1rem;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-shadow: 0 0 8px rgba(0, 212, 255, 0.5);
}

.btn-stiba:hover {
  background: var(--cyan);
  color: var(--terminal-bg);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
}

@keyframes count-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.14); text-shadow: 0 0 35px var(--matrix-green); }
  100% { transform: scale(1); }
}
.active-count.pulse {
  animation: count-pulse 0.3s ease;
}
</style>
