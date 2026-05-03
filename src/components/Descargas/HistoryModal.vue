<template>
  <div v-if="show" class="modal-bg" @click.self="$emit('close')">
    <div class="dialog">
      <h3>Historial de movimientos</h3>
      <div class="log">
        <div v-if="!entries.length" class="empty">&gt; Sin movimientos</div>
        <div
          v-for="(e, idx) in entries"
          :key="idx"
          class="log-row"
        >
          <div class="row-left">
            <span class="t">{{ formatTime(e.t) }}</span>
            <span class="dot">·</span>
            <span class="cat">{{ e.catName }}</span>
            <span v-if="isStiba(e)" class="src">[{{ e.source }}]</span>
          </div>
          <div class="row-right" :class="rowClass(e)">
            {{ e.delta > 0 ? '+' : '' }}{{ e.delta }} ({{ e.total }})
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-primary" @click="$emit('close')">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HistoryModal',
  props: {
    show: { type: Boolean, default: false },
    entries: { type: Array, default: () => [] }
  },
  methods: {
    formatTime(t) {
      const d = new Date(t);
      return String(d.getHours()).padStart(2, '0') + ':' +
             String(d.getMinutes()).padStart(2, '0') + ':' +
             String(d.getSeconds()).padStart(2, '0');
    },
    isStiba(e) {
      return e.source && String(e.source).indexOf('estiba') === 0;
    },
    rowClass(e) {
      if (this.isStiba(e)) return 'stiba';
      return e.delta > 0 ? 'plus' : 'minus';
    }
  }
};
</script>

<style scoped>
.modal-bg {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1400;
  font-family: 'VT323', 'Share Tech Mono', monospace;
}
.dialog {
  background: var(--terminal-bg, #0a0a0a);
  border: 2px solid var(--matrix-green);
  padding: 22px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 0 25px var(--matrix-green-glow);
}
.dialog h3 {
  margin: 0 0 12px;
  font-size: 1.3rem;
  color: var(--matrix-green);
  letter-spacing: 2px;
  text-shadow: 0 0 10px var(--matrix-green-dim);
}

.log {
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid var(--matrix-green);
  background: rgba(0, 20, 0, 0.5);
  padding: 4px 8px;
}
.empty {
  color: var(--amber);
  padding: 12px;
  text-align: center;
  font-size: 1rem;
  letter-spacing: 1px;
}
.log-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px;
  border-bottom: 1px dashed var(--matrix-green-dim);
  font-size: 1rem;
  gap: 8px;
}
.log-row:last-child { border-bottom: none; }

.row-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  color: var(--matrix-green);
}
.t {
  color: var(--amber);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
  letter-spacing: 1px;
}
.dot { color: var(--matrix-green-dark-text); }
.cat { letter-spacing: 1px; }
.src {
  color: var(--cyan);
  font-size: 0.8rem;
  letter-spacing: 1px;
}

.row-right {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1rem;
  letter-spacing: 1px;
  white-space: nowrap;
}
.row-right.plus { color: var(--matrix-green); text-shadow: 0 0 8px var(--matrix-green-dim); }
.row-right.minus { color: var(--amber); text-shadow: 0 0 8px var(--amber-glow); }
.row-right.stiba { color: var(--cyan); text-shadow: 0 0 8px rgba(0, 212, 255, 0.5); }

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
.modal-actions button {
  flex: 1;
  padding: 14px;
  border: 1px solid var(--matrix-green);
  background: transparent;
  color: var(--matrix-green);
  font-weight: 600;
  cursor: pointer;
  font-family: 'VT323', 'Share Tech Mono', monospace;
  font-size: 1.1rem;
  letter-spacing: 2px;
  min-height: 48px;
}
.btn-primary {
  background: rgba(0, 255, 65, 0.12);
}
.btn-primary:hover {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 20px var(--matrix-green-glow);
}
</style>
