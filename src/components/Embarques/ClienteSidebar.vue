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
  transition: all 0.3s;
  z-index: 100;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 15px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 1.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toggle-sidebar-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #6c757d;
}

.sidebar-clientes-contenido {
  padding: 15px;
  flex-grow: 1;
  overflow-y: auto;
}

.btn-nota-cliente {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  height: 50px;
  margin-bottom: 10px;
  padding: 10px 15px;
  text-align: left;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
}

.btn-nota-cliente.activo {
  transform: scale(0.98);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.6), 0 0 0 6px rgba(0, 0, 0, 0.2);
  position: relative;
}

.btn-nota-cliente.activo::after {
  content: "✓";
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  font-size: 1rem;
  font-weight: bold;
}

.sidebar-collapsed .btn-nota-cliente {
  padding: 10px;
  justify-content: center;
}

.sidebar-collapsed .btn-nota-cliente span {
  display: none;
}

.cliente-personalizado {
  background-color: #6c757d;
  color: white;
}

.btn-agregar-cliente {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 50px;
  margin-top: 20px;
  padding: 10px 15px;
  border: 2px dashed #dee2e6;
  border-radius: 8px;
  background-color: transparent;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-agregar-cliente:hover {
  background-color: #e9ecef;
}

.sidebar-collapsed .btn-agregar-cliente span {
  display: none;
}

.sidebar-toggle-mobile {
  display: none;
}

.sidebar-resumen {
  padding: 15px;
  border-top: 1px solid #dee2e6;
  background-color: #e9ecef;
}

.sidebar-resumen h4 {
  margin: 0 0 10px 0;
  font-size: 1.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.9rem;
}

.sidebar-collapsed .sidebar-resumen h4,
.sidebar-collapsed .sidebar-item span:first-child {
  display: none;
}

.sidebar-collapsed .sidebar-item {
  justify-content: center;
}

@media (max-width: 768px) {
  .sidebar-clientes {
    width: 100%;
    height: auto;
    position: relative;
    border-right: none;
    border-bottom: 1px solid #dee2e6;
  }
  
  .sidebar-collapsed {
    width: 100%;
  }
  
  .sidebar-toggle-mobile {
    display: block;
    padding: 10px;
    text-align: center;
    border-top: 1px solid #dee2e6;
  }
  
  .toggle-sidebar-mobile-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: #6c757d;
    width: 100%;
    padding: 5px;
  }
  
  .btn-nota-cliente, .btn-agregar-cliente {
    height: 40px;
  }
}
</style> 