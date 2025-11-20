<template>
  <button @click="generarPDF" class="btn-reporte-semanal" :disabled="generando">
    {{ generando ? 'Generando PDF...' : '📄 Descargar PDF' }}
  </button>
</template>

<script>
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import moment from 'moment';

export default {
  name: 'ReporteSemanalPDFButton',
  props: {
    reporteData: {
      type: Object,
      required: true,
      validator: (value) => {
        return value.hasOwnProperty('totalVenta') &&
               value.hasOwnProperty('totalAbonado') &&
               value.hasOwnProperty('faltante') &&
               value.hasOwnProperty('startDate') &&
               value.hasOwnProperty('endDate');
      }
    },
    detalleVentas: {
      type: Array,
      required: true
    },
    detalleAbonos: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      generando: false
    };
  },
  methods: {
    formatNumber(value) {
      return value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    
    generarPDF() {
      this.generando = true;
      
      try {
        const doc = new jsPDF('p', 'mm', 'letter');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 20;

        // Encabezado
        doc.setFillColor(255, 140, 0);
        doc.rect(0, 0, pageWidth, 20, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE SEMANAL - Cuentas Veronica', pageWidth / 2, 13, { align: 'center' });

        yPosition = 28;

        // Rango de fechas y resumen en una sola sección compacta
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text(`Periodo: ${this.reporteData.startDate} - ${this.reporteData.endDate}`, pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 6;

        // Resumen general más compacto
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(15, yPosition, pageWidth - 30, 25, 2, 2, 'F');
        
        yPosition += 7;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Enviado en Venta:', 20, yPosition);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${this.formatNumber(this.reporteData.totalVenta)}`, pageWidth - 20, yPosition, { align: 'right' });
        
        yPosition += 6;
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(76, 175, 80);
        doc.text('Total Abonado:', 20, yPosition);
        doc.setFont('helvetica', 'bold');
        doc.text(`$${this.formatNumber(this.reporteData.totalAbonado)}`, pageWidth - 20, yPosition, { align: 'right' });
        
        yPosition += 6;
        
        doc.setFont('helvetica', 'bold');
        // Si el faltante es negativo, significa que abonó más de lo que vendió
        if (this.reporteData.faltante < 0) {
          doc.setTextColor(33, 150, 243); // Azul
          doc.text('Abono a cuenta:', 20, yPosition);
          doc.setFont('helvetica', 'bold');
          doc.text(`$${this.formatNumber(Math.abs(this.reporteData.faltante))}`, pageWidth - 20, yPosition, { align: 'right' });
        } else {
          doc.setTextColor(244, 67, 54); // Rojo
          doc.text('Faltante (Deuda):', 20, yPosition);
          doc.setFont('helvetica', 'bold');
          doc.text(`$${this.formatNumber(this.reporteData.faltante)}`, pageWidth - 20, yPosition, { align: 'right' });
        }
        
        yPosition += 8;

        // Detalle de Ventas
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('DETALLE DE VENTAS', 15, yPosition);
        
        yPosition += 4;

        if (this.detalleVentas.length === 0) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(150, 150, 150);
          doc.text('No hay ventas registradas en esta semana', 20, yPosition);
          yPosition += 6;
        } else {
          const ventasTableData = this.detalleVentas.map(venta => [
            venta.fecha,
            `$${this.formatNumber(venta.monto)}`
          ]);

          // Agregar fila de total
          ventasTableData.push([
            'TOTAL',
            `$${this.formatNumber(this.reporteData.totalVenta)}`
          ]);

          doc.autoTable({
            startY: yPosition,
            head: [['Fecha', 'Monto']],
            body: ventasTableData,
            theme: 'grid',
            headStyles: {
              fillColor: [255, 140, 0],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 10,
              cellPadding: 2
            },
            bodyStyles: {
              fontSize: 9,
              fontStyle: 'bold',
              cellPadding: 2
            },
            columnStyles: {
              0: { cellWidth: 120 },
              1: { cellWidth: 'auto', halign: 'right' }
            },
            margin: { left: 15, right: 15 },
            didDrawPage: (data) => {
              yPosition = data.cursor.y;
            },
            didParseCell: (data) => {
              // Estilizar la última fila (total)
              if (data.row.index === ventasTableData.length - 1) {
                data.cell.styles.fillColor = [255, 235, 205];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 10;
                data.cell.styles.textColor = [0, 0, 0];
              }
            }
          });
          
          yPosition = doc.lastAutoTable.finalY + 6;
        }

        // Verificar si necesitamos nueva página
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = 15;
        }

        // Detalle de Abonos
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('DETALLE DE ABONOS', 15, yPosition);
        
        yPosition += 4;

        if (this.detalleAbonos.length === 0) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(150, 150, 150);
          doc.text('No hay abonos registrados en esta semana', 20, yPosition);
          yPosition += 6;
        } else {
          const abonosTableData = this.detalleAbonos.map(abono => [
            abono.fecha,
            abono.descripcion || 'Sin descripción',
            `$${this.formatNumber(abono.monto)}`
          ]);

          // Agregar fila de total
          abonosTableData.push([
            '',
            'TOTAL',
            `$${this.formatNumber(this.reporteData.totalAbonado)}`
          ]);

          doc.autoTable({
            startY: yPosition,
            head: [['Fecha', 'Descripción', 'Monto']],
            body: abonosTableData,
            theme: 'grid',
            headStyles: {
              fillColor: [76, 175, 80],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 10,
              cellPadding: 2
            },
            bodyStyles: {
              fontSize: 9,
              fontStyle: 'bold',
              cellPadding: 2
            },
            columnStyles: {
              0: { cellWidth: 50 },
              1: { cellWidth: 90 },
              2: { cellWidth: 'auto', halign: 'right' }
            },
            margin: { left: 15, right: 15 },
            didParseCell: (data) => {
              // Estilizar la última fila (total)
              if (data.row.index === abonosTableData.length - 1) {
                data.cell.styles.fillColor = [200, 230, 201];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 10;
                data.cell.styles.textColor = [0, 0, 0];
              }
            }
          });
        }

        // Footer en todas las páginas
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.setFont('helvetica', 'normal');
          doc.text(
            `Generado el ${moment().format('DD/MM/YYYY HH:mm')}`,
            15,
            pageHeight - 10
          );
          doc.text(
            `Página ${i} de ${totalPages}`,
            pageWidth - 15,
            pageHeight - 10,
            { align: 'right' }
          );
        }

        // Guardar PDF
        const nombreArchivo = `Reporte_Semanal_${this.reporteData.startDate.replace(/\//g, '-')}_al_${this.reporteData.endDate.replace(/\//g, '-')}.pdf`;
        doc.save(nombreArchivo);

      } catch (error) {
        console.error('Error generando PDF:', error);
        alert('Error al generar el PDF. Por favor, intenta de nuevo.');
      } finally {
        this.generando = false;
      }
    }
  }
};
</script>

<style scoped>
.btn-reporte-semanal {
  background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  width: 100%;
  margin-top: 10px;
  box-shadow: 0 4px 6px rgba(244, 67, 54, 0.3);
}

.btn-reporte-semanal:hover:not(:disabled) {
  background: linear-gradient(135deg, #e91e63 0%, #c2185b 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(244, 67, 54, 0.4);
}

.btn-reporte-semanal:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .btn-reporte-semanal {
    font-size: 13px;
    padding: 12px 16px;
  }
}
</style>

