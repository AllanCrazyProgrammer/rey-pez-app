<template>
  <BaseModal
    :mostrar="mostrar"
    titulo="Notas PDF múltiples"
    textoBotonConfirmar="Generar notas"
    :deshabilitarConfirmar="deshabilitarConfirmar"
    @cerrar="$emit('cerrar')"
    @confirmar="emitirConfirmacion"
  >
    <p class="intro">
      Selecciona los clientes con medidas registradas para generar varias notas
      PDF en un solo paso.
    </p>

    <div v-if="!clientes?.length" class="estado vacio">
      No hay clientes con medidas registradas en este embarque.
    </div>

    <div v-else class="lista-clientes">
      <div
        v-for="cliente in clientes"
        :key="cliente.id"
        class="cliente-item"
      >
        <label class="cliente-check">
          <input
            type="checkbox"
            :value="cliente.id"
            v-model="seleccionadosLocales"
            @change="emitirSeleccion"
          />
          <div class="cliente-detalle">
            <span class="nombre">{{ cliente.nombre }}</span>
            <small
              v-if="cliente.medidas?.length"
              class="medidas"
              :title="cliente.medidas.join(', ')"
            >
              Medidas: {{ cliente.medidas.join(', ') }}
            </small>
            <small v-else class="medidas vacias">
              Sin medidas registradas
            </small>
          </div>
        </label>

        <div class="opciones">
          <div class="grupo-opcion">
            <span class="etiqueta">Precios</span>
            <label>
              <input
                type="radio"
                :name="`precios-${cliente.id}`"
                :value="true"
                v-model="opcionesLocales[cliente.id].incluirPrecios"
                @change="onOpcionesChange(cliente.id)"
              />
              Incluir
            </label>
            <label>
              <input
                type="radio"
                :name="`precios-${cliente.id}`"
                :value="false"
                v-model="opcionesLocales[cliente.id].incluirPrecios"
                @change="onOpcionesChange(cliente.id)"
              />
              Omitir
            </label>
          </div>

          <div class="grupo-opcion">
            <span class="etiqueta">Cuenta en PDF</span>
            <label>
              <input
                type="radio"
                :name="`cuenta-${cliente.id}`"
                :value="true"
                :disabled="!opcionesLocales[cliente.id].incluirPrecios"
                v-model="opcionesLocales[cliente.id].cuentaEnPdf"
                @change="onOpcionesChange(cliente.id)"
              />
              Sí
            </label>
            <label>
              <input
                type="radio"
                :name="`cuenta-${cliente.id}`"
                :value="false"
                :disabled="!opcionesLocales[cliente.id].incluirPrecios"
                v-model="opcionesLocales[cliente.id].cuentaEnPdf"
                @change="onOpcionesChange(cliente.id)"
              />
              No
            </label>
          </div>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<script>
import BaseModal from '../BaseModal.vue';

export default {
  name: 'NotasPdfMultipleModal',
  components: { BaseModal },
  props: {
    mostrar: {
      type: Boolean,
      required: true,
    },
    clientes: {
      type: Array,
      default: () => [],
    },
    seleccionados: {
      type: Array,
      default: () => [],
    },
    opciones: {
      type: Object,
      default: () => ({}),
    },
    cargando: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      seleccionadosLocales: [],
      opcionesLocales: {},
    };
  },
  computed: {
    deshabilitarConfirmar() {
      return (
        this.cargando ||
        !this.clientes?.length ||
        this.seleccionadosLocales.length === 0
      );
    },
  },
  watch: {
    mostrar(value) {
      if (value) {
        this.sincronizarEstados();
      }
    },
    clientes: {
      immediate: true,
      deep: true,
      handler() {
        this.sincronizarEstados();
      },
    },
    seleccionados: {
      immediate: true,
      deep: true,
      handler(nuevos) {
        this.seleccionadosLocales = Array.isArray(nuevos) ? [...nuevos] : [];
      },
    },
    opciones: {
      immediate: true,
      deep: true,
      handler(nuevasOpciones) {
        this.opcionesLocales = this.crearOpcionesLocales(nuevasOpciones);
      },
    },
  },
  methods: {
    sincronizarEstados() {
      this.opcionesLocales = this.crearOpcionesLocales(this.opciones);

      if (!this.seleccionadosLocales.length && this.clientes?.length) {
        this.seleccionadosLocales = this.clientes.map((cliente) => cliente.id);
        this.emitirSeleccion();
      }
    },

    crearOpcionesLocales(origen = {}) {
      const base = {};
      (this.clientes || []).forEach((cliente) => {
        const opcionesCliente = origen?.[cliente.id] || {};
        base[cliente.id] = {
          incluirPrecios: opcionesCliente.incluirPrecios ?? false,
          cuentaEnPdf: opcionesCliente.cuentaEnPdf ?? false,
        };
      });
      return base;
    },

    emitirSeleccion() {
      this.$emit('update:seleccionados', [...this.seleccionadosLocales]);
    },

    emitirOpciones() {
      this.$emit('update:opciones', { ...this.opcionesLocales });
    },

    onOpcionesChange(clienteId) {
      const opcionesCliente =
        this.opcionesLocales[clienteId] || { incluirPrecios: false, cuentaEnPdf: false };

      // Si no se incluyen precios, no tiene sentido mostrar cuenta en PDF
      if (!opcionesCliente.incluirPrecios && opcionesCliente.cuentaEnPdf) {
        this.$set(this.opcionesLocales[clienteId], 'cuentaEnPdf', false);
      }

      this.emitirOpciones();
    },

    emitirConfirmacion() {
      this.emitirSeleccion();
      this.emitirOpciones();
      this.$emit('confirmar');
    },
  },
};
</script>

<style scoped>
.intro {
  margin-bottom: 12px;
  color: #c9f3d9;
  font-size: 16px;
}

.estado {
  padding: 12px;
  border-radius: 10px;
  background: rgba(0, 255, 65, 0.08);
  border: 1px solid rgba(0, 255, 65, 0.2);
  color: #d0ffe2;
}

.estado.vacio {
  background: rgba(255, 193, 7, 0.08);
  border-color: rgba(255, 193, 7, 0.35);
  color: #ffe4a3;
}

.lista-clientes {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 60vh;
  overflow-y: auto;
}

.cliente-item {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(0, 40, 15, 0.4);
  border: 1px solid rgba(0, 255, 65, 0.2);
}

.cliente-check {
  display: flex;
  gap: 10px;
  align-items: center;
}

.cliente-check input[type='checkbox'] {
  transform: scale(1.1);
}

.cliente-detalle {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nombre {
  font-weight: 700;
  color: #e8ffe6;
  font-size: 15px;
}

.medidas {
  color: #9ad6b5;
  font-size: 13px;
}

.medidas.vacias {
  color: #ffcc80;
}

.opciones {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  align-items: center;
}

.grupo-opcion {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  background: rgba(0, 255, 65, 0.03);
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(0, 255, 65, 0.15);
}

.grupo-opcion label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: #dfffe8;
}

.grupo-opcion input[type='radio'] {
  accent-color: #00ff41;
}

.etiqueta {
  font-weight: 600;
  color: #8df5aa;
  min-width: 70px;
}

@media (max-width: 820px) {
  .cliente-item {
    grid-template-columns: 1fr;
  }

  .opciones {
    grid-template-columns: 1fr;
  }
}
</style>
