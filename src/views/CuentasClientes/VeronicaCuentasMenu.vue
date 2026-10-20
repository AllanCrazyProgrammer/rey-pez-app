<template>
  <div class="veronica-cuentas-menu-container">
    <router-link to="/cuentas-mexico" class="action-button menu-regresar">
      <span aria-hidden="true">←</span> Cuentas México
    </router-link>
    <header class="menu-encabezado">
      <div>
        <p class="menu-eyebrow">CUENTAS MÉXICO / LORENA</p>
        <h1>Cuentas de Lorena</h1>
        <p class="menu-descripcion">Verónica · Notas, abonos y seguimiento de ventas.</p>
      </div>
      <router-link to="/cuentas-veronica/nueva" class="action-button new-cuenta-btn">
        <span aria-hidden="true">+</span> Nueva cuenta
      </router-link>
    </header>

    <div class="actions-container" aria-label="Herramientas de Lorena">
      <router-link to="/ventas-ganancias-veronica" class="action-button ventas-ganancias-btn">
        Ventas y ganancias
      </router-link>
      <PreciosHistorialModal />
      <StashModalV2 cliente="veronica" />
    </div>

    <div class="herramientas-grid">
      <section class="reporte-cuentas-card card">
        <p class="seccion-eyebrow">REPORTES</p>
        <h2>Cuentas en PDF</h2>
        <p class="seccion-descripcion">Selecciona un periodo para generar tu reporte.</p>
        <ReporteCuentasVeronicaButton />
      </section>
      <section class="resumen-ventas-card card">
        <p class="seccion-eyebrow">ANÁLISIS DE VENTAS</p>
        <h2>El detalle de tu operación</h2>
        <p class="seccion-descripcion">Consulta ventas por producto o revisa los abonos y el faltante de cada semana.</p>
        <div class="analisis-acciones">
          <ResumenVentasVeronicaModal />
          <button type="button" @click="generarReporteSemanal" class="action-button reporte-semanal-btn">
            Reporte semanal
          </button>
        </div>
      </section>
    </div>

    <section class="cuentas-list card" aria-labelledby="registros-lorena">
      <div class="registros-encabezado">
        <div>
          <h2 id="registros-lorena">Registros de cuentas</h2>
          <p class="seccion-descripcion" aria-live="polite">{{ isLoading ? 'Consultando registros…' : cuentasFiltradas.length + ' registros encontrados' }}</p>
        </div>
      </div>
    <div class="filter-container">
      <div class="filter-group">
        <label for="filter-select">Filtrar por estado:</label>
        <select id="filter-select" v-model="filtroEstado">
          <option value="todas">Todas</option>
          <option value="pagadas">Pagadas</option>
          <option value="no-pagadas">No Pagadas</option>
          <option value="sin-nota">Sin nota</option>
        </select>
      </div>
      <div class="filter-group">
        <label for="filter-medida">Buscar por medida:</label>
        <input
          id="filter-medida"
          type="text"
          v-model="filtroMedida"
          placeholder="ej: jumbo"
          class="filter-medida-input"
        />
        <button
          v-if="filtroMedida"
          type="button"
          class="filter-medida-clear"
          @click="filtroMedida = ''"
          title="Limpiar filtro de medida"
          aria-label="Limpiar filtro de medida"
        >×</button>
      </div>
    </div>

      <div v-if="isLoading" class="loading" role="status">Cargando registros...</div>
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
            <div class="cuenta-cabecera">
              <span class="cuenta-date">{{ formatDate(cuenta.fecha) }}</span>
              <span :class="['estado-cuenta', cuenta.missingNota ? 'estado-sin-nota' : cuenta.estadoPagado ? 'pagado' : 'no-pagado']">
                {{ cuenta.missingNota ? 'Sin nota' : cuenta.estadoPagado ? 'Pagado' : 'No pagado' }}
              </span>
            </div>
            <p class="cuenta-summary">
              <span v-if="!cuenta.missingNota">Venta del día <strong>${{ formatNumber(cuenta.saldoHoy) }}</strong></span>
              <span v-else class="texto-sin-nota">Sin nota registrada</span>
              <span v-if="!cuenta.missingNota">Saldo acumulado <strong>${{ formatNumber(cuenta.totalNota) }}</strong></span>
            </p>
            <div v-if="!cuenta.missingNota" class="lock-status">
              <span :class="['lock-badge', cuenta.notaBloqueada ? 'lock-on' : 'lock-off']">
                {{ cuenta.notaBloqueada ? 'Bloqueada' : 'Desbloqueada' }}
              </span>
            </div>
            <span v-if="!cuenta.missingNota && cuenta.tienePrecioVentaVacio" class="precio-venta-vacio">
              Atención: precio de venta vacío
            </span>
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
              <p v-if="cuenta.abonos.length > 1" class="abono-total">
                Total abonos: ${{ formatNumber(cuenta.totalAbonos) }}
              </p>
            </div>
          </div>
          <div v-if="!cuenta.missingNota && cuenta.saldoNegativoDetectado" class="saldo-negativo-alerta">
            <span class="alerta-icono">⚠️</span>
            <span class="alerta-texto">Saldo negativo detectado: -${{ formatNumber(cuenta.montoNegativoDetectado) }}</span>
            <button
              type="button"
              class="btn-ajustar-auto"
              :disabled="aplicandoAjusteAutomaticoId === cuenta.id"
              @click="ajustarAutomaticamente(cuenta)"
            >
              {{ aplicandoAjusteAutomaticoId === cuenta.id ? 'Ajustando...' : 'Ajustar automáticamente' }}
            </button>
          </div>
          <div v-if="!cuenta.missingNota && cuenta.ajusteManual" class="ajuste-info">
            <span class="ajuste-label">Ajuste{{ cuenta.ajusteManualMotivo && cuenta.ajusteManualMotivo.startsWith('Ajuste automático') ? ' automático' : ' manual' }}:</span>
            <span class="ajuste-monto">{{ cuenta.ajusteManual > 0 ? '+' : '' }}${{ formatNumber(cuenta.ajusteManual) }}</span>
            <span v-if="cuenta.ajusteManualMotivo" class="ajuste-motivo">{{ cuenta.ajusteManualMotivo }}</span>
          </div>
          <div class="cuenta-actions">
            <button v-if="!cuenta.missingNota" @click="editarCuenta(cuenta.id)" class="edit-btn">Editar</button>
            <button v-if="!cuenta.missingNota" @click="abrirAjusteModal(cuenta)" class="adjust-btn">Ajuste manual</button>
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
    </section>

    <template v-if="showSaveMessage && lastSaveMessage">
      <div class="save-message" role="status">
        {{ lastSaveMessage }}
      </div>
    </template>

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

        <p style="text-align: center; color: #ff8c00; font-weight: bold; margin-bottom: 20px;">
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
          <ReporteSemanalPDFButton
            :reporte-data="reporteSemanalData"
            :detalle-ventas="detalleVentasSemanal"
            :detalle-abonos="detalleAbonosSemanal"
          />
          <button @click="showReporteSemanalModal = false" class="btn-cerrar">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Modal Ajustar Saldo -->
    <div v-if="cuentaAjuste" class="modal-overlay" @click.self="cerrarAjusteModal">
      <div class="modal-content">
        <h2>Ajustar Saldo</h2>
        <p class="ajuste-modal-fecha">{{ formatDate(cuentaAjuste.fecha) }}</p>
        <p class="ajuste-modal-hint">
          Usa esto cuando una corrección deja un "restante" negativo o incorrecto en
          esta nota (por ejemplo, un abono ya aplicado quedó más alto que el saldo
          corregido). El monto se suma al total del día para corregir el resultado.
        </p>
        <div class="ajuste-form-row">
          <label for="ajuste-monto">Monto del ajuste</label>
          <input
            id="ajuste-monto"
            type="number"
            step="0.01"
            v-model.number="ajusteFormMonto"
            placeholder="ej: 4250 o -4250"
            class="ajuste-input"
          />
        </div>
        <div class="ajuste-form-row">
          <label for="ajuste-motivo">Motivo</label>
          <input
            id="ajuste-motivo"
            type="text"
            v-model="ajusteFormMotivo"
            placeholder="ej: Corrección de precio dejó saldo negativo"
            class="ajuste-input"
          />
        </div>
        <div class="modal-buttons" style="justify-content: center; gap: 10px;">
          <button
            v-if="cuentaAjuste.ajusteManual"
            @click="quitarAjuste"
            class="btn-secondary"
            type="button"
            :disabled="guardandoAjuste"
          >
            Quitar ajuste
          </button>
          <button
            @click="guardarAjuste"
            class="btn-cerrar"
            type="button"
            :disabled="guardandoAjuste || !ajusteFormMonto"
          >
            {{ guardandoAjuste ? 'Guardando...' : 'Guardar ajuste' }}
          </button>
          <button @click="cerrarAjusteModal" class="btn-secondary" type="button" :disabled="guardandoAjuste">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, orderBy, doc, onSnapshot, updateDoc, getDocs, limit, writeBatch } from 'firebase/firestore';
import EmbarqueCuentasService from '@/utils/services/EmbarqueCuentasService';
import PapeleraService from '@/services/PapeleraService';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import StashModalV2 from '@/components/StashModalV2.vue';
import ReporteCuentasVeronicaButton from '@/components/Cuentas/ReporteCuentasVeronicaButton.vue';
import ResumenVentasVeronicaModal from '@/components/Cuentas/ResumenVentasVeronicaModal.vue';
import ReporteSemanalPDFButton from '@/components/Cuentas/ReporteSemanalPDFButton.vue';
import moment from 'moment';
import DatePicker from 'vue2-datepicker';
import 'vue2-datepicker/index.css';
import { formatNumber, formatearFecha as formatDate } from '@/utils/formatters';
import { normalizarFechaValor } from '@/utils/dateUtils';

export default {
  name: 'VeronicaCuentasMenu',
  components: {
    PreciosHistorialModal,
    StashModalV2,
    ReporteCuentasVeronicaButton,
    ResumenVentasVeronicaModal,
    DatePicker,
    ReporteSemanalPDFButton
  },
  data() {
    return {
      cuentas: [],
      isLoading: true,
      filtroEstado: 'todas',
      unsubscribe: null,
      lastSaveMessage: '',
      showSaveMessage: false,
      saveMessageTimer: null,
      showReporteSemanalModal: false,
      selectedReportDate: null,
      reporteSemanalData: {
        totalVenta: 0,
        totalAbonado: 0,
        faltante: 0,
        startDate: '',
        endDate: ''
      },
      detalleVentasSemanal: [],
      detalleAbonosSemanal: [],
      creatingFecha: null,
      updateDebounceTimer: null,
      lastUpdateTimestamp: 0,
      isApplyingUpdates: false,
      queuedUpdates: null,
      embarquesVeronicaFechas: [],
      embarquesCacheTimestamp: 0,
      embarquesCacheTTL: 30000,
      embarquesFetchPromise: null,
      paginaActual: 1,
      filtroMedida: '',
      cuentaAjuste: null,
      ajusteFormMonto: null,
      ajusteFormMotivo: '',
      guardandoAjuste: false,
      aplicandoAjusteAutomaticoId: null
    };
  },
  computed: {
    cuentasFiltradas() {
      const filtroMedidaNormalizado = this.normalizarTextoBusqueda(this.filtroMedida);
      const filtroMedidaActivo = filtroMedidaNormalizado.length > 0;

      let resultado;
      switch (this.filtroEstado) {
        case 'pagadas':
          resultado = this.cuentas.filter(cuenta => cuenta.estadoPagado);
          break;
        case 'sin-nota':
          resultado = this.cuentas.filter(cuenta => cuenta.missingNota);
          break;
        case 'no-pagadas':
          resultado = this.cuentas.filter(cuenta => !cuenta.estadoPagado);
          break;
        default:
          resultado = this.cuentas;
      }

      if (filtroMedidaActivo) {
        resultado = resultado.filter(cuenta => {
          if (cuenta.missingNota) return false;
          return (cuenta.medidas || []).some(medida => medida.includes(filtroMedidaNormalizado));
        });
      }

      return resultado;
    },
    totalPaginas() {
      return Math.max(1, Math.ceil(this.cuentasFiltradas.length / 10));
    },
    cuentasPaginadas() {
      const inicio = (this.paginaActual - 1) * 10;
      return this.cuentasFiltradas.slice(inicio, inicio + 10);
    }
  },
  watch: {
    totalPaginas(total) {
      this.paginaActual = Math.min(this.paginaActual, total);
    },
    filtroEstado() {
      this.paginaActual = 1;
    },
    filtroMedida() {
      this.paginaActual = 1;
    }
  },
  methods: {
    formatNumber,
    formatDate,
    normalizarTextoBusqueda(texto) {
      if (texto === null || texto === undefined) return '';
      return texto
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim();
    },
    extraerMedidasDeCuenta(data = {}) {
      const medidas = new Set();
      const recolectar = lista => {
        if (!Array.isArray(lista)) return;
        lista.forEach(item => {
          const medida = this.normalizarTextoBusqueda(item?.medida);
          if (medida) medidas.add(medida);
        });
      };
      recolectar(data.items);
      recolectar(data.itemsVenta);
      return Array.from(medidas);
    },
    tienePrecioVentaVacio(itemsVenta = []) {
      return itemsVenta.some(item => {
        const valor = item?.precioVenta;
        if (valor === null || valor === undefined || valor === '') return true;
        return Number.isNaN(Number(valor));
      });
    },
    normalizarFechaValor,
    tieneContenidoProducto(producto = {}) {
      return Boolean(
        producto &&
        (producto.medida || (
          Array.isArray(producto.kilos) &&
          producto.kilos.some(k => Number(k) > 0)
        ))
      );
    },
    esClienteVeronica(cliente = {}) {
      const clienteId = (cliente.id ?? cliente.clienteId ?? '').toString();
      const nombreCliente = (cliente.nombre || '').toLowerCase();
      return clienteId === '5' || nombreCliente.includes('veronica') || nombreCliente.includes('lorena');
    },
    clienteVeronicaConDatos(cliente = {}) {
      if (!this.esClienteVeronica(cliente)) return false;
      const tieneProductos = Array.isArray(cliente.productos) &&
        cliente.productos.some(producto => this.tieneContenidoProducto(producto));
      const tieneCrudos = Array.isArray(cliente.crudos) && cliente.crudos.length > 0;
      return tieneProductos || tieneCrudos;
    },
    productoRaizVeronicaConDatos(producto = {}) {
      const clienteId = (producto.clienteId ?? producto.cliente ?? '').toString();
      if (clienteId !== '5') return false;
      return this.tieneContenidoProducto(producto);
    },
    async obtenerFechasEmbarquesVeronica(force = false) {
      const ahora = Date.now();
      const cacheVigente = !force &&
        this.embarquesCacheTimestamp > 0 &&
        (ahora - this.embarquesCacheTimestamp) < this.embarquesCacheTTL;

      if (cacheVigente) {
        return this.embarquesVeronicaFechas;
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
          const tieneVeronica =
            clientes.some(cliente => this.clienteVeronicaConDatos(cliente)) ||
            productosRaiz.some(producto => this.productoRaizVeronicaConDatos(producto));

          if (tieneVeronica) {
            fechas.push(fechaEmbarque);
          }
        });

        this.embarquesVeronicaFechas = Array.from(new Set(fechas));
        this.embarquesCacheTimestamp = Date.now();
        return this.embarquesVeronicaFechas;
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
            batch.update(doc(db, 'cuentasVeronica', id), updates);
          });

          await batch.commit();
        }

        this.lastUpdateTimestamp = Date.now();
      } catch (error) {
        console.error('[VERONICA-CUENTAS] Error al actualizar notas:', error);
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
        const cuentasRef = collection(db, 'cuentasVeronica');
        const q = query(cuentasRef, orderBy('fecha', 'asc'));

        this.obtenerFechasEmbarquesVeronica().catch(() => {});

        this.unsubscribe = onSnapshot(q, async (querySnapshot) => {
          const cuentasActualizadas = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            const fechaNormalizada = this.normalizarFechaValor(data.fecha);
            const totalCobros = (data.cobros || []).reduce((sum, cobro) => 
              sum + (parseFloat(cobro.monto) || 0), 0);
            const totalAbonos = (data.abonos || []).reduce((sum, abono) =>
              sum + (parseFloat(abono.monto) || 0), 0);
            const ajusteManual = parseFloat(data.ajusteManual) || 0;
            const totalDiaActual = (data.totalGeneralVenta || 0) - totalCobros - totalAbonos + ajusteManual;
            const saldoPersistido = typeof data.nuevoSaldoAcumulado === 'number'
              ? data.nuevoSaldoAcumulado
              : null;
            const medidas = this.extraerMedidasDeCuenta(data);

            return {
              id: doc.id,
              fecha: fechaNormalizada || data.fecha,
              saldoHoy: data.totalGeneralVenta || 0,
              totalCobros,
              totalAbonos,
              totalNota: data.nuevoSaldoAcumulado || 0,
              estadoPagado: saldoPersistido !== null ? saldoPersistido <= 0.01 : totalDiaActual <= 0.01,
              nuevoSaldoAcumulado: data.nuevoSaldoAcumulado || 0,
              saldoAcumuladoAnterior: data.saldoAcumuladoAnterior || 0,
              abonos: data.abonos || [],
              notaBloqueada: data.notaBloqueada !== undefined ? data.notaBloqueada : true,
              tieneObservacion: data.tieneObservacion || false,
              observacion: data.observacion || '',
              tienePrecioVentaVacio: this.tienePrecioVentaVacio(data.itemsVenta || []),
              medidas,
              ajusteManual,
              ajusteManualMotivo: data.ajusteManualMotivo || ''
            };
          });

          // Ordenar las cuentas por fecha
          const cuentasOrdenadas = cuentasActualizadas.sort((a, b) => 
            new Date(a.fecha) - new Date(b.fecha)
          );

          let saldoAcumulado = 0;
          const actualizaciones = [];
          const TOLERANCIA = 0.01;

          for (let i = 0; i < cuentasOrdenadas.length; i++) {
            const cuenta = cuentasOrdenadas[i];
            const totalDia = cuenta.saldoHoy - cuenta.totalCobros - cuenta.totalAbonos + (cuenta.ajusteManual || 0);
            const saldoAnterior = i === 0 ? 0 : saldoAcumulado;
            saldoAcumulado += totalDia;
            const estadoPagado = saldoAcumulado <= TOLERANCIA;
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
            cuenta.saldoNegativoDetectado = totalDia < -TOLERANCIA;
            cuenta.montoNegativoDetectado = cuenta.saldoNegativoDetectado
              ? Math.round(Math.abs(totalDia) * 100) / 100
              : 0;

            if (saldoAcumulado <= TOLERANCIA) {
              saldoAcumulado = 0;
            }
          }

          const fechasConNota = new Set(cuentasOrdenadas.map(c => this.normalizarFechaValor(c.fecha)));
          const fechasEmbarquesVeronica = await this.obtenerFechasEmbarquesVeronica().catch(() => []);
          const faltantes = fechasEmbarquesVeronica
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

      // 1. Ventas: Suma de saldoHoy (totalGeneralVenta) de las notas creadas en esta semana
      const ventasSemana = this.cuentas.filter(c => {
        const fecha = moment(c.fecha);
        return fecha.isBetween(startOfWeek, endOfWeek, 'day', '[]');
      });

      const totalVenta = ventasSemana.reduce((sum, c) => sum + (c.saldoHoy || 0), 0);
      
      // Preparar detalle de ventas para el PDF
      this.detalleVentasSemanal = ventasSemana.map(c => ({
        fecha: moment(c.fecha).format('DD/MM/YYYY'),
        monto: c.saldoHoy || 0
      })).sort((a, b) => moment(a.fecha, 'DD/MM/YYYY').valueOf() - moment(b.fecha, 'DD/MM/YYYY').valueOf());
      
      // 2. Abonos: Buscar EXACTAMENTE como StashModalV2 - desde las cuentas
      let totalAbonado = 0;
      const abonosDetalle = [];
      
      try {
        // Cargar las últimas 50 cuentas (igual que StashModalV2 cargarTodosLosAbonos)
        const collectionName = 'cuentasVeronica';
        const q = query(
          collection(db, collectionName),
          orderBy('fecha', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        
        // Iterar cada cuenta y buscar sus abonos
        snapshot.docs.forEach(doc => {
          const cuentaData = doc.data();
          
          // Si la cuenta tiene abonos, revisarlos
          if (cuentaData.abonos && cuentaData.abonos.length > 0) {
            cuentaData.abonos.forEach((abono) => {
              // La fecha del abono es cuando se registró el dinero
              // Puede estar en: abono.fecha, abono.fechaAplicacion, o abono.fechaOriginalStash
              const fechaAbonoStr = abono.fechaOriginalStash || abono.fecha || abono.fechaAplicacion;
              
              if (fechaAbonoStr) {
                const fechaAbono = moment(fechaAbonoStr);
                if (fechaAbono.isValid() && fechaAbono.isBetween(startOfWeek, endOfWeek, 'day', '[]')) {
                  const montoAbono = parseFloat(abono.monto) || 0;
                  totalAbonado += montoAbono;
                  
                  // Agregar al detalle
                  abonosDetalle.push({
                    fecha: fechaAbono.format('DD/MM/YYYY'),
                    descripcion: abono.descripcion || 'Abono aplicado',
                    monto: montoAbono
                  });
                }
              }
            });
          }
        });

        // También revisar el stash (dinero que aún no se ha aplicado pero que ya entró)
        const stashRef = collection(db, 'stash_veronica');
        const stashSnapshot = await getDocs(stashRef);
        
        stashSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.fecha) {
            const fechaAbono = moment(data.fecha);
            if (fechaAbono.isBetween(startOfWeek, endOfWeek, 'day', '[]')) {
              const montoAbono = parseFloat(data.monto) || 0;
              totalAbonado += montoAbono;
              
              // Agregar al detalle
              abonosDetalle.push({
                fecha: fechaAbono.format('DD/MM/YYYY'),
                descripcion: data.descripcion || 'Abono en stash',
                monto: montoAbono
              });
            }
          }
        });

        // Ordenar abonos por fecha
        this.detalleAbonosSemanal = abonosDetalle.sort((a, b) => 
          moment(a.fecha, 'DD/MM/YYYY').valueOf() - moment(b.fecha, 'DD/MM/YYYY').valueOf()
        );

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
      this.$router.push(`/cuentas-veronica/${id}?edit=true`);
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
        const clienteVeronica = clientes.find(cliente => this.clienteVeronicaConDatos(cliente));

        const productosVeronica = clienteVeronica?.productos || [];
        const crudosVeronica = clienteVeronica?.crudos || [];

        const clienteCrudosTotales = data.clienteCrudos || data.clientesCrudos || {};
        const embarqueCliente = {
          ...data,
          fecha: fechaNormalizada,
          productos: productosVeronica,
          clienteCrudos: { '5': crudosVeronica },
          productosTotales: data.productos || [],
          clienteCrudosTotales: Object.keys(clienteCrudosTotales).length ? clienteCrudosTotales : { '5': crudosVeronica },
          costosPorMedida: data.costosPorMedida || {},
          aplicarCostoExtra: data.aplicarCostoExtra || {},
          costoExtra: data.costoExtra
        };

        await EmbarqueCuentasService.crearCuentaVeronica(embarqueCliente, this.$router);

        if (this.lastSaveMessage !== 'Cuenta creada desde embarque y abierta en nueva pestaña' || !this.showSaveMessage) {
          this.lastSaveMessage = 'Cuenta creada desde embarque y abierta en nueva pestaña';
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
      const cuenta = this.cuentas.find(c => c.id === id);
      const detalleCuenta = cuenta
        ? `la cuenta del ${this.formatDate(cuenta.fecha)} (Saldo Hoy: $${this.formatNumber(cuenta.saldoHoy)}, Total Acumulado: $${this.formatNumber(cuenta.totalNota)})`
        : 'este registro de cuenta';
      if (confirm(`¿Estás seguro de que quieres borrar ${detalleCuenta}?`)) {
        try {
          await PapeleraService.borrarConRespaldo('cuentasVeronica', id, null, 'Borrado manual desde menú de cuentas Veronica');
          if (this.lastSaveMessage !== 'Registro de cuenta borrado con éxito' || !this.showSaveMessage) {
            this.lastSaveMessage = 'Registro de cuenta borrado con éxito';
            this.showSaveMessage = true;
            if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
            this.saveMessageTimer = setTimeout(() => {
              this.showSaveMessage = false;
            }, 3000);
          }
        } catch (error) {
          console.error('Error al borrar con respaldo:', error);
          if (this.lastSaveMessage !== 'No se pudo completar el borrado. El registro NO fue borrado.' || !this.showSaveMessage) {
            this.lastSaveMessage = 'No se pudo completar el borrado. El registro NO fue borrado.';
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
    },
    mostrarMensaje(mensaje) {
      this.lastSaveMessage = mensaje;
      this.showSaveMessage = true;
      if (this.saveMessageTimer) clearTimeout(this.saveMessageTimer);
      this.saveMessageTimer = setTimeout(() => {
        this.showSaveMessage = false;
      }, 3000);
    },
    cuentaMasRecienteNoMissing() {
      const candidatas = this.cuentas.filter(c => !c.missingNota);
      if (!candidatas.length) return null;
      return candidatas.reduce((masReciente, actual) =>
        new Date(actual.fecha) > new Date(masReciente.fecha) ? actual : masReciente
      , candidatas[0]);
    },
    async ajustarAutomaticamente(cuenta) {
      const monto = cuenta.montoNegativoDetectado;
      if (!monto) return;

      const cuentaMasReciente = this.cuentaMasRecienteNoMissing();
      if (!cuentaMasReciente) {
        alert('No se encontró una nota reciente para aplicar el ajuste.');
        return;
      }

      const esMismaCuenta = cuentaMasReciente.id === cuenta.id;
      const confirmMsg = esMismaCuenta
        ? `Se detectó un saldo negativo de $${this.formatNumber(monto)} en la nota del ${this.formatDate(cuenta.fecha)} (es la nota más reciente). Se ajustará a $0. ¿Continuar?`
        : `Se detectó un saldo negativo de $${this.formatNumber(monto)} en la nota del ${this.formatDate(cuenta.fecha)}. Se corregirá esa nota y el mismo monto se aplicará como ajuste en la nota más reciente (${this.formatDate(cuentaMasReciente.fecha)}). ¿Continuar?`;

      if (!confirm(confirmMsg)) return;

      this.aplicandoAjusteAutomaticoId = cuenta.id;
      try {
        const batch = writeBatch(db);
        const motivoOrigen = `Ajuste automático: saldo negativo de $${this.formatNumber(monto)} detectado el ${this.formatDate(cuenta.fecha)}`;
        batch.update(doc(db, 'cuentasVeronica', cuenta.id), {
          ajusteManual: (cuenta.ajusteManual || 0) + monto,
          ajusteManualMotivo: motivoOrigen
        });

        if (!esMismaCuenta) {
          const motivoDestino = `Ajuste automático: crédito de $${this.formatNumber(monto)} trasladado desde la nota del ${this.formatDate(cuenta.fecha)}`;
          batch.update(doc(db, 'cuentasVeronica', cuentaMasReciente.id), {
            ajusteManual: (cuentaMasReciente.ajusteManual || 0) - monto,
            ajusteManualMotivo: motivoDestino
          });
        }

        await batch.commit();
        this.mostrarMensaje('Saldo negativo ajustado automáticamente');
      } catch (error) {
        console.error('Error al ajustar automáticamente el saldo:', error);
        this.mostrarMensaje('Error al ajustar automáticamente el saldo');
      } finally {
        this.aplicandoAjusteAutomaticoId = null;
      }
    },
    abrirAjusteModal(cuenta) {
      this.cuentaAjuste = cuenta;
      this.ajusteFormMonto = cuenta.ajusteManual || null;
      this.ajusteFormMotivo = cuenta.ajusteManualMotivo || '';
    },
    cerrarAjusteModal() {
      if (this.guardandoAjuste) return;
      this.cuentaAjuste = null;
      this.ajusteFormMonto = null;
      this.ajusteFormMotivo = '';
    },
    async guardarAjuste() {
      if (!this.cuentaAjuste || !this.ajusteFormMonto) return;
      this.guardandoAjuste = true;
      try {
        await updateDoc(doc(db, 'cuentasVeronica', this.cuentaAjuste.id), {
          ajusteManual: Number(this.ajusteFormMonto),
          ajusteManualMotivo: this.ajusteFormMotivo || ''
        });
        this.mostrarMensaje('Ajuste guardado con éxito');
        this.cuentaAjuste = null;
        this.ajusteFormMonto = null;
        this.ajusteFormMotivo = '';
      } catch (error) {
        console.error('Error al guardar el ajuste:', error);
        this.mostrarMensaje('Error al guardar el ajuste');
      } finally {
        this.guardandoAjuste = false;
      }
    },
    async quitarAjuste() {
      if (!this.cuentaAjuste) return;
      if (!confirm('¿Quitar el ajuste manual de esta cuenta?')) return;
      this.guardandoAjuste = true;
      try {
        await updateDoc(doc(db, 'cuentasVeronica', this.cuentaAjuste.id), {
          ajusteManual: 0,
          ajusteManualMotivo: ''
        });
        this.mostrarMensaje('Ajuste eliminado');
        this.cuentaAjuste = null;
        this.ajusteFormMonto = null;
        this.ajusteFormMotivo = '';
      } catch (error) {
        console.error('Error al quitar el ajuste:', error);
        this.mostrarMensaje('Error al quitar el ajuste');
      } finally {
        this.guardandoAjuste = false;
      }
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
.veronica-cuentas-menu-container {
  box-sizing: border-box; width: calc(100% - 32px); max-width: 1080px; margin: 24px auto;
  padding: 24px; background: #eef0f3; border: 1px solid #cbd2da; border-top: 5px solid #b45309;
  border-radius: 14px; color: #243047; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.veronica-cuentas-menu-container *, .veronica-cuentas-menu-container *::before { box-sizing: border-box; }
h1, h2, p { overflow-wrap: anywhere; }
h1 { margin: 0; font-size: clamp(28px, 3vw, 36px); font-weight: 750; letter-spacing: -.7px; color: #92400e; }
h2 { margin: 0; font-size: 20px; color: #243047; text-align: left; }
.menu-encabezado, .registros-encabezado, .cuenta-cabecera { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.menu-encabezado { margin: 20px 0; }
.menu-eyebrow, .seccion-eyebrow { margin: 0 0 8px; color: #92501f; font-size: 11px; font-weight: 750; letter-spacing: 1.4px; }
.menu-descripcion, .seccion-descripcion { margin: 8px 0 0; color: #5d6879; font-size: 14px; line-height: 1.6; }
button, input, select { font: inherit; }
button, .action-button { cursor: pointer; }
.action-button, .cuenta-actions button, .pagination-btn, .btn-cerrar, .btn-secondary, .btn-ajustar-auto {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px;
  padding: 9px 16px; border: 1px solid #b45309; border-radius: 7px; background: #b45309;
  color: #fff; font-size: 14px; font-weight: 650; text-decoration: none; line-height: 1.3;
}
.action-button:hover, .edit-btn:hover, .btn-cerrar:hover { background: #92400e; }
.menu-regresar { background: #fff; color: #344256; border-color: #bac4d0; }
.menu-regresar:hover { background: #243047; color: #fff; }
.actions-container { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 16px; margin-bottom: 20px; border: 1px solid #cbd2da; border-radius: 10px; background: #fff; }
.ventas-ganancias-btn { background: #243047; border-color: #243047; }
.ventas-ganancias-btn:hover { background: #111827; }
.herramientas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
.card { min-width: 0; padding: 22px; background: #fff; border: 1px solid #cbd2da; border-radius: 10px; box-shadow: 0 3px 10px #24304705; }
.reporte-cuentas-card .seccion-descripcion { margin-bottom: 18px; }
.analisis-acciones { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 22px; }
.reporte-semanal-btn { background: #fff7ed; color: #92400e; border-color: #e8b58e; }
.reporte-semanal-btn:hover { background: #ffedd5; }
.registros-encabezado { margin-bottom: 18px; }
.filter-container { display: flex; align-items: end; flex-wrap: wrap; gap: 16px; padding: 16px; margin-bottom: 20px; background: #f3f5f7; border: 1px solid #e1e5eb; border-radius: 8px; }
.filter-group { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; min-width: 0; flex: 1; }
.filter-group label { flex-basis: 100%; color: #475569; font-size: 12px; font-weight: 700; }
.filter-container select, .filter-medida-input, .ajuste-input { min-height: 42px; width: 100%; min-width: 0; padding: 9px 12px; border: 1px solid #b6c0cc; border-radius: 6px; background: #fff; color: #243047; }
.filter-medida-input { width: auto; flex: 1; }
.filter-medida-clear { width: 42px; height: 42px; padding: 0; border: 1px solid #b6c0cc; border-radius: 6px; background: white; color: #475569; font-size: 22px; }
.loading, .no-records { padding: 40px 16px; text-align: center; color: #5d6879; }
.cuentas-list > ul { list-style: none; margin: 0; padding: 0; }
.cuenta-item { padding: 20px; margin-bottom: 14px; border: 1px solid #d5dce5; border-left: 4px solid #b45309; border-radius: 9px; background: #fff; }
.cuenta-item:last-child { margin-bottom: 0; }
.cuenta-item.cuenta-sin-nota { background: #f8fafc; border-left-color: #94a3b8; }
.cuenta-item.tiene-observacion { border-left-color: #d97706; }
.cuenta-cabecera { gap: 10px; margin-bottom: 16px; }
.cuenta-date { color: #243047; font-size: 16px; font-weight: 750; }
.estado-cuenta, .lock-badge { display: inline-flex; padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
.pagado { background: #dcfce7; color: #166534; }
.no-pagado { background: #fff1f2; color: #9f1239; }
.estado-sin-nota { background: #e2e8f0; color: #475569; }
.cuenta-summary { display: flex; flex-wrap: wrap; gap: 16px 40px; margin: 0 0 12px; color: #64748b; font-size: 12px; }
.cuenta-summary > span { display: grid; gap: 4px; }
.cuenta-summary strong { color: #243047; font-size: 20px; font-variant-numeric: tabular-nums; }
.lock-status { margin-top: 8px; }
.lock-on { background: #f1f5f9; color: #475569; }
.lock-off { background: #eff6ff; color: #1d4ed8; }
.precio-venta-vacio { display: inline-block; margin-top: 10px; padding: 8px 12px; border: 1px solid #f5cd74; border-radius: 6px; background: #fffbeb; color: #854d0e; font-size: 13px; font-weight: 650; }
.observacion-container { display: flex; align-items: start; gap: 12px; padding: 12px; margin-top: 12px; background: #fff7ed; border-left: 3px solid #d97706; border-radius: 6px; }
.observacion-texto { flex: 1; white-space: pre-wrap; margin: 0; color: #92400e; font-size: 14px; }
.delete-observacion-btn { min-width: 36px; min-height: 36px; border: 0; border-radius: 6px; background: #fff; color: #9f1239; font-size: 22px; }
.abonos-info { margin-top: 14px; padding: 12px 14px; background: #f0fdf4; border-radius: 6px; }
.abono-detail { display: flex; flex-wrap: wrap; gap: 6px 12px; margin: 5px 0; font-size: 13px; color: #166534; }
.abono-label, .abono-monto, .abono-total { font-weight: 700; }
.abono-monto, .ajuste-monto { font-variant-numeric: tabular-nums; }
.abono-descripcion { color: #526257; overflow-wrap: anywhere; }
.abono-total { border-top: 1px solid #bbdfc6; padding-top: 8px; margin: 10px 0 0; color: #166534; font-size: 13px; }
.cuenta-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; margin-top: 16px; padding-top: 14px; border-top: 1px solid #edf0f4; }
.cuenta-actions .adjust-btn { background: #fff7ed; color: #92400e; border-color: #e8b58e; }
.cuenta-actions .delete-btn { background: #fff; color: #be123c; border-color: #f1c7d1; }
.cuenta-actions .delete-btn:hover { background: #fff1f2; }
.cuenta-actions .nota-pendiente-hint { background: #fff; color: #92400e; border-style: dashed; }
.saldo-negativo-alerta, .ajuste-info { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 12px; margin-top: 12px; border-radius: 6px; font-size: 13px; }
.saldo-negativo-alerta { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }
.btn-ajustar-auto { background: #9f1239; border-color: #9f1239; font-size: 12px; }
.ajuste-info { background: #fff7ed; color: #92400e; }
.ajuste-label, .ajuste-monto { font-weight: 700; }
.ajuste-motivo { overflow-wrap: anywhere; }
.pagination-controls { display: flex; justify-content: center; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 24px; }
.pagination-btn { background: #fff; color: #475569; border-color: #cbd2da; padding: 8px 12px; }
.pagination-btn:not(:disabled):hover { background: #fff7ed; border-color: #b45309; }
.pagination-info { font-size: 13px; font-weight: 700; padding: 0 8px; }
button:disabled { opacity: .5; cursor: not-allowed; }
button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #b45309; outline-offset: 3px; }
.modal-overlay { position: fixed; inset: 0; display: flex; justify-content: center; align-items: center; padding: 16px; background: #0f172a99; z-index: 1000; }
.modal-content { width: 100%; max-width: 500px; max-height: calc(100dvh - 32px); overflow-y: auto; padding: 24px; border-radius: 12px; background: #fff; }
.modal-content h2 { margin-bottom: 20px; }
.ajuste-modal-fecha { color: #92400e; font-weight: 700; }
.ajuste-modal-hint { color: #5d6879; font-size: 14px; line-height: 1.6; }
.ajuste-form-row { display: grid; gap: 6px; margin-bottom: 16px; }
.ajuste-form-row label { font-size: 13px; font-weight: 650; }
.modal-buttons { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.btn-secondary { background: #fff; color: #475569; border-color: #cbd2da; }
.save-message { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); max-width: 90vw; padding: 12px 20px; border-radius: 8px; color: #fff; background: #243047; text-align: center; z-index: 2000; }
@media (max-width: 700px) {
  .veronica-cuentas-menu-container { width: calc(100% - 16px); margin: 12px auto; padding: 16px; }
  .herramientas-grid { grid-template-columns: 1fr; gap: 12px; }
  .card { padding: 16px; }
  .menu-encabezado { align-items: flex-start; }
  .actions-container { gap: 10px; padding: 12px; }
  .filter-container { flex-direction: column; align-items: stretch; padding: 12px; }
  .cuenta-item { padding: 14px; }
  .cuenta-summary { gap: 12px 24px; }
  .cuenta-summary strong { font-size: 18px; }
  .cuenta-actions button { flex: 1 1 auto; }
  .pagination-controls { gap: 5px; }
  .pagination-btn { padding: 8px; font-size: 12px; }
}
</style>
