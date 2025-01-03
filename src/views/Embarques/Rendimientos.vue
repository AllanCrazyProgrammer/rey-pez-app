<template>
  <div class="rendimientos-container">
    <div class="header-container">
      <button @click="volverAEmbarque" class="btn-volver">
        <i class="fas fa-arrow-left"></i> Volver al Embarque
      </button>
      <h2>Rendimientos por Medida</h2>
      <button @click="abrirModalNota" class="btn-nota">
        <i class="fas fa-sticky-note"></i> Agregar Nota
      </button>
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
          <div class="medida-header">
            <span class="medida-label editable-label" @click="editarNombreMedida(medida)">
              {{ obtenerNombreMedidaPersonalizado(medida) }}
            </span>
            <div class="ocultar-control">
              <input 
                type="checkbox" 
                :id="'ocultar-' + index"
                v-model="medidaOculta[medida]"
                @change="guardarEstadoOculto"
              >
              <label :for="'ocultar-' + index">Ocultar en PDF</label>
            </div>
          </div>
          
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

    <div v-if="mostrarModal" class="modal-overlay">
      <div class="modal-content">
        <h3>Agregar Nota</h3>
        <textarea 
          v-model="nota" 
          placeholder="Escriba su nota aquí..."
          rows="4"
        ></textarea>
        <div class="modal-buttons">
          <button @click="guardarNota" class="btn-guardar">Guardar</button>
          <button @click="cerrarModal" class="btn-cancelar">Cancelar</button>
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
      guardadoAutomaticoActivo: false,
      nombresMedidasPersonalizados: {},
      mostrarModal: false,
      nota: '',
      medidaOculta: {}
    }
  },

  async created() {
    await this.cargarEmbarque();
    // Aplicar debounce después de definir el método
    this.guardarCambiosEnTiempoReal = debounce(this.guardarCambiosEnTiempoReal, 300);
  },

  methods: {
    // Mover este método al principio de methods
    obtenerNombreCliente(clienteId) {
      if (!this.embarqueData || !this.embarqueData.clientes) return '';
      const cliente = this.embarqueData.clientes.find(c => c.id.toString() === clienteId.toString());
      return cliente ? cliente.nombre : '';
    },

    async cargarEmbarque() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        const embarqueDoc = await getDoc(embarqueRef);
        
        if (embarqueDoc.exists()) {
          this.embarqueData = embarqueDoc.data();
          this.nombresMedidasPersonalizados = this.embarqueData.nombresMedidasPersonalizados || {};
          this.obtenerMedidasUnicas();
          this.medidaOculta = this.embarqueData.medidaOculta || {};
          
          // Inicializar kilosCrudos con los datos de Firestore
          const kilosCrudosGuardados = this.embarqueData.kilosCrudos || {};
          this.kilosCrudos = { ...kilosCrudosGuardados };
          
          // Asegurar que todas las medidas tengan una estructura válida
          this.medidasUnicas.forEach(medida => {
            if (!this.kilosCrudos[medida]) {
              if (this.esMedidaMix(medida)) {
                this.$set(this.kilosCrudos, medida, {
                  medida1: 0,
                  medida2: 0,
                  etiqueta1: 'Kilos en crudo (Medida 1)',
                  etiqueta2: 'Kilos en crudo (Medida 2)'
                });
              } else {
                this.$set(this.kilosCrudos, medida, 0);
              }
            }
          });
          
          console.log('Datos cargados:', this.kilosCrudos);
          this.guardadoAutomaticoActivo = true;
        } else {
          console.error('No se encontró el embarque');
        }
      } catch (error) {
        console.error('Error al cargar el embarque:', error);
      }
    },

    async guardarCambiosEnTiempoReal() {
      if (!this.guardadoAutomaticoActivo) return;

      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          kilosCrudos: this.kilosCrudos
        });
        
        console.log('Rendimientos guardados:', this.kilosCrudos);
      } catch (error) {
        console.error('Error al guardar los rendimientos:', error);
      }
    },

    obtenerMedidasUnicas() {
      if (!this.embarqueData || !this.embarqueData.clientes) return;
      
      const medidasMap = new Map();
      const mixMedidas = new Map();
      
      this.embarqueData.clientes.forEach(cliente => {
        cliente.productos.forEach(producto => {
          if (producto.medida) {
            const medidaNormalizada = producto.medida.toLowerCase().trim();
            let nombreMedida = producto.medida;
            
            // Verificar si es un producto de Ozuna y no es venta
            if (cliente.nombre === 'Ozuna' && !producto.esVenta) {
              nombreMedida = `${producto.medida} Maquila Ozuna`;
            }

            // Si la medida termina en "mix", la guardamos en un mapa separado
            if (medidaNormalizada.endsWith('mix')) {
              const baseSize = medidaNormalizada.split(' ')[0]; // Obtiene el número base (ej: "51/60")
              mixMedidas.set(baseSize, nombreMedida);
            } else if (!medidasMap.has(medidaNormalizada)) {
              medidasMap.set(medidaNormalizada, nombreMedida);
            }
          }
        });
      });

      // Agrupar las medidas mix
      const mixKeys = Array.from(mixMedidas.keys()).sort();
      if (mixKeys.length >= 2) {
        for (let i = 0; i < mixKeys.length; i += 2) {
          if (i + 1 < mixKeys.length) {
            const combinedName = `${mixKeys[i]}-${mixKeys[i+1]} mix`;
            medidasMap.set(combinedName, combinedName);
            
            // Inicializar la estructura para los kilos crudos si no existe
            if (!this.kilosCrudos[combinedName]) {
              this.$set(this.kilosCrudos, combinedName, {
                medida1: 0,
                medida2: 0,
                etiqueta1: `Kilos en crudo (${mixKeys[i]})`,
                etiqueta2: `Kilos en crudo (${mixKeys[i+1]})`
              });
            }
          }
        }
      }
      
      this.medidasUnicas = Array.from(medidasMap.values());
    },

    obtenerTotalEmbarcado(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      // Si es una medida combinada (mix)
      if (medida.includes('-') && medida.endsWith('mix')) {
        const [medida1, medida2] = medida.split('-').map(m => m.trim());
        const total1 = this.calcularTotalParaMedida(medida1 + ' mix');
        const total2 = this.calcularTotalParaMedida(medida2.replace(' mix', '') + ' mix');
        return total1 + total2;
      }
      
      return this.calcularTotalParaMedida(medida);
    },

    calcularTotalParaMedida(medida) {
      const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
      return this.embarqueData.clientes.reduce((total, cliente) => {
        return total + cliente.productos
          .filter(p => p.medida && p.medida.toLowerCase().trim() === medidaBase)
          .reduce((subtotal, producto) => {
            if (producto.tipo === 'c/h20') {
              const totalBolsas = this.calcularTotalBolsas(producto);
              const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
              return subtotal + (totalBolsas * valorNeto);
            } else {
              const sumaKilos = producto.kilos.reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
              const sumaTaras = this.calcularTotalTaras(producto);
              const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
              return subtotal + (sumaKilos - descuentoTaras);
            }
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
      
      const medidaBase = medida.replace(' Maquila', '').toLowerCase();
      return this.embarqueData.clientes.reduce((total, cliente) => {
        return total + cliente.productos
          .filter(p => p.medida && p.medida.toLowerCase() === medidaBase)
          .reduce((subtotal, producto) => {
            return subtotal + this.calcularTotalKilos(producto);
          }, 0);
      }, 0);
    },

    calcularTotalKilos(producto) {
      if (!producto.kilos) return 0;
      
      // Suma de kilos
      const sumaKilos = producto.kilos.reduce((total, kilo) => total + (Number(kilo) || 0), 0);
      
      // Solo las taras normales (no extra) afectan al descuento de kilos
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      
      // El descuento solo aplica a taras normales cuando restarTaras está activo
      const descuentoTaras = producto.restarTaras ? tarasNormales * 3 : 0;
      
      // Las taras extra no afectan los kilos
      return sumaKilos - descuentoTaras;
    },

    calcularTotalTaras(producto) {
      // Aquí sí sumamos tanto taras normales como extra para el conteo total
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      return tarasNormales + tarasExtra;
    },

    calcularTotalBolsas(producto) {
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
      const totalEmbarcado = this.obtenerTotalEmbarcado(medida);
      if (totalEmbarcado === 0) return 0;
      
      let kilosCrudos;
      if (this.esMedidaMix(medida)) {
        kilosCrudos = Number(this.kilosCrudos[medida]?.medida1 || 0) + 
                      Number(this.kilosCrudos[medida]?.medida2 || 0);
      } else {
        kilosCrudos = Number(this.kilosCrudos[medida] || 0);
      }
      
      // El rendimiento es kilos crudos / kilos embarcados
      const rendimiento = kilosCrudos / totalEmbarcado;
      
      this.guardarCambiosEnTiempoReal();
      return rendimiento;
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
      // Preparar los datos para el PDF
      const datosRendimientos = this.medidasUnicas
        .filter(medida => !this.medidaOculta[medida]) // Filtrar medidas ocultas
        .map(medida => {
          let kilosCrudos;
          if (this.esMedidaMix(medida)) {
            kilosCrudos = {
              medida1: Number(this.kilosCrudos[medida]?.medida1 || 0),
              medida2: Number(this.kilosCrudos[medida]?.medida2 || 0)
            };
          } else {
            kilosCrudos = Number(this.kilosCrudos[medida] || 0);
          }

          return {
            medida: medida,
            kilosCrudos: kilosCrudos,
            totalEmbarcado: this.obtenerTotalEmbarcado(medida),
            rendimiento: this.getRendimiento(medida)
          };
        });

      // Incluir la nota en los datos del embarque
      const embarqueDataConNota = {
        ...this.embarqueData,
        notaRendimientos: this.embarqueData?.notaRendimientos || ''
      };

      // Llamar a la función para generar el PDF con los datos procesados
      generarPDFRendimientos(datosRendimientos, embarqueDataConNota);
    },

    obtenerNombreMedidaPersonalizado(medida) {
      return this.nombresMedidasPersonalizados[medida] || medida;
    },

    async editarNombreMedida(medida) {
      const nombreActual = this.obtenerNombreMedidaPersonalizado(medida);
      const nuevoNombre = prompt('Ingrese el nuevo nombre para la medida:', nombreActual);
      
      if (nuevoNombre !== null && nuevoNombre.trim() !== '') {
        this.$set(this.nombresMedidasPersonalizados, medida, nuevoNombre.trim());
        
        try {
          const db = getFirestore();
          const embarqueId = this.$route.params.id;
          const embarqueRef = doc(db, 'embarques', embarqueId);
          
          await updateDoc(embarqueRef, {
            nombresMedidasPersonalizados: this.nombresMedidasPersonalizados
          });
          
          console.log('Nombre de medida actualizado correctamente');
        } catch (error) {
          console.error('Error al guardar el nuevo nombre:', error);
        }
      }
    },

    abrirModalNota() {
      this.nota = this.embarqueData?.notaRendimientos || '';
      this.mostrarModal = true;
    },

    async guardarNota() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          notaRendimientos: this.nota
        });
        
        this.embarqueData.notaRendimientos = this.nota;
        
        this.cerrarModal();
        console.log('Nota guardada correctamente');
      } catch (error) {
        console.error('Error al guardar la nota:', error);
      }
    },

    cerrarModal() {
      this.mostrarModal = false;
      this.nota = '';
    },

    async guardarEstadoOculto() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          medidaOculta: this.medidaOculta
        });
        
        console.log('Estado de ocultación guardado correctamente');
      } catch (error) {
        console.error('Error al guardar estado de ocultación:', error);
      }
    }
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

.medida-label.editable-label {
  cursor: pointer;
  transition: color 0.3s ease;
}

.medida-label.editable-label:hover {
  color: #3498db;
}

.btn-nota {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  background-color: #f39c12;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-left: auto;
  margin-right: 10px;
}

.btn-nota:hover {
  background-color: #d68910;
}

.btn-nota i {
  margin-right: 10px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}

.modal-content h3 {
  margin-top: 0;
  color: #2c3e50;
}

.modal-content textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 10px 0;
  font-size: 16px;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.btn-guardar {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-cancelar {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
}

.medida-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.ocultar-control {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9em;
  color: #666;
}

.ocultar-control input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.ocultar-control label {
  cursor: pointer;
  user-select: none;
}
</style>

