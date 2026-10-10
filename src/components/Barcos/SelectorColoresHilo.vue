<template>
  <div class="selector-hilos" @keydown.esc.stop.prevent="cerrarMenu(true)">
    <button
      ref="botonColor"
      type="button"
      class="boton-color"
      :aria-expanded="abierto ? 'true' : 'false'"
      :aria-controls="panelId"
      :title="'Color de hilos: ' + descripcion"
      @click="alternarMenu"
      @keydown.down.prevent="abrirMenu"
    >Color</button>
    <fieldset v-if="abierto" :id="panelId" ref="panel" class="colores-hilo">
      <legend class="titulo-panel-hilos">Color de hilos</legend>
      <button type="button" class="cerrar-hilos" aria-label="Cerrar colores" @click="cerrarMenu(true)">✕</button>
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
  </div>
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
    return { abierto: false, panelId: `colores-hilo-${this._uid}`, colores: COLORES_HILO, combinar: normalizarColoresHilo(this.value).length === 2 };
  },
  watch: {
    medida() {
      this.combinar = normalizarColoresHilo(this.value).length === 2;
      this.cerrarMenu();
    }
  },
  mounted() {
    document.addEventListener('pointerdown', this.cerrarDesdeFuera);
    document.addEventListener('focusin', this.cerrarDesdeFuera);
  },
  beforeDestroy() {
    document.removeEventListener('pointerdown', this.cerrarDesdeFuera);
    document.removeEventListener('focusin', this.cerrarDesdeFuera);
  },
  computed: {
    seleccion() { return normalizarColoresHilo(this.value); },
    descripcion() { return descripcionColoresHilo(this.value); }
  },
  methods: {
    alternarMenu() {
      if (this.abierto) this.cerrarMenu();
      else this.abrirMenu();
    },
    abrirMenu() {
      this.abierto = true;
      this.$nextTick(() => {
        if (!this.abierto || !this.$refs.panel) return;
        const control = this.$refs.panel.querySelector('input');
        if (control) control.focus();
      });
    },
    cerrarMenu(devolverFoco = false) {
      this.abierto = false;
      if (devolverFoco && this.$refs.botonColor) this.$refs.botonColor.focus();
    },
    cerrarDesdeFuera(event) {
      if (this.abierto && !this.$el.contains(event.target)) this.cerrarMenu();
    },
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
.selector-hilos { position: relative; margin: 0 0 16px; }
.boton-color { min-height: 44px; padding: 8px 18px; border: 2px solid #cbd5e1; border-radius: 9px; background: #fff; color: #253448; font: inherit; font-weight: 600; cursor: pointer; }
.boton-color[aria-expanded="true"] { border-color: #1d4ed8; }
.colores-hilo { position: absolute; z-index: 20; top: calc(100% + 8px); left: 0; box-sizing: border-box; width: min(440px, 100%); max-height: 65vh; overflow-y: auto; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin: 0; min-width: 0; color: #253448; background: #fff; box-shadow: 0 8px 24px rgba(15, 23, 42, .18); }
.colores-hilo .titulo-panel-hilos { float: left; width: calc(100% - 44px); padding: 0; min-height: 44px; display: flex; align-items: center; }
.cerrar-hilos { float: right; min-width: 44px; min-height: 44px; border: 0; border-radius: 8px; background: #f1f5f9; color: #253448; font: inherit; cursor: pointer; }
.combinar-hilos { clear: both; }
.boton-color:focus-visible, .cerrar-hilos:focus-visible { outline: 3px solid #1d4ed8; outline-offset: 3px; }
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
