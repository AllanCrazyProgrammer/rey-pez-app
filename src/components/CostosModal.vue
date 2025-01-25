<template>
  <div>
    <!-- Botón para abrir el modal -->
    <button @click="$emit('update:showModal', true)" class="costos-btn">
      <i class="fas fa-dollar-sign"></i> Precios
    </button>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Precios por Producto</h2>
          <button @click="cerrarModal" class="close-btn">&times;</button>
        </div>

        <!-- Formulario para agregar nuevo precio -->
        <div class="add-cost-form">
          <h3>Agregar Nuevo Producto/Precio</h3>
          <div class="form-group">
            <input v-model="newCost.medida" type="text" placeholder="Nombre del Producto" list="medidas">
            <datalist id="medidas">
              <option v-for="medida in Object.keys(costosPorMedida)" :key="medida" :value="medida"></option>
            </datalist>
            <input v-model.number="newCost.costo" type="number" placeholder="Precio" step="0.01">
            <input 
              v-model="newCost.fecha" 
              type="date" 
              :max="currentDate"
            >
            <button @click="agregarCosto" class="add-btn">Agregar</button>
          </div>
        </div>

        <!-- Lista de productos y precios -->
        <div class="current-costs">
          <h3>Precios Actuales</h3>
          <table class="costs-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Precio</th>
                <th>Fecha</th>
                <th>Historial</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(costo, medida) in costosLocales" :key="medida">
                <td>{{ medida }}</td>
                <td>
                  <input 
                    type="number" 
                    v-model.number="costosLocales[medida].costoBase"
                    @input="actualizarCostos(medida)"
                    placeholder="Precio"
                    step="0.01"
                    class="cost-input"
                  >
                </td>
                <td>
                  <input 
                    type="date" 
                    v-model="costosLocales[medida].fecha"
                    @change="actualizarCostos(medida)"
                    :max="currentDate"
                    class="date-input"
                  >
                </td>
                <td>
                  <button @click="mostrarHistorial(medida)" class="ver-btn">
                    Ver
                  </button>
                </td>
                <td>
                  <button @click="eliminarMedida(medida)" class="delete-btn" title="Eliminar producto">
                    ×
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="modal-footer">
          <button @click="guardarCostos" class="save-btn">Guardar Cambios</button>
          <button @click="cerrarModal" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal de historial -->
    <div v-if="showHistorialModal" class="historial-modal">
      <div class="historial-content">
        <div class="historial-header">
          <h3>Historial de Precios - {{ medidaSeleccionada }}</h3>
          <button @click="showHistorialModal = false" class="close-btn">&times;</button>
        </div>

        <!-- Estado de carga -->
        <div v-if="cargandoHistorial" class="estado-carga">
          <i class="fas fa-spinner fa-spin"></i>
          <span>Cargando historial...</span>
        </div>

        <!-- Mensaje de error -->
        <div v-else-if="errorHistorial" class="estado-error">
          <i class="fas fa-exclamation-circle"></i>
          <span>{{ errorHistorial }}</span>
          <button @click="mostrarHistorial(medidaSeleccionada)" class="retry-btn">
            <i class="fas fa-redo"></i> Reintentar
          </button>
        </div>

        <!-- Contenido del historial -->
        <template v-else>
          <!-- Gráfico de evolución de precios -->
          <div class="precio-evolucion">
            <div class="precio-actual">
              <span class="precio-label">Precio Actual:</span>
              <span class="precio-valor">${{ formatNumber(costosLocales[medidaSeleccionada]?.costoBase) }}</span>
            </div>
          </div>

          <table class="historial-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Precio</th>
                <th>Cambio</th>
                <th>Variación %</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(costo, index) in historialCostos" :key="index">
                <td>{{ formatDate(costo.fecha) }}</td>
                <td class="precio-celda">${{ formatNumber(costo.costoBase) }}</td>
                <td v-if="costo.cambio" :class="costo.cambio.diferencia > 0 ? 'precio-subio' : 'precio-bajo'">
                  {{ costo.cambio.diferencia > 0 ? '+' : '' }}${{ formatNumber(costo.cambio.diferencia) }}
                </td>
                <td v-else>-</td>
                <td v-if="costo.cambio" :class="costo.cambio.diferencia > 0 ? 'precio-subio' : 'precio-bajo'">
                  {{ costo.cambio.diferencia > 0 ? '+' : '' }}{{ costo.cambio.porcentaje.toFixed(2) }}%
                </td>
                <td v-else>-</td>
                <td class="actions-cell">
                  <button @click="eliminarCosto(costo.id)" class="delete-btn" title="Eliminar precio">
                    ×
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';

export default {
  name: 'CostosModal',
  
  props: {
    showModal: {
      type: Boolean,
      required: true
    },
    costosPorMedida: {
      type: Object,
      required: true
    }
  },

  data() {
    return {
      costosLocales: {},
      newCost: {
        medida: '',
        costo: null,
        fecha: new Date().toISOString().split('T')[0]
      },
      showHistorialModal: false,
      medidaSeleccionada: null,
      historialCostos: [],
      historialesPorMedida: {},
      cargandoHistorial: false,
      errorHistorial: null,
      unsubscribeCostos: null
    }
  },

  computed: {
    currentDate() {
      return new Date().toISOString().split('T')[0];
    }
  },

  async created() {
    // Iniciar la escucha de cambios en precios globales
    await this.iniciarEscuchaCostos();
  },

  beforeDestroy() {
    // Limpiar la suscripción al desmontar el componente
    if (this.unsubscribeCostos) {
      this.unsubscribeCostos();
    }
  },

  watch: {
    showModal(newVal) {
      if (newVal) {
        this.inicializarCostosLocales();
      }
    }
  },

  methods: {
    formatNumber(value) {
      if (value === null || value === undefined) return '0.00';
      return Number(value).toLocaleString('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    },

    formatDate(date) {
      if (!date) return '';
      const [year, month, day] = date.split('-');
      const fecha = new Date(year, month - 1, day);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return fecha.toLocaleDateString('es-ES', options);
    },

    calcularCambio(precioActual, precioAnterior) {
      const diferencia = precioActual - precioAnterior;
      const porcentaje = (diferencia / precioAnterior) * 100;
      const signo = diferencia > 0 ? '+' : '';
      return `${signo}${this.formatNumber(diferencia)} (${signo}${porcentaje.toFixed(1)}%)`;
    },

    inicializarCostosLocales() {
      this.costosLocales = Object.keys(this.costosPorMedida).reduce((acc, medida) => {
        acc[medida] = {
          costoBase: this.costosPorMedida[medida].costoBase || 0,
          fecha: this.costosPorMedida[medida].fecha || new Date().toISOString().split('T')[0]
        }
        return acc
      }, {})
    },

    async actualizarCostos(medida) {
      try {
        // Guardar el nuevo precio en la colección de precios globales
        const nuevoPrecio = {
          medida: medida,
          costoBase: this.costosLocales[medida].costoBase,
          fecha: this.costosLocales[medida].fecha,
          timestamp: serverTimestamp()
        };

        await addDoc(collection(db, 'precios_globales'), nuevoPrecio);

        // Guardar en el historial
        const precioHistorial = {
          medida: medida,
          costoBase: this.costosLocales[medida].costoBase,
          fecha: this.costosLocales[medida].fecha
        };

        await addDoc(collection(db, 'costos'), precioHistorial);

        // Actualizar precios en productos existentes
        await this.actualizarPreciosProductos(medida, nuevoPrecio.costoBase);

        // Recargamos el historial
        await this.cargarHistorial(medida);
      } catch (error) {
        console.error('Error al actualizar precio:', error);
        alert('Error al actualizar el precio');
      }
    },

    async agregarCosto() {
      if (!this.newCost.medida || !this.newCost.costo || !this.newCost.fecha) {
        alert('Por favor complete todos los campos');
        return;
      }

      try {
        // Guardar el precio actual en la colección de precios globales
        const precioGlobal = {
          medida: this.newCost.medida,
          costoBase: this.newCost.costo,
          fecha: this.newCost.fecha,
          timestamp: serverTimestamp()
        };

        await addDoc(collection(db, 'precios_globales'), precioGlobal);

        // Guardar en el historial
        const costoDoc = {
          medida: this.newCost.medida,
          costoBase: this.newCost.costo,
          fecha: this.newCost.fecha
        };

        await addDoc(collection(db, 'costos'), costoDoc);

        this.$set(this.costosLocales, this.newCost.medida, {
          costoBase: this.newCost.costo,
          fecha: this.newCost.fecha
        });

        // Actualizar los costos en el embarque actual
        this.actualizarCostos(this.newCost.medida);
        
        // Limpiar el formulario
        this.newCost = {
          medida: '',
          costo: null,
          fecha: new Date().toISOString().split('T')[0]
        };

      } catch (error) {
        console.error('Error al agregar precio:', error);
        alert('Error al guardar el precio');
      }
    },

    async iniciarEscuchaCostos() {
      try {
        const db = getFirestore();
        const preciosRef = collection(db, 'precios_globales');
        const q = query(preciosRef, orderBy('timestamp', 'desc'));
        
        // Crear un listener para cambios en la colección de precios globales
        this.unsubscribeCostos = onSnapshot(q, (snapshot) => {
          const preciosActuales = {};
          
          snapshot.forEach(doc => {
            const precio = doc.data();
            // Solo actualizar si es el precio más reciente para esta medida
            if (!preciosActuales[precio.medida] || 
                new Date(precio.fecha) > new Date(preciosActuales[precio.medida].fecha)) {
              preciosActuales[precio.medida] = {
                costoBase: precio.costoBase,
                fecha: precio.fecha
              };
            }
          });
          
          // Actualizar los precios locales y emitir el evento de actualización
          this.costosLocales = preciosActuales;
          this.$emit('update:costos', preciosActuales);
        });
      } catch (error) {
        console.error('Error al iniciar escucha de costos:', error);
      }
    },

    async mostrarHistorial(medida) {
      this.cargandoHistorial = true;
      this.errorHistorial = null;
      try {
        this.medidaSeleccionada = medida;
        const costosRef = collection(db, 'costos');
        const q = query(
          costosRef, 
          where('medida', '==', medida)
        );
        const snapshot = await getDocs(q);
        
        let historial = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        this.historialCostos = historial.map((costo, index) => {
          const siguiente = historial[index + 1];
          const cambio = siguiente ? {
            diferencia: costo.costoBase - siguiente.costoBase,
            porcentaje: ((costo.costoBase - siguiente.costoBase) / siguiente.costoBase) * 100
          } : null;

          return {
            ...costo,
            cambio
          };
        });
        
        this.showHistorialModal = true;
      } catch (error) {
        console.error('Error al cargar historial:', error);
        this.errorHistorial = 'Error al cargar el historial de precios. Por favor, intenta de nuevo.';
      } finally {
        this.cargandoHistorial = false;
      }
    },

    async cargarHistorial(medida) {
      try {
        const costosRef = collection(db, 'costos');
        const q = query(
          costosRef, 
          where('medida', '==', medida)
        );
        const snapshot = await getDocs(q);
        
        const historial = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        this.$set(this.historialesPorMedida, medida, historial);
      } catch (error) {
        console.error('Error al cargar historial:', error);
        alert('Error al cargar el historial de precios');
      }
    },

    async eliminarCosto(costoId) {
      if (confirm('¿Estás seguro de que deseas eliminar este precio?')) {
        try {
          await deleteDoc(doc(db, 'costos', costoId));
          
          // Actualizar el historial actual
          await this.mostrarHistorial(this.medidaSeleccionada);
          
          // Actualizar los costos locales
          await this.cargarHistorial(this.medidaSeleccionada);
          
          // Actualizar el precio actual si es necesario
          const ultimoPrecio = this.historialCostos[0];
          if (ultimoPrecio) {
            this.$set(this.costosLocales, this.medidaSeleccionada, {
              costoBase: ultimoPrecio.costoBase,
              fecha: ultimoPrecio.fecha
            });
          }
        } catch (error) {
          console.error('Error al eliminar precio:', error);
          alert('Error al eliminar el precio');
        }
      }
    },

    async eliminarMedida(medida) {
      if (confirm('¿Estás seguro de que deseas eliminar este producto y todo su historial?')) {
        try {
          const costosRef = collection(db, 'costos')
          const q = query(costosRef, where('medida', '==', medida))
          const snapshot = await getDocs(q)
          
          // Eliminar todos los documentos relacionados
          await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)))
          
          // Eliminar la medida de costosLocales
          const { [medida]: eliminado, ...restoMedidas } = this.costosLocales
          this.costosLocales = restoMedidas
          
          // Actualizar costosPorMedida
          const { [medida]: eliminadoPorMedida, ...restoCostosPorMedida } = this.costosPorMedida
          this.$emit('update:costos', restoCostosPorMedida)
        } catch (error) {
          console.error('Error al eliminar producto:', error)
          alert('Error al eliminar el producto')
        }
      }
    },

    guardarCostos() {
      const costos = Object.keys(this.costosLocales).reduce((acc, medida) => {
        acc[medida] = {
          costoBase: this.costosLocales[medida].costoBase,
          fecha: this.costosLocales[medida].fecha
        }
        return acc
      }, {})
      this.$emit('guardar', costos)
      this.cerrarModal()
    },

    cerrarModal() {
      this.$emit('update:showModal', false)
    }
  }
}
</script>

<style scoped>
.costos-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.costos-btn:hover {
  background-color: #45a049;
}

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
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.add-cost-form {
  margin-bottom: 30px;
}

.form-group {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.form-group input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
}

.add-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.costs-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  background-color: white;
}

.costs-table th,
.costs-table td {
  padding: 12px;
  border: 1px solid #ddd;
  text-align: left;
}

.costs-table th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.costs-table .cost-input,
.costs-table .date-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.costs-table td {
  vertical-align: middle;
}

.costs-table .ver-btn,
.costs-table .delete-btn {
  padding: 6px;
  margin: 0 4px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
}

.save-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.historial-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 30px;
  border-radius: 12px;
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  z-index: 1001;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.historial-content {
  text-align: center;
}

.historial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.precio-evolucion {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.precio-actual, .precio-inicial {
  display: flex;
  align-items: center;
  gap: 10px;
}

.precio-label {
  font-weight: bold;
  color: #666;
}

.precio-valor {
  font-size: 1.2em;
  font-weight: bold;
  color: #333;
}

.precio-cambio {
  font-size: 0.9em;
  padding: 4px 8px;
  border-radius: 4px;
}

.historial-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.historial-table th,
.historial-table td {
  padding: 12px 16px;
  border: 1px solid #eee;
}

.historial-table th {
  background-color: #f5f5f5;
  font-weight: bold;
  text-align: left;
}

.precio-celda {
  font-weight: bold;
  color: #333;
}

.variacion-celda {
  width: 200px;
}

.precio-subio {
  color: #dc3545;
  background-color: rgba(220, 53, 69, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
}

.precio-bajo {
  color: #28a745;
  background-color: rgba(40, 167, 69, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
}

.actions-cell {
  width: 50px;
  text-align: center;
}

.estado-carga,
.estado-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  gap: 1rem;
  color: #666;
}

.estado-error {
  color: #dc3545;
}

.estado-carga i,
.estado-error i {
  font-size: 2rem;
}

.retry-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 1rem;
}

.retry-btn:hover {
  background-color: #5a6268;
}

.ver-btn {
  background: none;
  border: none;
  color: #0066cc;
  text-decoration: underline;
  cursor: pointer;
  padding: 4px 8px;
  font-size: 14px;
  display: inline-block;
}

.ver-btn:hover {
  color: #0052a3;
}

.delete-btn {
  background: none;
  border: none;
  color: #dc3545;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
  display: inline-block;
}

.delete-btn:hover {
  color: #c82333;
}

.costs-table td,
.historial-table td {
  vertical-align: middle;
  text-align: center;
}

.costs-table th,
.historial-table th {
  text-align: center;
  background-color: #f5f5f5;
  font-weight: bold;
}

/* Excepción para columnas que necesitan alineación a la izquierda */
.costs-table td:first-child,
.costs-table th:first-child,
.historial-table td:first-child,
.historial-table th:first-child {
  text-align: left;
}

.costs-table .cost-input,
.costs-table .date-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
}

.actions-cell {
  width: 50px;
  text-align: center;
}

@media (max-width: 600px) {
  .form-group {
    flex-direction: column;
  }
  
  .costs-table {
    font-size: 14px;
  }
  
  .costs-table th,
  .costs-table td {
    padding: 8px;
  }
  
  .modal-content {
    width: 95%;
    padding: 15px;
  }
  
  .cost-input-group,
  .cost-date {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .cost-input {
    width: 100%;
  }

  .historial-modal {
    width: 95%;
    padding: 15px;
  }

  .historial-content table {
    font-size: 14px;
  }

  .historial-content th,
  .historial-content td {
    padding: 8px;
  }
}
</style> 