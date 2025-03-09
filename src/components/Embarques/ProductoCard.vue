<template>
  <div class="producto-card" :class="{'producto-editable': !soloLectura}">
    <div class="producto-header">
      <div v-if="!soloLectura" class="producto-acciones">
        <button class="btn btn-sm btn-outline-primary" @click="toggleTipoMoneda">
          $
        </button>
        <button class="btn btn-sm btn-outline-primary" @click="toggleTipoProducto">
          H
        </button>
        <button class="btn btn-sm btn-outline-primary" @click="toggleModoNumerico">
          N
        </button>
        <label class="checkbox-container ml-2">
          <input type="checkbox" v-model="usaKilos">
          <span class="checkmark"></span>
          kg
        </label>
      </div>

      <div v-if="!soloLectura" class="tipo-talla-input">
        <input 
          type="text" 
          v-model="tallaProducto" 
          class="form-control talla-input"
          placeholder="Talla"
          :class="{ 'is-invalid': errores.tallaProducto }"
          :disabled="disabled"
          list="tallas-disponibles"
        />
        <datalist id="tallas-disponibles">
          <option v-for="talla in tallasDisponibles" :key="talla" :value="talla">
            {{ talla }}
          </option>
        </datalist>
        
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
        {{ producto.talla }} - {{ producto.tipo }}
      </div>
      
      <div v-if="!soloLectura && mostrarPrecio" class="precio-container">
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
              :disabled="disabled || soloLectura"
            >
            <label class="form-check-label" for="restarTresPorTara">-3</label>
          </div>
        </div>
        <div class="header-kilos">
          Kilos
        </div>
      </div>
      
      <!-- Vista de edición -->
      <div v-if="!soloLectura" class="taras-kilos-items">
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
      <div v-if="!soloLectura" class="taras-kilos-actions">
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
          <h6>Total: {{ soloLectura ? calcularTotalTaras(producto.tarasKilos) : totalTaras }}</h6>
          <span>Taras</span>
        </div>
        <div class="total-kilos">
          <h6>Total: {{ soloLectura ? calcularTotalKilos(producto) : totalKilos }}</h6>
          <span>{{ usaKilos ? 'Kilos' : 'Bolsas' }}</span>
          <span v-if="restarTresPorTara" class="descuento-info">
            (Descuento: {{ soloLectura ? calcularTotalTaras(producto.tarasKilos) * 3 : totalTaras * 3 }} kg)
          </span>
        </div>
      </div>
      
      <!-- Campo para camarón neto (condicional) -->
      <div v-if="!soloLectura && tipoProducto === 'C/H20'" class="camaron-neto-section">
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
    <div v-if="!soloLectura" class="card-actions">
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
    </div>
    
    <!-- Botón eliminar para productos guardados -->
    <button v-if="soloLectura" @click="eliminarProducto" class="btn btn-sm btn-danger producto-delete">
      <i class="fas fa-times"></i>
    </button>
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
    }
  },
  data() {
    return {
      // Datos del formulario
      tipoProducto: '',
      tallaProducto: '',
      precioProducto: null,
      camaronNetoLocal: 0.65,
      
      // Control de errores
      errores: {
        tipoProducto: '',
        tallaProducto: '',
        precioProducto: '',
        camaronNeto: ''
      },
      
      tarasKilosItems: [{ tara: null, kilos: null, errorTara: '', errorKilos: '' }],
      restarTresPorTara: true,
      
      // Controles de UI para la tarjeta
      mostrarPrecio: true,
      modoNumerico: false,
      usaKilos: true
    };
  },
  computed: {
    /**
     * Determina las tallas disponibles según el tipo de producto seleccionado
     * @returns {Array} - Lista de tallas disponibles
     */
    tallasDisponibles() {
      return ['16/20', '21/25', '26/30', '31/35', '36/40', '41/50', '51/60', '61/70', '71/90', '91/110', '110/130', '130/150', '150/200', '200/300', '300/500'];
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
      if (!this.tallaProducto) {
        this.errores.tallaProducto = 'Debe seleccionar una talla';
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
     * Valida los datos y emite el evento para agregar el producto
     */
    validarYEmitirProducto() {
      if (this.validarFormulario()) {
        const nuevoProducto = {
          cliente: this.clienteActivo,
          tipo: this.tipoProducto,
          talla: this.tallaProducto,
          tarasKilos: [...this.tarasKilosItems],
          restarTresPorTara: this.restarTresPorTara,
          kilosTotales: this.calcularKilosTotales(),
          precio: this.precioProducto,
          total: parseFloat((this.calcularKilosTotales() * (this.tipoProducto === 'C/H20' ? this.camaronNetoLocal : 1) * this.precioProducto).toFixed(2)),
          camaronNeto: this.tipoProducto === 'C/H20' ? this.camaronNetoLocal : null,
          fecha: this.fecha,
          timestamp: new Date().toISOString()
        };
        
        this.$emit('agregar-producto', nuevoProducto);
        this.limpiarFormulario();
      }
    },
    
    /**
     * Limpia el formulario
     */
    limpiarFormulario() {
      this.tipoProducto = '';
      this.tallaProducto = '';
      this.precioProducto = null;
      this.camaronNetoLocal = 0.65;
      this.tarasKilosItems = [{ tara: null, kilos: null, errorTara: '', errorKilos: '' }];
      this.restarTresPorTara = true;
      
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
      let total = producto.tarasKilos.reduce((sum, item) => sum + (Number(item.kilos) || 0), 0);
      
      if (producto.restarTresPorTara) {
        const totalTaras = this.calcularTotalTaras(producto.tarasKilos);
        const descuento = totalTaras * 3;
        total = Math.max(0, total - descuento);
      }
      
      return Math.round(total);
    },
    
    /**
     * Alterna la visualización del campo de precio
     */
    toggleTipoMoneda() {
      this.mostrarPrecio = !this.mostrarPrecio;
    },
    
    /**
     * Alterna entre los tipos de producto
     */
    toggleTipoProducto() {
      this.tipoProducto = this.tipoProducto === 'S/H20' ? 'C/H20' : 'S/H20';
    },
    
    /**
     * Alterna el modo numérico
     */
    toggleModoNumerico() {
      this.modoNumerico = !this.modoNumerico;
    }
  }
};
</script>

<style scoped>
.producto-card {
  flex: 0 0 calc(25% - 20px);
  border: 2px solid #dc3545;
  border-radius: 8px;
  padding: 15px;
  background-color: white;
  position: relative;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.producto-editable {
  border-color: #007bff;
}

.producto-header {
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.producto-acciones {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.producto-acciones button {
  margin-right: 5px;
  width: 45px;
  height: 45px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
}

.checkbox-container {
  display: inline-flex;
  align-items: center;
  margin-left: 10px;
  font-size: 1rem;
}

.tipo-talla-input {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.talla-input, .tipo-input {
  flex: 1;
  height: 50px;
  font-size: 1.1rem;
}

.separador {
  margin: 0 5px;
  font-weight: bold;
  font-size: 1.5rem;
}

.precio-container {
  margin-top: 5px;
}

.precio-input {
  font-weight: bold;
  color: #28a745;
  height: 50px;
  font-size: 1.5rem;
  text-align: center;
}

.tipo-talla {
  font-weight: bold;
  font-size: 1.3rem;
  text-align: center;
  padding: 10px 0;
}

.precio {
  color: #28a745;
  font-weight: bold;
  font-size: 1.3rem;
  text-align: center;
}

/* Taras y kilos */
.taras-kilos-section {
  font-size: 1rem;
}

.taras-kilos-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  font-weight: bold;
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

.tara-kilo-row, .tara-kilo-item {
  display: flex;
  margin-bottom: 10px;
  align-items: center;
}

.tara-input, .kilo-input, .tara-value, .kilo-value {
  flex: 1;
}

.tara-input {
  margin-right: 5px;
}

.kilo-input {
  margin-left: 5px;
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
  height: 45px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-add {
  width: 45px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
}

.btn-add-extra {
  background-color: #ffc107;
  color: white;
  border: none;
  border-radius: 4px;
  width: auto;
  padding: 0 15px;
}

.taras-kilos-totals {
  display: flex;
  border-top: 1px solid #e0e0e0;
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
  border-top: 1px solid #e0e0e0;
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
  height: 45px;
  font-size: 1.1rem;
}

.producto-delete {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 30px;
  height: 30px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.campo-requerido {
  color: #dc3545;
}

/* Responsivo */
@media (max-width: 1200px) {
  .producto-card {
    flex: 0 0 calc(33.333% - 20px);
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
  
  .producto-header {
    flex-direction: column;
  }
  
  .tipo-talla-input {
    flex-direction: column;
  }
  
  .separador {
    display: none;
  }
  
  .talla-input, .tipo-input {
    width: 100%;
    margin-bottom: 10px;
  }
  
  .action-btn {
    width: 100%;
    margin: 5px 0;
  }
  
  .taras-kilos-actions {
    flex-direction: column;
  }
  
  .btn-add, .btn-add-extra {
    width: 100%;
  }
}
</style> 