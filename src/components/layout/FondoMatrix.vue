<template>
  <canvas class="fondo-matrix" :style="{ opacity }" aria-hidden="true"></canvas>
</template>

<script>
// Fondo decorativo de "lluvia Matrix". Se desactiva si el usuario prefiere
// movimiento reducido y libera el canvas al desmontar la vista.
export default {
  name: 'FondoMatrix',
  props: {
    opacity: {
      type: [Number, String],
      default: 0.5
    }
  },
  mounted() {
    this.iniciar();
  },
  beforeDestroy() {
    this.detener();
  },
  methods: {
    iniciar() {
      const canvas = this.$el;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      const ctx = canvas.getContext('2d');
      const caracteres = 'アイウエオカキクケコ0123456789$#%&@REYPZ71><';
      const tam = 16;
      let columnas = 0;
      let gotas = [];

      const ajustar = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        columnas = Math.ceil(canvas.width / tam);
        gotas = Array.from({ length: columnas }, () => Math.floor(Math.random() * -60));
      };
      ajustar();
      this._resize = ajustar;
      window.addEventListener('resize', ajustar);

      let ultimoCuadro = 0;
      const dibujar = tiempo => {
        this._raf = requestAnimationFrame(dibujar);
        if (tiempo - ultimoCuadro < 55) return;
        ultimoCuadro = tiempo;

        ctx.fillStyle = 'rgba(2, 8, 5, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = tam + 'px monospace';
        for (let i = 0; i < columnas; i++) {
          const letra = caracteres[Math.floor(Math.random() * caracteres.length)];
          ctx.fillStyle = Math.random() > 0.95 ? 'rgba(190, 255, 214, 0.9)' : 'rgba(0, 255, 102, 0.5)';
          ctx.fillText(letra, i * tam, gotas[i] * tam);
          if (gotas[i] * tam > canvas.height && Math.random() > 0.975) {
            gotas[i] = 0;
          }
          gotas[i]++;
        }
      };
      this._raf = requestAnimationFrame(dibujar);
    },

    detener() {
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._resize) window.removeEventListener('resize', this._resize);
      this._raf = null;
      this._resize = null;
    }
  }
};
</script>

<style scoped>
.fondo-matrix {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
</style>
