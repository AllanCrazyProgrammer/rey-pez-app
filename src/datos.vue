<template>
  <div class="datos-container mt-5">
    <!-- HUD Frame -->
    <div class="hud-frame">
      <div class="hud-corner hud-tl"></div>
      <div class="hud-corner hud-tr"></div>
      <div class="hud-corner hud-bl"></div>
      <div class="hud-corner hud-br"></div>
      
      <div class="fecha-actual">
        <span class="fecha-prefix">◢ DATE:</span>
        <span class="fecha-value">{{ fechaActual }}</span>
      </div>

      <b-row>
        <b-col cols="12" md="5" class="mb-3">
          <div class="controles-section">
            <div class="section-header">
              <span class="header-icon">◈</span>
              <span class="header-text">INPUT_DATA</span>
            </div>
            
            <b-button 
              @click="limpiarDatos" 
              variant="danger" 
              class="btn-limpiar mb-3" 
              block
              :disabled="!tieneDatos"
            >
              <span class="btn-bracket">[</span>
              <span class="btn-icon">✕</span>
              <span class="btn-text">CLEAR_DATA</span>
              <span class="btn-bracket">]</span>
            </b-button>
            
            <div class="textarea-wrapper">
              <div class="textarea-header">
                <span>▸ MONEY_INPUT</span>
                <span class="line-count" v-if="lineasProcesadas.length > 0">{{ lineasProcesadas.length }} LINES</span>
              </div>
              <b-form-textarea
                class="text-center input-dinero"
                name="dinero"
                id="textarea-dinero"
                placeholder=">> Ingrese cantidades..."
                rows="4"
                max-rows="12"
                v-model="datosLocales"
                @input="validarEntrada"
                :state="estadoValidacion"
              ></b-form-textarea>
            </div>
            
            <!-- Mensajes de validación -->
            <div v-if="erroresValidacion.length > 0" class="alertas-validacion mt-2">
              <div 
                v-for="(error, index) in erroresValidacion" 
                :key="index"
                class="alerta-item"
              >
                <span class="alerta-icon">⚠</span>
                {{ error }}
              </div>
            </div>
            
            <div class="mt-3 suma-total">
              <div class="total-header">◈ CALCULATION_RESULT</div>
              <div class="total-container">
                <span class="etiqueta-total">TOTAL:</span>
                <span class="valor-total">${{ formatearNumero(sumaTotal) }}</span>
              </div>
              <div v-if="sumaTotal > 0" class="promedio-info">
                <span class="promedio-label">AVG:</span>
                <span class="promedio-value">${{ formatearNumero(promedioPorLinea) }}</span>
              </div>
            </div>
          </div>
        </b-col>

        <b-col cols="12" md="7">
          <Cuentas :datos="datosLocales" />
        </b-col>
      </b-row>
    </div>
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
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=VT323&family=Share+Tech+Mono&display=swap');

/* Variables */
.datos-container {
  --matrix-green: #00ff41;
  --matrix-green-glow: #00ff4180;
  --thermal-orange: #ff6b00;
  --thermal-yellow: #ffcc00;
  --thermal-red: #ff2a2a;
  --bg-dark: #0a0808;
  --bg-panel: rgba(10, 8, 8, 0.95);
}

.datos-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  background: transparent;
}

/* HUD Frame */
.hud-frame {
  position: relative;
  background: var(--bg-panel);
  border: 2px solid var(--thermal-orange);
  padding: 25px;
  box-shadow: 
    0 0 30px rgba(255, 107, 0, 0.3),
    inset 0 0 60px rgba(255, 68, 68, 0.05);
}

.hud-corner {
  position: absolute;
  width: 25px;
  height: 25px;
  border-color: var(--thermal-orange);
  border-style: solid;
}

.hud-tl { top: 5px; left: 5px; border-width: 3px 0 0 3px; }
.hud-tr { top: 5px; right: 5px; border-width: 3px 3px 0 0; }
.hud-bl { bottom: 5px; left: 5px; border-width: 0 0 3px 3px; }
.hud-br { bottom: 5px; right: 5px; border-width: 0 3px 3px 0; }

/* Fecha */
.fecha-actual {
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  margin-bottom: 25px;
  text-align: right;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  align-items: center;
}

.fecha-prefix {
  color: var(--thermal-orange);
  font-size: 0.9rem;
}

.fecha-value {
  color: var(--thermal-yellow);
  text-shadow: 0 0 10px var(--thermal-yellow);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Sección de controles */
.controles-section {
  background: rgba(0, 20, 0, 0.8);
  border: 1px solid var(--matrix-green);
  padding: 20px;
  box-shadow: 0 0 20px var(--matrix-green-glow);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--matrix-green);
}

.header-icon {
  color: var(--matrix-green);
  font-size: 1.2rem;
  text-shadow: 0 0 10px var(--matrix-green);
}

.header-text {
  font-family: 'Orbitron', sans-serif;
  color: var(--matrix-green);
  font-size: 1.1rem;
  letter-spacing: 3px;
  text-shadow: 0 0 10px var(--matrix-green-glow);
}

/* Botón limpiar */
.btn-limpiar {
  background: transparent !important;
  border: 2px solid var(--thermal-red) !important;
  color: var(--thermal-red) !important;
  font-family: 'VT323', monospace !important;
  font-size: 1.2rem !important;
  padding: 12px 20px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  transition: all 0.3s ease !important;
  border-radius: 0 !important;
}

.btn-limpiar:hover:not(:disabled) {
  background: var(--thermal-red) !important;
  color: var(--bg-dark) !important;
  box-shadow: 0 0 20px rgba(255, 42, 42, 0.5) !important;
}

.btn-limpiar:disabled {
  opacity: 0.4 !important;
  border-color: #444 !important;
  color: #444 !important;
}

.btn-bracket {
  color: var(--thermal-yellow);
}

.btn-icon {
  font-weight: bold;
}

/* Textarea wrapper */
.textarea-wrapper {
  margin-bottom: 15px;
}

.textarea-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.9rem;
  color: var(--matrix-green);
  margin-bottom: 8px;
  opacity: 0.8;
}

.line-count {
  color: var(--thermal-yellow);
  font-size: 0.85rem;
}

.input-dinero {
  resize: vertical;
  background: rgba(0, 40, 0, 0.6) !important;
  border: 2px solid var(--matrix-green) !important;
  border-radius: 0 !important;
  padding: 15px !important;
  font-family: 'VT323', monospace !important;
  font-size: 1.3rem !important;
  line-height: 1.5 !important;
  color: var(--matrix-green) !important;
  transition: all 0.3s ease !important;
}

.input-dinero::placeholder {
  color: rgba(0, 255, 65, 0.4) !important;
}

.input-dinero:focus {
  border-color: var(--thermal-yellow) !important;
  box-shadow: 0 0 20px var(--matrix-green-glow) !important;
  outline: none !important;
}

.input-dinero.is-invalid {
  border-color: var(--thermal-red) !important;
  box-shadow: 0 0 15px rgba(255, 42, 42, 0.3) !important;
}

.input-dinero.is-valid {
  border-color: var(--matrix-green) !important;
  box-shadow: 0 0 15px var(--matrix-green-glow) !important;
}

/* Alertas */
.alertas-validacion {
  max-height: 150px;
  overflow-y: auto;
}

.alerta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 5px;
  background: rgba(255, 42, 42, 0.1);
  border: 1px solid var(--thermal-red);
  color: var(--thermal-red);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.9rem;
}

.alerta-icon {
  color: var(--thermal-yellow);
}

/* Suma total */
.suma-total {
  background: rgba(0, 40, 0, 0.5);
  border: 2px solid var(--matrix-green);
  padding: 15px;
}

.total-header {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.85rem;
  color: var(--matrix-green);
  margin-bottom: 15px;
  letter-spacing: 2px;
  opacity: 0.8;
}

.total-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.etiqueta-total {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: var(--thermal-orange);
  letter-spacing: 2px;
}

.valor-total {
  font-family: 'VT323', monospace;
  font-size: 2.5rem;
  color: var(--matrix-green);
  text-shadow: 
    0 0 10px var(--matrix-green),
    0 0 20px var(--matrix-green-glow);
}

.promedio-info {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.promedio-label {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.9rem;
  color: var(--thermal-yellow);
  opacity: 0.8;
}

.promedio-value {
  font-family: 'VT323', monospace;
  font-size: 1.3rem;
  color: var(--thermal-yellow);
  text-shadow: 0 0 8px var(--thermal-yellow);
}

/* Responsive */
@media (max-width: 768px) {
  .hud-frame {
    padding: 15px;
  }

  .fecha-actual {
    flex-direction: column;
    text-align: center;
    gap: 5px;
  }

  .controles-section {
    padding: 15px;
  }

  .valor-total {
    font-size: 2rem;
  }

  .total-container {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }

  .promedio-info {
    justify-content: center;
  }
}

@media (max-width: 576px) {
  .hud-frame {
    padding: 10px;
  }

  .hud-corner {
    width: 15px;
    height: 15px;
  }

  .header-text {
    font-size: 0.9rem;
    letter-spacing: 1px;
  }

  .input-dinero {
    font-size: 1.1rem !important;
    padding: 12px !important;
  }

  .valor-total {
    font-size: 1.8rem;
  }

  .etiqueta-total {
    font-size: 0.9rem;
  }

  .btn-limpiar {
    font-size: 1rem !important;
    padding: 10px 15px !important;
  }
}

/* Print */
@media print {
  .datos-container {
    background: white;
  }
  
  .hud-frame {
    border: 1px solid #000;
    box-shadow: none;
    background: white;
  }
  
  .btn-limpiar,
  .alertas-validacion {
    display: none;
  }
  
  .valor-total,
  .fecha-value,
  .header-text {
    color: #000 !important;
    text-shadow: none !important;
  }
}
</style>
