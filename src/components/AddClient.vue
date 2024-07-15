<template>
  <div class="container">
    
    <div class="add-client">
      <div class="back-button-container">
      <BackButton to="/NoteMenu" />
    </div>
    <div class="add-client-form" >
      <h2>Agregar Cliente</h2>
    </div>

      
      <form @submit.prevent="addClient">
        <div class="form-group">
          <label for="name">Nombre:</label>
          <input type="text" v-model="name" required />
        </div>
        <button type="submit">Agregar Cliente</button>
      </form>
      <div class="add-client-form" >
        <h2>Lista de Clientes</h2>
      </div>
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
/* Estilos generales */
.add-client {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background-color: #e8f0fe;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.add-client-form, .lista-clientes-form {
  margin: 1.5em;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.form-group {
  margin-bottom: 1em;
  width: 100%; /* Asegura que los elementos ocupen todo el ancho del contenedor */
}

.form-group label {
  display: block;
  margin-bottom: 0.5em;
  font-weight: bold;
  font-size: 1.1em;
  color: #3760b0; /* Color acorde al estilo general */
}

.form-group input {
  width: 100%;
  padding: 0.5em;
  box-sizing: border-box;
  border-radius: 5px;
  border: 1px solid #ccc;
  font-size: 1em;
}

/* Estilos para los botones */
button {
  padding: 10px 20px;
  background-color: #3760b0;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2a4a87;
}

ul {
  list-style: none;
  padding: 0;
  width: 100%; /* Asegura que la lista ocupe todo el ancho del contenedor */
}

ul li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75em 1em;
  border-bottom: 1px solid #ccc;
  background-color: #fff;
  border-radius: 10px;
  margin-bottom: 0.5em;
  transition: background-color 0.3s, box-shadow 0.3s;
}

ul li:hover {
  background-color: #f1f1f1;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

ul li span {
  font-size: 1.1em;
  color: #333;
}

ul li button {
  background-color: #dc3545;
  padding: 5px 10px;
  border-radius: 20px;
  color: white;
}

ul li button:hover {
  background-color: #c82333;
}

.back-button-container {
  text-align: left; /* Centra el contenido del div horizontalmente */
  margin-top: 20px; /* Añade un margen inferior para separarlo de los siguientes elementos */
}
</style>