<template>
  <div class="nueva-deuda">
    <main class="debt-shell">
      <nav class="terminal-nav" aria-label="Navegación del módulo">
        <BackButton to="/procesos/deudas" />
        <span class="terminal-path">~/procesos/deudas/nueva</span>
      </nav>

      <header class="terminal-header-panel">
        <div class="terminal-bar">
          <span class="terminal-dots"><i></i><i></i><i></i></span>
          <span>NUEVA_DEUDA.exe</span>
          <span class="terminal-status">● EN LÍNEA</span>
        </div>
        <div class="terminal-heading">
          <span class="terminal-prompt">&gt;</span>
          <div>
            <p class="terminal-command">INICIAR_REGISTRO</p>
            <h1>Registrar nueva deuda<span class="terminal-cursor">_</span></h1>
            <p class="subtitle">Completa el proveedor, agrega productos y revisa el saldo antes de guardar.</p>
          </div>
        </div>
      </header>

      <ol class="workflow-steps" aria-label="Progreso del registro">
        <li :class="{ active: true, complete: proveedorSeleccionado }">
          <span>01</span><div><strong>Datos</strong><small>Fecha y proveedor</small></div>
        </li>
        <li :class="{ active: proveedorSeleccionado, complete: items.length > 0 }">
          <span>02</span><div><strong>Productos</strong><small>Conceptos de la deuda</small></div>
        </li>
        <li :class="{ active: items.length > 0 }">
          <span>03</span><div><strong>Confirmar</strong><small>Abonos y saldo</small></div>
        </li>
      </ol>

      <div class="registration-layout">
        <div class="registration-main">
          <section class="terminal-card setup-card">
            <div class="card-heading">
              <div><span class="card-index">01</span><h2>Datos de la deuda</h2></div>
              <small>Campos obligatorios</small>
            </div>
            <div class="setup-grid">
              <label class="field-group">
                <span>Fecha de la deuda</span>
                <input type="date" v-model="fechaSeleccionada" class="crt-input">
                <small>{{ fechaFormateada }}</small>
              </label>
              <label class="field-group">
                <span>Proveedor</span>
                <select v-model="proveedorSeleccionado" required class="crt-input crt-select">
                  <option value="" disabled>Selecciona un proveedor</option>
                  <option v-for="proveedor in proveedores" :key="proveedor.id" :value="proveedor.id">
                    {{ proveedor.nombre }}
                  </option>
                </select>
                <small v-if="!proveedorSeleccionado">Elige quién emitió la nota.</small>
                <small v-else class="selected-supplier">
                  <i :style="{ backgroundColor: getProveedorColor(proveedorSeleccionado) }"></i>
                  {{ getNombreProveedor() }} seleccionado
                </small>
              </label>
            </div>
          </section>

          <section class="terminal-card products-entry-card" :class="{ locked: !proveedorSeleccionado }">
            <div class="card-heading">
              <div><span class="card-index">02</span><h2>Productos de la nota</h2></div>
              <small>{{ items.length }} {{ items.length === 1 ? 'producto agregado' : 'productos agregados' }}</small>
            </div>
            <div v-if="!proveedorSeleccionado" class="locked-message">
              <i class="fas fa-lock" aria-hidden="true"></i>
              <div><strong>Selecciona un proveedor</strong><p>Después podrás capturar kilos, producto y precio.</p></div>
            </div>
            <ProductoSelector
              v-else
              :proveedor-id="proveedorSeleccionado"
              @agregar-producto="addItem"
            />
          </section>

          <section v-if="items.length > 0" class="terminal-card items-card">
            <div class="card-heading">
              <div><span class="card-index">03</span><h2>Conceptos agregados</h2></div>
              <small>Haz clic en kilos, producto o precio para editar.</small>
            </div>
            <div class="table-scroll">
              <table class="crt-table">
                <thead><tr><th>Kilos</th><th>Producto</th><th>Precio</th><th>Importe</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="(item, index) in items" :key="index">
                    <td @click="editarItem(index, 'kilos')" class="editable">
                      <span v-if="!item.editando || item.campoEditando !== 'kilos'">{{ formatNumber(item.kilos) }}</span>
                      <input v-else v-model.number="item.kilos" type="number" min="0" step="0.01" class="table-input" @blur="finalizarEdicion(index)" @keyup.enter="finalizarEdicion(index)">
                    </td>
                    <td @click="editarItem(index, 'producto')" class="editable">
                      <span v-if="!item.editando || item.campoEditando !== 'producto'">{{ item.producto }}</span>
                      <input v-else v-model="item.producto" type="text" class="table-input" @blur="finalizarEdicion(index)" @keyup.enter="finalizarEdicion(index)">
                    </td>
                    <td @click="editarItem(index, 'precio')" class="editable">
                      <span v-if="!item.editando || item.campoEditando !== 'precio'">${{ formatNumber(item.precio) }}</span>
                      <input v-else v-model.number="item.precio" type="number" min="0" step="0.01" class="table-input" @blur="finalizarEdicion(index)" @keyup.enter="finalizarEdicion(index)">
                    </td>
                    <td class="money-cell">${{ formatNumber(item.total) }}</td>
                    <td><button @click="removeItem(index)" class="icon-button danger" :aria-label="`Eliminar ${item.producto}`"><i class="fas fa-trash-alt"></i></button></td>
                  </tr>
                </tbody>
                <tfoot><tr><td colspan="3">TOTAL DE LA DEUDA</td><td class="money-cell">${{ formatNumber(totalGeneral) }}</td><td></td></tr></tfoot>
              </table>
            </div>
          </section>

          <section v-if="items.length > 0" class="terminal-card initial-payments-card">
            <div class="card-heading">
              <div><span class="card-index optional">+</span><h2>Abono inicial</h2></div>
              <small>Opcional · se descuenta del saldo al guardar</small>
            </div>
            <div v-if="abonos.length === 0" class="optional-empty">
              <p>¿Ya entregaste un pago al recibir esta nota?</p>
              <button @click="addAbono" class="crt-button secondary"><i class="fas fa-plus"></i> Agregar abono inicial</button>
            </div>
            <div v-else class="initial-payments-list">
              <div v-for="(abono, index) in abonos" :key="index" class="payment-row">
                <label><span>Fecha</span><input v-model="abono.fecha" type="date" class="crt-input"></label>
                <label class="payment-description"><span>Descripción</span><input v-model.trim="abono.descripcion" type="text" class="crt-input" placeholder="Ej. Transferencia inicial"></label>
                <label><span>Monto</span><input v-model.number="abono.monto" type="number" min="0.01" :max="totalGeneral" step="0.01" class="crt-input" placeholder="0.00"></label>
                <button @click="removeAbono(index)" class="icon-button danger" aria-label="Eliminar abono inicial"><i class="fas fa-trash-alt"></i></button>
              </div>
              <button @click="addAbono" class="crt-button text-button"><i class="fas fa-plus"></i> Agregar otro abono</button>
              <p v-if="totalAbonos > totalGeneral" class="validation-error"><i class="fas fa-exclamation-triangle"></i> Los abonos no pueden superar el total de la deuda.</p>
            </div>
          </section>
        </div>

        <aside class="terminal-card summary-panel">
          <div class="summary-heading"><span>RESUMEN_DE_REGISTRO</span><i class="fas fa-receipt"></i></div>
          <dl class="summary-list">
            <div><dt>Proveedor</dt><dd>{{ getNombreProveedor() || 'Sin seleccionar' }}</dd></div>
            <div><dt>Productos</dt><dd>{{ items.length }}</dd></div>
            <div><dt>Total deuda</dt><dd>${{ formatNumber(totalGeneral) }}</dd></div>
            <div><dt>Abono inicial</dt><dd class="paid">-${{ formatNumber(totalAbonos) }}</dd></div>
            <div class="balance-row"><dt>Saldo pendiente</dt><dd>${{ formatNumber(Math.max(0, saldoPendiente)) }}</dd></div>
          </dl>
          <div class="save-checklist">
            <p :class="{ ready: proveedorSeleccionado }"><i class="fas fa-check-circle"></i> Proveedor seleccionado</p>
            <p :class="{ ready: items.length > 0 }"><i class="fas fa-check-circle"></i> Al menos un producto</p>
            <p :class="{ ready: abonosValidos }"><i class="fas fa-check-circle"></i> Abonos válidos</p>
          </div>
          <button @click="guardarDeuda" class="crt-button primary save-button" :disabled="!puedeGuardar || guardando">
            <i :class="guardando ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"></i>
            {{ guardando ? 'Guardando registro…' : 'Guardar deuda' }}
          </button>
          <small class="save-hint">Se guardarán la deuda, sus productos y abonos en una sola operación.</small>
        </aside>
      </div>
    </main>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import ProductoSelector from '@/components/Deudas/ProductoSelector.vue';
import { formatNumber } from '@/utils/formatters';

export default {
  name: 'NuevaDeuda',
  components: {
    BackButton,
    ProductoSelector
  },
  data() {
    return {
      proveedores: [],
      proveedorSeleccionado: '',
      fechaSeleccionada: this.obtenerFechaActual(),
      items: [],
      abonos: [],
      guardando: false
    };
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
    totalAbonos() {
      return this.abonos.reduce((sum, abono) => sum + (abono.monto || 0), 0);
    },
    saldoPendiente() {
      return this.totalGeneral - this.totalAbonos;
    },
    abonosValidos() {
      return this.totalAbonos <= this.totalGeneral && this.abonos.every(abono => (
        abono.fecha &&
        abono.descripcion &&
        Number(abono.monto) > 0
      ));
    },
    puedeGuardar() {
      return Boolean(
        this.proveedorSeleccionado &&
        this.items.length > 0 &&
        this.totalGeneral > 0 &&
        this.abonosValidos
      );
    }
  },
  methods: {
    formatNumber,
    obtenerFechaActual() {
      const fecha = new Date();
      // Usar la zona horaria local para evitar problemas de UTC
      const año = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // getMonth() retorna 0-11
      const dia = String(fecha.getDate()).padStart(2, '0');
      return `${año}-${mes}-${dia}`;
    },
    async loadProveedores() {
      try {
        const querySnapshot = await getDocs(collection(db, 'proveedoresDeuda'));
        this.proveedores = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const proveedorIdInicial = this.$route.query.proveedorId;
        if (proveedorIdInicial && this.proveedores.some(proveedor => proveedor.id === proveedorIdInicial)) {
          this.proveedorSeleccionado = proveedorIdInicial;
        }
      } catch (error) {
        console.error("Error al cargar proveedores: ", error);
      }
    },
    getNombreProveedor() {
      const proveedor = this.proveedores.find(p => p.id === this.proveedorSeleccionado);
      return proveedor ? proveedor.nombre : '';
    },
    getProveedorColor(proveedorId) {
      const proveedor = this.proveedores.find(p => p.id === proveedorId);
      return proveedor && proveedor.color ? proveedor.color : '#cccccc';
    },
    addItem(item) {
      this.items.push({
        kilos: item.kilos,
        producto: item.producto,
        precio: item.precio,
        total: item.total,
        editando: false,
        campoEditando: null
      });
    },
    removeItem(index) {
      this.items.splice(index, 1);
    },
    editarItem(index, campo) {
      this.items = this.items.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            editando: true,
            campoEditando: campo
          };
        } else {
          return {
            ...item,
            editando: false,
            campoEditando: null
          };
        }
      });
    },
    finalizarEdicion(index) {
      const item = this.items[index];
      // Recalcular el total
      item.total = item.kilos * item.precio;
      
      // Finalizar edición
      item.editando = false;
      item.campoEditando = null;
    },
    addAbono() {
      this.abonos.push({
        descripcion: '',
        monto: null,
        fecha: this.fechaSeleccionada
      });
    },
    removeAbono(index) {
      this.abonos.splice(index, 1);
    },
    async guardarDeuda() {
      if (!this.proveedorSeleccionado) {
        alert('Por favor seleccione un proveedor');
        return;
      }

      if (this.items.length === 0) {
        alert('Por favor agregue al menos un producto');
        return;
      }

      if (!this.abonosValidos) {
        alert('Revise los abonos iniciales. Todos deben tener fecha, descripción y un monto válido sin superar el total de la deuda.');
        return;
      }

      try {
        this.guardando = true;

        // Guardar deuda, productos y abonos como una sola operación atómica.
        const batch = writeBatch(db);
        const deudaRef = doc(collection(db, 'deudas'));
        batch.set(deudaRef, {
          proveedorId: this.proveedorSeleccionado,
          proveedorNombre: this.getNombreProveedor(),
          fecha: this.fechaSeleccionada,
          fechaCreacion: new Date(),
          total: this.totalGeneral,
          saldoPendiente: this.saldoPendiente,
          estado: this.saldoPendiente > 0 ? 'pendiente' : 'pagado'
        });

        for (const item of this.items) {
          const productoRef = doc(collection(db, 'deudas', deudaRef.id, 'productos'));
          batch.set(productoRef, {
            kilos: item.kilos,
            producto: item.producto,
            precio: item.precio,
            total: item.total
          });
        }

        for (const abono of this.abonos) {
          const abonoRef = doc(collection(db, 'deudas', deudaRef.id, 'abonos'));
          batch.set(abonoRef, {
            descripcion: abono.descripcion,
            monto: Number(abono.monto),
            fecha: abono.fecha,
            fechaCreacion: new Date(),
            esAbonoGeneral: false
          });
        }

        await batch.commit();

        alert('Deuda guardada correctamente');
        this.$router.push('/procesos/deudas/lista');
      } catch (error) {
        console.error("Error al guardar la deuda: ", error);
        alert('Error al guardar la deuda: ' + error.message);
      } finally {
        this.guardando = false;
      }
    }
  },
  mounted() {
    this.loadProveedores();
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap');
.nueva-deuda {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px;
  color: white;
  position: relative;
}

.back-button-container {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
}

/* Header moderno */
.header-section {
  text-align: center;
  margin-bottom: 40px;
  margin-top: 60px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.header-content {
  width: 100%;
}

.main-title {
  font-size: 2.8rem;
  font-weight: 700;
  margin: 0 0 15px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  color: white;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.icon-new {
  font-size: 3rem;
}

.subtitle {
  font-size: 1.2rem;
  margin: 0;
  opacity: 0.9;
  font-weight: 300;
}

/* Cards de sección */
.fecha-card,
.proveedor-card,
.productos-card,
.tabla-container {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 25px;
  margin-bottom: 25px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.section-title {
  font-size: 1.3rem;
  font-weight: 600;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: white;
}

/* Estilos de fecha */
.fecha-container {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.fecha-display {
  color: white;
  font-weight: 500;
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Estilos de proveedor */
.proveedor-info {
  margin-top: 15px;
  padding: 12px 16px;
  background: rgba(76, 175, 80, 0.2);
  border-radius: 10px;
  border: 1px solid rgba(76, 175, 80, 0.3);
  display: flex;
  align-items: center;
  gap: 10px;
}

.proveedor-info span {
  color: white;
}

/* Inputs y selects modernos */
.modern-input,
.modern-select {
  width: 100%;
  padding: 12px 15px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.modern-input:focus,
.modern-select:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

.modern-select option {
  background: #667eea;
  color: white;
}

.proveedor-selector {
  margin-bottom: 30px;
}

.proveedor-selector select {
  width: 100%;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ddd;
  margin-bottom: 10px;
  font-size: 1em;
}

.proveedor-info {
  display: block;
  font-weight: bold;
  color: #3498db;
  margin-top: 5px;
}

.input-section {
  margin-bottom: 30px;
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
}

.input-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
  align-items: center;
}

.input-row input {
  flex: 1;
  min-width: 100px;
  padding: 10px;
  border-radius: 5px;
  border: 1px solid #ddd;
}

.total-calculado {
  font-weight: bold;
  color: #3498db;
  min-width: 120px;
}

.add-btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.add-btn:hover {
  background-color: #2980b9;
}

/* Tabla moderna */
.tabla-wrapper {
  overflow-x: auto;
}

.tabla-productos {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.tabla-productos th,
.tabla-productos td {
  padding: 15px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.tabla-productos th {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tabla-productos tbody tr {
  transition: all 0.3s ease;
}

.tabla-productos tbody tr:hover {
  background: rgba(255, 255, 255, 0.1);
}

.editable {
  cursor: pointer;
  transition: all 0.3s ease;
}

.editable:hover {
  background: rgba(255, 255, 255, 0.1);
}

.table-input {
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 5px;
  padding: 5px 8px;
  width: 100%;
}

.total-cell {
  font-weight: 600;
  color: #4CAF50;
}

.total-row {
  background: rgba(255, 255, 255, 0.1);
  font-weight: 600;
}

.total-label {
  text-align: right;
  font-weight: 600;
  font-size: 1.1rem;
}

.total-amount {
  font-weight: 700;
  font-size: 1.2rem;
  color: #4CAF50;
}

.btn-delete {
  background: linear-gradient(45deg, #FF6B6B, #EE5A52);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-delete:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 15px rgba(255, 107, 107, 0.4);
}

.icon-trash {
  font-size: 1rem;
}

/* Responsive */
@media (max-width: 768px) {
  .nueva-deuda {
    padding: 20px;
  }

  .header-section {
    padding: 20px;
    margin-bottom: 30px;
    margin-top: 80px;
  }

  .main-title {
    font-size: 2.2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .fecha-container {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .tabla-productos th,
  .tabla-productos td {
    padding: 10px 8px;
    font-size: 0.9rem;
  }

  .back-button-container {
    top: 15px;
    left: 15px;
  }
}

@media (max-width: 480px) {
  .nueva-deuda {
    padding: 15px;
  }

  .header-section {
    padding: 15px;
    margin-top: 70px;
  }

  .main-title {
    font-size: 1.8rem;
    flex-direction: column;
    gap: 10px;
  }

  .icon-new {
    font-size: 2.5rem;
  }

  .fecha-card,
  .proveedor-card,
  .productos-card,
  .tabla-container {
    padding: 20px;
  }

  .back-button-container {
    top: 10px;
    left: 10px;
  }
}

.tabla-principal tfoot {
  font-weight: bold;
}

.tabla-principal tfoot td {
  border-top: 2px solid #3498db;
}

.total-label {
  text-align: right;
}

.action-column {
  width: 100px;
  text-align: center;
}

.delete-btn {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.delete-btn:hover {
  background-color: #c0392b;
}

/* Abonos section */
.abonos-section {
  margin-bottom: 30px;
}

.abonos {
  margin-bottom: 20px;
}

.resumen {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 10px;
  margin-top: 20px;
}

.resumen h3 {
  color: #2c3e50;
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 5px;
}

.resumen-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.resumen-item.total {
  font-weight: bold;
  font-size: 1.2em;
  color: #3498db;
  border-top: 1px solid #ddd;
  padding-top: 10px;
  margin-top: 10px;
}

/* Button container */
.button-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

.save-button {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1.1em;
  transition: background-color 0.3s;
}

.save-button:hover {
  background-color: #27ae60;
}

.save-button:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

/* Responsive adjustments */
/* Estilos para indicador de color del proveedor */
.proveedor-selected-info {
  margin-top: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 15px;
  border: 2px solid rgba(102, 126, 234, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
}

.proveedor-color-display {
  display: flex;
  align-items: center;
  gap: 15px;
}

.color-indicator-large {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.proveedor-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.proveedor-nombre {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
}

.proveedor-label {
  font-size: 0.85rem;
  color: #7f8c8d;
  font-style: italic;
}

@media (max-width: 768px) {
  .input-row {
    flex-direction: column;
  }
  
  .input-row input, .input-row button, .total-calculado {
    width: 100%;
    margin-bottom: 10px;
  }
  
  .tabla-principal {
    font-size: 0.9em;
  }
  
  .action-column {
    width: auto;
  }
  
  .proveedor-selected-info {
    padding: 12px;
    margin-top: 12px;
  }
  
  .proveedor-color-display {
    gap: 12px;
  }
  
  .color-indicator-large {
    width: 28px;
    height: 28px;
  }
  
  .proveedor-nombre {
    font-size: 1rem;
  }
  
  .proveedor-label {
    font-size: 0.8rem;
  }
}
/* Terminal CRT redesign */
.nueva-deuda {
  --crt-green: #00ff88;
  --crt-green-dim: rgba(0, 255, 136, 0.16);
  --crt-amber: #ffb000;
  --crt-cyan: #22d3ee;
  --crt-red: #ff5f56;
  --crt-bg: #050a08;
  --crt-panel: #08120e;
  --crt-line: rgba(0, 255, 136, 0.28);
  min-height: 100vh;
  padding: 0;
  overflow-x: hidden;
  background:
    repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 4px),
    radial-gradient(circle at 50% -20%, #102a1d 0%, var(--crt-bg) 48%);
  color: #d8ffe9;
  font-family: 'Share Tech Mono', monospace;
}

.debt-shell { width: min(1240px, calc(100% - 40px)); margin: 0 auto; padding: 24px 0 60px; }
.terminal-nav { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.terminal-nav ::v-deep .btn-back { margin: 0; padding: 9px 14px; border: 1px solid var(--crt-line); border-radius: 2px; background: #07100c; color: var(--crt-green); font: 0.85rem 'Share Tech Mono', monospace; box-shadow: inset 0 0 18px rgba(0,255,136,.04); }
.terminal-nav ::v-deep .btn-back::before { content: '< '; color: var(--crt-amber); }
.terminal-path { color: #769985; font-size: .78rem; }

.terminal-header-panel { border: 1px solid var(--crt-line); background: rgba(3,14,9,.92); box-shadow: 0 0 28px rgba(0,255,136,.08), inset 0 0 50px rgba(0,255,136,.025); }
.terminal-bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 9px 14px; border-bottom: 1px solid var(--crt-line); background: #0a1711; color: #7ca68c; font-size: .72rem; letter-spacing: .08em; }
.terminal-dots { display: flex; gap: 6px; }
.terminal-dots i { width: 9px; height: 9px; border-radius: 50%; background: var(--crt-red); box-shadow: 0 0 7px currentColor; }
.terminal-dots i:nth-child(2) { background: var(--crt-amber); }
.terminal-dots i:nth-child(3) { background: var(--crt-green); }
.terminal-status { justify-self: end; color: var(--crt-green); }
.terminal-heading { display: flex; gap: 18px; padding: 30px 34px 34px; }
.terminal-prompt { color: var(--crt-amber); font: 2.4rem 'VT323', monospace; text-shadow: 0 0 10px rgba(255,176,0,.7); }
.terminal-command { margin: 0 0 5px; color: var(--crt-green); font-size: .76rem; letter-spacing: .12em; }
.terminal-heading h1 { margin: 0; color: var(--crt-green); font: 3.1rem/1 'VT323', monospace; letter-spacing: .04em; text-shadow: 0 0 12px rgba(0,255,136,.55); }
.terminal-heading .subtitle { margin: 10px 0 0; color: #95b8a2; font-size: .9rem; }
.terminal-cursor { animation: crtBlink 1s steps(1) infinite; }
@keyframes crtBlink { 50% { opacity: 0; } }

.workflow-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; margin: 18px 0; padding: 0; border: 1px solid var(--crt-line); background: var(--crt-line); list-style: none; }
.workflow-steps li { display: flex; align-items: center; gap: 12px; padding: 14px 18px; background: #07100c; color: #557363; }
.workflow-steps li.active { color: #b6dbc4; background: #091710; }
.workflow-steps li.complete { color: var(--crt-green); }
.workflow-steps li > span { font: 1.35rem 'VT323', monospace; }
.workflow-steps li div { display: flex; flex-direction: column; gap: 2px; }
.workflow-steps strong { font-size: .82rem; text-transform: uppercase; }
.workflow-steps small { color: #658171; font-size: .68rem; }

.registration-layout { display: grid; grid-template-columns: minmax(0,1fr) 310px; gap: 18px; align-items: flex-start; }
.registration-main { display: grid; gap: 18px; min-width: 0; }
.terminal-card { border: 1px solid var(--crt-line); border-radius: 0; background: rgba(6,17,12,.94); box-shadow: inset 0 0 32px rgba(0,255,136,.02); color: #d8ffe9; }
.card-heading { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 14px 18px; border-bottom: 1px solid var(--crt-line); background: #091710; }
.card-heading > div { display: flex; align-items: center; gap: 10px; }
.card-heading h2 { margin: 0; color: #d8ffe9; font-size: .95rem; letter-spacing: .05em; text-transform: uppercase; }
.card-heading > small { color: #6f9580; font-size: .68rem; text-align: right; }
.card-index { display: grid; place-items: center; width: 27px; height: 27px; border: 1px solid var(--crt-green); color: var(--crt-green); font: 1rem 'VT323', monospace; box-shadow: 0 0 8px rgba(0,255,136,.18); }
.card-index.optional { border-color: var(--crt-amber); color: var(--crt-amber); }

.setup-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 18px; padding: 20px; }
.field-group, .payment-row label { display: flex; flex-direction: column; gap: 7px; color: #9ec7ac; font-size: .76rem; text-transform: uppercase; letter-spacing: .04em; }
.field-group small { min-height: 1em; color: #668574; font-size: .68rem; text-transform: none; }
.crt-input { width: 100%; box-sizing: border-box; padding: 12px 13px; border: 1px solid #26503a; border-radius: 0; outline: none; background: #030a07; color: #e0ffea; font: .86rem 'Share Tech Mono', monospace; color-scheme: dark; }
.crt-input:focus { border-color: var(--crt-green); box-shadow: 0 0 0 2px rgba(0,255,136,.12), inset 0 0 14px rgba(0,255,136,.04); }
.crt-select option { background: #07100c; }
.selected-supplier { display: flex; align-items: center; gap: 6px; color: var(--crt-green) !important; }
.selected-supplier i { width: 8px; height: 8px; border-radius: 50%; }
.products-entry-card.locked { border-style: dashed; }
.locked-message { display: flex; align-items: center; justify-content: center; gap: 15px; min-height: 120px; padding: 20px; color: #688475; }
.locked-message i { font-size: 1.35rem; }
.locked-message p { margin: 4px 0 0; font-size: .74rem; }
.products-entry-card ::v-deep .producto-selector { padding: 20px; margin: 0; }

.table-scroll { overflow-x: auto; }
.crt-table { width: 100%; border-collapse: collapse; color: #cdeed8; font-size: .79rem; }
.crt-table th { padding: 11px 14px; border-bottom: 1px solid var(--crt-line); background: #030a07; color: var(--crt-green); font-size: .68rem; letter-spacing: .06em; text-align: left; text-transform: uppercase; }
.crt-table td { padding: 12px 14px; border-bottom: 1px solid rgba(0,255,136,.1); }
.crt-table tbody tr:hover { background: rgba(0,255,136,.035); }
.crt-table .editable { cursor: text; }
.crt-table .editable:hover { color: var(--crt-green); }
.crt-table tfoot td { border-top: 1px solid var(--crt-green); color: var(--crt-green); font-weight: bold; }
.money-cell { color: var(--crt-amber); font-variant-numeric: tabular-nums; white-space: nowrap; }
.table-input { width: 100%; min-width: 80px; box-sizing: border-box; border: 1px solid var(--crt-green); background: #020604; color: #eafff1; font: inherit; }
.icon-button { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid var(--crt-line); background: transparent; color: #9bc3aa; cursor: pointer; }
.icon-button.danger { border-color: rgba(255,95,86,.35); color: var(--crt-red); }
.icon-button:hover { background: rgba(255,255,255,.04); }

.optional-empty { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 20px; }
.optional-empty p { margin: 0; color: #86a894; font-size: .8rem; }
.initial-payments-list { display: grid; gap: 12px; padding: 18px; }
.payment-row { display: grid; grid-template-columns: 150px minmax(180px,1fr) 150px auto; gap: 10px; align-items: flex-end; padding: 12px; border: 1px solid rgba(0,255,136,.14); background: #050d09; }
.payment-description { min-width: 0; }
.validation-error { margin: 0; padding: 10px; border: 1px solid rgba(255,95,86,.4); color: #ff8b84; font-size: .75rem; }

.crt-button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; padding: 10px 15px; border: 1px solid var(--crt-green); border-radius: 0; background: transparent; color: var(--crt-green); cursor: pointer; font: .78rem 'Share Tech Mono', monospace; font-weight: 700; text-transform: uppercase; }
.crt-button:hover:not(:disabled) { background: var(--crt-green-dim); box-shadow: 0 0 14px rgba(0,255,136,.16); }
.crt-button.primary { background: var(--crt-green); color: #021008; }
.crt-button.secondary { border-color: var(--crt-amber); color: var(--crt-amber); }
.crt-button.text-button { justify-self: start; min-height: 32px; padding: 6px 0; border: 0; }
.crt-button:disabled { opacity: .35; cursor: not-allowed; }

.summary-panel { position: sticky; top: 16px; overflow: hidden; }
.summary-heading { display: flex; justify-content: space-between; padding: 15px 17px; border-bottom: 1px solid var(--crt-line); background: #091710; color: var(--crt-green); font-size: .76rem; letter-spacing: .05em; }
.summary-list { margin: 0; padding: 8px 18px; }
.summary-list > div { display: flex; justify-content: space-between; gap: 15px; padding: 12px 0; border-bottom: 1px dashed rgba(0,255,136,.17); }
.summary-list dt { color: #72907d; font-size: .73rem; }
.summary-list dd { margin: 0; color: #d8ffe9; font-size: .8rem; text-align: right; }
.summary-list dd.paid { color: var(--crt-cyan); }
.summary-list .balance-row { margin-top: 4px; border-bottom: 0; }
.summary-list .balance-row dt, .summary-list .balance-row dd { color: var(--crt-amber); font-size: .93rem; font-weight: bold; }
.save-checklist { padding: 12px 18px; border-top: 1px solid var(--crt-line); border-bottom: 1px solid var(--crt-line); }
.save-checklist p { margin: 7px 0; color: #4c6758; font-size: .7rem; }
.save-checklist p.ready { color: var(--crt-green); }
.summary-panel .save-button { width: calc(100% - 36px); margin: 18px; }
.save-hint { display: block; margin: -8px 18px 18px; color: #5d7868; font-size: .65rem; line-height: 1.45; text-align: center; }

@media (max-width: 940px) {
  .registration-layout { grid-template-columns: 1fr; }
  .summary-panel { position: static; }
  .payment-row { grid-template-columns: 1fr 1fr; }
  .payment-description { grid-column: 1 / -1; grid-row: 1; }
}

@media (max-width: 640px) {
  .debt-shell { width: min(100% - 22px,1240px); padding-top: 12px; }
  .terminal-path, .terminal-status { display: none; }
  .terminal-bar { grid-template-columns: 1fr auto; }
  .terminal-heading { padding: 22px 18px 25px; gap: 10px; }
  .terminal-heading h1 { font-size: 2.25rem; }
  .workflow-steps { grid-template-columns: 1fr; }
  .workflow-steps li { padding: 10px 14px; }
  .setup-grid, .payment-row { grid-template-columns: 1fr; }
  .card-heading { align-items: flex-start; flex-direction: column; gap: 7px; }
  .card-heading > small { text-align: left; }
  .optional-empty { align-items: stretch; flex-direction: column; }
  .crt-button { width: 100%; }
  .payment-row .icon-button { width: 100%; }
}
</style>
