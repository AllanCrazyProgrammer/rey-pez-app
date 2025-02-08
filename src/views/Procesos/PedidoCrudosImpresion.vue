<template>
  <div class="impresion-container">
    <h2>Vista previa de impresión - Pedido de Camarón Crudo</h2>
    <div class="buttons-container">
      <button @click="generarPDF" class="btn-generar">
        <span class="icon">📄</span> Generar PDF
      </button>
      <button @click="$router.push('/procesos/pedidos')" class="btn-volver">
        Volver
      </button>
    </div>
    <div id="pdfPreview" class="pdf-preview">
      <h3>Pedido de Crudos - {{ fecha }}</h3>
      <table class="preview-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th v-for="columna in obtenerColumnasConDatos()" :key="columna">
              {{ columna }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="cliente in obtenerClientesConDatos()" :key="cliente">
            <td 
              :style="{
                backgroundColor: obtenerColorCliente(cliente),
                color: obtenerColorTextoCliente(cliente)
              }"
            >
              {{ cliente }}
            </td>
            <td v-for="columna in obtenerColumnasConDatos()" :key="columna">
              {{ pedidos[cliente][columna.toLowerCase()] || '' }}
            </td>
          </tr>
          <tr class="fila-totales">
            <td><strong>Total</strong></td>
            <td v-for="columna in obtenerColumnasConDatos()" :key="columna + '-total'">
              {{ calcularTotalColumna(columna) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import pdfMake from 'pdfmake/build/pdfmake'

const fonts = {
  Roboto: {
    normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
    bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
    italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf',
    bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf'
  }
}

pdfMake.fonts = fonts

export default {
  name: 'PedidoCrudosImpresion',
  props: {
    fecha: {
      type: String,
      required: true
    },
    pedidos: {
      type: Object,
      required: true
    },
    columnas: {
      type: Array,
      required: true
    }
  },
  methods: {
    obtenerClientesConDatos() {
      return Object.keys(this.pedidos).filter(cliente => {
        return Object.values(this.pedidos[cliente]).some(valor => 
          valor !== null && valor !== ''
        )
      })
    },
    obtenerColumnasConDatos() {
      return this.columnas.filter(columna => {
        const nombreProp = columna.toLowerCase()
        return this.obtenerClientesConDatos().some(cliente => {
          return this.pedidos[cliente][nombreProp] !== null && 
                 this.pedidos[cliente][nombreProp] !== ''
        })
      })
    },
    obtenerColorCliente(cliente) {
      const colores = {
        '8a': '#3498db',
        'catarro': '#e74c3c',
        'otilio': '#f1c40f',
        'ozuna': '#2ecc71'
      }
      return colores[cliente.toLowerCase()] || '#000000'
    },
    obtenerColorTextoCliente(cliente) {
      return cliente.toLowerCase() === 'otilio' ? '#000000' : '#FFFFFF'
    },
    obtenerDiaSemana(fecha) {
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const date = new Date(fecha);
      return dias[date.getDay()];
    },
    calcularTotalColumna(columna) {
      const col = columna.toLowerCase();
      return Object.keys(this.pedidos).reduce((sum, cliente) => {
        const valor = parseFloat(this.pedidos[cliente][col]) || 0;
        return sum + valor;
      }, 0);
    },
    generarPDF() {
      const clientesConDatos = this.obtenerClientesConDatos()
      const columnasConDatos = this.obtenerColumnasConDatos()
      const diaSemana = this.obtenerDiaSemana(this.fecha)
      
      const body = clientesConDatos.map(cliente => {
        const fila = [cliente]
        columnasConDatos.forEach(columna => {
          const valor = this.pedidos[cliente][columna.toLowerCase()] || ''
          fila.push({ text: valor.toString(), alignment: 'center' })
        })
        return fila
      })

      const headers = ['Cliente', ...columnasConDatos].map(header => ({
        text: header,
        alignment: 'center'
      }))

      // Calcular el tamaño de la tabla basado en el número de columnas
      const tableWidth = headers.length > 5 ? '100%' : 'auto'
      const fontSize = headers.length > 5 ? 28 : 34

      const estilosCeldas = {}
      clientesConDatos.forEach((cliente, index) => {
        estilosCeldas[index] = {
          fillColor: this.obtenerColorCliente(cliente),
          color: this.obtenerColorTextoCliente(cliente),
          bold: true
        }
      })

      // Agregar fila de totales al PDF
      const totales = columnasConDatos.map(columna => {
        const total = this.calcularTotalColumna(columna);
        return { 
          text: total.toString(), 
          alignment: 'center', 
          bold: true,
          fillColor: '#f8f9fa' // Fondo gris claro para destacar
        };
      });
      
      body.push([
        { text: 'Total', bold: true, fillColor: '#f8f9fa' }, 
        ...totales
      ]);

      const docDefinition = {
        pageOrientation: 'landscape',
        pageMargins: [40, 40, 40, 40],
        content: [
          {
            text: `Pedido de Crudos - ${diaSemana} ${this.fecha}`,
            style: 'header'
          },
          {
            table: {
              headerRows: 1,
              widths: Array(headers.length).fill('*'),
              body: [headers, ...body]
            },
            layout: {
              fillColor: function(rowIndex, node, columnIndex) {
                if (rowIndex === 0) return '#f2f2f2'
                if (columnIndex === 0) return estilosCeldas[rowIndex - 1]?.fillColor
                return null
              },
              defaultBorder: true,
              hLineWidth: function(i) { return 1; },
              vLineWidth: function(i) { return 1; },
              hLineColor: function(i) { return '#000000'; },
              vLineColor: function(i) { return '#000000'; },
              paddingLeft: function(i) { return 10; },
              paddingRight: function(i) { return 10; },
              paddingTop: function(i) { return 10; },
              paddingBottom: function(i) { return 10; }
            },
            width: tableWidth
          }
        ],
        styles: {
          header: {
            fontSize: 34,
            bold: true,
            margin: [0, 0, 0, 20],
            alignment: 'center'
          }
        },
        defaultStyle: {
          fontSize: fontSize,
          bold: true,
          font: 'Roboto'
        }
      }

      pdfMake.createPdf(docDefinition).download('Ped-crudos-' + this.fecha + '.pdf')
    }
  }
}
</script>

<style scoped>
.impresion-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.buttons-container {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.btn-generar,
.btn-volver {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-generar {
  background-color: #34495e;
  color: white;
}

.btn-generar:hover {
  background-color: #2c3e50;
}

.btn-volver {
  background-color: #95a5a6;
  color: white;
}

.btn-volver:hover {
  background-color: #7f8c8d;
}

.icon {
  font-size: 1.2em;
}

.pdf-preview {
  margin-top: 20px;
  border: 1px solid #ddd;
  padding: 20px;
  min-height: 500px;
  background-color: white;
}

.pdf-preview h3 {
  text-align: center;
  margin-bottom: 20px;
  font-size: 24px;
  font-weight: bold;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.preview-table th,
.preview-table td {
  border: 1px solid #000000;
  padding: 12px;
  text-align: center;
}

.preview-table th {
  background-color: #f2f2f2;
  font-weight: bold;
  font-size: 18px;
}

.preview-table td {
  font-size: 18px;
}

.fila-totales td {
  background-color: #34495e;
  color: white;
  font-weight: bold;
  border: 2px solid #2c3e50 !important;
}

@media print {
  .buttons-container,
  .impresion-container > h2,
  footer,
  nav,
  .navbar,
  .footer,
  #footer,
  #navbar,
  .pdf-preview > h3,
  .nav-bar,
  .navbar-custom,
  .safe-area-top,
  .content-wrapper > *:not(.impresion-container),
  #app > *:not(.content-wrapper) {
    display: none !important;
  }
  
  .impresion-container {
    padding: 0;
    margin: 0;
    max-width: none;
    background-color: white;
  }
  
  .pdf-preview {
    border: none;
    padding: 0;
    margin: 0;
    min-height: auto;
    background-color: white;
  }

  .preview-table {
    width: 100%;
    page-break-inside: avoid;
    margin-top: 0;
    background-color: white;
  }

  .preview-table th,
  .preview-table td {
    font-size: 14pt;
  }

  body {
    margin: 0;
    padding: 0;
    background-color: white;
  }

  #app {
    background-color: white;
  }

  .content-wrapper {
    background-color: white;
  }

  .fila-totales td {
    background-color: #d3d3d3 !important;
    color: #000 !important;
  }

  @page {
    size: landscape;
    margin: 1cm;
  }
}
</style> 