<template>
  <div class="cuentas-container">
    <b-row>
      <b-col cols="12" md="6" class="mb-3">
        <Calcular cantidad="$2" :datos="datos" @dataArray="getDatos" />
      </b-col>
      <b-col cols="12" md="6" class="mb-3">
        <Calcular cantidad="$1" :datos="datos" @dataArray="getDatos" />
      </b-col>
      <b-col cols="12" class="mb-3">
        <b-button @click="printCuentas" variant="primary" block>Imprimir sección</b-button>
      </b-col>
      <b-col cols="12" class="mb-3">
        <div ref="printSection" class="print-section">
          <h1>Cuentas</h1>
          <p class="print-date">{{ formattedDate }}</p>
          <div class="cuenta-list">
            <div v-for="(value, denomination) in bills" :key="denomination" class="cuenta-item">
              <h2>{{ denomination }}: {{ value }}</h2>
            </div>
          </div>
        </div>
      </b-col>
    </b-row>
  </div>
</template>

<script>
import Calcular from "./Calcular";

export default {
  name: "Cuentas",
  components: {
    Calcular,
  },
  props: {
    datos: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      bills: {
        500: 0,
        200: 0,
        100: 0,
        50: 0,
        20: 0,
        10: 0,
        5: 0,
        2: 0,
        1: 0,
      },
    };
  },
  computed: {
    formattedDate() {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date().toLocaleDateString('es-ES', options);
    },
  },
  methods: {
    printCuentas() {
      const printSection = this.$refs.printSection;
      if (!printSection) {
        console.error('Print section not found');
        return;
      }

      const printContent = printSection.innerHTML;
      const printStyles = `
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f0f0f0;
          }
          .print-container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            width: 100%;
          }
          h1 {
            color: #3760b0;
            text-align: center;
            margin-bottom: 10px;
            font-size: 24px;
          }
          .print-date {
            text-align: center;
            color: #666;
            font-style: italic;
            margin-bottom: 20px;
          }
          .cuenta-list {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
          }
          .cuenta-item {
            width: 45%;
            margin-bottom: 15px;
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }
          h2 {
            color: #333;
            margin: 0;
            font-size: 18px;
            text-align: center;
          }
        </style>
      `;
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error('Unable to open print window');
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir Cuentas</title>
            ${printStyles}
          </head>
          <body>
            <div class="print-container">
              ${printContent}
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    },
    getDatos({ data, isTwo }) {
      const denominations = isTwo 
        ? [500, 200, 100, 50, 20, 10, 5, 2] 
        : [500, 200, 100, 50, 20, 10, 5, 1];
      
      data.forEach(amount => {
        let remainingAmount = parseInt(amount);
        denominations.forEach(denomination => {
          while (remainingAmount >= denomination) {
            remainingAmount -= denomination;
            this.bills[denomination]++;
          }
        });
      });
    },
  },
};
</script>

<style scoped>
.cuentas-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background-color: #e8f0fe;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

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

.print-date {
  text-align: center;
  color: #666;
  font-style: italic;
  margin-bottom: 20px;
}

.cuenta-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
}

.cuenta-item {
  width: 30%;
  text-align: center;
  padding: 10px;
  margin-bottom: 10px;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.print-section {
  padding: 40px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background-color: #ffffff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
  font-size: 1.2em;
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

@media (max-width: 768px) {
  .cuentas-container {
    padding: 10px;
  }

  .print-section {
    padding: 20px;
    font-size: 1em;
  }

  h1 {
    font-size: 1.5em;
  }

  h2 {
    font-size: 1.2em;
  }

  .cuenta-item {
    width: 45%;
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

  .print-section {
    padding: 15px;
    font-size: 0.9em;
  }

  .cuenta-item {
    width: 100%;
  }
}
</style>