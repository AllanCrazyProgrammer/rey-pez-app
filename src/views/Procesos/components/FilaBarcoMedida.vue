<template>
  <label class="barco-fila">
    <span class="barco-etiqueta">{{ etiqueta }}</span>
    <span class="barco-campo">
      <span class="barco-espejo" aria-hidden="true">{{ value + '\n' }}</span>
      <textarea
        class="barco-input"
        rows="1"
        autocomplete="off"
        :aria-label="`${etiqueta} — Barco`"
        :value="value"
        @input="$emit('input', $event.target.value)"
        @blur="$emit('blur')"
      ></textarea>
    </span>
    <span class="barco-impreso">{{ value }}</span>
  </label>
</template>

<script>
export default {
  name: 'FilaBarcoMedida',
  props: {
    etiqueta: {
      type: String,
      required: true
    },
    value: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
.barco-fila {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
  margin: 0;
  break-inside: avoid;
}

.barco-etiqueta {
  font-size: 12px;
  line-height: 1.3;
  flex: 0 0 auto;
  white-space: nowrap;
}

.barco-campo {
  position: relative;
  display: block;
  flex: 1 1 0;
  min-width: 0;
}

.barco-input,
.barco-espejo {
  display: block;
  box-sizing: border-box;
  width: 100%;
  margin: 0;
  padding: 1px 0;
  border: 0;
  border-bottom: 1px solid #000;
  border-radius: 0;
  font: inherit;
  font-size: 16px;
  line-height: 1.3;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* The mirror grows with wrapped text so every line stays visible while editing. */
.barco-espejo {
  visibility: hidden;
}

.barco-input {
  position: absolute;
  inset: 0;
  height: 100%;
  min-height: 0;
  background: white;
  color: #000;
  resize: none;
  overflow: hidden;
}

.barco-impreso {
  display: none;
}

@media print {
  .barco-campo {
    display: none;
  }

  .barco-impreso {
    display: block;
    flex: 1 1 0;
    min-width: 0;
    min-height: 1.3em;
    border-bottom: 1px solid #000;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 11pt;
    line-height: 1.3;
  }
}
</style>
