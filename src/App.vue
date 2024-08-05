<template>
  <div id="app">
    <Navbar />
    <div class="content-wrapper">
      <router-view />
    </div>
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
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.content-wrapper {
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
}

h1 {
  color: rgb(40, 40, 216);
  text-align: center;
  font-weight: normal;
}
</style>