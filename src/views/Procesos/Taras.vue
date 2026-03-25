<template>
  <div class="taras-page">
    <div class="header-tools">
      <BackButton to="/procesos" />
    </div>

    <h1>Registro de Taras por Proveedor</h1>
    <p class="subtitle">Registra cargos y abonos para controlar taras y tapas pendientes con cada proveedor.</p>

    <div class="layout">
      <section class="panel">
        <div class="panel-header">
          <h2>Proveedores</h2>
          <button class="btn-primary" @click="abrirModalProveedor">+ Nuevo proveedor</button>
        </div>

        <div class="selector-group">
          <label for="proveedor">Seleccionar proveedor</label>
          <select id="proveedor" v-model="proveedorSeleccionadoId" @change="onCambiarProveedor">
            <option value="">Selecciona un proveedor</option>
            <option v-for="proveedor in proveedores" :key="proveedor.id" :value="proveedor.id">
              {{ proveedor.nombre }}
            </option>
          </select>
        </div>

        <ul class="proveedores-lista">
          <li
            v-for="proveedor in proveedores"
            :key="proveedor.id"
            :class="{ activo: proveedor.id === proveedorSeleccionadoId }"
            @click="seleccionarProveedor(proveedor.id)"
          >
            <div class="proveedor-nombre">{{ proveedor.nombre }}</div>
            <div class="proveedor-saldo" :class="{ negativo: Number(proveedor.saldoTarasActual) < 0 || Number(proveedor.saldoTapasActual) < 0 }">
              Taras: {{ formatearCantidad(proveedor.saldoTarasActual) }} | Tapas: {{ formatearCantidad(proveedor.saldoTapasActual) }}
            </div>
          </li>
        </ul>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Movimientos</h2>
          <div
            v-if="proveedorSeleccionado"
            class="saldo-card"
            :class="{ negativo: saldoPendienteTaras < 0 || saldoPendienteTapas < 0 }"
          >
            Taras: {{ formatearCantidad(saldoPendienteTaras) }} | Tapas: {{ formatearCantidad(saldoPendienteTapas) }}
          </div>
        </div>

        <form class="movimiento-form" @submit.prevent="guardarMovimiento">
          <div class="form-group">
            <label for="fecha">Fecha</label>
            <input id="fecha" type="date" v-model="nuevoMovimiento.fecha" required>
          </div>

          <div class="form-group">
            <label for="tipo">Tipo</label>
            <select id="tipo" v-model="nuevoMovimiento.tipo" required>
              <option value="cargo">Cargo (+)</option>
              <option value="abono">Abono (-)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="taras">Taras</label>
            <input id="taras" type="number" min="0" step="1" v-model.number="nuevoMovimiento.taras" required>
          </div>

          <div class="form-group">
            <label for="tapas">Tapas</label>
            <input id="tapas" type="number" min="0" step="1" v-model.number="nuevoMovimiento.tapas" required>
          </div>

          <div class="form-actions">
            <button class="btn-primary" type="submit" :disabled="guardando || !proveedorSeleccionadoId">
              {{ guardando ? 'Guardando...' : (movimientoEditandoId ? 'Guardar cambios' : 'Guardar movimiento') }}
            </button>
            <button
              v-if="movimientoEditandoId"
              class="btn-secundario"
              type="button"
              :disabled="guardando"
              @click="cancelarEdicionMovimiento"
            >
              Cancelar edición
            </button>
            <button
              class="btn-pdf"
              type="button"
              :disabled="generandoPdf || !proveedorSeleccionadoId"
              @click="imprimirPdfMovimientos"
            >
              {{ generandoPdf ? 'Generando PDF...' : 'Imprimir PDF' }}
            </button>
          </div>
        </form>

        <TarasMovimientosTable
          :movimientos="movimientos"
          :saldo-taras-actual="saldoPendienteTaras"
          :saldo-tapas-actual="saldoPendienteTapas"
          @editar="editarMovimiento"
          @eliminar="eliminarMovimiento"
        />
      </section>
    </div>

    <div v-if="mostrarModalProveedor" class="modal-overlay" @click="cerrarModalPorOverlay">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Nuevo proveedor</h3>
          <button class="btn-close" @click="mostrarModalProveedor = false">×</button>
        </div>

        <form class="modal-body" @submit.prevent="guardarProveedor">
          <div class="form-group">
            <label for="nuevo-nombre">Nombre</label>
            <input id="nuevo-nombre" type="text" v-model.trim="nuevoProveedor.nombre" required>
          </div>
          <div class="form-group">
            <label for="nuevo-contacto">Contacto (opcional)</label>
            <input id="nuevo-contacto" type="text" v-model.trim="nuevoProveedor.contacto">
          </div>
          <button class="btn-primary" type="submit" :disabled="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar proveedor' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import BackButton from '@/components/BackButton.vue';
import TarasMovimientosTable from '@/components/Taras/TarasMovimientosTable.vue';

export default {
  name: 'Taras',
  components: {
    BackButton,
    TarasMovimientosTable
  },
  data() {
    return {
      proveedores: [],
      proveedorSeleccionadoId: '',
      movimientos: [],
      mostrarModalProveedor: false,
      guardando: false,
      generandoPdf: false,
      nuevoProveedor: {
        nombre: '',
        contacto: ''
      },
      nuevoMovimiento: {
        fecha: this.obtenerFechaActual(),
        tipo: 'cargo',
        taras: null,
        tapas: 0
      },
      movimientoEditandoId: null,
      movimientoEditandoValores: null
    };
  },
  computed: {
    proveedorSeleccionado() {
      return this.proveedores.find((item) => item.id === this.proveedorSeleccionadoId) || null;
    },
    saldoPendienteTaras() {
      return Number(this.proveedorSeleccionado?.saldoTarasActual ?? this.proveedorSeleccionado?.saldoActual) || 0;
    },
    saldoPendienteTapas() {
      return Number(this.proveedorSeleccionado?.saldoTapasActual) || 0;
    }
  },
  async mounted() {
    await this.cargarProveedores();
  },
  methods: {
    obtenerFechaActual() {
      const fecha = new Date();
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    formatearCantidad(valor) {
      const numero = Number(valor) || 0;
      const prefijo = numero > 0 ? '+' : '';
      return `${prefijo}${numero}`;
    },
    async cargarProveedores() {
      const proveedorAnterior = this.proveedorSeleccionadoId;
      const snapshot = await getDocs(query(collection(db, 'tarasProveedores'), orderBy('nombre', 'asc')));
      this.proveedores = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
        saldoActual: Number(item.data().saldoActual) || 0,
        saldoTarasActual: Number(item.data().saldoTarasActual ?? item.data().saldoActual) || 0,
        saldoTapasActual: Number(item.data().saldoTapasActual) || 0
      }));

      const existeAnterior = this.proveedores.some((item) => item.id === proveedorAnterior);
      if (existeAnterior) {
        this.proveedorSeleccionadoId = proveedorAnterior;
      } else if (this.proveedores.length > 0) {
        this.proveedorSeleccionadoId = this.proveedores[0].id;
      } else {
        this.proveedorSeleccionadoId = '';
      }

      await this.cargarMovimientos();
    },
    async cargarMovimientos() {
      if (!this.proveedorSeleccionadoId) {
        this.movimientos = [];
        return;
      }

      const movimientosRef = collection(db, 'tarasProveedores', this.proveedorSeleccionadoId, 'movimientos');
      const snapshot = await getDocs(query(movimientosRef, orderBy('fecha', 'asc')));
      this.movimientos = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
          taras: Number(item.data().taras) || 0,
          tapas: Number(item.data().tapas) || 0
        }))
        .sort((a, b) => {
          const porFecha = a.fecha.localeCompare(b.fecha);
          if (porFecha !== 0) {
            return porFecha;
          }
          // Misma fecha: cargo (reciba) primero, abono después
          const ordenTipo = (m) => (m.tipo === 'abono' ? 1 : 0);
          const porTipo = ordenTipo(a) - ordenTipo(b);
          if (porTipo !== 0) {
            return porTipo;
          }
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        });
    },
    async onCambiarProveedor() {
      this.cancelarEdicionMovimiento();
      await this.cargarMovimientos();
    },
    async seleccionarProveedor(proveedorId) {
      this.cancelarEdicionMovimiento();
      this.proveedorSeleccionadoId = proveedorId;
      await this.cargarMovimientos();
    },
    abrirModalProveedor() {
      this.nuevoProveedor = {
        nombre: '',
        contacto: ''
      };
      this.mostrarModalProveedor = true;
    },
    async guardarProveedor() {
      const nombre = this.nuevoProveedor.nombre.trim();
      if (!nombre) {
        alert('Ingresa el nombre del proveedor.');
        return;
      }

      const existe = this.proveedores.some(
        (item) => item.nombre.toLowerCase() === nombre.toLowerCase()
      );
      if (existe) {
        alert('Ese proveedor ya existe.');
        return;
      }

      try {
        this.guardando = true;
        const docRef = await addDoc(collection(db, 'tarasProveedores'), {
          nombre,
          contacto: this.nuevoProveedor.contacto || '',
          saldoTarasActual: 0,
          saldoTapasActual: 0,
          saldoActual: 0,
          createdAt: new Date()
        });
        this.mostrarModalProveedor = false;
        await this.cargarProveedores();
        this.proveedorSeleccionadoId = docRef.id;
        await this.cargarMovimientos();
      } catch (error) {
        console.error('Error al guardar proveedor:', error);
        alert(`No se pudo guardar el proveedor: ${error.message}`);
      } finally {
        this.guardando = false;
      }
    },
    editarMovimiento(movimiento) {
      this.movimientoEditandoId = movimiento.id;
      this.movimientoEditandoValores = {
        taras: Number(movimiento.taras) || 0,
        tapas: Number(movimiento.tapas) || 0
      };
      this.nuevoMovimiento = {
        fecha: movimiento.fecha || this.obtenerFechaActual(),
        tipo: movimiento.tipo === 'abono' ? 'abono' : 'cargo',
        taras: Math.abs(Number(movimiento.taras) || 0),
        tapas: Math.abs(Number(movimiento.tapas) || 0)
      };
    },
    cancelarEdicionMovimiento() {
      this.movimientoEditandoId = null;
      this.movimientoEditandoValores = null;
      this.nuevoMovimiento = {
        fecha: this.obtenerFechaActual(),
        tipo: 'cargo',
        taras: null,
        tapas: 0
      };
    },
    async guardarMovimiento() {
      if (!this.proveedorSeleccionadoId) {
        alert('Primero selecciona un proveedor.');
        return;
      }
      if (!this.nuevoMovimiento.fecha) {
        alert('Completa la fecha del movimiento.');
        return;
      }
      if ((Number(this.nuevoMovimiento.taras) || 0) <= 0 && (Number(this.nuevoMovimiento.tapas) || 0) <= 0) {
        alert('Debes capturar al menos taras o tapas.');
        return;
      }

      const tarasFirmadas = this.nuevoMovimiento.tipo === 'cargo'
        ? Number(this.nuevoMovimiento.taras)
        : Number(this.nuevoMovimiento.taras) * -1;
      const tapasFirmadas = this.nuevoMovimiento.tipo === 'cargo'
        ? Number(this.nuevoMovimiento.tapas)
        : Number(this.nuevoMovimiento.tapas) * -1;

      try {
        this.guardando = true;
        const proveedorRef = doc(db, 'tarasProveedores', this.proveedorSeleccionadoId);

        if (this.movimientoEditandoId && this.movimientoEditandoValores) {
          const movRef = doc(
            db,
            'tarasProveedores',
            this.proveedorSeleccionadoId,
            'movimientos',
            this.movimientoEditandoId
          );
          const deltaTaras = tarasFirmadas - this.movimientoEditandoValores.taras;
          const deltaTapas = tapasFirmadas - this.movimientoEditandoValores.tapas;

          await updateDoc(movRef, {
            fecha: this.nuevoMovimiento.fecha,
            tipo: this.nuevoMovimiento.tipo,
            taras: tarasFirmadas,
            tapas: tapasFirmadas,
            updatedAt: new Date()
          });

          await updateDoc(proveedorRef, {
            saldoTarasActual: this.saldoPendienteTaras + deltaTaras,
            saldoTapasActual: this.saldoPendienteTapas + deltaTapas,
            saldoActual: this.saldoPendienteTaras + deltaTaras,
            updatedAt: new Date()
          });

          this.cancelarEdicionMovimiento();
        } else {
          const movimientosRef = collection(db, 'tarasProveedores', this.proveedorSeleccionadoId, 'movimientos');
          await addDoc(movimientosRef, {
            fecha: this.nuevoMovimiento.fecha,
            tipo: this.nuevoMovimiento.tipo,
            taras: tarasFirmadas,
            tapas: tapasFirmadas,
            createdAt: new Date()
          });

          await updateDoc(proveedorRef, {
            saldoTarasActual: this.saldoPendienteTaras + tarasFirmadas,
            saldoTapasActual: this.saldoPendienteTapas + tapasFirmadas,
            saldoActual: this.saldoPendienteTaras + tarasFirmadas,
            updatedAt: new Date()
          });

          this.nuevoMovimiento = {
            fecha: this.obtenerFechaActual(),
            tipo: 'cargo',
            taras: null,
            tapas: 0
          };
        }

        await this.cargarProveedores();
      } catch (error) {
        console.error('Error al guardar movimiento:', error);
        alert(`No se pudo guardar el movimiento: ${error.message}`);
      } finally {
        this.guardando = false;
      }
    },
    async eliminarMovimiento(movimiento) {
      if (!confirm('¿Seguro que deseas eliminar este movimiento?')) {
        return;
      }

      try {
        this.guardando = true;
        await deleteDoc(doc(db, 'tarasProveedores', this.proveedorSeleccionadoId, 'movimientos', movimiento.id));

        const proveedorRef = doc(db, 'tarasProveedores', this.proveedorSeleccionadoId);
        await updateDoc(proveedorRef, {
          saldoTarasActual: this.saldoPendienteTaras - Number(movimiento.taras || 0),
          saldoTapasActual: this.saldoPendienteTapas - Number(movimiento.tapas || 0),
          saldoActual: this.saldoPendienteTaras - Number(movimiento.taras || 0),
          updatedAt: new Date()
        });

        await this.cargarProveedores();
      } catch (error) {
        console.error('Error al eliminar movimiento:', error);
        alert(`No se pudo eliminar el movimiento: ${error.message}`);
      } finally {
        this.guardando = false;
      }
    },
    async imprimirPdfMovimientos() {
      if (!this.proveedorSeleccionado) {
        alert('Selecciona un proveedor para imprimir.');
        return;
      }

      try {
        this.generandoPdf = true;
        const jsPDFModule = await import('jspdf');
        await import('jspdf-autotable');
        const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

        const filas = this.movimientos.map((movimiento) => ([
          this.formatearFechaPdf(movimiento.fecha),
          this.formatearCantidad(movimiento.taras),
          this.formatearCantidad(movimiento.tapas)
        ]));

        filas.push([
          'PENDIENTES',
          this.formatearCantidad(this.saldoPendienteTaras),
          this.formatearCantidad(this.saldoPendienteTapas)
        ]);

        const titulo = `Registro de Taras y Tapas - ${this.proveedorSeleccionado.nombre}`;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const tableWidth = 280;
        const leftMargin = (pageWidth - tableWidth) / 2;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.text(titulo, pageWidth / 2, 40, { align: 'center' });
        pdf.setFontSize(12);
        pdf.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageWidth / 2, 58, { align: 'center' });

        pdf.autoTable({
          startY: 76,
          head: [['Fecha', 'Taras', 'Tapas']],
          body: filas,
          theme: 'grid',
          tableWidth,
          margin: { left: leftMargin, right: leftMargin },
          styles: {
            halign: 'center',
            valign: 'middle',
            fontSize: 16,
            fontStyle: 'bold',
            cellPadding: 6
          },
          headStyles: {
            fillColor: [243, 244, 246],
            textColor: [17, 17, 17],
            fontSize: 17,
            fontStyle: 'bold',
            halign: 'center'
          },
          bodyStyles: {
            halign: 'center',
            fontSize: 16,
            fontStyle: 'bold'
          },
          columnStyles: {
            0: { cellWidth: 130, halign: 'center' },
            1: { cellWidth: 75, halign: 'center' },
            2: { cellWidth: 75, halign: 'center' }
          }
        });

        const nombreArchivo = `taras-${this.proveedorSeleccionado.nombre}`
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        pdf.save(`${nombreArchivo || 'taras'}.pdf`);
      } catch (error) {
        console.error('Error al generar PDF de taras:', error);
        alert(`No se pudo generar el PDF: ${error.message}`);
      } finally {
        this.generandoPdf = false;
      }
    },
    formatearFechaPdf(fecha) {
      if (!fecha) return '';
      const date = new Date(`${fecha}T00:00:00`);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },
    cerrarModalPorOverlay(event) {
      if (event.target === event.currentTarget) {
        this.mostrarModalProveedor = false;
      }
    }
  }
};
</script>

<style scoped>
.taras-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px;
}

.header-tools {
  margin-bottom: 10px;
}

h1 {
  margin: 0;
  color: #111827;
}

.subtitle {
  color: #4b5563;
  margin: 8px 0 20px;
}

.layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
}

.panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.btn-primary {
  background: #2563eb;
  border: none;
  color: #fff;
  border-radius: 8px;
  padding: 9px 12px;
  cursor: pointer;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.btn-secundario {
  background: #fff;
  border: 1px solid #d1d5db;
  color: #374151;
  border-radius: 8px;
  padding: 9px 12px;
  cursor: pointer;
}

.btn-secundario:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-secundario:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.selector-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.selector-group select,
.form-group input,
.form-group select {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
}

.proveedores-lista {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.proveedores-lista li {
  padding: 10px;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
}

.proveedores-lista li:last-child {
  border-bottom: none;
}

.proveedores-lista li:hover {
  background: #f8fafc;
}

.proveedores-lista li.activo {
  background: #eff6ff;
}

.proveedor-nombre {
  font-weight: 700;
}

.proveedor-saldo {
  font-size: 0.9rem;
  color: #1f2937;
}

.proveedor-saldo.negativo {
  color: #dc2626;
}

.saldo-card {
  background: #f3f4f6;
  padding: 8px 10px;
  border-radius: 8px;
  font-weight: 700;
}

.saldo-card.negativo {
  color: #dc2626;
}

.movimiento-form {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 10px;
  align-items: end;
  margin-bottom: 14px;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-pdf {
  background: #374151;
  border: none;
  color: #fff;
  border-radius: 8px;
  padding: 9px 12px;
  cursor: pointer;
}

.btn-pdf:hover {
  background: #1f2937;
}

.btn-pdf:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group-wide {
  grid-column: 1 / -1;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.modal-content {
  width: min(92vw, 440px);
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.modal-header {
  padding: 12px 14px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
}

.btn-close {
  border: none;
  background: transparent;
  font-size: 1.4rem;
  cursor: pointer;
}

.modal-body {
  padding: 14px;
  display: grid;
  gap: 10px;
}

@media (max-width: 980px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .movimiento-form {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 640px) {
  .taras-page {
    padding: 12px;
  }

  .panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .movimiento-form {
    grid-template-columns: 1fr;
  }
}
</style>
