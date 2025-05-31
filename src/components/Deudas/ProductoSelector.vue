<template>
  <div class="producto-selector">
    <!-- Selector de producto existente o nuevo -->
    <div class="input-row">
      <input 
        v-model.number="kilos" 
        type="number" 
        step="0.01"
        placeholder="Kilos" 
        class="input-kilos"
        @input="$emit('update:kilos', kilos)"
      >
      
      <div class="producto-input-container">
        <select 
          v-model="productoSeleccionado" 
          @change="onProductoChange"
          class="producto-select"
        >
          <option value="">Seleccionar producto existente</option>
          <option 
            v-for="producto in productosDisponibles" 
            :key="producto.nombre" 
            :value="producto.nombre"
          >
            {{ producto.nombre }} - ${{ formatearPrecio(producto.precioActual) }}
          </option>
          <option value="__nuevo__">+ Nuevo producto</option>
        </select>
        
        <input 
          v-if="productoSeleccionado === '__nuevo__'"
          v-model="productoManual" 
          type="text" 
          placeholder="Nombre del nuevo producto" 
          class="input-producto-manual producto-nuevo"
          @input="onProductoManualChange"
          ref="inputProductoNuevo"
        >
      </div>
      
      <input 
        v-model.number="precio" 
        type="number" 
        step="0.01"
        placeholder="Precio" 
        class="input-precio"
        @input="$emit('update:precio', precio)"
      >
      
      <span class="total-calculado">
        Total: ${{ calcularTotal() }}
      </span>
      
      <button 
        @click="agregarProducto" 
        class="add-btn"
        :disabled="!puedeAgregar"
      >
        {{ cargandoProductos ? 'Cargando...' : 'Agregar' }}
      </button>
    </div>
    
    <!-- Información del precio histórico -->
    <div v-if="productoSeleccionado && productoSeleccionado !== '__nuevo__'" class="precio-info">
      <div class="precio-historico">
        <span class="label">Último precio:</span>
        <span class="precio-valor">${{ formatearPrecio(precioUltimoRegistrado) }}</span>
        <span class="fecha-precio">({{ formatearFecha(fechaUltimoPrecio) }})</span>
        <button 
          @click="usarPrecioHistorico" 
          class="btn-usar-precio"
          v-if="precio !== precioUltimoRegistrado"
        >
          Usar este precio
        </button>
      </div>
      <div class="stats-producto">
        <span class="total-registros">{{ totalRegistros }} precio(s) registrado(s)</span>
        <span class="precio-promedio">Promedio: ${{ formatearPrecio(precioPromedio) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default {
  name: 'ProductoSelector',
  props: {
    proveedorId: {
      type: String,
      required: true
    },
    kilosValue: {
      type: Number,
      default: null
    },
    productoValue: {
      type: String,
      default: ''
    },
    precioValue: {
      type: Number,
      default: null
    }
  },
  emits: ['update:kilos', 'update:producto', 'update:precio', 'agregar-producto'],
  data() {
    return {
      productosDisponibles: [],
      cargandoProductos: false,
      productoSeleccionado: '',
      productoManual: '',
      kilos: this.kilosValue,
      precio: this.precioValue,
      productoHistorial: null
    };
  },
  computed: {
    puedeAgregar() {
      return this.kilos && this.obtenerNombreProducto() && this.precio && !this.cargandoProductos;
    },
    
    precioUltimoRegistrado() {
      return this.productoHistorial?.precioActual || 0;
    },
    
    fechaUltimoPrecio() {
      return this.productoHistorial?.fechaUltimoPrecio || '';
    },
    
    totalRegistros() {
      return this.productoHistorial?.totalRegistros || 0;
    },
    
    precioPromedio() {
      if (!this.productoHistorial?.precios?.length) return 0;
      const suma = this.productoHistorial.precios.reduce((sum, precio) => sum + precio.precio, 0);
      return suma / this.productoHistorial.precios.length;
    }
  },
  methods: {
    async cargarProductosProveedor() {
      if (!this.proveedorId) {
        this.productosDisponibles = [];
        return;
      }

      try {
        this.cargandoProductos = true;
        console.log('Cargando productos para proveedor:', this.proveedorId);
        
        // Obtener todos los precios del proveedor
        const querySnapshot = await getDocs(
          query(
            collection(db, 'historialPrecios'),
            where('proveedorId', '==', this.proveedorId)
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
        this.productosDisponibles = Array.from(productosMap.values()).map(producto => {
          // Ordenar precios por fecha (más reciente primero)
          const preciosOrdenados = producto.precios.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          const precioMasReciente = preciosOrdenados[0];
          
          return {
            nombre: producto.nombre,
            precioActual: precioMasReciente.precio,
            fechaUltimoPrecio: precioMasReciente.fecha,
            totalRegistros: producto.precios.length,
            precios: preciosOrdenados
          };
        });
        
        // Ordenar productos alfabéticamente
        this.productosDisponibles.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        console.log('Productos procesados:', this.productosDisponibles.length);
        
      } catch (error) {
        console.error("Error al cargar productos: ", error);
      } finally {
        this.cargandoProductos = false;
      }
    },

    onProductoChange() {
      if (this.productoSeleccionado && this.productoSeleccionado !== '__nuevo__') {
        // Buscar el producto seleccionado
        this.productoHistorial = this.productosDisponibles.find(p => p.nombre === this.productoSeleccionado);
        
        if (this.productoHistorial) {
          // Auto-completar el precio con el más reciente
          this.precio = this.productoHistorial.precioActual;
          this.$emit('update:precio', this.precio);
        }
        
        // Limpiar el input manual
        this.productoManual = '';
      } else if (this.productoSeleccionado === '__nuevo__') {
        // Limpiar datos del producto histórico
        this.productoHistorial = null;
        this.precio = null;
        this.$emit('update:precio', null);
        
        // Focus en el input del nuevo producto
        this.$nextTick(() => {
          if (this.$refs.inputProductoNuevo) {
            this.$refs.inputProductoNuevo.focus();
          }
        });
      } else {
        // Limpiar todo si no hay selección
        this.productoHistorial = null;
        this.productoManual = '';
      }
      
      this.$emit('update:producto', this.obtenerNombreProducto());
    },

    onProductoManualChange() {
      // Solo emitir el cambio, ya no necesitamos limpiar la selección
      this.$emit('update:producto', this.productoManual);
    },

    obtenerNombreProducto() {
      if (this.productoSeleccionado && this.productoSeleccionado !== '__nuevo__') {
        return this.productoSeleccionado;
      }
      return this.productoManual;
    },

    usarPrecioHistorico() {
      this.precio = this.precioUltimoRegistrado;
      this.$emit('update:precio', this.precio);
    },

    calcularTotal() {
      if (this.kilos && this.precio) {
        return this.formatearPrecio(this.kilos * this.precio);
      }
      return '0.00';
    },

    agregarProducto() {
      if (!this.puedeAgregar) return;
      
      const producto = {
        kilos: this.kilos,
        producto: this.obtenerNombreProducto(),
        precio: this.precio,
        total: this.kilos * this.precio
      };
      
      this.$emit('agregar-producto', producto);
      this.limpiarFormulario();
    },

    limpiarFormulario() {
      this.kilos = null;
      this.productoSeleccionado = '';
      this.productoManual = '';
      this.precio = null;
      this.productoHistorial = null;
      
      this.$emit('update:kilos', null);
      this.$emit('update:producto', '');
      this.$emit('update:precio', null);
    },

    formatearPrecio(precio) {
      return precio ? precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    },

    formatearFecha(fechaString) {
      if (!fechaString) return '';
      
      const fecha = new Date(fechaString + 'T00:00:00');
      const opciones = { day: 'numeric', month: 'short', year: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    }
  },

  watch: {
    proveedorId(newVal) {
      if (newVal) {
        this.cargarProductosProveedor();
      } else {
        this.productosDisponibles = [];
        this.limpiarFormulario();
      }
    },
    
    kilosValue(newVal) {
      this.kilos = newVal;
    },
    
    productoValue(newVal) {
      if (newVal !== this.obtenerNombreProducto()) {
        this.productoManual = newVal;
        this.productoSeleccionado = '';
      }
    },
    
    precioValue(newVal) {
      this.precio = newVal;
    }
  },

  mounted() {
    if (this.proveedorId) {
      this.cargarProductosProveedor();
    }
  }
};
</script>

<style scoped>
.producto-selector {
  margin-bottom: 20px;
}

.input-row {
  display: grid;
  grid-template-columns: 120px 2fr 120px auto auto;
  gap: 15px;
  align-items: center;
  margin-bottom: 15px;
}

.input-kilos, .input-precio {
  padding: 12px 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1em;
  transition: border-color 0.3s;
}

.input-kilos:focus, .input-precio:focus {
  outline: none;
  border-color: #3498db;
}

.producto-input-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.producto-select {
  padding: 12px 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1em;
  background-color: white;
  transition: border-color 0.3s;
}

.producto-select:focus {
  outline: none;
  border-color: #3498db;
}

.input-producto-manual {
  padding: 12px 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 1em;
  transition: border-color 0.3s;
  animation: slideDown 0.3s ease-in-out;
}

.input-producto-manual:focus {
  outline: none;
  border-color: #3498db;
}

.producto-nuevo {
  border-color: #2ecc71 !important;
  background-color: #f8fff8;
}

.total-calculado {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  padding: 12px 15px;
  border-radius: 8px;
  font-weight: 600;
  color: #2c3e50;
  border: 2px solid transparent;
  min-width: 120px;
  text-align: center;
}

.add-btn {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1em;
  font-weight: 500;
  transition: all 0.3s ease;
  min-width: 100px;
}

.add-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
}

.add-btn:disabled {
  background: linear-gradient(135deg, #bdc3c7, #95a5a6);
  cursor: not-allowed;
  transform: none;
}

.precio-info {
  background: linear-gradient(135deg, #e8f4fd, #d4edfc);
  border-radius: 10px;
  padding: 15px;
  border-left: 4px solid #3498db;
  animation: slideDown 0.3s ease-in-out;
}

.precio-historico {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.label {
  font-weight: 500;
  color: #2c3e50;
}

.precio-valor {
  font-weight: 700;
  font-size: 1.1em;
  color: #27ae60;
}

.fecha-precio {
  color: #7f8c8d;
  font-size: 0.9em;
}

.btn-usar-precio {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s;
}

.btn-usar-precio:hover {
  background-color: #2980b9;
}

.stats-producto {
  display: flex;
  gap: 20px;
  font-size: 0.9em;
  color: #7f8c8d;
}

.total-registros, .precio-promedio {
  display: flex;
  align-items: center;
  gap: 4px;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .input-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .precio-historico {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .stats-producto {
    flex-direction: column;
    gap: 8px;
  }
}
</style> 