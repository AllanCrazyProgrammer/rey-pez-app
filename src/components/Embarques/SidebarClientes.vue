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
        <span>{{ cliente.nombre }}</span>
      </button>
      
      <!-- Botón para agregar nuevo cliente -->
      <button 
        type="button" 
        @click="$emit('mostrar-modal-nuevo-cliente')" 
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
  </div>
</template>

<script>
export default {
  name: 'SidebarClientes',
  props: {
    clientesPredefinidos: {
      type: Array,
      required: true
    },
    clientesPersonalizadosEmbarque: {
      type: Array,
      required: true
    },
    clienteActivo: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      sidebarCollapsed: false
    };
  },
  methods: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      this.$emit('toggle-sidebar', this.sidebarCollapsed);
    },
    seleccionarCliente(clienteId) {
      this.$emit('seleccionar-cliente', clienteId);
    },
    obtenerColorCliente(nombre) {
      // Generar un color basado en el nombre del cliente
      let hash = 0;
      for (let i = 0; i < nombre.length; i++) {
        hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      let color = '#';
      for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
      }
      
      return color;
    },
    obtenerColorTextoCliente(nombre) {
      // Determinar si el texto debe ser claro u oscuro según el color de fondo
      const color = this.obtenerColorCliente(nombre);
      const r = parseInt(color.substr(1, 2), 16);
      const g = parseInt(color.substr(3, 2), 16);
      const b = parseInt(color.substr(5, 2), 16);
      
      // Fórmula para determinar la luminosidad
      const luminosidad = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      
      return luminosidad > 0.5 ? '#000000' : '#FFFFFF';
    }
  }
}
</script>

<style scoped>
.sidebar-clientes {
  width: 250px;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  background-color: #f8f9fa;
  border-right: 1px solid #dee2e6;
  transition: width 0.3s ease;
  z-index: 1000;
  padding-top: 60px; /* Espacio para la barra de navegación */
  overflow-y: auto;
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

.toggle-sidebar-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6c757d;
  padding: 5px;
}

.sidebar-clientes-contenido {
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-nota-cliente {
  padding: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  text-align: left;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-nota-cliente.activo {
  box-shadow: 0 0 0 3px rgba(0,123,255,0.5);
}

.btn-agregar-cliente {
  padding: 10px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 15px;
}

.sidebar-toggle-mobile {
  display: none;
}

/* Estilos responsivos */
@media (max-width: 768px) {
  .sidebar-clientes {
    width: 100%;
    height: auto;
    position: relative;
    padding-top: 0;
    margin-bottom: 20px;
  }
  
  .sidebar-collapsed {
    width: 100%;
    height: 60px;
    overflow: hidden;
  }
  
  .sidebar-toggle-mobile {
    display: block;
    position: absolute;
    bottom: 10px;
    right: 10px;
  }
  
  .toggle-sidebar-mobile-btn {
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }
}
</style> 