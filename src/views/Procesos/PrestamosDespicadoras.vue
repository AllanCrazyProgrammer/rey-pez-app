<template>
  <div class="prestamos-despicadoras-container">
    <div class="back-button-container">
      <BackButton to="/procesos/prestamos" />
    </div>
    
    <h1>Préstamos a Despicadoras</h1>
    
    <div class="filtros-container">
      <div class="filtro">
        <label for="filtroDespicadora">Despicadora:</label>
        <select id="filtroDespicadora" v-model="filtroDespicadora">
          <option value="">Todas</option>
          <option v-for="despicadora in despicadoras" :key="despicadora.id" :value="despicadora.id">
            {{ despicadora.nombre }}
          </option>
        </select>
      </div>
      
      <div class="filtro">
        <label for="filtroEstado">Estado:</label>
        <select id="filtroEstado" v-model="filtroEstado">
          <option value="">Todos</option>
          <option value="activo">Activo</option>
          <option value="pagado">Pagado</option>
        </select>
      </div>
      
      <div class="filtro-fecha">
        <label>Fecha:</label>
        <div class="fecha-inputs">
          <input type="date" v-model="filtroFechaDesde" placeholder="Desde">
          <span>a</span>
          <input type="date" v-model="filtroFechaHasta" placeholder="Hasta">
        </div>
      </div>
    </div>
    
    <div class="resumen-container">
      <div class="resumen-card activos">
        <h3>Préstamos Activos</h3>
        <p>{{ prestamosActivos }}</p>
      </div>
      <div class="resumen-card pendiente">
        <h3>Saldo Pendiente</h3>
        <p>${{ formatNumber(totalPendiente) }}</p>
      </div>
    </div>
    
    <div class="acciones-container">
      <button @click="mostrarModalNuevoPrestamo" class="btn-nuevo-prestamo">
        <i class="fas fa-plus"></i> Nuevo Préstamo
      </button>
      <button @click="mostrarModalNuevaDespicadora" class="btn-nueva-despicadora">
        <i class="fas fa-building"></i> Nueva Despicadora
      </button>
    </div>
    
    <div v-if="cargando" class="loading-spinner">
      <div class="spinner"></div>
      <p>Cargando préstamos...</p>
    </div>
    
    <div v-else-if="prestamos.length === 0" class="no-data">
      <p>No hay préstamos registrados.</p>
      <button @click="mostrarModalNuevoPrestamo" class="btn-nuevo-prestamo">
        Crear Nuevo Préstamo
      </button>
    </div>
    
    <div v-else class="tabla-container">
      <table class="tabla-prestamos">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Despicadora</th>
            <th>Monto Inicial</th>
            <th>Saldo Pendiente</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="prestamo in prestamosFiltrados" :key="prestamo.id" :class="{ 'prestamo-pagado': prestamo.estado === 'pagado' }">
            <td>{{ formatearFecha(prestamo.fecha) }}</td>
            <td>{{ prestamo.despicadoraNombre }}</td>
            <td>${{ formatNumber(prestamo.montoInicial) }}</td>
            <td>${{ formatNumber(prestamo.saldoPendiente) }}</td>
            <td>
              <span :class="'estado-badge ' + prestamo.estado">
                {{ prestamo.estado === 'activo' ? 'Activo' : 'Pagado' }}
              </span>
            </td>
            <td class="acciones">
              <button @click="verDetalle(prestamo)" class="btn-detalle" title="Ver detalles">
                <i class="fas fa-eye"></i>
              </button>
              <button @click="agregarAbono(prestamo)" class="btn-abono" :disabled="prestamo.estado === 'pagado'" title="Agregar abono">
                <i class="fas fa-money-bill"></i>
              </button>
              <button @click="eliminarPrestamo(prestamo)" class="btn-eliminar" title="Eliminar préstamo">
                <i class="fas fa-trash-alt"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Modal Nuevo Préstamo -->
    <div v-if="showModalNuevoPrestamo" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Nuevo Préstamo a Despicadora</h2>
          <button @click="showModalNuevoPrestamo = false" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="guardarNuevoPrestamo" class="form-prestamo">
            <div class="form-group">
              <label for="despicadoraSelect">Despicadora:</label>
              <select id="despicadoraSelect" v-model="nuevoPrestamo.despicadoraId" required>
                <option value="">Seleccionar despicadora</option>
                <option v-for="despicadora in despicadoras" :key="despicadora.id" :value="despicadora.id">
                  {{ despicadora.nombre }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="fechaPrestamo">Fecha:</label>
              <input id="fechaPrestamo" type="date" v-model="nuevoPrestamo.fecha" required>
            </div>
            <div class="form-group">
              <label for="montoPrestamo">Monto:</label>
              <input id="montoPrestamo" type="number" v-model.number="nuevoPrestamo.monto" required min="1" step="0.01">
            </div>
            <div class="form-group">
              <label for="descripcionPrestamo">Descripción:</label>
              <textarea id="descripcionPrestamo" v-model="nuevoPrestamo.descripcion" rows="3" placeholder="Descripción del préstamo (opcional)"></textarea>
            </div>
            
            <div class="form-actions">
              <button type="button" @click="showModalNuevoPrestamo = false" class="btn-cancelar">Cancelar</button>
              <button type="submit" class="btn-guardar" :disabled="guardando">
                {{ guardando ? 'Guardando...' : 'Guardar Préstamo' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Modal Nueva Despicadora -->
    <div v-if="showModalNuevaDespicadora" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Nueva Despicadora</h2>
          <button @click="showModalNuevaDespicadora = false" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="guardarNuevaDespicadora" class="form-despicadora">
            <div class="form-group">
              <label for="nombreDespicadora">Nombre:</label>
              <input id="nombreDespicadora" type="text" v-model="nuevaDespicadora.nombre" required placeholder="Nombre de la despicadora">
            </div>
            <div class="form-group">
              <label for="contactoDespicadora">Contacto:</label>
              <input id="contactoDespicadora" type="text" v-model="nuevaDespicadora.contacto" placeholder="Teléfono o email (opcional)">
            </div>
            <div class="form-group">
              <label for="direccionDespicadora">Dirección:</label>
              <textarea id="direccionDespicadora" v-model="nuevaDespicadora.direccion" rows="2" placeholder="Dirección (opcional)"></textarea>
            </div>
            
            <div class="form-actions">
              <button type="button" @click="showModalNuevaDespicadora = false" class="btn-cancelar">Cancelar</button>
              <button type="submit" class="btn-guardar" :disabled="guardando">
                {{ guardando ? 'Guardando...' : 'Guardar Despicadora' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Modal Detalle Préstamo -->
    <div v-if="showDetalleModal" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h2>Detalle del Préstamo</h2>
          <button @click="showDetalleModal = false" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <div class="prestamo-info">
            <div class="info-grid">
              <div class="info-item">
                <strong>Despicadora:</strong>
                <span>{{ prestamoSeleccionado?.despicadoraNombre }}</span>
              </div>
              <div class="info-item">
                <strong>Fecha:</strong>
                <span>{{ formatearFecha(prestamoSeleccionado?.fecha) }}</span>
              </div>
              <div class="info-item">
                <strong>Monto Inicial:</strong>
                <span>${{ formatNumber(prestamoSeleccionado?.montoInicial) }}</span>
              </div>
              <div class="info-item">
                <strong>Estado:</strong>
                <span :class="'estado-badge ' + prestamoSeleccionado?.estado">
                  {{ prestamoSeleccionado?.estado === 'activo' ? 'Activo' : 'Pagado' }}
                </span>
              </div>
            </div>
            <div v-if="prestamoSeleccionado?.descripcion" class="descripcion">
              <strong>Descripción:</strong>
              <p>{{ prestamoSeleccionado.descripcion }}</p>
            </div>
          </div>
          
          <h3>Historial de Abonos</h3>
          <div v-if="abonos.length === 0" class="no-abonos">
            <p>No hay abonos registrados para este préstamo.</p>
          </div>
          <table v-else class="tabla-abonos">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Monto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(abono, index) in abonos" :key="index">
                <td>{{ formatearFecha(abono.fecha) }}</td>
                <td>{{ abono.descripcion }}</td>
                <td>${{ formatNumber(abono.monto) }}</td>
                <td>
                  <button @click="eliminarAbono(index)" class="btn-eliminar-sm">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="total-label">Total Abonos</td>
                <td>${{ formatNumber(totalAbonos) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
          
          <div class="resumen-prestamo">
            <div class="resumen-item">
              <span>Monto inicial:</span>
              <span>${{ formatNumber(prestamoSeleccionado?.montoInicial) }}</span>
            </div>
            <div class="resumen-item">
              <span>Total abonos:</span>
              <span>${{ formatNumber(totalAbonos) }}</span>
            </div>
            <div class="resumen-item total">
              <span>Saldo pendiente:</span>
              <span>${{ formatNumber(calcularSaldoPendiente()) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal Agregar Abono -->
    <div v-if="showAbonoModal" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Agregar Abono</h2>
          <button @click="showAbonoModal = false" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <div class="prestamo-info">
            <p><strong>Despicadora:</strong> {{ prestamoSeleccionado?.despicadoraNombre }}</p>
            <p><strong>Saldo Pendiente:</strong> ${{ formatNumber(prestamoSeleccionado?.saldoPendiente) }}</p>
          </div>
          
          <form @submit.prevent="guardarAbono" class="form-abono">
            <div class="form-group">
              <label for="fechaAbono">Fecha:</label>
              <input id="fechaAbono" type="date" v-model="nuevoAbono.fecha" required>
            </div>
            <div class="form-group">
              <label for="descripcionAbono">Descripción:</label>
              <input id="descripcionAbono" type="text" v-model="nuevoAbono.descripcion" required placeholder="Ej: Pago parcial, Transferencia, etc.">
            </div>
            <div class="form-group">
              <label for="montoAbono">Monto:</label>
              <input id="montoAbono" type="number" v-model.number="nuevoAbono.monto" required min="1" :max="prestamoSeleccionado?.saldoPendiente" step="0.01">
            </div>
            
            <div class="form-actions">
              <button type="button" @click="showAbonoModal = false" class="btn-cancelar">Cancelar</button>
              <button type="submit" class="btn-guardar" :disabled="guardando">
                {{ guardando ? 'Guardando...' : 'Guardar Abono' }}
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
import { collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';

export default {
  name: 'PrestamosDespicadoras',
  components: {
    BackButton
  },
  data() {
    return {
      prestamos: [],
      despicadoras: [],
      abonos: [],
      cargando: true,
      guardando: false,
      
      // Filtros
      filtroDespicadora: '',
      filtroEstado: '',
      filtroFechaDesde: '',
      filtroFechaHasta: '',
      
      // Modales
      showModalNuevoPrestamo: false,
      showModalNuevaDespicadora: false,
      showDetalleModal: false,
      showAbonoModal: false,
      prestamoSeleccionado: null,
      
      // Formularios
      nuevoPrestamo: {
        despicadoraId: '',
        fecha: '',
        monto: null,
        descripcion: ''
      },
      
      nuevaDespicadora: {
        nombre: '',
        contacto: '',
        direccion: ''
      },
      
      nuevoAbono: {
        fecha: '',
        descripcion: '',
        monto: null
      }
    };
  },
  
  computed: {
    prestamosFiltrados() {
      return this.prestamos.filter(prestamo => {
        if (this.filtroDespicadora && prestamo.despicadoraId !== this.filtroDespicadora) {
          return false;
        }
        if (this.filtroEstado && prestamo.estado !== this.filtroEstado) {
          return false;
        }
        if (this.filtroFechaDesde && prestamo.fecha < this.filtroFechaDesde) {
          return false;
        }
        if (this.filtroFechaHasta && prestamo.fecha > this.filtroFechaHasta) {
          return false;
        }
        return true;
      });
    },
    
    prestamosActivos() {
      return this.prestamosFiltrados.filter(p => p.estado === 'activo').length;
    },
    
    totalPendiente() {
      return this.prestamosFiltrados.reduce((sum, prestamo) => sum + prestamo.saldoPendiente, 0);
    },
    
    totalAbonos() {
      return this.abonos.reduce((sum, abono) => sum + abono.monto, 0);
    }
  },
  
  methods: {
    obtenerFechaActual() {
      const fecha = new Date();
      return fecha.toISOString().split('T')[0];
    },
    
    formatNumber(number) {
      return number ? number.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    },
    
    formatearFecha(fechaString) {
      if (!fechaString) return '';
      const fecha = new Date(fechaString + 'T00:00:00');
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },
    
    async cargarPrestamos() {
      try {
        this.cargando = true;
        const querySnapshot = await getDocs(
          query(collection(db, 'prestamosDespicadoras'), orderBy('fechaCreacion', 'desc'))
        );
        
        this.prestamos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar préstamos: ", error);
      } finally {
        this.cargando = false;
      }
    },
    
    async cargarDespicadoras() {
      try {
        const querySnapshot = await getDocs(collection(db, 'despicadoras'));
        this.despicadoras = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar despicadoras: ", error);
      }
    },
    
    mostrarModalNuevoPrestamo() {
      this.nuevoPrestamo = {
        despicadoraId: '',
        fecha: this.obtenerFechaActual(),
        monto: null,
        descripcion: ''
      };
      this.showModalNuevoPrestamo = true;
    },
    
    mostrarModalNuevaDespicadora() {
      this.nuevaDespicadora = {
        nombre: '',
        contacto: '',
        direccion: ''
      };
      this.showModalNuevaDespicadora = true;
    },
    
    async guardarNuevoPrestamo() {
      if (!this.nuevoPrestamo.despicadoraId || !this.nuevoPrestamo.monto) {
        alert('Por favor complete todos los campos requeridos');
        return;
      }
      
      try {
        this.guardando = true;
        
        const despicadora = this.despicadoras.find(d => d.id === this.nuevoPrestamo.despicadoraId);
        
        await addDoc(collection(db, 'prestamosDespicadoras'), {
          despicadoraId: this.nuevoPrestamo.despicadoraId,
          despicadoraNombre: despicadora.nombre,
          fecha: this.nuevoPrestamo.fecha,
          montoInicial: this.nuevoPrestamo.monto,
          saldoPendiente: this.nuevoPrestamo.monto,
          descripcion: this.nuevoPrestamo.descripcion,
          estado: 'activo',
          fechaCreacion: new Date()
        });
        
        this.showModalNuevoPrestamo = false;
        await this.cargarPrestamos();
        alert('Préstamo registrado correctamente');
      } catch (error) {
        console.error("Error al guardar préstamo: ", error);
        alert('Error al guardar préstamo: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    
    async guardarNuevaDespicadora() {
      if (!this.nuevaDespicadora.nombre) {
        alert('Por favor ingrese el nombre de la despicadora');
        return;
      }
      
      try {
        this.guardando = true;
        
        await addDoc(collection(db, 'despicadoras'), {
          nombre: this.nuevaDespicadora.nombre,
          contacto: this.nuevaDespicadora.contacto,
          direccion: this.nuevaDespicadora.direccion,
          fechaCreacion: new Date()
        });
        
        this.showModalNuevaDespicadora = false;
        await this.cargarDespicadoras();
        alert('Despicadora registrada correctamente');
      } catch (error) {
        console.error("Error al guardar despicadora: ", error);
        alert('Error al guardar despicadora: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    
    async verDetalle(prestamo) {
      this.prestamoSeleccionado = prestamo;
      this.abonos = [];
      
      try {
        const abonosSnapshot = await getDocs(
          query(
            collection(db, 'prestamosDespicadoras', prestamo.id, 'abonos'),
            orderBy('fechaCreacion', 'desc')
          )
        );
        
        this.abonos = abonosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        this.showDetalleModal = true;
      } catch (error) {
        console.error("Error al cargar detalle del préstamo: ", error);
      }
    },
    
    agregarAbono(prestamo) {
      this.prestamoSeleccionado = prestamo;
      this.nuevoAbono = {
        fecha: this.obtenerFechaActual(),
        descripcion: '',
        monto: null
      };
      this.showAbonoModal = true;
    },
    
    async guardarAbono() {
      if (!this.nuevoAbono.descripcion || !this.nuevoAbono.monto) {
        alert('Por favor complete todos los campos del abono');
        return;
      }
      
      if (this.nuevoAbono.monto <= 0) {
        alert('El monto del abono debe ser mayor a cero');
        return;
      }
      
      if (this.nuevoAbono.monto > this.prestamoSeleccionado.saldoPendiente) {
        alert('El monto del abono no puede ser mayor al saldo pendiente');
        return;
      }
      
      try {
        this.guardando = true;
        
        await addDoc(collection(db, 'prestamosDespicadoras', this.prestamoSeleccionado.id, 'abonos'), {
          descripcion: this.nuevoAbono.descripcion,
          monto: this.nuevoAbono.monto,
          fecha: this.nuevoAbono.fecha,
          fechaCreacion: new Date()
        });
        
        const nuevoSaldoPendiente = this.prestamoSeleccionado.saldoPendiente - this.nuevoAbono.monto;
        const nuevoEstado = nuevoSaldoPendiente <= 0 ? 'pagado' : 'activo';
        
        await updateDoc(doc(db, 'prestamosDespicadoras', this.prestamoSeleccionado.id), {
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoEstado
        });
        
        this.prestamos = this.prestamos.map(p => {
          if (p.id === this.prestamoSeleccionado.id) {
            return {
              ...p,
              saldoPendiente: nuevoSaldoPendiente,
              estado: nuevoEstado
            };
          }
          return p;
        });
        
        this.prestamoSeleccionado.saldoPendiente = nuevoSaldoPendiente;
        this.prestamoSeleccionado.estado = nuevoEstado;
        
        this.showAbonoModal = false;
        alert('Abono registrado correctamente');
      } catch (error) {
        console.error("Error al guardar abono: ", error);
        alert('Error al guardar abono: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    
    async eliminarPrestamo(prestamo) {
      if (confirm(`¿Está seguro que desea eliminar el préstamo de ${prestamo.despicadoraNombre}? Esta acción no se puede deshacer.`)) {
        try {
          this.cargando = true;
          
          const abonosSnapshot = await getDocs(collection(db, 'prestamosDespicadoras', prestamo.id, 'abonos'));
          const batch = writeBatch(db);
          
          abonosSnapshot.forEach((documento) => {
            batch.delete(doc(db, 'prestamosDespicadoras', prestamo.id, 'abonos', documento.id));
          });
          
          await batch.commit();
          await deleteDoc(doc(db, 'prestamosDespicadoras', prestamo.id));
          
          this.prestamos = this.prestamos.filter(p => p.id !== prestamo.id);
          
          alert('Préstamo eliminado correctamente');
        } catch (error) {
          console.error("Error al eliminar el préstamo: ", error);
          alert('Error al eliminar el préstamo: ' + error.message);
        } finally {
          this.cargando = false;
        }
      }
    },
    
    async eliminarAbono(index) {
      if (!confirm('¿Está seguro de eliminar este abono?')) return;
      
      const abono = this.abonos[index];
      
      try {
        this.guardando = true;
        
        await deleteDoc(doc(db, 'prestamosDespicadoras', this.prestamoSeleccionado.id, 'abonos', abono.id));
        
        this.abonos.splice(index, 1);
        
        const nuevoSaldoPendiente = this.calcularSaldoPendiente();
        
        await updateDoc(doc(db, 'prestamosDespicadoras', this.prestamoSeleccionado.id), {
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'activo'
        });
        
        this.prestamos = this.prestamos.map(p => {
          if (p.id === this.prestamoSeleccionado.id) {
            return {
              ...p,
              saldoPendiente: nuevoSaldoPendiente,
              estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'activo'
            };
          }
          return p;
        });
        
        this.prestamoSeleccionado.saldoPendiente = nuevoSaldoPendiente;
        this.prestamoSeleccionado.estado = nuevoSaldoPendiente <= 0 ? 'pagado' : 'activo';
      } catch (error) {
        console.error("Error al eliminar abono: ", error);
        alert('Error al eliminar abono: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    
    calcularSaldoPendiente() {
      return this.prestamoSeleccionado?.montoInicial - this.totalAbonos;
    },
    
    closeModalOnOverlay(event) {
      if (event.target === event.currentTarget) {
        this.showModalNuevoPrestamo = false;
        this.showModalNuevaDespicadora = false;
        this.showDetalleModal = false;
        this.showAbonoModal = false;
      }
    }
  },
  
  async mounted() {
    await Promise.all([this.cargarPrestamos(), this.cargarDespicadoras()]);
  }
};
</script>

<style scoped>
.prestamos-despicadoras-container {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 3px solid #e74c3c;
  padding-bottom: 10px;
}

/* Filtros */
.filtros-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 30px;
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.filtro, .filtro-fecha {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 200px;
}

.filtro label, .filtro-fecha label {
  margin-bottom: 5px;
  color: #34495e;
  font-weight: 500;
}

.filtro select, .filtro-fecha input {
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ddd;
  font-size: 1em;
}

.fecha-inputs {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fecha-inputs span {
  color: #7f8c8d;
}

/* Resumen */
.resumen-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 30px;
}

.resumen-card {
  flex: 1;
  min-width: 200px;
  background-color: #fff;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.resumen-card.activos {
  border-left: 5px solid #e74c3c;
}

.resumen-card.pendiente {
  border-left: 5px solid #f39c12;
}

.resumen-card h3 {
  color: #2c3e50;
  margin: 0 0 10px 0;
  font-size: 1.1em;
}

.resumen-card p {
  font-size: 1.8em;
  font-weight: bold;
  margin: 0;
}

.resumen-card.activos p {
  color: #e74c3c;
}

.resumen-card.pendiente p {
  color: #f39c12;
}

/* Acciones */
.acciones-container {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.btn-nuevo-prestamo, .btn-nueva-despicadora {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.3s;
  font-size: 1em;
}

.btn-nueva-despicadora {
  background-color: #3498db;
}

.btn-nuevo-prestamo:hover {
  background-color: #c0392b;
}

.btn-nueva-despicadora:hover {
  background-color: #2980b9;
}

/* Tabla */
.tabla-container {
  overflow-x: auto;
}

.tabla-prestamos {
  width: 100%;
  border-collapse: collapse;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.tabla-prestamos th, .tabla-prestamos td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.tabla-prestamos th {
  background-color: #e74c3c;
  color: white;
}

.tabla-prestamos tbody tr:hover {
  background-color: #f5f5f5;
}

.tabla-prestamos .prestamo-pagado {
  background-color: #f8f9fa;
  color: #7f8c8d;
}

.estado-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 0.85em;
  text-transform: uppercase;
  font-weight: 500;
}

.estado-badge.activo {
  background-color: #e74c3c;
  color: white;
}

.estado-badge.pagado {
  background-color: #2ecc71;
  color: white;
}

.acciones {
  display: flex;
  gap: 5px;
}

.btn-detalle, .btn-abono, .btn-eliminar {
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  color: white;
  font-size: 0.9em;
}

.btn-detalle {
  background-color: #3498db;
}

.btn-detalle:hover {
  background-color: #2980b9;
}

.btn-abono {
  background-color: #9b59b6;
}

.btn-abono:hover {
  background-color: #8e44ad;
}

.btn-abono:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.btn-eliminar {
  background-color: #e74c3c;
}

.btn-eliminar:hover {
  background-color: #c0392b;
}

/* Estados de carga */
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 50px 0;
}

.spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border-left-color: #e74c3c;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.no-data {
  text-align: center;
  margin: 50px 0;
  color: #7f8c8d;
}

/* Modal styles */
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
  border-radius: 10px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.modal-content.modal-large {
  max-width: 800px;
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  color: #2c3e50;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #7f8c8d;
}

.modal-body {
  padding: 20px;
}

/* Formularios */
.form-prestamo, .form-despicadora, .form-abono {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 5px;
  color: #34495e;
  font-weight: 500;
}

.form-group input, .form-group select, .form-group textarea {
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ddd;
  font-size: 1em;
}

.form-group textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-cancelar, .btn-guardar {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
}

.btn-cancelar {
  background-color: #95a5a6;
  color: white;
}

.btn-guardar {
  background-color: #e74c3c;
  color: white;
}

.btn-guardar:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

/* Info del préstamo */
.prestamo-info {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item strong {
  color: #2c3e50;
}

.descripcion {
  margin-top: 15px;
}

.descripcion p {
  margin: 5px 0 0 0;
  color: #7f8c8d;
}

/* Tabla de abonos */
.tabla-abonos {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.tabla-abonos th, .tabla-abonos td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.tabla-abonos th {
  background-color: #f8f9fa;
  color: #2c3e50;
}

.total-label {
  text-align: right;
  font-weight: bold;
}

.no-abonos {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  color: #7f8c8d;
  margin-bottom: 20px;
}

.btn-eliminar-sm {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8em;
}

.btn-eliminar-sm:hover {
  background-color: #c0392b;
}

/* Resumen del préstamo */
.resumen-prestamo {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  margin-top: 20px;
}

.resumen-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.resumen-item.total {
  font-weight: bold;
  font-size: 1.2em;
  color: #e74c3c;
  border-top: 1px solid #ddd;
  padding-top: 10px;
  margin-top: 10px;
}

/* Responsive */
@media (max-width: 768px) {
  .filtros-container {
    flex-direction: column;
  }
  
  .filtro, .filtro-fecha {
    width: 100%;
  }
  
  .resumen-card {
    width: 100%;
  }
  
  .acciones-container {
    flex-direction: column;
  }
  
  .btn-nuevo-prestamo, .btn-nueva-despicadora {
    width: 100%;
    justify-content: center;
  }
  
  .tabla-prestamos {
    font-size: 0.9em;
  }
  
  .acciones {
    flex-direction: column;
    gap: 5px;
  }
  
  .modal-content {
    width: 95%;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style> 