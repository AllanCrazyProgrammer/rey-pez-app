<template>
  <div class="prestamos-trabajadores-container prestamos-workspace">
    <div class="back-button-container">
      <BackButton to="/procesos/prestamos" />
    </div>
    
    <div class="workspace-heading"><div><span class="eyebrow">CONTROL DE CUENTAS</span><h1>Préstamos a Trabajadores</h1><p>Consulta saldos, registra préstamos y lleva cada abono al día.</p></div><button class="btn-refresh" :disabled="cargando || guardando" @click="cargarPrestamos()"><i class="fas fa-sync-alt"></i> Actualizar</button></div>
    <div v-if="mensaje" role="status" class="notice-success">{{ mensaje }} <button @click="mensaje = ''" aria-label="Cerrar aviso">×</button></div>
    
    <div class="filtros-container">
      <div class="filtro filtro-busqueda"><label for="buscarCuenta">Buscar por nombre</label><input id="buscarCuenta" v-model="busqueda" type="search" placeholder="Escribe un nombre…" autocomplete="off"></div>
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
    
    <div class="results-caption">{{ cuentasFiltradas.length }} cuentas encontradas · El resumen refleja los filtros seleccionados</div>
    <div class="resumen-container">
      <div class="resumen-card abonado"><h3>Total abonado</h3><p>{{ cargando ? '…' : '$' + formatNumber(totalAbonadoGeneral) }}</p></div>
      <div class="resumen-card activos">
        <h3>Trabajadores con Deuda</h3>
        <p>{{ cargando ? '…' : cuentasConDeuda }}</p>
      </div>
      <div class="resumen-card pendiente">
        <h3>Total Pendiente</h3>
        <p>{{ cargando ? '…' : '$' + formatNumber(totalPendienteGeneral) }}</p>
      </div>
      <div class="resumen-card total-prestado">
        <h3>Total Prestado</h3>
        <p>{{ cargando ? '…' : '$' + formatNumber(totalPrestadoGeneral) }}</p>
      </div>
    </div>
    
    <div class="acciones-container"><div class="orden-cuentas"><label for="ordenCuentas">Ordenar por</label><select id="ordenCuentas" v-model="orden"><option value="saldo">Mayor saldo pendiente</option><option value="nombre">Nombre A–Z</option></select></div>
      <button @click="mostrarModalNuevoPrestamo" class="btn-nuevo-prestamo" :disabled="cargando || !!errorCarga || guardando">
        <i class="fas fa-plus"></i> Nuevo Préstamo
      </button>
      <button @click="mostrarModalNuevoTrabajador" class="btn-nuevo-trabajador">
        <i class="fas fa-user-plus"></i> Nuevo Trabajador
      </button>
    </div>
    
    <div v-if="errorCarga" role="alert" class="notice-error">{{ errorCarga }} <button @click="cargarPrestamos()" :disabled="cargando">Reintentar</button></div>
    <div v-if="cargando" class="loading-spinner">
      <div class="spinner"></div>
      <p>Cargando cuentas...</p>
    </div>
    
    <div v-else-if="errorCarga" class="no-data">
      <p>Los saldos no están disponibles.</p>
      <button @click="mostrarModalNuevoPrestamo" class="btn-nuevo-prestamo">
        Crear Nuevo Préstamo
      </button>
    </div>
    
    <div v-else-if="!cuentasFiltradas.length" class="no-data"><h3>No hay cuentas que mostrar</h3><p>{{ cuentasTrabajadores.length ? 'Prueba con otro nombre o cambia los filtros.' : 'Registra el primer préstamo para comenzar.' }}</p></div>
    <div v-else class="cuentas-container">
      <div 
        v-for="cuenta in cuentasVisibles"
        :key="cuenta.trabajadorId" 
        class="cuenta-card"
        :class="{ 'sin-deuda': cuenta.saldoPendiente <= 0 }"
      >
        <div class="cuenta-header">
          <div class="cuenta-info">
            <h3 class="trabajador-nombre">{{ cuenta.trabajadorNombre }}</h3><span class="account-status" :class="{ settled: cuenta.saldoPendiente <= 0 }">{{ cuenta.saldoPendiente > 0 ? 'Con saldo pendiente' : 'Al día' }}</span><span class="loan-count">{{ cuenta.prestamos.length }} préstamo(s)</span>
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
            <button @click="agregarAbonoCuenta(cuenta)" class="btn-abono" :disabled="cuenta.saldoPendiente <= 0 || guardando" title="Agregar abono">
              <i class="fas fa-money-bill"></i>
              Abonar
            </button>
            <button @click="eliminarCuenta(cuenta)" class="btn-eliminar-cuenta" :disabled="guardando" title="Borrar todos los préstamos y abonos de esta cuenta">
              <i class="fas fa-trash-alt"></i>
              Borrar cuenta
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
    <nav v-if="!cargando && !errorCarga && paginas > 1" class="pagination-bar" aria-label="Páginas de cuentas"><button :disabled="pagina === 1" @click="pagina--">Anterior</button><span>Página {{ pagina }} de {{ paginas }}</span><button :disabled="pagina >= paginas" @click="pagina++">Siguiente</button></nav>
    <!-- Modal Nuevo Préstamo -->
    <div v-if="showModalNuevoPrestamo" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content" role="dialog" aria-modal="true" aria-label="Gestión de préstamos" @click.stop>
        <div class="modal-header">
          <h2>Nuevo Préstamo a Trabajador</h2>
          <button @click="showModalNuevoPrestamo = false" :disabled="guardando" aria-label="Cerrar ventana" class="close-button">×</button>
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
              <button type="button" @click="showModalNuevoPrestamo = false" :disabled="guardando" class="btn-cancelar">Cancelar</button>
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
      <div class="modal-content" role="dialog" aria-modal="true" aria-label="Gestión de préstamos" @click.stop>
        <div class="modal-header">
          <h2>Nuevo Trabajador</h2>
          <button @click="showModalNuevoTrabajador = false" :disabled="guardando" aria-label="Cerrar ventana" class="close-button">×</button>
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
              <button type="button" @click="showModalNuevoTrabajador = false" :disabled="guardando" class="btn-cancelar">Cancelar</button>
              <button type="submit" class="btn-guardar" :disabled="guardando">
                {{ guardando ? 'Guardando...' : 'Guardar Trabajador' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Modal Historial Completo -->
    <div v-if="showHistorialModal" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content modal-large" role="dialog" aria-modal="true" aria-label="Gestión de préstamos" @click.stop>
        <div class="modal-header">
          <h2>Historial Completo - {{ cuentaSeleccionada?.trabajadorNombre }}</h2>
          <button @click="showHistorialModal = false" :disabled="guardando" aria-label="Cerrar ventana" class="close-button">×</button>
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
          
          <div class="history-heading"><h3>Movimientos</h3><select v-model="filtroMovimiento" aria-label="Filtrar movimientos"><option value="">Todos los movimientos</option><option value="prestamo">Solo préstamos</option><option value="abono">Solo abonos</option></select></div><p class="results-caption">{{ movimientosFiltrados.length }} movimientos · Del más reciente al más antiguo</p>
          <div v-if="movimientosFiltrados.length === 0" class="no-historial">
            <p>No hay movimientos registrados.</p>
          </div>
          <button v-if="movimientosFiltrados.length > limiteHistorial" class="btn-refresh" @click="limiteHistorial += 40">Mostrar 40 movimientos más</button>
          <div class="historial-container">
            <div 
              v-for="movimiento in movimientosVisibles"
              :key="movimiento.tipo + movimiento.id + (movimiento.prestamoId || '')"
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
                <button @click="eliminarMovimiento(movimiento)" :disabled="guardando" class="btn-eliminar-sm" title="Eliminar movimiento" aria-label="Eliminar movimiento">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Abono a la cuenta completa -->
    <div v-if="showAbonoModal" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content" role="dialog" aria-modal="true" aria-label="Gestión de préstamos" @click.stop>
        <div class="modal-header">
          <h2>Agregar Abono</h2>
          <button @click="showAbonoModal = false" :disabled="guardando" aria-label="Cerrar ventana" class="close-button">×</button>
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
              <input id="montoAbono" type="number" v-model.number="nuevoAbono.monto" required min="0.01" :max="cuentaSeleccionada?.saldoPendiente" step="0.01">
            </div>
            
            <div class="abono-preview"><span>Saldo después de este abono</span><strong>${{ formatNumber(saldoDespuesAbono) }}</strong><button type="button" @click="nuevoAbono.monto = cuentaSeleccionada.saldoPendiente">Abonar saldo completo</button></div>
            <div class="form-actions">
              <button type="button" @click="showAbonoModal = false" :disabled="guardando" class="btn-cancelar">Cancelar</button>
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
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { movimientosCuenta, fechaMovimiento } from '@/utils/prestamos';
import { cargarCuentasPrestamos, eliminarCuentaPrestamos } from '@/services/prestamosService';
import BackButton from '@/components/BackButton.vue';
import { formatNumber } from '@/utils/formatters';

export default {
  name: 'PrestamosTrabajadores',
  components: {
    BackButton
  },
  data() {
    return {
      busqueda: '',
      orden: 'saldo',
      pagina: 1,
      limiteHistorial: 40,
      filtroMovimiento: '',
      errorCarga: '',
      mensaje: '',
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
  
  watch: {
    busqueda() { this.pagina = 1; },
    filtroTrabajador() { this.pagina = 1; },
    filtroEstado() { this.pagina = 1; },
    orden() { this.pagina = 1; },
    filtroMovimiento() { this.limiteHistorial = 40; }
  },
  computed: {
    cuentasVisibles() { return this.cuentasFiltradas.slice((this.pagina - 1) * 20, this.pagina * 20); },
    paginas() { return Math.max(1, Math.ceil(this.cuentasFiltradas.length / 20)); },
    movimientosFiltrados() { return this.historialCompleto.filter(m => !this.filtroMovimiento || m.tipo === this.filtroMovimiento); },
    movimientosVisibles() { return this.movimientosFiltrados.slice(0, this.limiteHistorial); },
    saldoDespuesAbono() { return Math.max(0, Math.round(((this.cuentaSeleccionada?.saldoPendiente || 0) - (Number(this.nuevoAbono.monto) || 0)) * 100) / 100); },
    totalAbonadoGeneral() { return this.cuentasFiltradas.reduce((sum, c) => sum + c.totalAbonado, 0); },
    cuentasFiltradas() {
      const normalizar = valor => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const termino = normalizar(this.busqueda.trim());
      return this.cuentasTrabajadores.filter(cuenta => {
        if (termino && !normalizar(cuenta.trabajadorNombre).includes(termino)) return false;
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
      }).sort((a, b) => this.orden === 'nombre'
        ? a.trabajadorNombre.localeCompare(b.trabajadorNombre, 'es')
        : b.saldoPendiente - a.saldoPendiente || a.trabajadorNombre.localeCompare(b.trabajadorNombre, 'es'));
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
  
    formatNumber,
    obtenerFechaActual() {
      const fecha = new Date();
      // Ajustar por zona horaria para obtener la fecha local correcta
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    
    formatearFecha(fechaString) {
      if (!fechaString) return '';
      const fecha = new Date(fechaString + 'T00:00:00');
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },
    
    async cargarPrestamos(actualizar = true) {
      try {
        this.cargando = true;
        this.errorCarga = '';
        this.pagina = 1;
        this.cuentasTrabajadores = await cargarCuentasPrestamos('prestamosTrabajadores', 'trabajador', actualizar);
        this.prestamos = this.cuentasTrabajadores.flatMap(cuenta => cuenta.prestamos);
      } catch (error) {
        console.error("Error al cargar préstamos: ", error);
        this.errorCarga = "No se pudieron actualizar los saldos. Intenta de nuevo antes de registrar un movimiento.";
      } finally {
        this.cargando = false;
      }
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
      if (this.guardando) return;
      if (!this.nuevoPrestamo.trabajadorId || !Number.isFinite(this.nuevoPrestamo.monto) || this.nuevoPrestamo.monto <= 0) {
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
        this.mensaje = 'Préstamo registrado correctamente';
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
    
    verHistorial(cuenta) {
      this.cuentaSeleccionada = cuenta;
      this.filtroMovimiento = '';
      this.limiteHistorial = 40;
      this.historialCompleto = movimientosCuenta(cuenta);
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
    
    async guardarAbono() {
      if (this.guardando) return;
      if (!this.nuevoAbono.descripcion || !this.nuevoAbono.monto) {
        alert('Por favor complete todos los campos del abono');
        return;
      }
      
      if (!Number.isFinite(this.nuevoAbono.monto) || this.nuevoAbono.monto <= 0) {
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
        const prestamoMasReciente = [...this.cuentaSeleccionada.prestamos]
          .sort((a, b) => fechaMovimiento(b.fechaCreacion) - fechaMovimiento(a.fechaCreacion))[0];
        
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
        
        // Recalcular y actualizar el saldo pendiente del préstamo
        const abonosSnapshot = await getDocs(collection(db, 'prestamosTrabajadores', prestamoMasReciente.id, 'abonos'));
        let totalAbonos = 0;
        abonosSnapshot.forEach(doc => {
          totalAbonos += doc.data().monto || 0;
        });
        
        const nuevoSaldoPendiente = prestamoMasReciente.montoInicial - totalAbonos;
        await updateDoc(doc(db, 'prestamosTrabajadores', prestamoMasReciente.id), {
          saldoPendiente: nuevoSaldoPendiente,
          estado: nuevoSaldoPendiente <= 0 ? 'pagado' : 'activo'
        });
        
        this.showAbonoModal = false;
        await this.cargarPrestamos(); // Recargar todo para actualizar las cuentas
        this.mensaje = 'Abono registrado correctamente';
      } catch (error) {
        console.error("Error al guardar abono: ", error);
        alert('Error al guardar abono: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    
    async eliminarMovimiento(movimiento) {
      if (this.guardando) return;
      try {
        this.guardando = true;
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
      } finally {
        this.guardando = false;
      }
    },

    async eliminarCuenta(cuenta) {
      if (this.guardando) return;
      const confirmacion = confirm(
        `¿Borrar la cuenta de préstamos de ${cuenta.trabajadorNombre}?\n\n` +
        `Se eliminarán ${cuenta.prestamos.length} préstamo(s), todos sus abonos y el historial completo. ` +
        'El trabajador seguirá disponible. Esta acción no se puede deshacer.'
      );
      if (!confirmacion) return;

      try {
        this.guardando = true;
        await eliminarCuentaPrestamos('prestamosTrabajadores', cuenta);
        this.showHistorialModal = false;
        this.showAbonoModal = false;
        this.cuentaSeleccionada = null;
        await this.cargarPrestamos(true);
        this.mensaje = `Cuenta de préstamos de ${cuenta.trabajadorNombre} eliminada`;
      } catch (error) {
        console.error('Error al borrar cuenta de préstamos:', error);
        alert('No se pudo borrar la cuenta: ' + error.message);
      } finally {
        this.guardando = false;
      }
    },
    
    closeModalOnOverlay(event) {
      if (!this.guardando && event.target === event.currentTarget) {
        this.showModalNuevoPrestamo = false;
        this.showModalNuevoTrabajador = false;
        this.showHistorialModal = false;
        this.showAbonoModal = false;
      }
    }
  },
  
  async mounted() {
    await Promise.all([this.cargarPrestamos(false), this.cargarTrabajadores()]);
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
<style scoped src="./prestamos-workspace.css"></style>
