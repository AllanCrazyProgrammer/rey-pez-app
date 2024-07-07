<template>
  <div class="container">
    
    <div class="add-client">
      <div class="back-button-container">
      <BackButton to="/NoteMenu" />
    </div>

      <h2>Agregar Cliente</h2>
      <form @submit.prevent="addClient">
        <div class="form-group">
          <label for="name">Nombre:</label>
          <input type="text" v-model="name" required />
        </div>
        <button type="submit">Agregar Cliente</button>
      </form>
      <h2>Lista de Clientes</h2>
      <ul>
        <li v-for="client in clients" :key="client.id">
          {{ client.name }}
          <button @click="deleteClient(client.id)">Eliminar</button>
        </li>
      </ul>
    </div>
  
  </div>
</template>
  <script>
// src/components/AddClient.vue
import BackButton from './BackButton.vue';

import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";

export default {
  components: {
    BackButton
  },

  data() {
    return {
      name: '',
      clients: []
    };
  },
  methods: {
    async addClient() {
      try {
        console.log('DB instance:', db); // Añade este log para depuración
        if (!db) {
          throw new Error('Firestore DB is not initialized');
        }
        await addDoc(collection(db, 'clients'), {
          name: this.name
        });
        this.name = '';
        this.fetchClients();
      } catch (error) {
        console.error('Error adding client: ', error);
      }
    },
    async fetchClients() {
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        this.clients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error fetching clients: ', error);
      }
    },
    deleteClient(clientId) {
      if (window.confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
        deleteDoc(doc(db, "clients", clientId))
          .then(() => {
            console.log("Cliente eliminado con éxito");
          })
          .catch((error) => {
            console.error("Error al eliminar el cliente: ", error);
          });
      }
    },
  },
  async mounted() {
    this.fetchClients();
  }
};
</script>
  
  <style scoped>
  .add-client {
    max-width: 600px;
    margin: 0 auto;
    padding: 1em;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  .form-group {
    margin-bottom: 1em;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5em;
  }
  
  .form-group input {
    width: 100%;
    padding: 0.5em;
    box-sizing: border-box;
  }
  
  button {
    padding: 0.5em 1em;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background-color: #218838;
  }
  
  ul {
    list-style: none;
    padding: 0;
  }
  
  ul li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5em 0;
    border-bottom: 1px solid #ccc;
  }
  
  ul li button {
    background-color: #dc3545;
  }
  
  ul li button:hover {
    background-color: #c82333;
  }
  
  .back-button-container {
  text-align: left; /* Centra el contenido del div horizontalmente */
  margin-top: 20px; /* Añade un margen inferior para separarlo de los siguientes elementos */
}
  </style>