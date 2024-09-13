<template>
  <div class="sale-note">
    <div class="back-button-container">
      <BackButton to="/NoteMenu" />
    </div>
    <h2 class="sale-note-title">Nota de Venta</h2>
    <div class="folio-date">
      <p><strong>Folio:</strong> {{ formattedFolio }}</p>
      <p><strong>Fecha de Creación:</strong> {{ formattedCreationDate }}</p>
    </div>
    <form @submit.prevent="addProduct">
      <div class="form-row">
        <div>
          <label for="client">Cliente:</label>
          <select v-model="client" required>
            <option v-for="client in clients" :key="client.id" :value="client.name">
              {{ client.name }}
            </option>
          </select>
        </div>
        <div>
          <label for="date">Fecha:</label>
          <DatePicker v-model="currentDate" value-type="format" format="DD MMMM YYYY" placeholder="Selecciona una fecha" />
        </div>
      </div>
      <div class="form-row">

        <div>
          <label for="kilos">Kilos:</label>
          <input type="number" step="0.01" v-model.number="newProduct.kilos" required >
        </div>
        <div>
          <label for="product">Producto:</label>
          <input type="text" id="product" v-model="newProduct.product" required />
        </div>

        <div>
          <label for="pricePerKilo">Precio por Kilo:</label>
          <input type="number" id="pricePerKilo" v-model="newProduct.pricePerKilo" required />
        </div>
        <button type="submit">Agregar Producto</button>
      </div>
    </form>
    <div v-if="products.length || abonos.length">
      <div ref="printSection" class="print-section">
        <div class="folio-date">
          <p><strong>Folio:</strong> {{ formattedFolio }}</p>
          <p><strong>Fecha de Creación:</strong> {{ formattedCreationDate }}</p>
        </div>
        <div v-if="products.length">
          <h3>Resumen</h3>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Kg</th>
                <th>Precio</th>
                <th>Total</th>
                <th class="action-column">Accion</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(product, index) in products" :key="index"
                  @touchstart="startLongPress(index)" 
                  @touchend="endLongPress" 
                  @touchmove="endLongPress">
                <template v-if="editIndex === index">
                  <td><input type="text" v-model="editProduct.product" /></td>
                  <td><input type="number" v-model.number="editProduct.kilos" /></td>
                  <td><input type="number" v-model.number="editProduct.pricePerKilo" /></td>
                  <td>${{ formatNumber(editProduct.kilos * editProduct.pricePerKilo) }}</td>
                  <td class="action-column">
                    <button @click="confirmEdit"><span>&#10004;</span></button>
                    <button @click="cancelEdit"><span>&#10060;</span></button>
                  </td>
                </template>
                <template v-else>
                  <td>{{ product.product }}</td>
                  <td>{{ formatNumber(product.kilos) }}</td>
                  <td>${{ formatNumber(product.pricePerKilo) }}</td>
                  <td>${{ formatNumber(product.total) }}</td>
                  <td class="action-column">
                    <button @click="editProductDetails(index)">Editar</button>
                    <button @click="removeProduct(index)">Borrar</button>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
          <div class="total-general">
            <h3>Total General: ${{ formatNumber(grandTotal) }}</h3>
          </div>
        </div>
   
        <div class="abonos-container">
      <div class="abonos-section">
        <h3>Registrar Abonos</h3>
        <form @submit.prevent="addAbono">
          <div class="form-row">
          <div>
            <label for="abonoMonto">Monto del Abono:</label>
            <input type="number" id="abonoMonto" v-model.number="newAbono.monto" required />
          </div>
          <div>
            <label for="abonoFecha">Fecha del Abono:</label>
            <DatePicker v-model="newAbono.fecha" value-type="format" format="DD MMMM YYYY" placeholder="Selecciona una fecha" />
          </div>
        </div>
        <button type="submit" class="add-abono-button">Agregar Abono</button>        </form>
        <div v-if="abonos.length">
          <h3>Abonos Realizados</h3>
          <div class="table-responsive">
            <table class="abonos-table">
              <thead>
                <tr>
                  <th>Monto</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(abono, index) in abonos" :key="index">
                  <td>${{ formatNumber(abono.monto) }}</td>
                  <td>{{ formatDate(abono.fecha) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="abonos-summary">
            <p><strong>Total Abonado:</strong> ${{ formatNumber(totalAbonado) }}</p>
            <p><strong>Saldo Restante:</strong> ${{ formatNumber(saldoRestante) }}</p>
            <p class="estado-pago" :class="{ 'pagado': isPaid, 'no-pagado': !isPaid }">
              <strong>Estado:</strong> {{ isPaid ? 'Pagada' : 'No Pagada' }}
            </p>
          </div>
        </div>
      </div>
    </div>

      <div class="action-buttons">
        <div class="button-column">
          <button @click="exportPDF">Exportar a PDF</button>
          <button @click="printSection">Imprimir</button>
        </div>
        <div class="button-column">
          <button @click="saveNote">Guardar Nota</button> 
          <button class="delete-note-button" @click="deleteNote">Eliminar Nota</button>
        </div>
      </div>
    </div>
    <!-- Modal para acciones móviles -->
    <div v-if="showMobileActions" class="mobile-actions-modal">
      <button @click="editProductDetails(selectedProductIndex)">Editar</button>
    <button @click="removeProduct(selectedProductIndex)">Borrar</button>
    <button v-if="editIndex !== -1" @click="confirmEdit">Confirmar Edición</button>
    <button @click="cancelMobileActions">Cancelar</button>
    </div>
  </div>
  </div>
</template>
<script>
import BackButton from '@/components/BackButton.vue';
import DatePicker from 'vue2-datepicker';
import 'vue2-datepicker/index.css';
import html2pdf from 'html2pdf.js';
import AddClient from '@/components/AddClient.vue';
import { db } from '@/firebase';
import { collection, addDoc, getDocs, setDoc, doc, getDoc, deleteDoc } from "firebase/firestore";

export default {
  components: {
    DatePicker,
    AddClient,
    BackButton
  },
  data() {
    const today = new Date();
    return {
      folio: Math.floor(Math.random() * 10000),
      client: '',
      currentDate: today.toISOString().substr(0, 10),
      newProduct: {
        product: '',
        kilos: null,
        pricePerKilo: null,
        total: 0
      },
      editProduct: {
        product: '',
        kilos: 0,
        pricePerKilo: 0,
        total: 0
      },
      products: [],
      clients: [],
      editIndex: -1,
      newAbono: {
        monto: null,
        fecha: today.toISOString().substr(0, 10)
      },
      abonos: [],
      isPaid: false,
      creationDate: today.toISOString().substr(0, 10),
      noteId: null,
      longPressTimer: null,
      showMobileActions: false,
      selectedProductIndex: null,
    };
  },
  computed: {
    grandTotal() {
      return this.products.reduce((sum, product) => sum + product.total, 0);
    },
    totalAbonado() {
      return this.abonos.reduce((sum, abono) => sum + Number(abono.monto), 0);
    },
    saldoRestante() {
      return this.grandTotal - this.totalAbonado;
    },
    formattedFolio() {
      return `F-${this.folio.toString().padStart(4, '0')}`;
    },
    formattedCreationDate() {
      return this.formatDate(this.creationDate);
    }
  },
  watch: {
    saldoRestante(newVal) {
      this.isPaid = newVal <= 0;
    }
  },
  methods: {
    async deleteNote() {
      if (this.noteId) {
        if (confirm("¿Estás seguro de que quieres eliminar esta nota?")) {
          try {
            await deleteDoc(doc(db, "notes", this.noteId));
            alert("Nota eliminada con éxito");
            this.$router.push({ name: 'NoteMenu' });
          } catch (error) {
            console.error("Error al eliminar la nota: ", error);
            alert(`Error al eliminar la nota: ${error.message}`);
          }
        }
      } else {
        alert("El ID de la nota no está definido");
      }
    },
    async saveNote() {
      try {
        const noteData = {
          folio: this.folio,
          client: this.client,
          currentDate: this.currentDate,
          products: this.products,
          abonos: this.abonos,
          isPaid: this.isPaid,
          creationDate: this.creationDate
        };
        if (this.noteId) {
          await setDoc(doc(db, 'notes', this.noteId), noteData);
        } else {
          const docRef = await addDoc(collection(db, 'notes'), noteData);
          this.noteId = docRef.id;
        }
        alert('Nota guardada exitosamente.');
        this.$router.push({ name: 'NoteMenu' });
      } catch (error) {
        console.error('Error saving note: ', error);
        alert('Hubo un error al guardar la nota.');
      }
    },
    async addProduct() {
      this.newProduct.total = this.newProduct.kilos * this.newProduct.pricePerKilo;
      this.products.push({ ...this.newProduct });
      this.resetForm();
    },
    resetForm() {
      this.newProduct = {
        product: '',
        kilos: null,
        pricePerKilo: null,
        total: 0
      };
    },
    removeProduct(index) {
      this.products.splice(index, 1);
      this.showMobileActions = false;
    },
    editProductDetails(index) {
      this.editIndex = index;
      this.editProduct = { ...this.products[index] };
      // No cerramos el modal aquí para permitir la confirmación en móvil
    },
    confirmEdit() {
      if (this.editIndex !== -1) {
        this.editProduct.total = this.editProduct.kilos * this.editProduct.pricePerKilo;
        this.products[this.editIndex] = { ...this.editProduct };
        this.editIndex = -1;
        this.showMobileActions = false;
      }
    },
    cancelEdit() {
      this.editIndex = -1;
    },
    async fetchClients() {
      try {
        const querySnapshot = await getDocs(collection(db, 'clients'));
        this.clients = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error('Error fetching clients: ', error);
      }
    },
    async fetchNoteData() {
      try {
        const docRef = doc(db, 'notes', this.noteId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const noteData = docSnap.data();
          this.folio = noteData.folio;
          this.client = noteData.client;
          this.currentDate = noteData.currentDate;
          this.products = noteData.products;
          this.abonos = noteData.abonos;
          this.isPaid = noteData.isPaid;
          this.creationDate = noteData.creationDate;
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error('Error fetching note: ', error);
      }
    },
    addAbono() {
      this.abonos.push({ ...this.newAbono });
      this.resetAbonoForm();
    },
    resetAbonoForm() {
      this.newAbono = {
        monto: null,
        fecha: new Date().toISOString().substr(0, 10)
      };
    },
    formatNumber(value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    },
    formatDate(date) {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(date).toLocaleDateString('es-ES', options);
    },
    exportPDF() {
      const element = this.$refs.printSection;
      const options = {
        margin: 0.5,
        filename: `Nota_de_Venta_${this.formattedFolio}_${new Date().toLocaleDateString()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      const clonedElement = element.cloneNode(true);
      const buttons = clonedElement.querySelectorAll('button');
      buttons.forEach(button => button.style.display = 'none');
      const actionColumns = clonedElement.querySelectorAll('td:nth-child(5), th:nth-child(5)');
      actionColumns.forEach(column => column.style.display = 'none');
      const abonosForm = clonedElement.querySelector('.abonos-section form');
      if (abonosForm) abonosForm.style.display = 'none';
      const abonosTitle = clonedElement.querySelector('.abonos-section h3:first-child');
      if (abonosTitle) abonosTitle.style.display = 'none';
      html2pdf().from(clonedElement).set(options).save();
    },
    printSection() {
      const printContent = this.$refs.printSection.cloneNode(true);
      const buttons = printContent.querySelectorAll('button');
      buttons.forEach(button => button.style.display = 'none');
      const actionColumns = printContent.querySelectorAll('td:nth-child(5), th:nth-child(5)');
      actionColumns.forEach(column => column.style.display = 'none');
      const abonosForm = printContent.querySelector('.abonos-section form');
      if (abonosForm) abonosForm.style.display = 'none';
      const abonosTitle = printContent.querySelector('.abonos-section h3:first-child');
      if (abonosTitle) abonosTitle.style.display = 'none';

      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.write('<html><head><title>Nota de Venta</title>');
      printWindow.document.write('</head><body >');
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    },
    startLongPress(index) {
      this.longPressTimer = setTimeout(() => {
        this.showMobileActions = true;
        this.selectedProductIndex = index;
      }, 500);
    },
    endLongPress() {
      clearTimeout(this.longPressTimer);
    },
    cancelMobileActions() {
      this.showMobileActions = false;
      this.selectedProductIndex = null;
      this.editIndex = -1;
    },
  },
  async mounted() {
    this.fetchClients();
    if (this.$route.params.noteId) {
      this.noteId = this.$route.params.noteId;
      await this.fetchNoteData();
    }
  }
};
</script><style scoped>
.sale-note {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 20px;
  background-color: #e8f0fe;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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

.container {
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 20px;
  max-width: 100%;
  box-sizing: border-box;
  background-color: #e8f0fe;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.folio-date {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1em;
}

.folio-date p {
  margin: 0;
  font-size: 1.1em;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1em;
  margin-bottom: 1em;
}

.form-row div {
  flex: 1;
  min-width: 120px;
}

.sale-note label {
  display: block;
  margin-bottom: 0.5em;
  margin: 0 auto;
}

.sale-note input, .sale-note select {
  width: 100%;
  padding: 0.5em;
  box-sizing: border-box;
  border-radius: 5px;
  border: 1px solid #ccc;
}

.sale-note .action-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 1em;
}

.sale-note .save-button {
  background-color: #28a745;
}

.sale-note .save-button:hover {
  background-color: #218838;
}

.sale-note .delete-note-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  margin: 5px 0;
  cursor: pointer;
  border-radius: 20px;
}

.sale-note .delete-note-button:hover {
  background-color: #c82333;
}

.table-responsive {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1em;
}

table, th, td {
  border: 1px solid #ccc;
}

th, td {
  padding: 0.5em;
  text-align: center;
}

th {
  background-color: #f8f8f8;
}

.total-general {
  margin-top: 1em;
}

.abonos-container {
  margin-top: 2em;
  padding: 1em;
  border-top: 1px solid #ccc;
}

.abonos-section h3 {
  margin-top: 1em;
  color: #3760b0;
}

.abonos-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1em;
}

.abonos-table th,
.abonos-table td {
  padding: 0.75em;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.abonos-table th {
  background-color: #f8f8f8;
  font-weight: bold;
  color: #3760b0;
}

.abonos-summary {
  margin-top: 1em;
  font-size: 1.1em;
}

.estado-pago {
  font-weight: bold;
}

.pagado {
  color: green;
}

.no-pagado {
  color: red;
}

.print-section {
  margin-bottom: 1em;
}

.back-button-container {
  text-align: left;
  margin-top: 20px;
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

.mobile-actions-modal button:nth-child(3) {
  background-color: #28a745; /* Color verde para el botón de confirmar */
}

.add-abono-button {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-top: 1em;
  width: 100%;
}

.add-abono-button:hover {
  background-color: #218838;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-top: 1em;
}

.action-buttons button {
  margin-bottom: 10px;
}

@media (max-width: 768px) {
  .folio-date {
    flex-direction: column;
  }

  .folio-date p {
    text-align: left;
  }

  .form-row {
    flex-direction: column;
  }

  .form-row div {
    width: 100%;
    margin-bottom: 1em;
  }

  .action-column {
    display: none;
  }

  table th,
  table td {
    width: 25%;
  }

  table {
    font-size: 0.9em;
  }

  th, td {
    padding: 0.3em;
  }

  table tr {
    position: relative;
  }

  table tr::after {
    content: '⋮';
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.5em;
    color: #3760b0;
  }

  .abonos-table {
    font-size: 0.9em;
  }

  .abonos-table thead {
    display: table-header-group;
  }

  .abonos-table tbody {
    display: table-row-group;
  }

  .abonos-table tr {
    display: table-row;
  }

  .abonos-table th,
  .abonos-table td {
    display: table-cell;
    width: 50%;
    padding: 0.5em;
  }

  .abonos-table th {
    text-align: center;
    background-color: #f0f0f0;
  }

  .abonos-table td {
    text-align: center;
  }

  .add-abono-button {
    width: 100%;
    margin-top: 1em;
  }

  .action-buttons {
    flex-direction: row;
    justify-content: space-between;
  }

  .button-column {
    width: 48%; /* Ajusta este valor según necesites */
    display: flex;
    flex-direction: column;
  }

  .action-buttons button {
    width: 100%;
    margin-bottom: 10px;
  }
}

.sale-note-title {
  margin-top: 10px;
}
</style>