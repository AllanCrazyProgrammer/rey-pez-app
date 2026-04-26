<template>
  <nav class="toolbar" aria-label="Acciones de cuenta de fletes">
    <button type="button" class="terminal-btn ghost" @click="$emit('volver')">
      &lt; VOLVER_MENU
    </button>

    <div class="toolbar-actions">
      <button
        type="button"
        class="terminal-btn"
        :disabled="cargando"
        :aria-busy="cargando ? 'true' : 'false'"
        @click="$emit('refrescar')"
      >
        {{ cargando ? 'SYNC...' : 'REFRESH' }}
      </button>
      <button
        type="button"
        class="terminal-btn accent"
        :disabled="imprimiendo || cargando"
        :aria-busy="imprimiendo ? 'true' : 'false'"
        @click="$emit('imprimir')"
      >
        {{ imprimiendo ? 'GENERANDO_PDF...' : 'IMPRIMIR_PENDIENTE' }}
      </button>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'CuentaFletesToolbar',
  props: {
    cargando: {
      type: Boolean,
      default: false
    },
    imprimiendo: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style scoped>
.toolbar {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--terminal-border);
  background: rgba(0, 0, 0, 0.28);
}

.toolbar-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar-actions {
  justify-content: flex-end;
}

.terminal-btn {
  min-height: 44px;
  border: 1px solid var(--matrix-green);
  background: transparent;
  color: var(--matrix-green);
  padding: 10px 16px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.92rem;
  letter-spacing: 0.7px;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.terminal-btn:hover:not(:disabled),
.terminal-btn.active {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 14px var(--matrix-green-glow);
}

.terminal-btn.accent {
  border-color: var(--amber);
  color: var(--amber);
}

.terminal-btn.accent:hover:not(:disabled) {
  background: var(--amber);
  color: #070707;
  box-shadow: 0 0 14px rgba(255, 176, 0, 0.45);
}

.terminal-btn.ghost {
  color: #9ef8b5;
}

.terminal-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .toolbar {
    grid-template-columns: 1fr;
  }

  .toolbar-actions {
    justify-content: stretch;
  }

  .terminal-btn {
    flex: 1 1 180px;
  }
}
</style>
