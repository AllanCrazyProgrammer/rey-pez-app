<template>
  <div class="cuentas-ozuna-container">
    <h1>Cuentas Ozuna</h1>
    <div class="fecha-actual">{{ fechaActual }}</div>

    <div class="input-section">
      <h2>Ingresar Datos</h2>
      <div class="input-row">
        <input v-model.number="newItem.kilos" type="number" placeholder="Kilos">
        <input v-model="newItem.medida" type="text" placeholder="Medida">
        <input v-model.number="newItem.costo" type="number" placeholder="Costo">
        <button @click="addItem">Agregar</button>
      </div>
    </div>

    <table class="tabla-principal">
      <thead>
        <tr>
          <th>Kilos</th>
          <th>Medida</th>
          <th>Costo</th>
          <th>Total</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in items" :key="index">
          <td>{{ formatNumber(item.kilos) }}</td>
          <td>{{ item.medida }}</td>
          <td>${{ formatNumber(item.costo) }}</td>
          <td>${{ formatNumber(item.total) }}</td>
          <td><button @click="removeItem(index)" class="delete-btn">Eliminar</button></td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3"></td>
          <td>${{ formatNumber(totalGeneral) }}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <h2>Saldo pendiente</h2>
    <div class="saldo-pendiente">
      <div class="input-row">
        <input v-model.number="saldoAnterior" type="number" placeholder="Saldo anterior">
        <input v-model.number="saldoHoy" type="number" placeholder="Saldo Hoy">
      </div>
      <div class="input-row" v-for="(cobro, index) in cobros" :key="index">
        <input v-model="cobro.descripcion" type="text" placeholder="Descripción">
        <input v-model.number="cobro.monto" type="number" placeholder="Monto">
        <button @click="removeCobro(index)" class="delete-btn">Eliminar</button>
      </div>
      <button @click="addCobro" class="add-btn">Agregar Cobro</button>
    </div>

    <table class="tabla-saldo">
      <tr>
        <td>Saldo anterior</td>
        <td>${{ formatNumber(saldoAnterior) }}</td>
      </tr>
      <tr>
        <td>Saldo Hoy</td>
        <td>${{ formatNumber(saldoHoy) }}</td>
      </tr>
      <tr v-for="(cobro, index) in cobros" :key="index">
        <td>{{ cobro.descripcion }}</td>
        <td>${{ formatNumber(cobro.monto) }}</td>
      </tr>
      <tr class="total">
        <td>Total</td>
        <td>${{ formatNumber(totalSaldo) }}</td>
      </tr>
    </table>
  </div>
</template>

<script>
export default {
  name: 'CuentasOzuna',
  data() {
    return {
      items: [],
      newItem: {
        kilos: null,
        medida: '',
        costo: null
      },
      saldoAnterior: 0,
      saldoHoy: 0,
      cobros: []
    }
  },
  computed: {
    fechaActual() {
      const hoy = new Date();
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return hoy.toLocaleDateString('es-ES', opciones);
    },
    totalGeneral() {
      return this.items.reduce((sum, item) => sum + item.total, 0);
    },
    totalSaldo() {
      return this.saldoAnterior + this.saldoHoy + 
             this.cobros.reduce((sum, cobro) => sum + cobro.monto, 0);
    }
  },
  methods: {
    formatNumber(value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    addItem() {
      if (this.newItem.kilos && this.newItem.medida && this.newItem.costo) {
        const total = this.newItem.kilos * this.newItem.costo;
        this.items.push({...this.newItem, total});
        this.newItem = {kilos: null, medida: '', costo: null};
      }
    },
    removeItem(index) {
      this.items.splice(index, 1);
    },
    addCobro() {
      this.cobros.push({descripcion: '', monto: 0});
    },
    removeCobro(index) {
      this.cobros.splice(index, 1);
    }
  }
}
</script>

<style scoped>
.cuentas-ozuna-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.fecha-actual {
  text-align: right;
  margin-bottom: 20px;
  font-weight: bold;
}

.input-section {
  margin-bottom: 20px;
}

.input-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

input {
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 5px 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}

.delete-btn {
  background-color: #f44336;
}

.delete-btn:hover {
  background-color: #da190b;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

th {
  background-color: #f2f2f2;
}

.total td {
  font-weight: bold;
}

.saldo-pendiente {
  margin-bottom: 20px;
}

.add-btn {
  margin-top: 10px;
}
</style>