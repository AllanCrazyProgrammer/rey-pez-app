<template>
  <div class="rendimientos-container">
    <div class="header-container">
      <button @click="volverAEmbarque" class="btn-volver">
        <i class="fas fa-arrow-left"></i> Volver al Embarque
      </button>
      <h2>Rendimientos por Medida</h2>
      <button @click="abrirModalNota" class="btn-nota">
        <i class="fas fa-sticky-note"></i> Agregar Nota
      </button>
      <button @click="irAGestionCostos" class="btn-costos">
        <i class="fas fa-dollar-sign"></i> Gestión de Costos
      </button>
      <button @click="abrirModalConfiguracion" class="btn-configuracion">
        <i class="fas fa-cog"></i> Configurar Pesos
      </button>
      <button @click="generarPDF" class="btn-pdf">
        <i class="fas fa-file-pdf"></i> Generar PDF
      </button>
    </div>
    
    <div v-if="!embarqueData">
      <p>Cargando datos del embarque...</p>
    </div>
    
    <div v-else class="rendimientos-grid">
      <div v-for="(medida, index) in medidasUnicas" :key="index" class="rendimiento-card">
        <div class="medida-info">
          <div class="medida-header">
            <span class="medida-label editable-label" @click="editarNombreMedida(medida)">
              {{ obtenerNombreMedidaPersonalizado(medida) }}
            </span>
            <div class="controles-medida">
              <div class="ocultar-control">
                <input 
                  type="checkbox" 
                  :id="'ocultar-' + index"
                  v-model="medidaOculta[medida]"
                  @change="guardarEstadoOculto"
                >
                <label :for="'ocultar-' + index">Ocultar en PDF</label>
              </div>
              <div class="analizar-ganancia-control">
                <input 
                  type="checkbox" 
                  :id="'analizar-' + index"
                  v-model="analizarGanancia[medida]"
                  @change="guardarEstadoAnalisis"
                >
                <label :for="'analizar-' + index">Analizar ganancia</label>
              </div>
            </div>
          </div>

          
          <div class="input-group">
            <template v-if="esMedidaMix(medida)">
              <div class="mix-inputs">
                <div class="mix-input">
                  <label @click="editarEtiqueta(medida, 'medida1')" class="editable-label">
                    {{ obtenerEtiqueta(medida, 'medida1') }}:
                  </label>
                  <input 
                    type="number" 
                    v-model="kilosCrudos[medida].medida1" 
                    @input="calcularRendimiento(medida)"
                    placeholder="Kilos medida 1"
                  >
                </div>
                <div class="mix-input">
                  <label @click="editarEtiqueta(medida, 'medida2')" class="editable-label">
                    {{ obtenerEtiqueta(medida, 'medida2') }}:
                  </label>
                  <input 
                    type="number" 
                    v-model="kilosCrudos[medida].medida2" 
                    @input="calcularRendimiento(medida)"
                    placeholder="Kilos medida 2"
                  >
                </div>
              </div>
            </template>
            <template v-else>
              <label>Kilos en crudo:</label>
              <input 
                type="number" 
                v-model="kilosCrudos[medida]" 
                @input="calcularRendimiento(medida)"
                placeholder="Ingrese kilos"
              >
            </template>
          </div>
          
          <div class="resultados">
            <p>Total embarcado: {{ formatearNumero(obtenerTotalEmbarcado(medida)) }} kg</p>
            <p class="rendimiento">
              Rendimiento: 
              <span :class="{ 'rendimiento-alto': getRendimiento(medida) > 1 }">
                {{ getRendimiento(medida).toFixed(2) }}
              </span>
            </p>
            
            <!-- Sección de ganancia -->
            <div v-if="gananciasCalculadas[medida] && analizarGanancia[medida]" class="ganancia-info">
              <div class="ganancia-header">
                <h4>💰 Análisis de Ganancia</h4>
              </div>
              <div class="ganancia-detalles">
                <div class="ganancia-item">
                  <span class="label">Precio de Venta:</span>
                  <div class="precio-venta-container">
                    <span class="valor precio-venta">${{ formatearPrecio(gananciasCalculadas[medida].precioVenta) }}</span>
                    
                    <!-- Precio promedio de múltiples clientes -->
                    <span v-if="gananciasCalculadas[medida].esPromedio" 
                          class="precio-promedio-badge"
                          :title="`Precio promedio ponderado. Clientes con precios específicos: ${gananciasCalculadas[medida].clientesConEspecifico.join(', ')}`">
                      📊 Promedio
                    </span>
                    
                    <!-- Precio específico de un cliente -->
                    <span v-else-if="gananciasCalculadas[medida].esEspecifico" 
                          class="precio-especifico-badge"
                          :title="`Precio específico más reciente para ${gananciasCalculadas[medida].clienteEspecifico}`">
                      📌 {{ gananciasCalculadas[medida].clienteEspecifico }}
                    </span>
                    
                    <!-- Precio general -->
                    <span v-else class="precio-general-badge" title="Precio general">
                      🌐 General
                    </span>
                  </div>
                </div>
                <div class="ganancia-item">
                  <span class="label">Costo Final:</span>
                  <span class="valor costo-final">${{ formatearPrecio(gananciasCalculadas[medida].costoFinal) }}</span>
                </div>
                <div class="ganancia-item">
                  <span class="label">Ganancia/kg:</span>
                  <span class="valor ganancia-unitaria" 
                        :class="{ 
                          'ganancia-positiva': gananciasCalculadas[medida].gananciaUnitaria > 0,
                          'ganancia-negativa': gananciasCalculadas[medida].gananciaUnitaria < 0
                        }">
                    ${{ formatearPrecio(gananciasCalculadas[medida].gananciaUnitaria) }}
                  </span>
                </div>
                <div class="ganancia-item ganancia-total-item">
                  <span class="label">Ganancia Total:</span>
                  <span class="valor ganancia-total"
                        :class="{ 
                          'ganancia-positiva': gananciasCalculadas[medida].gananciaTotal > 0,
                          'ganancia-negativa': gananciasCalculadas[medida].gananciaTotal < 0
                        }">
                    ${{ formatearPrecio(gananciasCalculadas[medida].gananciaTotal) }}
                  </span>
                </div>
                <div class="ganancia-fecha">
                  <span class="fecha-precio">Precio del: {{ formatearFecha(gananciasCalculadas[medida].fechaPrecio) }}</span>
                </div>
              </div>
            </div>
            
            <!-- Mensaje cuando no hay precio de venta -->
            <div v-else-if="analizarGanancia[medida]" class="sin-precio-venta">
              <p class="aviso-sin-precio">⚠️ No se encontró precio de venta para esta medida</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección de Ganancias de Crudos -->
    <div v-if="embarqueData && obtenerTallasCrudosUnicas().length > 0" class="crudos-ganancias-section">
      <h2>💰 Ganancias de Crudos por Talla</h2>
      
      <div class="crudos-ganancias-grid">
        <div v-for="talla in obtenerTallasCrudosUnicas()" :key="'crudo-' + talla" class="crudo-ganancia-card">
          <div class="crudo-ganancia-header">
            <h4>{{ talla }}</h4>
            <div class="crudo-ganancia-controls">
              <label class="checkbox-container">
                <input 
                  type="checkbox" 
                  v-model="analizarGananciaCrudos[talla]"
                  @change="guardarEstadoAnalisisCrudos"
                >
                <span class="checkmark"></span>
                Analizar ganancia
              </label>
            </div>
          </div>
          
          <!-- Información de ganancia -->
          <div v-if="gananciasCalculadasCrudos[talla] && analizarGananciaCrudos[talla]" class="crudo-ganancia-info">
            <div class="crudo-ganancia-detalles">
              <div class="ganancia-item">
                <span class="label">Total Kilos:</span>
                <span class="valor">{{ formatearNumero(gananciasCalculadasCrudos[talla].totalKilos) }} kg</span>
              </div>
              <div class="ganancia-item">
                <span class="label">Precio Promedio:</span>
                <div class="precio-container">
                  <span class="valor precio-venta">${{ formatearPrecio(gananciasCalculadasCrudos[talla].precioVenta) }}</span>
                  <span v-if="gananciasCalculadasCrudos[talla].hayPreciosIndividuales" 
                        class="precio-individual-badge"
                        title="Incluye precios individuales">
                    📝 Individual
                  </span>
                  <span v-else class="precio-sistema-badge" title="Precio del sistema">
                    🌐 Sistema
                  </span>
                </div>
              </div>
              <div class="ganancia-item">
                <span class="label">Costo Base:</span>
                <span class="valor costo-base">${{ formatearPrecio(gananciasCalculadasCrudos[talla].costoBase) }}</span>
              </div>
              <div class="ganancia-item">
                <span class="label">Ganancia/kg:</span>
                <span class="valor ganancia-unitaria" 
                      :class="{ 
                        'ganancia-positiva': gananciasCalculadasCrudos[talla].gananciaUnitaria > 0,
                        'ganancia-negativa': gananciasCalculadasCrudos[talla].gananciaUnitaria < 0
                      }">
                  ${{ formatearPrecio(gananciasCalculadasCrudos[talla].gananciaUnitaria) }}
                </span>
              </div>
              <div class="ganancia-item ganancia-total-item">
                <span class="label">Ganancia Total:</span>
                <span class="valor ganancia-total"
                      :class="{ 
                        'ganancia-positiva': gananciasCalculadasCrudos[talla].gananciaTotal > 0,
                        'ganancia-negativa': gananciasCalculadasCrudos[talla].gananciaTotal < 0
                      }">
                  ${{ formatearPrecio(gananciasCalculadasCrudos[talla].gananciaTotal) }}
                </span>
              </div>
              
              <!-- Detalles por cliente (solo si hay precios diferentes) -->
              <div v-if="deberMostrarDetallePorCliente(talla)" class="detalles-clientes">
                <h5>Detalle por Cliente:</h5>
                <div v-for="detalle in gananciasCalculadasCrudos[talla].detallesPorCliente" :key="detalle.cliente" class="detalle-cliente">
                  <span class="cliente-nombre">{{ detalle.cliente }}:</span>
                  <span class="cliente-kilos">{{ formatearNumero(detalle.kilos) }}kg</span>
                  <span class="cliente-precio">${{ formatearPrecio(detalle.precioVenta) }}</span>
                  <span class="cliente-ganancia" :class="{ 
                    'ganancia-positiva': detalle.gananciaTotal > 0,
                    'ganancia-negativa': detalle.gananciaTotal < 0
                  }">
                    ${{ formatearPrecio(detalle.gananciaTotal) }}
                  </span>
                  <span class="fuente-precio" :title="'Fuente del precio: ' + detalle.fuentePrecio">
                    {{ detalle.fuentePrecio === 'individual' ? '📝' : detalle.fuentePrecio === 'sistema-especifico' ? '📌' : '🌐' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Mensaje cuando no hay análisis activado -->
          <div v-else-if="!analizarGananciaCrudos[talla]" class="sin-analisis-crudo">
            <p class="aviso-sin-analisis">Activar análisis de ganancia para ver detalles</p>
          </div>
          
          <!-- Mensaje cuando no hay datos -->
          <div v-else class="sin-datos-crudo">
            <p class="aviso-sin-datos">⚠️ No se encontraron datos de venta para esta talla</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="mostrarModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Agregar Nota</h3>
        <textarea 
          v-model="nota" 
          placeholder="Escriba su nota aquí..."
          rows="4"
        ></textarea>
        <div class="modal-buttons">
          <button @click="guardarNota" class="btn-guardar">Guardar</button>
          <button @click="cerrarModal" class="btn-cancelar">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Modal de Configuración de Pesos -->
    <div v-if="mostrarModalConfiguracion" class="modal-overlay">
      <div class="modal-content">
        <h3>Configurar Pesos de Taras</h3>
        <div class="configuracion-grid">
          <div class="config-item">
            <label>Peso para cálculo de costos:</label>
            <input 
              type="number" 
              v-model="pesoTaraCosto" 
              min="1" 
              max="50"
              placeholder="Peso en kg"
            >
            <small class="config-help">Peso por defecto usado para calcular costos de crudos</small>
          </div>
          <div class="config-item">
            <label>Peso para cálculo de ventas:</label>
            <input 
              type="number" 
              v-model="pesoTaraVenta" 
              min="1" 
              max="50"
              placeholder="Peso en kg"
            >
            <small class="config-help">Peso por defecto usado para calcular ventas de crudos</small>
          </div>
        </div>
        <div class="modal-buttons">
          <button @click="guardarConfiguracion" class="btn-guardar">Guardar</button>
          <button @click="cerrarModalConfiguracion" class="btn-cancelar">Cancelar</button>
        </div>
      </div>
    </div>


  </div>
</template>

<script>
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { debounce } from 'lodash';
import { generarPDFRendimientos } from '@/utils/RendimientosPdf';

export default {
  name: 'Rendimientos',
  
  data() {
    return {
      kilosCrudos: {},
      medidasUnicas: [],
      embarqueData: null,
      guardadoAutomaticoActivo: false,
      nombresMedidasPersonalizados: {},
      mostrarModal: false,
      nota: '',
      medidaOculta: {},
      preciosVenta: {},
      gananciasCalculadas: {},
      gananciasCalculadasCrudos: {}, // Nueva propiedad para ganancias de crudos
      analizarGanancia: {},
      analizarGananciaCrudos: {}, // Nueva propiedad para controlar análisis de crudos
      diasRecientes: 3, // Días para considerar un embarque como "reciente"
      // Configuración de pesos por defecto
      pesoTaraCosto: 19, // Peso por defecto para cálculo de costos
      pesoTaraVenta: 20, // Peso por defecto para cálculo de ventas
      mostrarModalConfiguracion: false
    }
  },

  async created() {
    await this.cargarEmbarque();
    await this.cargarPreciosVenta();
    // Aplicar debounce después de definir el método
    this.guardarCambiosEnTiempoReal = debounce(this.guardarCambiosEnTiempoReal, 300);
  },

  // Recargar datos cuando se vuelve a este componente
  async activated() {
    console.log('Recargando datos de rendimientos...');
    await this.cargarEmbarque();
    await this.cargarPreciosVenta();
    // Forzar recálculo de ganancias después de recargar precios
    this.$nextTick(() => {
      this.calcularGanancias();
    });
  },

      methods: {
    obtenerNombreCliente(clienteId) {
      if (!this.embarqueData || !this.embarqueData.clientes) return '';
      const cliente = this.embarqueData.clientes.find(c => c.id.toString() === clienteId.toString());
      return cliente ? cliente.nombre : '';
    },

    // Calcular taras de crudo por medida
    calcularTarasCrudosPorMedida() {
      if (!this.embarqueData || !this.embarqueData.clientes) return {};
      
      const tarasPorMedida = {};
      
      this.embarqueData.clientes.forEach(cliente => {
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            if (crudo && crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach(item => {
                if (item.talla) {
                  // Para Ozuna: solo considerar si es venta
                  // Para otros clientes: todos los crudos son venta
                  const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
                  
                  if (esVenta) {
                    const medida = item.talla;
                    
                    if (!tarasPorMedida[medida]) {
                      tarasPorMedida[medida] = {
                        totalTaras: 0,
                        totalKilos: 0,
                        detalles: []
                      };
                    }
                  
                  let tarasItem = 0;
                  let kilosItem = 0;
                  
                  // Procesar taras principales
                  if (item.taras) {
                    const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
                    if (formatoGuion) {
                      const cantidad = parseInt(formatoGuion[1]) || 0;
                      let peso = parseInt(formatoGuion[2]) || 0;
                      
                      // Si el peso es 19, usar el peso configurado para costos
                      if (peso === 19) {
                        peso = this.pesoTaraCosto;
                      }
                      
                      tarasItem += cantidad;
                      kilosItem += cantidad * peso;
                    } else {
                      // Formato original si no coincide con el patrón
                      const [cantidad, peso] = item.taras.split('-').map(Number);
                      tarasItem += cantidad || 0;
                      kilosItem += (cantidad || 0) * (peso || 0);
                    }
                  }
                  
                  // Procesar sobrantes
                  if (item.sobrante) {
                    const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
                    if (formatoGuion) {
                      const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
                      let pesoSobrante = parseInt(formatoGuion[2]) || 0;
                      
                      // Si el peso es 19, usar el peso configurado para costos
                      if (pesoSobrante === 19) {
                        pesoSobrante = this.pesoTaraCosto;
                      }
                      
                      tarasItem += cantidadSobrante;
                      kilosItem += cantidadSobrante * pesoSobrante;
                    } else {
                      // Formato original si no coincide con el patrón
                      const [cantidadSobrante, pesoSobrante] = item.sobrante.split('-').map(Number);
                      tarasItem += cantidadSobrante || 0;
                      kilosItem += (cantidadSobrante || 0) * (pesoSobrante || 0);
                    }
                  }
                  
                  tarasPorMedida[medida].totalTaras += tarasItem;
                  tarasPorMedida[medida].totalKilos += kilosItem;
                  
                    // Agregar detalles para debugging
                    if (tarasItem > 0) {
                      tarasPorMedida[medida].detalles.push({
                        cliente: cliente.nombre,
                        taras: item.taras,
                        sobrante: item.sobrante,
                        tarasCalculadas: tarasItem,
                        kilosCalculados: kilosItem
                      });
                    }
                  }
                }
              });
            }
          });
        }
      });
      
      return tarasPorMedida;
    },

    // Calcular costos para crudos (costo base + 3.5)
    calcularCostosCrudos(tarasCrudosPorMedida) {
      if (!tarasCrudosPorMedida || !this.embarqueData) return {};
      
      const costosCrudos = {};
      const costosEmbarque = this.embarqueData.costosPorMedida || {};
      
      // Obtener todas las medidas de crudo únicas
      const medidasCrudo = Object.keys(tarasCrudosPorMedida);
      
      medidasCrudo.forEach(medida => {
        // Obtener el costo base para esta medida
        const costoBase = Number(costosEmbarque[medida]) || 0;
        
        // Calcular el costo final para crudos (costo base + 3.5)
        const costoFinal = costoBase + 3.5;
        
        costosCrudos[medida] = {
          costoBase: costoBase,
          costoFinal: costoFinal
        };
      });
      
      return costosCrudos;
    },

    // Mapear nombres de clientes del embarque con IDs del sistema de precios
    obtenerClienteIdParaPrecios(nombreCliente) {
      const nombre = nombreCliente.toLowerCase();
      if (nombre.includes('joselito')) return 'joselito';
      if (nombre.includes('catarro')) return 'catarro';
      if (nombre.includes('otilio')) return 'otilio';
      if (nombre.includes('ozuna')) return 'ozuna';
      return null; // Cliente no reconocido
    },

    async cargarEmbarque() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        const embarqueDoc = await getDoc(embarqueRef);
        
        if (embarqueDoc.exists()) {
          this.embarqueData = embarqueDoc.data();
          this.nombresMedidasPersonalizados = this.embarqueData.nombresMedidasPersonalizados || {};
          this.obtenerMedidasUnicas();
          this.medidaOculta = this.embarqueData.medidaOculta || {};
          this.analizarGanancia = this.embarqueData.analizarGanancia || {};
          this.analizarGananciaCrudos = this.embarqueData.analizarGananciaCrudos || {}; // Cargar analizarGananciaCrudos
          
          // Cargar configuración de pesos
          this.pesoTaraCosto = this.embarqueData.pesoTaraCosto || 19;
          this.pesoTaraVenta = this.embarqueData.pesoTaraVenta || 20;
          
          const kilosCrudosGuardados = this.embarqueData.kilosCrudos || {};
          this.kilosCrudos = { ...kilosCrudosGuardados };
          
          this.medidasUnicas.forEach(medida => {
            if (!this.kilosCrudos[medida]) {
              if (this.esMedidaMix(medida)) {
                this.$set(this.kilosCrudos, medida, {
                  medida1: 0,
                  medida2: 0,
                  etiqueta1: 'Kilos en crudo (Medida 1)',
                  etiqueta2: 'Kilos en crudo (Medida 2)'
                });
              } else {
                this.$set(this.kilosCrudos, medida, 0);
              }
            }
          });
          
          this.guardadoAutomaticoActivo = true;
          
          // Calcular ganancias después de cargar embarque
          if (Object.keys(this.preciosVenta).length > 0) {
            this.calcularGanancias();
          }
        } else {
          console.error('No se encontró el embarque');
        }
      } catch (error) {
        console.error('Error al cargar el embarque:', error);
      }
    },

    async cargarPreciosVenta() {
      try {
        const db = getFirestore();
        const preciosRef = collection(db, 'precios');
        const q = query(preciosRef, orderBy('fecha', 'desc'));
        const preciosSnapshot = await getDocs(q);
        
        // Crear un mapa para organizar los precios por producto
        const preciosMap = new Map();
        
        preciosSnapshot.docs.forEach(docSnapshot => {
          const precio = { id: docSnapshot.id, ...docSnapshot.data() };
          const clave = precio.producto.toLowerCase().trim();
          
          if (!preciosMap.has(clave)) {
            preciosMap.set(clave, []);
          }
          preciosMap.get(clave).push(precio);
        });
        
        // Organizar precios por producto (mantener estructura existente)
        const preciosOrganizados = {};
        preciosMap.forEach((precios, producto) => {
          // Ordenar por fecha (más reciente primero)
          const preciosOrdenados = precios.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
          preciosOrganizados[producto] = preciosOrdenados;
        });
        
        this.preciosVenta = preciosOrganizados;
        
        // Calcular ganancias después de cargar precios
        if (this.embarqueData) {
          this.calcularGanancias();
        }
        
      } catch (error) {
        console.error('Error al cargar precios de venta:', error);
      }
    },

    obtenerPrecioVentaParaFecha(medida, fechaEmbarque, clienteId = null) {
      // Normalizar el nombre de la medida para buscar en precios
      const medidaNormalizada = medida.toLowerCase().trim().replace(' maquila ozuna', '');
      
      // Buscar precios para esta medida - primero intento directo
      let preciosProducto = this.preciosVenta[medidaNormalizada];
      
      // Si no se encuentra, intenta variaciones (guión vs espacio)
      if (!preciosProducto || preciosProducto.length === 0) {
        // Convertir guiones a espacios y viceversa
        const medidaConEspacio = medidaNormalizada.replace(/-/g, ' ');
        const medidaConGuion = medidaNormalizada.replace(/ /g, '-');
        
        // Buscar en todas las variaciones
        preciosProducto = this.preciosVenta[medidaConEspacio] || this.preciosVenta[medidaConGuion];
        
        if (preciosProducto) {
          console.log(`[${medida}] Precio encontrado con variación: ${medidaConEspacio !== medidaNormalizada ? medidaConEspacio : medidaConGuion}`);
        }
      }
      
      if (!preciosProducto || preciosProducto.length === 0) {
        console.log(`[${medida}] No se encontraron precios para la medida normalizada: ${medidaNormalizada}`);
        console.log(`[${medida}] Precios disponibles:`, Object.keys(this.preciosVenta));
        return null;
      }
      
      // Crear fecha del embarque solo con año-mes-día (sin hora)
      const fechaEmbarqueStr = new Date(fechaEmbarque).toISOString().split('T')[0];
      const fechaEmbarqueObj = new Date(fechaEmbarqueStr);
      const fechaHoy = new Date().toISOString().split('T')[0];
      const fechaHoyObj = new Date(fechaHoy);
      const diasDiferencia = Math.floor((fechaHoyObj - fechaEmbarqueObj) / (1000 * 60 * 60 * 24));
      
      const embarqueEsReciente = diasDiferencia <= this.diasRecientes;
      const embarqueEsHoyOFuturo = fechaEmbarqueStr >= fechaHoy;
      const debeUsarPreciosRecientes = embarqueEsReciente || embarqueEsHoyOFuturo;
      
      // Debug simplificado solo para errores
      if (!preciosProducto || preciosProducto.length === 0) {
        console.log(`[${medida}] ⚠️ No se encontraron precios disponibles`);
      }
      
      if (debeUsarPreciosRecientes) {
        let razonPrecioReciente = '';
        if (embarqueEsHoyOFuturo) {
          razonPrecioReciente = '(embarque de hoy/futuro)';
        } else if (embarqueEsReciente) {
          razonPrecioReciente = `(embarque reciente: hace ${diasDiferencia} día${diasDiferencia !== 1 ? 's' : ''})`;
        }
        
        // Precio más reciente aplicado
        
        // Para embarques de hoy o futuros, buscar el precio más reciente
        if (clienteId) {
          const precioEspecificoReciente = preciosProducto.find(p => p.clienteId === clienteId);
          if (precioEspecificoReciente) {
            return precioEspecificoReciente;
          }
        }
        
        // Si no hay específico, usar el precio general más reciente
        const precioGeneralReciente = preciosProducto.find(p => !p.clienteId);
        if (precioGeneralReciente) {
          return precioGeneralReciente;
        }
      } else {
        // LÓGICA ORIGINAL: Para embarques pasados, buscar el precio válido para esa fecha
        
        // Primero buscar precio específico para el cliente si se proporciona
        if (clienteId) {
          for (const precio of preciosProducto) {
            const fechaPrecioStr = new Date(precio.fecha).toISOString().split('T')[0];
            if (fechaPrecioStr <= fechaEmbarqueStr && precio.clienteId === clienteId) {
              return precio;
            }
          }
        }
        
        // Si no hay precio específico, buscar precio general
        for (const precio of preciosProducto) {
          const fechaPrecioStr = new Date(precio.fecha).toISOString().split('T')[0];
          if (fechaPrecioStr <= fechaEmbarqueStr && !precio.clienteId) {
            return precio;
          }
        }
      }
      
      // FALLBACK: Si no se encuentra nada, usar el más antiguo disponible
      const preciosGenerales = preciosProducto.filter(p => !p.clienteId);
      if (preciosGenerales.length > 0) {
        return preciosGenerales[preciosGenerales.length - 1];
      }
      
      return preciosProducto[preciosProducto.length - 1];
    },

    calcularCostoFinal(medida) {
      const costosEmbarque = this.embarqueData?.costosPorMedida || {};
      const costo = Number(costosEmbarque[medida]) || 0;
      const rendimientoOriginal = this.getRendimiento(medida);
      // Usar rendimiento redondeado a 2 decimales (igual que se muestra en la UI)
      const rendimiento = Math.round(rendimientoOriginal * 100) / 100;
      const costoExtra = Number(this.embarqueData?.costoExtra) || 18;
      
      // Para medidas de Ozuna maquila, no agregar costo extra ya que no son ventas directas
      const esMedidaOzunaMaquila = medida.includes('Maquila Ozuna');
      
      // Solo sumar costo extra si la medida tiene formato numérico (ej: "51/60", "20/30")
      // No sumar para medidas de texto (ej: "macuil", "pulpa", etc.) ni para Ozuna Maquila
      const esMedidaNumerica = /^\d+\/\d+$/.test(medida.trim()) || /^\d+$/.test(medida.trim());
      
      if (esMedidaOzunaMaquila || !esMedidaNumerica) {
        return Math.round(costo * rendimiento);
      } else {
        return Math.round((costo * rendimiento) + costoExtra);
      }
    },

    calcularGanancias() {
      if (!this.embarqueData) return;
      
      const fechaEmbarque = this.embarqueData.fecha || new Date().toISOString().split('T')[0];
      const ganancias = {};
      
      this.medidasUnicas.forEach(medida => {
        // Solo calcular ganancias si el análisis está activado para esta medida
        if (!this.analizarGanancia[medida]) return;
        
        const costoFinal = this.calcularCostoFinal(medida);
        
        // Obtener clientes que tienen productos de esta medida
        const clientesConMedida = this.obtenerClientesConMedida(medida);
        
        // Calcular precio promedio ponderado y ganancias reales
        const resultadoCalculo = this.calcularPrecioYGanancias(medida, fechaEmbarque, clientesConMedida, costoFinal);
        
        if (!resultadoCalculo) return; // Si no hay precios, saltar esta medida
        
        ganancias[medida] = resultadoCalculo;
      });
      
      this.gananciasCalculadas = ganancias;
      
      // Calcular también las ganancias de crudos
      this.calcularGananciasCrudos();
    },

    // Nuevo método que calcula precio promedio ponderado y ganancias
    calcularPrecioYGanancias(medida, fechaEmbarque, clientesConMedida, costoFinal) {
      let gananciasPorCliente = [];
      let totalEmbarcadoGeneral = 0;
      let gananciaTotalSumada = 0;
      let totalVentasPonderadas = 0;
      
      // Obtener precio general más reciente
      const precioGeneral = this.obtenerPrecioVentaParaFecha(medida, fechaEmbarque, null);
      const fechaGeneral = precioGeneral ? new Date(precioGeneral.fecha) : null;
      
      // Calcular ganancias por cada cliente
      clientesConMedida.forEach(({ cliente, totalEmbarcado }) => {
        const clienteIdParaPrecios = this.obtenerClienteIdParaPrecios(cliente.nombre);
        
        // Buscar precio específico para el cliente
        const precioEspecifico = this.obtenerPrecioVentaParaFecha(medida, fechaEmbarque, clienteIdParaPrecios);
        
        // Decidir qué precio usar: específico solo si es más reciente que el general
        let precioAUsar = precioGeneral; // Por defecto usar general
        let esEspecifico = false;
        
        if (precioEspecifico && precioEspecifico.clienteId) {
          const fechaEspecifico = new Date(precioEspecifico.fecha);
          // Solo usar específico si es más reciente que el general (o si no hay general)
          if (!fechaGeneral || fechaEspecifico > fechaGeneral) {
            precioAUsar = precioEspecifico;
            esEspecifico = true;
          }
        }
        
        if (precioAUsar) {
          const precioUnitario = Math.round(precioAUsar.precio);
          const gananciaUnitaria = Math.round(precioUnitario - costoFinal);
          const gananciaTotal = Math.round(gananciaUnitaria * totalEmbarcado);
          
          gananciasPorCliente.push({
            cliente: cliente.nombre,
            precioVenta: precioUnitario,
            totalEmbarcado: totalEmbarcado,
            gananciaUnitaria: gananciaUnitaria,
            gananciaTotal: gananciaTotal,
            fechaPrecio: precioAUsar.fecha,
            esEspecifico: esEspecifico,
            clienteId: precioAUsar.clienteId || null
          });
          
          totalEmbarcadoGeneral += totalEmbarcado;
          gananciaTotalSumada += gananciaTotal;
          totalVentasPonderadas += precioUnitario * totalEmbarcado;
        }
      });
      
      if (gananciasPorCliente.length === 0) return null;
      
      // Calcular precio promedio ponderado
      const precioPromedioPonderado = totalEmbarcadoGeneral > 0 ? 
        Math.round(totalVentasPonderadas / totalEmbarcadoGeneral) : 0;
      
      // Determinar información para mostrar
      const clientesConEspecifico = gananciasPorCliente.filter(g => g.esEspecifico);
      const preciosUnicos = new Set(gananciasPorCliente.map(g => g.precioVenta));
      const tieneMultiplesPrecios = preciosUnicos.size > 1;
      const soloUnCliente = gananciasPorCliente.length === 1;
      
      // Debug detallado
      console.log(`[${medida}] Cálculo de precios:`, {
        fechaEmbarque: fechaEmbarque,
        precioGeneral: precioGeneral ? { precio: precioGeneral.precio, fecha: precioGeneral.fecha, clienteId: precioGeneral.clienteId } : null,
        fechaGeneral: precioGeneral?.fecha,
        clientesConEspecifico: clientesConEspecifico.map(c => ({ 
          cliente: c.cliente, 
          precio: c.precioVenta, 
          fecha: c.fechaPrecio,
          clienteId: c.clienteId 
        })),
        precioPromedio: precioPromedioPonderado,
        tieneMultiplesPrecios,
        soloUnCliente,
        totalClientes: gananciasPorCliente.length,
        detallesPorCliente: gananciasPorCliente.map(g => ({
          cliente: g.cliente,
          precio: g.precioVenta,
          fecha: g.fechaPrecio,
          esEspecifico: g.esEspecifico
        }))
      });
      
      let infoMostrar = {
        esPromedio: tieneMultiplesPrecios,
        esEspecifico: false,
        clienteEspecifico: null,
        clientesConEspecifico: clientesConEspecifico.map(c => c.cliente),
        fechaMasReciente: gananciasPorCliente.reduce((fecha, g) => {
          const fechaActual = new Date(g.fechaPrecio);
          return !fecha || fechaActual > fecha ? fechaActual : fecha;
        }, null)
      };
      
      // Si solo hay un cliente con precio específico más reciente, mostrarlo como específico
      if (clientesConEspecifico.length === 1 && soloUnCliente) {
        infoMostrar.esEspecifico = true;
        infoMostrar.esPromedio = false;
        infoMostrar.clienteEspecifico = clientesConEspecifico[0].cliente;
      }
      
      return {
        precioVenta: precioPromedioPonderado,
        costoFinal: Math.round(costoFinal),
        gananciaUnitaria: Math.round(precioPromedioPonderado - costoFinal),
        gananciaTotal: gananciaTotalSumada,
        totalEmbarcado: Math.round(totalEmbarcadoGeneral),
        fechaPrecio: infoMostrar.fechaMasReciente?.toISOString().split('T')[0],
        esPromedio: infoMostrar.esPromedio,
        esEspecifico: infoMostrar.esEspecifico,
        clienteEspecifico: infoMostrar.clienteEspecifico,
        clientesConEspecifico: infoMostrar.clientesConEspecifico,
        detallesPorCliente: gananciasPorCliente
      };
    },

    // ============ MÉTODOS PARA CÁLCULO DE GANANCIAS DE CRUDOS ============

    // Obtener todas las tallas de crudos únicas
    obtenerTallasCrudosUnicas() {
      if (!this.embarqueData || !this.embarqueData.clientes) return [];
      
      const tallasSet = new Set();
      let totalItems = 0;
      let itemsDeVenta = 0;
      let itemsSinVenta = 0;
      
            this.embarqueData.clientes.forEach(cliente => {
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach((crudo, crudoIndex) => {
            if (crudo && crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach((item, itemIndex) => {
                totalItems++;
                
                if (item.talla) {
                  // Para Ozuna: solo mostrar si es venta
                  // Para otros clientes: todos los crudos son venta
                  const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
                  
                  if (esVenta) {
                    tallasSet.add(item.talla);
                    itemsDeVenta++;
                  } else {
                    itemsSinVenta++;
                  }
                }
              });
            }
          });
        }
      });
      
      return Array.from(tallasSet).sort();
    },

    // Calcular ganancias de crudos por talla
    calcularGananciasCrudos() {
      if (!this.embarqueData) return;
      
      const fechaEmbarque = this.embarqueData.fecha || new Date().toISOString().split('T')[0];
      const ganancias = {};
      const tallasCrudos = this.obtenerTallasCrudosUnicas();
      
              tallasCrudos.forEach(talla => {
        // Solo calcular ganancias si el análisis está activado para esta talla
        if (!this.analizarGananciaCrudos[talla]) {
          return;
        }
        const resultadoCalculo = this.calcularGananciasPorTallaCrudo(talla, fechaEmbarque);
        
        if (resultadoCalculo) {
          ganancias[talla] = resultadoCalculo;
        }
      });
      
      this.gananciasCalculadasCrudos = ganancias;
    },

    // Calcular ganancias para una talla específica de crudo
    calcularGananciasPorTallaCrudo(talla, fechaEmbarque) {
      if (!this.embarqueData || !this.embarqueData.clientes) return null;
      
      let totalKilos = 0;
      let totalGanancias = 0;
      let totalVentas = 0;
      let detallesPorCliente = [];
      let hayPreciosIndividuales = false;
      
      // Calcular el costo base para esta talla usando el sistema existente
      const costoBase = this.calcularCostoCrudoPorTalla(talla);
      
      // Iterar por todos los clientes y sus crudos
      this.embarqueData.clientes.forEach(cliente => {
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            if (crudo && crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach(item => {
                if (item.talla === talla) {
                  // Para Ozuna: solo considerar si es venta
                  // Para otros clientes: todos los crudos son venta
                  const esVenta = cliente.nombre === 'Ozuna' ? item.esVenta : true;
                  
                  if (esVenta) {
                    // Calcular kilos del item
                    const kilosItem = this.calcularKilosCrudosItem(item);
                    totalKilos += kilosItem;
                    
                    // Determinar precio a usar
                    let precioAUsar = null;
                    let fuentePrecio = '';
                    
                    if (item.precio && item.precio > 0) {
                      // Usar precio individual del item
                      precioAUsar = item.precio;
                      fuentePrecio = 'individual';
                      hayPreciosIndividuales = true;
                    } else {
                      // Usar precio del sistema general
                      const clienteIdParaPrecios = this.obtenerClienteIdParaPrecios(cliente.nombre);
                      const precioSistema = this.obtenerPrecioVentaParaFecha(talla, fechaEmbarque, clienteIdParaPrecios);
                      if (precioSistema) {
                        precioAUsar = precioSistema.precio;
                        fuentePrecio = precioSistema.clienteId ? 'sistema-especifico' : 'sistema-general';
                      }
                    }
                    
                    if (precioAUsar && kilosItem > 0) {
                      const gananciaUnitaria = precioAUsar - costoBase;
                      const gananciaTotal = gananciaUnitaria * kilosItem;
                      
                      totalGanancias += gananciaTotal;
                      totalVentas += precioAUsar * kilosItem;
                      
                      detallesPorCliente.push({
                        cliente: cliente.nombre,
                        kilos: kilosItem,
                        precioVenta: precioAUsar,
                        gananciaUnitaria: gananciaUnitaria,
                        gananciaTotal: gananciaTotal,
                        fuentePrecio: fuentePrecio,
                        taras: item.taras,
                        sobrante: item.sobrante
                      });
                    }
                  }
                }
              });
            }
          });
        }
      });
      
      if (totalKilos === 0 || detallesPorCliente.length === 0) {
        return null;
      }
      
      // Calcular precio promedio ponderado
      const precioPromedioPonderado = totalVentas / totalKilos;
      const gananciaUnitariaPromedio = totalGanancias / totalKilos;
      
      const resultado = {
        talla: talla,
        totalKilos: Math.round(totalKilos),
        precioVenta: Math.round(precioPromedioPonderado),
        costoBase: Math.round(costoBase),
        gananciaUnitaria: Math.round(gananciaUnitariaPromedio),
        gananciaTotal: Math.round(totalGanancias),
        hayPreciosIndividuales: hayPreciosIndividuales,
        detallesPorCliente: detallesPorCliente,
        fechaCalculo: new Date().toISOString().split('T')[0]
      };
      
      // Ganancia calculada exitosamente
      
      return resultado;
    },

    // Calcular costo para una talla de crudo
    calcularCostoCrudoPorTalla(talla) {
      // Usar el sistema de costos existente
      const costosEmbarque = this.embarqueData?.costosPorMedida || {};
      
      // Buscar primero con nombre exacto
      let costo = Number(costosEmbarque[talla]) || 0;
      let medidaEncontrada = talla;
      
      // Si no se encuentra, buscar insensible a mayúsculas/minúsculas
      if (costo === 0) {
        const tallaLower = talla.toLowerCase();
        for (const [medida, costoValue] of Object.entries(costosEmbarque)) {
          if (medida.toLowerCase() === tallaLower) {
            costo = Number(costoValue) || 0;
            medidaEncontrada = medida;
            break;
          }
        }
      }
      
      // Si aún no se encuentra costo, inicializar costosPorMedida si no existe
      if (costo === 0 && (!this.embarqueData.costosPorMedida || Object.keys(this.embarqueData.costosPorMedida).length === 0)) {
        console.log(`⚠️ No se encontró costo para talla ${talla}. Inicializando costosPorMedida automáticamente.`);
        this.inicializarCostosPorMedida();
        
        // Intentar buscar nuevamente después de inicializar
        const costosEmbarqueActualizados = this.embarqueData?.costosPorMedida || {};
        costo = Number(costosEmbarqueActualizados[talla]) || 0;
        
        if (costo === 0) {
          const tallaLower = talla.toLowerCase();
          for (const [medida, costoValue] of Object.entries(costosEmbarqueActualizados)) {
            if (medida.toLowerCase() === tallaLower) {
              costo = Number(costoValue) || 0;
              medidaEncontrada = medida;
              break;
            }
          }
        }
      }
      
      console.log(`🔍 DEBUG - Calculando costo para talla ${talla}:`, {
        tallaBuscada: talla,
        medidaEncontrada: medidaEncontrada,
        costosDisponibles: Object.keys(costosEmbarque),
        costoEncontrado: costosEmbarque[medidaEncontrada],
        costoCalculado: costo,
        esCrudo: talla.includes('c/c'),
        busquedaCaseInsensitive: talla !== medidaEncontrada
      });
      
      // Para crudos, no aplicar costo extra ya que son materias primas
      return costo;
    },

    // Calcular kilos de un item de crudo
    calcularKilosCrudosItem(item) {
      let kilosTotales = 0;
      let detalleCalculo = {
        talla: item.talla,
        taras: item.taras,
        sobrante: item.sobrante,
        kilosDeTaras: 0,
        kilosDeSobrante: 0
      };
      
      // Procesar taras principales
      if (item.taras) {
        const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
        if (formatoGuion) {
          const cantidad = parseInt(formatoGuion[1]) || 0;
          let peso = parseInt(formatoGuion[2]) || 0;
          
          // Si el peso es 19, usar el peso configurado para ventas
          if (peso === 19) {
            peso = this.pesoTaraVenta;
          }
          
          detalleCalculo.kilosDeTaras = cantidad * peso;
          kilosTotales += detalleCalculo.kilosDeTaras;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidad, peso] = item.taras.split('-').map(Number);
          detalleCalculo.kilosDeTaras = (cantidad || 0) * (peso || 0);
          kilosTotales += detalleCalculo.kilosDeTaras;
        }
      }
      
      // Procesar sobrantes
      if (item.sobrante) {
        const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
        if (formatoGuion) {
          const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
          let pesoSobrante = parseInt(formatoGuion[2]) || 0;
          
          // Si el peso es 19, usar el peso configurado para ventas
          if (pesoSobrante === 19) {
            pesoSobrante = this.pesoTaraVenta;
          }
          
          detalleCalculo.kilosDeSobrante = cantidadSobrante * pesoSobrante;
          kilosTotales += detalleCalculo.kilosDeSobrante;
        } else {
          // Formato original si no coincide con el patrón
          const [cantidadSobrante, pesoSobrante] = item.sobrante.split('-').map(Number);
          detalleCalculo.kilosDeSobrante = (cantidadSobrante || 0) * (pesoSobrante || 0);
          kilosTotales += detalleCalculo.kilosDeSobrante;
        }
      }
      
      detalleCalculo.kilosTotales = kilosTotales;
      
      return kilosTotales;
    },

    // Método auxiliar para guardar estado de análisis de crudos
    async guardarEstadoAnalisisCrudos() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          analizarGananciaCrudos: this.analizarGananciaCrudos
        });
        
        console.log('Estado de análisis de ganancia de crudos guardado correctamente');
      } catch (error) {
        console.error('Error al guardar estado de análisis de crudos:', error);
      }
    },

    // Inicializar costos por medida automáticamente
    async inicializarCostosPorMedida() {
      try {
        const db = getFirestore();
        
        // Cargar costos registrados desde el historial
        const historialRef = collection(db, 'historial_costos');
        const historialSnapshot = await getDocs(historialRef);
        
        const historialCompleto = [];
        historialSnapshot.forEach(doc => {
          const data = doc.data();
          historialCompleto.push({
            ...data,
            id: doc.id
          });
        });
        
        // Ordenar por timestamp descendente
        historialCompleto.sort((a, b) => {
          const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return timestampB - timestampA;
        });
        
        // Obtener solo los costos más recientes por medida (que no estén eliminados)
        const costosRegistrados = {};
        const medidasProcesadas = new Set();
        
        historialCompleto.forEach(entrada => {
          if (!medidasProcesadas.has(entrada.medida)) {
            // Si no está marcada como eliminada, es el costo actual
            if (!entrada.eliminado && !entrada.medidaEliminada) {
              costosRegistrados[entrada.medida] = {
                costoBase: entrada.costoBase,
                fecha: entrada.fecha,
                timestamp: entrada.timestamp,
                id: entrada.id
              };
            }
            medidasProcesadas.add(entrada.medida);
          }
        });
        
        // Aplicar costos a las medidas del embarque si no tienen costo asignado
        const costosEmbarque = this.embarqueData?.costosPorMedida || {};
        let costosActualizados = false;
        
        // Obtener todas las tallas de crudos para aplicar costos
        const tallasCrudos = this.obtenerTallasCrudosUnicas();
        
        tallasCrudos.forEach(talla => {
          // Buscar costo registrado para esta talla (exacto o insensible a mayúsculas)
          let costoEncontrado = null;
          
          if (costosRegistrados[talla]) {
            costoEncontrado = costosRegistrados[talla];
          } else {
            // Búsqueda insensible a mayúsculas/minúsculas
            const tallaLower = talla.toLowerCase();
            for (const [medida, costoInfo] of Object.entries(costosRegistrados)) {
              if (medida.toLowerCase() === tallaLower) {
                costoEncontrado = costoInfo;
                break;
              }
            }
          }
          
          // Si se encontró un costo y no está asignado en el embarque, aplicarlo
          if (costoEncontrado && !costosEmbarque[talla]) {
            costosEmbarque[talla] = costoEncontrado.costoBase;
            costosActualizados = true;
            console.log(`💰 Aplicando costo automático para ${talla}: $${costoEncontrado.costoBase}`);
          }
        });
        
        // Guardar cambios en Firebase si hubo actualizaciones
        if (costosActualizados) {
          // Actualizar los datos locales
          if (!this.embarqueData.costosPorMedida) {
            this.embarqueData.costosPorMedida = {};
          }
          Object.assign(this.embarqueData.costosPorMedida, costosEmbarque);
          
          // Guardar en Firebase
          const embarqueId = this.$route.params.id;
          const embarqueRef = doc(db, 'embarques', embarqueId);
          
          await updateDoc(embarqueRef, {
            costosPorMedida: costosEmbarque
          });
          
          console.log('✅ Costos inicializados y guardados automáticamente');
        }
        
      } catch (error) {
        console.error('Error al inicializar costos por medida:', error);
      }
    },

    // Método auxiliar para obtener nombre de cliente desde ID
    obtenerNombreClienteDeId(clienteId) {
      const mapeo = {
        'joselito': 'Joselito',
        'catarro': 'Catarro', 
        'otilio': 'Otilio',
        'ozuna': 'Ozuna'
      };
      return mapeo[clienteId] || clienteId;
    },

    // Nuevo método para obtener clientes que tienen productos de una medida específica
    obtenerClientesConMedida(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return [];
      
      const clientesConMedida = [];
      const esOzuna = medida.includes('Maquila Ozuna');
      const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
      
      this.embarqueData.clientes.forEach(cliente => {
        let totalEmbarcado = 0;
        
        cliente.productos.forEach(producto => {
          if (!producto.medida) return;
          
          let incluir = false;
          
          // Lógica para determinar si incluir el producto
          if (esOzuna) {
            // Solo incluir si el producto es de cliente Ozuna y NO es una venta
            incluir = producto.medida.toLowerCase().trim() === medidaBase && 
                     cliente.nombre === 'Ozuna' && 
                     !producto.esVenta;
          } else {
            // Solo incluir si el producto coincide con la medida y NO es de Ozuna o es de Ozuna pero es VENTA
            incluir = producto.medida.toLowerCase().trim() === medidaBase && 
                     (cliente.nombre !== 'Ozuna' || producto.esVenta);
          }
          
          if (incluir) {
            if (producto.tipo === 'c/h20') {
              const totalBolsas = this.calcularTotalBolsas(producto);
              const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
              totalEmbarcado += (totalBolsas * valorNeto);
            } else {
              const sumaKilos = producto.kilos.reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
              const sumaTaras = this.calcularTotalTaras(producto);
              const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
              totalEmbarcado += (sumaKilos - descuentoTaras);
            }
          }
        });
        
        if (totalEmbarcado > 0) {
          clientesConMedida.push({
            cliente: cliente,
            totalEmbarcado: totalEmbarcado
          });
        }
      });
      
      return clientesConMedida;
    },

    async guardarCambiosEnTiempoReal() {
      if (!this.guardadoAutomaticoActivo) return;

      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          kilosCrudos: this.kilosCrudos,
          medidaOculta: this.medidaOculta,
          analizarGanancia: this.analizarGanancia,
          analizarGananciaCrudos: this.analizarGananciaCrudos // Guardar analizarGananciaCrudos
        });
        
        console.log('Rendimientos guardados:', this.kilosCrudos);
      } catch (error) {
        console.error('Error al guardar los rendimientos:', error);
      }
    },

    obtenerMedidasUnicas() {
      if (!this.embarqueData || !this.embarqueData.clientes) return;
      
      const medidasMap = new Map();
      const mixMedidas = new Map();
      
      this.embarqueData.clientes.forEach(cliente => {
        cliente.productos.forEach(producto => {
          if (producto.medida) {
            const medidaNormalizada = producto.medida.toLowerCase().trim();
            let nombreMedida = producto.medida;
            
            // Solo añadir "Maquila Ozuna" si es de Ozuna y NO es una venta
            if (cliente.nombre === 'Ozuna' && !producto.esVenta) {
              nombreMedida = `${producto.medida} Maquila Ozuna`;
            }

            if (medidaNormalizada.endsWith('mix')) {
              const baseSize = medidaNormalizada.split(' ')[0];
              mixMedidas.set(baseSize, nombreMedida);
            } else if (!medidasMap.has(nombreMedida)) {
              medidasMap.set(nombreMedida, nombreMedida);
            }
          }
        });
      });

      const mixKeys = Array.from(mixMedidas.keys()).sort();
      if (mixKeys.length >= 2) {
        for (let i = 0; i < mixKeys.length; i += 2) {
          if (i + 1 < mixKeys.length) {
            const combinedName = `${mixKeys[i]}-${mixKeys[i+1]} mix`;
            medidasMap.set(combinedName, combinedName);
            
            if (!this.kilosCrudos[combinedName]) {
              this.$set(this.kilosCrudos, combinedName, {
                medida1: 0,
                medida2: 0,
                etiqueta1: `Kilos en crudo (${mixKeys[i]})`,
                etiqueta2: `Kilos en crudo (${mixKeys[i+1]})`
              });
            }
          }
        }
      }
      
      this.medidasUnicas = Array.from(medidasMap.values());
    },

    obtenerTotalEmbarcado(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      if (medida.includes('-') && medida.endsWith('mix')) {
        const [medida1, medida2] = medida.split('-').map(m => m.trim());
        const total1 = this.calcularTotalParaMedida(medida1 + ' mix');
        const total2 = this.calcularTotalParaMedida(medida2.replace(' mix', '') + ' mix');
        return total1 + total2;
      }
      
      return this.calcularTotalParaMedida(medida);
    },

    calcularTotalParaMedida(medida) {
      const esOzuna = medida.includes('Maquila Ozuna');
      const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
      
      return this.embarqueData.clientes.reduce((total, cliente) => {
        return total + cliente.productos
          .filter(p => {
            if (!p.medida) return false;
            
            // Si la medida original es de Ozuna
            if (esOzuna) {
              // Solo incluir si el producto es de cliente Ozuna y NO es una venta
              return p.medida.toLowerCase().trim() === medidaBase && 
                     cliente.nombre === 'Ozuna' && 
                     !p.esVenta;
            } else {
              // Solo incluir si el producto coincide con la medida y NO es de Ozuna o es de Ozuna pero es VENTA
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

    obtenerTotalParaRendimiento(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      const medidaNormalizada = medida.toLowerCase();
      const productos = this.embarqueData.clientes.flatMap(cliente => 
        cliente.productos.filter(p => 
          p.medida && p.medida.toLowerCase() === medidaNormalizada
        )
      );

      const tieneCH20 = productos.some(p => p.tipo === 'c/h20');
      
      if (tieneCH20) {
        return this.obtenerTotalEmbarcado(medida);
      } else {
        return this.obtenerTotalReal(medida);
      }
    },

    obtenerTotalReal(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      const esOzuna = medida.includes('Maquila Ozuna');
      const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
      
      return this.embarqueData.clientes.reduce((total, cliente) => {
        return total + cliente.productos
          .filter(p => {
            if (!p.medida) return false;
            
            // Si la medida original es de Ozuna
            if (esOzuna) {
              // Solo incluir si el producto es de cliente Ozuna y NO es una venta
              return p.medida.toLowerCase().trim() === medidaBase && 
                     cliente.nombre === 'Ozuna' && 
                     !p.esVenta;
            } else {
              // Solo incluir si el producto coincide con la medida y NO es de Ozuna o es de Ozuna pero es VENTA
              return p.medida.toLowerCase().trim() === medidaBase && 
                     (cliente.nombre !== 'Ozuna' || p.esVenta);
            }
          })
          .reduce((subtotal, producto) => {
            return subtotal + this.calcularTotalKilos(producto);
          }, 0);
      }, 0);
    },

    calcularTotalKilos(producto) {
      if (!producto.kilos) return 0;
      
      const sumaKilos = producto.kilos.reduce((total, kilo) => total + (Number(kilo) || 0), 0);
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      const descuentoTaras = producto.restarTaras ? tarasNormales * 3 : 0;
      
      return sumaKilos - descuentoTaras;
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

    calcularRendimiento(medida) {
      const totalEmbarcado = this.obtenerTotalEmbarcado(medida);
      if (totalEmbarcado === 0) return 0;
      
      let kilosCrudos;
      if (this.esMedidaMix(medida)) {
        kilosCrudos = Number(this.kilosCrudos[medida]?.medida1 || 0) + 
                      Number(this.kilosCrudos[medida]?.medida2 || 0);
      } else {
        kilosCrudos = Number(this.kilosCrudos[medida] || 0);
      }
      
      const rendimiento = kilosCrudos / totalEmbarcado;
      
      this.guardarCambiosEnTiempoReal();
      return rendimiento;
    },

    getRendimiento(medida) {
      return this.calcularRendimiento(medida) || 0;
    },

    volverAEmbarque() {
      this.$router.push({
        name: 'EditarEmbarque',
        params: { id: this.$route.params.id }
      });
    },

    esMedidaMix(medida) {
      return medida.toLowerCase().includes('mix');
    },

    obtenerEtiqueta(medida, campo) {
      if (!this.kilosCrudos[medida]) return campo === 'medida1' ? 
        'Kilos en crudo (Medida 1)' : 'Kilos en crudo (Medida 2)';
        
      return campo === 'medida1' ? 
        (this.kilosCrudos[medida].etiqueta1 || 'Kilos en crudo (Medida 1)') : 
        (this.kilosCrudos[medida].etiqueta2 || 'Kilos en crudo (Medida 2)');
    },

    editarEtiqueta(medida, campo) {
      if (!this.kilosCrudos[medida]) {
        this.$set(this.kilosCrudos, medida, {
          medida1: 0,
          medida2: 0,
          etiqueta1: 'Kilos en crudo (Medida 1)',
          etiqueta2: 'Kilos en crudo (Medida 2)'
        });
      }

      const etiquetaActual = campo === 'medida1' ? 
        this.kilosCrudos[medida].etiqueta1 : 
        this.kilosCrudos[medida].etiqueta2;

      const nuevaEtiqueta = prompt('Ingrese el nuevo nombre para la medida:', etiquetaActual);
      
      if (nuevaEtiqueta !== null) {
        if (campo === 'medida1') {
          this.$set(this.kilosCrudos[medida], 'etiqueta1', nuevaEtiqueta);
        } else {
          this.$set(this.kilosCrudos[medida], 'etiqueta2', nuevaEtiqueta);
        }
        this.guardarCambiosEnTiempoReal();
      }
    },

    generarPDF() {
      const datosRendimientos = this.medidasUnicas
        .filter(medida => !this.medidaOculta[medida])
        .map(medida => {
          let kilosCrudos;
          if (this.esMedidaMix(medida)) {
            kilosCrudos = {
              medida1: Number(this.kilosCrudos[medida]?.medida1 || 0),
              medida2: Number(this.kilosCrudos[medida]?.medida2 || 0)
            };
          } else {
            kilosCrudos = Number(this.kilosCrudos[medida] || 0);
          }

          const rendimiento = this.getRendimiento(medida);

          // Calcular costo final para el PDF usando el método que considera Ozuna Maquila
          const costoFinal = this.calcularCostoFinal(medida);

          return {
            medida: medida,
            kilosCrudos: kilosCrudos,
            totalEmbarcado: this.obtenerTotalEmbarcado(medida),
            rendimiento: rendimiento,
            costoFinal: costoFinal
          };
        });

      const embarqueDataConNota = {
        ...this.embarqueData,
        notaRendimientos: this.embarqueData?.notaRendimientos || '',
        mostrarColumnaCosto: true // Siempre mostrar la columna de costos
      };

      // Filtrar ganancias solo para medidas visibles Y que tengan análisis activado
      const gananciasVisibles = Object.entries(this.gananciasCalculadas)
        .filter(([medida]) => !this.medidaOculta[medida] && this.analizarGanancia[medida])
        .reduce((acc, [medida, ganancia]) => {
          acc[medida] = ganancia;
          return acc;
        }, {});

      // Calcular taras de crudo por medida
      const tarasCrudosPorMedida = this.calcularTarasCrudosPorMedida();

      // Filtrar ganancias de crudos solo para tallas que tengan análisis activado
      const gananciasVisiblesCrudos = Object.entries(this.gananciasCalculadasCrudos)
        .filter(([talla]) => this.analizarGananciaCrudos[talla])
        .reduce((acc, [talla, ganancia]) => {
          acc[talla] = ganancia;
          return acc;
        }, {});

      // Calcular costos para crudos (costo base + 3.5)
      const costosCrudos = this.calcularCostosCrudos(tarasCrudosPorMedida);

      // Pasar la configuración de pesos al PDF
      const configuracionPesos = {
        pesoTaraCosto: this.pesoTaraCosto,
        pesoTaraVenta: this.pesoTaraVenta
      };

      generarPDFRendimientos(datosRendimientos, embarqueDataConNota, gananciasVisibles, tarasCrudosPorMedida, gananciasVisiblesCrudos, costosCrudos, configuracionPesos);
    },

    obtenerNombreMedidaPersonalizado(medida) {
      return this.nombresMedidasPersonalizados[medida] || medida;
    },

    async editarNombreMedida(medida) {
      const nombreActual = this.obtenerNombreMedidaPersonalizado(medida);
      const nuevoNombre = prompt('Ingrese el nuevo nombre para la medida:', nombreActual);
      
      if (nuevoNombre !== null && nuevoNombre.trim() !== '') {
        this.$set(this.nombresMedidasPersonalizados, medida, nuevoNombre.trim());
        
        try {
          const db = getFirestore();
          const embarqueId = this.$route.params.id;
          const embarqueRef = doc(db, 'embarques', embarqueId);
          
          await updateDoc(embarqueRef, {
            nombresMedidasPersonalizados: this.nombresMedidasPersonalizados
          });
          
          console.log('Nombre de medida actualizado correctamente');
        } catch (error) {
          console.error('Error al guardar el nuevo nombre:', error);
        }
      }
    },

    abrirModalNota() {
      this.nota = this.embarqueData?.notaRendimientos || '';
      this.mostrarModal = true;
    },

    async guardarNota() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          notaRendimientos: this.nota
        });
        
        this.embarqueData.notaRendimientos = this.nota;
        
        this.cerrarModal();
        console.log('Nota guardada correctamente');
      } catch (error) {
        console.error('Error al guardar la nota:', error);
      }
    },

    cerrarModal() {
      this.mostrarModal = false;
      this.nota = '';
    },

    async guardarEstadoOculto() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          medidaOculta: this.medidaOculta
        });
        
        console.log('Estado de ocultación guardado correctamente');
      } catch (error) {
        console.error('Error al guardar estado de ocultación:', error);
      }
    },

    async guardarEstadoAnalisis() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          analizarGanancia: this.analizarGanancia,
          analizarGananciaCrudos: this.analizarGananciaCrudos // Guardar analizarGananciaCrudos
        });
        
        console.log('Estado de análisis de ganancia guardado correctamente');
      } catch (error) {
        console.error('Error al guardar estado de análisis de ganancia:', error);
      }
    },

    irAGestionCostos() {
      this.$router.push({
        name: 'GestionCostos',
        params: { id: this.$route.params.id }
      });
    },



    formatearPrecio(precio) {
      if (!precio) return '0';
      const numeroRedondeado = Math.round(precio);
      // Formatear manualmente con comas para asegurar compatibilidad
      return numeroRedondeado.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    formatearNumero(numero) {
      if (!numero) return '0';
      // Redondear hacia abajo para eliminar decimales
      const numeroSinDecimales = Math.floor(numero);
      // Formatear manualmente con comas para asegurar compatibilidad
      return numeroSinDecimales.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },

    formatearFecha(fechaString) {
      if (!fechaString) return '';
      const fecha = new Date(fechaString);
      return fecha.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    },

    mostrarIndicadorPrecioReciente(medida) {
      if (!this.embarqueData || !this.embarqueData.fecha) return false;
      
      const fechaEmbarqueStr = new Date(this.embarqueData.fecha).toISOString().split('T')[0];
      const fechaHoy = new Date().toISOString().split('T')[0];
      const fechaEmbarqueObj = new Date(fechaEmbarqueStr);
      const fechaHoyObj = new Date(fechaHoy);
      const diasDiferencia = Math.floor((fechaHoyObj - fechaEmbarqueObj) / (1000 * 60 * 60 * 24));
      
      const embarqueEsReciente = diasDiferencia <= this.diasRecientes;
      const embarqueEsHoyOFuturo = fechaEmbarqueStr >= fechaHoy;
      
      return embarqueEsReciente || embarqueEsHoyOFuturo;
    },

    // Métodos para configuración de pesos
    abrirModalConfiguracion() {
      this.mostrarModalConfiguracion = true;
    },

    cerrarModalConfiguracion() {
      this.mostrarModalConfiguracion = false;
    },

    async guardarConfiguracion() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          pesoTaraCosto: Number(this.pesoTaraCosto),
          pesoTaraVenta: Number(this.pesoTaraVenta)
        });
        
        console.log('Configuración de pesos guardada correctamente');
        this.cerrarModalConfiguracion();
        
        // Recalcular ganancias después de cambiar los pesos
        this.calcularGanancias();
        
      } catch (error) {
        console.error('Error al guardar configuración de pesos:', error);
        alert('Error al guardar la configuración. Intente nuevamente.');
      }
    },

    // Determinar si se debe mostrar el detalle por cliente
    deberMostrarDetallePorCliente(talla) {
      const gananciaCrudo = this.gananciasCalculadasCrudos[talla];
      if (!gananciaCrudo || !gananciaCrudo.detallesPorCliente) return false;
      
      // Solo mostrar si hay más de un cliente
      if (gananciaCrudo.detallesPorCliente.length <= 1) return false;
      
      // Verificar si hay precios diferentes entre los clientes
      const precios = gananciaCrudo.detallesPorCliente.map(detalle => detalle.precioVenta);
      const preciosUnicos = new Set(precios);
      
      // Solo mostrar detalle si hay precios diferentes
      return preciosUnicos.size > 1;
    }
  },

  watch: {
    kilosCrudos: {
      handler() {
        this.guardarCambiosEnTiempoReal();
        // Recalcular ganancias cuando cambien los kilos crudos
        this.$nextTick(() => {
          this.calcularGanancias();
        });
      },
      deep: true
    },
    analizarGanancia: {
      handler() {
        // Recalcular ganancias cuando se active/desactive el análisis
        this.$nextTick(() => {
          this.calcularGanancias();
        });
      },
      deep: true
    },
    analizarGananciaCrudos: {
      handler(newValue, oldValue) {
        // Verificar si se activó algún análisis nuevo
        const seMadeChangio = Object.keys(newValue).some(talla => {
          return newValue[talla] && !oldValue[talla];
        });
        
        // Si se activó algún análisis nuevo, inicializar costos automáticamente
        if (seMadeChangio) {
          this.inicializarCostosPorMedida().then(() => {
            // Recalcular ganancias después de inicializar costos
            this.$nextTick(() => {
              this.calcularGananciasCrudos();
            });
          });
        } else {
          // Solo recalcular ganancias si no se activó nuevo análisis
          this.$nextTick(() => {
            this.calcularGananciasCrudos();
          });
        }
      },
      deep: true
    },

    // Watchers para configuración de pesos
    pesoTaraCosto: {
      handler() {
        if (this.embarqueData) {
          this.$nextTick(() => {
            this.calcularGanancias();
          });
        }
      }
    },

    pesoTaraVenta: {
      handler() {
        if (this.embarqueData) {
          this.$nextTick(() => {
            this.calcularGanancias();
          });
        }
      }
    },

  },

  beforeDestroy() {
    if (this.guardarCambiosEnTiempoReal.cancel) {
      this.guardarCambiosEnTiempoReal.cancel();
    }
  }
}
</script>

<style scoped>
.rendimientos-container {
  padding: 20px;
}

.rendimientos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.rendimiento-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: #fff;
}

.medida-label {
  font-size: 1.2em;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 10px;
  display: block;
}

.input-group {
  margin: 15px 0;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  color: #666;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.resultados {
  margin-top: 15px;
}

.rendimiento {
  font-weight: bold;
}

.rendimiento-alto {
  color: #27ae60;
}

.header-container {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.btn-volver {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-volver:hover {
  background-color: #2980b9;
}

.btn-volver i {
  margin-right: 10px;
}

.resultados p {
  margin: 8px 0;
  font-size: 1.1em;
}

.resultados .rendimiento {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.rendimiento span {
  font-size: 1.2em;
  font-weight: bold;
}

.mix-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.mix-input {
  flex: 1;
}

.mix-input label {
  font-size: 0.9em;
}

.editable-label {
  cursor: pointer;
  user-select: none;
}

.editable-label:hover {
  color: #3498db;
  text-decoration: underline;
}

.btn-pdf {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
}

.btn-pdf:hover {
  background-color: #c0392b;
}

.btn-pdf i {
  margin-right: 10px;
}

.medida-label.editable-label {
  cursor: pointer;
  transition: color 0.3s ease;
}

.medida-label.editable-label:hover {
  color: #3498db;
}

.btn-nota {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #f39c12;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
  margin-right: 10px;
}

.btn-nota:hover {
  background-color: #d68910;
}

.btn-nota i {
  margin-right: 10px;
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

.modal-content h3 {
  margin-top: 0;
  color: #2c3e50;
}

.modal-content textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 10px 0;
  font-size: 16px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.btn-guardar {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-cancelar {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.configuracion-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 20px 0;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item label {
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 5px;
}

.config-item input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.config-help {
  font-size: 0.85em;
  color: #666;
  font-style: italic;
  margin-top: 5px;
}

.medida-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.controles-medida {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ocultar-control {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9em;
  color: #666;
}

.ocultar-control input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.ocultar-control label {
  cursor: pointer;
  user-select: none;
}

.analizar-ganancia-control {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9em;
  color: #27ae60;
  font-weight: bold;
}

.analizar-ganancia-control input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.analizar-ganancia-control label {
  cursor: pointer;
  user-select: none;
}

.ganancia-info {
  margin-top: 15px;
  padding: 15px;
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 5px;
}

.ganancia-header h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #34495e;
  font-size: 1.1em;
}

.ganancia-detalles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ganancia-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ganancia-item .label {
  font-weight: bold;
  color: #555;
}

.ganancia-item .valor {
  font-weight: bold;
  font-size: 1.1em;
}

.ganancia-positiva {
  color: #27ae60;
}

.ganancia-negativa {
  color: #e74c3c;
}

.ganancia-total-item {
  grid-column: 1 / -1; /* Ocupa dos columnas */
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.ganancia-fecha {
  margin-top: 10px;
  font-size: 0.9em;
  color: #777;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.indicador-precio-reciente {
  font-size: 0.8em;
  color: #28a745;
  font-weight: bold;
  background-color: #d4edda;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #c3e6cb;
  align-self: flex-start;
}

.sin-precio-venta {
  margin-top: 10px;
  padding: 10px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 5px;
  color: #856404;
  font-weight: bold;
  text-align: center;
}

.aviso-sin-precio {
  margin: 0;
  padding: 0;
}

.btn-costos {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #2ecc71;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
  margin-right: 10px;
}

.btn-costos:hover {
  background-color: #27ae60;
}

.btn-costos i {
  margin-right: 10px;
}

.btn-configuracion {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #9b59b6;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
  margin-right: 10px;
}

.btn-configuracion:hover {
  background-color: #8e44ad;
}

.btn-configuracion i {
  margin-right: 10px;
}



.precio-venta-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.precio-especifico-badge, .precio-general-badge, .precio-promedio-badge {
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: bold;
  white-space: nowrap;
}

.precio-especifico-badge {
  background-color: #e8f5e8;
  color: #2d5a2d;
  border: 1px solid #a5d6a7;
}

.precio-general-badge {
  background-color: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}

.precio-promedio-badge {
  background-color: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
}

/* Estilos para la sección de ganancias de crudos */
.crudos-ganancias-section {
  margin-top: 40px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.crudos-ganancias-section h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  text-align: center;
  font-size: 1.6em;
}

.crudos-ganancias-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.crudo-ganancia-card {
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

.crudo-ganancia-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.crudo-ganancia-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e9ecef;
}

.crudo-ganancia-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.2em;
  font-weight: bold;
}

.crudo-ganancia-controls {
  display: flex;
  align-items: center;
}

.checkbox-container {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 0.9em;
  color: #27ae60;
  font-weight: bold;
}

.checkbox-container input[type="checkbox"] {
  width: auto;
  margin: 0;
  cursor: pointer;
}

.checkmark {
  cursor: pointer;
}

.crudo-ganancia-info {
  margin-top: 15px;
}

.crudo-ganancia-detalles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 15px;
}

.detalles-clientes {
  margin-top: 15px;
  padding: 15px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
}

.detalles-clientes h5 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #495057;
  font-size: 1em;
}

.detalle-cliente {
  display: grid;
  grid-template-columns: 1fr auto auto auto auto;
  gap: 10px;
  align-items: center;
  padding: 8px;
  background-color: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  margin-bottom: 8px;
}

.cliente-nombre {
  font-weight: bold;
  color: #2c3e50;
}

.cliente-kilos {
  font-size: 0.9em;
  color: #6c757d;
}

.cliente-precio {
  font-weight: bold;
  color: #007bff;
}

.cliente-ganancia {
  font-weight: bold;
  font-size: 1.1em;
}

.fuente-precio {
  font-size: 1.2em;
  cursor: help;
}

.precio-individual-badge, .precio-sistema-badge {
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: bold;
  white-space: nowrap;
}

.precio-individual-badge {
  background-color: #e8f5e8;
  color: #2d5a2d;
  border: 1px solid #a5d6a7;
}

.precio-sistema-badge {
  background-color: #e3f2fd;
  color: #1565c0;
  border: 1px solid #90caf9;
}

.sin-analisis-crudo {
  margin-top: 15px;
  padding: 20px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 5px;
  text-align: center;
}

.aviso-sin-analisis {
  margin: 0;
  color: #6c757d;
  font-style: italic;
}

.sin-datos-crudo {
  margin-top: 15px;
  padding: 20px;
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 5px;
  text-align: center;
}

.aviso-sin-datos {
  margin: 0;
  color: #856404;
  font-weight: bold;
}

@media (max-width: 768px) {
  .controles-medida {
    flex-direction: column;
    gap: 10px;
  }
  
  .medida-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .ocultar-control,
  .analizar-ganancia-control {
    font-size: 0.8em;
  }
  
  .ganancia-detalles {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .precio-venta-container {
    align-items: flex-start;
  }
  
  .crudos-ganancias-grid {
    grid-template-columns: 1fr;
  }
  
  .crudo-ganancia-detalles {
    grid-template-columns: 1fr;
  }
  
  .crudo-ganancia-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .detalle-cliente {
    grid-template-columns: 1fr;
    gap: 5px;
    text-align: left;
  }
  
  .cliente-nombre {
    font-size: 1.1em;
  }

  .configuracion-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .header-container {
    flex-wrap: wrap;
    gap: 10px;
  }

  .btn-configuracion {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>

