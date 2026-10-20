<template>
  <label class="barco-fila">
    <span class="barco-etiqueta">{{ etiqueta }} — Barco:</span>
    <input
      class="barco-input"
      type="text"
      autocomplete="off"
      enterkeyhint="done"
      :value="value"
      @input="$emit('input', $event.target.value)"
      @blur="$emit('blur')"
    >
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
  gap: 8px;
  margin-bottom: 8px;
  break-inside: avoid;
}

.barco-etiqueta {
  flex: 0 0 auto;
}

.barco-input {
  flex: 1 1 160px;
  min-width: 0;
  max-width: 420px;
  border: 0;
  border-bottom: 1px solid #000;
  border-radius: 0;
  background: white;
  color: #000;
  font: inherit;
}

.barco-impreso {
  display: none;
}

@media (max-width: 640px) {
  .barco-fila {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    margin-bottom: 14px;
  }

  .barco-input {
    max-width: none;
    width: 100%;
    min-height: 44px;
    font-size: 16px;
  }
}

@media print {
  .barco-fila {
    flex-direction: row;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 8px;
  }

  .barco-input {
    display: none;
  }

  .barco-impreso {
    display: block;
    flex: 1;
    min-width: 0;
    max-width: 420px;
    min-height: 1.2em;
    border-bottom: 1px solid #000;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 14pt;
  }
}
</style>
