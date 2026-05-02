<template>
  <div class="buenos-dias">
    <div class="bd-intro">
      <h2 class="bd-title">🌅 Buenos Días</h2>
      <p class="bd-desc">
        Cada día gana un punto la primera persona que dice "buenos días". Selecciona un día del calendario
        para registrar al ganador.
      </p>
    </div>

    <!-- Gestión de participantes -->
    <div class="participants-card">
      <div class="participants-header">
        <h3>Participantes</h3>
        <form @submit.prevent="addParticipant" class="add-participant">
          <input
            v-model="newParticipant"
            type="text"
            placeholder="Nombre del participante"
            class="input"
            maxlength="40"
          />
          <button type="submit" class="btn-primary" :disabled="!newParticipant.trim() || saving">
            Agregar
          </button>
        </form>
      </div>

      <div v-if="participants.length === 0" class="empty">
        Aún no hay participantes. Agrega al menos uno para empezar.
      </div>
      <ul v-else class="participants-list">
        <li v-for="p in participants" :key="p.id" class="participant-pill">
          <span class="dot" :style="{ background: colorFor(p.name) }"></span>
          <span class="name">{{ p.name }}</span>
          <span class="score">{{ totalsByName[p.name] || 0 }} pts</span>
          <button class="btn-remove" :title="'Eliminar a ' + p.name" @click="removeParticipant(p)">×</button>
        </li>
      </ul>
    </div>

    <!-- Tabla de posiciones del mes actual -->
    <div v-if="participants.length > 0" class="leaderboard-card">
      <h3>Posiciones · {{ monthLabel }}</h3>
      <ol class="leaderboard">
        <li
          v-for="(entry, idx) in leaderboard"
          :key="entry.name"
          :class="['lb-row', { gold: idx === 0 && entry.points > 0 }]"
        >
          <span class="lb-rank">{{ idx + 1 }}</span>
          <span class="dot" :style="{ background: colorFor(entry.name) }"></span>
          <span class="lb-name">{{ entry.name }}</span>
          <span class="lb-points">{{ entry.points }} pts</span>
        </li>
      </ol>
    </div>

    <!-- Calendario -->
    <div class="calendar-card">
      <div class="calendar-header">
        <button class="nav-btn" @click="changeMonth(-1)" aria-label="Mes anterior">‹</button>
        <h3 class="calendar-title">{{ monthLabel }}</h3>
        <button class="nav-btn" @click="changeMonth(1)" aria-label="Mes siguiente">›</button>
      </div>

      <div class="weekdays">
        <span v-for="d in weekdays" :key="d">{{ d }}</span>
      </div>

      <div class="grid">
        <div
          v-for="(cell, idx) in calendarCells"
          :key="idx"
          :class="[
            'cell',
            { empty: !cell.date, today: cell.isToday, future: cell.isFuture, has: !!cell.entry }
          ]"
          @click="cell.date && !cell.isFuture ? openDay(cell) : null"
        >
          <template v-if="cell.date">
            <span class="cell-num">{{ cell.day }}</span>
            <div v-if="cell.entry" class="cell-winner">
              <span class="dot" :style="{ background: colorFor(cell.entry.winner) }"></span>
              <span class="cell-name">{{ cell.entry.winner }}</span>
              <span v-if="cell.entry.points && cell.entry.points !== 1" class="cell-pts">+{{ cell.entry.points }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Modal de registro/edición -->
    <div v-if="modalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <header class="modal-header">
          <h3>{{ formatDate(selectedDate) }}</h3>
          <button class="btn-close" @click="closeModal">×</button>
        </header>

        <div class="modal-body">
          <label class="field-label">¿Quién dijo "buenos días" primero?</label>
          <div v-if="participants.length === 0" class="empty">
            Agrega participantes primero.
          </div>
          <div v-else class="winner-options">
            <button
              v-for="p in participants"
              :key="p.id"
              :class="['winner-btn', { selected: form.winner === p.name }]"
              @click="form.winner = p.name"
            >
              <span class="dot" :style="{ background: colorFor(p.name) }"></span>
              {{ p.name }}
            </button>
          </div>

          <label class="field-label" style="margin-top: 16px;">Puntos otorgados</label>
          <input v-model.number="form.points" type="number" min="0" max="10" class="input" />

          <label class="field-label" style="margin-top: 16px;">Nota (opcional)</label>
          <textarea v-model="form.note" class="input" rows="2" maxlength="200"></textarea>
        </div>

        <footer class="modal-footer">
          <button v-if="existingEntry" class="btn-danger" :disabled="saving" @click="deleteEntry">
            Eliminar
          </button>
          <button class="btn-secondary" @click="closeModal">Cancelar</button>
          <button class="btn-primary" :disabled="!form.winner || saving" @click="saveEntry">
            {{ saving ? 'Guardando...' : 'Guardar' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

const COL_ENTRIES = 'alanMarieBuenosDias';
const COL_PARTICIPANTS = 'alanMarieParticipantes';

const PALETTE = [
  '#74c0fc', '#4dabf7', '#339af0', '#228be6', '#1c7ed6',
  '#1971c2', '#22b8cf', '#15aabf', '#3a86ff', '#4361ee'
];

export default {
  name: 'BuenosDias',
  data() {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      participants: [],
      entries: {},
      newParticipant: '',
      modalOpen: false,
      selectedDate: null,
      form: { winner: '', points: 1, note: '' },
      saving: false,
      unsubEntries: null,
      unsubParticipants: null,
      weekdays: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    };
  },
  computed: {
    monthLabel() {
      const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      return `${meses[this.month]} ${this.year}`;
    },
    calendarCells() {
      const first = new Date(this.year, this.month, 1);
      const startOffset = first.getDay();
      const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const cells = [];
      for (let i = 0; i < startOffset; i++) cells.push({ date: null });

      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(this.year, this.month, d);
        const key = this.dateKey(date);
        cells.push({
          date,
          day: d,
          isToday: date.getTime() === today.getTime(),
          isFuture: date.getTime() > today.getTime(),
          entry: this.entries[key] || null
        });
      }
      return cells;
    },
    totalsByName() {
      const totals = {};
      Object.values(this.entries).forEach(e => {
        if (!e || !e.winner) return;
        totals[e.winner] = (totals[e.winner] || 0) + (e.points || 1);
      });
      return totals;
    },
    leaderboard() {
      const monthPrefix = `${this.year}-${String(this.month + 1).padStart(2, '0')}`;
      const scoped = {};
      Object.entries(this.entries).forEach(([k, e]) => {
        if (!k.startsWith(monthPrefix) || !e?.winner) return;
        scoped[e.winner] = (scoped[e.winner] || 0) + (e.points || 1);
      });

      const rows = this.participants.map(p => ({ name: p.name, points: scoped[p.name] || 0 }));
      rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
      return rows;
    },
    existingEntry() {
      if (!this.selectedDate) return null;
      return this.entries[this.dateKey(this.selectedDate)] || null;
    }
  },
  created() {
    this.subscribe();
  },
  beforeDestroy() {
    if (this.unsubEntries) this.unsubEntries();
    if (this.unsubParticipants) this.unsubParticipants();
  },
  methods: {
    dateKey(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    },
    formatDate(d) {
      if (!d) return '';
      return d.toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    },
    colorFor(name) {
      if (!name) return '#888';
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
      return PALETTE[hash % PALETTE.length];
    },
    subscribe() {
      this.unsubParticipants = onSnapshot(collection(db, COL_PARTICIPANTS), snap => {
        this.participants = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      });

      this.unsubEntries = onSnapshot(collection(db, COL_ENTRIES), snap => {
        const map = {};
        snap.docs.forEach(d => { map[d.id] = d.data(); });
        this.entries = map;
      });
    },
    changeMonth(delta) {
      let m = this.month + delta;
      let y = this.year;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      this.month = m;
      this.year = y;
    },
    async addParticipant() {
      const name = this.newParticipant.trim();
      if (!name) return;
      if (this.participants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        this.newParticipant = '';
        return;
      }
      this.saving = true;
      try {
        await addDoc(collection(db, COL_PARTICIPANTS), {
          name,
          createdAt: serverTimestamp()
        });
        this.newParticipant = '';
      } catch (err) {
        console.error('Error agregando participante:', err);
        alert('No se pudo agregar al participante.');
      } finally {
        this.saving = false;
      }
    },
    async removeParticipant(p) {
      if (!confirm(`¿Eliminar a ${p.name}? Sus puntos registrados se conservarán en los días ya guardados.`)) return;
      try {
        await deleteDoc(doc(db, COL_PARTICIPANTS, p.id));
      } catch (err) {
        console.error('Error eliminando participante:', err);
        alert('No se pudo eliminar al participante.');
      }
    },
    openDay(cell) {
      this.selectedDate = cell.date;
      const existing = cell.entry;
      this.form = existing
        ? { winner: existing.winner || '', points: existing.points ?? 1, note: existing.note || '' }
        : { winner: '', points: 1, note: '' };
      this.modalOpen = true;
    },
    closeModal() {
      this.modalOpen = false;
      this.selectedDate = null;
      this.form = { winner: '', points: 1, note: '' };
    },
    async saveEntry() {
      if (!this.form.winner || !this.selectedDate) return;
      this.saving = true;
      try {
        const id = this.dateKey(this.selectedDate);
        await setDoc(doc(db, COL_ENTRIES, id), {
          winner: this.form.winner,
          points: Number(this.form.points) || 1,
          note: this.form.note || '',
          date: id,
          updatedAt: serverTimestamp()
        }, { merge: true });
        this.closeModal();
      } catch (err) {
        console.error('Error guardando registro:', err);
        alert('No se pudo guardar el registro.');
      } finally {
        this.saving = false;
      }
    },
    async deleteEntry() {
      if (!this.selectedDate) return;
      if (!confirm('¿Eliminar el registro de este día?')) return;
      this.saving = true;
      try {
        const id = this.dateKey(this.selectedDate);
        await deleteDoc(doc(db, COL_ENTRIES, id));
        this.closeModal();
      } catch (err) {
        console.error('Error eliminando registro:', err);
        alert('No se pudo eliminar el registro.');
      } finally {
        this.saving = false;
      }
    }
  }
};
</script>

<style scoped>
.buenos-dias {
  display: flex;
  flex-direction: column;
  gap: 18px;
  color: #f5f5f5;
}

.bd-intro {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 18px 20px;
}

.bd-title {
  margin: 0 0 6px 0;
  color: #4dabf7;
  font-size: 1.4rem;
}

.bd-desc {
  margin: 0;
  color: #c5c5d6;
  font-size: 0.95rem;
}

/* Tarjetas */
.participants-card,
.leaderboard-card,
.calendar-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 18px 20px;
}

.participants-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.participants-header h3,
.calendar-title,
.leaderboard-card h3 {
  margin: 0;
  color: #fff;
  font-size: 1.1rem;
}

.add-participant {
  display: flex;
  gap: 8px;
}

.input {
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: #fff;
  outline: none;
  font-size: 0.95rem;
  font-family: inherit;
  width: 100%;
}

.input:focus {
  border-color: #4dabf7;
}

.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, background 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #4dabf7 0%, #1c7ed6 100%);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(77, 171, 247, 0.35);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-danger {
  background: #ff6b6b;
  color: #fff;
  margin-right: auto;
}

.btn-danger:hover:not(:disabled) {
  background: #e84118;
}

.empty {
  color: #9ca3af;
  font-size: 0.95rem;
  padding: 8px 0;
}

.participants-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.participant-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.participant-pill .name {
  font-weight: 600;
}

.participant-pill .score {
  color: #c5c5d6;
  font-size: 0.85rem;
}

.btn-remove {
  background: transparent;
  border: none;
  color: #c5c5d6;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  padding: 0 4px;
}

.btn-remove:hover {
  color: #ff6b6b;
}

/* Leaderboard */
.leaderboard {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lb-row {
  display: grid;
  grid-template-columns: 32px 14px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.lb-row.gold {
  background: linear-gradient(90deg, rgba(116, 192, 252, 0.18), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(116, 192, 252, 0.4);
}

.lb-rank {
  color: #9ca3af;
  font-weight: 700;
  text-align: center;
}

.lb-name {
  font-weight: 600;
}

.lb-points {
  color: #4dabf7;
  font-weight: 700;
}

/* Calendario */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 1.4rem;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 6px;
  color: #9ca3af;
  font-size: 0.85rem;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.cell {
  min-height: 80px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: border-color 0.15s, background 0.15s, transform 0.1s;
}

.cell:hover:not(.empty):not(.future) {
  border-color: rgba(77, 171, 247, 0.5);
  transform: translateY(-1px);
}

.cell.empty {
  background: transparent;
  border-color: transparent;
  cursor: default;
}

.cell.today {
  border-color: #4dabf7;
  box-shadow: 0 0 0 1px rgba(77, 171, 247, 0.4) inset;
}

.cell.future {
  opacity: 0.45;
  cursor: not-allowed;
}

.cell.has {
  background: rgba(77, 171, 247, 0.08);
}

.cell-num {
  font-weight: 700;
  font-size: 0.95rem;
  color: #fff;
}

.cell-winner {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  padding: 3px 6px;
  border-radius: 6px;
  overflow: hidden;
}

.cell-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell-pts {
  margin-left: auto;
  color: #74c0fc;
  font-weight: 700;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 460px;
  background: linear-gradient(135deg, #14233a 0%, #1e3a5f 100%);
  border: 1px solid rgba(77, 171, 247, 0.4);
  border-radius: 14px;
  padding: 0;
  color: #fff;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h3 {
  margin: 0;
  color: #4dabf7;
  text-transform: capitalize;
}

.btn-close {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.6rem;
  cursor: pointer;
  line-height: 1;
}

.modal-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
}

.field-label {
  font-size: 0.9rem;
  color: #c5c5d6;
  margin-bottom: 8px;
}

.winner-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.winner-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.15s, border-color 0.15s;
}

.winner-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.winner-btn.selected {
  background: rgba(77, 171, 247, 0.2);
  border-color: #4dabf7;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

@media (max-width: 600px) {
  .cell {
    min-height: 64px;
  }
  .cell-winner {
    font-size: 0.7rem;
  }
  .add-participant {
    width: 100%;
  }
}
</style>
