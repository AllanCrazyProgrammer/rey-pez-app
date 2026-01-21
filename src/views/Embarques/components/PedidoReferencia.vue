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
  margin-top: 4px;
  font-size: 0.85rem;
  color: #6c757d;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pedido-label {
  font-weight: 600;
  color: #495057;
}

.pedido-valor {
  font-weight: 500;
}

.pedido-valor.cumple {
  color: #00a651;
}

.pedido-valor.falta {
  color: #e10600;
}

.pedido-valor.neutro {
  color: inherit;
}
</style>
