<template>
  <div v-if="mostrar" class="modal-overlay">
    <div class="modal-configuracion-medidas">
      <div class="modal-header">
        <h3>Configuración de Medidas</h3>
        <button type="button" @click="cerrar" class="btn-cerrar">&times;</button>
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
              @keydown.enter.prevent="agregarMedida"
              class="input-nueva-medida"
            >
            <button type="button" @click="agregarMedida" class="btn btn-success" :disabled="!nuevaMedida.trim()">
              Agregar
            </button>
          </div>
        </div>

        <!-- Lista de medidas configuradas -->
        <div class="medidas-configuradas-section">
          <h4>Orden de Medidas en el Selector</h4>
          <p class="descripcion">
            Agrega únicamente las medidas que quieras mostrar y acomódalas en el orden deseado.
            También se podrán escribir otras medidas manualmente y las recomendaciones seguirán disponibles.
          </p>

          <div v-if="medidasSeleccionadas.length === 0" class="medidas-vacias">
            No hay medidas configuradas. Agrega la primera medida arriba.
          </div>

          <div v-else class="medidas-ordenadas">
            <div 
              v-for="(medida, index) in medidasSeleccionadas"
              :key="medida" 
              class="medida-orden-item"
              :class="{ 'arrastrando': indiceArrastrado === index }"
              draggable="true"
              @dragstart="iniciarArrastre(index, $event)"
              @dragover.prevent
              @drop="soltarMedida(index)"
              @dragend="finalizarArrastre"
            >
              <span class="asa-arrastre" title="Arrastrar para ordenar">
                <i class="fas fa-grip-vertical"></i>
              </span>
              <span class="numero-orden">{{ index + 1 }}</span>
              <span class="medida-texto">{{ medida }}</span>
              <div class="controles-orden">
                <button
                  type="button"
                  class="btn-orden"
                  :disabled="index === 0"
                  :aria-label="`Subir ${medida}`"
                  @click="moverMedida(index, -1)"
                >
                  <i class="fas fa-arrow-up"></i>
                </button>
                <button
                  type="button"
                  class="btn-orden"
                  :disabled="index === medidasSeleccionadas.length - 1"
                  :aria-label="`Bajar ${medida}`"
                  @click="moverMedida(index, 1)"
                >
                  <i class="fas fa-arrow-down"></i>
                </button>
                <button
                  type="button"
                  class="btn-eliminar-medida"
                  :aria-label="`Eliminar ${medida}`"
                  @click="eliminarMedida(index)"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" @click="cerrar" class="btn btn-secondary">Cancelar</button>
        <button type="button" @click="guardar" class="btn btn-primary">Guardar Configuración</button>
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
      medidasSeleccionadas: [...this.medidasConfiguracion],
      indiceArrastrado: null
    };
  },

  watch: {
    medidasConfiguracion: {
      handler(nuevas) {
        this.medidasSeleccionadas = [...nuevas];
      },
      immediate: true
    },
    mostrar(visible) {
      if (visible) {
        this.medidasSeleccionadas = [...this.medidasConfiguracion];
        this.nuevaMedida = '';
        this.indiceArrastrado = null;
      }
    }
  },

  methods: {
    agregarMedida() {
      const medida = this.nuevaMedida.trim();
      const yaExiste = this.medidasSeleccionadas.some(
        existente => existente.toLocaleLowerCase() === medida.toLocaleLowerCase()
      );

      if (medida && !yaExiste) {
        this.medidasSeleccionadas.push(medida);
      }
      this.nuevaMedida = '';
    },

    moverMedida(index, desplazamiento) {
      const destino = index + desplazamiento;
      if (destino < 0 || destino >= this.medidasSeleccionadas.length) return;

      const [medida] = this.medidasSeleccionadas.splice(index, 1);
      this.medidasSeleccionadas.splice(destino, 0, medida);
    },

    eliminarMedida(index) {
      this.medidasSeleccionadas.splice(index, 1);
    },

    iniciarArrastre(index, event) {
      this.indiceArrastrado = index;
      if (event?.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
      }
    },

    soltarMedida(indexDestino) {
      if (this.indiceArrastrado === null || this.indiceArrastrado === indexDestino) {
        this.indiceArrastrado = null;
        return;
      }

      const [medida] = this.medidasSeleccionadas.splice(this.indiceArrastrado, 1);
      this.medidasSeleccionadas.splice(indexDestino, 0, medida);
      this.indiceArrastrado = null;
    },

    finalizarArrastre() {
      this.indiceArrastrado = null;
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

.medidas-ordenadas {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 30px;
}

.medidas-vacias {
  padding: 24px;
  margin-bottom: 30px;
  color: #6b7280;
  border: 2px dashed #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
  text-align: center;
  font-weight: 600;
}

.medida-orden-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 58px;
  padding: 8px 10px;
  border: 2px solid #dbe4ee;
  border-radius: 8px;
  background-color: white;
  transition: border-color .2s ease, box-shadow .2s ease, opacity .2s ease;
}

.medida-orden-item:hover {
  border-color: #007bff;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.medida-orden-item.arrastrando {
  opacity: .45;
  border-color: #007bff;
}

.medida-texto {
  flex: 1;
  min-width: 0;
  font-size: 18px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.asa-arrastre {
  color: #94a3b8;
  cursor: grab;
}

.numero-orden {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  color: #075985;
  border-radius: 50%;
  background: #e0f2fe;
  font-weight: 800;
}

.controles-orden {
  display: flex;
  gap: 6px;
}

.btn-orden,
.btn-eliminar-medida {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
}

.btn-orden { color: #0369a1; }

.btn-eliminar-medida {
  color: #be123c;
  border-color: #fecdd3;
  background: #fff1f2;
}

.btn-orden:disabled {
  opacity: .35;
  cursor: not-allowed;
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
  
  .input-group {
    flex-direction: column;
    align-items: stretch;
  }

  .medida-orden-item {
    gap: 8px;
  }

  .asa-arrastre {
    display: none;
  }

  .btn-orden,
  .btn-eliminar-medida {
    width: 38px;
    height: 38px;
  }
}
</style>
