<template>
  <div id="inventarios-app">
    <header class="mobile-header"><router-link to="/" class="mobile-brand"><span class="rp-brand-mark"><MobileIcon name="fish" /></span><span>ReyPez<small>INVENTARIOS</small></span></router-link><button v-if="autenticado" class="rp-logout" @click="salir">Salir</button></header>
    <p v-if="!online" class="mobile-offline" role="status">Sin conexión. Las existencias pueden no estar actualizadas.</p>
    <main class="mobile-content"><router-view :key="$route.path" /></main>
    <nav v-if="autenticado" class="mobile-nav" aria-label="Inventarios"><router-link to="/" exact><MobileIcon name="home" />Inicio</router-link><router-link to="/existencias" :class="{ activo: $route.meta.grupo === 'limpios' }"><MobileIcon name="box" />Limpios</router-link><router-link to="/existencias-crudos" :class="{ activo: $route.meta.grupo === 'crudos' }"><MobileIcon name="fish" />Crudos</router-link></nav>
  </div>
</template>
<script>
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '@/stores/auth';
import MobileIcon from './MobileIcon.vue';
import './mobile.css';
export default {
  components: { MobileIcon }, data: () => ({ online: navigator.onLine }),
  computed: { autenticado() { return useAuthStore().isAuthenticated; } },
  methods: {
    actualizarConexion() { this.online = navigator.onLine; },
    async salir() {
      if (this.$route.fullPath !== '/') { try { await this.$router.push('/'); } catch (_) { return; } }
      useAuthStore().logout(); this.$router.replace('/login');
    }
  },
  created() { useAuthStore().checkAuth(); },
  async mounted() {
    window.addEventListener('online', this.actualizarConexion); window.addEventListener('offline', this.actualizarConexion);
    if (Capacitor.isNativePlatform()) this._backHandler = await NativeApp.addListener('backButton', ({ canGoBack }) => { if (['/', '/login'].includes(this.$route.path)) NativeApp.exitApp(); else if (canGoBack) this.$router.back(); else this.$router.push('/'); });
  },
  beforeDestroy() { window.removeEventListener('online', this.actualizarConexion); window.removeEventListener('offline', this.actualizarConexion); if (this._backHandler) this._backHandler.remove(); }
};
</script>
