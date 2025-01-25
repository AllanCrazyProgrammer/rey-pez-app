<template>
  <div class="preparacion-container">
    <div class="header">
      <h1>Preparación</h1>
      <button @click="mostrarModalNuevoDia" class="btn-nuevo">
        <i class="fas fa-plus"></i> Nuevo Día
      </button>
    </div>

    <!-- Lista de días -->
    <div class="dias-list" v-if="dias.length > 0">
      <div v-for="dia in diasOrdenados" :key="dia.id" class="dia-card">
        <div class="dia-header">
          <h3>{{ formatearFecha(dia.fecha) }}</h3>
          <div class="dia-actions">
            <button @click="confirmarBorrarDia(dia)" class="btn-delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        <!-- Tabla de medidas -->
        <div class="tabla-container">
          <table>
            <thead>
              <tr>
                <th>Medida</th>
                <th>Proveedor</th>
                <th>Tinas/Baños</th>
                <th>Cajas</th>
                <th>Cal</th>
                <th>Sal</th>
                <th>%</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(medida, index) in dia.medidas" :key="index">
                <td>
                  <select 
                    v-model="medida.medida" 
                    class="form-control medida-select"
                    @change="guardarCambios(dia)"
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
                    @change="guardarCambios(dia)"
                  >
                    <option value="">Sin proveedor</option>
                    <option v-for="p in proveedoresDisponibles" :key="p" :value="p">
                      {{ p }}
                    </option>
                  </select>
                </td>
                <td>
                  <input 
                    type="number" 
                    v-model="medida.tinas" 
                    placeholder=""
                    @change="guardarCambios(dia)"
                    class="form-control"
                  >
                </td>
                <td>
                  <select 
                    v-model="medida.cajas" 
                    class="form-control"
                    @change="guardarCambios(dia)"
                  >
                    <option value="">Seleccionar</option>
                    <option v-for="n in 25" :key="n" :value="n">{{ n }}</option>
                  </select>
                </td>
                <td>
                  <select 
                    v-model="medida.cal" 
                    class="form-control"
                    @change="guardarCambios(dia)"
                  >
                    <option value="">Seleccionar</option>
                    <option v-for="c in calDisponible" :key="c" :value="c">{{ c }}</option>
                  </select>
                </td>
                <td>
                  <select 
                    v-model="medida.sal" 
                    class="form-control"
                    @change="guardarCambios(dia)"
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
                    @change="guardarCambios(dia)"
                    class="form-control porcentaje-input"
                  >
                </td>
                <td>
                  <button 
                    @click="eliminarMedidaExistente(dia, index)" 
                    class="btn-delete"
                    v-if="dia.medidas.length > 1"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <button @click="agregarMedidaExistente(dia)" class="btn-agregar">
            <i class="fas fa-plus"></i> Agregar Medida
          </button>
        </div>
      </div>
    </div>

    <!-- Mensaje cuando no hay días -->
    <div v-else class="no-dias">
      <p>No hay días registrados. Comienza creando uno nuevo.</p>
    </div>

    <!-- Modal para nuevo día -->
    <b-modal v-model="showModal" title="Nuevo Día de Preparación" size="lg" @ok="crearNuevoDia" @show="inicializarNuevoDia">
      <div class="modal-content">
        <b-form-group label="Fecha:">
          <b-form-input
            type="date"
            v-model="nuevoDia.fecha"
            required
          ></b-form-input>
        </b-form-group>
        
        <div class="tabla-medidas-container">
          <table class="tabla-medidas">
            <thead>
              <tr>
                <th>Medida</th>
                <th>Proveedor</th>
                <th>Tinas/Baños</th>
                <th>Cajas</th>
                <th>Cal</th>
                <th>Sal</th>
                <th>%</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(medida, index) in nuevoDia.medidas" :key="index">
                <td>
                  <select 
                    v-model="medida.medida" 
                    class="form-control medida-select"
                    required
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
                  >
                    <option value="">Sin proveedor</option>
                    <option v-for="p in proveedoresDisponibles" :key="p" :value="p">
                      {{ p }}
                    </option>
                  </select>
                </td>
                <td>
                  <input 
                    type="number" 
                    v-model="medida.tinas" 
                    placeholder=""
                    @change="guardarCambios(dia)"
                    class="form-control"
                  >
                </td>
                <td>
                  <select 
                    v-model="medida.cajas" 
                    class="form-control"
                  >
                    <option value="">Seleccionar</option>
                    <option v-for="n in 25" :key="n" :value="n">{{ n }}</option>
                  </select>
                </td>
                <td>
                  <select 
                    v-model="medida.cal" 
                    class="form-control"
                  >
                    <option value="">Seleccionar</option>
                    <option v-for="c in calDisponible" :key="c" :value="c">{{ c }}</option>
                  </select>
                </td>
                <td>
                  <select 
                    v-model="medida.sal" 
                    class="form-control"
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
                    class="form-control porcentaje-input"
                  >
                </td>
                <td>
                  <button 
                    @click="eliminarMedida(index)" 
                    class="btn-delete"
                    v-if="nuevoDia.medidas.length > 1"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <button @click="agregarMedida" class="btn-agregar">
            <i class="fas fa-plus"></i> Agregar Medida
          </button>
        </div>
      </div>
    </b-modal>
  </div>
</template>

<script>
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore'

export default {
  name: 'Preparacion',
  data() {
    return {
      dias: [],
      showModal: false,
      nuevoDia: {
        fecha: '',
        medidas: []
      },
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
      proveedoresDisponibles: [
       "Ahumada",
       "Seleta",
       "Tirado",
       "Ozuna",
       "Mx",
      ],
      calDisponible: [
        "1/8",
        "1/4",
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
        medidas: [{
          medida: '',
          proveedor: '',
          tinas: '',
          cajas: '',
          cal: '',
          sal: '',
          porcentaje: '',
          editando: false
        }]
      }
    },
    mostrarModalNuevoDia() {
      this.showModal = true
    },
    agregarMedida() {
      this.nuevoDia.medidas.push({
        medida: '',
        proveedor: '',
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
          medidas: this.nuevoDia.medidas,
          createdAt: new Date(),
          timestamp: fechaLocal.getTime()
        })

        this.dias.push({
          id: docRef.id,
          fecha: this.nuevoDia.fecha,
          medidas: this.nuevoDia.medidas,
          timestamp: fechaLocal.getTime()
        })

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
        tinas: '',
        cajas: '',
        cal: '',
        sal: '',
        porcentaje: ''
      }
      
      dia.medidas.push(nuevaMedida)
      await this.guardarCambios(dia)
    }
  },
  mounted() {
    this.cargarDias()
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

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.header h1 {
  margin: 0;
  font-size: clamp(1.5rem, 4vw, 2rem);
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

.dias-list {
  display: grid;
  gap: 20px;
}

.dia-card {
  background: white;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  width: 100%;
  overflow-x: auto;
}

.dia-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.dia-header h3 {
  margin: 0;
  font-size: clamp(1rem, 3vw, 1.25rem);
}

.dia-actions {
  display: flex;
  gap: 10px;
}

.btn-edit, .btn-delete, .btn-toggle-edit {
  border: none;
  padding: 8px;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-edit {
  background-color: #f39c12;
  color: white;
}

.btn-delete {
  background-color: #e74c3c;
  color: white;
}

.btn-toggle-edit {
  background-color: #3498db;
  color: white;
}

.btn-toggle-edit.editing {
  background-color: #27ae60;
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

.no-dias {
  text-align: center;
  padding: 30px;
  background: #f8f9fa;
  border-radius: 10px;
  margin-top: 20px;
}

/* Estilos específicos para móviles */
@media (max-width: 768px) {
  .preparacion-container {
    padding: 10px;
  }

  .header {
    justify-content: center;
    text-align: center;
  }

  .dia-header {
    justify-content: center;
    text-align: center;
  }

  .form-control {
    font-size: 16px; /* Mejor tamaño para inputs en móviles */
    padding: 8px;
  }

  .btn-nuevo, .btn-agregar {
    width: 100%;
    justify-content: center;
  }

  .tabla-container {
    margin: 10px -15px;
    padding: 0 15px;
    width: calc(100% + 30px);
  }

  .dia-card {
    padding: 10px;
  }

  /* Indicador de scroll horizontal */
  .tabla-container::after {
    content: '← Desliza →';
    display: block;
    text-align: center;
    font-size: 12px;
    color: #666;
    padding: 5px 0;
  }
}

/* Optimizaciones para tablets */
@media (min-width: 769px) and (max-width: 1024px) {
  .preparacion-container {
    padding: 15px;
  }

  .form-control {
    max-width: 120px;
  }

  .medida-select, .proveedor-select {
    max-width: 150px;
  }
}
</style> 