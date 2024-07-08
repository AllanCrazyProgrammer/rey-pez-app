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
      <div class="filter-container">
  <select v-model="paymentFilter">
    <option value="all">Todas</option>
    <option value="paid">Pagadas</option>
    <option value="unpaid">No Pagadas</option>
  </select>
</div>
      <div class="notes-container">
        <h2>Notas por Cliente</h2>
        <div v-for="(notes, client) in filteredNotesByClient" :key="client">          <h3>{{ client }}</h3>
          <ul>
            <li v-for="note in notes" :key="note.id">
              <button @click="goToEditNote(note.id)">
                Nota {{ note.folio }} - {{ note.currentDate }}
              </button>
            </li>
          </ul>
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
  
  <style>
 .button-wrapper {
    display: inline-block;
    margin: 0 10px; /* Ajusta el espaciado entre los botones */
  }

  .button-container {
    text-align: center;
  }



button {
  display: inline-block; /* Cambio para permitir el centrado */
  padding: 10px 20px; /* Aumento del padding para un aspecto más grande y cómodo */
  background-color: #1b6ec6; /* Un azul más vibrante */
  color: white;
  font-size: 16px; /* Aumento del tamaño de fuente para mejorar la legibilidad */
  border: none;
  border-radius: 5px; /* Bordes más redondeados */
  cursor: pointer;
  transition: background-color 0.3s; /* Transición suave al cambiar de color */
  margin: 0 auto; /* Centrado automático en el eje horizontal */
}

button:hover {
  background-color: #0056b3; /* Un azul más oscuro para el estado hover */
}

/* Centrado de botones */
/* Asumiendo que tus botones están dentro de un contenedor .button-container */
.button-container {
  text-align: center; /* Centra los elementos inline o inline-block dentro del contenedor */
}


.notes-container {
  margin-top: 20px;
  padding: 20px; /* Añadir padding para dar más espacio alrededor del contenido */
  background-color: #f9f9f9; /* Color de fondo suave para el contenedor */
  border-radius: 8px; /* Bordes redondeados para el contenedor */
  box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* Sombra sutil para dar profundidad */
}

.notes-container h2 {
  text-align: center;
  color: #1552cc;
  margin-bottom: 20px; /* Espacio después del título */
}

.notes-container h3 {
  color: #333;
  margin-bottom: 10px; /* Espacio después de los subtítulos */
}

.notes-container ul {
  list-style: none;
  padding: 0;
}
.filter-container {
  display: flex; /* Usa flexbox para alinear los elementos internos */
  justify-content: left; /* Centra el contenido izquierda */
  margin: 10px 0; /* Añade un margen arriba y abajo para separarlo del resto */
  padding: 5px; /* Añade padding para espacio interno */
  background-color: #f9f9f9; /* Un fondo suave que contraste ligeramente con el blanco */
  border-radius: 8px; /* Bordes redondeados para coherencia con los elementos de la lista */
  box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* Sombra suave para dar profundidad */
}

.filter-container select {
  padding: 8px 12px; /* Añade padding para hacer el select más grande y fácil de interactuar */
  border: 1px solid #ccc; /* Borde sutil */
  border-radius: 4px; /* Bordes redondeados para el select */
  background-color: white; /* Fondo blanco para el select */
  cursor: pointer; /* Cambia el cursor para indicar que el select es interactivo */
}
.notes-container ul li {
  margin: 10px 0;
  padding: 10px; /* Añadir padding para hacer cada elemento de la lista más grande */
  background-color: white; /* Fondo blanco para cada elemento de la lista */
  border-radius: 8px; /* Bordes redondeados para los elementos de la lista */
  box-shadow: 0 1px 3px rgba(0,0,0,0.1); /* Sombra para dar profundidad */
}
.notes-wrapper {
  max-width: 1000px; /* Establece un ancho máximo para el contenedor */
  margin: 0 auto; /* Centra el contenedor horizontalmente */
  padding: 20px; /* Añade un poco de padding para no tener el contenido pegado a los bordes */
}


</style>