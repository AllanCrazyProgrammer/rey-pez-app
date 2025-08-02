<template>
  <div class="pagos-tripulante">
    <!-- Información del tripulante -->
    <div class="tripulante-info-header">
      <div class="tripulante-avatar">
        <i class="avatar-icon">👤</i>
      </div>
      <div class="tripulante-details">
        <h3>{{ tripulante.nombre }}</h3>
        <p class="puesto">{{ tripulante.puesto || 'Sin puesto asignado' }}</p>
        <span :class="['estado-badge', tripulante.estado]">
          {{ tripulante.estado === 'activo' ? 'Activo' : 'Inactivo' }}
        </span>
      </div>
      <div class="balance-info">
        <div class="balance-item">
          <span class="label">Saldo Pendiente:</span>
          <span class="valor pendiente">
            ${{ saldoPendiente.toLocaleString() }}
          </span>
        </div>
      </div>
    </div>

    <!-- Formulario de nuevo préstamo/abono -->
    <div class="nuevo-prestamo-section">
      <h4>
        <i class="icon-add">➕</i>
        Registrar Nuevo {{ tipoTransaccion === 'prestamo' ? 'Préstamo' : 'Abono' }}
      </h4>
      
      <form @submit.prevent="registrarTransaccion" class="prestamo-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">
              <i class="label-icon">🔄</i>
              Tipo de Transacción
            </label>
            <div class="tipo-buttons">
              <button 
                type="button"
                :class="['tipo-btn', { active: tipoTransaccion === 'prestamo' }]"
                @click="tipoTransaccion = 'prestamo'"
              >
                <i class="btn-icon">🏦</i>
                Préstamo
              </button>
              <button 
                type="button"
                :class="['tipo-btn', { active: tipoTransaccion === 'pago' }]"
                @click="tipoTransaccion = 'pago'"
              >
                <i class="btn-icon">💰</i>
                Abono
              </button>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="monto" class="form-label">
              <i class="label-icon">💵</i>
              Monto ($)
            </label>
            <input 
              v-model.number="formPago.monto" 
              id="monto" 
              type="number" 
              step="0.01"
              min="0.01"
              required 
              placeholder="0.00"
              class="form-input"
            >
          </div>
          
          <div class="form-group">
            <label for="fecha" class="form-label">
              <i class="label-icon">📅</i>
              Fecha
            </label>
            <input 
              v-model="formPago.fecha" 
              id="fecha" 
              type="date" 
              required
              class="form-input"
            >
          </div>
        </div>

        <div class="form-row">
          <div class="form-group full-width">
            <label for="concepto" class="form-label">
              <i class="label-icon">📝</i>
              Concepto
            </label>
            <input 
              v-model="formPago.concepto" 
              id="concepto" 
              type="text"
              required 
              :placeholder="tipoTransaccion === 'prestamo' ? 'Ej: Anticipo de salario, emergencia médica, combustible...' : 'Ej: Abono a préstamo, descuento de salario...'"
              class="form-input"
            >
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" :class="['btn-submit', tipoTransaccion]">
            <i class="btn-icon">💾</i>
            Registrar {{ tipoTransaccion === 'prestamo' ? 'Préstamo' : 'Abono' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Historial de transacciones -->
    <div class="historial-section">
      <div class="historial-header">
        <h4>
          <i class="icon-history">📄</i>
          Historial de Préstamos y Abonos
        </h4>
        <div class="filtros-historial">
          <select v-model="filtroTipo" class="filtro-select">
            <option value="">Todos los tipos</option>
            <option value="prestamo">Solo Préstamos</option>
            <option value="pago">Solo Abonos</option>
          </select>
          <select v-model="filtroMes" class="filtro-select">
            <option value="">Todos los meses</option>
            <option value="este-mes">Este mes</option>
            <option value="mes-pasado">Mes pasado</option>
            <option value="ultimos-3-meses">Últimos 3 meses</option>
          </select>
        </div>
      </div>

      <div v-if="transaccionesFiltradas.length === 0" class="no-transacciones">
        <i class="icon-empty">📭</i>
        <p>No hay préstamos registrados para este tripulante</p>
      </div>

      <div v-else class="transacciones-list">
        <div 
          v-for="transaccion in transaccionesFiltradas" 
          :key="transaccion.id"
          :class="['transaccion-item', transaccion.tipo]"
        >
          <div class="transaccion-header">
            <div class="transaccion-info">
              <div class="transaccion-tipo">
                <i :class="['tipo-icon', transaccion.tipo]">
                  {{ transaccion.tipo === 'pago' ? '💰' : '🏦' }}
                </i>
                <div class="tipo-info">
                  <span class="tipo-label">{{ transaccion.tipo === 'prestamo' ? 'Préstamo' : 'Abono' }}</span>
                  <span class="concepto">{{ transaccion.concepto }}</span>
                </div>
              </div>
              <div class="transaccion-monto">
                <span :class="['monto', transaccion.tipo]">
                  {{ transaccion.tipo === 'prestamo' ? '+' : '-' }}${{ transaccion.monto.toLocaleString() }}
                </span>
                <span class="fecha">{{ formatearFecha(transaccion.fecha) }}</span>
              </div>
            </div>
            
            <div class="transaccion-actions">
              <button 
                @click="editarTransaccion(transaccion)" 
                class="btn-editar-trans"
                title="Editar transacción"
              >
                <i class="icon">✏️</i>
              </button>
              <button 
                @click="eliminarTransaccion(transaccion)" 
                class="btn-eliminar-trans"
                title="Eliminar transacción"
              >
                <i class="icon">🗑️</i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumen del historial -->
      <div v-if="transacciones.length > 0" class="resumen-historial">
        <div class="resumen-item">
          <span class="resumen-label">Total Prestado:</span>
          <span class="resumen-valor prestamo">${{ totalPrestado.toLocaleString() }}</span>
        </div>
        <div class="resumen-item">
          <span class="resumen-label">Total Abonado:</span>
          <span class="resumen-valor abono">${{ totalPagado.toLocaleString() }}</span>
        </div>
        <div class="resumen-item">
          <span class="resumen-label">Saldo Pendiente:</span>
          <span class="resumen-valor pendiente">
            ${{ saldoPendiente.toLocaleString() }}
          </span>
        </div>
      </div>
    </div>

    <!-- Modal para editar transacción -->
    <div v-if="showModalEditar" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Editar Transacción</h3>
          <button @click="showModalEditar = false" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="actualizarTransaccion" class="edit-form">
            <div class="form-group">
              <label>Monto ($)</label>
              <input 
                v-model.number="transaccionEditando.monto" 
                type="number" 
                step="0.01"
                required
                class="form-input"
              >
            </div>
            <div class="form-group">
              <label>Fecha</label>
              <input 
                v-model="transaccionEditando.fecha" 
                type="date" 
                required
                class="form-input"
              >
            </div>
            <div class="form-group">
              <label>Concepto</label>
              <input 
                v-model="transaccionEditando.concepto" 
                required
                class="form-input"
              >
            </div>

            <div class="modal-actions">
              <button type="button" @click="showModalEditar = false" class="btn-cancelar">
                Cancelar
              </button>
              <button type="submit" class="btn-actualizar">
                Actualizar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';

export default {
  name: 'PagosTripulante',
  props: {
    tripulante: {
      type: Object,
      required: true
    },
    barco: {
      type: String,
      required: true
    },
    nombreBarco: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      tipoTransaccion: 'prestamo',
      formPago: {
        monto: null,
        fecha: new Date().toISOString().split('T')[0],
        concepto: ''
      },
      transacciones: [],
      filtroTipo: '',
      filtroMes: '',
      showModalEditar: false,
      transaccionEditando: null
    };
  },
  computed: {
    totalPagado() {
      return this.transacciones
        .filter(t => t.tipo === 'pago')
        .reduce((total, t) => total + t.monto, 0);
    },
    totalPrestado() {
      return this.transacciones
        .filter(t => t.tipo === 'prestamo')
        .reduce((total, t) => total + t.monto, 0);
    },
    saldoPendiente() {
      return this.totalPrestado - this.totalPagado;
    },
    transaccionesFiltradas() {
      let filtradas = [...this.transacciones];
      
      // Filtro por tipo
      if (this.filtroTipo) {
        filtradas = filtradas.filter(t => t.tipo === this.filtroTipo);
      }
      
      // Filtro por mes
      if (this.filtroMes) {
        const ahora = new Date();
        filtradas = filtradas.filter(t => {
          const fechaTransaccion = new Date(t.fecha);
          
          switch (this.filtroMes) {
            case 'este-mes':
              return fechaTransaccion.getMonth() === ahora.getMonth() && 
                     fechaTransaccion.getFullYear() === ahora.getFullYear();
            case 'mes-pasado':
              const mesPasado = new Date(ahora.getFullYear(), ahora.getMonth() - 1);
              return fechaTransaccion.getMonth() === mesPasado.getMonth() && 
                     fechaTransaccion.getFullYear() === mesPasado.getFullYear();
            case 'ultimos-3-meses':
              const hace3Meses = new Date(ahora.getFullYear(), ahora.getMonth() - 3);
              return fechaTransaccion >= hace3Meses;
            default:
              return true;
          }
        });
      }
      
      // Solo ordenar si hay filtros aplicados, ya que los datos vienen ordenados de cargarTransacciones()
      if (this.filtroTipo || this.filtroMes) {
        return filtradas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      }
      
      return filtradas;
    }
  },
  mounted() {
    this.cargarTransacciones();
  },
  methods: {
    async cargarTransacciones() {
      try {
        // Consulta simple sin orderBy para evitar índices compuestos
        const q = query(
          collection(db, 'pagosTripulantes'),
          where('tripulanteId', '==', this.tripulante.id),
          where('barco', '==', this.barco)
        );
        const querySnapshot = await getDocs(q);
        this.transacciones = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Ordenar por fecha en el frontend (más reciente primero)
        this.transacciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      } catch (error) {
        console.error('Error al cargar transacciones:', error);
      }
    },

    async registrarTransaccion() {
      if (!this.formPago.monto || this.formPago.monto <= 0) {
        alert('Por favor ingrese un monto válido');
        return;
      }

      if (!this.formPago.concepto.trim()) {
        alert('Por favor ingrese un concepto');
        return;
      }

      try {
        const transaccionData = {
          tripulanteId: this.tripulante.id,
          tripulanteNombre: this.tripulante.nombre,
          barco: this.barco,
          nombreBarco: this.nombreBarco,
          tipo: this.tipoTransaccion,
          monto: this.formPago.monto,
          fecha: this.formPago.fecha,
          concepto: this.formPago.concepto.trim(),
          createdAt: new Date()
        };

        await addDoc(collection(db, 'pagosTripulantes'), transaccionData);
        
        // Limpiar formulario
        this.formPago = {
          monto: null,
          fecha: new Date().toISOString().split('T')[0],
          concepto: ''
        };

        await this.cargarTransacciones();
        this.$emit('prestamo-registrado');
        
        alert(`${this.tipoTransaccion === 'prestamo' ? 'Préstamo' : 'Abono'} registrado exitosamente`);
      } catch (error) {
        console.error('Error al registrar transacción:', error);
        alert('Error al registrar la transacción');
      }
    },

    editarTransaccion(transaccion) {
      this.transaccionEditando = { ...transaccion };
      this.showModalEditar = true;
    },

    async actualizarTransaccion() {
      try {
        await updateDoc(doc(db, 'pagosTripulantes', this.transaccionEditando.id), {
          monto: this.transaccionEditando.monto,
          fecha: this.transaccionEditando.fecha,
          concepto: this.transaccionEditando.concepto,
          updatedAt: new Date()
        });

        this.showModalEditar = false;
        await this.cargarTransacciones();
        this.$emit('prestamo-registrado');
        alert('Transacción actualizada exitosamente');
      } catch (error) {
        console.error('Error al actualizar transacción:', error);
        alert('Error al actualizar la transacción');
      }
    },

    async eliminarTransaccion(transaccion) {
      const tipoTexto = transaccion.tipo === 'prestamo' ? 'préstamo' : 'abono';
      if (confirm(`¿Está seguro de eliminar este ${tipoTexto} de $${transaccion.monto.toLocaleString()}?`)) {
        try {
          await deleteDoc(doc(db, 'pagosTripulantes', transaccion.id));
          await this.cargarTransacciones();
          this.$emit('prestamo-registrado');
          alert('Transacción eliminada exitosamente');
        } catch (error) {
          console.error('Error al eliminar transacción:', error);
          alert('Error al eliminar la transacción');
        }
      }
    },

    formatearFecha(fecha) {
      // Evitar problemas de zona horaria creando la fecha con los componentes locales
      if (!fecha) return '';
      
      const [year, month, day] = fecha.split('-');
      const date = new Date(year, month - 1, day); // month - 1 porque Date usa meses base 0
      
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    },

    closeModalOnOverlay(event) {
      if (event.target.classList.contains('modal-overlay')) {
        this.showModalEditar = false;
      }
    }
  }
};
</script>

<style scoped>
.pagos-tripulante {
  max-width: 100%;
}

/* Header del tripulante */
.tripulante-info-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 25px;
  background: #f8f9fa;
  border-radius: 15px;
  margin-bottom: 30px;
}

.tripulante-avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2em;
  color: white;
  flex-shrink: 0;
}

.tripulante-details {
  flex: 1;
}

.tripulante-details h3 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 1.5em;
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

.balance-info {
  text-align: right;
}

.balance-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.balance-item .label {
  font-size: 0.9em;
  color: #7f8c8d;
}

.balance-item .valor {
  font-size: 1.8em;
  font-weight: bold;
}

.valor.positivo {
  color: #27ae60;
}

.valor.negativo {
  color: #e74c3c;
}

/* Sección nuevo préstamo */
.nuevo-prestamo-section {
  background: white;
  border-radius: 15px;
  padding: 30px;
  margin-bottom: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.nuevo-prestamo-section h4 {
  margin: 0 0 25px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
}

.prestamo-form {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-label {
  font-weight: 600;
  color: #34495e;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-input {
  padding: 12px 15px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1em;
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

/* Botones de tipo */
.tipo-buttons {
  display: flex;
  gap: 10px;
}

.tipo-btn {
  flex: 1;
  padding: 12px 20px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
}

.tipo-btn:hover {
  border-color: #3498db;
}

.tipo-btn.active {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

/* Botón submit */
.form-actions {
  text-align: center;
  margin-top: 25px;
}

.btn-submit {
  padding: 15px 30px;
  border: none;
  border-radius: 10px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  color: white;
}

.btn-submit.prestamo {
  background: linear-gradient(135deg, #e67e22 0%, #f39c12 100%);
}

.btn-submit.pago {
  background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

/* Sección historial */
.historial-section {
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.historial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.historial-header h4 {
  margin: 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 10px;
}

.filtros-historial {
  display: flex;
  gap: 10px;
}

.filtro-select {
  padding: 8px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}

/* Lista de transacciones */
.no-transacciones {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
}

.no-transacciones .icon-empty {
  font-size: 3em;
  margin-bottom: 15px;
  opacity: 0.5;
}

.transacciones-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.transaccion-item {
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
}

.transaccion-item.prestamo {
  border-left: 5px solid #e67e22;
}

.transaccion-item.pago {
  border-left: 5px solid #27ae60;
}

.transaccion-item:hover {
  border-color: #3498db;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.1);
}

.transaccion-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
  gap: 15px;
}

.transaccion-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.transaccion-tipo {
  display: flex;
  align-items: center;
  gap: 15px;
}

.tipo-icon {
  font-size: 1.5em;
}

.tipo-info {
  display: flex;
  flex-direction: column;
}

.tipo-label {
  font-weight: bold;
  color: #2c3e50;
}

.concepto {
  font-size: 0.9em;
  color: #7f8c8d;
}

.transaccion-monto {
  text-align: right;
}

.monto {
  font-size: 1.3em;
  font-weight: bold;
}

.monto.prestamo {
  color: #e67e22;
  font-weight: bold;
}

.monto.pago {
  color: #27ae60;
}

.fecha {
  display: block;
  font-size: 0.8em;
  color: #7f8c8d;
  margin-top: 2px;
}

.transaccion-descripcion {
  margin: 10px 0;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 8px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.9em;
  color: #5a6c7d;
}

.transaccion-actions {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.btn-editar-trans,
.btn-eliminar-trans {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.btn-editar-trans {
  background: #3498db;
  color: white;
}

.btn-eliminar-trans {
  background: #e74c3c;
  color: white;
}

.btn-editar-trans:hover,
.btn-eliminar-trans:hover {
  transform: scale(1.1);
}

/* Resumen del historial */
.resumen-historial {
  margin-top: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
}

.resumen-item {
  text-align: center;
}

.resumen-label {
  display: block;
  font-size: 0.9em;
  color: #7f8c8d;
  margin-bottom: 5px;
}

.resumen-valor {
  font-size: 1.3em;
  font-weight: bold;
}

.resumen-valor.prestamo {
  color: #e67e22;
  font-weight: bold;
}

.resumen-valor.abono {
  color: #27ae60;
}

.resumen-valor.pendiente {
  color: #e74c3c;
  font-weight: bold;
}

/* Modal para editar */
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
}

.modal-content {
  background: white;
  border-radius: 15px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
}

.modal-header {
  background: #3498db;
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5em;
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 25px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.btn-cancelar,
.btn-actualizar {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.btn-cancelar {
  background: #6c757d;
  color: white;
}

.btn-actualizar {
  background: #3498db;
  color: white;
}

.btn-cancelar:hover,
.btn-actualizar:hover {
  opacity: 0.9;
}

/* Responsive */
@media (max-width: 768px) {
  .tripulante-info-header {
    flex-direction: column;
    text-align: center;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .tipo-buttons {
    flex-direction: column;
  }
  
  .historial-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .filtros-historial {
    flex-direction: column;
  }
  
  .transaccion-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .transaccion-monto {
    text-align: left;
  }
  
  .resumen-historial {
    grid-template-columns: 1fr;
  }
}
</style>