<template>
  <div class="buscador-medidas-container">
    <div class="header">
      <h2>Consulta de Medidas</h2>
      <button @click="mostrarModal" class="btn-buscar">
        <i class="fas fa-search"></i> Buscar Medidas
      </button>
    </div>

    <!-- Modal de búsqueda -->
    <b-modal v-model="showModal" title="Buscar Medidas Preparadas" size="xl" @show="inicializarBusqueda">
      <div class="filtros-container">
        <div class="filtros-row">
          <div class="filtro-grupo">
            <label>Medida:</label>
            <select v-model="filtros.medida" @change="buscarMedidas" class="form-control">
              <option value="">Todas las medidas</option>
              <option v-for="medida in medidasUnicas" :key="medida" :value="medida">
                {{ medida }}
              </option>
            </select>
          </div>
          
          <div class="filtro-grupo">
            <label>Proveedor:</label>
            <select v-model="filtros.proveedor" @change="buscarMedidas" class="form-control">
              <option value="">Todos los proveedores</option>
              <option v-for="proveedor in proveedoresUnicos" :key="proveedor" :value="proveedor">
                {{ proveedor }}
              </option>
            </select>
          </div>

          <div class="filtro-grupo">
            <label>Cajas:</label>
            <input 
              type="number" 
              v-model="filtros.cajas" 
              @input="buscarMedidas" 
              placeholder="Número exacto de cajas"
              class="form-control"
              min="0"
              step="1"
            >
          </div>

        </div>

        <div class="estadisticas" v-if="resultados.length > 0">
          <div class="stats-card">
            <span class="stats-label">Total preparaciones:</span>
            <span class="stats-value">{{ totalPreparaciones }}</span>
          </div>

          <div class="stats-card">
            <span class="stats-label">Promedio rendimiento:</span>
            <span class="stats-value">{{ promedioRendimiento }}%</span>
          </div>
        </div>
      </div>

      <div class="resultados-container" v-if="resultados.length > 0">
        <div class="tabla-wrapper">
          <table class="tabla-resultados">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Medida</th>
                <th>Proveedor</th>
                <th>Día/Noche</th>
                <th>Tipo</th>
                <th>Cajas</th>
                <th>Cal</th>
                <th>Sal</th>
                <th>Rendimiento</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="resultado in resultadosOrdenados" :key="resultado.id + '-' + resultado.medidaIndex" class="resultado-row">
                <td class="fecha-col">{{ formatearFecha(resultado.fecha) }}</td>
                <td class="medida-col">{{ resultado.medida }}</td>
                <td class="proveedor-col">{{ resultado.proveedor || 'Sin proveedor' }}</td>
                <td class="dia-noche-col">{{ resultado.diaNoche || '-' }}</td>
                <td class="tipo-col">{{ resultado.tinas }}</td>
                <td class="cajas-col">{{ resultado.cajas }}</td>
                <td class="cal-col">{{ resultado.cal }}</td>
                <td class="sal-col">{{ resultado.sal }}</td>
                <td class="rendimiento-col" :class="getRendimientoClass(resultado.rendimiento)">
                  {{ resultado.rendimiento }}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else-if="busquedaRealizada" class="no-resultados">
        <i class="fas fa-search"></i>
        <p>No se encontraron medidas con los criterios seleccionados</p>
      </div>

      <div v-else class="mensaje-inicial">
        <i class="fas fa-filter"></i>
        <p>Selecciona los filtros para buscar medidas preparadas</p>
      </div>

      <template #modal-footer>
        <div class="modal-footer-custom">
          <button @click="exportarResultados" class="btn-exportar" v-if="resultados.length > 0">
            <i class="fas fa-download"></i> Exportar
          </button>
          <button @click="showModal = false" class="btn-cerrar">
            Cerrar
          </button>
        </div>
      </template>
    </b-modal>
  </div>
</template>

<script>
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore'

export default {
  name: 'BuscadorMedidas',
  data() {
    return {
      showModal: false,
      busquedaRealizada: false,
      filtros: {
        medida: '',
        proveedor: '',
        cajas: ''
      },
      resultados: [],
      todasLasPreparaciones: []
    }
  },
  computed: {
    medidasUnicas() {
      const medidas = new Set()
      this.todasLasPreparaciones.forEach(prep => {
        prep.medidas.forEach(m => {
          if (m.medida) medidas.add(m.medida)
        })
      })
      return Array.from(medidas).sort()
    },
    proveedoresUnicos() {
      const proveedores = new Set()
      this.todasLasPreparaciones.forEach(prep => {
        prep.medidas.forEach(m => {
          if (m.proveedor && m.proveedor.trim() !== '') {
            proveedores.add(m.proveedor)
          }
        })
      })
      return Array.from(proveedores).sort()
    },
    resultadosOrdenados() {
      return [...this.resultados].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    },
    totalPreparaciones() {
      return this.resultados.length
    },

    promedioRendimiento() {
      if (this.resultados.length === 0) return 0
      const resultadosConRendimiento = this.resultados.filter(r => r.rendimiento && r.rendimiento !== '')
      if (resultadosConRendimiento.length === 0) return 0
      const total = resultadosConRendimiento.reduce((sum, r) => {
        const rendimiento = parseFloat(r.rendimiento.toString().replace('%', ''))
        return sum + (rendimiento || 0)
      }, 0)
      return (total / resultadosConRendimiento.length).toFixed(1)
    }
  },
  methods: {
    mostrarModal() {
      this.showModal = true
    },
    async inicializarBusqueda() {
      if (this.todasLasPreparaciones.length === 0) {
        await this.cargarTodasLasPreparaciones()
      }
      console.log('Preparaciones cargadas:', this.todasLasPreparaciones.length)
      console.log('Proveedores únicos encontrados:', this.proveedoresUnicos)
      console.log('Medidas únicas encontradas:', this.medidasUnicas)
    },
    async cargarTodasLasPreparaciones() {
      try {
        const db = getFirestore()
        const q = query(collection(db, 'preparacion'), orderBy('timestamp', 'desc'))
        const querySnapshot = await getDocs(q)
        
        this.todasLasPreparaciones = querySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data
          }
        })
      } catch (error) {
        console.error('Error al cargar preparaciones:', error)
      }
    },
    buscarMedidas() {
      this.busquedaRealizada = true
      this.resultados = []

      this.todasLasPreparaciones.forEach(preparacion => {
        preparacion.medidas.forEach((medida, medidaIndex) => {
          let coincide = true

          // Filtrar por medida
          if (this.filtros.medida && medida.medida !== this.filtros.medida) {
            coincide = false
          }

          // Filtrar por proveedor
          if (this.filtros.proveedor && medida.proveedor !== this.filtros.proveedor) {
            coincide = false
          }

          // Filtrar por cajas (número exacto)
          if (this.filtros.cajas !== '') {
            const cajasMedida = parseFloat(medida.cajas) || 0
            const cajasValor = parseFloat(this.filtros.cajas) || 0
            
            if (cajasMedida !== cajasValor) {
              coincide = false
            }
          }



          if (coincide && medida.medida) {
            this.resultados.push({
              id: preparacion.id,
              medidaIndex,
              fecha: preparacion.fecha,
              medida: medida.medida,
              proveedor: medida.proveedor,
              diaNoche: medida.diaNoche,
              tinas: medida.tinas,
              cajas: medida.cajas,
              cal: medida.cal,
              sal: medida.sal,
              rendimiento: medida.porcentaje
            })
          }
        })
      })
    },
    formatearFecha(fecha) {
      const [year, month, day] = fecha.split('-')
      return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },
    getRendimientoClass(rendimiento) {
      if (!rendimiento) return ''
      const valor = parseFloat(rendimiento.toString().replace('%', ''))
      if (valor >= 80) return 'rendimiento-alto'
      if (valor >= 60) return 'rendimiento-medio'
      return 'rendimiento-bajo'
    },
    exportarResultados() {
      if (this.resultados.length === 0) return

      let csv = 'Fecha,Medida,Proveedor,Día/Noche,Tipo,Cajas,Cal,Sal,Rendimiento\n'
      
      this.resultadosOrdenados.forEach(resultado => {
        csv += `${this.formatearFecha(resultado.fecha)},${resultado.medida},${resultado.proveedor || 'Sin proveedor'},${resultado.diaNoche || '-'},${resultado.tinas || ''},${resultado.cajas || ''},${resultado.cal || ''},${resultado.sal || ''},${resultado.rendimiento || ''}\n`
      })

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `medidas_preparacion_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }
}
</script>

<style scoped>
.buscador-medidas-container {
  margin-bottom: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.3rem;
}

.btn-buscar {
  background: linear-gradient(135deg, #8e44ad, #9b59b6);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  font-weight: 500;
}

.btn-buscar:hover {
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  transform: translateY(-2px);
}

.filtros-container {
  margin-bottom: 20px;
}

.filtros-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.filtro-grupo {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filtro-grupo label {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.9rem;
}

.form-control {
  padding: 8px 12px;
  border: 2px solid #e0e6ed;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: #3498db;
}



.estadisticas {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stats-card {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
  border: 1px solid #dee2e6;
}

.stats-label {
  font-size: 0.8rem;
  color: #6c757d;
  margin-bottom: 4px;
}

.stats-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: #2c3e50;
}

.resultados-container {
  max-height: 400px;
  overflow-y: auto;
}

.tabla-wrapper {
  width: 100%;
  overflow-x: auto;
}

.tabla-resultados {
  width: 100%;
  min-width: 700px;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.tabla-resultados th {
  background: linear-gradient(135deg, #34495e, #2c3e50);
  color: white;
  padding: 12px 10px;
  text-align: left;
  font-weight: 600;
  font-size: 0.9rem;
  position: sticky;
  top: 0;
  z-index: 1;
}

.tabla-resultados td {
  padding: 10px;
  border-bottom: 1px solid #eee;
  font-size: 0.9rem;
}

.resultado-row:hover {
  background: #f8f9fa;
}

.fecha-col {
  min-width: 120px;
  font-weight: 500;
}

.medida-col {
  min-width: 100px;
  font-weight: 600;
  color: #2980b9;
}

.proveedor-col {
  min-width: 120px;
}

.dia-noche-col {
  min-width: 90px;
  text-align: center;
  font-weight: 500;
  color: #2c3e50;
}

.tipo-col {
  min-width: 80px;
}

.cajas-col {
  min-width: 80px;
  text-align: center;
  font-weight: 500;
}

.cal-col, .sal-col {
  min-width: 60px;
  text-align: center;
}

.rendimiento-col {
  min-width: 90px;
  text-align: center;
  font-weight: bold;
}

.rendimiento-alto {
  color: #27ae60;
}

.rendimiento-medio {
  color: #f39c12;
}

.rendimiento-bajo {
  color: #e74c3c;
}

.no-resultados, .mensaje-inicial {
  text-align: center;
  padding: 40px;
  color: #6c757d;
}

.no-resultados i, .mensaje-inicial i {
  font-size: 3rem;
  margin-bottom: 15px;
  opacity: 0.5;
}

.modal-footer-custom {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.btn-exportar {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-exportar:hover {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
}

.btn-cerrar {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.btn-cerrar:hover {
  background: #5a6268;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .filtros-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .estadisticas {
    justify-content: center;
  }

  .stats-card {
    min-width: 100px;
  }

  .tabla-resultados {
    min-width: 600px;
    font-size: 0.8rem;
  }

  .tabla-resultados th,
  .tabla-resultados td {
    padding: 8px 6px;
  }

  .modal-footer-custom {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
