<template>
  <BaseModal
    :mostrar="mostrar"
    :titulo="titulo"
    :textoBotonConfirmar="textoBoton"
    @cerrar="$emit('cerrar')"
    @confirmar="guardar"
  >
    <div class="form-grid">
      <div class="form-group">
        <label for="medidaCostoProveedor">Medida</label>
        <input
          id="medidaCostoProveedor"
          ref="medidaInput"
          v-model="form.medida"
          type="text"
          class="form-control"
          placeholder="Ej: 41/50"
          @keyup.enter="guardar"
        >
      </div>

      <div class="form-group">
        <label for="tipoCostoProveedor">Tipo</label>
        <select
          id="tipoCostoProveedor"
          v-model="form.tipoCosto"
          class="form-control"
        >
          <option value="limpio">Limpio</option>
          <option value="crudo">Crudo</option>
        </select>
      </div>

      <div class="form-group">
        <label for="proveedorCostoProveedor">Proveedor</label>
        <input
          id="proveedorCostoProveedor"
          v-model="form.proveedorNombre"
          type="text"
          class="form-control"
          placeholder="Escribe el proveedor o deja vacío"
          @keyup.enter="guardar"
        >
      </div>

      <div class="form-group">
        <label for="costoProveedorInput">Costo base</label>
        <input
          id="costoProveedorInput"
          v-model="form.costo"
          type="number"
          class="form-control text-right"
          min="0"
          step="0.01"
          placeholder="0.00"
          @keyup.enter="guardar"
        >
      </div>

      <div class="form-group">
        <label for="fechaProveedorInput">Fecha</label>
        <input
          id="fechaProveedorInput"
          v-model="form.fecha"
          type="date"
          class="form-control"
          :max="maxDate"
        >
      </div>
    </div>

    <div v-if="registro?.costoAnterior !== null && registro?.costoAnterior !== undefined" class="info-adicional">
      <strong>Costo anterior:</strong> ${{ Number(registro.costoAnterior).toFixed(2) }}
    </div>
  </BaseModal>
</template>

<script>
import BaseModal from '@/views/Embarques/components/BaseModal.vue';

export default {
  name: 'CostoProveedorModal',
  components: {
    BaseModal
  },
  props: {
    mostrar: {
      type: Boolean,
      required: true
    },
    registro: {
      type: Object,
      default: () => ({})
    },
    esEdicion: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      form: {
        medida: '',
        proveedorNombre: '',
        tipoCosto: 'limpio',
        costo: '',
        fecha: new Date().toISOString().split('T')[0]
      }
    };
  },
  computed: {
    titulo() {
      return this.esEdicion ? 'Actualizar Medida' : 'Nueva Medida';
    },
    textoBoton() {
      return this.esEdicion ? 'Actualizar' : 'Registrar';
    },
    maxDate() {
      return new Date().toISOString().split('T')[0];
    }
  },
  watch: {
    mostrar(newVal) {
      if (newVal) {
        this.sincronizarFormulario();
        this.$nextTick(() => {
          this.$refs.medidaInput?.focus();
        });
      }
    },
    registro: {
      handler() {
        if (this.mostrar) {
          this.sincronizarFormulario();
        }
      },
      deep: true
    }
  },
  methods: {
    sincronizarFormulario() {
      this.form = {
        medida: this.registro?.medida || '',
        proveedorNombre: this.registro?.proveedorNombre || '',
        tipoCosto: this.registro?.tipoCosto || 'limpio',
        costo: this.registro?.costo ?? '',
        fecha: this.registro?.fecha || new Date().toISOString().split('T')[0]
      };
    },
    guardar() {
      const medida = this.form.medida.trim();
      const proveedorNombre = this.form.proveedorNombre.trim();
      const costo = Number(this.form.costo);
      const fecha = this.form.fecha;

      if (!medida) {
        alert('Por favor ingrese el nombre de la medida');
        return;
      }

      if (!fecha) {
        alert('Por favor seleccione una fecha válida');
        return;
      }

      if (Number.isNaN(costo) || costo < 0) {
        alert('Por favor ingrese un costo válido mayor o igual a 0');
        return;
      }

      this.$emit('guardar', {
        medida,
        costo,
        fecha,
        proveedorId: '',
        proveedorNombre,
        tipoCosto: this.form.tipoCosto
      });
    }
  }
};
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group-full {
  grid-column: 1 / -1;
}

.form-group label {
  color: #2c3e50;
  font-weight: 600;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d8dee9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
}

.text-right {
  text-align: right;
}

.info-adicional {
  margin-top: 16px;
  padding: 10px 12px;
  background: #f8f9fa;
  border-left: 4px solid #3498db;
  border-radius: 8px;
  color: #2c3e50;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
