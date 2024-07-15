<template>
  <div class="cuentas-container">
    <b-row>
      <b-col cols="12" md="6" class="mb-3">
        <Calcular cantidad="$2" v-bind:datos="datos" @dataArray="getDatos" />
      </b-col>
      <b-col cols="12" md="6" class="mb-3">
        <Calcular cantidad="$1" v-bind:datos="datos" @dataArray="getDatosPeso" />
      </b-col>
      <b-col cols="12" class="mb-3">
        <button @click="printCuentas" class="btn btn-primary w-100">Imprimir sección</button>
      </b-col>
      <b-col cols="12" class="mb-3">
        <div id="printSection" class="print-section">
          <h1>Cuentas</h1>
          <div class="cuenta-list">
            <div class="cuenta-item"><h2>500: {{ din500 }}</h2></div>
            <div class="cuenta-item"><h2>200: {{ din200 }}</h2></div>
            <div class="cuenta-item"><h2>100: {{ din100 }}</h2></div>
            <div class="cuenta-item"><h2>50: {{ din50 }}</h2></div>
            <div class="cuenta-item"><h2>20: {{ din20 }}</h2></div>
            <div class="cuenta-item"><h2>10: {{ din10 }}</h2></div>
            <div class="cuenta-item"><h2>5: {{ din5 }}</h2></div>
            <div class="cuenta-item"><h2>1: {{ din1 }}</h2></div>
            <div class="cuenta-item"><h2>2: {{ din2 }}</h2></div>
          </div>
        </div>
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
    };
  },

  methods: {
    printCuentas() {
      const printContents = document.getElementById('printSection').innerHTML;
      const originalContents = document.body.innerHTML;

      // Obtener la fecha actual
      const currentDate = new Date().toLocaleDateString();

      // Crear un elemento HTML para la fecha
      const dateElement = `<div style="text-align: center; font-size: 30px; margin-bottom: 10px;">Fecha: ${currentDate}</div>`;

      // Insertar la fecha en el contenido de impresión
      const printContentsWithDate = dateElement + printContents;

      document.body.innerHTML = printContentsWithDate;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload(); // Recargar la página para restaurar el contenido original
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
    },
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
  },
};
</script><style scoped>
/* Estilos generales */
.cuentas-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background-color: #e8f0fe;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Estilos para los títulos */
h1 {
  text-align: center;
  color: #3760b0;
  margin-bottom: 20px;
  font-size: 2em;
}

h2 {
  text-align: center;
  color: #333;
  margin-bottom: 10px;
  font-size: 1.5em;
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
  width: 100%; /* Asegura que el botón ocupe todo el ancho del contenedor */
}

button:hover {
  background-color: #2a4a87;
}

/* Estilos específicos para la lista de cuentas */
.cuenta-list {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cuenta-item {
  width: 100%;
  text-align: center;
  padding: 5px 0;
}

/* Estilos para la sección de impresión */
#printSection {
  padding: 40px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background-color: #ffffff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
  font-size: 1.2em;
}

/* Estilos responsivos */
@media (max-width: 768px) {
  .cuentas-container {
    padding: 10px;
  }

  button {
    padding: 8px 16px;
  }

  #printSection {
    padding: 20px;
    font-size: 1em;
  }

  h1 {
    font-size: 1.5em;
  }

  h2 {
    font-size: 1.2em;
  }
}

@media (max-width: 576px) {
  .cuentas-container {
    padding: 0;
    margin: 0;
    max-width: 100%;
    border-radius: 0;
  }

  h1 {
    font-size: 1.2em;
  }

  h2 {
    font-size: 1em;
  }

  #printSection {
    padding: 15px;
    font-size: 0.9em;
  }

  button {
    padding: 6px 12px;
  }

  .cuenta-list {
    width: 100%;
    align-items: center; /* Centra el contenido en dispositivos móviles */
  }

  .cuenta-item {
    width: 100%;
    text-align: center; /* Centra el texto en dispositivos móviles */
    padding: 5px 0;
  }
}
</style>