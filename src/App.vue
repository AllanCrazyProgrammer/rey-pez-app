<template>
  <div id="app">
    <Navbar />
    <div class="content-wrapper">
      <div class="content-horizon-grid" aria-hidden="true">
        <div class="content-horizon-grid__sun"></div>
        <div class="content-horizon-grid__plane"></div>
      </div>
      <router-view />
    </div>
    <Footer />
  </div>
</template>

<script>
import Navbar from "./NavBar.vue";
import Footer from './Footer.vue';
import { useAuthStore } from './stores/auth';

export default {
  name: "app",
  components: {
    Navbar,
    Footer
  },
  created() {
    // Inicializar el store de autenticación al cargar la aplicación
    const authStore = useAuthStore();
    authStore.checkAuth();
  },
  mounted() {
    // Prevenir el cambio de valor al hacer scroll en inputs de tipo número globalmente
    document.addEventListener('wheel', (event) => {
      if (document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    });
  }
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
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 15%, rgba(255, 95, 217, 0.18), transparent 35%),
    radial-gradient(circle at 80% 25%, rgba(62, 248, 255, 0.14), transparent 40%),
    linear-gradient(160deg, #100625 0%, #1a0d3a 45%, #102e63 100%);
}

.content-wrapper::before,
.content-wrapper::after {
  content: "";
  position: absolute;
  inset: -20%;
  pointer-events: none;
  z-index: 0;
}

.content-wrapper::before {
  background:
    repeating-linear-gradient(
      180deg,
      rgba(255, 111, 212, 0.08) 0,
      rgba(255, 111, 212, 0.08) 1px,
      transparent 1px,
      transparent 10px
    );
  animation: scanlineShift 14s linear infinite;
}

.content-wrapper::after {
  background:
    radial-gradient(circle at 30% 40%, rgba(255, 95, 217, 0.18), transparent 35%),
    radial-gradient(circle at 70% 60%, rgba(62, 248, 255, 0.16), transparent 35%);
  filter: blur(24px);
  animation: auroraDrift 18s ease-in-out infinite alternate;
}

/* Grilla retro en perspectiva (horizonte vaporwave) */
.content-horizon-grid {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: min(52vh, 440px);
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  perspective: 520px;
  perspective-origin: 50% 100%;
  mask-image: linear-gradient(
    to top,
    black 0%,
    black 38%,
    rgba(0, 0, 0, 0.65) 62%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to top,
    black 0%,
    black 38%,
    rgba(0, 0, 0, 0.65) 62%,
    transparent 100%
  );
}

.content-horizon-grid__sun {
  position: absolute;
  left: 50%;
  bottom: min(38%, 200px);
  width: min(28vmin, 220px);
  height: min(28vmin, 220px);
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 45%,
    rgba(255, 240, 180, 0.95) 0%,
    rgba(255, 120, 200, 0.55) 38%,
    rgba(255, 79, 216, 0.15) 58%,
    transparent 72%
  );
  box-shadow:
    0 0 60px rgba(255, 95, 217, 0.55),
    0 0 120px rgba(62, 248, 255, 0.25);
  animation: sunPulse 10s ease-in-out infinite alternate;
  z-index: 0;
}

.content-horizon-grid__plane {
  position: absolute;
  left: 50%;
  bottom: -18%;
  width: 260%;
  height: 85%;
  margin-left: -130%;
  transform-origin: 50% 100%;
  transform: rotateX(72deg);
  background:
    linear-gradient(
      to top,
      rgba(16, 8, 40, 0.95) 0%,
      rgba(16, 8, 40, 0.2) 28%,
      transparent 55%
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0,
      transparent calc(52px - 1px),
      rgba(62, 248, 255, 0.5) calc(52px - 1px),
      rgba(62, 248, 255, 0.5) 52px
    ),
    repeating-linear-gradient(
      0deg,
      transparent 0,
      transparent calc(28px - 1px),
      rgba(255, 95, 217, 0.32) calc(28px - 1px),
      rgba(255, 95, 217, 0.32) 28px
    );
  background-size: 100% 100%, 52px 100%, 100% 28px;
  animation: horizonGridScroll 22s linear infinite;
  opacity: 0.9;
  z-index: 1;
}

.content-wrapper > *:not(.content-horizon-grid) {
  position: relative;
  z-index: 1;
}

@keyframes horizonGridScroll {
  0% {
    background-position: 0 0, 0 0, 0 0;
  }
  100% {
    background-position: 0 0, 52px 0, 0 28px;
  }
}

@keyframes sunPulse {
  0% {
    opacity: 0.88;
    filter: brightness(1);
  }
  100% {
    opacity: 1;
    filter: brightness(1.12);
  }
}

@keyframes scanlineShift {
  0% {
    transform: translateY(0);
    opacity: 0.5;
  }
  50% {
    transform: translateY(24px);
    opacity: 0.75;
  }
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
}

@keyframes auroraDrift {
  0% {
    transform: translate3d(-3%, -2%, 0) scale(1);
  }
  100% {
    transform: translate3d(3%, 2%, 0) scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .content-wrapper::before,
  .content-wrapper::after,
  .content-horizon-grid__plane,
  .content-horizon-grid__sun {
    animation: none;
  }
}

@media (max-width: 768px) {
  .content-horizon-grid {
    height: min(42vh, 320px);
  }

  .content-horizon-grid__plane {
    width: 300%;
    margin-left: -150%;
  }
}

h1 {
  color: rgb(40, 40, 216);
  text-align: center;
  font-weight: normal;
}
</style>
