<template>
  <div class="cuentas-ozuna-container">
    <h1>Cuentas Ozuna</h1>
    <div class="fecha-actual">
      <input type="date" v-model="fechaSeleccionada" @change="actualizarFecha">
      <span>{{ fechaFormateada }}</span>
    </div>

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
        <td>${{ formatNumber(totalGeneral) }}</td>
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

    <button @click="guardarNota" class="save-button">Guardar Nota</button>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';

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
      cobros: [],
      fechaSeleccionada: this.obtenerFechaActual()
    }
  },
  computed: {
    fechaFormateada() {
      const fecha = new Date(this.fechaSeleccionada + 'T00:00:00');
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },
    totalGeneral() {
      return this.items.reduce((sum, item) => sum + item.total, 0);
    },
    totalSaldo() {
      return this.saldoAnterior + this.totalGeneral + 
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
    },
    obtenerFechaActual() {
      const fecha = new Date();
      return fecha.getFullYear() + '-' + 
             String(fecha.getMonth() + 1).padStart(2, '0') + '-' + 
             String(fecha.getDate()).padStart(2, '0');
    },
  
    async guardarNota() {
  try {
    const notaData = {
      fecha: this.fechaSeleccionada,
      items: this.items,
      saldoAnterior: this.saldoAnterior,
      cobros: this.cobros,
      totalGeneral: this.totalGeneral,
      totalSaldo: this.totalSaldo
    };

    await addDoc(collection(db, 'cuentasOzuna'), notaData);
    alert('Nota guardada exitosamente');
  } catch (error) {
    console.error('Error al guardar la nota:', error);
    alert('Error al guardar la nota');
  }
},
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
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.fecha-actual input[type="date"] {
  margin-right: 10px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.fecha-actual span {
  min-width: 200px;
  text-align: left;
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

.save-button {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.save-button:hover {
  background-color: #45a049;
}
</style>