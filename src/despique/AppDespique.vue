<template>
  <div id="app" class="despique-app">
    <header v-if="!esLogin" class="despique-barra" :class="{ 'despique-barra--bloqueada': barraBloqueada }">
      <!-- Mientras se pesa (rápido o a granel) la barra no hace nada, para no salirse por error. -->
      <span v-if="barraBloqueada" class="despique-marca" aria-label="Pesando: la barra está bloqueada">
        <span class="despique-marca-icono" aria-hidden="true">⚖</span>
        <span><strong>Despique</strong><small>Pesando…</small></span>
      </span>
      <router-link v-else class="despique-marca" to="/pesadas" aria-label="Ir a los días de pesadas">
        <span class="despique-marca-icono" aria-hidden="true">⚖</span>
        <span><strong>Despique</strong><small>Rey Pez</small></span>
      </router-link>
      <div class="despique-usuario">
        <span v-if="usuario" class="despique-nombre">{{ usuario }}</span>
        <button v-if="!barraBloqueada" type="button" class="despique-salir" @click="salir">Salir</button>
      </div>
    </header>
    <div class="despique-contenido">
      <router-view />
    </div>
    <!-- Aviso de versión nueva ya descargada: se aplica sola al cerrar o volver a abrir la app. -->
    <AppUpdateNotice v-if="actualizaciones.fuente" :fuente="actualizaciones.fuente" nombre="Despique"
      url-descargas="https://github.com/AllanCrazyProgrammer/rey-pez-app/releases?q=despique" />
    <transition-group name="despique-toast" tag="div" class="despique-toasts">
      <div v-for="n in notificaciones" :key="n.id" :class="['despique-toast', `despique-toast--${n.type}`]">
        <span>{{ n.message }}</span>
        <button type="button" @click="cerrarNotificacion(n.id)">Cerrar</button>
      </div>
    </transition-group>
  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth';
import { useUIStore } from '../stores/ui';
import AppUpdateNotice from '../components/layout/AppUpdateNotice.vue';
import { actualizaciones } from './actualizacion';

// Pantallas donde la barra de arriba no hace nada (se sale de ellas con sus propios botones).
const RUTAS_BARRA_BLOQUEADA = ['PesadasRapida', 'PesadasGranel'];

export default {
  name: 'AppDespique',
  components: { AppUpdateNotice },
  data: () => ({ actualizaciones }),
  computed: {
    esLogin() { return this.$route.path === '/login'; },
    barraBloqueada() { return RUTAS_BARRA_BLOQUEADA.includes(this.$route.name); },
    usuario() {
      const auth = useAuthStore();
      return (auth.user && auth.user.username) || '';
    },
    notificaciones() { return useUIStore().notifications; }
  },
  methods: {
    salir() {
      if (!window.confirm('¿Cerrar sesión en este dispositivo?')) return;
      useAuthStore().logout();
      this.$router.replace('/login').catch(() => {});
    },
    cerrarNotificacion(id) { useUIStore().dismissNotification(id); }
  }
};
</script>

<style>
html, body { height: 100%; margin: 0; padding: 0; }
body { background: #100625; }

.despique-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overscroll-behavior-x: none;
  background:
    radial-gradient(circle at 20% 15%, rgba(255, 95, 217, 0.18), transparent 35%),
    radial-gradient(circle at 80% 25%, rgba(62, 248, 255, 0.14), transparent 40%),
    linear-gradient(160deg, #100625 0%, #1a0d3a 45%, #102e63 100%);
  background-attachment: fixed;
}

.despique-barra {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: calc(8px + env(safe-area-inset-top)) 16px 8px;
  background: #160b30ee;
  border-bottom: 1px solid #ace8ee33;
  color: #fff;
  font-family: Arial, sans-serif;
}
/* La tabla de la hoja ocupa toda la pantalla debajo de la barra (61 px + área segura); al bajar,
   la tabla se acomoda pegada a la barra (src/utils/scrollContenido.js). */
.despique-contenido .pesadas-day-page .pesadas-grid-scroll {
  max-height: calc(100vh - 61px - env(safe-area-inset-top));
  max-height: calc(100dvh - 61px - env(safe-area-inset-top));
}
/* En la tabla solo quedan fijas arriba las filas Columna y Medida; Precio / kg se va con el
   scroll (top: auto: "Precio / kg" sigue fijo a la izquierda al moverse a los lados). */
.despique-contenido .pesadas-grid thead .price-row th,
.despique-contenido .pesadas-grid thead .price-row td { top: auto; z-index: 1; box-shadow: none; }
.despique-contenido .pesadas-grid thead .price-row th.name-cell { z-index: 2; box-shadow: 3px 0 6px -3px rgba(37, 35, 60, .20); }
.despique-contenido .pesadas-grid thead .measure-row th,
.despique-contenido .pesadas-grid thead .measure-row td { box-shadow: 0 2px 4px rgba(37, 35, 60, .10); }
.despique-contenido .pesadas-grid thead .measure-row th.name-cell { box-shadow: 3px 2px 6px -3px rgba(37, 35, 60, .20); }
.despique-marca { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; color: #fff; text-decoration: none; }
.despique-marca:hover { color: #fff; text-decoration: none; }
.despique-marca-icono {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 10px;
  background: #583d92; font-size: 20px;
}
.despique-marca strong { display: block; font-size: 17px; line-height: 1.1; }
.despique-marca small { display: block; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #ace8ee; }
.despique-usuario { display: flex; align-items: center; gap: 10px; min-width: 0; }
.despique-nombre { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #d5cef5; font-size: 14px; }
.despique-salir {
  min-height: 40px; padding: 6px 14px;
  border: 1px solid #ace8ee66; border-radius: 9px;
  background: transparent; color: #d4f8fc; font-weight: 700;
}
.despique-salir:hover { background: #33234b; }
.despique-barra--bloqueada .despique-marca { cursor: default; }
.despique-barra--bloqueada .despique-marca small { color: #ffd479; }
.despique-salir:focus-visible, .despique-marca:focus-visible { outline: 3px solid #ace8ee; outline-offset: 2px; }

.despique-contenido { flex: 1 0 auto; display: flex; flex-direction: column; }

.despique-toasts { position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 2000; display: flex; flex-direction: column; gap: 8px; max-width: calc(100vw - 32px); }
.despique-toast { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 10px; color: #fff; background: rgba(62, 120, 255, 0.9); font-family: Arial, sans-serif; box-shadow: 0 6px 20px #0005; }
.despique-toast--success { background: rgba(34, 197, 94, 0.9); }
.despique-toast--warning { background: rgba(234, 179, 8, 0.9); color: #1a1a1a; }
.despique-toast--error { background: rgba(239, 68, 68, 0.9); }
.despique-toast button { color: inherit; background: transparent; border: 1px solid currentColor; border-radius: 5px; padding: 4px 8px; }
.despique-toast-enter-active, .despique-toast-leave-active { transition: all 0.25s ease; }
.despique-toast-enter, .despique-toast-leave-to { opacity: 0; transform: translateX(20px); }

@media (max-width: 480px) {
  .despique-barra { padding-left: 12px; padding-right: 12px; }
  .despique-nombre { max-width: 110px; }
}
</style>
