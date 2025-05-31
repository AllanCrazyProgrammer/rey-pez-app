<template>
  <div v-if="mostrar" class="modal-overlay" @click="cerrarModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <div class="modal-title-info">
          <h2>{{ producto?.nombre || 'Producto' }}</h2>
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
              <span class="precio-valor">${{ formatearPrecio(producto?.precioActual) }}</span>
              <span class="fecha-actual">{{ formatearFecha(producto?.fechaUltimoPrecio) }}</span>
            </div>
            <div class="precio-estadisticas">
              <div class="stat-item">
                <span class="stat-numero">{{ producto?.totalRegistros || 0 }}</span>
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
              <i class="fas" :class="mostrarFormulario ? 'fa-minus' : 'fa-plus'"></i>
            </button>
          </div>
          
          <div v-if="mostrarFormulario" class="precio-form">
            <div class="form-grid">
              <div class="form-group">
                <label for="nuevoPrecio">Nuevo Precio:</label>
                <input 
                  id="nuevoPrecio"
                  v-model.number="nuevoPrecio.precio" 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  class="form-control precio-input"
                  ref="precioInput"
                  @keyup.enter="agregarPrecio"
                  required
                >
              </div>
              <div class="form-group">
                <label for="fechaPrecio">Fecha:</label>
                <input 
                  id="fechaPrecio"
                  v-model="nuevoPrecio.fecha" 
                  type="date" 
                  class="form-control"
                  required
                >
              </div>
            </div>
            <div class="form-group">
              <label for="notasPrecio">Notas (opcional):</label>
              <input 
                id="notasPrecio"
                v-model="nuevoPrecio.notas" 
                type="text" 
                placeholder="Ej: Nuevo proveedor, Oferta especial, etc."
                class="form-control"
              >
            </div>
            <div class="form-actions">
              <button @click="agregarPrecio" class="btn-guardar" :disabled="guardando">
                <i class="fas fa-save"></i>
                {{ guardando ? 'Guardando...' : 'Guardar Precio' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Historial de precios -->
        <div class="historial-section">
          <h3>Historial de Precios</h3>
          
          <div v-if="producto?.precios?.length > 0" class="precios-timeline">
            <div 
              v-for="(precio, index) in preciosOrdenados" 
              :key="index"
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
                  <span v-if="index > 0" class="cambio-precio" :class="getCambioPrecioClass(precio, preciosOrdenados[index - 1])">
                    {{ getCambioPrecioTexto(precio, preciosOrdenados[index - 1]) }}
                  </span>
                </div>
                <div v-if="precio.notas" class="precio-notas">
                  <i class="fas fa-sticky-note"></i>
                  {{ precio.notas }}
                </div>
              </div>
              <div class="precio-actions">
                <button @click="editarPrecio(precio, index)" class="btn-editar" title="Editar precio">
                  <i class="fas fa-edit"></i>
                </button>
                <button v-if="index > 0" @click="eliminarPrecio(precio, index)" class="btn-eliminar" title="Eliminar precio">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
          
          <div v-else class="no-historial">
            <i class="fas fa-chart-line"></i>
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
  name: 'HistorialProductoModal',
  props: {
    mostrar: {
      type: Boolean,
      required: true
    },
    producto: {
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
  data() {
    return {
      mostrarFormulario: false,
      guardando: false,
      nuevoPrecio: {
        precio: null,
        fecha: this.obtenerFechaActual(),
        notas: ''
      }
    };
  },
  computed: {
    preciosOrdenados() {
      if (!this.producto?.precios) return [];
      return [...this.producto.precios].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    },
    
    precioPromedio() {
      if (!this.producto?.precios?.length) return 0;
      const suma = this.producto.precios.reduce((sum, precio) => sum + precio.precio, 0);
      return suma / this.producto.precios.length;
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

    async agregarPrecio() {
      if (!this.nuevoPrecio.precio || !this.nuevoPrecio.fecha) {
        alert('Por favor complete el precio y la fecha');
        return;
      }

      try {
        this.guardando = true;
        
        const datosNuevoPrecio = {
          proveedorId: this.proveedorId,
          proveedorNombre: this.proveedorNombre,
          producto: this.producto.nombre,
          precio: this.nuevoPrecio.precio,
          fecha: this.nuevoPrecio.fecha,
          notas: this.nuevoPrecio.notas || '',
          fechaCreacion: new Date()
        };
        
        console.log('Guardando nuevo precio:', datosNuevoPrecio);
        
        await addDoc(collection(db, 'historialPrecios'), datosNuevoPrecio);
        
        // Limpiar formulario
        this.nuevoPrecio = {
          precio: null,
          fecha: this.obtenerFechaActual(),
          notas: ''
        };
        this.mostrarFormulario = false;
        
        // Emitir evento para que el componente padre actualice los datos
        this.$emit('actualizado');
        
        alert('Precio agregado correctamente');
        
      } catch (error) {
        console.error("Error al agregar precio: ", error);
        alert('Error al agregar precio: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },

    editarPrecio(precio, index) {
      // Implementar edición inline o modal
      const nuevoPrecio = prompt('Nuevo precio:', precio.precio);
      if (nuevoPrecio && !isNaN(parseFloat(nuevoPrecio))) {
        // Aquí implementarías la lógica de actualización
        console.log('Editar precio:', precio, 'Nuevo valor:', nuevoPrecio);
      }
    },

    eliminarPrecio(precio, index) {
      if (confirm(`¿Está seguro de eliminar el precio del ${this.formatearFecha(precio.fecha)}?`)) {
        // Aquí implementarías la lógica de eliminación
        console.log('Eliminar precio:', precio);
      }
    },

    getCambioPrecioClass(precioActual, precioAnterior) {
      if (!precioAnterior) return '';
      const diferencia = precioActual.precio - precioAnterior.precio;
      return diferencia > 0 ? 'aumento' : diferencia < 0 ? 'disminucion' : 'igual';
    },

    getCambioPrecioTexto(precioActual, precioAnterior) {
      if (!precioAnterior) return '';
      const diferencia = precioActual.precio - precioAnterior.precio;
      if (diferencia === 0) return '';
      const porcentaje = ((diferencia / precioAnterior.precio) * 100).toFixed(1);
      const simbolo = diferencia > 0 ? '+' : '';
      return `${simbolo}${porcentaje}%`;
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
        // Resetear formulario al abrir
        this.mostrarFormulario = false;
        this.nuevoPrecio = {
          precio: null,
          fecha: this.obtenerFechaActual(),
          notas: ''
        };
        
        // Focus en el input de precio si se abre el formulario
        this.$nextTick(() => {
          if (this.mostrarFormulario && this.$refs.precioInput) {
            this.$refs.precioInput.focus();
          }
        });
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
  z-index: 1001;
}

.modal-content {
  background-color: white;
  border-radius: 15px;
  width: 90%;
  max-width: 700px;
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
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
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
  border-left: 4px solid #4CAF50;
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
  color: #4CAF50;
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
  font-size: 1.3em;
  font-weight: 600;
  color: #2c3e50;
}

.stat-label {
  font-size: 0.8em;
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
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-toggle-form:hover {
  background-color: #2980b9;
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
}

.form-control:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.precio-input {
  text-align: right;
  font-weight: 600;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-guardar {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-guardar:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
}

.btn-guardar:disabled {
  background: linear-gradient(135deg, #bdc3c7, #95a5a6);
  cursor: not-allowed;
  transform: none;
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
  border-color: #4CAF50;
  background: linear-gradient(135deg, #f8fff8, #f0f8f0);
}

.precio-fecha-badge {
  background-color: #3498db;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.85em;
  font-weight: 500;
  min-width: 80px;
  text-align: center;
}

.precio-actual .precio-fecha-badge {
  background-color: #4CAF50;
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

.precio-monto .precio-valor {
  font-size: 1.3em;
  font-weight: 600;
  color: #2c3e50;
}

.actual-badge {
  background-color: #4CAF50;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7em;
  font-weight: 500;
  text-transform: uppercase;
}

.cambio-precio {
  font-size: 0.8em;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
}

.cambio-precio.aumento {
  background-color: #e8f5e8;
  color: #27ae60;
}

.cambio-precio.disminucion {
  background-color: #ffeaa7;
  color: #e17055;
}

.precio-notas {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #7f8c8d;
  font-size: 0.9em;
  font-style: italic;
}

.precio-actions {
  display: flex;
  gap: 8px;
}

.btn-editar, .btn-eliminar {
  background: none;
  border: 1px solid #ddd;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9em;
}

.btn-editar {
  color: #3498db;
  border-color: #3498db;
}

.btn-editar:hover {
  background-color: #3498db;
  color: white;
}

.btn-eliminar {
  color: #e74c3c;
  border-color: #e74c3c;
}

.btn-eliminar:hover {
  background-color: #e74c3c;
  color: white;
}

.no-historial {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
}

.no-historial i {
  font-size: 2em;
  margin-bottom: 10px;
  opacity: 0.5;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .precio-actual-section {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .precio-estadisticas {
    justify-content: center;
  }
  
  .precio-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .precio-actions {
    align-self: flex-end;
  }
}
</style> 