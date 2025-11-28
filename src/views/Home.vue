<template>
  <div id="home" class="home-container">
    <!-- Scanlines effect -->
    <div class="home-scanlines"></div>
    
    <b-container>
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

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0505 0%, #120808 50%, #0a0505 100%);
  padding: 20px 0;
  position: relative;
}

.home-scanlines {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.03),
    rgba(0, 0, 0, 0.03) 1px,
    transparent 1px,
    transparent 2px
  );
}

@media (max-width: 768px) {
  .home-container {
    padding: 15px 0;
  }
}

@media (max-width: 576px) {
  .home-container {
    padding: 10px 0;
  }
}
</style>