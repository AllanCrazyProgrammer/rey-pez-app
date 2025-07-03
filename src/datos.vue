<template>
  <div class="datos-container mt-5">
    <div class="fecha-actual">{{ fechaActual }}</div>

    <b-row>
      <b-col cols="12" md="5" class="mb-3">
        <div class="controles-section">
          <b-button 
            @click="limpiarDatos" 
            variant="danger" 
            class="mb-3" 
            block
            :disabled="!tieneDatos"
          >
            Limpiar datos
          </b-button>
          
          <b-form-textarea
            class="text-center input-dinero"
            name="dinero"
            id="textarea-dinero"
            placeholder="Ingrese cantidades de dinero (una por línea)"
            rows="4"
            max-rows="12"
            v-model="datosLocales"
            @input="validarEntrada"
            :state="estadoValidacion"
          ></b-form-textarea>
          
          <!-- Mensajes de validación -->
          <div v-if="erroresValidacion.length > 0" class="alertas-validacion mt-2">
            <b-alert 
              v-for="(error, index) in erroresValidacion" 
              :key="index"
              show 
              variant="warning" 
              class="alerta-pequena"
            >
              {{ error }}
            </b-alert>
          </div>
          

          
          <div class="mt-3 suma-total">
            <div class="total-container">
              <span class="etiqueta-total">Total:</span>
              <span class="valor-total">${{ formatearNumero(sumaTotal) }}</span>
            </div>
            <div v-if="sumaTotal > 0" class="promedio-info">
              <small>Promedio: ${{ formatearNumero(promedioPorLinea) }}</small>
            </div>
          </div>
        </div>
      </b-col>

      <b-col cols="12" md="7">
        <Cuentas :datos="datosLocales" />
      </b-col>
    </b-row>
  </div>
</template>

<script>
import Cuentas from "./Cuentas.vue";

export default {
  name: "Datos",
  components: {
    Cuentas,
  },
  props: {
    datosIniciales: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      datosLocales: this.datosIniciales,
      erroresValidacion: [],
      lineasValidadas: {
        validas: []
      }
    };
  },
  computed: {
    fechaActual() {
      const hoy = new Date();
      const opciones = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      };
      return hoy.toLocaleDateString('es-ES', opciones);
    },
    tieneDatos() {
      return this.datosLocales.trim().length > 0;
    },
    lineasProcesadas() {
      return this.datosLocales.split('\n')
        .map(linea => linea.trim())
        .filter(linea => linea.length > 0);
    },

    sumaTotal() {
      return this.lineasValidadas.validas
        .reduce((suma, valor) => suma + valor, 0);
    },
    promedioPorLinea() {
      const lineasValidas = this.lineasValidadas.validas.length;
      return lineasValidas > 0 ? this.sumaTotal / lineasValidas : 0;
    },
    estadoValidacion() {
      if (!this.tieneDatos) return null;
      return this.erroresValidacion.length === 0 ? true : false;
    }
  },
  methods: {
    limpiarDatos() {
      this.datosLocales = '';
      this.erroresValidacion = [];
      this.lineasValidadas = { validas: [] };
    },
    validarEntrada() {
      this.erroresValidacion = [];
      this.lineasValidadas = { validas: [] };
      
      if (!this.tieneDatos) {
        return;
      }
      
      const lineas = this.lineasProcesadas;
      
      lineas.forEach((linea, indice) => {
        const numeroLinea = indice + 1;
        const valorNumerico = this.validarLinea(linea, numeroLinea);
        
        if (valorNumerico !== null) {
          this.lineasValidadas.validas.push(valorNumerico);
        }
      });
      
      // Limitar errores mostrados para no saturar la UI
      if (this.erroresValidacion.length > 5) {
        const erroresAdicionales = this.erroresValidacion.length - 5;
        this.erroresValidacion = this.erroresValidacion.slice(0, 5);
        this.erroresValidacion.push(`... y ${erroresAdicionales} errores más`);
      }
    },
    validarLinea(linea, numeroLinea) {
      // Limpiar la línea de caracteres especiales comunes pero preservar puntos decimales
      const lineaLimpia = linea.replace(/[$,\s]/g, '');
      
      // Verificar si está vacía después de limpiar
      if (!lineaLimpia) {
        return null;
      }
      
      // Verificar si es un número válido
      const numero = parseFloat(lineaLimpia);
      
      if (isNaN(numero)) {
        this.erroresValidacion.push(`Línea ${numeroLinea}: "${linea}" no es un número válido`);
        return null;
      }
      
      if (numero < 0) {
        this.erroresValidacion.push(`Línea ${numeroLinea}: Los valores negativos no son válidos`);
        return null;
      }
      
      if (numero > 1000000) {
        this.erroresValidacion.push(`Línea ${numeroLinea}: El valor ${numero} parece demasiado grande`);
        return null;
      }
      
      // Redondear a 2 decimales para evitar problemas de precisión
      return Math.round(numero * 100) / 100;
    },
    formatearNumero(valor) {
      if (typeof valor !== 'number' || isNaN(valor)) {
        return '0.00';
      }
      return valor.toLocaleString('es-MX', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
  },
  watch: {
    datosLocales: {
      handler: 'validarEntrada',
      immediate: true
    }
  }
};
</script>

<style scoped>
.datos-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 12px;
  background-color: #f8f9fa;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.fecha-actual {
  font-size: 1.1em;
  color: #2c3e50;
  margin-bottom: 20px;
  text-align: right;
  font-weight: 500;
}

.controles-section {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.input-dinero {
  resize: vertical;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  font-size: 16px;
  line-height: 1.5;
  transition: border-color 0.3s ease;
}

.input-dinero:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.input-dinero.is-invalid {
  border-color: #dc3545;
}

.input-dinero.is-valid {
  border-color: #28a745;
}

.alertas-validacion {
  max-height: 200px;
  overflow-y: auto;
}

.alerta-pequena {
  font-size: 0.875em;
  padding: 8px 12px;
  margin-bottom: 5px;
}



.suma-total {
  background-color: #e9ecef;
  padding: 15px;
  border-radius: 8px;
  border: 2px solid #dee2e6;
}

.total-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.etiqueta-total {
  font-size: 1.2em;
  font-weight: 600;
  color: #495057;
}

.valor-total {
  font-size: 1.4em;
  font-weight: 700;
  color: #2c3e50;
}

.promedio-info {
  text-align: right;
  color: #6c757d;
}

button {
  background-color: #2c3e50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
}

button:hover:not(:disabled) {
  background-color: #1a252f;
  transform: translateY(-1px);
}

button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  transform: none;
}

button.btn-danger {
  background-color: #dc3545;
}

button.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
}

/* Responsive Design */
@media (max-width: 768px) {
  .datos-container {
    padding: 15px;
    margin: 10px;
  }

  .controles-section {
    padding: 15px;
  }

  .fecha-actual {
    text-align: center;
    margin-bottom: 15px;
    font-size: 1em;
  }



  .total-container {
    flex-direction: column;
    text-align: center;
    gap: 5px;
  }

  .promedio-info {
    text-align: center;
  }
}

@media (max-width: 576px) {
  .datos-container {
    padding: 10px;
    margin: 5px;
    border-radius: 8px;
  }

  .controles-section {
    padding: 10px;
  }

  .input-dinero {
    padding: 12px;
    font-size: 14px;
  }

  .valor-total {
    font-size: 1.2em;
  }

  .etiqueta-total {
    font-size: 1em;
  }
}

/* Estilos para impresión */
@media print {
  .datos-container {
    box-shadow: none;
    border: none;
    background-color: white;
  }
  
  .controles-section {
    box-shadow: none;
    border: 1px solid #ddd;
  }
  
  button {
    display: none;
  }
  
  .alertas-validacion {
    display: none;
  }
}
</style>
