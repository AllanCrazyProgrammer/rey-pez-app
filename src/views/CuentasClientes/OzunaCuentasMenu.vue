<template>
  <div class="ozuna-cuentas-menu-container">
    <h1>Menú de Cuentas Ozuna</h1>
    
    <div class="actions-container">
      <router-link to="/cuentas-mexico" class="action-button back-btn">
        Cuentas México
      </router-link>
      <router-link to="/cuentas-ozuna/nueva" class="action-button new-cuenta-btn">
        Nueva Cuenta
      </router-link>
      <button
        v-if="cuentasPendientesCount > 0"
        class="action-button bulk-create-btn"
        type="button"
        :disabled="creandoTodas"
        @click="abrirPanelPendientes"
      >
        {{ creandoTodas
          ? `Creando ${bulkProgress.actual} de ${bulkProgress.total}...`
          : `Crear pendientes... (${cuentasPendientesCount})` }}
      </button>
    </div>

    <div v-if="bulkResultado" class="bulk-result" :class="{ 'bulk-result-error': bulkResultado.errores > 0 }">
      Listo: {{ bulkResultado.creadas }} creadas, {{ bulkResultado.errores }} con error de {{ bulkResultado.total }} totales.
    </div>

    <div v-if="mostrarPanelPendientes" class="bulk-modal-overlay" @click.self="cerrarPanelPendientes">
      <div class="bulk-modal">
        <h2>Cuentas pendientes</h2>
        <p class="bulk-modal-info">
          Selecciona el rango de fechas y las notas que deseas crear. Se procesarán una por una sin abrir pestañas.
        </p>

        <div class="bulk-modal-filtros">
          <label>
            Desde
            <input type="date" v-model="bulkFechaDesde" />
          </label>
          <label>
            Hasta
            <input type="date" v-model="bulkFechaHasta" />
          </label>
          <button type="button" class="bulk-link-btn" @click="limpiarRangoFechas">Limpiar rango</button>
        </div>

        <div class="bulk-modal-acciones-rapidas">
          <button type="button" class="bulk-link-btn" @click="seleccionarTodasPendientes">Seleccionar todas</button>
          <button type="button" class="bulk-link-btn" @click="deseleccionarTodasPendientes">Quitar selección</button>
          <span class="bulk-modal-conteo">
            {{ pendientesSeleccionadasCount }} de {{ pendientesFiltradas.length }} seleccionadas
          </span>
        </div>

        <ul v-if="pendientesFiltradas.length > 0" class="bulk-modal-lista">
          <li v-for="fecha in pendientesFiltradas" :key="fecha" class="bulk-modal-item">
            <label>
              <input
                type="checkbox"
                :value="fecha"
                :checked="bulkSeleccionadas.includes(fecha)"
                @change="togglePendiente(fecha)"
              />
              {{ formatDate(fecha) }}
            </label>
          </li>
        </ul>
        <p v-else class="bulk-modal-vacio">No hay cuentas pendientes en el rango seleccionado.</p>

        <div class="bulk-modal-footer">
          <button type="button" class="bulk-cancel-btn" @click="cerrarPanelPendientes">Cancelar</button>
          <button
            type="button"
            class="action-button bulk-create-btn"
            :disabled="bulkSeleccionadas.length === 0 || creandoTodas"
            @click="confirmarCrearSeleccionadas"
          >
            {{ creandoTodas
              ? `Creando ${bulkProgress.actual} de ${bulkProgress.total}...`
              : `Crear ${bulkSeleccionadas.length} seleccionada(s)` }}
          </button>
        </div>
      </div>
    </div>

    <div class="cuentas-list">
      <h2>Registros de Cuentas</h2>
      <div v-if="isLoading" class="loading">Cargando registros...</div>
      <div v-else-if="cuentas.length === 0" class="no-records">
        No hay registros de cuentas.
      </div>
      <ul v-else>
        <li v-for="cuenta in cuentasPaginadas" :key="cuenta.id" class="cuenta-item" :class="{ 'cuenta-sin-nota': cuenta.missingNota }">
          <div class="cuenta-content">
            <span class="cuenta-date">{{ formatDate(cuenta.fecha) }}</span>
            <p class="cuenta-summary">
              <span v-if="!cuenta.missingNota">Saldo Hoy: ${{ formatNumber(cuenta.saldoHoy) }}</span>
              <span v-else class="texto-sin-nota">Sin nota registrada</span>
              <span v-if="!cuenta.missingNota">Total Acumulado: ${{ formatNumber(cuenta.totalNota) }}</span>
              <span v-if="!cuenta.missingNota && cuenta.totalAbonos > 0" class="abono-indicator">
                Abono: ${{ formatNumber(cuenta.totalAbonos) }}
              </span>
              <span v-if="!cuenta.missingNota && cuenta.totalCobros > 0" class="cobro-indicator">
                Cobro: ${{ formatNumber(cuenta.totalCobros) }}
              </span>
            </p>
          </div>
          <div class="cuenta-actions">
            <button v-if="!cuenta.missingNota" @click="editarCuenta(cuenta.id)" class="edit-btn">Editar</button>  
            <button v-if="!cuenta.missingNota" @click="borrarCuenta(cuenta.id)" class="delete-btn">Borrar</button>
            <button
              v-else
              class="nota-pendiente-hint"
              type="button"
              :disabled="creatingFecha === normalizarFechaValor(cuenta.fecha)"
              @click="crearNota(cuenta.fecha)"
            >
              {{ creatingFecha === normalizarFechaValor(cuenta.fecha) ? 'Creando...' : 'Crear nota' }}
            </button>
          </div>
        </li>
      </ul>
      <div v-if="totalPaginas > 1" class="pagination-controls">
        <button @click="paginaActual = 1" :disabled="paginaActual === 1" class="pagination-btn">&laquo;</button>
        <button @click="paginaActual--" :disabled="paginaActual === 1" class="pagination-btn">&lsaquo; Anterior</button>
        <span class="pagination-info">{{ paginaActual }} / {{ totalPaginas }}</span>
        <button @click="paginaActual++" :disabled="paginaActual === totalPaginas" class="pagination-btn">Siguiente &rsaquo;</button>
        <button @click="paginaActual = totalPaginas" :disabled="paginaActual === totalPaginas" class="pagination-btn">&raquo;</button>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc, limit } from 'firebase/firestore';
import EmbarqueCuentasService from '@/utils/services/EmbarqueCuentasService';
import { formatNumber, formatearFecha as formatDate } from '@/utils/formatters';

export default {
  name: 'OzunaCuentasMenu',
  data() {
    return {
      cuentas: [],
      isLoading: true,
      creatingFecha: null,
      paginaActual: 1,
      creandoTodas: false,
      bulkProgress: { actual: 0, total: 0 },
      bulkResultado: null,
      mostrarPanelPendientes: false,
      bulkFechaDesde: '',
      bulkFechaHasta: '',
      bulkSeleccionadas: []
    };
  },
  computed: {
    totalPaginas() {
      return Math.max(1, Math.ceil(this.cuentas.length / 10));
    },
    cuentasPaginadas() {
      const inicio = (this.paginaActual - 1) * 10;
      return this.cuentas.slice(inicio, inicio + 10);
    },
    cuentasPendientesCount() {
      return this.cuentas.filter(c => c.missingNota).length;
    },
    fechasPendientes() {
      return this.cuentas
        .filter(c => c.missingNota)
        .map(c => this.normalizarFechaValor(c.fecha))
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a));
    },
    pendientesFiltradas() {
      const desde = this.bulkFechaDesde || null;
      const hasta = this.bulkFechaHasta || null;
      return this.fechasPendientes.filter(fecha => {
        if (desde && fecha < desde) return false;
        if (hasta && fecha > hasta) return false;
        return true;
      });
    },
    pendientesSeleccionadasCount() {
      return this.bulkSeleccionadas.filter(f => this.pendientesFiltradas.includes(f)).length;
    }
  },
  methods: {
    formatNumber,
    formatDate,
    normalizarFechaValor(valor) {
      if (!valor) return null;
      try {
        if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor;
        if (valor.seconds) {
          const d = new Date(valor.seconds * 1000);
          return d.toISOString().split('T')[0];
        }
        if (valor instanceof Date) {
          return valor.toISOString().split('T')[0];
        }
        const d = new Date(valor);
        if (!Number.isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch (_) {
        return null;
      }
      return null;
    },
    mapProductosConNombreAlternativo(productos = []) {
      return (productos || []).map(prod => {
        const nombreAlt = prod.nombreAlternativoPDF
          ?? prod.nombreAlternativo
          ?? prod.medidaMostrar
          ?? prod.displayMedida
          ?? null;
        const medidaFinal = (nombreAlt !== undefined && nombreAlt !== null)
          ? nombreAlt
          : prod.medida;
        return {
          ...prod,
          medida: medidaFinal,
          medidaOriginal: medidaFinal
        };
      });
    },
    async loadCuentas() {
      try {
        this.isLoading = true;
        const cuentasRef = collection(db, 'cuentasOzuna');
        const q = query(cuentasRef, orderBy('fecha', 'desc'));
        const querySnapshot = await getDocs(q);
        const cuentasActualizadas = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          const totalAbonos = (data.abonos || []).reduce((sum, abono) => sum + (abono.monto || 0), 0);
          const totalCobros = (data.cobros || []).reduce((sum, cobro) => sum + (cobro.monto || 0), 0);
          return {
            id: doc.id,
            fecha: this.normalizarFechaValor(data.fecha) || data.fecha,
            saldoHoy: data.totalGeneral || 0,
            totalNota: data.totalSaldo || 0,
            totalAbonos: totalAbonos,
            totalCobros: totalCobros
          };
        });

        const fechasConNota = new Set(cuentasActualizadas.map(c => this.normalizarFechaValor(c.fecha)));
        const embarquesRef = collection(db, 'embarques');
        const embarquesSnapshot = await getDocs(query(embarquesRef, orderBy('fecha', 'desc'), limit(200)));

        const faltantes = [];
        embarquesSnapshot.forEach(docSnap => {
          const data = docSnap.data() || {};
          const fechaEmbarque = this.normalizarFechaValor(data.fecha);
          if (!fechaEmbarque || fechasConNota.has(fechaEmbarque)) return;

          const clientes = data.clientes || [];
          const productosRaiz = data.productos || [];

          const tieneOzuna = clientes.some(cliente => {
            const clienteId = (cliente.id ?? cliente.clienteId ?? '').toString();
            const nombreCliente = (cliente.nombre || '').toLowerCase();
            const esOzuna = clienteId === '4' || nombreCliente.includes('ozuna');
            const tieneProductos = Array.isArray(cliente.productos) && cliente.productos.some(p => p && (p.medida || (Array.isArray(p.kilos) && p.kilos.some(k => Number(k) > 0))));
            const tieneCrudos = Array.isArray(cliente.crudos) && cliente.crudos.length > 0;
            return esOzuna && (tieneProductos || tieneCrudos);
          }) || productosRaiz.some(producto => {
            const clienteId = (producto.clienteId ?? producto.cliente ?? '').toString();
            const tieneContenido = producto && (producto.medida || (Array.isArray(producto.kilos) && producto.kilos.some(k => Number(k) > 0)));
            return clienteId === '4' && tieneContenido;
          });

          if (tieneOzuna) {
            faltantes.push({
              id: `missing-${fechaEmbarque}`,
              fecha: fechaEmbarque,
              saldoHoy: 0,
              totalNota: 0,
              totalAbonos: 0,
              totalCobros: 0,
              missingNota: true
            });
          }
        });

        this.cuentas = [...cuentasActualizadas, ...faltantes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        console.log("Cuentas cargadas:", this.cuentas);
      } catch (error) {
        console.error("Error al cargar cuentas: ", error);
        this.cuentas = [];
      } finally {
        this.isLoading = false;
      }
    },
    editarCuenta(id) {
      this.$router.push(`/cuentas-ozuna/${id}?edit=true`);
    },
    async crearNota(fecha, options = {}) {
      const { skipOpen = false, silent = false } = options;
      const fechaNormalizada = this.normalizarFechaValor(fecha) || new Date().toISOString().split('T')[0];
      if (this.creatingFecha === fechaNormalizada) return false;

      this.creatingFecha = fechaNormalizada;
      try {
        const embarquesRef = collection(db, 'embarques');
        const embarquesSnapshot = await getDocs(query(embarquesRef, orderBy('fecha', 'desc'), limit(300)));
        const embarqueDoc = embarquesSnapshot.docs.find(docSnap => {
          const data = docSnap.data() || {};
          return this.normalizarFechaValor(data.fecha) === fechaNormalizada;
        });

        if (!embarqueDoc) {
          if (!silent) alert('No se encontró un embarque para esta fecha. Crea la nota manualmente.');
          throw new Error('No se encontró un embarque para esta fecha');
        }

        const data = embarqueDoc.data() || {};
        const clientes = data.clientes || [];
        const clienteOzuna = clientes.find(cliente => {
          const clienteId = (cliente.id ?? cliente.clienteId ?? '').toString();
          const nombreCliente = (cliente.nombre || '').toLowerCase();
          const esOzuna = clienteId === '4' || nombreCliente.includes('ozuna');
          const tieneProductos = Array.isArray(cliente.productos) && cliente.productos.some(p => p && (p.medida || (Array.isArray(p.kilos) && p.kilos.some(k => Number(k) > 0))));
          const tieneCrudos = Array.isArray(cliente.crudos) && cliente.crudos.length > 0;
          return esOzuna && (tieneProductos || tieneCrudos);
        });

        const productosOzuna = this.mapProductosConNombreAlternativo(clienteOzuna?.productos || []);
        const crudosOzuna = clienteOzuna?.crudos || [];

        const tieneProductosConDatos = productosOzuna.some(producto => {
          const sumaKilos = Array.isArray(producto?.kilos)
            ? producto.kilos.reduce((sum, kilo) => sum + (Number(kilo) || 0), 0)
            : (Number(producto?.kilos) || 0);
          return Boolean((producto?.medida && String(producto.medida).trim()) || sumaKilos > 0);
        });

        const tieneCrudosConDatos = crudosOzuna.some(crudo => {
          const items = Array.isArray(crudo?.items) ? crudo.items : [];
          return items.length > 0;
        });

        if (!tieneProductosConDatos && !tieneCrudosConDatos) {
          if (!silent) alert('No se detectaron productos o crudos de Ozuna para esta fecha. Verifica el embarque antes de crear la nota.');
          throw new Error('No se detectaron productos o crudos de Ozuna');
        }

        const clienteCrudosTotales = data.clienteCrudos || data.clientesCrudos || {};
        const embarqueCliente = {
          ...data,
          fecha: fechaNormalizada,
          productos: productosOzuna,
          clienteCrudos: { '4': crudosOzuna },
          productosTotales: data.productos || [],
          clienteCrudosTotales: Object.keys(clienteCrudosTotales).length ? clienteCrudosTotales : { '4': crudosOzuna },
          costosPorMedida: data.costosPorMedida || {},
          aplicarCostoExtra: data.aplicarCostoExtra || {},
          costoExtra: data.costoExtra
        };

        const routerArg = skipOpen ? null : this.$router;
        await EmbarqueCuentasService.crearCuentaOzuna(embarqueCliente, routerArg);
        return true;
      } catch (error) {
        console.error('Error al crear la nota desde embarque:', error);
        if (!silent) alert(`No se pudo crear la nota desde el embarque: ${error.message || error}`);
        if (silent) throw error;
        return false;
      } finally {
        this.creatingFecha = null;
      }
    },
    abrirPanelPendientes() {
      const fechas = this.fechasPendientes;
      if (fechas.length === 0) return;
      this.bulkFechaDesde = fechas[fechas.length - 1] || '';
      this.bulkFechaHasta = fechas[0] || '';
      this.bulkSeleccionadas = [...fechas];
      this.bulkResultado = null;
      this.mostrarPanelPendientes = true;
    },
    cerrarPanelPendientes() {
      if (this.creandoTodas) return;
      this.mostrarPanelPendientes = false;
    },
    limpiarRangoFechas() {
      this.bulkFechaDesde = '';
      this.bulkFechaHasta = '';
    },
    togglePendiente(fecha) {
      const idx = this.bulkSeleccionadas.indexOf(fecha);
      if (idx >= 0) {
        this.bulkSeleccionadas.splice(idx, 1);
      } else {
        this.bulkSeleccionadas.push(fecha);
      }
    },
    seleccionarTodasPendientes() {
      const visibles = this.pendientesFiltradas;
      const conjunto = new Set(this.bulkSeleccionadas);
      visibles.forEach(f => conjunto.add(f));
      this.bulkSeleccionadas = Array.from(conjunto);
    },
    deseleccionarTodasPendientes() {
      const visibles = new Set(this.pendientesFiltradas);
      this.bulkSeleccionadas = this.bulkSeleccionadas.filter(f => !visibles.has(f));
    },
    async confirmarCrearSeleccionadas() {
      const seleccion = this.bulkSeleccionadas.filter(f => this.pendientesFiltradas.includes(f));
      if (seleccion.length === 0) return;
      const confirmacion = confirm(
        `Se crearán ${seleccion.length} nota(s) pendiente(s) una por una sin abrirlas. ¿Continuar?`
      );
      if (!confirmacion) return;
      await this.crearNotasEnLote(seleccion);
      this.mostrarPanelPendientes = false;
    },
    async crearNotasEnLote(fechas) {
      if (!fechas || fechas.length === 0) return;
      this.creandoTodas = true;
      this.bulkResultado = null;
      this.bulkProgress = { actual: 0, total: fechas.length };

      let creadas = 0;
      let errores = 0;

      for (let i = 0; i < fechas.length; i++) {
        this.bulkProgress = { actual: i + 1, total: fechas.length };
        try {
          await this.crearNota(fechas[i], { skipOpen: true, silent: true });
          creadas++;
        } catch (error) {
          errores++;
          console.error(`Error creando nota para fecha ${fechas[i]}:`, error);
        }
      }

      this.bulkResultado = { creadas, errores, total: fechas.length };
      this.creandoTodas = false;

      await this.loadCuentas();
    },
    async borrarCuenta(id) {
      if (confirm('¿Estás seguro de que quieres borrar este registro de cuenta?')) {
        try {
          await deleteDoc(doc(db, 'cuentasOzuna', id));
          this.cuentas = this.cuentas.filter(cuenta => cuenta.id !== id);
          alert('Registro de cuenta borrado con éxito');
          this.loadCuentas();
        } catch (error) {
          console.error("Error al borrar el registro de cuenta: ", error);
          alert('Error al borrar el registro de cuenta');
        }
      }
    }
  },
  mounted() {
    this.loadCuentas();
  }
};
</script>

<style scoped>
.ozuna-cuentas-menu-container {
  max-width: 800px;
  width: 95%;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

h1, h2 {
  color: #07711e;
  text-align: center;
}

.actions-container {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.action-button {
  background-color: #07711e;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.action-button:hover {
  background-color: #065d18;
}

.back-btn {
  background-color: #6c757d;
}

.back-btn:hover {
  background-color: #5a6268;
}

.bulk-create-btn {
  background-color: #1565c0;
  border: none;
  color: white;
  cursor: pointer;
  font-family: inherit;
  font-size: 16px;
}

.bulk-create-btn:hover:not(:disabled) {
  background-color: #0d47a1;
}

.bulk-create-btn:disabled {
  background-color: #90caf9;
  cursor: not-allowed;
}

.bulk-result {
  background: #e9f6ee;
  border: 1px solid #6bbf86;
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 15px;
  color: #07711e;
  font-weight: 600;
  text-align: center;
}

.bulk-result-error {
  background: #fdecea;
  border-color: #f5a39c;
  color: #b71c1c;
}

.bulk-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.bulk-modal {
  background: white;
  border-radius: 10px;
  padding: 24px;
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.bulk-modal h2 {
  margin: 0;
  color: #07711e;
  text-align: left;
}

.bulk-modal-info {
  margin: 0;
  color: #555;
  font-size: 14px;
}

.bulk-modal-filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: end;
}

.bulk-modal-filtros label {
  display: flex;
  flex-direction: column;
  font-size: 13px;
  color: #555;
  font-weight: 600;
  gap: 4px;
}

.bulk-modal-filtros input[type="date"] {
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.bulk-modal-acciones-rapidas {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}

.bulk-link-btn {
  background: none;
  border: none;
  color: #1565c0;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 6px;
  text-decoration: underline;
}

.bulk-link-btn:hover {
  color: #0d47a1;
}

.bulk-modal-conteo {
  margin-left: auto;
  color: #666;
  font-weight: 600;
}

.bulk-modal-lista {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  max-height: 280px;
  overflow-y: auto;
}

.bulk-modal-item {
  border-bottom: 1px solid #f0f0f0;
}

.bulk-modal-item:last-child {
  border-bottom: none;
}

.bulk-modal-item label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 14px;
}

.bulk-modal-item label:hover {
  background: #f7f7f7;
}

.bulk-modal-vacio {
  margin: 0;
  padding: 20px;
  text-align: center;
  color: #888;
  background: #fafafa;
  border-radius: 6px;
}

.bulk-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 6px;
}

.bulk-cancel-btn {
  background: #eee;
  border: none;
  border-radius: 4px;
  padding: 10px 18px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #444;
}

.bulk-cancel-btn:hover {
  background: #ddd;
}

@media (max-width: 600px) {
  .bulk-modal {
    padding: 18px;
  }
  .bulk-modal-filtros {
    flex-direction: column;
    align-items: stretch;
  }
  .bulk-modal-conteo {
    margin-left: 0;
    width: 100%;
  }
}

.cuentas-list {
  background-color: #f0f4f8;
  border-radius: 8px;
  padding: 20px;
  flex-grow: 1;
}

.loading, .no-records {
  text-align: center;
  color: #666;
  padding: 20px;
}

.cuenta-item {
  background-color: white;
  border-radius: 4px;
  margin-bottom: 15px;
  padding: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.3s ease;
}

.cuenta-item.cuenta-sin-nota {
  background: #f2f2f2;
  border-left: 4px solid #bdbdbd;
}

.cuenta-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.cuenta-content {
  margin-bottom: 10px;
}

.cuenta-date {
  color: #07711e;
  font-weight: bold;
  font-size: 1.1em;
  display: block;
  margin-bottom: 5px;
}

.cuenta-summary {
  font-size: 0.9em;
  color: #666;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.cuenta-summary span {
  flex: 1 1 auto;
}

.cuenta-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.edit-btn, .delete-btn {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s ease;
}

.edit-btn {
  background-color: #4CAF50;
  color: white;
}

.edit-btn:hover {
  background-color: #45a049;
}

.delete-btn {
  background-color: #f44336;
  color: white;
}

.delete-btn:hover {
  background-color: #d32f2f;
}

.texto-sin-nota {
  color: #666;
  font-weight: 600;
}

.nota-pendiente-hint {
  color: #07711e;
  font-weight: 700;
  align-self: center;
  background: #e9f6ee;
  border: 1px dashed #6bbf86;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 140px;
  text-align: center;
}

.nota-pendiente-hint[disabled] {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.nota-pendiente-hint:hover,
.nota-pendiente-hint:focus {
  background: #d7efe1;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  transform: translateY(-1px);
}

.nota-pendiente-hint:active {
  transform: translateY(0);
}

.nota-pendiente-hint:focus {
  outline: 2px solid #07711e;
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .nota-pendiente-hint {
    width: 100%;
  }
}

.abono-indicator {
  color: #4CAF50;
  font-weight: bold;
  margin-left: 10px;
}

.cobro-indicator {
  color: #f44336;
  font-weight: bold;
  margin-left: 10px;
}

@media (max-width: 768px) {
  .ozuna-cuentas-menu-container {
    padding: 10px;
    width: 100%;
  }

  .actions-container {
    flex-direction: column;
    gap: 10px;
  }

  .action-button {
    width: 100%;
    text-align: center;
  }

  .cuenta-item {
    padding: 10px;
  }

  .cuenta-date {
    font-size: 1em;
  }

  .cuenta-summary {
    flex-direction: column;
    align-items: flex-start;
  }

  .cuenta-summary span {
    width: 100%;
  }

  .cuenta-actions {
    flex-direction: row;
    justify-content: space-between;
  }

  .edit-btn, .delete-btn {
    padding: 8px 15px;
    font-size: 0.8em;
    flex-grow: 1;
  }
  .pagination-controls {
    gap: 6px;
  }
  .pagination-btn {
    padding: 6px 10px;
    font-size: 13px;
  }
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.pagination-btn {
  background-color: #07711e;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.2s ease;
}

.pagination-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.pagination-btn:not(:disabled):hover {
  background-color: #065d18;
}

.pagination-info {
  font-weight: 700;
  font-size: 15px;
  color: #07711e;
  min-width: 60px;
  text-align: center;
}
</style>