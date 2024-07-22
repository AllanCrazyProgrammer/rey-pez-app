<template>
  <div class="datos-container mt-5">
    <div class="fecha-actual">{{ fechaActual }}</div>

    <b-row>
      <b-col cols="12" md="5" class="mb-3">
        <b-button @click="borrarDatos" variant="danger" class="mb-3" block>Borrar datos</b-button>
        <b-form-textarea
          class="text-center"
          name="dinero"
          id="textarea-auto-height"
          placeholder="Ingrese cantidades de dinero (una por línea)"
          rows="3"
          max-rows="10"
          v-model="localDatos"
        ></b-form-textarea>
        <div class="mt-3 total-sum">
          <strong>Total: ${{ formatNumber(totalSum) }}</strong>
        </div>
      </b-col>

      <b-col cols="12" md="7">
        <Cuentas :datos="localDatos" />
      </b-col>
    </b-row>
  </div>
</template>

<script>
import Cuentas from "./Cuentas.vue";

export default {
  name: "Datos",
  components: {
    Cuentas,
  },
  props: {
    initialDatos: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      localDatos: this.initialDatos,
    };
  },
  methods: {
    borrarDatos() {
      this.localDatos = '';
    },
    formatNumber(value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  },
  computed: {
    fechaActual() {
      const hoy = new Date();
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return hoy.toLocaleDateString('es-ES', opciones);
    },
    totalSum() {
      return this.localDatos.split('\n')
        .filter(line => line.trim())
        .reduce((sum, line) => sum + parseFloat(line) || 0, 0);
    }
  }
};
</script>

<style scoped>
.datos-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background-color: #e8f0fe;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.fecha-actual {
  font-size: 1.2em;
  color: #3760b0;
  margin-bottom: 20px;
  text-align: right;
}

textarea {
  resize: vertical;
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 10px;
}

button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2a4a87;
}

button.btn-danger {
  background-color: #dc3545;
}

button.btn-danger:hover {
  background-color: #c82333;
}

.total-sum {
  font-size: 1.2em;
  color: #3760b0;
  text-align: right;
}

@media (max-width: 768px) {
  .datos-container {
    padding: 10px;
  }

  .fecha-actual {
    text-align: center;
    margin-bottom: 15px;
  }

  button {
    padding: 8px 16px;
  }
}

@media (max-width: 576px) {
  .datos-container {
    padding: 0;
    margin: 0;
    max-width: 100%;
    border-radius: 0;
  }
}
</style>
