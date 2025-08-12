<template>
  <div class="prestamos-trabajadores-container">
    <div class="back-button-container">
      <BackButton to="/procesos/prestamos" />
    </div>
    
    <h1>Préstamos a Trabajadores</h1>
    
    <div class="filtros-container">
      <div class="filtro">
        <label for="filtroTrabajador">Trabajador:</label>
        <select id="filtroTrabajador" v-model="filtroTrabajador">
          <option value="">Todos</option>
          <option v-for="trabajador in trabajadores" :key="trabajador.id" :value="trabajador.id">
            {{ trabajador.nombre }}
          </option>
        </select>
      </div>
      
      <div class="filtro">
        <label for="filtroEstado">Estado:</label>
        <select id="filtroEstado" v-model="filtroEstado">
          <option value="">Todos</option>
          <option value="activo">Con Deuda</option>
          <option value="pagado">Sin Deuda</option>
        </select>
      </div>
    </div>
    
    <div class="resumen-container">
      <div class="resumen-card activos">
        <h3>Trabajadores con Deuda</h3>
        <p>{{ cuentasConDeuda }}</p>
      </div>
      <div class="resumen-card pendiente">
        <h3>Total Pendiente</h3>
        <p>${{ formatNumber(totalPendienteGeneral) }}</p>
      </div>
      <div class="resumen-card total-prestado">
        <h3>Total Prestado</h3>
        <p>${{ formatNumber(totalPrestadoGeneral) }}</p>
      </div>
    </div>
    
    <div class="acciones-container">
      <button @click="mostrarModalNuevoPrestamo" class="btn-nuevo-prestamo">
        <i class="fas fa-plus"></i> Nuevo Préstamo
      </button>
      <button @click="mostrarModalNuevoTrabajador" class="btn-nuevo-trabajador">
        <i class="fas fa-user-plus"></i> Nuevo Trabajador
      </button>
    </div>
    
    <div v-if="cargando" class="loading-spinner">
      <div class="spinner"></div>
      <p>Cargando cuentas...</p>
    </div>
    
    <div v-else-if="cuentasTrabajadores.length === 0" class="no-data">
      <p>No hay cuentas registradas.</p>
      <button @click="mostrarModalNuevoPrestamo" class="btn-nuevo-prestamo">
        Crear Nuevo Préstamo
      </button>
    </div>
    
    <div v-else class="cuentas-container">
      <div 
        v-for="cuenta in cuentasFiltradas" 
        :key="cuenta.trabajadorId" 
        class="cuenta-card"
        :class="{ 'sin-deuda': cuenta.saldoPendiente <= 0 }"
      >
        <div class="cuenta-header">
          <div class="cuenta-info">
            <h3 class="trabajador-nombre">{{ cuenta.trabajadorNombre }}</h3>
            <div class="cuenta-stats">
              <div class="stat">
                <span class="label">Total Prestado:</span>
                <span class="value prestado">${{ formatNumber(cuenta.totalPrestado) }}</span>
              </div>
              <div class="stat">
                <span class="label">Total Abonado:</span>
                <span class="value abonado">${{ formatNumber(cuenta.totalAbonado) }}</span>
              </div>
              <div class="stat saldo">
                <span class="label">Saldo Pendiente:</span>
                <span class="value" :class="cuenta.saldoPendiente <= 0 ? 'pagado' : 'pendiente'">
                  ${{ formatNumber(cuenta.saldoPendiente) }}
                </span>
              </div>
            </div>
          </div>
          <div class="cuenta-acciones">
            <button @click="verHistorial(cuenta)" class="btn-historial" title="Ver historial completo">
              <i class="fas fa-history"></i>
              Historial
            </button>
            <button @click="agregarAbonoCuenta(cuenta)" class="btn-abono" :disabled="cuenta.saldoPendiente <= 0" title="Agregar abono">
              <i class="fas fa-money-bill"></i>
              Abonar
            </button>
          </div>
        </div>
        
        <div class="cuenta-resumen">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: cuenta.porcentajePagado + '%' }"></div>
          </div>
          <span class="progress-text">{{ cuenta.porcentajePagado }}% pagado</span>
        </div>
      </div>
    </div>
    
    <!-- Modales similares a PrestamosDespicadoras pero adaptados para trabajadores -->
    <!-- Modal Nuevo Préstamo -->
    <div v-if="showModalNuevoPrestamo" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Nuevo Préstamo a Trabajador</h2>
          <button @click="showModalNuevoPrestamo = false" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="guardarNuevoPrestamo" class="form-prestamo">
            <div class="form-group">
              <label for="trabajadorSelect">Trabajador:</label>
              <select id="trabajadorSelect" v-model="nuevoPrestamo.trabajadorId" required>
                <option value="">Seleccionar trabajador</option>
                <option v-for="trabajador in trabajadores" :key="trabajador.id" :value="trabajador.id">
                  {{ trabajador.nombre }}
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
    
    <!-- Modal Nuevo Trabajador -->
    <div v-if="showModalNuevoTrabajador" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Nuevo Trabajador</h2>
          <button @click="showModalNuevoTrabajador = false" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="guardarNuevoTrabajador" class="form-trabajador">
            <div class="form-group">
              <label for="nombreTrabajador">Nombre:</label>
              <input id="nombreTrabajador" type="text" v-model="nuevoTrabajador.nombre" required placeholder="Nombre completo del trabajador">
            </div>
            <div class="form-group">
              <label for="contactoTrabajador">Contacto:</label>
              <input id="contactoTrabajador" type="text" v-model="nuevoTrabajador.contacto" placeholder="Teléfono o email (opcional)">
            </div>
            <div class="form-group">
              <label for="puestoTrabajador">Puesto:</label>
              <input id="puestoTrabajador" type="text" v-model="nuevoTrabajador.puesto" placeholder="Puesto de trabajo (opcional)">
            </div>
            
            <div class="form-actions">
              <button type="button" @click="showModalNuevoTrabajador = false" class="btn-cancelar">Cancelar</button>
              <button type="submit" class="btn-guardar" :disabled="guardando">
                {{ guardando ? 'Guardando...' : 'Guardar Trabajador' }}
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
                <strong>Trabajador:</strong>
                <span>{{ prestamoSeleccionado?.trabajadorNombre }}</span>
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
            <p><strong>Trabajador:</strong> {{ prestamoSeleccionado?.trabajadorNombre }}</p>
            <p><strong>Saldo Pendiente:</strong> ${{ formatNumber(prestamoSeleccionado?.saldoPendiente) }}</p>
          </div>
          
          <form @submit.prevent="guardarAbono" class="form-abono">
            <div class="form-group">
              <label for="fechaAbono">Fecha:</label>
              <input id="fechaAbono" type="date" v-model="nuevoAbono.fecha" required>
            </div>
            <div class="form-group">
              <label for="descripcionAbono">Descripción:</label>
              <input id="descripcionAbono" type="text" v-model="nuevoAbono.descripcion" required placeholder="Ej: Descuento de nómina, Pago efectivo, etc.">
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
    
    <!-- Modal Historial Completo -->
    <div v-if="showHistorialModal" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h2>Historial Completo - {{ cuentaSeleccionada?.trabajadorNombre }}</h2>
          <button @click="showHistorialModal = false" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <div class="cuenta-resumen-modal">
            <div class="resumen-stats">
              <div class="stat-card prestado">
                <h4>Total Prestado</h4>
                <p>${{ formatNumber(cuentaSeleccionada?.totalPrestado) }}</p>
              </div>
              <div class="stat-card abonado">
                <h4>Total Abonado</h4>
                <p>${{ formatNumber(cuentaSeleccionada?.totalAbonado) }}</p>
              </div>
              <div class="stat-card pendiente">
                <h4>Saldo Pendiente</h4>
                <p>${{ formatNumber(cuentaSeleccionada?.saldoPendiente) }}</p>
              </div>
            </div>
            
            <div class="progress-section">
              <div class="progress-bar-large">
                <div class="progress-fill-large" :style="{ width: cuentaSeleccionada?.porcentajePagado + '%' }"></div>
              </div>
              <span class="progress-text-large">{{ cuentaSeleccionada?.porcentajePagado }}% pagado</span>
            </div>
          </div>
          
          <h3>Historial de Movimientos</h3>
          <div v-if="historialCompleto.length === 0" class="no-historial">
            <p>No hay movimientos registrados.</p>
          </div>
          <div v-else class="historial-container">
            <div 
              v-for="(movimiento, index) in historialCompleto" 
              :key="index" 
              class="movimiento-item"
              :class="movimiento.tipo"
            >
              <div class="movimiento-icon">
                <i :class="movimiento.tipo === 'prestamo' ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
              </div>
              <div class="movimiento-info">
                <div class="movimiento-header">
                  <span class="movimiento-tipo">
                    {{ movimiento.tipo === 'prestamo' ? 'Préstamo Otorgado' : 'Abono Recibido' }}
                  </span>
                  <span class="movimiento-fecha">{{ formatearFecha(movimiento.fecha) }}</span>
                </div>
                <div class="movimiento-descripcion">{{ movimiento.descripcion }}</div>
                <div class="movimiento-monto" :class="movimiento.tipo">
                  {{ movimiento.tipo === 'prestamo' ? '+' : '-' }}${{ formatNumber(movimiento.monto) }}
                </div>
              </div>
              <div class="movimiento-actions">
                <button @click="eliminarMovimiento(movimiento)" class="btn-eliminar-sm" title="Eliminar">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal Agregar Abono (Actualizado) -->
    <div v-if="showAbonoModal" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Agregar Abono</h2>
          <button @click="showAbonoModal = false" class="close-button">×</button>
        </div>
        <div class="modal-body">
          <div class="prestamo-info">
            <p><strong>Trabajador:</strong> {{ cuentaSeleccionada?.trabajadorNombre }}</p>
            <p><strong>Saldo Pendiente:</strong> ${{ formatNumber(cuentaSeleccionada?.saldoPendiente) }}</p>
          </div>
          
          <form @submit.prevent="guardarAbono" class="form-abono">
            <div class="form-group">
              <label for="fechaAbono">Fecha:</label>
              <input id="fechaAbono" type="date" v-model="nuevoAbono.fecha" required>
            </div>
            <div class="form-group">
              <label for="descripcionAbono">Descripción:</label>
              <input id="descripcionAbono" type="text" v-model="nuevoAbono.descripcion" required placeholder="Ej: Descuento de nómina, Pago efectivo, etc.">
            </div>
            <div class="form-group">
              <label for="montoAbono">Monto:</label>
              <input id="montoAbono" type="number" v-model.number="nuevoAbono.monto" required min="1" :max="cuentaSeleccionada?.saldoPendiente" step="0.01">
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
import { collection, addDoc, getDocs, getDoc, query, where, orderBy, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';

export default {
  name: 'PrestamosTrabajadores',
  components: {
    BackButton
  },
  data() {
    return {
      prestamos: [],
      trabajadores: [],
      cuentasTrabajadores: [],
      historialCompleto: [],
      cargando: true,
      guardando: false,
      
      // Filtros
      filtroTrabajador: '',
      filtroEstado: '',
      
      // Modales
      showModalNuevoPrestamo: false,
      showModalNuevoTrabajador: false,
      showHistorialModal: false,
      showAbonoModal: false,
      cuentaSeleccionada: null,
      
      // Formularios
      nuevoPrestamo: {
        trabajadorId: '',
        fecha: '',
        monto: null,
        descripcion: ''
      },
      
      nuevoTrabajador: {
        nombre: '',
        contacto: '',
        puesto: ''
      },
      
      nuevoAbono: {
        fecha: '',
        descripcion: '',
        monto: null
      }
    };
  },
  
  computed: {
    cuentasFiltradas() {
      return this.cuentasTrabajadores.filter(cuenta => {
        if (this.filtroTrabajador && cuenta.trabajadorId !== this.filtroTrabajador) {
          return false;
        }
        if (this.filtroEstado === 'activo' && cuenta.saldoPendiente <= 0) {
          return false;
        }
        if (this.filtroEstado === 'pagado' && cuenta.saldoPendiente > 0) {
          return false;
        }
        return true;
      });
    },
    
    cuentasConDeuda() {
      return this.cuentasFiltradas.filter(c => c.saldoPendiente > 0).length;
    },
    
    totalPendienteGeneral() {
      return this.cuentasFiltradas.reduce((sum, cuenta) => sum + cuenta.saldoPendiente, 0);
    },
    
    totalPrestadoGeneral() {
      return this.cuentasFiltradas.reduce((sum, cuenta) => sum + cuenta.totalPrestado, 0);
    }
  },
  
  methods: {
    obtenerFechaActual() {
      const fecha = new Date();
      // Ajustar por zona horaria para obtener la fecha local correcta
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
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
          query(collection(db, 'prestamosTrabajadores'), orderBy('fechaCreacion', 'desc'))
        );
        
        this.prestamos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        await this.agruparCuentasPorTrabajador();
      } catch (error) {
        console.error("Error al cargar préstamos: ", error);
      } finally {
        this.cargando = false;
      }
    },
    
    async agruparCuentasPorTrabajador() {
      const cuentasMap = new Map();
      
      // Agrupar préstamos por trabajador
      for (const prestamo of this.prestamos) {
        if (!cuentasMap.has(prestamo.trabajadorId)) {
          cuentasMap.set(prestamo.trabajadorId, {
            trabajadorId: prestamo.trabajadorId,
            trabajadorNombre: prestamo.trabajadorNombre,
            totalPrestado: 0,
            totalAbonado: 0,
            saldoPendiente: 0,
            prestamos: [],
            abonos: []
          });
        }
        
        const cuenta = cuentasMap.get(prestamo.trabajadorId);
        cuenta.totalPrestado += prestamo.montoInicial;
        cuenta.prestamos.push(prestamo);
        
        // Cargar abonos para este préstamo
        try {
          const abonosSnapshot = await getDocs(
            collection(db, 'prestamosTrabajadores', prestamo.id, 'abonos')
          );
          
          abonosSnapshot.forEach(doc => {
            const abono = { id: doc.id, prestamoId: prestamo.id, ...doc.data() };
            cuenta.abonos.push(abono);
            cuenta.totalAbonado += abono.monto;
          });
        } catch (error) {
          console.error(`Error al cargar abonos para préstamo ${prestamo.id}:`, error);
        }
      }
      
      // Calcular saldo pendiente y porcentaje pagado
      this.cuentasTrabajadores = Array.from(cuentasMap.values()).map(cuenta => {
        cuenta.saldoPendiente = cuenta.totalPrestado - cuenta.totalAbonado;
        cuenta.porcentajePagado = cuenta.totalPrestado > 0 ? 
          Math.round((cuenta.totalAbonado / cuenta.totalPrestado) * 100) : 0;
        return cuenta;
      });
    },
    
    async cargarTrabajadores() {
      try {
        const querySnapshot = await getDocs(collection(db, 'trabajadores'));
        this.trabajadores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar trabajadores: ", error);
      }
    },
    
    mostrarModalNuevoPrestamo() {
      this.nuevoPrestamo = {
        trabajadorId: '',
        fecha: this.obtenerFechaActual(),
        monto: null,
        descripcion: ''
      };
      this.showModalNuevoPrestamo = true;
    },
    
    mostrarModalNuevoTrabajador() {
      this.nuevoTrabajador = {
        nombre: '',
        contacto: '',
        puesto: ''
      };
      this.showModalNuevoTrabajador = true;
    },
    
    async guardarNuevoPrestamo() {
      if (!this.nuevoPrestamo.trabajadorId || !this.nuevoPrestamo.monto) {
        alert('Por favor complete todos los campos requeridos');
        return;
      }
      
      try {
        this.guardando = true;
        
        const trabajador = this.trabajadores.find(t => t.id === this.nuevoPrestamo.trabajadorId);
        
        await addDoc(collection(db, 'prestamosTrabajadores'), {
          trabajadorId: this.nuevoPrestamo.trabajadorId,
          trabajadorNombre: trabajador.nombre,
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
    
    async guardarNuevoTrabajador() {
      if (!this.nuevoTrabajador.nombre) {
        alert('Por favor ingrese el nombre del trabajador');
        return;
      }
      
      try {
        this.guardando = true;
        
        await addDoc(collection(db, 'trabajadores'), {
          nombre: this.nuevoTrabajador.nombre,
          contacto: this.nuevoTrabajador.contacto,
          puesto: this.nuevoTrabajador.puesto,
          fechaCreacion: new Date()
        });
        
        this.showModalNuevoTrabajador = false;
        await this.cargarTrabajadores();
        alert('Trabajador registrado correctamente');
      } catch (error) {
        console.error("Error al guardar trabajador: ", error);
        alert('Error al guardar trabajador: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    
    async verHistorial(cuenta) {
      this.cuentaSeleccionada = cuenta;
      
      // Combinar préstamos y abonos en un solo historial ordenado por fecha
      const historial = [];
      
      // Agregar préstamos
      cuenta.prestamos.forEach(prestamo => {
        historial.push({
          tipo: 'prestamo',
          fecha: prestamo.fecha,
          fechaCreacion: prestamo.fechaCreacion,
          descripcion: prestamo.descripcion || 'Préstamo otorgado',
          monto: prestamo.montoInicial,
          id: prestamo.id
        });
      });
      
      // Agregar abonos
      cuenta.abonos.forEach(abono => {
        historial.push({
          tipo: 'abono',
          fecha: abono.fecha,
          fechaCreacion: abono.fechaCreacion,
          descripcion: abono.descripcion,
          monto: abono.monto,
          id: abono.id,
          prestamoId: abono.prestamoId
        });
      });
      
      // Ordenar por fecha de creación (más reciente primero)
      this.historialCompleto = historial.sort((a, b) => {
        return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
      });
      
      this.showHistorialModal = true;
    },
    
    agregarAbonoCuenta(cuenta) {
      this.cuentaSeleccionada = cuenta;
      this.nuevoAbono = {
        fecha: this.obtenerFechaActual(),
        descripcion: '',
        monto: null
      };
      this.showAbonoModal = true;
    },
    
    async verDetalle(prestamo) {
      this.prestamoSeleccionado = prestamo;
      this.abonos = [];
      
      try {
        const abonosSnapshot = await getDocs(
          query(
            collection(db, 'prestamosTrabajadores', prestamo.id, 'abonos'),
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
      
      if (this.nuevoAbono.monto > this.cuentaSeleccionada.saldoPendiente) {
        alert('El monto del abono no puede ser mayor al saldo pendiente');
        return;
      }
      
      try {
        this.guardando = true;
        
        // Buscar el préstamo más reciente de la cuenta para asociar el abono
        const prestamoMasReciente = this.cuentaSeleccionada.prestamos
          .sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion))[0];
        
        if (!prestamoMasReciente) {
          alert('Error: No se encontró un préstamo para asociar el abono');
          return;
        }
        
        await addDoc(collection(db, 'prestamosTrabajadores', prestamoMasReciente.id, 'abonos'), {
          descripcion: this.nuevoAbono.descripcion,
          monto: this.nuevoAbono.monto,
          fecha: this.nuevoAbono.fecha,
          fechaCreacion: new Date()
        });
        
        this.showAbonoModal = false;
        await this.cargarPrestamos(); // Recargar todo para actualizar las cuentas
        alert('Abono registrado correctamente');
      } catch (error) {
        console.error("Error al guardar abono: ", error);
        alert('Error al guardar abono: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    
    async eliminarPrestamo(prestamo) {
      if (confirm(`¿Está seguro que desea eliminar el préstamo de ${prestamo.trabajadorNombre}? Esta acción no se puede deshacer.`)) {
        try {
          this.cargando = true;
          
          const abonosSnapshot = await getDocs(collection(db, 'prestamosTrabajadores', prestamo.id, 'abonos'));
          const batch = writeBatch(db);
          
          abonosSnapshot.forEach((documento) => {
            batch.delete(doc(db, 'prestamosTrabajadores', prestamo.id, 'abonos', documento.id));
          });
          
          await batch.commit();
          await deleteDoc(doc(db, 'prestamosTrabajadores', prestamo.id));
          
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
        
        await deleteDoc(doc(db, 'prestamosTrabajadores', this.prestamoSeleccionado.id, 'abonos', abono.id));
        
        this.abonos.splice(index, 1);
        
        const nuevoSaldoPendiente = this.calcularSaldoPendiente();
        
        await updateDoc(doc(db, 'prestamosTrabajadores', this.prestamoSeleccionado.id), {
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
    
    async eliminarMovimiento(movimiento) {
      try {
        if (movimiento.tipo === 'abono') {
          if (!confirm('¿Eliminar este abono? Esta acción no se puede deshacer.')) return;
          await deleteDoc(doc(db, 'prestamosTrabajadores', movimiento.prestamoId, 'abonos', movimiento.id));
          const prestamoRef = doc(db, 'prestamosTrabajadores', movimiento.prestamoId);
          const prestamoSnap = await getDoc(prestamoRef);
          if (prestamoSnap.exists()) {
            const prestamoData = prestamoSnap.data();
            const abonosSnapshot = await getDocs(collection(db, 'prestamosTrabajadores', movimiento.prestamoId, 'abonos'));
            let totalAbonos = 0;
            abonosSnapshot.forEach(a => { totalAbonos += a.data().monto || 0; });
            const nuevoSaldoPendiente = (prestamoData.montoInicial || 0) - totalAbonos;
            await updateDoc(prestamoRef, {
              saldoPendiente: nuevoSaldoPendiente,
              estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'activo'
            });
          }
        } else if (movimiento.tipo === 'prestamo') {
          if (!confirm('¿Eliminar este préstamo y todos sus abonos? Esta acción no se puede deshacer.')) return;
          const abonosSnapshot = await getDocs(collection(db, 'prestamosTrabajadores', movimiento.id, 'abonos'));
          const batch = writeBatch(db);
          abonosSnapshot.forEach((a) => {
            batch.delete(doc(db, 'prestamosTrabajadores', movimiento.id, 'abonos', a.id));
          });
          await batch.commit();
          await deleteDoc(doc(db, 'prestamosTrabajadores', movimiento.id));
        }
        await this.cargarPrestamos();
        if (this.cuentaSeleccionada) {
          const cuentaActualizada = this.cuentasTrabajadores.find(c => c.trabajadorId === this.cuentaSeleccionada.trabajadorId);
          if (cuentaActualizada) {
            this.verHistorial(cuentaActualizada);
          } else {
            this.showHistorialModal = false;
          }
        }
      } catch (error) {
        console.error('Error al eliminar movimiento: ', error);
        alert('Error al eliminar: ' + error.message);
      }
    },
    
    calcularSaldoPendiente() {
      return this.prestamoSeleccionado?.montoInicial - this.totalAbonos;
    },
    
    closeModalOnOverlay(event) {
      if (event.target === event.currentTarget) {
        this.showModalNuevoPrestamo = false;
        this.showModalNuevoTrabajador = false;
        this.showHistorialModal = false;
        this.showAbonoModal = false;
      }
    }
  },
  
  async mounted() {
    await Promise.all([this.cargarPrestamos(), this.cargarTrabajadores()]);
  }
};
</script>

<style scoped>
.prestamos-trabajadores-container {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 30px;
  border-bottom: 3px solid #2ecc71;
  padding-bottom: 10px;
}

/* Reutilizar estilos similares a PrestamosDespicadoras pero con colores verdes para trabajadores */
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
  border-left: 5px solid #2ecc71;
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
  color: #2ecc71;
}

.resumen-card.pendiente p {
  color: #f39c12;
}

.resumen-card.total-prestado {
  border-left: 5px solid #9b59b6;
}

.resumen-card.total-prestado p {
  color: #9b59b6;
}

/* Cuentas Container */
.cuentas-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cuenta-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  border-left: 5px solid #2ecc71;
  overflow: hidden;
  transition: all 0.3s ease;
}

.cuenta-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.cuenta-card.sin-deuda {
  border-left-color: #95a5a6;
  opacity: 0.8;
}

.cuenta-header {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 15px;
}

.cuenta-info {
  flex: 1;
  min-width: 300px;
}

.trabajador-nombre {
  color: #2c3e50;
  margin: 0 0 15px 0;
  font-size: 1.4em;
  font-weight: 600;
}

.cuenta-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat .label {
  color: #7f8c8d;
  font-size: 0.9em;
  font-weight: 500;
}

.stat .value {
  font-size: 1.2em;
  font-weight: bold;
}

.stat .value.prestado {
  color: #2ecc71;
}

.stat .value.abonado {
  color: #27ae60;
}

.stat .value.pendiente {
  color: #f39c12;
}

.stat .value.pagado {
  color: #95a5a6;
}

.stat.saldo {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 8px;
  border: 2px solid #ecf0f1;
}

.cuenta-acciones {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 120px;
}

.btn-historial, .btn-abono {
  padding: 10px 15px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  transition: all 0.3s ease;
}

.btn-historial {
  background: #3498db;
  color: white;
}

.btn-historial:hover {
  background: #2980b9;
}

.btn-abono {
  background: #9b59b6;
  color: white;
}

.btn-abono:hover {
  background: #8e44ad;
}

.btn-abono:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.cuenta-resumen {
  padding: 15px 20px;
  background: #f8f9fa;
  border-top: 1px solid #ecf0f1;
  display: flex;
  align-items: center;
  gap: 15px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #ecf0f1;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #2ecc71, #27ae60);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.progress-text {
  color: #7f8c8d;
  font-size: 0.9em;
  font-weight: 500;
  min-width: 80px;
  text-align: right;
}

/* Modal de Historial */
.cuenta-resumen-modal {
  margin-bottom: 30px;
}

.resumen-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  border-left: 4px solid;
}

.stat-card.prestado {
  border-left-color: #2ecc71;
}

.stat-card.abonado {
  border-left-color: #27ae60;
}

.stat-card.pendiente {
  border-left-color: #f39c12;
}

.stat-card h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 1em;
}

.stat-card p {
  margin: 0;
  font-size: 1.6em;
  font-weight: bold;
}

.stat-card.prestado p {
  color: #2ecc71;
}

.stat-card.abonado p {
  color: #27ae60;
}

.stat-card.pendiente p {
  color: #f39c12;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 15px;
}

.progress-bar-large {
  flex: 1;
  height: 12px;
  background: #ecf0f1;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill-large {
  height: 100%;
  background: linear-gradient(90deg, #2ecc71, #27ae60);
  border-radius: 6px;
  transition: width 0.5s ease;
}

.progress-text-large {
  color: #2c3e50;
  font-size: 1.1em;
  font-weight: 600;
  min-width: 100px;
  text-align: right;
}

/* Historial de Movimientos */
.historial-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ecf0f1;
  border-radius: 8px;
}

.movimiento-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border-bottom: 1px solid #ecf0f1;
  transition: background-color 0.3s;
}

.movimiento-item:hover {
  background: #f8f9fa;
}

.movimiento-item:last-child {
  border-bottom: none;
}

.movimiento-item.prestamo {
  border-left: 4px solid #2ecc71;
}

.movimiento-item.abono {
  border-left: 4px solid #27ae60;
}

.movimiento-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.2em;
}

.movimiento-item.prestamo .movimiento-icon {
  background: #2ecc71;
}

.movimiento-item.abono .movimiento-icon {
  background: #27ae60;
}

.movimiento-info {
  flex: 1;
}

.movimiento-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.movimiento-tipo {
  font-weight: 600;
  color: #2c3e50;
}

.movimiento-fecha {
  color: #7f8c8d;
  font-size: 0.9em;
}

.movimiento-descripcion {
  color: #7f8c8d;
  font-size: 0.9em;
  margin-bottom: 5px;
}

.movimiento-monto {
  font-size: 1.2em;
  font-weight: bold;
}

.movimiento-monto.prestamo {
  color: #2ecc71;
}

.movimiento-monto.abono {
  color: #e74c3c;
}

.no-historial {
  text-align: center;
  padding: 40px;
  color: #7f8c8d;
  background: #f8f9fa;
  border-radius: 8px;
}

.acciones-container {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.btn-nuevo-prestamo, .btn-nuevo-trabajador {
  background-color: #2ecc71;
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

.btn-nuevo-trabajador {
  background-color: #3498db;
}

.btn-nuevo-prestamo:hover {
  background-color: #27ae60;
}

.btn-nuevo-trabajador:hover {
  background-color: #2980b9;
}

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
  background-color: #2ecc71;
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
  background-color: #2ecc71;
  color: white;
}

.estado-badge.pagado {
  background-color: #95a5a6;
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
  border-left-color: #2ecc71;
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

/* Modal styles - reutilizar los mismos estilos */
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

.form-prestamo, .form-trabajador, .form-abono {
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
  background-color: #2ecc71;
  color: white;
}

.btn-guardar:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

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
  color: #2ecc71;
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
  
  .btn-nuevo-prestamo, .btn-nuevo-trabajador {
    width: 100%;
    justify-content: center;
  }
  
  .cuenta-header {
    flex-direction: column;
    gap: 15px;
  }
  
  .cuenta-info {
    min-width: auto;
    width: 100%;
  }
  
  .cuenta-stats {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .cuenta-acciones {
    flex-direction: row;
    min-width: auto;
    width: 100%;
  }
  
  .resumen-stats {
    grid-template-columns: 1fr;
  }
  
  .progress-section {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .progress-text-large {
    text-align: left;
    min-width: auto;
  }
  
  .movimiento-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .movimiento-header {
    flex-direction: column;
    align-items: flex-start;
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