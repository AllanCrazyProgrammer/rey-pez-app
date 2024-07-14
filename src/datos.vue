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
  computed: {
    fechaActual() {
      const hoy = new Date();
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return hoy.toLocaleDateString('es-ES', opciones);
    }
  }

  
};
</script>

<style>

.fecha-actual {
  top: 10px;
  right: 10px;
  font-size: 20px;
  color: #333;
  margin-bottom: 20px;
}
</style>