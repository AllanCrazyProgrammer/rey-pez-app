<template>
  <dialog ref="dialog" class="subir-resumen" aria-labelledby="subir-resumen-title" @cancel.prevent="responder(null)">
    <h2 id="subir-resumen-title">¿Quieres subir el resumen a la nube?</h2>
    <p>Se abrirá el PDF para verlo. Si eliges subirlo, también se respaldarán en Google Drive las taras, los rendimientos y las notas de los clientes.</p>
    <p>Si no hay conexión, los PDF quedarán pendientes para subir cuando se conecte Drive.</p>
    <footer>
      <button type="button" @click="responder(null)">Cerrar</button>
      <button type="button" autofocus @click="responder(false)">No, solo ver PDF</button>
      <button type="button" class="subir" @click="responder(true)">Sí, subir a la nube</button>
    </footer>
  </dialog>
</template>

<script>
export default {
  beforeDestroy() { this.responder(null); },
  methods: {
    solicitar() {
      return new Promise(resolve => {
        this.resolver = resolve;
        this.$refs.dialog.showModal();
      });
    },
    responder(value) {
      this.$refs.dialog?.close();
      const resolve = this.resolver;
      this.resolver = null;
      if (resolve) resolve(value);
    }
  }
};
</script>

<style scoped>
.subir-resumen { font-family: Arial, sans-serif; width: min(530px, calc(100vw - 40px)); padding: 26px; border: 1px solid #b5cdd3; border-radius: 18px; background: #f5fcfc; color: #173e50; }
.subir-resumen::backdrop { background: #08243199; }
.subir-resumen h2 { margin: 0 0 18px; font-size: 24px; }
.subir-resumen p { line-height: 1.5; }
.subir-resumen footer { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 22px; }
.subir-resumen button { padding: 12px; border: 1px solid #b5cdd3; border-radius: 8px; background: white; color: #173e50; cursor: pointer; }
.subir-resumen .subir { background: #156c61; color: white; }
</style>
