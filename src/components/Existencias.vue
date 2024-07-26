<template>
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
              <div class="medida-bar" :style="{ width: `${(kilos / maxKilos) * 100}%` }"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="total-general">
      <h2>Total General: {{ formatNumber(totalGeneral) }} kg</h2>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
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

      // Filtrar medidas con 0 o menos kilos
      Object.keys(newExistencias).forEach(proveedor => {
        newExistencias[proveedor] = Object.fromEntries(
          Object.entries(newExistencias[proveedor]).filter(([_, kilos]) => kilos > 0)
        );
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
      Object.values(existencias.value).forEach(proveedor => {
        Object.values(proveedor).forEach(kilos => {
          if (kilos > max) max = kilos;
        });
      });
      return max;
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
      const estilos = `
        <style>
          @page { size: A4; margin: 1cm; }
          body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.3;
            color: #333;
          }
          h1 {
            color: #2c3e50;
            text-align: center;
            font-size: 18pt;
            margin-bottom: 5px;
            border-bottom: 2px solid #3498db;
            padding-bottom: 5px;
          }
          .fecha-reporte {
            text-align: right;
            font-size: 12pt;
            margin-bottom: 10px;
            color: black;
          }
          .existencias-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: space-between;
          }
          .proveedor-card {
            width: calc(50% - 5px);
            background-color: #f8f9fa;
            border-radius: 4px;
            padding: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 10px;
          }
          .proveedor-card h2 {
            color: #2c3e50;
            font-size: 14pt;
            margin: 0 0 8px 0;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 5px;
          }
          .medidas-container {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .medida-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .medida-info {
            display: flex;
            justify-content: space-between;
            font-size: 10pt;
            margin-bottom: 2px;
          }
          .medida-nombre {
            color: #2c3e50;
          }
          .medida-kilos {
            color: #000000;
            font-weight: bold;
          }
          .medida-bar-container {
            width: 100%;
            height: 6px;
            background-color: #ecf0f1;
            border-radius: 3px;
            overflow: hidden;
          }
          .medida-bar {
            height: 100%;
            background-color: #3498db;
          }
          .total-general {
            text-align: right;
            font-size: 14pt;
            font-weight: bold;
            margin-top: 15px;
            color: #000000;
            border-top: 2px solid #3498db;
            padding-top: 5px;
          }
          .fecha-generacion {
            text-align: right;
            font-style: italic;
            font-size: 8pt;
            margin-top: 10px;
            color: #7f8c8d;
          }
        </style>
      `;

      const fechaActual = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const contenidoImprimir = `
        <h1>Reporte de Existencias - Rey Pez</h1>
        <div class="fecha-reporte">
          ${fechaActual.charAt(0).toUpperCase() + fechaActual.slice(1)}
        </div>
        <div class="existencias-grid">
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
                      <div class="medida-bar" style="width: ${(kilos / maxKilos.value) * 100}%;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <div class="total-general">
          Total General: ${formatNumber(totalGeneral.value)} kg
        </div>
        <p class="fecha-generacion">
          Generado el: ${fechaActual} a las ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </p>
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

    onMounted(() => {
      loadExistencias();
      onSnapshot(collection(db, 'sacadas'), () => {
        loadExistencias();
      });
    });

    return {
      existencias,
      filteredExistencias,
      search,
      maxKilos,
      totalGeneral,
      formatNumber,
      imprimirReporte
    };
  }
};
</script>

<style scoped>
.existencias-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.medida-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  width: 100%;
  height: 10px;
  background-color: #ecf0f1;
  border-radius: 5px;
  overflow: hidden;
}

.medida-bar {
  height: 100%;
  background-color: #3498db;
  transition: width 0.3s ease;
}

.total-general {
  margin-top: 20px;
  text-align: right;
  font-size: 20px;
  font-weight: bold;
  color: #000000;
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