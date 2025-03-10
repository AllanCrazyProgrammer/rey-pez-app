<template>
  <div class="resumen-embarque">
    <div class="resumen-header">
      <h2>Resumen del Embarque</h2>
      <div class="filtros">
        <div class="filtro">
          <label for="filtroTipo">Filtrar por tipo:</label>
          <select id="filtroTipo" v-model="filtroTipo" class="form-control">
            <option value="todos">Todos</option>
            <option value="S/H20">S/H20</option>
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
            <th>Detalle</th>
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
            <td>
              <span v-if="item.tipo === 'crudo'">
                {{ item.barco || 'Med' }} {{ item.medida || 'c/c' }}
              </span>
              <span v-else>
                {{ item.talla || '-' }}
              </span>
            </td>
            <td>{{ formatearCantidad(item) }}</td>
            <td>{{ formatearKilos(item) }}</td>
            <td>${{ (item.precio || 0).toFixed(2) }}</td>
            <td>${{ (item.total || 0).toFixed(2) }}</td>
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
    
    <div class="resumen-por-cliente" v-if="mostrarResumenPorCliente && clientesUnicos.length > 0">
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

/**
 * @component EmbarqueResumen
 * @description Muestra un resumen de todos los productos agregados al embarque
 */
export default {
  name: 'EmbarqueResumen',
  props: {
    /**
     * Lista de items del embarque
     */
    items: {
      type: Array,
      required: true
    },
    /**
     * Indica si se muestran las acciones de edición/eliminación
     */
    mostrarAcciones: {
      type: Boolean,
      default: true
    }
  },
  setup(props, { emit }) {
    // Filtros para la tabla
    const filtroTipo = ref('todos');
    const filtroCliente = ref('todos');
    const mostrarResumenPorCliente = ref(true);
    
    // Clientes únicos para el filtro
    const clientesUnicos = computed(() => {
      return [...new Set(props.items.map(item => item.cliente))];
    });
    
    // Items filtrados según los criterios
    const itemsFiltrados = computed(() => {
      return props.items.filter(item => {
        // Filtrar por tipo
        const tipoMatch = filtroTipo.value === 'todos' || 
          (filtroTipo.value === 'S/H20' && (item.tipo === 'S/H20' || item.tipo.toLowerCase() === 's/h20')) ||
          (filtroTipo.value === 'crudo' && (item.tipo === 'crudo' || item.tipo.toLowerCase() === 'crudo'));
        
        // Filtrar por cliente
        const clienteMatch = filtroCliente.value === 'todos' || item.cliente === filtroCliente.value;
        
        return tipoMatch && clienteMatch;
      });
    });
    
    // Resumen por cliente para las tarjetas
    const resumenPorCliente = computed(() => {
      const resumen = {};
      
      props.items.forEach(item => {
        if (!resumen[item.cliente]) {
          resumen[item.cliente] = {
            kilos: 0,
            total: 0
          };
        }
        
        resumen[item.cliente].kilos += Number(item.kilosTotales || 0);
        resumen[item.cliente].total += Number(item.total || 0);
      });
      
      return resumen;
    });
    
    // Calcular el total de kilos
    const calcularTotalKilos = () => {
      return itemsFiltrados.value.reduce((total, item) => {
        return total + Number(item.kilosTotales || 0);
      }, 0).toFixed(2);
    };
    
    // Calcular el total de precio
    const calcularTotalPrecio = () => {
      return itemsFiltrados.value.reduce((total, item) => {
        return total + Number(item.total || 0);
      }, 0);
    };
    
    // Formatear el nombre del cliente para mostrar
    const formatearNombreCliente = (cliente) => {
      if (!cliente) return '';
      
      // Mapeo de IDs numéricos a nombres de clientes
      const clienteIdToName = {
        '0': 'Catarro',
        '1': 'Joselito',
        '2': 'Otilio',
        '3': 'Ozuna',
        0: 'Catarro',
        1: 'Joselito',
        2: 'Otilio',
        3: 'Ozuna'
      };
      
      // Si el cliente es un número o string que parece un número, buscar en el mapeo
      if (clienteIdToName[cliente]) {
        return clienteIdToName[cliente];
      }
      
      return cliente.charAt(0).toUpperCase() + cliente.slice(1).toLowerCase();
    };
    
    // Obtener color para el cliente
    const obtenerColorCliente = (cliente) => {
      // Normalizar el nombre del cliente
      const nombreNormalizado = formatearNombreCliente(cliente).toLowerCase();
      
      // Colores predefinidos por cliente
      const coloresClientes = {
        'catarro': '#e74c3c', // Rojo
        'joselito': '#3498db', // Azul
        'ozuna': '#2ecc71',   // Verde
        'otilio': '#f1c40f'   // Amarillo
      };
      
      // Retornar el color del cliente o un color por defecto
      return coloresClientes[nombreNormalizado] || '#6c757d';
    };
    
    // Obtener color del texto según el color de fondo
    const obtenerColorTextoCliente = (cliente) => {
      // Normalizar el nombre del cliente
      const nombreNormalizado = formatearNombreCliente(cliente).toLowerCase();
      
      // Para el cliente Otilio (amarillo) usamos texto negro, para los demás texto blanco
      return nombreNormalizado === 'otilio' ? '#333333' : '#FFFFFF';
    };
    
    // Obtener el formato de cantidad para mostrar
    const formatearCantidad = (item) => {
      if (item.tipo === 'crudo') {
        return item.taras || (item.tarasKilos && item.tarasKilos.length > 0 ? item.tarasKilos[0].tara : '-');
      } else if (item.tarasKilos && Array.isArray(item.tarasKilos)) {
        return item.tarasKilos.reduce((sum, tk) => sum + (Number(tk.tara) || 0), 0);
      } else {
        return '-';
      }
    };
    
    // Obtener kilos para mostrar
    const formatearKilos = (item) => {
      return (Number(item.kilosTotales) || 0).toFixed(2);
    };
    
    // Manejar la edición de un item
    const editarItem = (item) => {
      emit('editar-item', item);
    };
    
    // Manejar la eliminación de un item
    const eliminarItem = (item) => {
      emit('eliminar-item', item);
    };
    
    return {
      filtroTipo,
      filtroCliente,
      mostrarResumenPorCliente,
      clientesUnicos,
      itemsFiltrados,
      resumenPorCliente,
      calcularTotalKilos,
      calcularTotalPrecio,
      formatearNombreCliente,
      obtenerColorCliente,
      obtenerColorTextoCliente,
      formatearCantidad,
      formatearKilos,
      editarItem,
      eliminarItem
    };
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