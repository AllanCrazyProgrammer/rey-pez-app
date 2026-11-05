<template>
  <div class="precio-cliente-button-container">
    <PreciosHistorialModal :clienteActual="clienteId" />
  </div>
</template>

<script>
import PreciosHistorialModal from './PreciosHistorialModal.vue';

export default {
  name: 'PreciosClienteButton',
  components: {
    PreciosHistorialModal
  },
  props: {
    clienteId: {
      type: String,
      required: true
    }
  }
}
</script>

<style scoped>
.precio-cliente-button-container {
  margin: 15px 0;
}
</style> 