<template>
  <div class="foto-maquina" @click.stop @keydown.stop>
    <input
      ref="archivo"
      class="archivo-oculto"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      :aria-label="'Elegir foto de la máquina de ' + nombre"
      :disabled="!!ocupada"
      @click.stop
      @change="alElegir"
    />
    <button
      v-if="!foto || !foto.url"
      type="button"
      class="foto-vacia"
      :disabled="!!ocupada"
      :aria-label="(ocupada ? 'Subiendo foto de la máquina de ' : 'Agregar foto de la máquina de ') + nombre"
      @click.stop="abrirSelector"
    >
      <i :class="ocupada ? 'fas fa-circle-notch fa-spin' : 'fas fa-camera'" aria-hidden="true"></i>
      <span>{{ textoVacio }}</span>
    </button>
    <div v-else class="foto-llena">
      <img :src="foto.url" :alt="'Máquina de ' + nombre" />
      <div class="foto-acciones">
        <button
          type="button"
          :disabled="!!ocupada"
          :aria-label="'Cambiar foto de la máquina de ' + nombre"
          @click.stop="abrirSelector"
        >
          {{ ocupada ? '…' : 'Cambiar' }}
        </button>
        <button
          type="button"
          class="quitar"
          :disabled="!!ocupada"
          :aria-label="'Quitar foto de la máquina de ' + nombre"
          @click.stop="$emit('quitar')"
        >
          Quitar
        </button>
      </div>
    </div>
    <p v-if="error" class="foto-error" role="alert">{{ error }}</p>
  </div>
</template>

<script>
export default {
  name: 'FotoMaquinaCuarto',
  props: {
    nombre: { type: String, required: true },
    foto: { type: Object, default: null },
    ocupada: { type: String, default: '' },
    error: { type: String, default: '' },
  },
  computed: {
    textoVacio() {
      if (this.ocupada === 'preparando') return 'Preparando…';
      if (this.ocupada) return 'Subiendo…';
      return 'Agregar foto';
    },
  },
  methods: {
    abrirSelector() {
      if (this.ocupada) return;
      this.$refs.archivo.click();
    },
    alElegir(event) {
      const archivo = (event.target.files || [])[0];
      event.target.value = '';
      if (archivo) this.$emit('elegir', archivo);
    },
  },
};
</script>

<style scoped>
.foto-maquina {
  flex: 0 0 108px;
  width: 108px;
  min-height: 132px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
}
.archivo-oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.foto-vacia,
.foto-llena {
  flex: 1;
  min-height: 132px;
  border-radius: 14px;
}
.foto-vacia {
  border: 1px dashed #8db3a3;
  background: #f4faf6;
  color: #17664e;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  cursor: pointer;
  text-align: center;
}
.foto-vacia i {
  font-size: 20px;
}
.foto-vacia:disabled {
  opacity: 0.6;
  cursor: wait;
}
.foto-vacia:focus-visible,
.foto-acciones button:focus-visible {
  outline: 3px solid #378c73;
  outline-offset: 2px;
}
.foto-llena {
  position: relative;
  overflow: hidden;
  border: 1px solid #dce6df;
  background: #eef5f1;
}
.foto-llena img {
  width: 100%;
  height: 100%;
  min-height: 132px;
  object-fit: cover;
  display: block;
}
.foto-acciones {
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 4px;
  display: flex;
  gap: 4px;
}
.foto-acciones button {
  flex: 1;
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  color: #17664e;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  padding: 4px;
}
.foto-acciones .quitar {
  color: #ac4747;
}
.foto-acciones button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.foto-error {
  margin: 0;
  color: #973b30;
  font-size: 11px;
  line-height: 1.3;
}
@media (max-width: 360px) {
  .foto-maquina {
    flex-basis: 92px;
    width: 92px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .foto-vacia i {
    animation: none;
  }
}
</style>
