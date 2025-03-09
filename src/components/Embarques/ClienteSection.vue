<template>
  <div class="cliente-section">
    <div class="cliente-header">
      <h2 class="cliente-nombre">{{ obtenerNombreCliente }}</h2>
      <div class="cliente-acciones">
        <BotonCrearCuenta 
          v-if="!esClienteCatarro"
          :tipo-cliente="'Normal'"
          :cliente-id="clienteId"
          :embarque-cliente="embarqueCliente"
          :productos="productos"
          :crudos="[]"
          :is-creating-account="isCreatingAccount"
          @crear-cuenta="$emit('crear-cuenta', $event)"
        />
        <BotonCrearCuenta 
          v-if="esClienteCatarro"
          :tipo-cliente="'Catarro'"
          :cliente-id="clienteId"
          :embarque-cliente="embarqueCliente"
          :productos="productos"
          :crudos="crudos"
          :is-creating-account="isCreatingAccount"
          @crear-cuenta="$emit('crear-cuenta', $event)"
        />
        <button 
          type="button" 
          @click="$emit('eliminar-cliente', clienteId)" 
          class="btn btn-danger btn-sm eliminar-cliente" 
          :disabled="embarqueBloqueado"
        >
          Eliminar Cliente
        </button>
      </div>
    </div>
    <div class="productos-container">
      <ProductoItem 
        v-for="(producto, index) in productos" 
        :key="index" 
        :producto="producto"
        :embarque-bloqueado="embarqueBloqueado"
        @abrir-modal-precio="$emit('abrir-modal-precio', $event)"
        @abrir-modal-historial="$emit('abrir-modal-historial', $event)"
        @eliminar-producto="$emit('eliminar-producto', $event)"
        @agregar-tara="$emit('agregar-tara', $event)"
        @eliminar-tara="$emit('eliminar-tara', $event[0], $event[1])"
        @agregar-bolsa="$emit('agregar-bolsa', $event)"
        @eliminar-bolsa="$emit('eliminar-bolsa', $event[0], $event[1])"
      />
      <button 
        @click="$emit('agregar-producto', clienteId)" 
        class="btn btn-primary agregar-producto"
        :disabled="embarqueBloqueado"
      >
        <i class="fas fa-plus-circle"></i> Agregar Producto
      </button>
    </div>
  </div>
</template>

<script>
import BotonCrearCuenta from './BotonCrearCuenta.vue';
import ProductoItem from './ProductoItem.vue';

export default {
  name: 'ClienteSection',
  components: {
    BotonCrearCuenta,
    ProductoItem
  },
  props: {
    clienteId: {
      type: [String, Number],
      required: true
    },
    clienteInfo: {
      type: Object,
      required: true
    },
    productos: {
      type: Array,
      required: true
    },
    crudos: {
      type: Array,
      default: () => []
    },
    embarqueCliente: {
      type: Object,
      required: true
    },
    isCreatingAccount: {
      type: Boolean,
      default: false
    },
    embarqueBloqueado: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    obtenerNombreCliente() {
      return this.clienteInfo?.nombre || `Cliente ${this.clienteId}`;
    },
    esClienteCatarro() {
      return this.clienteInfo?.tipo === 'catarro';
    }
  }
}
</script>

<style scoped>
.cliente-section {
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  margin-bottom: 30px;
  padding: 20px;
}

.cliente-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.cliente-nombre {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.cliente-acciones {
  display: flex;
  gap: 10px;
}

.productos-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.agregar-producto {
  align-self: flex-start;
  margin-top: 10px;
}

/* Estilos responsivos */
@media (max-width: 768px) {
  .cliente-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .cliente-acciones {
    margin-top: 15px;
    flex-wrap: wrap;
  }
}
</style> 