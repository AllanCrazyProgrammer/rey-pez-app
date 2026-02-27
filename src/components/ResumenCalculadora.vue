<template>
  <section class="calculadora" aria-label="Calculadora rápida">
    <div class="calculadora-display" aria-live="polite">
      <span v-if="operationPreview" class="calculadora-operacion">{{ operationPreview }}</span>
      <span>{{ displayValue }}</span>
    </div>

    <div class="calculadora-grid">
      <button type="button" class="btn-accion" @click="clearAll">AC</button>
      <button type="button" class="btn-accion" @click="deleteLast">⌫</button>
      <button type="button" class="btn-operador" @click="setOperator('/')">/</button>
      <button type="button" class="btn-operador" @click="setOperator('*')">×</button>

      <button type="button" @click="appendDigit('7')">7</button>
      <button type="button" @click="appendDigit('8')">8</button>
      <button type="button" @click="appendDigit('9')">9</button>
      <button type="button" class="btn-operador" @click="setOperator('-')">-</button>

      <button type="button" @click="appendDigit('4')">4</button>
      <button type="button" @click="appendDigit('5')">5</button>
      <button type="button" @click="appendDigit('6')">6</button>
      <button type="button" class="btn-operador" @click="setOperator('+')">+</button>

      <button type="button" @click="appendDigit('1')">1</button>
      <button type="button" @click="appendDigit('2')">2</button>
      <button type="button" @click="appendDigit('3')">3</button>
      <button type="button" class="btn-igual" @click="calculateResult">=</button>

      <button type="button" class="btn-cero" @click="appendDigit('0')">0</button>
      <button type="button" @click="appendDecimal">.</button>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ResumenCalculadora',
  data() {
    return {
      currentValue: '0',
      previousValue: null,
      operator: null,
      resetCurrentOnNextInput: false
    };
  },
  computed: {
    displayValue() {
      return this.currentValue;
    },
    operatorSymbol() {
      if (this.operator === '*') return '×';
      if (this.operator === '/') return '÷';
      return this.operator;
    },
    operationPreview() {
      if (!this.operator || this.previousValue === null) return '';
      if (this.resetCurrentOnNextInput) {
        return `${this.previousValue} ${this.operatorSymbol}`;
      }
      return `${this.previousValue} ${this.operatorSymbol} ${this.currentValue}`;
    }
  },
  methods: {
    appendDigit(digit) {
      if (this.resetCurrentOnNextInput) {
        this.currentValue = digit;
        this.resetCurrentOnNextInput = false;
        return;
      }

      this.currentValue = this.currentValue === '0'
        ? digit
        : this.currentValue + digit;
    },
    appendDecimal() {
      if (this.resetCurrentOnNextInput) {
        this.currentValue = '0.';
        this.resetCurrentOnNextInput = false;
        return;
      }

      if (!this.currentValue.includes('.')) {
        this.currentValue += '.';
      }
    },
    clearAll() {
      this.currentValue = '0';
      this.previousValue = null;
      this.operator = null;
      this.resetCurrentOnNextInput = false;
    },
    deleteLast() {
      if (this.resetCurrentOnNextInput) return;
      if (this.currentValue.length <= 1) {
        this.currentValue = '0';
        return;
      }
      this.currentValue = this.currentValue.slice(0, -1);
    },
    setOperator(nextOperator) {
      if (this.operator && !this.resetCurrentOnNextInput) {
        this.calculateResult();
      }

      this.previousValue = this.currentValue;
      this.operator = nextOperator;
      this.resetCurrentOnNextInput = true;
    },
    calculateResult() {
      if (!this.operator || this.previousValue === null) return;

      const prev = Number(this.previousValue);
      const current = Number(this.currentValue);
      let result = current;

      if (this.operator === '+') result = prev + current;
      if (this.operator === '-') result = prev - current;
      if (this.operator === '*') result = prev * current;
      if (this.operator === '/') {
        result = current === 0 ? 0 : prev / current;
      }

      this.currentValue = Number.isFinite(result)
        ? String(Number(result.toFixed(6)))
        : '0';
      this.operator = null;
      this.previousValue = null;
      this.resetCurrentOnNextInput = true;
    }
  }
};
</script>

<style scoped>
.calculadora {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 12px;
  background: #fff;
  max-width: 360px;
}

.calculadora-display {
  background: #111827;
  color: #fff;
  border-radius: 8px;
  padding: 12px;
  text-align: right;
  font-size: 1.5rem;
  margin-bottom: 10px;
  min-height: 54px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
}

.calculadora-operacion {
  font-size: 0.8rem;
  color: #cbd5e1;
}

.calculadora-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

button {
  border: none;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  background: #f3f4f6;
  font-size: 1rem;
  font-weight: 600;
}

.btn-operador {
  background: #e0e7ff;
  color: #1e3a8a;
}

.btn-accion {
  background: #fee2e2;
  color: #991b1b;
}

.btn-igual {
  background: #1d4ed8;
  color: #fff;
  grid-row: span 2;
}

.btn-cero {
  grid-column: span 2;
}

@media (max-width: 375px) {
  .calculadora {
    max-width: 100%;
  }

  .calculadora-display {
    font-size: 1.2rem;
    min-height: 48px;
  }
}
</style>
