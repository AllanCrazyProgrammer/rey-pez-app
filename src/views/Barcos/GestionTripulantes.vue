<template>
  <div class="gestion-tripulantes">
    <div class="back-button-container">
      <BackButton :to="`/barcos?barco=${barcoSeleccionado}`" />
    </div>
    
    <div class="header-section" :style="{ background: gradientePrimario }">
      <div class="header-content">
        <h1 class="main-title">
          <i class="icon-crew">👥</i>
          Gestión de Tripulantes
        </h1>
        <p class="subtitle">{{ nombreBarco }} - Administra la tripulación y sus préstamos</p>
      </div>
    </div>

    <!-- Información del barco seleccionado -->
    <div class="barco-info-card">
      <div class="barco-header">
        <i class="barco-icon">{{ barcoSeleccionado === 'galileo' ? '🚢' : '🛥️' }}</i>
        <div class="barco-details">
          <h3>{{ nombreBarco }}</h3>
          <p>{{ tripulantes.length }} tripulante(s) registrado(s)</p>
        </div>
      </div>
    </div>

    <!-- Acciones principales -->
    <div class="acciones-principales">
      <button 
        @click="openModalNuevoTripulante" 
        :class="['btn-accion', 'btn-nuevo', `barco-theme-${barcoSeleccionado}`]"
      >
        <i class="icon">👤➕</i>
        <span>Nuevo Tripulante</span>
      </button>
      
      <button 
        @click="mostrarResumenPrestamos = !mostrarResumenPrestamos" 
        :class="['btn-accion', 'btn-resumen', `barco-theme-${barcoSeleccionado}`]"
      >
        <i class="icon">🏦</i>
        <span>Resumen de Préstamos</span>
      </button>
    </div>

    <!-- Resumen de préstamos (colapsible) -->
    <div v-if="mostrarResumenPrestamos" class="resumen-prestamos-card">
      <h3>
        <i class="icon-money">🏦</i>
        Resumen de Préstamos - {{ nombreBarco }}
      </h3>
      <div class="resumen-grid">
        <div class="resumen-item">
          <span class="label">Total Prestado:</span>
          <span class="valor prestamo">${{ totalPrestado.toLocaleString() }}</span>
        </div>
        <div class="resumen-item">
          <span class="label">Total Abonado:</span>
          <span class="valor abono">${{ totalPagado.toLocaleString() }}</span>
        </div>
        <div class="resumen-item">
          <span class="label">Saldo Pendiente:</span>
          <span class="valor pendiente">${{ (totalPrestado - totalPagado).toLocaleString() }}</span>
        </div>
        <div class="resumen-item">
          <span class="label">Tripulantes Activos:</span>
          <span class="valor">${{ tripulantesActivos }}</span>
        </div>
      </div>
    </div>

    <!-- Lista de tripulantes -->
    <div class="tripulantes-section">
      <div class="section-header">
        <h3>
          <i class="icon-list">📋</i>
          Lista de Tripulantes
        </h3>
        <div class="filtros">
          <select v-model="filtroEstado" class="filtro-select">
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
      </div>

      <div v-if="tripulantesFiltrados.length === 0" class="no-tripulantes">
        <i class="icon-empty">👤</i>
        <h4>No hay tripulantes registrados</h4>
        <p>Agrega el primer tripulante para comenzar a gestionar la tripulación de {{ nombreBarco }}</p>
        <button @click="openModalNuevoTripulante" class="btn-agregar-primero">
          <i class="icon">➕</i>
          Agregar Primer Tripulante
        </button>
      </div>

      <div v-else class="tripulantes-grid">
        <div 
          v-for="tripulante in tripulantesFiltrados" 
          :key="tripulante.id" 
          class="tripulante-card"
          :class="{ inactivo: tripulante.estado === 'inactivo' }"
        >
          <div class="tripulante-header">
            <div class="avatar">
              <i class="avatar-icon">👤</i>
            </div>
            <div class="tripulante-info">
              <h4>{{ tripulante.nombre }}</h4>
              <p class="puesto">{{ tripulante.puesto || 'Sin puesto asignado' }}</p>
              <span :class="['estado-badge', tripulante.estado]">
                {{ tripulante.estado === 'activo' ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
            <div class="tripulante-acciones">
              <button 
                @click="openModalPrestamos(tripulante)" 
                class="btn-prestamo"
                :title="`Gestionar préstamos de ${tripulante.nombre}`"
              >
                <i class="icon">🏦</i>
              </button>
              <button 
                @click="editarTripulante(tripulante)" 
                class="btn-editar"
                :title="`Editar ${tripulante.nombre}`"
              >
                <i class="icon">✏️</i>
              </button>
              <button 
                @click="toggleEstadoTripulante(tripulante)" 
                :class="['btn-toggle', tripulante.estado]"
                :title="tripulante.estado === 'activo' ? 'Desactivar' : 'Activar'"
              >
                <i class="icon">{{ tripulante.estado === 'activo' ? '🔴' : '🟢' }}</i>
              </button>
            </div>
          </div>
          
          <div class="tripulante-stats">
            <div class="stat-item">
              <span class="stat-label">Total Prestado:</span>
              <span class="stat-valor prestamo">${{ (tripulante.totalPrestado || 0).toLocaleString() }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Total Abonado:</span>
              <span class="stat-valor abono">${{ (tripulante.totalPagado || 0).toLocaleString() }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Saldo Pendiente:</span>
              <span class="stat-valor pendiente">${{ ((tripulante.totalPrestado || 0) - (tripulante.totalPagado || 0)).toLocaleString() }}</span>
            </div>
          </div>

          <div class="tripulante-actions-footer">
            <button 
              @click="verHistorialPrestamos(tripulante)" 
              class="btn-historial"
            >
              <i class="icon">📄</i>
              Ver Historial
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Nuevo/Editar Tripulante -->
    <div v-if="showModalTripulante" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content modern-modal" @click.stop>
        <div class="modal-header modern-header" :style="{ background: gradientePrimario }">
          <div class="header-icon">
            <i class="icon-user">👤</i>
          </div>
          <div class="header-text">
            <h2>{{ isEditMode ? 'Editar Tripulante' : 'Nuevo Tripulante' }}</h2>
            <p>{{ nombreBarco }}</p>
          </div>
          <button @click="showModalTripulante = false" class="close-button modern-close">
            <i class="fas fa-times">✕</i>
          </button>
        </div>
        
        <div class="modal-body modern-body">
          <form @submit.prevent="guardarTripulante" class="modern-form">
            <div class="form-grid">
              <div class="form-group modern-group">
                <label for="nombre" class="modern-label">
                  <i class="label-icon">👤</i>
                  Nombre Completo
                </label>
                <input 
                  v-model="formTripulante.nombre" 
                  id="nombre" 
                  required 
                  placeholder="Ingrese el nombre completo"
                  class="modern-input"
                >
              </div>
              
              <div class="form-group modern-group">
                <label for="puesto" class="modern-label">
                  <i class="label-icon">🛠️</i>
                  Puesto/Función
                </label>
                <select v-model="formTripulante.puesto" id="puesto" required class="modern-input">
                  <option value="">Seleccionar puesto</option>
                  <option value="Capitán">Capitán</option>
                  <option value="Motorista">Motorista</option>
                  <option value="Winchero">Winchero</option>
                  <option value="Cocinero">Cocinero</option>
                  <option value="Pacotillero">Pacotillero</option>
                </select>
              </div>
            </div>
            
            <div class="modal-actions">
              <button type="button" @click="showModalTripulante = false" class="btn-cancelar">
                Cancelar
              </button>
              <button type="submit" class="btn-guardar">
                <i class="btn-icon">💾</i>
                {{ isEditMode ? 'Actualizar' : 'Guardar' }} Tripulante
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Préstamos -->
    <div v-if="showModalPrestamos" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content modern-modal" @click.stop>
        <div class="modal-header modern-header" :style="{ background: gradientePrimario }">
          <div class="header-icon">
            <i class="icon-money">🏦</i>
          </div>
          <div class="header-text">
            <h2>Gestionar Préstamos</h2>
            <p>{{ tripulanteSeleccionado?.nombre }} - {{ nombreBarco }}</p>
          </div>
          <button @click="showModalPrestamos = false" class="close-button modern-close">
            <i class="fas fa-times">✕</i>
          </button>
        </div>
        
        <div class="modal-body modern-body">
          <PagosTripulante 
            v-if="tripulanteSeleccionado"
            :tripulante="tripulanteSeleccionado"
            :barco="barcoSeleccionado"
            :nombre-barco="nombreBarco"
            @prestamo-registrado="onPrestamoRegistrado"
            @close="showModalPrestamos = false"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import PagosTripulante from './PagosTripulante.vue';

export default {
  name: 'GestionTripulantes',
  components: {
    BackButton,
    PagosTripulante
  },
  data() {
    return {
      barcoSeleccionado: '',
      tripulantes: [],
      mostrarResumenPrestamos: false,
      filtroEstado: '',
      showModalTripulante: false,
      showModalPrestamos: false,
      isEditMode: false,
      tripulanteSeleccionado: null,
      formTripulante: {
        nombre: '',
        puesto: ''
      }
    };
  },
  computed: {
    nombreBarco() {
      return this.barcoSeleccionado === 'galileo' ? 'El Galileo' : 'María Guadalupe';
    },
    gradientePrimario() {
      return this.barcoSeleccionado === 'maria-guadalupe' 
        ? 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)'
        : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)';
    },
    tripulantesFiltrados() {
      return this.tripulantes.filter(tripulante => {
        if (this.filtroEstado && tripulante.estado !== this.filtroEstado) {
          return false;
        }
        return true;
      });
    },
    tripulantesActivos() {
      return this.tripulantes.filter(t => t.estado === 'activo').length;
    },
    totalPagado() {
      return this.tripulantes.reduce((total, t) => total + (t.totalPagado || 0), 0);
    },
    totalPrestado() {
      return this.tripulantes.reduce((total, t) => total + (t.totalPrestado || 0), 0);
    },
    saldoPendienteTotal() {
      return this.totalPrestado - this.totalPagado;
    }
  },
  mounted() {
    this.barcoSeleccionado = this.$route.query.barco || localStorage.getItem('barcoSeleccionado') || 'galileo';
    this.loadTripulantes();
  },
  methods: {
    async loadTripulantes() {
      try {
        // Consulta simple sin orderBy para evitar índices compuestos
        const q = query(
          collection(db, 'tripulantesBarcos'), 
          where('barco', '==', this.barcoSeleccionado)
        );
        const querySnapshot = await getDocs(q);
        this.tripulantes = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Ordenar por nombre en el frontend
        this.tripulantes.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        // Calcular balances para cada tripulante
        for (let tripulante of this.tripulantes) {
          await this.calcularBalanceTripulante(tripulante);
        }
      } catch (error) {
        console.error('Error al cargar tripulantes:', error);
        alert('Error al cargar tripulantes');
      }
    },
    
    async calcularBalanceTripulante(tripulante) {
      try {
        const q = query(
          collection(db, 'pagosTripulantes'),
          where('tripulanteId', '==', tripulante.id),
          where('barco', '==', this.barcoSeleccionado)
        );
        const querySnapshot = await getDocs(q);
        
        let totalPagado = 0;
        let totalPrestado = 0;
        
        querySnapshot.docs.forEach(doc => {
          const pago = doc.data();
          if (pago.tipo === 'pago') {
            totalPagado += pago.monto;
          } else if (pago.tipo === 'prestamo') {
            totalPrestado += pago.monto;
          }
        });
        
        tripulante.totalPagado = totalPagado;
        tripulante.totalPrestado = totalPrestado;
        tripulante.balance = totalPagado - totalPrestado;
      } catch (error) {
        console.error('Error al calcular balance:', error);
      }
    },

    openModalNuevoTripulante() {
      this.isEditMode = false;
      this.formTripulante = {
        nombre: '',
        puesto: ''
      };
      this.showModalTripulante = true;
    },

    editarTripulante(tripulante) {
      this.isEditMode = true;
      this.tripulanteSeleccionado = tripulante;
      this.formTripulante = {
        nombre: tripulante.nombre,
        puesto: tripulante.puesto
      };
      this.showModalTripulante = true;
    },

    async guardarTripulante() {
      if (!this.formTripulante.nombre.trim()) {
        alert('Por favor ingrese el nombre del tripulante');
        return;
      }

      if (!this.formTripulante.puesto.trim()) {
        alert('Por favor seleccione el puesto del tripulante');
        return;
      }

      try {
        const tripulanteData = {
          nombre: this.formTripulante.nombre.trim(),
          puesto: this.formTripulante.puesto,
          barco: this.barcoSeleccionado,
          nombreBarco: this.nombreBarco,
          estado: 'activo', // Por defecto activo
          totalPagado: 0,
          totalPrestado: 0,
          balance: 0,
          updatedAt: new Date()
        };

        if (this.isEditMode) {
          // Solo actualizar nombre y puesto en modo edición
          await updateDoc(doc(db, 'tripulantesBarcos', this.tripulanteSeleccionado.id), {
            nombre: tripulanteData.nombre,
            puesto: tripulanteData.puesto,
            updatedAt: tripulanteData.updatedAt
          });
          alert('Tripulante actualizado exitosamente');
        } else {
          tripulanteData.createdAt = new Date();
          await addDoc(collection(db, 'tripulantesBarcos'), tripulanteData);
          alert('Tripulante agregado exitosamente');
        }

        this.showModalTripulante = false;
        await this.loadTripulantes();
      } catch (error) {
        console.error('Error al guardar tripulante:', error);
        alert('Error al guardar tripulante');
      }
    },

    async toggleEstadoTripulante(tripulante) {
      const nuevoEstado = tripulante.estado === 'activo' ? 'inactivo' : 'activo';
      const accion = nuevoEstado === 'activo' ? 'activar' : 'desactivar';
      
      if (confirm(`¿Está seguro de ${accion} a ${tripulante.nombre}?`)) {
        try {
          await updateDoc(doc(db, 'tripulantesBarcos', tripulante.id), {
            estado: nuevoEstado,
            updatedAt: new Date()
          });
          
          await this.loadTripulantes();
          alert(`Tripulante ${accion === 'activar' ? 'activado' : 'desactivado'} exitosamente`);
        } catch (error) {
          console.error('Error al cambiar estado:', error);
          alert('Error al cambiar estado del tripulante');
        }
      }
    },

    openModalPrestamos(tripulante) {
      this.tripulanteSeleccionado = tripulante;
      this.showModalPrestamos = true;
    },

    verHistorialPrestamos(tripulante) {
      // Por ahora abrir el modal de préstamos
      this.openModalPrestamos(tripulante);
    },

    async onPrestamoRegistrado() {
      // Recargar tripulantes para actualizar balances
      await this.loadTripulantes();
    },

    closeModalOnOverlay(event) {
      if (event.target.classList.contains('modal-overlay')) {
        this.showModalTripulante = false;
        this.showModalPrestamos = false;
      }
    }
  }
};
</script>

<style scoped>
.gestion-tripulantes {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.back-button-container {
  margin-bottom: 30px;
}

/* Header Section */
.header-section {
  border-radius: 20px;
  padding: 40px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(52, 152, 219, 0.3);
  transition: all 0.3s ease;
}

.header-content {
  text-align: center;
  color: white;
}

.main-title {
  font-size: 2.5em;
  margin: 0 0 10px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
}

.subtitle {
  font-size: 1.2em;
  opacity: 0.9;
  margin: 0;
}

/* Barco Info */
.barco-info-card {
  background: white;
  border-radius: 15px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.barco-header {
  display: flex;
  align-items: center;
  gap: 20px;
}

.barco-icon {
  font-size: 3em;
}

.barco-details h3 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 1.5em;
}

.barco-details p {
  margin: 0;
  color: #7f8c8d;
}

/* Acciones Principales */
.acciones-principales {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.btn-accion {
  padding: 25px;
  border-radius: 15px;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  color: white;
  font-size: 1.1em;
  font-weight: 600;
}

.btn-nuevo {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
}

.btn-resumen {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.btn-accion:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.btn-accion .icon {
  font-size: 2.5em;
}

/* Temas específicos por barco */
.barco-theme-galileo.btn-nuevo {
  background: linear-gradient(135deg, #3498db 0%, #5dade2 100%) !important;
}

.barco-theme-galileo.btn-resumen {
  background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%) !important;
}

.barco-theme-maria-guadalupe.btn-nuevo {
  background: linear-gradient(135deg, #27ae60 0%, #58d68d 100%) !important;
}

.barco-theme-maria-guadalupe.btn-resumen {
  background: linear-gradient(135deg, #1e8449 0%, #239b56 100%) !important;
}

/* Resumen de Préstamos */
.resumen-prestamos-card {
  background: white;
  border-radius: 15px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.resumen-prestamos-card h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
}

.resumen-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.resumen-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
}

.resumen-item .label {
  font-weight: 600;
  color: #7f8c8d;
}

.resumen-item .valor {
  font-size: 1.5em;
  font-weight: bold;
}

.valor.prestamo {
  color: #e67e22;
  font-weight: bold;
}

.valor.abono {
  color: #27ae60;
}

.valor.pendiente {
  color: #e74c3c;
  font-weight: bold;
}

/* Sección Tripulantes */
.tripulantes-section {
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.section-header h3 {
  margin: 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
}

.filtro-select {
  padding: 10px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  color: #2c3e50;
  cursor: pointer;
}

/* No Tripulantes */
.no-tripulantes {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
}

.no-tripulantes .icon-empty {
  font-size: 4em;
  margin-bottom: 20px;
  opacity: 0.5;
}

.no-tripulantes h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.no-tripulantes p {
  margin: 0 0 30px 0;
}

.btn-agregar-primero {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 10px;
  font-size: 1.1em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 auto;
  transition: all 0.3s ease;
}

.btn-agregar-primero:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3);
}

/* Grid de Tripulantes */
.tripulantes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 25px;
}

.tripulante-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 15px;
  padding: 25px;
  transition: all 0.3s ease;
  position: relative;
}

.tripulante-card:hover {
  border-color: #3498db;
  box-shadow: 0 8px 25px rgba(52, 152, 219, 0.1);
  transform: translateY(-2px);
}

.tripulante-card.inactivo {
  opacity: 0.7;
  border-color: #bdc3c7;
}

.tripulante-header {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.avatar {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5em;
  color: white;
  flex-shrink: 0;
}

.tripulante-info {
  flex: 1;
}

.tripulante-info h4 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 1.3em;
}

.puesto {
  margin: 0 0 10px 0;
  color: #7f8c8d;
  font-style: italic;
}

.estado-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: bold;
  text-transform: uppercase;
}

.estado-badge.activo {
  background: #d5f4e6;
  color: #27ae60;
}

.estado-badge.inactivo {
  background: #fadbd8;
  color: #e74c3c;
}

.tripulante-acciones {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-prestamo,
.btn-editar,
.btn-toggle {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  font-size: 1.2em;
}

.btn-prestamo {
  background: #e67e22;
  color: white;
}

.btn-editar {
  background: #3498db;
  color: white;
}

.btn-toggle.activo {
  background: #e74c3c;
  color: white;
}

.btn-toggle.inactivo {
  background: #27ae60;
  color: white;
}

.btn-prestamo:hover,
.btn-editar:hover,
.btn-toggle:hover {
  transform: scale(1.1);
}

/* Stats */
.tripulante-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.8em;
  color: #7f8c8d;
  margin-bottom: 5px;
}

.stat-valor {
  font-size: 1.1em;
  font-weight: bold;
}

.stat-valor.prestamo {
  color: #e67e22;
  font-weight: bold;
}

.stat-valor.abono {
  color: #27ae60;
}

.stat-valor.pendiente {
  color: #e74c3c;
  font-weight: bold;
}

/* Footer Actions */
.tripulante-actions-footer {
  text-align: center;
}

.btn-historial {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
  transition: all 0.3s ease;
}

.btn-historial:hover {
  background: #5a6268;
  transform: translateY(-1px);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modern-modal {
  background: white;
  border-radius: 20px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modern-header {
  color: white;
  padding: 30px;
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
}

.header-icon {
  font-size: 2.5em;
}

.header-text h2 {
  margin: 0;
  font-size: 1.8em;
}

.header-text p {
  margin: 5px 0 0 0;
  opacity: 0.9;
}

.modern-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 1.5em;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.modern-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.modern-body {
  padding: 30px;
  overflow-y: auto;
  max-height: calc(90vh - 120px);
}

/* Form Styles */
.modern-form {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 15px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.modern-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.modern-label {
  font-weight: 600;
  color: #34495e;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modern-input {
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1em;
  transition: all 0.3s ease;
}

.modern-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.modal-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  margin-top: 30px;
}

.btn-cancelar {
  background: #6c757d;
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancelar:hover {
  background: #5a6268;
}

.btn-guardar {
  background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-guardar:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 184, 148, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .header-section {
    padding: 25px;
  }
  
  .main-title {
    font-size: 2em;
  }
  
  .acciones-principales {
    grid-template-columns: 1fr;
  }
  
  .tripulantes-grid {
    grid-template-columns: 1fr;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .resumen-grid {
    grid-template-columns: 1fr;
  }
  
  .section-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
}
</style>