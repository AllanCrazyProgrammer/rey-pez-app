<template>
  <div class="pesadas-page pesadas-preview-overlay pesadas-measures-overlay" @click.self="$emit('cerrar')" @keydown.esc.stop="$emit('cerrar')" @keydown.tab.prevent="$refs.close.focus()">
    <section class="pesadas-preview-dialog pesadas-measures-dialog" role="dialog" aria-modal="true" aria-labelledby="pesadas-measures-title" aria-describedby="pesadas-measures-description">
      <header>
        <div><h2 id="pesadas-measures-title">Kilos por medida</h2><p>{{ fechaTexto(dia.fecha) }}</p></div>
        <button ref="close" class="pesadas-button" aria-label="Cerrar kilos por medida" @click="$emit('cerrar')">Cerrar ×</button>
      </header>
      <p id="pesadas-measures-description" class="pesadas-hint">Total despicado del día, agrupando las columnas de la misma medida.</p>
      <p v-if="dia.pendiente" class="pesadas-alert">Incluye cambios pendientes de sincronizar.</p>
      <p v-else-if="desdeCache" class="pesadas-hint">Mostrando los datos guardados en este dispositivo.</p>
      <p v-if="!dia.resumen.kilosPorMedida.length" class="pesadas-empty">Todavía no hay medidas registradas en esta jornada.</p>
      <table v-else class="pesadas-measures-table">
        <thead><tr><th scope="col">Medida</th><th scope="col">Kilos despicados</th></tr></thead>
        <tbody>
          <tr v-for="(grupo, index) in dia.resumen.kilosPorMedida" :key="index"><th scope="row">{{ grupo.medida }}</th><td>{{ numero(grupo.kilos) }} kg</td></tr>
        </tbody>
        <tfoot><tr><th scope="row">Total del día</th><td>{{ numero(dia.resumen.kilos) }} kg</td></tr></tfoot>
      </table>
    </section>
  </div>
</template>

<script>
import { formatoFechaPesadas, formatoPesada } from '@/utils/pesadas';

export default {
  name: 'PesadasMedidas',
  props: { dia: { type: Object, required: true }, desdeCache: Boolean },
  mounted() {
    this._focusBefore = document.activeElement;
    document.body.appendChild(this.$el);
    this._overflowBefore = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.$refs.close.focus();
  },
  beforeDestroy() {
    document.body.style.overflow = this._overflowBefore;
    if (this._focusBefore && this._focusBefore.isConnected) this._focusBefore.focus();
    if (this.$el.parentNode) this.$el.parentNode.removeChild(this.$el);
  },
  methods: { numero: formatoPesada, fechaTexto: formatoFechaPesadas }
};
</script>
