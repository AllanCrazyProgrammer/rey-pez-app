<template>
  <div class="deudas-menu">
    <main class="page-shell">
      <nav class="top-navigation" aria-label="Navegación del módulo">
        <BackButton to="/procesos" />
        <span class="module-label">Procesos / Deudas</span>
      </nav>

      <section class="hero-section" aria-labelledby="deudas-title">
        <div class="hero-copy">
          <span class="eyebrow">Control de proveedores</span>
          <h1 id="deudas-title" class="main-title">Deudas a proveedores</h1>
          <p class="subtitle">
            Registra compras pendientes, consulta saldos y administra tus proveedores desde un solo lugar.
          </p>
          <div class="hero-meta" aria-label="Resumen del módulo">
            <span class="meta-pill">
              <i class="fas fa-building" aria-hidden="true"></i>
              <template v-if="loadingProveedores">Cargando proveedores…</template>
              <template v-else>
                {{ proveedores.length }} {{ proveedores.length === 1 ? 'proveedor' : 'proveedores' }}
              </template>
            </span>
            <span class="meta-pill meta-pill-soft">
              <i class="fas fa-check-circle" aria-hidden="true"></i>
              Saldos y abonos centralizados
            </span>
          </div>
        </div>

        <div class="hero-visual" aria-hidden="true">
          <div class="hero-icon-wrap"><i class="fas fa-receipt"></i></div>
          <div class="floating-chip chip-top">Saldo pendiente</div>
          <div class="floating-chip chip-bottom">Abonos registrados</div>
        </div>
      </section>

      <section class="actions-section" aria-labelledby="actions-title">
        <div class="section-heading">
          <div>
            <span class="section-kicker">¿Qué necesitas hacer?</span>
            <h2 id="actions-title">Elige una acción</h2>
          </div>
          <p>Empieza registrando una deuda o revisa los saldos que ya tienes.</p>
        </div>

        <div class="menu-options">
          <router-link
            to="/procesos/deudas/nueva"
            class="action-card action-card-primary"
            aria-label="Registrar una nueva deuda"
          >
            <span class="step-badge">Acción principal</span>
            <span class="action-icon"><i class="fas fa-plus" aria-hidden="true"></i></span>
            <span class="action-content">
              <strong>Registrar deuda</strong>
              <small>Captura proveedor, productos, precios y un abono inicial.</small>
            </span>
            <span class="action-link">Comenzar <i class="fas fa-arrow-right" aria-hidden="true"></i></span>
          </router-link>

          <router-link
            to="/procesos/deudas/lista"
            class="action-card"
            aria-label="Consultar deudas y registrar abonos"
          >
            <span class="step-badge step-badge-neutral">Consulta</span>
            <span class="action-icon action-icon-blue"><i class="fas fa-list-ul" aria-hidden="true"></i></span>
            <span class="action-content">
              <strong>Consultar y abonar</strong>
              <small>Revisa saldos por proveedor, filtra deudas y registra pagos.</small>
            </span>
            <span class="action-link">Ver deudas <i class="fas fa-arrow-right" aria-hidden="true"></i></span>
          </router-link>

          <button
            @click="openProveedoresModal"
            class="action-card action-card-button"
            aria-label="Administrar proveedores"
          >
            <span class="step-badge step-badge-neutral">Configuración</span>
            <span class="action-icon action-icon-amber"><i class="fas fa-building" aria-hidden="true"></i></span>
            <span class="action-content">
              <strong>Proveedores</strong>
              <small>Agrega, edita y asigna un color para identificarlos rápidamente.</small>
            </span>
            <span class="action-link">Administrar <i class="fas fa-arrow-right" aria-hidden="true"></i></span>
          </button>
        </div>
      </section>

      <section class="quick-suppliers" aria-labelledby="quick-suppliers-title">
        <header class="quick-suppliers-header">
          <div>
            <span class="section-kicker">ACCESO_RÁPIDO</span>
            <h2 id="quick-suppliers-title">Saldos por proveedor</h2>
            <p>Consulta lo pendiente y registra movimientos sin buscar al proveedor nuevamente.</p>
          </div>
          <div class="quick-total">
            <span>DEUDA TOTAL</span>
            <strong>${{ formatNumber(totalPendienteProveedores) }}</strong>
          </div>
        </header>

        <div v-if="loadingProveedores || loadingDeudas" class="quick-suppliers-state">
          <i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i>
          Cargando saldos…
        </div>

        <div v-else-if="proveedoresResumen.length === 0" class="quick-suppliers-state">
          <i class="fas fa-building" aria-hidden="true"></i>
          No hay proveedores registrados.
        </div>

        <div v-else class="quick-suppliers-grid">
          <article
            v-for="proveedor in proveedoresResumen"
            :key="proveedor.id"
            class="quick-supplier-card"
          >
            <div class="quick-supplier-main">
              <span
                class="quick-supplier-color"
                :style="{ backgroundColor: proveedor.color || '#d8ffe9' }"
                aria-hidden="true"
              ></span>
              <div class="quick-supplier-identity">
                <h3>{{ proveedor.nombre }}</h3>
                <span>
                  {{ proveedor.notasPendientes }}
                  {{ proveedor.notasPendientes === 1 ? 'nota pendiente' : 'notas pendientes' }}
                </span>
              </div>
            </div>

            <div :class="['quick-supplier-balance', { clear: proveedor.totalPendiente <= 0 }]">
              <span>SALDO</span>
              <strong>${{ formatNumber(proveedor.totalPendiente) }}</strong>
            </div>

            <div class="quick-supplier-actions">
              <button
                type="button"
                class="quick-action pay"
                :disabled="proveedor.totalPendiente <= 0"
                @click="abrirAbonoRapido(proveedor)"
                :aria-label="`Realizar abono general a ${proveedor.nombre}`"
              >
                <i class="fas fa-money-bill-wave" aria-hidden="true"></i>
                Abonar
              </button>
              <button
                type="button"
                class="quick-action purchase"
                @click="registrarCompra(proveedor)"
                :aria-label="`Registrar compra de ${proveedor.nombre}`"
              >
                <i class="fas fa-plus" aria-hidden="true"></i>
                Registrar compra
              </button>
            </div>
          </article>
        </div>
      </section>

    </main>

    <AbonoGeneralModal
      :mostrar="showAbonoGeneralModal"
      :proveedor="proveedorSeleccionadoParaAbono"
      @cerrar="showAbonoGeneralModal = false"
      @abono-aplicado="onAbonoAplicado"
    />
    
        <!-- Modal para configurar proveedores -->
    <div v-if="showModal" class="modal-overlay" @click="closeModalOnOverlay">
      <div class="modal-content modern-modal" role="dialog" aria-modal="true" aria-labelledby="proveedores-modal-title" @click.stop>
        <div class="modal-header modern-header">
          <div class="header-icon">
            <i class="icon-config">⚙️</i>
          </div>
          <div class="header-text">
            <h2 id="proveedores-modal-title">Gestionar Proveedores</h2>
            <p>Administra los proveedores y asigna colores de identificación</p>
          </div>
          <button @click="showModal = false" class="close-button modern-close" aria-label="Cerrar">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        
        <div class="modal-body modern-body">
          <div class="add-proveedor-section">
            <div class="section-header">
              <i class="section-icon">➕</i>
              <h3>Agregar Nuevo Proveedor</h3>
            </div>
            
            <form @submit.prevent="addProveedor" class="modern-form">
              <div class="form-grid">
                <div class="form-group modern-group">
                  <label for="nombre" class="modern-label">
                    <i class="label-icon">👤</i>
                    Nombre del Proveedor
                  </label>
                  <input 
                    v-model="newProveedor.nombre" 
                    id="nombre" 
                    required 
                    placeholder="Ingrese el nombre del proveedor"
                    class="modern-input"
                  >
                </div>
                
                <div class="form-group modern-group">
                  <label for="telefono" class="modern-label">
                    <i class="label-icon">📞</i>
                    Teléfono (opcional)
                  </label>
                  <input 
                    v-model="newProveedor.telefono" 
                    id="telefono" 
                    placeholder="Ingrese el teléfono"
                    class="modern-input"
                  >
                </div>
              </div>
              
              <div class="color-selection">
                <label class="modern-label">
                  <i class="label-icon">🎨</i>
                  Color de Identificación
                </label>
                <div class="color-options">
                  <button
                    type="button"
                    v-for="color in coloresDisponibles" 
                    :key="color.value"
                    class="color-option"
                    :class="{ 'selected': newProveedor.color === color.value }"
                    @click="newProveedor.color = color.value"
                    :aria-pressed="newProveedor.color === color.value"
                    :aria-label="`Seleccionar color ${color.name}`"
                  >
                    <div 
                      class="color-circle" 
                      :style="{ backgroundColor: color.value }"
                    ></div>
                    <span class="color-name">{{ color.name }}</span>
                  </button>
                </div>
                <p class="color-help">Selecciona un color para identificar fácilmente este proveedor en las listas</p>
              </div>
              
              <button type="submit" class="submit-btn modern-submit" :disabled="!newProveedor.nombre || !newProveedor.color">
                <i class="btn-icon">💾</i>
                <span>Agregar Proveedor</span>
              </button>
            </form>
          </div>
          
          <div class="separator"></div>
          
          <div class="proveedores-list-section">
            <div class="section-header">
              <i class="section-icon">📋</i>
              <h3>Proveedores Registrados</h3>
              <span class="count-badge">{{ proveedores.length }}</span>
            </div>
            
            <div v-if="proveedores.length === 0" class="empty-state">
              <i class="empty-icon">📭</i>
              <p>No hay proveedores registrados</p>
              <span>Agrega tu primer proveedor usando el formulario de arriba</span>
            </div>
            
            <div v-else class="proveedores-grid">
              <div 
                v-for="proveedor in sortedProveedores" 
                :key="proveedor.id"
                class="proveedor-card"
              >
                <div class="proveedor-header">
                  <div class="proveedor-color">
                    <div 
                      class="color-indicator" 
                      :style="{ backgroundColor: proveedor.color || '#cccccc' }"
                    ></div>
                  </div>
                  <div class="proveedor-actions">
                    <button 
                      @click="editarProveedor(proveedor)" 
                      class="edit-btn"
                      title="Editar proveedor"
                      :aria-label="`Editar proveedor ${proveedor.nombre}`"
                    >
                      <i class="fas fa-edit">✏️</i>
                    </button>
                    <button 
                      @click="deleteProveedor(proveedor.id)" 
                      class="delete-btn modern-delete"
                      title="Eliminar proveedor"
                      :aria-label="`Eliminar proveedor ${proveedor.nombre}`"
                    >
                      <i class="fas fa-trash">🗑️</i>
                    </button>
                  </div>
                </div>
                <div class="proveedor-content">
                  <h4 class="proveedor-nombre">{{ proveedor.nombre }}</h4>
                  <p v-if="proveedor.telefono" class="proveedor-telefono">
                    <i class="phone-icon">📞</i>
                    {{ proveedor.telefono }}
                  </p>
                  <span class="proveedor-fecha">
                    Creado: {{ formatearFechaCreacion(proveedor.fechaCreacion) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para editar proveedor -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeEditModalOnOverlay">
      <div class="modal-content modern-modal small-modal" role="dialog" aria-modal="true" aria-labelledby="editar-proveedor-title" @click.stop>
        <div class="modal-header modern-header">
          <div class="header-icon">
            <i class="icon-edit">✏️</i>
          </div>
          <div class="header-text">
            <h2 id="editar-proveedor-title">Editar Proveedor</h2>
            <p>Modifica la información del proveedor</p>
          </div>
          <button @click="showEditModal = false" class="close-button modern-close" aria-label="Cerrar">
            <i class="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
        
        <div class="modal-body modern-body">
          <form @submit.prevent="updateProveedor" class="modern-form">
            <div class="form-group modern-group">
              <label for="editNombre" class="modern-label">
                <i class="label-icon">👤</i>
                Nombre del Proveedor
              </label>
              <input 
                v-model="editingProveedor.nombre" 
                id="editNombre" 
                required 
                placeholder="Ingrese el nombre del proveedor"
                class="modern-input"
              >
            </div>
            
            <div class="form-group modern-group">
              <label for="editTelefono" class="modern-label">
                <i class="label-icon">📞</i>
                Teléfono (opcional)
              </label>
              <input 
                v-model="editingProveedor.telefono" 
                id="editTelefono" 
                placeholder="Ingrese el teléfono"
                class="modern-input"
              >
            </div>
            
            <div class="color-selection">
              <label class="modern-label">
                <i class="label-icon">🎨</i>
                Color de Identificación
              </label>
              <div class="color-options">
                <button
                  type="button"
                  v-for="color in coloresDisponibles" 
                  :key="color.value"
                  class="color-option"
                  :class="{ 'selected': editingProveedor.color === color.value }"
                  @click="editingProveedor.color = color.value"
                  :aria-pressed="editingProveedor.color === color.value"
                  :aria-label="`Seleccionar color ${color.name}`"
                >
                  <div 
                    class="color-circle" 
                    :style="{ backgroundColor: color.value }"
                  ></div>
                  <span class="color-name">{{ color.name }}</span>
                </button>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" @click="showEditModal = false" class="cancel-btn">
                <i class="btn-icon">❌</i>
                <span>Cancelar</span>
              </button>
              <button type="submit" class="submit-btn modern-submit" :disabled="!editingProveedor.nombre || !editingProveedor.color">
                <i class="btn-icon">💾</i>
                <span>Guardar Cambios</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import AbonoGeneralModal from '@/components/Deudas/AbonoGeneralModal.vue';
import { formatNumber } from '@/utils/formatters';

export default {
  name: 'DeudasMenu',
  components: {
    BackButton,
    AbonoGeneralModal
  },
  data() {
    return {
      showModal: false,
      showEditModal: false,
      showAbonoGeneralModal: false,
      loadingProveedores: true,
      loadingDeudas: true,
      proveedores: [],
      deudas: [],
      proveedorSeleccionadoParaAbono: null,
      newProveedor: {
        nombre: '',
        telefono: '',
        color: ''
      },
      editingProveedor: {
        id: '',
        nombre: '',
        telefono: '',
        color: ''
      },
      coloresDisponibles: [
        { name: 'Azul', value: '#3498DB' },
        { name: 'Verde', value: '#2ECC71' },
        { name: 'Rojo', value: '#E74C3C' },
        { name: 'Naranja', value: '#F39C12' },
        { name: 'Púrpura', value: '#9B59B6' },
        { name: 'Turquesa', value: '#1ABC9C' },
        { name: 'Rosa', value: '#E91E63' },
        { name: 'Índigo', value: '#673AB7' },
        { name: 'Amarillo', value: '#F1C40F' },
        { name: 'Coral', value: '#FF7675' },
        { name: 'Aguamarina', value: '#00CEC9' },
        { name: 'Lima', value: '#6C5CE7' }
      ]
    };
  },
  computed: {
    sortedProveedores() {
      return [...this.proveedores].sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
    proveedoresResumen() {
      return this.proveedores
        .map(proveedor => {
          const deudasProveedor = this.deudas.filter(deuda => deuda.proveedorId === proveedor.id);
          const totalPendiente = deudasProveedor.reduce(
            (total, deuda) => total + Math.max(0, Number(deuda.saldoPendiente) || 0),
            0
          );
          const notasPendientes = deudasProveedor.filter(
            deuda => (Number(deuda.saldoPendiente) || 0) > 0
          ).length;

          return {
            ...proveedor,
            totalPendiente,
            notasPendientes
          };
        })
        .sort((a, b) => {
          if (b.totalPendiente !== a.totalPendiente) return b.totalPendiente - a.totalPendiente;
          return a.nombre.localeCompare(b.nombre);
        });
    },
    totalPendienteProveedores() {
      return this.proveedoresResumen.reduce(
        (total, proveedor) => total + proveedor.totalPendiente,
        0
      );
    }
  },
  methods: {
    formatNumber,
    openProveedoresModal() {
      this.showModal = true;
      this.loadProveedores();
    },
    closeModalOnOverlay(event) {
      if (event.target === event.currentTarget) {
        this.showModal = false;
      }
    },
    closeEditModalOnOverlay(event) {
      if (event.target === event.currentTarget) {
        this.showEditModal = false;
      }
    },
    async loadProveedores() {
      this.loadingProveedores = true;
      try {
        const querySnapshot = await getDocs(collection(db, 'proveedoresDeuda'));
        this.proveedores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar proveedores: ", error);
      } finally {
        this.loadingProveedores = false;
      }
    },
    async loadDeudas() {
      this.loadingDeudas = true;
      try {
        const querySnapshot = await getDocs(collection(db, 'deudas'));
        this.deudas = querySnapshot.docs.map(documento => ({
          id: documento.id,
          ...documento.data()
        }));
      } catch (error) {
        console.error('Error al cargar deudas para el resumen: ', error);
        this.deudas = [];
      } finally {
        this.loadingDeudas = false;
      }
    },
    abrirAbonoRapido(proveedor) {
      if (!proveedor?.id || proveedor.totalPendiente <= 0) return;
      this.proveedorSeleccionadoParaAbono = proveedor;
      this.showAbonoGeneralModal = true;
    },
    registrarCompra(proveedor) {
      if (!proveedor?.id) return;
      this.$router.push({
        path: '/procesos/deudas/nueva',
        query: { proveedorId: proveedor.id }
      });
    },
    async onAbonoAplicado() {
      await this.loadDeudas();
    },
    async addProveedor() {
      try {
        if (!this.newProveedor.nombre || !this.newProveedor.color) {
          alert('Por favor, ingrese el nombre del proveedor y seleccione un color.');
          return;
        }
        
        await addDoc(collection(db, 'proveedoresDeuda'), {
          nombre: this.newProveedor.nombre,
          telefono: this.newProveedor.telefono || '',
          color: this.newProveedor.color,
          fechaCreacion: new Date()
        });
        
        this.newProveedor = { nombre: '', telefono: '', color: '' };
        this.loadProveedores();
        
        // Mostrar mensaje de éxito
        alert('Proveedor agregado exitosamente');
      } catch (error) {
        console.error("Error al añadir proveedor: ", error);
        alert('Error al agregar proveedor: ' + error.message);
      }
    },
    editarProveedor(proveedor) {
      this.editingProveedor = {
        id: proveedor.id,
        nombre: proveedor.nombre,
        telefono: proveedor.telefono || '',
        color: proveedor.color || '#3498DB'
      };
      this.showEditModal = true;
    },
    async updateProveedor() {
      try {
        if (!this.editingProveedor.nombre || !this.editingProveedor.color) {
          alert('Por favor, ingrese el nombre del proveedor y seleccione un color.');
          return;
        }
        
        await updateDoc(doc(db, 'proveedoresDeuda', this.editingProveedor.id), {
          nombre: this.editingProveedor.nombre,
          telefono: this.editingProveedor.telefono || '',
          color: this.editingProveedor.color,
          fechaModificacion: new Date()
        });
        
        this.showEditModal = false;
        this.loadProveedores();
        
        // Mostrar mensaje de éxito
        alert('Proveedor actualizado exitosamente');
      } catch (error) {
        console.error("Error al actualizar proveedor: ", error);
        alert('Error al actualizar proveedor: ' + error.message);
      }
    },
    async deleteProveedor(proveedorId) {
      if (confirm('¿Estás seguro de que quieres eliminar este proveedor? Esta acción no se puede deshacer.')) {
        try {
          await deleteDoc(doc(db, 'proveedoresDeuda', proveedorId));
          this.loadProveedores();
          alert('Proveedor eliminado exitosamente');
        } catch (error) {
          console.error("Error al eliminar proveedor: ", error);
          alert('Error al eliminar proveedor: ' + error.message);
        }
      }
    },
    formatearFechaCreacion(fecha) {
      if (!fecha) return 'Fecha no disponible';
      
      try {
        // Manejar diferentes tipos de fecha (Timestamp de Firebase o Date)
        let fechaObj;
        if (fecha.toDate) {
          fechaObj = fecha.toDate();
        } else if (fecha instanceof Date) {
          fechaObj = fecha;
        } else {
          fechaObj = new Date(fecha);
        }
        
        const opciones = { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        };
        return fechaObj.toLocaleDateString('es-ES', opciones);
      } catch (error) {
        console.error('Error al formatear fecha:', error);
        return 'Fecha inválida';
      }
    }
  },
  async mounted() {
    await Promise.all([this.loadProveedores(), this.loadDeudas()]);
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap');
.deudas-menu {
  min-height: 100vh;
  background:
    radial-gradient(circle at 8% 5%, rgba(79, 70, 229, 0.1), transparent 28rem),
    linear-gradient(180deg, #f8faff 0%, #f3f6fb 100%);
  color: #172033;
  position: relative;
  font-family: Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.page-shell {
  width: min(1180px, calc(100% - 48px));
  margin: 0 auto;
  padding: 28px 0 48px;
}

.top-navigation {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.top-navigation ::v-deep .btn-back {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  margin: 0;
  padding: 9px 15px;
  border: 1px solid #d8deea;
  border-radius: 10px;
  background: #ffffff;
  color: #344054;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  font-size: 0.9rem;
  font-weight: 600;
}

.top-navigation ::v-deep .btn-back::before {
  content: "←";
  margin-right: 7px;
  font-size: 1rem;
}

.top-navigation ::v-deep .btn-back:hover {
  background: #f8fafc;
  border-color: #b9c3d4;
  color: #172033;
}

.module-label {
  color: #687387;
  font-size: 0.9rem;
  font-weight: 500;
}

.hero-section {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.55fr);
  align-items: center;
  min-height: 310px;
  padding: 48px 54px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 28px;
  background: linear-gradient(125deg, #172554 0%, #243b80 53%, #4f46e5 100%);
  box-shadow: 0 24px 70px rgba(30, 41, 89, 0.18);
  color: #ffffff;
}

.hero-section::after {
  content: "";
  position: absolute;
  right: -80px;
  bottom: -150px;
  width: 390px;
  height: 390px;
  border: 62px solid rgba(255, 255, 255, 0.07);
  border-radius: 50%;
}

.hero-copy {
  position: relative;
  z-index: 2;
  max-width: 670px;
}

.eyebrow,
.section-kicker {
  display: block;
  margin-bottom: 11px;
  color: #c7d2fe;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.main-title {
  margin: 0;
  color: #ffffff;
  font-size: clamp(2.3rem, 5vw, 4.15rem);
  font-weight: 800;
  letter-spacing: -0.045em;
  line-height: 1.02;
}

.subtitle {
  max-width: 610px;
  margin: 20px 0 0;
  color: #dbe4ff;
  font-size: 1.08rem;
  line-height: 1.65;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;
}

.meta-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  font-size: 0.84rem;
  font-weight: 600;
}

.meta-pill-soft {
  color: #dbe4ff;
  background: rgba(5, 14, 43, 0.18);
}

.hero-visual {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  min-height: 200px;
}

.hero-icon-wrap {
  display: grid;
  place-items: center;
  width: 132px;
  height: 132px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 34px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.08));
  box-shadow: 0 24px 50px rgba(4, 10, 39, 0.28);
  color: #ffffff;
  font-size: 3.45rem;
  transform: rotate(-4deg);
}

.floating-chip {
  position: absolute;
  padding: 9px 13px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 12px 28px rgba(4, 10, 39, 0.22);
  color: #25335f;
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
}

.chip-top { top: 22px; right: 0; }
.chip-bottom { bottom: 16px; left: 0; }

.actions-section {
  padding-top: 46px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 30px;
  margin-bottom: 22px;
}

.section-kicker {
  margin-bottom: 6px;
  color: #4f46e5;
}

.section-heading h2 {
  margin: 0;
  color: #172033;
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.section-heading p {
  max-width: 450px;
  margin: 0 0 3px;
  color: #687387;
  font-size: 0.95rem;
  line-height: 1.5;
}

.menu-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.action-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 286px;
  padding: 23px;
  overflow: hidden;
  border: 1px solid #e1e6ef;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(23, 32, 51, 0.06);
  color: #172033;
  cursor: pointer;
  text-align: left;
  text-decoration: none;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.action-card:hover {
  border-color: #c6ceff;
  box-shadow: 0 16px 34px rgba(23, 32, 51, 0.1);
  color: #172033;
  text-decoration: none;
  transform: translateY(-4px);
}

.action-card:focus-visible {
  outline: 3px solid rgba(79, 70, 229, 0.3);
  outline-offset: 3px;
}

.action-card-button {
  width: 100%;
  font: inherit;
}

.action-card-primary {
  border-color: #4338ca;
  background: linear-gradient(145deg, #4f46e5 0%, #3730a3 100%);
  box-shadow: 0 16px 32px rgba(67, 56, 202, 0.2);
  color: #ffffff;
}

.action-card-primary:hover {
  border-color: #4338ca;
  box-shadow: 0 20px 38px rgba(67, 56, 202, 0.28);
  color: #ffffff;
}

.step-badge {
  align-self: flex-start;
  padding: 6px 9px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.16);
  color: #eef2ff;
  font-size: 0.69rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.step-badge-neutral {
  background: #f1f3f8;
  color: #596579;
}

.action-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-top: 22px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  font-size: 1.12rem;
}

.action-icon-blue {
  background: #eef2ff;
  color: #4f46e5;
}

.action-icon-amber {
  background: #fff5dc;
  color: #b76b00;
}

.action-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 19px;
}

.action-content strong {
  font-size: 1.24rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.action-content small {
  color: #687387;
  font-size: 0.88rem;
  line-height: 1.55;
}

.action-card-primary .action-content small {
  color: #dbe4ff;
}

.action-link {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 22px;
  color: #4338ca;
  font-size: 0.87rem;
  font-weight: 800;
}

.action-link i {
  transition: transform 180ms ease;
}

.action-card:hover .action-link i {
  transform: translateX(4px);
}

.action-card-primary .action-link {
  color: #ffffff;
}

@media (max-width: 900px) {
  .hero-section {
    grid-template-columns: 1fr;
    padding: 42px;
  }

  .hero-visual {
    display: none;
  }

  .menu-options {
    grid-template-columns: 1fr;
  }

  .action-card {
    min-height: 250px;
  }
}

@media (max-width: 640px) {
  .page-shell {
    width: min(100% - 28px, 1180px);
    padding-top: 16px;
  }

  .module-label {
    display: none;
  }

  .hero-section {
    min-height: 0;
    padding: 34px 24px;
    border-radius: 22px;
  }

  .main-title {
    font-size: 2.35rem;
  }

  .subtitle {
    font-size: 0.98rem;
  }

  .meta-pill-soft {
    display: none;
  }

  .actions-section {
    padding-top: 34px;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .section-heading p {
    font-size: 0.88rem;
  }

  .action-card {
    min-height: 250px;
  }

}

/* Modal styles modernos */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content.modern-modal {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 25px;
  width: 95%;
  max-width: 800px;
  max-height: 95vh;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  animation: slideIn 0.4s ease-out;
}

.modal-content.small-modal {
  max-width: 600px;
}

@keyframes slideIn {
  from { 
    opacity: 0;
    transform: translateY(-50px) scale(0.9);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header.modern-header {
  background: linear-gradient(125deg, #172554 0%, #4f46e5 100%);
  color: white;
  padding: 25px 30px;
  display: flex;
  align-items: center;
  gap: 20px;
  border-bottom: none;
}

.header-icon {
  font-size: 2.5rem;
  opacity: 0.9;
}

.header-text h2 {
  margin: 0 0 5px 0;
  font-size: 1.8rem;
  font-weight: 700;
}

.header-text p {
  margin: 0;
  opacity: 0.9;
  font-size: 1rem;
  font-weight: 300;
}

.close-button.modern-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  font-size: 1.2rem;
  transition: all 0.3s ease;
  margin-left: auto;
}

.close-button.modern-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.modal-body.modern-body {
  padding: 30px;
  max-height: calc(95vh - 120px);
  overflow-y: auto;
}

/* Secciones del modal */
.add-proveedor-section, .proveedores-list-section {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid rgba(102, 126, 234, 0.1);
}

.section-icon {
  font-size: 1.8rem;
  color: #667eea;
}

.section-header h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: #2c3e50;
  flex: 1;
}

.count-badge {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
}

.separator {
  height: 2px;
  background: linear-gradient(90deg, transparent, #667eea, transparent);
  margin: 40px 0;
  border-radius: 2px;
}

/* Formulario moderno */
.modern-form {
  background: rgba(255, 255, 255, 0.7);
  padding: 25px;
  border-radius: 20px;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 25px;
}

.form-group.modern-group {
  margin-bottom: 0;
}

.modern-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #2c3e50;
  font-weight: 600;
  font-size: 0.95rem;
}

.label-icon {
  font-size: 1.1rem;
}

.modern-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.8);
  box-sizing: border-box;
}

.modern-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  background: white;
}

/* Selector de colores */
.color-selection {
  margin-bottom: 25px;
}

.color-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 10px;
}

.color-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.5);
}

.color-option:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-2px);
}

.color-option.selected {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.color-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.color-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: #2c3e50;
}

.color-help {
  margin: 0;
  font-size: 0.85rem;
  color: #7f8c8d;
  font-style: italic;
}

/* Botones modernos */
.submit-btn.modern-submit {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 15px 25px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
  width: 100%;
  justify-content: center;
}

.submit-btn.modern-submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.submit-btn.modern-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 1.1rem;
}

/* Estados vacíos */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 15px;
  display: block;
}

.empty-state p {
  margin: 0 0 5px 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.empty-state span {
  font-size: 0.9rem;
  opacity: 0.8;
}

/* Grid de proveedores */
.proveedores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.proveedor-card {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 15px;
  padding: 20px;
  border: 2px solid rgba(102, 126, 234, 0.1);
  transition: all 0.3s ease;
}

.proveedor-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
}

.proveedor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.proveedor-color {
  display: flex;
  align-items: center;
}

.color-indicator {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.proveedor-actions {
  display: flex;
  gap: 8px;
}

.edit-btn, .delete-btn.modern-delete {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.edit-btn {
  background: linear-gradient(45deg, #3498DB, #2980B9);
  color: white;
}

.edit-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.4);
}

.delete-btn.modern-delete {
  background: linear-gradient(45deg, #E74C3C, #C0392B);
  color: white;
}

.delete-btn.modern-delete:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

.proveedor-content h4 {
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
}

.proveedor-telefono {
  margin: 5px 0;
  color: #7f8c8d;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 5px;
}

.proveedor-fecha {
  font-size: 0.8rem;
  color: #95a5a6;
  font-style: italic;
}

/* Acciones del formulario de edición */
.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
}

.cancel-btn {
  background: linear-gradient(45deg, #95a5a6, #7f8c8d);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  flex: 1;
  justify-content: center;
}

.cancel-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(149, 165, 166, 0.4);
}

.form-actions .submit-btn.modern-submit {
  flex: 1;
}

/* Responsive adjustments for modal */
@media (max-width: 768px) {
  .modal-content.modern-modal {
    width: 98%;
    margin: 10px;
    max-height: 98vh;
  }
  
  .modal-header.modern-header {
    padding: 20px;
    flex-wrap: wrap;
  }
  
  .header-icon {
    font-size: 2rem;
  }
  
  .header-text h2 {
    font-size: 1.5rem;
  }
  
  .header-text p {
    font-size: 0.9rem;
  }
  
  .modal-body.modern-body {
    padding: 20px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .color-options {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 8px;
  }
  
  .color-option {
    padding: 8px 10px;
  }
  
  .color-name {
    font-size: 0.8rem;
  }
  
  .proveedores-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .proveedor-card {
    padding: 15px;
  }
  
  .section-header {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .section-icon {
    font-size: 1.5rem;
  }
  
  .section-header h3 {
    font-size: 1.2rem;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .modern-input {
    font-size: 16px; /* Prevent zoom on iOS */
  }
}

@media (max-width: 480px) {
  .modal-content.modern-modal {
    width: 100%;
    height: 100vh;
    border-radius: 0;
    max-height: 100vh;
  }
  
  .modal-header.modern-header {
    padding: 15px;
  }
  
  .header-icon {
    font-size: 1.8rem;
  }
  
  .header-text h2 {
    font-size: 1.3rem;
  }
  
  .modal-body.modern-body {
    padding: 15px;
  }
  
  .modern-form {
    padding: 20px;
  }
  
  .color-options {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .proveedor-card {
    padding: 12px;
  }
  
  .proveedor-content h4 {
    font-size: 1.1rem;
  }
  
  .separator {
    margin: 30px 0;
  }
}
/* Terminal CRT theme shared with Procesos */
.deudas-menu { --green:#00ff88;--amber:#ffb000;--cyan:#22d3ee;--line:rgba(0,255,136,.27); min-height:100vh; background:repeating-linear-gradient(0deg,rgba(255,255,255,.017) 0,rgba(255,255,255,.017) 1px,transparent 1px,transparent 4px),radial-gradient(circle at 50% -20%,#102a1d,#050a08 48%); color:#d8ffe9; font-family:'Share Tech Mono',monospace; }
.page-shell{width:min(1180px,calc(100% - 40px));padding:24px 0 55px}.top-navigation{margin-bottom:18px}.top-navigation ::v-deep .btn-back{border:1px solid var(--line);border-radius:0;background:#07100c;color:var(--green);font:.8rem 'Share Tech Mono',monospace}.top-navigation ::v-deep .btn-back::before{color:var(--amber)}.module-label{color:#668573;font-size:.72rem}
.hero-section{display:block;min-height:0;padding:0;border:1px solid var(--line);border-radius:0;background:rgba(3,14,9,.94);box-shadow:0 0 28px rgba(0,255,136,.08),inset 0 0 50px rgba(0,255,136,.025)}.hero-section::before{content:'●  ●  ●     DEUDAS_SYSTEM.db — bash';display:block;padding:9px 13px;border-bottom:1px solid var(--line);background:#0a1711;color:#6b8b77;font-size:.65rem;letter-spacing:.08em}.hero-section::after{display:none}.hero-copy{max-width:none;padding:28px 32px 31px}.eyebrow{color:var(--amber);font-size:.67rem}.main-title{color:var(--green);font:3.45rem/1 'VT323',monospace;letter-spacing:.04em;text-shadow:0 0 11px rgba(0,255,136,.52)}.main-title::before{content:'> ';color:var(--amber)}.main-title::after{content:'_';animation:crtBlink 1s steps(1) infinite}.subtitle{margin-top:10px;color:#86a592;font-size:.82rem}.hero-meta{margin-top:20px}.meta-pill{border:1px solid var(--line);border-radius:0;background:#07110c;color:#b8d9c4;font-size:.67rem}.meta-pill-soft{color:var(--cyan);border-color:rgba(34,211,238,.3)}.hero-visual{display:none}@keyframes crtBlink{50%{opacity:0}}
.actions-section{padding-top:30px}.section-kicker{color:var(--green);font-size:.65rem}.section-heading h2{color:#d8ffe9;font:1.7rem 'VT323',monospace;letter-spacing:.04em}.section-heading p{color:#698573;font-size:.72rem}.menu-options{gap:12px}.action-card{min-height:250px;padding:19px;border:1px solid var(--line);border-radius:0;background:#06100b;box-shadow:inset 0 0 28px rgba(0,255,136,.02);color:#d8ffe9}.action-card:hover{border-color:var(--green);box-shadow:0 0 18px rgba(0,255,136,.09);color:#d8ffe9;transform:translateY(-2px)}.action-card-primary{border-color:var(--green);background:linear-gradient(145deg,rgba(0,255,136,.11),#06100b);color:#d8ffe9;box-shadow:inset 0 0 30px rgba(0,255,136,.045)}.action-card-primary:hover{color:#d8ffe9}.step-badge,.step-badge-neutral{border:1px solid #31513e;border-radius:0;background:transparent;color:#789783;font-size:.58rem}.action-card-primary .step-badge{border-color:var(--green);color:var(--green)}.action-icon,.action-icon-blue,.action-icon-amber{border:1px solid var(--green);border-radius:0;background:transparent;color:var(--green)}.action-icon-blue{border-color:var(--cyan);color:var(--cyan)}.action-icon-amber{border-color:var(--amber);color:var(--amber)}.action-content strong{color:#d8ffe9;font-size:1rem;text-transform:uppercase}.action-content small,.action-card-primary .action-content small{color:#718d7b;font-size:.72rem}.action-link,.action-card-primary .action-link{color:var(--green);font-size:.7rem}
.quick-suppliers {
  margin-top: 30px;
  border: 1px solid var(--line);
  background: rgba(3, 13, 8, 0.94);
  box-shadow: inset 0 0 36px rgba(0, 255, 136, 0.025);
}
.quick-suppliers-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 22px;
  border-bottom: 1px solid var(--line);
  background: #07130d;
}
.quick-suppliers-header h2 {
  margin: 4px 0 3px;
  color: #fff;
  font: 1.65rem 'VT323', monospace;
  letter-spacing: .04em;
}
.quick-suppliers-header p {
  margin: 0;
  color: #718b7a;
  font-size: .7rem;
}
.quick-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  min-width: 170px;
}
.quick-total span,
.quick-supplier-balance span {
  color: #6f8c79;
  font-size: .58rem;
  letter-spacing: .12em;
}
.quick-total strong {
  color: var(--amber);
  font: 1.5rem 'VT323', monospace;
}
.quick-suppliers-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 120px;
  color: #789583;
  font-size: .72rem;
}
.quick-suppliers-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: var(--line);
}
.quick-supplier-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px 20px;
  padding: 17px;
  background: #050d09;
}
.quick-supplier-main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 11px;
}
.quick-supplier-color {
  flex: 0 0 auto;
  width: 12px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, .55);
  box-shadow: 0 0 9px rgba(255, 255, 255, .12);
}
.quick-supplier-identity {
  min-width: 0;
}
.quick-supplier-identity h3 {
  overflow: hidden;
  margin: 0 0 3px;
  color: #fff;
  font: 1.08rem 'Share Tech Mono', monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.quick-supplier-identity span {
  color: #718c7a;
  font-size: .62rem;
}
.quick-supplier-balance {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.quick-supplier-balance strong {
  color: var(--amber);
  font: 1.28rem 'VT323', monospace;
}
.quick-supplier-balance.clear strong {
  color: var(--green);
}
.quick-supplier-actions {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.quick-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 38px;
  border-radius: 0;
  background: transparent;
  cursor: pointer;
  font: .68rem 'Share Tech Mono', monospace;
  letter-spacing: .03em;
}
.quick-action.pay {
  border: 1px solid var(--cyan);
  color: var(--cyan);
}
.quick-action.purchase {
  border: 1px solid var(--green);
  color: var(--green);
}
.quick-action:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
.quick-action:disabled {
  border-color: #294136;
  color: #51675a;
  cursor: not-allowed;
  opacity: .7;
}
.modal-header.modern-header{background:#091710;border-bottom:1px solid var(--line)}.modal-content.modern-modal{border:1px solid var(--line);border-radius:0;background:#07100c;color:#d8ffe9}.modern-form{border:1px solid var(--line);border-radius:0;background:#050d09}.modern-label,.section-header h3{color:#cfeadb}.proveedor-nombre{color:#fff!important}.modern-input{border:1px solid #26503a;border-radius:0;background:#020805;color:#e0ffea}.modern-input:focus{border-color:var(--green);background:#020805}.color-option{border-radius:0;background:#07110c}.color-option.selected{border-color:var(--green);background:rgba(0,255,136,.08)}.color-name,.color-help,.proveedor-fecha{color:#789381}.proveedor-card{border-radius:0;background:#050d09}.submit-btn.modern-submit{border:1px solid var(--green);border-radius:0;background:var(--green);color:#021008}.count-badge{border-radius:0;background:var(--green);color:#021008}
@media(max-width:800px){.quick-suppliers-grid{grid-template-columns:1fr}}
@media(max-width:640px){.page-shell{width:min(100% - 22px,1180px)}.hero-copy{padding:22px 18px}.main-title{font-size:2.55rem}.menu-options{grid-template-columns:1fr}.action-card{min-height:230px}.quick-suppliers-header{align-items:flex-start;flex-direction:column}.quick-total{align-items:flex-start}.quick-supplier-card{grid-template-columns:1fr}.quick-supplier-balance{align-items:flex-start}.quick-supplier-actions{grid-column:1}.quick-supplier-actions{grid-template-columns:1fr}}
</style>
