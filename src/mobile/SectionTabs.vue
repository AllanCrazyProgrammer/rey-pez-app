<template>
  <nav class="rp-section-tabs" :aria-label="'Secciones de ' + tipo">
    <router-link :to="inventario" exact><MobileIcon name="box" />Inventario</router-link>
    <router-link :to="movimientos" exact><MobileIcon name="moves" />Movimientos</router-link>
  </nav>
</template>
<script>
import MobileIcon from './MobileIcon.vue';
export default {
  components: { MobileIcon }, props: { tipo: String },
  computed: {
    inventario() { return this.tipo === 'limpios' ? '/existencias' : '/existencias-crudos'; },
    movimientos() { return this.tipo === 'limpios' ? '/sacadas' : '/movimientos-crudos'; }
  }
};
</script>
