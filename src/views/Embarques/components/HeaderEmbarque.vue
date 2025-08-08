<!-- HeaderEmbarque.vue -->
<template>
  <div class="header-embarque">
    <div class="titulo-con-indicador">
      <h1>{{ modoEdicion ? 'Embarque' : 'Nuevo Embarque' }}</h1>
      <div v-if="modoEdicion" class="badge-usuarios" :title="tooltipUsuarios">
        <span class="punto"></span>
        <span class="texto">{{ usuariosEditando.length }} editando</span>
      </div>
    </div>
    <div class="botones">
      <button @click="volverAEmbarquesMenu" class="btn-volver">
        <i class="fas fa-arrow-left"></i> Volver a Menu
      </button>
      <button @click="toggleBloqueo" :class="['btn-bloqueo', { 'bloqueado': embarqueBloqueado }]">
        <i :class="['fas', embarqueBloqueado ? 'fa-lock' : 'fa-lock-open']"></i>
        {{ embarqueBloqueado ? 'Desbloquear' : 'Bloquear' }} Embarque
      </button>
      <button @click="abrirConfiguracionMedidas" class="btn-configuracion-medidas">
        <i class="fas fa-cog"></i> Configurar Medidas
      </button>
    </div>

    <div class="botones-accion">
      <button @click="verPedidoDelDia" class="btn btn-success" title="Ver pedido del día de hoy">
        <i class="fas fa-clipboard-list"></i> Pedido del Día
      </button>
      <button @click="$emit('generar-taras')" class="btn btn-info" :disabled="isGeneratingPdf">
        <span v-if="isGeneratingPdf && pdfType === 'taras'" class="loader-inline"></span>
        <i v-else class="fas fa-file-pdf"></i> PDF Taras
      </button>
      <button @click="$emit('generar-resumen')" class="btn btn-info" :disabled="isGeneratingPdf">
        <span v-if="isGeneratingPdf && pdfType === 'resumen'" class="loader-inline"></span>
        <i v-else class="fas fa-file-pdf"></i> Resumen Embarque
      </button>
      <router-link v-if="embarqueId && embarqueId !== ''" :to="{ name: 'Rendimientos', params: { id: embarqueId } }" class="btn btn-warning"
        :class="{ 'disabled': isGeneratingPdf }">
        <i class="fas fa-chart-line"></i> Rendimientos
      </router-link>
      <precios-historial-modal 
        :clienteActual="clienteEmbarque"
        @precio-agregado="onPrecioAgregado">
      </precios-historial-modal>
    </div>

    <div class="header">
      <div class="header-row">
        <div class="fecha-selector">
          <label for="fecha">Fecha de Embarque:</label>
          <input type="date" id="fecha" v-model="fechaLocal" class="form-control" required :disabled="embarqueBloqueado"
            @change="actualizarFecha">
        </div>
        <div class="carga-selector">
          <label for="cargaCon">Carga con:</label>
          <select id="cargaCon" v-model="cargaConLocal" class="form-control" required :disabled="embarqueBloqueado"
            @change="actualizarCargaCon">
            <option value="">Seleccionar</option>
            <option value="Porro">Porro</option>
            <option value="Caminante">Caminante</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Modal del Pedido del Día -->
    <PedidoDelDiaModal 
      :mostrar="mostrarModalPedido"
      :fechaEmbarque="fechaLocal"
      @cerrar="cerrarModalPedido"
    />
  </div>
</template>

<script>
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';
import PedidoDelDiaModal from './PedidoDelDiaModal.vue';

export default {
  name: 'HeaderEmbarque',
  components: {
    PreciosHistorialModal,
    PedidoDelDiaModal
  },
  props: {
    modoEdicion: {
      type: Boolean,
      default: false
    },
    embarqueBloqueado: {
      type: Boolean,
      default: false
    },
    embarque: {
      type: Object,
      required: true,
      validator: (obj) => {
        return 'fecha' in obj && 'cargaCon' in obj;
      }
    },
    isGeneratingPdf: {
      type: Boolean,
      default: false
    },
    pdfType: {
      type: String,
      default: ''
    },
    embarqueId: {
      type: String,
      default: ''
    },
    usuariosEditando: {
      type: Array,
      default: () => []
    },
    clienteEmbarque: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      fechaLocal: this.embarque.fecha,
      cargaConLocal: this.embarque.cargaCon,
      mostrarModalPedido: false
    };
  },
  computed: {
    tooltipUsuarios() {
      if (!this.usuariosEditando || this.usuariosEditando.length === 0) return 'Sin usuarios editando';
      const nombres = this.usuariosEditando.map(u => u.username || 'Desconocido').join(', ');
      return `${this.usuariosEditando.length} editando: ${nombres}`;
    }
  },
  watch: {
    'embarque.fecha'(newVal) {
      this.fechaLocal = newVal;
    },
    'embarque.cargaCon'(newVal) {
      this.cargaConLocal = newVal;
    }
  },
  methods: {
    volverAEmbarquesMenu() {
      this.$emit('volver');
    },
    toggleBloqueo() {
      this.$emit('toggle-bloqueo');
    },
    actualizarFecha() {
      if (this.embarqueId) {
        localStorage.setItem('ultimoEmbarqueId', this.embarqueId);
      }
      this.$emit('verificar-fecha', this.fechaLocal);
    },
    actualizarCargaCon() {
      this.$emit('update:cargaCon', this.cargaConLocal);
    },
    verPedidoDelDia() {
      this.mostrarModalPedido = true;
    },
    cerrarModalPedido() {
      this.mostrarModalPedido = false;
    },
    abrirConfiguracionMedidas() {
      this.$emit('abrir-configuracion-medidas');
    },
    onPrecioAgregado(nuevoPrecio) {
      console.log('[HEADER-EMBARQUE] Precio agregado:', nuevoPrecio);
      // Reenviar el evento hacia arriba para que NuevoEmbarque.vue recargue sus precios
      this.$emit('precio-agregado', nuevoPrecio);
    }
  }
};
</script>

<style scoped>
.header-embarque {
  margin-bottom: 20px;
  text-align: center;
  width: 100%;
}

h1 {
  margin-bottom: 15px;
}

.titulo-con-indicador {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.badge-usuarios {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #eef6ff;
  color: #0b69ff;
  border: 1px solid #cfe2ff;
  border-radius: 999px;
  font-size: 12px;
}

.badge-usuarios .punto {
  width: 8px;
  height: 8px;
  background: #2ecc71;
  border-radius: 50%;
  box-shadow: 0 0 0 2px rgba(46, 204, 113, 0.2);
}

.badge-usuarios .texto {
  white-space: nowrap;
}

h1 {
  margin-bottom: 15px;
}

.botones {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-volver {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
}

.btn-bloqueo {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-bloqueo.bloqueado {
  background-color: #dc3545;
}

.btn-configuracion-medidas {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-configuracion-medidas:hover {
  background-color: #0056b3;
}

.header {
  margin-top: 15px;
  width: 100%;
}

.header-row {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  justify-content: center;
  align-items: center;
  flex-wrap: nowrap;
}

.fecha-selector,
.carga-selector {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-width: auto;
}

label {
  margin-bottom: 0;
  font-weight: 500;
  white-space: nowrap;
}

.form-control {
  padding: 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 16px;
  min-width: 200px;
}

.form-control:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
}

.botones-accion {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin: 15px 0;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 14px;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn:disabled,
.btn.disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.loader-inline {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}





@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    gap: 15px;
  }

  .fecha-selector,
  .carga-selector {
    flex-direction: column;
    width: 100%;
  }

  .form-control {
    width: 100%;
    min-width: auto;
  }

  .botones-accion {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .btn {
    width: 100%;
    justify-content: center;
    padding: 12px 20px;
    font-size: 0.9rem;
  }


}


</style>