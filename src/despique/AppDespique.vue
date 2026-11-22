<template>
  <div id="app" class="despique-app">
    <header v-if="!esLogin" class="despique-barra">
      <router-link class="despique-marca" to="/pesadas" aria-label="Ir a los días de pesadas">
        <span class="despique-marca-icono" aria-hidden="true">⚖</span>
        <span><strong>Despique</strong><small>Rey Pez</small></span>
      </router-link>
      <div class="despique-usuario">
        <span v-if="usuario" class="despique-nombre">{{ usuario }}</span>
        <button type="button" class="despique-salir" @click="salir">Salir</button>
      </div>
    </header>
    <div class="despique-contenido">
      <router-view />
    </div>
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

export default {
  name: 'AppDespique',
  computed: {
    esLogin() { return this.$route.path === '/login'; },
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
