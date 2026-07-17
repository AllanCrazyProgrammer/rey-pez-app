<template>
  <article class="lot-card" :class="{ exhausted: lote.agotado }">
    <header class="lot-header">
      <div class="supplier-block">
        <div class="supplier-icon"><i class="fas fa-truck"></i></div>
        <div>
          <div class="lot-meta">
            <span>{{ formatDate(lote.fecha) }}</span>
            <span>LOTE #{{ lote.folio }}</span>
          </div>
          <h3>{{ lote.proveedor }}</h3>
          <p>{{ lote.producto }}</p>
        </div>
      </div>
      <span class="status-badge" :class="lote.agotado ? 'closed' : 'open'">
        {{ lote.agotado ? 'Agotado' : 'Con existencia' }}
      </span>
    </header>

    <div class="purchase-strip">
      <span>Compra: <strong>{{ formatNumber(lote.kilos) }} kg</strong></span>
      <span>A <strong>{{ formatMoney(lote.precio) }}/kg</strong></span>
      <span>Total: <strong>{{ formatMoney(lote.totalCompra) }}</strong></span>
    </div>

    <div class="stock-block">
      <div class="stock-heading">
        <span>Existencia del lote</span>
        <strong>{{ formatNumber(lote.kilosInventario) }} de {{ formatNumber(lote.kilos) }} kg</strong>
      </div>
      <div class="progress-track" aria-hidden="true">
        <span :style="{ width: lote.porcentajeExistencia + '%' }"></span>
      </div>
    </div>

    <div class="metrics-grid">
      <div>
        <span>Crudo utilizado</span>
        <strong>{{ formatNumber(lote.kilosCrudoUtilizados) }} kg</strong>
        <small>{{ formatNumber(lote.kilosVendidos) }} kg vendidos</small>
      </div>
      <div>
        <span>Ingresos</span>
        <strong>{{ formatMoney(lote.ingresos) }}</strong>
      </div>
      <div class="profit" :class="{ negative: lote.utilidad < 0 }">
        <span>Utilidad</span>
        <strong>{{ formatMoney(lote.utilidad) }}</strong>
      </div>
      <div class="debt">
        <span>Debo</span>
        <strong>{{ formatMoney(lote.deuda) }}</strong>
      </div>
    </div>

    <p v-if="lote.notas" class="lot-notes"><i class="fas fa-sticky-note"></i> {{ lote.notas }}</p>

    <div class="primary-actions">
      <button
        class="button sale"
        type="button"
        :disabled="lote.agotado"
        @click="$emit('registrar-venta', lote)"
      >
        <i class="fas fa-plus"></i> Registrar venta
      </button>
      <button
        class="button payment"
        type="button"
        :disabled="lote.deuda <= 0"
        @click="$emit('registrar-abono', lote)"
      >
        <i class="fas fa-wallet"></i> Registrar abono
      </button>
      <button class="button details" type="button" @click="expanded = !expanded">
        <i :class="expanded ? 'fas fa-chevron-up' : 'fas fa-list-ul'"></i>
        {{ expanded ? 'Ocultar movimientos' : 'Ver movimientos' }}
        <span class="movement-count">{{ lote.ventas.length + lote.abonos.length }}</span>
      </button>
    </div>

    <div v-if="expanded" class="movements-panel">
      <section class="movement-section">
        <div class="section-heading">
          <h4>Ventas de este lote</h4>
          <span>{{ lote.ventas.length }}</span>
        </div>
        <p v-if="!lote.ventas.length" class="empty-row">Todavía no hay ventas en esta compra.</p>
        <div v-else class="movement-list">
          <div v-for="venta in lote.ventas" :key="venta.segmentoId || venta.id" class="movement-row">
            <div>
              <strong>{{ venta.cliente }}</strong>
              <small>{{ formatDate(venta.fecha) }} · {{ formatNumber(venta.kilosCrudo) }} kg crudo → {{ formatNumber(venta.kilos) }} kg vendidos</small>
              <small>{{ formatMoney(venta.totalVenta) }}/kg vendido</small>
              <small v-if="venta.notas">{{ venta.notas }}</small>
            </div>
            <div class="movement-amount">
              <strong>{{ formatMoney(venta.kilos * venta.totalVenta) }}</strong>
              <button
                v-if="!venta.asignacionHistorica"
                class="edit-movement"
                type="button"
                title="Editar venta"
                @click="$emit('editar-venta', { venta, lote })"
              >
                <i class="fas fa-pen"></i>
              </button>
              <button type="button" title="Eliminar venta" @click="$emit('eliminar-movimiento', { tipo: 'venta', id: venta.id })">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="movement-section payments-section">
        <div class="section-heading">
          <h4>Pagos de esta compra</h4>
          <span>{{ lote.abonos.length + (lote.pagadoInicial > 0 ? 1 : 0) }}</span>
        </div>
        <div v-if="lote.pagadoInicial > 0" class="movement-row initial-payment">
          <div>
            <strong>Pago al comprar</strong>
            <small>{{ formatDate(lote.fecha) }}</small>
          </div>
          <strong>{{ formatMoney(lote.pagadoInicial) }}</strong>
        </div>
        <p v-if="!lote.abonos.length && lote.pagadoInicial <= 0" class="empty-row">Todavía no hay abonos a esta compra.</p>
        <div class="movement-list">
          <div v-for="abono in lote.abonos" :key="abono.id" class="movement-row">
            <div>
              <strong>{{ abono.metodo || 'Abono' }}</strong>
              <small>{{ formatDate(abono.fecha) }}<template v-if="abono.notas"> · {{ abono.notas }}</template></small>
            </div>
            <div class="movement-amount">
              <strong>{{ formatMoney(abono.monto) }}</strong>
              <button type="button" title="Eliminar abono" @click="$emit('eliminar-movimiento', { tipo: 'abono', id: abono.id })">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div class="danger-zone">
        <button class="edit-lot" type="button" @click="$emit('editar-lote', lote)">
          <i class="fas fa-pen"></i> Editar datos de la compra
        </button>
        <button type="button" @click="$emit('eliminar-lote', lote)">
          <i class="fas fa-trash-alt"></i> Eliminar compra
        </button>
      </div>
    </div>
  </article>
</template>

<script>
export default {
  name: 'LoteCompraCard',
  props: {
    lote: {
      type: Object,
      required: true
    }
  },
  data() {
    return { expanded: false };
  },
  methods: {
    formatMoney(value) {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
      }).format(Number(value) || 0);
    },
    formatNumber(value) {
      return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(Number(value) || 0);
    },
    formatDate(value) {
      if (!value) return 'Sin fecha';
      const parts = String(value).split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return value;
    }
  }
};
</script>

<style scoped>
.lot-card {
  overflow: hidden;
  border: 1px solid var(--border-soft);
  border-left: 4px solid var(--accent);
  background: var(--surface);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
}

.lot-card.exhausted {
  border-left-color: var(--text-dim);
}

.lot-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 14px;
}

.supplier-block {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 13px;
}

.supplier-icon {
  display: grid;
  flex: 0 0 43px;
  width: 43px;
  height: 43px;
  place-items: center;
  border: 1px solid rgba(179, 136, 255, 0.45);
  background: rgba(179, 136, 255, 0.08);
  color: var(--accent);
}

.lot-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--text-dim);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.66rem;
  letter-spacing: 0.08em;
}

.lot-meta span + span::before {
  margin-right: 8px;
  content: '•';
}

.supplier-block h3 {
  margin: 3px 0 0;
  color: var(--text-main);
  font-size: 1.75rem;
  line-height: 1;
}

.supplier-block p {
  margin: 4px 0 0;
  color: var(--accent-soft);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.78rem;
}

.status-badge {
  flex: 0 0 auto;
  padding: 6px 9px;
  border: 1px solid currentColor;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.status-badge.open { color: var(--success); background: rgba(97, 255, 154, 0.06); }
.status-badge.closed { color: var(--text-dim); background: rgba(255, 255, 255, 0.03); }

.purchase-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 9px 20px;
  padding: 10px 20px;
  border-top: 1px solid var(--border-soft);
  border-bottom: 1px solid var(--border-soft);
  background: rgba(0, 0, 0, 0.18);
  color: var(--text-muted);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.76rem;
}

.purchase-strip strong { color: var(--text-main); font-weight: 400; }

.stock-block {
  padding: 16px 20px 10px;
}

.stock-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 7px;
  color: var(--text-muted);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.73rem;
}

.stock-heading strong { color: var(--accent); font-weight: 400; }

.progress-track {
  height: 7px;
  border: 1px solid rgba(179, 136, 255, 0.25);
  background: rgba(0, 0, 0, 0.35);
}

.progress-track span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #7c4dff, var(--accent));
  box-shadow: 0 0 12px rgba(179, 136, 255, 0.5);
  transition: width 0.25s ease;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 7px 20px 16px;
}

.metrics-grid > div {
  min-width: 0;
  padding: 7px 12px;
  border-left: 1px solid var(--border-soft);
}

.metrics-grid > div:first-child { border-left: 0; padding-left: 0; }

.metrics-grid span,
.metrics-grid strong,
.metrics-grid small {
  display: block;
}

.metrics-grid span {
  color: var(--text-dim);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.64rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.metrics-grid strong {
  overflow: hidden;
  margin-top: 4px;
  color: var(--text-main);
  font-size: 1.25rem;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metrics-grid small {
  overflow: hidden;
  margin-top: 2px;
  color: var(--accent-soft);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.58rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metrics-grid .profit strong { color: var(--success); }
.metrics-grid .profit.negative strong { color: var(--danger); }
.metrics-grid .debt strong { color: var(--amber); }

.lot-notes {
  margin: 0 20px 14px;
  color: var(--text-muted);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.72rem;
}

.lot-notes i { margin-right: 5px; color: var(--amber); }

.primary-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1.1fr;
  gap: 8px;
  padding: 12px 20px 18px;
  border-top: 1px solid var(--border-soft);
}

.button {
  min-height: 38px;
  border: 1px solid currentColor;
  background: transparent;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.72rem;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}

.button:hover:not(:disabled) { transform: translateY(-1px); }
.button:disabled { opacity: 0.35; cursor: not-allowed; }
.button i { margin-right: 5px; }
.button.sale { color: var(--cyan); }
.button.sale:hover:not(:disabled) { background: rgba(79, 195, 255, 0.08); }
.button.payment { color: var(--amber); }
.button.payment:hover:not(:disabled) { background: rgba(255, 193, 7, 0.08); }
.button.details { color: var(--text-muted); }
.button.details:hover { background: rgba(255, 255, 255, 0.04); }

.movement-count {
  display: inline-grid;
  min-width: 18px;
  height: 18px;
  margin-left: 4px;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.64rem;
}

.movements-panel {
  padding: 0 20px 18px;
  border-top: 1px solid var(--border-soft);
  background: rgba(0, 0, 0, 0.13);
}

.movement-section { padding-top: 16px; }

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
}

.section-heading h4 {
  margin: 0;
  color: var(--accent-soft);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.72rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.section-heading span {
  color: var(--text-dim);
  font-size: 1rem;
}

.movement-list { display: grid; gap: 5px; }

.movement-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 11px;
  border: 1px solid var(--border-soft);
  background: rgba(0, 0, 0, 0.2);
}

.movement-row > div:first-child { min-width: 0; }
.movement-row strong { color: var(--text-main); font-size: 1rem; font-weight: 400; }
.movement-row small { display: block; color: var(--text-dim); font-family: 'Share Tech Mono', monospace; font-size: 0.66rem; }
.initial-payment > strong,
.payments-section .movement-amount > strong { color: var(--amber); }

.movement-amount {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 9px;
}

.movement-amount button,
.danger-zone button {
  border: 0;
  background: transparent;
  color: var(--danger);
  cursor: pointer;
}

.movement-amount .edit-movement {
  color: var(--cyan);
}

.empty-row {
  margin: 0;
  padding: 12px;
  border: 1px dashed var(--border-soft);
  color: var(--text-dim);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.7rem;
  text-align: center;
}

.danger-zone {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 107, 107, 0.2);
  text-align: right;
}

.danger-zone button { font-family: 'Share Tech Mono', monospace; font-size: 0.68rem; }
.danger-zone .edit-lot { color: var(--cyan); }

@media (max-width: 680px) {
  .lot-header { align-items: flex-start; padding: 16px; }
  .supplier-icon { display: none; }
  .purchase-strip,
  .stock-block,
  .metrics-grid,
  .primary-actions,
  .movements-panel { padding-left: 16px; padding-right: 16px; }
  .metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 0; }
  .metrics-grid > div:nth-child(3) { border-left: 0; padding-left: 0; }
  .primary-actions { grid-template-columns: 1fr 1fr; }
  .button.details { grid-column: 1 / -1; }
  .status-badge { font-size: 0; padding: 5px; }
  .status-badge::after { content: ''; display: block; width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
  .movement-row { align-items: flex-start; }
}
</style>
