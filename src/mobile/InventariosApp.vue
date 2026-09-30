<template>
  <div id="inventarios-app" @click.capture="sonarControl">
    <header class="mobile-header"><router-link to="/" class="mobile-brand"><span class="rp-brand-mark"><MobileIcon name="fish" /></span><span>ReyPez<small>INVENTARIOS</small></span></router-link><div class="rp-header-actions"><button type="button" class="rp-icon-button rp-sound-toggle" :class="{ 'rp-sound-on': sonidosActivos }" :aria-pressed="String(sonidosActivos)" :aria-label="sonidosActivos ? 'Silenciar sonidos' : 'Activar sonidos'" :title="sonidosActivos ? 'Silenciar sonidos' : 'Activar sonidos'" data-sin-sonido @click="alternarSonidos"><MobileIcon :name="sonidosActivos ? 'volume' : 'muted'" /></button><button v-if="autenticado" class="rp-logout" @click="salir">Salir</button></div></header>
    <p v-if="!online" class="mobile-offline" role="status">Sin conexión. Las existencias pueden no estar actualizadas.</p>
    <main class="mobile-content"><router-view :key="$route.path" /></main>
    <nav v-if="autenticado" class="mobile-nav" aria-label="Inventarios"><router-link to="/" exact><MobileIcon name="home" />Inicio</router-link><router-link to="/existencias" :class="{ activo: $route.meta.grupo === 'limpios' }"><MobileIcon name="box" />Limpios</router-link><router-link to="/existencias-crudos" :class="{ activo: $route.meta.grupo === 'crudos' }"><MobileIcon name="fish" />Crudos</router-link></nav>
  </div>
</template>
<script>
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '@/stores/auth';
import { crearSonidosTerminal } from '@/utils/sonidosTerminal';
import MobileIcon from './MobileIcon.vue';
import '@fontsource/roboto/latin-400.css';
import '@fontsource/roboto/latin-700.css';
import '@fontsource/orbitron/latin-700.css';
import '@fontsource/share-tech-mono/latin-400.css';
import './mobile.css';
import './theme-neon.css';
const claveSonidos = 'reypez.inventarios.sonidos';
function leerSonidos() {
  try { return localStorage.getItem(claveSonidos) !== '0'; } catch (_) { return true; }
}
export default {
  components: { MobileIcon }, data: () => ({ online: navigator.onLine, sonidosActivos: leerSonidos() }),
  computed: { autenticado() { return useAuthStore().isAuthenticated; } },
  methods: {
    actualizarConexion() { this.online = navigator.onLine; },
    sonarControl(event) {
      const control = event.target instanceof Element ? event.target.closest('button, a[href], summary, [role="button"]') : null;
      if (!this.sonidosActivos || !control || !this.$el.contains(control) || control.matches(':disabled, [aria-disabled="true"], [data-sin-sonido]')) return;
      // Un solo click cubre también SVG, teclado y controles de las pantallas hijas.
      this._sonidos.reproducir(control.matches('a, summary, [role="tab"]') ? 'navegacion' : 'boton');
    },
    alternarSonidos() {
      this.sonidosActivos = !this.sonidosActivos;
      this._sonidos.habilitar(this.sonidosActivos);
      try { localStorage.setItem(claveSonidos, this.sonidosActivos ? '1' : '0'); } catch (_) { /* La preferencia sigue funcionando durante esta sesión. */ }
      if (this.sonidosActivos) this._sonidos.reproducir('boton');
    },
    async salir() {
      if (this.$route.fullPath !== '/') { try { await this.$router.push('/'); } catch (_) { return; } }
      useAuthStore().logout(); this.$router.replace('/login');
    }
  },
  created() { useAuthStore().checkAuth(); this._sonidos = crearSonidosTerminal(); this._sonidos.habilitar(this.sonidosActivos); },
  async mounted() {
    window.addEventListener('online', this.actualizarConexion); window.addEventListener('offline', this.actualizarConexion);
    if (Capacitor.isNativePlatform()) this._backHandler = await NativeApp.addListener('backButton', ({ canGoBack }) => { if (['/', '/login'].includes(this.$route.path)) NativeApp.exitApp(); else if (canGoBack) this.$router.back(); else this.$router.push('/'); });
  },
  beforeDestroy() { window.removeEventListener('online', this.actualizarConexion); window.removeEventListener('offline', this.actualizarConexion); this._sonidos.cerrar(); if (this._backHandler) this._backHandler.remove(); }
};
</script>
