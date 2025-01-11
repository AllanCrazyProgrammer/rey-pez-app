<template>
  <div class="joselito-cuentas-menu-container">
    <h1>Menú de Cuentas Joselito</h1>
    
    <div class="actions-container">
      <router-link to="/cuentas-mexico" class="action-button back-btn">
        Cuentas México
      </router-link>
      <router-link to="/cuentas-joselito/nueva" class="action-button new-cuenta-btn">
        Nueva Cuenta
      </router-link>
      <router-link to="/ventas-ganancias-joselito" class="action-button ventas-ganancias-btn">
        Ventas y Ganancias
      </router-link>
      <PreciosHistorialModal />
    </div>

    <div class="abonos-generales-container">
      <button @click="showAbonoGeneralModal" class="action-button abono-btn">
        Realizar Abono General
      </button>
      <button @click="showAbonosGeneralesHistory" class="action-button history-btn">
        Historial de Abonos
      </button>
    </div>

    <div class="filter-container">
      <label for="filter-select">Filtrar por estado:</label>
      <select id="filter-select" v-model="filtroEstado">
        <option value="todas">Todas</option>
        <option value="pagadas">Pagadas</option>
        <option value="no-pagadas">No Pagadas</option>
      </select>
    </div>

    <div class="cuentas-list">
      <h2>Registros de Cuentas</h2>
      <div v-if="error" class="error-message">
        Error al cargar los datos: {{ error }}
      </div>
      <div v-else-if="isLoading" class="loading">Cargando registros...</div>
      <div v-else-if="cuentas.length === 0" class="no-records">
        No hay registros de cuentas que coincidan con el filtro.
      </div>
      <ul v-else>
        <li v-for="cuenta in cuentasFiltradas" :key="cuenta.id" class="cuenta-item">
          <div class="cuenta-content">
            <span class="cuenta-date">{{ formatDate(cuenta.fecha) }}</span>
            <p class="cuenta-summary">
              <span>Saldo Hoy: ${{ formatNumber(cuenta.saldoHoy) }}</span>
              <span>Total Acumulado: ${{ formatNumber(cuenta.totalNota) }}</span>
            </p>
            <span :class="['estado-cuenta', cuenta.estadoPagado ? 'pagado' : 'no-pagado']">
              {{ cuenta.estadoPagado ? 'Pagado' : 'No Pagado' }}
            </span>
          </div>
          <div class="cuenta-actions">
            <button @click="editarCuenta(cuenta.id)" class="edit-btn">Editar</button>  
            <button @click="borrarCuenta(cuenta.id)" class="delete-btn">Borrar</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Modal para realizar abono general -->
    <div v-if="showModal" class="modal">
      <div class="modal-content">
        <h2>Realizar Abono General</h2>
        <div class="input-group">
          <input 
            v-model.number="abonoAmount" 
            type="number" 
            placeholder="Cantidad a abonar"
            class="modal-input"
          >
          <input 
            v-model="abonoDescripcion" 
            type="text" 
            placeholder="Descripción (opcional)"
            class="modal-input"
          >
          <input 
            v-model="abonoFecha" 
            type="date" 
            class="modal-input"
            :max="new Date().toISOString().split('T')[0]"
          >
        </div>
        <div class="modal-buttons">
          <button @click="realizarAbonoGeneral" class="confirm-btn">Confirmar</button>
          <button @click="closeModal" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal para historial de abonos -->
    <div v-if="showAbonosHistoryModal" class="modal">
      <div class="modal-content">
        <h2>Historial de Abonos Generales</h2>
        <div class="abonos-table-container">
          <table class="abonos-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Descripción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(abono, index) in paginatedAbonos" :key="index">
                <td>{{ formatDate(abono.fecha) }}</td>
                <td>${{ formatNumber(abono.monto) }}</td>
                <td>{{ abono.descripcion || '-' }}</td>
                <td>
                  <button 
                    @click="openDeleteAbonoModal(abono.id)" 
                    class="delete-btn small"
                  >
                    Borrar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <button 
            @click="prevPage" 
            :disabled="currentPage === 1"
            class="pagination-btn"
          >
            Anterior
          </button>
          <span>Página {{ currentPage }} de {{ totalPages }}</span>
          <button 
            @click="nextPage" 
            :disabled="currentPage === totalPages"
            class="pagination-btn"
          >
            Siguiente
          </button>
        </div>
        <button @click="closeAbonosHistoryModal" class="close-btn">Cerrar</button>
      </div>
    </div>

    <!-- Modal para confirmar borrado -->
    <div v-if="showDeleteAbonoModal" class="modal">
      <div class="modal-content">
        <h2>Confirmar Borrado</h2>
        <p>¿Estás seguro de que quieres borrar este abono?</p>
        <div class="modal-buttons">
          <button @click="deleteAbono" class="confirm-btn">Confirmar</button>
          <button @click="closeDeleteAbonoModal" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, onSnapshot, where, updateDoc, addDoc, getDocs, getDoc } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';

export default {
  name: 'JoselitoCuentasMenu',
  components: {
    BackButton,
    PreciosHistorialModal
  },
  data() {
    return {
      cuentas: [],
      isLoading: true,
      filtroEstado: 'todas',
      unsubscribe: null,
      error: null,
      showModal: false,
      showAbonosHistoryModal: false,
      showDeleteAbonoModal: false,
      abonoAmount: null,
      abonoDescripcion: '',
      abonoFecha: new Date().toISOString().split('T')[0],
      selectedAbonoId: null,
      abonosGenerales: [],
      currentPage: 1,
      abonosPerPage: 7,
    };
  },
  computed: {
    cuentasFiltradas() {
      switch (this.filtroEstado) {
        case 'pagadas':
          return this.cuentas.filter(cuenta => cuenta.estadoPagado);
        case 'no-pagadas':
          return this.cuentas.filter(cuenta => !cuenta.estadoPagado);
        default:
          return this.cuentas;
      }
    },
    paginatedAbonos() {
      const start = (this.currentPage - 1) * this.abonosPerPage;
      const end = start + this.abonosPerPage;
      return this.abonosGenerales.slice(start, end);
    },
    totalPages() {
      return Math.ceil(this.abonosGenerales.length / this.abonosPerPage);
    }
  },
  methods: {
    async loadCuentas() {
      try {
        this.isLoading = true;
        const cuentasRef = collection(db, 'cuentasJoselito');
        const q = query(cuentasRef, orderBy('fecha', 'asc'));
        
        // Usar onSnapshot para actualizaciones en tiempo real
        this.unsubscribe = onSnapshot(q, async (querySnapshot) => {
          const cuentasActualizadas = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            const totalCobros = (data.cobros || []).reduce((sum, cobro) => 
              sum + (parseFloat(cobro.monto) || 0), 0);
            const totalAbonos = (data.abonos || []).reduce((sum, abono) => 
              sum + (parseFloat(abono.monto) || 0), 0);
            const totalDiaActual = (data.totalGeneralVenta || 0) - totalCobros - totalAbonos;

            return {
              id: doc.id,
              fecha: data.fecha,
              saldoHoy: data.totalGeneralVenta || 0,
              totalCobros,
              totalAbonos,
              totalNota: data.nuevoSaldoAcumulado || 0,
              estadoPagado: totalDiaActual === 0,
              nuevoSaldoAcumulado: data.nuevoSaldoAcumulado || 0,
              saldoAcumuladoAnterior: data.saldoAcumuladoAnterior || 0
            };
          });

          // Ordenar las cuentas por fecha
          const cuentasOrdenadas = cuentasActualizadas.sort((a, b) => 
            new Date(a.fecha) - new Date(b.fecha)
          );

          let saldoAcumulado = 0;
          const actualizaciones = [];

          // Procesar cada cuenta y preparar las actualizaciones
          for (let i = 0; i < cuentasOrdenadas.length; i++) {
            const cuenta = cuentasOrdenadas[i];
            const totalDia = cuenta.saldoHoy - cuenta.totalCobros - cuenta.totalAbonos;
            saldoAcumulado += totalDia;

            const saldoAnterior = i === 0 ? 0 : cuentasOrdenadas[i-1].nuevoSaldoAcumulado;
            
            // Solo actualizar si los valores han cambiado
            if (cuenta.saldoAcumuladoAnterior !== saldoAnterior || 
                cuenta.nuevoSaldoAcumulado !== saldoAcumulado) {
              
              actualizaciones.push({
                id: cuenta.id,
                updates: {
                  saldoAcumuladoAnterior: saldoAnterior,
                  nuevoSaldoAcumulado: saldoAcumulado,
                  estadoPagado: totalDia === 0
                }
              });
            }

            // Actualizar el objeto local
            cuenta.totalNota = saldoAcumulado;
            cuenta.saldoAcumuladoAnterior = saldoAnterior;
            cuenta.estadoPagado = (cuenta.saldoHoy - cuenta.totalCobros - cuenta.totalAbonos) === 0;

            // Reiniciar saldo si la cuenta está pagada
            if (saldoAcumulado <= 0) {
              saldoAcumulado = 0;
            }
          }

          // Realizar todas las actualizaciones en paralelo
          if (actualizaciones.length > 0) {
            await Promise.all(actualizaciones.map(({ id, updates }) => 
              updateDoc(doc(db, 'cuentasJoselito', id), updates)
            ));
          }

          // Actualizar el estado local con las cuentas ordenadas por fecha descendente
          this.cuentas = cuentasOrdenadas.reverse(); // Revertir para mostrar las más recientes primero
          this.isLoading = false;
        });

      } catch (error) {
        console.error("Error al cargar cuentas: ", error);
        this.error = error.message;
        this.cuentas = [];
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
      this.$router.push(`/cuentas-joselito/${id}?edit=true`);
    },
    async borrarCuenta(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de cuenta?')) {
        try {
          await deleteDoc(doc(db, 'cuentasJoselito', id));
          alert('Registro de cuenta borrado con éxito');
        } catch (error) {
          console.error("Error al borrar el registro de cuenta: ", error);
          alert('Error al borrar el registro de cuenta');
        }
      }
    },
    showAbonoGeneralModal() {
      this.showModal = true;
      this.abonoAmount = null;
      this.abonoDescripcion = '';
      this.abonoFecha = new Date().toISOString().split('T')[0];
    },
    closeModal() {
      this.showModal = false;
      this.abonoAmount = null;
      this.abonoDescripcion = '';
      this.abonoFecha = new Date().toISOString().split('T')[0];
    },
    async realizarAbonoGeneral() {
      if (!this.abonoAmount || this.abonoAmount <= 0) {
        alert('Por favor ingrese una cantidad válida');
        return;
      }

      if (!this.abonoFecha) {
        alert('Por favor seleccione una fecha para el abono');
        return;
      }

      try {
        // Obtener las cuentas no pagadas ordenadas por fecha (la más antigua primero)
        const cuentasNoPagadas = this.cuentas
          .filter(cuenta => !cuenta.estadoPagado)
          .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        if (cuentasNoPagadas.length === 0) {
          alert('No hay cuentas pendientes por pagar');
          return;
        }

        let montoRestante = this.abonoAmount;
        const actualizaciones = [];

        // Preparar los datos del abono general
        const abonoGeneralData = {
          monto: this.abonoAmount,
          descripcion: this.abonoDescripcion,
          fecha: this.abonoFecha,
          tipo: 'general'
        };

        // Crear el abono general
        const abonoGeneralRef = await addDoc(collection(db, 'abonosGeneralesJoselito'), abonoGeneralData);

        // Procesar las cuentas en paralelo
        const promesasCuentas = cuentasNoPagadas.map(async (cuenta) => {
          if (montoRestante <= 0) return null;

          const cuentaRef = doc(db, 'cuentasJoselito', cuenta.id);
          const cuentaDoc = await getDoc(cuentaRef);
          const cuentaData = cuentaDoc.data();

          const totalCobros = (cuentaData.cobros || []).reduce((sum, cobro) => 
            sum + (parseFloat(cobro.monto) || 0), 0);
          const totalAbonos = (cuentaData.abonos || []).reduce((sum, abono) => 
            sum + (parseFloat(abono.monto) || 0), 0);
          const saldoPendiente = cuentaData.totalGeneralVenta - totalCobros - totalAbonos;

          if (saldoPendiente > 0) {
            const montoAplicar = Math.min(montoRestante, saldoPendiente);
            montoRestante -= montoAplicar;

            if (montoAplicar > 0) {
              const abonosActuales = cuentaData.abonos || [];
              return {
                ref: cuentaRef,
                data: {
                  abonos: [
                    ...abonosActuales,
                    {
                      monto: montoAplicar,
                      fecha: this.abonoFecha,
                      descripcion: this.abonoDescripcion || 'Abono general automático',
                      tipo: 'general',
                      abonoGeneralId: abonoGeneralRef.id
                    }
                  ],
                  estadoPagado: montoAplicar >= saldoPendiente
                }
              };
            }
          }
          return null;
        });

        // Esperar a que se procesen todas las cuentas
        const resultados = await Promise.all(promesasCuentas);

        // Filtrar los resultados nulos y aplicar las actualizaciones
        const actualizacionesFiltradas = resultados.filter(r => r !== null);
        await Promise.all(actualizacionesFiltradas.map(({ ref, data }) => updateDoc(ref, data)));

        // Recargar los datos
        await this.loadCuentas();
        await this.fetchAbonosGenerales();
        
        this.closeModal();
        alert('Abono realizado con éxito');
      } catch (error) {
        console.error('Error al realizar abono:', error);
        alert('Error al realizar el abono');
      }
    },
    async showAbonosGeneralesHistory() {
      this.currentPage = 1;
      await this.fetchAbonosGenerales();
      this.showAbonosHistoryModal = true;
    },
    async fetchAbonosGenerales() {
      try {
        const q = query(
          collection(db, 'abonosGeneralesJoselito'),
          orderBy('fecha', 'desc')
        );
        const querySnapshot = await getDocs(q);
        this.abonosGenerales = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Error al obtener abonos:', error);
      }
    },
    closeAbonosHistoryModal() {
      this.showAbonosHistoryModal = false;
    },
    openDeleteAbonoModal(abonoId) {
      this.selectedAbonoId = abonoId;
      this.showDeleteAbonoModal = true;
    },
    async deleteAbono() {
      try {
        // Primero obtener el abono que se va a eliminar
        const abonoRef = doc(db, 'abonosGeneralesJoselito', this.selectedAbonoId);
        const abonoDoc = await getDoc(abonoRef);
        const abonoData = abonoDoc.data();

        if (!abonoData) {
          throw new Error('No se encontró el abono');
        }

        const actualizaciones = [];

        // Obtener todas las cuentas
        const cuentasRef = collection(db, 'cuentasJoselito');
        const cuentasSnapshot = await getDocs(cuentasRef);
        
        // Procesar cada cuenta
        for (const cuentaDoc of cuentasSnapshot.docs) {
          const cuentaData = cuentaDoc.data();
          
          // Verificar si la cuenta tiene abonos
          if (cuentaData.abonos && Array.isArray(cuentaData.abonos)) {
            // Filtrar los abonos usando el ID del abono general
            const abonosFiltrados = cuentaData.abonos.filter(abono => 
              abono.abonoGeneralId !== this.selectedAbonoId
            );

            // Si se encontró y eliminó algún abono
            if (abonosFiltrados.length !== cuentaData.abonos.length) {
              // Recalcular totales
              const totalAbonos = abonosFiltrados.reduce((sum, abono) => 
                sum + (parseFloat(abono.monto) || 0), 0);
              const totalCobros = (cuentaData.cobros || []).reduce((sum, cobro) => 
                sum + (parseFloat(cobro.monto) || 0), 0);
              const saldoPendiente = cuentaData.totalGeneralVenta - totalCobros - totalAbonos;

              // Preparar la actualización
              actualizaciones.push(updateDoc(doc(db, 'cuentasJoselito', cuentaDoc.id), {
                abonos: abonosFiltrados,
                estadoPagado: saldoPendiente <= 0
              }));
            }
          }
        }

        // Eliminar el abono del historial
        await deleteDoc(abonoRef);

        // Aplicar todas las actualizaciones
        if (actualizaciones.length > 0) {
          await Promise.all(actualizaciones);
        }

        // Recargar los datos
        await this.loadCuentas();
        await this.fetchAbonosGenerales();
        this.closeDeleteAbonoModal();
        alert('Abono eliminado con éxito de todas las cuentas');
      } catch (error) {
        console.error('Error al eliminar abono:', error);
        alert('Error al eliminar el abono: ' + error.message);
      }
    },
    closeDeleteAbonoModal() {
      this.showDeleteAbonoModal = false;
      this.selectedAbonoId = null;
    },
    prevPage() {
      if (this.currentPage > 1) this.currentPage--;
    },
    nextPage() {
      if (this.currentPage < this.totalPages) this.currentPage++;
    },
    async actualizarSaldosAcumulados() {
      try {
        const cuentasRef = collection(db, 'cuentasJoselito');
        const q = query(cuentasRef, orderBy('fecha', 'asc'));
        const querySnapshot = await getDocs(q);
        const cuentasOrdenadas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        let saldoAcumulado = 0;
        const actualizaciones = [];

        for (let i = 0; i < cuentasOrdenadas.length; i++) {
          const cuenta = cuentasOrdenadas[i];
          const totalCobros = (cuenta.cobros || []).reduce((sum, cobro) => 
            sum + (parseFloat(cobro.monto) || 0), 0);
          const totalAbonos = (cuenta.abonos || []).reduce((sum, abono) => 
            sum + (parseFloat(abono.monto) || 0), 0);
          const totalDia = cuenta.totalGeneralVenta - totalCobros - totalAbonos;
          
          saldoAcumulado += totalDia;
          
          actualizaciones.push(updateDoc(doc(db, 'cuentasJoselito', cuenta.id), {
            saldoAcumuladoAnterior: i === 0 ? 0 : cuentasOrdenadas[i-1].nuevoSaldoAcumulado || 0,
            nuevoSaldoAcumulado: saldoAcumulado,
            estadoPagado: totalDia <= 0
          }));

          if (saldoAcumulado <= 0) {
            saldoAcumulado = 0;
          }
        }

        await Promise.all(actualizaciones);
      } catch (error) {
        console.error('Error al actualizar saldos acumulados:', error);
        throw error;
      }
    }
  },
  created() {
    this.loadCuentas();
  },
  beforeUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
};
</script>

<style scoped>
.joselito-cuentas-menu-container {
  max-width: 800px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

h1, h2 {
  color: #2196F3;
  text-align: center;
}

.actions-container {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.action-button {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.action-button:hover {
  background-color: #1976D2;
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
  margin-bottom: 15px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.3s ease;
}

.cuenta-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.cuenta-content {
  margin-bottom: 10px;
}

.cuenta-date {
  color: #2196F3;
  font-weight: bold;
  font-size: 1.1em;
  display: block;
  margin-bottom: 5px;
}

.cuenta-summary {
  font-size: 0.9em;
  color: #666;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cuenta-summary span {
  flex: 1 1 auto;
}

.cuenta-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.edit-btn, .delete-btn {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s ease;
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
  .joselito-cuentas-menu-container {
    padding: 10px;
    width: 100%;
  }

  .actions-container {
    flex-direction: column;
    gap: 10px;
  }

  .action-button {
    width: 100%;
    text-align: center;
  }

  .cuenta-item {
    padding: 10px;
  }

  .cuenta-date {
    font-size: 1em;
  }

  .cuenta-summary {
    flex-direction: column;
    align-items: flex-start;
  }

  .cuenta-summary span {
    width: 100%;
  }

  .cuenta-actions {
    flex-direction: row;
    justify-content: space-between;
  }

  .edit-btn, .delete-btn {
    padding: 8px 15px;
    font-size: 0.8em;
    flex-grow: 1;
  }
}

.filter-container {
  margin-bottom: 20px;
  text-align: right;
}

.filter-container select {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.estado-cuenta {
  font-weight: bold;
  padding: 5px 10px;
  border-radius: 4px;
  display: inline-block;
  margin-top: 10px;
}

.pagado {
  background-color: #4CAF50;
  color: white;
}

.no-pagado {
  background-color: #f44336;
  color: white;
}

.ventas-ganancias-btn {
  background-color: #4CAF50;
}

.ventas-ganancias-btn:hover {
  background-color: #45a049;
}

.error-message {
  color: #f44336;
  text-align: center;
  padding: 10px;
  margin: 10px 0;
  background-color: #ffebee;
  border-radius: 4px;
}

.abonos-generales-container {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
}

.abono-btn {
  background-color: #4CAF50;
}

.history-btn {
  background-color: #2196F3;
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
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 20px 0;
}

.modal-input {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.modal-input[type="date"] {
  font-family: inherit;
  color: #333;
  background-color: white;
}

.modal-input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.6;
  filter: invert(0.8);
}

.modal-input[type="date"]::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.confirm-btn {
  background-color: #4CAF50;
  color: white;
}

.cancel-btn {
  background-color: #f44336;
  color: white;
}

.abonos-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
}

.abonos-table th,
.abonos-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.abonos-table th {
  background-color: #f5f5f5;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0;
}

.pagination-btn {
  padding: 5px 10px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.pagination-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.delete-btn.small {
  padding: 5px 10px;
  font-size: 0.8em;
}

@media (max-width: 768px) {
  .abonos-generales-container {
    flex-direction: column;
  }

  .modal-content {
    width: 95%;
    padding: 15px;
  }

  .abonos-table {
    font-size: 14px;
  }

  .abonos-table th,
  .abonos-table td {
    padding: 8px;
  }
}
</style> 