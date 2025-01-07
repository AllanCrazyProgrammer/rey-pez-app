<template>
  <div class="ventas-ganancias-container">
    <div class="back-button-container">
      <BackButton to="/cuentas-joselito" />
    </div>
    <h1>Ventas y Ganancias de Joselito</h1>

    <div class="date-range-selector">
      <div class="date-input">
        <label>Fecha Inicial:</label>
        <input type="date" v-model="fechaInicial">
      </div>
      <div class="date-input">
        <label>Fecha Final:</label>
        <input type="date" v-model="fechaFinal">
      </div>
      <button @click="buscarVentas" class="search-btn">Buscar</button>
    </div>

    <div v-if="isLoading" class="loading">
      Cargando datos...
    </div>

    <div v-else>
      <div class="summary-cards">
        <div class="summary-card">
          <h3>Total Ventas</h3>
          <p>${{ formatNumber(totalVentas) }}</p>
        </div>
        <div class="summary-card">
          <h3>Total Costos</h3>
          <p>${{ formatNumber(totalCostos) }}</p>
        </div>
        <div class="summary-card">
          <h3>Ganancia Total</h3>
          <p :class="{ 'positive': gananciaTotal > 0, 'negative': gananciaTotal < 0 }">
            ${{ formatNumber(gananciaTotal) }}
          </p>
        </div>
      </div>

      <div class="ventas-table">
        <h2>Detalle de Ventas por Fecha</h2>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Ventas</th>
              <th>Costos</th>
              <th>Ganancia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="venta in ventasPorFecha" :key="venta.fecha">
              <td>{{ formatDate(venta.fecha) }}</td>
              <td>${{ formatNumber(venta.ventas) }}</td>
              <td>${{ formatNumber(venta.costos) }}</td>
              <td :class="{ 'positive': venta.ganancia > 0, 'negative': venta.ganancia < 0 }">
                ${{ formatNumber(venta.ganancia) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="print-section">
        <button @click="imprimirReporte" class="print-btn">
          Imprimir Reporte
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';

export default {
  name: 'VentasYGananciasJoselito',
  components: {
    BackButton
  },
  data() {
    return {
      fechaInicial: '',
      fechaFinal: '',
      ventasPorFecha: [],
      isLoading: false
    };
  },
  computed: {
    totalVentas() {
      return this.ventasPorFecha.reduce((sum, venta) => sum + venta.ventas, 0);
    },
    totalCostos() {
      return this.ventasPorFecha.reduce((sum, venta) => sum + venta.costos, 0);
    },
    gananciaTotal() {
      return this.totalVentas - this.totalCostos;
    }
  },
  methods: {
    async buscarVentas() {
      if (!this.fechaInicial || !this.fechaFinal) {
        alert('Por favor seleccione ambas fechas');
        return;
      }

      this.isLoading = true;
      try {
        const cuentasRef = collection(db, 'cuentasJoselito');
        const q = query(
          cuentasRef,
          where('fecha', '>=', this.fechaInicial),
          where('fecha', '<=', this.fechaFinal),
          orderBy('fecha', 'asc')
        );

        const querySnapshot = await getDocs(q);
        this.ventasPorFecha = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const ventas = data.totalGeneralVenta || 0;
          const costos = data.totalGeneral || 0;
          return {
            fecha: data.fecha,
            ventas,
            costos,
            ganancia: ventas - costos
          };
        });
      } catch (error) {
        console.error('Error al buscar ventas:', error);
        alert('Error al cargar los datos');
      } finally {
        this.isLoading = false;
      }
    },
    formatNumber(value) {
      return value.toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },
    formatDate(date) {
      return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    imprimirReporte() {
      const contenido = `
        <html>
          <head>
            <title>Reporte de Ventas y Ganancias - Joselito</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
              }
              h1 { color: #2196F3; }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
              }
              th { background-color: #f5f5f5; }
              .total { font-weight: bold; }
              .positive { color: #4CAF50; }
              .negative { color: #f44336; }
            </style>
          </head>
          <body>
            <h1>Reporte de Ventas y Ganancias - Joselito</h1>
            <p>Período: ${this.formatDate(this.fechaInicial)} - ${this.formatDate(this.fechaFinal)}</p>
            
            <h2>Resumen</h2>
            <table>
              <tr>
                <th>Total Ventas</th>
                <td>$${this.formatNumber(this.totalVentas)}</td>
              </tr>
              <tr>
                <th>Total Costos</th>
                <td>$${this.formatNumber(this.totalCostos)}</td>
              </tr>
              <tr class="total">
                <th>Ganancia Total</th>
                <td class="${this.gananciaTotal > 0 ? 'positive' : 'negative'}">
                  $${this.formatNumber(this.gananciaTotal)}
                </td>
              </tr>
            </table>

            <h2>Detalle por Fecha</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Ventas</th>
                  <th>Costos</th>
                  <th>Ganancia</th>
                </tr>
              </thead>
              <tbody>
                ${this.ventasPorFecha.map(venta => `
                  <tr>
                    <td>${this.formatDate(venta.fecha)}</td>
                    <td>$${this.formatNumber(venta.ventas)}</td>
                    <td>$${this.formatNumber(venta.costos)}</td>
                    <td class="${venta.ganancia > 0 ? 'positive' : 'negative'}">
                      $${this.formatNumber(venta.ganancia)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const ventana = window.open('', '_blank');
      ventana.document.write(contenido);
      ventana.document.close();
      ventana.print();
    }
  },
  mounted() {
    // Establecer fechas por defecto (último mes)
    const hoy = new Date();
    this.fechaFinal = hoy.toISOString().split('T')[0];
    hoy.setMonth(hoy.getMonth() - 1);
    this.fechaInicial = hoy.toISOString().split('T')[0];
    this.buscarVentas();
  }
};
</script>

<style scoped>
.ventas-ganancias-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  color: #2196F3;
  text-align: center;
  margin-bottom: 30px;
}

.date-range-selector {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.date-input {
  flex: 1;
  min-width: 200px;
}

.date-input label {
  display: block;
  margin-bottom: 5px;
}

.date-input input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.search-btn {
  padding: 8px 20px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.search-btn:hover {
  background-color: #1976D2;
}

.summary-cards {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.summary-card {
  flex: 1;
  min-width: 200px;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  text-align: center;
}

.summary-card h3 {
  margin: 0 0 10px 0;
  color: #666;
}

.summary-card p {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
}

.ventas-table {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 30px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.positive {
  color: #4CAF50;
}

.negative {
  color: #f44336;
}

.print-section {
  text-align: center;
  margin-top: 20px;
}

.print-btn {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.print-btn:hover {
  background-color: #45a049;
}

.loading {
  text-align: center;
  padding: 20px;
  font-size: 18px;
  color: #666;
}

@media (max-width: 768px) {
  .date-range-selector {
    flex-direction: column;
  }

  .date-input {
    width: 100%;
  }

  .summary-card {
    width: 100%;
  }

  table {
    font-size: 14px;
  }

  th, td {
    padding: 8px;
  }
}
</style> 