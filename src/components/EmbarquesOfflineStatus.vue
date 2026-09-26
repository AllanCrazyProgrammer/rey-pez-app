<template>
  <aside class="offline-status" aria-live="polite">
    <strong>{{ state.online ? 'Embarques en este equipo' : 'Sin internet · puedes seguir trabajando' }}</strong>
    <span>{{ state.count }} disponibles · {{ state.pending }} pendientes de subir</span>
    <span v-if="state.syncing">Subiendo cambios…</span>
    <span v-if="state.downloading">Descargando historial para usar sin internet…</span>
    <span v-else-if="!state.shellReady">Preparando apertura sin internet. Mantén esta ventana abierta.</span>
    <span v-else>{{ desktop ? 'Aplicación instalada · abre sin internet' : 'Aplicación disponible sin internet.' }}</span>
    <span v-if="state.archiveReady && !state.downloading">Historial descargado en esta sesión.</span>
    <button :disabled="!state.online || state.downloading" @click="prepare">Descargar / actualizar historial</button>
    <button :disabled="!!busy" @click="exportar">{{ busy === 'export' ? 'Preparando archivo…' : 'Exportar pendientes' }}</button>
    <button v-if="!editorOpen" :disabled="!!busy" @click="$refs.backupFile.click()">Importar respaldo</button>
    <router-link v-else :to="{ name: 'ListaEmbarques' }">Ir a la lista para importar</router-link>
    <input ref="backupFile" type="file" accept=".json,application/json" hidden @change="leerArchivo">
    <p v-if="transferMessage" role="status">{{ transferMessage }}</p>
    <p v-if="transferError" role="alert">{{ transferError }}</p>
    <details v-if="driveAvailable" class="drive-archive">
      <summary>Notas en Google Drive <span v-if="driveStatus.connected">· {{ driveStatus.folderName }}</span><span v-else>· configurar respaldo</span></summary>
      <p>Al crear el resumen final, las notas de cada cliente se guardan aquí y se suben cuando haya conexión.</p>
      <template v-if="desktop">
        <label for="drive-client-id">ID OAuth de {{ drivePlatformLabel }}</label>
        <input id="drive-client-id" v-model.trim="driveClientId" type="text" autocomplete="off" placeholder="…apps.googleusercontent.com">
      </template>
      <button :disabled="driveBusy || (desktop && !driveClientId) || !drivePickerConfigured" @click="conectarDrive">{{ driveBusy ? 'Conectando…' : driveStatus.connected ? (driveStatus.needsAuth ? 'Autorizar y subir pendientes' : 'Reconectar / elegir carpeta') : 'Conectar y elegir carpeta compartida' }}</button>
      <button v-if="driveStatus.connected && !driveStatus.needsAuth" :disabled="driveBusy" @click="sincronizarDrive">{{ driveStatus.syncing ? 'Subiendo notas…' : 'Subir notas pendientes' }}</button>
      <button v-if="driveStatus.connected" :disabled="driveBusy" @click="desconectarDrive">Desconectar</button>
      <span v-if="driveStatus.pending">{{ driveStatus.pending }} nota(s) pendiente(s)</span>
      <p v-if="driveStatus.error" role="alert">{{ driveStatus.error }}</p>
      <small v-if="desktop">Conecta la cuenta autorizada en la carpeta compartida y selecciona esa misma carpeta en cada equipo. El ID de cliente queda guardado en este equipo.</small>
      <small v-else>La web guarda las notas pendientes en este navegador. Al reconectar Google se subirán a la carpeta compartida; por seguridad, después de cerrar o recargar la página tendrás que autorizar Drive otra vez.</small>
      <small v-if="!desktop && !drivePickerConfigured">El administrador debe terminar la configuración del selector de Google Drive para habilitar la conexión web.</small>
    </details>
    <section v-if="backup" class="transfer-review" aria-label="Revisar respaldo">
      <strong>{{ backupName }} · {{ backup.records.length }} embarques pendientes</strong>
      <p>Se conservarán los identificadores originales. Los embarques con cambios pendientes o una versión más reciente en este equipo no se reemplazarán.</p>
      <p v-if="deletions">Incluye {{ deletions }} eliminaciones pendientes que se enviarán a la nube al sincronizar.</p>
      <ul><li v-for="record in backup.records.slice(0, 10)" :key="record.id">{{ record.docData.fecha }} · {{ record.docData.cargaCon || 'Sin responsable' }}{{ record.deleted ? ' · Eliminar' : '' }}</li></ul>
      <p v-if="backup.records.length > 10">Y {{ backup.records.length - 10 }} embarques más.</p>
      <button :disabled="busy || backup.records.length === 0" @click="importar">{{ busy === 'import' ? 'Guardando…' : 'Confirmar importación' }}</button>
      <button :disabled="!!busy" @click="cancelar">Cancelar</button>
    </section>
    <ul v-if="skipped.length" class="transfer-review">
      <li v-for="record in skipped" :key="record.id">{{ record.fecha }} ({{ record.id }}): {{ record.reason }}</li>
    </ul>
    <p v-if="state.error" role="alert">{{ state.error }}</p>
    <p v-for="record in state.conflicts" :key="record.id">
      Hay cambios de otro equipo en {{ record.fecha }}.
      <router-link :to="{ name: 'EditarEmbarque', params: { id: record.id } }">Abrir para revisar</router-link>
    </p>
    <small>{{ desktop ? 'Los datos quedan guardados dentro de ReyPez en este equipo.' : 'Los datos quedan en este navegador y equipo.' }} Para subir cambios, abre la aplicación con conexión. No borres los datos del sitio mientras haya pendientes.</small>
  </aside>
</template>
<script>
import sync, { estadoOffline } from '@/services/EmbarquesSync';
import { exportPending, parseBackup, importBackup, MAX_BACKUP_BYTES } from '@/services/EmbarquesTransferService';
import { estadoDrive, conectarGoogleDrive, desconectarGoogleDrive, driveNotasDisponible, drivePickerConfigurado, iniciarSincronizacionDrive, sincronizarNotasDrive } from '@/services/DriveNotasSync';
const DRIVE_CLIENT_IDS = {
  darwin: '512757841511-dei6iqrdunuo49ok9cmse6fapoodslm8.apps.googleusercontent.com',
  win32: '512757841511-cftpbu6iasorjao0f3krm9le8tfk5i31.apps.googleusercontent.com'
};
export default {
  props: { beforeExport: Function, editorOpen: Boolean },
  data: () => ({ state: estadoOffline, desktop: Boolean(window.desktop), driveAvailable: driveNotasDisponible(), drivePickerConfigured: drivePickerConfigurado(), busy: '', backup: null, backupText: '', backupName: '', transferMessage: '', transferError: '', skipped: [], driveStatus: estadoDrive, driveClientId: localStorage.getItem(`reypez.googleDrive.clientId.${window.desktop?.platform || 'web'}`) || DRIVE_CLIENT_IDS[window.desktop?.platform] || '', driveBusy: false }),
  computed: {
    deletions() { return this.backup ? this.backup.records.filter(r => r.deleted).length : 0; },
    drivePlatformLabel() { return window.desktop?.platform === 'win32' ? 'Windows' : 'Mac'; }
  },
  mounted() { sync.start(); iniciarSincronizacionDrive(); },
  methods: {
    prepare() { sync.prepare(); sync.sync(); },
    async conectarDrive() {
      this.driveBusy = true;
      this.driveStatus.error = '';
      try {
        if (this.desktop) localStorage.setItem(`reypez.googleDrive.clientId.${window.desktop.platform}`, this.driveClientId);
        await conectarGoogleDrive(this.driveClientId);
        this.transferMessage = `Drive conectado. Las notas pendientes se subirán a ${this.driveStatus.folderName}.`;
      } catch (error) { this.driveStatus.error = error.message; }
      finally { this.driveBusy = false; }
    },
    async sincronizarDrive() {
      this.driveBusy = true;
      try { await sincronizarNotasDrive({ interactive: true }); }
      finally { this.driveBusy = false; }
    },
    async desconectarDrive() {
      this.driveBusy = true;
      try { await desconectarGoogleDrive(); }
      catch (error) { this.driveStatus.error = error.message; }
      finally { this.driveBusy = false; }
    },
    cancelar() { this.backup = null; this.backupText = ''; this.$refs.backupFile.value = ''; },
    async exportar() {
      this.busy = 'export'; this.transferError = ''; this.transferMessage = '';
      try {
        if (this.beforeExport) await this.beforeExport();
        const result = await exportPending();
        const url = URL.createObjectURL(new Blob([result.text], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url; link.download = result.filename;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.transferMessage = `Archivo preparado con ${result.count} embarques. Comprueba que se guardó en Descargas; impórtalo en ReyPez y continúa trabajando allí. La copia original sigue pendiente de subir.`;
      } catch (error) { this.transferError = error.message; }
      finally { this.busy = ''; }
    },
    async leerArchivo(event) {
      const file = event.target.files[0];
      if (!file) return;
      this.transferError = ''; this.transferMessage = ''; this.skipped = []; this.backup = null;
      this.busy = 'read';
      try {
        if (file.size > MAX_BACKUP_BYTES) throw new Error('El respaldo supera el límite de 50 MB.');
        const text = await file.text();
        this.backup = parseBackup(text); this.backupText = text; this.backupName = file.name;
      } catch (error) { this.transferError = error.message; }
      finally { this.busy = ''; event.target.value = ''; }
    },
    async importar() {
      this.busy = 'import'; this.transferError = '';
      try {
        const result = await importBackup(this.backupText, sync.editorId);
        this.skipped = result.skipped;
        this.transferMessage = `${result.imported.length} importados; ${result.duplicates.length} ya estaban importados o eran iguales; ${result.skipped.length} sin reemplazar. Los importados quedaron guardados en este equipo y pendientes de subir. Conserva el archivo si hay embarques sin importar.`;
        this.cancelar();
        await sync.refresh();
        // The normal queue will retry; import success never waits for the internet.
      } catch (error) { this.transferError = error.message; }
      finally { this.busy = ''; }
    }
  }
};
</script>
<style scoped>
.offline-status { margin: 12px auto; padding: 12px 18px; max-width: 1300px; background: #edf8fb; color: #123e50; border: 1px solid #92cbd5; border-radius: 8px; display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; }
.offline-status small, .offline-status p { width: 100%; margin: 0; }
.offline-status button { background: #123e50; color: white; border: 0; border-radius: 5px; padding: 6px 12px; }
.offline-status button:disabled { opacity: .5; }
.transfer-review { width: 100%; padding: 12px; background: white; border: 1px solid #92cbd5; border-radius: 6px; overflow-wrap: anywhere; }
.transfer-review button { margin: 8px 8px 0 0; }
.offline-status a { text-decoration: underline; }
.drive-archive { display: flex; width: 100%; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 10px; background: #fff; border: 1px solid #c6d9de; border-radius: 6px; }
.drive-archive summary { cursor: pointer; font-weight: 700; }
.drive-archive p, .drive-archive small { width: 100%; margin: 0; }
.drive-archive label { font-weight: 600; }
.drive-archive input { min-width: 300px; padding: 6px 8px; border: 1px solid #9ab3bc; border-radius: 5px; }
</style>
