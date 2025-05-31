<template>
  <div v-if="mostrar" class="modal-overlay" @click="cerrarModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Historial de Precios por Proveedor</h2>
        <button @click="$emit('cerrar')" class="close-button">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Selector de proveedor -->
        <div class="proveedor-selector">
          <label for="proveedorSelect">Seleccionar Proveedor:</label>
          <select id="proveedorSelect" v-model="proveedorSeleccionado" @change="cargarPreciosProveedor">
            <option value="">Seleccione un proveedor</option>
            <option v-for="proveedor in proveedores" :key="proveedor.id" :value="proveedor.id">
              {{ proveedor.nombre }}
            </option>
          </select>
        </div>

        <!-- Formulario para agregar nuevo precio -->
        <div v-if="proveedorSeleccionado" class="agregar-precio-form">
          <h3>Agregar Nuevo Precio</h3>
          <form @submit.prevent="agregarPrecio">
            <div class="form-row">
              <div class="form-group">
                <label for="producto">Producto:</label>
                <input 
                  v-model="nuevoPrecio.producto" 
                  id="producto" 
                  type="text" 
                  placeholder="Nombre del producto" 
                  required
                >
              </div>
              <div class="form-group">
                <label for="precio">Precio:</label>
                <input 
                  v-model.number="nuevoPrecio.precio" 
                  id="precio" 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  required
                >
              </div>
              <div class="form-group">
                <label for="fecha">Fecha:</label>
                <input 
                  v-model="nuevoPrecio.fecha" 
                  id="fecha" 
                  type="date" 
                  required
                >
              </div>
            </div>
            <div class="form-group">
              <label for="notas">Notas (opcional):</label>
              <input 
                v-model="nuevoPrecio.notas" 
                id="notas" 
                type="text" 
                placeholder="Notas adicionales"
              >
            </div>
            <button type="submit" class="btn-agregar" :disabled="guardando">
              {{ guardando ? 'Guardando...' : 'Agregar Precio' }}
            </button>
          </form>
        </div>

        <!-- Historial de precios -->
        <div v-if="proveedorSeleccionado && preciosHistorial.length > 0" class="historial-container">
          <h3>Historial de Precios - {{ getNombreProveedor() }}</h3>
          <div class="tabla-container">
            <table class="tabla-precios">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Notas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="precio in preciosOrdenados" :key="precio.id">
                  <td>
                    <span v-if="precio.editando !== 'fecha'" @click="habilitarEdicion(precio, 'fecha')">
                      {{ formatearFecha(precio.fecha) }}
                    </span>
                    <input 
                      v-else 
                      v-model="precio.fecha" 
                      type="date" 
                      @blur="guardarEdicion(precio)" 
                      @keyup.enter="guardarEdicion(precio)"
                      class="input-edicion"
                    >
                  </td>
                  <td>
                    <span v-if="precio.editando !== 'producto'" @click="habilitarEdicion(precio, 'producto')">
                      {{ precio.producto }}
                    </span>
                    <input 
                      v-else 
                      v-model="precio.producto" 
                      type="text" 
                      @blur="guardarEdicion(precio)" 
                      @keyup.enter="guardarEdicion(precio)"
                      class="input-edicion"
                    >
                  </td>
                  <td>
                    <span v-if="precio.editando !== 'precio'" @click="habilitarEdicion(precio, 'precio')">
                      ${{ formatearPrecio(precio.precio) }}
                    </span>
                    <input 
                      v-else 
                      v-model.number="precio.precio" 
                      type="number" 
                      step="0.01" 
                      @blur="guardarEdicion(precio)" 
                      @keyup.enter="guardarEdicion(precio)"
                      class="input-edicion"
                    >
                  </td>
                  <td>
                    <span v-if="precio.editando !== 'notas'" @click="habilitarEdicion(precio, 'notas')">
                      {{ precio.notas || '-' }}
                    </span>
                    <input 
                      v-else 
                      v-model="precio.notas" 
                      type="text" 
                      @blur="guardarEdicion(precio)" 
                      @keyup.enter="guardarEdicion(precio)"
                      class="input-edicion"
                    >
                  </td>
                  <td>
                    <button @click="eliminarPrecio(precio)" class="btn-eliminar">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-else-if="proveedorSeleccionado && preciosHistorial.length === 0" class="no-precios">
          <p>No hay precios registrados para este proveedor.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';

export default {
  name: 'HistorialPreciosModal',
  props: {
    mostrar: {
      type: Boolean,
      required: true
    },
    proveedores: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      proveedorSeleccionado: '',
      preciosHistorial: [],
      guardando: false,
      nuevoPrecio: {
        producto: '',
        precio: null,
        fecha: this.obtenerFechaActual(),
        notas: ''
      }
    };
  },
  computed: {
    preciosOrdenados() {
      return [...this.preciosHistorial].sort((a, b) => {
        // Ordenar por fecha descendente (más reciente primero)
        const fechaA = new Date(a.fecha);
        const fechaB = new Date(b.fecha);
        return fechaB - fechaA;
      });
    }
  },
  methods: {
    obtenerFechaActual() {
      const fecha = new Date();
      return fecha.toISOString().split('T')[0];
    },
    
    cerrarModal(event) {
      if (event.target === event.currentTarget) {
        this.$emit('cerrar');
      }
    },

    getNombreProveedor() {
      const proveedor = this.proveedores.find(p => p.id === this.proveedorSeleccionado);
      return proveedor ? proveedor.nombre : '';
    },

    async cargarPreciosProveedor() {
      if (!this.proveedorSeleccionado) {
        this.preciosHistorial = [];
        return;
      }

      try {
        console.log('Cargando precios para proveedor:', this.proveedorSeleccionado);
        
        let querySnapshot;
        
        try {
          // Intentar primero con orderBy (requiere índice)
          querySnapshot = await getDocs(
            query(
              collection(db, 'historialPrecios'),
              where('proveedorId', '==', this.proveedorSeleccionado),
              orderBy('fecha', 'desc')
            )
          );
          console.log('Consulta con orderBy exitosa');
        } catch (indexError) {
          console.log('Error con orderBy, usando consulta simple:', indexError.message);
          // Si falla, usar consulta simple sin orderBy
          querySnapshot = await getDocs(
            query(
              collection(db, 'historialPrecios'),
              where('proveedorId', '==', this.proveedorSeleccionado)
            )
          );
        }
        
        console.log('Documentos encontrados:', querySnapshot.docs.length);
        
        this.preciosHistorial = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Documento:', { id: doc.id, ...data });
          return {
            id: doc.id,
            ...data,
            editando: null
          };
        });
        
        // Ordenar manualmente en el frontend si no se usó orderBy
        this.preciosHistorial.sort((a, b) => {
          const fechaA = new Date(a.fecha);
          const fechaB = new Date(b.fecha);
          return fechaB - fechaA;
        });
        
      } catch (error) {
        console.error("Error completo al cargar precios: ", error);
        console.error("Código de error:", error.code);
        console.error("Mensaje de error:", error.message);
        alert('Error al cargar el historial de precios: ' + error.message);
      }
    },

    async agregarPrecio() {
      if (!this.nuevoPrecio.producto || !this.nuevoPrecio.precio || !this.nuevoPrecio.fecha) {
        alert('Por favor complete todos los campos obligatorios');
        return;
      }

      try {
        this.guardando = true;
        
        const datosAGuardar = {
          proveedorId: this.proveedorSeleccionado,
          proveedorNombre: this.getNombreProveedor(),
          producto: this.nuevoPrecio.producto,
          precio: this.nuevoPrecio.precio,
          fecha: this.nuevoPrecio.fecha,
          notas: this.nuevoPrecio.notas || '',
          fechaCreacion: new Date()
        };
        
        console.log('Guardando precio:', datosAGuardar);
        
        const docRef = await addDoc(collection(db, 'historialPrecios'), datosAGuardar);
        console.log('Precio guardado con ID:', docRef.id);

        // Limpiar formulario
        this.nuevoPrecio = {
          producto: '',
          precio: null,
          fecha: this.obtenerFechaActual(),
          notas: ''
        };

        // Recargar precios
        console.log('Recargando precios...');
        await this.cargarPreciosProveedor();
        
        console.log('Precios después de recargar:', this.preciosHistorial.length);
        alert('Precio agregado correctamente');
      } catch (error) {
        console.error("Error al agregar precio: ", error);
        console.error("Código de error:", error.code);
        console.error("Mensaje de error:", error.message);
        alert('Error al agregar precio: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },

    habilitarEdicion(precio, campo) {
      // Cancelar edición anterior si existe
      this.preciosHistorial.forEach(p => p.editando = null);
      
      // Habilitar edición del campo actual
      precio.editando = campo;
      
      this.$nextTick(() => {
        // Buscar el input y hacer focus
        const input = document.querySelector('.input-edicion');
        if (input) {
          input.focus();
        }
      });
    },

    async guardarEdicion(precio) {
      if (!precio.editando) return;
      
      try {
        await updateDoc(doc(db, 'historialPrecios', precio.id), {
          producto: precio.producto,
          precio: precio.precio,
          fecha: precio.fecha,
          notas: precio.notas || ''
        });
        
        precio.editando = null;
      } catch (error) {
        console.error("Error al actualizar precio: ", error);
        alert('Error al actualizar precio: ' + error.message);
      }
    },

    async eliminarPrecio(precio) {
      if (!confirm(`¿Está seguro de eliminar el precio de ${precio.producto}?`)) {
        return;
      }

      try {
        await deleteDoc(doc(db, 'historialPrecios', precio.id));
        
        // Remover de la lista local
        this.preciosHistorial = this.preciosHistorial.filter(p => p.id !== precio.id);
        
        alert('Precio eliminado correctamente');
      } catch (error) {
        console.error("Error al eliminar precio: ", error);
        alert('Error al eliminar precio: ' + error.message);
      }
    },

    formatearFecha(fechaString) {
      if (!fechaString) return '';
      
      const fecha = new Date(fechaString + 'T00:00:00');
      const opciones = { year: 'numeric', month: 'short', day: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },

    formatearPrecio(precio) {
      return precio ? precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    }
  },

  watch: {
    mostrar(newVal) {
      if (newVal) {
        // Resetear al abrir el modal
        this.proveedorSeleccionado = '';
        this.preciosHistorial = [];
        this.nuevoPrecio.fecha = this.obtenerFechaActual();
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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f8f9fa;
  border-radius: 10px 10px 0 0;
}

.modal-header h2 {
  margin: 0;
  color: #2c3e50;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #7f8c8d;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #e74c3c;
}

.modal-body {
  padding: 20px;
}

.proveedor-selector {
  margin-bottom: 25px;
}

.proveedor-selector label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #34495e;
}

.proveedor-selector select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1em;
}

.agregar-precio-form {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 25px;
}

.agregar-precio-form h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
}

.form-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 5px;
  font-weight: 500;
  color: #34495e;
}

.form-group input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1em;
}

.btn-agregar {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s;
}

.btn-agregar:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-agregar:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.historial-container h3 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.tabla-container {
  overflow-x: auto;
}

.tabla-precios {
  width: 100%;
  border-collapse: collapse;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  border-radius: 5px;
  overflow: hidden;
}

.tabla-precios th {
  background-color: #3498db;
  color: white;
  padding: 12px 15px;
  text-align: left;
  font-weight: 500;
}

.tabla-precios td {
  padding: 12px 15px;
  border-bottom: 1px solid #eee;
}

.tabla-precios tbody tr:hover {
  background-color: #f8f9fa;
}

.tabla-precios tbody tr:last-child td {
  border-bottom: none;
}

.tabla-precios td span {
  cursor: pointer;
  padding: 3px;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.tabla-precios td span:hover {
  background-color: #e8f4fd;
}

.input-edicion {
  width: 100%;
  padding: 5px;
  border: 1px solid #3498db;
  border-radius: 3px;
  font-size: 0.9em;
}

.btn-eliminar {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 5px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8em;
  transition: background-color 0.3s;
}

.btn-eliminar:hover {
  background-color: #c0392b;
}

.no-precios {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 10px;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .tabla-precios {
    font-size: 0.9em;
  }
  
  .tabla-precios th,
  .tabla-precios td {
    padding: 8px 10px;
  }
}

@media (max-width: 480px) {
  .modal-header {
    padding: 10px 15px;
  }
  
  .modal-header h2 {
    font-size: 1.2em;
  }
  
  .modal-body {
    padding: 15px;
  }
}
</style> 