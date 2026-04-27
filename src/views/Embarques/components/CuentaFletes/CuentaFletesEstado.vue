<template>
  <section v-if="visible" class="estado-panel" :class="tipo" role="status" aria-live="polite">
    <pre>{{ ascii }}</pre>
    <p>{{ mensaje }}</p>
  </section>
</template>

<script>
export default {
  name: 'CuentaFletesEstado',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    tipo: {
      type: String,
      default: 'info'
    },
    mensaje: {
      type: String,
      required: true
    }
  },
  computed: {
    ascii() {
      if (this.tipo === 'error') return '[ERR] CONNECTION_FAILED';
      if (this.tipo === 'empty') return '[INFO] NO_RECORDS_FOUND';
      return '[SYNC] READING_FIRESTORE...';
    }
  }
}
</script>

<style scoped>
.estado-panel {
  margin: clamp(16px, 2.5vw, 28px);
  padding: 24px;
  border: 1px solid var(--terminal-border);
  background: rgba(0, 0, 0, 0.42);
  text-align: center;
  color: var(--amber);
}

pre {
  margin: 0 0 10px;
  font-family: 'Share Tech Mono', monospace;
  white-space: pre-wrap;
}

p {
  margin: 0;
  color: #9ef8b5;
  font-family: 'Share Tech Mono', monospace;
}

.error {
  border-color: var(--danger);
  color: #ff8da2;
}

.empty {
  border-color: var(--info);
  color: var(--info);
}
</style>
