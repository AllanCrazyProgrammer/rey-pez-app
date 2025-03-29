<!-- HeaderEmbarque.vue -->
<template>
  <div class="header-embarque">
    <h1>{{ modoEdicion ? 'Embarque' : 'Nuevo Embarque' }}</h1>
    <div class="botones">
      <button @click="volverAEmbarquesMenu" class="btn-volver">
        <i class="fas fa-arrow-left"></i> Volver a Menu
      </button>
      <button @click="toggleBloqueo" :class="['btn-bloqueo', { 'bloqueado': embarqueBloqueado }]">
        <i :class="['fas', embarqueBloqueado ? 'fa-lock' : 'fa-lock-open']"></i>
        {{ embarqueBloqueado ? 'Desbloquear' : 'Bloquear' }} Embarque
      </button>
    </div>

    <div class="botones-accion">
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
  </div>
</template>

<script>
export default {
  name: 'HeaderEmbarque',
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
    }
  },
  data() {
    return {
      fechaLocal: this.embarque.fecha,
      cargaConLocal: this.embarque.cargaCon
    };
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
      this.$emit('update:fecha', this.fechaLocal);
    },
    actualizarCargaCon() {
      this.$emit('update:cargaCon', this.cargaConLocal);
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
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>