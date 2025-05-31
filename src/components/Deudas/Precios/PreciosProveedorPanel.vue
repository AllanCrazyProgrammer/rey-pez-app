<template>
  <div v-if="mostrar" class="modal-overlay" @click="cerrarModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Precios por Proveedor</h2>
        <button @click="$emit('cerrar')" class="close-button">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Selector de proveedor -->
        <div class="proveedor-selector">
          <label for="proveedorSelect">Seleccionar Proveedor:</label>
          <select id="proveedorSelect" v-model="proveedorSeleccionado" @change="cargarProductosProveedor">
            <option value="">Seleccione un proveedor</option>
            <option v-for="proveedor in proveedores" :key="proveedor.id" :value="proveedor.id">
              {{ proveedor.nombre }}
            </option>
          </select>
        </div>

        <!-- Lista de productos con precios -->
        <div v-if="proveedorSeleccionado" class="productos-container">
          <div class="productos-header">
            <h3>Productos - {{ getNombreProveedor() }}</h3>
            <button @click="mostrarFormularioNuevo = !mostrarFormularioNuevo" class="btn-agregar-producto">
              <i class="fas fa-plus"></i> Nuevo Producto
            </button>
          </div>

          <!-- Formulario para nuevo producto -->
          <div v-if="mostrarFormularioNuevo" class="nuevo-producto-form">
            <div class="form-row">
              <input 
                v-model="nuevoProducto.nombre" 
                placeholder="Nombre del producto" 
                class="form-input"
                required
              >
              <input 
                v-model.number="nuevoProducto.precio" 
                type="number" 
                step="0.01" 
                placeholder="Precio actual" 
                class="form-input precio-input"
                required
              >
              <button @click="agregarNuevoProducto" class="btn-guardar-producto" :disabled="guardando">
                {{ guardando ? 'Guardando...' : 'Guardar' }}
              </button>
              <button @click="cancelarNuevoProducto" class="btn-cancelar-producto">
                Cancelar
              </button>
            </div>
          </div>

          <!-- Grid de productos -->
          <div v-if="productosConPrecios.length > 0" class="productos-grid">
            <div 
              v-for="producto in productosConPrecios" 
              :key="producto.nombre"
              class="producto-card"
              @click="abrirHistorialProducto(producto)"
            >
              <div class="producto-info">
                <h4 class="producto-nombre">{{ producto.nombre }}</h4>
                <div class="precio-actual">
                  <span class="precio-valor">${{ formatearPrecio(producto.precioActual) }}</span>
                  <span class="precio-fecha">{{ formatearFecha(producto.fechaUltimoPrecio) }}</span>
                </div>
                <div class="precio-estadisticas">
                  <span class="total-registros">{{ producto.totalRegistros }} precio(s)</span>
                  <i class="fas fa-chart-line precio-icono"></i>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="!cargandoProductos" class="no-productos">
            <p>No hay productos registrados para este proveedor.</p>
            <p class="sugerencia">Haz click en "Nuevo Producto" para agregar el primer producto.</p>
          </div>

          <div v-if="cargandoProductos" class="loading-productos">
            <div class="spinner-small"></div>
            <p>Cargando productos...</p>
          </div>
        </div>

        <!-- Modal de historial de producto específico -->
        <HistorialProductoModal 
          :mostrar="showHistorialProducto" 
          :producto="productoSeleccionado"
          :proveedor-id="proveedorSeleccionado"
          :proveedor-nombre="getNombreProveedor()"
          @cerrar="showHistorialProducto = false"
          @actualizado="cargarProductosProveedor"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import HistorialProductoModal from './HistorialProductoModal.vue';

export default {
  name: 'PreciosProveedorPanel',
  components: {
    HistorialProductoModal
  },
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
      productosConPrecios: [],
      cargandoProductos: false,
      guardando: false,
      mostrarFormularioNuevo: false,
      showHistorialProducto: false,
      productoSeleccionado: null,
      nuevoProducto: {
        nombre: '',
        precio: null
      }
    };
  },
  methods: {
    cerrarModal(event) {
      if (event.target === event.currentTarget) {
        this.$emit('cerrar');
      }
    },

    getNombreProveedor() {
      const proveedor = this.proveedores.find(p => p.id === this.proveedorSeleccionado);
      return proveedor ? proveedor.nombre : '';
    },

    async cargarProductosProveedor() {
      if (!this.proveedorSeleccionado) {
        this.productosConPrecios = [];
        return;
      }

      try {
        this.cargandoProductos = true;
        console.log('Cargando productos para proveedor:', this.proveedorSeleccionado);
        
        // Obtener todos los precios del proveedor
        const querySnapshot = await getDocs(
          query(
            collection(db, 'historialPrecios'),
            where('proveedorId', '==', this.proveedorSeleccionado)
          )
        );
        
        const precios = querySnapshot.docs.map(doc => doc.data());
        console.log('Precios encontrados:', precios.length);
        
        // Agrupar por producto y obtener el precio más reciente
        const productosMap = new Map();
        
        precios.forEach(precio => {
          const nombreProducto = precio.producto;
          if (!productosMap.has(nombreProducto)) {
            productosMap.set(nombreProducto, {
              nombre: nombreProducto,
              precios: []
            });
          }
          productosMap.get(nombreProducto).precios.push(precio);
        });
        
        // Procesar cada producto para obtener precio actual y estadísticas
        this.productosConPrecios = Array.from(productosMap.values()).map(producto => {
          // Ordenar precios por fecha (más reciente primero)
          const preciosOrdenados = producto.precios.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          const precioMasReciente = preciosOrdenados[0];
          
          return {
            nombre: producto.nombre,
            precioActual: precioMasReciente.precio,
            fechaUltimoPrecio: precioMasReciente.fecha,
            totalRegistros: producto.precios.length,
            precios: preciosOrdenados // Para usar en el modal de historial
          };
        });
        
        // Ordenar productos alfabéticamente
        this.productosConPrecios.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        console.log('Productos procesados:', this.productosConPrecios.length);
        
      } catch (error) {
        console.error("Error al cargar productos: ", error);
        alert('Error al cargar productos: ' + error.message);
      } finally {
        this.cargandoProductos = false;
      }
    },

    async agregarNuevoProducto() {
      if (!this.nuevoProducto.nombre || !this.nuevoProducto.precio) {
        alert('Por favor complete el nombre del producto y el precio');
        return;
      }

      try {
        this.guardando = true;
        
        const datosProducto = {
          proveedorId: this.proveedorSeleccionado,
          proveedorNombre: this.getNombreProveedor(),
          producto: this.nuevoProducto.nombre,
          precio: this.nuevoProducto.precio,
          fecha: this.obtenerFechaActual(),
          notas: 'Precio inicial del producto',
          fechaCreacion: new Date()
        };
        
        console.log('Guardando nuevo producto:', datosProducto);
        
        await addDoc(collection(db, 'historialPrecios'), datosProducto);
        
        // Limpiar formulario
        this.nuevoProducto = { nombre: '', precio: null };
        this.mostrarFormularioNuevo = false;
        
        // Recargar productos
        await this.cargarProductosProveedor();
        
        alert('Producto agregado correctamente');
        
      } catch (error) {
        console.error("Error al agregar producto: ", error);
        alert('Error al agregar producto: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },

    cancelarNuevoProducto() {
      this.nuevoProducto = { nombre: '', precio: null };
      this.mostrarFormularioNuevo = false;
    },

    abrirHistorialProducto(producto) {
      this.productoSeleccionado = producto;
      this.showHistorialProducto = true;
    },

    obtenerFechaActual() {
      const fecha = new Date();
      return fecha.toISOString().split('T')[0];
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
        // Resetear al abrir el modal
        this.proveedorSeleccionado = '';
        this.productosConPrecios = [];
        this.mostrarFormularioNuevo = false;
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
  border-radius: 12px;
  width: 90%;
  max-width: 1000px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 20px 25px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5em;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.8em;
  cursor: pointer;
  color: white;
  padding: 0;
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

.proveedor-selector {
  margin-bottom: 30px;
}

.proveedor-selector label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #34495e;
  font-size: 1.1em;
}

.proveedor-selector select {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1em;
  transition: border-color 0.3s;
}

.proveedor-selector select:focus {
  outline: none;
  border-color: #667eea;
}

.productos-container {
  animation: fadeIn 0.3s ease-in;
}

.productos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f8f9fa;
}

.productos-header h3 {
  color: #2c3e50;
  margin: 0;
  font-size: 1.4em;
}

.btn-agregar-producto {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95em;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-agregar-producto:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
}

.nuevo-producto-form {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 25px;
  border-left: 4px solid #2ecc71;
}

.form-row {
  display: grid;
  grid-template-columns: 2fr 1fr auto auto;
  gap: 15px;
  align-items: center;
}

.form-input {
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1em;
  transition: border-color 0.3s;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
}

.precio-input {
  text-align: right;
}

.btn-guardar-producto {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95em;
  transition: background-color 0.3s;
}

.btn-guardar-producto:hover:not(:disabled) {
  background-color: #2980b9;
}

.btn-guardar-producto:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

.btn-cancelar-producto {
  background-color: #95a5a6;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95em;
  transition: background-color 0.3s;
}

.btn-cancelar-producto:hover {
  background-color: #7f8c8d;
}

.productos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.producto-card {
  background: white;
  border: 2px solid #f1f2f6;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.producto-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.producto-card:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
}

.producto-card:hover::before {
  transform: scaleX(1);
}

.producto-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.producto-nombre {
  color: #2c3e50;
  margin: 0;
  font-size: 1.2em;
  font-weight: 600;
}

.precio-actual {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.precio-valor {
  font-size: 1.8em;
  font-weight: 700;
  color: #27ae60;
}

.precio-fecha {
  font-size: 0.9em;
  color: #7f8c8d;
}

.precio-estadisticas {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f1f2f6;
}

.total-registros {
  font-size: 0.9em;
  color: #95a5a6;
}

.precio-icono {
  color: #667eea;
  font-size: 1.2em;
}

.no-productos {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
}

.no-productos p {
  margin: 10px 0;
}

.sugerencia {
  font-size: 0.9em;
  font-style: italic;
}

.loading-productos {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: #7f8c8d;
}

.spinner-small {
  border: 3px solid rgba(0, 0, 0, 0.1);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border-left-color: #667eea;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
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
  
  .productos-grid {
    grid-template-columns: 1fr;
  }
  
  .productos-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
}
</style> 