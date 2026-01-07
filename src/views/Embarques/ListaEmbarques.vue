<template>
  <div class="lista-embarques">
    <!-- Terminal Window -->
    <div class="terminal-window">
      <div class="terminal-header">
        <span class="terminal-dots">
          <span class="dot red"></span>
          <span class="dot yellow"></span>
          <span class="dot green"></span>
        </span>
        <span class="terminal-title">DATABASE_EMBARQUES.db — bash</span>
      </div>
      
      <!-- Header principal -->
      <div class="header-section">
        <div class="header-content">
          <pre class="ascii-title">
╔══════════════════════════════════════╗
║     LISTA DE EMBARQUES               ║
║     ═══════════════════              ║
╚══════════════════════════════════════╝</pre>
          <p class="subtitle"><span class="prompt">$</span> SELECT * FROM embarques ORDER BY fecha DESC;</p>
        </div>
        <div class="header-actions">
          <button @click="cargarEmbarques" class="btn-refresh" title="Actualizar lista">
            <span class="btn-icon">↻</span>
            REFRESH
          </button>
          <button @click="abrirModalGenerarPdfCliente" class="btn-pdf" title="Generar Nota PDF por fecha/cliente">
            <span class="btn-icon">🗎</span>
            Generar nota
          </button>
        </div>
      </div>
    </div>

    <!-- Estados de carga -->
    <div v-if="cargando" class="loading-state">
      <div class="loading-terminal">
        <span class="loading-text">[████████░░░░░░░░] 50%</span>
        <p class="loading-message">Cargando registros desde base de datos...</p>
      </div>
    </div>

    <div v-else-if="error" class="error-state">
      <pre class="error-ascii">
╔═══════════════════════════════════════╗
║  ██████╗ ERROR ██████╗                ║
║  ██╔═══╝       ╚═══██║                ║
║  ██████╗ FATAL ██████║                ║
╚═══════════════════════════════════════╝</pre>
      <p class="error-message">[ERR] {{ error }}</p>
      <button @click="cargarEmbarques" class="btn-retry">
        <span class="btn-icon">↻</span> RETRY_CONNECTION
      </button>
    </div>

    <!-- Lista de embarques -->
    <div v-else class="embarques-container">
      <div v-if="embarques.length > 0" class="embarques-grid">
        <div 
          v-for="(embarque, index) in embarques" 
          :key="embarque.id" 
          class="embarque-card"
          :class="{ 'card-blocked': embarque.embarqueBloqueado, 'card-no-mexico': embarque.noEnviadoMexico }"
        >
          <!-- Header de la card -->
          <div class="card-header">
            <div class="record-id">[REC_{{ String(index + 1).padStart(3, '0') }}]</div>
            <div class="fecha-section">
              <span class="fecha-label">DATE:</span>
              <span class="fecha-value">{{ formatearFecha(embarque.fecha) }}</span>
              <span v-if="embarque.camionNumero && embarque.camionNumero > 1" class="camion-badge">
                (Camion {{ embarque.camionNumero }})
              </span>
            </div>
            <div class="status-section">
              <span v-if="embarque.noEnviadoMexico" class="status-badge status-warning">
                <span class="status-icon">⊘</span> NO_ENVIADO
              </span>
              <span v-else-if="embarque.embarqueBloqueado" class="status-badge status-locked">
                <span class="status-icon">◉</span> LOCKED
              </span>
              <span v-else class="status-badge status-active">
                <span class="status-icon">●</span> ACTIVE
              </span>
            </div>
          </div>

          <!-- Contenido principal -->
          <div class="card-content">
            <div class="data-separator">────────────────────────────────</div>
            
            <!-- Estadísticas -->
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">KG_LIMPIOS:</span>
                <span class="stat-value">{{ calcularKilosLimpios(embarque) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">KG_CRUDOS:</span>
                <span class="stat-value">{{ calcularKilosCrudos(embarque) }}</span>
              </div>
              <div class="stat-item stat-highlight">
                <span class="stat-label">TOTAL_KG:</span>
                <span class="stat-value">{{ (Number(calcularKilosLimpios(embarque)) + Number(calcularKilosCrudos(embarque))).toFixed(1) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">TARAS:</span>
                <span class="stat-value">{{ calcularTotalTaras(embarque) }}</span>
              </div>
            </div>

            <div class="data-separator">────────────────────────────────</div>

            <!-- Información adicional -->
            <div class="additional-info">
              <span class="info-label">CARGA_CON:</span>
              <span class="info-value">"{{ embarque.cargaCon || 'NULL' }}"</span>
            </div>
          </div>

          <!-- Acciones -->
          <div class="card-actions">
            <button 
              @click="toggleNoEnviadoMexico(embarque.id, embarque.noEnviadoMexico)"
              class="btn-action btn-mexico"
              :class="{ 'btn-mexico-active': embarque.noEnviadoMexico }"
              :title="embarque.noEnviadoMexico ? 'Marcar como enviado a México' : 'Marcar como NO enviado a México'"
            >
              {{ embarque.noEnviadoMexico ? '[ ] MX' : '[✓] MX' }}
            </button>
            <button 
              @click="editarEmbarque(embarque.id)" 
              class="btn-action btn-edit"
              title="Editar embarque"
            >
              [EDIT]
            </button>
            <button 
              @click="eliminarEmbarque(embarque.id)" 
              class="btn-action btn-delete"
              :class="{ 'btn-disabled': embarque.embarqueBloqueado }"
              :disabled="embarque.embarqueBloqueado"
              :title="embarque.embarqueBloqueado ? 'Este embarque está bloqueado' : 'Eliminar embarque'"
            >
              [DEL]
            </button>
          </div>
        </div>
      </div>

      <!-- Estado vacío -->
      <div v-else class="empty-state">
        <pre class="empty-ascii">
╔═════════════════════════════════════════╗
║                                         ║
║      NO RECORDS FOUND IN DATABASE       ║
║                                         ║
║      > Query returned 0 results         ║
║      > Table: embarques                 ║
║                                         ║
╚═════════════════════════════════════════╝</pre>
        <p class="empty-message">[INFO] Comienza creando tu primer registro</p>
        <button @click="$router.push({ name: 'NuevoEmbarque', params: { id: 'nuevo' } })" class="btn-create">
          <span class="btn-icon">+</span> INSERT_NEW_RECORD
        </button>
      </div>
    </div>

    <!-- Notificaciones de respaldo -->
    <NotificacionRespaldo
      :visible="mostrarNotificacion"
      :tipo="tipoNotificacion"
      :titulo="tituloNotificacion"
      :mensaje="mensajeNotificacion"
      @close="cerrarNotificacion"
    />

    <GenerarPdfClienteModal
      :mostrar="mostrarModalGenerarPdfCliente"
      :fecha="modalGenerarPdf.fecha"
      :embarques="modalGenerarPdf.embarques"
      :embarque-id="modalGenerarPdf.embarqueId"
      :cliente-id="modalGenerarPdf.clienteId"
      :clientes="modalGenerarPdf.clientes"
      :cargando="modalGenerarPdf.cargando"
      :error="modalGenerarPdf.error"
      @cerrar="cerrarModalGenerarPdfCliente"
      @update:fecha="onCambioFechaModalPdf"
      @update:embarque-id="onSeleccionEmbarqueModal"
      @update:cliente-id="modalGenerarPdf.clienteId = $event"
      @buscar="cargarEmbarquesModalPdf"
      @confirmar="generarPdfDesdeModal"
    />
  </div>
</template>

<script>
import { getFirestore, collection, getDocs, doc, deleteDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import BackupService from './BackupService.js';
import NotificacionRespaldo from './NotificacionRespaldo.vue';
import EmbarquesOfflineService from '@/services/EmbarquesOfflineService';
import { useAuthStore } from '@/stores/auth';
import GenerarPdfClienteModal from './components/modals/GenerarPdfClienteModal.vue';
import { normalizarFechaISO, obtenerFechaActualISO } from '@/utils/dateUtils';
import { generarNotaVentaPDF } from '@/utils/pdfGenerator';

export default {
  name: 'ListaEmbarques',
  components: {
    NotificacionRespaldo,
    GenerarPdfClienteModal
  },
  data() {
    return {
      embarques: [],
      cargando: true,
      error: null,
      // Notificaciones de respaldo
      mostrarNotificacion: false,
      tipoNotificacion: 'success',
      tituloNotificacion: '',
      mensajeNotificacion: '',
      // Modal generar PDF
      mostrarModalGenerarPdfCliente: false,
      modalGenerarPdf: {
        fecha: '',
        embarques: [],
        embarqueId: '',
        clienteId: '',
        clientes: [],
        cargando: false,
        error: ''
      }
    };
  },
  methods: {
    safeClone(value, fallback = null) {
      if (value === undefined || value === null) {
        return fallback;
      }
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (error) {
        console.warn('[ListaEmbarques] Error al clonar valor, usando fallback:', error);
        return fallback;
      }
    },

    mapOfflineRecordToLista(record) {
      if (!record) return null;
      let fecha;
      try {
        fecha = record.fecha ? new Date(record.fecha) : null;
      } catch (error) {
        fecha = null;
      }

      return {
        id: record.id,
        fecha: fecha || new Date(),
        embarqueBloqueado: Boolean(record.embarqueBloqueado),
        noEnviadoMexico: Boolean(record.noEnviadoMexico),
        clientes: record.clientes || [],
        cargaCon: record.cargaCon || 'No especificado',
        camionNumero: record.camionNumero || record.docData?.camionNumero || 1,
        pendingSync: Boolean(record.pendingSync),
      };
    },

    asignarCamionNumero(embarques) {
      const contadorPorFecha = {};

      return embarques.map((embarque) => {
        let fechaObj = embarque.fecha;
        if (fechaObj && !(fechaObj instanceof Date)) {
          const parsed = new Date(fechaObj);
          fechaObj = Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        const fechaISO = fechaObj ? fechaObj.toISOString().split('T')[0] : null;
        const camionExistente = embarque.camionNumero;
        const camionNumero = camionExistente || (fechaISO
          ? (contadorPorFecha[fechaISO] = (contadorPorFecha[fechaISO] || 0) + 1)
          : 1);

        if (fechaISO) {
          const actual = contadorPorFecha[fechaISO] || 0;
          contadorPorFecha[fechaISO] = Math.max(actual, camionNumero);
        }

        return {
          ...embarque,
          camionNumero
        };
      });
    },

    construirSnapshotOfflineDesdeRemoto(docId, data, fecha) {
      const clientes = Array.isArray(data.clientes) ? data.clientes : [];
      const productos = clientes.flatMap(cliente => {
        const productosCliente = Array.isArray(cliente.productos) ? cliente.productos : [];
        return productosCliente.map(producto => ({
          ...producto,
          clienteId: cliente.id,
          nombreCliente: cliente.nombre,
        }));
      });

      const clienteCrudos = {};
      clientes.forEach(cliente => {
        clienteCrudos[cliente.id] = Array.isArray(cliente.crudos) ? cliente.crudos : [];
      });

      const docData = {
        ...this.safeClone(data, {}),
        fecha: fecha ? fecha.toISOString() : null,
      };

      return {
        id: docId,
        fecha: fecha ? fecha.toISOString() : null,
        cargaCon: data.cargaCon || '',
        camionNumero: data.camionNumero || 1,
        embarqueBloqueado: data.embarqueBloqueado || false,
        noEnviadoMexico: data.noEnviadoMexico || false,
        clientesPersonalizados: data.clientesPersonalizados || [],
        clientesJuntarMedidas: data.clientesJuntarMedidas || {},
        clientesReglaOtilio: data.clientesReglaOtilio || {},
        clientesIncluirPrecios: data.clientesIncluirPrecios || {},
        clientesCuentaEnPdf: data.clientesCuentaEnPdf || {},
        clientesSumarKgCatarro: data.clientesSumarKgCatarro || {},
        clientes: clientes,
        productos,
        clienteCrudos,
        costosPorMedida: data.costosPorMedida || {},
        aplicarCostoExtra: data.aplicarCostoExtra || {},
        costoExtra: data.costoExtra !== undefined ? data.costoExtra : 18,
        medidasConfiguracion: data.medidasConfiguracion || [],
        preciosActuales: [],
        docData,
      };
    },

    normalizarDocDataParaFirestore(record) {
      const source = record && record.docData ? JSON.parse(JSON.stringify(record.docData)) : {};

      const parseFecha = (valor) => {
        if (!valor) return new Date();
        if (valor instanceof Date) return valor;
        if (typeof valor === 'string') {
          const parsed = new Date(valor);
          if (!Number.isNaN(parsed.getTime())) {
            return parsed;
          }
        }
        if (typeof valor === 'object') {
          const seconds = valor?.seconds ?? valor?._seconds;
          if (typeof seconds === 'number') {
            return new Date(seconds * 1000);
          }
        }
        try {
          return new Date(valor);
        } catch (error) {
          console.warn('[ListaEmbarques] No se pudo parsear la fecha, usando fecha actual.', error);
          return new Date();
        }
      };

      const pick = (key, fallback) => {
        if (source[key] !== undefined) return source[key];
        if (record && record[key] !== undefined) return record[key];
        return fallback;
      };

      const payload = {
        fecha: parseFecha(pick('fecha', null)),
        cargaCon: pick('cargaCon', ''),
        camionNumero: pick('camionNumero', 1),
        clientes: Array.isArray(pick('clientes', [])) ? pick('clientes', []).map(cliente => ({
          ...cliente,
          productos: Array.isArray(cliente.productos) ? cliente.productos.map(producto => ({
            ...producto,
            restarTaras: producto.restarTaras || false,
            noSumarKilos: producto.noSumarKilos || false,
          })) : [],
          crudos: Array.isArray(cliente.crudos) ? cliente.crudos : [],
        })) : [],
        clientesJuntarMedidas: pick('clientesJuntarMedidas', {}),
        clientesReglaOtilio: pick('clientesReglaOtilio', {}),
        clientesIncluirPrecios: pick('clientesIncluirPrecios', {}),
        clientesCuentaEnPdf: pick('clientesCuentaEnPdf', {}),
        clientesSumarKgCatarro: pick('clientesSumarKgCatarro', {}),
        clientesPersonalizados: Array.isArray(pick('clientesPersonalizados', [])) ? pick('clientesPersonalizados', []) : [],
        costosPorMedida: pick('costosPorMedida', {}),
        aplicarCostoExtra: pick('aplicarCostoExtra', {}),
        costoExtra: typeof pick('costoExtra', undefined) === 'number' ? pick('costoExtra', undefined) : 18,
        kilosCrudos: pick('kilosCrudos', {}),
        medidasConfiguracion: Array.isArray(pick('medidasConfiguracion', [])) ? pick('medidasConfiguracion', []) : [],
        preciosActuales: Array.isArray(pick('preciosActuales', [])) ? pick('preciosActuales', []) : [],
        medidaOculta: pick('medidaOculta', {}),
        analizarGanancia: pick('analizarGanancia', {}),
        analizarGananciaCrudos: pick('analizarGananciaCrudos', {}),
        analizarMaquilaGanancia: pick('analizarMaquilaGanancia', {}),
        precioMaquila: pick('precioMaquila', {}),
        pesoTaraCosto: typeof pick('pesoTaraCosto', undefined) === 'number' ? pick('pesoTaraCosto', undefined) : 19,
        pesoTaraVenta: typeof pick('pesoTaraVenta', undefined) === 'number' ? pick('pesoTaraVenta', undefined) : 20,
        nombresMedidasPersonalizados: pick('nombresMedidasPersonalizados', {}),
        notaRendimientos: pick('notaRendimientos', ''),
        embarqueBloqueado: Boolean(pick('embarqueBloqueado', false)),
        noEnviadoMexico: Boolean(pick('noEnviadoMexico', false)),
      };

      return payload;
    },

    async sincronizarPendientesOffline() {
      try {
        const pendientes = await EmbarquesOfflineService.getPendingSync();
        if (!Array.isArray(pendientes) || pendientes.length === 0) {
          return;
        }

        const authStore = useAuthStore();
        const db = getFirestore();

        for (const record of pendientes) {
          try {
            const embarqueRef = doc(db, 'embarques', record.id);
            const snapshot = await getDoc(embarqueRef);

            if (record.deleted && record.deletedByUser) {
              if (snapshot.exists()) {
                await deleteDoc(embarqueRef);
              }
              await EmbarquesOfflineService.hardDelete(record.id);
              continue;
            }

            const payload = this.normalizarDocDataParaFirestore(record);
            const dataParaFirestore = {
              ...payload,
              ultimaEdicion: {
                userId: authStore?.userId || 'offline-user',
                username: authStore?.user?.username || 'Modo offline',
                timestamp: serverTimestamp()
              }
            };

            if (snapshot.exists()) {
              await setDoc(embarqueRef, dataParaFirestore, { merge: false });
            } else {
              await setDoc(embarqueRef, dataParaFirestore);
            }

            await EmbarquesOfflineService.markSynced(record.id);
          } catch (error) {
            console.error('[ListaEmbarques] Error al sincronizar registro offline:', error);
            try {
              await EmbarquesOfflineService.markSyncError(record.id, error.message || error);
            } catch (markError) {
              console.warn('[ListaEmbarques] No se pudo marcar el error de sincronización:', markError);
            }
          }
        }
      } catch (error) {
        console.error('[ListaEmbarques] Error general al sincronizar registros offline:', error);
      }
    },

    async cargarEmbarques() {
      try {
        this.cargando = true;
        this.error = null;

        await EmbarquesOfflineService.init();

        // Mostrar resultados offline inmediatamente si existen
        try {
          const registrosOffline = await EmbarquesOfflineService.getAll();
          if (Array.isArray(registrosOffline) && registrosOffline.length > 0) {
            const embarquesOrdenados = registrosOffline
              .map(this.mapOfflineRecordToLista)
              .filter(Boolean)
              .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            this.embarques = this.asignarCamionNumero(embarquesOrdenados);
          } else {
            this.embarques = [];
          }
        } catch (offlineError) {
          console.warn('[ListaEmbarques] No se pudieron leer datos offline:', offlineError);
        }

        if (navigator.onLine) {
          await this.sincronizarPendientesOffline();
        } else {
          if (this.embarques.length === 0) {
            this.error = 'Sin conexión y sin datos locales de embarques.';
          }
          return;
        }

        const db = getFirestore();
        const embarquesRef = collection(db, 'embarques');
        const snapshot = await getDocs(embarquesRef);

        const embarquesProcesados = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          let fechaEmbarque = null;

          if (data.fecha && typeof data.fecha.toDate === 'function') {
            fechaEmbarque = data.fecha.toDate();
          } else if (data.fecha instanceof Date) {
            fechaEmbarque = data.fecha;
          } else if (typeof data.fecha === 'string') {
            const parsed = new Date(data.fecha);
            fechaEmbarque = Number.isNaN(parsed.getTime()) ? null : parsed;
          }

          const fechaISO = fechaEmbarque ? fechaEmbarque.toISOString().split('T')[0] : null;

          return {
            id: docSnap.id,
            fecha: fechaEmbarque,
            fechaISO,
            data
          };
        });

        const embarquesOrdenados = embarquesProcesados.sort((a, b) => {
          if (!a.fecha && !b.fecha) return 0;
          if (!a.fecha) return 1;
          if (!b.fecha) return -1;
          return new Date(b.fecha) - new Date(a.fecha);
        });

        const embarquesFiltrados = [];

        for (const embarque of embarquesOrdenados) {
          const fechaObj = embarque.fecha instanceof Date ? embarque.fecha : (embarque.fecha ? new Date(embarque.fecha) : new Date());
          const snapshotOffline = this.construirSnapshotOfflineDesdeRemoto(embarque.id, embarque.data, fechaObj);
          await EmbarquesOfflineService.save(snapshotOffline, { pendingSync: false, syncState: 'synced' });

          embarquesFiltrados.push({
            id: embarque.id,
            fecha: fechaObj,
            fechaISO: embarque.fechaISO,
            embarqueBloqueado: embarque.data.embarqueBloqueado || false,
            noEnviadoMexico: embarque.data.noEnviadoMexico || false,
            clientes: embarque.data.clientes || [],
            cargaCon: embarque.data.cargaCon || 'No especificado',
            camionNumero: embarque.data.camionNumero || 1,
          });
        }

        // Mezclar los embarques remotos con los que siguen pendientes en offline
        // para evitar que desaparezcan mientras no se han sincronizado.
        const pendientesOffline = await EmbarquesOfflineService.getAll();
        const listaPendientes = pendientesOffline
          .map(this.mapOfflineRecordToLista)
          .filter(Boolean);

        const mergedMap = new Map();
        // Priorizar datos offline (incluyen pendingSync) pero permitir que los remotos los reemplacen
        listaPendientes.forEach(emb => mergedMap.set(emb.id, emb));
        embarquesFiltrados.forEach(emb => mergedMap.set(emb.id, emb));

        const embarquesCombinados = Array.from(mergedMap.values())
          .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

        this.embarques = this.asignarCamionNumero(embarquesCombinados);
      } catch (error) {
        console.error('Error al cargar embarques:', error);
        if (this.embarques.length === 0) {
          this.error = 'Error al cargar los embarques. Por favor, intenta nuevamente.';
        } else {
          this.mostrarNotificacion = true;
          this.tipoNotificacion = 'warning';
          this.tituloNotificacion = 'Modo offline';
          this.mensajeNotificacion = 'Mostrando embarques guardados localmente.';
        }
      } finally {
        this.cargando = false;
      }
    },

    calcularKilosLimpios(embarque) {
      if (!embarque.clientes) return '0.0';
      
      let totalKilos = 0;
      
      embarque.clientes.forEach(cliente => {
        if (!cliente.productos) return;
        
        cliente.productos.forEach(producto => {
          if (producto.tipo === 'c/h20') {
            // Para productos c/h20, calcular con el valor neto
            const reporteTaras = producto.reporteTaras || [];
            const reporteBolsas = producto.reporteBolsas || [];
            let sumaTotalBolsas = 0;

            for (let i = 0; i < reporteTaras.length; i++) {
              const taras = parseInt(reporteTaras[i]) || 0;
              const bolsa = parseInt(reporteBolsas[i]) || 0;
              sumaTotalBolsas += taras * bolsa;
            }

            // Multiplicar por el valor neto (0.65 por defecto)
            const kilosReales = sumaTotalBolsas * (producto.camaronNeto || 0.65);
            totalKilos += kilosReales;
          } else {
            // Para otros productos, usar el cálculo estándar
            const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
            const sumaTarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
            const descuentoTaras = producto.restarTaras ? sumaTarasNormales * 3 : 0;
            totalKilos += (sumaKilos - descuentoTaras);
          }
        });
      });
      
      return totalKilos.toFixed(1);
    },

    calcularKilosCrudos(embarque) {
      if (!embarque.clientes) return '0.0';
      
      let totalKilosCrudos = 0;
      
      embarque.clientes.forEach(cliente => {
        if (!cliente.crudos || !Array.isArray(cliente.crudos)) return;
        
        cliente.crudos.forEach(crudo => {
          if (!crudo || !crudo.items || !Array.isArray(crudo.items)) return;
          
          crudo.items.forEach(item => {
            let kilosItem = 0;
            
            // Procesar taras principales
            if (item.taras) {
              const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
              if (formatoGuion) {
                const cantidad = parseInt(formatoGuion[1]) || 0;
                let medida = parseInt(formatoGuion[2]) || 0;
                
                // Si la medida es 19, sustituirla por 20 para el cálculo de ventas
                if (medida === 19) {
                  medida = 20;
                }
                
                kilosItem += cantidad * medida;
              } else {
                // Formato original si no coincide con el patrón
                const [cantidad, medida] = item.taras.split('-').map(Number);
                kilosItem += (cantidad || 0) * (medida || 0);
              }
            }
            
            // Procesar sobrantes
            if (item.sobrante) {
              const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
              if (formatoGuion) {
                const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
                let medidaSobrante = parseInt(formatoGuion[2]) || 0;
                
                // Si la medida es 19, sustituirla por 20 para el cálculo de ventas
                if (medidaSobrante === 19) {
                  medidaSobrante = 20;
                }
                
                kilosItem += cantidadSobrante * medidaSobrante;
              } else {
                // Formato original si no coincide con el patrón
                const [cantidadSobrante, medidaSobrante] = item.sobrante.split('-').map(Number);
                kilosItem += (cantidadSobrante || 0) * (medidaSobrante || 0);
              }
            }
            
            totalKilosCrudos += kilosItem;
          });
        });
      });
      
      return totalKilosCrudos.toFixed(1);
    },

    calcularTotalTaras(embarque) {
      if (!embarque.clientes) return 0;
      
      let totalTaras = 0;
      
      // Calcular taras de productos limpios
      embarque.clientes.forEach(cliente => {
        if (cliente.productos) {
          cliente.productos.forEach(producto => {
            const taras = Array.isArray(producto.taras) ? producto.taras : [];
            const tarasExtra = Array.isArray(producto.tarasExtra) ? producto.tarasExtra : [];
            const todasLasTaras = [...taras, ...tarasExtra];
            
            totalTaras += todasLasTaras.reduce((sum, tara) => {
              return sum + (parseInt(tara) || 0);
            }, 0);
          });
        }
        
        // Calcular taras de crudos
        if (cliente.crudos) {
          cliente.crudos.forEach(crudo => {
            if (crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach(item => {
                if (item.taras) {
                  const [cantidad] = item.taras.split('-');
                  totalTaras += parseInt(cantidad) || 0;
                }
                if (item.sobrante) {
                  const [cantidadSobrante] = item.sobrante.split('-');
                  totalTaras += parseInt(cantidadSobrante) || 0;
                }
              });
            }
          });
        }
      });
      
      return totalTaras;
    },

    formatearFecha(fecha) {
      if (!fecha) return 'Fecha no disponible';
      
      let fechaObj;
      if (fecha.toDate && typeof fecha.toDate === 'function') {
        fechaObj = fecha.toDate();
      } else if (fecha instanceof Date) {
        fechaObj = fecha;
      } else if (typeof fecha === 'string') {
        fechaObj = new Date(fecha);
      } else {
        return 'Fecha inválida';
      }
      
      // Ajustar para mostrar la fecha correcta (compensar diferencia horaria)
      const fechaAjustada = new Date(fechaObj.getTime() + fechaObj.getTimezoneOffset() * 60000);
      
      return fechaAjustada.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },

    editarEmbarque(embarqueId) {
      this.$router.push({ name: 'NuevoEmbarque', params: { id: embarqueId } });
    },

    regresarAMenu() {
      this.$router.push({ name: 'EmbarquesMenu' });
    },

    async toggleNoEnviadoMexico(embarqueId, estadoActual) {
      try {
        const nuevoEstado = !estadoActual;
        const mensaje = nuevoEstado 
          ? '¿Marcar este embarque como NO enviado a México?\n\nEsto significa que NO se contará en la suma de fletes.'
          : '¿Marcar este embarque como enviado a México?\n\nEsto significa que SÍ se contará en la suma de fletes.';
        
        if (confirm(mensaje)) {
          await EmbarquesOfflineService.init();
          
          // Actualizar el estado local primero para respuesta inmediata
          const embarque = this.embarques.find(e => e.id === embarqueId);
          if (embarque) {
            embarque.noEnviadoMexico = nuevoEstado;
          }
          
          if (!navigator.onLine) {
            // En modo offline, guardar en IndexedDB
            const record = await EmbarquesOfflineService.get(embarqueId);
            if (record) {
              record.noEnviadoMexico = nuevoEstado;
              if (record.docData) {
                record.docData.noEnviadoMexico = nuevoEstado;
              }
              await EmbarquesOfflineService.save(record, { pendingSync: true, syncState: 'pending' });
            }
            
            this.mostrarNotificacionRespaldo(
              'warning',
              '📡 Cambio guardado offline',
              'El cambio se sincronizará automáticamente cuando recuperes la conexión.'
            );
          } else {
            // En modo online, actualizar directamente en Firebase
            const db = getFirestore();
            const authStore = useAuthStore();
            const embarqueRef = doc(db, 'embarques', embarqueId);
            const embarqueDoc = await getDoc(embarqueRef);
            
            if (embarqueDoc.exists()) {
              const dataActual = embarqueDoc.data();
              const dataActualizada = {
                ...dataActual,
                noEnviadoMexico: nuevoEstado,
                ultimaEdicion: {
                  userId: authStore?.userId || 'unknown',
                  username: authStore?.user?.username || 'Usuario',
                  timestamp: serverTimestamp()
                }
              };
              
              await setDoc(embarqueRef, dataActualizada, { merge: false });
              
              // Actualizar en IndexedDB también
              const snapshotOffline = this.construirSnapshotOfflineDesdeRemoto(
                embarqueId, 
                dataActualizada, 
                embarqueDoc.data().fecha?.toDate ? embarqueDoc.data().fecha.toDate() : new Date(embarqueDoc.data().fecha)
              );
              await EmbarquesOfflineService.save(snapshotOffline, { pendingSync: false, syncState: 'synced' });
              
              this.mostrarNotificacionRespaldo(
                'success',
                '✅ Estado actualizado',
                nuevoEstado 
                  ? 'El embarque NO se contará para los fletes de México.'
                  : 'El embarque SÍ se contará para los fletes de México.'
              );
            }
          }
        }
      } catch (error) {
        console.error('[toggleNoEnviadoMexico] Error:', error);
        this.mostrarNotificacionRespaldo(
          'error',
          '❌ Error',
          'No se pudo actualizar el estado del embarque.'
        );
        
        // Revertir el cambio local en caso de error
        const embarque = this.embarques.find(e => e.id === embarqueId);
        if (embarque) {
          embarque.noEnviadoMexico = estadoActual;
        }
      }
    },
    
    async eliminarEmbarque(embarqueId) {
      // Encontrar el embarque por ID
      const embarque = this.embarques.find(e => e.id === embarqueId);
      
      // Verificar si el embarque está bloqueado
      if (embarque && embarque.embarqueBloqueado) {
        alert('Este embarque está bloqueado y no puede ser eliminado.');
        return;
      }
      
      if (confirm('¿Estás seguro de que quieres eliminar este embarque?\n\nSe creará un respaldo automático antes de eliminarlo.')) {
        try {
          console.log(`[ELIMINACIÓN MANUAL] Iniciando eliminación con respaldo para embarque ${embarqueId}`);

          await EmbarquesOfflineService.init();

          if (!navigator.onLine) {
            await EmbarquesOfflineService.markDeleted(embarqueId, { pendingSync: true, syncState: 'pending-delete' });
            this.embarques = this.embarques.filter(e => e.id !== embarqueId);
            this.mostrarNotificacionRespaldo(
              'warning',
              '🗑️ Eliminación en modo offline',
              'El embarque se marcará para eliminarse definitivamente cuando recuperes la conexión.'
            );
            return;
          }
          
          // PASO 1: Crear respaldo automático ANTES de eliminar
          try {
            await BackupService.crearRespaldoEmergencia(embarqueId, 'eliminacion_manual_usuario');
            console.log(`[RESPALDO MANUAL] Respaldo creado exitosamente para embarque ${embarqueId}`);
            
            // Mostrar notificación de respaldo exitoso
            this.mostrarNotificacionRespaldo(
              'success', 
              '💾 Respaldo creado', 
              'Se ha creado un respaldo de seguridad antes de eliminar el embarque'
            );
            
          } catch (respaldoError) {
            console.error(`[RESPALDO MANUAL] Error al crear respaldo:`, respaldoError);
            
            // Mostrar notificación de error en respaldo
            this.mostrarNotificacionRespaldo(
              'error', 
              '❌ Error en respaldo', 
              'No se pudo crear el respaldo de seguridad. El embarque NO será eliminado por seguridad.'
            );
            
            return; // NO eliminar si no se pudo respaldar
          }
          
          // PASO 2: Solo ahora eliminar el embarque (ya respaldado)
          const db = getFirestore();
          await deleteDoc(doc(db, 'embarques', embarqueId));
          await EmbarquesOfflineService.hardDelete(embarqueId);
          
          console.log(`[ELIMINACIÓN MANUAL] Embarque ${embarqueId} eliminado exitosamente`);
          
          // Mostrar notificación de eliminación exitosa
          this.mostrarNotificacionRespaldo(
            'success', 
            '✅ Embarque eliminado', 
            'El embarque fue eliminado exitosamente. Puedes recuperarlo desde la herramienta de emergencia si es necesario.'
          );
          
          await this.cargarEmbarques(); // Volver a cargar los embarques para reflejar la eliminación
          
        } catch (error) {
          console.error("[ELIMINACIÓN MANUAL] Error al eliminar el embarque:", error);
          
          // Mostrar notificación de error en eliminación
          this.mostrarNotificacionRespaldo(
            'error', 
            '❌ Error al eliminar', 
            'Hubo un error al eliminar el embarque. El respaldo fue creado exitosamente.'
          );
        }
      }
    },

    // Método para calcular el puntaje de completitud de un embarque
    calcularPuntajeCompletitud(embarqueData) {
      if (!embarqueData.clientes) return 0;
      
      let puntaje = 0;
      
      embarqueData.clientes.forEach(cliente => {
        // Puntos por productos
        if (cliente.productos && Array.isArray(cliente.productos)) {
          cliente.productos.forEach(producto => {
            // Producto básico vale 1 punto
            puntaje += 1;
            
            // Si tiene datos de taras/bolsas, vale más
            if (producto.reporteTaras && producto.reporteTaras.length > 0) {
              puntaje += 2;
            }
            
            // Si tiene reportes de bolsas, vale más
            if (producto.reporteBolsas && producto.reporteBolsas.length > 0) {
              puntaje += 2;
            }
            
            // Si tiene medida definida, vale más
            if (producto.medida && producto.medida.trim() !== '') {
              puntaje += 1;
            }
          });
        }
        
        // Puntos por crudos (valen más porque son más críticos)
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            puntaje += 3; // Los crudos valen más
            
            // Si tiene kilos definidos, vale extra
            if (crudo.kilos && parseFloat(crudo.kilos) > 0) {
              puntaje += 2;
            }
          });
        }
      });
      
      // Puntos extra por tener información general
      if (embarqueData.cargaCon && embarqueData.cargaCon.trim() !== '') {
        puntaje += 1;
      }
      
      console.log(`[PUNTAJE] Embarque calculado con puntaje: ${puntaje}`);
      return puntaje;
    },

    // Métodos para notificaciones de respaldo
    mostrarNotificacionRespaldo(tipo, titulo, mensaje) {
      this.tipoNotificacion = tipo;
      this.tituloNotificacion = titulo;
      this.mensajeNotificacion = mensaje;
      this.mostrarNotificacion = true;
    },

    cerrarNotificacion() {
      this.mostrarNotificacion = false;
    },

    // --- Generar PDF por fecha/cliente ---
    abrirModalGenerarPdfCliente() {
      this.modalGenerarPdf.error = '';
      this.modalGenerarPdf.fecha = obtenerFechaActualISO();
      this.modalGenerarPdf.embarqueId = '';
      this.modalGenerarPdf.clienteId = '';
      this.modalGenerarPdf.clientes = [];
      this.modalGenerarPdf.embarques = [];
      this.mostrarModalGenerarPdfCliente = true;
      this.cargarEmbarquesModalPdf();
    },

    async cargarEmbarquesModalPdf() {
      if (!this.modalGenerarPdf.fecha) {
        this.modalGenerarPdf.error = 'Selecciona una fecha para buscar embarques.';
        return;
      }

      this.modalGenerarPdf.cargando = true;
      this.modalGenerarPdf.error = '';

      try {
        const embarques = await this.buscarEmbarquesPorFecha(this.modalGenerarPdf.fecha);
        this.modalGenerarPdf.embarques = embarques;

        if (embarques.length > 0) {
          this.modalGenerarPdf.embarqueId = embarques[0].id;
          this.actualizarClientesModal();
        } else {
          this.modalGenerarPdf.embarqueId = '';
          this.modalGenerarPdf.clientes = [];
          this.modalGenerarPdf.clienteId = '';
          this.modalGenerarPdf.error = 'No se encontraron embarques para esa fecha.';
        }
      } catch (error) {
        console.error('[Modal PDF] Error al cargar embarques:', error);
        this.modalGenerarPdf.error = 'No se pudieron cargar los embarques. Intenta de nuevo.';
      } finally {
        this.modalGenerarPdf.cargando = false;
      }
    },

    async buscarEmbarquesPorFecha(fecha) {
      const fechaISO = this.normalizarFechaUTC(fecha);
      const coincidencias = new Map();

      try {
        await EmbarquesOfflineService.init();
        const registrosOffline = await EmbarquesOfflineService.getAll();
        registrosOffline.forEach(registro => {
          if (this.normalizarFechaUTC(registro.fecha) === fechaISO) {
            coincidencias.set(registro.id, this.normalizarEmbarqueParaModal(registro));
          }
        });
      } catch (error) {
        console.warn('[Modal PDF] No se pudo leer embarques offline:', error);
      }

      if (coincidencias.size === 0) {
        const db = getFirestore();
        const embarquesRef = collection(db, 'embarques');
        const snapshot = await getDocs(embarquesRef);
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const fechaDoc = data.fecha && typeof data.fecha.toDate === 'function'
            ? data.fecha.toDate()
            : data.fecha;

          if (this.normalizarFechaUTC(fechaDoc) === fechaISO) {
            coincidencias.set(docSnap.id, this.normalizarEmbarqueParaModal({ id: docSnap.id, ...data }));
          }
        });
      }

      return Array.from(coincidencias.values())
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    },

    normalizarEmbarqueParaModal(registro) {
      const fechaFuente = registro.fechaISO || (registro.fecha && registro.fecha.seconds
        ? new Date(registro.fecha.seconds * 1000)
        : registro.fecha);

      return {
        id: registro.id,
        fecha: this.normalizarFechaUTC(fechaFuente),
        cargaCon: registro.cargaCon || registro.docData?.cargaCon || '',
        camionNumero: registro.camionNumero || registro.docData?.camionNumero || 1,
        clientes: registro.clientes || registro.docData?.clientes || [],
        clientesJuntarMedidas: registro.clientesJuntarMedidas || registro.docData?.clientesJuntarMedidas || {},
        clientesReglaOtilio: registro.clientesReglaOtilio || registro.docData?.clientesReglaOtilio || {},
        clientesIncluirPrecios: registro.clientesIncluirPrecios || registro.docData?.clientesIncluirPrecios || {},
        clientesSumarKgCatarro: registro.clientesSumarKgCatarro || registro.docData?.clientesSumarKgCatarro || {},
        clientesCuentaEnPdf: registro.clientesCuentaEnPdf || registro.docData?.clientesCuentaEnPdf || {},
        productos: registro.productos || registro.docData?.productos || [],
        clienteCrudos: registro.clienteCrudos || registro.crudos || registro.docData?.clienteCrudos || {},
        kilosCrudos: registro.kilosCrudos || registro.docData?.kilosCrudos || {},
      };
    },

    actualizarClientesModal() {
      const embarqueSeleccionado = this.modalGenerarPdf.embarques.find(
        e => e.id === this.modalGenerarPdf.embarqueId
      );

      if (!embarqueSeleccionado) {
        this.modalGenerarPdf.clientes = [];
        this.modalGenerarPdf.clienteId = '';
        return;
      }

      let clientes = [];

      if (Array.isArray(embarqueSeleccionado.clientes) && embarqueSeleccionado.clientes.length) {
        clientes = embarqueSeleccionado.clientes
          .map(cliente => ({
            id: cliente.id?.toString(),
            nombre: cliente.nombre || cliente.nombreNotas || this.obtenerNombreCliente(cliente.id)
          }))
          .filter(c => c.id);
      } else if (Array.isArray(embarqueSeleccionado.productos)) {
        const mapa = new Map();
        embarqueSeleccionado.productos.forEach(producto => {
          const id = (producto.clienteId || producto.cliente || producto.idCliente || '').toString();
          if (!id || mapa.has(id)) return;
          mapa.set(id, {
            id,
            nombre: producto.nombreCliente || this.obtenerNombreCliente(id)
          });
        });
        clientes = Array.from(mapa.values());
      }

      this.modalGenerarPdf.clientes = clientes;

      if (clientes.length > 0) {
        this.modalGenerarPdf.clienteId = clientes[0].id;
      } else {
        this.modalGenerarPdf.clienteId = '';
      }
    },

    onCambioFechaModalPdf(fecha) {
      this.modalGenerarPdf.fecha = fecha;
      this.cargarEmbarquesModalPdf();
    },

    onSeleccionEmbarqueModal(embarqueId) {
      this.modalGenerarPdf.embarqueId = embarqueId;
      this.actualizarClientesModal();
    },

    cerrarModalGenerarPdfCliente() {
      this.mostrarModalGenerarPdfCliente = false;
      this.modalGenerarPdf = {
        fecha: '',
        embarques: [],
        embarqueId: '',
        clienteId: '',
        clientes: [],
        cargando: false,
        error: ''
      };
    },

    async generarPdfDesdeModal() {
      if (!this.modalGenerarPdf.embarqueId || !this.modalGenerarPdf.clienteId) {
        this.modalGenerarPdf.error = 'Selecciona un embarque y un cliente para continuar.';
        return;
      }

      const clienteId = this.modalGenerarPdf.clienteId.toString();
      const embarqueSeleccionado = this.modalGenerarPdf.embarques.find(
        e => e.id === this.modalGenerarPdf.embarqueId
      );

      if (!embarqueSeleccionado) {
        this.modalGenerarPdf.error = 'No se encontró el embarque seleccionado.';
        return;
      }

      const clienteGuardado = Array.isArray(embarqueSeleccionado.clientes)
        ? embarqueSeleccionado.clientes.find(c => c.id?.toString() === clienteId)
        : null;

      const productosCliente = clienteGuardado?.productos
        || (embarqueSeleccionado.productos || []).filter(
          producto => (producto.clienteId || '').toString() === clienteId
        );

      if (!productosCliente || productosCliente.length === 0) {
        this.modalGenerarPdf.error = 'El embarque seleccionado no tiene productos para ese cliente.';
        return;
      }

      const crudosCliente = clienteGuardado?.crudos
        || embarqueSeleccionado.clienteCrudos?.[clienteId]
        || embarqueSeleccionado.crudos?.[clienteId]
        || [];

      const embarqueCliente = {
        fecha: embarqueSeleccionado.fecha,
        cargaCon: embarqueSeleccionado.cargaCon,
        productos: productosCliente,
        clienteCrudos: { [clienteId]: crudosCliente },
        kilosCrudos: embarqueSeleccionado.kilosCrudos || {}
      };

      const clientesLista = (Array.isArray(embarqueSeleccionado.clientes) && embarqueSeleccionado.clientes.length)
        ? embarqueSeleccionado.clientes.map(c => ({
            id: c.id,
            nombre: c.nombre || c.nombreNotas || this.obtenerNombreCliente(c.id),
            nombreNotas: c.nombreNotas
          }))
        : [];

      this.modalGenerarPdf.error = '';
      try {
        await generarNotaVentaPDF(
          embarqueCliente,
          clientesLista,
          embarqueSeleccionado.clientesJuntarMedidas || {},
          embarqueSeleccionado.clientesReglaOtilio || {},
          embarqueSeleccionado.clientesIncluirPrecios || {},
          embarqueSeleccionado.clientesSumarKgCatarro || {},
          embarqueSeleccionado.clientesCuentaEnPdf || {}
        );
        this.cerrarModalGenerarPdfCliente();
      } catch (error) {
        console.error('[Modal PDF] Error al generar PDF:', error);
        this.modalGenerarPdf.error = 'No se pudo generar el PDF. Intenta de nuevo.';
      }
    },

    normalizarFechaUTC(fecha) {
      if (!fecha) return obtenerFechaActualISO();
      if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
      }
      try {
        const dateObj = fecha instanceof Date ? fecha : new Date(fecha);
        if (Number.isNaN(dateObj.getTime())) {
          return obtenerFechaActualISO();
        }
        return dateObj.toISOString().slice(0, 10);
      } catch (error) {
        console.warn('[Modal PDF] Fecha inválida recibida:', fecha, error);
        return obtenerFechaActualISO();
      }
    },

    obtenerNombreCliente(id) {
      if (!id) return 'Cliente';
      const cliente = this.embarques
        .flatMap(e => e.clientes || [])
        .find(c => c.id?.toString() === id.toString());
      return cliente?.nombre || cliente?.nombreNotas || 'Cliente';
    }
  },

  async mounted() {
    await this.cargarEmbarques();
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono&display=swap');

/* Variables de colores Matrix/Terminal */
.lista-embarques {
  --matrix-green: #00ff41;
  --matrix-green-dark: #008f11;
  --matrix-green-glow: #00ff4180;
  --matrix-green-dim: #00ff4130;
  --terminal-bg: #0a0a0a;
  --terminal-border: #00ff4140;
  --amber: #ffb000;
  --amber-glow: #ffb00080;
  --red-alert: #ff0040;
  --cyan: #00d4ff;
}

.lista-embarques {
  min-height: 100vh;
  background: var(--terminal-bg);
  padding: 20px;
  font-family: 'VT323', 'Share Tech Mono', monospace;
  color: var(--matrix-green);
}

/* Terminal Window */
.terminal-window {
  background: rgba(0, 20, 0, 0.95);
  border: 2px solid var(--matrix-green);
  margin-bottom: 25px;
  box-shadow: 
    0 0 30px var(--matrix-green-glow),
    inset 0 0 60px rgba(0, 255, 65, 0.03);
}

.terminal-header {
  background: linear-gradient(90deg, #001a00 0%, #002200 100%);
  padding: 10px 15px;
  border-bottom: 1px solid var(--matrix-green);
  display: flex;
  align-items: center;
  gap: 15px;
}

.terminal-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.dot.red { background: #ff5f56; box-shadow: 0 0 8px #ff5f56; }
.dot.yellow { background: #ffbd2e; box-shadow: 0 0 8px #ffbd2e; }
.dot.green { background: var(--matrix-green); box-shadow: 0 0 8px var(--matrix-green); }

.terminal-title {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.95rem;
  color: var(--matrix-green);
  text-shadow: 0 0 10px var(--matrix-green);
  letter-spacing: 2px;
}

/* Header Section */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px;
  flex-wrap: wrap;
  gap: 20px;
}

.header-content {
  flex: 1;
}

.ascii-title {
  color: var(--matrix-green);
  font-family: 'VT323', monospace;
  font-size: 1rem;
  line-height: 1.3;
  margin: 0 0 15px 0;
  text-shadow: 0 0 10px var(--matrix-green-glow);
  white-space: pre;
}

.subtitle {
  font-family: 'Share Tech Mono', monospace;
  font-size: 1.1rem;
  margin: 0;
  color: var(--amber);
  text-shadow: 0 0 10px var(--amber-glow);
}

.prompt {
  color: var(--matrix-green);
  margin-right: 8px;
}

.header-actions {
  display: flex;
  gap: 15px;
}

.btn-refresh {
  background: transparent;
  color: var(--matrix-green);
  border: 2px solid var(--matrix-green);
  padding: 12px 24px;
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.btn-refresh:hover {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 20px var(--matrix-green-glow);
}

.btn-icon {
  font-size: 1.3rem;
}

/* Estados de carga y error */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: rgba(0, 20, 0, 0.8);
  border: 2px solid var(--matrix-green);
  text-align: center;
}

.loading-terminal {
  text-align: center;
}

.loading-text {
  font-family: 'VT323', monospace;
  font-size: 1.8rem;
  color: var(--matrix-green);
  text-shadow: 0 0 15px var(--matrix-green);
  animation: loading-pulse 1s ease-in-out infinite;
  display: block;
  margin-bottom: 15px;
}

@keyframes loading-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.loading-message {
  font-size: 1.1rem;
  color: var(--amber);
  margin: 0;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: rgba(40, 0, 0, 0.9);
  border: 2px solid var(--red-alert);
  text-align: center;
  box-shadow: 0 0 30px rgba(255, 0, 64, 0.3);
}

.error-ascii {
  color: var(--red-alert);
  font-family: 'VT323', monospace;
  font-size: 0.9rem;
  margin: 0 0 20px 0;
  text-shadow: 0 0 10px var(--red-alert);
  white-space: pre;
}

.error-message {
  color: var(--red-alert);
  font-size: 1.2rem;
  margin: 0 0 20px 0;
}

.btn-retry {
  background: transparent;
  color: var(--red-alert);
  border: 2px solid var(--red-alert);
  padding: 12px 24px;
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
}

.btn-retry:hover {
  background: var(--red-alert);
  color: var(--terminal-bg);
  box-shadow: 0 0 20px rgba(255, 0, 64, 0.5);
}

/* Container principal */
.embarques-container {
  max-width: 1400px;
  margin: 0 auto;
}

.embarques-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

/* Cards de embarques */
.embarque-card {
  background: rgba(0, 20, 0, 0.9);
  border: 1px solid var(--matrix-green);
  padding: 0;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.embarque-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--matrix-green);
  box-shadow: 0 0 10px var(--matrix-green);
}

.embarque-card:hover {
  box-shadow: 
    0 0 30px var(--matrix-green-glow),
    inset 0 0 30px rgba(0, 255, 65, 0.05);
  border-color: var(--matrix-green);
}

.card-blocked {
  border-color: var(--red-alert);
}

.card-blocked::before {
  background: var(--red-alert);
  box-shadow: 0 0 10px var(--red-alert);
}

.card-no-mexico {
  border-color: var(--amber);
}

.card-no-mexico::before {
  background: var(--amber);
  box-shadow: 0 0 10px var(--amber);
}

/* Header de la card */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: rgba(0, 40, 0, 0.5);
  border-bottom: 1px solid var(--matrix-green-dim);
  flex-wrap: wrap;
  gap: 10px;
}

.record-id {
  font-family: 'VT323', monospace;
  font-size: 1rem;
  color: var(--cyan);
  text-shadow: 0 0 10px var(--cyan);
}

.fecha-section {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 176, 0, 0.1);
  padding: 6px 14px;
  border: 1px solid var(--amber);
  border-radius: 2px;
}

.fecha-label {
  font-size: 1.1rem;
  color: var(--amber);
  opacity: 0.9;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.fecha-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: #ffcc00;
  text-shadow: 
    0 0 10px var(--amber),
    0 0 20px var(--amber-glow),
    0 0 30px rgba(255, 176, 0, 0.3);
  letter-spacing: 2px;
  animation: fecha-glow 2s ease-in-out infinite alternate;
}

.camion-badge {
  font-size: 1rem;
  color: var(--matrix-green);
  background: rgba(0, 255, 0, 0.08);
  border: 1px solid var(--matrix-green-dim);
  padding: 2px 6px;
  border-radius: 2px;
  letter-spacing: 1px;
}

@keyframes fecha-glow {
  from {
    text-shadow: 
      0 0 10px var(--amber),
      0 0 20px var(--amber-glow);
  }
  to {
    text-shadow: 
      0 0 15px var(--amber),
      0 0 30px var(--amber-glow),
      0 0 40px rgba(255, 176, 0, 0.4);
  }
}

.status-section {
  display: flex;
  align-items: center;
}

.status-badge {
  padding: 5px 12px;
  font-family: 'VT323', monospace;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 6px;
  letter-spacing: 1px;
}

.status-active {
  color: var(--matrix-green);
  border: 1px solid var(--matrix-green);
  text-shadow: 0 0 8px var(--matrix-green);
}

.status-active .status-icon {
  animation: pulse-dot 1s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.status-locked {
  color: var(--red-alert);
  border: 1px solid var(--red-alert);
  text-shadow: 0 0 8px var(--red-alert);
}

.status-warning {
  color: var(--amber);
  border: 1px solid var(--amber);
  text-shadow: 0 0 8px var(--amber);
}

/* Contenido principal */
.card-content {
  padding: 15px 20px;
}

.data-separator {
  color: var(--matrix-green);
  opacity: 0.4;
  font-size: 1.1rem;
  margin: 12px 0;
  text-align: center;
  letter-spacing: 2px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 15px 0;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: rgba(0, 255, 65, 0.05);
  border-left: 3px solid var(--matrix-green-dim);
  transition: all 0.2s ease;
}

.stat-item:hover {
  background: rgba(0, 255, 65, 0.1);
  border-left-color: var(--matrix-green);
}

.stat-highlight {
  background: rgba(0, 255, 65, 0.1);
  border-left-color: var(--matrix-green);
}

.stat-highlight .stat-value {
  color: var(--matrix-green);
  text-shadow: 0 0 15px var(--matrix-green);
  font-size: 2rem;
}

.stat-label {
  font-size: 1.3rem;
  color: var(--matrix-green);
  opacity: 0.8;
  letter-spacing: 1px;
}

.stat-value {
  font-size: 1.6rem;
  color: var(--matrix-green);
  text-shadow: 0 0 8px var(--matrix-green-glow);
  font-weight: 400;
}

.additional-info {
  padding: 16px;
  background: rgba(0, 255, 65, 0.03);
  border: 1px dashed var(--matrix-green-dim);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 1.4rem;
}

.info-label {
  color: var(--amber);
  font-size: 1.3rem;
}

.info-value {
  color: var(--matrix-green);
  opacity: 0.9;
  font-size: 1.4rem;
}

/* Acciones */
.card-actions {
  display: flex;
  gap: 8px;
  padding: 15px 20px;
  background: rgba(0, 30, 0, 0.5);
  border-top: 1px solid var(--matrix-green-dim);
}

.btn-action {
  flex: 1;
  padding: 10px 15px;
  background: transparent;
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
  font-family: 'VT323', monospace;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.btn-action:hover {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 15px var(--matrix-green-glow);
}

.btn-edit {
  border-color: var(--cyan);
  color: var(--cyan);
}

.btn-edit:hover {
  background: var(--cyan);
  color: var(--terminal-bg);
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
}

.btn-delete {
  border-color: var(--red-alert);
  color: var(--red-alert);
}

.btn-delete:hover:not(.btn-disabled) {
  background: var(--red-alert);
  color: var(--terminal-bg);
  box-shadow: 0 0 15px rgba(255, 0, 64, 0.5);
}

.btn-mexico {
  border-color: var(--matrix-green);
  color: var(--matrix-green);
}

.btn-mexico-active {
  border-color: var(--amber) !important;
  color: var(--amber) !important;
}

.btn-mexico-active:hover {
  background: var(--amber) !important;
  color: var(--terminal-bg) !important;
  box-shadow: 0 0 15px var(--amber-glow) !important;
}

.btn-disabled {
  border-color: #333 !important;
  color: #444 !important;
  cursor: not-allowed !important;
  opacity: 0.5;
}

.btn-disabled:hover {
  background: transparent !important;
  box-shadow: none !important;
  color: #444 !important;
}

/* Estado vacío */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: rgba(0, 20, 0, 0.8);
  border: 2px solid var(--matrix-green);
  text-align: center;
}

.empty-ascii {
  color: var(--matrix-green);
  font-family: 'VT323', monospace;
  font-size: 0.9rem;
  margin: 0 0 20px 0;
  text-shadow: 0 0 10px var(--matrix-green-glow);
  white-space: pre;
  opacity: 0.8;
}

.empty-message {
  font-size: 1.2rem;
  color: var(--amber);
  margin: 0 0 25px 0;
}

.btn-create {
  background: transparent;
  color: var(--matrix-green);
  border: 2px solid var(--matrix-green);
  padding: 15px 30px;
  font-family: 'VT323', monospace;
  font-size: 1.3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  letter-spacing: 2px;
}

.btn-create:hover {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 25px var(--matrix-green-glow);
}

/* Responsive */
/* Galaxy Z Fold abierto y tablets pequeñas (500px - 900px) - 2 columnas */
@media (min-width: 500px) and (max-width: 900px) {
  .lista-embarques {
    padding: 12px;
  }

  .header-section {
    padding: 15px;
    gap: 15px;
  }

  .ascii-title {
    font-size: 0.85rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .embarques-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .embarque-card {
    font-size: 0.9rem;
  }

  .stat-item {
    padding: 10px 12px;
  }

  .stat-label {
    font-size: 1.1rem;
  }

  .stat-value {
    font-size: 1.3rem;
  }

  .stat-highlight .stat-value {
    font-size: 1.5rem;
  }

  .card-header {
    padding: 10px 15px;
  }

  .fecha-section {
    padding: 4px 10px;
  }

  .fecha-value {
    font-size: 1.4rem;
  }

  .fecha-label {
    font-size: 0.9rem;
  }

  .card-content {
    padding: 10px 15px;
  }

  .card-actions {
    padding: 10px 15px;
    flex-wrap: wrap;
  }

  .btn-action {
    flex: 1 1 auto;
    min-width: 60px;
    padding: 8px 10px;
    font-size: 1rem;
  }

  .additional-info {
    font-size: 1.2rem;
    padding: 12px;
  }

  .info-label, .info-value {
    font-size: 1.1rem;
  }

  .data-separator {
    font-size: 0.9rem;
    margin: 8px 0;
  }
}

/* Tablets y pantallas más pequeñas (hasta 768px pero no Z Fold) */
@media (max-width: 499px) {
  .lista-embarques {
    padding: 15px;
  }

  .header-section {
    flex-direction: column;
    text-align: center;
    padding: 20px 15px;
  }

  .ascii-title {
    font-size: 0.75rem;
    transform: scale(0.9);
  }

  .embarques-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .card-actions {
    flex-direction: column;
    gap: 8px;
  }

  .card-header {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }

  .fecha-section {
    padding: 6px 16px;
    justify-content: center;
  }

  .fecha-value {
    font-size: 1.6rem;
  }
}

@media (max-width: 480px) {
  .lista-embarques {
    padding: 10px;
  }

  .terminal-header {
    padding: 8px 12px;
  }

  .terminal-title {
    font-size: 0.8rem;
    letter-spacing: 1px;
  }

  .ascii-title {
    font-size: 0.6rem;
    transform: scale(0.85);
  }

  .subtitle {
    font-size: 0.95rem;
  }

  .btn-refresh {
    padding: 10px 18px;
    font-size: 1rem;
  }

  .fecha-section {
    padding: 5px 12px;
  }

  .fecha-value {
    font-size: 1.5rem;
    letter-spacing: 1px;
  }

  .fecha-label {
    font-size: 0.9rem;
  }

  .card-content {
    padding: 12px 15px;
  }

  .card-actions {
    padding: 12px 15px;
  }

  .btn-action {
    padding: 8px 12px;
    font-size: 1rem;
  }

  .stat-item {
    padding: 12px 14px;
  }

  .stat-label {
    font-size: 1.1rem;
  }
  
  .stat-value {
    font-size: 1.3rem;
  }

  .stat-highlight .stat-value {
    font-size: 1.5rem;
  }

  .info-label, .info-value {
    font-size: 1.1rem;
  }
}
</style>
