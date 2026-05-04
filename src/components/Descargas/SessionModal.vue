<template>
  <div v-if="show" class="modal-bg" @click.self="cancel">
    <div class="dialog">
      <h3>Nueva sesión de descarga</h3>
      <div class="add-cat-mode" v-if="mode === 'category'">
        <label>Nombre (ej. U-15, 16/20, Pacotilla)</label>
        <input
          ref="catInput"
          v-model="catName"
          type="text"
          placeholder="U-15"
          autocomplete="off"
          @keydown.enter.prevent="confirmCategory"
        />
        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="cancel">Cancelar</button>
          <button type="button" class="btn-primary" @click="confirmCategory">Guardar</button>
        </div>
      </div>
      <div v-else class="session-mode">
        <label>Placa o ID de camioneta</label>
        <input
          ref="plateInput"
          v-model="plate"
          type="text"
          placeholder="ABC-123"
          autocomplete="off"
        />
        <label>Proveedor / Origen (opcional)</label>
        <input
          v-model="provider"
          type="text"
          placeholder="Granja San Pedro"
          autocomplete="off"
          @keydown.enter.prevent="confirmSession"
        />
        <div class="modal-actions">
          <button type="button" class="btn-cancel" @click="cancel">Cancelar</button>
          <button type="button" class="btn-primary" @click="confirmSession">Iniciar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SessionModal',
  props: {
    show: { type: Boolean, default: false },
    mode: { type: String, default: 'session' },
    initialPlate: { type: String, default: '' },
    initialProvider: { type: String, default: '' }
  },
  data() {
    return {
      plate: '',
      provider: '',
      catName: ''
    };
  },
  watch: {
    show(val) {
      if (val) {
        this.plate = this.initialPlate || '';
        this.provider = this.initialProvider || '';
        this.catName = '';
        this.$nextTick(() => {
          if (this.mode === 'category' && this.$refs.catInput) {
            this.$refs.catInput.focus();
          } else if (this.$refs.plateInput) {
            this.$refs.plateInput.focus();
          }
        });
      }
    }
  },
  methods: {
    cancel() { this.$emit('cancel'); },
    confirmSession() {
      const plate = this.plate.trim();
      if (!plate) {
        this.$emit('toast', 'Ingresa la placa');
        return;
      }
      this.$emit('confirm-session', { plate, provider: this.provider.trim() });
    },
    confirmCategory() {
      const name = this.catName.trim();
      if (!name) {
        this.$emit('toast', 'Ingresa un nombre');
        return;
      }
      this.$emit('confirm-category', { name });
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
  max-width: 420px;
  box-shadow: 0 0 25px var(--matrix-green-glow);
}
.dialog h3 {
  margin: 0 0 12px;
  font-size: 1.3rem;
  color: var(--matrix-green);
  letter-spacing: 2px;
  text-shadow: 0 0 10px var(--matrix-green-dim);
}
label {
  display: block;
  font-size: 0.9rem;
  color: var(--amber);
  letter-spacing: 2px;
  margin: 12px 0 4px;
  text-shadow: 0 0 6px var(--amber-glow);
}
input {
  width: 100%;
  background: rgba(0, 20, 0, 0.7);
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  padding: 12px 14px;
  font-size: 1.1rem;
  font-family: 'Share Tech Mono', monospace;
  letter-spacing: 1px;
  min-height: 48px;
  outline: none;
}
input:focus {
  border-color: var(--cyan);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.4);
  color: var(--cyan);
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 18px;
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
  min-height: 50px;
}
.btn-cancel:hover {
  background: rgba(255, 107, 107, 0.12);
  border-color: #ff6b6b;
  color: #ff6b6b;
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
