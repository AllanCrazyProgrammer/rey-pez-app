<template>
  <div class="cat-grid-wrap">
    <div class="cats">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="cat"
        :class="{ active: cat.id === activeId }"
        @click="$emit('select', cat.id)"
      >
        <button
          type="button"
          class="cat-del"
          aria-label="Eliminar categoría"
          @click.stop="$emit('delete', cat)"
        >✕</button>
        <span class="cat-name">{{ cat.name }}</span>
        <span class="cat-count">{{ cat.count }}</span>
      </div>
    </div>
    <button type="button" class="add-cat" @click="$emit('add-category')">
      + Agregar talla
    </button>
  </div>
</template>

<script>
export default {
  name: 'CategoryGrid',
  props: {
    categories: { type: Array, required: true },
    activeId: { type: String, default: null }
  }
};
</script>

<style scoped>
.cats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  font-family: 'VT323', 'Share Tech Mono', monospace;
}

.cat {
  background: rgba(0, 20, 0, 0.85);
  border: 1px solid var(--matrix-green);
  padding: 10px 12px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  display: flex;
  flex-direction: column;
  gap: 2px;
  position: relative;
  color: var(--matrix-green);
}

.cat:hover {
  background: rgba(0, 255, 65, 0.06);
}

.cat.active {
  border-color: var(--amber);
  background: rgba(255, 176, 0, 0.08);
  box-shadow: 0 0 15px var(--amber-glow);
}

.cat-name {
  font-size: 1.1rem;
  font-weight: 400;
  letter-spacing: 1px;
  color: var(--matrix-green);
  text-shadow: 0 0 6px var(--matrix-green-dim);
}

.cat.active .cat-name {
  color: var(--amber);
  text-shadow: 0 0 8px var(--amber-glow);
}

.cat-count {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.7rem;
  font-weight: 700;
  color: var(--matrix-green);
  text-shadow: 0 0 10px var(--matrix-green);
}

.cat.active .cat-count {
  color: var(--amber);
  text-shadow: 0 0 10px var(--amber);
}

.cat-del {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  width: 24px;
  height: 24px;
  border-radius: 0;
  font-size: 0.9rem;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
}

.cat-del:hover {
  background: #ff6b6b;
  color: #000;
  border-color: #ff6b6b;
}

.add-cat {
  display: block;
  width: 100%;
  margin-top: 8px;
  background: transparent;
  border: 1px dashed var(--matrix-green);
  color: var(--matrix-green);
  padding: 12px;
  font-size: 1rem;
  cursor: pointer;
  font-family: 'VT323', 'Share Tech Mono', monospace;
  letter-spacing: 1px;
  min-height: 50px;
}

.add-cat:hover {
  background: rgba(0, 255, 65, 0.08);
  border-style: solid;
  box-shadow: 0 0 10px var(--matrix-green-dim);
}
</style>
