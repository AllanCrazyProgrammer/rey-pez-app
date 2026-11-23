<!-- BotonBascula.vue
     Botón "Conectar báscula" para las pantallas de Pesadas (app de despique). Usa el mismo estado
     compartido que el embarque (src/stores/bascula.js): si se conecta aquí, sigue conectada al
     pasar a Pesar rápido. Ámbar y latiendo mientras está desconectada; verde al conectar.
     Tocarlo con la báscula conectada la desconecta. -->
<template>
  <button
    type="button"
    class="boton-bascula"
    :class="{ 'boton-bascula--conectada': bascula.conectada, 'boton-bascula--conectando': bascula.conectando }"
    :disabled="!bascula.soportada || bascula.conectando"
    :title="titulo"
    :aria-pressed="bascula.conectada ? 'true' : 'false'"
    data-bascula-conectar
    @click="alternar"
  >
    <i :class="['fas', bascula.conectando ? 'fa-spinner fa-spin' : 'fa-weight-scale']" aria-hidden="true"></i>
    {{ texto }}
  </button>
</template>

<script>
import { useBasculaStore } from '@/stores/bascula';

export default {
  name: 'BotonBascula',
  computed: {
    bascula() {
      return useBasculaStore();
    },
    texto() {
      if (this.bascula.conectando) return 'Conectando…';
      if (this.bascula.conectada) return 'Báscula conectada';
      if (this.bascula.puedeReconectar) return 'Reconectar báscula';
      return 'Conectar báscula';
    },
    titulo() {
      if (!this.bascula.soportada) return 'Este dispositivo no soporta Bluetooth para la báscula.';
      if (this.bascula.conectada) return `${this.bascula.nombre}: toca para desconectar.`;
      if (this.bascula.puedeReconectar) return 'Se perdió la conexión con la báscula. Enciéndela y toca para reconectar.';
      return 'Conectar la báscula por Bluetooth.';
    },
  },
  methods: {
    alternar() {
      if (this.bascula.conectada) this.bascula.desconectar();
      else this.bascula.conectar();
    },
  },
};
</script>

<style scoped>
.boton-bascula {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  color: #1a0f00;
  border: 1px solid #fbbf24;
  border-radius: 9px;
  background: linear-gradient(135deg, #fbbf24, #f97316);
  box-shadow: 0 0 0 1px rgba(251, 191, 36, .35), 0 6px 18px rgba(249, 115, 22, .4);
  cursor: pointer;
  animation: boton-bascula-latido 2.4s ease-in-out infinite;
}
.boton-bascula i { font-size: 1rem; }
.boton-bascula:hover:not(:disabled) { background: linear-gradient(135deg, #fcd34d, #fb923c); }
.boton-bascula:focus-visible { outline: 3px solid #138698; outline-offset: 2px; }
.boton-bascula:disabled { animation: none; opacity: .55; cursor: not-allowed; filter: grayscale(.45); }
.boton-bascula--conectando { animation: none; }
.boton-bascula--conectada,
.boton-bascula--conectada:hover:not(:disabled) {
  color: #02170b;
  border-color: #4ade80;
  background: linear-gradient(135deg, #4ade80, #22c55e);
  box-shadow: 0 0 0 1px rgba(74, 222, 128, .35), 0 6px 18px rgba(34, 197, 94, .4);
  animation: none;
}
@keyframes boton-bascula-latido {
  0%, 100% { box-shadow: 0 0 0 1px rgba(251, 191, 36, .35), 0 6px 18px rgba(249, 115, 22, .3); }
  50% { box-shadow: 0 0 0 4px rgba(251, 191, 36, .22), 0 6px 24px rgba(249, 115, 22, .6); }
}
@media (prefers-reduced-motion: reduce) {
  .boton-bascula { animation: none; }
}
</style>
