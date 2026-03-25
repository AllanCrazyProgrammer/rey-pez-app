<template>
  <div class="sale-note">
    <div class="back-button-container">
      <BackButton to="/NoteMenu" />
    </div>
    <h2 class="sale-note-title">Nota de Venta</h2>
    <div class="precios-venta-toolbar">
      <div class="precios-venta-toolbar-inner">
        <PreciosNotaVentaModal
          class="precios-modal-inline"
          :clientes-lista="clients"
          :cliente-nombre-nota="client"
          @catalogo-actualizado="onPreciosCatalogoCambiado"
        />
        <button
          type="button"
          class="btn-refresh-catalogo"
          :disabled="catalogoCargando"
          @click="refreshPreciosCatalogo"
        >
          {{ catalogoCargando ? 'Actualizando…' : 'Actualizar catálogo' }}
        </button>
      </div>
      <p v-if="catalogoError" class="catalogo-error" role="alert">{{ catalogoError }}</p>
      <p class="catalogo-help">
        El catálogo de precios de la nota es independiente del resto de la app: usa los clientes del selector de arriba. El desplegable de productos y el precio sugerido leen solo esa lista.
      </p>
    </div>
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
          <div v-if="clientBalance > 0" class="client-balance-indicator">
            <span class="balance-text">Saldo a favor: ${{ formatNumber(clientBalance) }}</span>
          </div>
        </div>
        <div>
          <label for="date">Fecha:</label>
          <DatePicker v-model="currentDate" value-type="format" format="DD MMMM YYYY" placeholder="Selecciona una fecha" />
        </div>
      </div>
      <div class="form-row">
        <div class="full-width">
          <label for="observaciones">Observaciones (opcional):</label>
          <textarea
            id="observaciones"
            v-model.trim="observaciones"
            rows="3"
            maxlength="500"
            placeholder="Ej. Entregar en la tarde, detalle especial del pedido..."
          ></textarea>
        </div>
      </div>
      <div class="form-row producto-precio-row">

        <div class="producto-select-wrap">
          <label for="catalogProduct">Producto:</label>
          <select
            id="catalogProduct"
            v-model="selectedCatalogProduct"
            class="catalog-select"
            :disabled="catalogoCargando"
          >
            <option value="">{{ catalogoCargando ? 'Cargando catálogo…' : '— Seleccionar del catálogo —' }}</option>
            <option v-for="p in productosCatalogo" :key="p" :value="p">{{ p }}</option>
            <option value="__otro__">Otro (nombre manual)</option>
          </select>
        </div>
        <div v-if="selectedCatalogProduct === '__otro__'" class="producto-manual-wrap">
          <label for="productManual">Nombre del producto:</label>
          <input
            id="productManual"
            type="text"
            v-model="newProduct.product"
            placeholder="Ej. medida o descripción"
            autocomplete="off"
          />
        </div>
        <div v-else-if="selectedCatalogProduct" class="producto-elegido-wrap">
          <span class="producto-elegido-label">Seleccionado:</span>
          <span class="producto-elegido-text">{{ newProduct.product }}</span>
        </div>

        <div>
          <label for="kilos">Kilos:</label>
          <input type="number" step="0.01" v-model.number="newProduct.kilos" required >
        </div>

        <div>
          <label for="pricePerKilo">Precio por Kilo:</label>
          <input type="number" id="pricePerKilo" v-model="newProduct.pricePerKilo" step="0.01" required />
          <p v-if="precioSugeridoActivo" class="precio-sugerido-hint">
            Sugerido según catálogo (general o cliente específico si aplica).
          </p>
        </div>
        <button type="submit">Agregar Producto</button>
      </div>
    </form>
    <div v-if="products.length || abonos.length">
      <div ref="printSection" class="print-section nota-venta-print-root">
        <div class="folio-date">
          <p><strong>Folio:</strong> {{ formattedFolio }}</p>
          <p v-if="client"><strong>Cliente:</strong> {{ client }}</p>
          <p><strong>Fecha de Creación:</strong> {{ formattedCreationDate }}</p>
        </div>
        <div v-if="observaciones" class="observaciones-resumen">
          <p><strong>Observaciones:</strong> {{ observaciones }}</p>
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
                  <td>${{ formatResumenCurrency(editProduct.kilos * editProduct.pricePerKilo) }}</td>
                  <td class="action-column">
                    <button @click="confirmEdit"><span>&#10004;</span></button>
                    <button @click="cancelEdit"><span>&#10060;</span></button>
                  </td>
                </template>
                <template v-else>
                  <td>{{ product.product }}</td>
                  <td>{{ formatNumber(product.kilos) }}</td>
                  <td>${{ formatResumenCurrency(product.pricePerKilo) }}</td>
                  <td>${{ formatResumenCurrency(product.total) }}</td>
                  <td class="action-column">
                    <button @click="editProductDetails(index)">Editar</button>
                    <button @click="removeProduct(index)">Borrar</button>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
          <div v-if="(Number(flete) || 0) > 0" class="flete-section">
            <div class="form-row flete-edit-row">
              <div>
                <label for="flete">Flete ($):</label>
                <input type="number" id="flete" v-model.number="flete" step="0.01" min="0" />
              </div>
            </div>
            <p class="flete-print-line">
              <strong>Flete ($):</strong> {{ formatResumenCurrency(flete || 0) }}
            </p>
          </div>
          <div class="total-general">
            <div v-if="(Number(flete) || 0) <= 0" class="flete-inline-edit">
              <label for="flete-zero">Flete ($):</label>
              <input
                id="flete-zero"
                type="number"
                v-model.number="flete"
                step="0.01"
                min="0"
                placeholder="0"
              />
            </div>
            <h3 v-if="flete > 0" class="total-line-sub">Flete: -${{ formatResumenCurrency(flete) }}</h3>
            <h3 class="total-line-nota total-final">Total de esta nota: ${{ formatResumenCurrency(totalFinal) }}</h3>
            <div
              v-if="client && products.length"
              class="resumen-saldos-acumulados resumen-saldos-en-total-general"
              aria-label="Resumen de saldos acumulados"
            >
              <p class="resumen-saldos-titulo">Saldos con el cliente</p>
              <div class="resumen-saldos-inner">
                <div class="resumen-saldos-row resumen-saldos-row--anterior">
                  <span class="resumen-saldos-label">Saldo acumulado anterior</span>
                  <span class="resumen-saldos-value">${{ formatResumenCurrency(saldoAcumuladoAnteriores) }}</span>
                </div>
                <div class="resumen-saldos-row">
                  <span class="resumen-saldos-label">Saldo hoy (esta nota)</span>
                  <span class="resumen-saldos-value">${{ formatResumenCurrency(totalFinal) }}</span>
                </div>
                <div class="resumen-saldos-row resumen-saldos-row--bold">
                  <span class="resumen-saldos-label">Total</span>
                  <span class="resumen-saldos-value">${{ formatResumenCurrency(totalSaldoMasEstaNota) }}</span>
                </div>
                <div
                  v-if="totalAbonado > 0"
                  class="resumen-saldos-row resumen-saldos-row--abono"
                >
                  <span class="resumen-saldos-label">Abono</span>
                  <span class="resumen-saldos-value">−${{ formatResumenCurrency(totalAbonado) }}</span>
                </div>
                <div class="resumen-saldos-row resumen-saldos-row--bold resumen-saldos-row--nuevo">
                  <span class="resumen-saldos-label">Nuevo saldo acumulado</span>
                  <span class="resumen-saldos-value resumen-saldos-value--destacado">${{ formatResumenCurrency(nuevoSaldoAcumulado) }}</span>
                </div>
              </div>
            </div>
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
                  <th class="action-column-abonos">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(abono, index) in abonos" :key="index">
                  <td>${{ formatResumenCurrency(abono.monto) }}</td>
                  <td>{{ formatDate(abono.fecha) }}</td>
                  <td class="action-column-abonos">
                    <button @click="confirmDeleteAbono(index)" class="delete-abono-button">
                      <span>🗑️</span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div v-if="abonos.length" class="abonos-summary">
          <p><strong>Total Abonado:</strong> ${{ formatResumenCurrency(totalAbonado) }}</p>
          <p class="estado-pago" :class="{ 'pagado': isPaid, 'no-pagado': !isPaid }">
            <strong>Estado:</strong> {{ isPaid ? 'Pagada' : 'No Pagada' }}
          </p>
        </div>
      </div>
    </div>
    </div>

      <div class="action-buttons">
        <div class="button-column">
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

    <!-- Modal para confirmar eliminación de abono -->
    <div v-if="showDeleteAbonoModal" class="modal">
      <div class="modal-content">
        <h2>Confirmar Eliminación</h2>
        <p>¿Estás seguro de que quieres eliminar este abono?</p>
        <div class="modal-buttons">
          <button @click="deleteAbono" class="confirm-delete-button">Confirmar</button>
          <button @click="closeDeleteAbonoModal" class="cancel-button">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>
<script>
import BackButton from '@/components/BackButton.vue';
import DatePicker from 'vue2-datepicker';
import 'vue2-datepicker/index.css';
import AddClient from '@/components/AddClient.vue';
import PreciosNotaVentaModal from '@/components/PreciosNotaVentaModal.vue';
import { db } from '@/firebase';
import { collection, addDoc, getDocs, setDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import moment from 'moment';
import 'moment/locale/es';
import { cargarPreciosParaNotaVenta } from '@/utils/preciosVentaCatalogo';
import { obtenerPrecioParaMedidaNotaVenta } from '@/utils/preciosHistoricos';
import { obtenerFechaActualISO, normalizarFechaISO, formatearFechaParaMostrar } from '@/utils/dateUtils';
import { NOTA_VENTA_PDF_INLINE_CSS, getNotaVentaPrintMediaCss } from '@/utils/notaVentaPdfPrintStyles.js';

export default {
  components: {
    DatePicker,
    AddClient,
    BackButton,
    PreciosNotaVentaModal
  },
  data() {
    const fechaHoyLocal = obtenerFechaActualISO();
    return {
      folio: Math.floor(Math.random() * 10000),
      client: '',
      currentDate: fechaHoyLocal,
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
        fecha: fechaHoyLocal
      },
      abonos: [],
      flete: 0,
      isPaid: false,
      creationDate: fechaHoyLocal,
      observaciones: '',
      noteId: null,
      longPressTimer: null,
      showMobileActions: false,
      selectedProductIndex: null,
      clientBalance: 0, // Saldo a favor del cliente
      showDeleteAbonoModal: false,
      selectedAbonoIndex: null,
      preciosRaw: [],
      productosCatalogo: [],
      selectedCatalogProduct: '',
      catalogoCargando: false,
      catalogoError: null,
      precioSugeridoActivo: false,
      /** Suma de saldos restantes de notas del mismo cliente anteriores a esta (o de todas las guardadas si es nota nueva). */
      saldoAcumuladoAnteriores: 0,
    };
  },
  computed: {
    /** Incluye la fila en edición (editProduct) para que el total y el resumen reaccionen al instante. */
    grandTotal() {
      return this.products.reduce((sum, product, index) => {
        if (this.editIndex === index) {
          const k = Number(this.editProduct.kilos) || 0;
          const p = Number(this.editProduct.pricePerKilo) || 0;
          return sum + k * p;
        }
        return sum + (Number(product.total) || 0);
      }, 0);
    },
    totalFinal() {
      return this.grandTotal - (this.flete || 0);
    },
    totalAbonado() {
      const list = Array.isArray(this.abonos) ? this.abonos : [];
      return list.reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0);
    },
    saldoRestante() {
      return this.totalFinal - this.totalAbonado;
    },
    /** Saldo anterior + total de esta nota (antes de descontar abonos de la nota actual). */
    totalSaldoMasEstaNota() {
      return this.saldoAcumuladoAnteriores + this.totalFinal;
    },
    /**
     * Deuda acumulada tras esta nota: mismo resultado que la fila Total − Abono
     * (saldo anterior + total de esta nota − abonos registrados en esta nota).
     */
    nuevoSaldoAcumulado() {
      const neto = this.totalSaldoMasEstaNota - this.totalAbonado;
      return Math.max(0, neto);
    },
    formattedFolio() {
      return `F-${this.folio.toString().padStart(4, '0')}`;
    },
    formattedCreationDate() {
      return this.formatDate(this.creationDate);
    },
    /** Fecha de la nota en ISO para cruzar con historial de precios */
    fechaNotaISO() {
      const d = this.currentDate;
      if (!d) return obtenerFechaActualISO();
      if (d instanceof Date && !isNaN(d.getTime())) {
        return normalizarFechaISO(d);
      }
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      const parsed = moment(d, ['YYYY-MM-DD', 'DD MMMM YYYY', moment.ISO_8601], 'es', true);
      if (parsed.isValid()) return parsed.format('YYYY-MM-DD');
      return normalizarFechaISO(d);
    }
  },
  watch: {
    saldoRestante(newVal) {
      this.isPaid = newVal <= 0;
    },
    async client(newClient) {
      if (newClient) {
        await this.fetchClientBalance(newClient);
        await this.fetchSaldoAcumuladoAnteriores();
      } else {
        this.saldoAcumuladoAnteriores = 0;
      }
      this.applySuggestedPrice();
    },
    currentDate() {
      if (this.client) this.fetchSaldoAcumuladoAnteriores();
    },
    folio() {
      if (this.client) this.fetchSaldoAcumuladoAnteriores();
    },
    fechaNotaISO() {
      this.applySuggestedPrice();
    },
    selectedCatalogProduct(val, oldVal) {
      if (val && val !== '__otro__') {
        this.newProduct.product = val;
        this.$nextTick(() => this.applySuggestedPrice());
      }
      if (val === '__otro__') {
        this.newProduct.product = '';
        this.newProduct.pricePerKilo = null;
        this.precioSugeridoActivo = false;
      }
      if (!val && oldVal && oldVal !== '__otro__') {
        this.newProduct.product = '';
        this.newProduct.pricePerKilo = null;
        this.precioSugeridoActivo = false;
      }
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
          observaciones: this.observaciones || '',
          products: this.products,
          abonos: this.abonos,
          flete: this.flete,
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
      if (!this.selectedCatalogProduct) {
        alert('Seleccione un producto del catálogo u «Otro (nombre manual)».');
        return;
      }
      if (this.selectedCatalogProduct === '__otro__') {
        if (!this.newProduct.product || !String(this.newProduct.product).trim()) {
          alert('Escriba el nombre del producto.');
          return;
        }
      } else {
        this.newProduct.product = this.selectedCatalogProduct;
      }
      if (this.newProduct.kilos == null || this.newProduct.pricePerKilo == null) {
        alert('Complete kilos y precio por kilo.');
        return;
      }
      this.newProduct.total = this.newProduct.kilos * this.newProduct.pricePerKilo;
      this.products.push({ ...this.newProduct });
      this.resetForm();
      
      // Aplicar saldo a favor automáticamente después de agregar el primer producto
      if (this.products.length === 1 && this.client) {
        await this.fetchClientBalance(this.client);
        await this.applyClientBalanceAsAbono();
      }
    },
    resetForm() {
      this.selectedCatalogProduct = '';
      this.precioSugeridoActivo = false;
      this.newProduct = {
        product: '',
        kilos: null,
        pricePerKilo: null,
        total: 0
      };
    },
    async refreshPreciosCatalogo() {
      this.catalogoCargando = true;
      this.catalogoError = null;
      try {
        const { raw, productosCatalogo } = await cargarPreciosParaNotaVenta();
        this.preciosRaw = raw;
        this.productosCatalogo = productosCatalogo;
        this.$nextTick(() => this.applySuggestedPrice());
      } catch (e) {
        console.error('Error al cargar catálogo de precios:', e);
        this.catalogoError = 'No se pudo cargar el catálogo. Revisa la conexión o vuelve a intentar.';
        this.preciosRaw = [];
        this.productosCatalogo = [];
      } finally {
        this.catalogoCargando = false;
      }
    },
    onPreciosCatalogoCambiado() {
      this.refreshPreciosCatalogo();
      this.applySuggestedPrice();
    },
    applySuggestedPrice() {
      const prod = this.newProduct.product;
      if (!prod || this.selectedCatalogProduct === '__otro__' || !this.preciosRaw.length) {
        this.precioSugeridoActivo = false;
        return;
      }
      const nombreCliente = this.client && String(this.client).trim() ? String(this.client).trim() : null;
      const precio = obtenerPrecioParaMedidaNotaVenta(
        this.preciosRaw,
        prod,
        this.fechaNotaISO,
        nombreCliente
      );
      if (precio != null && precio !== '' && !Number.isNaN(Number(precio))) {
        this.newProduct.pricePerKilo = Number(precio);
        this.precioSugeridoActivo = true;
      } else {
        this.precioSugeridoActivo = false;
      }
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
    async fetchClientBalance(clientName) {
      if (!clientName) return;
      try {
        const balanceRef = doc(db, 'clientBalances', clientName);
        const balanceDoc = await getDoc(balanceRef);
        this.clientBalance = balanceDoc.exists() ? balanceDoc.data().balance || 0 : 0;
      } catch (error) {
        console.error('Error fetching client balance: ', error);
        this.clientBalance = 0;
      }
    },
    async updateClientBalance(clientName, newBalance) {
      try {
        const balanceRef = doc(db, 'clientBalances', clientName);
        await setDoc(balanceRef, { balance: newBalance }, { merge: true });
        this.clientBalance = newBalance;
      } catch (error) {
        console.error('Error updating client balance: ', error);
      }
    },
    async applyClientBalanceAsAbono() {
      if (this.clientBalance > 0 && this.products.length > 0) {
        const today = new Date();
        this.abonos.push({
          monto: this.clientBalance,
          fecha: today.toISOString().substr(0, 10)
        });
        
        // Actualizar el saldo del cliente a 0
        await this.updateClientBalance(this.client, 0);
        
        alert(`Se aplicó automáticamente el saldo a favor de $${this.clientBalance.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} como abono.`);
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
          this.observaciones = noteData.observaciones || '';
          this.products = noteData.products;
          this.abonos = Array.isArray(noteData.abonos) ? noteData.abonos : [];
          this.flete = noteData.flete || 0;
          this.isPaid = noteData.isPaid;
          this.creationDate = noteData.creationDate;
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error('Error fetching note: ', error);
      }
      await this.fetchSaldoAcumuladoAnteriores();
    },
    /**
     * Pendiente de notas del mismo cliente que van *antes en el tiempo* que la nota actual
     * (fecha de nota → fecha de creación → folio → id), y que no están pagadas (!note.isPaid).
     * No incluye notas posteriores (ej. una nota de marzo posterior a una de marzo anterior).
     */
    async fetchSaldoAcumuladoAnteriores() {
      const clientName = this.client && String(this.client).trim();
      if (!clientName) {
        this.saldoAcumuladoAnteriores = 0;
        return;
      }
      try {
        const querySnapshot = await getDocs(collection(db, 'notes'));
        const clientNotes = querySnapshot.docs
          .map((entry) => {
            const data = entry.data();
            return {
              id: entry.id,
              ...data,
              abonos: Array.isArray(data.abonos) ? data.abonos : [],
              products: Array.isArray(data.products) ? data.products : []
            };
          })
          .filter((n) => String(n.client || '').trim() === clientName);

        const parseTime = (v) => {
          if (v == null || v === '') return 0;
          const t = new Date(v).getTime();
          return Number.isNaN(t) ? 0 : t;
        };
        const compareNoteOrder = (a, b) => {
          const td = parseTime(a.currentDate) - parseTime(b.currentDate);
          if (td !== 0) return td;
          const tc = parseTime(a.creationDate) - parseTime(b.creationDate);
          if (tc !== 0) return tc;
          const f = (Number(a.folio) || 0) - (Number(b.folio) || 0);
          if (f !== 0) return f;
          return String(a.id || '').localeCompare(String(b.id || ''));
        };

        const ref = {
          currentDate: this.currentDate,
          creationDate: this.creationDate,
          folio: this.folio,
          id: this.noteId || '\uffff'
        };

        const saldoRestanteNota = (note) => {
          if (note.isPaid) {
            return 0;
          }
          const products = Array.isArray(note.products) ? note.products : [];
          const subtotal = products.reduce(
            (sum, p) => sum + (Number(p.kilos) || 0) * (Number(p.pricePerKilo) || 0),
            0
          );
          const flete = Number(note.flete) || 0;
          const totalFinal = subtotal - flete;
          const totalAbonado = note.abonos.reduce((s, a) => s + (Number(a.monto) || 0), 0);
          const r = totalFinal - totalAbonado;
          return r > 0 ? r : 0;
        };

        let sumOtros = 0;
        for (const n of clientNotes) {
          if (this.noteId && n.id === this.noteId) continue;
          if (compareNoteOrder(n, ref) >= 0) continue;
          sumOtros += saldoRestanteNota(n);
        }
        this.saldoAcumuladoAnteriores = sumOtros;
      } catch (error) {
        console.error('Error al calcular saldo acumulado anterior:', error);
        this.saldoAcumuladoAnteriores = 0;
      }
    },
    addAbono() {
      this.abonos.push({ ...this.newAbono });
      this.resetAbonoForm();
    },
    resetAbonoForm() {
      this.newAbono = {
        monto: null,
        fecha: obtenerFechaActualISO()
      };
    },
    formatNumber(value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    },
    /** Formato tipo estado de cuenta (2 decimales, es-MX), para el bloque de saldos acumulados. */
    formatResumenCurrency(value) {
      const n = Number(value);
      const safe = Number.isFinite(n) ? n : 0;
      return safe.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    formatDate(date) {
      return formatearFechaParaMostrar(date);
    },
    /**
     * Estilos y limpieza del DOM para la ventana de impresión (no hereda bien el CSS con scope).
     */
    prepareNotaExportClone(clonedElement) {
      const styleEl = document.createElement('style');
      styleEl.setAttribute('type', 'text/css');
      styleEl.textContent = NOTA_VENTA_PDF_INLINE_CSS;
      clonedElement.insertBefore(styleEl, clonedElement.firstChild);

      let fleteVal = '0';
      const fleteInput =
        clonedElement.querySelector('#flete') || clonedElement.querySelector('#flete-zero');
      if (fleteInput) {
        fleteVal = fleteInput.value != null && fleteInput.value !== '' ? String(fleteInput.value) : '0';
      }
      const fleteNum = parseFloat(fleteVal) || 0;
      const fleteSection = clonedElement.querySelector('.flete-section');
      if (fleteSection) {
        if (fleteNum <= 0) {
          fleteSection.remove();
        } else {
          fleteSection.innerHTML = `<div class="pdf-flete-line"><strong>Flete ($):</strong> <span>${fleteVal}</span></div>`;
        }
      }
      const fleteInline = clonedElement.querySelector('.flete-inline-edit');
      if (fleteInline) fleteInline.remove();

      clonedElement.querySelectorAll('tbody input').forEach((inp) => {
        const span = document.createElement('span');
        span.textContent = inp.value;
        inp.parentNode.replaceChild(span, inp);
      });

      clonedElement.querySelectorAll('button').forEach((b) => {
        b.style.display = 'none';
      });

      clonedElement.querySelectorAll('td:nth-child(5), th:nth-child(5)').forEach((el) => {
        el.style.display = 'none';
      });

      const abonosContainer = clonedElement.querySelector('.abonos-container');
      if (abonosContainer) abonosContainer.remove();
    },
    printSection() {
      const element = this.$refs.printSection;
      if (!element) return;
      const printContent = element.cloneNode(true);
      this.prepareNotaExportClone(printContent);

      const printWindow = window.open('', '', 'width=840,height=900');
      printWindow.document.open();
      printWindow.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Nota de Venta</title>');
      printWindow.document.write(
        '<meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#fff">'
      );
      // innerHTML omitía el div con .nota-venta-print-root; sin él no aplica NOTA_VENTA_PDF_INLINE_CSS
      printWindow.document.write(printContent.outerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      const doPrint = () => {
        printWindow.focus();
        printWindow.print();
      };
      if (printWindow.document.readyState === 'complete') {
        setTimeout(doPrint, 200);
      } else {
        printWindow.onload = () => setTimeout(doPrint, 200);
      }
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
    confirmDeleteAbono(index) {
      this.selectedAbonoIndex = index;
      this.showDeleteAbonoModal = true;
    },
    closeDeleteAbonoModal() {
      this.showDeleteAbonoModal = false;
      this.selectedAbonoIndex = null;
    },
    deleteAbono() {
      if (this.selectedAbonoIndex !== null) {
        this.abonos.splice(this.selectedAbonoIndex, 1);
        this.closeDeleteAbonoModal();
        alert('Abono eliminado exitosamente');
      }
    },
  },
  async mounted() {
    await this.fetchClients();
    await this.refreshPreciosCatalogo();
    if (this.$route.params.noteId) {
      this.noteId = this.$route.params.noteId;
      await this.fetchNoteData();
      if (this.client) {
        await this.fetchClientBalance(this.client);
      }
    } else if (this.client) {
      await this.fetchSaldoAcumuladoAnteriores();
    }
    const printStyle = document.createElement('style');
    printStyle.id = 'nota-venta-print-media-styles';
    printStyle.textContent = getNotaVentaPrintMediaCss();
    document.head.appendChild(printStyle);
  },
  beforeDestroy() {
    const el = document.getElementById('nota-venta-print-media-styles');
    if (el) el.remove();
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

.sale-note textarea {
  width: 100%;
  padding: 0.5em;
  box-sizing: border-box;
  border-radius: 5px;
  border: 1px solid #ccc;
  resize: vertical;
  font-family: inherit;
}

.full-width {
  width: 100%;
}

.observaciones-resumen {
  margin-bottom: 1em;
  padding: 0.75em;
  border-left: 4px solid #3760b0;
  background-color: #f5f8ff;
  border-radius: 8px;
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

.flete-inline-edit {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem 0.75rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0;
}

.flete-inline-edit label {
  color: rgba(245, 236, 255, 0.95);
  font-weight: 600;
}

.flete-inline-edit input {
  max-width: 140px;
}

.flete-section {
  margin-top: 1em;
  padding: 1em;
  background-color: #f8f9fa;
  border-radius: 10px;
  border: 1px solid #dee2e6;
}

.total-general {
  margin-top: 1em;
  padding: 1em;
  background-color: #e8f4fd;
  border-radius: 10px;
  border: 2px solid #3760b0;
}

.total-general h3 {
  margin: 0.5em 0;
}

.total-line-sub {
  font-size: 0.98rem;
  font-weight: 600;
  color: #2a4a87;
}

.total-line-nota {
  color: #3760b0;
  font-size: 1.35rem;
  font-weight: 800;
  text-align: center;
  border-top: 2px solid #3760b0;
  padding-top: 0.65em;
  margin-top: 0.35em;
}

.total-final {
  color: #3760b0;
  font-size: 1.35rem;
  font-weight: 800;
  text-align: center;
  border-top: 2px solid #3760b0;
  padding-top: 0.65em;
  margin-top: 0.35em;
}

.resumen-saldos-en-total-general {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px dashed rgba(55, 96, 176, 0.45);
}

.resumen-saldos-titulo {
  margin: 0 0 0.65rem;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #3760b0;
  text-align: center;
}

.total-general .resumen-saldos-inner {
  border-style: dashed;
  background: rgba(255, 255, 255, 0.35);
}

.resumen-saldos-value--destacado {
  font-size: 1.2rem;
  font-weight: 800;
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

/* Resumen saldos (misma familia visual que flete / total-general) */
.resumen-saldos-acumulados {
  margin-top: 1.25rem;
  width: 100%;
  box-sizing: border-box;
}

.resumen-saldos-inner {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(62, 248, 255, 0.28);
  background: rgba(12, 18, 48, 0.74);
  box-shadow: 0 0 0 1px rgba(62, 248, 255, 0.12) inset;
}

.resumen-saldos-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  padding: 0.65rem 1rem;
  font-size: 0.98rem;
  color: rgba(245, 236, 255, 0.92);
  border-bottom: 1px solid rgba(62, 248, 255, 0.12);
}

.resumen-saldos-row:last-child {
  border-bottom: none;
}

.resumen-saldos-row--anterior {
  background: rgba(255, 95, 217, 0.12);
}

.resumen-saldos-label {
  font-weight: 400;
  text-align: left;
  flex: 1 1 auto;
  min-width: 0;
}

.resumen-saldos-value {
  font-weight: 400;
  text-align: right;
  font-variant-numeric: tabular-nums;
  flex: 0 0 auto;
  min-width: 7.5rem;
  color: #67f5ff;
}

.resumen-saldos-row--bold .resumen-saldos-label,
.resumen-saldos-row--bold .resumen-saldos-value {
  font-weight: 700;
}

.resumen-saldos-row--bold .resumen-saldos-value {
  color: #f7eeff;
}

.resumen-saldos-row--nuevo {
  background: rgba(11, 14, 38, 0.5);
  border-top: 1px solid rgba(62, 248, 255, 0.2);
}

@media (max-width: 768px) {
  .resumen-saldos-row {
    padding: 0.55rem 0.75rem;
    font-size: 0.92rem;
  }

  .resumen-saldos-value {
    width: 100%;
    text-align: right;
  }
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

  .action-column-abonos {
    display: table-cell;
    width: 60px;
  }

  .delete-abono-button {
    padding: 6px 10px;
    font-size: 14px;
  }

  .add-abono-button {
    width: 100%;
    margin-top: 1em;
  }

  .modal-content {
    width: 95%;
    padding: 20px;
  }

  .modal-buttons {
    flex-direction: column;
    gap: 10px;
  }

  .confirm-delete-button,
  .cancel-button {
    width: 100%;
    padding: 15px;
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

.precios-venta-toolbar {
  margin-bottom: 1.25rem;
  padding: 1rem;
  border-radius: 12px;
  background: rgba(12, 18, 48, 0.55);
  border: 1px solid rgba(62, 248, 255, 0.22);
}

.precios-venta-toolbar-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 12px;
}

.precios-modal-inline {
  flex: 1 1 220px;
  min-width: 0;
}

.precios-modal-inline >>> .btn-open {
  width: 100%;
  min-height: 48px;
  justify-content: center;
}

.btn-refresh-catalogo {
  flex: 0 0 auto;
  align-self: center;
  white-space: nowrap;
}

.catalogo-help {
  margin: 0.75rem 0 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: rgba(210, 198, 255, 0.88);
}

.catalogo-error {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  color: #ff8da1;
}

.producto-precio-row {
  align-items: flex-end;
}

.producto-select-wrap,
.producto-manual-wrap {
  flex: 1 1 200px;
  min-width: 160px;
}

.catalog-select {
  width: 100%;
}

.producto-elegido-wrap {
  flex: 1 1 180px;
  min-width: 140px;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: rgba(255, 95, 217, 0.12);
  border: 1px solid rgba(62, 248, 255, 0.2);
}

.producto-elegido-label {
  display: block;
  font-size: 0.8rem;
  color: rgba(210, 198, 255, 0.85);
  margin-bottom: 4px;
}

.producto-elegido-text {
  font-weight: 600;
  color: #67f5ff;
  word-break: break-word;
}

.precio-sugerido-hint {
  margin: 6px 0 0;
  font-size: 0.78rem;
  color: rgba(52, 245, 197, 0.9);
  line-height: 1.35;
}

@media (max-width: 768px) {
  .precios-venta-toolbar-inner {
    flex-direction: column;
  }

  .btn-refresh-catalogo {
    width: 100%;
  }

  .producto-precio-row {
    flex-direction: column;
    align-items: stretch;
  }
}

.client-balance-indicator {
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 10px;
  text-align: center;
}

.balance-text {
  color: #155724;
  font-weight: bold;
  font-size: 14px;
}

.delete-abono-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.delete-abono-button:hover {
  background-color: #c82333;
}

.action-column-abonos {
  width: 80px;
  text-align: center;
}

.modal {
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background-color: #fefefe;
  padding: 30px;
  border: 1px solid #888;
  border-radius: 15px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.modal-content h2 {
  color: #3760b0;
  margin-bottom: 20px;
}

.modal-content p {
  margin-bottom: 25px;
  font-size: 16px;
  color: #333;
}

.modal-buttons {
  display: flex;
  justify-content: space-around;
  gap: 15px;
}

.confirm-delete-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s;
}

.confirm-delete-button:hover {
  background-color: #c82333;
}

.cancel-button {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 12px 25px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s;
}

.cancel-button:hover {
  background-color: #5a6268;
}

/* Tema vaporwave para toda la funcionalidad de nota */
.sale-note {
  background:
    linear-gradient(145deg, rgba(23, 12, 47, 0.95), rgba(28, 16, 61, 0.94) 45%, rgba(17, 49, 99, 0.88)),
    repeating-linear-gradient(
      180deg,
      rgba(255, 111, 212, 0.08) 0,
      rgba(255, 111, 212, 0.08) 1px,
      transparent 1px,
      transparent 9px
    );
  border: 1px solid rgba(255, 111, 212, 0.4);
  box-shadow:
    0 0 0 1px rgba(62, 248, 255, 0.22) inset,
    0 18px 40px rgba(2, 2, 20, 0.7);
  color: #f7eeff;
}

.sale-note-title,
.sale-note h3 {
  color: #3ef8ff;
  text-shadow: 0 0 10px rgba(62, 248, 255, 0.45);
}

.folio-date p,
.sale-note label,
.abonos-summary p,
.resumen-saldos-label,
.modal-content p {
  color: rgba(245, 236, 255, 0.9);
}

.sale-note input,
.sale-note select,
.sale-note textarea {
  background: rgba(11, 14, 38, 0.88);
  border: 1px solid rgba(62, 248, 255, 0.35);
  color: #f7eeff;
}

.sale-note textarea::placeholder,
.sale-note input::placeholder {
  color: rgba(210, 198, 255, 0.7);
}

button,
.add-abono-button,
.confirm-delete-button,
.cancel-button {
  background: linear-gradient(135deg, #ff5fd9, #8b5cf6);
  box-shadow: 0 0 18px rgba(168, 85, 247, 0.35);
}

button:hover,
.add-abono-button:hover,
.confirm-delete-button:hover,
.cancel-button:hover {
  background: linear-gradient(135deg, #ff79e0, #7c7cff);
}

.sale-note .delete-note-button,
.delete-abono-button {
  background: linear-gradient(135deg, #ff6f91, #ef4444);
}

table,
table th,
table td,
.abonos-table th,
.abonos-table td {
  border-color: rgba(62, 248, 255, 0.24);
}

th,
.abonos-table th {
  background: rgba(255, 95, 217, 0.18);
  color: #3ef8ff;
}

.flete-section,
.total-general,
.observaciones-resumen,
.client-balance-indicator,
.resumen-saldos-inner {
  background: rgba(12, 18, 48, 0.74);
  border: 1px solid rgba(62, 248, 255, 0.28);
  color: #f7eeff;
}

.observaciones-resumen {
  border-left-color: #ff5fd9;
}

.total-final {
  color: #67f5ff;
  font-size: 1.45rem !important;
  border-top-color: rgba(62, 248, 255, 0.42);
}

.total-line-sub {
  color: rgba(245, 236, 255, 0.88) !important;
}

.total-line-nota {
  color: #67f5ff !important;
  font-size: 1.45rem !important;
  border-top-color: rgba(62, 248, 255, 0.42) !important;
}

.resumen-saldos-en-total-general {
  border-top-color: rgba(62, 248, 255, 0.35) !important;
}

.resumen-saldos-titulo {
  color: #3ef8ff;
  text-shadow: 0 0 8px rgba(62, 248, 255, 0.35);
}

.total-general .resumen-saldos-inner {
  background: rgba(6, 10, 28, 0.55);
  border-style: solid;
  border-color: rgba(62, 248, 255, 0.38);
}

.resumen-saldos-value--destacado {
  font-size: 1.28rem;
  color: #f7eeff !important;
  text-shadow: 0 0 12px rgba(103, 245, 255, 0.45);
}

.balance-text {
  color: #34f5c5;
}

.abonos-container {
  border-top-color: rgba(255, 95, 217, 0.26);
}

.mobile-actions-modal {
  background: linear-gradient(160deg, rgba(20, 10, 42, 0.98), rgba(16, 31, 79, 0.95));
  border-top: 1px solid rgba(62, 248, 255, 0.35);
}

.modal {
  background-color: rgba(5, 4, 25, 0.74);
}

.modal-content {
  background: linear-gradient(145deg, rgba(24, 12, 48, 0.98), rgba(18, 34, 74, 0.95));
  border: 1px solid rgba(62, 248, 255, 0.35);
  box-shadow: 0 0 0 1px rgba(255, 95, 217, 0.2) inset, 0 20px 40px rgba(2, 2, 20, 0.75);
}

@media (max-width: 768px) {
  .sale-note {
    padding: 14px;
  }
}
</style>

<style>
/* Pantalla: ocultar línea duplicada de flete (la versión impresa la muestra vía estilos inyectados) */
.flete-print-line {
  display: none;
}
</style>