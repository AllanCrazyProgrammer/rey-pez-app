<template>
  <div id="home">
    <b-container >
      <Datos />
    </b-container>
  </div>
</template>

<script>
import Datos from "../datos.vue";
export default {
  name: "home",
  components: {
    Datos,
  },
};
</script>

<style>
</style>