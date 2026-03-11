<template>
  <div class="sidebar-clientes" :class="{ 'sidebar-collapsed': collapsed }">
    <div class="sidebar-header">
      <h3>Clientes</h3>
      <button @click="toggleSidebar" class="toggle-sidebar-btn">
        <i class="fas" :class="collapsed ? 'fa-chevron-right' : 'fa-chevron-left'"></i>
      </button>
    </div>
    <div class="sidebar-clientes-contenido">
      <button 
        v-for="cliente in clientes" 
        :key="cliente.id"
        type="button" 
        @click="seleccionarCliente(cliente.id)" 
        class="btn-nota-cliente"
        :class="{ 'activo': clienteActivo === cliente.id }"
        :style="{ backgroundColor: cliente.color, color: cliente.textColor || 'white' }"
        :title="collapsed ? cliente.nombre : ''"
      >
        <span>{{ cliente.nombre }}</span>
      </button>
    </div>
    <div class="sidebar-toggle-mobile">
      <button @click="toggleSidebar" class="toggle-sidebar-mobile-btn">
        <i class="fas" :class="collapsed ? 'fa-chevron-right' : 'fa-chevron-left'"></i>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SidebarClientes',
  props: {
    clientes: {
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
      collapsed: false
    };
  },
  methods: {
    toggleSidebar() {
      this.collapsed = !this.collapsed;
      this.$emit('toggle-sidebar', this.collapsed);
    },
    seleccionarCliente(clienteId) {
      this.$emit('seleccionar-cliente', clienteId);
    }
  }
};
</script>

<style scoped>
.sidebar-clientes {
  width: 100px;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  padding: 15px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: width 0.3s ease;
}

.sidebar-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  margin-bottom: 20px;
}

.sidebar-header h3 {
  color: white;
  font-size: 16px;
  margin: 0;
}

.toggle-sidebar-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 5px;
  font-size: 14px;
}

.sidebar-clientes-contenido {
  display: flex;
  flex-direction: column;
  gap: 15px;
  width: 100%;
  align-items: center;
}

.btn-nota-cliente {
  width: 80px;
  padding: 12px 0;
  margin: 0;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  font-weight: bold;
}

.btn-nota-cliente span {
  display: block;
  transition: opacity 0.3s ease;
}

.btn-nota-cliente:hover {
  transform: translateX(5px);
  opacity: 0.9;
}

.btn-nota-cliente.activo {
  transform: translateX(5px);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.sidebar-collapsed {
  width: 40px;
}

.sidebar-collapsed .sidebar-header h3,
.sidebar-collapsed .btn-nota-cliente span {
  opacity: 0;
}

.sidebar-collapsed .btn-nota-cliente {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  padding: 0;
}

.sidebar-toggle-mobile {
  display: none;
  position: absolute;
  top: 50%;
  right: -15px;
  transform: translateY(-50%);
}

.toggle-sidebar-mobile-btn {
  background-color: rgba(0, 0, 0, 0.7);
  border: none;
  color: white;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
}

/* Ajustes responsivos para la barra lateral */
@media (max-width: 768px) {
  .sidebar-clientes {
    width: 70px;
  }
  
  .btn-nota-cliente {
    width: 60px;
    font-size: 12px;
    padding: 10px 0;
  }
  
  .sidebar-collapsed {
    width: 30px;
  }
  
  .sidebar-toggle-mobile {
    display: block;
  }
}

@media (max-width: 480px) {
  .sidebar-clientes {
    width: 50px;
  }
  
  .btn-nota-cliente {
    width: 40px;
    font-size: 10px;
    padding: 8px 0;
  }
  
  .sidebar-collapsed {
    width: 0;
    padding: 0;
    overflow: hidden;
  }
}
</style> 