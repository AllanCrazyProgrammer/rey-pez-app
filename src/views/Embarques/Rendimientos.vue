<template>
  <div class="rendimientos-container">
    <div class="header-container">
      <button @click="volverAEmbarque" class="btn-volver">
        <i class="fas fa-arrow-left"></i> Volver al Embarque
      </button>
      <h2>Rendimientos por Medida</h2>
      <button @click="generarPDF" class="btn-pdf">
        <i class="fas fa-file-pdf"></i> Generar PDF
      </button>
    </div>
    
    <div v-if="!embarqueData">
      <p>Cargando datos del embarque...</p>
    </div>
    
    <div v-else class="rendimientos-grid">
      <div v-for="(medida, index) in medidasUnicas" :key="index" class="rendimiento-card">
        <div class="medida-info">
          <span class="medida-label">{{ medida }}</span>
          
          <div class="input-group">
            <template v-if="esMedidaMix(medida)">
              <div class="mix-inputs">
                <div class="mix-input">
                  <label @click="editarEtiqueta(medida, 'medida1')" class="editable-label">
                    {{ obtenerEtiqueta(medida, 'medida1') }}:
                  </label>
                  <input 
                    type="number" 
                    v-model="kilosCrudos[medida].medida1" 
                    @input="calcularRendimiento(medida)"
                    placeholder="Kilos medida 1"
                  >
                </div>
                <div class="mix-input">
                  <label @click="editarEtiqueta(medida, 'medida2')" class="editable-label">
                    {{ obtenerEtiqueta(medida, 'medida2') }}:
                  </label>
                  <input 
                    type="number" 
                    v-model="kilosCrudos[medida].medida2" 
                    @input="calcularRendimiento(medida)"
                    placeholder="Kilos medida 2"
                  >
                </div>
              </div>
            </template>
            <template v-else>
              <label>Kilos en crudo:</label>
              <input 
                type="number" 
                v-model="kilosCrudos[medida]" 
                @input="calcularRendimiento(medida)"
                placeholder="Ingrese kilos"
              >
            </template>
          </div>
          
          <div class="resultados">
            <p>Total embarcado: {{ obtenerTotalEmbarcado(medida).toFixed(1) }} kg</p>
            <p class="rendimiento">
              Rendimiento: 
              <span :class="{ 'rendimiento-alto': getRendimiento(medida) > 1 }">
                {{ getRendimiento(medida).toFixed(2) }}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { debounce } from 'lodash';
import { generarPDFRendimientos } from '@/utils/RendimientosPdf';

export default {
  name: 'Rendimientos',
  
  data() {
    return {
      kilosCrudos: {},
      medidasUnicas: [],
      embarqueData: null,
      guardadoAutomaticoActivo: false
    }
  },

  async created() {
    await this.cargarEmbarque();
  },

  methods: {
    async cargarEmbarque() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        const embarqueDoc = await getDoc(embarqueRef);
        
        if (embarqueDoc.exists()) {
          this.embarqueData = embarqueDoc.data();
          this.obtenerMedidasUnicas();
          // Inicializar los kilos crudos con estructura para mix
          this.kilosCrudos = this.embarqueData.kilosCrudos || {};
          
          // Convertir estructura antigua a nueva si es necesario
          this.medidasUnicas.forEach(medida => {
            if (this.esMedidaMix(medida)) {
              if (!this.kilosCrudos[medida] || typeof this.kilosCrudos[medida] !== 'object') {
                this.kilosCrudos[medida] = {
                  medida1: 0,
                  medida2: 0,
                  etiqueta1: 'Kilos en crudo (Medida 1)',
                  etiqueta2: 'Kilos en crudo (Medida 2)'
                };
              }
            }
          });
          
          this.guardadoAutomaticoActivo = true;
        } else {
          console.error('No se encontró el embarque');
        }
      } catch (error) {
        console.error('Error al cargar el embarque:', error);
      }
    },

    guardarCambiosEnTiempoReal: debounce(async function() {
      if (!this.guardadoAutomaticoActivo) return;

      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          kilosCrudos: this.kilosCrudos
        });
        
        console.log('Rendimientos guardados automáticamente:', new Date().toLocaleString());
      } catch (error) {
        console.error('Error al guardar los rendimientos:', error);
      }
    }, 300),

    obtenerMedidasUnicas() {
      if (!this.embarqueData || !this.embarqueData.clientes) return;
      
      const medidasMap = new Map();
      
      this.embarqueData.clientes.forEach(cliente => {
        cliente.productos.forEach(producto => {
          if (producto.medida) {
            const medidaNormalizada = producto.medida.toLowerCase().trim();
            if (!medidasMap.has(medidaNormalizada)) {
              medidasMap.set(medidaNormalizada, producto.medida);
            }
          }
        });
      });
      
      this.medidasUnicas = Array.from(medidasMap.values());
    },

    obtenerTotalEmbarcado(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      const medidaNormalizada = medida.toLowerCase().trim();
      return this.embarqueData.clientes.reduce((total, cliente) => {
        return total + cliente.productos
          .filter(p => p.medida && p.medida.toLowerCase().trim() === medidaNormalizada)
          .reduce((subtotal, producto) => {
            if (producto.tipo === 'c/h20') {
              const totalBolsas = this.calcularTotalBolsas(producto);
              const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
              const kilosNetos = totalBolsas * valorNeto;
              return subtotal + kilosNetos;
            }
            return subtotal + this.calcularTotalKilos(producto);
          }, 0);
      }, 0);
    },

    obtenerTotalParaRendimiento(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      const medidaNormalizada = medida.toLowerCase();
      const productos = this.embarqueData.clientes.flatMap(cliente => 
        cliente.productos.filter(p => 
          p.medida && p.medida.toLowerCase() === medidaNormalizada
        )
      );

      // Si algún producto de esta medida es c/h20, usar total embarcado
      const tieneCH20 = productos.some(p => p.tipo === 'c/h20');
      
      if (tieneCH20) {
        return this.obtenerTotalEmbarcado(medida);
      } else {
        return this.obtenerTotalReal(medida);
      }
    },

    obtenerTotalReal(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      const medidaNormalizada = medida.toLowerCase();
      return this.embarqueData.clientes.reduce((total, cliente) => {
        return total + cliente.productos
          .filter(p => p.medida && p.medida.toLowerCase() === medidaNormalizada)
          .reduce((subtotal, producto) => {
            return subtotal + this.calcularTotalKilos(producto);
          }, 0);
      }, 0);
    },

    calcularTotalKilos(producto) {
      if (!producto.kilos) return 0;
      const sumaKilos = producto.kilos.reduce((total, kilo) => total + (Number(kilo) || 0), 0);
      const sumaTaras = this.calcularTotalTaras(producto);
      const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
      return sumaKilos - descuentoTaras;
    },

    calcularTotalTaras(producto) {
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      return tarasNormales + tarasExtra;
    },

    calcularTotalBolsas(producto) {
      // Para productos c/h20, calcular la suma de (taras * bolsa) para cada grupo
      const reporteTaras = producto.reporteTaras || [];
      const reporteBolsas = producto.reporteBolsas || [];
      let sumaTotalKilos = 0;

      for (let i = 0; i < reporteTaras.length; i++) {
        const taras = parseInt(reporteTaras[i]) || 0;
        const bolsa = parseInt(reporteBolsas[i]) || 0;
        sumaTotalKilos += taras * bolsa;
      }

      return sumaTotalKilos;
    },

    calcularRendimiento(medida) {
      if (this.esMedidaMix(medida)) {
        const totalKilosCrudos = Number(this.kilosCrudos[medida].medida1 || 0) + 
                                Number(this.kilosCrudos[medida].medida2 || 0);
        const totalEmbarcado = this.obtenerTotalEmbarcado(medida);
        if (totalEmbarcado === 0) return 0;
        
        this.guardarCambiosEnTiempoReal();
        return totalKilosCrudos / totalEmbarcado;
      } else {
        // Lógica existente para medidas normales
        if (!this.kilosCrudos[medida]) return 0;
        const totalParaCalculo = this.obtenerTotalParaRendimiento(medida);
        if (totalParaCalculo === 0) return 0;
        
        this.guardarCambiosEnTiempoReal();
        return this.kilosCrudos[medida] / totalParaCalculo;
      }
    },

    getRendimiento(medida) {
      return this.calcularRendimiento(medida) || 0;
    },

    volverAEmbarque() {
      this.$router.push({
        name: 'EditarEmbarque',
        params: { id: this.$route.params.id }
      });
    },

    esMedidaMix(medida) {
      return medida.toLowerCase().includes('mix');
    },

    obtenerEtiqueta(medida, campo) {
      if (!this.kilosCrudos[medida]) return campo === 'medida1' ? 
        'Kilos en crudo (Medida 1)' : 'Kilos en crudo (Medida 2)';
        
      return campo === 'medida1' ? 
        (this.kilosCrudos[medida].etiqueta1 || 'Kilos en crudo (Medida 1)') : 
        (this.kilosCrudos[medida].etiqueta2 || 'Kilos en crudo (Medida 2)');
    },

    editarEtiqueta(medida, campo) {
      if (!this.kilosCrudos[medida]) {
        this.$set(this.kilosCrudos, medida, {
          medida1: 0,
          medida2: 0,
          etiqueta1: 'Kilos en crudo (Medida 1)',
          etiqueta2: 'Kilos en crudo (Medida 2)'
        });
      }

      const etiquetaActual = campo === 'medida1' ? 
        this.kilosCrudos[medida].etiqueta1 : 
        this.kilosCrudos[medida].etiqueta2;

      const nuevaEtiqueta = prompt('Ingrese el nuevo nombre para la medida:', etiquetaActual);
      
      if (nuevaEtiqueta !== null) {
        if (campo === 'medida1') {
          this.$set(this.kilosCrudos[medida], 'etiqueta1', nuevaEtiqueta);
        } else {
          this.$set(this.kilosCrudos[medida], 'etiqueta2', nuevaEtiqueta);
        }
        this.guardarCambiosEnTiempoReal();
      }
    },

    generarPDF() {
      const datosParaPDF = this.medidasUnicas.map(medida => ({
        medida,
        kilosCrudos: this.esMedidaMix(medida) ? 
          this.kilosCrudos[medida] : 
          Number(this.kilosCrudos[medida] || 0),
        totalEmbarcado: this.obtenerTotalEmbarcado(medida),
        rendimiento: this.getRendimiento(medida)
      }));

      generarPDFRendimientos(datosParaPDF, this.embarqueData);
    },
  },

  watch: {
    kilosCrudos: {
      handler() {
        this.guardarCambiosEnTiempoReal();
      },
      deep: true
    }
  },

  beforeDestroy() {
    if (this.guardarCambiosEnTiempoReal.cancel) {
      this.guardarCambiosEnTiempoReal.cancel();
    }
  }
}
</script>

<style scoped>
.rendimientos-container {
  padding: 20px;
}

.rendimientos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.rendimiento-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background-color: #fff;
}

.medida-label {
  font-size: 1.2em;
  font-weight: bold;
  color: #2c3e50;
  margin-bottom: 10px;
  display: block;
}

.input-group {
  margin: 15px 0;
}

.input-group label {
  display: block;
  margin-bottom: 5px;
  color: #666;
}

input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.resultados {
  margin-top: 15px;
}

.rendimiento {
  font-weight: bold;
}

.rendimiento-alto {
  color: #27ae60;
}

.header-container {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.btn-volver {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-volver:hover {
  background-color: #2980b9;
}

.btn-volver i {
  margin-right: 10px;
}

.resultados p {
  margin: 8px 0;
  font-size: 1.1em;
}

.resultados .rendimiento {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.rendimiento span {
  font-size: 1.2em;
  font-weight: bold;
}

.mix-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.mix-input {
  flex: 1;
}

.mix-input label {
  font-size: 0.9em;
}

.editable-label {
  cursor: pointer;
  user-select: none;
}

.editable-label:hover {
  color: #3498db;
  text-decoration: underline;
}

.btn-pdf {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
}

.btn-pdf:hover {
  background-color: #c0392b;
}

.btn-pdf i {
  margin-right: 10px;
}
</style>

