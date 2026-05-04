<template>
  <div class="days-menu">
    <div class="dm-header">
      <span class="dm-title">&gt; SESIONES_POR_DIA</span>
      <button class="ghost-btn" @click="$emit('new-day')">⊕ Nuevo Día</button>
    </div>

    <div v-if="days.length === 0" class="dm-empty">
      <div>// Sin días registrados — crea uno nuevo</div>
      <div class="dm-debug">
        <span v-if="storageCount > 0" class="dm-debug-warn">
          ⚠ localStorage tiene {{ storageCount }} día(s) sin cargar
        </span>
        <span v-else-if="storageCount === 0" class="dm-debug-ok">
          // storage vacío — aún no hay datos guardados
        </span>
        <span v-else class="dm-debug-err">
          // error al leer storage
        </span>
        <button class="dm-reload-btn" @click="$emit('reload')">↺ Recargar</button>
      </div>
    </div>

    <div v-else class="dm-list">
      <div
        v-for="day in sortedDays"
        :key="day.id"
        class="dm-row"
        @click="$emit('select', day.id)"
      >
        <div class="dm-row-left">
          <div class="dm-date">{{ formatLabel(day.date) }}</div>
          <div class="dm-meta">
            <span v-if="getFirstPlate(day)" class="dm-plate">{{ getFirstPlate(day) }}</span>
            <span v-if="getFirstPlate(day) && getFirstProvider(day)" class="dm-sep">//</span>
            <span v-if="getFirstProvider(day)" class="dm-provider">{{ getFirstProvider(day) }}</span>
            <span v-if="day.camionetas && day.camionetas.length > 1" class="dm-cam-count">+{{ day.camionetas.length - 1 }} más</span>
            <span v-if="!getFirstPlate(day) && !getFirstProvider(day)" class="dm-noinfo">sin datos</span>
          </div>
        </div>
        <div class="dm-row-right">
          <div class="dm-total">
            <span class="dm-num">{{ getTotal(day) }}</span>
            <span class="dm-unit"> cajas</span>
          </div>
          <button class="dm-del" @click.stop="$emit('delete', day.id)" title="Eliminar día">✕</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default {
  name: 'DaysMenu',
  props: {
    days:         { type: Array, required: true },
    storageCount: { type: Number, default: 0 }
  },
  computed: {
    sortedDays() {
      return [...this.days].sort((a, b) => b.date.localeCompare(a.date));
    }
  },
  methods: {
    getFirstCam(day) {
      return (Array.isArray(day.camionetas) && day.camionetas.length > 0) ? day.camionetas[0] : null;
    },
    getFirstPlate(day) {
      const cam = this.getFirstCam(day);
      return cam ? cam.plate : '';
    },
    getFirstProvider(day) {
      const cam = this.getFirstCam(day);
      return cam ? cam.provider : '';
    },
    getTotal(day) {
      // New format: camionetas array
      if (Array.isArray(day.camionetas)) {
        return day.camionetas.reduce((total, cam) => {
          if (!Array.isArray(cam.categories)) return total;
          return total + cam.categories.reduce((s, c) => s + (Number(c.count) || 0), 0);
        }, 0);
      }
      // Legacy format: state object
      if (day.state && Array.isArray(day.state.categories)) {
        return day.state.categories.reduce((s, c) => s + (Number(c.count) || 0), 0);
      }
      return 0;
    },
    formatLabel(dateISO) {
      const [y, m, d] = dateISO.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return `${DIAS[date.getDay()]} ${String(d).padStart(2, '0')} ${MESES[m - 1]} ${y}`;
    }
  }
};
</script>

<style scoped>
.days-menu {
  margin: 0 14px;
  padding-bottom: 30px;
  font-family: 'VT323', 'Share Tech Mono', monospace;
}

.dm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 4px 14px;
  border-bottom: 1px solid var(--matrix-green-dark);
  margin-bottom: 10px;
}

.dm-title {
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

.dm-empty {
  padding: 40px 4px;
  color: var(--matrix-green-dark-text);
  letter-spacing: 1px;
  font-size: 0.95rem;
  opacity: 0.6;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dm-debug {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 0.8rem;
}
.dm-debug-warn { color: var(--amber); opacity: 1; }
.dm-debug-ok   { color: var(--matrix-green-dark-text); }
.dm-debug-err  { color: #ff6b6b; opacity: 1; }
.dm-reload-btn {
  background: transparent;
  border: 1px solid var(--matrix-green-dark);
  color: var(--matrix-green);
  padding: 4px 12px;
  font-family: inherit;
  font-size: 0.85rem;
  cursor: pointer;
  letter-spacing: 1px;
  opacity: 0.8;
}
.dm-reload-btn:hover {
  border-color: var(--matrix-green);
  opacity: 1;
  background: rgba(0, 255, 65, 0.06);
}

.dm-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 12px;
  border: 1px solid var(--matrix-green-dark);
  background: rgba(0, 255, 65, 0.03);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  gap: 10px;
}
.dm-row:hover {
  background: rgba(0, 255, 65, 0.08);
  border-color: var(--matrix-green);
  box-shadow: 0 0 10px var(--matrix-green-dim);
}

.dm-row-left { flex: 1; min-width: 0; }

.dm-date {
  font-size: 1.15rem;
  color: var(--matrix-green);
  letter-spacing: 2px;
  text-shadow: 0 0 6px var(--matrix-green-glow);
}

.dm-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 3px;
  font-size: 0.85rem;
  letter-spacing: 1px;
}
.dm-plate     { color: var(--cyan); text-shadow: 0 0 5px rgba(0,212,255,0.4); }
.dm-sep       { color: var(--matrix-green-dark-text); opacity: 0.5; }
.dm-provider  { color: var(--amber); text-shadow: 0 0 5px var(--amber-glow); }
.dm-cam-count { color: var(--matrix-green-dark-text); opacity: 0.55; font-size: 0.78rem; }
.dm-noinfo    { color: var(--matrix-green-dark-text); opacity: 0.4; font-size: 0.8rem; }

.dm-row-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.dm-total { text-align: right; }
.dm-num {
  font-size: 1.5rem;
  color: var(--matrix-green);
  text-shadow: 0 0 8px var(--matrix-green-glow);
}
.dm-unit {
  font-size: 0.75rem;
  color: var(--matrix-green-dark-text);
  letter-spacing: 1px;
}

.dm-del {
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
.dm-del:hover {
  background: #ff6b6b;
  color: var(--terminal-bg);
  box-shadow: 0 0 8px rgba(255,107,107,0.5);
}

@media (max-width: 480px) {
  .dm-date { font-size: 1rem; letter-spacing: 1px; }
  .dm-num  { font-size: 1.2rem; }
}
</style>
