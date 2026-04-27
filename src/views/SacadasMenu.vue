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
            <button @click.stop="openListaMedidasModal(sacada)" class="measures-btn">
              Medidas a sacar
            </button>
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

    <ListaMedidasPedidoModal
      :is-open="isListaMedidasModalOpen"
      :is-saving="isSavingListaMedidas"
      :sacada="selectedSacadaForMeasures"
      :on-save-lista="saveListaMedidas"
      :medidas="medidas"
      @close="closeListaMedidasModal"
      @save="saveListaMedidas"
      @medida-created="loadMedidas"
      @medida-deleted="loadMedidas"
    />
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import moment from 'moment'; // Import Moment.js
import HistorialProductoModal from '@/components/HistorialProductoModal.vue';
import ListaMedidasPedidoModal from '@/components/ListaMedidasPedidoModal.vue';
import { formatNumber } from '@/utils/formatters';

export default {
  name: 'SacadasMenu',
  components: {
    HistorialProductoModal,
    ListaMedidasPedidoModal
  },
  data() {
    return {
      sacadas: [],
      isLoading: true,
      currentPage: 1,
      itemsPerPage: 10,
      isHistorialModalOpen: false,
      proveedores: [],
      medidas: [],
      isListaMedidasModalOpen: false,
      selectedSacadaForMeasures: null,
      isSavingListaMedidas: false
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
    formatNumber,
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
            fechaTexto: this.formatDate(fecha),
            totalEntradas: data.totalEntradas || 0,
            totalSalidas: data.totalSalidas || 0,
            listaMedidasPedido: Array.isArray(data.listaMedidasPedido) ? data.listaMedidasPedido : []
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
    },
    calcularTotalCajas(listaMedidasPedido) {
      if (!Array.isArray(listaMedidasPedido)) return 0;
      return listaMedidasPedido.reduce(
        (sum, group) => sum + (group.items || []).reduce((sub, item) => sub + Number(item.cajas || 0), 0),
        0
      );
    },
    openListaMedidasModal(sacada) {
      this.selectedSacadaForMeasures = sacada;
      this.isListaMedidasModalOpen = true;
    },
    closeListaMedidasModal() {
      this.isListaMedidasModalOpen = false;
      this.selectedSacadaForMeasures = null;
    },
    async saveListaMedidas(lista, options = {}) {
      if (!this.selectedSacadaForMeasures?.id) {
        return false;
      }

      const {
        closeOnSuccess = true,
        showSuccessAlert = true
      } = options;

      this.isSavingListaMedidas = true;
      try {
        await updateDoc(doc(db, 'sacadas', this.selectedSacadaForMeasures.id), {
          listaMedidasPedido: lista
        });

        this.sacadas = this.sacadas.map((sacada) => (
          sacada.id === this.selectedSacadaForMeasures.id
            ? { ...sacada, listaMedidasPedido: lista }
            : sacada
        ));

        if (showSuccessAlert) {
          alert('Lista de medidas guardada con exito');
        }
        if (closeOnSuccess) {
          this.closeListaMedidasModal();
        }
        return true;
      } catch (error) {
        console.error('Error al guardar lista de medidas:', error);
        alert('No se pudo guardar la lista de medidas');
        return false;
      } finally {
        this.isSavingListaMedidas = false;
      }
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
  --vw-bg-1: #140a2a;
  --vw-bg-2: #2a0e4a;
  --vw-bg-3: #1a3a78;
  --vw-neon-pink: #ff4fd8;
  --vw-neon-cyan: #3ef8ff;
  --vw-neon-purple: #a855f7;
  --vw-text: #f5ecff;
  --vw-soft: rgba(245, 236, 255, 0.78);
  width: 100%;
  max-width: 850px;
  margin: 0 auto;
  padding: 16px;
  color: var(--vw-text);
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

h1 {
  margin: 0 0 4px;
  font-size: 1.5rem;
  color: var(--vw-neon-cyan);
  text-shadow: 0 0 12px rgba(62, 248, 255, 0.55);
}

h2 {
  margin: 0 0 12px;
  font-size: 1.15rem;
  color: var(--vw-neon-purple);
  text-shadow: 0 0 8px rgba(168, 85, 247, 0.45);
}

.actions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.action-button {
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  color: #0f172a;
  cursor: pointer;
  font-weight: 600;
  text-decoration: none;
  display: inline-block;
  text-align: center;
  background: linear-gradient(135deg, #3ef8ff, #2563eb);
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  box-shadow: 0 0 16px rgba(62, 248, 255, 0.35);
}

.action-button:hover {
  opacity: 0.95;
  transform: translateY(-1px);
  box-shadow: 0 0 22px rgba(62, 248, 255, 0.5);
}

.new-sacada-btn {
  background: linear-gradient(135deg, #ff4fd8, #8b5cf6);
  color: #ffffff;
  box-shadow: 0 0 16px rgba(168, 85, 247, 0.35);
}

.new-sacada-btn:hover {
  box-shadow: 0 0 22px rgba(255, 79, 216, 0.5);
}

.sacadas-list {
  background:
    linear-gradient(140deg, rgba(20, 10, 42, 0.9), rgba(42, 14, 74, 0.88) 55%, rgba(26, 58, 120, 0.86)),
    repeating-linear-gradient(
      180deg,
      rgba(255, 79, 216, 0.08) 0,
      rgba(255, 79, 216, 0.08) 1px,
      transparent 1px,
      transparent 8px
    );
  border-radius: 14px;
  padding: 16px;
  flex-grow: 1;
  border: 1px solid rgba(168, 85, 247, 0.45);
  box-shadow:
    0 0 0 1px rgba(62, 248, 255, 0.2) inset,
    0 16px 35px rgba(3, 2, 20, 0.65);
}

.loading, .no-records {
  text-align: center;
  padding: 14px;
  border-radius: 10px;
  background: rgba(16, 18, 56, 0.78);
  border: 1px solid rgba(255, 79, 216, 0.3);
  color: var(--vw-soft);
}

.sacada-item {
  background: rgba(8, 13, 40, 0.72);
  border: 1px solid rgba(62, 248, 255, 0.25);
  border-radius: 12px;
  margin-bottom: 10px;
  padding: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.12);
  transition: border-color 0.2s ease;
}

.sacada-item:hover {
  border-color: rgba(62, 248, 255, 0.5);
}

.sacada-content {
  flex-grow: 1;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.sacada-date {
  color: var(--vw-neon-cyan);
  font-weight: 700;
  font-size: 1.05em;
}

.sacada-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  font-size: 0.9em;
  color: var(--vw-soft);
}

.sacada-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.sacada-label {
  font-weight: 600;
  color: var(--vw-neon-purple);
}

.sacada-value {
  font-weight: 700;
  color: var(--vw-text);
}

.sacada-cajas-total {
  color: var(--vw-neon-cyan);
  font-size: 1.05em;
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
  gap: 8px;
}

.delete-btn {
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 600;
  background: linear-gradient(135deg, #ff5f9e, #ef4444);
  color: #ffffff;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);
}

.delete-btn:hover {
  opacity: 0.95;
  transform: translateY(-1px);
  box-shadow: 0 0 18px rgba(255, 95, 158, 0.45);
}

.measures-btn {
  border: none;
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 600;
  background: linear-gradient(135deg, #60a5fa, #22d3ee);
  color: #0f172a;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.3);
}

.measures-btn:hover {
  opacity: 0.95;
  transform: translateY(-1px);
  box-shadow: 0 0 18px rgba(96, 165, 250, 0.45);
}

@media (max-width: 600px) {
  .sacadas-menu-container {
    padding: 12px;
  }

  .actions-container {
    flex-direction: column;
  }

  .action-button {
    width: 100%;
  }

  .sacada-item {
    flex-direction: column;
    align-items: stretch;
    padding: 12px;
  }

  .sacada-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .sacada-date {
    margin-bottom: 8px;
    font-size: 1em;
  }

  .sacada-summary {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    margin-top: 4px;
  }

  .sacada-entry {
    flex-direction: column;
    align-items: flex-start;
  }

  .sacada-actions {
    margin-top: 12px;
    justify-content: flex-end;
  }
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 14px;
  gap: 8px;
}

.pagination button {
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, #64748b, #475569);
  color: #ffffff;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.2);
}

.pagination button:hover {
  opacity: 0.95;
  transform: translateY(-1px);
  box-shadow: 0 0 18px rgba(62, 248, 255, 0.3);
}

.pagination button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.pagination span {
  font-size: 0.88rem;
  color: var(--vw-soft);
  text-align: center;
  flex: 1;
}

@media (max-width: 768px) {
  .pagination {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
}
</style>