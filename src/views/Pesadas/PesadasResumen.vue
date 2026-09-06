<template>
  <div class="pesadas-page pesadas-preview-overlay" @keydown.esc="$emit('cerrar')" @keydown.tab="trapFocus">
    <section ref="dialog" class="pesadas-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="pesadas-preview-title">
      <header><div><h2 id="pesadas-preview-title">Resumen para imprimir</h2><p>{{ fechaTexto }} · Carta vertical · Pagos después de baños</p></div><button ref="close" class="pesadas-button" aria-label="Cerrar vista previa" @click="$emit('cerrar')">Cerrar ×</button></header>
      <p v-if="pendiente" class="pesadas-alert">Este resumen incluye cambios pendientes de sincronizar.</p>
      <p v-if="error" class="pesadas-alert" role="alert">{{ error }}</p>
      <div class="pesadas-toolbar"><button class="pesadas-button primary" :disabled="!url" @click="imprimir">Imprimir</button><button class="pesadas-button" :disabled="!url" @click="descargar">Descargar PDF</button><span class="pesadas-hint">Si tu visor no permite imprimir, descarga el PDF y ábrelo.</span></div>
      <p v-if="cargando" class="pesadas-empty" role="status">Preparando resumen…</p>
      <iframe v-if="url" :src="url" title="Vista previa del resumen de pagos" class="pesadas-pdf-frame"></iframe>
    </section>
  </div>
</template>

<script>
import { crearPdfPesadas } from '@/utils/pdf/pesadas';
import { formatoFechaPesadas } from '@/utils/pesadas';
export default {
  name: 'PesadasResumen',
  props: { fecha: { type: String, required: true }, datos: { type: Object, required: true }, pendiente: Boolean },
  data: () => ({ url: '', error: '', cargando: true }),
  computed: { fechaTexto() { return formatoFechaPesadas(this.fecha); } },
  async mounted() {
    this._focusBefore = document.activeElement;
    document.body.appendChild(this.$el);
    this._overflowBefore = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.$refs.close.focus();
    try {
      const result = await crearPdfPesadas(this.fecha, this.datos);
      if (this._closed) return;
      this._pdf = result.pdf;
      this.url = URL.createObjectURL(result.blob);
    } catch (error) { this.error = `No se pudo preparar el PDF. ${error.message}`; }
    finally { this.cargando = false; }
  },
  beforeDestroy() {
    this._closed = true;
    if (this.url) URL.revokeObjectURL(this.url);
    document.body.style.overflow = this._overflowBefore;
    if (this._focusBefore && this._focusBefore.isConnected) this._focusBefore.focus();
    if (this.$el.parentNode) this.$el.parentNode.removeChild(this.$el);
  },
  methods: {
    imprimir() {
      try { this._pdf.print(); }
      catch (_error) { this.error = 'No se pudo abrir la impresión. Descarga el PDF para imprimirlo.'; }
    },
    descargar() {
      const link = document.createElement('a');
      link.href = this.url;
      link.download = `Pesadas-${this.fecha}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    trapFocus(event) {
      const elements = this.$refs.dialog.querySelectorAll('button:not(:disabled), iframe');
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
};
</script>
