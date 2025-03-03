<template>
  <div class="bitacoras-container">
    <h1 class="page-title">Bitácoras de Mantenimiento - Cuartos Fríos</h1>
    
    <div class="filters-container">
      <div class="filter-group">
        <label for="cuarto-select">Cuarto Frío:</label>
        <select id="cuarto-select" v-model="filtrosCuarto" class="form-control">
          <option value="">Todos los cuartos</option>
          <option value="1">Cuarto Frío #1</option>
          <option value="2">Cuarto Frío #2</option>
          <option value="3">Cuarto Frío #3</option>
          <option value="4">Cuarto Frío #4</option>
          <option value="5">Cuarto Frío Don Chuy</option>
        </select>
      </div>
      
      <div class="filter-group">
        <label for="fecha-desde">Desde:</label>
        <input type="date" id="fecha-desde" v-model="filtroFechaDesde" class="form-control">
      </div>
      
      <div class="filter-group">
        <label for="fecha-hasta">Hasta:</label>
        <input type="date" id="fecha-hasta" v-model="filtroFechaHasta" class="form-control">
      </div>
      
      <button @click="aplicarFiltros" class="btn-filtrar">
        <i class="fas fa-filter"></i> Filtrar
      </button>
    </div>
    
    <div class="actions-row">
      <button @click="mostrarFormulario = true" class="btn-nueva-bitacora">
        <i class="fas fa-plus"></i> Nueva Bitácora
      </button>
    </div>
    
    <!-- Tabla de bitácoras -->
    <div class="table-responsive">
      <table class="bitacoras-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cuarto Frío</th>
            <th>Temperatura</th>
            <th>Técnico</th>
            <th>Tipo de Mantenimiento</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargando">
            <td colspan="7" class="loading-data">Cargando bitácoras...</td>
          </tr>
          <tr v-else-if="bitacoras.length === 0">
            <td colspan="7" class="no-data">No hay bitácoras registradas</td>
          </tr>
          <tr v-for="(bitacora, index) in bitacorasFiltradas" :key="bitacora.id">
            <td>{{ formatearFecha(bitacora.fecha) }}</td>
            <td>{{ formatearNombreCuarto(bitacora.cuartoId) }}</td>
            <td>{{ bitacora.temperatura }}°C</td>
            <td>{{ bitacora.tecnico }}</td>
            <td>{{ bitacora.tipoMantenimiento }}</td>
            <td :class="'estado-' + bitacora.estado.toLowerCase()">{{ bitacora.estado }}</td>
            <td class="acciones">
              <button @click="editarBitacora(bitacora)" class="btn-accion editar">
                <i class="fas fa-edit"></i>
              </button>
              <button @click="verDetalles(bitacora)" class="btn-accion ver">
                <i class="fas fa-eye"></i>
              </button>
              <button @click="confirmarEliminarBitacora(bitacora)" class="btn-accion eliminar">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Modal para nueva/editar bitácora -->
    <div v-if="mostrarFormulario" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ modoEdicion ? 'Editar Bitácora' : 'Nueva Bitácora' }}</h2>
          <button @click="cerrarFormulario" class="btn-cerrar">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="cuarto">Cuarto Frío:</label>
            <select id="cuarto" v-model="bitacoraActual.cuartoId" class="form-control" required>
              <option value="" disabled>Seleccione un cuarto frío</option>
              <option value="1">Cuarto Frío #1</option>
              <option value="2">Cuarto Frío #2</option>
              <option value="3">Cuarto Frío #3</option>
              <option value="4">Cuarto Frío #4</option>
              <option value="5">Cuarto Frío Don Chuy</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="fecha">Fecha:</label>
            <input type="date" id="fecha" v-model="bitacoraActual.fecha" class="form-control" required>
          </div>
          
          <div class="form-group">
            <label for="temperatura">Temperatura (°C):</label>
            <input type="number" id="temperatura" v-model="bitacoraActual.temperatura" class="form-control" step="0.1" required>
          </div>
          
          <div class="form-group">
            <label for="tecnico">Técnico:</label>
            <input type="text" id="tecnico" v-model="bitacoraActual.tecnico" class="form-control" required>
          </div>
          
          <div class="form-group">
            <label for="tipo-mantenimiento">Tipo de Mantenimiento:</label>
            <select id="tipo-mantenimiento" v-model="bitacoraActual.tipoMantenimiento" class="form-control" required>
              <option value="" disabled>Seleccione tipo</option>
              <option value="Preventivo">Preventivo</option>
              <option value="Correctivo">Correctivo</option>
              <option value="Revisión">Revisión</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="estado">Estado:</label>
            <select id="estado" v-model="bitacoraActual.estado" class="form-control" required>
              <option value="" disabled>Seleccione estado</option>
              <option value="Óptimo">Óptimo</option>
              <option value="Regular">Regular</option>
              <option value="Requiere Atención">Requiere Atención</option>
              <option value="Crítico">Crítico</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="observaciones">Observaciones:</label>
            <textarea id="observaciones" v-model="bitacoraActual.observaciones" class="form-control" rows="4"></textarea>
          </div>
          
          <div class="form-group">
            <label for="acciones">Acciones Realizadas:</label>
            <textarea id="acciones" v-model="bitacoraActual.accionesRealizadas" class="form-control" rows="4"></textarea>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="cerrarFormulario" class="btn-cancelar">Cancelar</button>
          <button @click="guardarBitacora" class="btn-guardar" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Modal para ver detalles -->
    <div v-if="mostrarDetalles" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Detalles de Bitácora</h2>
          <button @click="mostrarDetalles = false" class="btn-cerrar">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body detalles">
          <div class="detalle-grupo">
            <h3>Información General</h3>
            <p><strong>Cuarto Frío:</strong> {{ formatearNombreCuarto(bitacoraDetalle.cuartoId) }}</p>
            <p><strong>Fecha:</strong> {{ formatearFecha(bitacoraDetalle.fecha) }}</p>
            <p><strong>Temperatura:</strong> {{ bitacoraDetalle.temperatura }}°C</p>
            <p><strong>Técnico:</strong> {{ bitacoraDetalle.tecnico }}</p>
          </div>
          
          <div class="detalle-grupo">
            <h3>Mantenimiento</h3>
            <p><strong>Tipo:</strong> {{ bitacoraDetalle.tipoMantenimiento }}</p>
            <p><strong>Estado:</strong> <span :class="'estado-tag estado-' + bitacoraDetalle.estado.toLowerCase()">{{ bitacoraDetalle.estado }}</span></p>
          </div>
          
          <div class="detalle-grupo">
            <h3>Observaciones</h3>
            <p class="texto-largo">{{ bitacoraDetalle.observaciones || 'Sin observaciones' }}</p>
          </div>
          
          <div class="detalle-grupo">
            <h3>Acciones Realizadas</h3>
            <p class="texto-largo">{{ bitacoraDetalle.accionesRealizadas || 'Sin acciones registradas' }}</p>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="mostrarDetalles = false" class="btn-cerrar-detalles">Cerrar</button>
          <button @click="editarBitacoraDesdeDetalles" class="btn-editar-detalles">Editar</button>
        </div>
      </div>
    </div>

    <!-- Modal de confirmación para eliminar -->
    <div v-if="mostrarConfirmacionEliminar" class="modal-overlay">
      <div class="modal-content modal-confirmacion">
        <div class="modal-header">
          <h2>Confirmar Eliminación</h2>
          <button @click="mostrarConfirmacionEliminar = false" class="btn-cerrar">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <p class="mensaje-confirmacion">
            ¿Está seguro que desea eliminar la bitácora del {{ formatearFecha(bitacoraEliminar.fecha) }} 
            para el {{ formatearNombreCuarto(bitacoraEliminar.cuartoId) }}?
          </p>
          <p class="advertencia">Esta acción no se puede deshacer.</p>
        </div>
        
        <div class="modal-footer">
          <button @click="mostrarConfirmacionEliminar = false" class="btn-cancelar">Cancelar</button>
          <button @click="eliminarBitacora" class="btn-eliminar" :disabled="eliminando">
            {{ eliminando ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';

export default {
  name: 'Bitacoras',
  data() {
    return {
      bitacoras: [],
      mostrarFormulario: false,
      mostrarDetalles: false,
      mostrarConfirmacionEliminar: false,
      modoEdicion: false,
      bitacoraActual: this.inicializarBitacora(),
      bitacoraDetalle: {},
      bitacoraEliminar: {},
      filtrosCuarto: '',
      filtroFechaDesde: '',
      filtroFechaHasta: '',
      cargando: true,
      guardando: false,
      eliminando: false
    }
  },
  computed: {
    bitacorasFiltradas() {
      let resultado = [...this.bitacoras];
      
      if (this.filtrosCuarto) {
        resultado = resultado.filter(b => b.cuartoId.toString() === this.filtrosCuarto);
      }
      
      if (this.filtroFechaDesde) {
        resultado = resultado.filter(b => new Date(b.fecha) >= new Date(this.filtroFechaDesde));
      }
      
      if (this.filtroFechaHasta) {
        resultado = resultado.filter(b => new Date(b.fecha) <= new Date(this.filtroFechaHasta));
      }
      
      return resultado.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }
  },
  created() {
    this.cargarBitacoras();
  },
  methods: {
    inicializarBitacora() {
      return {
        id: null,
        cuartoId: '',
        fecha: new Date().toISOString().substr(0, 10),
        temperatura: '',
        tecnico: '',
        tipoMantenimiento: '',
        estado: '',
        observaciones: '',
        accionesRealizadas: '',
        createdAt: null,
        updatedAt: null
      };
    },
    async cargarBitacoras() {
      this.cargando = true;
      try {
        const bitacorasRef = collection(db, 'bitacoras');
        const q = query(bitacorasRef, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        
        this.bitacoras = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Asegurarse de que el ID sea una cadena de texto
          const id = doc.id.toString();
          console.log(`Cargando bitácora con ID: ${id}`);
          
          return {
            id: id,
            cuartoId: data.cuartoId || '',
            fecha: data.fecha || new Date().toISOString().substr(0, 10),
            temperatura: data.temperatura || 0,
            tecnico: data.tecnico || '',
            tipoMantenimiento: data.tipoMantenimiento || '',
            estado: data.estado || '',
            observaciones: data.observaciones || '',
            accionesRealizadas: data.accionesRealizadas || '',
            createdAt: data.createdAt || null,
            updatedAt: data.updatedAt || null
          };
        });
        
        console.log(`Se cargaron ${this.bitacoras.length} bitácoras`);
      } catch (error) {
        console.error('Error al cargar bitácoras:', error);
        alert(`Error al cargar las bitácoras: ${error.message || 'Error desconocido'}`);
      } finally {
        this.cargando = false;
      }
    },
    formatearFecha(fecha) {
      if (!fecha) return '';
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(fecha).toLocaleDateString('es-ES', opciones);
    },
    formatearNombreCuarto(cuartoId) {
      if (!cuartoId) return '';
      return cuartoId === '5' ? 'Cuarto Frío Don Chuy' : `Cuarto Frío #${cuartoId}`;
    },
    aplicarFiltros() {
      // Los filtros ya se aplican automáticamente a través del computed property
    },
    editarBitacora(bitacora) {
      this.modoEdicion = true;
      this.bitacoraActual = { ...bitacora };
      this.mostrarFormulario = true;
    },
    verDetalles(bitacora) {
      this.bitacoraDetalle = { ...bitacora };
      this.mostrarDetalles = true;
    },
    cerrarFormulario() {
      this.mostrarFormulario = false;
      this.modoEdicion = false;
      this.bitacoraActual = this.inicializarBitacora();
      this.guardando = false;
    },
    async guardarBitacora() {
      if (this.validarFormulario()) {
        this.guardando = true;
        try {
          // Asegurarse de que los datos sean válidos
          const bitacoraData = {
            ...this.bitacoraActual,
            cuartoId: this.bitacoraActual.cuartoId.toString(),
            temperatura: parseFloat(this.bitacoraActual.temperatura) || 0,
            tecnico: this.bitacoraActual.tecnico.trim(),
            tipoMantenimiento: this.bitacoraActual.tipoMantenimiento,
            estado: this.bitacoraActual.estado,
            observaciones: this.bitacoraActual.observaciones || '',
            accionesRealizadas: this.bitacoraActual.accionesRealizadas || '',
            updatedAt: serverTimestamp()
          };
          
          if (this.modoEdicion) {
            // Verificar que el ID sea válido
            if (!bitacoraData.id) {
              throw new Error('ID de bitácora no válido para actualización');
            }
            
            console.log('Actualizando bitácora con ID:', bitacoraData.id);
            
            // Actualizar bitácora existente
            const { id, ...dataSinId } = bitacoraData;
            const bitacoraRef = doc(db, 'bitacoras', id.toString());
            await updateDoc(bitacoraRef, dataSinId);
            
            // Actualizar en el array local
            const index = this.bitacoras.findIndex(b => b.id === id);
            if (index !== -1) {
              this.bitacoras.splice(index, 1, bitacoraData);
            }
            
            console.log('Bitácora actualizada con éxito');
          } else {
            // Crear nueva bitácora
            bitacoraData.createdAt = serverTimestamp();
            console.log('Creando nueva bitácora');
            
            const docRef = await addDoc(collection(db, 'bitacoras'), bitacoraData);
            
            // Agregar al array local con el ID generado
            const nuevaBitacora = {
              ...bitacoraData,
              id: docRef.id.toString()
            };
            
            console.log('Nueva bitácora creada con ID:', nuevaBitacora.id);
            this.bitacoras.unshift(nuevaBitacora);
          }
          
          this.cerrarFormulario();
          alert(this.modoEdicion ? 'Bitácora actualizada con éxito' : 'Bitácora creada con éxito');
        } catch (error) {
          console.error('Error al guardar bitácora:', error);
          alert(`Error al guardar la bitácora: ${error.message || 'Error desconocido'}`);
        } finally {
          this.guardando = false;
        }
      }
    },
    validarFormulario() {
      // Validación básica
      if (!this.bitacoraActual.cuartoId || 
          !this.bitacoraActual.fecha || 
          this.bitacoraActual.temperatura === '' || 
          !this.bitacoraActual.tecnico || 
          !this.bitacoraActual.tipoMantenimiento || 
          !this.bitacoraActual.estado) {
        alert('Por favor complete todos los campos obligatorios');
        return false;
      }
      return true;
    },
    editarBitacoraDesdeDetalles() {
      this.editarBitacora(this.bitacoraDetalle);
      this.mostrarDetalles = false;
    },
    confirmarEliminarBitacora(bitacora) {
      if (!bitacora || !bitacora.id) {
        console.error('Intento de eliminar una bitácora sin ID válido:', bitacora);
        alert('No se puede eliminar esta bitácora porque no tiene un ID válido');
        return;
      }
      
      console.log('Preparando eliminación de bitácora con ID:', bitacora.id);
      this.bitacoraEliminar = { ...bitacora };
      this.mostrarConfirmacionEliminar = true;
    },
    async eliminarBitacora() {
      this.eliminando = true;
      try {
        // Verificar que el ID de la bitácora sea válido
        if (!this.bitacoraEliminar || !this.bitacoraEliminar.id) {
          throw new Error('ID de bitácora no válido');
        }
        
        const bitacoraId = this.bitacoraEliminar.id.toString();
        console.log('Intentando eliminar bitácora con ID:', bitacoraId);
        
        const bitacoraRef = doc(db, 'bitacoras', bitacoraId);
        await deleteDoc(bitacoraRef);
        
        // Eliminar del array local
        const index = this.bitacoras.findIndex(b => b.id === bitacoraId);
        if (index !== -1) {
          this.bitacoras.splice(index, 1);
        }
        
        this.mostrarConfirmacionEliminar = false;
        alert('Bitácora eliminada con éxito');
      } catch (error) {
        console.error('Error al eliminar bitácora:', error);
        alert(`Error al eliminar la bitácora: ${error.message || 'Error desconocido'}`);
      } finally {
        this.eliminando = false;
        this.bitacoraEliminar = {};
      }
    }
  }
}
</script>

<style scoped>
.bitacoras-container {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  padding: 30px 20px;
  min-height: calc(100vh - 160px);
}

.page-title {
  color: #2c3e50;
  font-size: 2.2em;
  margin-bottom: 30px;
  text-align: center;
  font-weight: 600;
  border-bottom: 3px solid #3498db;
  padding-bottom: 10px;
}

.filters-container {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 25px;
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.filter-group {
  display: flex;
  flex-direction: column;
  min-width: 200px;
  flex: 1;
}

.filter-group label {
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.form-control {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.btn-filtrar {
  align-self: flex-end;
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-top: 20px;
}

.btn-filtrar:hover {
  background-color: #2980b9;
}

.actions-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.btn-nueva-bitacora {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-weight: 500;
}

.btn-nueva-bitacora:hover {
  background-color: #27ae60;
}

.table-responsive {
  overflow-x: auto;
}

.bitacoras-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.bitacoras-table th, 
.bitacoras-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.bitacoras-table th {
  background-color: #3498db;
  color: white;
  font-weight: 500;
}

.bitacoras-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.bitacoras-table tr:hover {
  background-color: #f1f1f1;
}

.no-data, .loading-data {
  text-align: center;
  padding: 30px;
  color: #777;
  font-style: italic;
}

.loading-data {
  color: #3498db;
}

.acciones {
  display: flex;
  gap: 10px;
}

.btn-accion {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1em;
  padding: 5px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-accion.editar {
  color: #f39c12;
}

.btn-accion.ver {
  color: #3498db;
}

.btn-accion.eliminar {
  color: #e74c3c;
}

.btn-accion:hover {
  background-color: rgba(0,0,0,0.05);
}

.estado-óptimo {
  color: #27ae60;
  font-weight: 500;
}

.estado-regular {
  color: #f39c12;
  font-weight: 500;
}

.estado-requiere-atención {
  color: #e67e22;
  font-weight: 500;
}

.estado-crítico {
  color: #e74c3c;
  font-weight: 500;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

.modal-confirmacion {
  max-width: 500px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5em;
}

.btn-cerrar {
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  color: #777;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancelar, .btn-cerrar-detalles {
  background-color: #95a5a6;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-guardar, .btn-editar-detalles {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-eliminar {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-cancelar:hover, .btn-cerrar-detalles:hover {
  background-color: #7f8c8d;
}

.btn-guardar:hover, .btn-editar-detalles:hover {
  background-color: #2980b9;
}

.btn-eliminar:hover {
  background-color: #c0392b;
}

.btn-guardar:disabled, .btn-eliminar:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Detalles modal */
.detalles .detalle-grupo {
  margin-bottom: 20px;
}

.detalles h3 {
  color: #3498db;
  font-size: 1.2em;
  margin-bottom: 10px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.detalles p {
  margin: 8px 0;
}

.texto-largo {
  white-space: pre-line;
  background-color: #f9f9f9;
  padding: 10px;
  border-radius: 4px;
  border-left: 3px solid #3498db;
}

.estado-tag {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.estado-tag.estado-óptimo {
  background-color: #e6f7ee;
  color: #27ae60;
}

.estado-tag.estado-regular {
  background-color: #fef5e7;
  color: #f39c12;
}

.estado-tag.estado-requiere-atención {
  background-color: #fbeee6;
  color: #e67e22;
}

.estado-tag.estado-crítico {
  background-color: #fdedeb;
  color: #e74c3c;
}

.mensaje-confirmacion {
  font-size: 1.1em;
  margin-bottom: 15px;
  text-align: center;
}

.advertencia {
  color: #e74c3c;
  text-align: center;
  font-weight: 500;
}

/* Responsive design */
@media (max-width: 768px) {
  .filters-container {
    flex-direction: column;
    gap: 10px;
  }
  
  .filter-group {
    min-width: 100%;
  }
  
  .btn-filtrar {
    align-self: stretch;
    margin-top: 10px;
  }
  
  .bitacoras-table th, 
  .bitacoras-table td {
    padding: 8px 10px;
    font-size: 0.9em;
  }
  
  .modal-content {
    width: 95%;
    max-height: 95vh;
  }
}
</style> 