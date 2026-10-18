<template>
  <div class="selector-metodo-pago" :class="{ animado }">
    <p class="leyenda">Tipo de pago</p>
    <div
      class="pastillas"
      :class="{ colapsado }"
      role="radiogroup"
      aria-label="Tipo de pago"
      aria-required="true"
    >
      <div
        v-for="opcion in opciones"
        :key="opcion.valor"
        class="hueco"
        :class="{ oculta: estaOculta(opcion), elegida: colapsado && metodo === opcion.valor }"
      >
        <button
          type="button"
          class="pastilla"
          :class="{ activo: metodo === opcion.valor, sola: colapsado && metodo === opcion.valor }"
          role="radio"
          :aria-checked="metodo === opcion.valor ? 'true' : 'false'"
          :aria-expanded="ariaExpandido(opcion)"
          :aria-hidden="estaOculta(opcion) ? 'true' : 'false'"
          :tabindex="estaOculta(opcion) ? -1 : 0"
          @click="alTocar(opcion.valor)"
        >{{ opcion.etiqueta }}<svg
          v-if="colapsado && metodo === opcion.valor"
          class="icono-editar"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        ><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm14.71-10.21a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg></button>
      </div>
    </div>
    <label v-if="metodo === 'otro'" class="otro-campo">
      Escribe el tipo de pago
      <input
        ref="otro"
        :value="otro"
        type="text"
        maxlength="80"
        required
        autocomplete="off"
        placeholder="Ej. Cheque o vale"
        aria-label="Escribe el tipo de pago"
        :aria-invalid="error ? 'true' : 'false'"
        @input="escribirOtro($event.target.value)"
      >
    </label>
    <p v-if="error" class="error-metodo" role="alert">{{ error }}</p>
  </div>
</template>

<script>
import { METODOS_PAGO_CATARRO } from '@/utils/fechaAbonoCatarro';

function metodoConocido(valor) {
  return METODOS_PAGO_CATARRO.some(opcion => opcion.valor === valor);
}

export default {
  name: 'SelectorMetodoPagoCatarro',
  props: {
    metodo: { type: String, default: '' },
    otro: { type: String, default: '' },
    error: { type: String, default: '' },
  },
  data() {
    return {
      opciones: METODOS_PAGO_CATARRO,
      expandido: !metodoConocido(this.metodo),
      animado: false,
    };
  },
  computed: {
    colapsado() {
      return !this.expandido && metodoConocido(this.metodo);
    },
  },
  watch: {
    metodo(valor) {
      if (!metodoConocido(valor)) this.expandido = true;
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.animado = true;
    });
  },
  methods: {
    estaOculta(opcion) {
      return this.colapsado && opcion.valor !== this.metodo;
    },
    ariaExpandido(opcion) {
      if (this.metodo !== opcion.valor || !metodoConocido(this.metodo)) return null;
      return this.colapsado ? 'false' : 'true';
    },
    alTocar(valor) {
      if (this.estaOculta({ valor })) return;
      if (this.colapsado) {
        this.expandido = true;
        return;
      }
      if (valor !== this.metodo) this.elegir(valor);
      this.expandido = false;
    },
    elegir(valor) {
      this.$emit('cambiar', {
        metodoPago: valor,
        metodoPagoOtro: valor === 'otro' ? this.otro : '',
      });
      if (valor === 'otro') {
        this.$nextTick(() => {
          if (this.$refs.otro) this.$refs.otro.focus();
        });
      }
    },
    escribirOtro(texto) {
      this.$emit('cambiar', { metodoPago: 'otro', metodoPagoOtro: texto });
    },
  },
};
</script>

<style scoped>
.selector-metodo-pago { min-width: 0; margin-bottom: 12px; }
.leyenda { margin: 0 0 8px; color: #354256; font-size: 13px; font-weight: 700; }
.pastillas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  min-width: 0;
}
.pastillas.colapsado {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.hueco {
  min-width: 0;
  min-height: 0;
  max-height: 72px;
  overflow: hidden;
}
.hueco.oculta {
  max-height: 0;
  opacity: 0;
  transform: scale(0.96);
  pointer-events: none;
}
.pastillas.colapsado .hueco.elegida { order: -1; width: 100%; }
.animado .hueco { transition: max-height 180ms ease, opacity 180ms ease, transform 180ms ease; }
.pastilla {
  min-width: 0;
  min-height: 44px;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 10px;
  overflow: hidden;
  border: 1px solid #a41021;
  border-radius: 999px;
  background: #fff;
  color: #a41021;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
}
.pastilla.sola { justify-content: space-between; padding-left: 16px; padding-right: 14px; }
.pastilla.activo { background: #a41021; color: #fff; }
.pastilla:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
.icono-editar { width: 18px; height: 18px; flex: 0 0 18px; }
.otro-campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
  color: #354256;
  font-size: 13px;
  font-weight: 700;
}
.otro-campo input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid #a2adba;
  border-radius: 8px;
  background: #fff;
  color: #202b3c;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
}
.otro-campo input:focus-visible { outline: 2px solid #a41021; outline-offset: 2px; border-color: #a41021; }
.error-metodo { margin: 8px 0 0; color: #a41021; font-size: 13px; font-weight: 700; }
@media (min-width: 720px) {
  .pastillas { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (prefers-reduced-motion: reduce) {
  .animado .hueco { transition: none; }
}
</style>
