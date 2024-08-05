<template>
  <div class="ozuna-cuentas-menu-container">
    <h1>Menú de Cuentas Ozuna</h1>
    
    <div class="actions-container">
      <router-link to="/cuentas-mexico" class="action-button back-btn">
        Cuentas México
      </router-link>
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
  <div class="cuenta-content">
    <span class="cuenta-date">{{ formatDate(cuenta.fecha) }}</span>
    <div class="cuenta-summary">
      <span>Total: ${{ formatNumber(cuenta.totalSaldo) }}</span>
      <span v-if="cuenta.totalAbonos > 0" style="margin-left: 20px;">Abonos: ${{ formatNumber(cuenta.totalAbonos) }}</span>
      <span style="margin-left: 20px;">Saldo Acumulado: ${{ formatNumber(cuenta.saldoAcumulado) }}</span>
    </div>
  </div>
  <div class="cuenta-actions">
    <button @click="editarCuenta(cuenta.id)" class="edit-btn">Editar</button>  
    <button @click="borrarCuenta(cuenta.id)" class="delete-btn">Borrar</button>
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
        this.isLoading = true;
        const cuentasRef = collection(db, 'cuentasOzuna');
        const q = query(cuentasRef, orderBy('fecha', 'asc'));
        const querySnapshot = await getDocs(q);
        let saldoAcumulado = 0;
        this.cuentas = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          const totalCuenta = data.totalSaldo || 0;
          const totalAbonos = (data.abonos || []).reduce((sum, abono) => sum + abono.monto, 0);
          
          // Sumamos el total de la cuenta al saldo acumulado si es positivo
          if (totalCuenta > 0) {
            saldoAcumulado += totalCuenta;
          }
          
          // Restamos los abonos del saldo acumulado
          saldoAcumulado -= totalAbonos;
          
          return {
            id: doc.id,
            ...data,
            totalAbonos: totalAbonos,
            saldoAcumulado: saldoAcumulado
          };
        });
        this.cuentas.reverse();
      } catch (error) {
        console.error("Error al cargar cuentas: ", error);
        this.cuentas = [];
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(date) {
      const fechaLocal = new Date(date);
      fechaLocal.setMinutes(fechaLocal.getMinutes() + fechaLocal.getTimezoneOffset());
      return fechaLocal.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    formatNumber(value) {
      return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    editarCuenta(id) {
      this.$router.push(`/cuentas-ozuna/${id}?edit=true`);
    },
    async borrarCuenta(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de cuenta?')) {
        try {
          await deleteDoc(doc(db, 'cuentasOzuna', id));
          this.cuentas = this.cuentas.filter(cuenta => cuenta.id !== id);
          alert('Registro de cuenta borrado con éxito');
          this.loadCuentas(); // Recargar las cuentas para actualizar los saldos acumulados
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
/* ... (mantén los estilos que ya tenías) ... */
</style>

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

.back-btn {
  background-color: #6c757d;
}

.back-btn:hover {
  background-color: #5a6268;
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

  .actions-container {
    flex-direction: column;
    gap: 10px;
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

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 80%;
  max-width: 500px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.save-btn, .cancel-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 10px;
}

.save-btn {
  background-color: #4CAF50;
  color: white;
}

.cancel-btn {
  background-color: #f44336;
  color: white;
}

textarea {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>