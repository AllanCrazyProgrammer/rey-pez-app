<template>
  <div class="cuentas-ozuna-container">
    <div class="back-button-container">
      <BackButton to="/cuentas-ozuna" />
    </div>
    <h1>Cuentas Ozuna</h1>
    <div class="fecha-actual">
      <input type="date" v-model="fechaSeleccionada">
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
        <span>Saldo Acumulado Anterior: ${{ formatNumber(saldoAcumuladoAnterior) }}</span>
      </div>
      <div class="input-row" v-for="(cobro, index) in cobros" :key="index">
        <input v-model="cobro.descripcion" type="text" placeholder="Descripción">
        <input v-model.number="cobro.monto" type="number" placeholder="Monto">
        <button @click="removeCobro(index)" class="delete-btn">Eliminar</button>
      </div>
      <button @click="addCobro" class="add-btn">Agregar Cobro</button>
    </div>

    <h2>Abonos</h2>
    <div class="abonos">
      <div class="input-row" v-for="(abono, index) in abonos" :key="index">
        <input v-model="abono.descripcion" type="text" placeholder="Descripción">
        <input v-model.number="abono.monto" type="number" placeholder="Monto">
        <button @click="removeAbono(index)" class="delete-btn">Eliminar</button>
      </div>
      <button @click="addAbono" class="add-btn">Agregar Abono</button>
    </div>

    <table class="tabla-saldo">
      <tr>
        <td>Saldo Acumulado Anterior</td>
        <td>${{ formatNumber(saldoAcumuladoAnterior) }}</td>
      </tr>
      <tr>
        <td>Saldo Hoy</td>
        <td>${{ formatNumber(totalGeneral) }}</td>
      </tr>
      <tr v-for="(cobro, index) in cobros" :key="index">
        <td>{{ cobro.descripcion }}</td>
        <td>${{ formatNumber(cobro.monto) }}</td>
      </tr>
      <tr v-for="(abono, index) in abonos" :key="'abono-'+index">
        <td>{{ abono.descripcion }} (Abono)</td>
        <td>-${{ formatNumber(abono.monto) }}</td>
      </tr>
      <tr class="total">
        <td>Total</td>
        <td>${{ formatNumber(totalSaldo) }}</td>
      </tr>
      <tr class="total">
        <td>Nuevo Saldo Acumulado</td>
        <td>${{ formatNumber(nuevoSaldoAcumulado) }}</td>
      </tr>
    </table>

    <button @click="guardarNota" class="save-button">Guardar Nota</button>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';

export default {
  name: 'CuentasOzuna',
  components: {
    BackButton
  },
  data() {
    return {
      items: [],
      newItem: {
        kilos: null,
        medida: '',
        costo: null
      },
      saldoAcumuladoAnterior: 0,
      cobros: [],
      abonos: [],
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
      return this.totalGeneral + 
             this.cobros.reduce((sum, cobro) => sum + cobro.monto, 0) -
             this.abonos.reduce((sum, abono) => sum + abono.monto, 0);
    },
    nuevoSaldoAcumulado() {
      return this.saldoAcumuladoAnterior + this.totalSaldo;
    }
  },
  watch: {
    fechaSeleccionada() {
      this.loadSaldoAcumuladoAnterior();
    }
  },
  mounted() {
    console.log("Mounted ejecutado", this.$route.params, this.$route.query);
    const id = this.$route.params.id;
    const isEditing = this.$route.query.edit === 'true';
    if (id && isEditing) {
      console.log("Iniciando carga de cuenta existente");
      this.loadExistingCuenta(id);
    } else {
      console.log("Cargando saldo acumulado anterior");
      this.loadSaldoAcumuladoAnterior();
    }
  },
  methods: {
    async loadExistingCuenta(id) {
      try {
        console.log("Cargando cuenta con ID:", id);
        const cuentaRef = doc(db, 'cuentasOzuna', id);
        const cuentaDoc = await getDoc(cuentaRef);
        if (cuentaDoc.exists()) {
          const data = cuentaDoc.data();
          console.log("Datos de la cuenta cargados:", data);

          this.$nextTick(() => {
            this.items = data.items || [];
            this.saldoAcumuladoAnterior = data.saldoAcumuladoAnterior || 0;
            this.cobros = data.cobros || [];
            this.abonos = data.abonos || [];
            this.fechaSeleccionada = data.fecha || this.obtenerFechaActual();
            console.log("Estado actualizado con $nextTick:", {
              items: this.items,
              saldoAcumuladoAnterior: this.saldoAcumuladoAnterior,
              cobros: this.cobros,
              abonos: this.abonos,
              fechaSeleccionada: this.fechaSeleccionada
            });
          });
        } else {
          console.error("No se encontró la cuenta con el ID proporcionado");
        }
      } catch (error) {
        console.error("Error al cargar la cuenta existente: ", error);
      }
    },
    async loadSaldoAcumuladoAnterior() {
      try {
        const cuentasRef = collection(db, 'cuentasOzuna');
        const q = query(
          cuentasRef,
          where('fecha', '<', this.fechaSeleccionada),
          orderBy('fecha', 'desc'),
          limit(1)
        );
        const anteriorSnapshot = await getDocs(q);
        if (!anteriorSnapshot.empty) {
          const cuentaAnterior = anteriorSnapshot.docs[0].data();
          this.saldoAcumuladoAnterior = cuentaAnterior.nuevoSaldoAcumulado || 0;
        } else {
          this.saldoAcumuladoAnterior = 0;
        }
      } catch (error) {
        console.error("Error al cargar el saldo acumulado anterior:", error);
      }
    },
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
    addAbono() {
      this.abonos.push({descripcion: '', monto: 0});
    },
    removeAbono(index) {
      this.abonos.splice(index, 1);
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
          saldoAcumuladoAnterior: this.saldoAcumuladoAnterior,
          cobros: this.cobros,
          abonos: this.abonos,
          totalGeneral: this.totalGeneral,
          totalSaldo: this.totalSaldo,
          nuevoSaldoAcumulado: this.nuevoSaldoAcumulado
        };

        const id = this.$route.params.id;
        const isEditing = this.$route.query.edit === 'true';

        if (id && isEditing) {
          // Actualizar cuenta existente
          await updateDoc(doc(db, 'cuentasOzuna', id), notaData);
          alert('Cuenta actualizada exitosamente');
        } else {
          // Crear nueva cuenta
          await addDoc(collection(db, 'cuentasOzuna'), notaData);
          alert('Cuenta guardada exitosamente');
        }

        this.$router.push('/cuentas-ozuna');
      } catch (error) {
        console.error('Error al guardar la cuenta:', error);
        alert('Error al guardar la cuenta');
      }
    },
  }
}
</script>



<style scoped>
.cuentas-ozuna-container {
  max-width: 1200px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.back-button-container {
  margin-bottom: 20px;
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

.abonos {
  margin-bottom: 20px;
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

@media (max-width: 600px) {
  .input-row {
    flex-direction: column;
  }
  
  .input-row input, .input-row button {
    width: 100%;
    margin-bottom: 10px;
  }
}
</style>