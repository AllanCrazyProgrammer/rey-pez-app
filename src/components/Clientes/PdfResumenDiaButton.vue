<template>
  <button
    class="btn-pdf-resumen"
    type="button"
    :disabled="!tieneDatos"
    @click="generarPdf"
  >
    📄 PDF del día
  </button>
</template>

<script>
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default {
  name: 'PdfResumenDiaButton',
  props: {
    fechaLegible: {
      type: String,
      default: ''
    },
    fechaIso: {
      type: String,
      default: ''
    },
    totalDia: {
      type: Number,
      default: 0
    },
    montoEfectivo: {
      type: Number,
      default: 0
    },
    montoCheque: {
      type: Number,
      default: 0
    },
    montoCuentas: {
      type: Number,
      default: 0
    },
    transacciones: {
      type: Array,
      default: () => []
    },
    clientesAgrupados: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    tieneDatos() {
      return (this.transacciones || []).length > 0;
    },
    hayCheques() {
      return (this.montoCheque || 0) > 0;
    },
    nombreArchivo() {
      const fecha = this.fechaIso || (this.transacciones?.[0]?.fecha) || 'dia';
      const limpio = String(fecha).replace(/[^0-9-]/g, '') || 'dia';
      return `transacciones_${limpio}.pdf`;
    }
  },
  methods: {
    generarPdf() {
      if (!this.tieneDatos) return;

      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const inicioY = 60;

      doc.setFontSize(20);
      doc.setTextColor(34, 34, 34);
      doc.text('Resumen diario de transacciones', 40, inicioY);

      doc.setFontSize(14);
      doc.setTextColor(80, 80, 80);
      doc.text(this.fechaLegible || 'Fecha no disponible', 40, inicioY + 24);

      doc.setFontSize(18);
      doc.setTextColor(25, 128, 56);
      doc.text(`Total del día: $${this.formatearNumero(this.totalDia)}`, 40, inicioY + 55);

      doc.setFontSize(12);
      doc.setTextColor(55, 96, 176);
      const balanceLine = this.hayCheques
        ? `Efectivo: $${this.formatearNumero(this.montoEfectivo)}   |   Cheques: $${this.formatearNumero(this.montoCheque)}   |   Cuentas: $${this.formatearNumero(this.montoCuentas)}`
        : `Efectivo: $${this.formatearNumero(this.montoEfectivo)}   |   Cuentas: $${this.formatearNumero(this.montoCuentas)}`;
      doc.text(balanceLine, 40, inicioY + 75);

      const resumenClientes = this.buildResumenClientes();
      const startY = inicioY + 95;

      if (resumenClientes.length) {
        const columns = [
          { header: 'Cliente', dataKey: 'clienteLabel' },
          { header: 'Efectivo', dataKey: 'efectivo' }
        ];
        if (this.hayCheques) {
          columns.push({ header: 'Cheques', dataKey: 'cheques' });
        }
        columns.push({ header: 'Transf/Dep', dataKey: 'cuentas' });
        columns.push({ header: 'Total', dataKey: 'total' });

        const columnStyles = {
          efectivo: { halign: 'right' },
          cuentas: { halign: 'right' },
          total: { halign: 'right' }
        };
        if (this.hayCheques) {
          columnStyles.cheques = { halign: 'right' };
        }

        autoTable(doc, {
          startY,
          head: [columns.map(col => col.header)],
          body: resumenClientes,
          columns,
          styles: {
            fontSize: 13,
            cellPadding: 8,
            lineWidth: 0.5,
            lineColor: [200, 200, 200]
          },
          headStyles: {
            fillColor: [55, 96, 176],
            textColor: 255,
            fontSize: 14,
            lineWidth: 0.6,
            lineColor: [160, 160, 160]
          },
          columnStyles,
          didParseCell: (data) => {
            if (data.section === 'body') {
              const color = data.row.raw?.color || [51, 51, 51];
              data.cell.styles.textColor = color;
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });
      }

      doc.save(this.nombreArchivo);
    },
    formatearNumero(valor) {
      return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(valor || 0);
    },
    formatearHora(timestamp) {
      const fecha = timestamp ? new Date(timestamp) : null;
      if (!fecha || isNaN(fecha)) return '';

      return fecha.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    buildResumenClientes() {
      const mapaNombres = {
        otilio: 'Otilio',
        joselito: 'Joselito',
        catarro: 'Catarro',
        ozuna: 'Ozuna',
        veronica: 'Verónica',
        mexico: 'México'
      };

      const mapaColores = {
        otilio: [243, 156, 18],
        joselito: [52, 152, 219],
        catarro: [231, 76, 60],
        ozuna: [39, 174, 96],
        veronica: [205, 98, 10],
        mexico: [55, 96, 176]
      };

      const filas = Object.entries(this.clientesAgrupados || {})
        .filter(([, lista]) => Array.isArray(lista) && lista.length)
        .map(([cliente, lista]) => {
          const total = lista.reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0);
          const efectivo = lista
            .filter(t => t.tipo === 'efectivo')
            .reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0);
          const cheques = lista
            .filter(t => t.tipo === 'cheque')
            .reduce((acc, t) => acc + (parseFloat(t.monto) || 0), 0);
          const cuentas = Math.max(0, total - efectivo - cheques);

          return {
            clienteKey: cliente,
            clienteLabel: mapaNombres[cliente] || cliente,
            total: `$${this.formatearNumero(total)}`,
            efectivo: `$${this.formatearNumero(efectivo)}`,
            cheques: this.hayCheques ? `$${this.formatearNumero(cheques)}` : '',
            cuentas: `$${this.formatearNumero(cuentas)}`,
            color: mapaColores[cliente] || [51, 51, 51]
          };
        });

      // Fila total general en negro
      filas.push({
        clienteKey: 'total',
        clienteLabel: 'Total',
        total: `$${this.formatearNumero(this.totalDia)}`,
        efectivo: `$${this.formatearNumero(this.montoEfectivo)}`,
        cheques: this.hayCheques ? `$${this.formatearNumero(this.montoCheque)}` : '',
        cuentas: `$${this.formatearNumero(this.montoCuentas)}`,
        color: [0, 0, 0]
      });

      return filas;
    },
    obtenerClienteTexto(cliente) {
      const mapa = {
        mexico: 'México',
        ozuna: 'Ozuna',
        catarro: 'Catarro',
        joselito: 'Joselito',
        otilio: 'Otilio',
        veronica: 'Verónica'
      };
      return mapa[cliente] || cliente || 'N/D';
    },
    obtenerTipoTexto(tipo, esStash) {
      const base = this.obtenerTipoTextoBase(tipo);
      return esStash ? `📦 ${base}` : base;
    },
    obtenerTipoTextoBase(tipo) {
      const tipos = {
        deposito: 'Depósito',
        transferencia: 'Transferencia',
        efectivo: 'Efectivo',
        cheque: 'Cheque',
        otro: 'Otro'
      };
      return tipos[tipo] || 'Otro';
    }
  }
}
</script>

<style scoped>
.btn-pdf-resumen {
  background: linear-gradient(90deg, #3760b0, #4c7fd8);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 6px rgba(55, 96, 176, 0.35);
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.btn-pdf-resumen:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-pdf-resumen:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(55, 96, 176, 0.4);
}

.btn-pdf-resumen:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .btn-pdf-resumen {
    width: 100%;
    justify-content: center;
  }
}
</style>

