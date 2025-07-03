<template>
  <div class="calcular-container">
    <b-button 
      @click="procesarArreglo" 
      variant="primary"
      block
      :disabled="!tieneDatos || estaProcesando"
      class="boton-calcular"
    >
      <div class="contenido-boton">
        <div class="icono-wrapper">
          <span v-if="!estaProcesando" class="icono">{{ iconoBoton }}</span>
          <div v-else class="spinner"></div>
        </div>
        <div class="texto-boton">
          <div class="titulo-boton">{{ tituloBoton }}</div>
          <div class="descripcion-boton">{{ descripcionBoton }}</div>
        </div>
      </div>
    </b-button>
    
    <!-- Feedback de estado -->
    <div v-if="mensajeEstado" class="mensaje-estado" :class="tipoMensaje">
      {{ mensajeEstado }}
    </div>
  </div>
</template>

<script>
export default {
  name: "Calcular",
  props: {
    datos: {
      type: String,
      required: true,
      validator(valor) {
        return typeof valor === 'string';
      }
    },
    cantidad: {
      type: String,
      required: true,
      validator(valor) {
        return ['$1', '$2'].includes(valor);
      }
    }
  },
  data() {
    return {
      estaProcesando: false,
      mensajeEstado: '',
      tipoMensaje: 'info'
    };
  },
  computed: {
    tieneDatos() {
      return this.datos && this.datos.trim().length > 0;
    },
    esDenominacionDos() {
      return this.cantidad === "$2";
    },
    iconoBoton() {
      return this.esDenominacionDos ? '💵' : '💵';
    },
    tituloBoton() {
      return `Calcular con ${this.cantidad}`;
    },
    descripcionBoton() {
      if (!this.tieneDatos) {
        return 'Ingrese datos primero';
      }
      return this.esDenominacionDos 
        ? 'Monedas de $2 y $1' 
        : 'Monedas de $1';
    },
    datosLimpiados() {
      if (!this.tieneDatos) return [];
      
      return this.datos.split('\n')
        .map(linea => linea.trim())
        .filter(linea => linea.length > 0)
        .filter(linea => !isNaN(parseFloat(linea.replace(/[$,\s]/g, ''))))
        .map(linea => parseFloat(linea.replace(/[$,\s]/g, '')));
    },
    cantidadLineas() {
      return this.datosLimpiados.length;
    }
  },
  methods: {
    async procesarArreglo() {
      if (!this.validarDatos()) {
        return;
      }

      this.estaProcesando = true;
      this.mensajeEstado = `Procesando ${this.cantidadLineas} líneas...`;
      this.tipoMensaje = 'info';

      try {
        // Simular procesamiento asíncrono para UX
        await this.esperar(300);
        
        const datosParaEmitir = this.datosLimpiados.map(numero => numero.toString());
        
        this.$emit("dataArray", { 
          data: datosParaEmitir, 
          isTwo: this.esDenominacionDos,
          metadata: {
            totalLineas: this.cantidadLineas,
            tipoCalculo: this.cantidad,
            timestamp: new Date().toISOString()
          }
        });

        this.mensajeEstado = `✅ Procesadas ${this.cantidadLineas} líneas correctamente`;
        this.tipoMensaje = 'success';
        
        // Limpiar mensaje después de 3 segundos
        setTimeout(() => {
          this.mensajeEstado = '';
        }, 3000);

      } catch (error) {
        console.error('Error al procesar datos:', error);
        this.mensajeEstado = '❌ Error al procesar los datos';
        this.tipoMensaje = 'error';
        
        setTimeout(() => {
          this.mensajeEstado = '';
        }, 5000);
      } finally {
        this.estaProcesando = false;
      }
    },
    validarDatos() {
      if (!this.tieneDatos) {
        this.mensajeEstado = '⚠️ No hay datos para procesar';
        this.tipoMensaje = 'warning';
        setTimeout(() => {
          this.mensajeEstado = '';
        }, 3000);
        return false;
      }

      if (this.cantidadLineas === 0) {
        this.mensajeEstado = '⚠️ No se encontraron números válidos';
        this.tipoMensaje = 'warning';
        setTimeout(() => {
          this.mensajeEstado = '';
        }, 3000);
        return false;
      }

      return true;
    },
    esperar(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  },
  watch: {
    datos: {
      handler() {
        // Limpiar mensajes cuando cambien los datos
        if (this.mensajeEstado && this.tipoMensaje !== 'info') {
          this.mensajeEstado = '';
        }
      }
    }
  }
};
</script>

<style scoped>
.calcular-container {
  margin-bottom: 15px;
  position: relative;
}

.boton-calcular {
  width: 100%;
  padding: 0;
  border: none;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.boton-calcular:not(:disabled) {
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
}

.boton-calcular:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  background: linear-gradient(135deg, #0056b3 0%, #003f8a 100%);
}

.boton-calcular:disabled {
  background-color: #6c757d;
  color: #adb5bd;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.contenido-boton {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  gap: 15px;
}

.icono-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
}

.icono {
  font-size: 24px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.texto-boton {
  flex: 1;
  text-align: left;
}

.titulo-boton {
  font-size: 1.1em;
  font-weight: 600;
  margin-bottom: 2px;
}

.descripcion-boton {
  font-size: 0.85em;
  opacity: 0.9;
  font-weight: 400;
}

.mensaje-estado {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.9em;
  font-weight: 500;
  text-align: center;
  animation: fadeIn 0.3s ease;
}

.mensaje-estado.info {
  background-color: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.mensaje-estado.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.mensaje-estado.warning {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.mensaje-estado.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .contenido-boton {
    padding: 12px 15px;
    gap: 12px;
  }

  .icono-wrapper {
    min-width: 35px;
    height: 35px;
  }

  .icono {
    font-size: 20px;
  }

  .titulo-boton {
    font-size: 1em;
  }

  .descripcion-boton {
    font-size: 0.8em;
  }
}

@media (max-width: 576px) {
  .contenido-boton {
    padding: 10px 12px;
    gap: 10px;
  }

  .icono-wrapper {
    min-width: 30px;
    height: 30px;
  }

  .icono {
    font-size: 18px;
  }

  .titulo-boton {
    font-size: 0.95em;
  }

  .descripcion-boton {
    font-size: 0.75em;
  }

  .mensaje-estado {
    font-size: 0.85em;
    padding: 6px 10px;
  }
}

/* Estilos para impresión */
@media print {
  .calcular-container {
    display: none;
  }
}

/* Accesibilidad */
.boton-calcular:focus {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

.boton-calcular:focus:not(:focus-visible) {
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  .boton-calcular,
  .spinner,
  .mensaje-estado {
    animation: none;
    transition: none;
  }
  
  .boton-calcular:hover {
    transform: none;
  }
}
</style>
