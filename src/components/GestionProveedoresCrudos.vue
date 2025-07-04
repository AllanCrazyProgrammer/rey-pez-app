<template>
  <div v-if="mostrar" class="modal-overlay" @click="cerrarModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Gestionar Proveedores y Medidas de Crudos</h2>
        <button @click="$emit('cerrar')" class="close-button">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Sección de Proveedores -->
        <div class="seccion-proveedores">
          <div class="seccion-header">
            <h3>Proveedores de Crudos</h3>
            <button @click="mostrarFormularioProveedor = !mostrarFormularioProveedor" class="btn-agregar">
              + Nuevo Proveedor
            </button>
          </div>

          <!-- Formulario para nuevo proveedor -->
          <div v-if="mostrarFormularioProveedor" class="formulario-proveedor">
            <div class="form-row">
              <input 
                v-model="nuevoProveedor.nombre" 
                placeholder="Nombre del proveedor" 
                class="form-input"
                required
                @keyup.enter="agregarProveedor"
              >
              <input 
                v-model="nuevoProveedor.contacto" 
                placeholder="Contacto (opcional)" 
                class="form-input"
              >
              <button @click="agregarProveedor" class="btn-guardar" :disabled="guardandoProveedor">
                {{ guardandoProveedor ? 'Guardando...' : 'Guardar' }}
              </button>
              <button @click="cancelarProveedor" class="btn-cancelar">
                Cancelar
              </button>
            </div>
          </div>

          <!-- Lista de proveedores -->
          <div class="lista-proveedores">
            <div v-if="cargandoProveedores" class="loading">Cargando proveedores...</div>
            <div v-else-if="proveedores.length === 0" class="no-datos">
              No hay proveedores registrados. Agrega el primer proveedor.
            </div>
            <div v-else>
              <div 
                v-for="proveedor in proveedores" 
                :key="proveedor.id"
                class="proveedor-card"
                :class="{ 'selected': proveedorSeleccionado?.id === proveedor.id }"
                @click="seleccionarProveedor(proveedor)"
              >
                <div class="proveedor-info">
                  <h4>{{ proveedor.nombre }}</h4>
                  <p v-if="proveedor.contacto" class="contacto">{{ proveedor.contacto }}</p>
                  <p class="medidas-count">
                    {{ contarMedidasProveedor(proveedor.id) }} medida(s) registrada(s)
                  </p>
                </div>
                <div class="proveedor-acciones">
                  <button @click.stop="editarProveedor(proveedor)" class="btn-editar" title="Editar">
                    ✏️
                  </button>
                  <button @click.stop="eliminarProveedor(proveedor)" class="btn-eliminar" title="Eliminar">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sección de Medidas -->
        <div v-if="proveedorSeleccionado" class="seccion-medidas">
          <div class="seccion-header">
            <h3>Medidas/Productos - {{ proveedorSeleccionado.nombre }}</h3>
            <button @click="mostrarFormularioMedida = !mostrarFormularioMedida" class="btn-agregar">
              + Nueva Medida
            </button>
          </div>

          <!-- Formulario para nueva medida -->
          <div v-if="mostrarFormularioMedida" class="formulario-medida">
            <div class="form-row">
              <input 
                v-model="nuevaMedida.nombre" 
                placeholder="Nombre de la medida/producto" 
                class="form-input"
                required
                @keyup.enter="agregarMedida"
              >
              <input 
                v-model="nuevaMedida.descripcion" 
                placeholder="Descripción (opcional)" 
                class="form-input"
              >
              <button @click="agregarMedida" class="btn-guardar" :disabled="guardandoMedida">
                {{ guardandoMedida ? 'Guardando...' : 'Guardar' }}
              </button>
              <button @click="cancelarMedida" class="btn-cancelar">
                Cancelar
              </button>
            </div>
          </div>

          <!-- Lista de medidas -->
          <div class="lista-medidas">
            <div v-if="cargandoMedidas" class="loading">Cargando medidas...</div>
            <div v-else-if="medidasProveedor.length === 0" class="no-datos">
              No hay medidas registradas para este proveedor. Agrega la primera medida.
            </div>
            <div v-else class="medidas-grid">
              <div 
                v-for="medida in medidasProveedor" 
                :key="medida.id"
                class="medida-card"
              >
                <div class="medida-info">
                  <h5>{{ medida.nombre }}</h5>
                  <p v-if="medida.descripcion" class="descripcion">{{ medida.descripcion }}</p>
                  <p v-if="medida.precioActual" class="precio-actual">
                    Precio actual: ${{ formatearPrecio(medida.precioActual) }}
                  </p>
                  <p class="fecha-creacion">
                    Creado: {{ formatearFecha(medida.fechaCreacion) }}
                  </p>
                </div>
                <div class="medida-acciones">
                  <button @click="verHistorialPrecios(medida)" class="btn-historial" title="Ver historial de precios">
                    📊
                  </button>
                  <button @click="editarMedida(medida)" class="btn-editar" title="Editar">
                    ✏️
                  </button>
                  <button @click="eliminarMedida(medida)" class="btn-eliminar" title="Eliminar">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mensaje para seleccionar proveedor -->
        <div v-else class="mensaje-seleccionar">
          <p>Selecciona un proveedor para gestionar sus medidas/productos</p>
        </div>
      </div>

      <!-- Modal de edición de proveedor -->
      <div v-if="editandoProveedor" class="modal-overlay-edit" @click="cancelarEdicionProveedor">
        <div class="modal-edit" @click.stop>
          <div class="modal-header">
            <h3>Editar Proveedor</h3>
            <button @click="cancelarEdicionProveedor" class="close-button">×</button>
          </div>
          <div class="modal-body-edit">
            <div class="form-group">
              <label>Nombre:</label>
              <input v-model="proveedorEditando.nombre" class="form-input" required>
            </div>
            <div class="form-group">
              <label>Contacto:</label>
              <input v-model="proveedorEditando.contacto" class="form-input">
            </div>
            <div class="form-actions">
              <button @click="guardarEdicionProveedor" class="btn-guardar" :disabled="guardandoProveedor">
                {{ guardandoProveedor ? 'Guardando...' : 'Actualizar' }}
              </button>
              <button @click="cancelarEdicionProveedor" class="btn-cancelar">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de edición de medida -->
      <div v-if="editandoMedida" class="modal-overlay-edit" @click="cancelarEdicionMedida">
        <div class="modal-edit" @click.stop>
          <div class="modal-header">
            <h3>Editar Medida</h3>
            <button @click="cancelarEdicionMedida" class="close-button">×</button>
          </div>
          <div class="modal-body-edit">
            <div class="form-group">
              <label>Nombre:</label>
              <input v-model="medidaEditando.nombre" class="form-input" required>
            </div>
            <div class="form-group">
              <label>Descripción:</label>
              <input v-model="medidaEditando.descripcion" class="form-input">
            </div>
            <div class="form-actions">
              <button @click="guardarEdicionMedida" class="btn-guardar" :disabled="guardandoMedida">
                {{ guardandoMedida ? 'Guardando...' : 'Actualizar' }}
              </button>
              <button @click="cancelarEdicionMedida" class="btn-cancelar">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal de Historial de Precios -->
    <HistorialPreciosCrudos
      :mostrar="mostrarHistorialPrecios"
      :medida="medidaSeleccionada"
      :proveedor-id="proveedorSeleccionado?.id"
      :proveedor-nombre="proveedorSeleccionado?.nombre"
      @cerrar="cerrarHistorialPrecios"
      @actualizado="onHistorialActualizado"
    />
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import HistorialPreciosCrudos from '@/components/HistorialPreciosCrudos.vue';

export default {
  name: 'GestionProveedoresCrudos',
  components: {
    HistorialPreciosCrudos
  },
  props: {
    mostrar: {
      type: Boolean,
      required: true
    }
  },
  emits: ['cerrar', 'actualizado'],
  data() {
    return {
      // Estado general
      cargandoProveedores: false,
      cargandoMedidas: false,
      guardandoProveedor: false,
      guardandoMedida: false,
      
      // Datos
      proveedores: [],
      medidas: [],
      proveedorSeleccionado: null,
      
      // Formularios
      mostrarFormularioProveedor: false,
      mostrarFormularioMedida: false,
      nuevoProveedor: {
        nombre: '',
        contacto: ''
      },
      nuevaMedida: {
        nombre: '',
        descripcion: ''
      },
      
      // Edición
      editandoProveedor: false,
      editandoMedida: false,
      proveedorEditando: {},
      medidaEditando: {},
      
      // Historial de precios
      mostrarHistorialPrecios: false,
      medidaSeleccionada: null
    };
  },
  computed: {
    medidasProveedor() {
      if (!this.proveedorSeleccionado) return [];
      return this.medidas.filter(medida => medida.proveedorId === this.proveedorSeleccionado.id);
    }
  },
  methods: {
    cerrarModal(event) {
      if (event.target === event.currentTarget) {
        this.$emit('cerrar');
      }
    },

    // Gestión de Proveedores
    async cargarProveedores() {
      try {
        this.cargandoProveedores = true;
        const querySnapshot = await getDocs(collection(db, 'proveedoresCrudos'));
        this.proveedores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        this.proveedores.sort((a, b) => a.nombre.localeCompare(b.nombre));
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
        alert('Error al cargar proveedores');
      } finally {
        this.cargandoProveedores = false;
      }
    },

    async agregarProveedor() {
      if (!this.nuevoProveedor.nombre.trim()) {
        alert('El nombre del proveedor es requerido');
        return;
      }

      // Verificar que no exista ya
      if (this.proveedores.some(p => p.nombre.toLowerCase() === this.nuevoProveedor.nombre.toLowerCase())) {
        alert('Ya existe un proveedor con ese nombre');
        return;
      }

      try {
        this.guardandoProveedor = true;
        const docData = {
          nombre: this.nuevoProveedor.nombre.trim(),
          contacto: this.nuevoProveedor.contacto.trim() || null,
          fechaCreacion: new Date(),
          tipo: 'crudos'
        };

        const docRef = await addDoc(collection(db, 'proveedoresCrudos'), docData);
        
        this.proveedores.push({
          id: docRef.id,
          ...docData
        });
        
        this.proveedores.sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.cancelarProveedor();
        this.$emit('actualizado');
        
      } catch (error) {
        console.error('Error al agregar proveedor:', error);
        alert('Error al agregar proveedor');
      } finally {
        this.guardandoProveedor = false;
      }
    },

    editarProveedor(proveedor) {
      this.proveedorEditando = { ...proveedor };
      this.editandoProveedor = true;
    },

    async guardarEdicionProveedor() {
      if (!this.proveedorEditando.nombre.trim()) {
        alert('El nombre del proveedor es requerido');
        return;
      }

      try {
        this.guardandoProveedor = true;
        const docRef = doc(db, 'proveedoresCrudos', this.proveedorEditando.id);
        
        const updateData = {
          nombre: this.proveedorEditando.nombre.trim(),
          contacto: this.proveedorEditando.contacto?.trim() || null
        };

        await updateDoc(docRef, updateData);
        
        // Actualizar en la lista local
        const index = this.proveedores.findIndex(p => p.id === this.proveedorEditando.id);
        if (index !== -1) {
          this.proveedores[index] = { ...this.proveedores[index], ...updateData };
        }
        
        // Actualizar proveedor seleccionado si es el mismo
        if (this.proveedorSeleccionado?.id === this.proveedorEditando.id) {
          this.proveedorSeleccionado = { ...this.proveedorSeleccionado, ...updateData };
        }
        
        this.cancelarEdicionProveedor();
        this.$emit('actualizado');
        
      } catch (error) {
        console.error('Error al actualizar proveedor:', error);
        alert('Error al actualizar proveedor');
      } finally {
        this.guardandoProveedor = false;
      }
    },

    async eliminarProveedor(proveedor) {
      const medidasAsociadas = this.medidas.filter(m => m.proveedorId === proveedor.id);
      
      let mensaje = `¿Estás seguro de que quieres eliminar el proveedor "${proveedor.nombre}"?`;
      if (medidasAsociadas.length > 0) {
        mensaje += `\n\nEsto también eliminará ${medidasAsociadas.length} medida(s) asociada(s).`;
      }

      if (!confirm(mensaje)) return;

      try {
        // Eliminar medidas asociadas primero
        for (const medida of medidasAsociadas) {
          await deleteDoc(doc(db, 'medidasCrudos', medida.id));
        }

        // Eliminar proveedor
        await deleteDoc(doc(db, 'proveedoresCrudos', proveedor.id));
        
        // Actualizar listas locales
        this.proveedores = this.proveedores.filter(p => p.id !== proveedor.id);
        this.medidas = this.medidas.filter(m => m.proveedorId !== proveedor.id);
        
        // Limpiar selección si era el proveedor seleccionado
        if (this.proveedorSeleccionado?.id === proveedor.id) {
          this.proveedorSeleccionado = null;
        }
        
        this.$emit('actualizado');
        
      } catch (error) {
        console.error('Error al eliminar proveedor:', error);
        alert('Error al eliminar proveedor');
      }
    },

    cancelarProveedor() {
      this.nuevoProveedor = { nombre: '', contacto: '' };
      this.mostrarFormularioProveedor = false;
    },

    cancelarEdicionProveedor() {
      this.editandoProveedor = false;
      this.proveedorEditando = {};
    },

    seleccionarProveedor(proveedor) {
      this.proveedorSeleccionado = proveedor;
      this.cargarMedidas();
      this.mostrarFormularioMedida = false;
    },

    // Gestión de Medidas
    async cargarMedidas() {
      try {
        this.cargandoMedidas = true;
        const querySnapshot = await getDocs(collection(db, 'medidasCrudos'));
        this.medidas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Cargar precios actuales del historial
        await this.cargarPreciosActuales();
        
      } catch (error) {
        console.error('Error al cargar medidas:', error);
        alert('Error al cargar medidas');
      } finally {
        this.cargandoMedidas = false;
      }
    },

    async cargarPreciosActuales() {
      try {
        // Obtener todo el historial de precios
        const historialSnapshot = await getDocs(collection(db, 'historialPreciosCrudos'));
        const historialPrecios = historialSnapshot.docs.map(doc => doc.data());
        
        // Agrupar por medida y obtener el precio más reciente
        const preciosPorMedida = {};
        
        historialPrecios.forEach(registro => {
          if (!preciosPorMedida[registro.medidaId]) {
            preciosPorMedida[registro.medidaId] = [];
          }
          preciosPorMedida[registro.medidaId].push(registro);
        });
        
        // Obtener el precio más reciente para cada medida
        Object.keys(preciosPorMedida).forEach(medidaId => {
          const precios = preciosPorMedida[medidaId];
          const precioMasReciente = precios.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
          
          // Actualizar la medida con el precio actual
          const medidaIndex = this.medidas.findIndex(m => m.id === medidaId);
          if (medidaIndex !== -1) {
            this.medidas[medidaIndex].precioActual = precioMasReciente.precio;
          }
        });
        
      } catch (error) {
        console.error('Error al cargar precios actuales:', error);
      }
    },

    async agregarMedida() {
      if (!this.nuevaMedida.nombre.trim()) {
        alert('El nombre de la medida es requerido');
        return;
      }

      if (!this.proveedorSeleccionado) {
        alert('Debe seleccionar un proveedor');
        return;
      }

      // Verificar que no exista ya para este proveedor
      const existeEnProveedor = this.medidas.some(m => 
        m.proveedorId === this.proveedorSeleccionado.id && 
        m.nombre.toLowerCase() === this.nuevaMedida.nombre.toLowerCase()
      );

      if (existeEnProveedor) {
        alert('Ya existe una medida con ese nombre para este proveedor');
        return;
      }

      try {
        this.guardandoMedida = true;
        const docData = {
          nombre: this.nuevaMedida.nombre.trim(),
          descripcion: this.nuevaMedida.descripcion.trim() || null,
          proveedorId: this.proveedorSeleccionado.id,
          proveedorNombre: this.proveedorSeleccionado.nombre,
          fechaCreacion: new Date(),
          tipo: 'crudos'
        };

        const docRef = await addDoc(collection(db, 'medidasCrudos'), docData);
        
        this.medidas.push({
          id: docRef.id,
          ...docData
        });
        
        this.cancelarMedida();
        this.$emit('actualizado');
        
      } catch (error) {
        console.error('Error al agregar medida:', error);
        alert('Error al agregar medida');
      } finally {
        this.guardandoMedida = false;
      }
    },

    editarMedida(medida) {
      this.medidaEditando = { ...medida };
      this.editandoMedida = true;
    },

    async guardarEdicionMedida() {
      if (!this.medidaEditando.nombre.trim()) {
        alert('El nombre de la medida es requerido');
        return;
      }

      try {
        this.guardandoMedida = true;
        const docRef = doc(db, 'medidasCrudos', this.medidaEditando.id);
        
        const updateData = {
          nombre: this.medidaEditando.nombre.trim(),
          descripcion: this.medidaEditando.descripcion?.trim() || null
        };

        await updateDoc(docRef, updateData);
        
        // Actualizar en la lista local
        const index = this.medidas.findIndex(m => m.id === this.medidaEditando.id);
        if (index !== -1) {
          this.medidas[index] = { ...this.medidas[index], ...updateData };
        }
        
        this.cancelarEdicionMedida();
        this.$emit('actualizado');
        
      } catch (error) {
        console.error('Error al actualizar medida:', error);
        alert('Error al actualizar medida');
      } finally {
        this.guardandoMedida = false;
      }
    },

    async eliminarMedida(medida) {
      if (!confirm(`¿Estás seguro de que quieres eliminar la medida "${medida.nombre}"?`)) return;

      try {
        await deleteDoc(doc(db, 'medidasCrudos', medida.id));
        this.medidas = this.medidas.filter(m => m.id !== medida.id);
        this.$emit('actualizado');
        
      } catch (error) {
        console.error('Error al eliminar medida:', error);
        alert('Error al eliminar medida');
      }
    },

    cancelarMedida() {
      this.nuevaMedida = { nombre: '', descripcion: '' };
      this.mostrarFormularioMedida = false;
    },

    cancelarEdicionMedida() {
      this.editandoMedida = false;
      this.medidaEditando = {};
    },

    // Utilidades
    contarMedidasProveedor(proveedorId) {
      return this.medidas.filter(m => m.proveedorId === proveedorId).length;
    },

    formatearPrecio(precio) {
      return precio ? precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    },

    formatearFecha(fecha) {
      if (!fecha) return '';
      const date = fecha instanceof Date ? fecha : fecha.toDate();
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    // Métodos para historial de precios
    verHistorialPrecios(medida) {
      this.medidaSeleccionada = medida;
      this.mostrarHistorialPrecios = true;
    },

    cerrarHistorialPrecios() {
      this.mostrarHistorialPrecios = false;
      this.medidaSeleccionada = null;
    },

    onHistorialActualizado() {
      // Recargar precios actuales cuando se actualice el historial
      this.cargarPreciosActuales();
      this.$emit('actualizado');
    }
  },

  async mounted() {
    await Promise.all([
      this.cargarProveedores(),
      this.cargarMedidas()
    ]);
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.modal-content {
  background-color: white;
  border-radius: 12px;
  width: 95%;
  max-width: 1200px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 2px solid #e9ecef;
  background-color: #f8f9fa;
  border-radius: 12px 12px 0 0;
}

.modal-header h2 {
  margin: 0;
  color: #3760b0;
  font-size: 1.5rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s;
}

.close-button:hover {
  background-color: #f44336;
  color: white;
}

.modal-body {
  padding: 30px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.seccion-proveedores,
.seccion-medidas {
  background-color: #f8f9fa;
  border-radius: 10px;
  padding: 20px;
}

.seccion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #3760b0;
}

.seccion-header h3 {
  margin: 0;
  color: #3760b0;
  font-size: 1.2rem;
}

.btn-agregar {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn-agregar:hover {
  background-color: #218838;
}

.formulario-proveedor,
.formulario-medida {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
  border: 2px solid #e9ecef;
}

.form-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.form-input {
  flex: 1;
  min-width: 150px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: #3760b0;
  box-shadow: 0 0 0 2px rgba(55, 96, 176, 0.2);
}

.btn-guardar {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn-guardar:hover {
  background-color: #2a4a87;
}

.btn-guardar:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.btn-cancelar {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn-cancelar:hover {
  background-color: #545b62;
}

.lista-proveedores {
  max-height: 400px;
  overflow-y: auto;
}

.proveedor-card {
  background-color: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.proveedor-card:hover {
  border-color: #3760b0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.proveedor-card.selected {
  border-color: #28a745;
  background-color: #f8fff9;
}

.proveedor-info h4 {
  margin: 0 0 5px 0;
  color: #3760b0;
  font-size: 1.1rem;
}

.contacto {
  margin: 5px 0;
  color: #666;
  font-size: 0.9rem;
}

.medidas-count {
  margin: 5px 0 0 0;
  color: #28a745;
  font-size: 0.8rem;
  font-weight: bold;
}

.proveedor-acciones {
  display: flex;
  gap: 5px;
}

.btn-historial,
.btn-editar,
.btn-eliminar {
  padding: 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.btn-historial {
  background-color: #17a2b8;
  color: white;
}

.btn-historial:hover {
  background-color: #138496;
}

.btn-editar {
  background-color: #ffc107;
  color: #212529;
}

.btn-editar:hover {
  background-color: #e0a800;
}

.btn-eliminar {
  background-color: #f44336;
  color: white;
}

.btn-eliminar:hover {
  background-color: #d32f2f;
}

.lista-medidas {
  max-height: 400px;
  overflow-y: auto;
}

.medidas-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.medida-card {
  background-color: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  transition: all 0.3s;
}

.medida-card:hover {
  border-color: #3760b0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.medida-info {
  flex: 1;
}

.medida-info h5 {
  margin: 0 0 8px 0;
  color: #3760b0;
  font-size: 1rem;
}

.descripcion {
  margin: 5px 0;
  color: #666;
  font-size: 0.9rem;
}

.precio-actual {
  margin: 5px 0;
  color: #28a745;
  font-size: 0.9rem;
  font-weight: bold;
}

.fecha-creacion {
  margin: 5px 0 0 0;
  color: #999;
  font-size: 0.8rem;
}

.medida-acciones {
  display: flex;
  gap: 5px;
  margin-left: 10px;
}

.loading,
.no-datos {
  text-align: center;
  color: #666;
  padding: 20px;
  font-style: italic;
}

.mensaje-seleccionar {
  background-color: #f8f9fa;
  border-radius: 10px;
  padding: 40px;
  text-align: center;
  color: #666;
  font-size: 1.1rem;
}

/* Modales de edición */
.modal-overlay-edit {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2100;
}

.modal-edit {
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-body-edit {
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #3760b0;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 15px;
  border-top: 1px solid #e9ecef;
}

@media (max-width: 768px) {
  .modal-body {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 20px;
  }

  .form-row {
    flex-direction: column;
  }

  .form-input {
    min-width: unset;
  }

  .proveedor-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .proveedor-acciones {
    align-self: flex-end;
  }

  .medida-card {
    flex-direction: column;
    gap: 15px;
  }

  .medida-acciones {
    align-self: flex-end;
    margin-left: 0;
  }
}
</style> 