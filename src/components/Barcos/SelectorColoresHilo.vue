<template>
  <fieldset class="colores-hilo">
    <legend>Color <span>(hilos)</span></legend>
    <label class="combinar-hilos">
      <input type="checkbox" :checked="combinar" @change="cambiarCombinacion($event.target.checked)">
      Combinar dos colores
    </label>
    <div class="paleta-hilos">
      <button
        v-for="color in colores"
        :key="color.id"
        type="button"
        class="opcion-hilo"
        :aria-pressed="seleccion.includes(color.id) ? 'true' : 'false'"
        @click="seleccionar(color.id)"
      >
        <span class="muestra-hilo" :style="{ backgroundColor: color.muestra }" aria-hidden="true"></span>
        {{ color.nombre }}<span v-if="seleccion.includes(color.id)" aria-hidden="true"> ✓</span>
      </button>
      <button type="button" class="opcion-hilo" :aria-pressed="seleccion.length === 0 ? 'true' : 'false'" @click="limpiar">Sin color</button>
    </div>
    <p class="estado-hilos" role="status">{{ descripcion }}<span v-if="combinar && seleccion.length < 2"> · Elige {{ seleccion.length ? 'el segundo color' : 'hasta dos colores' }}.</span></p>
    <p v-if="combinar && seleccion.length === 2" class="ayuda-hilos">Para cambiar un color, desmárcalo primero.</p>
  </fieldset>
</template>

<script>
import { COLORES_HILO, normalizarColoresHilo, descripcionColoresHilo } from '@/utils/coloresHilo';

export default {
  name: 'SelectorColoresHilo',
  props: {
    value: { type: Array, default: () => [] },
    medida: { type: Object, required: true }
  },
  data() {
    return { colores: COLORES_HILO, combinar: normalizarColoresHilo(this.value).length === 2 };
  },
  watch: {
    medida() { this.combinar = normalizarColoresHilo(this.value).length === 2; }
  },
  computed: {
    seleccion() { return normalizarColoresHilo(this.value); },
    descripcion() { return descripcionColoresHilo(this.value); }
  },
  methods: {
    cambiarCombinacion(combinar) {
      this.combinar = combinar;
      if (!combinar) this.$emit('input', this.seleccion.slice(0, 1));
    },
    seleccionar(id) {
      if (this.seleccion.includes(id)) {
        this.$emit('input', this.seleccion.filter(color => color !== id));
      } else if (!this.combinar) {
        this.$emit('input', [id]);
      } else if (this.seleccion.length < 2) {
        this.$emit('input', [...this.seleccion, id]);
      }
    },
    limpiar() { this.$emit('input', []); }
  }
};
</script>

<style scoped>
.colores-hilo { border: 0; padding: 0; margin: 0 0 20px; min-width: 0; color: #253448; }
.colores-hilo legend { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
.colores-hilo legend span { font-weight: 400; }
.combinar-hilos { display: flex; align-items: center; gap: 8px; min-height: 44px; cursor: pointer; }
.combinar-hilos input { width: 18px; height: 18px; }
.paleta-hilos { display: flex; flex-wrap: wrap; gap: 8px; }
.opcion-hilo { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 8px 10px; border: 2px solid #cbd5e1; border-radius: 9px; background: #fff; color: #253448; font: inherit; cursor: pointer; }
.opcion-hilo[aria-pressed="true"] { border-color: #1d4ed8; box-shadow: inset 0 0 0 1px #1d4ed8; font-weight: 700; }
.opcion-hilo:focus-visible, .combinar-hilos input:focus-visible { outline: 3px solid #1d4ed8; outline-offset: 3px; }
.muestra-hilo { width: 18px; height: 18px; flex-shrink: 0; border: 1px solid #64748b; border-radius: 50%; }
.estado-hilos { margin: 10px 0 0; font-size: .9rem; }
.ayuda-hilos { margin: 4px 0 0; font-size: .85rem; }
</style>
