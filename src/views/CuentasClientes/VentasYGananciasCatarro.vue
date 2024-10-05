<template>
  <div class="ventas-ganancias-catarro">
    <div class="header">
      <button class="back-button" @click="volverAlMenu">Volver</button>
      <h2>Análisis de Ventas y Ganancias - Catarro</h2>
    </div>
    
    <div class="filtros">
      <label for="periodo-select">Seleccionar período:</label>
      <select id="periodo-select" v-model="periodoSeleccionado" @change="cargarDatos">
        <option value="semanal">Semanal</option>
        <option value="mensual">Mensual</option>
      </select>
    </div>
    
    <div class="graficas">
      <div class="grafica">
        <h3>Ventas {{ periodoSeleccionado === 'semanal' ? 'Semanales' : 'Mensuales' }}</h3>
        <canvas ref="ventasChart"></canvas>
      </div>
      <div class="grafica">
        <h3>Ganancias {{ periodoSeleccionado === 'semanal' ? 'Semanales' : 'Mensuales' }}</h3>
        <canvas ref="gananciasChart"></canvas>
      </div>
    </div>
    
    <div class="resumen">
      <h3>Resumen</h3>
      <p>Total de ventas: ${{ formatNumber(totalVentas) }}</p>
      <p>Total de ganancias: ${{ formatNumber(totalGanancias) }}</p>
      <p>Promedio de ventas por {{ periodoSeleccionado === 'semanal' ? 'semana' : 'mes' }}: ${{ formatNumber(promedioVentas) }}</p>
      <p>Promedio de ganancias por {{ periodoSeleccionado === 'semanal' ? 'semana' : 'mes' }}: ${{ formatNumber(promedioGanancias) }}</p>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import Chart from 'chart.js/auto';

export default {
  name: 'VentasYGananciasCatarro',
  data() {
    return {
      periodoSeleccionado: 'semanal',
      ventas: [],
      ganancias: [],
      totalVentas: 0,
      totalGanancias: 0,
      promedioVentas: 0,
      promedioGanancias: 0,
      ventasChart: null,
      gananciasChart: null,
      periodos: [], // {{ Añadido }}
    }
  },
  mounted() {
    this.cargarDatos();
  },
  methods: {
    async cargarDatos() {
      try {
        const cuentasRef = collection(db, 'cuentasCatarro');
        const q = query(cuentasRef, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const datos = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            fecha: new Date(data.fecha),
            ventas: data.totalGeneralVenta || 0,
            ganancias: this.calcularGanancias(data),
            estadoPagado: data.estadoPagado || false
          };
        });

        this.procesarDatos(datos);
        this.crearGraficas();
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    },
    procesarDatos(datos) {
      const datosProcesados = this.periodoSeleccionado === 'semanal' 
        ? this.procesarDatosSemanal(datos)
        : this.procesarDatosMensual(datos);

      this.periodos = datosProcesados.map(d => d.periodo); // {{ Añadido }}
      this.ventas = datosProcesados.map(d => d.ventas);
      this.ganancias = datosProcesados.map(d => d.ganancias);
      this.totalVentas = this.ventas.reduce((sum, venta) => sum + venta, 0);
      this.totalGanancias = this.ganancias.reduce((sum, ganancia) => sum + ganancia, 0);
      this.promedioVentas = this.totalVentas / this.ventas.length;
      this.promedioGanancias = this.totalGanancias / this.ganancias.length;
    },
    procesarDatosSemanal(datos) {
      const datosPorSemana = datos.reduce((acc, dato) => {
        const semana = this.obtenerNumeroSemana(dato.fecha);
        if (!acc[semana]) {
          acc[semana] = { ventas: 0, ganancias: 0 };
        }
        acc[semana].ventas += dato.ventas;
        acc[semana].ganancias += dato.ganancias;
        return acc;
      }, {});

      return Object.entries(datosPorSemana).map(([semana, datos]) => ({
        periodo: `Semana ${semana}`,
        ...datos
      }));
    },
    procesarDatosMensual(datos) {
      const datosPorMes = datos.reduce((acc, dato) => {
        const mes = dato.fecha.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!acc[mes]) {
          acc[mes] = { ventas: 0, ganancias: 0 };
        }
        acc[mes].ventas += dato.ventas;
        acc[mes].ganancias += dato.ganancias;
        return acc;
      }, {});

      const fechas = datos.map(d => d.fecha);
      const fechaMinima = new Date(Math.min.apply(null, fechas));
      const fechaMaxima = new Date(Math.max.apply(null, fechas));
      const mesesCompletos = this.obtenerMesesEntreFechas(fechaMinima, fechaMaxima);

      return mesesCompletos
        .map(mes => ({
          periodo: mes,
          ventas: datosPorMes[mes] ? datosPorMes[mes].ventas : 0,
          ganancias: datosPorMes[mes] ? datosPorMes[mes].ganancias : 0
        }))
        .sort((a, b) => new Date(a.periodo) - new Date(b.periodo));
    },
    obtenerMesesEntreFechas(fechaInicio, fechaFin) {
      const meses = [];
      const fechaActual = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), 1);
      while (fechaActual <= fechaFin) {
        meses.push(fechaActual.toLocaleString('default', { month: 'long', year: 'numeric' }));
        fechaActual.setMonth(fechaActual.getMonth() + 1);
      }
      return meses;
    },
    obtenerNumeroSemana(fecha) {
      const primerDia = new Date(fecha.getFullYear(), 0, 1);
      return Math.ceil((((fecha - primerDia) / 86400000) + primerDia.getDay() + 1) / 7);
    },
    crearGraficas() {
      this.crearGrafica('ventasChart', 'Ventas', this.ventas, '#4CAF50');
      this.crearGrafica('gananciasChart', 'Ganancias', this.ganancias, '#2196F3');
    },
    crearGrafica(refName, label, datos, color) {
      const ctx = this.$refs[refName].getContext('2d');
      
      if (this[refName]) {
        this[refName].destroy();
      }

      this[refName] = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: this.periodos, // {{ Modificado }}
          datasets: [{
            label: label,
            data: datos,
            backgroundColor: color,
            borderColor: color,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '$' + value.toLocaleString();
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed.y !== null) {
                    label += '$' + context.parsed.y.toLocaleString();
                  }
                  return label;
                }
              }
            }
          }
        }
      });
    },
    formatNumber(value) {
      if (typeof value !== 'number') {
        return '0.00';
      }
      return value.toLocaleString('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    },
    volverAlMenu() {
      this.$router.push('/cuentas-catarro'); // Asegúrate de que esta ruta sea correcta
    },
    calcularGanancias(data) {
      if (data.estadoPagado) {
        return data.gananciaDelDia || 0;
      } else {
        // Si no está pagado, la ganancia es 0
        return 0;
      }
    }
  }
}
</script>

<style scoped>
.ventas-ganancias-catarro {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.back-button {
  background-color: #d32f2f;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-right: 20px;
  transition: background-color 0.3s ease;
}

.back-button:hover {
  background-color: #b71c1c;
}

h2 {
  color: #333;
  margin: 0;
  flex-grow: 1;
  text-align: center;
}

/* ... (resto de los estilos sin cambios) ... */

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .back-button {
    margin-bottom: 10px;
  }

  h2 {
    font-size: 1.5em;
  }

  /* ... (otros estilos responsivos) ... */
}
</style>