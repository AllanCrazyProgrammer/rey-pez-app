<template>
  <div v-if="mostrar" class="modal-overlay">
    <div class="modal-configuracion-medidas">
      <div class="modal-header">
        <h3>Configuración de Medidas</h3>
        <button @click="cerrar" class="btn-cerrar">&times;</button>
      </div>
      
      <div class="modal-body">
        <!-- Agregar nueva medida -->
        <div class="agregar-medida-section">
          <h4>Agregar Nueva Medida</h4>
          <div class="input-group">
            <input 
              v-model="nuevaMedida" 
              type="text" 
              placeholder="Ingresa una nueva medida (ej: 16/20, 21/25, etc.)"
              @keydown.enter="agregarMedida"
              class="input-nueva-medida"
            >
            <button @click="agregarMedida" class="btn btn-success" :disabled="!nuevaMedida.trim()">
              Agregar
            </button>
          </div>
        </div>

        <!-- Lista de medidas configuradas -->
        <div class="medidas-configuradas-section">
          <h4>Medidas Disponibles en el Selector</h4>
          <p class="descripcion">
            Selecciona las medidas que aparecerán como opciones en el campo de medida. 
            Los usuarios también podrán escribir manualmente medidas que no estén en esta lista.
          </p>
          
          <div class="medidas-grid">
            <div 
              v-for="medida in todasLasMedidas" 
              :key="medida" 
              class="medida-item"
              :class="{ 'seleccionada': medidasSeleccionadas.includes(medida) }"
              @click="toggleMedida(medida)"
            >
              <span class="medida-texto">{{ medida }}</span>
              <span v-if="medidasSeleccionadas.includes(medida)" class="checkmark">✓</span>
            </div>
          </div>


        </div>
      </div>

      <div class="modal-footer">
        <button @click="cerrar" class="btn btn-secondary">Cancelar</button>
        <button @click="guardar" class="btn btn-primary">Guardar Configuración</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ConfiguracionMedidasModal',
  
  props: {
    mostrar: {
      type: Boolean,
      default: false
    },
    medidasConfiguracion: {
      type: Array,
      default: () => []
    },
    medidasUsadas: {
      type: Array,
      default: () => []
    }
  },

  emits: ['cerrar', 'guardar'],

  data() {
    return {
      nuevaMedida: '',
      medidasSeleccionadas: [...this.medidasConfiguracion]
    };
  },

  computed: {
    todasLasMedidas() {
      // Combinar medidas usadas históricamente con medidas agregadas manualmente
      const combinadas = new Set([
        ...this.medidasUsadas,
        ...this.medidasSeleccionadas
      ]);
      return Array.from(combinadas).sort();
    }
  },

  watch: {
    medidasConfiguracion: {
      handler(nuevas) {
        this.medidasSeleccionadas = [...nuevas];
      },
      immediate: true
    }
  },

  methods: {
    agregarMedida() {
      const medida = this.nuevaMedida.trim();
      if (medida && !this.todasLasMedidas.includes(medida)) {
        this.medidasSeleccionadas.push(medida);
        this.nuevaMedida = '';
      }
    },



    toggleMedida(medida) {
      const index = this.medidasSeleccionadas.indexOf(medida);
      if (index === -1) {
        this.medidasSeleccionadas.push(medida);
      } else {
        this.medidasSeleccionadas.splice(index, 1);
      }
    },

    cerrar() {
      this.$emit('cerrar');
    },

    guardar() {
      this.$emit('guardar', this.medidasSeleccionadas);
      this.cerrar();
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.modal-configuracion-medidas {
  background: white;
  border-radius: 10px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
  border-radius: 10px 10px 0 0;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.btn-cerrar {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-cerrar:hover {
  background-color: #e0e0e0;
  border-radius: 50%;
}

.modal-body {
  padding: 20px;
}

.agregar-medida-section {
  margin-bottom: 30px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.agregar-medida-section h4 {
  margin-top: 0;
  color: #007bff;
}

.input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.input-nueva-medida {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
}

.medidas-configuradas-section h4 {
  color: #28a745;
  margin-bottom: 10px;
}

.descripcion {
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
  line-height: 1.4;
}

.medidas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 30px;
}

.medida-item {
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
  background-color: white;
}

.medida-item:hover {
  border-color: #007bff;
  transform: translateY(-2px);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.medida-item.seleccionada {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

.medida-texto {
  font-weight: 500;
}

.checkmark {
  font-weight: bold;
  color: white;
}



.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  background-color: #f8f9fa;
  border-radius: 0 0 10px 10px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #218838;
}

.btn-success:disabled {
  background-color: #94d3a2;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .modal-configuracion-medidas {
    width: 95%;
    margin: 10px;
  }
  
  .medidas-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }
  
  .input-group {
    flex-direction: column;
    align-items: stretch;
  }
}
</style> 