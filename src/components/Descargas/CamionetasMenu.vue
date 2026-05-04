<template>
  <div class="cam-menu">
    <div class="cam-header">
      <span class="cam-day-label">{{ dayLabel }}</span>
      <button class="ghost-btn" @click="$emit('new-camioneta')">⊕ Nueva Camioneta</button>
    </div>

    <div v-if="camionetas.length === 0" class="cam-empty">
      // Sin camionetas — registra la primera
    </div>

    <div v-else class="cam-list">
      <div
        v-for="cam in camionetas"
        :key="cam.id"
        class="cam-row"
        @click="$emit('select', cam.id)"
      >
        <div class="cam-row-left">
          <div class="cam-plate">{{ cam.plate || '(sin placa)' }}</div>
          <div class="cam-meta">
            <span v-if="cam.provider" class="cam-provider">// {{ cam.provider }}</span>
            <span class="cam-time">{{ formatTime(cam.startedAt) }}</span>
          </div>
          <div class="cam-tallas" v-if="getCategoriasConCajas(cam).length > 0">
            <span
              v-for="cat in getCategoriasConCajas(cam)"
              :key="cat.id"
              class="cam-talla-tag"
            >{{ cat.name }}: {{ cat.count }}</span>
          </div>
        </div>
        <div class="cam-row-right">
          <div class="cam-total">
            <span class="cam-num">{{ getTotal(cam) }}</span>
            <span class="cam-unit"> cajas</span>
          </div>
          <button class="cam-del" @click.stop="$emit('delete', cam.id)" title="Eliminar camioneta">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CamionetasMenu',
  props: {
    camionetas: { type: Array, required: true },
    dayLabel:   { type: String, default: '' }
  },
  methods: {
    getTotal(cam) {
      if (!Array.isArray(cam.categories)) return 0;
      return cam.categories.reduce((s, c) => s + (Number(c.count) || 0), 0);
    },
    getCategoriasConCajas(cam) {
      if (!Array.isArray(cam.categories)) return [];
      return cam.categories.filter(c => Number(c.count) > 0);
    },
    formatTime(ts) {
      if (!ts) return '';
      const d = new Date(ts);
      return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
  }
};
</script>

<style scoped>
.cam-menu {
  margin: 0 14px;
  padding-bottom: 30px;
  font-family: 'VT323', 'Share Tech Mono', monospace;
}

.cam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 4px 14px;
  border-bottom: 1px solid var(--matrix-green-dark);
  margin-bottom: 10px;
}

.cam-day-label {
  font-size: 1rem;
  letter-spacing: 2px;
  color: var(--amber);
  text-shadow: 0 0 8px var(--amber-glow);
}

.ghost-btn {
  background: transparent;
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  padding: 6px 14px;
  font-size: 1rem;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 1px;
}
.ghost-btn:hover {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 12px var(--matrix-green-dim);
}

.cam-empty {
  padding: 40px 4px;
  color: var(--matrix-green-dark-text);
  letter-spacing: 1px;
  font-size: 0.95rem;
  opacity: 0.6;
}

.cam-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cam-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 14px 12px;
  border: 1px solid var(--matrix-green-dark);
  background: rgba(0, 255, 65, 0.03);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  gap: 10px;
}
.cam-row:hover {
  background: rgba(0, 255, 65, 0.08);
  border-color: var(--matrix-green);
  box-shadow: 0 0 10px var(--matrix-green-dim);
}

.cam-row-left { flex: 1; min-width: 0; }

.cam-plate {
  font-size: 1.2rem;
  color: var(--cyan);
  letter-spacing: 2px;
  text-shadow: 0 0 6px rgba(0, 212, 255, 0.5);
}

.cam-meta {
  display: flex;
  gap: 10px;
  margin-top: 3px;
  font-size: 0.85rem;
  letter-spacing: 1px;
}
.cam-provider { color: var(--amber); text-shadow: 0 0 5px var(--amber-glow); }
.cam-time     { color: var(--matrix-green-dark-text); opacity: 0.7; }

.cam-tallas {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.cam-talla-tag {
  background: rgba(0, 255, 65, 0.1);
  border: 1px solid var(--matrix-green-dark);
  color: var(--matrix-green);
  padding: 2px 8px;
  font-size: 0.8rem;
  letter-spacing: 1px;
}

.cam-row-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding-top: 2px;
}

.cam-total { text-align: right; }
.cam-num {
  font-size: 1.5rem;
  color: var(--matrix-green);
  text-shadow: 0 0 8px var(--matrix-green-glow);
}
.cam-unit {
  font-size: 0.75rem;
  color: var(--matrix-green-dark-text);
  letter-spacing: 1px;
}

.cam-del {
  background: transparent;
  border: 1px solid #ff6b6b;
  color: #ff6b6b;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
  flex-shrink: 0;
  font-family: inherit;
  transition: background 0.15s;
}
.cam-del:hover {
  background: #ff6b6b;
  color: var(--terminal-bg);
  box-shadow: 0 0 8px rgba(255, 107, 107, 0.5);
}

@media (max-width: 480px) {
  .cam-plate { font-size: 1rem; }
  .cam-num   { font-size: 1.2rem; }
  .ghost-btn { font-size: 0.85rem; padding: 6px 10px; }
}
</style>
