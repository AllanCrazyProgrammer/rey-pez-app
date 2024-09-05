<template>
  <div class="existencias-page">
    <div class="existencias-container">
      <div class="header">
        <h1>Reporte de Existencias</h1>
        <button @click="imprimirReporte" class="print-button">
          Imprimir Reporte
        </button>
      </div>
      
      <div class="filters">
        <input v-model="search" placeholder="Buscar por proveedor o medida" class="search-input" />
      </div>
      <div class="existencias-grid">
        <div v-for="(proveedor, proveedorNombre) in filteredExistencias" :key="proveedorNombre" class="proveedor-card">
          <h2>{{ proveedorNombre }}</h2>
          <div class="medidas-container">
            <div v-for="(kilos, medida) in proveedor" :key="medida" class="medida-item">
              <div class="medida-info">
                <span class="medida-nombre">{{ medida }}</span>
                <span class="medida-kilos">{{ formatNumber(kilos) }} kg</span>
              </div>
              <div class="medida-bar-container">
                <div class="medida-bar" :style="{ width: `${(kilos / (proveedorNombre.toLowerCase() === 'ozuna' ? maxKilos.ozuna : maxKilos.normal)) * 100}%` }"></div>
              </div>
            </div>
          </div>
          <div class="proveedor-total">Total: {{ formatNumber(calcularTotalProveedor(proveedor)) }} kg</div>
        </div>
      </div>
      <div class="total-general">
        <h2>Total General: {{ formatNumber(totalGeneral) }} kg</h2>
      </div>
      <div class="totales-por-medida">
        <h3>Totales por Medida</h3>
        <table>
          <thead>
            <tr>
              <th>Medida</th>
              <th>Total (kg)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(total, medida) in totalesPorMedida.totales" :key="medida">
              <td>{{ medida }}</td>
              <td>{{ formatNumber(total) }} kg</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td><strong>{{ formatNumber(totalPorMedidas) }} kg</strong></td>
            </tr>
          </tbody>
        </table>

        <h3>Totales Ozuna</h3>
        <table>
          <thead>
            <tr>
              <th>Medida</th>
              <th>Total (kg)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(total, medida) in totalesPorMedida.ozunaTotales" :key="medida">
              <td>{{ medida }}</td>
              <td>{{ formatNumber(total) }} kg</td>
            </tr>
            <tr class="total-row">
              <td><strong>Total</strong></td>
              <td><strong>{{ formatNumber(totalOzuna) }} kg</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
<script>
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue';
import { db } from '@/firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';

export default {
  name: 'Existencias',
  setup() {
    const existencias = ref({});
    const search = ref('');

    const loadExistencias = async () => {
      const sacadasSnapshot = await getDocs(collection(db, 'sacadas'));
      const newExistencias = {};

      sacadasSnapshot.forEach(doc => {
        const sacada = doc.data();
        sacada.entradas.forEach(entrada => {
          if (!newExistencias[entrada.proveedor]) {
            newExistencias[entrada.proveedor] = {};
          }
          if (!newExistencias[entrada.proveedor][entrada.medida]) {
            newExistencias[entrada.proveedor][entrada.medida] = 0;
          }
          newExistencias[entrada.proveedor][entrada.medida] += entrada.kilos;
        });
        sacada.salidas.forEach(salida => {
          if (!newExistencias[salida.proveedor]) {
            newExistencias[salida.proveedor] = {};
          }
          if (!newExistencias[salida.proveedor][salida.medida]) {
            newExistencias[salida.proveedor][salida.medida] = 0;
          }
          newExistencias[salida.proveedor][salida.medida] -= salida.kilos;
        });
      });

      // Filtrar proveedores y medidas con 0 o menos kilos
      Object.keys(newExistencias).forEach(proveedor => {
        newExistencias[proveedor] = Object.fromEntries(
          Object.entries(newExistencias[proveedor]).filter(([_, kilos]) => kilos > 0)
        );
        // Si no quedan medidas para el proveedor, eliminar el proveedor
        if (Object.keys(newExistencias[proveedor]).length === 0) {
          delete newExistencias[proveedor];
        }
      });

      existencias.value = newExistencias;
    };

    const filteredExistencias = computed(() => {
      if (!search.value) return existencias.value;
      const searchLower = search.value.toLowerCase();
      const filtered = {};
      Object.entries(existencias.value).forEach(([proveedor, medidas]) => {
        const filteredMedidas = Object.entries(medidas).filter(([medida]) => 
          proveedor.toLowerCase().includes(searchLower) || medida.toLowerCase().includes(searchLower)
        );
        if (filteredMedidas.length > 0) {
          filtered[proveedor] = Object.fromEntries(filteredMedidas);
        }
      });
      return filtered;
    });

    const maxKilos = computed(() => {
      let max = 0;
      let maxOzuna = 0;
      Object.entries(existencias.value).forEach(([proveedor, medidas]) => {
        Object.values(medidas).forEach(kilos => {
          if (proveedor.toLowerCase() === 'ozuna') {
            if (kilos > maxOzuna) maxOzuna = kilos;
          } else {
            if (kilos > max) max = kilos;
          }
        });
      });
      return { normal: max, ozuna: maxOzuna };
    });

    const totalGeneral = computed(() => {
      return Object.values(filteredExistencias.value).reduce((total, proveedor) => {
        return total + Object.values(proveedor).reduce((sum, kilos) => sum + kilos, 0);
      }, 0);
    });

    const formatNumber = (value) => {
      return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const imprimirReporte = () => {
      const fechaActual = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      const estilos = `
        <style>
          @page { size: A4 landscape; margin: 1cm; }
          body {
            font-family: Arial, sans-serif;
            font-size: 14pt;
            line-height: 1.4;
            color: #333;
          }
          h1, h2, h3 { color: #2c3e50; margin: 0 0 10px 0; }
          h1 {
            text-align: center;
            font-size: 24pt;
            border-bottom: 2px solid #3498db;
            padding-bottom: 8px;
          }
          .fecha-reporte {
            text-align: right;
            font-size: 12pt;
            margin-bottom: 10px;
          }
          .reporte-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
          }
          .proveedor-card {
            width: 48%;
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .proveedor-card h2 {
            font-size: 18pt;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
          }
          .medida-item {
            margin-bottom: 8px;
          }
          .medida-info {
            display: flex;
            justify-content: space-between;
            font-size: 14pt;
            margin-bottom: 3px;
          }
          .medida-nombre { color: #2c3e50; }
          .medida-kilos { font-weight: bold; }
          .medida-bar-container {
            height: 15px;
            background-color: #ecf0f1;
            border-radius: 3px;
            overflow: hidden;
          }
          .medida-bar {
            height: 100%;
            background-color: #3498db;
          }
          .proveedor-total {
            text-align: right;
            font-weight: bold;
            margin-top: 8px;
            font-size: 16pt;
          }
          .totales-section {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
          }
          .totales-table {
            width: 48%;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
            font-size: 13pt;
          }
          th { 
            background-color: #f2f2f2; 
            font-weight: bold;
          }
          .total-general {
            text-align: right;
            font-size: 18pt;
            font-weight: bold;
            margin-top: 15px;
            border-top: 2px solid #3498db;
            padding-top: 10px;
          }
          .total-row {
            font-weight: bold;
            background-color: #f2f2f2;
          }
          .total-row td {
            border-top: 2px solid #3498db;
          }
        </style>
      `;

      const contenidoImprimir = `
        <h1>Reporte de Existencias - Rey Pez</h1>
        <div class="fecha-reporte">${fechaActual}</div>
        <div class="reporte-container">
          ${Object.entries(filteredExistencias.value).map(([proveedor, medidas]) => `
            <div class="proveedor-card">
              <h2>${proveedor}</h2>
              <div class="medidas-container">
                ${Object.entries(medidas).map(([medida, kilos]) => `
                  <div class="medida-item">
                    <div class="medida-info">
                      <span class="medida-nombre">${medida}</span>
                      <span class="medida-kilos">${formatNumber(kilos)} kg</span>
                    </div>
                    <div class="medida-bar-container">
                      <div class="medida-bar" style="width: ${(kilos / (proveedor.toLowerCase() === 'ozuna' ? maxKilos.value.ozuna : maxKilos.value.normal)) * 100}%;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
              <div class="proveedor-total">
                Total: ${formatNumber(calcularTotalProveedor(medidas))} kg
              </div>
            </div>
          `).join('')}
        </div>
        <div class="totales-section">
          <div class="totales-table">
            <h3>Totales por Medida</h3>
            <table>
              <thead>
                <tr>
                  <th>Medida</th>
                  <th>Total (kg)</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(totalesPorMedida.value.totales).map(([medida, total]) => `
                  <tr>
                    <td>${medida}</td>
                    <td>${formatNumber(total)}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td><strong>Total</strong></td>
                  <td><strong>${formatNumber(totalPorMedidas.value)} kg</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="totales-table">
            <h3>Totales Maquila (Ozuna)</h3>
            <table>
              <thead>
                <tr>
                  <th>Medida</th>
                  <th>Total (kg)</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(totalesPorMedida.value.ozunaTotales).map(([medida, total]) => `
                  <tr>
                    <td>${medida}</td>
                    <td>${formatNumber(total)}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td><strong>Total</strong></td>
                  <td><strong>${formatNumber(totalOzuna.value)} kg</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="total-general">
          Total General: ${formatNumber(totalGeneral.value)} kg
        </div>
      `;

      const ventanaImprimir = window.open('', '_blank');
      ventanaImprimir.document.write(`
        <html>
          <head>
            <title>Reporte de Existencias - Rey Pez</title>
            ${estilos}
          </head>
          <body>
            ${contenidoImprimir}
          </body>
        </html>
      `);
      ventanaImprimir.document.close();
      ventanaImprimir.print();
    };

    const totalesPorMedida = computed(() => {
      const totales = {};
      const ozunaTotales = {};

      Object.entries(filteredExistencias.value).forEach(([proveedor, medidas]) => {
        Object.entries(medidas).forEach(([medida, kilos]) => {
          if (proveedor.toLowerCase() === 'ozuna') {
            ozunaTotales[medida] = (ozunaTotales[medida] || 0) + kilos;
          } else {
            totales[medida] = (totales[medida] || 0) + kilos;
          }
        });
      });

      return { totales, ozunaTotales };
    });

    const totalPorMedidas = computed(() => {
      return Object.values(totalesPorMedida.value.totales).reduce((sum, kilos) => sum + kilos, 0);
    });

    const totalOzuna = computed(() => {
      return Object.values(totalesPorMedida.value.ozunaTotales).reduce((sum, kilos) => sum + kilos, 0);
    });

    const calcularTotalProveedor = (proveedor) => {
      return Object.values(proveedor).reduce((total, kilos) => total + kilos, 0);
    };

    let unsubscribe;

    onMounted(() => {
      loadExistencias();
      unsubscribe = onSnapshot(collection(db, 'sacadas'), () => {
        loadExistencias();
      });
    });

    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe();
      }
    });

    watchEffect(() => {
      console.log('Existencias actualizadas:', existencias.value);
    });

    return {
      existencias,
      filteredExistencias,
      search,
      maxKilos,
      totalGeneral,
      formatNumber,
      imprimirReporte,
      totalesPorMedida,
      totalPorMedidas,
      totalOzuna,
      calcularTotalProveedor
    };
  }
};
</script>

<style scoped>
.existencias-page {
  min-height: 100vh;
  background-color: #f8f9fa;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
}

.existencias-container {
  max-width: 1200px;
  width: 100%;
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h1 {
  color: #2c3e50;
  margin: 0;
  font-size: 24px;
}

.print-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.print-button:hover {
  background-color: #2980b9;
}

.filters {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 10px;
  border: 2px solid #3498db;
  border-radius: 5px;
  font-size: 16px;
}

.existencias-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.proveedor-card {
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.proveedor-card h2 {
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.medidas-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.medida-item {
  margin-bottom: 10px;
}

.medida-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.medida-nombre {
  font-weight: bold;
  color: #2c3e50;
}

.medida-kilos {
  font-weight: bold;
  color: #000000;
}

.medida-bar-container {
  height: 20px;
  background-color: #ecf0f1;
  border-radius: 5px;
  overflow: hidden;
}

.medida-bar {
  height: 100%;
  background-color: #3498db;
  transition: width 0.3s ease;
}

.proveedor-total {
  text-align: right;
  font-weight: bold;
  margin-top: 10px;
  color: #2c3e50;
}

.total-general {
  margin-top: 20px;
  text-align: right;
  font-size: 20px;
  font-weight: bold;
  color: #000000;
}
.totales-por-medida {
  margin-top: 30px;
}

.totales-por-medida h3 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.totales-por-medida table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.totales-por-medida th,
.totales-por-medida td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.totales-por-medida th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.totales-por-medida tr:nth-child(even) {
  background-color: #f9f9f9;
}

.totales-por-medida tr:hover {
  background-color: #f5f5f5;
}

.total-row {
  font-weight: bold;
  background-color: #f2f2f2;
}

.total-row td {
  border-top: 2px solid #3498db;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .print-button {
    margin-top: 10px;
  }

  .existencias-grid {
    grid-template-columns: 1fr;
  }
}
</style>