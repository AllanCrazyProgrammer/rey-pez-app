<template>
  <div class="formulario-embarque">
    <h3 class="titulo-embarque">Editar embarque</h3>
    
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
    
    <div class="productos-container">
      <!-- Acciones de productos - Todos en una sola fila -->
      <div class="acciones-productos" v-if="!embarqueBloqueado && !productoEditando">
        <div class="acciones-agregar">
          <button 
            @click="crearNuevoProductoLimpio" 
            class="btn btn-success btn-agregar"
            :disabled="productoEditando !== null"
          >
            <i class="fas fa-plus-circle"></i> Agregar Producto Limpio
          </button>
          <button 
            @click="crearNuevoProductoCrudo" 
            class="btn btn-warning btn-agregar"
            :disabled="productoEditando !== null"
          >
            <i class="fas fa-plus-circle"></i> Agregar Producto Crudo
          </button>
        </div>
      </div>
      
      <!-- Botón para cancelar edición -->
      <div v-if="productoEditando" class="producto-edicion-acciones">
        <button @click="cancelarEdicion" class="btn btn-secondary">
          <i class="fas fa-times"></i> Cancelar Edición
        </button>
      </div>
      
      <!-- Listado unificado de productos -->
      <div v-if="tieneProductos || productoNuevoTemporal" class="cliente-productos-section">
        <div class="cliente-productos-header">
          <h4 class="cliente-productos-titulo">
            Productos de {{ obtenerNombreCliente() }}
          </h4>
          <div class="cliente-productos-contador">
            <span v-if="productosLimpios.length > 0" class="badge badge-primary mr-2">{{ productosLimpios.length }} limpios</span>
            <span v-if="productosCrudos.length > 0" class="badge badge-danger">{{ productosCrudos.length }} crudos</span>
          </div>
        </div>
        
        <div class="productos-grid">
          <!-- Producto temporal que se está creando -->
          <ProductoCard 
            v-if="productoNuevoTemporal && productoNuevoTemporal.tipo && productoNuevoTemporal.tipo.toLowerCase() !== 'crudo'"
            :key="'nuevo-producto-limpio'"
            :producto="productoNuevoTemporal"
            :solo-lectura="false"
            :modo-edicion="true"
            :cliente-activo="clienteActivo"
            :disabled="embarqueBloqueado"
            :fecha="fechaLocal"
            @guardar-producto="guardarProductoNuevo"
            @cancelar-edicion="cancelarEdicion"
            @error="mostrarError"
            class="producto-card producto-nuevo"
          />
          
          <!-- Si es un nuevo producto crudo -->
          <CrudosCard 
            v-if="productoNuevoTemporal && productoNuevoTemporal.tipo && productoNuevoTemporal.tipo.toLowerCase() === 'crudo'"
            :key="'nuevo-producto-crudo'"
            :cliente-activo="clienteActivo"
            :disabled="embarqueBloqueado"
            :fecha="fechaLocal"
            :productos-crudos="[productoNuevoTemporal]"
            :modo-edicion="true"
            :producto-editando="productoNuevoTemporal"
            @agregar-crudo="guardarProductoNuevoCrudo"
            @cancelar-edicion="cancelarEdicion"
            @error="mostrarError"
            class="producto-card producto-crudo producto-nuevo"
          />
          
          <!-- Producto en edición -->
          <ProductoCard 
            v-if="productoEditando && productoEditando.tipo && productoEditando.tipo.toLowerCase() !== 'crudo'"
            :key="'editar-' + productoEditando.id"
            :producto="productoEditando"
            :solo-lectura="false"
            :modo-edicion="true"
            :cliente-activo="clienteActivo"
            :disabled="embarqueBloqueado"
            :fecha="fechaLocal"
            @guardar-producto="actualizarProducto"
            @actualizar-producto="actualizarProducto"
            @cancelar-edicion="cancelarEdicion"
            @error="mostrarError"
            class="producto-card"
          />
          
          <!-- Primero mostrar todos los productos limpios (excepto el que se está editando) -->
          <ProductoCard 
            v-for="(producto, index) in productosLimpiosFiltrados" 
            :key="generarIdUnico(producto, index, 'limpio')" 
            :producto="producto"
            :solo-lectura="true"
            :embarqueId="embarqueId"
            @eliminar-producto="eliminarProducto(producto)"
            @editar-producto="iniciarEdicionProducto(producto)"
            @actualizar-producto="actualizarProducto"
            class="producto-card"
          />
          
          <!-- Después mostrar un único CrudosCard con todos los productos crudos -->
          <CrudosCard 
            v-if="productosCrudos.length > 0 && !esCrudoEnEdicion"
            :key="'crudos-card'"
            :cliente-activo="clienteActivo"
            :disabled="embarqueBloqueado"
            :fecha="fechaLocal"
            :productos-crudos="productosCrudos"
            :modo-edicion="false"
            :solo-vista="true"
            @eliminar-crudo="eliminarProducto"
            class="producto-card producto-crudo"
          />
        </div>
      </div>
      
      <!-- Mensaje cuando no hay productos -->
      <div v-if="clienteActivo && !tieneProductos && !productoNuevoTemporal" class="mensaje-info">
        <p>No hay productos registrados para {{ obtenerNombreCliente() }}. Utilice los botones superiores para agregar productos.</p>
      </div>
      
      <div v-else-if="!clienteActivo" class="mensaje-info">
        <p>Seleccione un cliente del panel izquierdo para ver o agregar sus productos.</p>
      </div>
    </div>
    
    <div class="form-actions">
      <button 
        type="button" 
        class="btn btn-primary"
        @click="guardarEmbarque"
        :disabled="embarqueBloqueado"
      >
        <i class="fas fa-save"></i> Guardar Embarque
      </button>
      
      <button 
        type="button" 
        class="btn btn-secondary"
        @click="toggleBloqueo"
      >
        <i :class="embarqueBloqueado ? 'fas fa-lock-open' : 'fas fa-lock'"></i>
        {{ embarqueBloqueado ? 'Desbloquear' : 'Bloquear' }}
      </button>
      
      <button 
        type="button" 
        class="btn btn-info"
        @click="mostrarDiagnostico = !mostrarDiagnostico"
      >
        <i class="fas fa-stethoscope"></i> Diagnóstico
      </button>
    </div>
    
    <!-- Panel de diagnóstico -->
    <div v-if="mostrarDiagnostico" class="diagnostico-container">
      <DiagnosticoPanel 
        :embarque-id="embarqueId" 
        :items-count="items.length"
        @recarga-completada="onRecargaCompletada"
      />
    </div>
    
    <div class="mensajes-error" v-if="mensajeErrorGeneral">
      <div class="alert alert-danger">{{ mensajeErrorGeneral }}</div>
    </div>
  </div>
</template>

<script>
import ProductoCard from './ProductoCard.vue';
import CrudosCard from './CrudosCard.vue';
import DiagnosticoPanel from '@/components/DiagnosticoPanel.vue';

/**
 * @component EmbarqueForm
 * @description Formulario principal para la edición de embarques
 */
export default {
  name: 'EmbarqueForm',
  components: {
    ProductoCard,
    CrudosCard,
    DiagnosticoPanel
  },
  props: {
    /**
     * Cliente actualmente seleccionado
     */
    clienteActivo: {
      type: String,
      default: ''
    },
    /**
     * Si el embarque está bloqueado
     */
    embarqueBloqueado: {
      type: Boolean,
      default: false
    },
    /**
     * Fecha del embarque
     */
    fecha: {
      type: String,
      default: ''
    },
    /**
     * Información de carga
     */
    cargaCon: {
      type: String,
      default: ''
    },
    /**
     * Items del embarque
     */
    items: {
      type: Array,
      default: () => []
    },
    /**
     * ID del embarque actual
     */
    embarqueId: {
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
      
      // Control de edición
      productoEditando: null,
      
      // Control de mostrar formularios
      mostrarFormularioLimpio: false,
      mostrarFormularioCrudo: false,
      
      productoNuevoTemporal: null,
      mostrarDiagnostico: false
    };
  },
  computed: {
    /**
     * Filtra los productos limpios (S/H20 y C/H20) del cliente activo y los ordena por fecha de creación
     */
    productosLimpios() {
      return this.items
        .filter(item => 
          item.tipo && 
          (item.tipo.toLowerCase() === 's/h20' || item.tipo.toLowerCase() === 'c/h20') && 
          item.cliente === this.clienteActivo
        )
        .sort((a, b) => {
          // Ordenar por fechaCreacion de más reciente a más antiguo
          const fechaA = a.fechaCreacion || '';
          const fechaB = b.fechaCreacion || '';
          return fechaB.localeCompare(fechaA); // Orden inverso para mostrar los más recientes primero
        });
    },
    
    productosLimpiosFiltrados() {
      // Filtrar el producto que se está editando de la lista
      if (!this.productoEditando) {
        return this.productosLimpios;
      }
      
      return this.productosLimpios.filter(producto => 
        producto.id !== this.productoEditando.id
      );
    },
    
    /**
     * Filtra los productos crudos del cliente activo
     */
    productosCrudos() {
      return this.items.filter(item => 
        item.tipo && 
        item.tipo.toLowerCase() === 'crudo' && 
        item.cliente === this.clienteActivo
      );
    },
    
    tieneProductos() {
      return this.productosLimpios.length > 0 || this.productosCrudos.length > 0;
    },
    
    esCrudoEnEdicion() {
      return this.productoEditando && 
             this.productoEditando.tipo && 
             this.productoEditando.tipo.toLowerCase() === 'crudo';
    }
  },
  watch: {
    /**
     * Actualiza la fecha local cuando cambia la prop
     */
    fecha(newVal) {
      console.log('EmbarqueForm - Recibida nueva fecha:', newVal, typeof newVal);
      
      // Convertir la fecha si no es un string
      if (typeof newVal !== 'string') {
        if (newVal instanceof Date) {
          this.fechaLocal = newVal.toISOString().split('T')[0];
        } else if (newVal && newVal.toDate && typeof newVal.toDate === 'function') {
          // Es un Timestamp de Firestore
          const fechaDate = newVal.toDate();
          this.fechaLocal = fechaDate.toISOString().split('T')[0];
        } else {
          // Mantener el valor actual o usar fecha por defecto
          console.warn('EmbarqueForm - Formato de fecha no reconocido:', newVal);
          this.fechaLocal = new Date().toISOString().split('T')[0];
        }
      } else {
        this.fechaLocal = newVal;
      }
    },
    
    /**
     * Actualiza la información de carga cuando cambia la prop
     */
    cargaCon(newVal) {
      this.cargaConLocal = newVal;
    },
    
    /**
     * Cancela la edición al cambiar de cliente
     */
    clienteActivo() {
      if (this.productoEditando) {
        this.cancelarEdicion();
      }
      this.mostrarFormularioLimpio = false;
      this.mostrarFormularioCrudo = false;
    }
  },
  methods: {
    esProductoLimpio(producto) {
      return producto.tipo && 
        (producto.tipo.toLowerCase() === 's/h20' || producto.tipo.toLowerCase() === 'c/h20');
    },
    
    generarIdUnico(producto, index, prefijo) {
      return producto.id 
        ? `${prefijo}-${producto.id}` 
        : `${prefijo}-index-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    },
    
    crearNuevoProductoLimpio() {
      if (!this.clienteActivo) {
        this.mostrarError('Debe seleccionar un cliente antes de agregar productos');
        return;
      }
      
      // Crear un producto temporal vacío
      this.productoNuevoTemporal = {
        id: `temp-${Date.now()}`,
        cliente: this.clienteActivo,
        tipo: 'S/H20', // Tipo por defecto
        medida: '',
        kilos: '',
        precio: '',
        taras: '',
        fecha: this.fechaLocal,
        fechaCreacion: new Date().toISOString()
      };
      
      // Asegurarse de que se muestre al principio
      this.$nextTick(() => {
        const productosSection = document.querySelector('.productos-grid');
        if (productosSection) {
          productosSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    },
    
    crearNuevoProductoCrudo() {
      if (!this.clienteActivo) {
        this.mostrarError('Debe seleccionar un cliente antes de agregar productos');
        return;
      }
      
      // Crear un producto crudo temporal
      this.productoNuevoTemporal = {
        id: `temp-${Date.now()}`,
        cliente: this.clienteActivo,
        tipo: 'crudo',
        medida: '',
        barco: '',
        taras: '',
        fecha: this.fechaLocal,
        fechaCreacion: new Date().toISOString()
      };
      
      // Asegurarse de que se muestre al principio
      this.$nextTick(() => {
        const productosSection = document.querySelector('.productos-grid');
        if (productosSection) {
          productosSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    },
    
    guardarProductoNuevo(producto) {
      const nuevoProducto = {
        ...producto,
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        fechaCreacion: new Date().toISOString(),
        cliente: this.clienteActivo
      };
      
      this.$emit('agregar-producto', nuevoProducto);
      this.actualizarDatosEmbarque();
      this.productoNuevoTemporal = null;
    },
    
    guardarProductoNuevoCrudo(nuevoCrudo) {
      // Si es un array (como en CrudosCard), procesamos cada uno
      if (Array.isArray(nuevoCrudo)) {
        nuevoCrudo.forEach(crudo => {
          const nuevoCrudoCompleto = {
            ...crudo,
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
            fechaCreacion: new Date().toISOString(),
            cliente: this.clienteActivo
          };
          this.$emit('agregar-producto', nuevoCrudoCompleto);
        });
      } else {
        // Si es un solo objeto
        const nuevoCrudoCompleto = {
          ...nuevoCrudo,
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
          fechaCreacion: new Date().toISOString(),
          cliente: this.clienteActivo
        };
        this.$emit('agregar-producto', nuevoCrudoCompleto);
      }
      
      this.actualizarDatosEmbarque();
      this.productoNuevoTemporal = null;
    },
    
    actualizarDatosEmbarque() {
      this.$emit('actualizar-fecha', this.fechaLocal);
      this.$emit('actualizar-carga-con', this.cargaConLocal);
    },
    
    /**
     * Inicia la edición de un producto
     * @param {Object} producto - El producto a editar
     */
    iniciarEdicionProducto(producto) {
      this.productoEditando = { ...producto };
      this.productoNuevoTemporal = null;
    },
    
    /**
     * Actualiza un producto existente
     * @param {Object} productoActualizado - Los datos actualizados del producto
     */
    actualizarProducto(productoActualizado) {
      // Actualizar la fecha de modificación para mantenerlo al inicio
      productoActualizado.fechaCreacion = new Date().toISOString();
      this.$emit('actualizar-producto', productoActualizado);
      this.cancelarEdicion();
    },
    
    /**
     * Cancela la edición actual
     */
    cancelarEdicion() {
      this.productoEditando = null;
      this.productoNuevoTemporal = null;
    },
    
    /**
     * Elimina un producto del embarque
     * @param {Object} producto - El producto a eliminar
     */
    eliminarProducto(producto) {
      this.$emit('eliminar-item', producto);
    },
    
    /**
     * Muestra un mensaje de error
     * @param {String} mensaje - Mensaje de error
     */
    mostrarError(mensaje) {
      this.mensajeErrorGeneral = mensaje;
      
      // Limpiar error después de 5 segundos
      setTimeout(() => {
        this.mensajeErrorGeneral = '';
      }, 5000);
    },
    
    /**
     * Obtiene el nombre del cliente activo
     */
    obtenerNombreCliente() {
      // Buscar en los props de clientesPredefinidos y clientesPersonalizadosEmbarque que vienen del componente padre
      if (!this.clienteActivo) return 'Sin cliente seleccionado';
      
      // Necesitamos acceder a los clientesPredefinidos y clientesPersonalizadosEmbarque 
      // que vienen del componente padre (NuevoEmbarque)
      const clientePredefinido = this.$parent.clientesPredefinidos?.find(
        cliente => cliente.id.toString() === this.clienteActivo
      );
      
      if (clientePredefinido) {
        return clientePredefinido.nombre;
      }
      
      const clientePersonalizado = this.$parent.clientesPersonalizadosEmbarque?.find(
        cliente => cliente.id.toString() === this.clienteActivo
      );
      
      if (clientePersonalizado) {
        return clientePersonalizado.nombre;
      }
      
      return `Cliente ID: ${this.clienteActivo}`;
    },
    
    /**
     * Maneja la recarga completada desde el panel de diagnóstico
     */
    onRecargaCompletada(datosActualizados) {
      if (datosActualizados && datosActualizados.items) {
        this.$emit('actualizar-datos', datosActualizados);
      }
    },
    
    /**
     * Alterna el estado de bloqueo del embarque
     */
    toggleBloqueo() {
      // Emitir evento para cambiar el estado de bloqueo
      this.$emit('toggle-bloqueo', !this.embarqueBloqueado);
    },
    
    /**
     * Guarda el embarque actual
     */
    guardarEmbarque() {
      // Emitir evento para guardar el embarque
      this.$emit('guardar-embarque');
    }
  }
};
</script>

<style scoped>
.formulario-embarque {
  padding: 25px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 25px;
  transition: all 0.3s ease;
}

.titulo-embarque {
  color: #2c3e50;
  margin-bottom: 1.2rem;
  font-weight: 600;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 10px;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  margin-right: -15px;
  margin-left: -15px;
}

.form-group {
  margin-bottom: 1.2rem;
  padding-right: 15px;
  padding-left: 15px;
}

.form-group label {
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #495057;
}

.form-control {
  display: block;
  width: 100%;
  height: calc(1.5em + 0.75rem + 2px);
  padding: 0.5rem 1rem;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  color: #495057;
  background-color: #fff;
  border: 1px solid #dce4ec;
  border-radius: 6px;
  transition: all 0.2s ease-in-out;
}

.form-control:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
}

.productos-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-top: 30px;
}

.acciones-productos {
  flex: 0 0 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.acciones-agregar {
  display: flex;
  gap: 15px;
}

.btn-agregar {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.25s;
  min-width: 200px;
  justify-content: center;
}

.btn-agregar:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-success {
  background-color: #2ecc71;
  border-color: #2ecc71;
}

.btn-warning {
  background-color: #f39c12;
  border-color: #f39c12;
}

.producto-card {
  transition: all 0.3s ease;
  margin-bottom: 15px;
}

.producto-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

.producto-nuevo {
  border: 2px dashed #3498db;
  box-shadow: 0 0 0 4px rgba(52, 152, 219, 0.1);
  animation: pulseHighlight 2s infinite;
}

.producto-crudo {
  border-left: 4px solid #e74c3c;
}

.mr-2 {
  margin-right: 10px;
}

@keyframes pulseHighlight {
  0% {
    box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(52, 152, 219, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(52, 152, 219, 0);
  }
}

@media (max-width: 768px) {
  .form-group {
    flex: 0 0 100%;
    max-width: 100%;
  }
  
  .acciones-productos {
    padding: 12px;
  }
  
  .acciones-agregar {
    flex-direction: column;
    width: 100%;
  }
  
  .btn-agregar {
    width: 100%;
  }
}

.producto-edicion-acciones {
  flex: 0 0 100%;
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.producto-edicion-acciones .btn {
  padding: 8px 15px;
  font-weight: 500;
  border-radius: 6px;
}

.cliente-productos-section {
  flex: 0 0 100%;
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.cliente-productos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e9ecef;
}

.cliente-productos-titulo {
  font-weight: 600;
  margin-bottom: 0;
  color: #2c3e50;
}

.cliente-productos-contador {
  display: flex;
  gap: 10px;
}

.badge {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  vertical-align: baseline;
  border-radius: 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.badge-primary {
  color: #fff;
  background-color: #3498db;
}

.badge-danger {
  color: #fff;
  background-color: #e74c3c;
}

.productos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  animation: fadeIn 0.3s ease-in-out;
  justify-content: flex-start;
}

.mensaje-info {
  flex: 0 0 100%;
  text-align: center;
  padding: 20px;
  background-color: #e1f5fe;
  border-radius: 8px;
  margin-top: 15px;
  color: #0277bd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Estilos para resaltar kilos y medidas */
:deep(.medida-destacada) {
  font-weight: 700;
  color: #2c3e50;
  font-size: 1.1rem;
}

:deep(.kilos-destacados) {
  font-weight: 700;
  color: #16a085;
  font-size: 1.2rem;
  background-color: rgba(22, 160, 133, 0.1);
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-block;
}

:deep(.precio-destacado) {
  font-weight: 700;
  color: #e74c3c;
  font-size: 1.1rem;
}

:deep(.input-destacado) {
  border-color: #3498db;
  background-color: #f8f9fa;
  font-weight: 500;
}

:deep(.input-destacado:focus) {
  box-shadow: 0 0 0 0.2rem rgba(52, 152, 219, 0.25);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-primary {
  background-color: #3498db;
  border-color: #3498db;
}

.btn-secondary {
  background-color: #f39c12;
  border-color: #f39c12;
}

.btn-info {
  background-color: #2ecc71;
  border-color: #2ecc71;
}

.diagnostico-container {
  margin-top: 20px;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
</style> 