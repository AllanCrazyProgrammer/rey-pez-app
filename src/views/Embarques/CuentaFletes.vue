<template>
  <CuentaFletesShell :chofer="choferSeleccionado">
    <template #toolbar>
      <CuentaFletesToolbar
        :cargando="cargando"
        :imprimiendo="imprimiendo"
        @volver="volverMenu"
        @refrescar="cargarFletes"
        @imprimir="generarPDF"
      />
    </template>

    <template #status>
      <div class="status-line">
        <span>[CHOFER] {{ choferSeleccionado }}</span>
        <span>[PENDIENTES] {{ fletesPendientes.length }}</span>
        <span>[ABONOS] {{ abonosFiltrados.length }}</span>
        <span>[PAGINA] {{ paginaActual }}/{{ totalPaginas }}</span>
        <span>[ULTIMO_SYNC] {{ ultimoGuardado || 'SIN_CAMBIOS' }}</span>
      </div>
    </template>

    <CuentaFletesEstado
      :visible="cargando"
      mensaje="Cargando cuenta de fletes desde Firestore..."
    />

    <CuentaFletesEstado
      :visible="!cargando && Boolean(errorCarga)"
      tipo="error"
      :mensaje="errorCarga || 'Error al cargar datos'"
    />

    <CuentaFletesEstado
      :visible="!cargando && !errorCarga && itemsOrdenados.length === 0"
      tipo="empty"
      mensaje="No hay movimientos para este chofer."
    />

    <template v-if="!cargando && !errorCarga">
      <div class="resumen-toggle-row">
        <button
          type="button"
          class="resumen-toggle-btn"
          :aria-expanded="mostrarResumen ? 'true' : 'false'"
          @click="mostrarResumen = !mostrarResumen"
        >
          {{ mostrarResumen ? 'OCULTAR_RESUMEN' : 'MOSTRAR_RESUMEN' }}
        </button>
      </div>

      <CuentaFletesResumen
        v-if="mostrarResumen"
        :resumen="resumenCuenta"
        :formatear-monto="formatearMonto"
      />

      <CuentaFletesAbonoForm
        v-model="nuevoAbono"
        :puede-agregar="puedeAgregarAbono"
        :guardando="guardandoAbono"
        :chofer="choferSeleccionado"
        @agregar-abono="agregarAbono"
      />

      <div v-if="itemsOrdenados.length > 0" class="paginacion-dias">
        <button
          type="button"
          class="paginacion-btn"
          :disabled="paginaActual <= 1"
          @click="irPagina(paginaActual - 1)"
        >
          &lt; 10_DIAS
        </button>
        <span>{{ etiquetaPaginacion }}</span>
        <button
          type="button"
          class="paginacion-btn"
          :disabled="paginaActual >= totalPaginas"
          @click="irPagina(paginaActual + 1)"
        >
          10_DIAS &gt;
        </button>
      </div>

      <CuentaFletesMovimientos
        v-if="itemsOrdenados.length > 0"
        :items="itemsPaginados"
        :chofer-seleccionado="choferSeleccionado"
        :choferes="choferes"
        :deuda-acumulada-por-id="deudaAcumuladaPorId"
        :procesando-pago-por-id="procesandoPagoPorId"
        :eliminando-abono-por-id="eliminandoAbonoPorId"
        :formatear-fecha="formatearFecha"
        :formatear-monto="formatearMonto"
        :calcular-monto-dia="calcularMontoDiaLocal"
        :obtener-total-taras="obtenerTotalTaras"
        @seleccionar-chofer="cambiarChofer"
        @toggle-pago="togglePago"
        @eliminar-abono="eliminarAbono"
      />
    </template>
  </CuentaFletesShell>
</template>

<script>
import { getFirestore, collection, getDocs, doc, writeBatch, addDoc, deleteDoc } from 'firebase/firestore';
import html2pdf from 'html2pdf.js';
import CuentaFletesShell from './components/CuentaFletes/CuentaFletesShell.vue';
import CuentaFletesToolbar from './components/CuentaFletes/CuentaFletesToolbar.vue';
import CuentaFletesResumen from './components/CuentaFletes/CuentaFletesResumen.vue';
import CuentaFletesAbonoForm from './components/CuentaFletes/CuentaFletesAbonoForm.vue';
import CuentaFletesMovimientos from './components/CuentaFletes/CuentaFletesMovimientos.vue';
import CuentaFletesEstado from './components/CuentaFletes/CuentaFletesEstado.vue';
import {
  COSTO_TARA_CRUDO,
  COSTO_TARA_LIMPIO,
  agruparFletesPorFechaYCarga,
  calcularDeudaAcumuladaPorId,
  calcularMontoDia,
  esCargaDeUnSoloChofer,
  filtrarFletesPorChofer,
  normalizarTexto,
  obtenerClaveChoferPago,
  obtenerTotalTaras,
  ordenarMovimientos,
  transformarEmbarqueAFlete
} from './components/CuentaFletes/cuentaFletesUtils';

export default {
  name: 'CuentaFletes',
  components: {
    CuentaFletesShell,
    CuentaFletesToolbar,
    CuentaFletesResumen,
    CuentaFletesAbonoForm,
    CuentaFletesMovimientos,
    CuentaFletesEstado
  },
  data() {
    return {
      fletes: [],
      abonos: [],
      choferes: ['Caminante', 'Porro'],
      choferSeleccionado: 'Caminante',
      costoTaraLimpio: COSTO_TARA_LIMPIO,
      costoTaraCrudo: COSTO_TARA_CRUDO,
      cargando: false,
      imprimiendo: false,
      guardandoAbono: false,
      errorCarga: '',
      ultimoGuardado: '',
      mostrarResumen: false,
      paginaActual: 1,
      diasPorPagina: 10,
      procesandoPagoPorId: {},
      eliminandoAbonoPorId: {},
      formatoMoneda: new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }),
      formatoFecha: new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      nuevoAbono: {
        monto: null,
        fecha: new Date().toISOString().split('T')[0],
        descripcion: ''
      }
    };
  },
  computed: {
    costosFlete() {
      return {
        limpio: this.costoTaraLimpio,
        crudo: this.costoTaraCrudo
      };
    },
    fletesFiltrados() {
      return filtrarFletesPorChofer(this.fletes, this.choferSeleccionado);
    },
    abonosFiltrados() {
      const choferActivo = normalizarTexto(this.choferSeleccionado);
      return this.abonos.filter(abono => normalizarTexto(abono.chofer) === choferActivo);
    },
    itemsOrdenados() {
      return ordenarMovimientos(this.fletesFiltrados, this.abonosFiltrados);
    },
    fechasPaginadas() {
      const fechas = [];
      const fechasVistas = new Set();

      this.itemsOrdenados.forEach(item => {
        const fechaKey = this.obtenerClaveFechaMovimiento(item.fecha);
        if (!fechaKey || fechasVistas.has(fechaKey)) return;
        fechasVistas.add(fechaKey);
        fechas.push(fechaKey);
      });

      return fechas;
    },
    totalPaginas() {
      return Math.max(1, Math.ceil(this.fechasPaginadas.length / this.diasPorPagina));
    },
    fechasPaginaActual() {
      const inicio = (this.paginaActual - 1) * this.diasPorPagina;
      return this.fechasPaginadas.slice(inicio, inicio + this.diasPorPagina);
    },
    itemsPaginados() {
      const fechasPermitidas = new Set(this.fechasPaginaActual);
      return this.itemsOrdenados.filter(item => fechasPermitidas.has(this.obtenerClaveFechaMovimiento(item.fecha)));
    },
    etiquetaPaginacion() {
      if (this.fechasPaginadas.length === 0) return 'SIN_DIAS';
      const inicio = ((this.paginaActual - 1) * this.diasPorPagina) + 1;
      const fin = Math.min(this.paginaActual * this.diasPorPagina, this.fechasPaginadas.length);
      return `DIAS ${inicio}-${fin} DE ${this.fechasPaginadas.length}`;
    },
    deudaAcumuladaPorId() {
      return calcularDeudaAcumuladaPorId(this.itemsOrdenados, this.costosFlete);
    },
    fletesPendientes() {
      return this.fletesFiltrados.filter(flete => !flete.pagado);
    },
    totalAbonos() {
      return this.abonosFiltrados.reduce((total, abono) => total + (Number(abono.monto) || 0), 0);
    },
    montoFletesPendientes() {
      return this.fletesPendientes.reduce((total, flete) => total + this.calcularMontoDiaLocal(flete), 0);
    },
    resumenCuenta() {
      const totalTarasLimpioJoselito = this.fletesFiltrados.reduce((total, flete) => total + (flete.tarasLimpioJoselito || 0), 0);
      const totalTarasCrudoJoselito = this.fletesFiltrados.reduce((total, flete) => total + (flete.tarasCrudoJoselito || 0), 0);
      const totalTarasLimpioVeronica = this.fletesFiltrados.reduce((total, flete) => total + (flete.tarasLimpioVeronica || 0), 0);
      const totalTarasCrudoVeronica = this.fletesFiltrados.reduce((total, flete) => total + (flete.tarasCrudoVeronica || 0), 0);
      const deudaTotal = this.fletesFiltrados.reduce((total, flete) => total + this.calcularMontoDiaLocal(flete), 0);
      const montoPagado = this.fletesFiltrados.reduce((total, flete) => {
        return total + (flete.pagado ? this.calcularMontoDiaLocal(flete) : 0);
      }, 0);

      return {
        totalTarasLimpioJoselito,
        totalTarasCrudoJoselito,
        totalTarasLimpioVeronica,
        totalTarasCrudoVeronica,
        deudaTotal,
        montoPagado,
        totalAbonos: this.totalAbonos,
        saldoPendiente: this.montoFletesPendientes - this.totalAbonos
      };
    },
    puedeAgregarAbono() {
      return Number(this.nuevoAbono.monto) > 0 && Boolean(this.nuevoAbono.fecha);
    }
  },
  watch: {
    totalPaginas(nuevoTotal) {
      if (this.paginaActual > nuevoTotal) {
        this.paginaActual = nuevoTotal;
      }
    }
  },
  methods: {
    obtenerAbonoVacio() {
      return {
        monto: null,
        fecha: new Date().toISOString().split('T')[0],
        descripcion: ''
      };
    },
    async cargarFletes() {
      this.cargando = true;
      this.errorCarga = '';

      try {
        const db = getFirestore();
        const [embarquesSnapshot, abonosSnapshot] = await Promise.all([
          getDocs(collection(db, 'embarques')),
          getDocs(collection(db, 'abonos'))
        ]);

        const fletesBase = embarquesSnapshot.docs
          .map(transformarEmbarqueAFlete)
          .filter(Boolean);

        this.fletes = agruparFletesPorFechaYCarga(fletesBase);
        this.abonos = abonosSnapshot.docs.map(abonoDoc => {
          const data = abonoDoc.data();
          const fecha = data.fecha && data.fecha.toDate ? data.fecha.toDate() : new Date(data.fecha);

          return {
            id: abonoDoc.id,
            ...data,
            fecha
          };
        });
        this.irPagina(1);
      } catch (error) {
        console.error('Error al cargar los datos:', error);
        this.errorCarga = 'No se pudo cargar la cuenta de fletes. Intenta refrescar la vista.';
      } finally {
        this.cargando = false;
      }
    },
    formatearFecha(fecha) {
      if (!fecha) return '--';

      let fechaObj;
      if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const [year, month, day] = fecha.split('-').map(Number);
        fechaObj = new Date(year, month - 1, day);
      } else {
        fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
      }

      if (Number.isNaN(fechaObj.getTime())) return '--';
      const fechaAjustada = new Date(fechaObj);
      fechaAjustada.setDate(fechaAjustada.getDate() + 1);
      return this.formatoFecha.format(fechaAjustada);
    },
    formatearMonto(monto) {
      return this.formatoMoneda.format(Number(monto) || 0);
    },
    obtenerClaveFechaMovimiento(fecha) {
      if (!fecha) return '';
      const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
      if (Number.isNaN(fechaObj.getTime())) return '';
      return fechaObj.toISOString().split('T')[0];
    },
    cambiarChofer(chofer) {
      this.choferSeleccionado = chofer;
      this.irPagina(1);
    },
    irPagina(pagina) {
      const paginaNormalizada = Math.min(Math.max(Number(pagina) || 1, 1), this.totalPaginas);
      this.paginaActual = paginaNormalizada;
    },
    obtenerTotalTaras(item) {
      return obtenerTotalTaras(item);
    },
    calcularMontoDiaLocal(flete) {
      return calcularMontoDia(flete, this.costosFlete);
    },
    marcarSync(mensaje) {
      this.ultimoGuardado = `${mensaje} ${new Date().toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    },
    async togglePago(flete) {
      if (this.procesandoPagoPorId[flete.id]) return;

      this.$set(this.procesandoPagoPorId, flete.id, true);
      try {
        const db = getFirestore();
        const ids = Array.isArray(flete.ids) && flete.ids.length > 0 ? flete.ids : [flete.id];
        const nuevoEstado = !flete.pagado;
        const pagoKey = obtenerClaveChoferPago(this.choferSeleccionado);
        const datosPago = {
          [`fletePagos.${pagoKey}`]: nuevoEstado,
          fletePagoActualizadoEn: new Date(),
          fletePagoActualizadoPor: this.choferSeleccionado
        };

        if (esCargaDeUnSoloChofer(flete.cargaCon, this.choferSeleccionado)) {
          datosPago.fletePagado = nuevoEstado;
        }

        const batch = writeBatch(db);
        ids.forEach(id => {
          batch.update(doc(db, 'embarques', id), datosPago);
        });

        await batch.commit();

        this.fletes = this.fletes.map(fleteLocal => {
          if (fleteLocal.id !== flete.id) return fleteLocal;

          return {
            ...fleteLocal,
            pagado: nuevoEstado,
            pagadoLegacy: esCargaDeUnSoloChofer(fleteLocal.cargaCon, this.choferSeleccionado)
              ? nuevoEstado
              : fleteLocal.pagadoLegacy,
            pagosPorChofer: {
              ...(fleteLocal.pagosPorChofer || {}),
              [pagoKey]: nuevoEstado
            }
          };
        });
        this.marcarSync(nuevoEstado ? 'PAGO_OK' : 'PENDIENTE_OK');
      } catch (error) {
        console.error('Error al actualizar el estado de pago:', error);
        alert('Error al actualizar el estado de pago. Por favor, intente de nuevo.');
      } finally {
        this.$delete(this.procesandoPagoPorId, flete.id);
      }
    },
    async agregarAbono() {
      if (!this.puedeAgregarAbono || this.guardandoAbono) {
        alert('Por favor complete monto y fecha del abono.');
        return;
      }

      this.guardandoAbono = true;
      try {
        const db = getFirestore();
        const nuevoAbono = {
          monto: Number(this.nuevoAbono.monto),
          fecha: new Date(this.nuevoAbono.fecha),
          chofer: this.choferSeleccionado,
          descripcion: (this.nuevoAbono.descripcion || '').trim() || 'Abono realizado',
          createdAt: new Date()
        };

        const docRef = await addDoc(collection(db, 'abonos'), nuevoAbono);
        this.abonos.push({
          id: docRef.id,
          ...nuevoAbono
        });
        this.nuevoAbono = this.obtenerAbonoVacio();
        this.marcarSync('ABONO_OK');
      } catch (error) {
        console.error('Error al agregar el abono:', error);
        alert('Error al registrar el abono.');
      } finally {
        this.guardandoAbono = false;
      }
    },
    async eliminarAbono(abono) {
      if (!confirm('¿Está seguro de eliminar este abono?')) return;
      if (this.eliminandoAbonoPorId[abono.id]) return;

      this.$set(this.eliminandoAbonoPorId, abono.id, true);
      try {
        const db = getFirestore();
        await deleteDoc(doc(db, 'abonos', abono.id));
        this.abonos = this.abonos.filter(item => item.id !== abono.id);
        this.marcarSync('ABONO_DEL');
      } catch (error) {
        console.error('Error al eliminar el abono:', error);
        alert('Error al eliminar el abono.');
      } finally {
        this.$delete(this.eliminandoAbonoPorId, abono.id);
      }
    },
    generarFilasFletesPDF() {
      const filas = this.fletesPendientes.map(flete => `
        <tr>
          <td>${this.formatearFecha(flete.fecha)}</td>
          <td>${flete.tarasLimpioJoselito}</td>
          <td>${flete.tarasCrudoJoselito}</td>
          <td>${flete.tarasLimpioVeronica || 0}</td>
          <td>${flete.tarasCrudoVeronica || 0}</td>
          <td>${this.obtenerTotalTaras(flete)}</td>
          <td>${this.formatearMonto(this.calcularMontoDiaLocal(flete))}</td>
        </tr>
      `);

      filas.push(`
        <tr class="fila-total">
          <td><strong>TOTAL</strong></td>
          <td><strong>${this.fletesPendientes.reduce((sum, f) => sum + (f.tarasLimpioJoselito || 0), 0)}</strong></td>
          <td><strong>${this.fletesPendientes.reduce((sum, f) => sum + (f.tarasCrudoJoselito || 0), 0)}</strong></td>
          <td><strong>${this.fletesPendientes.reduce((sum, f) => sum + (f.tarasLimpioVeronica || 0), 0)}</strong></td>
          <td><strong>${this.fletesPendientes.reduce((sum, f) => sum + (f.tarasCrudoVeronica || 0), 0)}</strong></td>
          <td><strong>${this.fletesPendientes.reduce((sum, f) => sum + this.obtenerTotalTaras(f), 0)}</strong></td>
          <td><strong>${this.formatearMonto(this.montoFletesPendientes)}</strong></td>
        </tr>
      `);

      return filas.join('');
    },
    generarTablaAbonosPDF() {
      if (this.abonosFiltrados.length === 0) return '';

      return `
        <h3>Abonos Realizados</h3>
        <table class="tabla-pdf">
          <thead>
            <tr>
              <th>Fecha</th>
              <th colspan="5">Descripción</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            ${this.abonosFiltrados.map(abono => `
              <tr class="fila-abono">
                <td>${this.formatearFecha(abono.fecha)}</td>
                <td colspan="5">${abono.descripcion || 'Abono realizado'}</td>
                <td>${this.formatearMonto(abono.monto)}</td>
              </tr>
            `).join('')}
            <tr class="fila-total">
              <td colspan="6"><strong>TOTAL ABONOS</strong></td>
              <td><strong>${this.formatearMonto(this.totalAbonos)}</strong></td>
            </tr>
          </tbody>
        </table>
      `;
    },
    async generarPDF() {
      if (this.imprimiendo) return;

      this.imprimiendo = true;
      const contenido = document.createElement('div');
      contenido.innerHTML = `
        <div class="pdf-container">
          <h2>Cuenta de Fletes - ${this.choferSeleccionado}</h2>
          <p class="fecha-impresion">Fecha de impresión: ${new Date().toLocaleDateString('es-ES')}</p>
          <h3>Fletes Pendientes</h3>
          <table class="tabla-pdf">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Joselito Limpio</th>
                <th>Joselito Crudo</th>
                <th>Lorena Limpio</th>
                <th>Lorena Crudo</th>
                <th>Total Taras</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>${this.generarFilasFletesPDF()}</tbody>
          </table>
          ${this.generarTablaAbonosPDF()}
          <div class="resumen-pdf">
            <h3>Resumen de Cuenta</h3>
            <p><strong>Deuda Total:</strong> ${this.formatearMonto(this.resumenCuenta.deudaTotal)}</p>
            <p><strong>Monto Pagado:</strong> ${this.formatearMonto(this.resumenCuenta.montoPagado)}</p>
            <p><strong>Total Abonos:</strong> ${this.formatearMonto(this.resumenCuenta.totalAbonos)}</p>
            <p class="total-final"><strong>Saldo Pendiente:</strong> ${this.formatearMonto(this.resumenCuenta.saldoPendiente)}</p>
          </div>
        </div>
      `;

      const style = document.createElement('style');
      style.textContent = `
        .pdf-container { padding: 20px; font-family: Arial, sans-serif; color: #222; }
        .fecha-impresion { color: #666; margin-bottom: 20px; }
        h2, h3 { margin: 18px 0 10px; }
        .tabla-pdf { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .tabla-pdf th, .tabla-pdf td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .tabla-pdf th { background-color: #f8f9fa; }
        .fila-total { background-color: #f8f9fa; border-top: 2px solid #ddd; }
        .fila-abono { background-color: #e8f5e9; }
        .resumen-pdf { margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
        .total-final { margin-top: 10px; padding-top: 10px; border-top: 2px solid #ddd; font-size: 1.1em; }
      `;
      contenido.appendChild(style);

      try {
        await html2pdf().from(contenido).set({
          margin: 10,
          filename: `cuenta_fletes_${this.choferSeleccionado.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).save();
      } catch (error) {
        console.error('Error al generar el PDF:', error);
        alert('Error al generar el PDF. Por favor, intente de nuevo.');
      } finally {
        this.imprimiendo = false;
      }
    },
    volverMenu() {
      this.$router.push({ name: 'EmbarquesMenu' });
    }
  },
  mounted() {
    this.cargarFletes();
  }
}
</script>

<style scoped>
.status-line {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--terminal-border);
  background: rgba(0, 0, 0, 0.34);
  color: #9ef8b5;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.9rem;
}

.status-line span {
  border: 1px solid rgba(0, 255, 65, 0.22);
  padding: 6px 9px;
  background: rgba(0, 0, 0, 0.28);
}

.resumen-toggle-row {
  padding: 16px clamp(16px, 2.5vw, 28px) 0;
}

.resumen-toggle-btn {
  width: 100%;
  min-height: 46px;
  border: 1px solid var(--amber);
  background: rgba(0, 0, 0, 0.32);
  color: var(--amber);
  font-family: 'Share Tech Mono', monospace;
  letter-spacing: 0.8px;
  cursor: pointer;
}

.resumen-toggle-btn:hover {
  background: var(--amber);
  color: #070707;
  box-shadow: 0 0 14px rgba(255, 176, 0, 0.45);
}

.paginacion-dias {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px clamp(16px, 2.5vw, 28px) 0;
  color: #9ef8b5;
  font-family: 'Share Tech Mono', monospace;
}

.paginacion-dias span {
  flex: 1;
  text-align: center;
  border: 1px solid rgba(0, 255, 65, 0.22);
  padding: 10px;
  background: rgba(0, 0, 0, 0.28);
}

.paginacion-btn {
  min-height: 42px;
  border: 1px solid var(--matrix-green);
  background: rgba(0, 0, 0, 0.32);
  color: var(--matrix-green);
  padding: 8px 14px;
  font-family: 'Share Tech Mono', monospace;
  cursor: pointer;
}

.paginacion-btn:hover:not(:disabled) {
  background: var(--matrix-green);
  color: var(--terminal-bg);
  box-shadow: 0 0 14px var(--matrix-green-glow);
}

.paginacion-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 620px) {
  .paginacion-dias {
    flex-direction: column;
  }

  .paginacion-dias span,
  .paginacion-btn {
    width: 100%;
  }
}
</style>
