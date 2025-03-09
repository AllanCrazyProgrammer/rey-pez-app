<template>
  <div class="formulario-embarque">
    <h3>Editar embarque</h3>
    
    <div class="form-row">
      <div class="form-group col-12" :class="{'col-md-6': clienteActivo, 'col-md-12': !clienteActivo}">
        <label for="fechaEmbarque">Fecha del Embarque:</label>
        <input 
          type="date" 
          id="fechaEmbarque" 
          v-model="fechaLocal" 
          class="form-control"
          :disabled="embarqueBloqueado"
          required
        />
      </div>
      
      <div class="form-group col-12 col-md-6" v-if="clienteActivo">
        <label for="cargaCon">Carga Con:</label>
        <select 
          id="cargaCon" 
          v-model="cargaConLocal" 
          class="form-control"
          :disabled="embarqueBloqueado"
        >
          <option value="">Seleccione con quién carga...</option>
          <option value="Porro">Porro</option>
          <option value="Caminante">Caminante</option>
        </select>
      </div>
    </div>
    
    <!-- Productos en formato de tarjetas -->
    <div class="productos-container">
      <!-- Tarjeta de producto principal para agregar -->
      <ProductoCard 
        :cliente-activo="clienteActivo"
        :disabled="embarqueBloqueado"
        :fecha="fechaLocal"
        @agregar-producto="agregarProducto"
        @error="mostrarError"
      />
      
      <!-- Productos agregados previamente -->
      <ProductoCard 
        v-for="(producto, index) in productosAgregados" 
        :key="'producto-'+index" 
        :producto="producto"
        :solo-lectura="true"
        @eliminar-producto="eliminarProducto(index)"
      />
    </div>
    
    <div class="mensajes-error" v-if="mensajeErrorGeneral">
      <div class="alert alert-danger">{{ mensajeErrorGeneral }}</div>
    </div>
  </div>
</template>

<script>
import ProductoCard from './ProductoCard.vue';

/**
 * @component EmbarqueForm
 * @description Formulario para agregar productos al embarque
 * Permite ingresar información detallada de cada producto y calcular automáticamente
 * los totales basados en los valores ingresados.
 */
export default {
  name: 'EmbarqueForm',
  components: {
    ProductoCard
  },
  props: {
    /**
     * ID del cliente actualmente seleccionado
     * @type {String}
     */
    clienteActivo: {
      type: String,
      default: ''
    },
    /**
     * Indica si el embarque está bloqueado para edición
     * @type {Boolean}
     */
    embarqueBloqueado: {
      type: Boolean,
      default: false
    },
    /**
     * Fecha del embarque
     * @type {String}
     */
    fecha: {
      type: String,
      default: ''
    },
    /**
     * Información de carga
     * @type {String}
     */
    cargaCon: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      // Datos del formulario
      fechaLocal: this.fecha || new Date().toISOString().split('T')[0],
      cargaConLocal: this.cargaCon || '',
      
      // Control de errores
      mensajeErrorGeneral: '',
      
      // Lista de productos agregados
      productosAgregados: []
    };
  },
  methods: {
    /**
     * Agrega un nuevo producto al embarque
     * @param {Object} nuevoProducto - El nuevo producto a agregar
     */
    agregarProducto(nuevoProducto) {
      // Agregar a la lista local de productos
      this.productosAgregados.push(nuevoProducto);
      
      // Emitir evento para el componente padre
      this.$emit('agregar-producto', nuevoProducto);
      this.$emit('actualizar-fecha', this.fechaLocal);
      this.$emit('actualizar-carga-con', this.cargaConLocal);
    },
    
    /**
     * Elimina un producto de la lista
     * @param {Number} index - Índice del producto a eliminar
     */
    eliminarProducto(index) {
      if (confirm('¿Está seguro de eliminar este producto?')) {
        const productoEliminado = this.productosAgregados[index];
        this.productosAgregados.splice(index, 1);
        this.$emit('eliminar-producto', productoEliminado);
      }
    },
    
    /**
     * Muestra un mensaje de error general
     * @param {String} mensaje - El mensaje de error a mostrar
     */
    mostrarError(mensaje) {
      this.mensajeErrorGeneral = mensaje;
      
      // Ocultar el mensaje después de 5 segundos
      setTimeout(() => {
        this.mensajeErrorGeneral = '';
      }, 5000);
    }
  },
  watch: {
    fecha(newVal) {
      if (newVal && typeof newVal === 'string') {
        this.fechaLocal = newVal;
      } else if (newVal instanceof Date) {
        this.fechaLocal = newVal.toISOString().split('T')[0];
      }
    },
    cargaCon(newVal) {
      this.cargaConLocal = newVal || '';
    }
  }
};
</script>

<style scoped>
.formulario-embarque {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 20px;
  margin-bottom: 30px;
}

/* Estilos para la cuadrícula de productos */
.productos-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 20px;
}

.mensajes-error {
  margin-top: 20px;
}

.alert {
  position: relative;
  padding: 0.75rem 1.25rem;
  margin-bottom: 1rem;
  border: 1px solid transparent;
  border-radius: 0.25rem;
}

.alert-danger {
  color: #721c24;
  background-color: #f8d7da;
  border-color: #f5c6cb;
}

/* Estilos adicionales para formularios */
.form-row {
  display: flex;
  flex-wrap: wrap;
  margin-right: -10px;
  margin-left: -10px;
  margin-bottom: 20px;
}

.form-group {
  padding-right: 10px;
  padding-left: 10px;
  margin-bottom: 15px;
}

.col-12 {
  flex: 0 0 100%;
  max-width: 100%;
}

.col-md-6 {
  flex: 0 0 50%;
  max-width: 50%;
}

@media (max-width: 768px) {
  .form-row {
    flex-direction: column;
  }
  
  .col-md-6 {
    flex: 0 0 100%;
    max-width: 100%;
  }
}

.form-control {
  display: block;
  width: 100%;
  padding: 0.375rem 0.75rem;
  font-size: 1rem;
  line-height: 1.5;
  color: #495057;
  background-color: #fff;
  background-clip: padding-box;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  color: #495057;
  background-color: #fff;
  border-color: #80bdff;
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.form-control:disabled {
  background-color: #e9ecef;
  opacity: 1;
}
</style> 