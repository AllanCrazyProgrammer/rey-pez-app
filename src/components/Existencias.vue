<template>
    <div class="existencias-container">
      <h1>Reporte de Existencias</h1>
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
    </div>
  </template>
  
  <script>
  // El script permanece sin cambios
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
  
      const formatNumber = (value) => {
        return value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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
        formatNumber
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
  
  h1 {
    color: #2c3e50;
    text-align: center;
    margin-bottom: 20px;
    font-weight: 700;
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
    background-color: white;
    transition: border-color 0.3s ease;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #2980b9;
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
    transition: box-shadow 0.3s ease;
  }
  
  .proveedor-card:hover {
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
  }
  
  .proveedor-card h2 {
    color: black;
    border-bottom: 2px solid #3498db;
    padding-bottom: 10px;
    margin-bottom: 15px;
    font-weight: 600;
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
    margin-bottom: 5px;
  }
  
  .medida-nombre {
    font-weight: 600;
    color: black;
  }
  
  .medida-kilos {
    font-weight: 600;
    color: black;
  }
  
  .medida-bar-container {
    width: 100%;
    height: 10px;
    background-color: #e9ecef;
    border-radius: 5px;
    overflow: hidden;
  }
  
  .medida-bar {
    height: 100%;
    background-color: #3498db;
    transition: width 0.3s ease;
  }
  
  @media (max-width: 768px) {
    .existencias-grid {
      grid-template-columns: 1fr;
    }
  }
  </style>