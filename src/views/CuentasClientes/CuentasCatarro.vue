<template>
  <div class="cuentas-catarro-container">
    <div class="back-button-container">
      <BackButton to="/cuentas-catarro" />
    </div>
    <h1>Cuentas Catarro</h1>
    <div class="fecha-actual">
      <div class="fecha-input">
        <input type="date" v-model="fechaSeleccionada">
      </div>
      <div class="fecha-display">
        {{ fechaFormateada }}
      </div>
    </div>
  
    <div class="input-section">
      <h2>Ingresar Datos</h2>
      <div class="input-row">
        <input v-model.number="newItem.kilos" type="number" placeholder="Kilos" inputmode="decimal" pattern="[0-9]*">
        <input v-model="newItem.medida" type="text" placeholder="Medida">
        <input v-model.number="newItem.costo" type="number" placeholder="Costo" inputmode="decimal" pattern="[0-9]*">
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
          <th class="desktop-only">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in items" :key="index" @touchstart="iniciarPresion(index)" @touchend="finalizarPresion">
          <td>{{ formatNumber(item.kilos) }}</td>
          <td>{{ item.medida }}</td>
          <td>${{ formatNumber(item.costo) }}</td>
          <td>${{ formatNumber(item.total) }}</td>
          <td class="action-column desktop-only">
            <button @click="editItem(index)" class="edit-btn">Editar</button>
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
  
    <h2>Precios de Venta</h2>
    <table class="tabla-venta">
      <thead>
        <tr>
          <th>Kilos</th>
          <th>Medida</th>
          <th>Precio</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in itemsVenta" :key="index">
          <td>{{ formatNumber(item.kilos) }}</td>
          <td>{{ item.medida }}</td>
          <td>
            <input v-model.number="item.precioVenta" type="number" @input="calcularTotalVenta(index)" class="precio-venta-input" inputmode="decimal" pattern="[0-9]*">
          </td>
          <td>${{ formatNumber(item.totalVenta) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="text-right"><strong>Total General Venta:</strong></td>
          <td><strong>${{ formatNumber(totalGeneralVenta) }}</strong></td>
        </tr>
      </tfoot>
    </table>
  
    <div class="ganancia-del-dia">
      <h3>Ganancia del Día</h3>
      <p :class="{ 'ganancia-positiva': gananciaDelDia > 0, 'ganancia-negativa': gananciaDelDia < 0 }">
        ${{ formatNumber(gananciaDelDia) }}
      </p>
    </div>
  
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
        <td>${{ formatNumber(totalGeneralVenta) }}</td>
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
      <button @click="editItem(selectedItemIndex)" class="edit-btn">Editar</button>
      <button @click="removeItem(selectedItemIndex)" class="delete-btn">Eliminar</button>
      <button @click="cancelMobileActions">Cancelar</button>
    </div>

    <!-- Modal para edición de item -->
    <div v-if="showEditModal" class="edit-modal">
      <h3>Editar Item</h3>
      <div class="input-row">
        <input v-model.number="editingItem.kilos" type="number" placeholder="Kilos" inputmode="decimal" pattern="[0-9]*">
        <input v-model="editingItem.medida" type="text" placeholder="Medida">
        <input v-model.number="editingItem.costo" type="number" placeholder="Costo" inputmode="decimal" pattern="[0-9]*">
      </div>
      <div class="button-row">
        <button @click="saveEditedItem">Guardar</button>
        <button @click="cancelEdit">Cancelar</button>
      </div>
    </div>
  </div>
</template>
  
<script>
import { db } from '@/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
  
export default {
  name: 'CuentasCatarro',
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
      fechaSeleccionada: this.obtenerFechaActual(),
      showMobileActions: false,
      selectedItemIndex: null,
      presionTimer: null,
      itemsVenta: [],
      showEditModal: false,
      editingItem: null,
      editingIndex: null,
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
    totalGeneralVenta() {
      return this.itemsVenta.reduce((sum, item) => sum + (item.totalVenta || 0), 0);
    },
    totalSaldo() {
      const totalCobros = this.cobros.reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
      const totalAbonos = this.abonos.reduce((sum, abono) => sum + (abono.monto || 0), 0);
      return this.saldoAcumuladoAnterior + this.totalGeneralVenta + totalCobros - totalAbonos;
    },
    nuevoSaldoAcumulado() {
      return this.totalSaldo;
    },
    gananciaDelDia() {
      const costoTotal = this.items.reduce((sum, item) => sum + item.total, 0);
      return this.totalGeneralVenta - costoTotal;
    }
  },
  watch: {
    fechaSeleccionada: {
      handler: 'loadSaldoAcumuladoAnterior',
      immediate: true
    },
    items: {
      handler: 'actualizarItemsVenta',
      deep: true
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
    async loadExistingCuenta(id) {
      try {
        console.log("Cargando cuenta con ID:", id);
        const cuentaRef = doc(db, 'cuentasCatarro', id);
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
            
            // Cargar los itemsVenta con los precios de venta guardados
            this.itemsVenta = data.itemsVenta || this.items.map(item => ({
              ...item,
              precioVenta: item.precioVenta || 0,
              totalVenta: (item.precioVenta || 0) * item.kilos
            }));
            
            // Asegurarse de que los totales se calculen correctamente
            this.actualizarItemsVenta();
            
            console.log("Estado actualizado con $nextTick:", {
              items: this.items,
              saldoAcumuladoAnterior: this.saldoAcumuladoAnterior,
              cobros: this.cobros,
              abonos: this.abonos,
              fechaSeleccionada: this.fechaSeleccionada,
              itemsVenta: this.itemsVenta
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
        const cuentasRef = collection(db, 'cuentasCatarro');
        const q = query(
          cuentasRef, 
          where('fecha', '<', this.fechaSeleccionada),
          orderBy('fecha', 'desc'),
          limit(1)
        );
        const cuentasSnapshot = await getDocs(q);
        
        if (!cuentasSnapshot.empty) {
          const ultimaCuenta = cuentasSnapshot.docs[0].data();
          this.saldoAcumuladoAnterior = ultimaCuenta.nuevoSaldoAcumulado || 0;
        } else {
          this.saldoAcumuladoAnterior = 0;
        }
        
        console.log("Saldo acumulado anterior cargado:", this.saldoAcumuladoAnterior);
      } catch (error) {
        console.error("Error al cargar el saldo acumulado anterior:", error);
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
        this.itemsVenta.push({
          ...this.newItem,
          total,
          precioVenta: 0,
          totalVenta: 0
        });
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
          nuevoSaldoAcumulado: this.nuevoSaldoAcumulado,
          itemsVenta: this.itemsVenta, // Guardamos los itemsVenta que incluyen el precio de venta
          totalGeneralVenta: this.totalGeneralVenta,
          gananciaDelDia: this.gananciaDelDia
        };
  
        console.log("Datos a guardar:", notaData);
  
        // Buscar si ya existe una nota para esta fecha
        const cuentasRef = collection(db, 'cuentasCatarro');
        const q = query(cuentasRef, where('fecha', '==', this.fechaSeleccionada));
        const querySnapshot = await getDocs(q);
  
        if (!querySnapshot.empty) {
          // Si existe, actualizar la nota existente
          const docId = querySnapshot.docs[0].id;
          await updateDoc(doc(db, 'cuentasCatarro', docId), notaData);
          console.log('Cuenta actualizada exitosamente');
        } else {
          // Si no existe, crear una nueva nota
          await addDoc(collection(db, 'cuentasCatarro'), notaData);
          console.log('Nueva cuenta guardada exitosamente');
        }
  
        alert('Cuenta guardada exitosamente');
        this.$router.push('/cuentas-catarro');
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
      this.editingIndex = index;
      this.editingItem = { ...this.items[index] };
      this.showEditModal = true;
    },
    saveEditedItem() {
      if (this.editingItem.kilos && this.editingItem.medida && this.editingItem.costo) {
        this.editingItem.total = this.editingItem.kilos * this.editingItem.costo;
        this.items[this.editingIndex] = { ...this.editingItem };
        this.actualizarItemsVenta();
        this.showEditModal = false;
        this.editingItem = null;
        this.editingIndex = null;
      }
    },
    cancelEdit() {
      this.showEditModal = false;
      this.editingItem = null;
      this.editingIndex = null;
    },
    imprimirTablas() {
      const contenidoImprimir = `
        <html>
          <head>
            <title>Cuentas Catarro - ${this.fechaFormateada}</title>
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
            <h1>Cuentas Catarro - ${this.fechaFormateada}</h1>
            
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

            <h2>Precios de Venta</h2>
            <table>
              <thead>
                <tr>
                  <th>Kilos</th>
                  <th>Medida</th>
                  <th>Precio de Venta</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${this.itemsVenta.map(item => `
                  <tr>
                    <td>${this.formatNumber(item.kilos)}</td>
                    <td>${item.medida}</td>
                    <td>$${this.formatNumber(item.precioVenta)}</td>
                    <td>$${this.formatNumber(item.totalVenta)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total">
                  <td colspan="3">Total Venta</td>
                  <td>$${this.formatNumber(this.totalGeneralVenta)}</td>
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
                <td>$${this.formatNumber(this.totalGeneralVenta)}</td>
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
    actualizarItemsVenta() {
      this.itemsVenta = this.items.map((item, index) => ({
        ...item,
        precioVenta: this.itemsVenta[index]?.precioVenta || 0,
        totalVenta: (this.itemsVenta[index]?.precioVenta || 0) * item.kilos
      }));
    },
    calcularTotalVenta(index) {
      const item = this.itemsVenta[index];
      item.totalVenta = item.kilos * (item.precioVenta || 0);
      this.$forceUpdate(); // Forzar actualización de la vista si es necesario
    },
    removeItemVenta(index) {
      this.itemsVenta.splice(index, 1);
    },
  }
}
</script>

<style scoped>
.cuentas-catarro-container {
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
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-bottom: 20px;
}

.fecha-input {
  margin-bottom: 5px;
}

.fecha-input input[type="date"] {
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.fecha-display {
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

.tabla-venta {
  margin-top: 20px;
  width: 100%;
  border-collapse: collapse;
}

.tabla-venta th,
.tabla-venta td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.tabla-venta th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.precio-venta-input {
  width: 70px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

@media (max-width: 600px) {
  .tabla-venta th,
  .tabla-venta td {
    padding: 6px;
  }

  .precio-venta-input {
    width: 60px;
    padding: 3px;
    font-size: 12px;
  }
}

.tabla-principal th,
.tabla-principal td,
.tabla-venta th,
.tabla-venta td {
  width: auto;
}

.tabla-principal th:first-child,
.tabla-principal td:first-child,
.tabla-venta th:first-child,
.tabla-venta td:first-child {
  width: 20%;
}

.tabla-principal th:nth-child(2),
.tabla-principal td:nth-child(2),
.tabla-venta th:nth-child(2),
.tabla-venta td:nth-child(2) {
  width: 20%;
}

.tabla-principal th:nth-child(3),
.tabla-principal td:nth-child(3),
.tabla-venta th:nth-child(3),
.tabla-venta td:nth-child(3) {
  width: 30%;
}

.tabla-principal th:last-child,
.tabla-principal td:last-child,
.tabla-venta th:last-child,
.tabla-venta td:last-child {
  width: 30%;
}

@media (max-width: 600px) {
  .tabla-principal th,
  .tabla-principal td,
  .tabla-venta th,
  .tabla-venta td {
    width: 25%;
  }
}

@media (max-width: 600px) {
  .tabla-venta th,
  .tabla-venta td {
    padding: 4px;
  }

  .precio-venta-input {
    width: 60px;
    padding: 3px;
    font-size: 16px;
  }
}

.tabla-principal th,
.tabla-principal td,
.tabla-venta th,
.tabla-venta td {
  width: auto;
}

.tabla-principal th:first-child,
.tabla-principal td:first-child,
.tabla-venta th:first-child,
.tabla-venta td:first-child {
  width: 20%;
}

.tabla-principal th:nth-child(2),
.tabla-principal td:nth-child(2),
.tabla-venta th:nth-child(2),
.tabla-venta td:nth-child(2) {
  width: 20%;
}

.tabla-principal th:nth-child(3),
.tabla-principal td:nth-child(3),
.tabla-venta th:nth-child(3),
.tabla-venta td:nth-child(3) {
  width: 30%;
}

.tabla-principal th:last-child,
.tabla-principal td:last-child,
.tabla-venta th:last-child,
.tabla-venta td:last-child {
  width: 30%;
}

@media (max-width: 600px) {
  .tabla-principal th,
  .tabla-principal td,
  .tabla-venta th,
  .tabla-venta td {
    width: 25%;
  }
}

.edit-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.edit-modal h3 {
  margin-top: 0;
  margin-bottom: 15px;
}

.edit-modal .input-row {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.edit-modal .button-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.edit-btn {
  background-color: #ffa500;
  margin-right: 5px;
}

.edit-btn:hover {
  background-color: #ff8c00;
}

.ganancia-del-dia {
  margin-top: 20px;
  padding: 15px;
  background-color: #f0f0f0;
  border-radius: 8px;
  text-align: center;
}

.ganancia-del-dia h3 {
  margin-bottom: 10px;
}

.ganancia-positiva {
  color: #4CAF50;
  font-weight: bold;
  font-size: 15pt;
}

.ganancia-negativa {
  color: #f44336;
  font-weight: bold;
  font-size: 15pt;
}

.action-column {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-column button {
  flex: 1;
  margin: 0 2px;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.edit-btn {
  background-color: #ffa500;
  color: white;
}

.delete-btn {
  background-color: #f44336;
  color: white;
}

@media (max-width: 600px) {
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
  border-radius: 5px;
  font-size: 16px;
  cursor: pointer;
}

.mobile-actions-modal .edit-btn {
  background-color: #ffa500;
  color: white;
}

.mobile-actions-modal .delete-btn {
  background-color: #f44336;
  color: white;
}

.mobile-actions-modal button:last-child {
  background-color: #ccc;
  color: #333;
}
</style>