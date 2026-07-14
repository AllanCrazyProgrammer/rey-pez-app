<template>
  <div
    v-if="tieneReferencia"
    class="pedido-referencia"
    :class="`pedido-${claseCumplimiento}`"
  >
    <span class="pedido-label">Pedido:</span>
    <span class="pedido-valor" :class="claseCumplimiento">{{ textoReferencia }}</span>
  </div>
</template>

<script>
export default {
  name: 'PedidoReferencia',
  props: {
    pedidoReferencia: {
      type: Object,
      default: () => ({})
    },
    totalKilos: {
      type: Number,
      default: 0
    },
    totalTaras: {
      type: Number,
      default: 0
    }
  },
  computed: {
    kilos() {
      return this.normalizarNumero(this.pedidoReferencia?.kilos);
    },
    taras() {
      return this.normalizarNumero(this.pedidoReferencia?.taras);
    },
    tieneReferencia() {
      return this.kilos > 0 || this.taras > 0;
    },
    claseCumplimiento() {
      if (this.kilos === 0 && this.taras === 0) {
        return 'neutro';
      }
      if (this.kilos > 0) {
        return this.totalKilos >= this.kilos ? 'cumple' : 'falta';
      }
      return this.totalTaras >= this.taras ? 'cumple' : 'falta';
    },
    textoReferencia() {
      if (this.kilos > 0 && this.taras > 0) {
        return `${this.formatearCantidad(this.taras)} T / ${this.formatearCantidad(this.kilos)} kg`;
      }
      if (this.taras > 0) {
        return `${this.formatearCantidad(this.taras)} T`;
      }
      if (this.kilos > 0) {
        return `${this.formatearCantidad(this.kilos)} kg`;
      }
      return '';
    }
  },
  methods: {
    normalizarNumero(valor) {
      if (valor === null || valor === undefined || valor === '') {
        return 0;
      }
      const limpio = typeof valor === 'string' ? valor.replace(',', '.') : valor;
      const numero = Number(limpio);
      return Number.isNaN(numero) ? 0 : numero;
    },
    formatearCantidad(valor) {
      const redondeado = Number.isInteger(valor) ? valor : Number(valor.toFixed(1));
      return redondeado;
    }
  }
};
</script>

<style scoped>
.pedido-referencia {
  position: relative;
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 7px 7px 7px 21px;
  color: #41526a;
  border: 1px solid #d3deea;
  border-radius: 9px;
  background: linear-gradient(135deg, #f8fbff, #eaf0f7);
  box-shadow: inset 0 1px rgba(255,255,255,.82), 0 5px 12px rgba(15,23,42,.06);
  font-size: .78rem;
  line-height: 1;
  white-space: nowrap;
}

.pedido-referencia::before {
  position: absolute;
  top: 50%;
  left: -5px;
  width: 19px;
  height: 19px;
  display: grid;
  place-items: center;
  transform: translateY(-50%);
  color: #fff;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 3px 8px rgba(15,23,42,.22);
  font-size: .72rem;
  font-weight: 950;
  line-height: 1;
}

.pedido-referencia.pedido-cumple {
  border-color: rgba(16,185,129,.42);
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  box-shadow: inset 0 1px rgba(255,255,255,.86), 0 5px 14px rgba(5,150,105,.12);
}

.pedido-referencia.pedido-cumple::before {
  content: '✓';
  background: #10b981;
}

.pedido-referencia.pedido-falta {
  border-color: rgba(239,68,68,.40);
  background: linear-gradient(135deg, #fff1f2, #ffe4e6);
  box-shadow: inset 0 1px rgba(255,255,255,.86), 0 5px 14px rgba(225,29,72,.11);
}

.pedido-referencia.pedido-falta::before {
  content: '!';
  background: #ef4444;
}

.pedido-label {
  color: #64748b;
  font-size: .64rem;
  font-weight: 850;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.pedido-valor {
  font-size: 1.12rem;
  font-weight: 950;
}

.pedido-valor.cumple {
  color: #059669;
}

.pedido-valor.falta {
  color: #e11d48;
}

.pedido-valor.neutro {
  color: #475569;
}
</style>
