<template>
  <!-- No changes to template section -->
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import PreciosHistorialModal from '@/components/PreciosHistorialModal.vue';

export default {
  name: 'CuentasCatarro',
  components: {
    BackButton,
    PreciosHistorialModal
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
      estadoPagado: false,
      editingKilosIndex: null,
      longPressTimer: null,
      editingField: {
        index: null,
        field: null
      },
      selectedRowIndex: null,
      showAddProductModal: false,
      newProduct: {
        kilosVenta: null,
        medida: '',
        precioVenta: null
      },
      autoSaveTimer: null,
      lastSavedData: null,
      saveQueue: [],
      isSaving: false,
      lastSaveTime: null,
      saveMinInterval: 5000, // Aumentar a 5 segundos mínimo entre guardados
    }
  },
  computed: {
    fechaFormateada() {
      const fecha = new Date(this.fechaSeleccionada + 'T00:00:00');
      const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },
    totalGeneral() {
      return this.items.reduce((sum, item) => sum + (item.total || 0), 0);
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
      return (this.saldoAcumuladoAnterior || 0) + (this.totalDiaActual || 0);
    },
    gananciaDelDia() {
      const costoTotal = this.items.reduce((sum, item) => sum + (item.total || 0), 0);
      return (this.totalGeneralVenta || 0) - (costoTotal || 0);
    },
    saldoPendiente() {
      return this.totalGeneralVenta - this.abonos.reduce((sum, abono) => sum + (abono.monto || 0), 0);
    },
    estadoCuenta() {
      return this.totalSaldo <= 0 || this.totalDiaActual === 0 ? 'Pagado' : 'No Pagado';
    },
    gananciaTotal() {
      return this.itemsVenta.reduce((sum, item) => sum + (item.ganancia || 0), 0);
    },
    totalDiaActual() {
      const totalCobros = this.cobros.reduce((sum, cobro) => 
        sum + (parseFloat(cobro.monto) || 0), 0);
      const totalAbonos = this.abonos.reduce((sum, abono) => 
        sum + (parseFloat(abono.monto) || 0), 0);
      return (this.totalGeneralVenta || 0) + totalCobros - totalAbonos;
    }
  },
  watch: {
    fechaSeleccionada: {
      handler: 'loadSaldoAcumuladoAnterior',
      immediate: true
    },
    items: {
      handler: 'handleDataChange',
      deep: true
    },
    itemsVenta: {
      handler: 'handleDataChange',
      deep: true
    },
    cobros: {
      handler: 'handleDataChange',
      deep: true
    },
    abonos: {
      handler: 'handleDataChange',
      deep: true
    },
    fechaSeleccionada: {
      handler: 'handleDataChange'
    },
    saldoAcumuladoAnterior: {
      handler: 'handleDataChange'
    },
    'newItem.kilos': 'handleDataChange',
    'newItem.medida': 'handleDataChange',
    'newItem.costo': 'handleDataChange'
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
              totalVenta: (item.precioVenta || 0) * item.kilos,
              kilosVenta: item.kilos
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
        this.saldoAcumuladoAnterior = await this.obtenerSaldoAcumuladoAnterior();
        console.log("Saldo acumulado anterior cargado:", this.saldoAcumuladoAnterior);
      } catch (error) {
        console.error("Error al cargar el saldo acumulado anterior:", error);
        this.saldoAcumuladoAnterior = 0;
      }
    },
    async obtenerSaldoAcumuladoAnterior() {
      try {
        const cuentasRef = collection(db, 'cuentasCatarro');
        const q = query(
          cuentasRef,
          where('fecha', '<', this.fechaSeleccionada),
          orderBy('fecha', 'desc'),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const ultimaCuenta = querySnapshot.docs[0].data();
          return ultimaCuenta.nuevoSaldoAcumulado || 0;
        }
        
        return 0;
      } catch (error) {
        console.error('Error al obtener saldo acumulado anterior:', error);
        return 0;
      }
    },
    async actualizarCuentasPosteriores(fechaActual) {
      try {
        const cuentasRef = collection(db, 'cuentasCatarro');
        const q = query(
          cuentasRef,
          orderBy('fecha', 'asc')
        );

        const querySnapshot = await getDocs(q);
        const todasLasCuentas = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Ordenar las cuentas por fecha
        const cuentasOrdenadas = todasLasCuentas.sort((a, b) => 
          new Date(a.fecha) - new Date(b.fecha)
        );

        let saldoAcumulado = 0;

        // Procesar cada cuenta en orden cronológico
        for (let i = 0; i < cuentasOrdenadas.length; i++) {
          const cuenta = cuentasOrdenadas[i];
          const cuentaRef = doc(db, 'cuentasCatarro', cuenta.id);
          
          // Calcular el total del día
          const totalDia = cuenta.totalGeneralVenta +
            (cuenta.cobros || []).reduce((sum, cobro) => sum + (parseFloat(cobro.monto) || 0), 0) -
            (cuenta.abonos || []).reduce((sum, abono) => sum + (parseFloat(abono.monto) || 0), 0);

          // El saldo acumulado es el saldo anterior más el total del día
          saldoAcumulado = saldoAcumulado + totalDia;
          
          // Actualizar la cuenta
          await updateDoc(cuentaRef, {
            saldoAcumuladoAnterior: i === 0 ? 0 : cuentasOrdenadas[i-1].nuevoSaldoAcumulado,
            nuevoSaldoAcumulado: saldoAcumulado,
            estadoPagado: saldoAcumulado <= 0
          });

          // Si la cuenta está pagada, reiniciar el saldo acumulado
          if (saldoAcumulado <= 0) {
            saldoAcumulado = 0;
          }
        }
      } catch (error) {
        console.error('Error al actualizar cuentas posteriores:', error);
      }
    },
    formatNumber(value) {
      if (value === null || value === undefined) {
        return '0.00';
      }
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    },
    async addItem() {
      if (this.newItem.kilos && this.newItem.medida && this.newItem.costo) {
        try {
          const total = this.newItem.kilos * this.newItem.costo;
          this.items.push({...this.newItem, total});
          this.itemsVenta.push({
            ...this.newItem,
            total,
            precioVenta: null,
            totalVenta: 0,
            kilosVenta: this.newItem.kilos
          });
          this.newItem = {kilos: null, medida: '', costo: null};

          // Encolar el guardado
          await this.queueSave();

        } catch (error) {
          console.error('Error al guardar el item:', error);
          alert('Hubo un problema al guardar. Por favor, intente nuevamente.');
          // Revertir los cambios locales si falló el guardado
          this.items.pop();
          this.itemsVenta.pop();
        }
      }
    },
    async crearNuevaCuenta() {
      try {
        // Verificar si ya existe una nota para esta fecha
        const cuentasRef = collection(db, 'cuentasCatarro');
        const q = query(cuentasRef, where('fecha', '==', this.fechaSeleccionada));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          throw new Error('Ya existe una nota registrada para esta fecha.');
        }

        // Preparar solo los datos esenciales inicialmente
        const notaData = {
          fecha: this.fechaSeleccionada,
          items: this.items,
          itemsVenta: this.itemsVenta,
          saldoAcumuladoAnterior: await this.obtenerSaldoAcumuladoAnterior(),
          cobros: [],
          abonos: [],
          totalGeneral: this.totalGeneral,
          totalGeneralVenta: 0,
          nuevoSaldoAcumulado: this.saldoAcumuladoAnterior,
          estadoPagado: false
        };

        const docRef = await addDoc(collection(db, 'cuentasCatarro'), notaData);
        
        // Actualizar la URL
        this.$router.replace({
          name: this.$route.name,
          params: { id: docRef.id },
          query: { edit: 'true' }
        });

        return docRef.id;
      } catch (error) {
        if (error.message === 'Ya existe una nota registrada para esta fecha.') {
          alert(error.message);
        } else {
          console.error('Error al crear nueva cuenta:', error);
          alert('Error al crear la cuenta. Por favor, intente nuevamente.');
        }
        throw error;
      }
    },
    async removeItem(index) {
      try {
        this.items.splice(index, 1);
        this.itemsVenta.splice(index, 1);
        this.showMobileActions = false;
        
        // Encolar el guardado después de eliminar
        await this.queueSave();
      } catch (error) {
        console.error('Error al eliminar item:', error);
      }
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
        // Calcular el total del día actual
        const totalDia = this.totalGeneralVenta + 
          this.cobros.reduce((sum, cobro) => sum + (parseFloat(cobro.monto) || 0), 0) - 
          this.abonos.reduce((sum, abono) => sum + (parseFloat(abono.monto) || 0), 0);

        // Obtener el saldo acumulado anterior más actualizado
        const saldoAcumuladoActualizado = await this.obtenerSaldoAcumuladoAnterior();
        
        // Calcular el nuevo saldo acumulado
        const nuevoSaldoAcumulado = saldoAcumuladoActualizado + totalDia;
        
        // Verificar si la nota está pagada
        const estaPagada = nuevoSaldoAcumulado <= 0;
        
        const notaData = {
          fecha: this.fechaSeleccionada,
          items: this.items,
          saldoAcumuladoAnterior: saldoAcumuladoActualizado,
          cobros: this.cobros,
          abonos: this.abonos,
          totalGeneral: this.totalGeneral,
          totalGeneralVenta: this.totalGeneralVenta,
          nuevoSaldoAcumulado: estaPagada ? 0 : nuevoSaldoAcumulado,
          gananciaDelDia: this.gananciaDelDia,
          estadoPagado: estaPagada,
          itemsVenta: this.itemsVenta
        };

        console.log("Datos a guardar:", notaData);

        const id = this.$route.params.id;
        const isEditing = this.$route.query.edit === 'true';

        if (id && isEditing) {
          // Actualizar nota existente
          await updateDoc(doc(db, 'cuentasCatarro', id), notaData);
          console.log('Cuenta actualizada exitosamente');
          
          // Actualizar saldos de cuentas posteriores
          await this.actualizarCuentasPosteriores(this.fechaSeleccionada);
          
          alert('Cuenta guardada exitosamente');
          this.$router.push('/cuentas-catarro');
        } else {
          // Verificar si ya existe una nota para esta fecha
          const cuentasRef = collection(db, 'cuentasCatarro');
          const q = query(cuentasRef, where('fecha', '==', this.fechaSeleccionada));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            alert('Ya existe una nota registrada para esta fecha. No se puede crear una nueva.');
            return;
          } else {
            // Crear nueva nota
            await addDoc(collection(db, 'cuentasCatarro'), notaData);
            console.log('Nueva cuenta guardada exitosamente');
            
            // Actualizar saldos de cuentas posteriores
            await this.actualizarCuentasPosteriores(this.fechaSeleccionada);
            
            alert('Cuenta guardada exitosamente');
            this.$router.push('/cuentas-catarro');
          }
        }
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
                  <th>Ganancias</th>
                </tr>
              </thead>
              <tbody>
                ${this.itemsVenta.map(item => `
                  <tr>
                    <td>${this.formatNumber(item.kilosVenta)}</td>
                    <td>${item.medida}</td>
                    <td>$${this.formatNumber(item.precioVenta)}</td>
                    <td>$${this.formatNumber(item.totalVenta)}</td>
                    <td class="${item.ganancia > 0 ? 'ganancia-positiva' : 'ganancia-negativa'}">$${this.formatNumber(item.ganancia)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="total">
                  <td colspan="3">Total Venta</td>
                  <td>$${this.formatNumber(this.totalGeneralVenta)}</td>
                  <td>$${this.formatNumber(this.gananciaTotal)}</td>
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
      this.itemsVenta = this.itemsVenta.map((itemVenta, index) => {
        const itemCosto = this.items[index];
        const totalVenta = (itemVenta.precioVenta || 0) * (itemVenta.kilosVenta || 0);
        const totalCosto = itemCosto ? itemCosto.total : 0;
        const ganancia = totalVenta - totalCosto;
        
        return {
          ...itemVenta,
          totalVenta,
          ganancia
        };
      });
    },
    calcularTotalVenta(index) {
      const item = this.itemsVenta[index];
      if (!item) return;
      
      try {
        const kilos = parseFloat(item.kilosVenta) || 0;
        const precio = parseFloat(item.precioVenta) || 0;
        item.totalVenta = kilos * precio;
        
        const itemCosto = this.items[index];
        const totalCosto = itemCosto ? (itemCosto.total || 0) : 0;
        item.ganancia = (item.totalVenta || 0) - totalCosto;
        
        this.actualizarItemsVenta();
        
        // Encolar el guardado después del cálculo
        this.queueSave();
      } catch (error) {
        console.error('Error al calcular total de venta:', error);
      }
    },
    removeItemVenta(index) {
      this.itemsVenta.splice(index, 1);
    },
    editKilos(index) {
      this.editingKilosIndex = index;
      this.$nextTick(() => {
        if (this.$refs.kilosInput && this.$refs.kilosInput[0]) {
          this.$refs.kilosInput[0].focus();
        }
      });
    },
    finishEditingKilos() {
      const index = this.editingKilosIndex;
      if (index !== null) {
        try {
          const item = this.itemsVenta[index];
          item.kilosVenta = parseFloat(item.kilosVenta) || item.kilos;
          this.calcularTotalVenta(index);
          
          // Encolar el guardado después de la edición
          this.queueSave();
        } catch (error) {
          console.error('Error al finalizar edición de kilos:', error);
        }
      }
      this.editingKilosIndex = null;
    },
    startLongPress(index, field) {
      this.longPressTimer = setTimeout(() => {
        this.editField(index, field);
      }, 500); // 500ms para activar la edición
    },
    endLongPress() {
      clearTimeout(this.longPressTimer);
    },
    editField(index, field) {
      this.editingField = { index, field };
      this.$nextTick(() => {
        if (this.$refs.editInput && this.$refs.editInput[0]) {
          this.$refs.editInput[0].focus();
        }
      });
    },
    finishEditing() {
      const { index, field } = this.editingField;
      if (index !== null && field !== null) {
        try {
          const item = this.items[index];
          if (field === 'kilos' || field === 'costo') {
            item[field] = parseFloat(item[field]) || 0;
          }
          item.total = item.kilos * item.costo;
          this.actualizarItemsVenta();
          
          // Encolar el guardado después de la edición
          this.queueSave();
        } catch (error) {
          console.error('Error al finalizar edición:', error);
        }
      }
      this.editingField = { index: null, field: null };
    },
    toggleGananciasMobile(index) {
      if (window.innerWidth <= 600) {
        this.selectedRowIndex = this.selectedRowIndex === index ? null : index;
      }
    },
    addNewProduct() {
      if (this.newProduct.kilosVenta && this.newProduct.medida && this.newProduct.precioVenta) {
        const totalVenta = this.newProduct.kilosVenta * this.newProduct.precioVenta;
        this.itemsVenta.push({
          ...this.newProduct,
          totalVenta,
          ganancia: totalVenta // La ganancia será igual al total de venta ya que no tiene costo asociado
        });
        this.showAddProductModal = false;
        this.newProduct = { kilosVenta: null, medida: '', precioVenta: null };
      } else {
        alert('Por favor, complete todos los campos');
      }
    },
    handleDataChange() {
      if (this.$route.params.id && this.$route.query.edit === 'true') {
        if (this.autoSaveTimer) {
          clearTimeout(this.autoSaveTimer);
        }
        this.autoSaveTimer = setTimeout(async () => {
          await this.queueSave();
        }, 2000); // Aumentar el delay a 2 segundos
      }
    },
    async queueSave() {
      // Agregar operación a la cola con timestamp
      this.saveQueue.push({
        timestamp: Date.now(),
        operation: async () => {
          if (!this.$route.params.id) {
            await this.crearNuevaCuenta();
          } else {
            await this.autoSaveNota();
          }
        }
      });

      // Procesar la cola si no hay guardado en proceso
      if (!this.isSaving) {
        await this.processSaveQueue();
      }
    },
    async processSaveQueue() {
      if (this.isSaving || this.saveQueue.length === 0) return;

      this.isSaving = true;

      try {
        while (this.saveQueue.length > 0) {
          // Verificar el tiempo desde el último guardado
          const now = Date.now();
          if (this.lastSaveTime && now - this.lastSaveTime < this.saveMinInterval) {
            // Esperar antes de intentar el siguiente guardado
            await new Promise(resolve => 
              setTimeout(resolve, this.saveMinInterval - (now - this.lastSaveTime))
            );
          }

          const nextSave = this.saveQueue[0];
          await this.retryOperation(nextSave.operation);
          this.lastSaveTime = Date.now();
          this.saveQueue.shift();
        }
      } catch (error) {
        console.error('Error procesando cola de guardado:', error);
        if (error.code === 'resource-exhausted') {
          // Esperar 10 segundos antes de reintentar si se excedió la cuota
          await new Promise(resolve => setTimeout(resolve, 10000));
          // Reintentar el procesamiento
          await this.processSaveQueue();
        }
      } finally {
        this.isSaving = false;
      }
    },
    async retryOperation(operation, maxRetries = 3) {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await operation();
        } catch (error) {
          if (i === maxRetries - 1) throw error;
          // Espera exponencial entre reintentos
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    },
    async autoSaveNota() {
      if (!this.$route.params.id) return;

      try {
        // Preparar datos completos para guardar
        const notaData = {
          items: this.items.map(item => ({
            kilos: item.kilos,
            medida: item.medida,
            costo: item.costo,
            total: item.total
          })),
          itemsVenta: this.itemsVenta.map(item => ({
            kilosVenta: item.kilosVenta,
            medida: item.medida,
            precioVenta: item.precioVenta,
            totalVenta: item.totalVenta,
            ganancia: item.ganancia
          })),
          totalGeneral: this.totalGeneral,
          totalGeneralVenta: this.totalGeneralVenta,
          nuevoSaldoAcumulado: this.nuevoSaldoAcumulado,
          cobros: this.cobros,
          abonos: this.abonos,
          estadoPagado: this.estadoCuenta === 'Pagado'
        };

        await updateDoc(doc(db, 'cuentasCatarro', this.$route.params.id), notaData);
        console.log('Cuenta auto-guardada exitosamente');
      } catch (error) {
        if (error.code === 'resource-exhausted') {
          throw error; // Dejar que el sistema de cola maneje el reintento
        }
        console.error('Error en auto-guardado:', error);
        throw error;
      }
    }
  },
  beforeUnmount() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    // Intentar procesar cualquier guardado pendiente
    if (this.saveQueue.length > 0) {
      this.processSaveQueue();
    }
  }
}
</script>

<style scoped>
/* No changes to style section */
</style>
