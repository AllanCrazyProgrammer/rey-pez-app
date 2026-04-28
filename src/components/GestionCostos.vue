<template>
  <div class="gestion-costos-container">
    <div class="hero-costos">
      <div class="hero-actions">
        <button @click="volverAEmbarque" class="btn-volver">
          <i class="fas fa-arrow-left"></i> Volver al Embarque
        </button>
        <button @click="volverARendimientos" class="btn-rendimientos">
          <i class="fas fa-chart-line"></i> Volver a Rendimientos
        </button>
      </div>
      <div class="hero-copy">
        <span class="eyebrow">Catálogo de medidas</span>
        <h2>Gestión de Costos</h2>
        <p>Actualiza costos por medida y proveedor sin salir del flujo del embarque.</p>
      </div>
      <button @click="abrirModalNuevoCosto" class="btn-nuevo-costo">
        <i class="fas fa-plus"></i> Nueva Medida
      </button>
    </div>

    <div class="resumen-costos">
      <div class="resumen-card">
        <span>Registros activos</span>
        <strong>{{ costosActivosLista.length }}</strong>
      </div>
      <div class="resumen-card">
        <span>Limpios</span>
        <strong>{{ medidasLimpiosVisibles.length }}</strong>
      </div>
      <div class="resumen-card">
        <span>Crudos</span>
        <strong>{{ medidasCrudosVisibles.length }}</strong>
      </div>
      <div class="resumen-card">
        <span>Archivados</span>
        <strong>{{ costosArchivadosLista.length }}</strong>
      </div>
    </div>

    <!-- Sección de medidas registradas -->
    <div class="costos-section">
      <div class="section-title-row">
        <div>
          <h3>Medidas Registradas</h3>
          <p>Registra costos por medida, proveedor y tipo.</p>
        </div>
        <div class="filtros-costos">
          <input
            v-model="filtrosCostos.busqueda"
            class="input-filtro"
            type="search"
            placeholder="Buscar medida o proveedor"
            aria-label="Buscar medida o proveedor"
          >
          <select v-model="filtrosCostos.proveedor" class="input-filtro" aria-label="Filtrar por proveedor">
            <option value="">Todos los proveedores</option>
            <option value="__sin_proveedor__">Sin proveedor</option>
            <option
              v-for="proveedor in proveedoresRegistradosOrdenados"
              :key="proveedor"
              :value="proveedor"
            >
              {{ proveedor }}
            </option>
          </select>
        </div>
      </div>

      <div class="tabs-bar">
        <button
          class="tab-btn"
          :class="{ activo: tabRegistradas === 'limpios' }"
          @click="tabRegistradas = 'limpios'"
        >
          <i class="fas fa-fish"></i> Limpios
          <span class="tab-count">{{ costosRegistradosFiltradosLimpios.length }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ activo: tabRegistradas === 'crudos' }"
          @click="tabRegistradas = 'crudos'"
        >
          <i class="fas fa-shrimp"></i> Crudos
          <span class="tab-count">{{ costosRegistradosFiltradosCrudos.length }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ activo: tabRegistradas === 'archivadas' }"
          @click="tabRegistradas = 'archivadas'"
        >
          <i class="fas fa-archive"></i> Archivadas
          <span class="tab-count">{{ costosArchivadosFiltrados.length }}</span>
        </button>
      </div>
      <div class="costos-grid">
        <div
          v-for="grupo in medidasAgrupadasTabActual"
          :key="grupo.medidaKey"
          class="costo-card"
          :class="{ 'costo-card-crudo': grupo.tipoCosto === 'crudo' }"
        >
          <div class="costo-header">
            <h4>{{ grupo.medida }}</h4>
            <div class="costo-actions">
              <button @click="abrirModalNuevoCostoParaMedida(grupo.medida, grupo.tipoCosto)" class="btn-historial" title="Agregar proveedor">
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>

          <div class="proveedores-lista">
            <div
              v-for="costoInfo in grupo.proveedores"
              :key="costoInfo.costoKey"
              class="proveedor-row"
              :class="{ activo: costoInfo.costoKey === proveedorActivoPorMedida[grupo.medidaKey], archivada: costoInfo.archivado }"
              @click="!costoInfo.archivado && seleccionarProveedorActivo(grupo.medidaKey, costoInfo.costoKey)"
            >
              <div class="proveedor-row-radio">
                <input
                  v-if="!costoInfo.archivado"
                  type="radio"
                  :name="`activo-${grupo.medidaKey}`"
                  :value="costoInfo.costoKey"
                  :checked="costoInfo.costoKey === proveedorActivoPorMedida[grupo.medidaKey]"
                  @click.stop="seleccionarProveedorActivo(grupo.medidaKey, costoInfo.costoKey)"
                >
                <i v-else class="fas fa-archive proveedor-row-archived-icon"></i>
              </div>
              <div class="proveedor-row-info">
                <span class="proveedor-row-nombre">{{ costoInfo.proveedorNombre || 'Sin proveedor' }}</span>
                <span class="proveedor-row-costo">${{ Number(costoInfo.costoBase).toFixed(2) }}</span>
                <span class="proveedor-row-fecha">{{ formatearFecha(costoInfo.fecha) }}</span>
              </div>
              <div class="proveedor-row-actions" @click.stop>
                <button @click="editarCosto(costoInfo)" class="btn-mini" title="Editar"><i class="fas fa-edit"></i></button>
                <button @click="verHistorial(costoInfo)" class="btn-mini" title="Historial"><i class="fas fa-history"></i></button>
                <button v-if="!costoInfo.archivado" @click="archivarMedida(costoInfo)" class="btn-mini btn-mini-muted" title="Archivar"><i class="fas fa-archive"></i></button>
                <button v-else @click="restaurarMedida(costoInfo)" class="btn-mini btn-mini-green" title="Restaurar"><i class="fas fa-box-open"></i></button>
                <button @click="eliminarMedida(costoInfo)" class="btn-mini btn-mini-danger" title="Eliminar"><i class="fas fa-trash"></i></button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="medidasAgrupadasTabActual.length === 0" class="empty-state">
          <i :class="tabRegistradas === 'archivadas' ? 'fas fa-archive' : 'fas fa-search'"></i>
          <p v-if="tabRegistradas === 'archivadas'">No hay medidas archivadas.</p>
          <p v-else-if="tabRegistradas === 'crudos'">No hay medidas de crudos registradas.</p>
          <p v-else>No hay medidas de limpios que coincidan.</p>
        </div>
      </div>
    </div>

    <!-- Sección de medidas del embarque con tabs -->
    <div class="medidas-embarque-section" v-if="embarqueData">
      <div class="seccion-header">
        <h3>Medidas del Embarque</h3>
        <div class="seccion-header-actions">
          <button @click="sincronizarCostos" class="btn-sincronizar" title="Sincronizar costos">
            <i class="fas fa-sync-alt"></i> Sincronizar
          </button>
          <button @click="sugerirCrearMedidasFaltantes" class="btn-crear-medidas" title="Crear medidas faltantes">
            <i class="fas fa-plus-circle"></i> Crear Faltantes
          </button>
        </div>
      </div>

      <div class="tabs-bar">
        <button class="tab-btn" :class="{ activo: tabEmbarque === 'limpios' }" @click="tabEmbarque = 'limpios'">
          <i class="fas fa-fish"></i> Limpios
          <span class="tab-count">{{ medidasLimpiosVisibles.length }}</span>
        </button>
        <button class="tab-btn tab-btn-crudo" :class="{ activo: tabEmbarque === 'crudos' }" @click="tabEmbarque = 'crudos'">
          <i class="fas fa-shrimp"></i> Crudos
          <span class="tab-count">{{ medidasCrudosVisibles.length }}</span>
        </button>
      </div>

      <div v-if="tabEmbarque === 'limpios'" class="costo-extra-section">
        <label for="costoExtra">Costo Extra:</label>
        <input 
          type="number" 
          id="costoExtra"
          v-model="costoExtra" 
          @input="guardarCostoExtraDebounced"
          min="0"
          step="0.01"
          placeholder="18"
          class="input-costo-extra"
        >
        <span class="input-help">Se suma al cálculo del costo final</span>
      </div>

      <div class="medidas-grid">
        <div
          v-for="medida in medidasEmbarqueTabActual"
          :key="`emb-${tabEmbarque}-${medida}`"
          class="medida-card"
          :class="{ 'medida-card-crudo': tabEmbarque === 'crudos' }"
        >
          <div class="medida-header">
            <h4>{{ medida }}</h4>
            <div class="medida-actions">
              <label class="checkbox-container">
                <input 
                  type="checkbox" 
                  v-model="medidaSeleccionada[medida]"
                  @change="guardarSeleccionMedidas"
                >
                <span class="checkmark"></span>
                Mostrar en PDF
              </label>
              <label v-if="tabEmbarque === 'limpios'" class="checkbox-container">
                <input 
                  type="checkbox" 
                  v-model="aplicarCostoExtra[medida]"
                  @change="guardarConfiguracionCostoExtra"
                >
                <span class="checkmark"></span>
                Aplicar costo extra
              </label>
            </div>
          </div>
          <div class="medida-info">
            <div class="costo-container">
              <div class="costo-valor">
                <div class="costo-display" @click="editarCostoEmbarque(medida)" :class="{ 'clickeable': true, 'costo-especifico': tieneCostoEspecifico(medida) }">
                  <strong>Costo:</strong> 
                  <span class="costo-amount">${{ costosActuales[medida] || '0.00' }}</span>
                  <span v-if="tieneCostoEspecifico(medida)" class="badge-especifico">Manual</span>
                  <i class="fas fa-edit costo-edit-icon"></i>
                </div>
                <div class="costo-origen">
                  <span v-if="tieneCostoEspecifico(medida)" class="costo-especifico">
                    <i class="fas fa-ship"></i> Costo manual del embarque
                    <button @click.stop="limpiarCostoEspecifico(medida)" class="btn-limpiar-costo" title="Volver al costo global">
                      <i class="fas fa-times"></i>
                    </button>
                  </span>
                  <span v-else-if="encontrarCostoParaMedida(medida)" class="costo-global">
                    <i class="fas fa-globe"></i> {{ describirOrigenCosto(medida) }}
                  </span>
                  <span v-else class="sin-costo">
                    <i class="fas fa-exclamation-triangle"></i> Sin costo asignado
                  </span>
                </div>
              </div>
              <div v-if="tabEmbarque === 'limpios' && (tieneCostoEspecifico(medida) || encontrarCostoParaMedida(medida)) && rendimientos[medida]" class="costo-calculado">
                <strong>Costo Final: ${{ calcularCostoFinal(medida) }}</strong>
                <span v-if="aplicarCostoExtra[medida]" class="costo-extra-indicator">
                  (+ ${{ costoExtra }} extra)
                </span>
              </div>
            </div>
            <p v-if="rendimientos[medida]">
              <strong>Rendimiento:</strong> {{ rendimientos[medida].toFixed(2) }}
            </p>
          </div>
        </div>
        <div v-if="medidasEmbarqueTabActual.length === 0" class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>No hay medidas de {{ tabEmbarque }} en este embarque.</p>
        </div>
      </div>
    </div>

         <!-- Modales para gestión de costos -->
    <CostoProveedorModal
      :mostrar="mostrarModalCostoProveedor"
      :registro="costoProveedorEditando"
      :esEdicion="modoEdicionCostoProveedor"
      @cerrar="cerrarModalCostoProveedor"
      @guardar="guardarCostoProveedor"
    />
    
    <CostoModal
      :mostrar="mostrarModalCostoEmbarque"
      :costo="costoEmbarqueEditando.costo"
      :medida="costoEmbarqueEditando.medida"
      :esNuevo="false"
      :esCostoEmbarque="true"
      @cerrar="cerrarModalCostoEmbarque"
      @guardar="guardarCostoEmbarque"
    />

    <!-- Modal para historial de costos -->
    <div v-if="mostrarModalHistorial" class="modal-overlay">
      <div class="modal-content modal-historial">
        <h3>Historial de Costos - {{ medidaSeleccionadaHistorial }}</h3>
        <div class="historial-container">
          <div v-if="cargandoHistorial" class="loading-historial">
            <p><i class="fas fa-spinner fa-spin"></i> Cargando historial...</p>
          </div>
          <div v-else-if="historialCostos.length === 0" class="no-historial">
            <p>No hay historial de costos para esta medida.</p>
          </div>
          <div v-else class="historial-list">
                        <div v-for="entrada in historialCostos" :key="entrada.id" class="historial-item" :class="{ eliminado: entrada.eliminado, restaurado: entrada.restaurado, medidaEliminada: entrada.medidaEliminada, nuevo: entrada.nuevo }">
              <div class="historial-info">
                <div class="historial-costo">
                  <strong>${{ entrada.costoBase.toFixed(2) }}</strong>
                  <span v-if="entrada.eliminado" class="estado-badge eliminado">Eliminado</span>
                  <span v-if="entrada.restaurado" class="estado-badge restaurado">Restaurado</span>
                  <span v-if="entrada.medidaEliminada" class="estado-badge medida-eliminada">Medida Eliminada</span>
                  <span v-if="entrada.nuevo" class="estado-badge nuevo">Nueva Medida</span>
                </div>
                <div class="historial-fecha">
                  {{ formatearFechaCompleta(entrada.fecha) }}
                </div>
                <div class="historial-proveedor">
                  Proveedor: {{ entrada.proveedorNombre || 'Sin proveedor' }}
                </div>
                <div v-if="entrada.observacion" class="historial-observacion">
                  <em>{{ entrada.observacion }}</em>
                </div>
              </div>
              <div class="historial-actions">
                <button @click="eliminarEntradaHistorial(entrada)" class="btn-eliminar-entrada" :title="'Eliminar esta entrada del historial'">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-buttons">
          <button @click="cerrarModalHistorial" class="btn-cancelar">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getFirestore, doc, getDoc, updateDoc, collection, onSnapshot, addDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { debounce } from 'lodash';
import CostoModal from './CostoModal.vue';
import CostoProveedorModal from './CostoProveedorModal.vue';
import { formatearFecha } from '@/utils/formatters';

export default {
  name: 'GestionCostos',
  
  components: {
    CostoModal,
    CostoProveedorModal
  },
  
  data() {
    return {
      embarqueData: null,
      medidasEmbarque: [],
      medidasLimpios: [],
      medidasCrudos: [],
      costosRegistrados: {},
      costosRegistradosPorFecha: {},
      costosEmbarque: {},
      costosEmbarqueManuales: {},
      filtrosCostos: {
        busqueda: '',
        proveedor: ''
      },
      tabRegistradas: 'limpios',
      tabEmbarque: 'limpios',
      proveedorActivoPorMedida: {},
      medidaSeleccionada: {},
      medidaOculta: {}, // Para el sistema de ocultación en PDF
      aplicarCostoExtra: {}, // Para controlar a qué medidas aplicar costo extra
      rendimientos: {},
      costoExtra: 18, // Valor por defecto
      mostrarModalCostoProveedor: false,
      modoEdicionCostoProveedor: false,
      mostrarModalCostoEmbarque: false,
      mostrarModalHistorial: false,
      medidaSeleccionadaHistorial: '',
      historialCostos: [],
      cargandoHistorial: false,
      costoProveedorEditando: {
        medida: '',
        costo: 0,
        costoAnterior: null,
        fecha: '',
        proveedorId: '',
        proveedorNombre: '',
        tipoCosto: 'limpio',
        costoKey: ''
      },
      costoEmbarqueEditando: {
        medida: '',
        costo: 0
      },
      unsubscribePreciosGlobales: null,
      guardarCostoExtraDebounced: null
    }
  },

  async created() {
    console.log('[GestionCostos] Componente creado, iniciando carga...');
    await this.cargarEmbarque();
    await this.iniciarEscuchaPreciosGlobales();
    // Aplicar debounce al método guardarCostoExtra
    this.guardarCostoExtraDebounced = debounce(this.guardarCostoExtra, 500);
    console.log('[GestionCostos] Inicialización completa');
  },

  methods: {
    formatearFecha,
    normalizarProveedor(proveedor) {
      return (proveedor || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
    },

    obtenerProveedorNombre(entrada = {}) {
      return entrada.proveedorNombre || entrada.proveedor || '';
    },

    generarCostoKey(medida, proveedorNombre = '') {
      const medidaNormalizada = this.normalizarMedida(medida);
      const proveedorNormalizado = this.normalizarProveedor(proveedorNombre) || 'sin-proveedor';
      return `${medidaNormalizada}__${proveedorNormalizado}`;
    },

    hidratarEntradaCosto(entrada) {
      const proveedorNombre = this.obtenerProveedorNombre(entrada);
      const costoKey = this.generarCostoKey(entrada.medida, proveedorNombre);

      return {
        ...entrada,
        costoKey,
        proveedorNombre,
        proveedorId: entrada.proveedorId || '',
        tipoCosto: entrada.tipoCosto || 'limpio'
      };
    },

    tieneCostoEspecifico(medida) {
      return Object.prototype.hasOwnProperty.call(this.costosEmbarqueManuales, medida);
    },

    obtenerCostoEspecifico(medida) {
      if (!this.tieneCostoEspecifico(medida)) return null;
      return this.costosEmbarqueManuales[medida];
    },

    describirOrigenCosto(medida) {
      const costo = this.encontrarCostoParaMedida(medida);
      if (!costo) return 'Sin costo asignado';

      if (costo.tipoCoincidencia === 'medida-proveedor') {
        return `Coincidencia medida + proveedor (${costo.medidaEncontrada} - ${costo.proveedorNombre})`;
      }

      if (costo.tipoCoincidencia === 'proveedor-activo') {
        return `Proveedor activo (${costo.medidaEncontrada} - ${costo.proveedorNombre || 'Sin proveedor'})`;
      }

      return costo.proveedorNombre
        ? `Costo global (${costo.medidaEncontrada} - ${costo.proveedorNombre})`
        : `Costo global (${costo.medidaEncontrada})`;
    },

    async cargarEmbarque() {
      try {
        console.log('[GestionCostos] Cargando embarque...');
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        console.log('[GestionCostos] ID del embarque:', embarqueId);
        const embarqueRef = doc(db, 'embarques', embarqueId);
        const embarqueDoc = await getDoc(embarqueRef);
        
        if (embarqueDoc.exists()) {
          this.embarqueData = embarqueDoc.data();
          console.log('[GestionCostos] Embarque cargado:', this.embarqueData);
          
          // Si el embarque no tiene fecha, establecer la fecha actual
          if (!this.embarqueData.fecha) {
            this.embarqueData.fecha = new Date().toISOString().split('T')[0];
            // Guardar la fecha en el embarque
            await updateDoc(embarqueRef, {
              fecha: this.embarqueData.fecha
            });
          }
          
          this.obtenerMedidasEmbarque();
          this.medidaSeleccionada = this.embarqueData.medidaSeleccionada || {};
          this.medidaOculta = this.embarqueData.medidaOculta || {}; // Cargar configuración de ocultación
          this.aplicarCostoExtra = this.embarqueData.aplicarCostoExtra || {}; // Cargar configuración de costo extra
          this.costosEmbarque = this.embarqueData.costosPorMedida || {};
          this.costosEmbarqueManuales = this.embarqueData.costosPorMedidaManuales || {};
          this.proveedorActivoPorMedida = this.embarqueData.proveedorActivoPorMedida || {};
          this.costoExtra = this.embarqueData.costoExtra ?? 18;
          this.calcularRendimientos();
          // Inicializar configuración de costo extra si no existe
          await this.inicializarConfiguracionCostoExtra();
          // Aplicar costos de medidas registradas automáticamente
          await this.aplicarCostosRegistrados();
        }
      } catch (error) {
        console.error('Error al cargar el embarque:', error);
      }
    },

    obtenerMedidasEmbarque() {
      if (!this.embarqueData || !this.embarqueData.clientes) return;
      
      const limpiosSet = new Set();
      const crudosSet = new Set();
      
      this.embarqueData.clientes.forEach(cliente => {
        cliente.productos.forEach(producto => {
          if (producto.medida) {
            let nombreMedida = producto.medida;
            if (cliente.nombre === 'Ozuna' && !producto.esVenta) {
              nombreMedida = `${producto.medida} Maquila Ozuna`;
            }
            limpiosSet.add(nombreMedida);
          }
        });

        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            if (crudo && crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach(item => {
                if (item.talla) {
                  crudosSet.add(item.talla);
                }
              });
            }
          });
        }
      });
      
      this.medidasLimpios = Array.from(limpiosSet);
      this.medidasCrudos = Array.from(crudosSet);
      this.medidasEmbarque = [...new Set([...this.medidasLimpios, ...this.medidasCrudos])];
    },

    calcularRendimientos() {
      if (!this.embarqueData || !this.embarqueData.kilosCrudos) return;
      
      this.medidasEmbarque.forEach(medida => {
        const totalEmbarcado = this.obtenerTotalEmbarcado(medida);
        if (totalEmbarcado > 0) {
          let kilosCrudos;
          const kilosCrudosData = this.embarqueData.kilosCrudos[medida];
          
          if (this.esMedidaMix(medida) && kilosCrudosData) {
            kilosCrudos = Number(kilosCrudosData.medida1 || 0) + Number(kilosCrudosData.medida2 || 0);
          } else {
            kilosCrudos = Number(kilosCrudosData || 0);
          }
          
          this.$set(this.rendimientos, medida, kilosCrudos / totalEmbarcado);
        }
      });
    },

    obtenerTotalEmbarcado(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      const esOzuna = medida.includes('Maquila Ozuna');
      const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
      
      return this.embarqueData.clientes.reduce((total, cliente) => {
        return total + cliente.productos
          .filter(p => {
            if (!p.medida) return false;
            
            if (esOzuna) {
              return p.medida.toLowerCase().trim() === medidaBase && 
                     cliente.nombre === 'Ozuna' && 
                     !p.esVenta;
            } else {
              return p.medida.toLowerCase().trim() === medidaBase && 
                     (cliente.nombre !== 'Ozuna' || p.esVenta);
            }
          })
          .reduce((subtotal, producto) => {
            if (producto.tipo === 'c/h20') {
              const totalBolsas = this.calcularTotalBolsas(producto);
              const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
              return subtotal + (totalBolsas * valorNeto);
            } else {
              const sumaKilos = producto.kilos.reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
              const sumaTaras = this.calcularTotalTaras(producto);
              const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
              return subtotal + (sumaKilos - descuentoTaras);
            }
          }, 0);
      }, 0);
    },

    calcularTotalTaras(producto) {
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      return tarasNormales + tarasExtra;
    },

    calcularTotalBolsas(producto) {
      const reporteTaras = producto.reporteTaras || [];
      const reporteBolsas = producto.reporteBolsas || [];
      let sumaTotalKilos = 0;

      for (let i = 0; i < reporteTaras.length; i++) {
        const taras = parseInt(reporteTaras[i]) || 0;
        const bolsa = parseInt(reporteBolsas[i]) || 0;
        sumaTotalKilos += taras * bolsa;
      }

      return sumaTotalKilos;
    },

    esMedidaMix(medida) {
      return medida.toLowerCase().includes('mix');
    },

    calcularCostoFinal(medida) {
      let costo = 0;
      const costoGlobal = this.encontrarCostoParaMedida(medida);
      if (costoGlobal) {
        costo = Number(costoGlobal.costo);
      } else if (this.tieneCostoEspecifico(medida)) {
        costo = Number(this.obtenerCostoEspecifico(medida));
      }
      
      const rendimientoOriginal = Number(this.rendimientos[medida]) || 0;
      // Usar rendimiento redondeado a 2 decimales (igual que se muestra en la UI)
      const rendimiento = Math.round(rendimientoOriginal * 100) / 100;
      const costoExtraNumerico = Number(this.costoExtra);
      const costoExtra = Number.isNaN(costoExtraNumerico) ? 18 : costoExtraNumerico;
      
      // Verificar si está marcado para aplicar costo extra
      const aplicarExtra = this.aplicarCostoExtra[medida] || false;
      
      let resultado;
      if (aplicarExtra) {
        resultado = Math.round((costo * rendimiento) + costoExtra);
      } else {
        resultado = Math.round(costo * rendimiento);
      }
      
      return resultado.toFixed(1);
    },

    async iniciarEscuchaPreciosGlobales() {
      try {
        const db = getFirestore();
        const historialRef = collection(db, 'historial_costos');
        
        console.log('[GestionCostos] Iniciando escucha de precios globales...');
        
        this.unsubscribePreciosGlobales = onSnapshot(historialRef, (snapshot) => {
          console.log('[GestionCostos] Snapshot recibido, documentos:', snapshot.size);
          const historialCompleto = [];
          
          // Recopilar todo el historial
          snapshot.forEach(doc => {
            const data = doc.data();
            console.log('[GestionCostos] Documento encontrado:', doc.id, data);
            historialCompleto.push({
              ...data,
              id: doc.id
            });
          });
          
          // Helper para convertir fecha (string | Date | Timestamp) → Date
          const toDate = (value) => {
            try {
              if (!value) return null;
              // Firestore Timestamp
              if (value.toDate && typeof value.toDate === 'function') return value.toDate();
              if (value.seconds) return new Date(value.seconds * 1000);
              // String ISO o yyyy-mm-dd
              if (typeof value === 'string') return new Date(value);
              // Date nativo
              if (value instanceof Date) return value;
              return new Date(value);
            } catch {
              return null;
            }
          };

          // Ordenar por fecha descendente usando conversión robusta
          historialCompleto.sort((a, b) => {
            const fechaA = toDate(a.fecha) || toDate(a.timestamp) || new Date(0);
            const fechaB = toDate(b.fecha) || toDate(b.timestamp) || new Date(0);
            return fechaB - fechaA;
          });
          
          // Obtener la fecha del embarque (soporta string | Date | Timestamp)
          const fechaEmbarqueRaw = this.embarqueData?.fecha || new Date();
          const fechaEmb = toDate(fechaEmbarqueRaw) || new Date();
          // Normalizar a 12:00 para evitar desfases horarios
          fechaEmb.setHours(12, 0, 0, 0);
          // Obtener costos por medida:
          // - costosGlobales: último costo registrado sin importar la fecha del embarque
          // - costosValidosParaEmbarque: último costo con fecha <= fecha del embarque
          const costosGlobales = {};
          const costosValidosParaEmbarque = {};
          const medidasGlobalesProcesadas = new Set();
          const medidasEmbarqueProcesadas = new Set();
          
          historialCompleto.forEach(entradaOriginal => {
            if (entradaOriginal.eliminado || entradaOriginal.medidaEliminada) return;

            const entrada = this.hidratarEntradaCosto(entradaOriginal);

            const fechaCosto = toDate(entrada.fecha) || toDate(entrada.timestamp) || new Date(0);
            fechaCosto.setHours(12, 0, 0, 0);

            if (!medidasGlobalesProcesadas.has(entrada.costoKey)) {
              costosGlobales[entrada.costoKey] = {
                costoKey: entrada.costoKey,
                medida: entrada.medida,
                proveedorId: entrada.proveedorId,
                proveedorNombre: entrada.proveedorNombre,
                tipoCosto: entrada.tipoCosto || 'limpio',
                archivado: Boolean(entrada.archivado),
                costoBase: entrada.costoBase,
                fecha: entrada.fecha,
                timestamp: entrada.timestamp,
                id: entrada.id
              };
              medidasGlobalesProcesadas.add(entrada.costoKey);
            }

            if (!medidasEmbarqueProcesadas.has(entrada.costoKey) && fechaCosto <= fechaEmb && !entrada.archivado) {
              medidasEmbarqueProcesadas.add(entrada.costoKey);

              costosValidosParaEmbarque[entrada.costoKey] = {
                costoKey: entrada.costoKey,
                medida: entrada.medida,
                proveedorId: entrada.proveedorId,
                proveedorNombre: entrada.proveedorNombre,
                tipoCosto: entrada.tipoCosto || 'limpio',
                archivado: false,
                costoBase: entrada.costoBase,
                fecha: entrada.fecha,
                timestamp: entrada.timestamp,
                id: entrada.id
              };
            }
          });

          const actualizarMapaReactivo = (mapaLocal, mapaFuente) => {
            Object.keys(mapaLocal).forEach(medida => {
              if (!mapaFuente[medida]) {
                this.$delete(mapaLocal, medida);
              }
            });

            Object.keys(mapaFuente).forEach(medida => {
              this.$set(mapaLocal, medida, mapaFuente[medida]);
            });
          };

          actualizarMapaReactivo(this.costosRegistrados, costosGlobales);
          actualizarMapaReactivo(this.costosRegistradosPorFecha, costosValidosParaEmbarque);

          console.log('[GestionCostos] Costos globales actualizados:', this.costosRegistrados);
          console.log('[GestionCostos] Costos válidos para el embarque:', this.costosRegistradosPorFecha);
          
          // Aplicar costos de medidas registradas si ya tenemos datos del embarque
          if (this.embarqueData) {
            this.aplicarCostosRegistrados().catch(error => {
              console.error('Error al aplicar costos registrados:', error);
            });
          }
        });
      } catch (error) {
        console.error('Error al iniciar escucha de historial:', error);
      }
    },

    // Métodos de diagnóstico eliminados

    async seleccionarProveedorActivo(medidaKey, costoKey) {
      this.$set(this.proveedorActivoPorMedida, medidaKey, costoKey);
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        await updateDoc(embarqueRef, {
          proveedorActivoPorMedida: this.proveedorActivoPorMedida
        });
      } catch (error) {
        console.error('Error al guardar proveedor activo:', error);
      }
    },

    abrirModalNuevoCostoParaMedida(medida, tipoCosto) {
      this.modoEdicionCostoProveedor = false;
      this.costoProveedorEditando = {
        medida,
        costo: '',
        costoAnterior: null,
        fecha: new Date().toISOString().split('T')[0],
        proveedorId: '',
        proveedorNombre: '',
        tipoCosto: tipoCosto || 'limpio',
        costoKey: ''
      };
      this.mostrarModalCostoProveedor = true;
    },

    abrirModalNuevoCosto() {
      this.modoEdicionCostoProveedor = false;
      this.costoProveedorEditando = {
        medida: '',
        costo: '',
        costoAnterior: null,
        fecha: new Date().toISOString().split('T')[0],
        proveedorId: '',
        proveedorNombre: '',
        tipoCosto: this.tabRegistradas === 'crudos' ? 'crudo' : 'limpio',
        costoKey: ''
      };
      this.mostrarModalCostoProveedor = true;
    },

    cerrarModalCostoProveedor() {
      this.mostrarModalCostoProveedor = false;
      this.modoEdicionCostoProveedor = false;
      this.costoProveedorEditando = {
        medida: '',
        costo: '',
        costoAnterior: null,
        fecha: new Date().toISOString().split('T')[0],
        proveedorId: '',
        proveedorNombre: '',
        tipoCosto: 'limpio',
        costoKey: ''
      };
    },

    async guardarCostoProveedor(data) {
      try {
        const db = getFirestore();
        const proveedorNombre = data.proveedorNombre || '';

        const fecha = new Date(data.fecha);
        fecha.setHours(12, 0, 0, 0); // Establecer la hora a 12:00 PM
        const costoKey = this.generarCostoKey(data.medida, proveedorNombre);
        
        await addDoc(collection(db, 'historial_costos'), {
          medida: data.medida,
          proveedorId: '',
          proveedorNombre,
          tipoCosto: data.tipoCosto || 'limpio',
          costoKey,
          costoBase: Number(data.costo ?? 0),
          archivado: false,
          timestamp: fecha,
          fecha: data.fecha,
          nuevo: !this.modoEdicionCostoProveedor
        });

        this.cerrarModalCostoProveedor();
        console.log('Costo guardado correctamente');
      } catch (error) {
        console.error('Error al guardar el costo:', error);
        alert('Error al guardar el costo');
      }
    },

    editarCosto(costoInfo) {
      this.modoEdicionCostoProveedor = true;
      this.costoProveedorEditando = {
        medida: costoInfo.medida,
        costo: costoInfo.costoBase,
        costoAnterior: costoInfo.costoBase,
        fecha: this.obtenerFechaParaInput(costoInfo.fecha),
        proveedorId: costoInfo.proveedorId || '',
        proveedorNombre: costoInfo.proveedorNombre || '',
        tipoCosto: costoInfo.tipoCosto || 'limpio',
        costoKey: costoInfo.costoKey || ''
      };
      this.mostrarModalCostoProveedor = true;
    },

    async cambiarArchivoMedida(costoInfo, archivado) {
      const proveedorLabel = costoInfo.proveedorNombre || 'Sin proveedor';
      const accion = archivado ? 'archivar' : 'restaurar';
      const mensaje = archivado
        ? `¿Archivar "${costoInfo.medida}" de "${proveedorLabel}"? Se ocultará de la vista activa sin borrar su historial.`
        : `¿Restaurar "${costoInfo.medida}" de "${proveedorLabel}" a la vista activa?`;

      if (!confirm(mensaje)) return;

      try {
        const db = getFirestore();
        const fecha = new Date();
        fecha.setHours(12, 0, 0, 0);
        const fechaString = fecha.toISOString().split('T')[0];

        await addDoc(collection(db, 'historial_costos'), {
          medida: costoInfo.medida,
          proveedorId: '',
          proveedorNombre: costoInfo.proveedorNombre || '',
          costoKey: costoInfo.costoKey,
          costoBase: Number(costoInfo.costoBase ?? 0),
          archivado,
          timestamp: fecha,
          fecha: fechaString,
          observacion: archivado ? 'Medida archivada' : 'Medida restaurada',
          restaurado: !archivado
        });

        if (archivado) {
          this.$delete(this.costosRegistradosPorFecha, costoInfo.costoKey);
        }

        console.log(`Medida ${accion} correctamente`);
      } catch (error) {
        console.error(`Error al ${accion} la medida:`, error);
        alert(`Error al ${accion} la medida`);
      }
    },

    archivarMedida(costoInfo) {
      return this.cambiarArchivoMedida(costoInfo, true);
    },

    restaurarMedida(costoInfo) {
      return this.cambiarArchivoMedida(costoInfo, false);
    },

    async eliminarMedida(costoInfo) {
      const proveedorLabel = costoInfo.proveedorNombre || 'Sin proveedor';
      if (confirm(`¿Eliminar completamente "${costoInfo.medida}" de "${proveedorLabel}" y todo su historial?`)) {
        try {
          const db = getFirestore();
          
          // Eliminar inmediatamente de la interfaz local
          this.$delete(this.costosRegistrados, costoInfo.costoKey);
          this.$delete(this.costosRegistradosPorFecha, costoInfo.costoKey);
          
          // Eliminar TODO el historial de esta medida + proveedor
          const historialRef = collection(db, 'historial_costos');
          const q = query(historialRef, where('medida', '==', costoInfo.medida));
          const snapshot = await getDocs(q);
          const docsParaEliminar = snapshot.docs.filter(docSnapshot => {
            const entrada = this.hidratarEntradaCosto(docSnapshot.data());
            return entrada.costoKey === costoInfo.costoKey;
          });
          
          // Eliminar cada entrada del historial
          const deletePromises = docsParaEliminar.map(docSnapshot => deleteDoc(docSnapshot.ref));
          await Promise.all(deletePromises);

          console.log(`Medida "${costoInfo.medida}" (${proveedorLabel}) eliminada correctamente`);
        } catch (error) {
          console.error('Error al eliminar la medida:', error);
          alert('Error al eliminar la medida');
        }
      }
    },

    async eliminarEntradaHistorial(entrada) {
      if (confirm(`¿Está seguro de eliminar esta entrada del historial ($${Number(entrada.costoBase).toFixed(2)} - ${this.formatearFecha(entrada.fecha)})?`)) {
        try {
          const db = getFirestore();
          
          // Eliminar la entrada específica del historial
          await deleteDoc(doc(db, 'historial_costos', entrada.id));
          
          // Remover de la lista local
          this.historialCostos = this.historialCostos.filter(item => item.id !== entrada.id);
          
          console.log('Entrada del historial eliminada correctamente');
          
          // El listener se encargará de actualizar los costos actuales automáticamente
        } catch (error) {
          console.error('Error al eliminar entrada del historial:', error);
          alert('Error al eliminar la entrada del historial');
        }
      }
    },

    editarCostoEmbarque(medida) {
      // Usar el costo actual como valor inicial (específico del embarque o global)
      let costoInicial = 0;
      
      if (this.tieneCostoEspecifico(medida)) {
        costoInicial = this.obtenerCostoEspecifico(medida);
      } else {
        const costoGlobal = this.encontrarCostoParaMedida(medida);
        if (costoGlobal) {
          costoInicial = costoGlobal.costo;
        }
      }
      
      this.costoEmbarqueEditando = {
        medida: medida,
        costo: costoInicial
      };
      this.mostrarModalCostoEmbarque = true;
    },

    cerrarModalCostoEmbarque() {
      this.mostrarModalCostoEmbarque = false;
      this.costoEmbarqueEditando = {
        medida: '',
        costo: 0
      };
    },

    async guardarCostoEmbarque(nuevoCosto) {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        const medida = this.costoEmbarqueEditando.medida;
        
        // Actualizar el costo local
        if (nuevoCosto !== null) {
          this.$set(this.costosEmbarque, medida, Number(nuevoCosto));
          this.$set(this.costosEmbarqueManuales, medida, Number(nuevoCosto));
          console.log(`Costo manual establecido para ${medida}: ${this.costosEmbarque[medida]}`);
        } else {
          // Si es null, eliminar el costo
          this.$delete(this.costosEmbarque, medida);
          this.$delete(this.costosEmbarqueManuales, medida);
          console.log(`Costo manual eliminado para ${medida}`);
        }
        
        // Guardar en Firebase
        await updateDoc(embarqueRef, {
          costosPorMedida: this.costosEmbarque,
          costosPorMedidaManuales: this.costosEmbarqueManuales
        });

        this.cerrarModalCostoEmbarque();
        console.log('Costo del embarque actualizado correctamente');
      } catch (error) {
        console.error('Error al actualizar el costo del embarque:', error);
        alert('Error al actualizar el costo del embarque');
      }
    },

    async limpiarCostoEspecifico(medida) {
      if (confirm(`¿Volver al costo global para "${medida}"?`)) {
        try {
          const db = getFirestore();
          const embarqueId = this.$route.params.id;
          const embarqueRef = doc(db, 'embarques', embarqueId);
          
          // Eliminar el costo específico
          this.$delete(this.costosEmbarque, medida);
          this.$delete(this.costosEmbarqueManuales, medida);
          
          // Guardar en Firebase
          await updateDoc(embarqueRef, {
            costosPorMedida: this.costosEmbarque,
            costosPorMedidaManuales: this.costosEmbarqueManuales
          });
          
          console.log(`Costo específico eliminado para ${medida}, volviendo al costo global`);
        } catch (error) {
          console.error('Error al eliminar el costo específico:', error);
          alert('Error al eliminar el costo específico');
        }
      }
    },

    async guardarSeleccionMedidas() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          medidaSeleccionada: this.medidaSeleccionada
        });

        console.log('Selección de medidas guardada correctamente');
      } catch (error) {
        console.error('Error al guardar la selección de medidas:', error);
      }
    },

    async guardarConfiguracionCostoExtra() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          aplicarCostoExtra: this.aplicarCostoExtra
        });

        console.log('Configuración de costo extra guardada correctamente');
      } catch (error) {
        console.error('Error al guardar la configuración de costo extra:', error);
      }
    },

    async guardarCostoExtra() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        const costoExtraNumerico = Number(this.costoExtra);
        
        await updateDoc(embarqueRef, {
          costoExtra: Number.isNaN(costoExtraNumerico) ? 18 : costoExtraNumerico
        });

        console.log('Costo extra guardado correctamente');
      } catch (error) {
        console.error('Error al guardar el costo extra:', error);
      }
    },

    volverAEmbarque() {
      this.$router.push({
        name: 'EditarEmbarque',
        params: { id: this.$route.params.id }
      });
    },

    volverARendimientos() {
      this.$router.push({
        name: 'Rendimientos',
        params: { id: this.$route.params.id }
      });
    },

    async inicializarConfiguracionCostoExtra() {
      // Si ya existe configuración, no hacer nada (respetar configuración manual del usuario)
      if (Object.keys(this.aplicarCostoExtra).length > 0) {
        return;
      }

      // Aplicar la lógica anterior para inicializar automáticamente
      let configuracionActualizada = false;
      
      this.medidasEmbarque.forEach(medida => {
        // Aplicar la misma lógica que había antes
        const esMedidaOzunaMaquila = medida.includes('Maquila Ozuna');
        const esMedidaNumerica = /^\d+\/\d+/.test(medida.trim()) || /^\d+\s/.test(medida.trim()) || /^\d+$/.test(medida.trim());
        
        // Si era una medida que antes tenía costo extra automático, marcarla
        if (!esMedidaOzunaMaquila && esMedidaNumerica) {
          this.$set(this.aplicarCostoExtra, medida, true);
          configuracionActualizada = true;
        } else {
          this.$set(this.aplicarCostoExtra, medida, false);
        }
      });

      // Guardar la configuración inicial si se actualizó
      if (configuracionActualizada) {
        await this.guardarConfiguracionCostoExtra();
      }
    },



    // Función auxiliar para normalizar nombres de medidas
    normalizarMedida(medida) {
      if (!medida) return '';
      return medida
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')  // Múltiples espacios a uno solo
        .replace(/\s*\/\s*/g, '/') // Espacios alrededor de /
        .replace(/\s*-\s*/g, '-'); // Espacios alrededor de -
    },

    // Función auxiliar para encontrar el costo correspondiente a una medida
    encontrarCostoParaMedida(medidaEmbarque) {
      if (!medidaEmbarque) return null;

      const mapasDisponibles = [this.costosRegistradosPorFecha, this.costosRegistradosActivos];

      const medidaEmbarqueNormalizada = this.normalizarMedida(medidaEmbarque);
      const medidaBaseSinSufijos = medidaEmbarqueNormalizada
        .replace(/\s+maquila\s+ozuna/g, '')
        .replace(/\s+c\/c/g, '')
        .trim();

      const crearResultado = (costoInfo, tipoCoincidencia = 'global') => ({
        medidaEncontrada: costoInfo.medida,
        proveedorId: costoInfo.proveedorId || '',
        proveedorNombre: costoInfo.proveedorNombre || '',
        costo: costoInfo.costoBase,
        costoKey: costoInfo.costoKey,
        tipoCoincidencia
      });

      const medidaKey = this.normalizarMedida(medidaEmbarque);
      const proveedorActivoKey = this.proveedorActivoPorMedida[medidaKey];

      const extraerTallaBase = (texto) => {
        const match = texto.match(/\d+\/\d+/);
        return match ? match[0] : '';
      };

      const tallaEmbarque = extraerTallaBase(medidaEmbarqueNormalizada);

      // Extrae el proveedor implícito desde la medida del embarque usando la talla
      // como referencia (ej: "41/50 honduras" → "honduras"). Funciona aun cuando
      // la medida registrada coincida exactamente con la del embarque.
      const obtenerProveedorImplicitoEmbarque = () => {
        if (!tallaEmbarque || tallaEmbarque === medidaEmbarqueNormalizada) return '';
        return medidaEmbarqueNormalizada
          .replace(tallaEmbarque, '')
          .replace(/\bmaquila\b/g, '')
          .replace(/\bozuna\b/g, '')
          .replace(/\s+c\/c/g, '')
          .trim();
      };

      const proveedorImplicitoEmbarque = obtenerProveedorImplicitoEmbarque();

      const obtenerTextoProveedorDesdeMedida = (costoInfo) => {
        const medidaRegistrada = this.normalizarMedida(costoInfo.medida);
        if (medidaRegistrada && medidaEmbarqueNormalizada.includes(medidaRegistrada) && medidaRegistrada !== medidaEmbarqueNormalizada) {
          const restante = medidaEmbarqueNormalizada
            .replace(medidaRegistrada, '')
            .replace(/\bmaquila\b/g, '')
            .replace(/\bozuna\b/g, '')
            .replace(/\s+c\/c/g, '')
            .trim();
          if (restante) return restante;
        }
        // Fallback: usar el proveedor implícito derivado de la talla
        return proveedorImplicitoEmbarque;
      };

      const puntuarProveedorEnNombre = (costoInfo) => {
        const proveedorBuscado = obtenerTextoProveedorDesdeMedida(costoInfo);
        if (!proveedorBuscado) return 0;

        const proveedorRegistrado = this.normalizarMedida(costoInfo.proveedorNombre || '');
        const medidaRegistrada = this.normalizarMedida(costoInfo.medida);

        // Caso especial: la entrada no tiene proveedor explícito, pero su medida
        // ya incluye el proveedor buscado (ej: medida="41/50 Honduras" sin proveedor
        // cuando se busca "honduras"). Esto cubre el costo "base" de la combinación.
        if (!proveedorRegistrado) {
          if (medidaRegistrada.includes(proveedorBuscado)) return 800;
          return 0;
        }

        if (proveedorRegistrado === proveedorBuscado) return 1000;

        if (proveedorRegistrado.includes(proveedorBuscado) || proveedorBuscado.includes(proveedorRegistrado)) {
          const diff = Math.abs(proveedorRegistrado.length - proveedorBuscado.length);
          return Math.max(100, 500 - diff);
        }

        return proveedorBuscado
          .split(/\s+/)
          .filter(token => token.length >= 3)
          .reduce((score, token) => {
            return proveedorRegistrado.includes(token) ? score + token.length : score;
          }, 0);
      };

      const ordenarPreferencias = (coincidencias) => {
        const coincidenciasPorProveedor = coincidencias
          .map(costoInfo => ({
            costoInfo,
            score: puntuarProveedorEnNombre(costoInfo)
          }))
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score);

        if (coincidenciasPorProveedor.length > 0) {
          const coincidenciaProveedor = coincidenciasPorProveedor[0].costoInfo;
          return [
            { ...coincidenciaProveedor, tipoCoincidencia: 'medida-proveedor' },
            ...coincidencias.filter(c => c.costoKey !== coincidenciaProveedor.costoKey)
          ];
        }

        // Si la medida del embarque NO incluye un proveedor implícito,
        // respetamos el "proveedor activo" elegido manualmente.
        // Si SÍ hay proveedor implícito en el nombre, preferimos la entrada
        // sin proveedor (interpretada como el costo base de esa medida + proveedor en nombre).
        if (!proveedorImplicitoEmbarque && proveedorActivoKey) {
          const activo = coincidencias.find(c => c.costoKey === proveedorActivoKey);
          if (activo) {
            return [
              { ...activo, tipoCoincidencia: 'proveedor-activo' },
              ...coincidencias.filter(c => c.costoKey !== proveedorActivoKey)
            ];
          }
        }

        return coincidencias.sort((a, b) => {
          const aSinProveedor = a.proveedorNombre ? 1 : 0;
          const bSinProveedor = b.proveedorNombre ? 1 : 0;
          return aSinProveedor - bSinProveedor;
        });
      };

      const obtenerEntradas = (mapa) => {
        if (!mapa || Object.keys(mapa).length === 0) return [];
        return Object.values(mapa)
          .map(costoInfo => this.hidratarEntradaCosto(costoInfo))
          .filter(costoInfo => !costoInfo.archivado);
      };

      const buscarExacta = (entradas) => {
        const exactas = entradas.filter(costoInfo => {
          return this.normalizarMedida(costoInfo.medida) === medidaEmbarqueNormalizada;
        });
        if (exactas.length === 0) return null;
        const seleccionado = ordenarPreferencias(exactas)[0];
        return crearResultado(seleccionado, seleccionado.tipoCoincidencia || 'exacta');
      };

      const buscarPorTalla = (entradas) => {
        if (!tallaEmbarque || tallaEmbarque === medidaEmbarqueNormalizada) return null;
        const porTalla = entradas.filter(costoInfo => {
          return this.normalizarMedida(costoInfo.medida) === tallaEmbarque;
        });
        if (porTalla.length === 0) return null;
        const seleccionado = ordenarPreferencias(porTalla)[0];
        return crearResultado(seleccionado, seleccionado.tipoCoincidencia || 'talla-proveedor');
      };

      const buscarBaseOzuna = (entradas) => {
        if (!medidaEmbarque.includes('Maquila Ozuna')) return null;
        const medidaBase = this.normalizarMedida(medidaEmbarque.replace(' Maquila Ozuna', '').trim());
        const tallaOzuna = extraerTallaBase(medidaBase);
        const clavesBuscar = [medidaBase];
        if (tallaOzuna && tallaOzuna !== medidaBase) clavesBuscar.push(tallaOzuna);

        for (const clave of clavesBuscar) {
          const coincidenciaBase = entradas.filter(costoInfo => {
            return this.normalizarMedida(costoInfo.medida) === clave;
          });
          if (coincidenciaBase.length > 0) {
            const seleccionado = ordenarPreferencias(coincidenciaBase)[0];
            return crearResultado(seleccionado, seleccionado.tipoCoincidencia || 'base-ozuna');
          }
        }
        return null;
      };

      const buscarParcial = (entradas) => {
        const parciales = entradas.filter(costoInfo => {
          const medidaRegistradaNormalizada = this.normalizarMedida(costoInfo.medida);
          return (
            medidaRegistradaNormalizada.length > 2 &&
            medidaBaseSinSufijos.includes(medidaRegistradaNormalizada)
          ) || (
            medidaBaseSinSufijos.length > 2 &&
            medidaRegistradaNormalizada.includes(medidaBaseSinSufijos)
          );
        });
        if (parciales.length === 0) return null;
        const seleccionado = ordenarPreferencias(parciales)[0];
        return crearResultado(seleccionado, seleccionado.tipoCoincidencia || 'parcial');
      };

      // Estrategias ordenadas de más específica a menos específica.
      // Cada estrategia se ejecuta en TODOS los mapas antes de pasar a la siguiente,
      // de modo que un match exacto en cualquier mapa siempre gana sobre un match
      // por talla o parcial en otro mapa.
      const estrategias = [buscarExacta, buscarPorTalla, buscarBaseOzuna, buscarParcial];

      for (const estrategia of estrategias) {
        for (const mapa of mapasDisponibles) {
          const entradas = obtenerEntradas(mapa);
          if (entradas.length === 0) continue;
          const resultado = estrategia(entradas);
          if (resultado) return resultado;
        }
      }

      return null;
    },

    // Función para sugerir crear medidas faltantes
    async sugerirCrearMedidasFaltantes() {
      const medidasFaltantes = [];
      const medidasParaCrear = new Set();
      
      this.medidasEmbarque.forEach(medida => {
        if (!Object.prototype.hasOwnProperty.call(this.costosEmbarque, medida) && !this.encontrarCostoParaMedida(medida)) {
          medidasFaltantes.push(medida);
          
          // Para medidas "Maquila Ozuna", crear la medida base
          if (medida.includes('Maquila Ozuna')) {
            const medidaBase = medida.replace(' Maquila Ozuna', '').trim();
            medidasParaCrear.add(medidaBase);
          } else {
            medidasParaCrear.add(medida);
          }
        }
      });
      
      if (medidasFaltantes.length > 0) {
        console.log(`📝 Medidas sin costo encontradas: ${medidasFaltantes.join(', ')}`);
        
        const medidasACrear = Array.from(medidasParaCrear);
        const mensaje = `Se encontraron ${medidasFaltantes.length} medidas sin costo asignado:\n\n${medidasFaltantes.map(m => `• ${m}`).join('\n')}\n\nSe crearán ${medidasACrear.length} medidas base:\n\n${medidasACrear.map(m => `• ${m}`).join('\n')}\n\n¿Desea crear estas medidas con un costo base de $130?\n\n(Podrá editarlas después individualmente si es necesario)`;
        
        if (confirm(mensaje)) {
          await this.crearMedidasFaltantes(medidasACrear);
        }
      } else {
        alert('Todas las medidas ya tienen costos asignados.');
      }
    },

    async crearMedidasFaltantes(medidas) {
      try {
        const db = getFirestore();
        const fecha = new Date();
        fecha.setHours(12, 0, 0, 0);
        const fechaString = fecha.toISOString().split('T')[0];
        
        const promesas = medidas.map(medida => {
          const costoKey = this.generarCostoKey(medida);
          return addDoc(collection(db, 'historial_costos'), {
            medida: medida,
            proveedorId: '',
            proveedorNombre: '',
            costoKey,
            costoBase: 130,
            archivado: false,
            timestamp: fecha,
            fecha: fechaString,
            nuevo: true
          });
        });
        
        await Promise.all(promesas);
        console.log(`✓ Se crearon ${medidas.length} medidas faltantes`);
        alert(`Se crearon ${medidas.length} medidas con costo base de $130`);
      } catch (error) {
        console.error('Error al crear medidas faltantes:', error);
        alert('Error al crear las medidas faltantes');
      }
    },

    async aplicarCostosRegistrados() {
      let costosActualizados = false;

      this.medidasEmbarque.forEach(medida => {
        const costoEncontrado = this.encontrarCostoParaMedida(medida);
        const tieneCostoManual = this.tieneCostoEspecifico(medida);
        
        if (tieneCostoManual) return;

        if (costoEncontrado) {
          const costoNuevo = costoEncontrado.costo;
          if (this.costosEmbarque[medida] !== costoNuevo) {
            this.$set(this.costosEmbarque, medida, costoNuevo);
            costosActualizados = true;
          }
        } else if (Object.prototype.hasOwnProperty.call(this.costosEmbarque, medida)) {
          this.$delete(this.costosEmbarque, medida);
          costosActualizados = true;
        }
      });

      // Guardar automáticamente en Firebase si hubo cambios
      if (costosActualizados) {
        try {
          const db = getFirestore();
          const embarqueId = this.$route.params.id;
          const embarqueRef = doc(db, 'embarques', embarqueId);
          
          await updateDoc(embarqueRef, {
            costosPorMedida: this.costosEmbarque
          });
          
          console.log('Costos sincronizados correctamente');
        } catch (error) {
          console.error('Error al guardar costos aplicados:', error);
        }
      }
      
      // Sugerir crear medidas faltantes después de aplicar costos (opcional)
      // await this.sugerirCrearMedidasFaltantes();
    },

    async verHistorial(costoInfo) {
      const proveedorLabel = costoInfo.proveedorNombre || 'Sin proveedor';
      this.medidaSeleccionadaHistorial = `${costoInfo.medida} - ${proveedorLabel}`;
      this.mostrarModalHistorial = true;
      this.cargandoHistorial = true;
      
      try {
        const db = getFirestore();
        const historialRef = collection(db, 'historial_costos');
        
        // Consulta simple sin ordenamiento para evitar índice compuesto
        const q = query(
          historialRef,
          where('medida', '==', costoInfo.medida)
        );
        
        const snapshot = await getDocs(q);
        const historialData = snapshot.docs
          .map(doc => this.hidratarEntradaCosto({
            id: doc.id,
            ...doc.data()
          }))
          .filter(entrada => entrada.costoKey === costoInfo.costoKey);
        
        // Ordenar en el cliente por timestamp descendente
        this.historialCostos = historialData.sort((a, b) => {
          const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return timestampB - timestampA;
        });
        
      } catch (error) {
        console.error('Error al cargar historial:', error);
        this.historialCostos = [];
      } finally {
        this.cargandoHistorial = false;
      }
    },

    cerrarModalHistorial() {
      this.mostrarModalHistorial = false;
      this.medidaSeleccionadaHistorial = '';
      this.historialCostos = [];
      this.cargandoHistorial = false;
    },

    async sincronizarCostos() {
      try {
        await this.sincronizarCostosForzado();
        alert('Costos sincronizados con los valores más recientes.');
      } catch (error) {
        console.error('Error al sincronizar costos:', error);
        alert('Error al sincronizar costos.');
      }
    },

    async sincronizarCostosForzado() {
      // Sincronización forzada que sobrescribe incluso los costos específicos del embarque
      let costosActualizados = false;
      
      this.medidasEmbarque.forEach(medida => {
        const costoEncontrado = this.encontrarCostoParaMedida(medida);
        
        if (costoEncontrado) {
          const costoRegistrado = costoEncontrado.costo;
          const costoEmbarque = this.costosEmbarque[medida];
          
          // En sincronización forzada, actualizar siempre que haya diferencia
          if (costoEmbarque !== costoRegistrado || this.tieneCostoEspecifico(medida)) {
            this.$set(this.costosEmbarque, medida, costoRegistrado);
            this.$delete(this.costosEmbarqueManuales, medida);
            costosActualizados = true;
          }
        }
      });

      // Guardar automáticamente en Firebase si hubo cambios
      if (costosActualizados) {
        try {
          const db = getFirestore();
          const embarqueId = this.$route.params.id;
          const embarqueRef = doc(db, 'embarques', embarqueId);
          
          await updateDoc(embarqueRef, {
            costosPorMedida: this.costosEmbarque,
            costosPorMedidaManuales: this.costosEmbarqueManuales
          });
          
          console.log('Costos sincronizados forzadamente');
        } catch (error) {
          console.error('Error al guardar costos sincronizados:', error);
        }
      }
    },

    obtenerFechaParaInput(fecha) {
      try {
        if (!fecha) {
          return new Date().toISOString().split('T')[0];
        }

        if (typeof fecha === 'string') {
          if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return fecha;
          }

          if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
            const [day, month, year] = fecha.split('/');
            return `${year}-${month}-${day}`;
          }

          const date = new Date(fecha);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }

        let fechaDate = fecha;
        if (fecha.toDate && typeof fecha.toDate === 'function') {
          fechaDate = fecha.toDate();
        } else if (fecha.seconds) {
          fechaDate = new Date(fecha.seconds * 1000);
        }

        if (fechaDate instanceof Date && !isNaN(fechaDate.getTime())) {
          return fechaDate.toISOString().split('T')[0];
        }
      } catch (error) {
        console.error('Error al convertir fecha para input:', error);
      }

      return new Date().toISOString().split('T')[0];
    },

    formatearFechaCompleta(fecha) {
      if (!fecha) return 'N/A';
      
      try {
        // Si es una fecha string, convertirla a Date
        if (typeof fecha === 'string') {
          const [year, month, day] = fecha.split('-');
          return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        
        // Si es un timestamp de Firebase
        if (fecha.toDate && typeof fecha.toDate === 'function') {
          fecha = fecha.toDate();
        } else if (fecha.seconds) {
          fecha = new Date(fecha.seconds * 1000);
        }
        
        // Si es un objeto Date
        if (fecha instanceof Date) {
          return fecha.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        
        return 'Fecha inválida';
      } catch (error) {
        console.error('Error al formatear fecha completa:', error);
        return 'Error en fecha';
      }
    },


  },

  computed: {
    proveedoresRegistradosOrdenados() {
      const proveedores = new Map();
      this.costosRegistradosLista.forEach(costoInfo => {
        const proveedorNombre = (costoInfo.proveedorNombre || '').trim();
        if (!proveedorNombre) return;

        const proveedorKey = this.normalizarProveedor(proveedorNombre);
        if (!proveedores.has(proveedorKey)) {
          proveedores.set(proveedorKey, proveedorNombre);
        }
      });

      return Array.from(proveedores.values()).sort((a, b) => a.localeCompare(b));
    },

    costosRegistradosLista() {
      return Object.values(this.costosRegistrados)
        .map(costoInfo => this.hidratarEntradaCosto(costoInfo))
        .sort((a, b) => {
          const medidaCompare = String(a.medida || '').localeCompare(String(b.medida || ''));
          if (medidaCompare !== 0) return medidaCompare;
          return String(a.proveedorNombre || '').localeCompare(String(b.proveedorNombre || ''));
        });
    },

    costosActivosLista() {
      return this.costosRegistradosLista.filter(costoInfo => !costoInfo.archivado);
    },

    costosRegistradosActivos() {
      const activos = {};
      this.costosActivosLista.forEach(costoInfo => {
        if (!activos[costoInfo.costoKey]) {
          activos[costoInfo.costoKey] = costoInfo;
        }
      });
      return activos;
    },

    costosArchivadosLista() {
      return this.costosRegistradosLista.filter(costoInfo => costoInfo.archivado);
    },

    costosRegistradosFiltradosBase() {
      const busqueda = this.filtrosCostos.busqueda.trim().toLowerCase();
      const proveedorFiltro = this.filtrosCostos.proveedor;

      return (lista) => lista.filter(costoInfo => {
        const proveedorNombre = costoInfo.proveedorNombre || '';
        const coincideProveedor = !proveedorFiltro ||
          (proveedorFiltro === '__sin_proveedor__' && !proveedorNombre) ||
          proveedorNombre === proveedorFiltro;
        const texto = `${costoInfo.medida} ${proveedorNombre}`.toLowerCase();
        const coincideBusqueda = !busqueda || texto.includes(busqueda);
        return coincideProveedor && coincideBusqueda;
      });
    },

    costosRegistradosFiltradosLimpios() {
      return this.costosRegistradosFiltradosBase(
        this.costosActivosLista.filter(c => c.tipoCosto !== 'crudo')
      );
    },

    costosRegistradosFiltradosCrudos() {
      return this.costosRegistradosFiltradosBase(
        this.costosActivosLista.filter(c => c.tipoCosto === 'crudo')
      );
    },

    costosArchivadosFiltrados() {
      return this.costosRegistradosFiltradosBase(this.costosArchivadosLista);
    },

    costosRegistradosTabActual() {
      if (this.tabRegistradas === 'crudos') return this.costosRegistradosFiltradosCrudos;
      if (this.tabRegistradas === 'archivadas') return this.costosArchivadosFiltrados;
      return this.costosRegistradosFiltradosLimpios;
    },

    medidasAgrupadasTabActual() {
      const lista = this.tabRegistradas === 'archivadas'
        ? this.costosRegistradosLista
        : this.costosRegistradosTabActual;

      const grupos = new Map();

      lista.forEach(costoInfo => {
        if (this.tabRegistradas === 'archivadas' && !costoInfo.archivado) return;

        const medidaKey = this.normalizarMedida(costoInfo.medida);
        if (!grupos.has(medidaKey)) {
          grupos.set(medidaKey, {
            medidaKey,
            medida: costoInfo.medida,
            tipoCosto: costoInfo.tipoCosto || 'limpio',
            proveedores: []
          });
        }
        grupos.get(medidaKey).proveedores.push(costoInfo);
      });

      grupos.forEach((grupo, medidaKey) => {
        if (!this.proveedorActivoPorMedida[medidaKey] && grupo.proveedores.length > 0) {
          const primerActivo = grupo.proveedores.find(p => !p.archivado);
          if (primerActivo) {
            this.$set(this.proveedorActivoPorMedida, medidaKey, primerActivo.costoKey);
          }
        }
      });

      return Array.from(grupos.values()).sort((a, b) => a.medida.localeCompare(b.medida));
    },

    medidasEmbarqueTabActual() {
      return this.tabEmbarque === 'crudos' ? this.medidasCrudosVisibles : this.medidasLimpiosVisibles;
    },

    medidasVisibles() {
      return this.medidasEmbarque.filter(medida => !this.medidaOculta[medida]);
    },

    medidasLimpiosVisibles() {
      return this.medidasLimpios.filter(medida => !this.medidaOculta[medida]);
    },

    medidasCrudosVisibles() {
      return this.medidasCrudos.filter(medida => !this.medidaOculta[medida]);
    },
    
    costosActuales() {
      const costos = {};
      
      this.medidasEmbarque.forEach(medida => {
        const costoGlobal = this.encontrarCostoParaMedida(medida);

        if (costoGlobal) {
          costos[medida] = Number(costoGlobal.costo).toFixed(2);
        } else if (this.tieneCostoEspecifico(medida)) {
          costos[medida] = Number(this.obtenerCostoEspecifico(medida)).toFixed(2);
        } else {
          costos[medida] = '0.00';
        }
      });
      
      return costos;
    }
  },

  beforeDestroy() {
    if (this.unsubscribePreciosGlobales) {
      this.unsubscribePreciosGlobales();
    }
    if (this.guardarCostoExtraDebounced && this.guardarCostoExtraDebounced.cancel) {
      this.guardarCostoExtraDebounced.cancel();
    }
  }
}
</script>

<style scoped>
.gestion-costos-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-container {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #eee;
}

.header-container h2 {
  flex: 1;
  margin: 0;
  color: #2c3e50;
}

.btn-volver, .btn-nuevo-costo, .btn-rendimientos {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-volver {
  background-color: #3498db;
  color: white;
}

.btn-volver:hover {
  background-color: #2980b9;
}

.btn-rendimientos {
  background-color: #9b59b6;
  color: white;
}

.btn-rendimientos:hover {
  background-color: #8e44ad;
}

.btn-nuevo-costo {
  background-color: #2ecc71;
  color: white;
}

.btn-nuevo-costo:hover {
  background-color: #27ae60;
}

.btn-volver i, .btn-nuevo-costo i, .btn-rendimientos i {
  margin-right: 10px;
}

.costos-section, .medidas-embarque-section {
  margin-bottom: 40px;
}

.costos-section h3, .medidas-embarque-section h3 {
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.costos-grid, .medidas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.costo-card, .medida-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.costo-header, .medida-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.costo-header h4, .medida-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.1em;
}

.costo-actions {
  display: flex;
  gap: 8px;
}

.btn-eliminar, .btn-historial, .btn-archivar, .btn-restaurar {
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-size: 0.9em;
}

.btn-eliminar {
  background-color: #e74c3c;
}

.btn-eliminar:hover {
  background-color: #c0392b;
}

.btn-historial {
  background-color: #3498db;
}

.btn-historial:hover {
  background-color: #2980b9;
}

.btn-archivar {
  background-color: #7f8c8d;
}

.btn-archivar:hover {
  background-color: #626e70;
}

.btn-restaurar {
  background-color: #16a085;
}

.btn-restaurar:hover {
  background-color: #138a72;
}

.costo-info, .medida-info {
  margin-top: 10px;
}

.costo-info p, .medida-info p {
  margin: 8px 0;
  color: #555;
}

.btn-editar-costo, .btn-editar-costo-embarque {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-size: 0.9em;
  margin-top: 8px;
}

.btn-editar-costo:hover, .btn-editar-costo-embarque:hover {
  background-color: #2980b9;
}

.costo-valor {
  margin-bottom: 8px;
}

.costo-actual {
  color: #2c3e50;
  font-size: 0.95em;
}

.sin-costo {
  color: #666;
  font-style: italic;
  font-size: 0.9em;
}

.costo-calculado {
  margin-top: 8px;
  padding: 6px;
  background-color: #f0f8f0;
  border-radius: 4px;
  color: #27ae60;
  font-size: 0.9em;
  border-left: 3px solid #27ae60;
}

.costo-extra-indicator {
  font-size: 0.8em;
  color: #f39c12;
  font-weight: normal;
  margin-left: 5px;
}

.medida-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 0.9em;
  color: #666;
}

.checkbox-container input[type="checkbox"] {
  margin-right: 8px;
}

.costo-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.costo-calculado {
  color: #2c3e50;
  font-weight: bold;
  font-size: 0.9em;
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



.modal-historial {
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.historial-container {
  max-height: 400px;
  overflow-y: auto;
  margin: 15px 0;
}

.no-historial, .loading-historial {
  text-align: center;
  color: #666;
  padding: 20px;
}

.loading-historial i {
  margin-right: 8px;
  color: #3498db;
}

.historial-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.historial-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background-color: #f9f9f9;
}

.historial-item.eliminado {
  background-color: #ffebee;
  border-color: #ffcdd2;
}

.historial-item.restaurado {
  background-color: #e8f5e8;
  border-color: #c8e6c9;
}

.historial-item.medidaEliminada {
  background-color: #fce4ec;
  border-color: #f8bbd9;
}

.historial-item.nuevo {
  background-color: #e3f2fd;
  border-color: #bbdefb;
}

.historial-info {
  flex: 1;
}

.historial-costo {
  font-size: 1.1em;
  color: #2c3e50;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.historial-fecha {
  font-size: 0.9em;
  color: #666;
}

.estado-badge {
  font-size: 0.8em;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
  text-transform: uppercase;
}

.estado-badge.eliminado {
  background-color: #ffcdd2;
  color: #d32f2f;
}

.estado-badge.restaurado {
  background-color: #c8e6c9;
  color: #388e3c;
}

.estado-badge.medida-eliminada {
  background-color: #f8bbd9;
  color: #ad1457;
}

.estado-badge.nuevo {
  background-color: #bbdefb;
  color: #1976d2;
}

.historial-actions {
  display: flex;
  gap: 8px;
}



.btn-eliminar-entrada {
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-size: 0.9em;
}

.btn-eliminar-entrada:hover {
  background-color: #c0392b;
}

.historial-observacion {
  margin-top: 4px;
  color: #666;
  font-size: 0.85em;
}

/* Estilos para el campo de costo extra */
.costo-extra-section {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 15px;
  border: 1px solid #e9ecef;
}

.costo-extra-section label {
  font-weight: bold;
  color: #2c3e50;
  font-size: 0.95em;
  white-space: nowrap;
}

.input-costo-extra {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95em;
  width: 100px;
  background-color: white;
  transition: border-color 0.3s ease;
}

.input-costo-extra:focus {
  outline: none;
  border-color: #3498db;
}

.input-help {
  font-size: 0.8em;
  color: #666;
  font-style: italic;
}

.seccion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.btn-sincronizar, .btn-crear-medidas {
  border: none;
  border-radius: 5px;
  padding: 8px 15px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: white;
}

.btn-sincronizar {
  background-color: #f39c12;
}

.btn-sincronizar:hover {
  background-color: #e67e22;
}

.btn-crear-medidas {
  background-color: #2ecc71;
}

.btn-crear-medidas:hover {
  background-color: #27ae60;
}
.btn-sincronizar i, .btn-crear-medidas i {
  margin-right: 0;
}

.costo-display {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background-color: #f8f9fa;
  transition: all 0.3s ease;
  margin-bottom: 8px;
}

.costo-display:hover {
  background-color: #e3f2fd;
  border-color: #3498db;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(52, 152, 219, 0.2);
}

.costo-display strong {
  color: #2c3e50;
  font-size: 0.95em;
}

.costo-amount {
  color: #27ae60;
  font-weight: bold;
  font-size: 1.1em;
}

.costo-edit-icon {
  font-size: 0.8em;
  color: #3498db;
  margin-left: auto;
  transition: transform 0.2s ease;
}

.costo-display:hover .costo-edit-icon {
  transform: scale(1.1);
}

.costo-display.costo-especifico {
  border-color: #27ae60;
  background-color: #f0f8f0;
}

.costo-display.costo-especifico:hover {
  background-color: #e8f5e8;
  border-color: #27ae60;
}

.badge-especifico {
  background-color: #27ae60;
  color: white;
  font-size: 0.7em;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
  text-transform: uppercase;
}

.costo-origen {
  font-size: 0.8em;
  color: #666;
  margin-top: 2px;
}

.costo-especifico, .costo-global {
  display: flex;
  align-items: center;
  gap: 5px;
}

.costo-especifico {
  color: #27ae60;
  display: flex;
  align-items: center;
  gap: 8px;
}

.costo-especifico i {
  color: #27ae60;
}

.btn-limpiar-costo {
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 2px 5px;
  cursor: pointer;
  font-size: 0.7em;
  transition: background-color 0.3s ease;
  margin-left: auto;
}

.btn-limpiar-costo:hover {
  background-color: #c0392b;
}

.costo-global {
  color: #3498db;
}

.costo-global i {
  color: #3498db;
}

.sin-costo {
  color: #e74c3c;
  display: flex;
  align-items: center;
  gap: 5px;
}

.sin-costo i {
  color: #e74c3c;
}

.clickeable {
  cursor: pointer;
}


/* Responsive Design Mejorado - 2 Columnas */
@media (min-width: 1200px) {
  .costos-grid, .medidas-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 992px) and (max-width: 1199px) {
  .costos-grid, .medidas-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 768px) and (max-width: 991px) {
  .costos-grid, .medidas-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }
  
  .costo-card, .medida-card {
    padding: 16px;
  }
  
  .costo-header h4, .medida-header h4 {
    font-size: 1em;
  }
  
  .btn-editar-costo, .btn-editar-costo-embarque {
    padding: 6px 12px;
    font-size: 0.85em;
  }
  
  .costo-display {
    padding: 8px 12px;
  }
  
  .checkbox-container {
    font-size: 0.9em;
  }
}

@media (min-width: 576px) and (max-width: 767px) {
  .costos-grid, .medidas-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .costo-card, .medida-card {
    padding: 14px;
  }
  
  .costo-header h4, .medida-header h4 {
    font-size: 0.95em;
  }
  
  .btn-editar-costo, .btn-editar-costo-embarque {
    padding: 5px 10px;
    font-size: 0.8em;
  }
  
  .costo-display {
    padding: 6px 10px;
    margin-bottom: 6px;
  }
  
  .costo-amount {
    font-size: 1em;
  }
  
  .checkbox-container {
    font-size: 0.85em;
  }
  
  .medida-actions {
    gap: 6px;
  }
  
  .input-costo-extra {
    width: 75px;
  }
}

@media (max-width: 575px) {
  .costos-grid, .medidas-grid {
    grid-template-columns: 1fr;
  }
  
  .header-container {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .seccion-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .btn-sincronizar, .btn-crear-medidas {
    width: 100%;
    justify-content: center;
    margin-bottom: 10px;
  }
  
  .costo-actions {
    flex-direction: column;
    gap: 5px;
  }
  
  .btn-editar-costo, .btn-editar-costo-embarque {
    width: 100%;
    text-align: center;
  }
  
  .costo-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .historial-item {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .historial-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .btn-eliminar-entrada {
    padding: 8px 12px;
    margin-top: 5px;
  }
  
  .input-costo-extra {
    width: 80px;
  }
  
  .costo-extra-section {
    padding: 10px;
    flex-wrap: wrap;
  }
  
  .medida-actions {
    flex-direction: column;
    gap: 5px;
  }
  
  .checkbox-container {
    font-size: 0.8em;
  }
  
  .costo-display {
    padding: 6px 10px;
    margin-bottom: 6px;
  }
  
  .costo-display:hover {
    transform: none;
    box-shadow: none;
  }
  
  .costo-amount {
    font-size: 1em;
  }
  
  .costo-origen {
    font-size: 0.75em;
  }
}

.hero-costos {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding: 22px;
  border: 1px solid #e6ecf2;
  border-radius: 18px;
  background: linear-gradient(135deg, #f8fbff 0%, #eef7ff 100%);
  box-shadow: 0 10px 24px rgba(44, 62, 80, 0.08);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.hero-copy {
  min-width: 0;
}

.eyebrow {
  color: #3498db;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h2 {
  margin: 4px 0;
  color: #1f2d3d;
}

.hero-copy p {
  margin: 0;
  color: #607080;
}

.resumen-costos {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 28px;
}

.resumen-card {
  padding: 16px;
  border: 1px solid #e6ecf2;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 14px rgba(44, 62, 80, 0.06);
}

.resumen-card span {
  display: block;
  color: #607080;
  font-size: 0.85rem;
  margin-bottom: 4px;
}

.resumen-card strong {
  color: #2c3e50;
  font-size: 1.6rem;
}

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 18px;
  margin-bottom: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e6ecf2;
}

.section-title-row h3 {
  margin: 0 0 4px;
  padding: 0;
  border: 0;
}

.section-title-row p {
  margin: 0;
  color: #607080;
}

.filtros-costos {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(170px, 220px);
  gap: 10px;
  min-width: min(520px, 100%);
}

.input-filtro {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d8dee9;
  border-radius: 10px;
  background: #fff;
  color: #2c3e50;
  font-size: 0.95rem;
}

.input-filtro:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.14);
}

.btn-archivados-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  background: #34495e;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.btn-archivados-toggle:hover {
  background: #2c3e50;
  transform: translateY(-1px);
}

.btn-archivados-toggle.activo {
  background: #16a085;
}

.tabs-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
  border-bottom: 2px solid #e6ecf2;
  padding-bottom: 0;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-bottom: 3px solid transparent;
  border-radius: 10px 10px 0 0;
  background: #f0f3f6;
  color: #607080;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  background: #e6ecf2;
}

.tab-btn.activo {
  background: #fff;
  color: #2c3e50;
  border-bottom-color: #3498db;
}

.tab-btn-crudo.activo {
  border-bottom-color: #e67e22;
}

.tab-count {
  background: #e6ecf2;
  color: #607080;
  font-size: 0.78rem;
  padding: 2px 8px;
  border-radius: 999px;
}

.tab-btn.activo .tab-count {
  background: #3498db;
  color: #fff;
}

.tab-btn-crudo.activo .tab-count {
  background: #e67e22;
  color: #fff;
}

.costo-card-crudo {
  border-left: 4px solid #e67e22;
}

.proveedores-lista {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.proveedor-row {
  display: grid;
  grid-template-columns: 28px 1fr;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e6ecf2;
  border-radius: 12px;
  background: #f8fafc;
  cursor: pointer;
  transition: all 0.2s ease;
}

.proveedor-row:hover {
  border-color: #3498db;
  background: #f0f7ff;
}

.proveedor-row.activo {
  border-color: #27ae60;
  background: #f0faf4;
  box-shadow: inset 0 0 0 1px #27ae60;
}

.proveedor-row.archivada {
  opacity: 0.55;
  cursor: default;
  border-style: dashed;
}

.proveedor-row-radio input[type="radio"] {
  accent-color: #27ae60;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.proveedor-row-archived-icon {
  color: #95a5a6;
  font-size: 0.9em;
}

.proveedor-row-info {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 12px;
  align-items: start;
  min-width: 0;
}

.proveedor-row-nombre {
  font-weight: 700;
  color: #2c3e50;
  line-height: 1.25;
  word-break: break-word;
}

.proveedor-row-costo {
  font-weight: 800;
  color: #27ae60;
  font-size: 1.18em;
  white-space: nowrap;
}

.proveedor-row-fecha {
  grid-column: 1 / -1;
  font-size: 0.82em;
  color: #95a5a6;
}

.proveedor-row-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid #e6ecf2;
}

.btn-mini {
  border: none;
  background: #e6ecf2;
  color: #607080;
  border-radius: 6px;
  padding: 7px 9px;
  cursor: pointer;
  font-size: 0.82em;
  transition: all 0.15s ease;
}

.btn-mini:hover {
  background: #3498db;
  color: #fff;
}

.btn-mini-danger:hover {
  background: #e74c3c;
}

.btn-mini-muted:hover {
  background: #7f8c8d;
}

.btn-mini-green:hover {
  background: #16a085;
}

.costos-grid {
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
}

.medidas-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.costo-card,
.medida-card {
  border: 1px solid #e6ecf2;
  border-radius: 14px;
  box-shadow: 0 8px 18px rgba(44, 62, 80, 0.07);
}

.costo-card {
  padding: 22px;
}

.costo-card .costo-header {
  align-items: flex-start;
  padding-bottom: 12px;
  border-bottom: 1px solid #edf1f5;
}

.costo-card .costo-header h4 {
  font-size: 1.18rem;
}

.proveedor-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #eef7ff;
  color: #2d74a8;
  font-size: 0.8rem;
  font-weight: 700;
}

.estado-archivo-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  margin-left: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #f2f4f5;
  color: #7f8c8d;
  font-size: 0.8rem;
  font-weight: 700;
}

.costo-card.archivada {
  background: #fbfbfc;
  border-style: dashed;
  opacity: 0.88;
}

.costo-principal {
  color: #27ae60;
  font-size: 1.55rem;
  font-weight: 800;
}

.empty-state {
  grid-column: 1 / -1;
  padding: 28px;
  border: 1px dashed #cbd6e2;
  border-radius: 14px;
  text-align: center;
  color: #607080;
  background: #f8fafc;
}

.empty-state i {
  display: block;
  margin-bottom: 8px;
  color: #9aa8b6;
}

.historial-proveedor {
  margin-top: 4px;
  color: #607080;
  font-size: 0.85em;
}

.seccion-header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.medida-card-crudo {
  border-left: 4px solid #e67e22;
}

@media (max-width: 900px) {
  .resumen-costos {
    grid-template-columns: repeat(2, 1fr);
  }
  .hero-costos {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .section-title-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filtros-costos {
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .gestion-costos-container {
    padding: 12px;
  }

  .hero-actions,
  .hero-costos .btn-nuevo-costo {
    width: 100%;
  }

  .btn-volver,
  .btn-rendimientos,
  .btn-nuevo-costo {
    width: 100%;
    justify-content: center;
  }

  .resumen-costos {
    grid-template-columns: repeat(2, 1fr);
  }

  .filtros-costos {
    grid-template-columns: 1fr;
  }

  .costos-grid,
  .medidas-grid {
    grid-template-columns: 1fr;
  }

  .proveedor-row-info {
    grid-template-columns: 1fr;
  }

  .proveedor-row-costo {
    white-space: normal;
  }

  .proveedor-row-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style> 
