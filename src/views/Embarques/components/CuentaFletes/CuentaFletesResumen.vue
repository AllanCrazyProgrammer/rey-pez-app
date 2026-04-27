<template>
  <section class="resumen-panel" aria-labelledby="resumen-cuenta-title">
    <div class="panel-heading">
      <p class="eyebrow">[RESUMEN]</p>
      <h2 id="resumen-cuenta-title">Estado de cuenta</h2>
    </div>

    <div class="kpi-grid">
      <article class="kpi-card">
        <span class="label">DEUDA_TOTAL</span>
        <strong>{{ formatearMonto(resumen.deudaTotal) }}</strong>
      </article>
      <article class="kpi-card success">
        <span class="label">MONTO_PAGADO</span>
        <strong>{{ formatearMonto(resumen.montoPagado) }}</strong>
      </article>
      <article class="kpi-card info">
        <span class="label">TOTAL_ABONOS</span>
        <strong>{{ formatearMonto(resumen.totalAbonos) }}</strong>
      </article>
      <article class="kpi-card danger">
        <span class="label">SALDO_PENDIENTE</span>
        <strong>{{ formatearMonto(resumen.saldoPendiente) }}</strong>
      </article>
    </div>

    <div class="clientes-grid">
      <article class="cliente-card">
        <h3>Joselito</h3>
        <p><span>LIMPIO</span><strong>{{ resumen.totalTarasLimpioJoselito }}</strong></p>
        <p><span>CRUDO</span><strong>{{ resumen.totalTarasCrudoJoselito }}</strong></p>
        <p><span>TOTAL</span><strong>{{ resumen.totalTarasLimpioJoselito + resumen.totalTarasCrudoJoselito }}</strong></p>
      </article>
      <article class="cliente-card">
        <h3>Lorena</h3>
        <p><span>LIMPIO</span><strong>{{ resumen.totalTarasLimpioVeronica }}</strong></p>
        <p><span>CRUDO</span><strong>{{ resumen.totalTarasCrudoVeronica }}</strong></p>
        <p><span>TOTAL</span><strong>{{ resumen.totalTarasLimpioVeronica + resumen.totalTarasCrudoVeronica }}</strong></p>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: 'CuentaFletesResumen',
  props: {
    resumen: {
      type: Object,
      required: true
    },
    formatearMonto: {
      type: Function,
      required: true
    }
  }
}
</script>

<style scoped>
.resumen-panel {
  padding: clamp(16px, 2.5vw, 28px);
  border-bottom: 1px solid var(--terminal-border);
}

.panel-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: baseline;
  margin-bottom: 16px;
}

.eyebrow,
h2,
h3,
p {
  margin: 0;
}

.eyebrow {
  color: var(--amber);
  font-family: 'Share Tech Mono', monospace;
}

h2 {
  font-size: clamp(1.8rem, 3vw, 3rem);
  text-shadow: 0 0 12px var(--matrix-green-glow);
}

.kpi-grid,
.clientes-grid {
  display: grid;
  gap: 14px;
}

.kpi-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.clientes-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 14px;
}

.kpi-card,
.cliente-card {
  border: 1px solid var(--terminal-border);
  background: var(--terminal-panel);
  padding: 16px;
  box-shadow: inset 0 0 28px rgba(0, 255, 65, 0.04);
}

.label,
.cliente-card span {
  display: block;
  color: #9ef8b5;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.82rem;
  letter-spacing: 0.8px;
}

.kpi-card strong {
  display: block;
  margin-top: 8px;
  font-size: clamp(1.7rem, 3vw, 2.6rem);
  line-height: 1;
}

.kpi-card.success strong { color: var(--matrix-green); }
.kpi-card.info strong { color: var(--info); }
.kpi-card.danger strong { color: #ff8da2; }

.cliente-card h3 {
  color: var(--amber);
  margin-bottom: 12px;
  font-size: 1.65rem;
}

.cliente-card p {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid rgba(0, 255, 65, 0.14);
}

.cliente-card strong {
  font-size: 1.35rem;
}

@media (max-width: 1020px) {
  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .panel-heading,
  .clientes-grid {
    grid-template-columns: 1fr;
  }

  .panel-heading {
    display: block;
  }

  .kpi-grid {
    grid-template-columns: 1fr;
  }
}
</style>
