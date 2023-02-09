<template>
  <div>
    <b-row>
      <b-col cols="1">
        <Calcular cantidad="$2" v-bind:datos="datos" @dataArray="getDatos" />
      </b-col>

      <b-col cols="1">
        <Calcular cantidad="$1" v-bind:datos="datos" @dataArray="getDatosPeso" />
      </b-col>

      <b-col cols="1">
        <button @click="printSection">Imprimir sección</button>
      </b-col>

      <b-col cols="9" id="printSection">
        <h1>Cuentas</h1>
    

        <h2>500: {{ din500 }}</h2>
        <h2>200: {{ din200 }}</h2>
        <h2>100: {{ din100 }}</h2>
        <h2>50: {{ din50 }}</h2>
        <h2>20: {{ din20 }}</h2>
        <h2>10: {{ din10 }}</h2>
        <h2>5: {{ din5 }}</h2>
        <h2>1: {{ din1 }}</h2>
        <h2>2: {{ din2 }}</h2>
      </b-col>
    </b-row>
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
      din2: 0,
    };
  },

  methods: {
    printSection() {
      const printSection = document.getElementById('printSection');
      window.print(printSection);
    },

    getDatosPeso(dataEl) {
  for (let i = 0; i < dataEl.length; i++) {
    const bills = [500, 200, 100, 50, 20, 10, 5, 1];
    for (const bill of bills) {
      while (dataEl[i] >= bill) {
        dataEl[i] -= bill;
        this[`din${bill}`] += 1;
      }
    }
  }
}
    ,
    getDatos(dataEl) {
  console.log(dataEl.value);

  const billetes = [500, 200, 100, 50, 20, 10, 5, 2, 1];
  for (let i = 0; i < dataEl.length; i++) {
    for (let j = 0; j < billetes.length; j++) {
      let billete = billetes[j];
      while (dataEl[i] >= billete) {
        dataEl[i] -= billete;
        this[`din${billete}`] += 1;
      }
    }
  }
}
 ,
  },
};
</script>

<style>
h2,
h4 {
  display: flex;
  justify-content: center;
}
</style>