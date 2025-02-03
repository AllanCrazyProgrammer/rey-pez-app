<template>
  <div class="modal-overlay" v-if="isOpen" @click="closeModal">
    <div class="modal-content" @click.stop>
      <h2>Historial de Producto</h2>
      
      <!-- Formulario de selección -->
      <div class="form-group">
        <select v-model="filtros.tipo" @change="resetSelections">
          <option value="">Seleccionar Tipo</option>
          <option value="proveedor">Proveedor</option>
          <option value="maquila">Maquila</option>
        </select>

        <select v-model="filtros.proveedor" @change="onProveedorChange">
          <option value="">Seleccionar {{ filtros.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}</option>
          <option v-for="prov in proveedoresFiltrados" :key="prov.id" :value="prov.nombre">
            {{ prov.nombre }}
          </option>
        </select>

        <select v-model="filtros.medida">
          <option value="">Seleccionar Medida</option>
          <option v-for="medida in medidasFiltradas" :key="medida.id" :value="medida.nombre">
            {{ medida.nombre }}
          </option>
        </select>

        <select v-model="filtros.movimiento">
          <option value="">Tipo de Movimiento</option>
          <option value="entradas">Entradas</option>
          <option value="salidas">Salidas</option>
        </select>

        <button @click="buscarHistorial" :disabled="!isFormValid">Buscar</button>
      </div>

      <!-- Tabla de resultados -->
      <div class="results-container" v-if="historial.length > 0">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Kilos</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in historial" :key="index">
              <td>{{ formatDate(item.fecha) }}</td>
              <td>{{ formatNumber(item.kilos) }} kg</td>
              <td>{{ item.precio ? `$${item.precio}` : '-' }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              <td><strong>{{ formatNumber(totalKilos) }} kg</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div v-else-if="busquedaRealizada" class="no-results">
        No se encontraron registros para los criterios seleccionados.
      </div>

      <button class="close-button" @click="closeModal">&times;</button>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import moment from 'moment';

export default {
  name: 'HistorialProductoModal',
  props: {
    isOpen: {
      type: Boolean,
      required: true
    },
    proveedores: {
      type: Array,
      required: true
    },
    medidas: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      filtros: {
        tipo: '',
        proveedor: '',
        medida: '',
        movimiento: ''
      },
      historial: [],
      busquedaRealizada: false
    };
  },
  computed: {
    proveedoresFiltrados() {
      return this.proveedores.filter(p => p.tipo === this.filtros.tipo);
    },
    medidasFiltradas() {
      if (this.filtros.tipo === 'maquila') {
        const maquila = this.proveedores.find(p => p.nombre === this.filtros.proveedor);
        return maquila ? this.medidas.filter(m => m.tipo === 'maquila' && m.maquilaId === maquila.id) : [];
      } else {
        const proveedor = this.proveedores.find(p => p.nombre === this.filtros.proveedor);
        return proveedor 
          ? this.medidas.filter(m => m.proveedorId === proveedor.id || (!m.proveedorId && m.tipo === 'general'))
          : this.medidas.filter(m => m.tipo === 'general');
      }
    },
    isFormValid() {
      return this.filtros.tipo && 
             this.filtros.proveedor && 
             this.filtros.medida && 
             this.filtros.movimiento;
    },
    totalKilos() {
      return this.historial.reduce((sum, item) => sum + item.kilos, 0);
    }
  },
  methods: {
    resetSelections() {
      this.filtros.proveedor = '';
      this.filtros.medida = '';
      this.historial = [];
      this.busquedaRealizada = false;
    },
    onProveedorChange() {
      this.filtros.medida = '';
      this.historial = [];
      this.busquedaRealizada = false;
    },
    async buscarHistorial() {
      try {
        const sacadasRef = collection(db, 'sacadas');
        const q = query(sacadasRef, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        
        this.historial = [];
        querySnapshot.docs.forEach(doc => {
          const sacada = doc.data();
          const movimientos = sacada[this.filtros.movimiento] || [];
          
          movimientos.forEach(movimiento => {
            if (movimiento.tipo === this.filtros.tipo &&
                movimiento.proveedor === this.filtros.proveedor &&
                movimiento.medida === this.filtros.medida) {
              this.historial.push({
                fecha: sacada.fecha.toDate(),
                kilos: movimiento.kilos,
                precio: movimiento.precio
              });
            }
          });
        });
        
        this.busquedaRealizada = true;
      } catch (error) {
        console.error('Error al buscar historial:', error);
        alert('Error al buscar el historial');
      }
    },
    formatDate(date) {
      return moment(date).format('DD/MM/YYYY');
    },
    formatNumber(value) {
      return value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    },
    closeModal() {
      this.$emit('close');
      this.resetSelections();
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.form-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.form-group select {
  flex: 1;
  min-width: 200px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.form-group button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.form-group button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.results-container {
  margin-top: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

th, td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}

th {
  background-color: #f5f5f5;
  font-weight: bold;
}

tr:nth-child(even) {
  background-color: #f9f9f9;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.close-button:hover {
  color: #000;
}

.no-results {
  text-align: center;
  padding: 20px;
  color: #666;
}

@media (max-width: 768px) {
  .form-group {
    flex-direction: column;
  }

  .form-group select {
    width: 100%;
  }
}
</style> 