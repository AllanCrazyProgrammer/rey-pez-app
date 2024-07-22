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
            {{ client }} - Debe: {{ totalDebtByClient[client] | currency }} 
            <span class="note-count">({{ notes.length }})</span>
          </summary>
          <ul>
            <li v-for="note in notes" :key="note.id">
              <button @click="goToEditNote(note.id)" tabindex="0">
                Nota {{ note.folio }} - {{ note.currentDate }}
              </button>
            </li>
          </ul>
          <div class="client-actions">
            <button @click="showAbonoModal(client)" class="abono-button">Realizar Abono</button>
            <button @click="showAbonosHistory(client)" class="abonos-history-button">Ver Abonos</button>
          </div>
        </details>
      </div>
    </div>

    <!-- Modal para realizar abono -->
    <div v-if="showModal" class="modal">
      <div class="modal-content">
        <h2>Realizar Abono para {{ selectedClient }}</h2>
        <input v-model.number="abonoAmount" type="number" placeholder="Cantidad a abonar">
        <button @click="realizarAbono">Confirmar Abono</button>
        <button @click="closeModal">Cancelar</button>
      </div>
    </div>
    <!-- Nuevo modal para mostrar historial de abonos -->
    <div v-if="showAbonosHistoryModal" class="modal">
      <div class="modal-content">
        <h2>Historial de Abonos para {{ selectedClient }}</h2>
        <table class="abonos-history-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(abono, index) in clientAbonosHistory" :key="index">
              <td>{{ formatDate(abono.fecha) }}</td>
              <td>{{ abono.monto | currency }}</td>
            </tr>
          </tbody>
        </table>
        <button @click="closeAbonosHistoryModal">Cerrar</button>
      </div>
    </div>
  </div>
</template>
<script>
import { db } from '@/firebase';
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

export default {
  name: 'NoteMenu',
  data() {
    return {
      notesByClient: {},
      paymentFilter: 'unpaid',
      showModal: false,
      selectedClient: '',
      abonoAmount: 0,
      showAbonosHistoryModal: false,
      clientAbonosHistory: [],
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

        // Ordenar las notas de cada cliente de más nuevas a más antiguas
        for (let client in this.notesByClient) {
          this.notesByClient[client].sort((a, b) => new Date(b.currentDate) - new Date(a.currentDate));
        }
      } catch (error) {
        console.error('Error fetching notes: ', error);
      }
    },
    goToEditNote(noteId) {
      this.$router.push({ name: 'editar-nota', params: { noteId } });
    },
    showAbonoModal(client) {
      this.selectedClient = client;
      this.abonoAmount = '';  // Inicializar como cadena vacía
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.selectedClient = '';
      this.abonoAmount = 0;
    },
    async realizarAbono() {
      if (this.abonoAmount <= 0) {
        alert('Por favor ingrese una cantidad válida');
        return;
      }

      let remainingAbono = this.abonoAmount;
      const notesToUpdate = [];
      const today = new Date();

      // Ordenar las notas del cliente de más antiguas a más nuevas
      const clientNotes = [...this.notesByClient[this.selectedClient]]
        .sort((a, b) => new Date(a.currentDate) - new Date(b.currentDate))
        .filter(note => !note.isPaid);

      for (let note of clientNotes) {
        if (remainingAbono <= 0) break;

        const noteTotal = note.products.reduce((sum, product) => sum + (product.kilos * product.pricePerKilo), 0);
        const notePaid = note.abonos.reduce((sum, abono) => sum + abono.monto, 0);
        const noteRemaining = noteTotal - notePaid;

        if (noteRemaining > 0) {
          const abonoToApply = Math.min(remainingAbono, noteRemaining);
          note.abonos.push({
            monto: abonoToApply,
            fecha: today.toISOString().split('T')[0]
          });
          note.isPaid = (noteTotal <= notePaid + abonoToApply);
          remainingAbono -= abonoToApply;
          notesToUpdate.push(note);
        }
      }

      // Actualizar las notas en Firestore
      try {
        for (let note of notesToUpdate) {
          const noteRef = doc(db, 'notes', note.id);
          await updateDoc(noteRef, {
            abonos: note.abonos,
            isPaid: note.isPaid
          });
        }
        alert('Abono aplicado con éxito');
        this.closeModal();
        await this.fetchNotes(); // Recargar las notas
      } catch (error) {
        console.error('Error al actualizar las notas:', error);
        alert('Hubo un error al aplicar el abono');
      }
    },
    async showAbonosHistory(client) {
      this.selectedClient = client;
      this.clientAbonosHistory = [];
      
      // Obtener todas las notas del cliente
      const clientNotes = this.notesByClient[client];
      
      // Recopilar todos los abonos de todas las notas del cliente
      for (let note of clientNotes) {
        if (note.abonos && note.abonos.length > 0) {
          this.clientAbonosHistory.push(...note.abonos);
        }
      }
      
      // Ordenar los abonos por fecha, del más reciente al más antiguo
      this.clientAbonosHistory.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      
      this.showAbonosHistoryModal = true;
    },
    closeAbonosHistoryModal() {
      this.showAbonosHistoryModal = false;
      this.clientAbonosHistory = [];
    },
    formatDate(dateString) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('es-ES', options);
    }
  },
  computed: {
    filteredNotesByClient() {
      const filtered = {};
      for (const [client, notes] of Object.entries(this.notesByClient)) {
        filtered[client] = notes.filter(note => 
          this.paymentFilter === 'all' || 
          (this.paymentFilter === 'paid' ? note.isPaid : !note.isPaid)
        );
        // Solo incluimos clientes que tienen notas después del filtrado
        if (filtered[client].length === 0) {
          delete filtered[client];
        }
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
  },
  async mounted() {
    await this.fetchNotes();
  }
};
</script>
<style scoped>
.notes-wrapper {
  padding: 20px;
}

.button-container {
  text-align: center;
  margin-bottom: 20px;
}

.button-wrapper {
  display: inline-block;
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

ul {
  list-style-type: none;
  padding-left: 20px;
  margin-top: 10px;
}

li {
  margin-bottom: 10px;
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

.client-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.abono-button,
.abonos-history-button {
  flex: 1;
  margin: 0 5px;
}

.abono-button {
  background-color: #4CAF50;
}

.abono-button:hover {
  background-color: #45a049;
}

.abonos-history-button {
  background-color: #17a2b8;
}

.abonos-history-button:hover {
  background-color: #138496;
}

.modal {
  position: fixed;
  z-index: 1;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background-color: #fefefe;
  padding: 20px;
  border: 1px solid #888;
  width: 80%;
  max-width: 500px;
  border-radius: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.modal-content input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.modal-content button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin: 5px;
}

.modal-content button:hover {
  background-color: #2a4a87;
}

.abonos-history-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.abonos-history-table th,
.abonos-history-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.abonos-history-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

@media (max-width: 768px) {
  .client-actions {
    flex-direction: column;
  }

  .abono-button,
  .abonos-history-button {
    width: 100%;
    margin: 5px 0;
  }

  .modal-content {
    width: 95%;
    padding: 15px;
  }

  .abonos-history-table {
    font-size: 14px;
  }

  .abonos-history-table th,
  .abonos-history-table td {
    padding: 6px;
  }
}
</style>