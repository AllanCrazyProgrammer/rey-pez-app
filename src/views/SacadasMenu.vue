<template>
  <div class="sacadas-menu-container">
    <h1>Menú de Sacadas</h1>
    
    <div class="actions-container">
      <router-link to="/sacadas/new" class="action-button new-sacada-btn">
        Nueva Sacada
      </router-link>
      <router-link to="/gestionar-productos" class="action-button">
        Gestionar Productos
      </router-link>
      <button @click="showHistorialModal" class="action-button">
        Ver Historial de Productos
      </button>
    </div>

    <div class="sacadas-list">
      <h2>Registros de Sacadas</h2>
      <div v-if="isLoading" class="loading">Cargando registros...</div>
      <div v-else-if="sacadas.length === 0" class="no-records">
        No hay registros de sacadas.
      </div>
      <ul v-else>
        <li v-for="sacada in paginatedSacadas" :key="sacada.id" class="sacada-item">
          <div class="sacada-content" @click="editSacada(sacada.id)">
            <span class="sacada-date">{{ formatDate(sacada.fecha) }}</span>
            <div class="sacada-summary">
              <div class="sacada-entry">
                <span class="sacada-label">Entradas:</span>
                <span class="sacada-value">{{ formatNumber(sacada.totalEntradas) }} kg</span>
              </div>
              <div class="sacada-entry">
                <span class="sacada-label">Salidas:</span>
                <span class="sacada-value">{{ formatNumber(sacada.totalSalidas) }} kg</span>
              </div>
            </div>
          </div>
          <div class="sacada-actions">
            <button @click.stop="deleteSacada(sacada.id)" class="delete-btn">Borrar</button>
          </div>
        </li>
      </ul>
      
      <!-- Agregar paginación -->
      <div class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1">Anterior</button>
        <span>Página {{ currentPage }} de {{ totalPages }}</span>
        <button @click="nextPage" :disabled="currentPage === totalPages">Siguiente</button>
      </div>
    </div>

    <HistorialProductoModal 
      :is-open="isHistorialModalOpen"
      :proveedores="proveedores"
      :medidas="medidas"
      @close="closeHistorialModal"
    />
  </div>
</template>

<script>
import { formatDate, parseDate } from '@/utils/dateUtils';
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import moment from 'moment'; // Import Moment.js
import HistorialProductoModal from '@/components/HistorialProductoModal.vue';

export default {
  name: 'SacadasMenu',
  components: {
    HistorialProductoModal
  },
  data() {
    return {
      sacadas: [],
      isLoading: true,
      currentPage: 1,
      itemsPerPage: 10,
      isHistorialModalOpen: false,
      proveedores: [],
      medidas: []
    };
  },
  computed: {
    paginatedSacadas() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.sacadas.slice(start, end);
    },
    totalPages() {
      return Math.ceil(this.sacadas.length / this.itemsPerPage);
    }
  },
  methods: {
    async loadSacadas() {
      try {
        this.isLoading = true;
        const sacadasCollection = collection(db, 'sacadas');
        const q = query(sacadasCollection, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        this.sacadas = querySnapshot.docs.map(doc => {
          const data = doc.data();
          let fecha;
          if (data.fecha instanceof Date) {
            fecha = moment(data.fecha).toDate(); // Use Moment.js to handle dates
          } else if (data.fecha && typeof data.fecha.toDate === 'function') {
            fecha = moment(data.fecha.toDate()).toDate(); // Use Moment.js to handle dates
          } else {
            fecha = moment(data.fecha).toDate(); // Use Moment.js to handle dates
          }
          // Ajustar la fecha para la zona horaria local
          fecha = moment(fecha).toDate(); // Use Moment.js to handle dates
          return {
            id: doc.id,
            ...data,
            fecha: fecha,
            totalEntradas: data.totalEntradas || 0,
            totalSalidas: data.totalSalidas || 0
          };
        });
      } catch (error) {
        console.error("Error al cargar sacadas: ", error);
        this.sacadas = [];
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(date) {
      return moment(date).format('DD [de] MMMM [de] YYYY');
    },
    formatNumber(value) {
      return (value || 0).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    },
    editSacada(id) {
      this.$router.push(`/sacadas/${id}`);
    },
    async deleteSacada(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de sacadas?')) {
        try {
          await deleteDoc(doc(db, 'sacadas', id));
          this.sacadas = this.sacadas.filter(sacada => sacada.id !== id);
          alert('Registro de sacadas borrado con éxito');
        } catch (error) {
          console.error("Error al borrar el registro de sacadas: ", error);
          alert('Error al borrar el registro de sacadas');
        }
      }
    },
    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
      }
    },
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
      }
    },
    async loadProveedores() {
      try {
        const querySnapshot = await getDocs(collection(db, 'proveedores'));
        this.proveedores = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
      }
    },
    async loadMedidas() {
      try {
        const querySnapshot = await getDocs(collection(db, 'medidas'));
        this.medidas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error al cargar medidas:', error);
      }
    },
    showHistorialModal() {
      this.isHistorialModalOpen = true;
    },
    closeHistorialModal() {
      this.isHistorialModalOpen = false;
    }
  },
  async mounted() {
    await Promise.all([
      this.loadSacadas(),
      this.loadProveedores(),
      this.loadMedidas()
    ]);
  }
};
</script>

<style scoped>
.sacadas-menu-container {
  max-width: 800px; /* Aumentamos aún más el ancho máximo */
  width: 95%; /* Establecemos un ancho relativo */
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px); /* Ajusta 160px según la altura de tu navbar + footer */
  display: flex;
  flex-direction: column;
}

@media (max-width: 1400px) {
  .sacadas-menu-container {
    width: 95%; /* Mantenemos el ancho relativo para pantallas más pequeñas */
  }
}

h1, h2 {
  color: #3760b0;
}

.actions-container {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.action-button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.action-button:hover {
  background-color: #2a4a87;
}

.sacadas-list {
  background-color: #f0f4f8;
  border-radius: 8px;
  padding: 20px;
  flex-grow: 1;
  width: 100%; /* Aseguramos que ocupe todo el ancho disponible */
}

.loading, .no-records {
  text-align: center;
  color: #666;
  padding: 20px;
}

.sacada-item {
  background-color: white;
  border-radius: 4px;
  margin-bottom: 10px;
  padding: 20px; /* Aumentamos el padding */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sacada-content {
  flex-grow: 1;
  cursor: pointer;
  display: flex; /* Añadimos display flex */
  justify-content: space-between; /* Distribuimos el contenido */
  align-items: center; /* Alineamos verticalmente */
  width: 100%; /* Aseguramos que ocupe todo el ancho disponible */
}

.sacada-date {
  color: #3760b0;
  font-weight: bold;
  font-size: 1.1em;
}

.sacada-summary {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 10px;
  font-size: 0.9em;
  color: #666;
}

.sacada-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sacada-label {
  font-weight: bold;
  color: #3760b0;
}

.sacada-value {
  font-weight: bold;
}

@media (min-width: 600px) {
  .sacada-summary {
    flex-direction: row;
    justify-content: space-between;
    gap: 20px;
  }
}

.sacada-actions {
  display: flex;
  align-items: center;
}

.delete-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 8px 12px; /* Aumentamos el padding */
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  margin-left: 10px; /* Añadimos un margen izquierdo para separarlo del contenido */
}

.delete-btn:hover {
  background-color: #d32f2f;
}

@media (max-width: 600px) {
  .actions-container {
    flex-direction: column;
  }

  .action-button {
    width: 100%;
    margin-bottom: 10px;
  }

  .sacada-item {
    flex-direction: column;
    align-items: stretch;
    padding: 15px;
  }

  .sacada-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .sacada-date {
    margin-bottom: 10px;
    font-size: 1em;
  }

  .sacada-summary {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    margin-top: 5px;
  }

  .sacada-entry {
    flex-direction: column;
    align-items: flex-start;
  }

  .sacada-label {
    font-size: 1em;
  }

  .sacada-value {
    font-size: 1em;
  }

  .sacada-actions {
    margin-top: 15px;
    justify-content: flex-end;
  }

  .delete-btn {
    padding: 6px 10px;
    font-size: 0.8em;
  }
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}

.pagination button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  margin: 0 10px;
}

.pagination button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.pagination span {
  font-weight: bold;
}
</style>