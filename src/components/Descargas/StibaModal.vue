<template>
  <div v-if="show" class="modal-bg" @click.self="cancel">
    <div class="modal">
      <h3>
        Agregar por estiba
        <span class="cat-name">→ {{ activeName }}</span>
      </h3>
      <div class="stiba-labels">
        <span>Filas</span><span></span><span>Columnas</span>
      </div>
      <div class="stiba-calc">
        <div
          class="stiba-input"
          :class="{ editing: focused === 'a' }"
          @click="focusInput('a')"
        >{{ a }}</div>
        <span class="stiba-op">×</span>
        <div
          class="stiba-input"
          :class="{ editing: focused === 'b' }"
          @click="focusInput('b')"
        >{{ b }}</div>
      </div>

      <div v-if="presets.length" class="stiba-presets">
        <button
          v-for="p in presets"
          :key="p.key"
          type="button"
          @click="applyPreset(p)"
          :title="p.title"
        >{{ p.label }}</button>
      </div>
      <div v-else class="stiba-presets-empty">
        &gt; Sin estibas frecuentes todavía
      </div>

      <div class="numpad">
        <button v-for="n in 9" :key="n" type="button" @click="press(String(n))">{{ n }}</button>
        <button type="button" @click="press('back')">⌫</button>
        <button type="button" @click="press('0')">0</button>
        <button type="button" class="clear" @click="press('clear')">C</button>
      </div>

      <div class="stiba-result">
        <div class="stiba-result-num">{{ result }}</div>
        <div class="stiba-result-lbl">cajas a sumar</div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn-cancel" @click="cancel">Cancelar</button>
        <button type="button" class="btn-primary" @click="confirm">Sumar al total</button>
      </div>
    </div>
  </div>
</template>

<script>
const MAX_PRESETS = 6;

export default {
  name: 'StibaModal',
  props: {
    show: { type: Boolean, default: false },
    activeName: { type: String, default: '—' },
    stibaHistory: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      a: 4,
      b: 6,
      focused: 'a',
      resetA: false,
      resetB: false
    };
  },
  computed: {
    result() {
      return (this.a || 0) * (this.b || 0);
    },
    presets() {
      const entries = Object.keys(this.stibaHistory).map(k => ({
        key: k,
        count: this.stibaHistory[k].count,
        lastUsed: this.stibaHistory[k].lastUsed
      })).sort((x, y) => {
        if (y.count !== x.count) return y.count - x.count;
        return y.lastUsed - x.lastUsed;
      }).slice(0, MAX_PRESETS);
      return entries.map(e => {
        const parts = e.key.split(',');
        return {
          key: e.key,
          a: Number(parts[0]),
          b: Number(parts[1]),
          label: parts[0] + '×' + parts[1],
          title: 'Usada ' + e.count + ' ' + (e.count === 1 ? 'vez' : 'veces')
        };
      });
    }
  },
  watch: {
    show(val) {
      if (val) {
        this.a = 4;
        this.b = 6;
        this.focused = 'a';
        this.resetA = false;
        this.resetB = false;
      }
    }
  },
  methods: {
    focusInput(key) {
      this.focused = key;
      if (key === 'a') this.resetA = true;
      else this.resetB = true;
    },
    press(v) {
      const f = this.focused;
      const resetKey = f === 'a' ? 'resetA' : 'resetB';
      const current = this[f];
      if (v === 'clear') {
        this[f] = 0;
        this[resetKey] = true;
      } else if (v === 'back') {
        const s = String(current);
        this[f] = s.length > 1 ? (parseInt(s.slice(0, -1), 10) || 0) : 0;
      } else {
        if (this[resetKey] || current === 0) {
          this[f] = parseInt(v, 10);
          this[resetKey] = false;
        } else {
          const newVal = parseInt(String(current) + v, 10);
          if (newVal <= 9999) this[f] = newVal;
        }
      }
    },
    applyPreset(p) {
      this.a = p.a;
      this.b = p.b;
      this.resetA = true;
      this.resetB = true;
    },
    confirm() {
      if (this.result <= 0) {
        this.$emit('toast', 'Cantidad debe ser mayor a 0');
        return;
      }
      this.$emit('confirm', { a: this.a, b: this.b, total: this.result });
    },
    cancel() {
      this.$emit('cancel');
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
  overflow-y: auto;
}

.modal {
  background: var(--terminal-bg, #0a0a0a);
  border: 2px solid var(--matrix-green);
  padding: 22px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 0 25px var(--matrix-green-glow);
  margin: auto;
}

.modal h3 {
  margin: 0 0 12px;
  font-size: 1.3rem;
  color: var(--matrix-green);
  letter-spacing: 2px;
  text-shadow: 0 0 10px var(--matrix-green-dim);
}

.cat-name {
  color: var(--amber);
  font-weight: 400;
  text-shadow: 0 0 8px var(--amber-glow);
}

.stiba-labels {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  margin-bottom: 4px;
}
.stiba-labels span {
  text-align: center;
  font-size: 0.9rem;
  color: var(--amber);
  letter-spacing: 2px;
  text-shadow: 0 0 6px var(--amber-glow);
}

.stiba-calc {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 8px;
  align-items: center;
  margin: 6px 0 8px;
}

.stiba-input {
  background: rgba(0, 20, 0, 0.7);
  border: 2px solid var(--matrix-green);
  padding: 18px 0;
  text-align: center;
  font-family: 'Share Tech Mono', monospace;
  font-size: 36px;
  font-weight: 700;
  color: var(--matrix-green);
  width: 100%;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  text-shadow: 0 0 12px var(--matrix-green);
}

.stiba-input.editing {
  border-color: var(--cyan);
  background: rgba(0, 212, 255, 0.08);
  box-shadow: 0 0 18px rgba(0, 212, 255, 0.4);
  color: var(--cyan);
  text-shadow: 0 0 14px var(--cyan);
}

.stiba-op {
  font-size: 28px;
  font-weight: 800;
  color: var(--amber);
  text-align: center;
  text-shadow: 0 0 10px var(--amber-glow);
}

.stiba-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 4px;
}
.stiba-presets button {
  background: transparent;
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  padding: 6px 12px;
  font-size: 1rem;
  font-family: 'Share Tech Mono', monospace;
  cursor: pointer;
  letter-spacing: 1px;
  min-height: 36px;
}
.stiba-presets button:hover,
.stiba-presets button:active {
  background: var(--cyan);
  color: var(--terminal-bg);
  border-color: var(--cyan);
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
}
.stiba-presets-empty {
  margin: 10px 0 4px;
  color: var(--matrix-green-dark-text);
  font-size: 0.95rem;
  letter-spacing: 1px;
  font-style: italic;
  opacity: 0.7;
}

.numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 10px;
}
.numpad button {
  background: rgba(0, 20, 0, 0.7);
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  padding: 16px 0;
  font-size: 1.4rem;
  font-weight: 700;
  font-family: 'Share Tech Mono', monospace;
  cursor: pointer;
  min-height: 56px;
  text-shadow: 0 0 8px var(--matrix-green-dim);
}
.numpad button:active {
  background: var(--matrix-green);
  color: var(--terminal-bg);
}
.numpad button.clear {
  color: var(--amber);
  border-color: var(--amber);
  text-shadow: 0 0 8px var(--amber-glow);
}
.numpad button.clear:active {
  background: var(--amber);
  color: var(--terminal-bg);
}

.stiba-result {
  background: rgba(0, 212, 255, 0.08);
  border: 1px solid var(--cyan);
  padding: 14px;
  text-align: center;
  margin: 14px 0;
  box-shadow: inset 0 0 15px rgba(0, 212, 255, 0.05);
}
.stiba-result-num {
  font-family: 'Share Tech Mono', monospace;
  font-size: 40px;
  font-weight: 800;
  color: var(--cyan);
  line-height: 1;
  text-shadow: 0 0 18px var(--cyan);
  letter-spacing: 2px;
}
.stiba-result-lbl {
  font-size: 0.95rem;
  color: var(--amber);
  letter-spacing: 2px;
  margin-top: 6px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
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
  background: rgba(0, 212, 255, 0.12);
  border-color: var(--cyan);
  color: var(--cyan);
}
.btn-primary:hover {
  background: var(--cyan);
  color: var(--terminal-bg);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
}
</style>
