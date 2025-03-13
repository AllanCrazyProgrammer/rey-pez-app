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
    <!-- Agregar esto dentro del elemento que representa la barra lateral -->
    <div class="sidebar-resumen">
      <h4>Resumen Taras</h4>
      <div class="sidebar-item">
        <span>Limpio:</span>
        <strong>{{ calcularTarasLimpio() }}</strong>
      </div>
      <div class="sidebar-item">
        <span>Crudo:</span>
        <strong>{{ calcularTarasCrudo() }}</strong>
      </div>
      <div class="sidebar-item total">
        <span>Total:</span>
        <strong>{{ calcularTotalTaras() }}-T</strong>
      </div>
      
      <h4>Resumen Kilos</h4>
      <div class="sidebar-item">
        <span>Limpio:</span>
        <strong>{{ Math.floor(calcularKilosLimpio()) }}</strong>
      </div>
      <div class="sidebar-item">
        <span>Crudo:</span>
        <strong>{{ calcularKilosCrudo() }}</strong>
      </div>
      <div class="sidebar-item total">
        <span>Total:</span>
        <strong>{{ Math.floor(calcularTotalKilos()) }}</strong>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Sidebar',
  props: {
    embarque: {
      type: Object,
      required: true
    },
    clientesPredefinidos: {
      type: Array,
      required: true
    },
    clientesPersonalizadosEmbarque: {
      type: Array,
      required: true
    },
    clienteCrudos: {
      type: Object,
      required: true
    },
    clienteActivo: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      sidebarCollapsed: false,
      clienteActivo: null,
    };
  },
  methods: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      this.$emit('toggle-sidebar', this.sidebarCollapsed);
    },
    seleccionarCliente(clienteId) {
      this.clienteActivo = clienteId;
      this.$emit('seleccionar-cliente', clienteId);
    },
    mostrarModalNuevoCliente() {
      this.$emit('mostrar-modal-nuevo-cliente');
    },
    obtenerColorCliente(nombreCliente) {
      // Lógica para obtener color del cliente según el nombre
      const colores = {
        'Joselito': '#3498db',
        'Catarro': '#e74c3c',
        'Otilio': '#f1c40f',
        'Ozuna': '#2ecc71'
      };
      return colores[nombreCliente] || '#95a5a6'; // Color por defecto
    },
    obtenerColorTextoCliente(nombreCliente) {
      // Lógica para obtener color del texto según el nombre del cliente
      const coloresTexto = {
        'Otilio': 'black'
      };
      return coloresTexto[nombreCliente] || 'white'; // Color por defecto
    },
    calcularTarasLimpio() {
      return this.embarque.productos.reduce((total, producto) => {
        // Verificar si el cliente es uno de los predefinidos
        const clienteId = producto.clienteId;
        const clientePredefinido = this.clientesPredefinidos.find(c => c.id.toString() === clienteId.toString());
        
        // Solo sumar si es un cliente predefinido
        if (clientePredefinido) {
          return total + this.totalTaras(producto);
        }
        return total;
      }, 0);
    },
    calcularTarasCrudo() {
      return Object.entries(this.clienteCrudos).reduce((total, [clienteId, crudos]) => {
        // Verificar si el cliente es uno de los predefinidos
        const clientePredefinido = this.clientesPredefinidos.find(c => c.id.toString() === clienteId.toString());
        
        // Solo sumar si es un cliente predefinido
        if (clientePredefinido) {
          return total + crudos.reduce((clienteTotal, crudo) => {
            return clienteTotal + this.calcularTotalCrudos(crudo);
          }, 0);
        }
        return total;
      }, 0);
    },
    calcularTotalTaras() {
      return this.calcularTarasLimpio() + this.calcularTarasCrudo();
    },
    calcularKilosLimpio() {
      return this.embarque.productos.reduce((total, producto) => {
        // Solo sumamos productos de clientes predefinidos
        const clienteId = producto.clienteId;
        const clientePredefinido = this.clientesPredefinidos.find(c => c.id.toString() === clienteId.toString());
        
        if (!clientePredefinido) return total;
        
        if (producto.tipo === 'c/h20') {
          // Para productos c/h20, calcular la suma de (taras * bolsa) para cada grupo
          const reporteTaras = producto.reporteTaras || [];
          const reporteBolsas = producto.reporteBolsas || [];
          let sumaTotalKilos = 0;

          for (let i = 0; i < reporteTaras.length; i++) {
            const taras = parseInt(reporteTaras[i]) || 0;
            const bolsa = parseInt(reporteBolsas[i]) || 0;
            sumaTotalKilos += taras * bolsa;
          }

          // Multiplicar por el valor neto (0.65 por defecto)
          const kilosReales = sumaTotalKilos * (producto.camaronNeto || 0.65);
          return total + kilosReales;
        } else {
          // Para otros productos, mantener el cálculo original
          return total + this.totalKilos(producto);
        }
      }, 0);
    },
    calcularKilosCrudo() {
      return Object.entries(this.clienteCrudos).reduce((total, [clienteId, crudos]) => {
        // Verificar si el cliente es uno de los predefinidos
        const clientePredefinido = this.clientesPredefinidos.find(c => c.id.toString() === clienteId.toString());
        
        // Solo sumar si es un cliente predefinido
        if (clientePredefinido) {
          return total + crudos.reduce((clienteTotal, crudo) => {
            return clienteTotal + crudo.items.reduce((itemTotal, item) => {
              return itemTotal + this.calcularKilosCrudos(item);
            }, 0);
          }, 0);
        }
        return total;
      }, 0);
    },
    calcularTotalKilos() {
      const kilosLimpio = parseFloat(this.calcularKilosLimpio());
      const kilosCrudo = parseFloat(this.calcularKilosCrudo());
      return (kilosLimpio + kilosCrudo);
    },
    totalTaras(producto) {
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
      const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
      return tarasNormales + tarasExtra;
    },
    totalKilos(producto) {
      const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (kilo || 0), 0);
      const sumaTarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
      // No incluimos las taras extra en el descuento
      const descuentoTaras = producto.restarTaras ? sumaTarasNormales * 3 : 0;
      return Number((sumaKilos - descuentoTaras).toFixed(1));
    },
    calcularTotalCrudos(crudo) {
      return crudo.items.reduce((total, item) => {
        let taras = this.extraerNumero(item.taras);
        let sobrante = this.extraerNumero(item.sobrante);
        return total + taras + sobrante;
      }, 0);
    },
    calcularKilosCrudos(item) {
      let kilosTotales = 0;
      
      // Procesar taras
      if (item.taras) {
        // Verificar si la tara tiene formato "5-19" o similar
        const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
        if (formatoGuion) {
          const cantidad = parseInt(formatoGuion[1]) || 0;
          let medida = parseInt(formatoGuion[2]) || 0;
          
          // Si la medida es 19, sustituirla por 20
          if (medida === 19) {
            medida = 20;
          }
          
          kilosTotales += cantidad * medida;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidad, medida] = item.taras.split('-').map(Number);
          kilosTotales += cantidad * medida;
        }
      }
      
      // Procesar sobrante
      if (item.sobrante) {
        // Verificar si el sobrante tiene formato "5-19" o similar
        const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
        if (formatoGuion) {
          const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
          let medidaSobrante = parseInt(formatoGuion[2]) || 0;
          
          // Si la medida es 19, sustituirla por 20
          if (medidaSobrante === 19) {
            medidaSobrante = 20;
          }
          
          kilosTotales += cantidadSobrante * medidaSobrante;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidadSobrante, medidaSobrante] = item.sobrante.split('-').map(Number);
          kilosTotales += cantidadSobrante * medidaSobrante;
        }
      }
      
      return kilosTotales;
    },
    extraerNumero(valor) {
      if (!valor) return 0;
      const match = valor.toString().match(/^(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
  }
};
</script>

<style scoped>
.sidebar-clientes {
  width: 200px;
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
  overflow-y: auto;
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
  font-size: 18px;
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
  margin-bottom: 20px;
}

.btn-nota-cliente {
  width: 170px;
  padding: 12px 0;
  margin: 0;
  border: none;
  border-radius: 6px;
  font-size: 16px;
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

.btn-agregar-cliente {
  width: 170px;
  padding: 12px 0;
  margin: 10px 0;
  border: none;
  border-radius: 6px;
  background-color: #2ecc71;
  color: white;
  font-size: 16px;
  text-align: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.btn-agregar-cliente:hover {
  background-color: #27ae60;
  transform: translateY(-2px);
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-collapsed .sidebar-header h3,
.sidebar-collapsed .btn-nota-cliente span,
.sidebar-collapsed .btn-agregar-cliente span {
  opacity: 0;
}

.sidebar-collapsed .btn-nota-cliente {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  padding: 0;
}

.sidebar-collapsed .btn-agregar-cliente {
  width: 40px;
  height: 40px;
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

.sidebar-resumen {
  padding: 15px;
  background-color: rgba(135, 206, 250, 0.2);
  border-radius: 8px;
  margin-top: auto;
  width: 90%;
  margin-bottom: 20px;
}

.sidebar-resumen h4 {
  color: white;
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 10px;
  text-align: center;
}

.sidebar-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  color: white;
}

.sidebar-item.total {
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  font-weight: bold;
  color: #ff6347;
}

/* Ajustes responsivos para la barra lateral */
@media (max-width: 992px) {
  .sidebar-clientes {
    width: 180px;
  }
  
  .btn-nota-cliente, .btn-agregar-cliente {
    width: 150px;
    font-size: 14px;
  }
}

@media (max-width: 768px) {
  .sidebar-clientes {
    width: 150px;
  }
  
  .btn-nota-cliente, .btn-agregar-cliente {
    width: 120px;
    font-size: 14px;
    padding: 10px 0;
  }
  
  .sidebar-collapsed {
    width: 50px;
  }
  
  .sidebar-toggle-mobile {
    display: block;
  }
}

@media (max-width: 480px) {
  .sidebar-clientes {
    width: 120px;
  }
  
  .btn-nota-cliente, .btn-agregar-cliente {
    width: 100px;
    font-size: 12px;
    padding: 8px 0;
  }
  
  .sidebar-collapsed {
    width: 0;
    padding: 0;
    overflow: hidden;
  }
}
</style> 