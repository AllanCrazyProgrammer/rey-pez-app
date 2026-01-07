<template>
  <BaseModal
    :mostrar="mostrar"
    titulo="Generar Nota PDF"
    textoBotonConfirmar="Generar PDF"
    :deshabilitarConfirmar="botonDeshabilitado"
    @cerrar="$emit('cerrar')"
    @confirmar="emitirConfirmacion"
  >
    <div class="campos-grid">
      <div class="form-group">
        <label for="fecha-embarque">Fecha del embarque</label>
        <input
          id="fecha-embarque"
          type="date"
          class="form-control"
          :value="fechaNormalizada"
          @input="onFechaChange($event.target.value)"
          :disabled="cargando"
        />
        <small class="ayuda">Elige la fecha del embarque que contiene al cliente.</small>
      </div>

      <div class="form-group">
        <label for="embarque-select">Embarque</label>
        <select
          id="embarque-select"
          class="form-control"
          :value="embarqueSeleccionadoId"
          @change="onEmbarqueChange($event.target.value)"
          :disabled="cargando || !embarques?.length"
        >
          <option value="" disabled>Selecciona un embarque</option>
          <option
            v-for="embarque in embarques"
            :key="embarque.id"
            :value="embarque.id"
          >
            {{ formatearEtiquetaEmbarque(embarque) }}
          </option>
        </select>
        <small v-if="!embarques?.length && fechaNormalizada" class="ayuda ayuda-alerta">
          No se encontraron embarques para la fecha seleccionada.
        </small>
      </div>

      <div class="form-group">
        <label for="cliente-select">Cliente</label>
        <select
          id="cliente-select"
          class="form-control"
          :value="clienteSeleccionadoId"
          @change="onClienteChange($event.target.value)"
          :disabled="cargando || !clientes?.length"
        >
          <option value="" disabled>Selecciona un cliente</option>
          <option
            v-for="cliente in clientes"
            :key="cliente.id"
            :value="cliente.id"
          >
            {{ cliente.nombre || `Cliente ${cliente.id}` }}
          </option>
        </select>
        <small v-if="!clientes?.length && embarqueSeleccionadoId" class="ayuda ayuda-alerta">
          Este embarque no tiene clientes guardados.
        </small>
      </div>
    </div>

    <div class="estado" v-if="cargando">
      <span class="loader-inline"></span>
      <span>Buscando embarques...</span>
    </div>

    <div v-if="error" class="alerta-error">
      {{ error }}
    </div>
  </BaseModal>
</template>

<script>
import BaseModal from '../BaseModal.vue';
import { normalizarFechaISO } from '@/utils/dateUtils';

export default {
  name: 'GenerarPdfClienteModal',
  components: {
    BaseModal,
  },
  props: {
    mostrar: {
      type: Boolean,
      required: true,
    },
    fecha: {
      type: String,
      default: '',
    },
    embarques: {
      type: Array,
      default: () => [],
    },
    embarqueId: {
      type: [String, Number],
      default: '',
    },
    clienteId: {
      type: [String, Number],
      default: '',
    },
    clientes: {
      type: Array,
      default: () => [],
    },
    cargando: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: '',
    },
  },
  emits: [
    'cerrar',
    'update:fecha',
    'update:embarque-id',
    'update:cliente-id',
    'buscar',
    'confirmar',
  ],
  computed: {
    fechaNormalizada() {
      return this.fecha ? normalizarFechaISO(this.fecha) : '';
    },
    embarqueSeleccionadoId() {
      return this.embarqueId ? this.embarqueId.toString() : '';
    },
    clienteSeleccionadoId() {
      return this.clienteId ? this.clienteId.toString() : '';
    },
    botonDeshabilitado() {
      return (
        this.cargando ||
        !this.fechaNormalizada ||
        !this.embarqueSeleccionadoId ||
        !this.clienteSeleccionadoId
      );
    },
  },
  methods: {
    onFechaChange(value) {
      const fecha = value ? normalizarFechaISO(value) : '';
      this.$emit('update:fecha', fecha);
      this.$emit('buscar');
    },
    onEmbarqueChange(value) {
      this.$emit('update:embarque-id', value);
    },
    onClienteChange(value) {
      this.$emit('update:cliente-id', value);
    },
    emitirConfirmacion() {
      if (this.botonDeshabilitado) return;
      this.$emit('confirmar');
    },
    formatearEtiquetaEmbarque(embarque) {
      const fecha = embarque.fecha
        ? normalizarFechaISO(embarque.fecha)
        : 'Sin fecha';
      const carga = embarque.cargaCon || 'Sin carga';
      const camion = embarque.camionNumero ? `Camión ${embarque.camionNumero}` : 'Camión 1';
      return `${fecha} · ${carga} · ${camion}`;
    },
  },
};
</script>

<style scoped>
.campos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-control {
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(0, 255, 65, 0.35);
  border-radius: 10px;
  font-size: 1.12rem;
  background: rgba(0, 40, 15, 0.75);
  color: #e8ffe6;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.form-control:focus {
  border-color: #00ff41;
  box-shadow: 0 0 0 3px rgba(0, 255, 65, 0.25);
  outline: none;
  background: rgba(0, 60, 25, 0.9);
}

.form-control:disabled {
  background: rgba(30, 30, 30, 0.35);
  color: #96b09f;
}

.ayuda {
  color: #9ad6b5;
  font-size: 20px;
}

.ayuda-alerta {
  color: #ff6b6b;
}

.estado {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #0d6efd;
  font-weight: 600;
  font-size: 1rem;
}

.loader-inline {
  width: 16px;
  height: 16px;
  border: 2px solid #dfe6e9;
  border-top-color: #0d6efd;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.alerta-error {
  margin-top: 12px;
  padding: 10px 12px;
  background: rgba(255, 107, 107, 0.08);
  color: #ff8a8a;
  border: 1px solid rgba(255, 107, 107, 0.35);
  border-radius: 10px;
  font-size: 1.02rem;
}

@media (max-width: 600px) {
  .campos-grid {
    grid-template-columns: 1fr;
  }
}

label {
  font-size: 25px;
}

#fecha-embarque {
  font-size: 20px;
}

#embarque-select,
#cliente-select {
  border-radius: 20px;
}

#cliente-select {
  font-size: 20px;
}
</style>

