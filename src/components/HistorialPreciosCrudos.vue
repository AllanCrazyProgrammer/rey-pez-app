<template>
  <div v-if="mostrar" class="modal-overlay" @click="cerrarModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="modal-title-info">
          <h2>{{ medida?.nombre || 'Producto' }}</h2>
          <span class="proveedor-badge">{{ proveedorNombre }}</span>
        </div>
        <button @click="$emit('cerrar')" class="close-button">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Resumen del producto -->
        <div class="producto-resumen">
          <div class="precio-actual-section">
            <div class="precio-principal">
              <span class="label">Precio Actual</span>
              <span class="precio-valor">${{ formatearPrecio(precioActual) }}</span>
              <span class="fecha-actual">{{ formatearFecha(fechaUltimoPrecio) }}</span>
            </div>
            <div class="precio-estadisticas">
              <div class="stat-item">
                <span class="stat-numero">{{ totalRegistros }}</span>
                <span class="stat-label">Registros</span>
              </div>
              <div class="stat-item">
                <span class="stat-numero">${{ formatearPrecio(precioPromedio) }}</span>
                <span class="stat-label">Promedio</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Formulario para agregar nuevo precio -->
        <div class="agregar-precio-section">
          <div class="section-header">
            <h3>Actualizar Precio</h3>
            <button 
              @click="mostrarFormulario = !mostrarFormulario" 
              class="btn-toggle-form"
              :class="{ 'active': mostrarFormulario }"
            >
              {{ mostrarFormulario ? '×' : '+' }}
            </button>
          </div>
          
          <div v-if="mostrarFormulario" class="precio-form">
            <div class="form-grid">
              <div class="form-group">
                <label>Nuevo Precio:</label>
                <input 
                  v-model.number="nuevoPrecio.precio" 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  class="form-control precio-input"
                  ref="precioInput"
                  @keyup.enter="agregarPrecio"
                >
              </div>
              <div class="form-group">
                <label>Fecha:</label>
                <input 
                  v-model="nuevoPrecio.fecha" 
                  type="date" 
                  class="form-control"
                >
              </div>
            </div>
            <div class="form-group">
              <label>Notas (opcional):</label>
              <input 
                v-model="nuevoPrecio.notas" 
                type="text" 
                placeholder="Ej: Precio especial, cambio de temporada, etc."
                class="form-control"
              >
            </div>
            <div class="form-actions">
              <button @click="limpiarFormulario" class="btn-cancelar">
                Cancelar
              </button>
              <button @click="agregarPrecio" class="btn-guardar" :disabled="guardando || !esFormularioValido">
                {{ guardando ? 'Guardando...' : 'Guardar Precio' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Historial de precios -->
        <div class="historial-section">
          <h3>Historial de Precios</h3>
          
          <div v-if="historialPrecios.length > 0" class="precios-timeline">
            <div 
              v-for="(precio, index) in preciosOrdenados" 
              :key="precio.id || index"
              class="precio-item"
              :class="{ 'precio-actual': index === 0 }"
            >
              <div class="precio-fecha-badge">
                {{ formatearFecha(precio.fecha) }}
              </div>
              <div class="precio-info">
                <div class="precio-monto">
                  <span class="precio-valor">${{ formatearPrecio(precio.precio) }}</span>
                  <span v-if="index === 0" class="actual-badge">Actual</span>
                </div>
                <div v-if="precio.notas" class="precio-notas">
                  📝 {{ precio.notas }}
                </div>
              </div>
              <div class="precio-actions">
                <button @click="editarPrecio(precio)" class="btn-editar" title="Editar precio">
                  ✏️
                </button>
                <button 
                  v-if="historialPrecios.length > 1" 
                  @click="eliminarPrecio(precio)" 
                  class="btn-eliminar" 
                  title="Eliminar precio"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
          
          <div v-else class="no-historial">
            <div class="no-historial-icon">📊</div>
            <p>No hay historial de precios disponible</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

export default {
  name: 'HistorialPreciosCrudos',
  props: {
    mostrar: {
      type: Boolean,
      required: true
    },
    medida: {
      type: Object,
      default: null
    },
    proveedorId: {
      type: String,
      required: true
    },
    proveedorNombre: {
      type: String,
      required: true
    }
  },
  emits: ['cerrar', 'actualizado'],
  data() {
    return {
      mostrarFormulario: false,
      guardando: false,
      nuevoPrecio: {
        precio: null,
        fecha: this.obtenerFechaActual(),
        notas: ''
      },
      historialPrecios: []
    };
  },
  computed: {
    esFormularioValido() {
      return this.nuevoPrecio.precio && this.nuevoPrecio.precio > 0 && this.nuevoPrecio.fecha;
    },

    preciosOrdenados() {
      if (!this.historialPrecios.length) return [];
      return [...this.historialPrecios].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    },

    precioActual() {
      if (!this.historialPrecios.length) return 0;
      return this.preciosOrdenados[0].precio;
    },

    fechaUltimoPrecio() {
      if (!this.historialPrecios.length) return this.medida?.fechaCreacion;
      return this.preciosOrdenados[0].fecha;
    },

    totalRegistros() {
      return this.historialPrecios.length;
    },

    precioPromedio() {
      if (!this.historialPrecios.length) return 0;
      const suma = this.historialPrecios.reduce((sum, precio) => sum + precio.precio, 0);
      return suma / this.historialPrecios.length;
    }
  },
  methods: {
    cerrarModal(event) {
      if (event.target === event.currentTarget) {
        this.$emit('cerrar');
      }
    },

    obtenerFechaActual() {
      const fecha = new Date();
      return fecha.toISOString().split('T')[0];
    },

    async cargarHistorialPrecios() {
      if (!this.medida?.id) return;

      try {
        const q = query(
          collection(db, 'historialPreciosCrudos'),
          where('medidaId', '==', this.medida.id),
          where('proveedorId', '==', this.proveedorId)
        );
        
        const querySnapshot = await getDocs(q);
        this.historialPrecios = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

      } catch (error) {
        console.error('Error al cargar historial de precios:', error);
        this.historialPrecios = [];
      }
    },

    async agregarPrecio() {
      if (!this.esFormularioValido) {
        alert('Por favor complete el precio y la fecha');
        return;
      }

      try {
        this.guardando = true;
        
        const datosNuevoPrecio = {
          proveedorId: this.proveedorId,
          proveedorNombre: this.proveedorNombre,
          medidaId: this.medida.id,
          medidaNombre: this.medida.nombre,
          precio: this.nuevoPrecio.precio,
          fecha: this.nuevoPrecio.fecha,
          notas: this.nuevoPrecio.notas || '',
          fechaCreacion: new Date().toISOString().split('T')[0]
        };
        
        const docRef = await addDoc(collection(db, 'historialPreciosCrudos'), datosNuevoPrecio);
        
        this.historialPrecios.push({
          id: docRef.id,
          ...datosNuevoPrecio
        });
        
        this.limpiarFormulario();
        this.$emit('actualizado');
        
      } catch (error) {
        console.error("Error al agregar precio: ", error);
        alert('Error al agregar precio: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },

    limpiarFormulario() {
      this.nuevoPrecio = {
        precio: null,
        fecha: this.obtenerFechaActual(),
        notas: ''
      };
      this.mostrarFormulario = false;
    },

    editarPrecio(precio) {
      const nuevoPrecio = prompt('Nuevo precio:', precio.precio);
      if (nuevoPrecio && !isNaN(parseFloat(nuevoPrecio))) {
        this.actualizarPrecio(precio.id, parseFloat(nuevoPrecio));
      }
    },

    async actualizarPrecio(id, nuevoPrecio) {
      try {
        await updateDoc(doc(db, 'historialPreciosCrudos', id), {
          precio: nuevoPrecio
        });
        
        const index = this.historialPrecios.findIndex(p => p.id === id);
        if (index !== -1) {
          this.historialPrecios[index].precio = nuevoPrecio;
        }

        this.$emit('actualizado');
        
      } catch (error) {
        console.error('Error al actualizar precio:', error);
        alert('Error al actualizar precio');
      }
    },

    async eliminarPrecio(precio) {
      if (confirm(`¿Está seguro de eliminar el precio del ${this.formatearFecha(precio.fecha)}?`)) {
        try {
          await deleteDoc(doc(db, 'historialPreciosCrudos', precio.id));
          this.historialPrecios = this.historialPrecios.filter(p => p.id !== precio.id);
          this.$emit('actualizado');
        } catch (error) {
          console.error('Error al eliminar precio:', error);
          alert('Error al eliminar precio');
        }
      }
    },

    formatearFecha(fechaString) {
      if (!fechaString) return '';
      const fecha = new Date(fechaString + 'T00:00:00');
      const opciones = { day: 'numeric', month: 'short', year: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },

    formatearPrecio(precio) {
      return precio ? precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    }
  },

  watch: {
    mostrar(newVal) {
      if (newVal) {
        this.cargarHistorialPrecios();
        this.limpiarFormulario();
      }
    },
    
    mostrarFormulario(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          if (this.$refs.precioInput) {
            this.$refs.precioInput.focus();
          }
        });
      }
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
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2001;
}

.modal-content {
  background-color: white;
  border-radius: 15px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 20px 25px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #3760b0 0%, #2a4a87 100%);
  color: white;
  border-radius: 15px 15px 0 0;
}

.modal-title-info h2 {
  margin: 0 0 5px 0;
  font-size: 1.4em;
  font-weight: 600;
}

.proveedor-badge {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.85em;
  font-weight: 500;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.6em;
  cursor: pointer;
  color: white;
  padding: 5px;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 25px;
}

.producto-resumen {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 25px;
  border-left: 4px solid #3760b0;
}

.precio-actual-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.precio-principal {
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 0.9em;
  color: #7f8c8d;
  margin-bottom: 5px;
}

.precio-valor {
  font-size: 2.2em;
  font-weight: 700;
  color: #3760b0;
  margin-bottom: 3px;
}

.fecha-actual {
  font-size: 0.9em;
  color: #95a5a6;
}

.precio-estadisticas {
  display: flex;
  gap: 20px;
}

.stat-item {
  text-align: center;
}

.stat-numero {
  display: block;
  font-size: 1.1em;
  font-weight: 600;
  color: #2c3e50;
}

.stat-label {
  font-size: 0.75em;
  color: #7f8c8d;
  text-transform: uppercase;
}

.agregar-precio-section {
  background-color: #fff;
  border: 2px solid #f1f2f6;
  border-radius: 10px;
  margin-bottom: 25px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.section-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.1em;
}

.btn-toggle-form {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-toggle-form:hover {
  background-color: #2a4a87;
}

.btn-toggle-form.active {
  background-color: #e74c3c;
}

.precio-form {
  padding: 20px;
  animation: slideDown 0.3s ease-in-out;
}

.form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #34495e;
}

.form-control {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1em;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: #3760b0;
  box-shadow: 0 0 0 3px rgba(55, 96, 176, 0.1);
}

.precio-input {
  text-align: right;
  font-weight: 600;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-guardar {
  background: linear-gradient(135deg, #3760b0, #2a4a87);
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-guardar:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(55, 96, 176, 0.3);
}

.btn-guardar:disabled {
  background: linear-gradient(135deg, #bdc3c7, #95a5a6);
  cursor: not-allowed;
  transform: none;
}

.btn-cancelar {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s;
}

.btn-cancelar:hover {
  background-color: #545b62;
}

.historial-section h3 {
  color: #2c3e50;
  margin-bottom: 20px;
  font-size: 1.2em;
}

.precios-timeline {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.precio-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background-color: #fff;
  border: 2px solid #f1f2f6;
  border-radius: 10px;
  transition: all 0.3s ease;
}

.precio-item:hover {
  border-color: #e9ecef;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.precio-item.precio-actual {
  border-color: #3760b0;
  background: linear-gradient(135deg, #f8f9ff, #f0f4ff);
}

.precio-fecha-badge {
  background-color: #3760b0;
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85em;
  font-weight: 600;
  min-width: 80px;
  text-align: center;
}

.precio-info {
  flex: 1;
}

.precio-monto {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}

.precio-valor {
  font-size: 1.3em;
  font-weight: 700;
  color: #2c3e50;
}

.actual-badge {
  background-color: #28a745;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7em;
  text-transform: uppercase;
  font-weight: 600;
}

.precio-notas {
  font-size: 0.9em;
  color: #6c757d;
}

.precio-actions {
  display: flex;
  gap: 5px;
}

.btn-editar,
.btn-eliminar {
  padding: 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.btn-editar {
  background-color: #ffc107;
  color: #212529;
}

.btn-editar:hover {
  background-color: #e0a800;
}

.btn-eliminar {
  background-color: #f44336;
  color: white;
}

.btn-eliminar:hover {
  background-color: #d32f2f;
}

.no-historial {
  text-align: center;
  padding: 40px 20px;
  color: #6c757d;
}

.no-historial-icon {
  font-size: 3em;
  margin-bottom: 15px;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .precio-actual-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .precio-estadisticas {
    gap: 15px;
    align-self: stretch;
    justify-content: space-around;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .precio-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .precio-actions {
    align-self: flex-end;
  }

  .modal-content {
    width: 95%;
    max-height: 95vh;
  }
}
</style> 