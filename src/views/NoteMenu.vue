<template>
  <div class="notes-wrapper">
    <header class="notes-header">
      <div>
        <h1>Notas por Cliente</h1>
        <p class="notes-description">Administra adeudos, abonos e historial con un flujo más rápido.</p>
      </div>
      <div class="header-actions">
        <button type="button" class="btn btn-primary" @click="goToSaleNote">Nueva nota</button>
        <button type="button" class="btn btn-secondary" @click="goToAddClient">Agregar cliente</button>
      </div>
    </header>

    <section class="notes-container">
      <div class="controls-grid">
        <label class="control-field">
          <span>Filtrar por pago</span>
          <select v-model="paymentFilter">
            <option value="all">Todas</option>
            <option value="paid">Pagadas</option>
            <option value="unpaid">No pagadas</option>
          </select>
        </label>
        <label class="control-field">
          <span>Buscar cliente</span>
          <input
            v-model.trim="clientSearch"
            type="text"
            placeholder="Ej. Joel, Oscar..."
          >
        </label>
      </div>

      <div class="quick-stats">
        <p><strong>Clientes visibles:</strong> {{ clientEntries.length }}</p>
        <p><strong>Deuda visible:</strong> {{ totalVisibleDebt | currency }}</p>
      </div>

      <p v-if="isLoading" class="status-msg">Cargando notas...</p>
      <p v-else-if="clientEntries.length === 0" class="status-msg">
        No hay resultados con los filtros actuales.
      </p>

      <article v-for="entry in clientEntries" :key="entry.client" class="client-card">
        <details>
          <summary>
            <div class="summary-main">
              <span class="client-name">{{ entry.client }}</span>
              <span class="client-debt">Debe: {{ entry.debt | currency }}</span>
              <span v-if="entry.balance > 0" class="balance-favor">
                Saldo a favor: {{ entry.balance | currency }}
              </span>
            </div>
            <span class="note-count">{{ entry.notes.length }} notas</span>
          </summary>

          <ul class="notes-list">
            <li v-for="note in notesPageSlice(entry)" :key="note.id" class="note-row">
              <button type="button" class="note-link" @click="goToEditNote(note.id)">
                Nota {{ note.folio }} - {{ note.currentDate }}
              </button>
              <span class="note-amount">Pendiente: {{ calculateNoteDebt(note) | currency }}</span>
            </li>
          </ul>

          <div v-if="notesTotalPages(entry) > 1" class="pagination notes-list-pagination">
            <button
              type="button"
              class="btn btn-muted btn-small"
              :disabled="notesCurrentPage(entry) <= 1"
              @click="prevNotesPage(entry.client)"
            >
              Anterior
            </button>
            <span class="notes-page-label">
              Página {{ notesCurrentPage(entry) }} de {{ notesTotalPages(entry) }}
            </span>
            <button
              type="button"
              class="btn btn-muted btn-small"
              :disabled="notesCurrentPage(entry) >= notesTotalPages(entry)"
              @click="nextNotesPage(entry.client)"
            >
              Siguiente
            </button>
          </div>

          <div class="client-actions">
            <button type="button" class="btn btn-success" @click="showAbonoModal(entry.client)">
              Realizar abono
            </button>
            <button type="button" class="btn btn-info" @click="showAbonosHistory(entry.client)">
              Ver abonos
            </button>
          </div>
        </details>
      </article>
    </section>

    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <h2>Realizar abono para {{ selectedClient }}</h2>
        <p class="modal-help">El monto se aplica a las notas más antiguas primero.</p>
        <div class="abono-preview">
          <p><strong>Debe actualmente:</strong> {{ selectedClientDebt | currency }}</p>
          <p><strong>Deberá después del abono:</strong> {{ projectedDebtAfterAbono | currency }}</p>
          <p v-if="projectedFavorAfterAbono > 0" class="favor-msg">
            <strong>Saldo a favor generado:</strong> {{ projectedFavorAfterAbono | currency }}
          </p>
        </div>
        <input
          v-model.number="abonoAmount"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="Cantidad a abonar"
        >
        <div class="modal-actions">
          <button type="button" class="btn btn-primary" :disabled="isProcessingAbono" @click="realizarAbono">
            {{ isProcessingAbono ? 'Aplicando...' : 'Confirmar abono' }}
          </button>
          <button type="button" class="btn btn-muted" :disabled="isProcessingAbono" @click="closeModal">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <div v-if="showAbonosHistoryModal" class="modal" @click.self="closeAbonosHistoryModal">
      <div class="modal-content modal-wide">
        <h2>Historial de abonos de {{ selectedClient }}</h2>
        <table class="abonos-history-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="clientAbonosHistory.length === 0">
              <td colspan="3" class="empty-cell">Sin abonos registrados.</td>
            </tr>
            <tr v-for="abono in paginatedAbonos" :key="abono.uid">
              <td>{{ formatDate(abono.fecha) }}</td>
              <td>{{ abono.monto | currency }}</td>
              <td>
                <button type="button" class="btn btn-danger btn-small" @click="openDeleteAbonoModal(abono)">
                  Borrar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pagination">
          <button type="button" class="btn btn-muted btn-small" :disabled="currentPage === 1" @click="prevPage">
            Anterior
          </button>
          <span>Página {{ currentPage }} de {{ totalPages }}</span>
          <button
            type="button"
            class="btn btn-muted btn-small"
            :disabled="currentPage >= totalPages"
            @click="nextPage"
          >
            Siguiente
          </button>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-muted" @click="closeAbonosHistoryModal">Cerrar</button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteAbonoModal" class="modal" @click.self="closeDeleteAbonoModal">
      <div class="modal-content">
        <h2>Confirmar borrado de abono</h2>
        <p>¿Seguro que deseas borrar este abono?</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-danger" :disabled="isDeletingAbono" @click="deleteAbono">
            {{ isDeletingAbono ? 'Borrando...' : 'Confirmar' }}
          </button>
          <button type="button" class="btn btn-muted" :disabled="isDeletingAbono" @click="closeDeleteAbonoModal">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, onSnapshot, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import {
  nuevoSaldoAcumuladoGlobalCliente,
  saldoRestanteNota
} from '@/utils/notaVentaSaldosCliente';
import { formatearFecha as formatDate } from '@/utils/formatters';

export default {
  name: 'NoteMenu',
  data() {
    return {
      notesByClient: {},
      paymentFilter: 'all',
      clientSearch: '',
      /** Paginación de la lista de notas por cliente (nombre de cliente → página 1-based). */
      notesListPage: {},
      notesPerPage: 5,
      showModal: false,
      selectedClient: '',
      abonoAmount: null,
      showAbonosHistoryModal: false,
      clientAbonosHistory: [],
      showDeleteAbonoModal: false,
      selectedAbono: null,
      currentPage: 1,
      abonosPerPage: 7,
      clientBalances: {},
      /** Desuscripciones Firestore (tiempo real). */
      unsubscribeNotes: null,
      unsubscribeClientBalances: null,
      isLoading: false,
      isProcessingAbono: false,
      isDeletingAbono: false
    };
  },
  computed: {
    filteredNotesByClient() {
      const search = this.clientSearch.toLowerCase();
      const filtered = {};

      for (const [client, notes] of Object.entries(this.notesByClient)) {
        const matchesSearch = !search || client.toLowerCase().includes(search);
        if (!matchesSearch) {
          continue;
        }

        const notesByFilter = notes.filter((note) => {
          if (this.paymentFilter === 'all') {
            return true;
          }
          return this.paymentFilter === 'paid' ? !!note.isPaid : !note.isPaid;
        });

        if (notesByFilter.length > 0) {
          filtered[client] = notesByFilter;
        }
      }

      return filtered;
    },
    /** Misma lógica que "Nuevo saldo acumulado" en SaleNote (última nota en el tiempo). */
    totalDebtByClient() {
      const debtByClient = {};
      for (const [client, notes] of Object.entries(this.notesByClient)) {
        debtByClient[client] = nuevoSaldoAcumuladoGlobalCliente(notes);
      }
      return debtByClient;
    },
    clientEntries() {
      return Object.entries(this.filteredNotesByClient)
        .map(([client, notes]) => ({
          client,
          notes,
          debt: this.totalDebtByClient[client] || 0,
          balance: this.clientBalances[client] || 0
        }))
        .filter((entry) => entry.debt > 0)
        .sort((a, b) => b.debt - a.debt || a.client.localeCompare(b.client));
    },
    totalVisibleDebt() {
      return this.clientEntries.reduce((sum, entry) => sum + entry.debt, 0);
    },
    normalizedAbonoAmount() {
      const amount = Number(this.abonoAmount);
      return amount > 0 ? amount : 0;
    },
    selectedClientDebt() {
      const notes = this.notesByClient[this.selectedClient] || [];
      return nuevoSaldoAcumuladoGlobalCliente(notes);
    },
    projectedDebtAfterAbono() {
      const projected = this.selectedClientDebt - this.normalizedAbonoAmount;
      return projected > 0 ? projected : 0;
    },
    projectedFavorAfterAbono() {
      const favor = this.normalizedAbonoAmount - this.selectedClientDebt;
      return favor > 0 ? favor : 0;
    },
    paginatedAbonos() {
      const start = (this.currentPage - 1) * this.abonosPerPage;
      const end = start + this.abonosPerPage;
      return this.clientAbonosHistory.slice(start, end);
    },
    totalPages() {
      const pages = Math.ceil(this.clientAbonosHistory.length / this.abonosPerPage);
      return pages > 0 ? pages : 1;
    }
  },
  watch: {
    paymentFilter() {
      this.notesListPage = {};
    },
    clientSearch() {
      this.notesListPage = {};
    }
  },
  filters: {
    currency(value) {
      if (!value) {
        return '$0.00';
      }
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
    }
  },
  methods: {
    formatDate,
    goToSaleNote() {
      this.$router.push({ name: 'SaleNote' });
    },
    goToAddClient() {
      this.$router.push({ name: 'AddClient' });
    },
    goToEditNote(noteId) {
      this.$router.push({ name: 'editar-nota', params: { noteId } });
    },
    notesTotalPages(entry) {
      return Math.max(1, Math.ceil(entry.notes.length / this.notesPerPage));
    },
    notesCurrentPage(entry) {
      const totalPages = this.notesTotalPages(entry);
      let page = this.notesListPage[entry.client] || 1;
      return Math.min(Math.max(1, page), totalPages);
    },
    notesPageSlice(entry) {
      const perPage = this.notesPerPage;
      const totalPages = this.notesTotalPages(entry);
      let page = this.notesListPage[entry.client] || 1;
      page = Math.min(Math.max(1, page), totalPages);
      const start = (page - 1) * perPage;
      return entry.notes.slice(start, start + perPage);
    },
    prevNotesPage(client) {
      const p = this.notesListPage[client] || 1;
      if (p > 1) this.$set(this.notesListPage, client, p - 1);
    },
    nextNotesPage(client) {
      const entry = this.clientEntries.find((e) => e.client === client);
      if (!entry) return;
      const total = this.notesTotalPages(entry);
      const p = this.notesListPage[client] || 1;
      if (p < total) this.$set(this.notesListPage, client, p + 1);
    },
    calculateNoteTotal(note) {
      const products = Array.isArray(note.products) ? note.products : [];
      const subtotal = products.reduce(
        (sum, product) => sum + (Number(product.kilos) || 0) * (Number(product.pricePerKilo) || 0),
        0
      );
      const flete = Number(note.flete) || 0;
      return subtotal - flete;
    },
    calculateNotePaid(note) {
      const abonos = Array.isArray(note.abonos) ? note.abonos : [];
      return abonos.reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0);
    },
    /** Pendiente por nota, alineado con SaleNote (respeta isPaid). */
    calculateNoteDebt(note) {
      return saldoRestanteNota(note);
    },
    applyNotesSnapshot(querySnapshot) {
      const notes = querySnapshot.docs.map((entry) => {
        const data = entry.data();
        return {
          id: entry.id,
          ...data,
          abonos: Array.isArray(data.abonos) ? data.abonos : [],
          products: Array.isArray(data.products) ? data.products : []
        };
      });

      this.notesByClient = notes.reduce((acc, note) => {
        const clientName = note.client || 'Sin cliente';
        if (!acc[clientName]) {
          acc[clientName] = [];
        }
        acc[clientName].push(note);
        return acc;
      }, {});

      Object.keys(this.notesByClient).forEach((client) => {
        this.notesByClient[client].sort((a, b) => new Date(b.currentDate) - new Date(a.currentDate));
      });
    },
    startNotesRealtime() {
      if (this.unsubscribeNotes) {
        this.unsubscribeNotes();
        this.unsubscribeNotes = null;
      }
      this.isLoading = true;
      this.unsubscribeNotes = onSnapshot(
        collection(db, 'notes'),
        (snapshot) => {
          this.applyNotesSnapshot(snapshot);
          this.isLoading = false;
        },
        (error) => {
          console.error('Error en notas (tiempo real):', error);
          this.isLoading = false;
        }
      );
    },
    startClientBalancesRealtime() {
      if (this.unsubscribeClientBalances) {
        this.unsubscribeClientBalances();
        this.unsubscribeClientBalances = null;
      }
      this.unsubscribeClientBalances = onSnapshot(
        collection(db, 'clientBalances'),
        (snapshot) => {
          const balances = {};
          snapshot.docs.forEach((entry) => {
            balances[entry.id] = Number(entry.data().balance) || 0;
          });
          this.clientBalances = balances;
        },
        (error) => {
          console.error('Error en saldos a favor (tiempo real):', error);
        }
      );
    },
    async updateClientBalance(clientName, newBalance) {
      try {
        const balanceRef = doc(db, 'clientBalances', clientName);
        await setDoc(balanceRef, { balance: newBalance }, { merge: true });
        this.clientBalances = {
          ...this.clientBalances,
          [clientName]: newBalance
        };
      } catch (error) {
        console.error('Error updating client balance:', error);
      }
    },
    showAbonoModal(client) {
      this.selectedClient = client;
      this.abonoAmount = null;
      this.showModal = true;
    },
    closeModal() {
      this.showModal = false;
      this.selectedClient = '';
      this.abonoAmount = null;
    },
    async realizarAbono() {
      const amount = Number(this.abonoAmount);
      if (!amount || amount <= 0) {
        alert('Por favor ingresa una cantidad válida');
        return;
      }

      const selectedNotes = this.notesByClient[this.selectedClient] || [];
      if (selectedNotes.length === 0) {
        alert('No hay notas para este cliente');
        return;
      }

      this.isProcessingAbono = true;
      let remainingAbono = amount;
      const today = new Date().toISOString().split('T')[0];
      const notesToUpdate = [];

      const clientNotes = [...selectedNotes]
        .sort((a, b) => new Date(a.currentDate) - new Date(b.currentDate))
        .filter((note) => !note.isPaid);

      for (const note of clientNotes) {
        if (remainingAbono <= 0) {
          break;
        }

        const noteDebt = this.calculateNoteDebt(note);
        if (noteDebt <= 0) {
          continue;
        }

        const abonoToApply = Math.min(remainingAbono, noteDebt);
        const updatedAbonos = [...(note.abonos || []), { monto: abonoToApply, fecha: today }];
        const isPaid = this.calculateNoteTotal(note) <= this.calculateNotePaid({ ...note, abonos: updatedAbonos });

        notesToUpdate.push({
          id: note.id,
          abonos: updatedAbonos,
          isPaid
        });
        remainingAbono -= abonoToApply;
      }

      try {
        await Promise.all(
          notesToUpdate.map((note) =>
            updateDoc(doc(db, 'notes', note.id), {
              abonos: note.abonos,
              isPaid: note.isPaid
            })
          )
        );

        if (remainingAbono > 0) {
          const currentBalance = this.clientBalances[this.selectedClient] || 0;
          const newBalance = currentBalance + remainingAbono;
          await this.updateClientBalance(this.selectedClient, newBalance);

          alert(
            `Abono aplicado con éxito. Saldo a favor: ${new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN'
            }).format(remainingAbono)}`
          );
        } else {
          alert('Abono aplicado con éxito');
        }

        this.closeModal();
      } catch (error) {
        console.error('Error al actualizar las notas:', error);
        alert('Hubo un error al aplicar el abono');
      } finally {
        this.isProcessingAbono = false;
      }
    },
    async showAbonosHistory(client) {
      this.selectedClient = client;
      this.clientAbonosHistory = [];
      this.currentPage = 1;

      const clientNotes = this.notesByClient[client] || [];
      clientNotes.forEach((note) => {
        const abonos = Array.isArray(note.abonos) ? note.abonos : [];
        abonos.forEach((abono, index) => {
          this.clientAbonosHistory.push({
            ...abono,
            noteId: note.id,
            abonoIndex: index,
            uid: `${note.id}-${index}-${abono.fecha || 'sin-fecha'}-${abono.monto || 0}`
          });
        });
      });

      this.clientAbonosHistory.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      this.showAbonosHistoryModal = true;
    },
    closeAbonosHistoryModal() {
      this.showAbonosHistoryModal = false;
      this.clientAbonosHistory = [];
      this.currentPage = 1;
    },
    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage -= 1;
      }
    },
    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage += 1;
      }
    },
    openDeleteAbonoModal(abono) {
      this.selectedAbono = abono;
      this.showDeleteAbonoModal = true;
    },
    closeDeleteAbonoModal() {
      this.showDeleteAbonoModal = false;
      this.selectedAbono = null;
    },
    async deleteAbono() {
      if (!this.selectedAbono || !this.selectedAbono.noteId) {
        return;
      }

      this.isDeletingAbono = true;
      try {
        const noteRef = doc(db, 'notes', this.selectedAbono.noteId);
        const noteDoc = await getDoc(noteRef);
        if (!noteDoc.exists()) {
          alert('No se encontró la nota del abono');
          return;
        }

        const noteData = noteDoc.data();
        const currentAbonos = Array.isArray(noteData.abonos) ? noteData.abonos : [];
        const updatedAbonos = currentAbonos.filter((_, index) => index !== this.selectedAbono.abonoIndex);
        const isPaid = this.calculateNoteTotal(noteData) <= this.calculateNotePaid({ ...noteData, abonos: updatedAbonos });

        await updateDoc(noteRef, {
          abonos: updatedAbonos,
          isPaid
        });

        const clientName = noteData.client || 'Sin cliente';
        const rows = this.notesByClient[clientName];
        if (rows) {
          const i = rows.findIndex((n) => n.id === this.selectedAbono.noteId);
          if (i !== -1) {
            this.$set(rows[i], 'abonos', updatedAbonos);
            this.$set(rows[i], 'isPaid', isPaid);
          }
        }

        this.closeDeleteAbonoModal();
        await this.showAbonosHistory(this.selectedClient);
        this.currentPage = Math.min(this.currentPage, this.totalPages);
        alert('Abono eliminado con éxito');
      } catch (error) {
        console.error('Error al eliminar el abono:', error);
        alert('Hubo un error al eliminar el abono');
      } finally {
        this.isDeletingAbono = false;
      }
    }
  },
  mounted() {
    this.startNotesRealtime();
    this.startClientBalancesRealtime();
  },
  beforeDestroy() {
    if (this.unsubscribeNotes) {
      this.unsubscribeNotes();
      this.unsubscribeNotes = null;
    }
    if (this.unsubscribeClientBalances) {
      this.unsubscribeClientBalances();
      this.unsubscribeClientBalances = null;
    }
  }
};
</script>

<style scoped>
.notes-wrapper {
  --vw-bg-1: #140a2a;
  --vw-bg-2: #2a0e4a;
  --vw-bg-3: #1a3a78;
  --vw-neon-pink: #ff4fd8;
  --vw-neon-cyan: #3ef8ff;
  --vw-neon-purple: #a855f7;
  --vw-text: #f5ecff;
  --vw-soft: rgba(245, 236, 255, 0.78);
  width: 100%;
  max-width: 1050px;
  margin: 0 auto;
  padding: 16px;
  color: var(--vw-text);
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.notes-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--vw-neon-cyan);
  text-shadow: 0 0 12px rgba(62, 248, 255, 0.55);
}

.notes-description {
  margin: 6px 0 0;
  color: var(--vw-soft);
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.notes-container {
  background:
    linear-gradient(140deg, rgba(20, 10, 42, 0.9), rgba(42, 14, 74, 0.88) 55%, rgba(26, 58, 120, 0.86)),
    repeating-linear-gradient(
      180deg,
      rgba(255, 79, 216, 0.08) 0,
      rgba(255, 79, 216, 0.08) 1px,
      transparent 1px,
      transparent 8px
    );
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(168, 85, 247, 0.45);
  box-shadow:
    0 0 0 1px rgba(62, 248, 255, 0.2) inset,
    0 16px 35px rgba(3, 2, 20, 0.65);
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.control-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
  color: var(--vw-soft);
}

.control-field select,
.control-field input {
  padding: 10px 12px;
  border: 1px solid rgba(62, 248, 255, 0.35);
  border-radius: 10px;
  background: rgba(12, 16, 43, 0.85);
  color: var(--vw-text);
  font-size: 0.95rem;
}

.quick-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin-bottom: 12px;
  color: var(--vw-neon-cyan);
}

.status-msg {
  margin: 14px 0;
  padding: 12px;
  border-radius: 10px;
  background: rgba(16, 18, 56, 0.78);
  border: 1px solid rgba(255, 79, 216, 0.3);
  color: var(--vw-soft);
}

.client-card {
  margin-bottom: 12px;
}

.client-card details {
  background: rgba(8, 13, 40, 0.72);
  border: 1px solid rgba(255, 79, 216, 0.35);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.12);
}

.client-card summary {
  list-style: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  background: linear-gradient(135deg, rgba(255, 79, 216, 0.95), rgba(90, 54, 205, 0.95));
  color: #fff7ff;
}

.client-card summary::-webkit-details-marker {
  display: none;
}

.summary-main {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.client-name {
  font-weight: 700;
}

.client-debt {
  font-weight: 600;
}

.balance-favor {
  background: linear-gradient(135deg, #00d4ff, #38f7c8);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 0.8rem;
  white-space: nowrap;
  color: #111827;
  font-weight: 700;
}

.note-count {
  background: linear-gradient(135deg, #ffe66d, #ff9f5a);
  color: #28122d;
  border-radius: 999px;
  padding: 3px 10px;
  font-weight: 700;
  white-space: nowrap;
}

.notes-list {
  list-style: none;
  margin: 0;
  padding: 12px;
  display: grid;
  gap: 8px;
}

.note-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(62, 248, 255, 0.25);
  background: rgba(14, 18, 52, 0.62);
  border-radius: 10px;
}

.note-link {
  border: none;
  padding: 0;
  color: var(--vw-neon-cyan);
  cursor: pointer;
  background: transparent;
  text-align: left;
  text-decoration: underline;
}

.note-amount {
  font-size: 0.88rem;
  color: var(--vw-soft);
  white-space: nowrap;
}

.notes-list-pagination {
  padding: 0 12px 12px;
  border-top: 1px solid rgba(62, 248, 255, 0.12);
  margin-top: 0;
}

.notes-page-label {
  font-size: 0.88rem;
  color: var(--vw-soft);
  text-align: center;
  flex: 1;
  min-width: 0;
}

.client-actions {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-top: 1px solid rgba(255, 79, 216, 0.22);
}

.btn {
  border: none;
  border-radius: 999px;
  padding: 10px 16px;
  color: #ffffff;
  cursor: pointer;
  font-weight: 600;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  box-shadow: 0 0 16px rgba(168, 85, 247, 0.35);
}

.btn:hover {
  opacity: 0.95;
  transform: translateY(-1px);
  box-shadow: 0 0 22px rgba(62, 248, 255, 0.4);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-small {
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.85rem;
}

.btn-primary {
  background: linear-gradient(135deg, #ff4fd8, #8b5cf6);
}

.btn-secondary {
  background: linear-gradient(135deg, #3ef8ff, #2563eb);
  color: #0f172a;
}

.btn-success {
  background: linear-gradient(135deg, #34f5c5, #2dd4bf);
  color: #0f172a;
  flex: 1;
}

.btn-info {
  background: linear-gradient(135deg, #60a5fa, #22d3ee);
  color: #0f172a;
  flex: 1;
}

.btn-muted {
  background: linear-gradient(135deg, #64748b, #475569);
}

.btn-danger {
  background: linear-gradient(135deg, #ff5f9e, #ef4444);
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(8, 4, 28, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  z-index: 1100;
}

.modal-content {
  width: min(560px, 100%);
  background: linear-gradient(145deg, rgba(24, 12, 48, 0.97), rgba(20, 34, 74, 0.95));
  border: 1px solid rgba(62, 248, 255, 0.35);
  border-radius: 14px;
  padding: 16px;
  color: var(--vw-text);
  box-shadow:
    0 0 0 1px rgba(255, 79, 216, 0.2) inset,
    0 18px 35px rgba(3, 2, 20, 0.75);
}

.modal-wide {
  width: min(760px, 100%);
}

.modal-help {
  margin: 6px 0 10px;
  color: var(--vw-soft);
}

.abono-preview {
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(62, 248, 255, 0.3);
  border-radius: 10px;
  background: rgba(8, 13, 40, 0.7);
}

.abono-preview p {
  margin: 4px 0;
  color: var(--vw-soft);
}

.favor-msg {
  color: #34f5c5;
}

.modal-content input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(62, 248, 255, 0.35);
  background: rgba(10, 14, 38, 0.9);
  color: var(--vw-text);
}

.modal-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.abonos-history-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 12px;
}

.abonos-history-table th,
.abonos-history-table td {
  border: 1px solid rgba(62, 248, 255, 0.22);
  padding: 8px;
  text-align: left;
}

.abonos-history-table th {
  background: rgba(255, 79, 216, 0.18);
  color: var(--vw-neon-cyan);
}

.empty-cell {
  text-align: center;
  color: var(--vw-soft);
}

.pagination {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

@media (max-width: 768px) {
  .notes-wrapper {
    padding: 12px;
  }

  .notes-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions .btn {
    flex: 1;
  }

  .controls-grid {
    grid-template-columns: 1fr;
  }

  .client-card summary {
    flex-direction: column;
  }

  .note-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .notes-list-pagination {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .client-actions {
    flex-direction: column;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-actions .btn {
    width: 100%;
  }

  .pagination {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>