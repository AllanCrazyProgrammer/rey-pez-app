<template>
  <div class="notes-wrapper">
    <div class="button-container">
      <div class="button-wrapper">
        <button @click="goToSaleNote">Nueva nota</button>
      </div>
      <div class="button-wrapper">
        <button @click="goToAddClient">Agregar Cliente</button>
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
          <summary>
            {{ client }} - Deuda Total: {{ totalDebtByClient[client] | currency }} 
            <span class="note-count">({{ notes.length }})</span>
          </summary>
          <ul>
            <li v-for="note in notes" :key="note.id">
              <button @click="goToEditNote(note.id)" tabindex="0">
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
    await this.fetchNotes();
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
    },
    totalDebtByClient() {
      const debtByClient = {};
      for (const [client, notes] of Object.entries(this.notesByClient)) {
        debtByClient[client] = notes.reduce((total, note) => {
          const noteDebt = note.products.reduce((sum, product) => sum + (product.kilos * product.pricePerKilo), 0) - note.abonos.reduce((sum, abono) => sum + abono.monto, 0);
          return total + (note.isPaid ? 0 : noteDebt);
        }, 0);
      }
      return debtByClient;
    }
  },
  filters: {
    currency(value) {
      if (!value) return '$0.00';
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
    }
  }
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
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2a4a87;
}

/* Estilos para el contenedor de filtros */
.filter-container {
  margin-bottom: 20px;
}

.filter-container select {
  padding: 10px 20px;
  border: 2px solid #ccc;
  border-radius: 20px;
  background-color: white;
  transition: border-color 0.3s;
}

.filter-container select:focus {
  border-color: #3760b0;
}

/* Estilos para el contenedor de notas */
.notes-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #e8f0fe;
  border-radius: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.notes-container h2 {
  text-align: center;
  color: #3760b0;
  margin-bottom: 20px;
}

/* Estilos para el componente details */
details {
  margin-bottom: 20px;
  border: 2px solid #ccc;
  border-radius: 20px;
  padding: 10px;
  background-color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

summary {
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 20px;
  background: linear-gradient(135deg, #3760b0, #2a4a87);
  color: white;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: background 0.3s;
}

summary:hover {
  background: linear-gradient(135deg, #2a4a87, #3760b0);
}

/* Estilos para el contador de notas */
.note-count {
  background-color: #ffc107;
  color: #000;
  border-radius: 50%;
  padding: 10px 15px;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s;
}

.note-count:hover {
  transform: scale(1.2);
}

/* Estilos para la lista de notas */
ul {
  list-style-type: none;
  padding-left: 20px;
  margin-top: 10px; /* Agregar margen superior entre el summary y la lista */
}

li {
  margin-bottom: 10px; /* Aumentar el margen inferior entre los elementos de la lista */
}

li button {
  background-color: transparent;
  border: none;
  color: #3760b0;
  text-decoration: underline;
  cursor: pointer;
  font-weight: bold;
  transition: color 0.3s, background-color 0.3s;
}

li button:hover {
  color: white;
  background-color: #2a4a87;
  border-radius: 5px;
  padding: 5px 10px;
}
</style>