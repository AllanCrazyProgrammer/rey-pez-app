<template>
  <div class="producto-card producto-editable" :class="{'card-blocked': disabled || bloqueadoPorOtroUsuario}">
    <!-- Indicador de bloqueo si el producto está siendo editado por otro usuario -->
    <div class="bloqueo-indicador" v-if="bloqueadoPorOtroUsuario">
      <i class="fas fa-lock"></i>
      <span>Editado por {{ usuarioBloqueando }}</span>
    </div>
    
    <!-- Indicador de estado de sincronización -->
    <div class="sync-indicator" v-if="sincronizando">
      <i class="fas fa-sync fa-spin"></i>
      <span>Sincronizando...</span>
    </div>

    <!-- Encabezado de la medida y selección -->
    <h2 class="encabezado-medida">
      <div class="botones-encabezado">
       
    
      </div>
      <span 
        class="medida-texto" 
        @click="disabled ? null : abrirModalNombreAlternativo"
        :class="{ 
          'disabled': disabled,
          'tiene-nombre-alternativo': nombreAlternativoPDF,
          'tipo-ch20': tipoProducto === 'C/H20',
          'tipo-sh20': tipoProducto === 'S/H20'
        }"
      >
        <template v-if="tipoProducto === 'C/H20'">
          {{ nombreAlternativoPDF || medidaProducto || 'Sin Medida' }}
          <span class="ch20-text tipo-ch20">C/H20</span>
          <span v-if="nombreAlternativoPDF" class="pdf-badge" title="Nombre personalizado para PDF">PDF</span>
        </template>
        <template v-else>
          {{ nombreAlternativoPDF || medidaProducto || 'Sin Medida' }}
          - {{ tipoProducto }}
          <span v-if="nombreAlternativoPDF" class="pdf-badge" title="Nombre personalizado para PDF">PDF</span>
        </template>
      </span>
      <span v-if="precioProducto" class="precio-tag">${{ precioProducto }}</span>
    </h2>

    <div class="producto-header">
      <div v-if="!editMode" class="producto-acciones">
        <button class="btn btn-sm btn-control" 
          :class="{'btn-has-content': precioProducto}"
          @click="abrirModalPrecio">
          $
        </button>
        <button class="btn btn-sm btn-control" 
          :class="{'btn-has-content': hilos && hilos.length > 0}"
          @click="abrirModalHilos">
          H
        </button>
        <button class="btn btn-sm btn-control" 
          :class="{'btn-has-content': notas && notas.length > 0}"
          @click="abrirModalNotas">
          N
        </button>
      </div>

      <div v-if="!editMode" class="tipo-talla-input">
        <input 
          type="text" 
          v-model="medidaProducto" 
          class="form-control talla-input"
          placeholder="Medida"
          :class="{ 'is-invalid': errores.medidaProducto }"
          :disabled="disabled"
        />
        
        <span class="separador">-</span>
        
        <select 
          v-model="tipoProducto" 
          class="form-control tipo-input"
          :class="{ 'is-invalid': errores.tipoProducto }"
          :disabled="disabled"
        >
          <option value="">Tipo</option>
          <option value="S/H20">S/H20</option>
          <option value="C/H20">C/H20</option>
        </select>

        <div v-if="tipoProducto === 'C/H20'" class="camaron-neto-inline">
          <input 
            type="number" 
            v-model.number="camaronNetoLocal" 
            class="form-control neto-input"
            :disabled="disabled"
            :class="{ 'is-invalid': errores.camaronNeto }"
            step="0.01"
            min="0.01"
            max="1"
            required
            @input="validarCampoNumerico('camaronNeto')"
            title="Porcentaje (0.65 = 65%)"
          />
        </div>
      </div>

      <div v-else class="tipo-talla">
        {{ producto.medida || producto.media || producto.talla }} - {{ producto.tipo }}
      </div>
      
      <div v-else-if="producto && producto.precio" class="precio">
        ${{ producto.precio }}
      </div>
    </div>
    
    <div class="taras-kilos-section">
      <div class="taras-kilos-header">
        <div class="header-taras">
          Taras
          <div class="form-check">
            <input 
              class="form-check-input" 
              type="checkbox" 
              id="restarTresPorTara" 
              v-model="restarTresPorTara"
              :disabled="disabled || editMode"
            >
            <label class="form-check-label" for="restarTresPorTara">-3</label>
          </div>
        </div>
        <div class="header-kilos">
          Kilos
        </div>
      </div>
      
      <!-- Vista de edición -->
      <div v-if="!editMode" class="taras-kilos-items">
        <div v-for="(item, index) in tarasKilosItems" :key="index" class="tara-kilo-row">
          <div class="tara-input">
            <input 
              type="number" 
              v-model.number="item.tara" 
              class="form-control"
              :class="{ 'is-invalid': item.errorTara }"
              placeholder="Tara"
              step="1"
              min="1"
              @input="validarTaraKilo(index, 'tara')"
              :disabled="disabled"
            />
          </div>
          
          <div class="action-btn">
            <button 
              type="button" 
              class="btn btn-remove"
              :disabled="disabled || tarasKilosItems.length <= 1"
              @click="removerTaraKilo(index)"
            >-</button>
          </div>
          
          <div class="kilo-input">
            <input 
              type="number" 
              v-model.number="item.kilos" 
              class="form-control"
              :class="{ 'is-invalid': item.errorKilos }"
              placeholder="Kilos"
              step="0.01"
              min="0.01"
              @input="validarTaraKilo(index, 'kilos')"
              :disabled="disabled"
            />
          </div>
        </div>
      </div>
      
      <!-- Vista de solo lectura -->
      <div v-else class="taras-kilos-items">
        <div v-for="(item, i) in producto.tarasKilos" :key="i" class="tara-kilo-item">
          <div class="tara-value">{{ item.tara || '-' }}</div>
          <div class="kilo-value">{{ item.kilos || 0 }}</div>
        </div>
      </div>
      
      <!-- Botones de acción para taras y kilos (solo en modo edición) -->
      <div v-if="!editMode" class="taras-kilos-actions">
        <button 
          type="button" 
          class="btn btn-success btn-add"
          @click="agregarTaraKilo"
          :disabled="disabled"
        >
          <i class="fas fa-plus"></i>
        </button>
        
        <button 
          type="button" 
          class="btn btn-warning btn-add-extra"
          @click="agregarTaraKiloExtra"
          :disabled="disabled"
        >
          <i class="fas fa-plus"></i> Extra
        </button>
      </div>
      
      <!-- Totales -->
      <div class="taras-kilos-totals">
        <div class="total-taras">
          <h6>Total: {{ editMode ? calcularTotalTaras(producto.tarasKilos) : totalTaras }}</h6>
          <span>Taras</span>
        </div>
        <div class="total-kilos">
          <h6>Total: {{ editMode ? calcularTotalKilos(producto) : totalKilos }}</h6>
          <span>Kilos</span>
         
        </div>
      </div>
      
      <!-- Campo para camarón neto (condicional) -->
      <!-- Eliminar o comentar el div con clase camaron-neto-section -->
      
   
    </div>
    
    <!-- Nueva sección para reporte de taras y bolsas -->
    <div class="reporte-taras-bolsas">
      <div class="reporte-header">
        <h5>Reporte de Taras y Bolsas</h5>
        <button type="button" @click="agregarReporteTaraYBolsa" class="btn btn-success btn-sm" :disabled="disabled">
          <i class="fas fa-plus"></i> Agregar
        </button>
      </div>
      
      <div class="reporte-contenido">
        <div class="reporte-columna">
          <h6>Taras</h6>
          <div v-for="(tara, index) in reporteTaras" :key="index" class="input-group mb-2">
            <input 
              type="tel"
              v-model="reporteTaras[index]" 
              class="form-control reporte-input"
              @focus="$event.target.select()"
              @input="actualizarTotales"
              :disabled="disabled"
            >
            <button v-if="index === reporteTaras.length - 1" type="button" @click="eliminarReporteTaraYBolsa(index)" class="btn btn-danger btn-sm" :disabled="disabled || reporteTaras.length <= 1">-</button>
          </div>
          <div class="total-taras-reporte" :class="{ 'coincide': coincideTaras, 'no-coincide': !coincideTaras }">
            Reporte: {{ totalTarasReportadas }}
          </div>
        </div>
        
        <div class="reporte-columna">
          <h6>Bolsas</h6>
          <div v-for="(bolsa, index) in reporteBolsas" :key="index" class="input-group mb-2">
            <input 
              type="tel"
              v-model="reporteBolsas[index]" 
              class="form-control reporte-input"
              @focus="$event.target.select()"
              @input="actualizarTotales"
              :disabled="disabled"
            >
          </div>
          <div class="total-bolsas-reporte">
            Bolsas: {{ totalBolsasReportadas }}
          </div>
        </div>
      </div>
    </div>

    <!-- Botones para modo edición -->
    <div class="card-actions">
      <!-- Botones para productos nuevos -->
      <template v-if="!producto">
        <button 
          @click="validarYEmitirProducto" 
          class="btn btn-primary"
          :disabled="disabled"
        >
          <i class="fas fa-plus"></i> Agregar
        </button>
        
        <button 
          @click="limpiarFormulario" 
          class="btn btn-secondary"
          :disabled="disabled"
        >
          <i class="fas fa-broom"></i> Limpiar
        </button>
      </template>
      
      <!-- Botones para productos existentes -->
      <template v-else>
        <button 
          @click="validarYEmitirProducto" 
          class="btn btn-primary"
          :disabled="disabled"
        >
          <i class="fas fa-save"></i> Actualizar
        </button>
        
        <button 
          @click="eliminarProducto" 
          class="btn btn-danger"
          :disabled="disabled"
        >
          <i class="fas fa-trash"></i> Eliminar
        </button>
      </template>
    </div>

    <!-- Modal para Hilos -->
    <div class="modal-overlay" v-if="mostrarModalHilos" @click="cerrarModalHilos">
      <div class="modal-contenido" @click.stop>
        <div class="modal-header">
          <h5 class="modal-title">Hilos</h5>
          <button type="button" class="close" @click="cerrarModalHilos">&times;</button>
        </div>
        <div class="modal-body">
          <textarea 
            v-model="hilos" 
            class="form-control" 
            placeholder="Escribe los hilos aquí..."
            rows="5"
          ></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="cerrarModalHilos">Cancelar</button>
          <button type="button" class="btn btn-primary" @click="guardarHilos">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para Notas -->
    <div class="modal-overlay" v-if="mostrarModalNotas" @click="cerrarModalNotas">
      <div class="modal-contenido" @click.stop>
        <div class="modal-header">
          <h5 class="modal-title">Notas</h5>
          <button type="button" class="close" @click="cerrarModalNotas">&times;</button>
        </div>
        <div class="modal-body">
          <textarea 
            v-model="notas" 
            class="form-control" 
            placeholder="Escribe tus notas aquí..."
            rows="5"
          ></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="cerrarModalNotas">Cancelar</button>
          <button type="button" class="btn btn-primary" @click="guardarNotas">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para nombre alternativo -->
    <div class="modal-overlay" v-if="mostrarModalNombreAlt" @click="cerrarModalNombreAlt">
      <div class="modal-contenido" @click.stop>
        <div class="modal-header">
          <h5 class="modal-title">Nombre Alternativo para PDF</h5>
          <button type="button" class="close" @click="cerrarModalNombreAlt">&times;</button>
        </div>
        <div class="modal-body">
          <input 
            type="text" 
            v-model="nombreAlternativoPDF" 
            class="form-control" 
            placeholder="Ingrese nombre alternativo para PDF"
          />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="cerrarModalNombreAlt">Cancelar</button>
          <button type="button" class="btn btn-primary" @click="guardarNombreAlt">Guardar</button>
        </div>
      </div>
    </div>

    <!-- Modal para Precio -->
    <div class="modal-overlay" v-if="mostrarModalPrecio" @click="cerrarModalPrecio">
      <div class="modal-contenido" @click.stop>
        <div class="modal-header">
          <h5 class="modal-title">Precio del Producto</h5>
          <button type="button" class="close" @click="cerrarModalPrecio">&times;</button>
        </div>
        <div class="modal-body">
          <input 
            type="number" 
            v-model.number="precioProducto" 
            class="form-control"
            placeholder="Ingrese el precio"
            step="0.01"
            min="0"
          />
          <small class="form-text text-muted">Ingrese el precio por kilo del producto</small>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="cerrarModalPrecio">Cancelar</button>
          <button type="button" class="btn btn-primary" @click="guardarPrecio">Guardar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * @component ProductoCard
 * @description Componente para mostrar y editar un producto de embarque
 */
import SincronizacionService from '@/services/SincronizacionService';

export default {
  name: 'ProductoCard',
  props: {
    /**
     * Objeto producto completo (para modo solo lectura)
     */
    producto: {
      type: Object,
      default: null
    },
    /**
     * ID del cliente actualmente seleccionado
     */
    clienteActivo: {
      type: String,
      default: ''
    },
    /**
     * Indica si la tarjeta está en modo solo lectura o edición
     */
    soloLectura: {
      type: Boolean,
      default: false
    },
    /**
     * Indica si los campos están deshabilitados
     */
    disabled: {
      type: Boolean,
      default: false
    },
    /**
     * Fecha del embarque
     */
    fecha: {
      type: String,
      default: ''
    },
    /**
     * Indica si la tarjeta está en modo edición
     */
    modoEdicion: {
      type: Boolean,
      default: false
    },
    /**
     * ID del embarque actual
     */
    embarqueId: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      // Datos del formulario
      tipoProducto: '',
      medidaProducto: '',
      precioProducto: null,
      camaronNetoLocal: 0.65,
      
      // Control de errores
      errores: {
        tipoProducto: '',
        medidaProducto: '',
        precioProducto: '',
        camaronNeto: ''
      },
      
      tarasKilosItems: [{ tara: null, kilos: null, errorTara: '', errorKilos: '' }],
      restarTresPorTara: true,
      
      // Controles de UI para la tarjeta
      mostrarPrecio: true,
      modoNumerico: false,
      
      // ID del producto (para edición)
      productoId: null,
      
      // Propiedades para modales
      mostrarModalHilos: false,
      mostrarModalNotas: false,
      hilos: '',
      notas: '',
      nombreAlternativoPDF: '',
      reporteTaras: [],
      reporteBolsas: [],
      noSumarKilos: false,
      mostrarModalNombreAlt: false,
      mostrarModalPrecio: false,
      
      // Indica si el producto está bloqueado por otro usuario
      bloqueadoPorOtroUsuario: false,
      usuarioBloqueando: null,
      
      // Tiempo de debounce para guardado automático
      tiempoDebounce: null,
      
      // Nuevo estado para indicar sincronización
      sincronizando: false
    };
  },
  mounted() {
    console.log('ProductoCard montado:', {
      embarqueId: this.embarqueId,
      producto: this.producto?.id,
      medida: this.producto?.medida,
      tipo: this.producto?.tipo
    });
    
    // Cargar datos del producto si existe, sin importar el valor de soloLectura
    if (this.producto) {
      this.cargarDatosProducto();
    }
    
    // Verificar si está bloqueado por otro usuario
    if (this.embarqueId && this.producto && this.producto.id) {
      this.verificarBloqueo();
    }
  },
  beforeDestroy() {
    // Limpiar cualquier timeout pendiente
    if (this.tiempoDebounce) {
      clearTimeout(this.tiempoDebounce);
    }
    
    // Liberar bloqueo si existe
    if (this.embarqueId && this.productoId) {
      SincronizacionService.desbloquearProducto(this.embarqueId, this.productoId);
    }
  },
  computed: {
    /**
     * Fuerza que todos los ProductoCard estén siempre en modo editable
     * @returns {Boolean} - Siempre false para forzar el modo editable
     */
    editMode() {
      return false; // Fuerza siempre el modo editable
    },

    /**
     * Calcula el total de taras
     */
    totalTaras() {
      return this.tarasKilosItems.reduce((total, item) => 
        total + (item.tara !== null && item.tara !== undefined ? Number(item.tara) : 0), 0
      );
    },

    /**
     * Calcula el total de kilos con descuento si aplica
     */
    totalKilos() {
      let total = this.tarasKilosItems.reduce((total, item) => total + (Number(item.kilos) || 0), 0);
      
      if (this.restarTresPorTara) {
        const descuento = this.totalTaras * 3;
        total = Math.max(0, total - descuento);
      }
      
      return total.toFixed(2);
    },

    /**
     * Calcula el total de taras reportadas
     */
    totalTarasReportadas() {
      return this.reporteTaras.reduce((total, tara) => total + (Number(tara) || 0), 0);
    },

    /**
     * Calcula el total de bolsas reportadas multiplicando cada bolsa por el total de taras
     */
    totalBolsasReportadas() {
      let total = 0;
      
      // Si no hay bolsas reportadas o taras, retornar 0
      if (!this.reporteBolsas.length || this.totalTaras === 0) {
        return 0;
      }
      
      // Para cada bolsa reportada, multiplicar por el total de taras
      for (let i = 0; i < this.reporteBolsas.length; i++) {
        const bolsaValue = Number(this.reporteBolsas[i]) || 0;
        
        // Si no hay valor de bolsa, continuar con la siguiente
        if (bolsaValue <= 0) {
          continue;
        }
        
        // Multiplicar cada bolsa por el total de taras
        total += bolsaValue * this.totalTaras;
      }
      
      return total;
    },

    /**
     * Verifica si coinciden las taras reportadas con las taras ingresadas
     */
    coincideTaras() {
      return this.totalTarasReportadas === this.totalTaras;
    }
  },
  methods: {
    /**
     * Verifica si el producto está bloqueado por otro usuario
     */
    verificarBloqueo() {
      if (!this.embarqueId || !this.productoId) return;
      
      const bloqueo = SincronizacionService.obtenerBloqueo(this.embarqueId, this.productoId);
      if (bloqueo) {
        this.bloqueadoPorOtroUsuario = true;
        this.usuarioBloqueando = bloqueo.username;
      } else {
        this.bloqueadoPorOtroUsuario = false;
        this.usuarioBloqueando = null;
      }
    },
    
    /**
     * Intenta bloquear el producto para edición
     * @returns {Boolean} - true si se pudo bloquear
     */
    async intentarBloquear() {
      if (!this.embarqueId || !this.productoId) return true;
      
      const resultado = await SincronizacionService.bloquearProducto(this.embarqueId, this.productoId);
      this.bloqueadoPorOtroUsuario = !resultado;
      return resultado;
    },
    
    /**
     * Carga los datos del producto para edición o visualización
     */
    cargarDatosProducto() {
      if (!this.producto) return;
      
      console.log('Cargando datos del producto:', {
        id: this.producto.id,
        medida: this.producto.medida,
        tipo: this.producto.tipo
      });
      
      this.productoId = this.producto.id;
      this.tipoProducto = this.producto.tipo || '';
      this.medidaProducto = this.producto.medida || this.producto.media || this.producto.talla || '';
      
      // Añadir logs para diagnosticar el problema con medida
      console.log('ProductoCard - Cargando datos del producto:', {
        id: this.producto.id,
        medida: this.producto.medida,
        media: this.producto.media,
        talla: this.producto.talla,
        medidaFinal: this.medidaProducto
      });
      
      this.precioProducto = this.producto.precio || null;
      this.camaronNetoLocal = this.producto.camaronNeto || 0.65;
      this.restarTresPorTara = this.producto.restarTresPorTara !== undefined ? this.producto.restarTresPorTara : true;
      this.hilos = this.producto.hilos || '';
      this.notas = this.producto.notas || '';
      
      // Cargar tarasKilos
      if (this.producto.tarasKilos && Array.isArray(this.producto.tarasKilos)) {
        this.tarasKilosItems = this.producto.tarasKilos.map(tk => ({
          tara: tk.tara,
          kilos: tk.kilos,
          errorTara: '',
          errorKilos: ''
        }));
      } else {
        // Compatibilidad con el formato antiguo
        this.tarasKilosItems = [{ 
          tara: this.producto.tara || null, 
          kilos: this.producto.kilos || null, 
          errorTara: '', 
          errorKilos: '' 
        }];
      }
      
      // Asegurarse de que haya al menos un elemento
      if (this.tarasKilosItems.length === 0) {
        this.tarasKilosItems = [{ tara: null, kilos: null, errorTara: '', errorKilos: '' }];
      }
      
      this.nombreAlternativoPDF = this.producto.nombreAlternativoPDF || '';
      this.noSumarKilos = this.producto.noSumarKilos || false;
      
      // Cargar reporteTaras y reporteBolsas
      this.reporteTaras = [...(this.producto.reporteTaras || [''])];
      this.reporteBolsas = [...(this.producto.reporteBolsas || [''])];
      
      // Asegurar que ambos arrays tengan la misma longitud
      const maxLength = Math.max(this.reporteTaras.length, this.reporteBolsas.length);
      
      // Rellenar con valores vacíos si es necesario
      while (this.reporteTaras.length < maxLength) {
        this.reporteTaras.push('');
      }
      
      while (this.reporteBolsas.length < maxLength) {
        this.reporteBolsas.push('');
      }
      
      // Actualizar los totales después de cargar los datos
      this.$nextTick(() => {
        this.actualizarTotales();
      });
    },
    /**
     * Valida un campo numérico y establece mensajes de error si es necesario
     * @param {String} campo - El nombre del campo a validar
     */
    validarCampoNumerico(campo) {
      this.errores[campo] = '';
      
      switch(campo) {
        case 'precioProducto':
          if (this.precioProducto === null || this.precioProducto === undefined) {
            this.errores.precioProducto = 'El precio es obligatorio';
          } else if (this.precioProducto < 0) {
            this.errores.precioProducto = 'El precio no puede ser negativo';
          }
          break;
        
        case 'camaronNeto':
          if (this.tipoProducto === 'C/H20') {
            if (!this.camaronNetoLocal) {
              this.errores.camaronNeto = 'El porcentaje es obligatorio';
            } else if (this.camaronNetoLocal <= 0 || this.camaronNetoLocal > 1) {
              this.errores.camaronNeto = 'El valor debe estar entre 0.01 y 1';
            }
          }
          break;
      }
    },
    
    /**
     * Valida todos los campos del formulario
     * @returns {Boolean} - true si todos los campos son válidos
     */
    validarFormulario() {
      // Reiniciar todos los errores
      Object.keys(this.errores).forEach(key => this.errores[key] = '');
      
      // Validar cliente
      if (!this.clienteActivo) {
        this.$emit('error', 'Debe seleccionar un cliente antes de agregar productos');
        return false;
      }
      
      // Validar tipo de producto
      if (!this.tipoProducto) {
        this.errores.tipoProducto = 'Debe seleccionar un tipo de producto';
        return false;
      }
      
      // Validar talla
      if (!this.medidaProducto) {
        this.errores.medidaProducto = 'Debe ingresar un valor para la medida';
        return false;
      }
      
      // Validar campos numéricos para precio y camarón neto
      this.validarCampoNumerico('precioProducto');
      
      if (this.tipoProducto === 'C/H20') {
        this.validarCampoNumerico('camaronNeto');
      }
      
      // Validar taras y kilos
      let tarasKilosValidos = true;
      this.tarasKilosItems.forEach((item, index) => {
        this.validarTaraKilo(index, 'tara');
        this.validarTaraKilo(index, 'kilos');
        
        if (item.errorTara || item.errorKilos) {
          tarasKilosValidos = false;
        }
      });
      
      if (!tarasKilosValidos) {
        this.$emit('error', 'Hay errores en las taras o kilos. Por favor revise los campos marcados.');
        return false;
      }
      
      // Verificar si hay algún error
      const hayErrores = Object.values(this.errores).some(error => error);
      if (hayErrores) {
        return false;
      }
      
      return true;
    },
    
    /**
     * Calcula los kilos totales
     * @returns {Number} - Kilos totales
     */
    calcularKilosTotales() {
      let total = this.tarasKilosItems.reduce((sum, item) => {
        return sum + (Number(item.kilos) || 0);
      }, 0);
      
      if (this.restarTresPorTara) {
        const descuento = this.totalTaras * 3;
        total = Math.max(0, total - descuento);
      }
      
      return total;
    },
    
    /**
     * Valida los datos y emite el evento para agregar o actualizar el producto
     */
    async validarYEmitirProducto() {
      if (this.validarFormulario()) {
        // Verificar bloqueo si es una actualización
        if (this.productoId && !(await this.intentarBloquear())) {
          alert(`No se puede actualizar porque el producto está siendo editado por ${this.usuarioBloqueando}`);
          return;
        }
        
        // Asegurar que los totales estén actualizados
        this.actualizarTotales();
        
        // Obtener datos preparados del producto
        const datosProducto = this.prepararDatosProducto();
        
        // Si estamos en modo edición, actualizar el producto
        if (this.modoEdicion && this.productoId) {
          // Usar el servicio de sincronización
          if (this.embarqueId) {
            SincronizacionService.actualizarProducto(this.embarqueId, datosProducto);
          }
          
          // Emitir evento para el componente padre
          this.$emit('actualizar-producto', datosProducto);
        } else {
          // Si es un producto nuevo, agregar
          if (this.embarqueId) {
            const productoGuardado = SincronizacionService.agregarProducto(this.embarqueId, datosProducto);
            this.$emit('agregar-producto', productoGuardado);
          } else {
            this.$emit('agregar-producto', datosProducto);
          }
        }
        
        this.limpiarFormulario();
      }
    },
    
    /**
     * Prepara los datos del producto para guardar
     * @returns {Object} - Datos del producto listos para guardar
     */
    prepararDatosProducto() {
      // Filtrar valores vacíos de reporteTaras y reporteBolsas
      const reporteTarasFiltradas = this.reporteTaras.filter(tara => tara !== '');
      const reporteBolsasFiltradas = this.reporteBolsas.filter(bolsa => bolsa !== '');
      
      // Calcular kilos totales
      const kilosTotales = this.calcularKilosTotales();
      
      return {
        id: this.productoId,
        cliente: this.clienteActivo,
        tipo: this.tipoProducto,
        talla: this.medidaProducto,
        media: this.medidaProducto,
        medida: this.medidaProducto,
        tarasKilos: [...this.tarasKilosItems],
        restarTresPorTara: this.restarTresPorTara,
        kilosTotales: kilosTotales,
        precio: this.precioProducto,
        total: parseFloat((kilosTotales * (this.tipoProducto === 'C/H20' ? this.camaronNetoLocal : 1) * this.precioProducto).toFixed(2)),
        camaronNeto: this.tipoProducto === 'C/H20' ? this.camaronNetoLocal : null,
        hilos: this.hilos,
        notas: this.notas,
        fecha: this.fecha,
        timestamp: new Date().toISOString(),
        nombreAlternativoPDF: this.nombreAlternativoPDF,
        noSumarKilos: this.noSumarKilos,
        reporteTaras: reporteTarasFiltradas,
        reporteBolsas: reporteBolsasFiltradas,
        totalTarasReportadas: this.totalTarasReportadas,
        totalBolsasReportadas: this.totalBolsasReportadas,
        coincideTaras: this.coincideTaras
      };
    },
    
    /**
     * Limpia el formulario
     */
    limpiarFormulario() {
      this.tipoProducto = '';
      this.medidaProducto = '';
      this.precioProducto = null;
      this.camaronNetoLocal = 0.65;
      this.tarasKilosItems = [{ tara: null, kilos: null, errorTara: '', errorKilos: '' }];
      this.restarTresPorTara = true;
      this.hilos = '';
      this.notas = '';
      
      // Limpiar errores
      Object.keys(this.errores).forEach(key => this.errores[key] = '');
      
      this.nombreAlternativoPDF = '';
      this.noSumarKilos = false;
      
      // Inicializar con al menos un campo vacío para taras y bolsas
      this.reporteTaras = [''];
      this.reporteBolsas = [''];
      
      // Actualizar totales
      this.actualizarTotales();
    },
    
    /**
     * Valida un campo de tara o kilos
     * @param {Number} index - Índice del elemento en el array
     * @param {String} tipo - Tipo de campo ('tara' o 'kilos')
     */
    validarTaraKilo(index, tipo) {
      const item = this.tarasKilosItems[index];
      
      if (tipo === 'tara') {
        item.errorTara = '';
        
        if (item.tara !== null && item.tara !== undefined) {
          if (item.tara <= 0) {
            item.errorTara = 'Si ingresa tara, debe ser mayor a cero';
          } else if (!Number.isInteger(item.tara)) {
            this.tarasKilosItems[index].tara = Math.round(item.tara);
          }
        }
      } else if (tipo === 'kilos') {
        item.errorKilos = '';
        
        if (!item.kilos) {
          item.errorKilos = 'Los kilos son obligatorios';
        } else if (item.kilos <= 0) {
          item.errorKilos = 'Los kilos deben ser mayores a cero';
        }
      }
    },
    
    /**
     * Agrega una nueva fila de tara y kilos
     */
    agregarTaraKilo() {
      this.tarasKilosItems.push({
        tara: null,
        kilos: null,
        errorTara: '',
        errorKilos: ''
      });
    },
    
    /**
     * Agrega una nueva fila con valor predeterminado para Extra
     */
    agregarTaraKiloExtra() {
      this.tarasKilosItems.push({
        tara: null,
        kilos: 25,
        errorTara: '',
        errorKilos: ''
      });
    },
    
    /**
     * Elimina una fila de tara y kilos
     */
    removerTaraKilo(index) {
      if (this.tarasKilosItems.length <= 1) return;
      this.tarasKilosItems.splice(index, 1);
    },
    
    /**
     * Elimina un producto
     */
    async eliminarProducto() {
      if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        // Verificar bloqueo
        if (this.productoId && !(await this.intentarBloquear())) {
          alert(`No se puede eliminar porque el producto está siendo editado por ${this.usuarioBloqueando}`);
          return;
        }
        
        // Usar el servicio para eliminar
        if (this.embarqueId && this.productoId) {
          SincronizacionService.eliminarProducto(this.embarqueId, this.productoId);
        }
        
        // Emitir evento
        this.$emit('eliminar-producto');
      }
    },
    
    /**
     * Calcula el total de taras para un producto
     * @param {Array} tarasKilos - Array de objetos tara-kilo
     * @returns {Number} - Total de taras
     */
    calcularTotalTaras(tarasKilos) {
      return tarasKilos.reduce((total, item) => 
        total + (item.tara !== null && item.tara !== undefined ? Number(item.tara) : 0), 0
      );
    },
    
    /**
     * Calcula el total de kilos para un producto considerando descuentos
     * @param {Object} producto - Objeto producto
     * @returns {Number} - Total de kilos
     */
    calcularTotalKilos(producto) {
      if (!producto || !producto.tarasKilos) return 0;
      
      let total = producto.tarasKilos.reduce((sum, item) => sum + (Number(item.kilos) || 0), 0);
      
      if (producto.restarTresPorTara) {
        const totalTaras = this.calcularTotalTaras(producto.tarasKilos);
        const descuento = totalTaras * 3;
        total = Math.max(0, total - descuento);
      }
      
      // Aplicar factor de camarón neto si es C/H20
      if (producto.tipo === 'C/H20' && producto.camaronNeto) {
        total = total * producto.camaronNeto;
      }
      
      return parseFloat(total.toFixed(2));
    },
    
    /**
     * Alterna la visualización del campo de precio
     */
    toggleTipoMoneda() {
      this.mostrarPrecio = !this.mostrarPrecio;
    },
    
    /**
     * Abre el modal para editar hilos
     */
    abrirModalHilos() {
      this.mostrarModalHilos = true;
    },
    
    /**
     * Cierra el modal de hilos
     */
    cerrarModalHilos() {
      this.mostrarModalHilos = false;
    },
    
    /**
     * Guarda los hilos y cierra el modal
     */
    guardarHilos() {
      // Si estamos en modo edición, actualizamos directamente
      if (this.producto) {
        this.$emit('actualizar-hilos', { id: this.productoId, hilos: this.hilos });
        
        // Actualizar también con el servicio
        if (this.embarqueId && this.productoId) {
          const productoActualizado = { ...this.producto, hilos: this.hilos };
          SincronizacionService.actualizarProducto(this.embarqueId, productoActualizado);
        }
      }
      this.cerrarModalHilos();
    },
    
    /**
     * Abre el modal para editar notas
     */
    abrirModalNotas() {
      this.mostrarModalNotas = true;
    },
    
    /**
     * Cierra el modal de notas
     */
    cerrarModalNotas() {
      this.mostrarModalNotas = false;
    },
    
    /**
     * Guarda las notas y cierra el modal
     */
    guardarNotas() {
      // Si estamos en modo edición, actualizamos directamente
      if (this.producto) {
        this.$emit('actualizar-notas', { id: this.productoId, notas: this.notas });
        
        // Actualizar también con el servicio
        if (this.embarqueId && this.productoId) {
          const productoActualizado = { ...this.producto, notas: this.notas };
          SincronizacionService.actualizarProducto(this.embarqueId, productoActualizado);
        }
      }
      this.cerrarModalNotas();
    },
    
    /**
     * Permite editar el producto actual
     */
    editarProducto() {
      this.$emit('editar-producto', this.producto);
    },

    // Métodos para el reporte de taras y bolsas
    agregarReporteTaraYBolsa() {
      this.reporteTaras.push('');
      this.reporteBolsas.push('');
      this.actualizarTotales();
    },
    eliminarReporteTaraYBolsa(index) {
      this.reporteTaras.splice(index, 1);
      this.reporteBolsas.splice(index, 1);
      this.actualizarTotales();
    },
    actualizarTotales() {
      // Este método se llama cuando cambia cualquier valor en los inputs de taras o bolsas
      // No necesita hacer nada específico ya que las propiedades computadas se actualizarán automáticamente
      
      // Depurar el cálculo de bolsas
      this.depurarCalculoBolsas();
      
      // Si estamos en modo edición, podemos emitir un evento para actualizar el producto
      if (this.producto) {
        const datosActualizados = {
          id: this.productoId,
          reporteTaras: [...this.reporteTaras],
          reporteBolsas: [...this.reporteBolsas],
          totalTarasReportadas: this.totalTarasReportadas,
          totalBolsasReportadas: this.totalBolsasReportadas,
          coincideTaras: this.coincideTaras
        };
        
        this.$emit('actualizar-reporte', datosActualizados);
        
        // Además guardar automáticamente con el servicio
        this.guardarCambiosAutomatico();
      }
    },
    /**
     * Depura el cálculo de bolsas para verificar que sea correcto
     */
    depurarCalculoBolsas() {
      console.log('Depurando cálculo de bolsas:');
      console.log('Total de taras:', this.totalTaras);
      console.log('Bolsas reportadas:', this.reporteBolsas);
      
      let total = 0;
      for (let i = 0; i < this.reporteBolsas.length; i++) {
        const bolsaValue = Number(this.reporteBolsas[i]) || 0;
        
        // Multiplicar cada bolsa por el total de taras
        const subtotal = bolsaValue * this.totalTaras;
        console.log(`Bolsa ${i+1}: ${bolsaValue} × Total Taras ${this.totalTaras} = ${subtotal}`);
        total += subtotal;
      }
      
      console.log('Total calculado:', total);
      console.log('Total de propiedad computada:', this.totalBolsasReportadas);
    },
    abrirModalNombreAlternativo() {
      this.mostrarModalNombreAlt = true;
    },
    cerrarModalNombreAlt() {
      this.mostrarModalNombreAlt = false;
    },
    guardarNombreAlt() {
      this.nombreAlternativoPDF = this.nombreAlternativoPDF.trim();
      if (this.producto) {
        this.$emit('actualizar-nombre-alternativo', {
          id: this.productoId,
          nombreAlternativoPDF: this.nombreAlternativoPDF
        });
        
        // Actualizar también con el servicio
        if (this.embarqueId && this.productoId) {
          const productoActualizado = { ...this.producto, nombreAlternativoPDF: this.nombreAlternativoPDF };
          SincronizacionService.actualizarProducto(this.embarqueId, productoActualizado);
        }
      }
      this.cerrarModalNombreAlt();
    },
    abrirModalPrecio() {
      this.mostrarModalPrecio = true;
    },
    cerrarModalPrecio() {
      this.mostrarModalPrecio = false;
    },
    guardarPrecio() {
      if (this.producto) {
        this.$emit('actualizar-precio', {
          id: this.productoId,
          precio: this.precioProducto
        });
        
        // Actualizar también con el servicio
        if (this.embarqueId && this.productoId) {
          const productoActualizado = { ...this.producto, precio: this.precioProducto };
          SincronizacionService.actualizarProducto(this.embarqueId, productoActualizado);
        }
      }
      this.cerrarModalPrecio();
    },
    /**
     * Guarda los cambios realizados en el producto automáticamente
     */
    guardarCambiosAutomatico() {
      // Cancelar cualquier timeout pendiente
      if (this.tiempoDebounce) {
        clearTimeout(this.tiempoDebounce);
      }
      
      // Activar indicador de sincronización
      this.sincronizando = true;
      
      // Programar nuevo guardado con delay para evitar múltiples llamadas
      this.tiempoDebounce = setTimeout(() => {
        if (!this.producto || !this.productoId || !this.embarqueId) {
          this.sincronizando = false;
          return;
        }
        
        // Preparar datos actualizados del producto
        const productoActualizado = this.prepararDatosProducto();
        
        // Emitir evento para notificar al componente padre
        this.$emit('actualizar-producto', productoActualizado);
        
        // Usar el servicio de sincronización para actualizar
        SincronizacionService.actualizarProducto(this.embarqueId, productoActualizado)
          .then(() => {
            console.log('Producto actualizado correctamente');
            // Desactivar indicador después de un breve tiempo para que sea visible
            setTimeout(() => {
              this.sincronizando = false;
            }, 500);
          })
          .catch(error => {
            console.error('Error al actualizar producto:', error);
            this.sincronizando = false;
          });
      }, 1000);
    }
  },
  watch: {
    // Observadores para guardar automáticamente al cambiar valores importantes
    producto: {
      handler(nuevoProducto) {
        if (nuevoProducto) {
          console.log('Producto actualizado externamente:', {
            id: nuevoProducto.id,
            medida: nuevoProducto.medida,
            tipo: nuevoProducto.tipo
          });
          this.cargarDatosProducto();
        }
      },
      deep: true
    },
    tipoProducto() {
      if (this.producto && this.embarqueId) {
        this.guardarCambiosAutomatico();
      }
    },
    medidaProducto() {
      if (this.producto && this.embarqueId) {
        this.guardarCambiosAutomatico();
      }
    },
    precioProducto() {
      if (this.producto && this.embarqueId) {
        this.guardarCambiosAutomatico();
      }
    },
    camaronNetoLocal() {
      if (this.producto && this.embarqueId) {
        this.guardarCambiosAutomatico();
      }
    },
    restarTresPorTara() {
      if (this.producto && this.embarqueId) {
        this.guardarCambiosAutomatico();
      }
    },
    tarasKilosItems: {
      handler() {
        if (this.producto && this.embarqueId) {
          this.guardarCambiosAutomatico();
        }
      },
      deep: true
    }
  }
};
</script>

<style scoped>
.producto-card {
  flex: 0 0 calc(33.33% - 20px);
  border: 2px solid #28a745;
  border-radius: 8px;
  padding: 15px;
  background-color: white;
  position: relative;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  max-width: 350px;
}

.producto-editable {
  border-color: #28a745;
}

.card-blocked {
  opacity: 0.7;
  pointer-events: none;
}

.card-blocked::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.05);
  z-index: 5;
  border-radius: 8px;
}

.producto-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 10px;
}

.producto-acciones {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.producto-acciones button {
  margin-right: 5px;
  width: 30px;
  height: 30px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border-radius: 4px;
  background-color: #f8f9fa;
  border: 1px solid #ced4da;
  transition: all 0.3s ease;
}

.btn-control {
  color: #495057;
}

.btn-has-content {
  background-color: #28a745 !important;
  color: white !important;
  border-color: #28a745 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  font-weight: bold;
}

.checkbox-container {
  display: inline-flex;
  align-items: center;
  margin-left: 10px;
  font-size: 0.9rem;
}

.tipo-talla-input {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
}

.talla-input, .tipo-input {
  flex: 1;
  height: 38px;
  font-size: 1rem;
  border-radius: 4px;
}

.separador {
  margin: 0 5px;
  font-weight: bold;
  font-size: 1.2rem;
}

.precio-container {
  margin-top: 5px;
}

.precio-input {
  font-weight: bold;
  color: #28a745;
  height: 38px;
  font-size: 1.2rem;
  text-align: center;
}

.tipo-talla {
  font-weight: bold;
  font-size: 1.2rem;
  text-align: center;
  padding: 10px 0;
  color: #343a40;
}

.precio {
  color: #28a745;
  font-weight: bold;
  font-size: 1.2rem;
  text-align: center;
}

/* Taras y kilos */
.taras-kilos-section {
  font-size: 0.95rem;
}

.taras-kilos-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-weight: bold;
  border-bottom: 1px solid #dee2e6;
  padding-bottom: 5px;
}

.header-taras, .header-kilos {
  flex: 1;
  display: flex;
  align-items: center;
}

.form-check {
  display: inline-flex;
  margin-left: 10px;
  align-items: center;
}

.form-check-input {
  margin-right: 5px;
}

.tara-kilo-row, .tara-kilo-item {
  display: flex;
  margin-bottom: 8px;
  align-items: center;
}

.tara-input, .kilo-input, .tara-value, .kilo-value {
  flex: 1;
}

.tara-input .form-control, .kilo-input .form-control {
  text-align: center;
  font-weight: 500;
}

.action-btn {
  width: 30px;
  display: flex;
  justify-content: center;
  margin: 0 5px;
}

.btn-remove {
  width: 30px;
  height: 30px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
}

.taras-kilos-actions {
  display: flex;
  gap: 10px;
  margin: 15px 0;
}

.btn-add, .btn-add-extra {
  height: 38px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-add {
  width: 38px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
}

.btn-add-extra {
  background-color: #ffc107;
  color: #212529;
  border: none;
  border-radius: 4px;
  width: auto;
  padding: 0 15px;
}

.taras-kilos-totals {
  display: flex;
  border-top: 1px solid #dee2e6;
  padding-top: 15px;
  margin-top: 10px;
}

.total-taras, .total-kilos {
  flex: 1;
  text-align: center;
}

.total-taras h6, .total-kilos h6 {
  margin: 0;
  font-weight: 600;
  font-size: 1.1rem;
}

.total-taras span, .total-kilos span {
  color: #6c757d;
  font-size: 0.9rem;
}

.descuento-info {
  display: block;
  color: #dc3545;
  font-size: 0.8rem;
  margin-top: 3px;
}

.camaron-neto-section {
  margin: 20px 0;
  padding-top: 15px;
  border-top: 1px solid #dee2e6;
}

.producto-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  font-size: 0.9rem;
}

.reportadas {
  background-color: #d4edda;
  padding: 5px 10px;
  border-radius: 4px;
}

.reportadas.coincide {
  background-color: #d4edda;
  color: #155724;
}

.reportadas.no-coincide {
  background-color: #f8d7da;
  color: #721c24;
}

.bolsas {
  background-color: #e2e3e5;
  padding: 5px 10px;
  border-radius: 4px;
}

.card-actions {
  display: flex;
  gap: 15px;
  margin-top: 20px;
  justify-content: space-between;
}

.card-actions .btn {
  flex: 1;
  height: 38px;
  font-size: 1rem;
}

.producto-acciones-lectura {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  gap: 5px;
}

.producto-edit, .producto-delete {
  width: 30px;
  height: 30px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

/* Responsivo */
@media (max-width: 1200px) {
  .producto-card {
    flex: 0 0 calc(50% - 20px);
  }
}

@media (max-width: 992px) {
  .producto-card {
    flex: 0 0 calc(50% - 20px);
  }
}

@media (max-width: 576px) {
  .producto-card {
    flex: 0 0 100%;
  }
}

/* Estilos para los modales */
.modal-overlay {
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

.modal-contenido {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #dee2e6;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #dee2e6;
}

.close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
}

@media (max-width: 576px) {
  .modal-contenido {
    width: 95%;
  }
}

.encabezado-medida {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 8px 8px 0 0;
  margin: -15px -15px 15px -15px;
  border-bottom: 1px solid #dee2e6;
}

.botones-encabezado {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-right: 15px;
}

.botones-fila-superior,
.botones-fila-inferior {
  display: flex;
  gap: 5px;
}

.btn-precio,
.btn-hilos,
.btn-nota {
  width: 30px;
  height: 30px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  border-radius: 4px;
  background-color: #f8f9fa;
  border: 1px solid #ced4da;
  transition: all 0.3s ease;
}

.tiene-precio,
.tiene-hilos,
.tiene-nota {
  background-color: #28a745;
  color: white;
  border-color: #28a745;
}

.kg-radio {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9rem;
}

.medida-texto {
  flex: 1;
  font-size: 2rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0 10px;
  transition: all 0.3s ease;
}

.medida-texto:hover:not(.disabled) {
  color: #28a745;
}

.disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.tiene-nombre-alternativo {
  color: #28a745;
}

.ch20-text {
  font-size: 2rem;
  color: #6c757d;
  margin-left: 5px;
}

.pdf-badge {
  font-size: 0.7rem;
  background-color: #17a2b8;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 5px;
  vertical-align: middle;
}

.precio-tag {
  font-size: 1.2rem;
  font-weight: 600;
  color: #28a745;
  background-color: #e9ecef;
  padding: 2px 8px;
  border-radius: 4px;
}

.reporte-taras-bolsas {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #dee2e6;
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
}

.reporte-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.reporte-header h5 {
  margin: 0;
  color: #495057;
}

.reporte-contenido {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.reporte-columna {
  display: flex;
  flex-direction: column;
}

.reporte-columna h6 {
  margin-bottom: 10px;
  color: #495057;
  text-align: center;
}

.reporte-input {
  text-align: center;
  font-weight: 500;
}

.total-taras-reporte,
.total-bolsas-reporte {
  margin-top: 15px;
  padding: 8px;
  border-radius: 4px;
  text-align: center;
  font-weight: 500;
}

.total-taras-reporte.coincide {
  background-color: #d4edda;
  color: #155724;
}

.total-taras-reporte.no-coincide {
  background-color: #f8d7da;
  color: #721c24;
}

.total-bolsas-reporte {
  background-color: #e2e3e5;
  color: #383d41;
  padding: 8px;
  border-radius: 4px;
  text-align: center;
  font-weight: 500;
  margin-top: 15px;
}

.bolsas-info {
  display: block;
  font-size: 0.8rem;
  color: #6c757d;
  font-weight: normal;
}

@media (max-width: 576px) {
  .reporte-contenido {
    grid-template-columns: 1fr;
    gap: 15px;
  }
}

.tipo-ch20 {
  color: #007bff !important; /* Color azul de Bootstrap */
}

.ch20-text {
  font-size: 2rem;
  margin-left: 5px;
  font-weight: 600;
}

.camaron-neto-inline {
  display: inline-block;
  width: 80px;
  vertical-align: middle;
  margin-left: 5px;
}

.neto-input {
  height: 38px;
  padding: 2px 5px;
  font-size: 0.9rem;
  text-align: center;
  border-radius: 4px;
  border: 1px solid #ced4da;
  width: 100%;
}

.neto-input:focus {
  border-color: #28a745;
  box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25);
}

.neto-input.is-invalid {
  border-color: #dc3545;
}

/* Estilos para indicadores de bloqueo y sincronización */
.bloqueo-indicador {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 5px;
  background-color: rgba(220, 53, 69, 0.9);
  color: white;
  font-size: 0.8rem;
  text-align: center;
  z-index: 10;
  border-radius: 8px 8px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.sync-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 5px;
  background-color: rgba(25, 135, 84, 0.9);
  color: white;
  font-size: 0.8rem;
  text-align: center;
  z-index: 10;
  border-radius: 0 0 8px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}
</style> 