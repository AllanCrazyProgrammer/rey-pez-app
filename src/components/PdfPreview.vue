<template>
  <div>
    <dialog ref="preview" class="pdf-preview" aria-labelledby="pdf-preview-title" @cancel.prevent="cerrar">
      <header>
        <h2 id="pdf-preview-title">{{ pdf ? pdf.name : 'Vista previa del PDF' }}</h2>
        <a v-if="pdf" :href="pdf.url" :download="pdf.name">Guardar PDF</a>
        <button v-if="pdf && esEscritorio" type="button" :disabled="abriendo" @click="abrirParaImprimir">
          {{ abriendo ? 'Abriendo...' : 'Abrir para imprimir' }}
        </button>
        <button type="button" autofocus @click="cerrar">Cerrar</button>
      </header>
      <iframe v-if="pdf" :src="pdf.url" title="Vista previa del PDF"></iframe>
    </dialog>
    <dialog ref="alert" class="pdf-alert" aria-labelledby="pdf-alert-title" @cancel.prevent="cerrarAlerta">
      <h2 id="pdf-alert-title">Aviso del PDF</h2>
      <p>{{ alert }}</p>
      <button type="button" autofocus @click="cerrarAlerta">Cerrar</button>
    </dialog>
  </div>
</template>

<script>
import { useUIStore } from '@/stores/ui';

export default {
  data() {
    return { esEscritorio: Boolean(window.desktop), abriendo: false };
  },
  computed: {
    pdf() { return useUIStore().pdfPreview; },
    alert() { return useUIStore().pdfAlert; }
  },
  watch: {
    alert: { async handler(value) {
      await this.$nextTick();
      if (!this.$refs.alert) return;
      if (value && !this.$refs.alert.open) this.$refs.alert.showModal();
      else if (!value && this.$refs.alert.open) this.$refs.alert.close();
    } },
    pdf: { async handler(value) {
      await this.$nextTick();
      if (!this.$refs.preview) return;
      if (value && !this.$refs.preview.open) this.$refs.preview.showModal();
      else if (!value && this.$refs.preview.open) this.$refs.preview.close();
    } },
    '$route'() { this.cerrar(); this.cerrarAlerta(); }
  },
  beforeDestroy() { this.cerrar(); this.cerrarAlerta(); },
  methods: {
    async abrirParaImprimir() {
      if (!this.pdf || this.abriendo) return;
      const pdf = this.pdf;
      this.abriendo = true;
      try {
        // El blob ya está en este equipo. El visor del sistema permite imprimir
        // sin depender del visor integrado ni de una conexión a internet.
        const response = await fetch(pdf.url);
        const bytes = new Uint8Array(await response.arrayBuffer());
        await window.desktop.savePdf(bytes, pdf.name);
      } catch (error) {
        useUIStore().showPdfAlert(error.message || 'No se pudo abrir el PDF para imprimir.');
      } finally {
        this.abriendo = false;
      }
    },
    cerrar() { useUIStore().closePdfPreview(); },
    cerrarAlerta() { useUIStore().showPdfAlert(''); }
  }
};
</script>

<style scoped>
.pdf-preview, .pdf-alert { font-family: Arial, sans-serif; }
.pdf-preview { width: min(1200px, 96vw); height: 92vh; max-height: 92vh; padding: 0; border: 1px solid #b5cdd3; border-radius: 14px; background: #f5fcfc; color: #173e50; }
.pdf-preview[open] { display: flex; flex-direction: column; }
.pdf-preview::backdrop { background: #082431aa; }
.pdf-preview header { display: flex; align-items: center; gap: 12px; padding: 14px; flex-wrap: wrap; }
.pdf-preview h2 { flex: 1; font-size: 16px; margin: 0; overflow-wrap: anywhere; }
.pdf-preview button, .pdf-preview a { padding: 9px 14px; border: 0; border-radius: 8px; background: #17495b; color: white; cursor: pointer; text-decoration: none; }
.pdf-preview iframe { flex: 1; width: 100%; min-height: 0; border: 0; }
.pdf-alert { max-width: min(530px, 90vw); padding: 24px; border: 1px solid #b5cdd3; border-radius: 14px; background: #f5fcfc; color: #173e50; }
.pdf-alert::backdrop { background: #08243199; }
.pdf-alert button { padding: 10px 18px; border: 0; border-radius: 8px; background: #17495b; color: white; cursor: pointer; }
</style>
