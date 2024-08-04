<template>
  <div class="ozuna-cuentas-menu-container">
    <h1>Menú de Cuentas Ozuna</h1>
    
    <div class="actions-container">
      <router-link to="/cuentas-ozuna/nueva" class="action-button new-cuenta-btn">
        Nueva Cuenta
      </router-link>
    </div>

    <div class="cuentas-list">
      <h2>Registros de Cuentas</h2>
      <div v-if="isLoading" class="loading">Cargando registros...</div>
      <div v-else-if="cuentas.length === 0" class="no-records">
        No hay registros de cuentas.
      </div>
      <ul v-else>
        <li v-for="cuenta in cuentas" :key="cuenta.id" class="cuenta-item">
          <div class="cuenta-content" @click="verCuenta(cuenta.id)">
            <span class="cuenta-date">{{ formatDate(cuenta.fecha) }}</span>
            <div class="cuenta-summary">
              <span>Total: ${{ formatNumber(cuenta.totalSaldo) }}</span>
            </div>
          </div>
          <div class="cuenta-actions">
            <button @click.stop="editarCuenta(cuenta.id)" class="edit-btn">Editar</button>
            <button @click.stop="borrarCuenta(cuenta.id)" class="delete-btn">Borrar</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';

export default {
  name: 'OzunaCuentasMenu',
  data() {
    return {
      cuentas: [],
      isLoading: true
    };
  },
  methods: {
    async loadCuentas() {
      try {
        const cuentasRef = collection(db, 'cuentasOzuna');
        const q = query(cuentasRef, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        this.cuentas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar cuentas: ", error);
        this.cuentas = [];
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(date) {
      return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    formatNumber(value) {
      return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    verCuenta(id) {
      this.$router.push(`/cuentas-ozuna/${id}`);
    },
    editarCuenta(id) {
      this.$router.push(`/cuentas-ozuna/editar/${id}`);
    },
    async borrarCuenta(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de cuenta?')) {
        try {
          await deleteDoc(doc(db, 'cuentasOzuna', id));
          this.cuentas = this.cuentas.filter(cuenta => cuenta.id !== id);
          alert('Registro de cuenta borrado con éxito');
        } catch (error) {
          console.error("Error al borrar el registro de cuenta: ", error);
          alert('Error al borrar el registro de cuenta');
        }
      }
    }
  },
  mounted() {
    this.loadCuentas();
  }
};
</script>

<style scoped>
.ozuna-cuentas-menu-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

h1, h2 {
  color: #3760b0;
}

.actions-container {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.action-button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}

.action-button:hover {
  background-color: #2a4a87;
}

.cuentas-list {
  background-color: #f0f4f8;
  border-radius: 8px;
  padding: 20px;
  flex-grow: 1;
}

.loading, .no-records {
  text-align: center;
  color: #666;
  padding: 20px;
}

.cuenta-item {
  background-color: white;
  border-radius: 4px;
  margin-bottom: 10px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cuenta-content {
  flex-grow: 1;
  cursor: pointer;
}

.cuenta-date {
  color: #3760b0;
  font-weight: bold;
  font-size: 1.1em;
}

.cuenta-summary {
  margin-top: 5px;
  font-size: 0.9em;
  color: #666;
}

.cuenta-actions {
  display: flex;
  gap: 10px;
}

.edit-btn, .delete-btn {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.edit-btn {
  background-color: #4CAF50;
  color: white;
}

.edit-btn:hover {
  background-color: #45a049;
}

.delete-btn {
  background-color: #f44336;
  color: white;
}

.delete-btn:hover {
  background-color: #d32f2f;
}

@media (max-width: 768px) {
  .ozuna-cuentas-menu-container {
    padding: 10px;
  }

  .action-button {
    width: 100%;
  }

  .cuenta-item {
    flex-direction: column;
    align-items: stretch;
  }

  .cuenta-actions {
    margin-top: 10px;
    justify-content: flex-end;
  }
}
</style>
