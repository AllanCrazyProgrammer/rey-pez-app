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
    </div>

    <div class="sacadas-list">
      <h2>Registros de Sacadas</h2>
      <div v-if="isLoading" class="loading">Cargando registros...</div>
      <div v-else-if="sacadas.length === 0" class="no-records">
        No hay registros de sacadas.
      </div>
      <ul v-else>
        <li v-for="sacada in sacadas" :key="sacada.id" class="sacada-item">
          <div class="sacada-content" @click="editSacada(sacada.id)">
            <span class="sacada-date">{{ formatDate(sacada.fecha) }}</span>
            <div class="sacada-summary">
              <span>Entradas: {{ formatNumber(sacada.totalEntradas) }} kg</span>
              <span>Salidas: {{ formatNumber(sacada.totalSalidas) }} kg</span>
            </div>
          </div>
          <div class="sacada-actions">
            <button @click.stop="deleteSacada(sacada.id)" class="delete-btn">Borrar</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy, Timestamp, deleteDoc, doc } from 'firebase/firestore';

export default {
  name: 'SacadasMenu',
  data() {
    return {
      sacadas: [],
      isLoading: true
    };
  },
  methods: {
    convertToDate(dateField) {
      if (dateField instanceof Timestamp) {
        return dateField.toDate();
      } else if (dateField && typeof dateField.toDate === 'function') {
        return dateField.toDate();
      } else if (dateField && dateField.seconds) {
        return new Date(dateField.seconds * 1000);
      } else if (dateField instanceof Date) {
        return dateField;
      } else if (typeof dateField === 'string') {
        return new Date(dateField);
      }
      return null;
    },
    async loadSacadas() {
      try {
        this.isLoading = true;
        const sacadasCollection = collection(db, 'sacadas');
        const q = query(sacadasCollection, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        this.sacadas = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            fecha: this.convertToDate(data.fecha),
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
      if (!(date instanceof Date) || isNaN(date)) {
        return 'Fecha no disponible';
      }
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    formatNumber(value) {
      return (value || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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
    }
  },
  mounted() {
    this.loadSacadas();
  }
};
</script>



<style scoped>
.sacadas-menu-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px); /* Ajusta 160px según la altura de tu navbar + footer */
  display: flex;
  flex-direction: column;
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
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sacada-content {
  flex-grow: 1;
  cursor: pointer;
}

.sacada-date {
  color: #3760b0;
  font-weight: bold;
  font-size: 1.1em;
}

.sacada-summary {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 0.9em;
  color: #666;
}

.sacada-actions {
  display: flex;
  align-items: center;
}

.delete-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
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
  }

  .sacada-summary {
    flex-direction: column;
  }

  .sacada-actions {
    margin-top: 10px;
    justify-content: flex-end;
  }
}
</style>