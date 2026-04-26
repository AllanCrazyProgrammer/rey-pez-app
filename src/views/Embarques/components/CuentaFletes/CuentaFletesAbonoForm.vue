<template>
  <section class="abono-panel" aria-labelledby="abono-title">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">[INPUT]</p>
        <h2 id="abono-title">Registrar abono</h2>
      </div>
      <p class="hint">Chofer activo: {{ chofer }}</p>
    </div>

    <form class="abono-form" @submit.prevent="$emit('agregar-abono')">
      <label>
        <span>MONTO</span>
        <input
          :value="value.monto"
          type="number"
          min="1"
          step="0.01"
          placeholder="0.00"
          @input="actualizarCampo('monto', $event.target.value)"
        >
      </label>

      <label>
        <span>FECHA</span>
        <input
          :value="value.fecha"
          type="date"
          @input="actualizarCampo('fecha', $event.target.value)"
        >
      </label>

      <label class="descripcion">
        <span>DESCRIPCION</span>
        <input
          :value="value.descripcion"
          type="text"
          placeholder="Abono realizado"
          @input="actualizarCampo('descripcion', $event.target.value)"
        >
      </label>

      <button
        type="submit"
        class="terminal-btn"
        :disabled="!puedeAgregar || guardando"
        :aria-busy="guardando ? 'true' : 'false'"
      >
        {{ guardando ? 'GUARDANDO...' : 'AGREGAR_ABONO' }}
      </button>
    </form>
  </section>
</template>

<script>
export default {
  name: 'CuentaFletesAbonoForm',
  props: {
    value: {
      type: Object,
      required: true
    },
    puedeAgregar: {
      type: Boolean,
      default: false
    },
    guardando: {
      type: Boolean,
      default: false
    },
    chofer: {
      type: String,
      required: true
    }
  },
  methods: {
    actualizarCampo(campo, valor) {
      this.$emit('input', {
        ...this.value,
        [campo]: valor
      });
    }
  }
}
</script>

<style scoped>
.abono-panel {
  padding: clamp(16px, 2.5vw, 28px);
  border-bottom: 1px solid var(--terminal-border);
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: end;
  margin-bottom: 16px;
}

.eyebrow,
h2,
.hint {
  margin: 0;
}

.eyebrow,
.hint,
label span {
  color: #9ef8b5;
  font-family: 'Share Tech Mono', monospace;
  letter-spacing: 0.7px;
}

.eyebrow {
  color: var(--amber);
}

h2 {
  font-size: clamp(1.8rem, 3vw, 3rem);
  text-shadow: 0 0 12px var(--matrix-green-glow);
}

.abono-form {
  display: grid;
  grid-template-columns: 170px 190px minmax(220px, 1fr) auto;
  gap: 14px;
  align-items: end;
}

label {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

input {
  min-height: 44px;
  border: 1px solid var(--terminal-border);
  background: rgba(0, 0, 0, 0.48);
  color: var(--matrix-green);
  padding: 8px 12px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 1rem;
  outline: none;
}

input:focus {
  border-color: var(--matrix-green);
  box-shadow: 0 0 0 2px rgba(0, 255, 65, 0.18);
}

input::placeholder {
  color: rgba(158, 248, 181, 0.58);
}

.terminal-btn {
  min-height: 44px;
  border: 1px solid var(--matrix-green);
  background: transparent;
  color: var(--matrix-green);
  padding: 10px 16px;
  font-family: 'Share Tech Mono', monospace;
  cursor: pointer;
}

.terminal-btn:hover:not(:disabled) {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 14px var(--matrix-green-glow);
}

.terminal-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 980px) {
  .abono-form {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .descripcion,
  .terminal-btn {
    grid-column: 1 / -1;
  }
}

@media (max-width: 620px) {
  .panel-heading {
    display: block;
  }

  .abono-form {
    grid-template-columns: 1fr;
  }
}
</style>
