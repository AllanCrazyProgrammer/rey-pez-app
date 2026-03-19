<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Lista de medidas a sacar</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <p class="modal-subtitle">
        {{ fechaSacada }} - Define cuantas cajas sacar por medida.
      </p>

      <div v-if="grupos.length === 0" class="empty-state">
        Aun no hay medidas agregadas.
      </div>

      <div class="groups-grid">
        <div v-for="(grupo, groupIndex) in grupos" :key="grupo.id" class="grupo-card">
          <div class="grupo-header">
            <label class="field-label" :for="`pedido-${grupo.id}`">Medida del pedido</label>
            <button class="remove-btn" @click="removeGroup(groupIndex)">Eliminar</button>
          </div>

          <input
            :id="`pedido-${grupo.id}`"
            v-model.trim="grupo.medidaPedido"
            type="text"
            class="text-input"
            placeholder='Ej. 71/90'
            list="medidas-options"
          />

          <div class="rows-title">Medidas que se van a sacar</div>

          <div v-for="(item, itemIndex) in grupo.items" :key="item.id" class="item-row">
            <input
              v-model.trim="item.medida"
              type="text"
              class="text-input"
              placeholder='Medida a sacar (ej. 67/90)'
              list="medidas-options"
            />
            <input
              v-model.number="item.cajas"
              type="number"
              min="0"
              step="1"
              class="number-input"
              placeholder="Cajas"
            />
            <button class="remove-item-btn" @click="removeItem(groupIndex, itemIndex)">X</button>
          </div>

          <button class="add-item-btn" @click="addItem(groupIndex)">+ Agregar medida</button>
        </div>
      </div>

      <button class="add-group-btn" @click="addGroup">+ Agregar medida del pedido</button>

      <datalist id="medidas-options">
        <option v-for="medida in medidaOptions" :key="medida" :value="medida"></option>
      </datalist>

      <div class="modal-actions">
        <button class="pdf-btn" :disabled="isGeneratingPdf" @click="generarPdfResumen">
          {{ isGeneratingPdf ? 'Generando PDF...' : 'PDF resumido' }}
        </button>
        <button class="secondary-btn" @click="$emit('close')">Cancelar</button>
        <button class="primary-btn" :disabled="isSaving" @click="save">
          {{ isSaving ? 'Guardando...' : 'Guardar lista' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { generarResumenMedidasSacadaPDF } from '@/utils/sacadasResumenPdf';

export default {
  name: 'ListaMedidasPedidoModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    isSaving: {
      type: Boolean,
      default: false
    },
    sacada: {
      type: Object,
      default: null
    },
    medidas: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      grupos: [],
      isGeneratingPdf: false
    };
  },
  computed: {
    fechaSacada() {
      return this.sacada?.fechaTexto || 'Sin fecha';
    },
    medidaOptions() {
      return this.medidas
        .map((medida) => medida?.nombre || medida?.medida || medida?.descripcion || '')
        .filter(Boolean);
    }
  },
  watch: {
    isOpen(value) {
      if (value) {
        this.loadFromSacada();
      }
    }
  },
  methods: {
    createEmptyItem() {
      return {
        id: this.generateId(),
        medida: '',
        cajas: null
      };
    },
    createEmptyGroup() {
      return {
        id: this.generateId(),
        medidaPedido: '',
        items: [this.createEmptyItem()]
      };
    },
    generateId() {
      return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    },
    loadFromSacada() {
      const existing = this.sacada?.listaMedidasPedido || [];

      if (!Array.isArray(existing) || existing.length === 0) {
        this.grupos = [this.createEmptyGroup()];
        return;
      }

      this.grupos = existing.map((group) => ({
        id: this.generateId(),
        medidaPedido: group?.medidaPedido || '',
        items: Array.isArray(group?.items) && group.items.length > 0
          ? group.items.map((item) => ({
              id: this.generateId(),
              medida: item?.medida || '',
              cajas: Number.isFinite(item?.cajas) ? item.cajas : null
            }))
          : [this.createEmptyItem()]
      }));
    },
    addGroup() {
      this.grupos.push(this.createEmptyGroup());
    },
    removeGroup(groupIndex) {
      this.grupos.splice(groupIndex, 1);
      if (this.grupos.length === 0) {
        this.grupos.push(this.createEmptyGroup());
      }
    },
    addItem(groupIndex) {
      this.grupos[groupIndex].items.push(this.createEmptyItem());
    },
    removeItem(groupIndex, itemIndex) {
      const group = this.grupos[groupIndex];
      group.items.splice(itemIndex, 1);
      if (group.items.length === 0) {
        group.items.push(this.createEmptyItem());
      }
    },
    normalizeGroups() {
      return this.grupos
        .map((group) => ({
          medidaPedido: (group.medidaPedido || '').trim(),
          items: (group.items || [])
            .map((item) => ({
              medida: (item.medida || '').trim(),
              cajas: Number(item.cajas)
            }))
            .filter((item) => item.medida && Number.isFinite(item.cajas) && item.cajas > 0)
        }))
        .filter((group) => group.medidaPedido && group.items.length > 0);
    },
    save() {
      const payload = this.normalizeGroups();
      this.$emit('save', payload);
    },
    async generarPdfResumen() {
      const payload = this.normalizeGroups();

      if (payload.length === 0) {
        alert('Agrega al menos una medida con cajas para generar el PDF');
        return;
      }

      this.isGeneratingPdf = true;
      try {
        await generarResumenMedidasSacadaPDF({
          fecha: this.fechaSacada,
          grupos: payload
        });
      } catch (error) {
        console.error('Error al generar PDF de resumen:', error);
        alert('No se pudo generar el PDF');
      } finally {
        this.isGeneratingPdf = false;
      }
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 16px;
}

.modal-content {
  width: min(96vw, 1680px);
  max-width: 1680px;
  max-height: 90vh;
  overflow-y: auto;
  background: white;
  border-radius: 12px;
  padding: 20px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.modal-header h3 {
  margin: 0;
  color: #3760b0;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  color: #666;
}

.modal-subtitle {
  margin: 8px 0 18px;
  color: #666;
  font-size: 0.95rem;
}

.empty-state {
  background: #f7f7f7;
  border: 1px dashed #ccc;
  border-radius: 8px;
  padding: 10px;
  color: #555;
  margin-bottom: 12px;
}

.groups-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(220px, 1fr));
  gap: 12px;
}

.grupo-card {
  border: 1px solid #dbe4f5;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  background: #f9fbff;
}

.grupo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.field-label {
  color: #3760b0;
  font-weight: 600;
}

.rows-title {
  margin: 12px 0 8px;
  color: #1f2937;
  font-weight: 600;
}

.text-input,
.number-input {
  width: 100%;
  border: 1px solid #cfd7e6;
  border-radius: 6px;
  padding: 9px 10px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.item-row {
  display: grid;
  grid-template-columns: 1fr 110px auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.remove-item-btn {
  background: #dc3545;
  color: #fff;
  min-width: 42px;
  padding: 8px 10px;
}

.remove-btn,
.remove-item-btn,
.add-item-btn,
.add-group-btn,
.pdf-btn,
.secondary-btn,
.primary-btn {
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.9rem;
}

.remove-btn,
.remove-item-btn {
  background: #f8d7da;
  color: #8a1f2d;
}

.add-item-btn,
.add-group-btn {
  background: #e0ebff;
  color: #24457f;
}

.add-group-btn {
  width: 100%;
  margin-top: 6px;
}

.modal-actions {
  margin-top: 18px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.secondary-btn {
  background: #eceff4;
  color: #333;
}

.pdf-btn {
  background: #1e8e5a;
  color: #fff;
}

.pdf-btn:disabled {
  background: #91bfa8;
  cursor: not-allowed;
}

.primary-btn {
  background: #3760b0;
  color: white;
}

.primary-btn:disabled {
  background: #8ea3d3;
  cursor: not-allowed;
}

@media (max-width: 519px) {
  .modal-content {
    padding: 16px;
    border-radius: 10px;
  }

  .groups-grid {
    grid-template-columns: 1fr;
  }

  .item-row {
    grid-template-columns: 1fr;
    gap: 6px;
    margin-bottom: 10px;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .secondary-btn,
  .pdf-btn,
  .primary-btn {
    width: 100%;
  }
}

@media (min-width: 520px) and (max-width: 760px) {
  .modal-content {
    padding: 12px;
    border-radius: 10px;
  }

  .groups-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .item-row {
    grid-template-columns: 1fr 72px auto;
    gap: 6px;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .secondary-btn,
  .pdf-btn,
  .primary-btn {
    width: 100%;
  }
}

@media (min-width: 761px) and (max-width: 1024px) {
  .groups-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
