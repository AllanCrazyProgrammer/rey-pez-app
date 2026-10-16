<template>
  <div class="visor" role="dialog" aria-modal="true" aria-label="Foto del equipo" @click.self="$emit('cerrar')">
    <button type="button" class="cerrar" @click="$emit('cerrar')">Cerrar</button>
    <img :src="url" alt="Foto del equipo" />
  </div>
</template>

<script>
export default {
  name: 'VisorFoto',
  props: {
    url: { type: String, required: true },
  },
  mounted() {
    this._tecla = (event) => {
      if (event.key === 'Escape') this.$emit('cerrar');
    };
    document.addEventListener('keydown', this._tecla);
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this._tecla);
  },
};
</script>

<style scoped>
.visor {
  position: fixed;
  inset: 0;
  z-index: 10020;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  background: rgba(16, 40, 31, 0.88);
}
.cerrar {
  align-self: flex-end;
  min-height: 44px;
  padding: 8px 14px;
  border: 0;
  border-radius: 10px;
  background: #fff;
  color: #173b36;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
img {
  max-width: 100%;
  max-height: calc(100dvh - 96px);
  object-fit: contain;
  border-radius: 12px;
  background: #10281f;
}
</style>
