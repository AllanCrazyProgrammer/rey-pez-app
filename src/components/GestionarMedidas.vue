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
            <input v-model="newMedida.nombre" id="medida" required placeholder="Ej: 16/20, 21/25, 26/30, etc.">
          </div>
          <div class="form-group">
            <label for="tipo">Tipo:</label>
            <select v-model="newMedida.tipo" id="tipo" required>
              <option value="general">General</option>
              <option value="maquila">Maquila</option>
            </select>
          </div>
          <div class="form-group" v-if="newMedida.tipo === 'maquila'">
            <label for="maquila">Maquila:</label>
            <select v-model="newMedida.maquilaId" id="maquila" required>
              <option value="">Seleccione una maquila</option>
              <option v-for="maquila in maquilas" :key="maquila.id" :value="maquila.id">
                {{ maquila.nombre }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="proveedor">Proveedor:</label>
            <select v-model="newMedida.proveedorId" id="proveedor">
              <option value="">General</option>
              <option v-for="proveedor in proveedores" :key="proveedor.id" :value="proveedor.id">
                {{ proveedor.nombre }}
              </option>
            </select>
          </div>
          <button type="submit" class="submit-btn">Agregar Medida</button>
        </form>
      </div>
  
      <div class="medidas-list">
        <h2>Lista de Medidas</h2>
        <h3>Medidas Generales</h3>
        <ul>
          <li v-for="medida in medidasGenerales" :key="medida.id">
            {{ medida.nombre }}
            <button @click="deleteMedida(medida.id)" class="delete-btn">Eliminar</button>
          </li>
        </ul>
        <h3>Medidas de Proveedores</h3>
        <div v-for="proveedor in proveedores" :key="proveedor.id">
          <h4>{{ proveedor.nombre }}</h4>
          <ul>
            <li v-for="medida in getMedidasProveedor(proveedor.id)" :key="medida.id">
              {{ medida.nombre }}
              <button @click="deleteMedida(medida.id)" class="delete-btn">Eliminar</button>
            </li>
          </ul>
        </div>
        <h3>Medidas de Maquilas</h3>
        <div v-for="maquila in maquilas" :key="maquila.id">
          <h4>{{ maquila.nombre }}</h4>
          <ul>
            <li v-for="medida in getMedidasMaquila(maquila.id)" :key="medida.id">
              {{ medida.nombre }}
              <button @click="deleteMedida(medida.id)" class="delete-btn">Eliminar</button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, onMounted, computed } from 'vue';
  import { db } from '@/firebase';
  import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
  import BackButton from './BackButton.vue';
  
  export default {
    name: 'GestionarMedidas',
    components: {
      BackButton
    },
    setup() {
      const medidas = ref([]);
      const proveedores = ref([]);
      const maquilas = ref([]);
      const newMedida = ref({
        nombre: '',
        tipo: 'general',
        maquilaId: '',
        proveedorId: ''
      });
  
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
  
      const loadMaquilas = async () => {
        try {
          const q = query(collection(db, 'proveedores'), where("tipo", "==", "maquila"));
          const querySnapshot = await getDocs(q);
          maquilas.value = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (error) {
          console.error("Error al cargar maquilas: ", error);
        }
      };
  
      const loadProveedores = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'proveedores'));
          proveedores.value = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        } catch (error) {
          console.error("Error al cargar proveedores: ", error);
        }
      };
  
      const addMedida = async () => {
        try {
          await addDoc(collection(db, 'medidas'), {
            nombre: newMedida.value.nombre,
            tipo: newMedida.value.tipo,
            maquilaId: newMedida.value.tipo === 'maquila' ? newMedida.value.maquilaId : null,
            proveedorId: newMedida.value.tipo === 'general' ? newMedida.value.proveedorId : null
          });
          newMedida.value = { nombre: '', tipo: 'general', maquilaId: '', proveedorId: '' };
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
  
      const medidasGenerales = computed(() => {
        return medidas.value.filter(medida => medida.tipo === 'general' && !medida.proveedorId);
      });
  
      const getMedidasMaquila = (maquilaId) => {
        return medidas.value.filter(medida => medida.tipo === 'maquila' && medida.maquilaId === maquilaId);
      };
  
      const getMedidasProveedor = (proveedorId) => {
        return medidas.value.filter(medida => medida.proveedorId === proveedorId);
      };
  
      onMounted(() => {
        loadMedidas();
        loadMaquilas();
        loadProveedores();
      });
  
      return {
        medidas,
        proveedores,
        maquilas,
        newMedida,
        addMedida,
        deleteMedida,
        medidasGenerales,
        getMedidasMaquila,
        getMedidasProveedor
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