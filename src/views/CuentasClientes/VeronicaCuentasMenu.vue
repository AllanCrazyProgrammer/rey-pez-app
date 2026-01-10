<template>
  <div class="veronica-cuentas-menu-container">
    <h1>Menú de Cuentas Veronica</h1>
    
    <div class="actions-container actions-sticky">
      <router-link to="/cuentas-mexico" class="action-button back-btn">
        Cuentas México
      </router-link>
      <router-link to="/cuentas-veronica/nueva" class="action-button new-cuenta-btn">
        Nueva Cuenta
      </router-link>
      <router-link to="/ventas-ganancias-veronica" class="action-button ventas-ganancias-btn">
        Ventas y Ganancias
      </router-link>
      <PreciosHistorialModal />
      <StashModalV2 cliente="veronica" />
    </div>

    <div class="reporte-cuentas-card card">
      <h2>Generar reporte PDF</h2>
      <ReporteCuentasVeronicaButton />
      <button @click="generarReporteSemanal" class="action-button reporte-semanal-btn" style="margin-top: 10px; width: 100%;">
        📊 Reporte Semanal
      </button>
    </div>

    <div class="resumen-ventas-card card">
      <h2>Resumen de Ventas por Tipo de Producto</h2>
      <ResumenVentasVeronicaModal />
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
        <li
          v-for="cuenta in cuentasFiltradas"
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
    </div>

    <template v-if="showSaveMessage && lastSaveMessage">
      <div class="save-message">
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
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, onSnapshot, where, updateDoc, getDocs, limit } from 'firebase/firestore';
import EmbarqueCuentasService from '@/utils/services/EmbarqueCuentasService';
import BackButton from '@/components/BackButton.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import StashModalV2 from '@/components/StashModalV2.vue';
import ReporteCuentasVeronicaButton from '@/components/Cuentas/ReporteCuentasVeronicaButton.vue';
import ResumenVentasVeronicaModal from '@/components/Cuentas/ResumenVentasVeronicaModal.vue';
import ReporteSemanalPDFButton from '@/components/Cuentas/ReporteSemanalPDFButton.vue';
import moment from 'moment';
import DatePicker from 'vue2-datepicker';
import 'vue2-datepicker/index.css';

export default {
  name: 'VeronicaCuentasMenu',
  components: {
    BackButton,
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
      creatingFecha: null
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
    normalizarFechaValor(valor) {
      if (!valor) return null;
      try {
        // Si ya viene como string YYYY-MM-DD, regresarlo
        if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
        // Si es Timestamp de Firestore
        if (valor.seconds) {
          const d = new Date(valor.seconds * 1000);
          return d.toISOString().split('T')[0];
        }
        // Si es Date
        if (valor instanceof Date) {
          return valor.toISOString().split('T')[0];
        }
        // Fallback: intentar parsear
        const d = new Date(valor);
        if (!Number.isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch (_) {
        return null;
      }
      return null;
    },
    async loadCuentas() {
      try {
        this.isLoading = true;
        const cuentasRef = collection(db, 'cuentasVeronica');
        const q = query(cuentasRef, orderBy('fecha', 'asc'));
        
        // Usar onSnapshot para actualizaciones en tiempo real
        this.unsubscribe = onSnapshot(q, async (querySnapshot) => {
          const cuentasActualizadas = querySnapshot.docs.map((doc) => {
            const data = doc.data();
            const fechaNormalizada = this.normalizarFechaValor(data.fecha);
            const totalCobros = (data.cobros || []).reduce((sum, cobro) => 
              sum + (parseFloat(cobro.monto) || 0), 0);
            const totalAbonos = (data.abonos || []).reduce((sum, abono) => 
              sum + (parseFloat(abono.monto) || 0), 0);
            const totalDiaActual = (data.totalGeneralVenta || 0) - totalCobros - totalAbonos;

            return {
              id: doc.id,
              fecha: fechaNormalizada || data.fecha,
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

          // Buscar embarques de Verónica que no tengan nota
          const fechasConNota = new Set(cuentasOrdenadas.map(c => this.normalizarFechaValor(c.fecha)));
          const embarquesRef = collection(db, 'embarques');
          const embarquesSnapshot = await getDocs(query(embarquesRef, orderBy('fecha', 'desc'), limit(200)));
          
          const faltantes = [];
          embarquesSnapshot.forEach(docSnap => {
            const data = docSnap.data() || {};
            const fechaEmbarque = this.normalizarFechaValor(data.fecha);
            if (!fechaEmbarque || fechasConNota.has(fechaEmbarque)) return;

            const clientes = data.clientes || [];
            const productosRaiz = data.productos || [];

            const tieneVeronica = clientes.some(cliente => {
              const clienteId = (cliente.id ?? cliente.clienteId ?? '').toString();
              const nombreCliente = (cliente.nombre || '').toLowerCase();
              const esVeronica = clienteId === '5' || nombreCliente.includes('veronica') || nombreCliente.includes('lorena');
              const tieneProductos = Array.isArray(cliente.productos) && cliente.productos.some(p => p && (p.medida || (Array.isArray(p.kilos) && p.kilos.some(k => Number(k) > 0))));
              const tieneCrudos = Array.isArray(cliente.crudos) && cliente.crudos.length > 0;
              return esVeronica && (tieneProductos || tieneCrudos);
            }) || productosRaiz.some(producto => {
              const clienteId = (producto.clienteId ?? producto.cliente ?? '').toString();
              const tieneContenido = producto && (producto.medida || (Array.isArray(producto.kilos) && producto.kilos.some(k => Number(k) > 0)));
              return clienteId === '5' && tieneContenido;
            });

            if (tieneVeronica) {
              faltantes.push({
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
              });
            }
          });

          // Realizar todas las actualizaciones en paralelo
          if (actualizaciones.length > 0) {
            await Promise.all(actualizaciones.map(({ id, updates }) => 
              updateDoc(doc(db, 'cuentasVeronica', id), updates)
            ));
          }

          // Unir cuentas existentes con faltantes y ordenar desc
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
      const fechaNormalizada = this.normalizarFechaValor(fecha) || new Date().toISOString().split('T')[0];
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
        const clienteVeronica = clientes.find(cliente => {
          const clienteId = (cliente.id ?? cliente.clienteId ?? '').toString();
          const nombreCliente = (cliente.nombre || '').toLowerCase();
          const esVeronica = clienteId === '5' || nombreCliente.includes('veronica') || nombreCliente.includes('lorena');
          const tieneProductos = Array.isArray(cliente.productos) && cliente.productos.some(p => p && (p.medida || (Array.isArray(p.kilos) && p.kilos.some(k => Number(k) > 0))));
          const tieneCrudos = Array.isArray(cliente.crudos) && cliente.crudos.length > 0;
          return esVeronica && (tieneProductos || tieneCrudos);
        });

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
  max-width: 800px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

h1, h2 {
  color: #ff8c00;
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
  background-color: #ff8c00;
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
  background-color: #e07600;
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

.reporte-cuentas-card {
  margin-bottom: 20px;
}

.reporte-cuentas-card h2 {
  margin: 0 0 8px;
  font-size: 1.2em;
  color: #ff8c00;
}

.resumen-ventas-card {
  margin-bottom: 20px;
}

.resumen-ventas-card h2 {
  margin: 0 0 8px;
  font-size: 1.2em;
  color: #ff8c00;
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

.estado-sin-nota {
  background-color: #bdbdbd;
  color: white;
}

.texto-sin-nota {
  color: #666;
  font-weight: 600;
}

.nota-pendiente-hint {
  color: #ff8c00;
  font-weight: 700;
  align-self: center;
  background: #fff2e6;
  border: 1px dashed #ffb366;
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
  background: #ffe0c2;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  transform: translateY(-1px);
}

.nota-pendiente-hint:active {
  transform: translateY(0);
}

.nota-pendiente-hint:focus {
  outline: 2px solid #ff8c00;
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .nota-pendiente-hint {
    width: 100%;
  }
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
