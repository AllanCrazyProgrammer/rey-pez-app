<template>
  <div>
    <b-col>
      <b-button @click="getArray">Calcular</b-button>
  
    </b-col>
  </div>
</template>

<script>
import Datos from "./datos.vue";
import Cuentas from "./Cuentas.vue";

export default {
  name: "Calcular",
  props: ["datos"],

  components: {
    Datos,
    Cuentas,
  },

  data: () => ({
    misDatos: misDatos,
  }),


  methods: {
  

    getArray() {
      let misDatos = this.datos;
      misDatos = misDatos.split(`\n`).filter((x) => x);

      console.log(misDatos);
      return this.$emit("dataArray", misDatos);
    },
  },
};
</script>

<style>
</style>