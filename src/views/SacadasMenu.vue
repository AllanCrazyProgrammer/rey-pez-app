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
        <div v-if="loading" class="loading">Cargando registros...</div>
        <div v-else-if="sacadas.length === 0" class="no-records">
          No hay registros de sacadas.
        </div>
        <ul v-else>
          <li v-for="sacada in sacadas" :key="sacada.id" class="sacada-item">
            <router-link :to="`/sacadas/${sacada.id}`" class="sacada-link">
              {{ formatDate(sacada.fecha) }}
            </router-link>
            <div class="sacada-summary">
              <span>Entradas: {{ formatNumber(sacada.totalEntradas) }} kg</span>
              <span>Salidas: {{ formatNumber(sacada.totalSalidas) }} kg</span>
              <span>Balance: {{ formatNumber(sacada.balance) }} kg</span>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, onMounted } from 'vue';
  import { db } from '@/firebase';
  import { collection, getDocs, query, orderBy } from 'firebase/firestore';
  
  export default {
    name: 'SacadasMenu',
 
    setup() {
      const sacadas = ref([]);
      const loading = ref(true);
  
      const loadSacadas = async () => {
        try {
          const sacadasCollection = collection(db, 'sacadas');
          const q = query(sacadasCollection, orderBy('fecha', 'desc'));
          const querySnapshot = await getDocs(q);
          sacadas.value = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (error) {
          console.error("Error al cargar sacadas: ", error);
        } finally {
          loading.value = false;
        }
      };
  
      const formatDate = (date) => {
        return new Date(date).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };
  
      const formatNumber = (value) => {
        return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      };
  
      onMounted(loadSacadas);
  
      return {
        sacadas,
        loading,
        formatDate,
        formatNumber
      };
    }
  };
  </script>
  
  <style scoped>
  .sacadas-menu-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
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
  }
  
  .sacada-link {
    color: #3760b0;
    font-weight: bold;
    text-decoration: none;
    font-size: 1.1em;
  }
  
  .sacada-summary {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    font-size: 0.9em;
    color: #666;
  }
 
  
  @media (max-width: 600px) {
    .actions-container {
      flex-direction: column;
    }
  
    .action-button {
      width: 100%;
      margin-bottom: 10px;
    }
  
    .sacada-summary {
      flex-direction: column;
    }
  }
  </style>