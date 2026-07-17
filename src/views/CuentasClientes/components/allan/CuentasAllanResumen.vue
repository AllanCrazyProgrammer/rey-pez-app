<template>
  <section class="summary-grid" aria-label="Resumen general de la cuenta">
    <article class="summary-card inventory">
      <span class="summary-icon"><i class="fas fa-boxes"></i></span>
      <div>
        <span class="summary-label">Existencia</span>
        <strong>{{ formatNumber(resumen.kilosInventario) }} kg</strong>
        <small>{{ resumen.lotesActivos }} {{ resumen.lotesActivos === 1 ? 'lote' : 'lotes' }} con producto</small>
      </div>
    </article>

    <article class="summary-card sales">
      <span class="summary-icon"><i class="fas fa-hand-holding-usd"></i></span>
      <div>
        <span class="summary-label">Ventas</span>
        <strong>{{ formatMoney(resumen.totalVentas) }}</strong>
        <small>{{ formatNumber(resumen.kilosVendidos) }} kg vendidos</small>
      </div>
    </article>

    <article class="summary-card profit" :class="{ negative: resumen.utilidad < 0 }">
      <span class="summary-icon"><i class="fas fa-chart-line"></i></span>
      <div>
        <span class="summary-label">Utilidad realizada</span>
        <strong>{{ formatMoney(resumen.utilidad) }}</strong>
        <small>Sobre lo que ya se vendió</small>
      </div>
    </article>

    <article class="summary-card debt">
      <span class="summary-icon"><i class="fas fa-file-invoice-dollar"></i></span>
      <div>
        <span class="summary-label">Debo a proveedores</span>
        <strong>{{ formatMoney(resumen.deuda) }}</strong>
        <small>De {{ formatMoney(resumen.totalCompras) }} comprados</small>
      </div>
    </article>
  </section>
</template>

<script>
export default {
  name: 'CuentasAllanResumen',
  props: {
    resumen: {
      type: Object,
      required: true
    }
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
    }
  }
};
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.summary-card {
  display: flex;
  gap: 14px;
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--border-soft);
  border-top: 3px solid var(--card-color);
  background: var(--surface);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.16);
}

.summary-icon {
  display: grid;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--card-color) 50%, transparent);
  background: color-mix(in srgb, var(--card-color) 10%, transparent);
  color: var(--card-color);
  font-size: 1rem;
}

.summary-card > div {
  min-width: 0;
}

.summary-label,
.summary-card small {
  display: block;
}

.summary-label {
  color: var(--text-muted);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.summary-card strong {
  display: block;
  overflow: hidden;
  margin: 5px 0 2px;
  color: var(--card-color);
  font-size: clamp(1.45rem, 2.6vw, 2rem);
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-card small {
  color: var(--text-dim);
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.7rem;
}

.inventory { --card-color: var(--accent); }
.sales { --card-color: var(--cyan); }
.profit { --card-color: var(--success); }
.profit.negative { --card-color: var(--danger); }
.debt { --card-color: var(--amber); }

@media (max-width: 1050px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
