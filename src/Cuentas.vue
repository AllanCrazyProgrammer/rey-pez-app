<template>
  <div class="cuentas-container">
    <b-row>
      <b-col cols="12" md="6" class="mb-3">
        <Calcular cantidad="$2" :datos="datos" @dataArray="procesarDatos" />
      </b-col>
      <b-col cols="12" md="6" class="mb-3">
        <Calcular cantidad="$1" :datos="datos" @dataArray="procesarDatos" />
      </b-col>
      <b-col cols="12" class="mb-3">
        <b-button 
          @click="imprimirCuentas" 
          variant="primary" 
          block
          :disabled="!tieneDatos"
        >
          Imprimir sección
        </b-button>
      </b-col>
      <b-col cols="12" class="mb-3">
        <div ref="seccionImpresion" class="seccion-impresion">
          <h1>Cuentas</h1>
          <p class="fecha-impresion">{{ fechaFormateada }}</p>
                     <div class="lista-cuentas">
             <div 
               v-for="(cantidad, denominacion) in billetes" 
               :key="denominacion" 
               class="cuenta-item"
               v-show="cantidad > 0"
             >
               <span class="denominacion">${{ denominacion }}</span>
               <span class="cantidad">{{ cantidad }}</span>
             </div>
           </div>
          <div class="total-general">
            <strong>Total: ${{ totalGeneral.toLocaleString() }}</strong>
          </div>
          <div v-if="totalGeneral > 0" class="promedio-general">
            <small>Promedio: ${{ Math.round(promedioPorLinea).toLocaleString() }}</small>
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
.cuentas-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 12px;
  background-color: #f8f9fa;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 20px;
  font-size: 2em;
  font-weight: 600;
}

.fecha-impresion {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  margin-bottom: 20px;
  font-size: 14px;
}

.lista-cuentas {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.cuenta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.cuenta-item:last-child {
  border-bottom: none;
}

.denominacion {
  font-weight: 600;
  color: #495057;
  font-size: 22px;
}

.cantidad {
  color: #007bff;
  font-weight: 600;
  font-size: 22px;
  text-align: right;
}

.total-general {
  text-align: center;
  padding: 15px;
  background-color: #e9ecef;
  border-radius: 8px;
  margin-top: 20px;
  font-size: 18px;
  font-weight: 600;
  color: #495057;
}

.promedio-general {
  text-align: center;
  padding: 10px;
  color: #6c757d;
  font-size: 14px;
  margin-top: 10px;
}

.seccion-impresion {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  margin-top: 20px;
}

/* Estilos para impresión */
@media print {
  .cuentas-container {
    box-shadow: none;
    border: none;
    background-color: white;
  }
  
  .seccion-impresion {
    border: none;
    box-shadow: none;
    background-color: white;
  }
}

/* Responsive Design */
@media (max-width: 768px) {
  .cuentas-container {
    padding: 15px;
    margin: 10px;
  }

  h1 {
    font-size: 1.5em;
  }

  .cuenta-item {
    flex-direction: column;
    text-align: center;
    padding: 8px;
  }

  .denominacion,
  .cantidad {
    margin-bottom: 3px;
  }
  
  .denominacion {
    font-size: 20px;
  }
  
  .cantidad {
    font-size: 20px;
  }
}

@media (max-width: 576px) {
  .cuentas-container {
    padding: 10px;
    margin: 5px;
    border-radius: 8px;
  }

  .seccion-impresion {
    padding: 15px;
  }

  h1 {
    font-size: 1.3em;
  }
  
  .denominacion {
    font-size: 18px;
  }
  
  .cantidad {
    font-size: 18px;
  }
  
  .promedio-general {
    font-size: 12px;
    margin-top: 8px;
  }
}
</style>