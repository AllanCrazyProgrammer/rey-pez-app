<template>
  <div v-if="mostrar" class="modal-overlay" @click="cerrarModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>Kilos Refrigerados - {{ medida }}</h3>
        <button @click="cerrarModal" class="btn-cerrar">×</button>
      </div>
      
      <div class="modal-body">
        <div class="info-section">
          <p class="info-text">
            <span class="icon-info">ℹ️</span>
            Los kilos refrigerados son los que ya tienes disponibles en inventario. 
            Se restarán del total necesario para este pedido.
          </p>
        </div>
        
        <div class="input-section">
          <div class="total-info">
            <div class="total-item">
              <span class="label">Total Necesario:</span>
              <span class="value total-necesario">{{ totalKilos }} kg</span>
            </div>
            <div class="total-item">
              <span class="label">Ya Refrigerados:</span>
              <span class="value refrigerados">{{ kilosRefrigerados }} kg</span>
            </div>
            <div class="total-item resultado">
              <span class="label">
                <template v-if="kilosFaltantes > 0">Faltan por Conseguir:</template>
                <template v-else-if="kilosFaltantes < 0">Sobra disponible:</template>
                <template v-else>Cantidad exacta:</template>
              </span>
              <span class="value faltantes" :class="{ 'negativo': kilosFaltantes < 0, 'sobra': kilosFaltantes < 0 }">
                <template v-if="kilosFaltantes >= 0">
                  {{ kilosFaltantes }} kg
                </template>
                <template v-else>
                  {{ Math.abs(kilosFaltantes) }} kg
                </template>
              </span>
            </div>
          </div>
          
          <div class="input-group">
            <label for="kilosInput">Kilos Refrigerados Disponibles:</label>
            <div class="input-container">
              <input 
                id="kilosInput"
                type="number" 
                v-model.number="kilosRefrigerados"
                @input="validarInput"
                step="0.1"
                min="0"
                :max="totalKilos * 1.5"
                placeholder="0.0"
                class="kilos-input"
                ref="inputKilos"
              >
              <span class="input-unit">kg</span>
            </div>
          </div>
          
          <div v-if="kilosFaltantes < 0" class="warning-message">
            <span class="icon-warning">⚠️</span>
            Tienes más kilos refrigerados que los necesarios para este pedido
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="limpiarKilos" class="btn-limpiar">
          <span class="icon">🗑️</span> Limpiar
        </button>
        <button @click="cerrarModal" class="btn-cancelar">
          Cancelar
        </button>
        <button @click="guardarKilos" class="btn-guardar">
          <span class="icon">💾</span> Guardar
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'KilosRefrigeradosModal',
  props: {
    mostrar: {
      type: Boolean,
      default: false
    },
    medida: {
      type: String,
      required: true
    },
    totalKilos: {
      type: Number,
      required: true
    },
    kilosRefrigeradosIniciales: {
      type: Number,
      default: 0
    }
  },
  data() {
    return {
      kilosRefrigerados: this.kilosRefrigeradosIniciales || 0
    }
  },
  computed: {
    kilosFaltantes() {
      return this.totalKilos - this.kilosRefrigerados;
    }
  },
  watch: {
    mostrar(nuevoValor) {
      if (nuevoValor) {
        this.kilosRefrigerados = this.kilosRefrigeradosIniciales || 0;
        this.$nextTick(() => {
          if (this.$refs.inputKilos) {
            this.$refs.inputKilos.focus();
            this.$refs.inputKilos.select();
          }
        });
      }
    },
    kilosRefrigeradosIniciales(nuevoValor) {
      this.kilosRefrigerados = nuevoValor || 0;
    }
  },
  methods: {
    cerrarModal() {
      this.$emit('cerrar');
    },
    guardarKilos() {
      const kilos = Math.max(0, this.kilosRefrigerados || 0);
      this.$emit('guardar', {
        medida: this.medida,
        kilosRefrigerados: kilos,
        kilosFaltantes: this.totalKilos - kilos
      });
      this.cerrarModal();
    },
    limpiarKilos() {
      this.kilosRefrigerados = 0;
    },
    validarInput() {
      // Asegurar que no sea negativo
      if (this.kilosRefrigerados < 0) {
        this.kilosRefrigerados = 0;
      }
      
      // Redondear a 1 decimal
      if (this.kilosRefrigerados) {
        this.kilosRefrigerados = Math.round(this.kilosRefrigerados * 10) / 10;
      }
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 2px solid #e0e0e0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3em;
  font-weight: 600;
}

.btn-cerrar {
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 50%;
  transition: background-color 0.2s ease;
  line-height: 1;
}

.btn-cerrar:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 24px;
}

.info-section {
  margin-bottom: 24px;
}

.info-text {
  background-color: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 8px;
  padding: 12px;
  margin: 0;
  font-size: 0.9em;
  color: #1565c0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  line-height: 1.4;
}

.icon-info {
  font-size: 1.1em;
  flex-shrink: 0;
  margin-top: 1px;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.total-info {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #dee2e6;
}

.total-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.total-item:last-child {
  margin-bottom: 0;
}

.total-item.resultado {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 2px solid #dee2e6;
  font-weight: 600;
}

.label {
  font-weight: 500;
  color: #495057;
}

.value {
  font-weight: 600;
  font-size: 1.1em;
}

.total-necesario {
  color: #6c757d;
}

.refrigerados {
  color: #28a745;
}

.faltantes {
  color: #007bff;
}

.faltantes.negativo,
.faltantes.sobra {
  color: #28a745;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-weight: 600;
  color: #495057;
  font-size: 0.95em;
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.kilos-input {
  width: 100%;
  padding: 12px 40px 12px 16px;
  border: 2px solid #ced4da;
  border-radius: 8px;
  font-size: 1.1em;
  font-weight: 600;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background-color: white;
}

.kilos-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-unit {
  position: absolute;
  right: 16px;
  color: #6c757d;
  font-weight: 500;
  pointer-events: none;
}

.warning-message {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 10px;
  color: #856404;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
}

.icon-warning {
  font-size: 1.1em;
  flex-shrink: 0;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background-color: #f8f9fa;
  border-radius: 0 0 12px 12px;
}

.btn-limpiar,
.btn-cancelar,
.btn-guardar {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-limpiar {
  background-color: #6c757d;
  color: white;
}

.btn-limpiar:hover {
  background-color: #5a6268;
  transform: translateY(-1px);
}

.btn-cancelar {
  background-color: #e9ecef;
  color: #495057;
  border: 1px solid #ced4da;
}

.btn-cancelar:hover {
  background-color: #dee2e6;
  transform: translateY(-1px);
}

.btn-guardar {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.btn-guardar:hover {
  background: linear-gradient(135deg, #218838 0%, #1aa179 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.icon {
  font-size: 1em;
}

/* Responsive */
@media (max-width: 480px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }
  
  .modal-header {
    padding: 16px 20px 12px;
  }
  
  .modal-header h3 {
    font-size: 1.1em;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .modal-footer {
    padding: 12px 20px;
    flex-direction: column-reverse;
  }
  
  .btn-limpiar,
  .btn-cancelar,
  .btn-guardar {
    width: 100%;
    justify-content: center;
  }
  
  .total-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .info-text {
    flex-direction: column;
    text-align: center;
  }
}

@media print {
  .modal-overlay {
    display: none !important;
  }
}
</style>