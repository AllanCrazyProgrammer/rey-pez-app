<template>
    <div class="notes-wrapper">
      <!-- Contenido de tu menú aquí -->
      <div class="button-container">
        <div class="button-wrapper">
          <button @click="goToSaleNote">Nueva nota</button>
        </div>
        <div class="button-wrapper">
          <button @click="goToAddClient">Agregar Cliente</button> <!-- Nuevo botón -->
        </div>
      </div>
  
<div class="notes-container">
  <div class="filter-container">
  <select v-model="paymentFilter">
    <option value="all">Todas</option>
    <option value="paid">Pagadas</option>
    <option value="unpaid">No Pagadas</option>
  </select>
</div>
      <h2>Notas por Cliente</h2>
      <div v-for="(notes, client) in filteredNotesByClient" :key="client">
        <details>
          <summary>{{ client }}</summary>
          <ul>
            <li v-for="note in notes" :key="note.id">
              <button @click="goToEditNote(note.id)">
                Nota {{ note.folio }} - {{ note.currentDate }}
              </button>
            </li>
          </ul>
        </details>
      </div>
    </div>
  </div>
</template>
  
  <script>
  import { db } from '@/firebase';
  import { collection, getDocs } from "firebase/firestore";
  
  export default {
    name: 'NoteMenu',
    data() {
      return {
        notesByClient: {},
        paymentFilter: 'all', // Valor inicial que muestra todas las notas
       
      };
    },
    methods: {
      goToSaleNote() {
        this.$router.push({ name: 'SaleNote' });
      },
      goToAddClient() {
        this.$router.push({ name: 'AddClient' });
      },
      async fetchNotes() {
        try {
          const querySnapshot = await getDocs(collection(db, 'notes'));
          const notes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
          // Organizar las notas por cliente
          this.notesByClient = notes.reduce((acc, note) => {
            if (!acc[note.client]) {
              acc[note.client] = [];
            }
            acc[note.client].push(note);
            return acc;
          }, {});
        } catch (error) {
          console.error('Error fetching notes: ', error);
        }
      }, 
            goToEditNote(noteId) {
        this.$router.push({ name: 'editar-nota', params: { noteId } });
      }
    },
    async mounted() {
      this.fetchNotes();
    },
    computed: {
  filteredNotesByClient() {
    if (this.paymentFilter === 'all') {
      return this.notesByClient;
    }
    const filtered = {};
    for (const [client, notes] of Object.entries(this.notesByClient)) {
      filtered[client] = notes.filter(note => 
        this.paymentFilter === 'paid' ? note.isPaid : !note.isPaid
      );
    }
    return filtered;
  }
},
  };
  </script>
  
  <style scoped>
/* Estilos generales */
.notes-wrapper {
  padding: 20px;
}

/* Estilos para los botones */
.button-container {
  text-align: center; /* Centra los elementos inline o inline-block dentro del contenedor */
  margin-bottom: 20px;
}

.button-wrapper {
  display: inline-block; /* Asegura que los botones se alineen horizontalmente */
  margin-right: 10px;
}

button {
  background-color: #007BFF;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s; /* Transición suave al cambiar de color */
  margin: 0 auto; /* Centrado automático en el eje horizontal */
}

button:hover {
  background-color: #0056b3; /* Un azul más oscuro para el estado hover */
}

/* Estilos para el contenedor de filtros */
.filter-container {
  margin-bottom: 20px;
}

/* Estilos para el contenedor de notas */
.notes-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.notes-container h2 {
  text-align: center;
  color: #1552cc;
  margin-bottom: 20px; /* Espacio después del título */
}

/* Estilos para el componente details */

details {
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 10px;
}

summary {
  font-weight: bold;
  cursor: pointer;
}

summary:hover {
  color: #007BFF;
}

/* Estilos para la lista de notas */
ul {
  list-style-type: none;
  padding-left: 20px;
}

li {
  margin-bottom: 5px;
}
</style>