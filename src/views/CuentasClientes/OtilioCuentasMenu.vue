<template>
  <div class="otilio-cuentas-menu-container">
    <h1>Menú de Cuentas Otilio</h1>
    
    <div class="actions-container actions-sticky">
      <router-link to="/cuentas-mexico" class="action-button back-btn">
        Cuentas México
      </router-link>
      <router-link to="/cuentas-otilio/nueva" class="action-button new-cuenta-btn">
        Nueva Cuenta
      </router-link>
      <router-link to="/cuentas-otilio-independiente" class="action-button independiente-btn">
        Cuentas Independientes
      </router-link>
      <button @click="showAbonosModal = true" class="action-button abonos-btn">
        Abonos
      </button>
      <button @click="showObservacionesModal = true" class="action-button observaciones-btn">
        Ver Observaciones
      </button>
      <PreciosHistorialModal clienteActual="otilio" />
      <StashModalV2 cliente="otilio" />
      <ObservacionesModal 
        :isVisible="showObservacionesModal" 
        @cerrar="showObservacionesModal = false" 
      />
    </div>

    <div class="reporte-cuentas-card card">
      <h2>Generar reporte PDF</h2>
      <ReporteCuentasOtilioButton />
      <button @click="generarReporteSemanal" class="action-button reporte-semanal-btn" style="margin-top: 10px; width: 100%;">
        Reporte Semanal
      </button>
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
      <div v-if="error" class="error-message">
        Error al cargar los datos: {{ error }}
      </div>
      <div v-else-if="isLoading" class="loading">Cargando registros...</div>
      <div v-else-if="cuentasFiltradas.length === 0" class="no-records">
        No hay registros de cuentas que coincidan con el filtro.
      </div>
      <ul v-else>
        <li
          v-for="cuenta in cuentasPaginadas"
          :key="cuenta.id"
          class="cuenta-item"
          :class="{
            'tiene-observacion': cuenta.tieneObservacion || (cuenta.observacion && cuenta.observacion.trim().length),
            'cuenta-sin-nota': cuenta.missingNota
          }"
        >
          <div class="cuenta-content">
            <span class="cuenta-date">{{ formatDate(cuenta.fecha) }}</span>
            <p class="cuenta-summary">
              <span v-if="!cuenta.missingNota">Saldo Hoy: ${{ formatNumber(cuenta.saldoHoy) }}</span>
              <span v-else class="texto-sin-nota">Sin nota registrada</span>
              <span v-if="!cuenta.missingNota">Total Acumulado: ${{ formatNumber(cuenta.totalNota) }}</span>
            </p>
            <div v-if="!cuenta.missingNota && (cuenta.tieneObservacion || (cuenta.observacion && cuenta.observacion.trim().length))" class="observacion-container">
              <p class="observacion-texto">{{ cuenta.observacion }}</p>
              <button class="delete-observacion-btn" @click="borrarObservacion(cuenta.id)" title="Borrar observación">&times;</button>
            </div>
            <div v-if="!cuenta.missingNota && cuenta.abonos && cuenta.abonos.length > 0" class="abonos-info">
              <p v-for="(abono, index) in cuenta.abonos" :key="index" class="abono-detail">
                <span class="abono-label">Abono:</span>
                <span class="abono-monto">${{ formatNumber(abono.monto) }}</span>
                <span class="abono-descripcion">{{ abono.descripcion || 'Sin descripción' }}</span>
              </p>
              <p v-if="cuenta.abonos.length > 1" class="abono-total">
                Total abonos: ${{ formatNumber(cuenta.totalAbonos) }}
              </p>
            </div>
            <span
              v-if="!cuenta.missingNota"
              :class="['estado-cuenta', cuenta.estadoPagado ? 'pagado' : 'no-pagado']"
            >
              {{ cuenta.estadoPagado ? 'Pagado' : 'No Pagado' }}
            </span>
            <span v-else class="estado-cuenta estado-sin-nota">Sin nota</span>
          </div>
          <div class="cuenta-actions">
            <button v-if="!cuenta.missingNota" @click="editarCuenta(cuenta.id)" class="edit-btn">Editar</button>  
            <button v-if="!cuenta.missingNota" @click="borrarCuenta(cuenta.id)" class="delete-btn">Borrar</button>
            <button
              v-else
              class="nota-pendiente-hint"
              type="button"
              :disabled="creatingFecha === normalizarFechaValor(cuenta.fecha)"
              @click="crearNota(cuenta.fecha)"
            >
              {{ creatingFecha === normalizarFechaValor(cuenta.fecha) ? 'Creando...' : 'Crear nota' }}
            </button>
          </div>
        </li>
      </ul>
      <div v-if="totalPaginas > 1" class="pagination-controls">
        <button @click="paginaActual = 1" :disabled="paginaActual === 1" class="pagination-btn">&laquo;</button>
        <button @click="paginaActual--" :disabled="paginaActual === 1" class="pagination-btn">&lsaquo; Anterior</button>
        <span class="pagination-info">{{ paginaActual }} / {{ totalPaginas }}</span>
        <button @click="paginaActual++" :disabled="paginaActual === totalPaginas" class="pagination-btn">Siguiente &rsaquo;</button>
        <button @click="paginaActual = totalPaginas" :disabled="paginaActual === totalPaginas" class="pagination-btn">&raquo;</button>
      </div>
    </div>

    <template v-if="showSaveMessage && lastSaveMessage">
      <div class="save-message">
        {{ lastSaveMessage }}
      </div>
    </template>

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

    <!-- Modal Reporte Semanal -->
    <div v-if="showReporteSemanalModal" class="modal-overlay" @click.self="showReporteSemanalModal = false">
      <div class="modal-content">
        <h2>Reporte Semanal</h2>
        
        <div style="text-align: center; margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px; color: #666;">Seleccionar Semana (por fecha):</label>
          <DatePicker 
            v-model="selectedReportDate" 
            value-type="date" 
            format="DD/MM/YYYY" 
            placeholder="Selecciona una fecha"
            @change="calcularReportePorFecha"
            :clearable="false"
          />
        </div>

        <p style="text-align: center; color: #b8860b; font-weight: bold; margin-bottom: 20px;">
          {{ reporteSemanalData.startDate }} - {{ reporteSemanalData.endDate }}
        </p>
        
        <div class="reporte-details" style="margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #eee;">
            <span style="font-weight: bold;">Enviado en Venta:</span>
            <span style="color: #2c3e50;">${{ formatNumber(reporteSemanalData.totalVenta) }}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 1px solid #eee;">
            <span style="font-weight: bold;">Total Abonado:</span>
            <span style="color: #4CAF50;">${{ formatNumber(reporteSemanalData.totalAbonado) }}</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 1.1em;">
            <span style="font-weight: bold;">Faltante (Deuda):</span>
            <span style="color: #f44336; font-weight: bold;">${{ formatNumber(reporteSemanalData.faltante) }}</span>
          </div>
        </div>

        <div class="modal-buttons" style="justify-content: center; flex-direction: column; gap: 10px;">
          <button @click="showReporteSemanalModal = false" class="btn-cerrar">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, onSnapshot, updateDoc, getDocs, limit, writeBatch } from 'firebase/firestore';
import EmbarqueCuentasService from '@/utils/services/EmbarqueCuentasService';
import BackButton from '@/components/BackButton.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import StashModalV2 from '@/components/StashModalV2.vue';
import ObservacionesModal from '@/components/ObservacionesModal.vue';

import { formatNumber, formatearFecha as formatDate } from '@/utils/formatters';

import ReporteCuentasOtilioButton from '@/components/Cuentas/ReporteCuentasOtilioButton.vue';
import moment from 'moment';
import DatePicker from 'vue2-datepicker';
import 'vue2-datepicker/index.css';


export default {
  name: 'OtilioCuentasMenu',
  components: {
    BackButton,
    PreciosHistorialModal,
    StashModalV2,
    ObservacionesModal,
    ReporteCuentasOtilioButton,
    DatePicker
  },
  data() {
    return {
      cuentas: [],
      isLoading: true,
      unsubscribe: null,
      error: null,
      filtroEstado: 'todas',
      showAbonosModal: false,
      abonosHistorial: [],
      fechaInicio: '',
      fechaFin: '',
      totalAbonosPeriodo: null,
      showObservacionModal: false,
      observacionActual: '',
      showObservacionesModal: false,
      lastSaveMessage: '',
      showSaveMessage: false,
      saveMessageTimer: null,
      creatingFecha: null,
      updateDebounceTimer: null,
      lastUpdateTimestamp: 0,
      isApplyingUpdates: false,
      queuedUpdates: null,
      embarquesOtilioFechas: [],
      embarquesCacheTimestamp: 0,
      embarquesCacheTTL: 30000,
      embarquesFetchPromise: null,
      paginaActual: 1,
      showReporteSemanalModal: false,
      selectedReportDate: null,
      reporteSemanalData: {
        totalVenta: 0,
        totalAbonado: 0,
        faltante: 0,
        startDate: '',
        endDate: ''
      }
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
    totalPaginas() {
      return Math.max(1, Math.ceil(this.cuentasFiltradas.length / 10));
    },
    cuentasPaginadas() {
      const inicio = (this.paginaActual - 1) * 10;
      return this.cuentasFiltradas.slice(inicio, inicio + 10);
    }
  },
  methods: {

    formatNumber,
    formatDate,

    normalizarFechaValor(valor) {
      if (!valor) return null;
      try {
        const formatearUTC = (fechaObj) => {
          if (!(fechaObj instanceof Date) || Number.isNaN(fechaObj.getTime())) return null;
          const año = fechaObj.getUTCFullYear();
          const mes = String(fechaObj.getUTCMonth() + 1).padStart(2, '0');
          const dia = String(fechaObj.getUTCDate()).padStart(2, '0');
          return `${año}-${mes}-${dia}`;
        };
        if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
        if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
          return valor.slice(0, 10);
        }
        if (valor?.seconds) {
          return formatearUTC(new Date(valor.seconds * 1000));
        }
        if (valor instanceof Date) {
          return formatearUTC(valor);
        }
        return formatearUTC(new Date(valor));
      } catch (_) {
        return null;
      }
    },
    tieneContenidoProducto(producto = {}) {
      return Boolean(
        producto &&
        (producto.medida || (
          Array.isArray(producto.kilos) &&
          producto.kilos.some(k => Number(k) > 0)
        ))
      );
    },
    esClienteOtilio(cliente = {}) {
      const clienteId = (cliente.id ?? cliente.clienteId ?? '').toString();
      const nombreCliente = (cliente.nombre || '').toLowerCase();
      return clienteId === '3' || nombreCliente.includes('otilio');
    },
    clienteOtilioConDatos(cliente = {}) {
      if (!this.esClienteOtilio(cliente)) return false;
      const tieneProductos = Array.isArray(cliente.productos) &&
        cliente.productos.some(producto => this.tieneContenidoProducto(producto));
      const tieneCrudos = Array.isArray(cliente.crudos) && cliente.crudos.length > 0;
      return tieneProductos || tieneCrudos;
    },
    productoRaizOtilioConDatos(producto = {}) {
      const clienteId = (producto.clienteId ?? producto.cliente ?? '').toString();
      if (clienteId !== '3') return false;
      return this.tieneContenidoProducto(producto);
    },
    async obtenerFechasEmbarquesOtilio(force = false) {
      const ahora = Date.now();
      const cacheVigente = !force &&
        this.embarquesCacheTimestamp > 0 &&
        (ahora - this.embarquesCacheTimestamp) < this.embarquesCacheTTL;

      if (cacheVigente) {
        return this.embarquesOtilioFechas;
      }

      if (this.embarquesFetchPromise) {
        return this.embarquesFetchPromise;
      }

      this.embarquesFetchPromise = (async () => {
        const embarquesRef = collection(db, 'embarques');
        const embarquesSnapshot = await getDocs(
          query(embarquesRef, orderBy('fecha', 'desc'), limit(200))
        );

        const fechas = [];
        embarquesSnapshot.forEach(docSnap => {
          const data = docSnap.data() || {};
          const fechaEmbarque = this.normalizarFechaValor(data.fecha);
          if (!fechaEmbarque) return;

          const clientes = data.clientes || [];
          const productosRaiz = data.productos || [];
          const tieneOtilio =
            clientes.some(cliente => this.clienteOtilioConDatos(cliente)) ||
            productosRaiz.some(producto => this.productoRaizOtilioConDatos(producto));

          if (tieneOtilio) {
            fechas.push(fechaEmbarque);
          }
        });

        this.embarquesOtilioFechas = Array.from(new Set(fechas));
        this.embarquesCacheTimestamp = Date.now();
        return this.embarquesOtilioFechas;
      })();

      try {
        return await this.embarquesFetchPromise;
      } finally {
        this.embarquesFetchPromise = null;
      }
    },
    async aplicarActualizacionesCuentas(actualizaciones = []) {
      if (!actualizaciones.length) return;

      if (this.isApplyingUpdates) {
        this.queuedUpdates = actualizaciones;
        return;
      }

      this.isApplyingUpdates = true;

      try {
        const TAMANO_LOTE = 400;
        for (let i = 0; i < actualizaciones.length; i += TAMANO_LOTE) {
          const bloque = actualizaciones.slice(i, i + TAMANO_LOTE);
          const batch = writeBatch(db);

          bloque.forEach(({ id, updates }) => {
            batch.update(doc(db, 'cuentasOtilio', id), updates);
          });

          await batch.commit();
        }

        this.lastUpdateTimestamp = Date.now();
      } catch (error) {
        console.error('[OTILIO-CUENTAS] Error al actualizar notas:', error);
      } finally {
        this.isApplyingUpdates = false;

        if (this.queuedUpdates && this.queuedUpdates.length > 0) {
          const actualizacionesPendientes = this.queuedUpdates;
          this.queuedUpdates = null;
          this.aplicarActualizacionesCuentas(actualizacionesPendientes);
        }
      }
    },

    async loadCuentas() {
      try {
        this.isLoading = true;
        const cuentasRef = collection(db, 'cuentasOtilio');
        const q = query(cuentasRef, orderBy('fecha', 'asc'));

        this.obtenerFechasEmbarquesOtilio().catch(() => {});

        this.unsubscribe = onSnapshot(q, async (querySnapshot) => {
          const cuentasActualizadas = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            const fechaNormalizada = this.normalizarFechaValor(data.fecha);
            const totalCobros = (data.cobros || []).reduce((sum, cobro) =>
              sum + (parseFloat(cobro.monto) || 0), 0);
            const totalCorrecciones = (data.correcciones || []).reduce((sum, c) =>
              sum + (parseFloat(c.monto) || 0), 0);
            const totalAbonos = (data.abonos || []).reduce((sum, abono) =>
              sum + (parseFloat(abono.monto) || 0), 0);
            const totalDiaActual = (data.totalGeneralVenta || 0) - totalCobros - totalCorrecciones - totalAbonos;
            const saldoPersistido = typeof data.nuevoSaldoAcumulado === 'number'
              ? data.nuevoSaldoAcumulado
              : null;

            return {
              id: doc.id,
              fecha: fechaNormalizada || data.fecha,
              saldoHoy: data.totalGeneralVenta || 0,
              totalCobros,
              totalCorrecciones,
              totalAbonos,
              totalNota: data.nuevoSaldoAcumulado || 0,
              estadoPagado: saldoPersistido !== null ? saldoPersistido <= 0 : totalDiaActual <= 0,
              nuevoSaldoAcumulado: data.nuevoSaldoAcumulado || 0,
              saldoAcumuladoAnterior: data.saldoAcumuladoAnterior || 0,
              abonos: data.abonos || [],
              tieneObservacion: data.tieneObservacion || false,
              observacion: data.observacion || ''
            };
          });

          const cuentasOrdenadas = cuentasActualizadas.sort((a, b) => 
            new Date(a.fecha) - new Date(b.fecha)
          );

          let saldoAcumulado = 0;
          const actualizaciones = [];
          const TOLERANCIA = 0.01;

          for (let i = 0; i < cuentasOrdenadas.length; i++) {
            const cuenta = cuentasOrdenadas[i];
            const totalDia = cuenta.saldoHoy - cuenta.totalCobros - (cuenta.totalCorrecciones || 0) - cuenta.totalAbonos;
            const saldoAnterior = i === 0 ? 0 : saldoAcumulado;
            saldoAcumulado += totalDia;
            const estadoPagado = saldoAcumulado <= 0;
            const saldoNormalizado = estadoPagado ? 0 : saldoAcumulado;

            const cambioSaldoAnterior = Math.abs((cuenta.saldoAcumuladoAnterior || 0) - saldoAnterior) > TOLERANCIA;
            const cambioSaldoNuevo = Math.abs((cuenta.nuevoSaldoAcumulado || 0) - saldoNormalizado) > TOLERANCIA;
            const cambioEstado = cuenta.estadoPagado !== estadoPagado;
            
            if (cambioSaldoAnterior || cambioSaldoNuevo || cambioEstado) {
              actualizaciones.push({
                id: cuenta.id,
                updates: {
                  saldoAcumuladoAnterior: saldoAnterior,
                  nuevoSaldoAcumulado: saldoNormalizado,
                  estadoPagado: estadoPagado
                }
              });
            }

            cuenta.totalNota = saldoNormalizado;
            cuenta.saldoAcumuladoAnterior = saldoAnterior;
            cuenta.estadoPagado = estadoPagado;
            cuenta.nuevoSaldoAcumulado = saldoNormalizado;

            if (saldoAcumulado <= 0) {
              saldoAcumulado = 0;
            }
          }

          const fechasConNota = new Set(cuentasOrdenadas.map(c => this.normalizarFechaValor(c.fecha)));
          const fechasEmbarquesOtilio = await this.obtenerFechasEmbarquesOtilio().catch(() => []);
          const faltantes = fechasEmbarquesOtilio
            .filter(fechaEmbarque => fechaEmbarque && !fechasConNota.has(fechaEmbarque))
            .map(fechaEmbarque => ({
              id: `missing-${fechaEmbarque}`,
              fecha: fechaEmbarque,
              saldoHoy: 0,
              totalCobros: 0,
              totalAbonos: 0,
              totalNota: 0,
              estadoPagado: false,
              nuevoSaldoAcumulado: 0,
              saldoAcumuladoAnterior: 0,
              abonos: [],
              tieneObservacion: false,
              observacion: '',
              missingNota: true
            }));

          if (actualizaciones.length > 0) {
            if (this.updateDebounceTimer) {
              clearTimeout(this.updateDebounceTimer);
            }

            const ahora = Date.now();
            const tiempoTranscurrido = ahora - this.lastUpdateTimestamp;
            const TIEMPO_MINIMO_ENTRE_ACTUALIZACIONES = 1200;
            const espera = Math.max(300, TIEMPO_MINIMO_ENTRE_ACTUALIZACIONES - tiempoTranscurrido);
            const actualizacionesClonadas = actualizaciones.map(({ id, updates }) => ({
              id,
              updates: { ...updates }
            }));

            this.updateDebounceTimer = setTimeout(() => {
              this.aplicarActualizacionesCuentas(actualizacionesClonadas);
            }, espera);
          }

          const consolidadas = [...cuentasOrdenadas, ...faltantes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          this.cuentas = consolidadas;
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
    generarReporteSemanal() {
      this.selectedReportDate = new Date();
      this.calcularReportePorFecha(this.selectedReportDate);
      this.showReporteSemanalModal = true;
    },
    async calcularReportePorFecha(date) {
      if (!date) return;
      
      const fechaObj = moment(date);
      const startOfWeek = fechaObj.clone().startOf('isoWeek');
      const endOfWeek = fechaObj.clone().endOf('isoWeek');

      const ventasSemana = this.cuentas.filter(c => {
        const fecha = moment(c.fecha);
        return fecha.isBetween(startOfWeek, endOfWeek, 'day', '[]');
      });

      const totalVenta = ventasSemana.reduce((sum, c) => sum + (c.saldoHoy || 0), 0);
      
      let totalAbonado = 0;
      
      try {
        const q = query(
          collection(db, 'cuentasOtilio'),
          orderBy('fecha', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach(doc => {
          const cuentaData = doc.data();
          
          if (cuentaData.abonos && cuentaData.abonos.length > 0) {
            cuentaData.abonos.forEach((abono) => {
              const fechaAbonoStr = abono.fechaOriginalStash || abono.fecha || abono.fechaAplicacion;
              
              if (fechaAbonoStr) {
                const fechaAbono = moment(fechaAbonoStr);
                if (fechaAbono.isValid() && fechaAbono.isBetween(startOfWeek, endOfWeek, 'day', '[]')) {
                  totalAbonado += parseFloat(abono.monto) || 0;
                }
              }
            });
          }
        });

        const stashRef = collection(db, 'stash_otilio');
        const stashSnapshot = await getDocs(stashRef);
        
        stashSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.fecha) {
            const fechaAbono = moment(data.fecha);
            if (fechaAbono.isBetween(startOfWeek, endOfWeek, 'day', '[]')) {
              totalAbonado += parseFloat(data.monto) || 0;
            }
          }
        });

      } catch (error) {
        console.error("Error calculando abonos:", error);
      }

      const faltante = totalVenta - totalAbonado;

      this.reporteSemanalData = {
        totalVenta,
        totalAbonado,
        faltante,
        startDate: startOfWeek.format('DD/MM/YYYY'),
        endDate: endOfWeek.format('DD/MM/YYYY')
      };
    },

    editarCuenta(id) {
      this.$router.push(`/cuentas-otilio/${id}?edit=true`);
    },
    async crearNota(fecha) {
      const fechaNormalizada = this.normalizarFechaValor(fecha);
      if (!fechaNormalizada) {
        alert('La fecha de la nota no es válida. Actualiza la lista y vuelve a intentar.');
        return;
      }
      if (this.creatingFecha === fechaNormalizada) return;

      this.creatingFecha = fechaNormalizada;
      try {
        const embarquesRef = collection(db, 'embarques');
        const embarquesSnapshot = await getDocs(query(embarquesRef, orderBy('fecha', 'desc'), limit(300)));
        const embarqueDoc = embarquesSnapshot.docs.find(docSnap => {
          const data = docSnap.data() || {};
          return this.normalizarFechaValor(data.fecha) === fechaNormalizada;
        });

        if (!embarqueDoc) {
          alert('No se encontró un embarque para esta fecha. Crea la nota manualmente.');
          return;
        }

        const data = embarqueDoc.data() || {};
        const clientes = data.clientes || [];
        const clienteOtilio = clientes.find(cliente => this.clienteOtilioConDatos(cliente));

        const productosOtilio = clienteOtilio?.productos || [];
        const crudosOtilio = clienteOtilio?.crudos || [];

        const clienteCrudosTotales = data.clienteCrudos || data.clientesCrudos || {};
        const embarqueCliente = {
          ...data,
          fecha: fechaNormalizada,
          productos: productosOtilio,
          clienteCrudos: { '3': crudosOtilio },
          productosTotales: data.productos || [],
          clienteCrudosTotales: Object.keys(clienteCrudosTotales).length ? clienteCrudosTotales : { '3': crudosOtilio },
          costosPorMedida: data.costosPorMedida || {},
          aplicarCostoExtra: data.aplicarCostoExtra || {},
          costoExtra: data.costoExtra
        };

        await EmbarqueCuentasService.crearCuentaOtilio(embarqueCliente, this.$router);

        if (this.lastSaveMessage !== 'Cuenta creada desde embarque' || !this.showSaveMessage) {
          this.lastSaveMessage = 'Cuenta creada desde embarque';
          this.showSaveMessage = true;
          if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
          this.saveMessageTimer = setTimeout(() => {
            this.showSaveMessage = false;
          }, 3000);
        }
      } catch (error) {
        console.error('Error al crear la nota desde embarque:', error);
        alert(`No se pudo crear la nota desde el embarque: ${error.message || error}`);
      } finally {
        this.creatingFecha = null;
      }
    },
    async borrarCuenta(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de cuenta?')) {
        try {
          await deleteDoc(doc(db, 'cuentasOtilio', id));
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
          await updateDoc(doc(db, 'cuentasOtilio', id), {
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
    },
    calcularTotalAbonos() {
      if (!this.fechaInicio || !this.fechaFin) {
        this.totalAbonosPeriodo = null;
        return;
      }

      const inicio = new Date(this.fechaInicio);
      const fin = new Date(this.fechaFin);
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

        this.abonosHistorial = todosLosAbonos.sort((a, b) => 
          new Date(b.fecha) - new Date(a.fecha)
        );

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
      }
    }
  },
  watch: {
    showAbonosModal(newValue) {
      if (newValue) {
        this.cargarHistorialAbonos();
      }
    },
    filtroEstado() {
      this.paginaActual = 1;
    }
  },
  mounted() {
    this.loadCuentas();
  },
  beforeUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.updateDebounceTimer) {
      clearTimeout(this.updateDebounceTimer);
    }
    if (this.saveMessageTimer) {
      clearTimeout(this.saveMessageTimer);
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
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #fff9e6;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

h1, h2 {
  color: #b8860b;
  text-align: center;
}

.actions-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 15px;
  margin-bottom: 20px;
}

.actions-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(180deg, rgba(255,249,230,1) 70%, rgba(255,249,230,0));
  padding-top: 8px;
  padding-bottom: 8px;
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
  font-weight: 600;
  transition: all 0.3s ease;
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

.new-cuenta-btn {
  background-color: #dc3545;
  color: white;
}

.new-cuenta-btn:hover {
  background-color: #c82333;
}

.independiente-btn {
  background-color: #9c27b0;
  color: white;
}

.independiente-btn:hover {
  background-color: #7b1fa2;
}

.abonos-btn {
  background-color: #28a745;
  color: white;
}

.abonos-btn:hover {
  background-color: #218838;
}

.observaciones-btn {
  background-color: #ff0000;
  color: white;
}

.observaciones-btn:hover {
  background-color: #cc0000;
}

.reporte-semanal-btn {
  background-color: #17a2b8;
  color: white;
}

.reporte-semanal-btn:hover {
  background-color: #138496;
}

.card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 16px;
}

.reporte-cuentas-card {
  margin-bottom: 20px;
}

.reporte-cuentas-card h2 {
  margin: 0 0 8px;
  font-size: 1.2em;
  color: #b8860b;
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
  border-left: 4px solid #FFD700;
}

.cuenta-item.cuenta-sin-nota {
  background: #f2f2f2;
  border-left-color: #bdbdbd;
}

.cuenta-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.cuenta-content {
  margin-bottom: 10px;
}

.cuenta-date {
  color: #b8860b;
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

.estado-sin-nota {
  background-color: #bdbdbd;
  color: white;
}

.texto-sin-nota {
  color: #666;
  font-weight: 600;
}

.nota-pendiente-hint {
  color: #b8860b;
  font-weight: 700;
  align-self: center;
  background: #fff9e6;
  border: 1px dashed #FFD700;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 140px;
  text-align: center;
}

.nota-pendiente-hint[disabled] {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.nota-pendiente-hint:hover,
.nota-pendiente-hint:focus {
  background: #fff0a0;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  transform: translateY(-1px);
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
  color: #b8860b;
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
  color: #b8860b;
}

.abono-total {
  margin: 8px 0 0;
  padding-top: 6px;
  border-top: 1px dashed #FFD700;
  font-weight: 700;
  color: #8b6914;
  font-size: 0.95em;
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

.error-message {
  color: #f44336;
  text-align: center;
  padding: 10px;
  margin: 10px 0;
  background-color: #ffebee;
  border-radius: 4px;
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
  max-height: 80vh;
  overflow-y: auto;
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

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 15px;
}

.btn-cerrar {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.fecha-filtros {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #fff9e6;
  border-radius: 8px;
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
}

.total-label {
  font-weight: bold;
}

.total-monto {
  font-size: 1.2em;
  font-weight: bold;
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

.observacion-text {
  margin: 15px 0;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 4px;
  white-space: pre-wrap;
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

  .nota-pendiente-hint {
    width: 100%;
  }

  .fecha-filtros {
    flex-direction: column;
    gap: 10px;
  }

  .total-abonos {
    flex-direction: column;
    gap: 5px;
    text-align: center;
  }

  .abono-detail {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .abono-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .observacion-container {
    padding: 8px;
    margin: 8px 0;
  }

  .pagination-controls {
    gap: 6px;
  }
  .pagination-btn {
    padding: 6px 10px;
    font-size: 13px;
  }
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.pagination-btn {
  background-color: #b8860b;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.2s ease;
}

.pagination-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.pagination-btn:not(:disabled):hover {
  background-color: #8b6914;
}

.pagination-info {
  font-weight: 700;
  font-size: 15px;
  color: #b8860b;
  min-width: 60px;
  text-align: center;
}
</style>
