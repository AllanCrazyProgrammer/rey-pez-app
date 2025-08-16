<template>
  <div class="catarro-cuentas-menu-container">
    <h1>Menú de Cuentas Catarro</h1>
    
    <div class="actions-container actions-sticky">
      <router-link to="/cuentas-mexico" class="action-button back-btn">
        Cuentas México
      </router-link>
      <router-link to="/cuentas-catarro/nueva" class="action-button new-cuenta-btn">
        Nueva Cuenta
      </router-link>
      <router-link to="/ventas-ganancias-catarro" class="action-button ventas-ganancias-btn">
        Ventas y Ganancias
      </router-link>
      <PreciosHistorialModal />
      <StashModal cliente="catarro" />
      <StashModalV2 cliente="catarro" />
    </div>

    <div class="filter-container">
      <label for="filter-select">Filtrar por estado:</label>
      <select id="filter-select" v-model="filtroEstado">
        <option value="todas">Todas</option>
        <option value="pagadas">Pagadas</option>
        <option value="no-pagadas">No Pagadas</option>
      </select>
    </div>

    <div class="cuentas-list card">
      <h2>Registros de Cuentas</h2>
      <div v-if="isLoading" class="loading">Cargando registros...</div>
      <div v-else-if="cuentasFiltradas.length === 0" class="no-records">
        No hay registros de cuentas que coincidan con el filtro.
      </div>
      <ul v-else>
        <li v-for="cuenta in cuentasFiltradas" :key="cuenta.id" class="cuenta-item" :class="{ 'tiene-observacion': cuenta.tieneObservacion || (cuenta.observacion && cuenta.observacion.trim().length) }">
          <div class="cuenta-content">
            <span class="cuenta-date">{{ formatDate(cuenta.fecha) }}</span>
            <p class="cuenta-summary">
              <span>Saldo Hoy: ${{ formatNumber(cuenta.saldoHoy) }}</span>
              <span>Total Acumulado: ${{ formatNumber(cuenta.totalNota) }}</span>
            </p>
            <div v-if="cuenta.tieneObservacion || (cuenta.observacion && cuenta.observacion.trim().length)" class="observacion-container">
              <p class="observacion-texto">{{ cuenta.observacion }}</p>
              <button class="delete-observacion-btn" @click="borrarObservacion(cuenta.id)" title="Borrar observación">×</button>
            </div>
            <div v-if="cuenta.abonos && cuenta.abonos.length > 0" class="abonos-info">
              <p v-for="(abono, index) in cuenta.abonos" :key="index" class="abono-detail">
                <span class="abono-label">Abono:</span>
                <span class="abono-monto">${{ formatNumber(abono.monto) }}</span>
                <span class="abono-descripcion">{{ abono.descripcion || 'Sin descripción' }}</span>
              </p>
            </div>
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

    <template v-if="showSaveMessage && lastSaveMessage">
      <div class="save-message">
        {{ lastSaveMessage }}
      </div>
    </template>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, onSnapshot, where, updateDoc } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import StashModal from '@/components/StashModal.vue';
import StashModalV2 from '@/components/StashModalV2.vue';

export default {
  name: 'CatarroCuentasMenu',
  components: {
    BackButton,
    PreciosHistorialModal,
    StashModal,
    StashModalV2
  },
  data() {
    return {
      cuentas: [],
      isLoading: true,
      filtroEstado: 'todas',
      unsubscribe: null,
      lastSaveMessage: '',
      showSaveMessage: false,
      saveMessageTimer: null
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
    }
  },
  methods: {
    async loadCuentas() {
      try {
        this.isLoading = true;
        const cuentasRef = collection(db, 'cuentasCatarro');
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
              saldoAcumuladoAnterior: data.saldoAcumuladoAnterior || 0,
              abonos: data.abonos || [],
              tieneObservacion: data.tieneObservacion || false,
              observacion: data.observacion || ''
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
            cuenta.estadoPagado = totalDia === 0;

            // Reiniciar saldo si la cuenta está pagada
            if (saldoAcumulado <= 0) {
              saldoAcumulado = 0;
            }
          }

          // Realizar todas las actualizaciones en paralelo
          if (actualizaciones.length > 0) {
            await Promise.all(actualizaciones.map(({ id, updates }) => 
              updateDoc(doc(db, 'cuentasCatarro', id), updates)
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
      this.$router.push(`/cuentas-catarro/${id}?edit=true`);
    },
    async borrarCuenta(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de cuenta?')) {
        try {
          await deleteDoc(doc(db, 'cuentasCatarro', id));
          if (this.lastSaveMessage !== 'Registro de cuenta borrado con éxito' || !this.showSaveMessage) {
            this.lastSaveMessage = 'Registro de cuenta borrado con éxito';
            this.showSaveMessage = true;
            if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
            this.saveMessageTimer = setTimeout(() => {
              this.showSaveMessage = false;
            }, 3000);
          }
        } catch (error) {
          console.error("Error al borrar el registro de cuenta: ", error);
          if (this.lastSaveMessage !== 'Error al borrar el registro de cuenta' || !this.showSaveMessage) {
            this.lastSaveMessage = 'Error al borrar el registro de cuenta';
            this.showSaveMessage = true;
            if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
            this.saveMessageTimer = setTimeout(() => {
              this.showSaveMessage = false;
            }, 3000);
          }
        }
      }
    },
    async borrarObservacion(id) {
      if (confirm('¿Estás seguro de que quieres borrar esta observación?')) {
        try {
          await updateDoc(doc(db, 'cuentasCatarro', id), {
            tieneObservacion: false,
            observacion: ''
          });
          if (this.lastSaveMessage !== 'Observación borrada con éxito' || !this.showSaveMessage) {
            this.lastSaveMessage = 'Observación borrada con éxito';
            this.showSaveMessage = true;
            if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
            this.saveMessageTimer = setTimeout(() => {
              this.showSaveMessage = false;
            }, 3000);
          }
        } catch (error) {
          console.error("Error al borrar la observación: ", error);
          if (this.lastSaveMessage !== 'Error al borrar la observación' || !this.showSaveMessage) {
            this.lastSaveMessage = 'Error al borrar la observación';
            this.showSaveMessage = true;
            if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
            this.saveMessageTimer = setTimeout(() => {
              this.showSaveMessage = false;
            }, 3000);
          }
        }
      }
    }
  },
  mounted() {
    this.loadCuentas();
  },
  beforeUnmount() {
    // Limpiar el listener cuando el componente se desmonte
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
};
</script>

<style scoped>
.catarro-cuentas-menu-container {
  max-width: 800px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

h1, h2 {
  color: #d32f2f;
  text-align: center;
}

.actions-container {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.actions-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(180deg, rgba(255,255,255,1) 70%, rgba(255,255,255,0));
  padding-top: 8px;
  padding-bottom: 8px;
}

.action-button {
  background-color: #d32f2f;
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
  background-color: #b71c1c;
}

.back-btn {
  background-color: #6c757d;
}

.back-btn:hover {
  background-color: #5a6268;
}

.card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 16px;
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
  color: #d32f2f;
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
  .catarro-cuentas-menu-container {
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

.abonos-info {
  margin: 10px 0;
  padding: 5px 0;
}

.abono-detail {
  display: flex;
  gap: 10px;
  align-items: center;
  margin: 5px 0;
  font-size: 0.9em;
  color: #d32f2f;
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

.tiene-observacion {
  border: 2px solid #ff0000 !important;
}

.observacion-container {
  margin: 10px 0;
  padding: 10px;
  background-color: #fff3f3;
  border-left: 4px solid #ff0000;
  border-radius: 4px;
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.observacion-texto {
  margin: 0;
  flex-grow: 1;
  white-space: pre-wrap;
  color: #d32f2f;
  font-size: 0.9em;
}

.delete-observacion-btn {
  background: none;
  border: none;
  color: #ff0000;
  font-size: 1.2em;
  cursor: pointer;
  padding: 0 5px;
  line-height: 1;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.delete-observacion-btn:hover {
  background-color: rgba(255, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .observacion-container {
    padding: 8px;
    margin: 8px 0;
  }
  
  .observacion-texto {
    font-size: 0.85em;
  }
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

.save-message {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 15px;
  z-index: 2000;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  max-width: 90vw;
  text-align: center;
}
</style>