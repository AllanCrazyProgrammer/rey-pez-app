
<template>
  <div id="app">
    <Navbar />
    <Footer />

  </div>
</template>

<script>
import Navbar from "./NavBar.vue";
import Datos from "./datos.vue";
import Home from "./views/Home.vue";
import Footer from './Footer.vue';

export default {
  name: "app",
  components: {
    Navbar,
    Footer,
    Datos,
    Home,
  },
};
</script>

<style>
h1 {
  color: rgb(40, 40, 216);
  text-align: center;
  font-weight: normal;
}
</style>
