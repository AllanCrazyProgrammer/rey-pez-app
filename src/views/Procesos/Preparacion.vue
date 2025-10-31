<template>
  <div class="preparacion-container">
    <!-- Componente de búsqueda de medidas -->
    <BuscadorMedidas />

    <div class="header">
      <div class="header-left">
        <h1>Preparación</h1>
        <div class="dias-dropdown">
          <button @click="toggleDiasList" class="dropdown-button">
            {{ diaSeleccionado ? formatearFecha(diaSeleccionado.fecha) : 'Seleccionar Día' }}
            <i :class="['fas', diasListOpen ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
          </button>
          <transition name="slide">
            <div v-if="diasListOpen" class="dias-dropdown-content">
              <div 
                v-for="dia in diasOrdenados" 
                :key="dia.id" 
                class="dia-option"
                :class="{ 'selected': diaSeleccionado && diaSeleccionado.id === dia.id }"
                @click="seleccionarDia(dia)"
              >
                {{ formatearFecha(dia.fecha) }}
              </div>
            </div>
          </transition>
        </div>
      </div>
      <div class="header-actions">
        <button 
          v-if="embarqueId" 
          @click="volverAEmbarque" 
          class="btn-volver-embarque"
        >
          <i class="fas fa-arrow-left"></i> Volver al Embarque
        </button>
        <GestionProveedores @proveedores-actualizados="cargarProveedores" />
        <button @click="mostrarModalNuevoDia" class="btn-nuevo">
          <i class="fas fa-plus"></i> Nuevo Día
        </button>
        <button 
          v-if="diaSeleccionado" 
          @click="confirmarBorrarDia(diaSeleccionado)" 
          class="btn-eliminar-dia"
        >
          <i class="fas fa-trash"></i> Eliminar Día
        </button>
      </div>
    </div>

    <!-- Layout principal con tabla de medidas y tabla de rendimientos -->
    <div v-if="diaSeleccionado" class="preparacion-layout">
      <!-- Tabla de medidas del día seleccionado -->
      <div class="tabla-container">
      <table>
        <thead>
          <tr>
            <th class="sticky-col-1">Medida</th>
            <th class="sticky-col-2">Proveedor</th>
            <th>Día/Noche</th>
            <th>Tinas/Baños</th>
            <th>Cajas/Kg</th>
            <th>Cal</th>
            <th>Sal</th>
            <th>%</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(medida, index) in diaSeleccionado.medidas" :key="index">
            <td class="sticky-col-1">
              <!-- Input de texto para medidas generadas desde rendimientos -->
              <input 
                v-if="medida.desdeRendimiento"
                type="text" 
                v-model="medida.medida" 
                class="form-control medida-input-rendimiento"
                @change="guardarCambios(diaSeleccionado)"
                placeholder="Medida desde rendimiento"
              >
              <!-- Select normal para medidas manuales -->
              <select 
                v-else
                v-model="medida.medida" 
                class="form-control medida-select"
                @change="guardarCambios(diaSeleccionado)"
              >
                <option value="">Seleccionar medida</option>
                <option v-for="m in medidasDisponibles" :key="m" :value="m">
                  {{ m }}
                </option>
              </select>
            </td>
            <td class="sticky-col-2">
              <select 
                v-model="medida.proveedor" 
                class="form-control proveedor-select"
                @change="guardarCambios(diaSeleccionado)"
              >
                <option value="">Sin proveedor</option>
                <option v-for="p in proveedoresDisponibles" :key="p" :value="p">
                  {{ p }}
                </option>
              </select>
            </td>
            <td>
              <select 
                v-model="medida.diaNoche" 
                class="form-control"
                @change="guardarCambios(diaSeleccionado)"
              >
                <option value="">Seleccionar</option>
                <option value="Día">Día</option>
                <option value="Noche">Noche</option>
              </select>
            </td>
            <td>
              <select 
                v-model="medida.tinas" 
                class="form-control"
                @change="guardarCambios(diaSeleccionado)"
              >
                <option value="">Seleccionar</option>
                <option value="Tina">Tina</option>
                <option value="Baño">Baño</option>
              </select>
            </td>
            <td>
              <input 
                type="number" 
                v-model="medida.cajas" 
                placeholder=""
                @change="guardarCambios(diaSeleccionado)"
                class="form-control"
              >
            </td>
            <td>
              <select 
                v-model="medida.cal" 
                class="form-control"
                @change="guardarCambios(diaSeleccionado)"
              >
                <option value="">Seleccionar</option>
                <option v-for="c in calDisponible" :key="c" :value="c">{{ c }}</option>
              </select>
            </td>
            <td>
              <select 
                v-model="medida.sal" 
                class="form-control"
                @change="guardarCambios(diaSeleccionado)"
              >
                <option value="">Seleccionar</option>
                <option v-for="s in salDisponible" :key="s" :value="s">{{ s }}</option>
              </select>
            </td>
            <td>
              <input 
                type="text" 
                v-model="medida.porcentaje" 
                placeholder=""
                @change="guardarCambios(diaSeleccionado)"
                class="form-control porcentaje-input"
              >
            </td>
            <td>
              <button 
                @click="eliminarMedidaExistente(diaSeleccionado, index)" 
                class="btn-delete"
                v-if="diaSeleccionado.medidas.length > 1"
              >
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      
        <div class="botones-container">
          <button @click="agregarMedidaExistente(diaSeleccionado)" class="btn-agregar">
            <i class="fas fa-plus"></i> Agregar Medida
          </button>
          <button 
            v-if="embarqueData && rendimientosEmbarque.length > 0" 
            @click="generarMedidasDesdeRendimientos(diaSeleccionado)" 
            class="btn-generar-rendimientos"
          >
            <i class="fas fa-magic"></i> Generar desde Rendimientos
          </button>
        </div>
      </div>
      
      <!-- Tabla de rendimientos del lado derecho -->
      <div v-if="embarqueData" class="tabla-rendimientos-container">
        <div class="tabla-rendimientos-header">
          <h3>📊 Rendimientos del Embarque</h3>
          <p class="fecha-embarque">{{ formatearFecha(embarqueData?.fecha) }}</p>
        </div>
        
        <div v-if="!embarqueData" class="loading-rendimientos">
          <p>Cargando datos del embarque...</p>
        </div>
        
        <div v-else-if="rendimientosEmbarque.length === 0" class="sin-rendimientos">
          <p>No hay datos de rendimientos disponibles</p>
        </div>
        
        <div v-else class="tabla-rendimientos-wrapper">
          <table class="tabla-rendimientos">
            <thead>
              <tr>
                <th>Medida</th>
                <th>Rendimiento</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(rendimiento, index) in rendimientosEmbarque" 
                  :key="index">
                <td class="medida-nombre">
                  {{ rendimiento.medida }}
                </td>
                <td class="rendimiento-valor" 
                    :class="{ 'rendimiento-alto': rendimiento.rendimiento > 1 }">
                  {{ rendimiento.rendimiento.toFixed(2) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Estadísticas simplificadas -->
        <div v-if="rendimientosEmbarque.length > 0" class="estadisticas-rendimientos">
          <div class="estadistica-item">
            <span class="estadistica-label">Total Medidas:</span>
            <span class="estadistica-valor">{{ rendimientosEmbarque.length }}</span>
          </div>
          <div class="estadistica-item estadistica-destacada">
            <span class="estadistica-label">Rendimiento Promedio:</span>
            <span class="estadistica-valor">{{ calcularRendimientoPromedio().toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Mensaje cuando no hay día seleccionado -->
    <div v-else class="no-dia-seleccionado">
      <p>Selecciona un día existente o crea uno nuevo para comenzar.</p>
    </div>

    <!-- Modal para nuevo día -->
    <b-modal v-model="showModal" title="Nuevo Día de Preparación" size="md" @ok="crearNuevoDia" @show="inicializarNuevoDia">
      <div class="modal-content">
        <div class="fecha-container">
          <b-form-group label="Fecha del día de preparación:">
            <b-form-input
              type="date"
              v-model="nuevoDia.fecha"
              required
              class="fecha-input"
            ></b-form-input>
          </b-form-group>
          
          <div class="info-mensaje">
            <i class="fas fa-info-circle"></i>
            <span>Podrás agregar las medidas después de crear el día</span>
          </div>
        </div>
      </div>
    </b-modal>
  </div>
</template>

<script>
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, orderBy } from 'firebase/firestore'
import BuscadorMedidas from '@/components/BuscadorMedidas.vue'
import GestionProveedores from '@/components/GestionProveedores.vue'

export default {
  name: 'Preparacion',
  components: {
    BuscadorMedidas,
    GestionProveedores
  },
  data() {
    return {
      dias: [],
      showModal: false,
      nuevoDia: {
        fecha: '',
        medidas: []
      },
      diasListOpen: false,
      diaSeleccionado: null,
      embarqueId: null,
      embarqueData: null,
      rendimientosEmbarque: [],
      medidasDisponibles: [
        'Golfo',
        'Piojo',
        '26/30',
        '36/40',
        '41/50',
        '51/60',
        '61/70',
        '71/90',
        '91/110',
        '21/25',
        'Salmureado',
      ],
      proveedoresDisponibles: [],
      calDisponible: [
        "1/8",
        "1/4",
        "1/4+",
        "1/2",
        "3/4",
        "1"
      ],
      salDisponible: [
        "1/4",
        "1/2",
        "3/4",
        "1"
      ]
    }
  },
  computed: {
    diasOrdenados() {
      return [...this.dias].sort((a, b) => b.timestamp - a.timestamp)
    }
  },
  methods: {
    // Nuevo método para manejar la selección de día
    async aplicarSeleccionDia() {
      console.log('Aplicando selección de día...')
      console.log('Query fecha:', this.$route.query.fecha)
      console.log('Días cargados:', this.dias.length)
      console.log('Días disponibles:', this.dias.map(d => ({ id: d.id, fecha: d.fecha })))
      
      // Si hay un día en la URL, seleccionarlo
      if (this.$route.query.fecha) {
        let fechaBuscada = this.$route.query.fecha
        
        // Convertir Timestamp a string (formato YYYY-MM-DD usando UTC) si es necesario
        if (typeof fechaBuscada === 'object' && fechaBuscada.seconds) {
          const fechaDate = new Date(fechaBuscada.seconds * 1000)
          const y = fechaDate.getUTCFullYear()
          const m = String(fechaDate.getUTCMonth() + 1).padStart(2, '0')
          const d = String(fechaDate.getUTCDate()).padStart(2, '0')
          fechaBuscada = `${y}-${m}-${d}`
          console.log('Fecha convertida de Timestamp (UTC):', fechaBuscada)
        }
        
        console.log('Buscando día con fecha:', fechaBuscada)
        console.log('Tipo de fecha buscada:', typeof fechaBuscada)
        
        const diaEncontrado = this.dias.find(d => d.fecha === fechaBuscada)
        console.log('Día encontrado:', diaEncontrado)
        
        if (diaEncontrado) {
          this.diaSeleccionado = diaEncontrado
          console.log('Día seleccionado automáticamente:', diaEncontrado.fecha)
          // Buscar embarque para esta fecha
          await this.buscarEmbarquePorFecha(diaEncontrado.fecha)
        } else {
          console.log('No se encontró día para la fecha:', fechaBuscada)
          console.log('Fechas disponibles:', this.dias.map(d => d.fecha))
          // Crear automáticamente el día si viene desde un embarque
          await this.crearDiaAutomaticamente(fechaBuscada)
        }
      } else if (this.dias.length > 0) {
        // Si no hay día en la URL, seleccionar el más reciente
        this.diaSeleccionado = this.diasOrdenados[0]
        console.log('Seleccionado día más reciente:', this.diaSeleccionado.fecha)
        // Buscar embarque para esta fecha
        await this.buscarEmbarquePorFecha(this.diaSeleccionado.fecha)
      }
    },
    
    // Método para crear automáticamente un día cuando se navega desde un embarque
    async crearDiaAutomaticamente(fecha) {
      try {
        console.log('Creando día automáticamente para la fecha:', fecha)
        const db = getFirestore()
        
        const [year, month, day] = fecha.split('-')
        const fechaLocal = new Date(year, month - 1, parseInt(day))
        
        const docRef = await addDoc(collection(db, 'preparacion'), {
          fecha: fecha,
          medidas: [],
          createdAt: new Date(),
          timestamp: fechaLocal.getTime()
        })

        const nuevoDiaCreado = {
          id: docRef.id,
          fecha: fecha,
          medidas: [],
          timestamp: fechaLocal.getTime()
        }

        this.dias.push(nuevoDiaCreado)
        
        // Seleccionar el día recién creado automáticamente
        this.diaSeleccionado = nuevoDiaCreado
        console.log('Día creado y seleccionado automáticamente:', fecha)
        
        // Buscar embarque para esta fecha
        await this.buscarEmbarquePorFecha(fecha)
      } catch (error) {
        console.error('Error al crear día automáticamente:', error)
      }
    },
    
    formatearFecha(fecha) {
      if (!fecha) return '';
      
      try {
        let fechaObj;
        
        // Si es un Timestamp de Firebase
        if (typeof fecha === 'object' && fecha.seconds) {
          fechaObj = new Date(fecha.seconds * 1000);
        }
        // Si es un string en formato YYYY-MM-DD
        else if (typeof fecha === 'string' && fecha.includes('-')) {
          const [year, month, day] = fecha.split('-');
          fechaObj = new Date(year, month - 1, day);
        }
        // Si ya es un objeto Date
        else if (fecha instanceof Date) {
          fechaObj = fecha;
        }
        // Si es un timestamp numérico
        else if (typeof fecha === 'number') {
          fechaObj = new Date(fecha);
        }
        // Si es un string pero no en formato esperado, intentar parsearlo
        else if (typeof fecha === 'string') {
          fechaObj = new Date(fecha);
        }
        else {
          console.error('Formato de fecha no reconocido:', fecha);
          return '';
        }
        
        // Verificar si la fecha es válida
        if (isNaN(fechaObj.getTime())) {
          console.error('Fecha inválida:', fecha);
          return '';
        }
        
        return fechaObj.toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (error) {
        console.error('Error al formatear fecha:', fecha, error);
        return '';
      }
    },
    inicializarNuevoDia() {
      const hoy = new Date()
      const offset = hoy.getTimezoneOffset()
      hoy.setMinutes(hoy.getMinutes() - offset)
      
      this.nuevoDia = {
        fecha: hoy.toISOString().split('T')[0],
        medidas: []
      }
    },
    mostrarModalNuevoDia() {
      this.showModal = true
    },
    agregarMedida() {
      this.nuevoDia.medidas.push({
        medida: '',
        proveedor: '',
        diaNoche: '',
        tinas: '',
        cajas: '',
        cal: '',
        sal: '',
        porcentaje: '',
        editando: false
      })
    },
    eliminarMedida(index) {
      this.nuevoDia.medidas.splice(index, 1)
    },
    async crearNuevoDia() {
      try {
        const db = getFirestore()
        
        const [year, month, day] = this.nuevoDia.fecha.split('-')
        const fechaLocal = new Date(year, month - 1, parseInt(day))
        
        const docRef = await addDoc(collection(db, 'preparacion'), {
          fecha: this.nuevoDia.fecha,
          medidas: [],
          createdAt: new Date(),
          timestamp: fechaLocal.getTime()
        })

        const nuevoDiaCreado = {
          id: docRef.id,
          fecha: this.nuevoDia.fecha,
          medidas: [],
          timestamp: fechaLocal.getTime()
        }

        this.dias.push(nuevoDiaCreado)
        
        // Seleccionar el día recién creado automáticamente
        this.diaSeleccionado = nuevoDiaCreado
        this.diasListOpen = false

        this.showModal = false
        console.log('Día creado exitosamente')
      } catch (error) {
        console.error('Error al crear día:', error)
      }
    },
    async guardarCambios(dia) {
      try {
        const db = getFirestore()
        await updateDoc(doc(db, 'preparacion', dia.id), {
          medidas: dia.medidas
        })
        console.log('Cambios guardados exitosamente')
      } catch (error) {
        console.error('Error al guardar cambios:', error)
      }
    },
    async confirmarBorrarDia(dia) {
      if (await this.$bvModal.msgBoxConfirm('¿Estás seguro de que deseas borrar este día?')) {
        try {
          const db = getFirestore()
          await deleteDoc(doc(db, 'preparacion', dia.id))
          this.dias = this.dias.filter(d => d.id !== dia.id)
          console.log('Día eliminado exitosamente')
        } catch (error) {
          console.error('Error al borrar día:', error)
        }
      }
    },
    async eliminarMedidaExistente(dia, index) {
      try {
        dia.medidas.splice(index, 1)
        await this.guardarCambios(dia)
        console.log('Medida eliminada exitosamente')
      } catch (error) {
        console.error('Error al eliminar medida:', error)
      }
    },
    async cargarDias() {
      try {
        const db = getFirestore()
        const q = query(collection(db, 'preparacion'), orderBy('timestamp', 'desc'))
        const querySnapshot = await getDocs(q)
        
        this.dias = querySnapshot.docs.map(doc => {
          const data = doc.data()
          if (!data.timestamp) {
            const [year, month, day] = data.fecha.split('-')
            const fechaLocal = new Date(year, month - 1, parseInt(day))
            data.timestamp = fechaLocal.getTime()
          }
          return {
            id: doc.id,
            ...data,
            medidas: data.medidas.map(m => ({...m, editando: false}))
          }
        })
        console.log('Días cargados exitosamente:', this.dias.length)
        console.log('Fechas de días cargados:', this.dias.map(d => d.fecha))
      } catch (error) {
        console.error('Error al cargar días:', error)
      }
    },
    async agregarMedidaExistente(dia) {
      const nuevaMedida = {
        medida: '',
        proveedor: '',
        diaNoche: '',
        tinas: '',
        cajas: '',
        cal: '',
        sal: '',
        porcentaje: '',
        desdeRendimiento: false
      }
      
      dia.medidas.push(nuevaMedida)
      await this.guardarCambios(dia)
    },

    async generarMedidasDesdeRendimientos(dia) {
      if (!this.rendimientosEmbarque || this.rendimientosEmbarque.length === 0) {
        this.$bvToast.toast('No hay rendimientos disponibles para generar medidas', {
          title: 'Información',
          variant: 'warning',
          solid: true
        })
        return
      }

      // Generar una medida por cada rendimiento encontrado
      const nuevasMedidas = this.rendimientosEmbarque.map(rendimiento => {
        return {
          medida: rendimiento.medida, // El nombre de la medida tal cual está en rendimientos
          proveedor: '',
          diaNoche: '',
          tinas: '',
          cajas: '',
          cal: '',
          sal: '',
          porcentaje: rendimiento.rendimiento.toFixed(2), // Copiar el rendimiento al campo porcentaje
          desdeRendimiento: true // Marca especial para indicar que viene de rendimientos
        }
      })

      // Agregar todas las medidas generadas
      dia.medidas.push(...nuevasMedidas)
      await this.guardarCambios(dia)

      this.$bvToast.toast(`Se generaron ${nuevasMedidas.length} medidas desde los rendimientos del embarque`, {
        title: 'Medidas Generadas',
        variant: 'success',
        solid: true
      })
    },
    toggleDiasList() {
      this.diasListOpen = !this.diasListOpen
    },
    async seleccionarDia(dia) {
      this.diaSeleccionado = dia
      this.diasListOpen = false
      
      // Buscar embarque para esta fecha
      await this.buscarEmbarquePorFecha(dia.fecha)
    },

    volverAEmbarque() {
      if (this.embarqueId) {
        this.$router.push({
          name: 'EditarEmbarque',
          params: { id: this.embarqueId }
        });
      }
    },
    async cargarProveedores() {
      try {
        const db = getFirestore()
        const q = query(collection(db, 'proveedores'), orderBy('nombre'))
        const querySnapshot = await getDocs(q)
        
        this.proveedoresDisponibles = querySnapshot.docs.map(doc => doc.data().nombre)
        console.log('Proveedores cargados:', this.proveedoresDisponibles.length)
      } catch (error) {
        console.error('Error al cargar proveedores:', error)
        // Fallback a proveedores por defecto si hay error
        this.proveedoresDisponibles = ['Ahumada', 'Selecta', 'Tirado', 'Ozuna', 'Mx']
      }
    },
    async migrarProveedoresExistentes() {
      try {
        const proveedoresPorDefecto = ['Ahumada', 'Selecta', 'Tirado', 'Ozuna', 'Mx']
        const db = getFirestore()
        
        // Verificar si ya existen proveedores en la base de datos
        const existingSnapshot = await getDocs(collection(db, 'proveedores'))
        
        if (existingSnapshot.empty) {
          console.log('Migrando proveedores por defecto...')
          
          const promesas = proveedoresPorDefecto.map(nombre => 
            addDoc(collection(db, 'proveedores'), {
              nombre,
              createdAt: new Date(),
              updatedAt: new Date()
            })
          )
          
          await Promise.all(promesas)
          console.log('Proveedores migrados exitosamente')
        }
      } catch (error) {
        console.error('Error al migrar proveedores:', error)
      }
    },

    // Métodos para manejar datos de rendimientos del embarque
    async cargarEmbarque() {
      if (!this.embarqueId) return;
      
      try {
        const db = getFirestore();
        const embarqueRef = doc(db, 'embarques', this.embarqueId);
        // Forzar lectura desde el servidor para obtener datos más actualizados
        const embarqueDoc = await getDoc(embarqueRef);
        
        if (embarqueDoc.exists()) {
          this.embarqueData = embarqueDoc.data();
          console.log('✅ Datos del embarque cargados desde Firebase:', this.embarqueId);
          console.log('Kilos crudos disponibles:', this.embarqueData.kilosCrudos);
          console.log('Número de clientes:', this.embarqueData.clientes?.length || 0);
          console.log('Fecha del embarque:', this.embarqueData.fecha);
          this.calcularRendimientos();
        } else {
          console.error('❌ No se encontró el embarque');
        }
      } catch (error) {
        console.error('❌ Error al cargar el embarque:', error);
      }
    },

    async buscarEmbarquePorFecha(fecha) {
      if (!fecha) return;
      
      try {
        const db = getFirestore();
        const embarquesRef = collection(db, 'embarques');
        const q = query(embarquesRef, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        
        let embarqueEncontrado = null;
        
        querySnapshot.forEach(doc => {
          const data = doc.data();
          let fechaEmbarque = '';
          
          // Normalizar fecha del embarque usando UTC para evitar desfases de zona horaria
          if (typeof data.fecha === 'object' && data.fecha.seconds) {
            const fechaDate = new Date(data.fecha.seconds * 1000);
            const y = fechaDate.getUTCFullYear();
            const m = String(fechaDate.getUTCMonth() + 1).padStart(2, '0');
            const d = String(fechaDate.getUTCDate()).padStart(2, '0');
            fechaEmbarque = `${y}-${m}-${d}`;
          } else if (typeof data.fecha === 'string') {
            fechaEmbarque = data.fecha;
          } else if (data.fecha instanceof Date) {
            // Si es un objeto Date directamente
            const y = data.fecha.getUTCFullYear();
            const m = String(data.fecha.getUTCMonth() + 1).padStart(2, '0');
            const d = String(data.fecha.getUTCDate()).padStart(2, '0');
            fechaEmbarque = `${y}-${m}-${d}`;
          }
          
          // Comparar fechas
          if (fechaEmbarque === fecha && !embarqueEncontrado) {
            embarqueEncontrado = {
              id: doc.id,
              ...data
            };
          }
        });
        
        if (embarqueEncontrado) {
          console.log('Embarque encontrado para la fecha:', fecha, embarqueEncontrado.id);
          this.embarqueId = embarqueEncontrado.id;
          this.embarqueData = embarqueEncontrado;
          this.calcularRendimientos();
        } else {
          console.log('No se encontró embarque para la fecha:', fecha);
          // Limpiar datos si no hay embarque
          this.embarqueId = null;
          this.embarqueData = null;
          this.rendimientosEmbarque = [];
        }
      } catch (error) {
        console.error('Error al buscar embarque por fecha:', error);
      }
    },

    calcularRendimientos() {
      if (!this.embarqueData || !this.embarqueData.clientes) {
        this.rendimientosEmbarque = [];
        return;
      }

      // USAR DIRECTAMENTE LOS DATOS DE RENDIMIENTOS.VUE
      // En lugar de recalcular, obtener los datos que ya están guardados en Firebase
      const medidasUnicas = this.obtenerMedidasUnicas();
      const kilosCrudosGuardados = this.embarqueData.kilosCrudos || {};
      
      console.log('📊 [Preparacion] Usando datos de rendimientos guardados en Firebase');
      
      // Crear array de rendimientos usando los mismos datos que Rendimientos.vue
      const todosLosRendimientos = medidasUnicas.map(medida => {
        // Obtener kilos crudos guardados (mismo que en Rendimientos.vue)
        let kilosCrudos = 0;
        if (this.esMedidaMix(medida)) {
          const kilosCrudosObj = kilosCrudosGuardados[medida];
          if (kilosCrudosObj && typeof kilosCrudosObj === 'object') {
            kilosCrudos = Number(kilosCrudosObj.medida1 || 0) + Number(kilosCrudosObj.medida2 || 0);
          }
        } else {
          kilosCrudos = Number(kilosCrudosGuardados[medida] || 0);
        }

        // Calcular total embarcado usando el MISMO método que Rendimientos.vue
        const totalEmbarcado = this.obtenerTotalEmbarcado(medida);
        
        // Calcular rendimiento (mismo cálculo que Rendimientos.vue)
        const rendimiento = totalEmbarcado > 0 ? kilosCrudos / totalEmbarcado : 0;

        console.log(`📊 ${medida}: ${kilosCrudos} kg crudos / ${totalEmbarcado} kg embarcado = ${rendimiento.toFixed(2)}`);

        return {
          medida: medida,
          totalEmbarcado: totalEmbarcado,
          kilosCrudos: kilosCrudos,
          rendimiento: rendimiento
        };
      });

      // Filtrar solo medidas con datos
      this.rendimientosEmbarque = todosLosRendimientos.filter(r => 
        r.kilosCrudos > 0 && r.totalEmbarcado > 0 && r.rendimiento > 0
      );
      
      console.log(`✅ ${this.rendimientosEmbarque.length} rendimientos cargados correctamente`);
    },

    // Método para obtener medidas únicas (copiado del componente de Rendimientos)
    obtenerMedidasUnicas() {
      if (!this.embarqueData || !this.embarqueData.clientes) return [];
      
      const medidasMap = new Map();
      const mixMedidas = new Map();
      
      this.embarqueData.clientes.forEach(cliente => {
        cliente.productos.forEach(producto => {
          if (producto.medida) {
            const medidaNormalizada = producto.medida.toLowerCase().trim();
            let nombreMedida = producto.medida.trim();
            
            // Solo añadir "Maquila Ozuna" si es de Ozuna y NO es una venta
            if (cliente.nombre === 'Ozuna' && !producto.esVenta) {
              nombreMedida = `${producto.medida.trim()} Maquila Ozuna`;
            }

            if (medidaNormalizada.endsWith('mix')) {
              const baseSize = medidaNormalizada.split(' ')[0];
              mixMedidas.set(baseSize, nombreMedida);
            } else {
              // Usar medidaNormalizada como clave para evitar duplicados
              // pero almacenar el nombreMedida original para mostrar
              if (!medidasMap.has(medidaNormalizada)) {
                medidasMap.set(medidaNormalizada, nombreMedida);
              }
            }
          }
        });
      });

      const mixKeys = Array.from(mixMedidas.keys()).sort();
      if (mixKeys.length >= 2) {
        for (let i = 0; i < mixKeys.length; i += 2) {
          if (i + 1 < mixKeys.length) {
            const combinedName = `${mixKeys[i]}-${mixKeys[i+1]} mix`;
            const combinedNameNormalizado = combinedName.toLowerCase();
            if (!medidasMap.has(combinedNameNormalizado)) {
              medidasMap.set(combinedNameNormalizado, combinedName);
            }
          }
        }
      }
      
      return Array.from(medidasMap.values());
    },

    // Método para obtener total embarcado (copiado del componente de Rendimientos)
    obtenerTotalEmbarcado(medida) {
      if (!this.embarqueData || !this.embarqueData.clientes) return 0;
      
      if (medida.includes('-') && medida.endsWith('mix')) {
        const [medida1, medida2] = medida.split('-').map(m => m.trim());
        const total1 = this.calcularTotalParaMedidaEspecifica(medida1 + ' mix');
        const total2 = this.calcularTotalParaMedidaEspecifica(medida2.replace(' mix', '') + ' mix');
        return total1 + total2;
      }
      
      return this.calcularTotalParaMedidaEspecifica(medida);
    },


    calcularTotalParaMedidaEspecifica(medida) {
      const esOzuna = medida.includes('Maquila Ozuna');
      const medidaBase = medida.replace(' Maquila Ozuna', '').toLowerCase().trim();
      
      console.log(`🔄 [NUEVO CÓDIGO v2] Calculando total para: ${medida}`);
      let detalleProductos = [];
      
      const total = this.embarqueData.clientes.reduce((total, cliente) => {
        return total + cliente.productos
          .filter(p => {
            if (!p.medida) return false;
            
            // Si la medida original es de Ozuna
            if (esOzuna) {
              // Solo incluir si el producto es de cliente Ozuna y NO es una venta
              return p.medida.toLowerCase().trim() === medidaBase && 
                     cliente.nombre === 'Ozuna' && 
                     !p.esVenta;
            } else {
              // Solo incluir si el producto coincide con la medida y NO es de Ozuna o es de Ozuna pero es VENTA
              return p.medida.toLowerCase().trim() === medidaBase && 
                     (cliente.nombre !== 'Ozuna' || p.esVenta);
            }
          })
          .reduce((subtotal, producto) => {
            // INCLUIR productos refrigerados en el cálculo (igual que en Rendimientos.vue)
            let kilosProducto = 0;
            if (producto.tipo === 'c/h20') {
              const totalBolsas = this.calcularTotalBolsas(producto);
              const valorNeto = parseFloat(producto.camaronNeto) || 0.65;
              kilosProducto = totalBolsas * valorNeto;
            } else {
              const sumaKilos = producto.kilos.reduce((sum, kilo) => sum + (Number(kilo) || 0), 0);
              const sumaTaras = this.calcularTotalTaras(producto);
              const descuentoTaras = producto.restarTaras ? sumaTaras * 3 : 0;
              kilosProducto = sumaKilos - descuentoTaras;
            }
            
            detalleProductos.push({
              cliente: cliente.nombre,
              medida: producto.medida,
              kilos: kilosProducto,
              refrigerado: producto.refrigerar || false
            });
            
            return subtotal + kilosProducto;
          }, 0);
      }, 0);
      
      // Log detallado para debug
      if (medida === '51/60 tirado') {
        console.log(`[Preparacion] Detalle para ${medida}:`, detalleProductos);
        console.log(`[Preparacion] Total calculado: ${total}`);
      }
      
      return total;
    },

    obtenerKilosCrudos(medida) {
      // Los kilos crudos se obtienen del embarque si están guardados
      if (!this.embarqueData.kilosCrudos) return 0;
      
      if (this.esMedidaMix(medida)) {
        const kilosCrudos = this.embarqueData.kilosCrudos[medida];
        if (kilosCrudos && typeof kilosCrudos === 'object') {
          return Number(kilosCrudos.medida1 || 0) + Number(kilosCrudos.medida2 || 0);
        }
        return 0;
      } else {
        return Number(this.embarqueData.kilosCrudos[medida] || 0);
      }
    },

    // Método para verificar si es una medida mix
    esMedidaMix(medida) {
      return medida.toLowerCase().includes('mix');
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

    calcularTotalTaras(producto) {
      const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (Number(tara) || 0), 0);
      return tarasNormales + tarasExtra;
    },

    // Calcular rendimiento promedio de todas las medidas
    calcularRendimientoPromedio() {
      if (!this.rendimientosEmbarque || this.rendimientosEmbarque.length === 0) return 0;
      
      let sumaRendimientos = 0;
      let medidasConRendimiento = 0;
      
      this.rendimientosEmbarque.forEach(item => {
        if (item.rendimiento > 0) {
          sumaRendimientos += item.rendimiento;
          medidasConRendimiento++;
        }
      });
      
      return medidasConRendimiento > 0 ? sumaRendimientos / medidasConRendimiento : 0;
    },

    // Calcular total embarcado general de todas las medidas
    calcularTotalEmbarcadoGeneral() {
      if (!this.rendimientosEmbarque || this.rendimientosEmbarque.length === 0) return 0;
      
      return this.rendimientosEmbarque.reduce((total, item) => {
        return total + item.totalEmbarcado;
      }, 0);
    },

    formatearNumero(numero) {
      if (!numero) return '0';
      // Redondear hacia abajo para eliminar decimales
      const numeroSinDecimales = Math.floor(numero);
      // Formatear manualmente con comas para asegurar compatibilidad
      return numeroSinDecimales.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
  },
  async mounted() {
    console.log('🚀 PREPARACION.VUE - VERSIÓN ACTUALIZADA (CON REFRIGERADOS) 🚀');
    // Capturar embarqueId si viene desde un embarque
    if (this.$route.query.embarqueId) {
      this.embarqueId = this.$route.query.embarqueId
      console.log('Viniendo desde embarque:', this.embarqueId)
    }

    await Promise.all([
      this.cargarDias(),
      this.cargarProveedores(),
      this.migrarProveedoresExistentes(),
      this.cargarEmbarque() // Cargar datos del embarque si existe embarqueId
    ])
    
    // Aplicar selección de día después de cargar todos los datos
    await this.aplicarSeleccionDia()
  },

  watch: {
    '$route.query.fecha'(nuevaFecha, fechaAnterior) {
      console.log('Detectado cambio en query.fecha:', { nuevaFecha, fechaAnterior })
      if (nuevaFecha !== fechaAnterior && this.dias.length > 0) {
        this.aplicarSeleccionDia()
      }
    },
    async '$route.query.embarqueId'(nuevoEmbarqueId) {
      this.embarqueId = nuevoEmbarqueId
      console.log('Embarque ID actualizado:', nuevoEmbarqueId)
      // Recargar datos del embarque cuando cambia el ID
      if (nuevoEmbarqueId) {
        await this.cargarEmbarque()
      }
    }
  }
};
</script>

<style scoped>
.preparacion-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 15px;
}

/* Separador visual entre el buscador y la sección principal */
.preparacion-container .header {
  border-top: 2px solid #e9ecef;
  padding-top: 20px;
  margin-top: 20px;
}

/* Layout principal para preparación con tabla de rendimientos */
.preparacion-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 25px;
  margin-top: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header h1 {
  margin: 0;
  font-size: clamp(1.5rem, 4vw, 2rem);
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-volver-embarque {
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
  white-space: nowrap;
}

.btn-volver-embarque:hover {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  transform: translateY(-2px);
}

.btn-nuevo {
  background: linear-gradient(135deg, #2980b9, #3498db);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-nuevo:hover {
  background: linear-gradient(135deg, #3498db, #2980b9);
  transform: translateY(-2px);
}

.btn-eliminar-dia {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-eliminar-dia:hover {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  transform: translateY(-2px);
}

.dias-dropdown {
  position: relative;
  min-width: 300px;
}

.dropdown-button {
  background: white;
  border: 2px solid #3498db;
  color: #2c3e50;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-size: 1em;
  transition: all 0.3s ease;
}

.dropdown-button:hover {
  background: #f8f9fa;
}

.dias-dropdown-content {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin-top: 5px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
}

.dia-option {
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dia-option:hover {
  background: #f8f9fa;
  color: #3498db;
}

.dia-option.selected {
  background: #e8f4fc;
  color: #2980b9;
  font-weight: 500;
}

.tabla-container, .tabla-medidas-container {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-top: 15px;
  background: 
    linear-gradient(to right, white 30%, rgba(255,255,255,0)),
    linear-gradient(to right, rgba(255,255,255,0), white 70%) 100% 0,
    radial-gradient(farthest-side at 0% 50%, rgba(0,0,0,.2), rgba(0,0,0,0)),
    radial-gradient(farthest-side at 100% 50%, rgba(0,0,0,.2), rgba(0,0,0,0)) 100% 0;
  background-repeat: no-repeat;
  background-size: 40px 100%, 40px 100%, 14px 100%, 14px 100%;
  background-position: 0 0, 100% 0, 0 0, 100% 0;
  background-attachment: local, local, scroll, scroll;
}

table {
  width: 100%;
  min-width: 750px;
  border-collapse: collapse;
}

th {
  background-color: #f8f9fa;
  font-weight: 600;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}

th, td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

/* Estilos para columnas sticky horizontales - SIN ESPACIO ENTRE ELLAS */
th.sticky-col-1,
td.sticky-col-1 {
  position: sticky;
  left: 0;
  z-index: 30;
  width: 150px;
  min-width: 150px;
  max-width: 150px;
  padding: 10px 0 10px 10px !important; /* Sin padding derecho */
  border-right: none;
  box-shadow: none;
}

th.sticky-col-1 {
  top: 0;
  background-color: #f8f9fa !important;
}

td.sticky-col-1 {
  background-color: #fff !important;
  z-index: 20;
}

th.sticky-col-2,
td.sticky-col-2 {
  position: sticky;
  left: 150px; /* Exactamente el ancho de la primera columna */
  z-index: 30;
  width: 150px;
  min-width: 150px;
  max-width: 150px;
  padding: 10px 10px 10px 0 !important; /* Sin padding izquierdo */
  border-right: 2px solid #dee2e6;
  box-shadow: 3px 0 8px rgba(0, 0, 0, 0.15);
}

th.sticky-col-2 {
  top: 0;
  background-color: #f8f9fa !important;
}

td.sticky-col-2 {
  background-color: #fff !important;
  z-index: 20;
}

/* Ajustar los selects dentro de las columnas sticky para que ocupen todo el espacio */
td.sticky-col-1 .medida-select,
td.sticky-col-2 .proveedor-select {
  width: 100%;
  max-width: 100%;
  min-width: 100%;
}

/* Asegurar que los inputs dentro de las columnas sticky también tengan fondo */
td.sticky-col-1 .form-control,
td.sticky-col-2 .form-control {
  background-color: transparent;
}

/* En hover, mantener el fondo opaco */
tbody tr:hover td.sticky-col-1 {
  background-color: #f5f5f5 !important;
}

tbody tr:hover td.sticky-col-2 {
  background-color: #f5f5f5 !important;
}

/* Asegurar que las filas pares/impares no afecten las columnas sticky */
tbody tr:nth-child(even) td.sticky-col-1,
tbody tr:nth-child(even) td.sticky-col-2 {
  background-color: #fff !important;
}

tbody tr:nth-child(odd) td.sticky-col-1,
tbody tr:nth-child(odd) td.sticky-col-2 {
  background-color: #fff !important;
}

.form-control {
  width: 100%;
  min-width: 80px;
  max-width: 150px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.medida-select {
  min-width: 120px;
  max-width: 200px;
  width: 100%;
}

.proveedor-select {
  min-width: 120px;
  max-width: 200px;
  width: 100%;
}

.porcentaje-input {
  max-width: 100px;
  color: #27ae60;
  font-weight: bold;
  text-align: center;
}

.btn-delete {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.botones-container {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  flex-wrap: wrap;
}

.btn-agregar {
  background-color: #27ae60;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.btn-agregar:hover {
  background-color: #229954;
  transform: translateY(-2px);
}

.btn-generar-rendimientos {
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.btn-generar-rendimientos:hover {
  background: linear-gradient(135deg, #8e44ad, #9b59b6);
  transform: translateY(-2px);
}

.medida-input-rendimiento {
  background-color: #f3e5f5 !important;
  border: 2px solid #9b59b6 !important;
  font-weight: 600;
  color: #6a1b9a;
}

.no-dia-seleccionado {
  text-align: center;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-top: 20px;
  color: #666;
}

/* Animaciones para el dropdown */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Estilos para el modal simplificado */
.fecha-container {
  padding: 20px 0;
}

.fecha-input {
  font-size: 1.1rem;
  padding: 12px;
  border: 2px solid #e0e6ed;
  border-radius: 8px;
  transition: border-color 0.3s ease;
}

.fecha-input:focus {
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
}

.info-mensaje {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px;
  background: #e8f4fc;
  border-radius: 8px;
  margin-top: 20px;
  color: #2980b9;
  font-size: 0.95rem;
}

  .info-mensaje i {
    font-size: 1.2rem;
    color: #3498db;
  }

/* Estilos para la tabla de rendimientos */
.tabla-rendimientos-container {
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  height: fit-content;
  position: sticky;
  top: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 320px;
}

.tabla-rendimientos-header {
  margin-bottom: 20px;
  text-align: center;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 15px;
}

.tabla-rendimientos-header h3 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 1.3em;
  font-weight: bold;
}

.fecha-embarque {
  margin: 0;
  color: #6c757d;
  font-size: 0.95em;
  font-weight: 500;
}

.loading-rendimientos,
.sin-rendimientos {
  padding: 20px;
  text-align: center;
  color: #6c757d;
  font-style: italic;
}

.sin-rendimientos {
  background-color: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 8px;
  color: #856404;
}

.tabla-rendimientos-wrapper {
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tabla-rendimientos {
  width: 100%;
  min-width: 280px;
  border-collapse: collapse;
  background-color: white;
  font-size: 0.9em;
  table-layout: fixed;
}

.tabla-rendimientos th {
  background-color: #495057;
  color: white;
  padding: 14px 12px;
  text-align: left;
  font-weight: 600;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tabla-rendimientos th:first-child {
  width: 60%;
}

.tabla-rendimientos th:last-child {
  width: 40%;
  text-align: center;
}

.tabla-rendimientos td {
  padding: 12px 12px;
  border-bottom: 1px solid #e9ecef;
  vertical-align: middle;
}

.tabla-rendimientos tbody tr:hover {
  background-color: #f8f9fa;
}

.tabla-rendimientos tbody tr:last-child td {
  border-bottom: none;
}

.tabla-rendimientos .medida-nombre {
  font-weight: 500;
  color: #2c3e50;
  word-wrap: break-word;
  font-size: 0.9em;
  line-height: 1.3;
  width: 60%;
  min-width: 120px;
}

.tabla-rendimientos .rendimiento-valor {
  font-weight: bold;
  text-align: center;
  font-size: 1.2em;
  color: #6c757d;
  font-family: 'Courier New', monospace;
  width: 40%;
  min-width: 80px;
}

.tabla-rendimientos .rendimiento-valor.rendimiento-alto {
  color: #28a745;
  background-color: #d4edda;
  border-radius: 6px;
  padding: 4px 8px;
}


/* Estadísticas de rendimientos */
.estadisticas-rendimientos {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  border: 1px solid #e9ecef;
}

.estadisticas-rendimientos .estadistica-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f1f3f4;
}

.estadisticas-rendimientos .estadistica-item.estadistica-destacada {
  border-bottom: none;
  font-weight: bold;
  background-color: #e8f4f8;
  margin: 8px -15px -15px -15px;
  padding: 12px 15px;
  border-radius: 0 0 8px 8px;
}

.estadisticas-rendimientos .estadistica-item:last-child:not(.estadistica-destacada) {
  border-bottom: none;
}

.estadisticas-rendimientos .estadistica-label {
  font-size: 0.9em;
  color: #6c757d;
  font-weight: 500;
}

.estadisticas-rendimientos .estadistica-valor {
  font-weight: bold;
  color: #2c3e50;
  font-size: 1em;
}

@media (max-width: 768px) {
  .preparacion-layout {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .tabla-rendimientos-container {
    position: static;
    order: -1; /* Mostrar la tabla primero en móviles */
    margin-bottom: 20px;
  }
  
  .tabla-rendimientos-header h3 {
    font-size: 1.1em;
  }
  
  .tabla-rendimientos th,
  .tabla-rendimientos td {
    padding: 10px 8px;
    font-size: 0.85em;
  }
  
  .tabla-rendimientos .medida-nombre {
    font-size: 0.8em;
  }
  
  .tabla-rendimientos .rendimiento-valor {
    font-size: 1em;
  }
  
  .estadisticas-rendimientos {
    padding: 12px;
  }
  
  .estadisticas-rendimientos .estadistica-item {
    padding: 6px 0;
  }
  
  .estadisticas-rendimientos .estadistica-label,
  .estadisticas-rendimientos .estadistica-valor {
    font-size: 0.85em;
  }

  .header-left {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .dias-dropdown {
    min-width: unset;
    width: 100%;
  }

  .header {
    flex-direction: column;
    gap: 15px;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
    gap: 10px;
  }

  .btn-volver-embarque {
    width: 100%;
    justify-content: center;
  }

  .btn-eliminar-dia {
    width: 100%;
    justify-content: center;
  }

  .btn-nuevo {
    width: 100%;
    justify-content: center;
  }

  .botones-container {
    flex-direction: column;
    width: 100%;
  }

  .btn-agregar,
  .btn-generar-rendimientos {
    width: 100%;
    justify-content: center;
  }

  .fecha-container {
    padding: 10px 0;
  }

  .info-mensaje {
    font-size: 0.9rem;
    padding: 12px;
  }
}
</style> 