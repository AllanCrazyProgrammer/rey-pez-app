<template>
  <button 
    type="button" 
    @click.stop="crearCuenta" 
    class="btn btn-success btn-sm" 
    :title="'Crear Cuenta para ' + tipoCliente"
    :disabled="isCreatingAccount"
  >
    <span v-if="isCreatingAccount" class="loader-inline"></span>
    <i v-else class="fas fa-plus-circle"></i> Crear Cuenta
  </button>
</template>

<script>
export default {
  name: 'BotonCrearCuenta',
  props: {
    tipoCliente: {
      type: String,
      required: true
    },
    clienteId: {
      type: [String, Number],
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
        tipoCliente: this.tipoCliente,
        clienteId: this.clienteId,
        embarqueCliente: this.embarqueCliente,
        productos: this.productos,
        crudos: this.crudos
      });
    }
  }
}
</script>

<style scoped>
.btn {
  margin-right: 5px;
}
</style> 