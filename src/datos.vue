<template>
  <div class="mt-5">
    <b-row>
      <b-col cols="5">
        <button onclick="window.location.reload();">Borrar datos</button>
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
};
</script>

<style>
</style>