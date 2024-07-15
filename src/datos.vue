<template>
  <div class="mt-5">
    <div class="fecha-actual">{{ fechaActual }}</div>

    <b-row>
      <b-col cols="12" md="5" class="mb-3">
        <b-button @click="borrarDatos" variant="primary" class="mb-3">Borrar datos</b-button>
        <b-form-textarea
          class="text-center"
          name="dinero"
          id="textarea-auto-height"
          placeholder="Dinero"
          rows="3"
          max-rows="100"
          v-model="datos"
        ></b-form-textarea>
      </b-col>

      <b-col cols="7">
        <Cuentas v-bind:datos="datos" />
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
 
  data() {
    return {
      datos: "",
    };
  },
  methods: {
    borrarDatos() {
      this.datos = '';
    }
  },
  computed: {
    fechaActual() {
      const hoy = new Date();
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return hoy.toLocaleDateString('es-ES', opciones);
    }
  }

  
};
</script>

<style scoped>
/* Estilos generales */
.datos-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background-color: #e8f0fe;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.fecha-actual {
  top: 10px;
  right: 10px;
  font-size: 1.2em;
  color: #3760b0;
  margin-bottom: 20px;
  text-align: left; /* Asegura que la fecha esté alineada a la derecha */
}

/* Estilos para los botones */
button {
  padding: 10px 20px;
  background-color: #3760b0;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2a4a87;
}

/* Estilos para tablas */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1em;
}

table, th, td {
  border: 1px solid #ccc;
}

th, td {
  padding: 0.75em;
  text-align: left;
}

th {
  background-color: #f8f8f8;
}

td {
  text-align: center;
}

.total-general {
  margin-top: 1em;
  font-size: 1.1em;
  font-weight: bold;
}

/* Estilos específicos para datos */
.data-section {
  margin-bottom: 2em; /* Añadir espacio al final */
}

.data-section h3 {
  margin-top: 1em;
  color: #3760b0;
  font-size: 1.3em;
}

/* Estilos para formularios */
.form-group {
  margin-bottom: 1em;
  width: 100%; /* Asegura que los elementos ocupen todo el ancho del contenedor */
}

.form-group label {
  display: block;
  margin-bottom: 0.5em;
  font-weight: bold;
  font-size: 1.1em;
  color: #3760b0; /* Color acorde al estilo general */
}

.form-group input, .form-group select {
  width: 100%;
  padding: 0.5em;
  box-sizing: border-box;
  border-radius: 5px;
  border: 1px solid #ccc;
  font-size: 1em;
}

.back-button-container {
  text-align: left; /* Centra el contenido del div horizontalmente */
  margin-top: 20px; /* Añade un margen inferior para separarlo de los siguientes elementos */
}

@media (max-width: 768px) {
  .datos-container {
    padding: 10px;
  }

  .form-group input, .form-group select {
    width: 100%;
  }
}
</style>