<template>
  <div class="crudo-card" :class="{'card-blocked': disabled}">
    <div class="crudo-header">
      <h4 class="crudo-title">Crudos</h4>
      
      <div class="crudo-items">
        <div v-for="(item, index) in items" :key="'item-'+index" class="crudo-item">
          <div class="crudo-talla-container">
            <button 
              @click="togglePrecio(index)" 
              class="btn-precio"
              :class="{ 'tiene-precio': item.precio > 0 }"
              :disabled="disabled"
            >
              $
            </button>
            
            <select 
              v-model="item.medida" 
              class="form-control talla-select"
              @change="onTallaCrudoChange(item)"
              :disabled="disabled"
            >
              <option value="">Elige talla</option>
              <option value="Med c/c">Med c/c</option>
              <option value="Med-Esp c/c">Med-Esp c/c</option>
              <option value="Med-gde c/c">Med-gde c/c</option>
              <option value="Gde c/c">Gde c/c</option>
              <option value="Gde c/ Extra">Gde c/ Extra c/c</option>
              <option value="Extra c/c">Extra c/c</option>
              <option value="Jumbo c/c">Jumbo c/c</option>
              <option value="Linea">Linea</option>
              <option value="Lag gde c/c">Lag gde c/c</option>
              <option value="Rechazo">Rechazo</option>
            </select>
            
            <span v-if="item.precio" class="precio-tag">${{ item.precio }}</span>
            
            <input 
              type="text" 
              v-model="item.barco" 
              class="form-control barco-input" 
              placeholder="Barco"
              :disabled="disabled"
            >
          </div>
          
          <div class="crudo-taras-container">
            <div class="taras-wrapper">
              <input 
                type="text" 
                v-model="item.taras" 
                class="form-control taras-input" 
                placeholder="Taras"
                @input="actualizarTotalTaras"
                :disabled="disabled"
              >
              <input 
                v-if="item.mostrarSobrante"
                type="text" 
                v-model="item.sobrante" 
                class="form-control taras-input" 
                placeholder="Sbrte"
                @input="actualizarTotalTaras"
                :disabled="disabled"
              >
            </div>
            <div class="buttons-wrapper">
              <button 
                type="button" 
                @click="eliminarItem(index)" 
                class="btn btn-danger btn-sm eliminar-crudo-item" 
                :disabled="disabled"
              >
                -
              </button>
              <button 
                type="button" 
                @click="toggleSobrante(index)" 
                class="btn btn-success btn-sm agregar-sobrante" 
                :disabled="disabled"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="crudo-footer">
        <button 
          type="button" 
          @click="agregarItem" 
          class="btn btn-primary btn-sm agregar-crudo-item" 
          :disabled="disabled"
        >
          + Agregar Talla/Taras
        </button>
        <button 
          v-if="items.length > 0"
          type="button" 
          @click="guardarCrudos" 
          class="btn btn-success btn-sm guardar-crudo" 
          :disabled="disabled || !hayDatosParaGuardar"
        >
          Guardar Cambios
        </button>
        <div class="total-crudos">Total de taras: {{ totalTaras }}</div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * @component CrudosCard
 * @description Componente para mostrar y editar los productos crudos de embarque
 */
export default {
  name: 'CrudosCard',
  props: {
    /**
     * Lista de productos crudos
     */
    productosCrudos: {
      type: Array,
      default: () => []
    },
    /**
     * ID del cliente actualmente seleccionado
     */
    clienteActivo: {
      type: String,
      default: ''
    },
    /**
     * Fecha del embarque
     */
    fecha: {
      type: String,
      default: ''
    },
    /**
     * Indica si la tarjeta está en modo edición
     */
    modoEdicion: {
      type: Boolean,
      default: false
    },
    /**
     * Producto que se está editando
     */
    productoEditando: {
      type: Object,
      default: null
    },
    /**
     * Indica si los campos están deshabilitados
     */
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      items: [],
      totalTaras: 0
    };
  },
  computed: {
    hayDatosParaGuardar() {
      return this.items.some(item => 
        item.medida && 
        item.barco && 
        item.taras
      );
    }
  },
  methods: {
    togglePrecio(index) {
      if (this.disabled) return;
      const item = this.items[index];
      item.precio = item.precio > 0 ? 0 : 1;
    },
    
    onTallaCrudoChange(item) {
      item.mostrarSobrante = false;
      item.sobrante = null;
    },
    
    toggleSobrante(index) {
      const item = this.items[index];
      item.mostrarSobrante = !item.mostrarSobrante;
      if (!item.mostrarSobrante) {
        item.sobrante = null;
      } else {
        item.sobrante = '';
      }
      this.actualizarTotalTaras();
    },
    
    agregarItem() {
      this.items.push({
        medida: '',
        barco: '',
        taras: '',
        sobrante: '',
        mostrarSobrante: false,
        precio: 0
      });
    },
    
    eliminarItem(index) {
      this.items.splice(index, 1);
      this.actualizarTotalTaras();
    },
    
    actualizarTotalTaras() {
      let total = 0;
      
      this.items.forEach(item => {
        if (item.taras) {
          const [cantidad] = item.taras.split('-');
          total += parseInt(cantidad) || 0;
        }
        if (item.mostrarSobrante && item.sobrante) {
          const [cantidad] = item.sobrante.split('-');
          total += parseInt(cantidad) || 0;
        }
      });
      
      this.totalTaras = total;
    },
    
    guardarCrudos() {
      if (!this.clienteActivo) {
        this.$emit('error', 'Debe seleccionar un cliente antes de agregar productos');
        return;
      }
      
      const crudos = this.items.map(item => {
        const [cantidadTaras, medidaTaras] = (item.taras || '').split('-');
        const [cantidadSobrante, medidaSobrante] = (item.sobrante || '').split('-');
        
        const kilosTaras = parseInt(cantidadTaras) * (parseInt(medidaTaras) === 19 ? 20 : parseInt(medidaTaras) || 0);
        const kilosSobrante = item.mostrarSobrante && cantidadSobrante ? 
          parseInt(cantidadSobrante) * (parseInt(medidaSobrante) === 19 ? 20 : parseInt(medidaSobrante) || 0) : 0;
        
        return {
          cliente: this.clienteActivo,
          tipo: 'crudo',
          medida: item.medida,
          talla: item.medida,
          barco: item.barco,
          taras: item.taras || '',
          mostrarSobrante: item.mostrarSobrante,
          sobrante: item.mostrarSobrante ? (item.sobrante || '') : null,
          kilosTotales: kilosTaras + kilosSobrante,
          precio: item.precio,
          total: item.precio > 0 ? (kilosTaras + kilosSobrante) * item.precio : 0,
          fecha: this.fecha,
          timestamp: new Date().toISOString()
        };
      });
      
      this.$emit('agregar-crudo', crudos);
      
      // Limpiar formulario
      this.items = [];
      this.actualizarTotalTaras();
    },
    
    cargarProductosCrudos() {
      if (!this.productosCrudos || !this.productosCrudos.length) {
        this.items = [];
        return;
      }
      
      this.items = this.productosCrudos.map(crudo => ({
        medida: crudo.medida || crudo.talla || '',
        barco: crudo.barco || '',
        taras: crudo.taras || '',
        sobrante: crudo.sobrante || '',
        mostrarSobrante: crudo.mostrarSobrante || false,
        precio: crudo.precio || 0
      }));
      
      this.actualizarTotalTaras();
    }
  },
  mounted() {
    if (this.modoEdicion && this.productoEditando) {
      this.cargarProductosCrudos();
    } else {
      this.cargarProductosCrudos();
    }
  },
  watch: {
    productosCrudos: {
      handler: 'cargarProductosCrudos',
      immediate: true,
      deep: true
    }
  }
};
</script>

<style scoped>
.crudo-card {
  width: 100%;
  max-width: 33.333%;
  min-width: 300px;
  border: 2px solid #007bff;
  border-radius: 8px;
  padding: 15px;
  background-color: white;
  position: relative;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  margin: 0 10px 20px;
  flex: 1;
}

.card-blocked {
  opacity: 0.7;
  pointer-events: none;
}

.crudo-header {
  display: flex;
  flex-direction: column;
}

.crudo-title {
  color: #007bff;
  text-align: center;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 15px;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 10px;
}

.crudo-items {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.crudo-item {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 10px;
}

.crudo-talla-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.btn-precio {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f8f9fa;
  border: 1px solid #ced4da;
  border-radius: 4px;
  color: #495057;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-precio.tiene-precio {
  background-color: #28a745;
  color: white;
  border-color: #28a745;
}

.talla-select {
  flex: 2;
}

.barco-input {
  flex: 1;
}

.precio-tag {
  background-color: #28a745;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
}

.crudo-taras-container {
  display: flex;
  gap: 10px;
}

.taras-wrapper {
  flex: 1;
  display: flex;
  gap: 10px;
}

.taras-input {
  flex: 1;
  text-align: center;
}

.buttons-wrapper {
  display: flex;
  gap: 5px;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 0.875rem;
}

.crudo-footer {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #dee2e6;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.total-crudos {
  text-align: center;
  font-weight: 600;
  color: #495057;
  margin-top: 10px;
}

/* Estilos responsivos */
@media (max-width: 1200px) {
  .crudo-card {
    max-width: 50%;
  }
}

@media (max-width: 768px) {
  .crudo-card {
    max-width: 100%;
    margin: 0 0 20px;
  }
  
  .crudo-talla-container {
    flex-wrap: wrap;
  }
  
  .btn-precio {
    order: 1;
  }
  
  .talla-select {
    order: 2;
    flex: 1 0 100%;
  }
  
  .precio-tag {
    order: 3;
  }
  
  .barco-input {
    order: 4;
    flex: 1 0 100%;
  }
  
  .crudo-taras-container {
    flex-direction: column;
  }
  
  .buttons-wrapper {
    justify-content: flex-end;
  }
}
</style> 