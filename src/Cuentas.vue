<template>
  <div>
    <b-col cols="1">
      <Calcular v-bind:datos="datos" @dataArray="getDatos" />
    </b-col>

    <b-col cols="11">
      <h1>{{ msg }}</h1>
      <h2>500: {{ din500 }}</h2>
      <h2>200: {{ din200 }}</h2>
      <h2>100: {{ din100 }}</h2>
      <h2>50: {{ din50 }}</h2>
      <h2>20: {{ din20 }}</h2>
      <h2>10: {{ din10 }}</h2>
      <h2>5: {{ din5 }}</h2>
      <h2>1: {{ din1 }}</h2>
    </b-col>
  </div>
</template>

<script>
import Datos from "./datos.vue";
import Calcular from "./Calcular";

export default {
  name: "Cuentas",

  props: {
    datos: {
      type: Number,
    },
  },

  components: {
    Datos,
    Calcular,
  },
  data() {
    return {
      din500: 0,
      din200: 0,
      din100: 0,
      din50: 0,
      din20: 0,
      din10: 0,
      din5: 0,
      din2: 0,
      din1: 0,
    };
  },
    computed:{
    msg () {
      return this.$store.state.msg
    }
  },


  methods: {


    getDatos(dataEl) {
      console.log(dataEl);

      for (let i = 0; i < dataEl.length; i++) {
        while (dataEl[i] >= 500) {
          dataEl[i] -= 500;
          this.din500 += 1;
        }
        while (dataEl[i] >= 200) {
          dataEl[i] -= 200;
          this.din200 += 1;
        }
        while (dataEl[i] >= 100) {
          dataEl[i] -= 100;
          this.din100 += 1;
        }
        while (dataEl[i] >= 50) {
          dataEl[i] -= 50;
          this.din50 += 1;
        }
        while (dataEl[i] >= 20) {
          dataEl[i] -= 20;
          this.din20 += 1;
        }
        while (dataEl[i] >= 10) {
          dataEl[i] -= 10;
          this.din10 += 1;
        }
        while (dataEl[i] >= 5) {
          dataEl[i] -= 5;
          this.din5 += 1;
        }
        while (dataEl[i] >= 1) {
          dataEl[i] -= 1;
          this.din1 += 1;
        }
      }
    },
  },
};
</script>

<style>
h2 {
  display: flex;
  justify-content: center;
}
</style>