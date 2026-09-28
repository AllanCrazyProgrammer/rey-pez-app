<template>
  <div>
    <aside v-if="state.pending || state.syncing || state.error" class="drive-progress" role="status">
      <span class="drive-progress-icon" aria-hidden="true">☁</span>
      <div><strong>{{ title }}</strong><p>{{ detail }}</p></div>
      <button type="button" @click="$emit('open-settings')">Ver respaldos</button>
    </aside>
    <dialog ref="confirm" class="drive-confirm" aria-labelledby="drive-confirm-title" aria-describedby="drive-confirm-description" @cancel.prevent="answer(false)">
      <div class="drive-confirm-icon" aria-hidden="true">↻</div>
      <p class="drive-eyebrow">RESPALDO EN GOOGLE DRIVE</p>
      <h2 id="drive-confirm-title">{{ files.length === 1 ? 'Este PDF ya existe' : 'Estos PDF ya existen' }}</h2>
      <p id="drive-confirm-description">¿Deseas reemplazar {{ files.length === 1 ? 'el archivo guardado' : 'los archivos guardados' }} por {{ files.length === 1 ? 'esta versión' : 'estas versiones' }}?</p>
      <ul><li v-for="(file, index) in files" :key="index"><span aria-hidden="true">PDF</span><div>{{ file.name }}<small>{{ file.period.day }}/{{ file.period.month }}/{{ file.period.year }}</small></div></li></ul>
      <p class="drive-confirm-hint">Los archivos nuevos se subirán aunque decidas conservar los anteriores. Los reemplazos que pospongas seguirán pendientes.</p>
      <footer><button type="button" class="keep" autofocus @click="answer(false)">Conservar anteriores</button><button type="button" class="replace" @click="answer(true)">{{ files.length === 1 ? 'Sí, reemplazar' : 'Sí, reemplazar todos' }}</button></footer>
    </dialog>
  </div>
</template>
<script>
import { estadoDrive, iniciarSincronizacionDrive, responderReemplazoDrive } from '@/services/DriveNotasSync';
export default {
  data: () => ({ state: estadoDrive }),
  computed: {
    files() { return this.state.replacementRequest || []; },
    title() { return this.state.syncing ? 'Respaldando PDF en Drive…' : this.state.error ? 'No se completó el respaldo' : `${this.state.pending} PDF pendientes en este equipo`; },
    detail() { return this.state.error || (!this.state.connected ? 'Conecta Google Drive para subirlos.' : this.state.needsAuth ? 'Reconecta Google Drive para continuar.' : 'Revisa los archivos pendientes desde Respaldos.'); }
  },
  watch: {
    'state.replacementRequest': { immediate: true, async handler(request) {
      await this.$nextTick();
      const dialog = this.$refs.confirm;
      if (!dialog) return;
      if (request && !dialog.open) dialog.showModal();
      else if (!request && dialog.open) dialog.close();
    } }
  },
  mounted() { iniciarSincronizacionDrive(); },
  beforeDestroy() { if (this.state.replacementRequest) responderReemplazoDrive(false); },
  methods: { answer(value) { responderReemplazoDrive(value); } }
};
</script>
<style scoped>
.drive-progress{position:fixed;bottom:18px;right:18px;z-index:1100;display:flex;align-items:center;gap:14px;max-width:510px;padding:16px 20px;border:1px solid #9bc9ce;border-radius:16px;background:#f5fcfc;color:#153f50;box-shadow:0 8px 30px #092b3926;font-family:Arial,sans-serif}
.drive-progress-icon{font-size:28px}.drive-progress p{margin:5px 0 0;font-size:13px}.drive-progress button{white-space:nowrap;border:0;border-radius:8px;padding:10px;background:#17495b;color:white;cursor:pointer}
.drive-confirm{width:min(530px,calc(100vw - 40px));box-sizing:border-box;padding:30px;border:1px solid #c5dee2;border-radius:24px;background:#fafdfe;color:#173e50;box-shadow:0 24px 90px #001c3a55;font-family:Arial,sans-serif}.drive-confirm::backdrop{background:#08243199}.drive-confirm-icon{display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:#def2ef;color:#167065;font-size:34px}.drive-eyebrow{font-size:11px;font-weight:700;letter-spacing:1.4px;color:#47727d;margin:22px 0 8px}.drive-confirm h2{font-size:27px;margin:0 0 12px}.drive-confirm p{line-height:1.5}.drive-confirm ul{max-height:230px;overflow:auto;list-style:none;padding:0;margin:20px 0;border:1px solid #dae8ea;border-radius:12px;background:white}.drive-confirm li{display:flex;gap:12px;align-items:center;padding:13px;border-bottom:1px solid #eef3f4;overflow-wrap:anywhere}.drive-confirm li>span{font-size:10px;font-weight:700;padding:9px 5px;background:#e6f3f4;border-radius:6px}.drive-confirm small{display:block;margin-top:5px;color:#607b88}.drive-confirm-hint{font-size:13px;color:#607783}.drive-confirm footer{display:flex;gap:12px;margin-top:24px}.drive-confirm button{flex:1;border-radius:10px;padding:13px 10px;font-weight:700;cursor:pointer}.keep{border:1px solid #b5cdd3;background:white;color:#244e5d}.replace{border:1px solid #156c61;background:#156c61;color:white}.drive-confirm button:focus-visible{outline:3px solid #2196f3;outline-offset:3px}@media(max-width:560px){.drive-progress{left:10px;right:10px;bottom:10px;padding:12px}.drive-confirm{padding:22px}.drive-confirm footer{flex-direction:column}}
</style>
