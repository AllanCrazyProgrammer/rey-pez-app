<template>
  <div class="tabs-wrapper">
    <!-- Flecha izquierda -->
    <button
      v-if="canScrollLeft"
      class="nav-arrow nav-arrow--left"
      @click="scroll(-1)"
    >◀</button>

    <div class="tabs-scroll" ref="scroll" @scroll="checkScroll">
      <div
        v-for="(cam, i) in camionetas"
        :key="cam.id"
        class="cam-tab"
        :class="{ 'cam-tab--active': cam.id === activeId }"
        @click="$emit('select', cam.id)"
      >
        <div class="tab-inner">
          <span class="tab-index">{{ i + 1 }}</span>
          <span class="tab-plate">{{ cam.plate || 'SIN PLACA' }}</span>
          <span v-if="cam.provider" class="tab-provider">{{ cam.provider }}</span>
          <span class="tab-total">{{ getTotal(cam) }} cajas</span>
        </div>
        <button class="tab-del" @click.stop="$emit('delete', cam.id)" title="Eliminar camioneta">✕</button>
      </div>

      <button class="tab-add" @click="$emit('new-camioneta')">
        ⊕<span class="tab-add-label"> Nueva Camioneta</span>
      </button>
    </div>

    <!-- Flecha derecha -->
    <button
      v-if="canScrollRight"
      class="nav-arrow nav-arrow--right"
      @click="scroll(1)"
    >▶</button>
  </div>
</template>

<script>
export default {
  name: 'CamionetaTabs',
  props: {
    camionetas: { type: Array, required: true },
    activeId:   { type: String, default: null }
  },
  data() {
    return { canScrollLeft: false, canScrollRight: false };
  },
  mounted() {
    this.$nextTick(this.checkScroll);
  },
  updated() {
    this.$nextTick(this.checkScroll);
  },
  methods: {
    getTotal(cam) {
      if (!Array.isArray(cam.categories)) return 0;
      return cam.categories.reduce((s, c) => s + (Number(c.count) || 0), 0);
    },
    checkScroll() {
      const el = this.$refs.scroll;
      if (!el) return;
      this.canScrollLeft  = el.scrollLeft > 4;
      this.canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    },
    scroll(dir) {
      const el = this.$refs.scroll;
      if (!el) return;
      el.scrollBy({ left: dir * 220, behavior: 'smooth' });
    }
  }
};
</script>

<style scoped>
.tabs-wrapper {
  position: relative;
  background: rgba(0, 10, 0, 0.95);
  border-bottom: 2px solid var(--matrix-green-dark);
}

/* ── Scroll container ─────────────────────────────────────── */
.tabs-scroll {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 8px 8px 0;
  gap: 6px;
  min-height: 80px;
}
.tabs-scroll::-webkit-scrollbar { display: none; }

/* ── Individual tab ──────────────────────────────────────── */
.cam-tab {
  display: flex;
  align-items: stretch;
  flex-shrink: 0;
  cursor: pointer;
  border: 1px solid var(--matrix-green-dark);
  border-bottom: 3px solid transparent;
  border-radius: 2px 2px 0 0;
  background: rgba(0, 255, 65, 0.03);
  font-family: 'VT323', 'Share Tech Mono', monospace;
  color: var(--matrix-green-dark-text);
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  user-select: none;
  min-width: 160px;
  max-width: 220px;
  overflow: hidden;
}
.cam-tab:hover {
  background: rgba(0, 255, 65, 0.08);
  border-color: var(--matrix-green);
  color: var(--matrix-green);
}
.cam-tab--active {
  background: rgba(0, 255, 65, 0.12);
  border-color: var(--matrix-green);
  border-bottom-color: var(--terminal-bg);
  color: var(--matrix-green);
  box-shadow: 0 0 12px var(--matrix-green-dim);
}

/* Tab inner content */
.tab-inner {
  flex: 1;
  min-width: 0;
  padding: 10px 10px 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tab-index {
  font-size: 0.75rem;
  opacity: 0.45;
  letter-spacing: 1px;
}
.tab-plate {
  font-size: 1.15rem;
  letter-spacing: 2px;
  line-height: 1;
  text-shadow: 0 0 5px currentColor;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cam-tab--active .tab-plate {
  color: var(--cyan);
  text-shadow: 0 0 8px rgba(0, 212, 255, 0.6);
}
.tab-provider {
  font-size: 0.8rem;
  opacity: 0.6;
  letter-spacing: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tab-total {
  font-size: 0.85rem;
  color: var(--matrix-green);
  letter-spacing: 1px;
  margin-top: 2px;
}
.cam-tab--active .tab-total {
  text-shadow: 0 0 6px var(--matrix-green-glow);
}

/* Delete button */
.tab-del {
  background: transparent;
  border: none;
  border-left: 1px solid transparent;
  color: #ff6b6b;
  width: 28px;
  min-width: 28px;
  cursor: pointer;
  font-size: 0.75rem;
  font-family: inherit;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cam-tab:hover .tab-del,
.cam-tab--active .tab-del {
  opacity: 0.7;
  border-left-color: var(--matrix-green-dark);
}
.tab-del:hover {
  opacity: 1 !important;
  background: rgba(255, 107, 107, 0.12);
}

/* ── Add button ──────────────────────────────────────────── */
.tab-add {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 18px;
  background: transparent;
  border: 1px dashed var(--matrix-green-dark);
  border-bottom: 3px solid transparent;
  border-radius: 2px 2px 0 0;
  color: var(--matrix-green);
  font-family: 'VT323', 'Share Tech Mono', monospace;
  font-size: 1.1rem;
  letter-spacing: 1px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  opacity: 0.55;
  transition: opacity 0.15s, background 0.15s, border-color 0.15s;
  min-width: 150px;
  justify-content: center;
}
.tab-add:hover {
  opacity: 1;
  border-color: var(--matrix-green);
  background: rgba(0, 255, 65, 0.06);
}
.tab-add-label { font-size: 1rem; }

/* ── Navigation arrows ───────────────────────────────────── */
.nav-arrow {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 32px;
  background: linear-gradient(90deg, rgba(0,10,0,0.95) 60%, transparent);
  border: none;
  color: var(--matrix-green);
  font-size: 0.8rem;
  cursor: pointer;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.15s;
  padding: 0;
}
.nav-arrow:hover { opacity: 1; }
.nav-arrow--left  {
  left: 0;
  background: linear-gradient(90deg, rgba(0,10,0,0.97) 50%, transparent);
}
.nav-arrow--right {
  right: 0;
  background: linear-gradient(270deg, rgba(0,10,0,0.97) 50%, transparent);
}
</style>
