<template>
  <div id="app" :class="{ 'app--pesadas': !mostrarFooter }">
    <Navbar v-if="!esArcade" @open-offline-options="abrirOpcionesOffline" />
    <div class="content-wrapper" :class="{ 'content-wrapper--pesadas': !mostrarFooter, 'content-wrapper--prestamos': esPrestamos, 'content-wrapper--bitacoras': esBitacoras, 'content-wrapper--arcade': esArcade }">
      <div v-if="!esPrestamos && !esBitacoras && !esArcade" class="content-horizon-grid" aria-hidden="true">
        <div class="content-horizon-grid__sun"></div>
        <div class="content-horizon-grid__plane"></div>
      </div>
      <router-view ref="activeView" @open-offline-options="abrirOpcionesOffline" />
    </div>
    <Footer v-if="mostrarFooter && !esArcade" />

    <dialog ref="offlineDialog" class="offline-dialog" aria-labelledby="offline-dialog-title">
      <header class="offline-dialog-header">
        <h2 id="offline-dialog-title">Conexión y respaldos</h2>
        <button type="button" autofocus aria-label="Cerrar conexión y respaldos" @click="$refs.offlineDialog.close()">✕</button>
      </header>
      <EmbarquesOfflineStatus v-if="offlineOpened" :before-export="guardarAntesDeExportar" :editor-open="esEditorEmbarques" />
    </dialog>

    <transition-group name="toast" tag="div" class="toast-container">
      <div
        v-for="n in notifications"
        :key="n.id"
        :class="['toast', `toast--${n.type}`]"
      >
        {{ n.message }}
      </div>
    </transition-group>
  </div>
</template>

<script>
import EmbarquesSync from './services/EmbarquesSync';
import EmbarquesOfflineStatus from './components/EmbarquesOfflineStatus.vue';
import Navbar from "./NavBar.vue";
import Footer from './Footer.vue';
import { useAuthStore } from './stores/auth';
import { useUIStore } from './stores/ui';

export default {
  name: "app",
  components: {
    Navbar,
    EmbarquesOfflineStatus,
    Footer
  },
  data: () => ({ offlineOpened: false }),
  watch: { '$route'() { this.$refs.offlineDialog?.close(); } },
  methods: {
    async abrirOpcionesOffline() {
      this.offlineOpened = true;
      await this.$nextTick();
      this.$refs.offlineDialog.showModal();
    },
    async guardarAntesDeExportar() {
      const editor = this.$refs.activeView;
      if (this.esEditorEmbarques && editor?.guardarAntesDeExportar) await editor.guardarAntesDeExportar();
    }
  },
  computed: {
    esEditorEmbarques() { return ['NuevoEmbarque', 'EditarEmbarque'].includes(this.$route.name); },
    esEmbarques() { return /embarque/i.test(this.$route.path); },
    esArcade() {
      return this.$route.name === 'MareaArcade';
    },
    esBitacoras() {
      return this.$route.path === '/procesos/bitacoras';
    },
    esPrestamos() {
      return this.$route.path === '/procesos/prestamos' || this.$route.path.startsWith('/procesos/prestamos/');
    },
    notifications() {
      return useUIStore().notifications;
    },
    mostrarFooter() {
      return this.$route.name !== 'PesadasDia';
    },
  },
  created() {
    // Inicializar el store de autenticación al cargar la aplicación
    const authStore = useAuthStore();
    authStore.checkAuth();
  },
  beforeDestroy() {
    if (this._removeDesktopClose) this._removeDesktopClose();
  },
  mounted() {
    EmbarquesSync.start();
    if (window.desktop?.onPrepareClose) {
      this._removeDesktopClose = window.desktop.onPrepareClose(async () => {
        await this.$nextTick();
        const editor = this.$refs.activeView;
        if (editor?._guardandoInicial || editor?._creandoEmbarque) {
          throw new Error('Se está creando el embarque. Espera un momento e intenta cerrar de nuevo.');
        }
        if (editor?.embarqueId && editor.guardarSnapshotOffline) {
          await editor.guardarSnapshotOffline({ pendingSync: Boolean(editor.hasPendingChanges) });
        }
      });
    }
    // Prevenir el cambio de valor al hacer scroll en inputs de tipo número globalmente
    document.addEventListener('wheel', (event) => {
      if (document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    });
  }
};
</script>
<style>
/* Keep decorative effects static on desktop so the app stays idle between edits. */
html.desktop-app .content-wrapper::before,
html.desktop-app .content-wrapper::after { display: none; }
html.desktop-app .content-horizon-grid__plane,
html.desktop-app .content-horizon-grid__sun,
html.desktop-app .reticle-ring,
html.desktop-app .reticle-dot,
html.desktop-app .system-status,
html.desktop-app .lista-embarques .fecha-value,
html.desktop-app .lista-embarques .status-icon { animation: none !important; }
html.desktop-app .embarque-card-shell::before,
html.desktop-app .embarque-card-shell::after { display: none; }

.offline-dialog { width: min(760px, calc(100vw - 32px)); max-height: 85vh; padding: 20px; border: 1px solid #c5d5dc; border-radius: 14px; color: #123e50; background: #f8fbfc; box-shadow: 0 20px 70px #0005; }
.offline-dialog::backdrop { background: #07132188; }
.offline-dialog-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.offline-dialog-header h2 { margin: 0; font-size: 20px; }
.offline-dialog-header button { border: 0; border-radius: 6px; padding: 6px 10px; background: transparent; color: #123e50; }
.offline-dialog-header button:hover { background: #e3edf1; }
.offline-dialog-header button:focus-visible { outline: 2px solid #24718c; }
.offline-dialog .offline-status { margin-bottom: 0; }

html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* Cursores de alto contraste para Windows. Se usa relleno oscuro para fondos
   claros y un borde blanco delgado para que sigan visibles en el fondo azul. */
html.platform-windows body,
html.platform-windows body * {
  cursor: url('./assets/cursors/dark-arrow.svg') 3 2, default !important;
}

html.platform-windows a,
html.platform-windows button,
html.platform-windows select,
html.platform-windows summary,
html.platform-windows [role="button"],
html.platform-windows label[for],
html.platform-windows input[type="button"],
html.platform-windows input[type="submit"],
html.platform-windows input[type="reset"],
html.platform-windows input[type="checkbox"],
html.platform-windows input[type="radio"] {
  cursor: url('./assets/cursors/dark-pointer.svg') 7 2, pointer !important;
}

html.platform-windows input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]),
html.platform-windows textarea,
html.platform-windows [contenteditable="true"] {
  cursor: url('./assets/cursors/dark-text.svg') 12 14, text !important;
}

html.platform-windows button:disabled,
html.platform-windows input:disabled,
html.platform-windows select:disabled,
html.platform-windows [aria-disabled="true"] {
  cursor: url('./assets/cursors/dark-arrow.svg') 3 2, not-allowed !important;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

#app.app--pesadas {
  min-height: 100vh;
  overflow: visible;
  overscroll-behavior-x: none;
}

.content-wrapper {
  flex: 1 0 auto;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 15%, rgba(255, 95, 217, 0.18), transparent 35%),
    radial-gradient(circle at 80% 25%, rgba(62, 248, 255, 0.14), transparent 40%),
    linear-gradient(160deg, #100625 0%, #1a0d3a 45%, #102e63 100%);
}

/* La hoja diaria crece con sus filas y se desplaza junto con la navegación. */
.content-wrapper.content-wrapper--prestamos,
.content-wrapper.content-wrapper--bitacoras {
  background: #edf3ef;
}
.content-wrapper.content-wrapper--prestamos::before,
.content-wrapper.content-wrapper--prestamos::after,
.content-wrapper.content-wrapper--bitacoras::before,
.content-wrapper.content-wrapper--bitacoras::after,
.content-wrapper.content-wrapper--arcade::before,
.content-wrapper.content-wrapper--arcade::after {
  display: none;
  animation: none;
}
.content-wrapper.content-wrapper--arcade { background: #fbf8ef; }
.content-wrapper--arcade > .marea { flex: 1; }

.content-wrapper--pesadas {
  flex: 1 0 auto;
  overflow: visible;
}

.content-wrapper::before,
.content-wrapper::after {
  content: "";
  position: absolute;
  inset: -20%;
  pointer-events: none;
  z-index: 0;
}

.content-wrapper::before {
  background:
    repeating-linear-gradient(
      180deg,
      rgba(255, 111, 212, 0.08) 0,
      rgba(255, 111, 212, 0.08) 1px,
      transparent 1px,
      transparent 10px
    );
  animation: scanlineShift 14s linear infinite;
}

.content-wrapper::after {
  background:
    radial-gradient(circle at 30% 40%, rgba(255, 95, 217, 0.18), transparent 35%),
    radial-gradient(circle at 70% 60%, rgba(62, 248, 255, 0.16), transparent 35%);
  filter: blur(24px);
  animation: auroraDrift 18s ease-in-out infinite alternate;
}

/* Grilla retro en perspectiva (horizonte vaporwave) */
.content-horizon-grid {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: min(52vh, 440px);
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  perspective: 520px;
  perspective-origin: 50% 100%;
  mask-image: linear-gradient(
    to top,
    black 0%,
    black 38%,
    rgba(0, 0, 0, 0.65) 62%,
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to top,
    black 0%,
    black 38%,
    rgba(0, 0, 0, 0.65) 62%,
    transparent 100%
  );
}

.content-horizon-grid__sun {
  position: absolute;
  left: 50%;
  bottom: min(38%, 200px);
  width: min(28vmin, 220px);
  height: min(28vmin, 220px);
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 45%,
    rgba(255, 240, 180, 0.95) 0%,
    rgba(255, 120, 200, 0.55) 38%,
    rgba(255, 79, 216, 0.15) 58%,
    transparent 72%
  );
  box-shadow:
    0 0 60px rgba(255, 95, 217, 0.55),
    0 0 120px rgba(62, 248, 255, 0.25);
  animation: sunPulse 10s ease-in-out infinite alternate;
  z-index: 0;
}

.content-horizon-grid__plane {
  position: absolute;
  left: 50%;
  bottom: -18%;
  width: 260%;
  height: 85%;
  margin-left: -130%;
  transform-origin: 50% 100%;
  transform: rotateX(72deg);
  background:
    linear-gradient(
      to top,
      rgba(16, 8, 40, 0.95) 0%,
      rgba(16, 8, 40, 0.2) 28%,
      transparent 55%
    ),
    repeating-linear-gradient(
      90deg,
      transparent 0,
      transparent calc(52px - 1px),
      rgba(62, 248, 255, 0.5) calc(52px - 1px),
      rgba(62, 248, 255, 0.5) 52px
    ),
    repeating-linear-gradient(
      0deg,
      transparent 0,
      transparent calc(28px - 1px),
      rgba(255, 95, 217, 0.32) calc(28px - 1px),
      rgba(255, 95, 217, 0.32) 28px
    );
  background-size: 100% 100%, 52px 100%, 100% 28px;
  animation: horizonGridScroll 22s linear infinite;
  opacity: 0.9;
  z-index: 1;
}

.content-wrapper > *:not(.content-horizon-grid) {
  position: relative;
  z-index: 1;
}

@keyframes horizonGridScroll {
  0% {
    background-position: 0 0, 0 0, 0 0;
  }
  100% {
    background-position: 0 0, 52px 0, 0 28px;
  }
}

@keyframes sunPulse {
  0% {
    opacity: 0.88;
    filter: brightness(1);
  }
  100% {
    opacity: 1;
    filter: brightness(1.12);
  }
}

@keyframes scanlineShift {
  0% {
    transform: translateY(0);
    opacity: 0.5;
  }
  50% {
    transform: translateY(24px);
    opacity: 0.75;
  }
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
}

@keyframes auroraDrift {
  0% {
    transform: translate3d(-3%, -2%, 0) scale(1);
  }
  100% {
    transform: translate3d(3%, 2%, 0) scale(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .content-wrapper::before,
  .content-wrapper::after,
  .content-horizon-grid__plane,
  .content-horizon-grid__sun {
    animation: none;
  }
}

@media (max-width: 768px) {
  .content-horizon-grid {
    height: min(42vh, 320px);
  }

  .content-horizon-grid__plane {
    width: 300%;
    margin-left: -150%;
  }
}

h1 {
  color: rgb(40, 40, 216);
  text-align: center;
  font-weight: normal;
}

.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.toast {
  padding: 0.65rem 1.1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
  max-width: 320px;
  word-break: break-word;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.toast--info    { background: rgba(62, 120, 255, 0.85); }
.toast--success { background: rgba(34, 197, 94, 0.85); }
.toast--warning { background: rgba(234, 179, 8, 0.85); color: #1a1a1a; }
.toast--error   { background: rgba(239, 68, 68, 0.85); }

.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter, .toast-leave-to            { opacity: 0; transform: translateX(20px); }
</style>
