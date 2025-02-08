<template>
  <div class="pedidos-container">
    <h2>Pedidos de Camarón</h2>
    
    <div class="tipo-pedido-selector">
      <button 
        :class="['btn-tipo', { active: tipoPedido === 'crudo' }]"
        @click="tipoPedido = 'crudo'">
        Camarón Crudo
      </button>
      <button 
        :class="['btn-tipo', { active: tipoPedido === 'limpio' }]"
        @click="tipoPedido = 'limpio'">
        Camarón Limpio
      </button>
    </div>

    <PedidosCrudo v-if="tipoPedido === 'crudo'" />
    <PedidosLimpio v-else />
  </div>
</template>

<script>
import PedidosCrudo from './PedidosCrudo.vue'
import PedidosLimpio from './PedidosLimpio.vue'

export default {
  name: 'Pedidos',
  components: {
    PedidosCrudo,
    PedidosLimpio
  },
  data() {
    return {
      tipoPedido: 'crudo'
    }
  }
}
</script>

<style scoped>
.pedidos-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.tipo-pedido-selector {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
}

.btn-tipo {
  padding: 12px 24px;
  border: 2px solid #3498db;
  border-radius: 4px;
  background-color: white;
  color: #3498db;
  font-size: 1em;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-tipo:hover {
  background-color: #f7f9fc;
}

.btn-tipo.active {
  background-color: #3498db;
  color: white;
}
</style> 