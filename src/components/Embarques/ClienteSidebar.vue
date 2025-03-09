<template>
  <div class="sidebar-clientes" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <div class="sidebar-header">
      <h3>Clientes</h3>
      <button @click="toggleSidebar" class="toggle-sidebar-btn">
        <i class="fas" :class="sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'"></i>
      </button>
    </div>
    <div class="sidebar-clientes-contenido">
      <!-- Mostrar clientes predefinidos -->
      <button 
        v-for="cliente in clientesPredefinidos" 
        :key="cliente.id"
        type="button" 
        @click="seleccionarCliente(cliente.id.toString())" 
        class="btn-nota-cliente"
        :class="{ 'activo': clienteActivo === cliente.id.toString() }"
        :style="{ backgroundColor: cliente.color, color: cliente.textColor }"
        :title="sidebarCollapsed ? cliente.nombre : ''"
      >
        <span>{{ cliente.nombre }}</span>
      </button>
      
      <!-- Mostrar clientes personalizados específicos de este embarque -->
      <button 
        v-for="cliente in clientesPersonalizadosEmbarque" 
        :key="cliente.id"
        type="button" 
        @click="seleccionarCliente(cliente.id.toString())" 
        class="btn-nota-cliente cliente-personalizado"
        :class="{ 'activo': clienteActivo === cliente.id.toString() }"
        :style="{ backgroundColor: obtenerColorCliente(cliente.nombre), color: obtenerColorTextoCliente(cliente.nombre) }"
        :title="sidebarCollapsed ? cliente.nombre : ''"
      >
        <span>{{ formatearNombreCliente(cliente.nombre) }}</span>
      </button>
      
      <!-- Botón para agregar nuevo cliente -->
      <button 
        type="button" 
        @click="mostrarModalNuevoCliente" 
        class="btn-agregar-cliente"
        :title="sidebarCollapsed ? 'Agregar Cliente' : ''"
      >
        <i class="fas fa-plus"></i>
        <span v-if="!sidebarCollapsed">Agregar Cliente</span>
      </button>
    </div>
    <div class="sidebar-toggle-mobile">
      <button @click="toggleSidebar" class="toggle-sidebar-mobile-btn">
        <i class="fas" :class="sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'"></i>
      </button>
    </div>
    <!-- Resumen de taras y kilos -->
    <div class="sidebar-resumen">
      <h4>Resumen Taras</h4>
      <div class="sidebar-item">
        <span>Limpio:</span>
        <strong>{{ tarasLimpio.toFixed(2) }}</strong>
      </div>
      <div class="sidebar-item">
        <span>Crudo:</span>
        <strong>{{ tarasCrudo.toFixed(2) }}</strong>
      </div>
      <div class="sidebar-item total">
        <span>Total:</span>
        <strong>{{ totalTaras.toFixed(2) }}-T</strong>
      </div>
      
      <h4>Resumen Kilos</h4>
      <div class="sidebar-item">
        <span>Limpio:</span>
        <strong>{{ Math.floor(kilosLimpio) }}</strong>
      </div>
      <div class="sidebar-item">
        <span>Crudo:</span>
        <strong>{{ kilosCrudo.toFixed(2) }}</strong>
      </div>
      <div class="sidebar-item total">
        <span>Total:</span>
        <strong>{{ Math.floor(totalKilos) }}</strong>
      </div>
    </div>
  </div>
</template>

<script>
import { useClienteUtils } from '@/composables/useClienteUtils';

/**
 * @component ClienteSidebar
 * @description Barra lateral que muestra la lista de clientes y resumen de taras y kilos
 */
export default {
  name: 'ClienteSidebar',
  props: {
    /**
     * Lista de clientes predefinidos
     * @type {Array}
     * @required
     */
    clientesPredefinidos: {
      type: Array,
      required: true
    },
    /**
     * Lista de clientes personalizados específicos de este embarque
     * @type {Array}
     */
    clientesPersonalizadosEmbarque: {
      type: Array,
      default: () => []
    },
    /**
     * ID del cliente actualmente seleccionado
     * @type {String}
     */
    clienteActivo: {
      type: String,
      default: ''
    },
    /**
     * Indica si la barra lateral está colapsada
     * @type {Boolean}
     */
    sidebarCollapsed: {
      type: Boolean,
      default: false
    },
    /**
     * Total de taras para productos limpios
     * @type {Number}
     */
    tarasLimpio: {
      type: Number,
      default: 0
    },
    /**
     * Total de taras para productos crudos
     * @type {Number}
     */
    tarasCrudo: {
      type: Number,
      default: 0
    },
    /**
     * Total de todas las taras
     * @type {Number}
     */
    totalTaras: {
      type: Number,
      default: 0
    },
    /**
     * Total de kilos para productos limpios
     * @type {Number}
     */
    kilosLimpio: {
      type: Number,
      default: 0
    },
    /**
     * Total de kilos para productos crudos
     * @type {Number}
     */
    kilosCrudo: {
      type: Number,
      default: 0
    },
    /**
     * Total de todos los kilos
     * @type {Number}
     */
    totalKilos: {
      type: Number,
      default: 0
    }
  },
  setup() {
    // Utilizamos el composable para obtener las funciones de utilidad
    const { obtenerColorCliente, obtenerColorTextoCliente, formatearNombreCliente } = useClienteUtils();
    
    return {
      obtenerColorCliente,
      obtenerColorTextoCliente,
      formatearNombreCliente
    };
  },
  methods: {
    /**
     * Emite evento para alternar el estado de la barra lateral
     */
    toggleSidebar() {
      this.$emit('toggle-sidebar');
    },
    /**
     * Emite evento para seleccionar un cliente
     * @param {String} clienteId - ID del cliente seleccionado
     */
    seleccionarCliente(clienteId) {
      this.$emit('seleccionar-cliente', clienteId);
    },
    /**
     * Emite evento para mostrar el modal de nuevo cliente
     */
    mostrarModalNuevoCliente() {
      this.$emit('mostrar-modal-nuevo-cliente');
    }
  }
};
</script>

<style scoped>
.sidebar-clientes {
  width: 250px;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  background-color: #f8f9fa;
  border-right: 1px solid #dee2e6;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #dee2e6;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-collapsed .sidebar-header h3 {
  display: none;
}

.toggle-sidebar-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6c757d;
}

.sidebar-clientes-contenido {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
}

.btn-nota-cliente {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px;
  margin-bottom: 8px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-collapsed .btn-nota-cliente {
  padding: 10px 5px;
  text-align: center;
}

.sidebar-collapsed .btn-nota-cliente span {
  display: none;
}

.btn-nota-cliente.activo {
  box-shadow: 0 0 0 3px rgba(0,123,255,0.5);
}

.btn-agregar-cliente {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px;
  margin-top: 15px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sidebar-collapsed .btn-agregar-cliente span {
  display: none;
}

.btn-agregar-cliente:hover {
  background-color: #218838;
}

.sidebar-toggle-mobile {
  display: none;
}

.sidebar-resumen {
  padding: 15px;
  border-top: 1px solid #dee2e6;
  background-color: #f1f3f5;
}

.sidebar-collapsed .sidebar-resumen {
  display: none;
}

.sidebar-resumen h4 {
  margin: 0 0 10px 0;
  font-size: 1rem;
  color: #495057;
}

.sidebar-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.sidebar-item.total {
  margin-top: 10px;
  padding-top: 5px;
  border-top: 1px dashed #ced4da;
  font-weight: bold;
}

@media (max-width: 768px) {
  .sidebar-clientes {
    transform: translateX(-100%);
  }
  
  .sidebar-clientes.sidebar-collapsed {
    transform: translateX(0);
    width: 60px;
  }
  
  .sidebar-toggle-mobile {
    display: block;
    position: fixed;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    z-index: 1001;
  }
  
  .toggle-sidebar-mobile-btn {
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 0 5px 5px 0;
    padding: 10px;
    cursor: pointer;
  }
}
</style> 