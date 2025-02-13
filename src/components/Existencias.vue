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
        <template v-for="(datos, proveedor) in filteredExistencias">
          <div :key="proveedor" class="medida-card" :class="{ 'maquila-card': proveedor === 'Ozuna' || proveedor === 'Joselito' }">
            <h2>{{ proveedor }}{{ (proveedor === 'Ozuna' || proveedor === 'Joselito') ? ' (Maquila)' : '' }}</h2>
            <table class="medida-table">
              <thead>
                <tr>
                  <th>Medida</th>
                  <th v-if="proveedor !== 'Ozuna' && proveedor !== 'Joselito'">Proveedor</th>
                  <th class="kilos-cell">Kilos</th>
                </tr>
              </thead>
              <tbody>
                <template v-if="proveedor === 'Ozuna' || proveedor === 'Joselito'">
                  <tr v-for="(datos, medidaKey) in datos" :key="medidaKey">
                    <td>{{ datos.medida }}</td>
                    <td class="kilos-cell">{{ formatNumber(datos.kilos) }}</td>
                  </tr>
                  <tr class="total-row">
                    <td><strong>Total {{ proveedor }}</strong></td>
                    <td class="kilos-cell">
                      <strong>{{ formatNumber(Object.values(datos).reduce((sum, item) => sum + item.kilos, 0)) }}</strong>
                    </td>
                  </tr>
                </template>
                <template v-else>
                  <tr v-for="medida in datos" :key="medida.medida">
                    <td>{{ medida.medida }}</td>
                    <td>{{ medida.proveedor }}</td>
                    <td class="kilos-cell">{{ formatNumber(medida.kilos) }}</td>
                  </tr>
                  <tr class="total-row">
                    <td><strong>Total {{ proveedor }}</strong></td>
                    <td></td>
                    <td class="kilos-cell">
                      <strong>{{ formatNumber(datos.reduce((sum, item) => sum + item.kilos, 0)) }}</strong>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </template>
      </div>

      <div class="total-general">
        <h2>Total General: {{ formatNumber(totalGeneral) }}</h2>
      </div>
    </div>
  </div>
</template>
<script>
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue';
import { db } from '@/firebase';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import moment from 'moment';

export default {
  name: 'Existencias',
  setup() {
    const existencias = ref({});
    const search = ref('');

    const loadExistencias = async () => {
      const sacadasSnapshot = await getDocs(collection(db, 'sacadas'));
      const newExistencias = {};
      console.log('=== Rastreando Selecta 51/60 1ra Nacional ===');
      let totalSelecta5160 = 0;

      // Ordenar las sacadas por fecha
      const sacadasOrdenadas = sacadasSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const fechaA = a.fecha instanceof Date ? a.fecha : a.fecha.toDate();
          const fechaB = b.fecha instanceof Date ? b.fecha : b.fecha.toDate();
          return fechaA - fechaB;
        });

      sacadasOrdenadas.forEach(sacada => {
        const sacadaFecha = sacada.fecha instanceof Date ? sacada.fecha : sacada.fecha.toDate();

        sacada.entradas.forEach(entrada => {
          if (entrada.proveedor === 'Selecta' && entrada.medida === '51/60 1ra Nacional') {
            totalSelecta5160 += entrada.kilos;
            console.log(`Entrada: ${entrada.kilos} kg - Fecha: ${moment(sacadaFecha).format('DD/MM/YYYY')} - Total: ${totalSelecta5160} kg`);
          }
          if (!newExistencias[entrada.proveedor]) {
            newExistencias[entrada.proveedor] = {};
          }
          const medidaKey = entrada.medida;
          if (!newExistencias[entrada.proveedor][medidaKey]) {
            newExistencias[entrada.proveedor][medidaKey] = {
              kilos: 0,
              medida: entrada.medida
            };
          }
          newExistencias[entrada.proveedor][medidaKey].kilos += entrada.kilos;
        });

        sacada.salidas.forEach(salida => {
          if (salida.proveedor === 'Selecta' && salida.medida === '51/60 1ra Nacional') {
            totalSelecta5160 -= salida.kilos;
            console.log(`Salida: ${salida.kilos} kg - Fecha: ${moment(sacadaFecha).format('DD/MM/YYYY')} - Total: ${totalSelecta5160} kg`);
          }
          if (!newExistencias[salida.proveedor]) {
            newExistencias[salida.proveedor] = {};
          }
          const medidaKey = salida.medida;
          if (!newExistencias[salida.proveedor][medidaKey]) {
            newExistencias[salida.proveedor][medidaKey] = {
              kilos: 0,
              medida: salida.medida
            };
          }
          newExistencias[salida.proveedor][medidaKey].kilos -= salida.kilos;
        });
      });

      console.log(`=== Total final Selecta 51/60 1ra Nacional: ${totalSelecta5160} kg ===`);

      // Filtrar proveedores y medidas con 0 o menos kilos
      Object.keys(newExistencias).forEach(proveedor => {
        if (proveedor === 'Selecta' && newExistencias[proveedor]['51/60 1ra Nacional']) {
          console.log('[DEBUG] Resultado final Selecta 51/60 1ra Nacional:', 
            newExistencias[proveedor]['51/60 1ra Nacional'].kilos);
        }
        newExistencias[proveedor] = Object.fromEntries(
          Object.entries(newExistencias[proveedor])
            .filter(([_, datos]) => datos.kilos > 0)
        );
        // Si no quedan medidas para el proveedor, eliminar el proveedor
        if (Object.keys(newExistencias[proveedor]).length === 0) {
          delete newExistencias[proveedor];
        }
      });

      existencias.value = newExistencias;
    };

    const filteredExistencias = computed(() => {
      const searchLower = search.value.toLowerCase();
      
      // Separar Ozuna y Joselito (maquilas) del resto de proveedores
      const maquilas = {};
      const otrosProveedores = {};
      
      // Primero procesar los proveedores no maquila
      Object.entries(existencias.value).forEach(([proveedor, medidas]) => {
        if (proveedor !== 'Ozuna' && proveedor !== 'Joselito') {
          otrosProveedores[proveedor] = medidas;
        }
      });

      // Procesar las maquilas después
      if (existencias.value['Ozuna']) {
        maquilas['Ozuna'] = existencias.value['Ozuna'];
      }
      if (existencias.value['Joselito']) {
        maquilas['Joselito'] = existencias.value['Joselito'];
      }

      // Agrupar por medida base para otros proveedores
      const medidasAgrupadas = {};
      Object.entries(otrosProveedores).forEach(([proveedor, medidas]) => {
        Object.entries(medidas).forEach(([medidaKey, datos]) => {
          // Extraer solo los números de la medida (ej: "41/50" de "41/50 chuy" o "41/50 1ra Nacional")
          const medidaBase = datos.medida.split(' ')[0];
          if (!medidasAgrupadas[medidaBase]) {
            medidasAgrupadas[medidaBase] = [];
          }
          
          // Buscar si ya existe una entrada para este proveedor y medida completa
          const existingIndex = medidasAgrupadas[medidaBase].findIndex(
            item => item.proveedor === proveedor && item.medida === datos.medida
          );
          
          if (existingIndex >= 0) {
            // Si existe, sumar los kilos
            medidasAgrupadas[medidaBase][existingIndex].kilos += datos.kilos;
          } else {
            // Si no existe, agregar nueva entrada
            medidasAgrupadas[medidaBase].push({
              proveedor,
              medida: datos.medida,
              kilos: datos.kilos
            });
          }
        });
      });

      // Ordenar y filtrar según la búsqueda
      const resultado = {};
      
      // Primero agregar las medidas agrupadas
      Object.entries(medidasAgrupadas)
        .sort(([medidaA], [medidaB]) => {
          const numA = parseInt(medidaA.split('/')[0]);
          const numB = parseInt(medidaB.split('/')[0]);
          return numA - numB;
        })
        .forEach(([medidaBase, items]) => {
          if (!searchLower || 
              medidaBase.toLowerCase().includes(searchLower) ||
              items.some(item => 
                item.proveedor.toLowerCase().includes(searchLower) || 
                item.medida.toLowerCase().includes(searchLower)
              )) {
            resultado[medidaBase] = items;
          }
        });

      // Después agregar las maquilas
      Object.entries(maquilas).forEach(([proveedor, medidas]) => {
        if (!searchLower || proveedor.toLowerCase().includes(searchLower)) {
          resultado[proveedor] = Object.entries(medidas)
            .sort(([medidaA], [medidaB]) => {
              const numA = parseInt(medidaA.split('/')[0]);
              const numB = parseInt(medidaB.split('/')[0]);
              return numA - numB;
            })
            .reduce((acc, [medida, kilos]) => {
              acc[medida] = kilos;
              return acc;
            }, {});
        }
      });

      return resultado;
    });

    const maxKilos = computed(() => {
      let max = 0;
      let maxOzuna = 0;
      Object.entries(existencias.value).forEach(([proveedor, medidas]) => {
        Object.values(medidas).forEach(datos => {
          if (proveedor.toLowerCase() === 'ozuna') {
            if (datos.kilos > maxOzuna) maxOzuna = datos.kilos;
          } else {
            if (datos.kilos > max) max = datos.kilos;
          }
        });
      });
      return { normal: max, ozuna: maxOzuna };
    });

    const totalGeneral = computed(() => {
      return Object.entries(filteredExistencias.value).reduce((total, [proveedor, datos]) => {
        if (proveedor === 'Ozuna' || proveedor === 'Joselito') {
          // Para maquilas, los datos son un objeto directo de medida -> datos
          return total + Object.values(datos).reduce((sum, item) => sum + item.kilos, 0);
        } else {
          // Para medidas agrupadas, los datos son un array de objetos
          return total + datos.reduce((sum, item) => sum + item.kilos, 0);
        }
      }, 0);
    });

    const formatNumber = (value) => {
      return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const imprimirReporte = () => {
      const fechaActual = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const estilos = `
        <style>
          @page { 
            size: A4 landscape; 
            margin: 0.5cm 0.5cm;
            @bottom-right {
              content: "Página " counter(page) " de " counter(pages);
              font-size: 11pt;
            }
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 18pt;
            line-height: 1.2;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .header {
            margin-bottom: 8px;
            padding-bottom: 4px;
          }
          h1 {
            font-size: 26pt;
            margin: 0;
            padding: 0;
          }
          .fecha-reporte {
            font-size: 18pt;
          }
          .existencias-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-top: 10px;
          }
          .medida-card {
            padding: 8px;
          }
          .medida-card h2 {
            font-size: 20pt;
            margin: 0 0 6px 0;
            padding-bottom: 4px;
          }
          th, td {
            padding: 4px;
            font-size: 16pt;
          }
          @media print {
            .existencias-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
            }
            .maquila-card {
              break-before: page;
              page-break-before: always;
            }
            .medida-card {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
          .total-general {
            margin-top: 15px;
            padding: 8px;
          }
          .total-general h2 {
            font-size: 20pt;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            border: 2px solid #2c3e50;
          }
          th {
            background-color: #2c3e50;
            color: white;
            text-align: left;
            padding: 8px;
            font-size: 16pt;
            border: 1px solid #2c3e50;
          }
          td {
            padding: 6px 8px;
            font-size: 16pt;
            border: 1px solid #bdc3c7;
          }
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .kilos-cell {
            text-align: right;
            font-weight: bold;
            color: #2c3e50;
          }
          .total-row {
            background-color: #ecf0f1 !important;
            border-top: 2px solid #2c3e50;
          }
          .total-row td {
            font-weight: bold;
            color: #2c3e50;
          }
          .medida-card {
            padding: 12px;
            border: 1px solid #bdc3c7;
            background-color: white;
          }
          .maquila-card {
            background-color: white;
            border: 2px solid #f39c12;
          }
          .maquila-card h2 {
            color: #d35400;
            border-bottom: 2px solid #f39c12;
            padding-bottom: 8px;
          }
          .maquila-card th {
            background-color: #f39c12;
            border-color: #f39c12;
          }
          .maquila-card .total-row {
            background-color: #f8f9fa !important;
            border-top: 2px solid #f39c12;
          }
          .maquila-card .total-row td {
            color: #d35400;
            font-weight: bold;
          }
          @media print {
            .medida-card {
              box-shadow: none;
              border: 1px solid #bdc3c7;
            }
            .maquila-card {
              background-color: white;
              border: 2px solid #f39c12;
            }
            table {
              page-break-inside: avoid;
            }
          }
        </style>
      `;

      // Crear el contenido HTML
      const contenido = document.createElement('div');
      contenido.innerHTML = `
        ${estilos}
        <div class="header">
          <h1>Reporte de Existencias</h1>
          <div class="fecha-reporte">Fecha: ${fechaActual}</div>
        </div>
        ${document.querySelector('.existencias-grid').outerHTML}
        ${document.querySelector('.total-general').outerHTML}
      `;

      // Configurar la impresión
      const ventanaImpresion = window.open('', '_blank');
      ventanaImpresion.document.write(contenido.innerHTML);
      ventanaImpresion.document.close();

      // Esperar a que los estilos se carguen
      setTimeout(() => {
        ventanaImpresion.print();
        ventanaImpresion.close();
      }, 250);
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
      imprimirReporte
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
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 10px;
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

.medida-card {
  background-color: white;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.medida-card h2 {
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.proveedores-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.proveedor-item {
  margin-bottom: 10px;
}

.proveedor-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.proveedor-nombre {
  font-weight: bold;
  color: #2c3e50;
}

.proveedor-kilos {
  font-weight: bold;
  color: #000000;
}

.medida-total {
  text-align: right;
  font-weight: bold;
  margin-top: 10px;
  color: #2c3e50;
}

.ozuna-card {
  background-color: #f8f9fa;
  border: 2px solid #3498db;
}

.medida-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.medida-table th,
.medida-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.medida-table th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #2c3e50;
}

.medida-table .kilos-cell {
  text-align: right;
  font-weight: bold;
}

.medida-table .total-row {
  background-color: #f8f9fa;
  font-weight: bold;
}

.medida-table .total-row td {
  border-top: 2px solid #3498db;
}

@media print {
  .medida-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .medida-card:nth-child(n+7) {
    break-before: page;
    page-break-before: always;
  }
  .medida-card:nth-child(n+13) {
    break-before: page;
    page-break-before: always;
  }
  .total-general {
    break-before: avoid;
    page-break-before: avoid;
  }
}
</style>