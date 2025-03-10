<template>
  <div class="producto-card producto-editable" :class="{'card-blocked': disabled}">
    <div class="producto-header">
      <div v-if="!editMode" class="producto-acciones">
        <button class="btn btn-sm btn-control" @click="toggleTipoMoneda">
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
      </div>

      <div v-else class="tipo-talla">
        {{ producto.medida || producto.media || producto.talla }} - {{ producto.tipo }}
      </div>
      
      <div v-if="!editMode && mostrarPrecio" class="precio-container">
        <input 
          type="number" 
          v-model.number="precioProducto" 
          class="form-control precio-input"
          placeholder="$"
          :class="{ 'is-invalid': errores.precioProducto }"
          :disabled="disabled"
          step="0.01"
          min="0"
        />
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
          <span v-if="restarTresPorTara" class="descuento-info">
            (Descuento: {{ editMode ? calcularTotalTaras(producto.tarasKilos) * 3 : totalTaras * 3 }} kg)
          </span>
        </div>
      </div>
      
      <!-- Campo para camarón neto (condicional) -->
      <div v-if="tipoProducto === 'C/H20'" class="camaron-neto-section">
        <label for="camaronNeto">Camarón Neto (%): <span class="campo-requerido">*</span></label>
        <input 
          type="number" 
          id="camaronNeto" 
          v-model.number="camaronNetoLocal" 
          class="form-control"
          :disabled="disabled"
          :class="{ 'is-invalid': errores.camaronNeto }"
          step="0.01"
          min="0.01"
          max="1"
          required
          @input="validarCampoNumerico('camaronNeto')"
        />
        <small class="form-text text-muted">Porcentaje (0.65 = 65%)</small>
      </div>
      
      <div class="producto-footer">
        <div class="reportadas">Reportadas: 0</div>
        <div class="bolsas">Bolsas: 0</div>
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
  </div>
</template>

<script>
/**
 * @component ProductoCard
 * @description Componente para mostrar y editar un producto de embarque
 */
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
      notas: ''
    };
  },
  mounted() {
    // Cargar datos del producto si existe, sin importar el valor de soloLectura
    if (this.producto) {
      this.cargarDatosProducto();
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
    }
  },
  methods: {
    /**
     * Carga los datos del producto para edición o visualización
     */
    cargarDatosProducto() {
      if (!this.producto) return;
      
      this.productoId = this.producto.id;
      this.tipoProducto = this.producto.tipo || '';
      // Priorizar el campo medida, luego media, luego talla para compatibilidad
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
    validarYEmitirProducto() {
      if (this.validarFormulario()) {
        const datosProducto = {
          cliente: this.clienteActivo,
          tipo: this.tipoProducto,
          talla: this.medidaProducto,
          media: this.medidaProducto,
          medida: this.medidaProducto,
          tarasKilos: [...this.tarasKilosItems],
          restarTresPorTara: this.restarTresPorTara,
          kilosTotales: this.calcularKilosTotales(),
          precio: this.precioProducto,
          total: parseFloat((this.calcularKilosTotales() * (this.tipoProducto === 'C/H20' ? this.camaronNetoLocal : 1) * this.precioProducto).toFixed(2)),
          camaronNeto: this.tipoProducto === 'C/H20' ? this.camaronNetoLocal : null,
          hilos: this.hilos,
          notas: this.notas,
          fecha: this.fecha,
          timestamp: new Date().toISOString()
        };
        
        console.log('ProductoCard - Emitiendo producto con datos:', {
          cliente: datosProducto.cliente,
          tipo: datosProducto.tipo,
          medida: datosProducto.medida,
          media: datosProducto.media,
          talla: datosProducto.talla
        });
        
        // Si estamos editando un producto existente, mantener su ID
        if (this.modoEdicion && this.productoId) {
          datosProducto.id = this.productoId;
          this.$emit('actualizar-producto', datosProducto);
        } else {
          this.$emit('agregar-producto', datosProducto);
        }
        
        this.limpiarFormulario();
      }
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
     * Emite evento para eliminar un producto
     */
    eliminarProducto() {
      this.$emit('eliminar-producto');
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
      }
      this.cerrarModalNotas();
    },
    
    /**
     * Permite editar el producto actual
     */
    editarProducto() {
      this.$emit('editar-producto', this.producto);
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
</style> 