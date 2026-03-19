<template>
  <div v-if="isOpen" class="cfg-overlay" @click.self="$emit('close')">
    <div class="cfg-modal">
      <div class="cfg-header">
        <h3>Medidas disponibles en el selector</h3>
        <button class="close-btn" type="button" @click="$emit('close')">×</button>
      </div>

      <p class="cfg-desc">
        Define qué medidas aparecerán en el menú desplegable. Puedes agregarlas manualmente o
        seleccionarlas desde las medidas registradas en el sistema.
      </p>

      <!-- Agregar manualmente -->
      <div class="add-section">
        <label class="section-label">Agregar medida</label>
        <div class="add-row">
          <input
            ref="newInput"
            v-model.trim="newMedida"
            type="text"
            class="add-input"
            placeholder="Ej. 71/90"
            @keydown.enter.prevent="agregarManual"
          />
          <button class="add-btn" type="button" :disabled="!newMedida" @click="agregarManual">
            + Agregar
          </button>
        </div>
      </div>

      <!-- Lista actual del usuario -->
      <div class="current-section">
        <div class="section-header-row">
          <label class="section-label">Medidas configuradas</label>
          <span class="count-badge">{{ lista.length }}</span>
          <button
            v-if="lista.length > 0"
            class="clear-btn"
            type="button"
            @click="lista = []"
          >
            Limpiar todo
          </button>
        </div>

        <div v-if="lista.length === 0" class="empty-hint">
          Aún no has agregado ninguna medida. Agrega manualmente o desde el sistema.
        </div>

        <div v-else class="chips-list">
          <div
            v-for="(name, i) in lista"
            :key="name"
            class="chip"
          >
            <span>{{ name }}</span>
            <button class="chip-remove" type="button" @click="lista.splice(i, 1)">×</button>
          </div>
        </div>
      </div>

      <div class="cfg-actions">
        <button class="secondary-btn" type="button" @click="$emit('close')">Cancelar</button>
        <button class="primary-btn" type="button" @click="save">Guardar</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MedidasDisponiblesConfigModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    medidasActivas: {
      type: Array,
      default: () => []
    },
    medidasDelSistema: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      lista: [],
      newMedida: ''
    };
  },
  watch: {
    isOpen(val) {
      if (val) {
        this.lista = [...this.medidasActivas];
        this.newMedida = '';
      }
    }
  },
  methods: {
    agregarManual() {
      const val = this.newMedida.trim();
      if (!val) return;
      if (!this.lista.includes(val)) {
        this.lista.push(val);
      }
      this.newMedida = '';
      this.$nextTick(() => this.$refs.newInput?.focus());
    },
    save() {
      this.$emit('update', [...this.lista]);
      this.$emit('close');
    }
  }
};
</script>

<style scoped>
.cfg-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4000;
  padding: 16px;
}

.cfg-modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: min(96vw, 660px);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.cfg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.cfg-header h3 {
  margin: 0;
  color: #3760b0;
  font-size: 1.1rem;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  color: #666;
  flex-shrink: 0;
}

.cfg-desc {
  margin: 0;
  color: #666;
  font-size: 0.87rem;
  line-height: 1.5;
  flex-shrink: 0;
}

/* Sections */
.add-section,
.current-section,
.system-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.current-section {
  flex-shrink: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.section-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #3760b0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.section-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-badge {
  background: #3760b0;
  color: white;
  border-radius: 10px;
  padding: 1px 8px;
  font-size: 0.78rem;
  font-weight: 700;
}

.clear-btn {
  margin-left: auto;
  background: none;
  border: none;
  color: #b91c1c;
  font-size: 0.82rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.clear-btn:hover {
  background: #fee2e2;
}

/* Add row */
.add-row {
  display: flex;
  gap: 8px;
}

.add-input {
  flex: 1;
  border: 1px solid #cfd7e6;
  border-radius: 6px;
  padding: 9px 12px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.add-input:focus {
  outline: none;
  border-color: #3760b0;
  box-shadow: 0 0 0 2px rgba(55, 96, 176, 0.15);
}

.add-btn {
  background: #3760b0;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 9px 16px;
  font-size: 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.12s;
}

.add-btn:hover:not(:disabled) {
  background: #2a4a87;
}

.add-btn:disabled {
  background: #a0b4d8;
  cursor: not-allowed;
}

/* Chips */
.chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  overflow-y: auto;
  padding: 4px 2px;
  flex: 1;
}

.empty-hint {
  color: #999;
  font-size: 0.88rem;
  font-style: italic;
  padding: 8px 2px;
}

.chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #e0ebff;
  border: 1px solid #3760b0;
  border-radius: 20px;
  padding: 5px 10px 5px 12px;
  font-size: 0.9rem;
  color: #24457f;
  font-weight: 600;
}

.chip-remove {
  background: none;
  border: none;
  color: #3760b0;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0 2px;
  border-radius: 50%;
  transition: background 0.1s;
}

.chip-remove:hover {
  background: rgba(55, 96, 176, 0.15);
}

/* Actions */
.cfg-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.secondary-btn,
.primary-btn {
  border: none;
  border-radius: 6px;
  padding: 9px 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.12s;
}

.secondary-btn {
  background: #eceff4;
  color: #333;
}

.secondary-btn:hover {
  background: #dde2ea;
}

.primary-btn {
  background: #3760b0;
  color: white;
}

.primary-btn:hover {
  background: #2a4a87;
}

@media (max-width: 480px) {
  .cfg-modal {
    padding: 18px 14px;
    gap: 12px;
  }

  .cfg-actions {
    flex-direction: column-reverse;
  }

  .secondary-btn,
  .primary-btn {
    width: 100%;
  }

}
</style>
