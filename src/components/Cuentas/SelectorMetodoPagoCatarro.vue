<template>
  <div class="selector-metodo-pago">
    <p class="leyenda">Tipo de pago</p>
    <div class="pastillas" role="radiogroup" aria-label="Tipo de pago" aria-required="true">
      <button
        v-for="opcion in opciones"
        :key="opcion.valor"
        type="button"
        class="pastilla"
        role="radio"
        :aria-checked="metodo === opcion.valor ? 'true' : 'false'"
        :class="{ activo: metodo === opcion.valor }"
        @click="elegir(opcion.valor)"
      >{{ opcion.etiqueta }}</button>
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

export default {
  name: 'SelectorMetodoPagoCatarro',
  props: {
    metodo: { type: String, default: '' },
    otro: { type: String, default: '' },
    error: { type: String, default: '' },
  },
  data() {
    return { opciones: METODOS_PAGO_CATARRO };
  },
  methods: {
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
.selector-metodo-pago { min-width: 0; }
.leyenda { margin: 0 0 8px; color: #354256; font-size: 13px; font-weight: 700; }
.pastillas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.pastilla {
  min-width: 0;
  min-height: 44px;
  padding: 8px 10px;
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
.pastilla.activo { background: #a41021; color: #fff; }
.pastilla:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
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
</style>
