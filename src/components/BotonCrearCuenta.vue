<template>
  <button 
    type="button" 
    @click.stop="$emit('click')" 
    class="btn btn-success btn-sm" 
    :class="customClass"
    :title="title"
    :disabled="disabled"
  >
    <span v-if="loading" class="loader-inline"></span>
    <i v-else class="fas fa-plus-circle"></i> {{ text }}
  </button>
</template>

<script>
export default {
  name: 'BotonCrearCuenta',
  props: {
    customClass: String,
    title: String,
    disabled: Boolean,
    loading: Boolean,
    text: {
      type: String,
      default: 'Crear Cuenta'
    }
  }
}
</script> 