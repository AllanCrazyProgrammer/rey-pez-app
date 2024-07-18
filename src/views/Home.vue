<template>
  <div id="home">
    <b-container>
      <Datos />
    </b-container>
    <Footer />
  </div>
</template>

<script>
import Datos from "../datos.vue";
import Navbar from "../NavBar.vue";

export default {
  name: "home",
  components: {
    Navbar,
    Datos,
  },
};
</script>

<style>
/* Aquí puedes añadir estilos específicos si es necesario */
</style>