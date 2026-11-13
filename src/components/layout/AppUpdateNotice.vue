<template>
  <aside v-if="visible" class="app-update" :class="{ 'app-update--movil': movil }" role="status">
    <template v-if="estado.lista">
      <span>Hay una versión nueva de ReyPez lista. Se aplicará sola al cerrar la app o al volver a abrirla.</span>
      <button type="button" :disabled="busy" @click="actualizar">{{ busy ? 'Guardando y actualizando…' : 'Actualizar ahora' }}</button>
    </template>
    <template v-else>
      <span>Hay una versión nueva de ReyPez que necesita volver a instalar la app (versión {{ estado.requiereInstalador }} o más nueva).</span>
      <a :href="urlDescargas" target="_blank" rel="noopener">Descargar</a>
      <button type="button" class="app-update__cerrar" @click="cerrado = true">Después</button>
    </template>
    <span v-if="error" role="alert">{{ error }}</span>
  </aside>
</template>
<script>
// Aviso de actualización para las apps instaladas (escritorio y Android). La web usa WebUpdateNotice.
// `fuente`: { estado(), alCambiar(handler) → quitar, aplicar() } (services/actualizacionEscritorio.js
// o mobile/actualizacionAndroid.js).
export default {
  props: {
    fuente: { type: Object, default: null },
    beforeUpdate: { type: Function, default: null },
    movil: { type: Boolean, default: false }
  },
  data: () => ({
    estado: { lista: null, requiereInstalador: null }, busy: false, error: '', cerrado: false,
    urlDescargas: 'https://github.com/AllanCrazyProgrammer/rey-pez-app/releases/latest'
  }),
  computed: {
    visible() { return Boolean(this.estado.lista || (this.estado.requiereInstalador && !this.cerrado)); }
  },
  async mounted() {
    if (!this.fuente) return;
    this._quitar = this.fuente.alCambiar(estado => this.recibir(estado));
    try { this.recibir(await this.fuente.estado()); } catch (_) { /* sin estado todavía */ }
  },
  beforeDestroy() { if (this._quitar) this._quitar(); },
  methods: {
    recibir(estado) {
      if (!estado) return;
      this.estado = { lista: estado.lista || null, requiereInstalador: estado.requiereInstalador || null };
    },
    async actualizar() {
      this.busy = true;
      this.error = '';
      try {
        if (this.beforeUpdate) await this.beforeUpdate();
        await this.fuente.aplicar();
        // En escritorio la ventana se guarda y recarga; si algo lo impide, el proceso principal avisa.
        setTimeout(() => { this.busy = false; }, 20000);
      } catch (error) {
        this.error = error.message || String(error);
        this.busy = false;
      }
    }
  }
};
</script>
<style scoped>
.app-update { position: fixed; bottom: 16px; right: 16px; z-index: 20000; max-width: min(480px, calc(100vw - 32px)); display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 14px; background: #fff; color: #123e50; border: 2px solid #24718c; border-radius: 10px; box-shadow: 0 4px 20px #0003; }
.app-update button, .app-update a { background: #123e50; color: #fff; border: 0; border-radius: 5px; padding: 6px 12px; text-decoration: none; font: inherit; }
.app-update button:disabled { opacity: .7; }
.app-update .app-update__cerrar { background: transparent; color: #123e50; border: 1px solid #24718c; }
.app-update--movil { left: 12px; right: 12px; bottom: calc(76px + env(safe-area-inset-bottom, 0px)); max-width: none; }
</style>
