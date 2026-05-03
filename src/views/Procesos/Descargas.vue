<template>
  <div class="descargas-page">
    <div class="terminal-window">
      <div class="terminal-header">
        <span class="terminal-dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </span>
        <span class="terminal-title">DESCARGAS_CAMION.db — bash</span>
        <BackButton to="/procesos" />
      </div>

      <div class="header-section">
        <div class="brand">
          <span class="brand-logo">REY_PEZ</span>
          <span class="brand-sub">// DESCARGA</span>
        </div>
        <div class="truck-info">
          <div class="truck-plate">{{ state.plate || '— — —' }}</div>
          <div class="session-time">{{ sessionTimeText }}</div>
        </div>
      </div>
    </div>

    <TotalCard
      :total="total"
      :active-count="activeCategoriesCount"
      :pulsing="totalPulse"
    />

    <div class="active-section">
      <ActiveCounter
        :name="activeName"
        :count="activeCount"
        :pulsing="countPulse"
        @add="handleAdd"
        @sub="handleSub"
        @open-stiba="openStibaModal"
      />

      <div class="section-title">
        <span>&gt; TALLAS / CATEGORIAS</span>
        <button type="button" class="ghost-btn" @click="openSessionModal">Nueva sesión</button>
      </div>

      <CategoryGrid
        :categories="state.categories"
        :active-id="state.activeId"
        @select="selectCategory"
        @delete="askDeleteCategory"
        @add-category="openAddCategoryModal"
      />
    </div>

    <footer class="page-footer">
      <button type="button" class="ftbtn" @click="showHistory = true">
        <span class="prefix">[H]</span> Historial
      </button>
      <button type="button" class="ftbtn warn" @click="openExport">
        <span class="prefix">[E]</span> Exportar
      </button>
      <button type="button" class="ftbtn danger" @click="askReset">
        <span class="prefix">[R]</span> Reiniciar
      </button>
    </footer>

    <StibaModal
      :show="showStiba"
      :active-name="activeName"
      :stiba-history="state.stibaHistory"
      @cancel="showStiba = false"
      @confirm="confirmStiba"
      @toast="toast"
    />

    <SessionModal
      :show="showSession || showAddCat"
      :mode="showAddCat ? 'category' : 'session'"
      :initial-plate="state.plate"
      :initial-provider="state.provider"
      @cancel="closeSessionModals"
      @confirm-session="confirmSession"
      @confirm-category="confirmAddCategory"
      @toast="toast"
    />

    <HistoryModal
      :show="showHistory"
      :entries="state.log"
      @close="showHistory = false"
    />

    <ExportModal
      :show="showExport"
      :report="exportReport"
      :plate="state.plate"
      @close="showExport = false"
      @toast="toast"
    />

    <ConfirmModal
      :show="confirmState.show"
      :title="confirmState.title"
      :message="confirmState.message"
      @cancel="cancelConfirm"
      @confirm="acceptConfirm"
    />

    <div class="toast" :class="{ show: toastVisible }">{{ toastMessage }}</div>
  </div>
</template>

<script>
import BackButton from '@/components/BackButton.vue';
import TotalCard from '@/components/Descargas/TotalCard.vue';
import ActiveCounter from '@/components/Descargas/ActiveCounter.vue';
import CategoryGrid from '@/components/Descargas/CategoryGrid.vue';
import StibaModal from '@/components/Descargas/StibaModal.vue';
import SessionModal from '@/components/Descargas/SessionModal.vue';
import HistoryModal from '@/components/Descargas/HistoryModal.vue';
import ExportModal from '@/components/Descargas/ExportModal.vue';
import ConfirmModal from '@/components/Descargas/ConfirmModal.vue';
import { loadState, saveState, MAX_LOG } from '@/utils/contadorStorage';

export default {
  name: 'Descargas',
  components: {
    BackButton,
    TotalCard,
    ActiveCounter,
    CategoryGrid,
    StibaModal,
    SessionModal,
    HistoryModal,
    ExportModal,
    ConfirmModal
  },
  data() {
    return {
      state: {
        plate: '',
        provider: '',
        startedAt: null,
        categories: [],
        activeId: null,
        log: [],
        stibaHistory: {}
      },
      showStiba: false,
      showSession: false,
      showAddCat: false,
      showHistory: false,
      showExport: false,
      exportReport: '',
      confirmState: {
        show: false,
        title: '',
        message: '',
        onConfirm: null
      },
      toastVisible: false,
      toastMessage: '',
      toastTimer: null,
      countPulse: false,
      totalPulse: false,
      pulseTimer: null
    };
  },
  computed: {
    total() {
      return this.state.categories.reduce((s, c) => s + (Number(c.count) || 0), 0);
    },
    activeCategoriesCount() {
      return this.state.categories.filter(c => Number(c.count) > 0).length;
    },
    activeCategory() {
      return this.state.categories.find(c => c.id === this.state.activeId) || null;
    },
    activeName() {
      return this.activeCategory ? this.activeCategory.name : '—';
    },
    activeCount() {
      return this.activeCategory ? Number(this.activeCategory.count) || 0 : 0;
    },
    sessionTimeText() {
      if (!this.state.startedAt) return 'Sin sesión';
      const d = new Date(this.state.startedAt);
      return 'Inicio ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
  },
  mounted() {
    this.state = loadState();
    document.addEventListener('keydown', this.handleKeydown);
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.handleKeydown);
    clearTimeout(this.toastTimer);
    clearTimeout(this.pulseTimer);
  },
  methods: {
    persist() {
      saveState(this.state);
    },
    selectCategory(id) {
      this.state.activeId = id;
      this.persist();
    },
    changeCount(delta, source) {
      const active = this.activeCategory;
      if (!active) {
        this.toast('Agrega o selecciona una categoría');
        return false;
      }
      if ((Number(active.count) || 0) + delta < 0) {
        this.toast('No puede ser negativo');
        return false;
      }
      active.count = (Number(active.count) || 0) + delta;
      this.state.log.unshift({
        t: Date.now(),
        catName: active.name,
        delta: delta,
        total: this.total,
        source: source || 'manual'
      });
      if (this.state.log.length > MAX_LOG) this.state.log.length = MAX_LOG;
      this.persist();
      this.triggerPulse();
      this.vibrate(delta);
      return true;
    },
    triggerPulse() {
      this.countPulse = false;
      this.totalPulse = false;
      clearTimeout(this.pulseTimer);
      this.$nextTick(() => {
        this.countPulse = true;
        this.totalPulse = true;
        this.pulseTimer = setTimeout(() => {
          this.countPulse = false;
          this.totalPulse = false;
        }, 350);
      });
    },
    vibrate(delta) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(delta > 0 ? 15 : 25); } catch (e) { /* noop */ }
      }
    },
    handleAdd() { this.changeCount(1, 'manual'); },
    handleSub() { this.changeCount(-1, 'manual'); },
    openStibaModal() {
      if (!this.activeCategory) {
        this.toast('Agrega o selecciona una categoría');
        return;
      }
      this.showStiba = true;
    },
    confirmStiba(payload) {
      const { a, b, total } = payload;
      const src = 'estiba ' + a + '×' + b;
      const ok = this.changeCount(total, src);
      if (ok) {
        const key = a + ',' + b;
        if (!this.state.stibaHistory[key]) {
          this.$set(this.state.stibaHistory, key, { count: 0, lastUsed: 0 });
        }
        this.state.stibaHistory[key].count += 1;
        this.state.stibaHistory[key].lastUsed = Date.now();
        this.persist();
        this.showStiba = false;
        this.toast('+ ' + total + ' cajas (' + a + '×' + b + ')');
      }
    },
    openSessionModal() {
      this.showSession = true;
    },
    openAddCategoryModal() {
      this.showAddCat = true;
    },
    closeSessionModals() {
      this.showSession = false;
      this.showAddCat = false;
    },
    confirmSession(payload) {
      const { plate, provider } = payload;
      const start = () => {
        this.state.plate = plate;
        this.state.provider = provider;
        this.state.startedAt = Date.now();
        this.state.categories.forEach(c => { c.count = 0; });
        this.state.log = [];
        this.persist();
        this.showSession = false;
        this.toast('Sesión iniciada');
      };
      if (this.total > 0) {
        this.askConfirm(
          'Iniciar nueva sesión',
          'Hay ' + this.total + ' cajas contadas. ¿Reiniciar contadores?',
          start
        );
      } else {
        start();
      }
    },
    confirmAddCategory(payload) {
      const id = 'c' + Date.now();
      this.state.categories.push({ id, name: payload.name, count: 0 });
      this.state.activeId = id;
      this.persist();
      this.showAddCat = false;
      this.toast('Categoría agregada');
    },
    askDeleteCategory(cat) {
      this.askConfirm(
        'Eliminar categoría',
        '¿Eliminar "' + cat.name + '" y sus ' + cat.count + ' cajas?',
        () => {
          this.state.categories = this.state.categories.filter(x => x.id !== cat.id);
          if (this.state.activeId === cat.id) {
            this.state.activeId = this.state.categories[0] ? this.state.categories[0].id : null;
          }
          this.persist();
          this.toast('Categoría eliminada');
        }
      );
    },
    askReset() {
      this.askConfirm(
        'Reiniciar contadores',
        'Esto pondrá todos los contadores en 0. ¿Continuar?',
        () => {
          this.state.categories.forEach(c => { c.count = 0; });
          this.state.log = [];
          this.persist();
          this.toast('Contadores en 0');
        }
      );
    },
    askConfirm(title, message, onConfirm) {
      this.confirmState.title = title;
      this.confirmState.message = message;
      this.confirmState.onConfirm = onConfirm;
      this.confirmState.show = true;
    },
    acceptConfirm() {
      const fn = this.confirmState.onConfirm;
      this.confirmState.show = false;
      this.confirmState.onConfirm = null;
      if (typeof fn === 'function') fn();
    },
    cancelConfirm() {
      this.confirmState.show = false;
      this.confirmState.onConfirm = null;
    },
    openExport() {
      this.exportReport = this.buildReport();
      this.showExport = true;
    },
    buildReport() {
      const total = this.total;
      const start = this.state.startedAt ? new Date(this.state.startedAt) : new Date();
      const now = new Date();
      const fmt = d =>
        d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
      let r = 'REY PEZ — DESCARGA DE CAMARÓN\n';
      r += '====================================\n';
      r += 'Placa:      ' + (this.state.plate || '(sin registrar)') + '\n';
      if (this.state.provider) r += 'Proveedor:  ' + this.state.provider + '\n';
      if (this.state.startedAt) r += 'Inicio:     ' + fmt(start) + '\n';
      r += 'Cierre:     ' + fmt(now) + '\n';
      r += '------------------------------------\n';
      r += 'DETALLE POR TALLA\n';
      const withCount = this.state.categories
        .filter(c => Number(c.count) > 0)
        .slice()
        .sort((a, b) => Number(b.count) - Number(a.count));
      if (withCount.length === 0) {
        r += '  (sin cajas registradas)\n';
      } else {
        withCount.forEach(c => {
          r += '  ' + String(c.name).padEnd(18) + String(c.count).padStart(6) + ' cajas\n';
        });
      }
      r += '------------------------------------\n';
      r += 'TOTAL:               ' + String(total).padStart(6) + ' cajas\n';
      return r;
    },
    toast(msg) {
      this.toastMessage = msg;
      this.toastVisible = true;
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toastVisible = false;
      }, 1800);
    },
    handleKeydown(e) {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (this.showStiba || this.showSession || this.showAddCat ||
          this.showHistory || this.showExport || this.confirmState.show) return;
      if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp') {
        this.changeCount(1, 'teclado');
        e.preventDefault();
      } else if (e.key === '-' || e.key === 'ArrowDown') {
        this.changeCount(-1, 'teclado');
        e.preventDefault();
      } else if (e.key && e.key.toLowerCase() === 'e') {
        this.openStibaModal();
        e.preventDefault();
      }
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap');

.descargas-page {
  --matrix-green: #00ff41;
  --matrix-green-dark: #008f11;
  --matrix-green-glow: #00ff4180;
  --matrix-green-dim: #00ff4130;
  --matrix-green-dark-text: #00b832;
  --terminal-bg: #0a0a0a;
  --amber: #ffb000;
  --amber-glow: #ffb00080;
  --cyan: #00d4ff;
  min-height: 100vh;
  background: var(--terminal-bg);
  color: var(--matrix-green);
  font-family: 'VT323', 'Share Tech Mono', monospace;
  padding-bottom: 90px;
  user-select: none;
  -webkit-user-select: none;
}

/* Forzar variables en modales hijos (que usan teleport visual al body via fixed) */
.descargas-page >>> .modal-bg,
.descargas-page >>> .modal {
  --matrix-green: #00ff41;
  --matrix-green-dark: #008f11;
  --matrix-green-glow: #00ff4180;
  --matrix-green-dim: #00ff4130;
  --matrix-green-dark-text: #00b832;
  --terminal-bg: #0a0a0a;
  --amber: #ffb000;
  --amber-glow: #ffb00080;
  --cyan: #00d4ff;
}

/* Terminal window */
.terminal-window {
  background: rgba(0, 20, 0, 0.95);
  border: 2px solid var(--matrix-green);
  margin: 14px;
  box-shadow: 0 0 25px var(--matrix-green-glow), inset 0 0 50px rgba(0, 255, 65, 0.03);
}

.terminal-header {
  background: linear-gradient(90deg, #001a00 0%, #002200 100%);
  padding: 10px 14px;
  border-bottom: 1px solid var(--matrix-green);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.terminal-dots { display: flex; gap: 8px; }
.dot { width: 12px; height: 12px; border-radius: 50%; }
.dot.red { background: #ff5f56; box-shadow: 0 0 6px #ff5f56; }
.dot.yellow { background: #ffbd2e; box-shadow: 0 0 6px #ffbd2e; }
.dot.green { background: var(--matrix-green); box-shadow: 0 0 6px var(--matrix-green); }

.terminal-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
  color: var(--matrix-green);
  text-shadow: 0 0 8px var(--matrix-green);
  letter-spacing: 2px;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.terminal-header >>> .btn-back {
  margin: 0;
  padding: 4px 10px;
  font-size: 0.85rem;
  background: transparent;
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  border-radius: 0;
  letter-spacing: 1px;
}
.terminal-header >>> .btn-back:hover {
  background: var(--matrix-green);
  color: var(--terminal-bg);
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.brand { display: flex; align-items: baseline; gap: 8px; }
.brand-logo {
  font-family: 'VT323', monospace;
  font-size: 1.7rem;
  color: var(--matrix-green);
  letter-spacing: 3px;
  text-shadow: 0 0 12px var(--matrix-green);
}
.brand-sub {
  font-size: 0.95rem;
  color: var(--amber);
  letter-spacing: 2px;
  text-shadow: 0 0 8px var(--amber-glow);
}

.truck-info {
  text-align: right;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.9rem;
  letter-spacing: 1px;
  line-height: 1.4;
}
.truck-plate {
  color: var(--cyan);
  font-size: 1.05rem;
  font-weight: 700;
  text-shadow: 0 0 8px rgba(0, 212, 255, 0.5);
  letter-spacing: 2px;
}
.session-time {
  color: var(--amber);
  font-size: 0.85rem;
  text-shadow: 0 0 6px var(--amber-glow);
}

.active-section {
  margin: 0 14px;
}

.section-title {
  font-size: 1rem;
  letter-spacing: 2px;
  color: var(--amber);
  text-shadow: 0 0 8px var(--amber-glow);
  margin: 18px 4px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.ghost-btn {
  background: transparent;
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  padding: 6px 14px;
  font-size: 0.95rem;
  cursor: pointer;
  font-family: 'VT323', 'Share Tech Mono', monospace;
  letter-spacing: 1px;
}
.ghost-btn:hover {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 12px var(--matrix-green-dim);
}

.page-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
  background: rgba(0, 20, 0, 0.95);
  border-top: 2px solid var(--matrix-green);
  box-shadow: 0 -5px 20px var(--matrix-green-dim);
  z-index: 50;
}

.ftbtn {
  background: transparent;
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  padding: 14px 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  font-family: 'VT323', 'Share Tech Mono', monospace;
  letter-spacing: 2px;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.ftbtn:hover {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 15px var(--matrix-green-dim);
}
.ftbtn.warn { border-color: var(--amber); color: var(--amber); }
.ftbtn.warn:hover { background: var(--amber); color: var(--terminal-bg); box-shadow: 0 0 15px var(--amber-glow); }
.ftbtn.danger { border-color: #ff6b6b; color: #ff6b6b; }
.ftbtn.danger:hover { background: #ff6b6b; color: var(--terminal-bg); box-shadow: 0 0 15px rgba(255, 107, 107, 0.5); }
.prefix { opacity: 0.7; font-size: 0.85rem; }

.toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%) translateY(20px);
  background: var(--matrix-green);
  color: var(--terminal-bg);
  padding: 12px 18px;
  font-size: 1rem;
  font-weight: 700;
  font-family: 'VT323', 'Share Tech Mono', monospace;
  letter-spacing: 2px;
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
  z-index: 2000;
  box-shadow: 0 0 18px var(--matrix-green-glow);
  border: 1px solid var(--matrix-green);
  white-space: nowrap;
}
.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

@media (max-width: 480px) {
  .header-section {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
  .truck-info { text-align: left; }
  .terminal-title { font-size: 0.75rem; letter-spacing: 1px; }
  .brand-logo { font-size: 1.4rem; }
}
</style>
