<template>
  <div class="otilio-cuentas-menu-container">
    <h1>Menú de Cuentas Otilio</h1>
    
    <div class="actions-container">
      <router-link to="/cuentas-mexico" class="action-button back-btn">
        Cuentas México
      </router-link>
      <router-link to="/cuentas-otilio/nueva" class="action-button new-cuenta-btn">
        Nueva Cuenta
      </router-link>
      <button @click="showAbonosModal = true" class="action-button abonos-btn">
        Abonos
      </button>
      <PreciosHistorialModal clienteActual="otilio" />
      <StashModal cliente="otilio" />
    </div>

    <!-- Modal de Abonos -->
    <div v-if="showAbonosModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Historial de Abonos</h2>
          <button @click="showAbonosModal = false" class="close-modal-btn">&times;</button>
        </div>
        
        <div class="fecha-filtros">
          <div class="fecha-grupo">
            <label>Desde:</label>
            <input 
              type="date" 
              v-model="fechaInicio" 
              class="fecha-input"
              @change="calcularTotalAbonos"
            >
          </div>
          <div class="fecha-grupo">
            <label>Hasta:</label>
            <input 
              type="date" 
              v-model="fechaFin" 
              class="fecha-input"
              @change="calcularTotalAbonos"
            >
          </div>
        </div>

        <div v-if="totalAbonosPeriodo !== null" class="total-abonos">
          <span class="total-label">Total de abonos en el periodo:</span>
          <span class="total-monto">${{ formatNumber(totalAbonosPeriodo) }}</span>
        </div>

        <div class="abonos-list">
          <div v-if="abonosHistorial.length === 0" class="no-records">
            No hay abonos registrados.
          </div>
          <div v-else>
            <div v-for="(abono, index) in abonosHistorial" :key="index" class="abono-item">
              <div class="abono-fecha">{{ formatDate(abono.fecha) }}</div>
              <div class="abono-details">
                <span class="abono-monto">${{ formatNumber(abono.monto) }}</span>
                <span class="abono-descripcion">{{ abono.descripcion }}</span>
              </div>
            </div>
          </div>
        </div>
        <button @click="showAbonosModal = false" class="close-btn">Cerrar</button>
      </div>
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
        <li v-for="cuenta in cuentas" 
            :key="cuenta.id" 
            class="cuenta-item"
            :class="{ 'tiene-observacion': cuenta.tieneObservacion }">
          <div class="cuenta-content">
            <span class="cuenta-date">{{ formatDate(cuenta.fecha) }}</span>
            <p class="cuenta-summary">
              <span>Saldo Hoy: ${{ formatNumber(cuenta.saldoHoy) }}</span>
              <span>Total Acumulado: ${{ formatNumber(cuenta.totalNota) }}</span>
            </p>
            <div v-if="cuenta.tieneObservacion" class="observacion-badge" @click="mostrarObservacion(cuenta)">
              Ver observación
            </div>
            <div v-if="cuenta.abonos && cuenta.abonos.length > 0" class="abonos-info">
              <p v-for="(abono, index) in cuenta.abonos" :key="index" class="abono-detail">
                <span class="abono-label">Abono:</span>
                <span class="abono-monto">${{ formatNumber(abono.monto) }}</span>
                <span class="abono-descripcion">{{ abono.descripcion || 'Sin descripción' }}</span>
              </p>
              <p class="total-abonos-dia">
                <span class="total-label">Total</span>
                <span class="total-monto">${{ formatNumber(cuenta.abonos.reduce((sum, abono) => sum + (parseFloat(abono.monto) || 0), 0)) }}</span>
              </p>
            </div>
          </div>
          <div class="cuenta-actions">
            <button @click="editarCuenta(cuenta.id)" class="edit-btn">Editar</button>  
            <button @click="borrarCuenta(cuenta.id)" class="delete-btn">Borrar</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Modal para mostrar observación -->
    <div v-if="showObservacionModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Observación</h3>
        <p class="observacion-text">{{ observacionActual }}</p>
        <div class="modal-buttons">
          <button @click="showObservacionModal = false" class="btn-cerrar">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, onSnapshot, updateDoc, getDocs } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import StashModal from '@/components/StashModal.vue';

export default {
  name: 'OtilioCuentasMenu',
  components: {
    BackButton,
    PreciosHistorialModal,
    StashModal
  },
  data() {
    return {
      cuentas: [],
      isLoading: true,
      unsubscribe: null,
      error: null,
      showAbonosModal: false,
      abonosHistorial: [],
      fechaInicio: '',
      fechaFin: '',
      totalAbonosPeriodo: null,
      showObservacionModal: false,
      observacionActual: ''
    };
  },
  methods: {
    async loadCuentas() {
      try {
        this.isLoading = true;
        const cuentasRef = collection(db, 'cuentasOtilio');
        const q = query(cuentasRef, orderBy('fecha', 'asc'));
        
        this.unsubscribe = onSnapshot(q, async (querySnapshot) => {
          const cuentasActualizadas = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            const totalCobros = (data.cobros || []).reduce((sum, cobro) => 
              sum + (parseFloat(cobro.monto) || 0), 0);
            const totalAbonos = (data.abonos || []).reduce((sum, abono) => 
              sum + (parseFloat(abono.monto) || 0), 0);

            return {
              id: doc.id,
              fecha: data.fecha,
              saldoHoy: data.totalGeneralVenta || 0,
              totalCobros,
              totalAbonos,
              totalNota: data.nuevoSaldoAcumulado || 0,
              nuevoSaldoAcumulado: data.nuevoSaldoAcumulado || 0,
              saldoAcumuladoAnterior: data.saldoAcumuladoAnterior || 0,
              abonos: data.abonos || [],
              tieneObservacion: Boolean(data.tieneObservacion) || false,
              observacion: String(data.observacion || '')
            };
          });

          const cuentasOrdenadas = cuentasActualizadas.sort((a, b) => 
            new Date(a.fecha) - new Date(b.fecha)
          );

          let saldoAcumulado = 0;
          const actualizaciones = [];

          for (let i = 0; i < cuentasOrdenadas.length; i++) {
            const cuenta = cuentasOrdenadas[i];
            const totalDia = cuenta.saldoHoy - cuenta.totalCobros - cuenta.totalAbonos;
            saldoAcumulado += totalDia;

            const saldoAnterior = i === 0 ? 0 : cuentasOrdenadas[i-1].nuevoSaldoAcumulado;
            
            if (cuenta.saldoAcumuladoAnterior !== saldoAnterior || 
                cuenta.nuevoSaldoAcumulado !== saldoAcumulado) {
              
              actualizaciones.push({
                id: cuenta.id,
                updates: {
                  saldoAcumuladoAnterior: saldoAnterior,
                  nuevoSaldoAcumulado: saldoAcumulado
                }
              });
            }

            cuenta.totalNota = saldoAcumulado;
            cuenta.saldoAcumuladoAnterior = saldoAnterior;

            if (saldoAcumulado <= 0) {
              saldoAcumulado = 0;
            }
          }

          if (actualizaciones.length > 0) {
            await Promise.all(actualizaciones.map(({ id, updates }) => 
              updateDoc(doc(db, 'cuentasOtilio', id), updates)
            ));
          }

          this.cuentas = cuentasOrdenadas.reverse();
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
      this.$router.push(`/cuentas-otilio/${id}?edit=true`);
    },
    async borrarCuenta(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de cuenta?')) {
        try {
          await deleteDoc(doc(db, 'cuentasOtilio', id));
          alert('Registro de cuenta borrado con éxito');
        } catch (error) {
          console.error("Error al borrar el registro de cuenta: ", error);
          alert('Error al borrar el registro de cuenta');
        }
      }
    },
    calcularTotalAbonos() {
      if (!this.fechaInicio || !this.fechaFin) {
        this.totalAbonosPeriodo = null;
        return;
      }

      const inicio = new Date(this.fechaInicio);
      const fin = new Date(this.fechaFin);
      
      // Ajustar fin al final del día
      fin.setHours(23, 59, 59, 999);

      const abonosFiltrados = this.abonosHistorial.filter(abono => {
        const fechaAbono = new Date(abono.fecha);
        return fechaAbono >= inicio && fechaAbono <= fin;
      });

      this.totalAbonosPeriodo = abonosFiltrados.reduce((total, abono) => 
        total + (parseFloat(abono.monto) || 0), 0);
    },
    async cargarHistorialAbonos() {
      try {
        const cuentasRef = collection(db, 'cuentasOtilio');
        const querySnapshot = await getDocs(cuentasRef);
        
        let todosLosAbonos = [];
        querySnapshot.forEach(doc => {
          const cuenta = doc.data();
          if (cuenta.abonos && cuenta.abonos.length > 0) {
            cuenta.abonos.forEach(abono => {
              todosLosAbonos.push({
                ...abono,
                fecha: cuenta.fecha
              });
            });
          }
        });

        // Ordenar abonos por fecha, del más reciente al más antiguo
        this.abonosHistorial = todosLosAbonos.sort((a, b) => 
          new Date(b.fecha) - new Date(a.fecha)
        );

        // Recalcular total si hay fechas seleccionadas
        if (this.fechaInicio && this.fechaFin) {
          this.calcularTotalAbonos();
        }
      } catch (error) {
        console.error("Error al cargar historial de abonos:", error);
      }
    },
    mostrarObservacion(cuenta) {
      if (cuenta && cuenta.observacion) {
        this.observacionActual = cuenta.observacion;
        this.showObservacionModal = true;
      } else {
        console.error('No hay observación disponible para mostrar');
      }
    }
  },
  watch: {
    showAbonosModal(newValue) {
      if (newValue) {
        this.cargarHistorialAbonos();
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
.otilio-cuentas-menu-container {
  max-width: 800px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

h1, h2 {
  color: #FFD700;
  text-align: center;
}

.actions-container {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.action-button {
  background-color: #FFD700;
  color: black;
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
  background-color: #FFC000;
}

.back-btn {
  background-color: #6c757d;
  color: white;
}

.back-btn:hover {
  background-color: #5a6268;
}

.cuentas-list {
  background-color: #fff9e6;
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
  color: #000000;
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
  background-color: #FFD700;
  color: black;
}

.edit-btn:hover {
  background-color: #FFC000;
}

.delete-btn {
  background-color: #f44336;
  color: white;
}

.delete-btn:hover {
  background-color: #d32f2f;
}

@media (max-width: 768px) {
  .otilio-cuentas-menu-container {
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

.error-message {
  color: #f44336;
  text-align: center;
  padding: 10px;
  margin: 10px 0;
  background-color: #ffebee;
  border-radius: 4px;
}

.abonos-info {
  margin-top: 10px;
  padding: 5px 0;
}

.abono-detail {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 5px 0;
  font-size: 0.9em;
  color: #000000;
}

.abono-label {
  font-weight: bold;
}

.abono-monto {
  color: #4CAF50;
  font-weight: bold;
}

.abono-descripcion {
  color: #666;
  font-style: italic;
}

@media (max-width: 768px) {
  .abono-detail {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
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
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.abonos-list {
  margin: 20px 0;
}

.abono-item {
  background-color: #fff9e6;
  border-radius: 4px;
  margin-bottom: 10px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.abono-fecha {
  font-weight: bold;
  color: #000000;
  margin-bottom: 5px;
}

.abono-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.abono-monto {
  color: #4CAF50;
  font-weight: bold;
  font-size: 1.1em;
}

.abono-descripcion {
  color: #666;
  font-style: italic;
}

.close-btn {
  width: 100%;
  padding: 10px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.close-btn:hover {
  background-color: #5a6268;
}

.abonos-btn {
  background-color: #4CAF50;
  color: white;
}

.abonos-btn:hover {
  background-color: #45a049;
}

.no-records {
  text-align: center;
  color: #666;
  padding: 20px;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }

  .abono-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #FFD700;
}

.modal-header h2 {
  margin: 0;
  color: #000000;
}

.close-modal-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  padding: 5px 10px;
  transition: color 0.3s ease;
}

.close-modal-btn:hover {
  color: #000000;
}

.fecha-filtros {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #fff9e6;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.fecha-grupo {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.fecha-grupo label {
  margin-bottom: 5px;
  color: #666;
  font-weight: bold;
}

.fecha-input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.fecha-input:focus {
  border-color: #FFD700;
  outline: none;
}

.total-abonos {
  background-color: #4CAF50;
  color: white;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.total-label {
  font-weight: bold;
}

.total-monto {
  font-size: 1.2em;
  font-weight: bold;
}

@media (max-width: 768px) {
  .fecha-filtros {
    flex-direction: column;
    gap: 10px;
  }

  .total-abonos {
    flex-direction: column;
    gap: 5px;
    text-align: center;
  }
}

.total-abonos-dia {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ddd;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  font-weight: bold;
  color: #4CAF50;
  gap: 10px;
}

.total-abonos-dia .total-label {
  color: #666;
}

.total-abonos-dia .total-monto {
  font-size: 1.1em;
}

@media (max-width: 768px) {
  .total-abonos-dia {
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
}

.tiene-observacion {
  border: 2px solid #ff0000 !important;
}

.observacion-badge {
  background-color: #ff0000;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.9em;
  cursor: pointer;
  display: inline-block;
  margin-top: 8px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
  width: 90%;
  max-width: 500px;
}

.observacion-text {
  margin: 15px 0;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  white-space: pre-wrap;
}

.btn-cerrar {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 15px;
}
</style> 