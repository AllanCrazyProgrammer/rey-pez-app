<template>
  <div class="precios-nota-venta-root">
    <button type="button" class="btn-open" @click="abrir">
      <span class="btn-icon" aria-hidden="true">📋</span>
      <span>Catálogo de precios</span>
    </button>

    <div v-if="abierto" class="overlay" @click.self="cerrar">
      <div class="panel" role="dialog" aria-labelledby="precios-nota-titulo">
        <header class="panel-header">
          <h2 id="precios-nota-titulo">Precios para nota de venta</h2>
          <button type="button" class="btn-cerrar" aria-label="Cerrar" @click="cerrar">✕</button>
        </header>

        <p class="intro">
          Los precios que guardes aquí son solo para esta pantalla (colección aparte en la base de datos).
          Puedes registrar un precio <strong>general</strong> o uno <strong>por cliente</strong> usando los mismos nombres
          que aparecen en el selector de cliente de la nota.
        </p>

        <section class="form-section" aria-label="Agregar precio">
          <h3 class="section-title">Agregar precio</h3>
          <div class="form-grid">
            <label class="field">
              <span class="field-label">Producto / medida</span>
              <input
                v-model.trim="newPrice.producto"
                type="text"
                class="field-input"
                placeholder="Ej. 41/50 s/c"
                list="lista-productos-nota"
                autocomplete="off"
              />
              <datalist id="lista-productos-nota">
                <option v-for="p in nombresProducto" :key="p" :value="p" />
              </datalist>
            </label>
            <label class="field">
              <span class="field-label">Precio ($)</span>
              <input
                v-model.number="newPrice.precio"
                type="number"
                class="field-input"
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </label>
            <label class="field">
              <span class="field-label">Vigente desde</span>
              <input v-model="newPrice.fecha" type="date" class="field-input" />
            </label>
          </div>

          <label class="check-row">
            <input v-model="newPrice.esClienteEspecifico" type="checkbox" />
            <span>Precio específico para un cliente de la nota</span>
          </label>

          <p v-if="newPrice.esClienteEspecifico && !clientesParaChips.length" class="aviso-sin-clientes">
            No hay clientes en la lista de la nota. Agrégalos desde el menú de clientes.
          </p>

          <div v-if="newPrice.esClienteEspecifico && clientesParaChips.length" class="clientes-chips" role="group" aria-label="Cliente">
            <button
              v-for="c in clientesParaChips"
              :key="c.key"
              type="button"
              class="chip"
              :class="{ activo: newPrice.clienteNombre === c.nombre }"
              @click="newPrice.clienteNombre = c.nombre"
            >
              {{ c.nombre }}
            </button>
          </div>

          <p v-if="clienteNombreNota" class="hint-nota">
            Cliente seleccionado en la nota: <strong>{{ clienteNombreNota }}</strong>.
            Si guardas un precio específico para ese mismo nombre, se usará al sugerir el precio por kilo.
          </p>

          <button type="button" class="btn-guardar" :disabled="guardando" @click="guardarPrecio">
            {{ guardando ? 'Guardando…' : 'Guardar precio' }}
          </button>
        </section>

        <section class="lista-section" aria-label="Precios de referencia">
          <h3 class="section-title">Referencia rápida</h3>
          <p v-if="cargando" class="muted">Cargando…</p>
          <p v-else-if="!preciosVista.length" class="muted">Aún no hay precios registrados para la nota de venta. Agrega el primero arriba.</p>
          <ul v-else class="lista-precios">
            <li v-for="item in preciosVista" :key="item.clave" class="fila-precio">
              <span class="fila-producto">{{ item.producto }}</span>
              <span class="fila-monto">${{ formatNum(item.precio) }}</span>
              <span class="fila-meta">
                <span class="fila-meta-bloque">
                  <span class="badge" :class="item.clienteNombre ? 'badge-cliente' : 'badge-general'">
                    {{ item.clienteNombre || 'General' }}
                  </span>
                  <button
                    type="button"
                    class="btn-historial-fila"
                    @click="abrirHistorialFila(item)"
                  >
                    Historial
                  </button>
                </span>
                <span class="fila-fecha">{{ formatFecha(item.fecha) }}</span>
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>

    <!-- Modal historial por producto/medida (fechas anteriores a hoy) -->
    <div
      v-if="abierto && showHistorialModal && historialFilaActiva"
      class="historial-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="historial-precios-titulo"
      @click.self="cerrarHistorial"
    >
      <div class="historial-panel">
        <header class="historial-panel-header">
          <h2 id="historial-precios-titulo">Historial</h2>
          <button type="button" class="btn-cerrar" aria-label="Cerrar historial" @click="cerrarHistorial">✕</button>
        </header>
        <p class="historial-subtitulo">
          {{ historialFilaActiva.producto }}
          <span class="historial-sub-badge" :class="historialFilaActiva.esCliente ? 'badge-cliente' : 'badge-general'">
            {{ historialFilaActiva.etiquetaCliente }}
          </span>
        </p>
        <p class="historial-intro muted">
          Precios con vigencia <strong>anterior a hoy</strong> ({{ fechaHoyLegible }}).
        </p>
        <p v-if="!historialFilaActiva.filas.length" class="historial-vacio muted">
          No hay registros anteriores a hoy para esta medida.
        </p>
        <div v-else class="historial-table-wrap">
          <table class="historial-table">
            <thead>
              <tr>
                <th>Fecha vigencia</th>
                <th>Cliente</th>
                <th>Precio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in historialFilaActiva.filas" :key="row.id">
                <td data-label="Fecha">{{ formatFecha(row.fecha) }}</td>
                <td data-label="Cliente">
                  <span class="badge-hist" :class="row.clienteEtiqueta ? 'badge-cliente' : 'badge-general'">
                    {{ row.clienteEtiqueta || 'General' }}
                  </span>
                </td>
                <td data-label="Precio" class="cell-precio">${{ formatNum(row.precio) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button type="button" class="btn-cerrar-historial" @click="cerrarHistorial">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import {
  cargarPreciosParaNotaVenta,
  normalizarNombreProductoPrecio,
  agruparPreciosNotaVentaDesdeDocs,
  COLECCION_PRECIOS_NOTA_VENTA
} from '@/utils/preciosVentaCatalogo';
import {
  obtenerFechaActualISO,
  normalizarFechaISO,
  obtenerTimestamp,
  formatearFechaParaMostrar
} from '@/utils/dateUtils';

export default {
  name: 'PreciosNotaVentaModal',
  props: {
    /** Clientes de la nota: mismos objetos que el select ({ id, name }) */
    clientesLista: {
      type: Array,
      default: () => []
    },
    /** Valor actual del select Cliente en la nota (nombre visible) */
    clienteNombreNota: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      abierto: false,
      cargando: false,
      guardando: false,
      preciosAgrupados: [],
      nombresProducto: [],
      rawDocs: [],
      newPrice: this.estadoFormularioInicial(),
      showHistorialModal: false,
      historialFilaActiva: null
    };
  },
  computed: {
    fechaHoyISO() {
      return obtenerFechaActualISO();
    },
    fechaHoyLegible() {
      try {
        return formatearFechaParaMostrar(this.fechaHoyISO);
      } catch {
        return this.fechaHoyISO;
      }
    },
    clientesParaChips() {
      const seen = new Set();
      const out = [];
      for (const c of this.clientesLista || []) {
        const nombre = c && c.name != null ? String(c.name).trim() : '';
        if (!nombre || seen.has(nombre)) continue;
        seen.add(nombre);
        out.push({ key: c.id || nombre, nombre });
      }
      return out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    },
    preciosVista() {
      const hoy = this.fechaHoyISO;
      const rows = this.preciosAgrupados.map((p) => {
        const historialAnt = (p.historial || []).filter(
          (h) => normalizarFechaISO(h.fecha) < hoy
        );
        const filas = historialAnt
          .map((h) => {
            const clienteEtiqueta =
              h.clienteNombre != null && String(h.clienteNombre).trim() !== ''
                ? String(h.clienteNombre).trim()
                : p.clienteNombre || null;
            return {
              id: h.id,
              fecha: h.fecha,
              precio: h.precio,
              clienteEtiqueta
            };
          })
          .sort((a, b) => normalizarFechaISO(b.fecha).localeCompare(normalizarFechaISO(a.fecha)));
        return {
          clave: p.clienteNombre ? `${p.producto}||${p.clienteNombre}` : p.producto,
          producto: p.producto,
          precio: p.precio,
          fecha: p.fecha,
          clienteNombre: p.clienteNombre || null,
          historialFilas: filas
        };
      });
      return rows.sort((a, b) => {
        const c = a.producto.localeCompare(b.producto, 'es');
        if (c !== 0) return c;
        const ga = a.clienteNombre ? 1 : 0;
        const gb = b.clienteNombre ? 1 : 0;
        return ga - gb;
      });
    }
  },
  watch: {
    clienteNombreNota(nombre) {
      if (nombre && this.abierto) {
        this.aplicarClienteDeNotaAlFormulario();
      }
    },
    abierto(val) {
      if (val) {
        this.aplicarClienteDeNotaAlFormulario();
      } else {
        this.cerrarHistorial();
      }
    }
  },
  methods: {
    abrirHistorialFila(item) {
      const etiquetaCliente = item.clienteNombre || 'General';
      this.historialFilaActiva = {
        producto: item.producto,
        etiquetaCliente,
        esCliente: !!item.clienteNombre,
        filas: item.historialFilas || []
      };
      this.showHistorialModal = true;
    },
    aplicarClienteDeNotaAlFormulario() {
      const n = this.clienteNombreNota && String(this.clienteNombreNota).trim();
      if (!n) return;
      const existe = this.clientesParaChips.some((c) => c.nombre === n);
      if (existe) {
        this.newPrice.esClienteEspecifico = true;
        this.newPrice.clienteNombre = n;
      }
    },
    estadoFormularioInicial() {
      return {
        producto: '',
        precio: null,
        fecha: obtenerFechaActualISO(),
        esClienteEspecifico: false,
        clienteNombre: ''
      };
    },
    formatNum(v) {
      if (v == null || v === '') return '0.00';
      return Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    formatFecha(f) {
      try {
        return formatearFechaParaMostrar(f);
      } catch {
        return f || '—';
      }
    },
    async abrir() {
      this.abierto = true;
      await this.recargarLista();
      this.aplicarClienteDeNotaAlFormulario();
    },
    cerrar() {
      this.cerrarHistorial();
      this.abierto = false;
    },
    cerrarHistorial() {
      this.showHistorialModal = false;
      this.historialFilaActiva = null;
    },
    async recargarLista() {
      this.cargando = true;
      try {
        const { raw, productosCatalogo } = await cargarPreciosParaNotaVenta();
        this.rawDocs = raw;
        this.nombresProducto = productosCatalogo;
        this.preciosAgrupados = agruparPreciosNotaVentaDesdeDocs(raw);
      } catch (e) {
        console.error('[PreciosNotaVenta]', e);
        alert('No se pudo cargar el catálogo de precios de la nota.');
      } finally {
        this.cargando = false;
      }
    },
    async guardarPrecio() {
      if (!this.newPrice.producto || this.newPrice.precio == null || !this.newPrice.fecha) {
        alert('Completa producto, precio y fecha.');
        return;
      }
      if (this.newPrice.esClienteEspecifico) {
        const cn = String(this.newPrice.clienteNombre || '').trim();
        if (!cn) {
          alert('Selecciona un cliente para el precio específico.');
          return;
        }
      }

      const productoNormalizado = normalizarNombreProductoPrecio(this.newPrice.producto);

      if (!this.newPrice.esClienteEspecifico) {
        const hayEspecificos = this.preciosAgrupados.some(
          (p) => p.producto === productoNormalizado && p.clienteNombre
        );
        if (
          hayEspecificos &&
          !window.confirm(
            'Ya existen precios por cliente para este producto. ¿Deseas guardar un precio general de todos modos?'
          )
        ) {
          return;
        }
      }

      this.guardando = true;
      try {
        const fechaNormalizada = normalizarFechaISO(this.newPrice.fecha);
        const nombreProducto = productoNormalizado.toLowerCase();
        let categoria = 'Otros';
        if (nombreProducto.includes('s/c') || nombreProducto.match(/\d+\/\d+/)) {
          categoria = 'Camarón S/C';
        } else if (nombreProducto.includes('c/c')) {
          categoria = 'Camarón C/C';
        }

        const docData = {
          producto: productoNormalizado,
          precio: parseFloat(this.newPrice.precio),
          fecha: fechaNormalizada,
          categoria,
          timestamp: obtenerTimestamp(),
          fechaCreacion: obtenerFechaActualISO(),
          horaCreacion: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        };

        if (this.newPrice.esClienteEspecifico) {
          docData.clienteNombre = String(this.newPrice.clienteNombre).trim();
        }

        await addDoc(collection(db, COLECCION_PRECIOS_NOTA_VENTA), docData);

        const nota = this.clienteNombreNota && String(this.clienteNombreNota).trim();
        const enLista = nota && this.clientesParaChips.some((c) => c.nombre === nota);
        this.newPrice = {
          ...this.estadoFormularioInicial(),
          esClienteEspecifico: !!enLista,
          clienteNombre: enLista ? nota : ''
        };

        await this.recargarLista();
        this.$emit('catalogo-actualizado');
      } catch (e) {
        console.error('[PreciosNotaVenta] guardar', e);
        alert('Error al guardar el precio.');
      } finally {
        this.guardando = false;
      }
    }
  }
};
</script>

<style scoped>
.precios-nota-venta-root {
  display: inline-block;
  width: 100%;
  max-width: 100%;
}

.btn-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 10px 16px;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  color: #f7eeff;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(59, 130, 246, 0.9));
  box-shadow: 0 0 18px rgba(168, 85, 247, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.btn-open:hover {
  transform: translateY(-1px);
  box-shadow: 0 0 22px rgba(62, 248, 255, 0.25);
}

.btn-icon {
  font-size: 1.1rem;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
  padding-top: max(16px, env(safe-area-inset-top));
  background: rgba(5, 4, 25, 0.78);
  overflow-y: auto;
}

.panel {
  width: 100%;
  max-width: 520px;
  margin-bottom: 24px;
  border-radius: 16px;
  border: 1px solid rgba(62, 248, 255, 0.35);
  background: linear-gradient(145deg, rgba(24, 12, 48, 0.98), rgba(18, 34, 74, 0.96));
  box-shadow: 0 0 0 1px rgba(255, 95, 217, 0.15) inset, 0 20px 48px rgba(2, 2, 20, 0.75);
  color: #f7eeff;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid rgba(62, 248, 255, 0.2);
}

.panel-header h2 {
  margin: 0;
  font-size: 1.15rem;
  color: #67f5ff;
  text-shadow: 0 0 12px rgba(62, 248, 255, 0.35);
}

.btn-cerrar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 111, 145, 0.25);
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
}

.btn-cerrar:hover {
  background: rgba(255, 111, 145, 0.4);
}

.intro {
  margin: 0;
  padding: 14px 18px;
  font-size: 0.88rem;
  line-height: 1.5;
  color: rgba(210, 198, 255, 0.92);
  border-bottom: 1px solid rgba(62, 248, 255, 0.12);
}

.intro strong {
  color: #9ae6ff;
}

.aviso-sin-clientes {
  margin: 12px 0 0;
  padding: 10px 12px;
  font-size: 0.85rem;
  border-radius: 10px;
  background: rgba(255, 180, 100, 0.12);
  border: 1px solid rgba(255, 180, 100, 0.35);
  color: #ffd4a8;
}

.form-section,
.lista-section {
  padding: 16px 18px;
}

.section-title {
  margin: 0 0 12px;
  font-size: 1rem;
  color: #ff9fe5;
}

.historial-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
  padding-top: max(16px, env(safe-area-inset-top));
  background: rgba(3, 2, 18, 0.88);
  overflow-y: auto;
}

.historial-panel {
  width: 100%;
  max-width: 640px;
  margin-bottom: 24px;
  border-radius: 16px;
  border: 1px solid rgba(255, 159, 229, 0.35);
  background: linear-gradient(155deg, rgba(28, 14, 52, 0.98), rgba(16, 28, 72, 0.97));
  box-shadow: 0 0 0 1px rgba(62, 248, 255, 0.12) inset, 0 24px 56px rgba(0, 0, 0, 0.65);
  color: #f7eeff;
}

.historial-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 159, 229, 0.22);
}

.historial-panel-header h2 {
  margin: 0;
  font-size: 1.05rem;
  color: #ffb8e8;
}

.historial-subtitulo {
  margin: 0;
  padding: 8px 16px 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #e8e0ff;
  line-height: 1.45;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.historial-sub-badge {
  font-size: 0.72rem;
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 600;
}

.historial-vacio {
  padding: 12px 16px 8px;
  margin: 0;
}

.historial-intro {
  margin: 0;
  padding: 10px 16px;
  font-size: 0.82rem;
  line-height: 1.45;
}

.historial-intro strong {
  color: #9ae6ff;
}

.historial-table-wrap {
  padding: 0 16px 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.historial-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.historial-table th,
.historial-table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid rgba(62, 248, 255, 0.15);
}

.historial-table th {
  color: #67f5ff;
  font-weight: 600;
  white-space: nowrap;
}

.cell-precio {
  font-weight: 600;
  color: #7df9ff;
  white-space: nowrap;
}

.badge-hist {
  font-size: 0.72rem;
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 600;
  display: inline-block;
}

.btn-cerrar-historial {
  display: block;
  width: calc(100% - 32px);
  margin: 8px 16px 16px;
  padding: 12px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

@media (max-width: 520px) {
  .historial-table thead {
    display: none;
  }

  .historial-table tr {
    display: block;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(62, 248, 255, 0.2);
  }

  .historial-table td {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    border: none;
    padding: 6px 0;
  }

  .historial-table td::before {
    content: attr(data-label);
    flex-shrink: 0;
    color: rgba(180, 170, 220, 0.9);
    font-weight: 600;
    font-size: 0.78rem;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 480px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }

  .form-grid .field:first-child {
    grid-column: 1 / -1;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.8rem;
  color: rgba(210, 198, 255, 0.85);
}

.field-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(62, 248, 255, 0.35);
  background: rgba(11, 14, 38, 0.88);
  color: #f7eeff;
  font-size: 1rem;
}

.field-input::placeholder {
  color: rgba(210, 198, 255, 0.45);
}

.check-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  font-size: 0.9rem;
  cursor: pointer;
  color: rgba(245, 236, 255, 0.95);
}

.check-row input {
  width: 18px;
  height: 18px;
  accent-color: #8b5cf6;
}

.clientes-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.chip {
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(62, 248, 255, 0.35);
  background: rgba(12, 18, 48, 0.6);
  color: #e8e0ff;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.chip.activo {
  background: rgba(139, 92, 246, 0.45);
  border-color: rgba(255, 159, 229, 0.6);
  color: #fff;
}

.hint-nota {
  margin: 12px 0 0;
  padding: 10px 12px;
  font-size: 0.82rem;
  line-height: 1.45;
  border-radius: 10px;
  background: rgba(52, 245, 197, 0.1);
  border: 1px solid rgba(52, 245, 197, 0.25);
  color: rgba(200, 255, 240, 0.95);
}

.btn-guardar {
  margin-top: 16px;
  width: 100%;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #ff5fd9, #6366f1);
}

.btn-guardar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.lista-section {
  border-top: 1px solid rgba(62, 248, 255, 0.15);
  max-height: min(42vh, 320px);
  display: flex;
  flex-direction: column;
}

.muted {
  margin: 0;
  font-size: 0.88rem;
  color: rgba(180, 170, 220, 0.75);
}

.lista-precios {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch;
}

.fila-precio {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(62, 248, 255, 0.12);
  font-size: 0.88rem;
}

.fila-producto {
  grid-column: 1 / -1;
  font-weight: 600;
  color: #f0e8ff;
  word-break: break-word;
}

.fila-monto {
  color: #67f5ff;
  font-weight: 600;
}

.fila-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}

.fila-meta-bloque {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.btn-historial-fila {
  padding: 4px 10px;
  border: 1px solid rgba(255, 159, 229, 0.45);
  border-radius: 8px;
  background: rgba(255, 95, 217, 0.15);
  color: #ffc8ec;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  line-height: 1.2;
  white-space: nowrap;
  transition: background 0.15s, border-color 0.15s;
}

.btn-historial-fila:hover {
  background: rgba(255, 95, 217, 0.28);
  border-color: rgba(62, 248, 255, 0.4);
}

.fila-fecha {
  font-size: 0.78rem;
  color: rgba(180, 170, 220, 0.85);
}

.badge {
  font-size: 0.72rem;
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 600;
}

.badge-general {
  background: rgba(62, 248, 255, 0.15);
  color: #7df9ff;
}

.badge-cliente {
  background: rgba(255, 95, 217, 0.2);
  color: #ffb8e8;
}
</style>
