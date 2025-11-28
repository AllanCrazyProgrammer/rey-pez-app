<template>
  <div class="cuentas-container">
    <div class="terminal-header">
      <span class="header-icon">◈</span>
      <span class="header-text">BILL_CALCULATOR</span>
    </div>
    
    <b-row>
      <b-col cols="12" md="6" class="mb-3">
        <Calcular cantidad="$2" :datos="datos" @dataArray="procesarDatos" />
      </b-col>
      <b-col cols="12" md="6" class="mb-3">
        <Calcular cantidad="$1" :datos="datos" @dataArray="procesarDatos" />
      </b-col>
      <b-col cols="12" class="mb-3">
        <button @click="imprimirCuentas" class="btn-imprimir" :disabled="!tieneDatos">
          <span class="btn-bracket">[</span>
          <span class="btn-icon">⎙</span>
          <span class="btn-text">PRINT_REPORT</span>
          <span class="btn-bracket">]</span>
        </button>
      </b-col>
      <b-col cols="12" class="mb-3">
        <div ref="seccionImpresion" class="seccion-impresion">
          <div class="seccion-title">
            <span class="title-bracket">╔═</span>
            <span class="title-text">CUENTAS</span>
            <span class="title-bracket">═╗</span>
          </div>
          <p class="fecha-impresion">
            <span class="fecha-label">DATE:</span> {{ fechaFormateada }}
          </p>
          <div class="lista-cuentas">
            <div v-for="(cantidad, denominacion) in billetes" :key="denominacion" class="cuenta-item"
              v-show="cantidad > 0">
              <span class="denominacion">${{ denominacion }}</span>
              <span class="separador">────</span>
              <span class="cantidad">{{ cantidad }}</span>
            </div>
          </div>
          <div class="total-general">
            <span class="total-label">TOTAL:</span>
            <span class="total-value">${{ totalGeneral.toLocaleString() }}</span>
          </div>
          <div v-if="totalGeneral > 0" class="promedio-general">
            <span class="promedio-label">AVG:</span>
            <span class="promedio-value">${{ Math.round(promedioPorLinea).toLocaleString() }}</span>
          </div>
        </div>
      </b-col>
    </b-row>
  </div>
</template>

<script>
import Calcular from "./Calcular";

export default {
  name: "Cuentas",
  components: {
    Calcular,
  },
  props: {
    datos: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      billetes: {
        500: 0,
        200: 0,
        100: 0,
        50: 0,
        20: 0,
        10: 0,
        5: 0,
        2: 0,
        1: 0,
      },
    };
  },
  computed: {
    fechaFormateada() {
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date().toLocaleDateString('es-ES', opciones);
    },
    tieneDatos() {
      return Object.values(this.billetes).some(cantidad => cantidad > 0);
    },
    totalGeneral() {
      return Object.entries(this.billetes)
        .reduce((total, [denominacion, cantidad]) => total + (denominacion * cantidad), 0);
    },
    promedioPorLinea() {
      // Calcular el promedio basado en los datos procesados
      if (!this.datos || this.datos.trim().length === 0) return 0;

      const lineasValidas = this.datos.split('\n')
        .map(linea => linea.trim())
        .filter(linea => linea.length > 0 && !isNaN(parseFloat(linea.replace(/[$,\s]/g, ''))))
        .map(linea => parseFloat(linea.replace(/[$,\s]/g, '')));

      if (lineasValidas.length === 0) return 0;

      const total = lineasValidas.reduce((suma, valor) => suma + valor, 0);
      return total / lineasValidas.length;
    }
  },
  methods: {
    imprimirCuentas() {
      const seccionImpresion = this.$refs.seccionImpresion;
      if (!seccionImpresion) {
        console.error('Sección de impresión no encontrada');
        return;
      }

      const contenidoImpresion = seccionImpresion.innerHTML;
      const estilosImpresion = `
        <style>
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
          body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: white;
            color: #000;
            display: flex;
            justify-content: center;
          }
          .contenedor-impresion {
            max-width: 400px;
            width: 100%;
            margin: 0 auto;
            padding: 30px;
            background-color: white;
            border: 1px solid #ddd;
          }
                     h1 {
             color: #000;
             text-align: center;
             margin-bottom: 15px;
             font-size: 28px;
             font-weight: bold;
           }
           .fecha-impresion {
             text-align: center;
             color: #666;
             font-size: 16px;
             margin-bottom: 25px;
           }
           .lista-cuentas {
             border-collapse: collapse;
             width: 100%;
             margin-bottom: 25px;
           }
                     .cuenta-item {
             display: flex;
             justify-content: space-between;
             align-items: center;
             padding: 8px 0;
             border-bottom: 1px solid #eee;
           }
           .denominacion {
             font-weight: bold;
             color: #000;
             font-size: 24px;
             flex: 1;
           }
           .cantidad {
             color: #333;
             font-size: 24px;
             font-weight: bold;
             text-align: right;
             flex: 1;
           }
                     .total-general {
             text-align: center;
             padding: 20px;
             border: 2px solid #000;
             background-color: white;
             font-size: 22px;
             font-weight: bold;
             margin-top: 15px;
           }
           .promedio-general {
             text-align: center;
             padding: 10px;
             color: #666;
             font-size: 16px;
             margin-top: 10px;
           }
        </style>
      `;

      const ventanaImpresion = window.open('', '_blank');
      if (!ventanaImpresion) {
        console.error('No se pudo abrir la ventana de impresión');
        return;
      }

      ventanaImpresion.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cuentas - ${this.fechaFormateada}</title>
            <meta charset="UTF-8">
            ${estilosImpresion}
          </head>
          <body>
            <div class="contenedor-impresion">
              ${contenidoImpresion}
            </div>
          </body>
        </html>
      `);

      ventanaImpresion.document.close();
      ventanaImpresion.focus();

      // Esperar a que se cargue antes de imprimir
      setTimeout(() => {
        ventanaImpresion.print();
        ventanaImpresion.onafterprint = () => {
          ventanaImpresion.close();
        };
      }, 250);
    },
    procesarDatos({ data, isTwo }) {
      // Resetear contadores
      this.reiniciarBilletes();

      if (!data || !Array.isArray(data)) {
        return;
      }

      const denominaciones = isTwo
        ? [500, 200, 100, 50, 20, 10, 5, 2, 1]
        : [500, 200, 100, 50, 20, 10, 5, 1, 2];

      data.forEach(cantidad => {
        const montoRestante = this.calcularBilletes(cantidad, denominaciones);
        if (montoRestante > 0) {
          console.warn(`No se pudo calcular completamente la cantidad: ${cantidad}, restante: ${montoRestante}`);
        }
      });
    },
    calcularBilletes(cantidad, denominaciones) {
      let montoRestante = parseInt(cantidad) || 0;
      if (montoRestante <= 0) return 0;

      denominaciones.forEach(denominacion => {
        const cantidadBilletes = Math.floor(montoRestante / denominacion);
        if (cantidadBilletes > 0) {
          this.billetes[denominacion] += cantidadBilletes;
          montoRestante -= cantidadBilletes * denominacion;
        }
      });

      return montoRestante;
    },
    reiniciarBilletes() {
      Object.keys(this.billetes).forEach(denominacion => {
        this.billetes[denominacion] = 0;
      });
    },
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=VT323&family=Share+Tech+Mono&display=swap');

/* Variables */
.cuentas-container {
  --matrix-green: #00ff41;
  --matrix-green-glow: #00ff4180;
  --thermal-orange: #ff6b00;
  --thermal-yellow: #ffcc00;
  --cyan: #00d4ff;
  --bg-dark: #0a0808;
}

.cuentas-container {
  background: rgba(0, 20, 0, 0.8);
  border: 1px solid var(--matrix-green);
  padding: 20px;
  box-shadow: 0 0 20px var(--matrix-green-glow);
}

.terminal-header {
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

/* Botón imprimir */
.btn-imprimir {
  width: 100%;
  background: transparent;
  border: 2px solid var(--cyan);
  color: var(--cyan);
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-imprimir:hover:not(:disabled) {
  background: var(--cyan);
  color: var(--bg-dark);
  box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
}

.btn-imprimir:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: #444;
  color: #444;
}

.btn-bracket {
  color: var(--thermal-yellow);
}

/* Sección de impresión */
.seccion-impresion {
  background: rgba(0, 30, 0, 0.6);
  padding: 20px;
  border: 1px dashed var(--matrix-green);
  margin-top: 15px;
}

.seccion-title {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.title-bracket {
  color: var(--thermal-orange);
  font-family: 'VT323', monospace;
  font-size: 1.5rem;
}

.title-text {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.8rem;
  color: var(--matrix-green);
  text-shadow: 0 0 15px var(--matrix-green);
  letter-spacing: 5px;
}

.fecha-impresion {
  text-align: center;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.95rem;
  margin-bottom: 20px;
  color: var(--thermal-yellow);
}

.fecha-label {
  color: var(--thermal-orange);
  margin-right: 5px;
}

/* Lista de cuentas */
.lista-cuentas {
  background: rgba(0, 40, 0, 0.4);
  border: 1px solid var(--matrix-green);
  padding: 15px;
  margin-bottom: 15px;
}

.cuenta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 5px;
  border-bottom: 1px solid rgba(0, 255, 65, 0.2);
}

.cuenta-item:last-child {
  border-bottom: none;
}

.denominacion {
  font-family: 'VT323', monospace;
  font-size: 1.6rem;
  color: var(--thermal-orange);
  text-shadow: 0 0 8px rgba(255, 107, 0, 0.5);
}

.separador {
  flex: 1;
  text-align: center;
  color: var(--matrix-green);
  opacity: 0.3;
  font-size: 0.8rem;
  margin: 0 10px;
}

.cantidad {
  font-family: 'VT323', monospace;
  font-size: 1.6rem;
  color: var(--matrix-green);
  text-shadow: 0 0 10px var(--matrix-green);
  text-align: right;
  min-width: 60px;
}

/* Total */
.total-general {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: rgba(0, 255, 65, 0.1);
  border: 2px solid var(--matrix-green);
}

.total-label {
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  color: var(--thermal-orange);
  letter-spacing: 2px;
}

.total-value {
  font-family: 'VT323', monospace;
  font-size: 2rem;
  color: var(--matrix-green);
  text-shadow: 
    0 0 10px var(--matrix-green),
    0 0 20px var(--matrix-green-glow);
}

.promedio-general {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  padding: 10px;
  margin-top: 10px;
}

.promedio-label {
  font-family: 'Share Tech Mono', monospace;
  color: var(--thermal-yellow);
  opacity: 0.8;
}

.promedio-value {
  font-family: 'VT323', monospace;
  font-size: 1.2rem;
  color: var(--thermal-yellow);
  text-shadow: 0 0 8px var(--thermal-yellow);
}

/* Responsive */
@media (max-width: 768px) {
  .cuentas-container {
    padding: 15px;
  }

  .title-text {
    font-size: 1.4rem;
    letter-spacing: 3px;
  }

  .denominacion,
  .cantidad {
    font-size: 1.4rem;
  }

  .total-general {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }

  .total-value {
    font-size: 1.8rem;
  }

  .promedio-general {
    justify-content: center;
  }
}

@media (max-width: 576px) {
  .cuentas-container {
    padding: 10px;
  }

  .header-text {
    font-size: 0.9rem;
    letter-spacing: 1px;
  }

  .title-text {
    font-size: 1.2rem;
  }

  .denominacion,
  .cantidad {
    font-size: 1.2rem;
  }

  .separador {
    display: none;
  }

  .cuenta-item {
    padding: 8px 5px;
  }

  .btn-imprimir {
    font-size: 1rem;
    padding: 10px 15px;
  }
}

/* Print styles */
@media print {
  .cuentas-container {
    background: white;
    border: 1px solid #000;
    box-shadow: none;
  }

  .seccion-impresion {
    background: white;
    border: 1px solid #000;
  }

  .title-text,
  .denominacion,
  .cantidad,
  .total-value {
    color: #000 !important;
    text-shadow: none !important;
  }

  .btn-imprimir {
    display: none;
  }
}
</style>