<template>
  <div class="sidebar-clientes" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <div class="sidebar-header">
      <h3><i class="fas fa-users"></i> <span>Clientes</span></h3>
      <button @click="toggleSidebar" class="toggle-sidebar-btn" :title="sidebarCollapsed ? 'Expandir' : 'Colapsar'">
        <i class="fas" :class="sidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'"></i>
      </button>
    </div>
    <div class="sidebar-clientes-contenido">
      <!-- Mostrar clientes predefinidos -->
      <button 
        v-for="cliente in clientesPredefinidos" 
        :key="'predefinido-' + cliente.id"
        type="button" 
        @click="seleccionarCliente(cliente.id.toString())" 
        class="btn-nota-cliente"
        :class="{ 'activo': clienteActivoLocal === cliente.id.toString() }"
        :style="{ '--cliente-color': cliente.color, '--cliente-text': cliente.textColor }"
        :title="sidebarCollapsed ? cliente.nombre : ''"
      >
        <i class="fas fa-user-circle" v-if="sidebarCollapsed"></i>
        <span v-else class="cliente-boton-contenido"><i class="cliente-color-dot"></i>{{ cliente.nombre }}</span>
      </button>
      
      <button 
        v-for="cliente in clientesPersonalizadosEmbarque" 
        :key="'personalizado-' + cliente.id"
        type="button" 
        @click="seleccionarCliente(cliente.id.toString())" 
        class="btn-nota-cliente cliente-personalizado"
        :class="{ 'activo': clienteActivoLocal === cliente.id.toString() }"
        :style="{ '--cliente-color': obtenerColorCliente(cliente.nombre), '--cliente-text': obtenerColorTextoCliente(cliente.nombre) }"
        :title="sidebarCollapsed ? cliente.nombre : ''"
      >
        <i class="fas fa-user-circle" v-if="sidebarCollapsed"></i>
        <span v-else class="cliente-boton-contenido"><i class="cliente-color-dot"></i>{{ cliente.nombre }}</span>
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
    <div class="sidebar-resumen" :class="{ 'resumen-collapsed': sidebarCollapsed }">
      <div class="resumen-seccion">
        <h4><i class="fas fa-balance-scale"></i> Resumen Taras</h4>
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
      </div>
      
      <div class="resumen-seccion">
        <h4><i class="fas fa-weight"></i> Resumen Kilos</h4>
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
      clienteActivoLocal: null,
    };
  },
  created() {
    // Inicializar clienteActivoLocal con el valor del prop
    this.clienteActivoLocal = this.clienteActivo;
  },
  watch: {
    // Observar cambios en el prop para actualizar la variable local
    clienteActivo(newVal) {
      this.clienteActivoLocal = newVal;
    }
  },
  methods: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      this.$emit('toggle-sidebar', this.sidebarCollapsed);
    },
    seleccionarCliente(clienteId) {
      this.clienteActivoLocal = clienteId;
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
        'Ozuna': '#2ecc71',
        'Canelo': '#9b59b6'
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
            if (!crudo || !crudo.items || !Array.isArray(crudo.items)) {
              return clienteTotal;
            }
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
      if (!crudo || !crudo.items || !Array.isArray(crudo.items)) {
        return 0;
      }
      return crudo.items.reduce((total, item) => {
        let taras = this.extraerNumero(item.taras);
        let sobrante = this.extraerNumero(item.sobrante);
        let sobrante2 = this.extraerNumero(item.sobrante2);
        return total + taras + sobrante + sobrante2;
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

      // Procesar segundo sobrante
      if (item.sobrante2) {
        const formatoGuion2 = /^(\d+)-(\d+)$/.exec(item.sobrante2);
        if (formatoGuion2) {
          const cantidadSobrante2 = parseInt(formatoGuion2[1]) || 0;
          let medidaSobrante2 = parseInt(formatoGuion2[2]) || 0;

          if (medidaSobrante2 === 19) {
            medidaSobrante2 = 20;
          }

          kilosTotales += cantidadSobrante2 * medidaSobrante2;
        } else {
          const [cantidadSobrante2, medidaSobrante2] = item.sobrante2.split('-').map(Number);
          kilosTotales += cantidadSobrante2 * medidaSobrante2;
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
  width: 145px !important;
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  background: linear-gradient(135deg, #2c3e50, #1a2530);
  z-index: 1000;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.4s cubic-bezier(0.215, 0.61, 0.355, 1);
  box-shadow: 3px 0 20px rgba(0, 0, 0, 0.3);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.sidebar-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 15px;
  margin-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
  position: relative;
}

.sidebar-header h3 {
  color: #ecf0f1;
  font-size: 18px;
  margin: 0;
  font-weight: 600;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
  text-shadow: 0 2px 3px rgba(0, 0, 0, 0.2);
}

.sidebar-header h3 i {
  background: linear-gradient(45deg, #3498db, #2ecc71);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 24px;
}

.toggle-sidebar-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  padding: 10px;
  font-size: 14px;
  border-radius: 50%;
  transition: all 0.3s;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
}

.toggle-sidebar-btn:hover {
  background: rgba(52, 152, 219, 0.3);
  transform: rotate(360deg);
}

.sidebar-clientes-contenido {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  align-items: center;
  margin-bottom: 15px;
  padding: 0 15px;
  flex: 1;
  overflow-y: auto;
}

.btn-nota-cliente {
  width: 100%;
  padding: 10px 12px;
  margin: 0;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  justify-content: center;
  align-items: center;
  letter-spacing: 0.5px;
}

.btn-nota-cliente::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0));
  transition: all 0.3s ease;
}

.btn-nota-cliente span {
  display: block;
  transition: opacity 0.25s ease;
  position: relative;
  z-index: 1;
}

.btn-nota-cliente:hover {
  transform: translateX(5px) scale(1.03);
  opacity: 0.95;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.btn-nota-cliente:hover::before {
  transform: translateX(-100%);
}

.btn-nota-cliente.activo {
  transform: translateX(8px);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  position: relative;
}

.btn-nota-cliente.activo::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  height: 70%;
  width: 5px;
  background: linear-gradient(180deg, #3498db, #2ecc71);
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(52, 152, 219, 0.7);
}

.btn-agregar-cliente {
  width: 100%;
  padding: 10px 12px;
  margin: 10px 0 0;
  border: none;
  border-radius: 8px;
  background: linear-gradient(45deg, #27ae60, #2ecc71);
  color: white;
  font-size: 14px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  position: relative;
  overflow: hidden;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.btn-agregar-cliente::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
  transition: all 0.5s ease;
}

.btn-agregar-cliente:hover {
  background: linear-gradient(45deg, #2ecc71, #27ae60);
  transform: translateY(-5px);
  box-shadow: 0 7px 15px rgba(0, 0, 0, 0.2);
}

.btn-agregar-cliente:hover::before {
  left: 100%;
}

.btn-agregar-cliente i {
  font-size: 18px;
  transition: transform 0.3s ease;
}

.btn-agregar-cliente:hover i {
  transform: rotate(90deg);
}

.sidebar-collapsed {
  width: 80px !important;
}

.sidebar-collapsed .sidebar-header h3,
.sidebar-collapsed .btn-nota-cliente span,
.sidebar-collapsed .btn-agregar-cliente span {
  display: none;
}

.sidebar-collapsed .btn-nota-cliente {
  width: 55px;
  height: 55px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar-collapsed .btn-nota-cliente i {
  font-size: 20px;
}

.sidebar-collapsed .btn-agregar-cliente {
  width: 55px;
  height: 55px;
  border-radius: 50%;
  padding: 0;
}

.sidebar-collapsed .btn-agregar-cliente i {
  font-size: 20px;
}

.sidebar-toggle-mobile {
  display: none;
  position: absolute;
  top: 50%;
  right: -20px;
  transform: translateY(-50%);
}

.toggle-sidebar-mobile-btn {
  background: linear-gradient(135deg, #34495e, #2c3e50);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
  transition: all 0.3s;
  z-index: 10;
}

.toggle-sidebar-mobile-btn:hover {
  background: linear-gradient(135deg, #2c3e50, #34495e);
  transform: scale(1.1);
}

.sidebar-resumen {
  padding: 15px;
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.15), rgba(46, 204, 113, 0.1));
  border-radius: 10px;
  margin-top: auto;
  width: 90%;
  margin-bottom: 15px;
  border: 1px solid rgba(52, 152, 219, 0.15);
  transition: all 0.4s ease;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
}

.resumen-collapsed {
  display: none;
}

.resumen-seccion {
  margin-bottom: 15px;
  position: relative;
}

.resumen-seccion:last-child {
  margin-bottom: 0;
}

.resumen-seccion::after {
  content: '';
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 2px;
  background: linear-gradient(90deg, rgba(52, 152, 219, 0.3), rgba(46, 204, 113, 0.3));
  border-radius: 2px;
}

.resumen-seccion:last-child::after {
  display: none;
}

.sidebar-resumen h4 {
  color: #3498db;
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 12px;
  text-align: center;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.sidebar-resumen h4 i {
  background: linear-gradient(45deg, #3498db, #2ecc71);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 20px;
}

.sidebar-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #ecf0f1;
  font-size: 14px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  transition: all 0.3s;
}

.sidebar-item:hover {
  background: rgba(0, 0, 0, 0.15);
  transform: translateX(3px);
}

.sidebar-item span {
  opacity: 0.9;
}

.sidebar-item strong {
  font-weight: 700;
  letter-spacing: 0.5px;
}

.sidebar-item.total {
  margin-top: 8px;
  padding: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: bold;
  color: #e74c3c;
  font-size: 15px;
  background: rgba(231, 76, 60, 0.1);
  border-radius: 8px;
}

.sidebar-item.total strong {
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

/* Ajustes responsivos */
@media (max-width: 1200px) {
  .sidebar-clientes {
    width: 220px !important;
  }
}

@media (max-width: 992px) {
  .sidebar-clientes {
    width: 200px !important;
  }
  
  .btn-nota-cliente, .btn-agregar-cliente {
    padding: 8px 10px;
    font-size: 13px;
  }
  
  .sidebar-item {
    font-size: 13px;
  }
  
  .sidebar-resumen {
    padding: 12px;
  }
}

@media (max-width: 768px) {
  .sidebar-clientes {
    width: 180px !important;
  }
  
  .sidebar-collapsed {
    width: 60px !important;
  }
  
  .sidebar-header h3 {
    font-size: 16px;
  }
  
  .sidebar-resumen {
    padding: 10px;
  }
  
  .sidebar-resumen h4 {
    font-size: 14px;
  }
}

@media (max-width: 576px) {
  .sidebar-clientes {
    width: 220px !important;
    transform: translateX(0);
  }
  
  .sidebar-collapsed {
    width: 0 !important;
    padding: 0;
    transform: translateX(-100%);
  }
}

/* Mantener las animaciones y efectos existentes */
.btn-nota-cliente,
.btn-agregar-cliente,
.toggle-sidebar-btn,
.toggle-sidebar-mobile-btn {
  will-change: transform;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(52, 152, 219, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(52, 152, 219, 0);
  }
}

.btn-nota-cliente.activo {
  animation: pulse 2s infinite;
}

/* Scroll personalizado para la barra lateral */
.sidebar-clientes::-webkit-scrollbar {
  width: 6px;
}

.sidebar-clientes::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.sidebar-clientes::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(52, 152, 219, 0.5), rgba(46, 204, 113, 0.5));
  border-radius: 3px;
}

.sidebar-clientes::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(52, 152, 219, 0.7), rgba(46, 204, 113, 0.7));
}

/* Manifiesto lateral */
.sidebar-clientes {
  width: 176px !important;
  padding: 14px 10px !important;
  align-items: stretch !important;
  background:
    radial-gradient(circle at 30% 4%, rgba(56, 217, 255, .15), transparent 14rem),
    linear-gradient(180deg, rgba(12, 22, 39, .98), rgba(5, 10, 21, .98)) !important;
  border-right: 1px solid rgba(148, 163, 184, .14) !important;
  box-shadow: 18px 0 52px rgba(0, 0, 0, .33), inset -1px 0 rgba(255,255,255,.025) !important;
  backdrop-filter: blur(24px);
}

.sidebar-clientes::after {
  content: '';
  position: absolute;
  top: 0;
  right: -1px;
  width: 1px;
  height: 22%;
  background: linear-gradient(transparent, #38d9ff, transparent);
  box-shadow: 0 0 14px rgba(56, 217, 255, .75);
  animation: rail-scan 5s ease-in-out infinite;
}

.sidebar-header {
  min-height: 54px;
  margin-bottom: 14px;
  padding: 0 4px 14px;
  border-color: rgba(148, 163, 184, .12);
}

.sidebar-header h3 {
  color: #e8eef9;
  font-size: .76rem;
  font-weight: 800;
  letter-spacing: .13em;
  text-transform: uppercase;
  text-shadow: none;
}

.sidebar-header h3 i {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  color: #06101c;
  -webkit-text-fill-color: currentColor;
  font-size: .9rem;
  border-radius: 11px;
  background: linear-gradient(135deg, #b8f4ff, #38d9ff 55%, #8b5cf6);
  box-shadow: 0 0 24px rgba(56, 217, 255, .25);
}

.toggle-sidebar-btn {
  width: 30px;
  height: 30px;
  padding: 0;
  color: #91a2bc;
  border: 1px solid rgba(148, 163, 184, .16);
  border-radius: 9px;
  background: rgba(255,255,255,.035);
}

.toggle-sidebar-btn:hover {
  color: #38d9ff;
  border-color: rgba(56, 217, 255, .4);
  background: rgba(56, 217, 255, .08);
  transform: translateX(-2px);
}

.sidebar-clientes-contenido {
  gap: 9px;
  padding: 0 2px 12px;
  margin: 0;
}

.btn-nota-cliente {
  min-height: 43px;
  justify-content: flex-start;
  padding: 10px 12px 10px 15px;
  color: #dfe8f6;
  border: 1px solid rgba(148, 163, 184, .11);
  border-radius: 12px;
  background:
    linear-gradient(90deg, var(--cliente-color) 0 4px, transparent 4px),
    rgba(16, 27, 47, .68);
  box-shadow: inset 0 1px rgba(255,255,255,.035);
  font-size: .8rem;
  letter-spacing: .02em;
  text-align: left;
}

.btn-nota-cliente::before {
  left: 4px;
  width: calc(100% - 4px);
  background: linear-gradient(100deg, transparent, rgba(255,255,255,.07), transparent);
  transform: translateX(-110%);
}

.btn-nota-cliente:hover {
  opacity: 1;
  color: #fff;
  border-color: var(--cliente-color);
  background:
    linear-gradient(90deg, var(--cliente-color) 0 4px, transparent 4px),
    rgba(25, 42, 69, .9);
  box-shadow: 0 10px 25px rgba(0,0,0,.25), 0 0 18px color-mix(in srgb, var(--cliente-color) 24%, transparent);
  transform: translateX(4px);
}

.btn-nota-cliente:hover::before { transform: translateX(110%); }

.cliente-boton-contenido {
  display: flex !important;
  align-items: center;
  gap: 9px;
}

.cliente-color-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  border: 2px solid rgba(255,255,255,.55);
  border-radius: 50%;
  background: var(--cliente-color);
  box-shadow: 0 0 11px var(--cliente-color);
}

.btn-nota-cliente.activo {
  color: #fff;
  border-color: var(--cliente-color);
  background:
    linear-gradient(90deg, var(--cliente-color) 0 5px, transparent 5px),
    linear-gradient(90deg, color-mix(in srgb, var(--cliente-color) 17%, #17263e), #111d31);
  box-shadow: 0 12px 28px rgba(0,0,0,.28), 0 0 20px color-mix(in srgb, var(--cliente-color) 28%, transparent);
  transform: translateX(5px);
  animation: none;
}

.btn-nota-cliente.activo::after {
  content: '';
  position: absolute;
  right: 10px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--cliente-color);
  box-shadow: 0 0 10px var(--cliente-color);
}

.btn-agregar-cliente {
  min-height: 43px;
  margin-top: 4px;
  color: #b8f4ff;
  border: 1px dashed rgba(56, 217, 255, .34);
  border-radius: 12px;
  background: rgba(56, 217, 255, .055);
  box-shadow: none;
  text-shadow: none;
  font-size: .78rem;
}

.btn-agregar-cliente:hover {
  color: #06101c;
  border-style: solid;
  background: #38d9ff;
  box-shadow: 0 0 26px rgba(56, 217, 255, .25);
  transform: translateY(-2px);
}

.sidebar-resumen {
  width: 100%;
  margin: auto 0 0;
  padding: 12px;
  border: 1px solid rgba(56, 217, 255, .2);
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(19, 34, 57, .72), rgba(7, 15, 28, .72));
  box-shadow: inset 0 1px rgba(255,255,255,.06), 0 18px 34px rgba(0,0,0,.25), 0 0 22px rgba(56,217,255,.08);
}

.resumen-seccion { margin-bottom: 13px; }

.resumen-seccion::after {
  bottom: -7px;
  width: 100%;
  height: 1px;
  background: rgba(148, 163, 184, .1);
}

.sidebar-resumen h4 {
  justify-content: flex-start;
  margin-bottom: 7px;
  color: #8da0bd;
  font-size: .62rem;
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
  text-shadow: none;
}

.sidebar-resumen h4 i {
  color: #38d9ff;
  -webkit-text-fill-color: currentColor;
  font-size: .8rem;
}

.sidebar-item {
  margin-bottom: 4px;
  padding: 5px 7px;
  color: #91a2bc;
  border-radius: 7px;
  background: rgba(1, 5, 12, .24);
  font-size: .7rem;
}

.sidebar-item strong { color: #f3f7fd; }

.sidebar-item.total {
  margin-top: 7px;
  padding: 10px 8px;
  color: #ecfcff;
  border: 1px solid rgba(56, 217, 255, .48);
  background: linear-gradient(135deg, rgba(16,113,143,.82), rgba(8,55,76,.88));
  box-shadow: 0 7px 16px rgba(0,0,0,.22), 0 0 17px rgba(56,217,255,.14), inset 0 1px rgba(255,255,255,.13);
  font-size: .86rem;
  font-weight: 900;
}

.sidebar-item.total strong {
  color: #fff;
  font-size: 1rem;
  text-shadow: 0 0 10px rgba(184,244,255,.55);
}

.sidebar-collapsed { width: 76px !important; }
.sidebar-collapsed .sidebar-header { justify-content: center; }
.sidebar-collapsed .sidebar-header h3 { display: none; }
.sidebar-collapsed .btn-nota-cliente,
.sidebar-collapsed .btn-agregar-cliente {
  width: 48px;
  height: 48px;
  min-height: 48px;
  align-self: center;
  border-radius: 14px;
}

@keyframes rail-scan {
  0%, 100% { transform: translateY(-100%); opacity: 0; }
  20%, 80% { opacity: 1; }
  50% { transform: translateY(450%); }
}

@media (max-width: 1200px) {
  .sidebar-clientes { width: 176px !important; }
}

@media (max-width: 992px) {
  .sidebar-clientes { width: 176px !important; }
}

@media (max-width: 768px) {
  .sidebar-clientes { width: 150px !important; }
  .sidebar-collapsed { width: 64px !important; }
  .sidebar-header h3 { font-size: .65rem; }
}

@media (max-width: 576px) {
  .sidebar-clientes {
    top: auto !important;
    bottom: 0 !important;
    width: 100% !important;
    height: 78px !important;
    padding: 9px 10px !important;
    flex-direction: row !important;
    z-index: 1050;
    transform: none !important;
    border-top: 1px solid rgba(148, 163, 184, .14);
    border-right: 0 !important;
    box-shadow: 0 -16px 42px rgba(0,0,0,.36) !important;
  }

  .sidebar-clientes::after,
  .sidebar-header,
  .sidebar-resumen,
  .sidebar-toggle-mobile { display: none; }

  .sidebar-clientes-contenido {
    flex: 1;
    flex-direction: row;
    align-items: center;
    gap: 7px;
    margin: 0;
    padding: 0;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .sidebar-clientes .btn-nota-cliente,
  .sidebar-clientes.sidebar-collapsed .btn-nota-cliente {
    width: auto;
    height: 52px;
    min-width: 78px;
    min-height: 52px;
    flex: 0 0 auto;
    padding: 8px 11px;
    border-radius: 13px;
    transform: none;
  }

  .sidebar-clientes.sidebar-collapsed .btn-nota-cliente span {
    display: flex;
  }

  .sidebar-clientes .btn-agregar-cliente,
  .sidebar-clientes.sidebar-collapsed .btn-agregar-cliente {
    width: 52px;
    height: 52px;
    min-width: 52px;
    min-height: 52px;
    flex: 0 0 52px;
    margin: 0;
    padding: 0;
    border-radius: 13px;
  }

  .sidebar-clientes .btn-agregar-cliente span { display: none; }
}
</style>

<style>
/* Estilo global para ocultar sidebar cuando el menú móvil está abierto */
body.mobile-menu-open .sidebar-clientes {
  display: none !important;
  z-index: 0;
}
</style>
