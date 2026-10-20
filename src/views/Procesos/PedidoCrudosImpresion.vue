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
              {{ formatearMedidaPedidoCrudo(columna) }}
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
              <label v-if="pedidos[cliente][columna.toLowerCase()]" class="tara-preparada">
                {{ pedidos[cliente][columna.toLowerCase()] }}
                <input
                  v-model="tarasPreparadas[claveTara(cliente, columna)]"
                  type="checkbox"
                  :aria-label="`Taras preparadas de ${cliente}, ${formatearMedidaPedidoCrudo(columna)}`"
                >
                <span class="casilla-impresa" aria-hidden="true"></span>
              </label>
            </td>
          </tr>
          <tr class="fila-totales">
            <td><strong>Total</strong></td>
            <td v-for="columna in obtenerColumnasConDatos()" :key="columna + '-total'">
              {{ calcularTotalColumna(columna) }}
            </td>
          </tr>
          <tr class="fila-kilos">
            <td><strong>Kilos</strong></td>
            <td v-for="columna in obtenerColumnasConDatos()" :key="columna + '-kilos'">
              {{ calcularKilosColumna(columna) }}
            </td>
          </tr>
        </tbody>
      </table>
      <div class="barcos">
        <label v-for="columna in obtenerColumnasConDatos()" :key="columna" class="barco-fila">
          <span>{{ formatearMedidaPedidoCrudo(columna) }} — Barco:</span>
          <input v-model="barcos[columna]" type="text" class="barco-input">
          <span class="barco-impreso">{{ barcos[columna] }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script>
import { crearPdfConFuentesLocales } from '@/utils/pdf/config'
import { formatearMedidaPedidoCrudo } from '@/utils/medidasPedidoCrudo'

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
  data() {
    return {
      tarasPreparadas: {},
      barcos: {}
    }
  },
  methods: {
    formatearMedidaPedidoCrudo,
    claveTara(cliente, columna) {
      return JSON.stringify([cliente, columna])
    },
    obtenerClientesConDatos() {
      return Object.keys(this.pedidos).filter(cliente => {
        return Object.values(this.pedidos[cliente]).some(valor => {
          const numero = parseFloat(valor)
          return valor !== null && valor !== '' && !isNaN(numero) && numero > 0
        })
      })
    },
    obtenerColumnasConDatos() {
      return this.columnas.filter(columna => {
        const nombreProp = columna.toLowerCase()
        return this.obtenerClientesConDatos().some(cliente => {
          const valor = this.pedidos[cliente][nombreProp]
          const numero = parseFloat(valor)
          return valor !== null && valor !== '' && !isNaN(numero) && numero > 0
        })
      })
    },
    obtenerColorCliente(cliente) {
      const colores = {
        '8a': '#3498db',
        'catarro': '#e74c3c',
        'otilio': '#f1c40f',
        'ozuna': '#2ecc71',
        'veronica': '#ff8c00'
      }
      return colores[cliente.toLowerCase()] || '#000000'
    },
    obtenerColorTextoCliente(cliente) {
      const clientesTextoNegro = ['otilio', 'veronica'];
      return clientesTextoNegro.includes(cliente.toLowerCase()) ? '#000000' : '#FFFFFF'
    },
    obtenerDiaSemana(fecha) {
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const [year, month, day] = fecha.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return dias[date.getDay()];
    },
    calcularTotalColumna(columna) {
      const col = columna.toLowerCase();
      return Object.keys(this.pedidos).reduce((sum, cliente) => {
        const valor = parseFloat(this.pedidos[cliente][col]) || 0;
        return sum + valor;
      }, 0);
    },
    calcularKilosColumna(columna) {
      const totalTaras = this.calcularTotalColumna(columna);
      return totalTaras * 19;
    },
    generarPDF() {
      const clientesConDatos = this.obtenerClientesConDatos()
      const columnasConDatos = this.obtenerColumnasConDatos()
      const diaSemana = this.obtenerDiaSemana(this.fecha)
      const fontSize = columnasConDatos.length > 4 ? 28 : 34
      
      const body = clientesConDatos.map(cliente => {
        const fila = [cliente]
        columnasConDatos.forEach(columna => {
          const valor = this.pedidos[cliente][columna.toLowerCase()] || ''
          const casilla = [{ type: 'rect', x: 0, y: 0, w: 10, h: 10, lineWidth: 1 }]
          if (this.tarasPreparadas[this.claveTara(cliente, columna)]) {
            casilla.push(
              { type: 'line', x1: 2, y1: 5, x2: 4, y2: 8, lineWidth: 1 },
              { type: 'line', x1: 4, y1: 8, x2: 8, y2: 2, lineWidth: 1 }
            )
          }
          fila.push(valor ? {
            columns: [
              { text: valor.toString(), alignment: 'center', width: '*' },
              { canvas: casilla, width: 10, margin: [0, fontSize / 2 - 5, 0, 0] }
            ],
            columnGap: 3
          } : { text: '' })
        })
        return fila
      })

      const headers = ['Cliente', ...columnasConDatos.map(formatearMedidaPedidoCrudo)].map(header => ({
        text: header,
        alignment: 'center'
      }))

      // Calcular el tamaño de la tabla basado en el número de columnas
      const tableWidth = headers.length > 5 ? '100%' : 'auto'

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
          italics: true,
          fillColor: '#f8f9fa'
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
              hLineWidth: function(i, node) { 
                return (i === node.table.body.length - 1 || i === node.table.body.length) ? 2 : 1;
              },
              vLineWidth: function(i, node) { 
                return (node.table.body.length - 1 === node.row) ? 2 : 1;
              },
              hLineColor: function(i) { return '#000000'; },
              vLineColor: function(i) { return '#000000'; },
              paddingLeft: function(i) { return 10; },
              paddingRight: function(i) { return 10; },
              paddingTop: function(i) { return 10; },
              paddingBottom: function(i) { return 10; }
            },
            width: tableWidth
          },
          ...(columnasConDatos.length ? [{
            margin: [0, 16, 0, 0],
            fontSize: 14,
            bold: false,
            table: {
              widths: ['auto', '*'],
              dontBreakRows: true,
              body: columnasConDatos.map(columna => [
                { text: `${formatearMedidaPedidoCrudo(columna)} — Barco:`, margin: [0, 4, 8, 4] },
                { text: this.barcos[columna]?.trim() || '______________________________', margin: [0, 4, 0, 4] }
              ])
            },
            layout: 'noBorders'
          }] : [])
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

      crearPdfConFuentesLocales(docDefinition).download('Ped-crudos-' + this.fecha + '.pdf')
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

.tara-preparada {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  white-space: nowrap;
  cursor: pointer;
}

.tara-preparada input,
.casilla-impresa {
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
  margin: 0;
}

.casilla-impresa,
.barco-impreso {
  display: none;
}

.barcos {
  margin-top: 16px;
}

.barco-fila {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
  break-inside: avoid;
}

.barco-input {
  flex: 1;
  min-width: 0;
  max-width: 420px;
  border: 0;
  border-bottom: 1px solid #000;
  border-radius: 0;
  background: white;
  color: #000;
  font: inherit;
}

.fila-totales td {
  background-color: #34495e;
  color: white;
  font-weight: bold;
  border: 2px solid #2c3e50 !important;
}

.fila-kilos td {
  background-color: #e8f5e9;
  color: #1b5e20;
  font-weight: bold;
  border: 2px solid #c8e6c9 !important;
}

@media print {
  .tara-preparada input,
  .barco-input {
    display: none;
  }

  .casilla-impresa {
    display: inline-block;
    box-sizing: border-box;
    border: 1px solid #000;
    position: relative;
  }

  .tara-preparada input:checked + .casilla-impresa::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 0;
    width: 4px;
    height: 8px;
    border: solid #000;
    border-width: 0 1px 1px 0;
    transform: rotate(45deg);
  }

  .barco-impreso {
    display: block;
    flex: 1;
    min-width: 0;
    max-width: 420px;
    min-height: 1.2em;
    border-bottom: 1px solid #000;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

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
