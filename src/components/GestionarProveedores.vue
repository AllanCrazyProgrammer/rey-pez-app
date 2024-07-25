<template>
    <div class="gestionar-proveedores-container">
      <div class="back-button-container">
        <BackButton to="/gestionar-productos" />
      </div>
      <h1>Gestión de Proveedores y Maquilas</h1>
      
      <div class="add-proveedor-form">
        <h2>Agregar Proveedor/Maquila</h2>
        <form @submit.prevent="addProveedor">
          <div class="form-group">
            <label for="nombre">Nombre:</label>
            <input v-model="newProveedor.nombre" id="nombre" required placeholder="Nombre del proveedor/maquila">
          </div>
          <div class="form-group">
            <label for="tipo">Tipo:</label>
            <select v-model="newProveedor.tipo" id="tipo" required>
              <option value="proveedor">Proveedor</option>
              <option value="maquila">Maquila</option>
            </select>
          </div>
          <button type="submit" class="submit-btn">Agregar</button>
        </form>
      </div>
  
      <div class="proveedores-list">
        <h2>Lista de Proveedores y Maquilas</h2>
        <ul>
          <li v-for="proveedor in sortedProveedores" :key="proveedor.id">
            <div class="proveedor-info">
              <strong>{{ proveedor.nombre }}</strong>
              <span>({{ proveedor.tipo === 'proveedor' ? 'Proveedor' : 'Maquila' }})</span>
            </div>
            <button @click="deleteProveedor(proveedor.id)" class="delete-btn">Eliminar</button>
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
    name: 'GestionarProveedores',
    components: {
      BackButton
    },
    setup() {
      const proveedores = ref([]);
      const newProveedor = ref({
        nombre: '',
        tipo: 'proveedor'
      });
  
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
  
      const addProveedor = async () => {
        try {
          await addDoc(collection(db, 'proveedores'), {
            nombre: newProveedor.value.nombre,
            tipo: newProveedor.value.tipo
          });
          newProveedor.value = { nombre: '', tipo: 'proveedor' };
          loadProveedores();
        } catch (error) {
          console.error("Error al añadir proveedor: ", error);
        }
      };
  
      const deleteProveedor = async (proveedorId) => {
        if (confirm('¿Estás seguro de que quieres eliminar este proveedor/maquila?')) {
          try {
            await deleteDoc(doc(db, 'proveedores', proveedorId));
            loadProveedores();
          } catch (error) {
            console.error("Error al eliminar proveedor: ", error);
          }
        }
      };
  
      const sortedProveedores = computed(() => {
        return [...proveedores.value].sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
  
      onMounted(loadProveedores);
  
      return {
        proveedores,
        newProveedor,
        addProveedor,
        deleteProveedor,
        sortedProveedores
      };
    }
  };
  </script>
  
  <style scoped>
  .gestionar-proveedores-container {
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
  
  .add-proveedor-form, .proveedores-list {
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
  
  .proveedor-info {
    display: flex;
    flex-direction: column;
  }
  </style>