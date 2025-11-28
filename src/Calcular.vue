<template>
  <div class="calcular-container">
    <button 
      @click="procesarArreglo" 
      :disabled="!tieneDatos || estaProcesando"
      class="boton-calcular"
      :class="{ 'is-two': esDenominacionDos }"
    >
      <div class="contenido-boton">
        <div class="icono-wrapper">
          <span v-if="!estaProcesando" class="icono">$</span>
          <div v-else class="spinner"></div>
        </div>
        <div class="texto-boton">
          <div class="titulo-boton">
            <span class="bracket">[</span>
            {{ tituloBoton }}
            <span class="bracket">]</span>
          </div>
          <div class="descripcion-boton">{{ descripcionBoton }}</div>
        </div>
        <div class="indicator">
          <span class="indicator-dot"></span>
        </div>
      </div>
    </button>
    
    <!-- Feedback de estado -->
    <div v-if="mensajeEstado" class="mensaje-estado" :class="tipoMensaje">
      <span class="estado-icon">▸</span>
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
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=VT323&family=Share+Tech+Mono&display=swap');

/* Variables */
.calcular-container {
  --matrix-green: #00ff41;
  --matrix-green-glow: #00ff4180;
  --thermal-orange: #ff6b00;
  --thermal-yellow: #ffcc00;
  --amber: #ffb000;
  --bg-dark: #0a0808;
}

.calcular-container {
  margin-bottom: 15px;
  position: relative;
}

.boton-calcular {
  width: 100%;
  padding: 0;
  border: 2px solid var(--matrix-green);
  background: rgba(0, 40, 0, 0.6);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.boton-calcular::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.1), transparent);
  transition: left 0.5s ease;
}

.boton-calcular:hover:not(:disabled)::before {
  left: 100%;
}

.boton-calcular:not(:disabled):hover {
  background: rgba(0, 255, 65, 0.15);
  box-shadow: 0 0 25px var(--matrix-green-glow);
  border-color: var(--matrix-green);
}

/* Variante para $2 */
.boton-calcular.is-two {
  border-color: var(--amber);
}

.boton-calcular.is-two:not(:disabled):hover {
  background: rgba(255, 176, 0, 0.15);
  box-shadow: 0 0 25px rgba(255, 176, 0, 0.4);
}

.boton-calcular.is-two .icono,
.boton-calcular.is-two .titulo-boton {
  color: var(--amber);
}

.boton-calcular.is-two .indicator-dot {
  background: var(--amber);
  box-shadow: 0 0 8px var(--amber);
}

.boton-calcular:disabled {
  background: rgba(30, 30, 30, 0.5);
  border-color: #333;
  cursor: not-allowed;
  opacity: 0.5;
}

.boton-calcular:disabled .icono,
.boton-calcular:disabled .titulo-boton,
.boton-calcular:disabled .descripcion-boton {
  color: #444;
}

.boton-calcular:disabled .indicator-dot {
  background: #333;
  box-shadow: none;
}

.contenido-boton {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  gap: 15px;
  position: relative;
  z-index: 1;
}

.icono-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 45px;
  height: 45px;
  border: 2px solid var(--matrix-green);
  background: rgba(0, 20, 0, 0.8);
}

.boton-calcular.is-two .icono-wrapper {
  border-color: var(--amber);
}

.icono {
  font-family: 'VT323', monospace;
  font-size: 1.8rem;
  color: var(--matrix-green);
  text-shadow: 0 0 10px var(--matrix-green);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 255, 65, 0.3);
  border-top: 2px solid var(--matrix-green);
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
  font-family: 'VT323', monospace;
  font-size: 1.4rem;
  color: var(--matrix-green);
  text-shadow: 0 0 8px var(--matrix-green-glow);
  display: flex;
  align-items: center;
  gap: 5px;
}

.bracket {
  color: var(--thermal-yellow);
  font-size: 1.2rem;
}

.descripcion-boton {
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.85rem;
  color: var(--thermal-orange);
  opacity: 0.8;
  margin-top: 3px;
}

.indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.indicator-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--matrix-green);
  box-shadow: 0 0 8px var(--matrix-green);
  animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

/* Mensajes de estado */
.mensaje-estado {
  margin-top: 10px;
  padding: 10px 15px;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: fadeIn 0.3s ease;
}

.estado-icon {
  font-size: 1rem;
}

.mensaje-estado.info {
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid #00d4ff;
  color: #00d4ff;
}

.mensaje-estado.success {
  background: rgba(0, 255, 65, 0.1);
  border: 1px solid var(--matrix-green);
  color: var(--matrix-green);
}

.mensaje-estado.warning {
  background: rgba(255, 176, 0, 0.1);
  border: 1px solid var(--amber);
  color: var(--amber);
}

.mensaje-estado.error {
  background: rgba(255, 42, 42, 0.1);
  border: 1px solid #ff2a2a;
  color: #ff2a2a;
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

/* Responsive */
@media (max-width: 768px) {
  .contenido-boton {
    padding: 12px 15px;
    gap: 12px;
  }

  .icono-wrapper {
    min-width: 38px;
    height: 38px;
  }

  .icono {
    font-size: 1.5rem;
  }

  .titulo-boton {
    font-size: 1.2rem;
  }

  .descripcion-boton {
    font-size: 0.8rem;
  }
}

@media (max-width: 576px) {
  .contenido-boton {
    padding: 10px 12px;
    gap: 10px;
  }

  .icono-wrapper {
    min-width: 32px;
    height: 32px;
  }

  .icono {
    font-size: 1.3rem;
  }

  .titulo-boton {
    font-size: 1rem;
  }

  .descripcion-boton {
    font-size: 0.75rem;
  }

  .indicator-dot {
    width: 8px;
    height: 8px;
  }

  .mensaje-estado {
    font-size: 0.8rem;
    padding: 8px 10px;
  }
}

/* Print */
@media print {
  .calcular-container {
    display: none;
  }
}

/* Accesibilidad */
.boton-calcular:focus {
  outline: 2px solid var(--matrix-green);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .boton-calcular,
  .boton-calcular::before,
  .spinner,
  .mensaje-estado,
  .indicator-dot {
    animation: none;
    transition: none;
  }
}
</style>
