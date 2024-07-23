<template>
    <div class="gestionar-medidas-container">
      <div class="back-button-container">
        <BackButton to="/gestionar-productos" />
      </div>
      <h1>Gestión de Medidas</h1>
      
      <div class="add-medida-form">
        <h2>Agregar Medida</h2>
        <form @submit.prevent="addMedida">
          <div class="form-group">
            <label for="medida">Medida:</label>
            <input v-model="newMedida" id="medida" required placeholder="Ej: 16/20, 21/25, 26/30, etc.">
          </div>
          <button type="submit" class="submit-btn">Agregar Medida</button>
        </form>
      </div>
  
      <div class="medidas-list">
        <h2>Lista de Medidas</h2>
        <ul>
          <li v-for="medida in sortedMedidas" :key="medida.id">
            {{ medida.nombre }}
            <button @click="deleteMedida(medida.id)" class="delete-btn">Eliminar</button>
          </li>
        </ul>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, onMounted, computed } from 'vue';
  import { db } from '@/firebase';
  import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
  import BackButton from './BackButton.vue';
  
  export default {
    name: 'GestionarMedidas',
    components: {
      BackButton
    },
    setup() {
      const medidas = ref([]);
      const newMedida = ref('');
  
      const loadMedidas = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'medidas'));
          medidas.value = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (error) {
          console.error("Error al cargar medidas: ", error);
        }
      };
  
      const addMedida = async () => {
        try {
          await addDoc(collection(db, 'medidas'), {
            nombre: newMedida.value
          });
          newMedida.value = '';
          loadMedidas();
        } catch (error) {
          console.error("Error al añadir medida: ", error);
        }
      };
  
      const deleteMedida = async (medidaId) => {
        if (confirm('¿Estás seguro de que quieres eliminar esta medida?')) {
          try {
            await deleteDoc(doc(db, 'medidas', medidaId));
            loadMedidas();
          } catch (error) {
            console.error("Error al eliminar medida: ", error);
          }
        }
      };
  
      const sortedMedidas = computed(() => {
        return [...medidas.value].sort((a, b) => {
          const getAverageSize = (str) => {
            const [min, max] = str.split('/').map(Number);
            return (min + max) / 2;
          };
  
          const avgA = getAverageSize(a.nombre);
          const avgB = getAverageSize(b.nombre);
  
          return avgB - avgA; // Ordenar de mayor a menor (camarones más chicos primero)
        });
      });
  
      onMounted(loadMedidas);
  
      return {
        medidas,
        newMedida,
        addMedida,
        deleteMedida,
        sortedMedidas
      };
    }
  };
  </script>
  
  <style scoped>
  .gestionar-medidas-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    background-color: #e8f0fe;
    border-radius: 20px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  h1, h2 {
    color: #3760b0;
  }
  
  .add-medida-form, .medidas-list {
    margin-top: 20px;
  }
  
  .form-group {
    margin-bottom: 15px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 5px;
    color: #3760b0;
  }
  
  .form-group input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .submit-btn, .delete-btn {
    background-color: #3760b0;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .submit-btn:hover, .delete-btn:hover {
    background-color: #2a4a87;
  }
  
  .delete-btn {
    background-color: #dc3545;
    padding: 5px 10px;
  }
  
  .delete-btn:hover {
    background-color: #c82333;
  }
  
  ul {
    list-style: none;
    padding: 0;
  }
  
  li {
    background-color: white;
    border-radius: 4px;
    margin-bottom: 10px;
    padding: 15px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .back-button-container {
    margin-bottom: 20px;
  }
  </style>