<template>
  <div class="mcmd-wrapper" ref="wrapper">
    <input
      :id="inputId"
      ref="inputEl"
      v-model="inputText"
      type="text"
      :placeholder="placeholder"
      class="mcmd-input"
      autocomplete="off"
      @focus="isOpen = true"
      @input="isOpen = true"
      @keydown.esc="close"
      @keydown.enter.prevent="pickFirst"
    />
    <div v-if="isOpen && filteredOptions.length > 0" class="mcmd-dropdown">
      <div class="mcmd-grid">
        <div v-for="(col, ci) in columns" :key="ci" class="mcmd-col">
          <button
            v-for="opt in col"
            :key="opt"
            type="button"
            class="mcmd-opt"
            :class="{ 'mcmd-opt--active': opt === value }"
            @mousedown.prevent="pick(opt)"
          >
            {{ opt }}
          </button>
        </div>
      </div>
    </div>
    <div
      v-else-if="isOpen && inputText.trim() && filteredOptions.length === 0"
      class="mcmd-dropdown mcmd-dropdown--empty"
    >
      Sin resultados para "{{ inputText.trim() }}"
    </div>
  </div>
</template>

<script>
const ROWS_PER_COL = 6;

export default {
  name: 'MultiColumnMeasureDropdown',
  props: {
    value: {
      type: String,
      default: ''
    },
    options: {
      type: Array,
      default: () => []
    },
    placeholder: {
      type: String,
      default: 'Ej. 71/90'
    },
    inputId: {
      type: String,
      default: undefined
    }
  },
  data() {
    return {
      isOpen: false,
      inputText: this.value || ''
    };
  },
  computed: {
    filteredOptions() {
      const q = (this.inputText || '').trim().toLowerCase();
      if (!q) return this.options;
      return this.options.filter((o) => o.toLowerCase().includes(q));
    },
    columns() {
      const opts = this.filteredOptions;
      const cols = [];
      for (let i = 0; i < opts.length; i += ROWS_PER_COL) {
        cols.push(opts.slice(i, i + ROWS_PER_COL));
      }
      return cols;
    }
  },
  watch: {
    value(val) {
      this.inputText = val || '';
    }
  },
  mounted() {
    document.addEventListener('mousedown', this.handleOutside);
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.handleOutside);
  },
  methods: {
    pick(opt) {
      this.inputText = opt;
      this.$emit('input', opt);
      this.isOpen = false;
    },
    pickFirst() {
      if (this.filteredOptions.length > 0) {
        this.pick(this.filteredOptions[0]);
      } else {
        this.close();
      }
    },
    close() {
      this.isOpen = false;
      this.$emit('input', (this.inputText || '').trim());
    },
    handleOutside(e) {
      if (this.$el && !this.$el.contains(e.target)) {
        if (this.isOpen) this.close();
      }
    }
  }
};
</script>

<style scoped>
.mcmd-wrapper {
  position: relative;
  width: 100%;
}

.mcmd-input {
  width: 100%;
  border: 1px solid #cfd7e6;
  border-radius: 6px;
  padding: 9px 10px;
  font-size: 0.95rem;
  box-sizing: border-box;
  background: transparent;
}

.mcmd-input:focus {
  outline: none;
  border-color: #3760b0;
  box-shadow: 0 0 0 2px rgba(55, 96, 176, 0.15);
}

.mcmd-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 9999;
  background: white;
  border: 1px solid #cfd7e6;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.14);
  overflow-x: auto;
  max-width: min(90vw, 720px);
  min-width: 160px;
  padding: 6px;
}

.mcmd-dropdown--empty {
  padding: 10px 14px;
  color: #888;
  font-size: 0.9rem;
  white-space: nowrap;
}

.mcmd-grid {
  display: flex;
  gap: 4px;
}

.mcmd-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 100px;
}

.mcmd-opt {
  background: none;
  border: none;
  border-radius: 5px;
  padding: 7px 10px;
  text-align: left;
  cursor: pointer;
  font-size: 0.92rem;
  white-space: nowrap;
  color: #1f2937;
  transition: background 0.1s;
  width: 100%;
}

.mcmd-opt:hover,
.mcmd-opt--active {
  background: #e0ebff;
  color: #3760b0;
  font-weight: 600;
}
</style>
