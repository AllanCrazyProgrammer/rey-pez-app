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
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy, Timestamp, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { indexedDBService } from '@/services/indexedDB';

export default {
  name: 'SacadasMenu',
  data() {
    return {
      sacadas: [],
      isLoading: true,
      isOnline: navigator.onLine
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
        if (this.isOnline) {
          // Cargar datos de Firebase
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
          // Guardar en IndexedDB
          await indexedDBService.saveSacadas(this.sacadas);
        } else {
          // Cargar datos de IndexedDB (ya ordenados)
          this.sacadas = await indexedDBService.getSacadas();
        }
      } catch (error) {
        console.error("Error al cargar sacadas: ", error);
        // Intentar cargar desde IndexedDB en caso de error
        this.sacadas = await indexedDBService.getSacadas();
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
    async editSacada(id) {
  try {
    // Primero, intentamos cargar la sacada desde IndexedDB
    const sacada = await indexedDBService.getSacada(id);
    if (sacada) {
      this.$router.push(`/sacadas/${id}`);
    } else if (this.isOnline) {
      // Si no está en IndexedDB y estamos online, intentamos cargarla de Firebase
      const docRef = doc(db, 'sacadas', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        // Si existe en Firebase, la guardamos en IndexedDB antes de navegar
        await indexedDBService.saveSacada({ id, ...docSnap.data() });
        this.$router.push(`/sacadas/${id}`);
      } else {
        console.error("No se encontró la sacada");
        alert("No se encontró la sacada");
      }
    } else {
      console.error("No se pudo cargar la sacada");
      alert("No se pudo cargar la sacada. Verifica tu conexión a internet.");
    }
  } catch (error) {
    console.error("Error al editar la sacada:", error);
    alert("Ocurrió un error al intentar editar la sacada");
  }
},
    async deleteSacada(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de sacadas?')) {
        try {
          if (this.isOnline) {
            await deleteDoc(doc(db, 'sacadas', id));
          }
          await indexedDBService.deleteSacada(id);
          this.sacadas = this.sacadas.filter(sacada => sacada.id !== id);
          alert('Registro de sacadas borrado con éxito');
        } catch (error) {
          console.error("Error al borrar el registro de sacadas: ", error);
          alert('Error al borrar el registro de sacadas');
        }
      }
    },
    updateOnlineStatus() {
      this.isOnline = navigator.onLine;
      if (this.isOnline) {
        this.syncWithFirebase();
      }
    },
    async syncWithFirebase() {
      try {
        const localSacadas = await indexedDBService.getSacadas();
        const sacadasCollection = collection(db, 'sacadas');
        
        for (const sacada of localSacadas) {
          await setDoc(doc(sacadasCollection, sacada.id), {
            ...sacada,
            fecha: new Date(sacada.fecha) // Aseguramos que la fecha sea un objeto Date
          }, { merge: true });
        }
        
        console.log('Sincronización con Firebase completada');
      } catch (error) {
        console.error('Error al sincronizar con Firebase:', error);
      }
    }
  },
  mounted() {
    this.loadSacadas();
    window.addEventListener('online', this.updateOnlineStatus);
    window.addEventListener('offline', this.updateOnlineStatus);
  },
  beforeDestroy() {
    window.removeEventListener('online', this.updateOnlineStatus);
    window.removeEventListener('offline', this.updateOnlineStatus);
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