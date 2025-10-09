<template>
  <div class="veronica-cuentas-menu-container">
    <h1>Menú de Cuentas Veronica</h1>
    
    <!-- Navegación Principal -->
    <div class="nav-principal actions-sticky">
      <router-link to="/cuentas-mexico" class="btn-nav btn-back">
        <i class="fas fa-arrow-left"></i>
        <span>Cuentas México</span>
      </router-link>
      <router-link to="/cuentas-veronica/nueva" class="btn-nav btn-nueva-cuenta">
        <i class="fas fa-plus-circle"></i>
        <span>Nueva Cuenta</span>
      </router-link>
    </div>

    <!-- Sección de Reportes y Herramientas -->
    <div class="herramientas-grid">
      <div class="herramienta-card card">
        <div class="card-icon ventas-icon">
          <i class="fas fa-chart-line"></i>
        </div>
        <h3>Ventas y Ganancias</h3>
        <p>Consulta el resumen completo de ventas y ganancias</p>
        <router-link to="/ventas-ganancias-veronica" class="btn-herramienta btn-ventas">
          Ver Reporte
        </router-link>
      </div>

      <div class="herramienta-card card">
        <div class="card-icon pdf-icon">
          <i class="fas fa-file-pdf"></i>
        </div>
        <h3>Reporte PDF</h3>
        <p>Genera un reporte en PDF de las cuentas</p>
        <div class="btn-container-card">
          <ReporteCuentasVeronicaButton />
        </div>
      </div>

      <div class="herramienta-card card">
        <div class="card-icon resumen-icon">
          <i class="fas fa-chart-bar"></i>
        </div>
        <h3>Resumen por Producto</h3>
        <p>Ventas de camarón limpio y crudo por medida</p>
        <div class="btn-container-card">
          <ResumenVentasVeronicaModal />
        </div>
      </div>

      <div class="herramienta-card card">
        <div class="card-icon precios-icon">
          <i class="fas fa-dollar-sign"></i>
        </div>
        <h3>Precios de Venta</h3>
        <p>Consulta el historial de precios</p>
        <div class="btn-container-card">
          <PreciosHistorialModal />
        </div>
      </div>

      <div class="herramienta-card card">
        <div class="card-icon stash-icon">
          <i class="fas fa-box"></i>
        </div>
        <h3>Stash</h3>
        <p>Gestiona el inventario y stock</p>
        <div class="btn-container-card">
          <StashModalV2 cliente="veronica" />
        </div>
      </div>
    </div>

    <!-- Sección de Registros -->
    <div class="registros-wrapper">
      <div class="registros-section">
        <div class="registros-header">
          <h2><i class="fas fa-file-invoice"></i> Registros de Cuentas</h2>
          <div class="filter-container">
            <label for="filter-select">Filtrar:</label>
            <select id="filter-select" v-model="filtroEstado">
              <option value="todas">Todas</option>
              <option value="pagadas">Pagadas</option>
              <option value="no-pagadas">No Pagadas</option>
            </select>
          </div>
        </div>
      </div>

      <div class="cuentas-list card">
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
import StashModalV2 from '@/components/StashModalV2.vue';
import ReporteCuentasVeronicaButton from '@/components/Cuentas/ReporteCuentasVeronicaButton.vue';
import ResumenVentasVeronicaModal from '@/components/Cuentas/ResumenVentasVeronicaModal.vue';

export default {
  name: 'VeronicaCuentasMenu',
  components: {
    BackButton,
    PreciosHistorialModal,
    StashModalV2,
    ReporteCuentasVeronicaButton,
    ResumenVentasVeronicaModal
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
        const cuentasRef = collection(db, 'cuentasVeronica');
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
            await Promise.allSettled(actualizaciones.map(async ({ id, updates }) => {
              try {
                await updateDoc(doc(db, 'cuentasVeronica', id), updates);
              } catch (error) {
                // Ignorar silenciosamente los errores de documentos que no existen
                if (error.code !== 'not-found') {
                  console.warn('Error al actualizar documento:', id, error);
                }
              }
            }));
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
      this.$router.push(`/cuentas-veronica/${id}?edit=true`);
    },
    async borrarCuenta(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de cuenta?')) {
        try {
          await deleteDoc(doc(db, 'cuentasVeronica', id));
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
          await updateDoc(doc(db, 'cuentasVeronica', id), {
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
.veronica-cuentas-menu-container {
  max-width: 1400px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

h1 {
  color: #ff8c00;
  text-align: center;
  margin-bottom: 25px;
  font-size: 2em;
}

h2 {
  color: #ff8c00;
  text-align: center;
}

/* Navegación Principal */
.nav-principal {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.actions-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(180deg, rgba(255,255,255,1) 70%, rgba(255,255,255,0));
  padding-top: 8px;
  padding-bottom: 15px;
}

.btn-nav {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 15px 25px;
  border-radius: 10px;
  text-decoration: none;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.btn-nav i {
  font-size: 20px;
}

.btn-back {
  background: linear-gradient(135deg, #6c757d, #5a6268);
  color: white;
}

.btn-back:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
}

.btn-nueva-cuenta {
  background: linear-gradient(135deg, #ff8c00, #ff6f00);
  color: white;
}

.btn-nueva-cuenta:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
}

/* Grid de Herramientas */
.herramientas-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

.herramienta-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 15px;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.herramienta-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
  border-color: #ff8c00;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  font-size: 28px;
  color: white;
}

.ventas-icon {
  background: linear-gradient(135deg, #4CAF50, #45a049);
}

.pdf-icon {
  background: linear-gradient(135deg, #f44336, #d32f2f);
}

.resumen-icon {
  background: linear-gradient(135deg, #2196F3, #1976D2);
}

.precios-icon {
  background: linear-gradient(135deg, #4CAF50, #2e7d32);
}

.stash-icon {
  background: linear-gradient(135deg, #9c27b0, #7b1fa2);
}

.herramienta-card h3 {
  color: #333;
  font-size: 1em;
  margin: 0 0 8px 0;
  font-weight: 600;
}

.herramienta-card p {
  color: #666;
  font-size: 0.8em;
  margin: 0 0 15px 0;
  line-height: 1.4;
}

.btn-herramienta {
  width: 100%;
  padding: 10px 15px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9em;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
}

.btn-ventas {
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
}

.btn-ventas:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.btn-container-card {
  width: 100%;
  display: flex;
  justify-content: center;
}

.card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 16px;
}


.cuentas-list {
  background-color: #fff8f0;
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
  border-left: 4px solid #ff8c00;
}

.cuenta-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.cuenta-content {
  margin-bottom: 10px;
}

.cuenta-date {
  color: #ff8c00;
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
  .veronica-cuentas-menu-container {
    padding: 10px;
    width: 100%;
  }

  h1 {
    font-size: 1.5em;
  }

  .nav-principal {
    flex-direction: column;
  }

  .btn-nav {
    width: 100%;
    min-width: auto;
  }

  .herramientas-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .herramienta-card {
    padding: 20px 15px;
  }

  .card-icon {
    width: 60px;
    height: 60px;
    font-size: 28px;
  }

  .herramienta-card h3 {
    font-size: 1.1em;
  }

  .herramienta-card p {
    font-size: 0.85em;
  }

  .registros-wrapper {
    max-width: 100%;
    padding: 0 5px;
  }

  .registros-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .registros-header h2 {
    font-size: 1.3em;
  }

  .filter-container {
    width: 100%;
    justify-content: space-between;
  }

  .filter-container select {
    flex: 1;
    min-width: 0;
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

@media (min-width: 769px) and (max-width: 1024px) {
  .herramientas-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1025px) and (max-width: 1300px) {
  .herramientas-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1301px) {
  .herramientas-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

/* Sección de Registros */
.registros-wrapper {
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}

.registros-section {
  margin-bottom: 20px;
}

.registros-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 15px;
}

.registros-header h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 1.5em;
}

.registros-header h2 i {
  color: #ff8c00;
}

.filter-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-container label {
  font-weight: 600;
  color: #666;
  font-size: 14px;
}

.filter-container select {
  padding: 8px 35px 8px 12px;
  border-radius: 8px;
  border: 2px solid #ff8c00;
  background-color: white;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  cursor: pointer;
  transition: all 0.3s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ff8c00' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}

.filter-container select:hover {
  border-color: #e07600;
  box-shadow: 0 2px 8px rgba(255, 140, 0, 0.2);
}

.filter-container select:focus {
  outline: none;
  border-color: #e07600;
  box-shadow: 0 0 0 3px rgba(255, 140, 0, 0.1);
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
  color: #ff8c00;
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
  color: #ff8c00;
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
