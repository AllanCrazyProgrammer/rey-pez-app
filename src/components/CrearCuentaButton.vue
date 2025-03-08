<template>
  <button 
    type="button" 
    @click.stop="crearCuenta" 
    class="btn btn-success btn-sm crear-cuenta" 
    :title="'Crear Cuenta para ' + nombreCliente"
    :disabled="isCreatingAccount"
  >
    <span v-if="isCreatingAccount" class="loader-inline"></span>
    <i v-else class="fas fa-plus-circle"></i> Crear Cuenta
  </button>
</template>

<script>
export default {
  name: 'CrearCuentaButton',
  props: {
    clienteId: {
      type: [String, Number],
      required: true
    },
    nombreCliente: {
      type: String,
      required: true
    },
    embarqueCliente: {
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
    isCreatingAccount: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    crearCuenta() {
      this.$emit('crear-cuenta', {
        clienteId: this.clienteId,
        nombreCliente: this.nombreCliente,
        embarqueCliente: this.embarqueCliente,
        productos: this.productos,
        crudos: this.crudos
      });
    }
  }
}
</script>

<style scoped>
.crear-cuenta {
  margin-right: 5px;
}
</style> 