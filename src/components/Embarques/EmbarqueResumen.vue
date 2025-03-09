<template>
  <div class="resumen-embarque">
    <div class="resumen-header">
      <h2>Resumen del Embarque</h2>
      <div class="filtros">
        <div class="filtro">
          <label for="filtroTipo">Filtrar por tipo:</label>
          <select id="filtroTipo" v-model="filtroTipo" class="form-control">
            <option value="todos">Todos</option>
            <option value="limpio">Limpio</option>
            <option value="crudo">Crudo</option>
          </select>
        </div>
        <div class="filtro">
          <label for="filtroCliente">Filtrar por cliente:</label>
          <select id="filtroCliente" v-model="filtroCliente" class="form-control">
            <option value="todos">Todos</option>
            <option v-for="cliente in clientesUnicos" :key="cliente" :value="cliente">
              {{ cliente }}
            </option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="tabla-resumen">
      <table class="table table-striped table-bordered">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Tipo</th>
            <th>Talla</th>
            <th>Cantidad</th>
            <th>Kilos</th>
            <th>Precio</th>
            <th>Total</th>
            <th v-if="mostrarAcciones">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in itemsFiltrados" :key="index">
            <td>{{ item.cliente }}</td>
            <td>{{ item.tipo }}</td>
            <td>{{ item.talla }}</td>
            <td>{{ item.cantidad }}</td>
            <td>{{ item.kilos }}</td>
            <td>${{ item.precio.toFixed(2) }}</td>
            <td>${{ item.total.toFixed(2) }}</td>
            <td v-if="mostrarAcciones" class="acciones">
              <button @click="editarItem(item)" class="btn btn-sm btn-primary">
                <i class="fas fa-edit"></i>
              </button>
              <button @click="eliminarItem(item)" class="btn btn-sm btn-danger">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="totales">
            <td colspan="4" class="text-right"><strong>Totales:</strong></td>
            <td><strong>{{ calcularTotalKilos() }}</strong></td>
            <td></td>
            <td><strong>${{ calcularTotalPrecio().toFixed(2) }}</strong></td>
            <td v-if="mostrarAcciones"></td>
          </tr>
        </tfoot>
      </table>
    </div>
    
    <div class="resumen-por-cliente" v-if="mostrarResumenPorCliente">
      <h3>Resumen por Cliente</h3>
      <div class="tarjetas-resumen">
        <div 
          v-for="(resumen, cliente) in resumenPorCliente" 
          :key="cliente" 
          class="tarjeta-cliente"
          :style="{ borderColor: obtenerColorCliente(cliente) }"
        >
          <div class="tarjeta-header" :style="{ backgroundColor: obtenerColorCliente(cliente), color: obtenerColorTextoCliente(cliente) }">
            <h4>{{ formatearNombreCliente(cliente) }}</h4>
          </div>
          <div class="tarjeta-body">
            <div class="tarjeta-item">
              <span>Kilos:</span>
              <strong>{{ resumen.kilos.toFixed(2) }}</strong>
            </div>
            <div class="tarjeta-item">
              <span>Total:</span>
              <strong>${{ resumen.total.toFixed(2) }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useClienteUtils } from '@/composables/useClienteUtils';

/**
 * @component EmbarqueResumen
 * @description Muestra un resumen de los productos del embarque con opciones de filtrado
 */
export default {
  name: 'EmbarqueResumen',
  props: {
    /**
     * Lista de productos del embarque
     * @type {Array}
     * @required
     */
    items: {
      type: Array,
      required: true
    },
    /**
     * Indica si se deben mostrar las acciones de editar y eliminar
     * @type {Boolean}
     */
    mostrarAcciones: {
      type: Boolean,
      default: true
    },
    /**
     * Indica si se debe mostrar el resumen por cliente
     * @type {Boolean}
     */
    mostrarResumenPorCliente: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    // Estado local
    const filtroTipo = ref('todos');
    const filtroCliente = ref('todos');
    
    // Utilizamos el composable para obtener las funciones de utilidad
    const { obtenerColorCliente, obtenerColorTextoCliente, formatearNombreCliente } = useClienteUtils();
    
    // Clientes únicos para el filtro
    const clientesUnicos = computed(() => {
      return [...new Set(props.items.map(item => item.cliente))];
    });
    
    // Productos filtrados según los criterios seleccionados
    const itemsFiltrados = computed(() => {
      return props.items.filter(item => {
        const cumpleFiltroTipo = filtroTipo.value === 'todos' || 
          (filtroTipo.value === 'limpio' && item.tipo.toLowerCase().includes('limpio')) ||
          (filtroTipo.value === 'crudo' && item.tipo.toLowerCase().includes('crudo'));
        
        const cumpleFiltroCliente = filtroCliente.value === 'todos' || 
          item.cliente === filtroCliente.value;
        
        return cumpleFiltroTipo && cumpleFiltroCliente;
      });
    });
    
    // Resumen por cliente
    const resumenPorCliente = computed(() => {
      const resumen = {};
      
      props.items.forEach(item => {
        if (!resumen[item.cliente]) {
          resumen[item.cliente] = {
            kilos: 0,
            total: 0
          };
        }
        
        resumen[item.cliente].kilos += item.kilos;
        resumen[item.cliente].total += item.total;
      });
      
      return resumen;
    });
    
    /**
     * Calcula el total de kilos de los productos filtrados
     * @returns {String} - Total de kilos formateado
     */
    const calcularTotalKilos = () => {
      return itemsFiltrados.value.reduce((total, item) => total + item.kilos, 0).toFixed(2);
    };
    
    /**
     * Calcula el total de precio de los productos filtrados
     * @returns {Number} - Total de precio
     */
    const calcularTotalPrecio = () => {
      return itemsFiltrados.value.reduce((total, item) => total + item.total, 0);
    };
    
    return {
      filtroTipo,
      filtroCliente,
      clientesUnicos,
      itemsFiltrados,
      resumenPorCliente,
      calcularTotalKilos,
      calcularTotalPrecio,
      obtenerColorCliente,
      obtenerColorTextoCliente,
      formatearNombreCliente
    };
  },
  methods: {
    /**
     * Emite evento para editar un producto
     * @param {Object} item - Producto a editar
     */
    editarItem(item) {
      this.$emit('editar-item', item);
    },
    /**
     * Emite evento para eliminar un producto
     * @param {Object} item - Producto a eliminar
     */
    eliminarItem(item) {
      this.$emit('eliminar-item', item);
    }
  }
};
</script>

<style scoped>
.resumen-embarque {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 20px;
  margin-bottom: 30px;
}

.resumen-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.resumen-header h2 {
  margin: 0;
  color: #333;
}

.filtros {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.filtro {
  display: flex;
  flex-direction: column;
  min-width: 200px;
}

.filtro label {
  margin-bottom: 5px;
  font-weight: 500;
}

.tabla-resumen {
  overflow-x: auto;
  margin-bottom: 20px;
}

.tabla-resumen table {
  width: 100%;
  border-collapse: collapse;
}

.tabla-resumen th {
  background-color: #f8f9fa;
  padding: 12px;
  text-align: left;
  font-weight: 600;
}

.tabla-resumen td {
  padding: 12px;
  border-top: 1px solid #dee2e6;
}

.tabla-resumen .acciones {
  display: flex;
  gap: 5px;
}

.tabla-resumen .totales {
  background-color: #f1f3f5;
  font-weight: 500;
}

.resumen-por-cliente {
  margin-top: 30px;
}

.resumen-por-cliente h3 {
  margin-bottom: 15px;
  color: #333;
}

.tarjetas-resumen {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}

.tarjeta-cliente {
  border: 2px solid;
  border-radius: 8px;
  overflow: hidden;
}

.tarjeta-header {
  padding: 10px 15px;
}

.tarjeta-header h4 {
  margin: 0;
  font-size: 1.1rem;
}

.tarjeta-body {
  padding: 15px;
}

.tarjeta-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

@media (max-width: 768px) {
  .resumen-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .filtros {
    width: 100%;
  }
  
  .filtro {
    width: 100%;
  }
}
</style> 