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

    <!-- Tabla de medidas (solo se muestra si hay un día seleccionado) -->
    <div v-if="diaSeleccionado" class="tabla-container">
      <table>
        <thead>
          <tr>
            <th>Medida</th>
            <th>Proveedor</th>
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
            <td>
              <select 
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
            <td>
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
      
      <button @click="agregarMedidaExistente(diaSeleccionado)" class="btn-agregar">
        <i class="fas fa-plus"></i> Agregar Medida
      </button>
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
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore'
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
    formatearFecha(fecha) {
      // Ajustamos la fecha para que use la zona horaria local
      const [year, month, day] = fecha.split('-')
      return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
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
        console.log('Días cargados exitosamente')
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
        porcentaje: ''
      }
      
      dia.medidas.push(nuevaMedida)
      await this.guardarCambios(dia)
    },
    toggleDiasList() {
      this.diasListOpen = !this.diasListOpen
    },
    seleccionarDia(dia) {
      this.diaSeleccionado = dia
      this.diasListOpen = false
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
    }
  },
  async mounted() {
    await Promise.all([
      this.cargarDias(),
      this.cargarProveedores(),
      this.migrarProveedoresExistentes()
    ])
    
    // Si hay un día en la URL, seleccionarlo
    if (this.$route.query.fecha) {
      const diaEncontrado = this.dias.find(d => d.fecha === this.$route.query.fecha)
      if (diaEncontrado) {
        this.diaSeleccionado = diaEncontrado
      }
    } else if (this.dias.length > 0) {
      // Si no hay día en la URL, seleccionar el más reciente
      this.diaSeleccionado = this.diasOrdenados[0]
    }
  }
}
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

.form-control {
  width: 100%;
  min-width: 80px;
  max-width: 150px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.medida-select, .proveedor-select {
  min-width: 120px;
  max-width: 200px;
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
  margin-top: 15px;
  font-size: 14px;
  white-space: nowrap;
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

@media (max-width: 768px) {
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

  .btn-eliminar-dia {
    width: 100%;
    justify-content: center;
  }

  .btn-nuevo {
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