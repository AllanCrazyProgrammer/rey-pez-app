<template>
  <div v-if="isVisible" class="modal-overlay" @click="cerrarModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Observaciones Registradas</h2>
        <button @click="cerrarModal" class="close-modal-btn">&times;</button>
      </div>

      <div class="observaciones-section">
        <div class="observaciones-header">
          <h3>Total de Observaciones: {{ observaciones.length }}</h3>
        </div>

        <div v-if="isLoading" class="loading">
          Cargando observaciones...
        </div>

        <div v-else-if="observaciones.length === 0" class="no-observaciones">
          <p>No hay observaciones registradas.</p>
        </div>

        <div v-else class="observaciones-lista">
          <div 
            v-for="observacion in observaciones" 
            :key="observacion.id" 
            class="observacion-item"
          >
            <div class="observacion-header-item">
              <span class="observacion-fecha">{{ formatearFecha(observacion.fecha) }}</span>
            </div>
            
            <div class="observacion-contenido">
              <p>{{ observacion.observacion }}</p>
            </div>
            
            <div class="observacion-meta">
              <span class="observacion-saldo">Saldo del día: ${{ formatNumber(observacion.saldoHoy) }}</span>
              <span class="observacion-total">Total acumulado: ${{ formatNumber(observacion.totalNota) }}</span>
            </div>
            
            <div class="observacion-acciones">
              <button @click="eliminarObservacion(observacion.id)" class="btn-eliminar">
                Eliminar Observación
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="cerrarModal" class="btn-cerrar">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { 
  collection, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';

export default {
  name: 'ObservacionesModal',
  props: {
    isVisible: {
      type: Boolean,
      default: false
    }
  },
  emits: ['cerrar'],
  data() {
    return {
      observaciones: [],
      isLoading: false,
      unsubscribe: null
    };
  },
  methods: {
    async cargarObservaciones() {
      try {
        this.isLoading = true;
        const cuentasRef = collection(db, 'cuentasOtilio');
        const q = query(cuentasRef, orderBy('fecha', 'desc'));
        
        this.unsubscribe = onSnapshot(q, (querySnapshot) => {
          this.observaciones = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              fecha: data.fecha,
              observacion: data.observacion || '',
              saldoHoy: data.totalGeneralVenta || 0,
              totalNota: data.nuevoSaldoAcumulado || 0,
              tieneObservacion: data.tieneObservacion || false
            };
          }).filter(obs => 
            obs.tieneObservacion === true && 
            obs.observacion.trim() !== ''
          ); // Filtrar solo observaciones activas y no vacías
          
          this.isLoading = false;
        });

      } catch (error) {
        console.error('Error al cargar observaciones:', error);
        this.isLoading = false;
      }
    },
    
    async eliminarObservacion(cuentaId) {
      if (!confirm('¿Estás seguro de que quieres eliminar esta observación?')) {
        return;
      }
      
      try {
        const cuentaRef = doc(db, 'cuentasOtilio', cuentaId);
        await updateDoc(cuentaRef, {
          observacion: '',
          tieneObservacion: false
        });
      } catch (error) {
        console.error('Error al eliminar observación:', error);
      }
    },
    
    cerrarModal() {
      this.$emit('cerrar');
    },
    
    formatearFecha(fecha) {
      if (!fecha) return '';
      const fechaObj = new Date(fecha);
      // Ajustar para evitar problemas de zona horaria
      fechaObj.setMinutes(fechaObj.getMinutes() + fechaObj.getTimezoneOffset());
      return fechaObj.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    
    formatNumber(value) {
      return value.toLocaleString('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
  },
  watch: {
    isVisible(newValue) {
      if (newValue) {
        this.cargarObservaciones();
      } else if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = null;
      }
    }
  },
  beforeUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
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
  padding: 20px;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  width: 95%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 2px solid #ff0000;
  background-color: #fff5f5;
  border-radius: 12px 12px 0 0;
}

.modal-header h2 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #666;
  cursor: pointer;
  padding: 5px 10px;
  transition: color 0.3s ease;
  border-radius: 50%;
}

.close-modal-btn:hover {
  color: #000;
  background-color: rgba(0, 0, 0, 0.1);
}

.observaciones-section {
  padding: 30px;
  max-height: 500px;
  overflow-y: auto;
}

.observaciones-header {
  margin-bottom: 20px;
}

.observaciones-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2rem;
}

.loading, .no-observaciones {
  text-align: center;
  padding: 40px;
  color: #666;
}

.observacion-item {
  background-color: #fff5f5;
  border: 2px solid #ff0000;
  border-radius: 8px;
  margin-bottom: 20px;
  padding: 20px;
  transition: all 0.3s ease;
}

.observacion-item:hover {
  border-color: #cc0000;
  box-shadow: 0 4px 12px rgba(255, 0, 0, 0.2);
}

.observacion-header-item {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 10px;
}

.observacion-fecha {
  color: #666;
  font-size: 0.9rem;
  font-weight: bold;
}

.observacion-contenido {
  margin-bottom: 15px;
  line-height: 1.6;
}

.observacion-contenido p {
  margin: 0;
  color: #333;
  white-space: pre-wrap;
  background-color: white;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #ff0000;
}

.observacion-meta {
  margin-bottom: 15px;
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.observacion-saldo, .observacion-total {
  color: #666;
  font-size: 0.9rem;
}

.observacion-saldo {
  font-weight: bold;
}

.observacion-total {
  color: #4CAF50;
  font-weight: bold;
}

.observacion-acciones {
  display: flex;
  justify-content: flex-end;
}

.btn-eliminar {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.3s ease;
  background-color: #f44336;
  color: white;
}

.btn-eliminar:hover {
  background-color: #d32f2f;
  transform: translateY(-2px);
}

.modal-footer {
  padding: 20px 30px;
  background-color: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  border-radius: 0 0 12px 12px;
  text-align: center;
}

.btn-cerrar {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.btn-cerrar:hover {
  background-color: #5a6268;
  transform: translateY(-2px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .modal-content {
    width: 100%;
    max-width: none;
    margin: 10px;
    max-height: 95vh;
  }

  .modal-header {
    padding: 15px 20px;
  }

  .modal-header h2 {
    font-size: 1.3rem;
  }

  .observaciones-section {
    padding: 20px;
  }

  .observacion-header-item {
    justify-content: flex-start;
  }

  .observacion-meta {
    flex-direction: column;
    gap: 5px;
  }

  .observacion-acciones {
    justify-content: center;
  }

  .btn-eliminar {
    width: 100%;
    max-width: 200px;
  }
}

@media (max-width: 480px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal-header {
    padding: 10px 15px;
  }

  .observaciones-section {
    padding: 15px;
  }

  .observacion-item {
    padding: 15px;
  }
}
</style>
