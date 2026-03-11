<template>
  <div class="allan-camaron-page">
    <div class="scanlines" aria-hidden="true"></div>
    <div class="bg-grid" aria-hidden="true"></div>

    <div class="content-shell">
      <div class="header-panel">
        <button class="back-button" @click="volverAMexico">
          <i class="fas fa-arrow-left"></i>
          Volver a Cuentas Mexico
        </button>

        <div class="title-block">
          <p class="eyebrow">Control especial de camarón</p>
          <h1>Allan</h1>
          <p class="subtitle">
            Registra entradas, ventas por cliente y consulta tus ganancias al momento.
          </p>
        </div>
      </div>

      <section class="summary-grid">
        <article class="summary-card">
          <span class="summary-label">Entradas</span>
          <strong>{{ formatearMoneda(totalEntradas) }}</strong>
          <small>{{ entradas.length }} registros · {{ formatearNumero(totalKilosEntradas) }} kg</small>
        </article>

        <article class="summary-card ventas">
          <span class="summary-label">Ventas</span>
          <strong>{{ formatearMoneda(totalVentas) }}</strong>
          <small>{{ ventas.length }} registros · {{ formatearNumero(totalKilosVentas) }} kg</small>
        </article>

        <article class="summary-card ganancias" :class="{ negativa: gananciaTotal < 0 }">
          <span class="summary-label">Ganancia</span>
          <strong>{{ formatearMoneda(gananciaTotal) }}</strong>
          <small>{{ resumenGanancia }}</small>
        </article>

        <article class="summary-card kilos">
          <span class="summary-label">Inventario</span>
          <strong>{{ formatearNumero(analisisGanancia.kilosInventario) }} kg</strong>
          <small>Costo pendiente: {{ formatearMoneda(analisisGanancia.costoInventario) }}</small>
        </article>
      </section>

      <section class="forms-grid">
        <article class="panel-card">
          <div class="panel-heading">
            <h2>Registrar entrada</h2>
            <p>Guarda cada compra de camarón con fecha, kilos y precio por kilo.</p>
          </div>

          <form class="movement-form" @submit.prevent="guardarEntrada">
            <label>
              Fecha
              <input v-model="entradaForm.fecha" type="date" required />
            </label>

            <label>
              Producto
              <input
                v-model.trim="entradaForm.producto"
                type="text"
                required
                placeholder="Ej. Camarón chico"
              />
            </label>

            <label>
              Kilos
              <input
                v-model="entradaForm.kilos"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
              />
            </label>

            <label>
              Precio por kilo ($)
              <input
                v-model="entradaForm.precio"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
              />
            </label>

            <label>
              Notas
              <textarea
                v-model.trim="entradaForm.notas"
                rows="3"
                placeholder="Ej. Camarón mediano o detalle de la compra"
              ></textarea>
            </label>

            <button class="action-button save" type="submit" :disabled="guardandoEntrada">
              {{ guardandoEntrada ? 'Guardando...' : 'Guardar entrada' }}
            </button>
          </form>
        </article>

        <article class="panel-card">
          <div class="panel-heading">
            <h2>Registrar venta / salida</h2>
            <p>Indica la fecha, el cliente, los kilos y el precio por kilo.</p>
          </div>

          <form class="movement-form" @submit.prevent="guardarVenta">
            <label>
              Fecha
              <input v-model="ventaForm.fecha" type="date" required />
            </label>

            <label>
              Producto
              <select v-model="ventaForm.producto" required :disabled="!productosDisponiblesVenta.length">
                <option disabled value="">
                  {{ productosDisponiblesVenta.length ? 'Selecciona un producto con existencia' : 'No hay productos con existencia' }}
                </option>
                <option
                  v-for="item in productosDisponiblesVenta"
                  :key="item.producto"
                  :value="item.producto"
                >
                  {{ item.producto }} · {{ formatearNumero(item.kilosInventario) }} kg disponibles
                </option>
              </select>
            </label>

            <p v-if="productoSeleccionadoVenta" class="inventory-hint">
              Existencia disponible: {{ formatearNumero(productoSeleccionadoVenta.kilosInventario) }} kg
            </p>

            <label>
              Cliente
              <input
                v-model.trim="ventaForm.cliente"
                type="text"
                required
                placeholder="Nombre del cliente"
              />
            </label>

            <label>
              Kilos vendidos
              <input
                v-model="ventaForm.kilos"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
              />
            </label>

            <label>
              Precio por kilo ($)
              <input
                v-model="ventaForm.totalVenta"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
              />
            </label>

            <label>
              Notas
              <textarea
                v-model.trim="ventaForm.notas"
                rows="3"
                placeholder="Ej. Tamaño, presentación o detalle de la venta"
              ></textarea>
            </label>

            <button class="action-button sale" type="submit" :disabled="guardandoVenta">
              {{ guardandoVenta ? 'Guardando...' : 'Guardar venta' }}
            </button>
          </form>
        </article>
      </section>

      <section class="lists-grid">
        <article class="panel-card list-card">
          <div class="panel-heading">
            <h2>Entradas registradas</h2>
            <p>Historial de compras de camarón.</p>
          </div>

          <div v-if="cargando" class="empty-state">Cargando registros...</div>
          <div v-else-if="!entradas.length" class="empty-state">Aún no hay entradas registradas.</div>
          <div v-else class="movement-list">
            <div v-for="entrada in entradas" :key="entrada.id" class="movement-item entry">
              <div class="item-main">
                <strong>{{ entrada.producto }}</strong>
                <span>{{ formatearFecha(entrada.fecha) }}</span>
                <span>{{ entrada.notas || 'Sin notas' }}</span>
              </div>
              <div class="item-metrics">
                <span>{{ formatearNumero(entrada.kilos) }} kg</span>
                <strong>{{ formatearMoneda(entrada.precio) }}/kg</strong>
                <span>Total: {{ formatearMoneda(entrada.kilos * entrada.precio) }}</span>
              </div>
              <button class="delete-button" @click="eliminarRegistro('entrada', entrada.id)">
                Eliminar
              </button>
            </div>
          </div>
        </article>

        <article class="panel-card list-card">
          <div class="panel-heading">
            <h2>Ventas registradas</h2>
            <p>Historial de salidas por cliente.</p>
          </div>

          <div v-if="cargando" class="empty-state">Cargando registros...</div>
          <div v-else-if="!ventas.length" class="empty-state">Aún no hay ventas registradas.</div>
          <div v-else class="movement-list">
            <div v-for="venta in ventas" :key="venta.id" class="movement-item sale">
              <div class="item-main">
                <strong>{{ venta.cliente }}</strong>
                <span>{{ venta.producto }} · {{ formatearFecha(venta.fecha) }}</span>
                <span>{{ venta.notas || 'Sin notas' }}</span>
              </div>
              <div class="item-metrics">
                <span>{{ formatearNumero(venta.kilos) }} kg</span>
                <strong>{{ formatearMoneda(venta.totalVenta) }}/kg</strong>
                <span>Total: {{ formatearMoneda(venta.kilos * venta.totalVenta) }}</span>
              </div>
              <button class="delete-button" @click="eliminarRegistro('venta', venta.id)">
                Eliminar
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs } from 'firebase/firestore';

const ENTRADAS_COLLECTION = 'cuentasAllanCamaronEntradas';
const VENTAS_COLLECTION = 'cuentasAllanCamaronVentas';

const getToday = () => new Date().toISOString().split('T')[0];
const createEmptyEntradaForm = () => ({
  fecha: getToday(),
  producto: '',
  kilos: '',
  precio: '',
  notas: ''
});
const createEmptyVentaForm = () => ({
  fecha: getToday(),
  producto: '',
  cliente: '',
  kilos: '',
  totalVenta: '',
  notas: ''
});

export default {
  name: 'CuentasAllanCamaron',
  data() {
    return {
      cargando: false,
      guardandoEntrada: false,
      guardandoVenta: false,
      entradas: [],
      ventas: [],
      entradaForm: createEmptyEntradaForm(),
      ventaForm: createEmptyVentaForm()
    };
  },
  computed: {
    resumenProductos() {
      const productosMap = new Map();

      this.entradas.forEach((entrada) => {
        const producto = entrada.producto || 'General';
        if (!productosMap.has(producto)) {
          productosMap.set(producto, { entradas: [], ventas: [] });
        }
        productosMap.get(producto).entradas.push(entrada);
      });

      this.ventas.forEach((venta) => {
        const producto = venta.producto || 'General';
        if (!productosMap.has(producto)) {
          productosMap.set(producto, { entradas: [], ventas: [] });
        }
        productosMap.get(producto).ventas.push(venta);
      });

      return [...productosMap.entries()]
        .map(([producto, movimientos]) => this.calcularAnalisisProducto(producto, movimientos))
        .sort((a, b) => a.producto.localeCompare(b.producto, 'es'));
    },
    productosDisponiblesVenta() {
      return this.resumenProductos
        .filter((item) => item.kilosInventario > 0)
        .sort((a, b) => a.producto.localeCompare(b.producto, 'es'));
    },
    productoSeleccionadoVenta() {
      return this.resumenProductos.find((item) => item.producto === this.ventaForm.producto) || null;
    },
    totalEntradas() {
      return this.entradas.reduce((total, entrada) => total + (entrada.kilos * entrada.precio), 0);
    },
    totalVentas() {
      return this.ventas.reduce((total, venta) => total + (venta.kilos * venta.totalVenta), 0);
    },
    analisisGanancia() {
      return {
        costoVentas: this.resumenProductos.reduce((total, item) => total + item.costoVentas, 0),
        kilosSinCosto: this.resumenProductos.reduce((total, item) => total + item.kilosSinCosto, 0),
        costoInventario: this.resumenProductos.reduce((total, item) => total + item.costoInventario, 0),
        kilosInventario: this.resumenProductos.reduce((total, item) => total + item.kilosInventario, 0),
        entradasSinKilos: this.entradas.filter((entrada) => entrada.kilos <= 0).length,
        ventasSinKilos: this.ventas.filter((venta) => venta.kilos <= 0).length
      };
    },
    gananciaTotal() {
      return this.totalVentas - this.analisisGanancia.costoVentas;
    },
    totalKilosEntradas() {
      return this.entradas.reduce((total, entrada) => total + entrada.kilos, 0);
    },
    totalKilosVentas() {
      return this.ventas.reduce((total, venta) => total + venta.kilos, 0);
    },
    resumenGanancia() {
      if (!this.totalVentas && !this.totalEntradas) {
        return 'Sin movimientos todavía';
      }

      if (this.analisisGanancia.entradasSinKilos || this.analisisGanancia.ventasSinKilos) {
        return 'Faltan kilos en registros anteriores';
      }

      if (this.analisisGanancia.kilosSinCosto > 0) {
        return `Faltan ${this.formatearNumero(this.analisisGanancia.kilosSinCosto)} kg por costear`;
      }

      return this.gananciaTotal >= 0 ? 'Utilidad positiva' : 'Costo arriba de ventas';
    }
  },
  mounted() {
    this.cargarMovimientos();
  },
  methods: {
    getEmptyEntradaForm() {
      return createEmptyEntradaForm();
    },
    getEmptyVentaForm() {
      return createEmptyVentaForm();
    },
    normalizarProducto(value) {
      const producto = (value || '').trim();
      return producto || 'General';
    },
    calcularAnalisisProducto(producto, movimientos) {
      const entradasOrdenadas = [...movimientos.entradas]
        .filter((entrada) => entrada.kilos > 0 && entrada.precio >= 0)
        .sort(this.ordenarPorFechaAsc)
        .map((entrada) => ({
          ...entrada,
          kilosDisponibles: entrada.kilos,
          costoUnitario: entrada.precio
        }));

      const ventasOrdenadas = [...movimientos.ventas]
        .filter((venta) => venta.kilos > 0 && venta.totalVenta >= 0)
        .sort(this.ordenarPorFechaAsc);

      let costoVentas = 0;
      let kilosSinCosto = 0;

      ventasOrdenadas.forEach((venta) => {
        let kilosPendientes = venta.kilos;

        for (let index = 0; index < entradasOrdenadas.length && kilosPendientes > 0; index += 1) {
          const lote = entradasOrdenadas[index];

          if (lote.kilosDisponibles <= 0) {
            continue;
          }

          const kilosTomados = Math.min(lote.kilosDisponibles, kilosPendientes);
          costoVentas += kilosTomados * lote.costoUnitario;
          lote.kilosDisponibles -= kilosTomados;
          kilosPendientes -= kilosTomados;
        }

        if (kilosPendientes > 0) {
          kilosSinCosto += kilosPendientes;
        }
      });

      return {
        producto,
        costoVentas,
        kilosSinCosto,
        costoInventario: entradasOrdenadas.reduce(
          (total, lote) => total + (lote.kilosDisponibles * lote.costoUnitario),
          0
        ),
        kilosInventario: entradasOrdenadas.reduce(
          (total, lote) => total + lote.kilosDisponibles,
          0
        )
      };
    },
    async cargarMovimientos() {
      this.cargando = true;

      try {
        const [entradasSnapshot, ventasSnapshot] = await Promise.all([
          getDocs(collection(db, ENTRADAS_COLLECTION)),
          getDocs(collection(db, VENTAS_COLLECTION))
        ]);

        this.entradas = entradasSnapshot.docs
          .map((registro) => this.normalizarEntrada(registro))
          .sort(this.ordenarPorFechaDesc);

        this.ventas = ventasSnapshot.docs
          .map((registro) => this.normalizarVenta(registro))
          .sort(this.ordenarPorFechaDesc);
      } catch (error) {
        console.error('Error al cargar movimientos de Allan:', error);
        alert('No se pudieron cargar los movimientos de Allan.');
      } finally {
        this.cargando = false;
      }
    },
    normalizarEntrada(registro) {
      const data = registro.data();

      return {
        id: registro.id,
        fecha: data.fecha || '',
        producto: this.normalizarProducto(data.producto),
        kilos: Number(data.kilos) || 0,
        precio: Number(data.precio) || 0,
        notas: data.notas || ''
      };
    },
    normalizarVenta(registro) {
      const data = registro.data();

      return {
        id: registro.id,
        fecha: data.fecha || '',
        producto: this.normalizarProducto(data.producto),
        cliente: data.cliente || 'Cliente sin nombre',
        kilos: Number(data.kilos) || 0,
        totalVenta: Number(data.totalVenta) || 0,
        notas: data.notas || ''
      };
    },
    ordenarPorFechaDesc(a, b) {
      return new Date(b.fecha) - new Date(a.fecha);
    },
    ordenarPorFechaAsc(a, b) {
      return new Date(a.fecha) - new Date(b.fecha);
    },
    async guardarEntrada() {
      if (!this.entradaForm.producto.trim()) {
        alert('Captura el producto de la entrada.');
        return;
      }

      if (this.toNumber(this.entradaForm.kilos) <= 0) {
        alert('Captura los kilos de la entrada para calcular la ganancia correctamente.');
        return;
      }

      this.guardandoEntrada = true;

      try {
        await addDoc(collection(db, ENTRADAS_COLLECTION), {
          fecha: this.entradaForm.fecha,
          producto: this.normalizarProducto(this.entradaForm.producto),
          kilos: this.toNumber(this.entradaForm.kilos),
          precio: this.toNumber(this.entradaForm.precio),
          notas: this.entradaForm.notas,
          creadoEn: new Date().toISOString()
        });

        this.entradaForm = this.getEmptyEntradaForm();
        await this.cargarMovimientos();
      } catch (error) {
        console.error('Error al guardar entrada:', error);
        alert('No se pudo guardar la entrada.');
      } finally {
        this.guardandoEntrada = false;
      }
    },
    async guardarVenta() {
      if (!this.ventaForm.producto.trim()) {
        alert('Selecciona un producto con existencia.');
        return;
      }

      if (this.toNumber(this.ventaForm.kilos) <= 0) {
        alert('Captura los kilos vendidos para calcular la ganancia correctamente.');
        return;
      }

      if (!this.productoSeleccionadoVenta || this.productoSeleccionadoVenta.kilosInventario <= 0) {
        alert('El producto seleccionado no tiene existencia disponible.');
        return;
      }

      if (this.toNumber(this.ventaForm.kilos) > this.productoSeleccionadoVenta.kilosInventario) {
        alert(`Solo tienes ${this.formatearNumero(this.productoSeleccionadoVenta.kilosInventario)} kg disponibles de ${this.ventaForm.producto}.`);
        return;
      }

      this.guardandoVenta = true;

      try {
        await addDoc(collection(db, VENTAS_COLLECTION), {
          fecha: this.ventaForm.fecha,
          producto: this.normalizarProducto(this.ventaForm.producto),
          cliente: this.ventaForm.cliente,
          kilos: this.toNumber(this.ventaForm.kilos),
          totalVenta: this.toNumber(this.ventaForm.totalVenta),
          notas: this.ventaForm.notas,
          creadoEn: new Date().toISOString()
        });

        this.ventaForm = this.getEmptyVentaForm();
        await this.cargarMovimientos();
      } catch (error) {
        console.error('Error al guardar venta:', error);
        alert('No se pudo guardar la venta.');
      } finally {
        this.guardandoVenta = false;
      }
    },
    async eliminarRegistro(tipo, id) {
      const mensaje = tipo === 'entrada'
        ? '¿Eliminar esta entrada de camarón?'
        : '¿Eliminar esta venta?';

      if (!window.confirm(mensaje)) {
        return;
      }

      try {
        const collectionName = tipo === 'entrada' ? ENTRADAS_COLLECTION : VENTAS_COLLECTION;
        await deleteDoc(doc(db, collectionName, id));
        await this.cargarMovimientos();
      } catch (error) {
        console.error('Error al eliminar movimiento:', error);
        alert('No se pudo eliminar el registro.');
      }
    },
    toNumber(value) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    },
    formatearMoneda(value) {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
      }).format(Number(value) || 0);
    },
    formatearNumero(value) {
      return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(Number(value) || 0);
    },
    formatearFecha(fecha) {
      if (!fecha) {
        return 'Sin fecha';
      }

      const [year, month, day] = fecha.split('-');
      return `${day}/${month}/${year}`;
    },
    volverAMexico() {
      this.$router.push('/cuentas-mexico');
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=VT323&family=Share+Tech+Mono:wght@400;700&display=swap');

.allan-camaron-page {
  --bg-main: #05070b;
  --panel-bg: rgba(7, 18, 15, 0.92);
  --panel-border: rgba(0, 255, 163, 0.35);
  --text-main: #dfffee;
  --text-muted: #8ed7b2;
  --accent: #00ffa3;
  --accent-2: #4fc3ff;
  --warning: #ffd166;
  --danger: #ff6b6b;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(79, 195, 255, 0.12), transparent 26%),
    radial-gradient(circle at top left, rgba(0, 255, 163, 0.12), transparent 24%),
    var(--bg-main);
  color: var(--text-main);
  font-family: 'VT323', 'Share Tech Mono', monospace;
}

.scanlines,
.bg-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.scanlines {
  background: repeating-linear-gradient(
    0deg,
    rgba(255, 255, 255, 0.02),
    rgba(255, 255, 255, 0.02) 1px,
    transparent 1px,
    transparent 3px
  );
  opacity: 0.35;
}

.bg-grid {
  background-image:
    linear-gradient(rgba(0, 255, 163, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 163, 0.06) 1px, transparent 1px);
  background-size: 24px 24px;
  opacity: 0.45;
}

.content-shell {
  position: relative;
  z-index: 1;
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 20px 48px;
}

.header-panel,
.panel-card,
.summary-card {
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  box-shadow: 0 0 24px rgba(0, 255, 163, 0.08);
  backdrop-filter: blur(6px);
}

.header-panel {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

.title-block {
  flex: 1;
  min-width: 240px;
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--warning);
  letter-spacing: 2px;
  text-transform: uppercase;
  font-size: 1.25rem;
}

h1 {
  margin: 0;
  font-size: clamp(2.5rem, 6vw, 4rem);
  line-height: 0.95;
  color: var(--accent);
  letter-spacing: 2px;
}

.subtitle {
  margin: 10px 0 0;
  max-width: 640px;
  color: var(--text-muted);
  font-size: 1.5rem;
}

.back-button,
.action-button,
.delete-button {
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
  font-family: inherit;
}

.back-button {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--accent-2);
  padding: 12px 16px;
  font-size: 1.35rem;
}

.back-button:hover,
.action-button:hover,
.delete-button:hover {
  transform: translateY(-2px);
}

.summary-grid,
.forms-grid,
.lists-grid {
  display: grid;
  gap: 18px;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 24px;
}

.summary-card {
  padding: 20px;
}

.summary-card strong {
  display: block;
  margin: 8px 0 6px;
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  color: var(--accent);
}

.summary-card small,
.summary-label {
  display: block;
}

.summary-label {
  color: var(--warning);
  letter-spacing: 1px;
  font-size: 1.2rem;
  text-transform: uppercase;
}

.summary-card small {
  color: var(--text-muted);
  font-size: 1.2rem;
}

.summary-card.ventas strong {
  color: var(--accent-2);
}

.summary-card.ganancias strong {
  color: #87ff65;
}

.summary-card.ganancias.negativa strong {
  color: var(--danger);
}

.summary-card.kilos strong {
  color: var(--warning);
}

.forms-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 24px;
}

.lists-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.panel-card {
  padding: 22px;
}

.panel-heading {
  margin-bottom: 16px;
}

.panel-heading h2 {
  margin: 0 0 6px;
  color: var(--accent);
  font-size: 2rem;
}

.panel-heading p {
  margin: 0;
  color: var(--text-muted);
  font-size: 1.25rem;
}

.movement-form {
  display: grid;
  gap: 14px;
}

.movement-form label {
  display: grid;
  gap: 6px;
  color: var(--warning);
  font-size: 1.25rem;
}

.movement-form input,
.movement-form select,
.movement-form textarea {
  width: 100%;
  border: 1px solid rgba(0, 255, 163, 0.25);
  background: rgba(0, 0, 0, 0.25);
  color: var(--text-main);
  padding: 12px 14px;
  font-family: inherit;
  font-size: 1.2rem;
  resize: vertical;
}

.movement-form input:focus,
.movement-form select:focus,
.movement-form textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(0, 255, 163, 0.18);
}

.movement-form select option {
  background: #07120f;
  color: var(--text-main);
}

.inventory-hint {
  margin: -4px 0 2px;
  color: var(--accent-2);
  font-size: 1.1rem;
}

.action-button {
  padding: 12px 16px;
  font-size: 1.3rem;
}

.action-button.save {
  color: var(--accent);
}

.action-button.sale {
  color: var(--accent-2);
}

.action-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.list-card {
  min-height: 340px;
}

.movement-list {
  display: grid;
  gap: 12px;
}

.movement-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.24);
}

.movement-item.entry {
  border-left: 3px solid var(--accent);
}

.movement-item.sale {
  border-left: 3px solid var(--accent-2);
}

.item-main,
.item-metrics {
  display: grid;
  gap: 4px;
}

.item-main strong,
.item-metrics strong {
  font-size: 1.35rem;
}

.item-main span,
.item-metrics span {
  color: var(--text-muted);
  font-size: 1.1rem;
}

.item-metrics {
  text-align: right;
}

.delete-button {
  padding: 10px 12px;
  color: var(--danger);
  font-size: 1.1rem;
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 220px;
  padding: 20px;
  text-align: center;
  color: var(--text-muted);
  font-size: 1.25rem;
  border: 1px dashed rgba(0, 255, 163, 0.2);
}

@media (max-width: 1080px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .forms-grid,
  .lists-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .content-shell {
    padding: 20px 14px 32px;
  }

  .header-panel,
  .panel-card,
  .summary-card {
    padding: 16px;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .back-button,
  .action-button,
  .delete-button {
    width: 100%;
    justify-content: center;
  }

  .movement-item {
    grid-template-columns: 1fr;
  }

  .item-metrics {
    text-align: left;
  }
}
</style>
