<template>
  <div v-if="tieneReferencia" class="pedido-referencia">
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
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  gap: 7px;
  margin: 0;
  padding: 5px 9px;
  color: #41526a;
  border: 1px solid #d3deea;
  border-radius: 9px;
  background: linear-gradient(135deg, #f8fbff, #eaf0f7);
  box-shadow: inset 0 1px rgba(255,255,255,.82), 0 5px 12px rgba(15,23,42,.06);
  font-size: .78rem;
  line-height: 1;
  white-space: nowrap;
}

.pedido-label {
  color: #64748b;
  font-size: .55rem;
  font-weight: 850;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.pedido-valor {
  font-size: .88rem;
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
