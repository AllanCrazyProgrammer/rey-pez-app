<template>
  <div v-if="mostrar" class="modal-overlay">
    <div class="modal-content">
      <h3>Configurar Pesos de Taras</h3>
      <div class="configuracion-grid">
        <div class="config-item">
          <label>Peso para cálculo de costos:</label>
          <input 
            type="number" 
            v-model="pesoTaraCostoLocal" 
            min="1" 
            max="50"
            placeholder="Peso en kg"
          >
          <small class="config-help">Peso por defecto usado para calcular costos de crudos</small>
        </div>
        <div class="config-item">
          <label>Peso para cálculo de ventas:</label>
          <input 
            type="number" 
            v-model="pesoTaraVentaLocal" 
            min="1" 
            max="50"
            placeholder="Peso en kg"
          >
          <small class="config-help">Peso por defecto usado para calcular ventas de crudos</small>
        </div>
      </div>
      <div class="modal-buttons">
        <button @click="guardar" class="btn-guardar">Guardar</button>
        <button @click="cancelar" class="btn-cancelar">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConfiguracionModal',
  props: {
    mostrar: {
      type: Boolean,
      default: false
    },
    pesoTaraCosto: {
      type: Number,
      default: 19
    },
    pesoTaraVenta: {
      type: Number,
      default: 20
    }
  },
  data() {
    return {
      pesoTaraCostoLocal: 19,
      pesoTaraVentaLocal: 20
    };
  },
  watch: {
    pesoTaraCosto: {
      immediate: true,
      handler(value) {
        this.pesoTaraCostoLocal = value;
      }
    },
    pesoTaraVenta: {
      immediate: true,
      handler(value) {
        this.pesoTaraVentaLocal = value;
      }
    }
  },
  methods: {
    guardar() {
      this.$emit('guardar', {
        pesoTaraCosto: Number(this.pesoTaraCostoLocal),
        pesoTaraVenta: Number(this.pesoTaraVentaLocal)
      });
    },
    cancelar() {
      this.pesoTaraCostoLocal = this.pesoTaraCosto;
      this.pesoTaraVentaLocal = this.pesoTaraVenta;
      this.$emit('cancelar');
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
}

.modal-content h3 {
  margin-top: 0;
  color: #2c3e50;
}

.configuracion-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 20px 0;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item label {
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 5px;
}

.config-item input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.config-help {
  font-size: 0.85em;
  color: #666;
  font-style: italic;
  margin-top: 5px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.btn-guardar {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-cancelar {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

@media (max-width: 768px) {
  .configuracion-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
}
</style>