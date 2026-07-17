<template>
  <div class="allan-page" :class="{ 'modal-open': modalActivo }">
    <div class="bg-grid" aria-hidden="true"></div>
    <div class="scanlines" aria-hidden="true"></div>

    <main class="page-shell">
      <header class="page-header">
        <button class="back-button" type="button" @click="volverAMexico">
          <i class="fas fa-arrow-left"></i>
          <span>Volver</span>
        </button>

        <div class="title-block">
          <span class="eyebrow">CUENTAS DE ALLAN</span>
          <h1>Compras por lote</h1>
          <p>Cada compra lleva sus propias ventas, existencia, utilidad y deuda.</p>
        </div>

        <button class="new-purchase-button" type="button" @click="abrirNuevaCompra">
          <i class="fas fa-plus"></i>
          Nueva compra
        </button>
      </header>

      <CuentasAllanResumen :resumen="resumenGeneral" />

      <section class="workflow-hint" aria-label="Flujo de trabajo">
        <div><span>1</span><p><strong>Registra la compra</strong><small>Proveedor, producto, kilos y costo</small></p></div>
        <i class="fas fa-chevron-right"></i>
        <div><span>2</span><p><strong>Vende desde su lote</strong><small>La existencia se descuenta ahí</small></p></div>
        <i class="fas fa-chevron-right"></i>
        <div><span>3</span><p><strong>Registra tus abonos</strong><small>La deuda se actualiza al momento</small></p></div>
      </section>

      <section class="lots-section">
        <div class="section-toolbar">
          <div>
            <h2>Mis compras</h2>
            <p>{{ lotesFiltrados.length }} de {{ lotes.length }} lotes</p>
          </div>

          <div class="toolbar-controls">
            <label class="search-control">
              <i class="fas fa-search"></i>
              <input v-model.trim="busqueda" type="search" placeholder="Buscar proveedor o producto" />
            </label>
            <div class="filter-tabs" role="group" aria-label="Filtrar lotes">
              <button type="button" :class="{ active: filtro === 'activos' }" @click="filtro = 'activos'">Con existencia</button>
              <button type="button" :class="{ active: filtro === 'todos' }" @click="filtro = 'todos'">Todos</button>
              <button type="button" :class="{ active: filtro === 'deuda' }" @click="filtro = 'deuda'">Con deuda</button>
            </div>
          </div>
        </div>

        <div v-if="cargando" class="page-state">
          <i class="fas fa-circle-notch fa-spin"></i>
          <strong>Cargando compras...</strong>
        </div>

        <div v-else-if="!lotes.length" class="page-state empty">
          <div class="state-icon"><i class="fas fa-box-open"></i></div>
          <strong>Empieza con tu primera compra</strong>
          <p>Registra a quién le compraste, cuántos kilos y a qué precio.</p>
          <button type="button" @click="abrirNuevaCompra"><i class="fas fa-plus"></i> Registrar primera compra</button>
        </div>

        <div v-else-if="!lotesFiltrados.length" class="page-state empty compact">
          <strong>No hay compras que coincidan</strong>
          <p>Prueba otro filtro o cambia la búsqueda.</p>
        </div>

        <div v-else class="lots-grid">
          <LoteCompraCard
            v-for="lote in lotesFiltrados"
            :key="lote.id"
            :lote="lote"
            @registrar-venta="abrirVenta"
            @registrar-abono="abrirAbono"
            @editar-venta="abrirEditarVenta"
            @editar-lote="abrirEditarCompra"
            @eliminar-lote="eliminarLote"
            @eliminar-movimiento="eliminarMovimiento"
          />
        </div>
      </section>

      <aside v-if="ventasSinLote.length" class="legacy-warning">
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          <strong>{{ ventasSinLote.length }} venta(s) anterior(es) no pudieron ligarse a una compra.</strong>
          <p>Se conservan en el total de ventas, pero necesitan una compra compatible para calcular su utilidad.</p>
        </div>
      </aside>
    </main>

    <transition name="modal-fade">
      <div v-if="modalActivo" class="modal-backdrop" @mousedown.self="cerrarModal">
        <section class="modal-card" role="dialog" aria-modal="true" :aria-labelledby="`modal-title-${modalActivo}`">
          <header class="modal-header">
            <div>
              <span class="modal-step">{{ modalEyebrow }}</span>
              <h2 :id="`modal-title-${modalActivo}`">{{ modalTitulo }}</h2>
              <p>{{ modalDescripcion }}</p>
            </div>
            <button class="close-button" type="button" aria-label="Cerrar" @click="cerrarModal">
              <i class="fas fa-times"></i>
            </button>
          </header>

          <form v-if="modalActivo === 'compra'" class="modal-form" @submit.prevent="guardarCompra">
            <div class="form-grid">
              <label class="field full-field">
                <span>Proveedor <b>*</b></span>
                <input ref="primerCampo" v-model.trim="compraForm.proveedor" type="text" required placeholder="Ej. Joselito, Verónica u Otilio" />
              </label>
              <label class="field">
                <span>Fecha de compra <b>*</b></span>
                <input v-model="compraForm.fecha" type="date" required />
              </label>
              <label class="field">
                <span>Producto <b>*</b></span>
                <input v-model.trim="compraForm.producto" type="text" required placeholder="Ej. Camarón mediano" />
              </label>
              <label class="field">
                <span>Kilos comprados <b>*</b></span>
                <div class="input-suffix"><input v-model="compraForm.kilos" type="number" min="0.01" step="0.01" required placeholder="0.00" /><span>kg</span></div>
              </label>
              <label class="field">
                <span>Precio de compra por kg <b>*</b></span>
                <div class="input-prefix"><span>$</span><input v-model="compraForm.precio" type="number" min="0" step="0.01" required placeholder="0.00" /></div>
              </label>
              <label class="field">
                <span>Pago al momento</span>
                <div class="input-prefix"><span>$</span><input v-model="compraForm.pagadoInicial" type="number" min="0" step="0.01" placeholder="0.00" /></div>
                <small>Déjalo en cero si quedó todo pendiente.</small>
              </label>
              <label class="field full-field">
                <span>Notas</span>
                <textarea v-model.trim="compraForm.notas" rows="2" placeholder="Tamaño, presentación o algún detalle"></textarea>
              </label>
            </div>

            <div class="calculation-preview purchase-preview">
              <div><span>Total de la compra</span><strong>{{ formatearMoneda(previewCompra.total) }}</strong></div>
              <i class="fas fa-minus"></i>
              <div><span>Pagado registrado</span><strong>{{ formatearMoneda(previewCompra.pagado) }}</strong></div>
              <i class="fas fa-equals"></i>
              <div class="highlight amber"><span>Quedará pendiente</span><strong>{{ formatearMoneda(previewCompra.deuda) }}</strong></div>
            </div>

            <footer class="modal-actions">
              <button class="cancel-button" type="button" @click="cerrarModal">Cancelar</button>
              <button class="submit-button" type="submit" :disabled="guardando">
                <i :class="guardando ? 'fas fa-circle-notch fa-spin' : 'fas fa-check'"></i>
                {{ guardando ? 'Guardando...' : (compraEditandoId ? 'Guardar cambios' : 'Guardar compra') }}
              </button>
            </footer>
          </form>

          <form v-else-if="modalActivo === 'venta'" class="modal-form" @submit.prevent="guardarVenta">
            <div v-if="loteSeleccionado" class="selected-lot">
              <div><span>Venta tomada de</span><strong>{{ loteSeleccionado.proveedor }} · {{ loteSeleccionado.producto }}</strong></div>
              <div><span>Disponible</span><strong>{{ formatearNumero(maxKilosCrudoVenta) }} kg</strong></div>
              <div><span>Costo base</span><strong>{{ formatearMoneda(loteSeleccionado.precio) }}/kg</strong></div>
            </div>

            <div class="form-grid">
              <label class="field">
                <span>Fecha de venta <b>*</b></span>
                <input v-model="ventaForm.fecha" type="date" required />
              </label>
              <label class="field">
                <span>Cliente <b>*</b></span>
                <input ref="primerCampo" v-model.trim="ventaForm.cliente" type="text" required placeholder="Nombre del cliente" />
              </label>
              <label class="field">
                <span>Kilos en crudo <b>*</b></span>
                <div class="input-suffix"><input v-model="ventaForm.kilosCrudo" type="number" min="0.01" :max="maxKilosCrudoVenta" step="0.01" required placeholder="0.00" @input="sincronizarKilosVendidos($event.target.value)" /><span>kg</span></div>
                <small>Estos kilos se descontarán de la existencia.</small>
              </label>
              <label class="field">
                <span>Kilos vendidos <b>*</b></span>
                <div class="input-suffix"><input v-model="ventaForm.kilos" type="number" min="0.01" step="0.01" required placeholder="0.00" @input="marcarKilosVendidosEditados" /><span>kg</span></div>
                <small>Se igualan al crudo automáticamente, pero puedes cambiarlos.</small>
              </label>
              <label class="field">
                <span>Precio de venta por kg <b>*</b></span>
                <div class="input-prefix"><span>$</span><input v-model="ventaForm.totalVenta" type="number" min="0" step="0.01" required placeholder="0.00" /></div>
              </label>
              <label class="field full-field">
                <span>Notas</span>
                <textarea v-model.trim="ventaForm.notas" rows="2" placeholder="Presentación o detalle de la venta"></textarea>
              </label>
            </div>

            <div class="calculation-preview sale-preview">
              <div><span>Ingreso</span><strong>{{ formatearMoneda(previewVenta.ingreso) }}</strong></div>
              <i class="fas fa-minus"></i>
              <div><span>Costo vendido</span><strong>{{ formatearMoneda(previewVenta.costo) }}</strong></div>
              <i class="fas fa-equals"></i>
              <div class="highlight" :class="previewVenta.utilidad < 0 ? 'red' : 'green'"><span>Utilidad de esta venta</span><strong>{{ formatearMoneda(previewVenta.utilidad) }}</strong></div>
            </div>

            <footer class="modal-actions">
              <button class="cancel-button" type="button" @click="cerrarModal">Cancelar</button>
              <button class="submit-button cyan" type="submit" :disabled="guardando">
                <i :class="guardando ? 'fas fa-circle-notch fa-spin' : 'fas fa-check'"></i>
                {{ guardando ? 'Guardando...' : (ventaEditandoId ? 'Guardar cambios' : 'Guardar venta') }}
              </button>
            </footer>
          </form>

          <form v-else-if="modalActivo === 'abono'" class="modal-form" @submit.prevent="guardarAbono">
            <div v-if="loteSeleccionado" class="selected-lot payment-selection">
              <div><span>Abono para</span><strong>{{ loteSeleccionado.proveedor }} · Lote #{{ loteSeleccionado.folio }}</strong></div>
              <div><span>Deuda actual</span><strong>{{ formatearMoneda(loteSeleccionado.deuda) }}</strong></div>
            </div>

            <div class="form-grid">
              <label class="field">
                <span>Fecha del abono <b>*</b></span>
                <input v-model="abonoForm.fecha" type="date" required />
              </label>
              <label class="field">
                <span>Monto abonado <b>*</b></span>
                <div class="input-prefix"><span>$</span><input ref="primerCampo" v-model="abonoForm.monto" type="number" min="0.01" :max="loteSeleccionado ? loteSeleccionado.deuda : null" step="0.01" required placeholder="0.00" /></div>
              </label>
              <label class="field">
                <span>Forma de pago</span>
                <select v-model="abonoForm.metodo">
                  <option>Efectivo</option>
                  <option>Transferencia</option>
                  <option>Depósito</option>
                  <option>Otro</option>
                </select>
              </label>
              <label class="field">
                <span>Notas</span>
                <input v-model.trim="abonoForm.notas" type="text" placeholder="Referencia o detalle" />
              </label>
            </div>

            <div class="calculation-preview payment-preview">
              <div><span>Deuda actual</span><strong>{{ formatearMoneda(loteSeleccionado ? loteSeleccionado.deuda : 0) }}</strong></div>
              <i class="fas fa-minus"></i>
              <div><span>Este abono</span><strong>{{ formatearMoneda(toNumber(abonoForm.monto)) }}</strong></div>
              <i class="fas fa-equals"></i>
              <div class="highlight amber"><span>Nuevo saldo</span><strong>{{ formatearMoneda(previewSaldoAbono) }}</strong></div>
            </div>

            <footer class="modal-actions">
              <button class="cancel-button" type="button" @click="cerrarModal">Cancelar</button>
              <button class="submit-button amber" type="submit" :disabled="guardando">
                <i :class="guardando ? 'fas fa-circle-notch fa-spin' : 'fas fa-check'"></i>
                {{ guardando ? 'Guardando...' : 'Guardar abono' }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </transition>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import CuentasAllanResumen from './components/allan/CuentasAllanResumen.vue';
import LoteCompraCard from './components/allan/LoteCompraCard.vue';

const ENTRADAS_COLLECTION = 'cuentasAllanCamaronEntradas';
const VENTAS_COLLECTION = 'cuentasAllanCamaronVentas';
const ABONOS_COLLECTION = 'cuentasAllanCamaronAbonos';
const EPSILON = 0.001;

const getToday = () => {
  const now = new Date();
  const local = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
  return local.toISOString().split('T')[0];
};

const emptyCompra = () => ({
  proveedor: '',
  fecha: getToday(),
  producto: '',
  kilos: '',
  precio: '',
  pagadoInicial: '',
  notas: ''
});

const emptyVenta = () => ({ fecha: getToday(), cliente: '', kilosCrudo: '', kilos: '', totalVenta: '', notas: '' });
const emptyAbono = () => ({ fecha: getToday(), monto: '', metodo: 'Efectivo', notas: '' });

export default {
  name: 'CuentasAllanCamaron',
  components: { CuentasAllanResumen, LoteCompraCard },
  data() {
    return {
      cargando: false,
      guardando: false,
      entradas: [],
      ventas: [],
      abonos: [],
      filtro: 'activos',
      busqueda: '',
      modalActivo: '',
      loteSeleccionado: null,
      compraEditandoId: '',
      ventaEditandoId: '',
      kilosCrudoVentaOriginal: 0,
      kilosVendidosEditados: false,
      compraForm: emptyCompra(),
      ventaForm: emptyVenta(),
      abonoForm: emptyAbono()
    };
  },
  computed: {
    analisisLotes() {
      const lotes = this.entradas
        .map((entrada) => ({ ...entrada, ventas: [], abonos: [], kilosAsignados: 0 }))
        .sort(this.ordenarPorFechaAsc);
      const lotePorId = new Map(lotes.map((lote) => [lote.id, lote]));

      this.abonos.forEach((abono) => {
        const lote = lotePorId.get(abono.entradaId);
        if (lote) lote.abonos.push(abono);
      });

      const ventasPendientes = [];
      this.ventas.forEach((venta) => {
        const lote = venta.entradaId ? lotePorId.get(venta.entradaId) : null;
        if (lote) {
          lote.ventas.push(venta);
          lote.kilosAsignados += venta.kilosCrudo;
        } else {
          ventasPendientes.push(venta);
        }
      });

      const sinLote = [];
      ventasPendientes.sort(this.ordenarPorFechaAsc).forEach((venta) => {
        let kilosPendientes = venta.kilosCrudo;
        const candidatos = lotes.filter((lote) => (
          this.claveProducto(lote.producto) === this.claveProducto(venta.producto)
          && lote.kilos - lote.kilosAsignados > EPSILON
        ));

        candidatos.forEach((lote, index) => {
          if (kilosPendientes <= EPSILON) return;
          const disponibles = Math.max(0, lote.kilos - lote.kilosAsignados);
          const kilosTomados = Math.min(disponibles, kilosPendientes);
          lote.ventas.push({
            ...venta,
            kilosCrudo: kilosTomados,
            kilos: venta.kilosCrudo > 0
              ? venta.kilos * (kilosTomados / venta.kilosCrudo)
              : kilosTomados,
            segmentoId: `${venta.id}-${index}`,
            asignacionHistorica: true
          });
          lote.kilosAsignados += kilosTomados;
          kilosPendientes -= kilosTomados;
        });

        if (kilosPendientes > EPSILON) sinLote.push({ ...venta, kilosCrudo: kilosPendientes });
      });

      const lotesCalculados = lotes
        .map((lote) => {
          const kilosCrudoUtilizados = lote.ventas.reduce((total, venta) => total + venta.kilosCrudo, 0);
          const kilosVendidos = lote.ventas.reduce((total, venta) => total + venta.kilos, 0);
          const ingresos = lote.ventas.reduce((total, venta) => total + (venta.kilos * venta.totalVenta), 0);
          const costoVendido = kilosCrudoUtilizados * lote.precio;
          const totalCompra = lote.kilos * lote.precio;
          const totalAbonos = lote.pagadoInicial + lote.abonos.reduce((total, abono) => total + abono.monto, 0);
          const kilosInventario = Math.max(0, lote.kilos - kilosCrudoUtilizados);

          return {
            ...lote,
            folio: lote.id.slice(-6).toUpperCase(),
            kilosCrudoUtilizados,
            kilosVendidos,
            kilosInventario,
            porcentajeExistencia: lote.kilos > 0 ? Math.min(100, (kilosInventario / lote.kilos) * 100) : 0,
            ingresos,
            costoVendido,
            utilidad: ingresos - costoVendido,
            totalCompra,
            totalAbonos,
            deuda: Math.max(0, totalCompra - totalAbonos),
            agotado: kilosInventario <= EPSILON
          };
        })
        .sort(this.ordenarPorFechaDesc);

      return { lotes: lotesCalculados, ventasSinLote: sinLote };
    },
    lotes() {
      return this.analisisLotes.lotes;
    },
    ventasSinLote() {
      return this.analisisLotes.ventasSinLote;
    },
    lotesFiltrados() {
      const term = this.busqueda.toLocaleLowerCase('es');
      return this.lotes.filter((lote) => {
        const coincideFiltro = this.filtro === 'todos'
          || (this.filtro === 'activos' && !lote.agotado)
          || (this.filtro === 'deuda' && lote.deuda > EPSILON);
        const contenido = `${lote.proveedor} ${lote.producto} ${lote.notas}`.toLocaleLowerCase('es');
        return coincideFiltro && (!term || contenido.includes(term));
      });
    },
    resumenGeneral() {
      const totalVentas = this.ventas.reduce((total, venta) => total + (venta.kilos * venta.totalVenta), 0);
      const costoVentas = this.lotes.reduce((total, lote) => total + lote.costoVendido, 0);
      return {
        kilosInventario: this.lotes.reduce((total, lote) => total + lote.kilosInventario, 0),
        lotesActivos: this.lotes.filter((lote) => !lote.agotado).length,
        totalVentas,
        kilosVendidos: this.ventas.reduce((total, venta) => total + venta.kilos, 0),
        utilidad: totalVentas - costoVentas,
        deuda: this.lotes.reduce((total, lote) => total + lote.deuda, 0),
        totalCompras: this.lotes.reduce((total, lote) => total + lote.totalCompra, 0)
      };
    },
    previewCompra() {
      const total = this.toNumber(this.compraForm.kilos) * this.toNumber(this.compraForm.precio);
      const abonosAnteriores = this.compraEditandoId && this.loteSeleccionado
        ? this.loteSeleccionado.abonos.reduce((suma, abono) => suma + abono.monto, 0)
        : 0;
      const pagado = Math.min(total, this.toNumber(this.compraForm.pagadoInicial) + abonosAnteriores);
      return { total, pagado, deuda: Math.max(0, total - pagado) };
    },
    previewVenta() {
      const kilosVendidos = this.toNumber(this.ventaForm.kilos);
      const kilosCrudo = this.toNumber(this.ventaForm.kilosCrudo);
      const ingreso = kilosVendidos * this.toNumber(this.ventaForm.totalVenta);
      const costo = kilosCrudo * (this.loteSeleccionado ? this.loteSeleccionado.precio : 0);
      return { ingreso, costo, utilidad: ingreso - costo };
    },
    previewSaldoAbono() {
      const deuda = this.loteSeleccionado ? this.loteSeleccionado.deuda : 0;
      return Math.max(0, deuda - this.toNumber(this.abonoForm.monto));
    },
    maxKilosCrudoVenta() {
      if (!this.loteSeleccionado) return 0;
      return this.loteSeleccionado.kilosInventario + this.kilosCrudoVentaOriginal;
    },
    modalEyebrow() {
      return { compra: 'PASO 1 · ENTRADA', venta: 'PASO 2 · SALIDA', abono: 'PASO 3 · PAGO' }[this.modalActivo] || '';
    },
    modalTitulo() {
      if (this.modalActivo === 'compra' && this.compraEditandoId) return 'Editar compra';
      if (this.modalActivo === 'venta' && this.ventaEditandoId) return 'Editar venta';
      return { compra: 'Nueva compra', venta: 'Registrar venta', abono: 'Registrar abono' }[this.modalActivo] || '';
    },
    modalDescripcion() {
      return {
        compra: this.compraEditandoId
          ? 'Corrige los datos generales de este lote.'
          : 'Esta compra se convertirá en un lote independiente.',
        venta: this.ventaEditandoId
          ? 'Corrige los datos y el inventario se recalculará automáticamente.'
          : 'La venta se descontará únicamente de la compra seleccionada.',
        abono: 'El pago reducirá la deuda de esta compra.'
      }[this.modalActivo] || '';
    }
  },
  mounted() {
    this.cargarMovimientos();
    window.addEventListener('keydown', this.manejarEscape);
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.manejarEscape);
    document.body.style.overflow = '';
  },
  methods: {
    async cargarMovimientos() {
      this.cargando = true;
      try {
        const [entradasSnapshot, ventasSnapshot, abonosSnapshot] = await Promise.all([
          getDocs(collection(db, ENTRADAS_COLLECTION)),
          getDocs(collection(db, VENTAS_COLLECTION)),
          getDocs(collection(db, ABONOS_COLLECTION))
        ]);
        this.entradas = entradasSnapshot.docs.map(this.normalizarEntrada).sort(this.ordenarPorFechaDesc);
        this.ventas = ventasSnapshot.docs.map(this.normalizarVenta).sort(this.ordenarPorFechaDesc);
        this.abonos = abonosSnapshot.docs.map(this.normalizarAbono).sort(this.ordenarPorFechaDesc);
      } catch (error) {
        console.error('Error al cargar las cuentas de Allan:', error);
        alert('No se pudieron cargar las cuentas de Allan. Intenta nuevamente.');
      } finally {
        this.cargando = false;
      }
    },
    normalizarEntrada(registro) {
      const data = registro.data();
      return {
        id: registro.id,
        fecha: data.fecha || '',
        proveedor: (data.proveedor || data.vendedor || 'Proveedor sin especificar').trim(),
        producto: this.normalizarProducto(data.producto),
        kilos: this.toNumber(data.kilos),
        precio: this.toNumber(data.precio),
        pagadoInicial: this.toNumber(data.pagadoInicial),
        notas: data.notas || ''
      };
    },
    normalizarVenta(registro) {
      const data = registro.data();
      return {
        id: registro.id,
        entradaId: data.entradaId || '',
        fecha: data.fecha || '',
        producto: this.normalizarProducto(data.producto),
        cliente: data.cliente || 'Cliente sin nombre',
        kilosCrudo: this.toNumber(data.kilosCrudo !== undefined ? data.kilosCrudo : data.kilos),
        kilos: this.toNumber(data.kilos),
        totalVenta: this.toNumber(data.totalVenta),
        notas: data.notas || ''
      };
    },
    normalizarAbono(registro) {
      const data = registro.data();
      return {
        id: registro.id,
        entradaId: data.entradaId || '',
        fecha: data.fecha || '',
        monto: this.toNumber(data.monto),
        metodo: data.metodo || 'Abono',
        notas: data.notas || ''
      };
    },
    abrirNuevaCompra() {
      this.compraForm = emptyCompra();
      this.loteSeleccionado = null;
      this.compraEditandoId = '';
      this.abrirModal('compra');
    },
    abrirEditarCompra(lote) {
      this.loteSeleccionado = lote;
      this.compraEditandoId = lote.id;
      this.compraForm = {
        proveedor: lote.proveedor === 'Proveedor sin especificar' ? '' : lote.proveedor,
        fecha: lote.fecha,
        producto: lote.producto,
        kilos: lote.kilos,
        precio: lote.precio,
        pagadoInicial: lote.pagadoInicial,
        notas: lote.notas
      };
      this.abrirModal('compra');
    },
    abrirVenta(lote) {
      this.loteSeleccionado = lote;
      this.ventaForm = emptyVenta();
      this.ventaEditandoId = '';
      this.kilosCrudoVentaOriginal = 0;
      this.kilosVendidosEditados = false;
      this.abrirModal('venta');
    },
    abrirEditarVenta({ venta, lote }) {
      this.loteSeleccionado = lote;
      this.ventaEditandoId = venta.id;
      this.kilosCrudoVentaOriginal = venta.kilosCrudo;
      this.kilosVendidosEditados = Math.abs(venta.kilos - venta.kilosCrudo) > EPSILON;
      this.ventaForm = {
        fecha: venta.fecha,
        cliente: venta.cliente,
        kilosCrudo: venta.kilosCrudo,
        kilos: venta.kilos,
        totalVenta: venta.totalVenta,
        notas: venta.notas
      };
      this.abrirModal('venta');
    },
    abrirAbono(lote) {
      this.loteSeleccionado = lote;
      this.abonoForm = emptyAbono();
      this.abrirModal('abono');
    },
    abrirModal(tipo) {
      this.modalActivo = tipo;
      document.body.style.overflow = 'hidden';
      this.$nextTick(() => {
        const field = this.$refs.primerCampo;
        if (field && typeof field.focus === 'function') field.focus();
      });
    },
    cerrarModal(forzar) {
      if (this.guardando && forzar !== true) return;
      this.modalActivo = '';
      this.loteSeleccionado = null;
      this.compraEditandoId = '';
      this.ventaEditandoId = '';
      this.kilosCrudoVentaOriginal = 0;
      document.body.style.overflow = '';
    },
    manejarEscape(event) {
      if (event.key === 'Escape' && this.modalActivo) this.cerrarModal();
    },
    async guardarCompra() {
      const kilos = this.toNumber(this.compraForm.kilos);
      const precio = this.toNumber(this.compraForm.precio);
      const pagadoInicial = this.toNumber(this.compraForm.pagadoInicial);
      const total = kilos * precio;
      const abonosAnteriores = this.compraEditandoId && this.loteSeleccionado
        ? this.loteSeleccionado.abonos.reduce((suma, abono) => suma + abono.monto, 0)
        : 0;

      if (!this.compraForm.proveedor || !this.compraForm.producto || kilos <= 0) {
        alert('Completa el proveedor, producto y kilos de la compra.');
        return;
      }
      if (precio < 0 || pagadoInicial < 0 || pagadoInicial + abonosAnteriores - total > EPSILON) {
        alert('Los pagos registrados no pueden ser mayores al total de la compra.');
        return;
      }
      if (this.compraEditandoId && this.loteSeleccionado && kilos + EPSILON < this.loteSeleccionado.kilosCrudoUtilizados) {
        alert(`Esta compra ya utilizó ${this.formatearNumero(this.loteSeleccionado.kilosCrudoUtilizados)} kg en crudo. No puedes bajar los kilos de ese límite.`);
        return;
      }

      this.guardando = true;
      try {
        const datosCompra = {
          proveedor: this.compraForm.proveedor,
          fecha: this.compraForm.fecha,
          producto: this.normalizarProducto(this.compraForm.producto),
          kilos,
          precio,
          pagadoInicial,
          notas: this.compraForm.notas,
          modelo: 'lote-v2'
        };
        if (this.compraEditandoId) {
          await updateDoc(doc(db, ENTRADAS_COLLECTION, this.compraEditandoId), {
            ...datosCompra,
            actualizadoEn: new Date().toISOString()
          });
        } else {
          await addDoc(collection(db, ENTRADAS_COLLECTION), {
            ...datosCompra,
            creadoEn: new Date().toISOString()
          });
        }
        await this.cargarMovimientos();
        this.cerrarModal(true);
      } catch (error) {
        console.error('Error al guardar la compra:', error);
        alert('No se pudo guardar la compra.');
      } finally {
        this.guardando = false;
        if (!this.modalActivo) document.body.style.overflow = '';
      }
    },
    async guardarVenta() {
      const kilosCrudo = this.toNumber(this.ventaForm.kilosCrudo);
      const kilos = this.toNumber(this.ventaForm.kilos);
      const precioVenta = this.toNumber(this.ventaForm.totalVenta);
      if (!this.loteSeleccionado || !this.ventaForm.cliente || kilosCrudo <= 0 || kilos <= 0) {
        alert('Completa el cliente, los kilos en crudo y los kilos vendidos.');
        return;
      }
      if (kilosCrudo - this.maxKilosCrudoVenta > EPSILON) {
        alert(`Solo puedes utilizar hasta ${this.formatearNumero(this.maxKilosCrudoVenta)} kg en crudo en esta venta.`);
        return;
      }
      if (precioVenta < 0) {
        alert('El precio de venta no puede ser negativo.');
        return;
      }

      this.guardando = true;
      try {
        const datosVenta = {
          entradaId: this.loteSeleccionado.id,
          fecha: this.ventaForm.fecha,
          producto: this.loteSeleccionado.producto,
          cliente: this.ventaForm.cliente,
          kilosCrudo,
          kilos,
          totalVenta: precioVenta,
          notas: this.ventaForm.notas,
          modelo: 'lote-v2'
        };
        if (this.ventaEditandoId) {
          await updateDoc(doc(db, VENTAS_COLLECTION, this.ventaEditandoId), {
            ...datosVenta,
            actualizadoEn: new Date().toISOString()
          });
        } else {
          await addDoc(collection(db, VENTAS_COLLECTION), {
            ...datosVenta,
            creadoEn: new Date().toISOString()
          });
        }
        await this.cargarMovimientos();
        this.cerrarModal(true);
      } catch (error) {
        console.error('Error al guardar la venta:', error);
        alert('No se pudo guardar la venta.');
      } finally {
        this.guardando = false;
        if (!this.modalActivo) document.body.style.overflow = '';
      }
    },
    async guardarAbono() {
      const monto = this.toNumber(this.abonoForm.monto);
      if (!this.loteSeleccionado || monto <= 0) {
        alert('Captura un monto válido para el abono.');
        return;
      }
      if (monto - this.loteSeleccionado.deuda > EPSILON) {
        alert(`El abono no puede superar la deuda de ${this.formatearMoneda(this.loteSeleccionado.deuda)}.`);
        return;
      }

      this.guardando = true;
      try {
        await addDoc(collection(db, ABONOS_COLLECTION), {
          entradaId: this.loteSeleccionado.id,
          fecha: this.abonoForm.fecha,
          monto,
          metodo: this.abonoForm.metodo,
          notas: this.abonoForm.notas,
          creadoEn: new Date().toISOString()
        });
        await this.cargarMovimientos();
        this.cerrarModal(true);
      } catch (error) {
        console.error('Error al guardar el abono:', error);
        alert('No se pudo guardar el abono.');
      } finally {
        this.guardando = false;
        if (!this.modalActivo) document.body.style.overflow = '';
      }
    },
    sincronizarKilosVendidos(kilosCrudo) {
      if (!this.kilosVendidosEditados) this.ventaForm.kilos = kilosCrudo;
    },
    marcarKilosVendidosEditados() {
      this.kilosVendidosEditados = true;
    },
    async eliminarLote(lote) {
      const ventasLigadas = this.ventas.filter((venta) => venta.entradaId === lote.id);
      const abonosLigados = this.abonos.filter((abono) => abono.entradaId === lote.id);
      const movimientosLigados = ventasLigadas.length + abonosLigados.length;
      const detalleMovimientos = movimientosLigados
        ? `\n\nTambién se eliminarán ${ventasLigadas.length} venta(s) y ${abonosLigados.length} abono(s) ligados a este lote.`
        : '';
      const ventasHistoricas = lote.ventas.filter((venta) => !venta.entradaId).length;
      const detalleHistorico = ventasHistoricas
        ? '\n\nLas ventas antiguas sin vínculo de lote se conservarán y se intentarán reasignar.'
        : '';

      if (!window.confirm(
        `¿Eliminar la compra de ${lote.proveedor} por ${this.formatearNumero(lote.kilos)} kg?${detalleMovimientos}${detalleHistorico}\n\nEsta acción no se puede deshacer.`
      )) return;

      try {
        const batch = writeBatch(db);
        ventasLigadas.forEach((venta) => batch.delete(doc(db, VENTAS_COLLECTION, venta.id)));
        abonosLigados.forEach((abono) => batch.delete(doc(db, ABONOS_COLLECTION, abono.id)));
        batch.delete(doc(db, ENTRADAS_COLLECTION, lote.id));
        await batch.commit();
        await this.cargarMovimientos();
      } catch (error) {
        console.error('Error al eliminar la compra:', error);
        alert('No se pudo eliminar la compra.');
      }
    },
    async eliminarMovimiento({ tipo, id }) {
      const esVenta = tipo === 'venta';
      if (!window.confirm(`¿Eliminar ${esVenta ? 'esta venta' : 'este abono'}?`)) return;
      try {
        await deleteDoc(doc(db, esVenta ? VENTAS_COLLECTION : ABONOS_COLLECTION, id));
        await this.cargarMovimientos();
      } catch (error) {
        console.error('Error al eliminar el movimiento:', error);
        alert('No se pudo eliminar el movimiento.');
      }
    },
    normalizarProducto(value) {
      return String(value || '').trim() || 'General';
    },
    claveProducto(value) {
      return this.normalizarProducto(value).toLocaleLowerCase('es');
    },
    ordenarPorFechaDesc(a, b) {
      return String(b.fecha || '').localeCompare(String(a.fecha || ''));
    },
    ordenarPorFechaAsc(a, b) {
      return String(a.fecha || '').localeCompare(String(b.fecha || ''));
    },
    toNumber(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    },
    formatearMoneda(value) {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(Number(value) || 0);
    },
    formatearNumero(value) {
      return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value) || 0);
    },
    volverAMexico() {
      this.$router.push('/cuentas-mexico');
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono:wght@400;700&display=swap');

.allan-page {
  --page-bg: #06070b;
  --surface: rgba(13, 15, 22, 0.95);
  --surface-raised: #12151f;
  --border-soft: rgba(255, 255, 255, 0.09);
  --text-main: #f1f0f5;
  --text-muted: #aaa7b5;
  --text-dim: #74717e;
  --accent: #b388ff;
  --accent-soft: #ceb7ff;
  --cyan: #4fc3ff;
  --success: #61ff9a;
  --amber: #ffc857;
  --danger: #ff6b78;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 78% -10%, rgba(179, 136, 255, 0.12), transparent 34%),
    radial-gradient(circle at -5% 20%, rgba(79, 195, 255, 0.06), transparent 26%),
    var(--page-bg);
  color: var(--text-main);
  font-family: 'VT323', monospace;
}

.allan-page.modal-open {
  z-index: 10001 !important;
}

.bg-grid,
.scanlines {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.bg-grid {
  background-image:
    linear-gradient(rgba(179, 136, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(179, 136, 255, 0.035) 1px, transparent 1px);
  background-size: 30px 30px;
  mask-image: linear-gradient(to bottom, black, transparent 72%);
}

.scanlines {
  z-index: 5;
  background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.012), rgba(255, 255, 255, 0.012) 1px, transparent 1px, transparent 3px);
}

.page-shell {
  position: relative;
  z-index: 6;
  width: min(1280px, calc(100% - 36px));
  margin: 0 auto;
  padding: 28px 0 54px;
}

.page-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 22px;
  margin-bottom: 20px;
}

.back-button,
.new-purchase-button,
.filter-tabs button,
.page-state button,
.close-button,
.cancel-button,
.submit-button {
  font-family: 'Share Tech Mono', monospace;
  cursor: pointer;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border: 1px solid var(--border-soft);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-muted);
  font-size: 0.72rem;
}

.back-button:hover { border-color: var(--accent); color: var(--accent-soft); }

.title-block { min-width: 0; }
.eyebrow { color: var(--accent); font-family: 'Share Tech Mono', monospace; font-size: 0.66rem; letter-spacing: 0.16em; }
.title-block h1 { margin: 3px 0 0; color: var(--text-main); font-size: clamp(2.1rem, 4vw, 3.15rem); font-weight: 400; line-height: 0.95; }
.title-block p { margin: 6px 0 0; color: var(--text-muted); font-family: 'Share Tech Mono', monospace; font-size: 0.76rem; }

.new-purchase-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 43px;
  padding: 0 17px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: #0a0710;
  font-size: 0.76rem;
  font-weight: 700;
  box-shadow: 0 0 20px rgba(179, 136, 255, 0.17);
}

.new-purchase-button:hover { background: var(--accent-soft); }

.workflow-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  margin: 18px 0 24px;
  padding: 13px 18px;
  border: 1px solid var(--border-soft);
  background: rgba(255, 255, 255, 0.018);
}

.workflow-hint > div { display: flex; align-items: center; gap: 9px; }
.workflow-hint > div > span { display: grid; width: 25px; height: 25px; place-items: center; border: 1px solid var(--accent); color: var(--accent); font-size: 1rem; }
.workflow-hint p { margin: 0; }
.workflow-hint strong,
.workflow-hint small { display: block; font-family: 'Share Tech Mono', monospace; font-weight: 400; }
.workflow-hint strong { color: var(--text-main); font-size: 0.68rem; }
.workflow-hint small { margin-top: 2px; color: var(--text-dim); font-size: 0.6rem; }
.workflow-hint > i { color: var(--text-dim); font-size: 0.65rem; }

.lots-section { margin-top: 8px; }
.section-toolbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 22px; margin-bottom: 13px; }
.section-toolbar h2 { margin: 0; color: var(--text-main); font-size: 1.75rem; font-weight: 400; }
.section-toolbar p { margin: 2px 0 0; color: var(--text-dim); font-family: 'Share Tech Mono', monospace; font-size: 0.67rem; }
.toolbar-controls { display: flex; align-items: center; gap: 10px; }

.search-control {
  display: flex;
  align-items: center;
  min-width: 240px;
  height: 35px;
  padding: 0 10px;
  border: 1px solid var(--border-soft);
  background: var(--surface);
  color: var(--text-dim);
}
.search-control:focus-within { border-color: var(--accent); color: var(--accent); }
.search-control input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--text-main); padding: 0 0 0 8px; font-family: 'Share Tech Mono', monospace; font-size: 0.68rem; }
.search-control input::placeholder { color: var(--text-dim); }

.filter-tabs { display: flex; border: 1px solid var(--border-soft); }
.filter-tabs button { height: 33px; padding: 0 10px; border: 0; border-left: 1px solid var(--border-soft); background: var(--surface); color: var(--text-dim); font-size: 0.62rem; }
.filter-tabs button:first-child { border-left: 0; }
.filter-tabs button.active { background: rgba(179, 136, 255, 0.1); color: var(--accent-soft); }

.lots-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 15px; }
.page-state { display: grid; min-height: 260px; place-items: center; align-content: center; gap: 8px; border: 1px dashed var(--border-soft); background: rgba(255, 255, 255, 0.015); color: var(--text-muted); text-align: center; }
.page-state > i { color: var(--accent); font-size: 1.5rem; }
.page-state strong { color: var(--text-main); font-size: 1.55rem; font-weight: 400; }
.page-state p { margin: 0; color: var(--text-dim); font-family: 'Share Tech Mono', monospace; font-size: 0.7rem; }
.page-state .state-icon { display: grid; width: 52px; height: 52px; place-items: center; border: 1px solid var(--accent); color: var(--accent); font-size: 1.15rem; }
.page-state button { margin-top: 6px; padding: 10px 14px; border: 1px solid var(--accent); background: transparent; color: var(--accent-soft); font-size: 0.7rem; }
.page-state.compact { min-height: 180px; }

.legacy-warning { display: flex; gap: 12px; margin-top: 16px; padding: 14px 16px; border: 1px solid rgba(255, 200, 87, 0.35); background: rgba(255, 200, 87, 0.05); color: var(--amber); }
.legacy-warning strong { font-size: 1.1rem; font-weight: 400; }
.legacy-warning p { margin: 2px 0 0; color: var(--text-muted); font-family: 'Share Tech Mono', monospace; font-size: 0.66rem; }

.modal-backdrop { position: fixed; inset: 0; z-index: 11000; display: grid; overflow-y: auto; place-items: center; padding: 24px; background: rgba(2, 3, 7, 0.88); opacity: 1 !important; transition: none !important; backdrop-filter: blur(5px); }
.modal-card { width: min(680px, 100%); max-height: calc(100vh - 48px); overflow-y: auto; border: 1px solid rgba(179, 136, 255, 0.5); background: #0d0f16; color: var(--text-main); box-shadow: 0 30px 90px rgba(0, 0, 0, 0.65), 0 0 35px rgba(179, 136, 255, 0.1); font-family: 'VT323', monospace; }
.modal-header { display: flex; justify-content: space-between; gap: 16px; padding: 21px 24px 17px; border-bottom: 1px solid var(--border-soft); }
.modal-step { color: var(--accent); font-family: 'Share Tech Mono', monospace; font-size: 0.62rem; letter-spacing: 0.12em; }
.modal-header h2 { margin: 3px 0 0; font-size: 2rem; font-weight: 400; line-height: 1; }
.modal-header p { margin: 5px 0 0; color: var(--text-muted); font-family: 'Share Tech Mono', monospace; font-size: 0.67rem; }
.close-button { width: 34px; height: 34px; border: 1px solid var(--border-soft); background: transparent; color: var(--text-muted); }
.close-button:hover { border-color: var(--danger); color: var(--danger); }
.modal-form { padding: 20px 24px 24px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.full-field { grid-column: 1 / -1; }
.field { display: grid; gap: 5px; min-width: 0; }
.field > span { color: var(--text-muted); font-family: 'Share Tech Mono', monospace; font-size: 0.68rem; }
.field b { color: var(--danger); font-weight: 400; }
.field small { color: var(--text-dim); font-family: 'Share Tech Mono', monospace; font-size: 0.58rem; }
.field input,
.field textarea,
.field select { width: 100%; min-height: 40px; border: 1px solid var(--border-soft); outline: 0; background: rgba(0, 0, 0, 0.28); color: var(--text-main); padding: 9px 11px; font-family: 'Share Tech Mono', monospace; font-size: 0.72rem; resize: vertical; }
.field input:focus,
.field textarea:focus,
.field select:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(179, 136, 255, 0.08); }
.input-prefix,
.input-suffix { display: flex; align-items: center; border: 1px solid var(--border-soft); background: rgba(0, 0, 0, 0.28); }
.input-prefix:focus-within,
.input-suffix:focus-within { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(179, 136, 255, 0.08); }
.input-prefix > span,
.input-suffix > span { padding: 0 10px; color: var(--accent-soft); font-size: 1rem; }
.input-prefix input,
.input-suffix input { border: 0; background: transparent; box-shadow: none !important; }
.input-prefix input { padding-left: 0; }
.input-suffix input { padding-right: 0; }

.selected-lot { display: grid; grid-template-columns: 1.5fr 0.7fr 0.7fr; gap: 1px; margin-bottom: 16px; border: 1px solid var(--border-soft); background: var(--border-soft); }
.selected-lot > div { padding: 10px 12px; background: #11131b; }
.selected-lot span,
.selected-lot strong { display: block; }
.selected-lot span { color: var(--text-dim); font-family: 'Share Tech Mono', monospace; font-size: 0.59rem; text-transform: uppercase; }
.selected-lot strong { margin-top: 3px; color: var(--accent-soft); font-size: 1.05rem; font-weight: 400; }
.payment-selection { grid-template-columns: 1.5fr 0.7fr; }
.payment-selection > div:last-child strong { color: var(--amber); }

.calculation-preview { display: grid; grid-template-columns: 1fr auto 1fr auto 1.25fr; align-items: center; gap: 11px; margin-top: 17px; padding: 13px 14px; border: 1px solid var(--border-soft); background: rgba(0, 0, 0, 0.2); }
.calculation-preview > i { color: var(--text-dim); font-size: 0.65rem; }
.calculation-preview span,
.calculation-preview strong { display: block; }
.calculation-preview span { color: var(--text-dim); font-family: 'Share Tech Mono', monospace; font-size: 0.57rem; text-transform: uppercase; }
.calculation-preview strong { margin-top: 3px; color: var(--text-main); font-size: 1.15rem; font-weight: 400; }
.calculation-preview .highlight { padding-left: 11px; border-left: 2px solid currentColor; }
.calculation-preview .highlight.green strong { color: var(--success); }
.calculation-preview .highlight.red strong { color: var(--danger); }
.calculation-preview .highlight.amber strong { color: var(--amber); }

.modal-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-soft); }
.cancel-button,
.submit-button { min-height: 40px; padding: 0 16px; font-size: 0.7rem; }
.cancel-button { border: 1px solid var(--border-soft); background: transparent; color: var(--text-muted); }
.submit-button { border: 1px solid var(--accent); background: var(--accent); color: #09060f; font-weight: 700; }
.submit-button.cyan { border-color: var(--cyan); background: var(--cyan); }
.submit-button.amber { border-color: var(--amber); background: var(--amber); }
.submit-button:disabled { opacity: 0.55; cursor: not-allowed; }
.submit-button i { margin-right: 5px; }
@media (max-width: 1000px) {
  .lots-grid { grid-template-columns: 1fr; }
  .workflow-hint { gap: 14px; }
  .section-toolbar { align-items: flex-start; flex-direction: column; }
  .toolbar-controls { width: 100%; }
  .search-control { flex: 1; }
}

@media (max-width: 680px) {
  .page-shell { width: min(100% - 24px, 1280px); padding-top: 18px; }
  .page-header { grid-template-columns: auto 1fr; gap: 12px; }
  .title-block { grid-column: 2; grid-row: 1; }
  .back-button { grid-column: 1; grid-row: 1; width: 38px; height: 38px; justify-content: center; padding: 0; }
  .back-button span { display: none; }
  .new-purchase-button { grid-column: 1 / -1; width: 100%; justify-content: center; }
  .title-block p { display: none; }
  .workflow-hint { align-items: stretch; flex-direction: column; gap: 8px; }
  .workflow-hint > i { display: none; }
  .toolbar-controls { align-items: stretch; flex-direction: column; }
  .search-control { width: 100%; min-width: 0; }
  .filter-tabs { display: grid; grid-template-columns: repeat(3, 1fr); }
  .filter-tabs button { padding: 0 5px; }
  .modal-backdrop { align-items: end; padding: 0; }
  .modal-card { width: 100%; max-height: 94vh; border-width: 1px 0 0; }
  .modal-header { padding: 18px 16px 14px; }
  .modal-form { padding: 16px; }
  .form-grid { grid-template-columns: 1fr; }
  .full-field { grid-column: auto; }
  .selected-lot { grid-template-columns: 1fr 1fr; }
  .selected-lot > div:first-child { grid-column: 1 / -1; }
  .payment-selection { grid-template-columns: 1fr; }
  .payment-selection > div:first-child { grid-column: auto; }
  .calculation-preview { grid-template-columns: 1fr auto 1fr; }
  .calculation-preview > i:nth-of-type(2) { display: none; }
  .calculation-preview .highlight { grid-column: 1 / -1; padding: 9px 0 0; border-top: 1px solid var(--border-soft); border-left: 0; }
  .modal-actions { display: grid; grid-template-columns: 0.8fr 1.2fr; }
}
</style>
