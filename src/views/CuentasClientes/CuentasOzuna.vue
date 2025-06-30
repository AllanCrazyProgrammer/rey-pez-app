<template>
  <div class="cuentas-ozuna-container">
    <div class="back-button-container">
      <BackButton to="/cuentas-ozuna" />
    </div>
    <h1>Cuentas Ozuna</h1>
    
    <!-- Botón de precios específicos para Ozuna -->
    <div class="precios-button-container">
      <PreciosClienteButton clienteId="ozuna" />
    </div>
    
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
          <td @click="editarItem(index, 'kilos')">
            <span v-if="!item.editando || item.campoEditando !== 'kilos'">{{ formatNumber(item.kilos) }}</span>
            <input v-else v-model.number="item.kilos" type="number" @blur="finalizarEdicion(index)">
          </td>
          <td @click="editarItem(index, 'medida')">
            <span v-if="!item.editando || item.campoEditando !== 'medida'">{{ item.medida }}</span>
            <input v-else v-model="item.medida" type="text" @blur="finalizarEdicion(index)">
          </td>
          <td @click="editarItem(index, 'costo')">
            <span v-if="!item.editando || item.campoEditando !== 'costo'">${{ formatNumber(item.costo) }}</span>
            <input v-else v-model.number="item.costo" type="number" @blur="finalizarEdicion(index)">
          </td>
          <td>${{ formatNumber(item.total) }}</td>
          <td class="action-column">
            <button @click="removeItem(index)" class="delete-btn">Eliminar</button>
          </td>
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

    <div class="button-container">
      <button @click="guardarNota" class="save-button">Guardar Nota</button>
      <button @click="imprimirTablas" class="print-button">Imprimir</button>
    </div>

    <!-- Modal para acciones móviles -->
    <div v-if="showMobileActions" class="mobile-actions-modal">
      <button @click="editItem(selectedItemIndex)">Editar</button>
      <button @click="removeItem(selectedItemIndex)">Eliminar</button>
      <button @click="cancelMobileActions">Cancelar</button>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import PreciosClienteButton from '@/components/PreciosClienteButton.vue';

export default {
  name: 'CuentasOzuna',
  components: {
    BackButton,
    PreciosClienteButton
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
      fechaSeleccionada: this.obtenerFechaActual(),
      showMobileActions: false,
      selectedItemIndex: null,
      presionTimer: null,
      autoSaveTimeout: null,
      currentDocId: null,
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
      const totalCobros = this.cobros.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
      const totalAbonos = this.abonos.reduce((sum, abono) => sum + (abono.monto || 0), 0);
      return this.saldoAcumuladoAnterior + this.totalGeneral + totalCobros - totalAbonos;
    },
    nuevoSaldoAcumulado() {
      return this.totalSaldo;
    }
  },
  watch: {
    items: {
      deep: true,
      handler: 'triggerAutoSave'
    },
    cobros: {
      deep: true,
      handler: 'triggerAutoSave'
    },
    abonos: {
      deep: true,
      handler: 'triggerAutoSave'
    },
    fechaSeleccionada: {
      handler: async function(newVal) {
        await this.loadSaldoAcumuladoAnterior();
        this.triggerAutoSave();
      }
    }
  },
  async mounted() {
    console.log("Mounted ejecutado", this.$route.params, this.$route.query);
    const id = this.$route.params.id;
    const isEditing = this.$route.query.edit === 'true';
    if (id && isEditing) {
      console.log("Iniciando carga de cuenta existente");
      await this.loadExistingCuenta(id);
    } else {
      console.log("Cargando saldo acumulado anterior para nueva cuenta");
      await this.loadSaldoAcumuladoAnterior();
    }
  },
  methods: {
    triggerAutoSave() {
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
      }
      this.autoSaveTimeout = setTimeout(() => {
        this.autoSave();
      }, 500);
    },

    async autoSave() {
      try {
        const notaData = {
          fecha: this.fechaSeleccionada,
          items: this.items,
          saldoAcumuladoAnterior: this.saldoAcumuladoAnterior,
          cobros: this.cobros,
          abonos: this.abonos,
          totalGeneral: this.totalGeneral,
          totalSaldo: this.totalSaldo,
          nuevoSaldoAcumulado: this.nuevoSaldoAcumulado,
          lastAutoSave: new Date().toISOString()
        };

        if (this.currentDocId) {
          await updateDoc(doc(db, 'cuentasOzuna', this.currentDocId), notaData);
          console.log('Auto-guardado exitoso (actualización)');
          return;
        }

        const cuentasRef = collection(db, 'cuentasOzuna');
        const q = query(cuentasRef, where('fecha', '==', this.fechaSeleccionada));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          this.currentDocId = querySnapshot.docs[0].id;
          await updateDoc(doc(db, 'cuentasOzuna', this.currentDocId), notaData);
          console.log('Auto-guardado exitoso (actualización)');
        } else {
          const docRef = await addDoc(collection(db, 'cuentasOzuna'), notaData);
          this.currentDocId = docRef.id;
          console.log('Auto-guardado exitoso (nuevo documento)');
        }
      } catch (error) {
        console.error('Error en auto-guardado:', error);
      }
    },

    async loadExistingCuenta(id) {
      try {
        console.log("Cargando cuenta con ID:", id);
        const cuentaRef = doc(db, 'cuentasOzuna', id);
        const cuentaDoc = await getDoc(cuentaRef);
        if (cuentaDoc.exists()) {
          const data = cuentaDoc.data();
          console.log("Datos de la cuenta cargados:", data);
          this.currentDocId = id;

          this.$nextTick(() => {
            this.items = data.items || [];
            this.saldoAcumuladoAnterior = data.saldoAcumuladoAnterior || 0;
            this.cobros = data.cobros || [];
            this.abonos = data.abonos || [];
            this.fechaSeleccionada = data.fecha || this.obtenerFechaActual();
            console.log("Estado actualizado con $nextTick");
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
          orderBy('fecha', 'asc')
        );
        const cuentasSnapshot = await getDocs(q);
        let saldoAcumulado = 0;

        cuentasSnapshot.forEach((doc) => {
          const cuenta = doc.data();
          const totalCuenta = cuenta.totalGeneral || 0;
          const totalCobros = (cuenta.cobros || []).reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
          const totalAbonos = (cuenta.abonos || []).reduce((sum, abono) => sum + (abono.monto || 0), 0);
          saldoAcumulado += totalCuenta + totalCobros - totalAbonos;
        });

        this.saldoAcumuladoAnterior = saldoAcumulado;
        console.log("Saldo acumulado anterior calculado:", this.saldoAcumuladoAnterior);
      } catch (error) {
        console.error("Error al calcular el saldo acumulado anterior:", error);
        this.saldoAcumuladoAnterior = 0;
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
      this.showMobileActions = false;
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

        if (this.currentDocId) {
          await updateDoc(doc(db, 'cuentasOzuna', this.currentDocId), notaData);
          console.log('Cuenta actualizada exitosamente');
        } else {
          const docRef = await addDoc(collection(db, 'cuentasOzuna'), notaData);
          this.currentDocId = docRef.id;
          console.log('Nueva cuenta guardada exitosamente');
        }

        alert('Cuenta guardada exitosamente');
        this.$router.push('/cuentas-ozuna');
      } catch (error) {
        console.error('Error al guardar la cuenta:', error);
        alert('Error al guardar la cuenta');
      }
    },
    iniciarPresion(index) {
      this.presionTimer = setTimeout(() => {
        this.showMobileActionsModal(index);
      }, 500); // 500ms de presión para activar el modal
    },
    finalizarPresion() {
      clearTimeout(this.presionTimer);
    },
    showMobileActionsModal(index) {
      this.selectedItemIndex = index;
      this.showMobileActions = true;
    },
    cancelMobileActions() {
      this.showMobileActions = false;
      this.selectedItemIndex = null;
    },
    editItem(index) {
      // Implementar lógica de edición aquí
      console.log('Editar item:', index);
      this.showMobileActions = false;
    },
    imprimirTablas() {
      const contenidoImprimir = `
        <html>
          <head>
            <title>Cuentas Ozuna - ${this.fechaFormateada}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                font-size: 20pt;
                line-height: 1.6;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                text-align: center;
              }
              h1 { font-size: 30pt; margin-bottom: 20px; }
              h2 { font-size: 27pt; margin-top: 30px; margin-bottom: 15px; }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                font-size: 20pt;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 10px;
                text-align: left;
              }
              th { background-color: #f2f2f2; font-weight: bold; }
              .total { font-weight: bold; }
              .total td:first-child { text-align: right; }
              @media print {
                body { font-size: 20pt; }
                h1 { font-size: 25pt; }
                h2 { font-size: 25pt; }
                table { font-size: 20pt; }
              }
            </style>
          </head>
          <body>
            <h1>Cuentas Ozuna - ${this.fechaFormateada}</h1>
            
            <h2>Detalles de la cuenta</h2>
            <table>
              <thead>
                <tr>
                  <th>Kilos</th>
                  <th>Medida</th>
                  <th>Costo</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${this.items.map(item => `
                  <tr>
                    <td>${this.formatNumber(item.kilos)}</td>
                    <td>${item.medida}</td>
                    <td>$${this.formatNumber(item.costo)}</td>
                    <td>$${this.formatNumber(item.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total">
                  <td colspan="3">Total</td>
                  <td>$${this.formatNumber(this.totalGeneral)}</td>
                </tr>
              </tfoot>
            </table>

            <h2>Resumen de saldo</h2>
            <table>
              <tr>
                <td>Saldo Anterior</td>
                <td>$${this.formatNumber(this.saldoAcumuladoAnterior)}</td>
              </tr>
              <tr>
                <td>Saldo Hoy</td>
                <td>$${this.formatNumber(this.totalGeneral)}</td>
              </tr>
              ${this.cobros.map(cobro => `
                <tr>
                  <td>${cobro.descripcion}</td>
                  <td>$${this.formatNumber(cobro.monto)}</td>
                </tr>
              `).join('')}
              ${this.abonos.map(abono => `
                <tr>
                  <td>${abono.descripcion} (Abono)</td>
                  <td>-$${this.formatNumber(abono.monto)}</td>
                </tr>
              `).join('')}
              <tr class="total">
                <td>Total</td>
                <td>$${this.formatNumber(this.totalSaldo)}</td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const ventanaImprimir = window.open('', '_blank');
      ventanaImprimir.document.write(contenidoImprimir);
      ventanaImprimir.document.close();
      ventanaImprimir.print();
    },
    editarItem(index, campo) {
      this.$set(this.items[index], 'editando', true);
      this.$set(this.items[index], 'campoEditando', campo);
      this.$nextTick(() => {
        const input = this.$el.querySelector(`tr:nth-child(${index + 1}) td:nth-child(${this.getCampoIndex(campo)}) input`);
        if (input) input.focus();
      });
    },
    finalizarEdicion(index) {
      const item = this.items[index];
      item.editando = false;
      item.campoEditando = null;
      item.total = item.kilos * item.costo;
      this.$set(this.items, index, item);
    },
    getCampoIndex(campo) {
      const campos = ['kilos', 'medida', 'costo'];
      return campos.indexOf(campo) + 1;
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

.precios-button-container {
  display: flex;
  justify-content: center;
  margin: 15px 0;
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

.button-container {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.save-button,
.print-button {
  padding: 10px 20px;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.save-button {
  background-color: #4CAF50;
}

.print-button {
  background-color: #3760b0;
}

.save-button:hover {
  background-color: #45a049;
}

.print-button:hover {
  background-color: #2c4d8c;
}

@media (max-width: 600px) {
  .input-row {
    flex-direction: column;
  }
  
  .input-row input, .input-row button {
    width: 100%;
    margin-bottom: 10px;
  }

  .desktop-only {
    display: none;
  }

  .tabla-principal tr {
    position: relative;
  }

  .tabla-principal tr::after {
    content: '⋮';
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 20px;
    color: #666;
  }
}

@media (min-width: 601px) {
  .mobile-only {
    display: none;
  }
}

.mobile-actions-modal {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: white;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.mobile-actions-modal button {
  width: 100%;
  padding: 15px 20px;
  margin-bottom: 10px;
  border: none;
  background-color: #3760b0;
  color: white;
  border-radius: 5px;
  font-size: 16px;
}

.mobile-actions-modal button:last-child {
  margin-bottom: 0;
}

.tabla-principal td {
  cursor: pointer;
}

.tabla-principal input {
  width: 100%;
  box-sizing: border-box;
  padding: 5px;
}
</style>