<template>
  <div
    v-if="visible && precio"
    class="editor-overlay"
    :style="{ top: `${topOffset}px` }"
    @click.self="$emit('close')"
  >
    <div class="editor-modal">
      <div class="editor-header">
        <div>
          <h3>Editar precio actual</h3>
          <p class="editor-subtitle">Actualiza el precio vigente de la medida seleccionada.</p>
        </div>
        <button class="close-btn" type="button" @click="$emit('close')" :disabled="guardando">
          ✕
        </button>
      </div>

      <div class="editor-summary">
        <div class="summary-item">
          <span class="summary-label">Medida</span>
          <strong>{{ precio.producto }}</strong>
        </div>
        <div class="summary-item">
          <span class="summary-label">Aplica para</span>
          <strong>{{ alcanceTexto }}</strong>
        </div>
      </div>

      <form class="editor-form" @submit.prevent="emitirGuardado">
        <label class="form-field">
          <span>Precio actual</span>
          <input
            v-model.number="form.precio"
            type="number"
            min="0"
            step="0.01"
            placeholder="Ingresa el precio"
            required
          >
        </label>

        <label class="form-field">
          <span>Fecha actual</span>
          <input
            v-model="form.fecha"
            type="date"
            required
          >
        </label>

        <div class="editor-actions">
          <button type="button" class="secondary-btn" @click="$emit('close')" :disabled="guardando">
            Cancelar
          </button>
          <button type="submit" class="primary-btn" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PrecioActualEditorModal',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    precio: {
      type: Object,
      default: null
    },
    clientes: {
      type: Array,
      default: () => []
    },
    guardando: {
      type: Boolean,
      default: false
    },
    topOffset: {
      type: Number,
      default: 24
    }
  },
  data() {
    return {
      form: {
        precio: null,
        fecha: ''
      }
    };
  },
  computed: {
    alcanceTexto() {
      if (!this.precio?.clienteId) {
        return 'Todos los clientes';
      }

      const cliente = this.clientes.find((item) => item.id === this.precio.clienteId);
      return cliente ? cliente.nombre : 'Cliente especifico';
    }
  },
  watch: {
    visible: {
      immediate: true,
      handler(value) {
        if (value) {
          this.sincronizarFormulario();
        }
      }
    },
    precio: {
      deep: true,
      handler() {
        if (this.visible) {
          this.sincronizarFormulario();
        }
      }
    }
  },
  methods: {
    obtenerFechaActual() {
      return new Date().toISOString().split('T')[0];
    },
    sincronizarFormulario() {
      this.form = {
        precio: this.precio?.precio ?? null,
        fecha: this.obtenerFechaActual()
      };
    },
    emitirGuardado() {
      this.$emit('save', {
        id: this.precio?.id,
        producto: this.precio?.producto,
        clienteId: this.precio?.clienteId || '',
        precio: this.form.precio,
        fecha: this.form.fecha
      });
    }
  }
};
</script>

<style scoped>
.editor-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 1003;
  padding: 20px;
}

.editor-modal {
  width: min(100%, 480px);
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #ececec;
}

.editor-header h3 {
  margin: 0;
  color: #2c3e50;
}

.editor-subtitle {
  margin: 6px 0 0;
  color: #666;
  font-size: 0.95rem;
}

.close-btn {
  border: none;
  background: transparent;
  color: #666;
  font-size: 1.4rem;
  cursor: pointer;
}

.editor-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 18px 20px 0;
}

.summary-item {
  padding: 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f7f9fb, #eef2f6);
  border: 1px solid #e4e8ed;
}

.summary-item strong {
  color: #000;
}

.summary-label {
  display: block;
  color: #6b7280;
  font-size: 0.85rem;
  margin-bottom: 6px;
}

.editor-form {
  padding: 20px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  color: #374151;
  font-weight: 600;
}

.form-field input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #d6dbe2;
  border-radius: 10px;
  background: #f9fafb;
  font-size: 1rem;
  color: #1f2937;
}

.form-field input:focus {
  outline: none;
  border-color: #2196F3;
  box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.15);
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.secondary-btn,
.primary-btn {
  border: none;
  border-radius: 10px;
  padding: 12px 18px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.95rem;
}

.secondary-btn {
  background: #e5e7eb;
  color: #374151;
}

.primary-btn {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  box-shadow: 0 8px 18px rgba(217, 119, 6, 0.25);
}

.secondary-btn:disabled,
.primary-btn:disabled,
.close-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .editor-overlay {
    padding: 12px;
  }

  .editor-summary {
    grid-template-columns: 1fr;
  }

  .editor-actions {
    flex-direction: column-reverse;
  }

  .secondary-btn,
  .primary-btn {
    width: 100%;
  }
}
</style>
