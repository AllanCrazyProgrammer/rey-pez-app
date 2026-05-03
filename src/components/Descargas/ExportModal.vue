<template>
  <div v-if="show" class="modal-bg" @click.self="$emit('close')">
    <div class="dialog">
      <h3>Resumen de descarga</h3>
      <pre class="export-preview">{{ report }}</pre>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" @click="$emit('close')">Cerrar</button>
        <button type="button" class="btn-primary" @click="copy">Copiar</button>
        <button type="button" class="btn-primary" @click="download">Descargar</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ExportModal',
  props: {
    show: { type: Boolean, default: false },
    report: { type: String, default: '' },
    plate: { type: String, default: '' }
  },
  methods: {
    copy() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(this.report)
          .then(() => this.$emit('toast', 'Copiado al portapapeles'))
          .catch(() => this.fallbackCopy());
      } else {
        this.fallbackCopy();
      }
    },
    fallbackCopy() {
      try {
        const ta = document.createElement('textarea');
        ta.value = this.report;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        this.$emit('toast', 'Copiado al portapapeles');
      } catch (e) {
        this.$emit('toast', 'No se pudo copiar');
      }
    },
    download() {
      try {
        const blob = new Blob([this.report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
        a.href = url;
        a.download = 'descarga_' + (this.plate || 'sin-placa') + '_' + stamp + '.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.$emit('toast', 'Archivo descargado');
      } catch (e) {
        this.$emit('toast', 'No se pudo descargar');
      }
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
  max-width: 540px;
  box-shadow: 0 0 25px var(--matrix-green-glow);
}
.dialog h3 {
  margin: 0 0 12px;
  font-size: 1.3rem;
  color: var(--matrix-green);
  letter-spacing: 2px;
  text-shadow: 0 0 10px var(--matrix-green-dim);
}

.export-preview {
  background: rgba(0, 20, 0, 0.7);
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  padding: 14px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.9rem;
  white-space: pre-wrap;
  max-height: 320px;
  overflow-y: auto;
  margin: 0 0 16px;
  text-shadow: 0 0 6px var(--matrix-green-dim);
}

.modal-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.modal-actions button {
  flex: 1;
  min-width: 100px;
  padding: 14px;
  border: 1px solid var(--matrix-green);
  background: transparent;
  color: var(--matrix-green);
  font-weight: 600;
  cursor: pointer;
  font-family: 'VT323', 'Share Tech Mono', monospace;
  font-size: 1rem;
  letter-spacing: 2px;
  min-height: 48px;
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
