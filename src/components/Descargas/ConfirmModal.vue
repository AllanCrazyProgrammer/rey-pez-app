<template>
  <div v-if="show" class="modal-bg" @click.self="$emit('cancel')">
    <div class="modal">
      <h3>{{ title || '¿Confirmar?' }}</h3>
      <p class="modal-msg">{{ message }}</p>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" @click="$emit('cancel')">Cancelar</button>
        <button type="button" class="btn-primary" @click="$emit('confirm')">Confirmar</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConfirmModal',
  props: {
    show: { type: Boolean, default: false },
    title: { type: String, default: '' },
    message: { type: String, default: '' }
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
  z-index: 1500;
  font-family: 'VT323', 'Share Tech Mono', monospace;
}

.modal {
  background: var(--terminal-bg, #0a0a0a);
  border: 2px solid var(--matrix-green);
  padding: 22px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 0 25px var(--matrix-green-glow);
}

.modal h3 {
  margin: 0 0 12px;
  font-size: 1.4rem;
  color: var(--matrix-green);
  text-shadow: 0 0 10px var(--matrix-green-dim);
  letter-spacing: 2px;
}

.modal-msg {
  color: var(--matrix-green);
  font-size: 1.1rem;
  letter-spacing: 1px;
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
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

.btn-cancel:hover {
  background: rgba(255, 107, 107, 0.15);
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.btn-primary {
  background: rgba(0, 255, 65, 0.12);
  box-shadow: 0 0 10px var(--matrix-green-dim);
}

.btn-primary:hover {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 20px var(--matrix-green-glow);
}
</style>
