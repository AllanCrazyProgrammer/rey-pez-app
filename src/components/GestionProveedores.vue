<template>
  <div class="gestion-proveedores-container">
    <!-- Botón para abrir modal -->
    <button @click="mostrarModal" class="btn-gestion">
      <i class="fas fa-cogs"></i> Gestión de Proveedores
    </button>

    <!-- Modal de gestión -->
    <b-modal 
      v-model="showModal" 
      title="Gestión de Proveedores" 
      size="lg" 
      @show="cargarProveedores"
      :hide-footer="true"
    >
      <div class="modal-content-custom">
        <!-- Formulario para agregar nuevo proveedor -->
        <div class="agregar-proveedor">
          <h5><i class="fas fa-plus-circle"></i> Agregar Nuevo Proveedor</h5>
          <div class="input-group">
            <input 
              type="text" 
              v-model="nuevoProveedor" 
              placeholder="Nombre del proveedor"
              @keyup.enter="agregarProveedor"
              class="form-control"
              maxlength="50"
            >
            <button @click="agregarProveedor" class="btn-agregar" :disabled="!nuevoProveedor.trim()">
              <i class="fas fa-plus"></i> Agregar
            </button>
          </div>
        </div>

        <!-- Lista de proveedores existentes -->
        <div class="lista-proveedores">
          <h5><i class="fas fa-list"></i> Proveedores Registrados ({{ proveedores.length }})</h5>
          
          <div v-if="proveedores.length === 0" class="no-proveedores">
            <i class="fas fa-inbox"></i>
            <p>No hay proveedores registrados</p>
          </div>

          <div v-else class="proveedores-grid">
            <div 
              v-for="proveedor in proveedoresOrdenados" 
              :key="proveedor.id" 
              class="proveedor-card"
            >
              <div v-if="proveedorEditando === proveedor.id" class="proveedor-editando">
                <input 
                  type="text" 
                  v-model="nombreEditando" 
                  @keyup.enter="guardarEdicion(proveedor)"
                  @keyup.escape="cancelarEdicion"
                  class="form-control-edit"
                  maxlength="50"
                  ref="inputEdit"
                >
                <div class="botones-edicion">
                  <button @click="guardarEdicion(proveedor)" class="btn-guardar" :disabled="!nombreEditando.trim()">
                    <i class="fas fa-check"></i>
                  </button>
                  <button @click="cancelarEdicion" class="btn-cancelar">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>

              <div v-else class="proveedor-info">
                <span class="proveedor-nombre">{{ proveedor.nombre }}</span>
                <div class="proveedor-meta">
                  <small class="fecha-creacion">
                    Creado: {{ formatearFecha(proveedor.createdAt) }}
                  </small>
                </div>
                <div class="proveedor-acciones">
                  <button @click="editarProveedor(proveedor)" class="btn-editar">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button 
                    @click="confirmarEliminar(proveedor)" 
                    class="btn-eliminar"
                    :disabled="proveedor.enUso"
                    :title="proveedor.enUso ? 'No se puede eliminar porque está en uso' : 'Eliminar proveedor'"
                  >
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="modal-footer-custom">
          <div class="footer-info">
            <small class="text-muted">
              <i class="fas fa-info-circle"></i>
              Los proveedores en uso no pueden ser eliminados
            </small>
          </div>
          <button @click="cerrarModal" class="btn-cerrar">
            <i class="fas fa-times"></i> Cerrar
          </button>
        </div>
      </div>
    </b-modal>

    <!-- Toast de notificaciones -->
    <div class="toast-container">
      <div v-if="mensaje.visible" :class="['toast-mensaje', mensaje.tipo]">
        <i :class="mensaje.icono"></i>
        {{ mensaje.texto }}
      </div>
    </div>
  </div>
</template>

<script>
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore'

export default {
  name: 'GestionProveedores',
  data() {
    return {
      showModal: false,
      proveedores: [],
      nuevoProveedor: '',
      proveedorEditando: null,
      nombreEditando: '',
      mensaje: {
        visible: false,
        texto: '',
        tipo: '',
        icono: ''
      }
    }
  },
  computed: {
    proveedoresOrdenados() {
      return [...this.proveedores].sort((a, b) => {
        // Primero ordenar por nombre
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
      })
    }
  },
  methods: {
    mostrarModal() {
      this.showModal = true
    },
    cerrarModal() {
      this.showModal = false
      this.cancelarEdicion()
      this.nuevoProveedor = ''
    },
    async cargarProveedores() {
      try {
        const db = getFirestore()
        const q = query(collection(db, 'proveedores'), orderBy('nombre'))
        const querySnapshot = await getDocs(q)
        
        this.proveedores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))

        // Verificar cuáles están en uso
        await this.verificarProveedoresEnUso()
      } catch (error) {
        console.error('Error al cargar proveedores:', error)
        this.mostrarMensaje('Error al cargar proveedores', 'error')
      }
    },
    async verificarProveedoresEnUso() {
      try {
        const db = getFirestore()
        const preparacionSnapshot = await getDocs(collection(db, 'preparacion'))
        
        const proveedoresEnUso = new Set()
        preparacionSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.medidas) {
            data.medidas.forEach(medida => {
              if (medida.proveedor) {
                proveedoresEnUso.add(medida.proveedor)
              }
            })
          }
        })

        // Marcar proveedores en uso
        this.proveedores.forEach(proveedor => {
          proveedor.enUso = proveedoresEnUso.has(proveedor.nombre)
        })
      } catch (error) {
        console.error('Error al verificar proveedores en uso:', error)
      }
    },
    async agregarProveedor() {
      if (!this.nuevoProveedor.trim()) return

      const nombreNormalizado = this.nuevoProveedor.trim()
      
      // Verificar si ya existe
      if (this.proveedores.some(p => p.nombre.toLowerCase() === nombreNormalizado.toLowerCase())) {
        this.mostrarMensaje('Este proveedor ya existe', 'warning')
        return
      }

      try {
        const db = getFirestore()
        const docRef = await addDoc(collection(db, 'proveedores'), {
          nombre: nombreNormalizado,
          createdAt: new Date(),
          updatedAt: new Date()
        })

        this.proveedores.push({
          id: docRef.id,
          nombre: nombreNormalizado,
          createdAt: new Date(),
          updatedAt: new Date(),
          enUso: false
        })

        this.nuevoProveedor = ''
        this.mostrarMensaje('Proveedor agregado exitosamente', 'success')
        this.$emit('proveedores-actualizados')
      } catch (error) {
        console.error('Error al agregar proveedor:', error)
        this.mostrarMensaje('Error al agregar proveedor', 'error')
      }
    },
    editarProveedor(proveedor) {
      this.proveedorEditando = proveedor.id
      this.nombreEditando = proveedor.nombre
      this.$nextTick(() => {
        if (this.$refs.inputEdit && this.$refs.inputEdit.length > 0) {
          this.$refs.inputEdit[0].focus()
          this.$refs.inputEdit[0].select()
        }
      })
    },
    async guardarEdicion(proveedor) {
      if (!this.nombreEditando.trim()) return

      const nombreNormalizado = this.nombreEditando.trim()
      
      // Verificar si el nuevo nombre ya existe (excepto el actual)
      if (this.proveedores.some(p => 
        p.id !== proveedor.id && 
        p.nombre.toLowerCase() === nombreNormalizado.toLowerCase()
      )) {
        this.mostrarMensaje('Ya existe un proveedor con este nombre', 'warning')
        return
      }

      try {
        const db = getFirestore()
        await updateDoc(doc(db, 'proveedores', proveedor.id), {
          nombre: nombreNormalizado,
          updatedAt: new Date()
        })

        // Actualizar en la lista local
        const index = this.proveedores.findIndex(p => p.id === proveedor.id)
        if (index !== -1) {
          this.proveedores[index].nombre = nombreNormalizado
          this.proveedores[index].updatedAt = new Date()
        }

        this.cancelarEdicion()
        this.mostrarMensaje('Proveedor actualizado exitosamente', 'success')
        this.$emit('proveedores-actualizados')
      } catch (error) {
        console.error('Error al actualizar proveedor:', error)
        this.mostrarMensaje('Error al actualizar proveedor', 'error')
      }
    },
    cancelarEdicion() {
      this.proveedorEditando = null
      this.nombreEditando = ''
    },
    async confirmarEliminar(proveedor) {
      if (proveedor.enUso) {
        this.mostrarMensaje('No se puede eliminar un proveedor que está en uso', 'warning')
        return
      }

      const confirmado = await this.$bvModal.msgBoxConfirm(
        `¿Estás seguro de que deseas eliminar el proveedor "${proveedor.nombre}"?`,
        {
          title: 'Confirmar eliminación',
          size: 'md',
          buttonSize: 'sm',
          okVariant: 'danger',
          okTitle: 'Eliminar',
          cancelTitle: 'Cancelar'
        }
      )

      if (confirmado) {
        await this.eliminarProveedor(proveedor)
      }
    },
    async eliminarProveedor(proveedor) {
      try {
        const db = getFirestore()
        await deleteDoc(doc(db, 'proveedores', proveedor.id))

        this.proveedores = this.proveedores.filter(p => p.id !== proveedor.id)
        this.mostrarMensaje('Proveedor eliminado exitosamente', 'success')
        this.$emit('proveedores-actualizados')
      } catch (error) {
        console.error('Error al eliminar proveedor:', error)
        this.mostrarMensaje('Error al eliminar proveedor', 'error')
      }
    },
    formatearFecha(fecha) {
      if (!fecha) return ''
      const date = fecha.toDate ? fecha.toDate() : new Date(fecha)
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    },
    mostrarMensaje(texto, tipo) {
      const iconos = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
      }

      this.mensaje = {
        visible: true,
        texto,
        tipo,
        icono: iconos[tipo] || iconos.info
      }

      setTimeout(() => {
        this.mensaje.visible = false
      }, 4000)
    }
  }
}
</script>

<style scoped>
.gestion-proveedores-container {
  position: relative;
}

.btn-gestion {
  background: linear-gradient(135deg, #e67e22, #f39c12);
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
  font-size: 0.9rem;
}

.btn-gestion:hover {
  background: linear-gradient(135deg, #f39c12, #e67e22);
  transform: translateY(-2px);
}

.modal-content-custom {
  padding: 0;
}

.agregar-proveedor {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 25px;
}

.agregar-proveedor h5 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-group {
  display: flex;
  gap: 10px;
}

.form-control {
  flex: 1;
  padding: 10px 12px;
  border: 2px solid #e0e6ed;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

.form-control:focus {
  outline: none;
  border-color: #3498db;
}

.btn-agregar {
  background: linear-gradient(135deg, #27ae60, #2ecc71);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-agregar:hover:not(:disabled) {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
}

.btn-agregar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lista-proveedores h5 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
}

.no-proveedores {
  text-align: center;
  padding: 40px;
  color: #6c757d;
}

.no-proveedores i {
  font-size: 3rem;
  margin-bottom: 15px;
  opacity: 0.5;
}

.proveedores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 5px;
}

.proveedor-card {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  transition: all 0.3s ease;
}

.proveedor-card:hover {
  border-color: #3498db;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.1);
}

.proveedor-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.proveedor-nombre {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1rem;
}

.proveedor-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fecha-creacion {
  color: #6c757d;
  font-size: 0.8rem;
}

.proveedor-acciones {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-editar, .btn-eliminar {
  background: none;
  border: 1px solid;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.btn-editar {
  color: #3498db;
  border-color: #3498db;
}

.btn-editar:hover {
  background: #3498db;
  color: white;
}

.btn-eliminar {
  color: #e74c3c;
  border-color: #e74c3c;
}

.btn-eliminar:hover:not(:disabled) {
  background: #e74c3c;
  color: white;
}

.btn-eliminar:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.proveedor-editando {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-control-edit {
  padding: 8px 10px;
  border: 2px solid #3498db;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
}

.botones-edicion {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-guardar, .btn-cancelar {
  background: none;
  border: 1px solid;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-guardar {
  color: #27ae60;
  border-color: #27ae60;
}

.btn-guardar:hover:not(:disabled) {
  background: #27ae60;
  color: white;
}

.btn-guardar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancelar {
  color: #6c757d;
  border-color: #6c757d;
}

.btn-cancelar:hover {
  background: #6c757d;
  color: white;
}

.modal-footer-custom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
  margin-top: 20px;
}

.footer-info {
  color: #6c757d;
  font-size: 0.85rem;
}

.btn-cerrar {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.3s ease;
}

.btn-cerrar:hover {
  background: #5a6268;
}

.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
}

.toast-mensaje {
  padding: 12px 20px;
  border-radius: 6px;
  color: white;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 300px;
  animation: slideIn 0.3s ease;
}

.toast-mensaje.success {
  background: #27ae60;
}

.toast-mensaje.error {
  background: #e74c3c;
}

.toast-mensaje.warning {
  background: #f39c12;
}

.toast-mensaje.info {
  background: #3498db;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .proveedores-grid {
    grid-template-columns: 1fr;
  }

  .input-group {
    flex-direction: column;
  }

  .modal-footer-custom {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .btn-cerrar {
    justify-content: center;
  }

  .toast-mensaje {
    min-width: 250px;
    right: 10px;
  }
}
</style>
