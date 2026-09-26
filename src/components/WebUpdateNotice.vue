<template>
  <aside v-if="ready || error" class="web-update" role="status">
    <span>Hay una versión nueva de ReyPez web.</span>
    <button :disabled="busy" @click="actualizar">{{ busy ? 'Guardando y actualizando…' : 'Actualizar web' }}</button>
    <span v-if="error" role="alert">{{ error }}</span>
  </aside>
</template>
<script>
import { estadoOffline } from '@/services/EmbarquesSync';
export default {
  props: { beforeUpdate: Function },
  data: () => ({ ready: false, busy: false, error: '' }),
  mounted() {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    this._onControllerChange = () => { if (this.busy) location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange', this._onControllerChange);
    navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' }).then(registration => {
      this._registration = registration;
      const check = () => { this.ready = Boolean(registration.waiting && navigator.serviceWorker.controller); };
      this._onUpdateFound = () => {
        const installing = registration.installing;
        if (installing) installing.addEventListener('statechange', check);
      };
      registration.addEventListener('updatefound', this._onUpdateFound);
      this._onUpdateFound();
      check();
      registration.update().catch(() => {});
      return navigator.serviceWorker.ready;
    }).then(() => { estadoOffline.shellReady = true; })
      .catch(error => console.warn('No se pudo preparar la web sin conexión:', error));
  },
  beforeDestroy() {
    navigator.serviceWorker?.removeEventListener('controllerchange', this._onControllerChange);
    this._registration?.removeEventListener('updatefound', this._onUpdateFound);
  },
  methods: {
    async actualizar() {
      this.busy = true;
      this.error = '';
      try {
        if (this.beforeUpdate) await this.beforeUpdate();
        const worker = this._registration?.waiting;
        if (!worker) { this.ready = false; this.busy = false; return; }
        await new Promise((resolve, reject) => {
          const channel = new MessageChannel();
          const timer = setTimeout(() => { channel.port1.close(); reject(new Error('No se pudo activar la actualización. Intenta de nuevo.')); }, 15000);
          channel.port1.onmessage = ({ data }) => {
            clearTimeout(timer); channel.port1.close();
            if (data.error) reject(new Error(data.error)); else resolve();
          };
          worker.postMessage({ type: 'ACTIVATE_WEB_UPDATE' }, [channel.port2]);
        });
      } catch (error) { this.error = error.message; this.busy = false; }
    }
  }
};
</script>
<style scoped>
.web-update { position: fixed; bottom: 16px; right: 16px; z-index: 20000; max-width: min(480px, calc(100vw - 32px)); display: flex; flex-wrap: wrap; gap: 10px; padding: 14px; background: #fff; color: #123e50; border: 2px solid #24718c; border-radius: 10px; box-shadow: 0 4px 20px #0003; }
.web-update button { background: #123e50; color: white; border: 0; border-radius: 5px; padding: 6px 12px; }
</style>
