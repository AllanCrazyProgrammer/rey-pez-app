<template>
  <div class="gestion-costos-container">
    <div class="header-container">
      <button @click="volverAEmbarque" class="btn-volver">
        <i class="fas fa-arrow-left"></i> Volver al Embarque
      </button>
      <button @click="volverARendimientos" class="btn-rendimientos">
        <i class="fas fa-chart-line"></i> Volver a Rendimientos
      </button>
      <h2>Gestión de Costos</h2>
      <button @click="abrirModalNuevoCosto" class="btn-nuevo-costo">
        <i class="fas fa-plus"></i> Nueva Medida
      </button>
    </div>

         <!-- Sección de medidas registradas -->
    <div class="costos-section">
      <h3>Medidas Registradas</h3>
      <div class="costos-grid">
        <div v-for="(costoInfo, medida) in costosRegistrados" :key="medida" class="costo-card">
          <div class="costo-header">
            <h4>{{ medida }}</h4>
            <div class="costo-actions">
              <button @click="verHistorial(medida)" class="btn-historial">
                <i class="fas fa-history"></i>
              </button>
              <button @click="eliminarMedida(medida)" class="btn-eliminar" :title="`Eliminar medida ${medida} completamente`">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="costo-info">
            <p><strong>Costo Actual:</strong> ${{ costoInfo.costoBase.toFixed(2) }}</p>
            <p><strong>Última Actualización:</strong> {{ formatearFecha(costoInfo.fecha) }}</p>
            <button @click="editarCosto(medida)" class="btn-editar-costo">
              <i class="fas fa-edit"></i> Editar Costo
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección de medidas del embarque -->
    <div class="medidas-embarque-section" v-if="embarqueData">
      <div class="seccion-header">
        <h3>Medidas del Embarque Actual</h3>
        <button @click="sincronizarCostos" class="btn-sincronizar" title="Sincronizar costos con los valores más recientes">
          <i class="fas fa-sync-alt"></i> Sincronizar Costos
        </button>
      </div>
      
      <!-- Campo de costo extra -->
      <div class="costo-extra-section">
        <label for="costoExtra">Costo Extra:</label>
        <input 
          type="number" 
          id="costoExtra"
          v-model="costoExtra" 
          @input="guardarCostoExtraDebounced"
          min="0"
          step="0.01"
          placeholder="18"
          class="input-costo-extra"
        >
        <span class="input-help">Se suma al cálculo del costo final</span>
      </div>
      
      <div class="medidas-grid">
        <div v-for="medida in medidasVisibles" :key="medida" class="medida-card">
          <div class="medida-header">
            <h4>{{ medida }}</h4>
            <div class="medida-actions">
              <label class="checkbox-container">
                <input 
                  type="checkbox" 
                  v-model="medidaSeleccionada[medida]"
                  @change="guardarSeleccionMedidas"
                >
                <span class="checkmark"></span>
                Mostrar en PDF
              </label>
            </div>
          </div>
          <div class="medida-info">
            <div class="costo-container">
              <div class="costo-valor">
                <span v-if="costosEmbarque[medida]" class="costo-actual">
                  <strong>Costo:</strong> ${{ Number(costosEmbarque[medida]).toFixed(2) }}
                </span>
                <span v-else class="sin-costo">Sin costo asignado</span>
              </div>
              <button @click="editarCostoEmbarque(medida)" class="btn-editar-costo-embarque">
                <i class="fas fa-dollar-sign"></i> {{ costosEmbarque[medida] ? 'Cambiar' : 'Asignar' }} Costo
              </button>
              <div v-if="costosEmbarque[medida] && rendimientos[medida]" class="costo-calculado">
                <strong>Costo Final: ${{ calcularCostoFinal(medida) }}</strong>
              </div>
            </div>
            <p v-if="rendimientos[medida]">
              <strong>Rendimiento:</strong> {{ rendimientos[medida].toFixed(2) }}
            </p>
          </div>
        </div>
      </div>
    </div>

         <!-- Modales para gestión de costos -->
    <MedidaModal
      :mostrar="mostrarModalNuevaMedida"
      :medida="nuevaMedida.nombre"
      @cerrar="cerrarModalNuevaMedida"
      @guardar="siguienteNuevaMedida"
    />
    
    <CostoModal
      :mostrar="mostrarModalNuevoCosto"
      :costo="nuevaMedida.costo"
      :medida="nuevaMedida.nombre"
      :esNuevo="true"
      @cerrar="cerrarModalNuevoCosto"
      @guardar="guardarNuevoCosto"
    />
    
    <CostoModal
      :mostrar="mostrarModalEditarCosto"
      :costo="costoEditando.costo"
      :medida="costoEditando.medida"
      :esNuevo="false"
      :costoAnterior="costoEditando.costoAnterior"
      :fechaUltimaActualizacion="costoEditando.fechaUltimaActualizacion"
      @cerrar="cerrarModalEditarCosto"
      @guardar="guardarCostoEditado"
    />
    
    <CostoModal
      :mostrar="mostrarModalCostoEmbarque"
      :costo="costoEmbarqueEditando.costo"
      :medida="costoEmbarqueEditando.medida"
      :esNuevo="false"
      @cerrar="cerrarModalCostoEmbarque"
      @guardar="guardarCostoEmbarque"
    />

    <!-- Modal para historial de costos -->
    <div v-if="mostrarModalHistorial" class="modal-overlay">
      <div class="modal-content modal-historial">
        <h3>Historial de Costos - {{ medidaSeleccionadaHistorial }}</h3>
        <div class="historial-container">
          <div v-if="cargandoHistorial" class="loading-historial">
            <p><i class="fas fa-spinner fa-spin"></i> Cargando historial...</p>
          </div>
          <div v-else-if="historialCostos.length === 0" class="no-historial">
            <p>No hay historial de costos para esta medida.</p>
          </div>
          <div v-else class="historial-list">
                        <div v-for="entrada in historialCostos" :key="entrada.id" class="historial-item" :class="{ eliminado: entrada.eliminado, restaurado: entrada.restaurado, medidaEliminada: entrada.medidaEliminada, nuevo: entrada.nuevo }">
              <div class="historial-info">
                <div class="historial-costo">
                  <strong>${{ entrada.costoBase.toFixed(2) }}</strong>
                  <span v-if="entrada.eliminado" class="estado-badge eliminado">Eliminado</span>
                  <span v-if="entrada.restaurado" class="estado-badge restaurado">Restaurado</span>
                  <span v-if="entrada.medidaEliminada" class="estado-badge medida-eliminada">Medida Eliminada</span>
                  <span v-if="entrada.nuevo" class="estado-badge nuevo">Nueva Medida</span>
                </div>
                <div class="historial-fecha">
                  {{ formatearFechaCompleta(entrada.fecha) }}
                </div>
                <div v-if="entrada.observacion" class="historial-observacion">
                  <em>{{ entrada.observacion }}</em>
                </div>
              </div>
              <div class="historial-actions">
                <button @click="eliminarEntradaHistorial(entrada)" class="btn-eliminar-entrada" :title="'Eliminar esta entrada del historial'">
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-buttons">
          <button @click="cerrarModalHistorial" class="btn-cancelar">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getFirestore, doc, getDoc, updateDoc, collection, onSnapshot, setDoc, addDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { debounce } from 'lodash';
import CostoModal from './CostoModal.vue';
import MedidaModal from './MedidaModal.vue';

export default {
  name: 'GestionCostos',
  
  components: {
    CostoModal,
    MedidaModal
  },
  
  data() {
    return {
      embarqueData: null,
      medidasEmbarque: [],
      costosRegistrados: {},
      costosEmbarque: {},
      medidaSeleccionada: {},
      medidaOculta: {}, // Para el sistema de ocultación en PDF
      rendimientos: {},
      costoExtra: 18, // Valor por defecto
      mostrarModalNuevaMedida: false,
      mostrarModalNuevoCosto: false,
      mostrarModalEditarCosto: false,
      mostrarModalCostoEmbarque: false,
      mostrarModalHistorial: false,
      medidaSeleccionadaHistorial: '',
      historialCostos: [],
      cargandoHistorial: false,
      nuevaMedida: {
        nombre: '',
        costo: 0
      },
      costoEditando: {
        medida: '',
        costo: 0,
        costoAnterior: null,
        fechaUltimaActualizacion: ''
      },
      costoEmbarqueEditando: {
        medida: '',
        costo: 0
      },
      unsubscribePreciosGlobales: null
    }
  },

  async created() {
    await this.cargarEmbarque();
    await this.iniciarEscuchaPreciosGlobales();
    // Aplicar debounce al método guardarCostoExtra
    this.guardarCostoExtraDebounced = debounce(this.guardarCostoExtra, 500);
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
          
          // Si el embarque no tiene fecha, establecer la fecha actual
          if (!this.embarqueData.fecha) {
            this.embarqueData.fecha = new Date().toISOString().split('T')[0];
            // Guardar la fecha en el embarque
            await updateDoc(embarqueRef, {
              fecha: this.embarqueData.fecha
            });
          }
          
          this.obtenerMedidasEmbarque();
          this.medidaSeleccionada = this.embarqueData.medidaSeleccionada || {};
          this.medidaOculta = this.embarqueData.medidaOculta || {}; // Cargar configuración de ocultación
          this.costosEmbarque = this.embarqueData.costosPorMedida || {};
          this.costoExtra = this.embarqueData.costoExtra || 18;
          this.calcularRendimientos();
          // Aplicar costos de medidas registradas automáticamente
          await this.aplicarCostosRegistrados();
        }
      } catch (error) {
        console.error('Error al cargar el embarque:', error);
      }
    },

    obtenerMedidasEmbarque() {
      if (!this.embarqueData || !this.embarqueData.clientes) return;
      
      const medidasSet = new Set();
      
      this.embarqueData.clientes.forEach(cliente => {
        // Procesar productos normales
        cliente.productos.forEach(producto => {
          if (producto.medida) {
            let nombreMedida = producto.medida;
            
            // Aplicar lógica de Ozuna si aplica
            if (cliente.nombre === 'Ozuna' && !producto.esVenta) {
              nombreMedida = `${producto.medida} Maquila Ozuna`;
            }
            
            medidasSet.add(nombreMedida);
          }
        });

        // Procesar crudos también
        if (cliente.crudos && Array.isArray(cliente.crudos)) {
          cliente.crudos.forEach(crudo => {
            if (crudo && crudo.items && Array.isArray(crudo.items)) {
              crudo.items.forEach(item => {
                if (item.talla) {
                  medidasSet.add(item.talla);
                }
              });
            }
          });
        }
      });
      
      this.medidasEmbarque = Array.from(medidasSet);
    },

    calcularRendimientos() {
      if (!this.embarqueData || !this.embarqueData.kilosCrudos) return;
      
      this.medidasEmbarque.forEach(medida => {
        const totalEmbarcado = this.obtenerTotalEmbarcado(medida);
        if (totalEmbarcado > 0) {
          let kilosCrudos;
          const kilosCrudosData = this.embarqueData.kilosCrudos[medida];
          
          if (this.esMedidaMix(medida) && kilosCrudosData) {
            kilosCrudos = Number(kilosCrudosData.medida1 || 0) + Number(kilosCrudosData.medida2 || 0);
          } else {
            kilosCrudos = Number(kilosCrudosData || 0);
          }
          
          this.$set(this.rendimientos, medida, kilosCrudos / totalEmbarcado);
        }
      });
    },

    obtenerTotalEmbarcado(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      const esOzuna = medida.includes('Maquila Ozuna');
      const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
      
      return this.embarqueData.clientes.reduce((total, cliente) => {
        return total + cliente.productos
          .filter(p => {
            if (!p.medida) return false;
            
            if (esOzuna) {
              return p.medida.toLowerCase().trim() === medidaBase && 
                     cliente.nombre === 'Ozuna' && 
                     !p.esVenta;
            } else {
              return p.medida.toLowerCase().trim() === medidaBase && 
                     (cliente.nombre !== 'Ozuna' || p.esVenta);
            }
          })
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

    calcularTotalTaras(producto) {
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

    esMedidaMix(medida) {
      return medida.toLowerCase().includes('mix');
    },

    calcularCostoFinal(medida) {
      const costo = Number(this.costosEmbarque[medida]) || 0;
      const rendimientoOriginal = Number(this.rendimientos[medida]) || 0;
      // Usar rendimiento redondeado a 2 decimales (igual que se muestra en la UI)
      const rendimiento = Math.round(rendimientoOriginal * 100) / 100;
      const costoExtra = Number(this.costoExtra) || 18;
      
      // Para medidas de Ozuna maquila, no agregar costo extra ya que no son ventas directas
      const esMedidaOzunaMaquila = medida.includes('Maquila Ozuna');
      
      // Solo sumar costo extra si la medida tiene formato numérico (ej: "51/60", "20/30")
      // No sumar para medidas de texto (ej: "macuil", "pulpa", etc.) ni para Ozuna Maquila
      const esMedidaNumerica = /^\d+\/\d+$/.test(medida.trim()) || /^\d+$/.test(medida.trim());
      
      let resultado;
      if (esMedidaOzunaMaquila || !esMedidaNumerica) {
        resultado = Math.round(costo * rendimiento);
      } else {
        resultado = Math.round((costo * rendimiento) + costoExtra);
      }
      
      return resultado.toFixed(1);
    },

    async iniciarEscuchaPreciosGlobales() {
      try {
        const db = getFirestore();
        const historialRef = collection(db, 'historial_costos');
        
        this.unsubscribePreciosGlobales = onSnapshot(historialRef, (snapshot) => {
          const historialCompleto = [];
          
          // Recopilar todo el historial
          snapshot.forEach(doc => {
            const data = doc.data();
            historialCompleto.push({
              ...data,
              id: doc.id
            });
          });
          
          // Ordenar por fecha descendente
          historialCompleto.sort((a, b) => {
            const fechaA = new Date(a.fecha);
            const fechaB = new Date(b.fecha);
            return fechaB - fechaA;
          });
          
          // Obtener la fecha del embarque
          const fechaEmbarque = this.embarqueData?.fecha || new Date().toISOString().split('T')[0];
          
          // Obtener solo los costos válidos para la fecha del embarque
          const costosActuales = {};
          const medidasProcesadas = new Set();
          
          historialCompleto.forEach(entrada => {
            if (!medidasProcesadas.has(entrada.medida)) {
              // Verificar si la fecha del costo es válida para el embarque
              const fechaCosto = new Date(entrada.fecha);
              const fechaEmb = new Date(fechaEmbarque);
              
              if (fechaCosto <= fechaEmb && !entrada.eliminado && !entrada.medidaEliminada) {
                costosActuales[entrada.medida] = {
                  costoBase: entrada.costoBase,
                  fecha: entrada.fecha,
                  timestamp: entrada.timestamp,
                  id: entrada.id
                };
                medidasProcesadas.add(entrada.medida);
              }
            }
          });
          
          // Actualizar costos registrados
          this.costosRegistrados = { ...costosActuales };
          
          // Aplicar costos de medidas registradas si ya tenemos datos del embarque
          if (this.embarqueData) {
            this.aplicarCostosRegistrados().catch(error => {
              console.error('Error al aplicar costos registrados:', error);
            });
          }
        });
      } catch (error) {
        console.error('Error al iniciar escucha de historial:', error);
      }
    },

    abrirModalNuevoCosto() {
      this.mostrarModalNuevaMedida = true;
      this.nuevaMedida = { nombre: '', costo: 0 };
    },

    cerrarModalNuevaMedida() {
      this.mostrarModalNuevaMedida = false;
      this.nuevaMedida = { nombre: '', costo: 0 };
    },

    siguienteNuevaMedida(nombreMedida) {
      this.nuevaMedida.nombre = nombreMedida;
      this.mostrarModalNuevaMedida = false;
      this.mostrarModalNuevoCosto = true;
    },

    cerrarModalNuevoCosto() {
      this.mostrarModalNuevoCosto = false;
      this.nuevaMedida = { nombre: '', costo: 0 };
    },

    async guardarNuevoCosto(data) {
      if (!this.nuevaMedida.nombre.trim()) {
        alert('Por favor ingrese el nombre de la medida');
        return;
      }

      try {
        const db = getFirestore();
        const fecha = new Date(data.fecha);
        fecha.setHours(12, 0, 0, 0); // Establecer la hora a 12:00 PM
        
        // Solo agregar al historial (no más precios_globales)
        await addDoc(collection(db, 'historial_costos'), {
          medida: this.nuevaMedida.nombre,
          costoBase: Number(data.costo || 0),
          timestamp: fecha,
          fecha: data.fecha,
          nuevo: true
        });

        this.cerrarModalNuevoCosto();
        console.log('Nuevo costo guardado correctamente');
      } catch (error) {
        console.error('Error al guardar el nuevo costo:', error);
        alert('Error al guardar el costo');
      }
    },

    editarCosto(medida) {
      const costoInfo = this.costosRegistrados[medida];
      this.costoEditando = {
        medida: medida,
        costo: costoInfo.costoBase,
        costoAnterior: costoInfo.costoBase,
        fechaUltimaActualizacion: this.formatearFecha(costoInfo.fecha)
      };
      this.mostrarModalEditarCosto = true;
    },

    cerrarModalEditarCosto() {
      this.mostrarModalEditarCosto = false;
      this.costoEditando = {
        medida: '',
        costo: 0,
        costoAnterior: null,
        fechaUltimaActualizacion: ''
      };
    },

    async guardarCostoEditado(data) {
      try {
        const db = getFirestore();
        const medida = this.costoEditando.medida;
        
        const fecha = new Date(data.fecha);
        fecha.setHours(12, 0, 0, 0); // Establecer la hora a 12:00 PM
        
        // Solo agregar entrada al historial
        await addDoc(collection(db, 'historial_costos'), {
          medida: medida,
          costoBase: Number(data.costo),
          fecha: data.fecha,
          timestamp: fecha
        });

        this.cerrarModalEditarCosto();
        console.log('Costo actualizado correctamente');
      } catch (error) {
        console.error('Error al actualizar el costo:', error);
        alert('Error al actualizar el costo');
      }
    },

    async eliminarMedida(medida) {
      if (confirm(`¿Está seguro de eliminar completamente la medida "${medida}" y todo su historial?`)) {
        try {
          const db = getFirestore();
          
          // Eliminar inmediatamente de la interfaz local
          this.$delete(this.costosRegistrados, medida);
          
          // Eliminar TODO el historial de esta medida
          const historialRef = collection(db, 'historial_costos');
          const q = query(historialRef, where('medida', '==', medida));
          const snapshot = await getDocs(q);
          
          // Eliminar cada entrada del historial
          const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);

          console.log(`Medida "${medida}" y todo su historial eliminados correctamente`);
        } catch (error) {
          console.error('Error al eliminar la medida:', error);
          alert('Error al eliminar la medida');
        }
      }
    },

    async eliminarEntradaHistorial(entrada) {
      if (confirm(`¿Está seguro de eliminar esta entrada del historial ($${entrada.costoBase.toFixed(2)} - ${this.formatearFecha(entrada.fecha)})?`)) {
        try {
          const db = getFirestore();
          
          // Eliminar la entrada específica del historial
          await deleteDoc(doc(db, 'historial_costos', entrada.id));
          
          // Remover de la lista local
          this.historialCostos = this.historialCostos.filter(item => item.id !== entrada.id);
          
          console.log('Entrada del historial eliminada correctamente');
          
          // El listener se encargará de actualizar los costos actuales automáticamente
        } catch (error) {
          console.error('Error al eliminar entrada del historial:', error);
          alert('Error al eliminar la entrada del historial');
        }
      }
    },

    editarCostoEmbarque(medida) {
      this.costoEmbarqueEditando = {
        medida: medida,
        costo: this.costosEmbarque[medida] || 0
      };
      this.mostrarModalCostoEmbarque = true;
    },

    cerrarModalCostoEmbarque() {
      this.mostrarModalCostoEmbarque = false;
      this.costoEmbarqueEditando = {
        medida: '',
        costo: 0
      };
    },

    async guardarCostoEmbarque(nuevoCosto) {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        const medida = this.costoEmbarqueEditando.medida;
        
        // Actualizar el costo local
        if (nuevoCosto !== null) {
          this.$set(this.costosEmbarque, medida, Number(nuevoCosto));
        } else {
          // Si es null, eliminar el costo
          this.$delete(this.costosEmbarque, medida);
        }
        
        // Guardar en Firebase
        await updateDoc(embarqueRef, {
          costosPorMedida: this.costosEmbarque
        });

        this.cerrarModalCostoEmbarque();
        console.log('Costo del embarque actualizado correctamente');
      } catch (error) {
        console.error('Error al actualizar el costo del embarque:', error);
        alert('Error al actualizar el costo del embarque');
      }
    },

    async guardarSeleccionMedidas() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          medidaSeleccionada: this.medidaSeleccionada
        });

        console.log('Selección de medidas guardada correctamente');
      } catch (error) {
        console.error('Error al guardar la selección de medidas:', error);
      }
    },

    async guardarCostoExtra() {
      try {
        const db = getFirestore();
        const embarqueId = this.$route.params.id;
        const embarqueRef = doc(db, 'embarques', embarqueId);
        
        await updateDoc(embarqueRef, {
          costoExtra: Number(this.costoExtra) || 18
        });

        console.log('Costo extra guardado correctamente');
      } catch (error) {
        console.error('Error al guardar el costo extra:', error);
      }
    },

    volverAEmbarque() {
      this.$router.push({
        name: 'EditarEmbarque',
        params: { id: this.$route.params.id }
      });
    },

    volverARendimientos() {
      this.$router.push({
        name: 'Rendimientos',
        params: { id: this.$route.params.id }
      });
    },



    async aplicarCostosRegistrados() {
      // Aplicar costos de medidas registradas automáticamente a las medidas del embarque
      let costosActualizados = false;
      
      this.medidasEmbarque.forEach(medida => {
        if (this.costosRegistrados[medida]) {
          const costoRegistrado = this.costosRegistrados[medida].costoBase;
          const costoEmbarque = this.costosEmbarque[medida];
          
          // Actualizar si no hay costo asignado o si hay diferencia con el costo registrado
          if (!costoEmbarque || costoEmbarque !== costoRegistrado) {
            this.$set(this.costosEmbarque, medida, costoRegistrado);
            costosActualizados = true;
            console.log(`Actualizando costo de ${medida}: ${costoEmbarque} -> ${costoRegistrado}`);
          }
        }
      });

      // Guardar automáticamente en Firebase si hubo cambios
      if (costosActualizados) {
        try {
          const db = getFirestore();
          const embarqueId = this.$route.params.id;
          const embarqueRef = doc(db, 'embarques', embarqueId);
          
          await updateDoc(embarqueRef, {
            costosPorMedida: this.costosEmbarque
          });
          
          console.log('Costos sincronizados correctamente');
        } catch (error) {
          console.error('Error al guardar costos aplicados:', error);
        }
      }
    },

    async verHistorial(medida) {
      this.medidaSeleccionadaHistorial = medida;
      this.mostrarModalHistorial = true;
      this.cargandoHistorial = true;
      
      try {
        const db = getFirestore();
        const historialRef = collection(db, 'historial_costos');
        
        // Consulta simple sin ordenamiento para evitar índice compuesto
        const q = query(
          historialRef,
          where('medida', '==', medida)
        );
        
        const snapshot = await getDocs(q);
        const historialData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Ordenar en el cliente por timestamp descendente
        this.historialCostos = historialData.sort((a, b) => {
          const timestampA = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const timestampB = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return timestampB - timestampA;
        });
        
      } catch (error) {
        console.error('Error al cargar historial:', error);
        this.historialCostos = [];
      } finally {
        this.cargandoHistorial = false;
      }
    },

    cerrarModalHistorial() {
      this.mostrarModalHistorial = false;
      this.medidaSeleccionadaHistorial = '';
      this.historialCostos = [];
      this.cargandoHistorial = false;
    },

    async sincronizarCostos() {
      try {
        await this.aplicarCostosRegistrados();
        alert('Costos sincronizados con los valores más recientes.');
      } catch (error) {
        console.error('Error al sincronizar costos:', error);
        alert('Error al sincronizar costos.');
      }
    },


    formatearFecha(fecha) {
      if (!fecha) return 'N/A';
      
      try {
        // Si es una fecha string, usarla directamente
        if (typeof fecha === 'string') {
          const [year, month, day] = fecha.split('-');
          return `${day}/${month}/${year}`;
        }
        
        // Si es un timestamp de Firebase
        if (fecha.toDate && typeof fecha.toDate === 'function') {
          fecha = fecha.toDate();
        } else if (fecha.seconds) {
          fecha = new Date(fecha.seconds * 1000);
        }
        
        // Si es un objeto Date
        if (fecha instanceof Date) {
          const day = fecha.getDate().toString().padStart(2, '0');
          const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
          const year = fecha.getFullYear();
          return `${day}/${month}/${year}`;
        }
        
        return 'Fecha inválida';
      } catch (error) {
        console.error('Error al formatear fecha:', error);
        return 'Error en fecha';
      }
    },

    formatearFechaCompleta(fecha) {
      if (!fecha) return 'N/A';
      
      try {
        // Si es una fecha string, convertirla a Date
        if (typeof fecha === 'string') {
          const [year, month, day] = fecha.split('-');
          return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        
        // Si es un timestamp de Firebase
        if (fecha.toDate && typeof fecha.toDate === 'function') {
          fecha = fecha.toDate();
        } else if (fecha.seconds) {
          fecha = new Date(fecha.seconds * 1000);
        }
        
        // Si es un objeto Date
        if (fecha instanceof Date) {
          return fecha.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        
        return 'Fecha inválida';
      } catch (error) {
        console.error('Error al formatear fecha completa:', error);
        return 'Error en fecha';
      }
    }
  },

  computed: {
    // Filtrar medidas que NO están marcadas para ocultar en PDF
    medidasVisibles() {
      return this.medidasEmbarque.filter(medida => !this.medidaOculta[medida]);
    }
  },

  beforeDestroy() {
    if (this.unsubscribePreciosGlobales) {
      this.unsubscribePreciosGlobales();
    }
    if (this.guardarCostoExtraDebounced && this.guardarCostoExtraDebounced.cancel) {
      this.guardarCostoExtraDebounced.cancel();
    }
  }
}
</script>

<style scoped>
.gestion-costos-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-container {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #eee;
}

.header-container h2 {
  flex: 1;
  margin: 0;
  color: #2c3e50;
}

.btn-volver, .btn-nuevo-costo, .btn-rendimientos {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-volver {
  background-color: #3498db;
  color: white;
}

.btn-volver:hover {
  background-color: #2980b9;
}

.btn-rendimientos {
  background-color: #9b59b6;
  color: white;
}

.btn-rendimientos:hover {
  background-color: #8e44ad;
}

.btn-nuevo-costo {
  background-color: #2ecc71;
  color: white;
}

.btn-nuevo-costo:hover {
  background-color: #27ae60;
}

.btn-volver i, .btn-nuevo-costo i, .btn-rendimientos i {
  margin-right: 10px;
}

.costos-section, .medidas-embarque-section {
  margin-bottom: 40px;
}

.costos-section h3, .medidas-embarque-section h3 {
  color: #2c3e50;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.costos-grid, .medidas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.costo-card, .medida-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.costo-header, .medida-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.costo-header h4, .medida-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.1em;
}

.costo-actions {
  display: flex;
  gap: 8px;
}

.btn-eliminar, .btn-historial {
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-size: 0.9em;
}

.btn-eliminar {
  background-color: #e74c3c;
}

.btn-eliminar:hover {
  background-color: #c0392b;
}

.btn-historial {
  background-color: #3498db;
}

.btn-historial:hover {
  background-color: #2980b9;
}

.costo-info, .medida-info {
  margin-top: 10px;
}

.costo-info p, .medida-info p {
  margin: 8px 0;
  color: #555;
}

.btn-editar-costo, .btn-editar-costo-embarque {
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-size: 0.9em;
  margin-top: 8px;
}

.btn-editar-costo:hover, .btn-editar-costo-embarque:hover {
  background-color: #2980b9;
}

.costo-valor {
  margin-bottom: 8px;
}

.costo-actual {
  color: #2c3e50;
  font-size: 0.95em;
}

.sin-costo {
  color: #666;
  font-style: italic;
  font-size: 0.9em;
}

.costo-calculado {
  margin-top: 8px;
  padding: 6px;
  background-color: #f0f8f0;
  border-radius: 4px;
  color: #27ae60;
  font-size: 0.9em;
  border-left: 3px solid #27ae60;
}

.checkbox-container {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 0.9em;
  color: #666;
}

.checkbox-container input[type="checkbox"] {
  margin-right: 8px;
}

.costo-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.costo-calculado {
  color: #2c3e50;
  font-weight: bold;
  font-size: 0.9em;
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



.modal-historial {
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.historial-container {
  max-height: 400px;
  overflow-y: auto;
  margin: 15px 0;
}

.no-historial, .loading-historial {
  text-align: center;
  color: #666;
  padding: 20px;
}

.loading-historial i {
  margin-right: 8px;
  color: #3498db;
}

.historial-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.historial-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background-color: #f9f9f9;
}

.historial-item.eliminado {
  background-color: #ffebee;
  border-color: #ffcdd2;
}

.historial-item.restaurado {
  background-color: #e8f5e8;
  border-color: #c8e6c9;
}

.historial-item.medidaEliminada {
  background-color: #fce4ec;
  border-color: #f8bbd9;
}

.historial-item.nuevo {
  background-color: #e3f2fd;
  border-color: #bbdefb;
}

.historial-info {
  flex: 1;
}

.historial-costo {
  font-size: 1.1em;
  color: #2c3e50;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.historial-fecha {
  font-size: 0.9em;
  color: #666;
}

.estado-badge {
  font-size: 0.8em;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
  text-transform: uppercase;
}

.estado-badge.eliminado {
  background-color: #ffcdd2;
  color: #d32f2f;
}

.estado-badge.restaurado {
  background-color: #c8e6c9;
  color: #388e3c;
}

.estado-badge.medida-eliminada {
  background-color: #f8bbd9;
  color: #ad1457;
}

.estado-badge.nuevo {
  background-color: #bbdefb;
  color: #1976d2;
}

.historial-actions {
  display: flex;
  gap: 8px;
}



.btn-eliminar-entrada {
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  font-size: 0.9em;
}

.btn-eliminar-entrada:hover {
  background-color: #c0392b;
}

.historial-observacion {
  margin-top: 4px;
  color: #666;
  font-size: 0.85em;
}

/* Estilos para el campo de costo extra */
.costo-extra-section {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 15px;
  border: 1px solid #e9ecef;
}

.costo-extra-section label {
  font-weight: bold;
  color: #2c3e50;
  font-size: 0.95em;
  white-space: nowrap;
}

.input-costo-extra {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95em;
  width: 100px;
  background-color: white;
  transition: border-color 0.3s ease;
}

.input-costo-extra:focus {
  outline: none;
  border-color: #3498db;
}

.input-help {
  font-size: 0.8em;
  color: #666;
  font-style: italic;
}

.seccion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.btn-sincronizar {
  background-color: #f39c12;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 8px 15px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn-sincronizar:hover {
  background-color: #e67e22;
}

.btn-sincronizar i {
  margin-right: 0;
}


@media (max-width: 768px) {
  .costos-grid, .medidas-grid {
    grid-template-columns: 1fr;
  }
  
  .header-container {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .seccion-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .btn-sincronizar {
    width: 100%;
    justify-content: center;
  }
  
  .costo-actions {
    flex-direction: column;
    gap: 5px;
  }
  
  .btn-editar-costo, .btn-editar-costo-embarque {
    width: 100%;
    text-align: center;
  }
  
  .costo-container {
    flex-direction: column;
    align-items: stretch;
  }
  
  .historial-item {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  
  .historial-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .btn-eliminar-entrada {
    padding: 8px 12px;
    margin-top: 5px;
  }
  
  .input-costo-extra {
    width: 80px;
  }
  
  .costo-extra-section {
    padding: 10px;
    flex-wrap: wrap;
  }
}
</style> 