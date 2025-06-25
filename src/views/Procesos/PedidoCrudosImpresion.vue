<template>
  <div class="impresion-container">
    <header class="preview-header">
      <h2>Vista previa de impresión - Pedido de Camarón Crudo</h2>
      <div class="buttons-container">
        <button @click="generarPDF" class="btn-generar" :disabled="isGenerating">
          <span class="icon">📄</span> 
          {{ isGenerating ? 'Generando...' : 'Generar PDF' }}
        </button>
        <button @click="volver" class="btn-volver">
          <span class="icon">↩️</span> Volver
        </button>
      </div>
    </header>

    <main class="pdf-preview" id="pdfPreview">
      <div class="preview-content">
        <h3 class="preview-title">
          Pedido de Crudos - {{ obtenerDiaSemana(fecha) }} {{ formatearFecha(fecha) }}
        </h3>
        
        <div class="tabla-wrapper">
          <table class="preview-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th v-for="columna in columnasConDatos" :key="columna">
                  {{ columna }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cliente in clientesConDatos" :key="cliente" class="fila-cliente">
                <td 
                  class="celda-cliente"
                  :style="obtenerEstilosCliente(cliente)">
                  {{ cliente }}
                </td>
                <td v-for="columna in columnasConDatos" :key="`${cliente}-${columna}`" class="celda-cantidad">
                  {{ obtenerCantidadCliente(cliente, columna) }}
                </td>
              </tr>
              <tr class="fila-totales">
                <td><strong>Total</strong></td>
                <td v-for="columna in columnasConDatos" :key="`${columna}-total`">
                  <strong>{{ calcularTotalColumna(columna) }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="resumen-totales">
          <div class="total-item">
            <span class="label">Total Piezas:</span>
            <span class="value">{{ totalPiezasFormateado }}</span>
          </div>
          <div class="total-item">
            <span class="label">Total Kilos:</span>
            <span class="value">{{ totalKilosFormateado }} kg</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import pdfMake from 'pdfmake/build/pdfmake'

// Configuración de fuentes para pdfMake
const FONTS_CONFIG = {
  Roboto: {
    normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
    bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
    italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf',
    bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf'
  }
}

// Configuración de colores de clientes
const COLORES_CLIENTES = {
  '8a': { bg: '#3498db', text: '#FFFFFF' },
  'catarro': { bg: '#e74c3c', text: '#FFFFFF' },
  'otilio': { bg: '#f1c40f', text: '#000000' },
  'ozuna': { bg: '#2ecc71', text: '#FFFFFF' },
  'elizabeth': { bg: '#9b59b6', text: '#FFFFFF' }
}

// Configurar fuentes de pdfMake
pdfMake.fonts = FONTS_CONFIG

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
      isGenerating: false
    }
  },
  computed: {
    clientesConDatos() {
      return Object.keys(this.pedidos).filter(cliente => {
        return Object.values(this.pedidos[cliente]).some(valor => 
          valor !== null && valor !== '' && Number(valor) > 0
        )
      })
    },
    columnasConDatos() {
      return this.columnas.filter(columna => {
        const nombreProp = columna.toLowerCase()
        return this.clientesConDatos.some(cliente => {
          const valor = this.pedidos[cliente][nombreProp]
          return valor !== null && valor !== '' && Number(valor) > 0
        })
      })
    },
    totalPiezas() {
      return this.clientesConDatos.reduce((total, cliente) => {
        return total + Object.values(this.pedidos[cliente]).reduce((subtotal, cantidad) => {
          return subtotal + (Number(cantidad) || 0)
        }, 0)
      }, 0)
    },
    totalPiezasFormateado() {
      return this.totalPiezas.toLocaleString()
    },
    totalKilos() {
      return this.totalPiezas * 19
    },
    totalKilosFormateado() {
      return Math.floor(this.totalKilos).toLocaleString()
    }
  },
  methods: {
    obtenerCantidadCliente(cliente, columna) {
      const cantidad = this.pedidos[cliente][columna.toLowerCase()]
      return cantidad && Number(cantidad) > 0 ? cantidad : ''
    },
    obtenerEstilosCliente(cliente) {
      const colores = COLORES_CLIENTES[cliente.toLowerCase()] || { bg: '#000000', text: '#FFFFFF' }
      return {
        backgroundColor: colores.bg,
        color: colores.text
      }
    },
    obtenerDiaSemana(fecha) {
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      const [year, month, day] = fecha.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return dias[date.getDay()]
    },
    formatearFecha(fecha) {
      const [year, month, day] = fecha.split('-')
      return `${day}/${month}/${year}`
    },
    calcularTotalColumna(columna) {
      const col = columna.toLowerCase()
      return this.clientesConDatos.reduce((sum, cliente) => {
        const valor = Number(this.pedidos[cliente][col]) || 0
        return sum + valor
      }, 0)
    },
    async generarPDF() {
      if (this.isGenerating) return
      
      this.isGenerating = true
      try {
        const docDefinition = this.crearDefinicionPDF()
        await this.descargarPDF(docDefinition)
      } catch (error) {
        console.error('Error al generar PDF:', error)
        this.mostrarError('Error al generar el PDF. Por favor intente nuevamente.')
      } finally {
        this.isGenerating = false
      }
    },
    crearDefinicionPDF() {
      const diaSemana = this.obtenerDiaSemana(this.fecha)
      const fechaFormateada = this.formatearFecha(this.fecha)
      
      // Crear filas de datos
      const filasTabla = this.clientesConDatos.map(cliente => {
        const fila = [{ 
          text: cliente, 
          ...this.obtenerEstilosCeldaCliente(cliente)
        }]
        
        this.columnasConDatos.forEach(columna => {
          const valor = this.obtenerCantidadCliente(cliente, columna)
          fila.push({ 
            text: valor.toString(), 
            alignment: 'center',
            bold: true
          })
        })
        return fila
      })

      // Crear encabezados
      const encabezados = ['Cliente', ...this.columnasConDatos].map(header => ({
        text: header,
        alignment: 'center',
        bold: true,
        fontSize: this.obtenerTamanoFuenteEncabezado()
      }))

      // Agregar fila de totales
      const filaTotales = [
        { text: 'Total', bold: true, fillColor: '#34495e', color: '#FFFFFF' }
      ]
      
      this.columnasConDatos.forEach(columna => {
        const total = this.calcularTotalColumna(columna)
        filaTotales.push({ 
          text: total.toString(), 
          alignment: 'center', 
          bold: true,
          fillColor: '#34495e',
          color: '#FFFFFF'
        })
      })
      
      filasTabla.push(filaTotales)

      return {
        pageOrientation: 'landscape',
        pageMargins: [30, 40, 30, 40],
        content: [
          {
            text: `Pedido de Crudos - ${diaSemana} ${fechaFormateada}`,
            style: 'header'
          },
          {
            table: {
              headerRows: 1,
              widths: this.calcularAnchoColumnas(),
              body: [encabezados, ...filasTabla]
            },
            layout: this.obtenerLayoutTabla()
          },
          this.crearSeccionResumen()
        ],
        styles: {
          header: {
            fontSize: this.obtenerTamanoFuenteTitulo(),
            bold: true,
            margin: [0, 0, 0, 25],
            alignment: 'center',
            color: '#2c3e50'
          }
        },
        defaultStyle: {
          fontSize: this.obtenerTamanoFuenteBase(),
          font: 'Roboto'
        }
      }
    },
    obtenerEstilosCeldaCliente(cliente) {
      const colores = COLORES_CLIENTES[cliente.toLowerCase()] || { bg: '#000000', text: '#FFFFFF' }
      return {
        fillColor: colores.bg,
        color: colores.text,
        bold: true,
        alignment: 'center'
      }
    },
    calcularAnchoColumnas() {
      const numColumnas = this.columnasConDatos.length + 1 // +1 para la columna de cliente
      return Array(numColumnas).fill('*')
    },
    obtenerTamanoFuenteBase() {
      return this.columnasConDatos.length > 6 ? 26 : 30
    },
    obtenerTamanoFuenteEncabezado() {
      return this.columnasConDatos.length > 6 ? 28 : 32
    },
    obtenerTamanoFuenteTitulo() {
      return this.columnasConDatos.length > 8 ? 32 : 36
    },
    obtenerLayoutTabla() {
      return {
        fillColor: function(rowIndex, node, columnIndex) {
          return rowIndex === 0 ? '#ecf0f1' : null
        },
        hLineWidth: function(i, node) { 
          return i === 0 || i === node.table.body.length ? 3 : 1
        },
        vLineWidth: function(i, node) { 
          return i === 0 || i === node.table.widths.length ? 3 : 1
        },
        hLineColor: '#2c3e50',
        vLineColor: '#2c3e50',
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 12,
        paddingBottom: 12
      }
    },
    crearSeccionResumen() {
      return {
        margin: [0, 20, 0, 0],
        table: {
          widths: ['*', '*'],
          body: [
            [
              { 
                text: `Total de Piezas: ${this.totalPiezasFormateado}`, 
                bold: true, 
                fontSize: 18,
                fillColor: '#3498db',
                color: '#FFFFFF',
                alignment: 'center'
              },
              { 
                text: `Total de Kilos: ${this.totalKilosFormateado} kg`, 
                bold: true, 
                fontSize: 18,
                fillColor: '#2ecc71',
                color: '#FFFFFF',
                alignment: 'center'
              }
            ]
          ]
        },
        layout: 'noBorders'
      }
    },
    async descargarPDF(docDefinition) {
      const nombreArchivo = `Pedido-Crudos-${this.fecha}.pdf`
      pdfMake.createPdf(docDefinition).download(nombreArchivo)
    },
    volver() {
      this.$router.push('/procesos/pedidos')
    },
    mostrarError(mensaje) {
      // Implementar sistema de notificaciones si está disponible
      alert(mensaje) // Fallback temporal
    }
  }
}
</script>

<style scoped>
/* Variables CSS */
:root {
  --color-primary: #3498db;
  --color-secondary: #2ecc71;
  --color-danger: #e74c3c;
  --color-warning: #f1c40f;
  --color-purple: #9b59b6;
  --color-gray: #95a5a6;
  --color-dark: #2c3e50;
  --color-light: #ecf0f1;
  --border-radius: 8px;
  --spacing: 1rem;
  --transition: all 0.3s ease;
  --shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.impresion-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.preview-header {
  background: white;
  padding: var(--spacing);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  margin-bottom: var(--spacing);
}

.preview-header h2 {
  text-align: center;
  color: var(--color-dark);
  margin-bottom: var(--spacing);
  font-size: 1.6rem;
  font-weight: 600;
}

.buttons-container {
  display: flex;
  gap: var(--spacing);
  justify-content: center;
  flex-wrap: wrap;
}

.btn-generar,
.btn-volver {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 140px;
  justify-content: center;
}

.btn-generar {
  background-color: var(--color-dark);
  color: white;
}

.btn-generar:hover:not(:disabled) {
  background-color: #34495e;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(52, 73, 94, 0.3);
}

.btn-generar:disabled {
  background-color: var(--color-gray);
  cursor: not-allowed;
  opacity: 0.7;
}

.btn-volver {
  background-color: var(--color-gray);
  color: white;
}

.btn-volver:hover {
  background-color: #7f8c8d;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(149, 165, 166, 0.3);
}

.icon {
  font-size: 1.1em;
}

.pdf-preview {
  background: white;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.preview-content {
  padding: calc(var(--spacing) * 2);
}

.preview-title {
  text-align: center;
  margin-bottom: calc(var(--spacing) * 1.5);
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-dark);
  border-bottom: 3px solid var(--color-primary);
  padding-bottom: var(--spacing);
}

.tabla-wrapper {
  overflow-x: auto;
  margin-bottom: calc(var(--spacing) * 2);
  border-radius: var(--border-radius);
  box-shadow: 0 0 0 1px var(--color-light);
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.preview-table th {
  background: linear-gradient(135deg, var(--color-light) 0%, #d5dbdb 100%);
  color: var(--color-dark);
  font-weight: 700;
  padding: 1rem;
  text-align: center;
  border: 2px solid var(--color-dark);
  font-size: 1.1rem;
}

.preview-table td {
  padding: 0.875rem;
  text-align: center;
  border: 1px solid #bdc3c7;
  font-size: 1rem;
  font-weight: 600;
}

.fila-cliente .celda-cliente {
  font-weight: 700;
  font-size: 1.1rem;
}

.celda-cantidad {
  background-color: #fdfdfd;
  transition: var(--transition);
}

.celda-cantidad:hover {
  background-color: #f8f9fa;
}

.fila-totales {
  background: linear-gradient(135deg, var(--color-dark) 0%, #34495e 100%);
  color: white;
}

.fila-totales td {
  border: 2px solid var(--color-dark);
  font-size: 1.1rem;
  font-weight: 700;
  padding: 1rem;
}

.resumen-totales {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing);
  padding: var(--spacing);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: var(--border-radius);
  color: white;
}

.total-item {
  text-align: center;
  padding: 1rem;
}

.total-item .label {
  display: block;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  opacity: 0.9;
  font-weight: 500;
}

.total-item .value {
  display: block;
  font-size: 1.8rem;
  font-weight: 700;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .impresion-container {
    padding: 0.5rem;
  }
  
  .preview-content {
    padding: var(--spacing);
  }
  
  .preview-title {
    font-size: 1.5rem;
  }
  
  .tabla-wrapper {
    border-radius: 0;
  }
}

@media (max-width: 768px) {
  .buttons-container {
    flex-direction: column;
  }
  
  .btn-generar,
  .btn-volver {
    width: 100%;
  }
  
  .tabla-wrapper {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .preview-table {
    min-width: 600px;
  }
  
  .preview-table th,
  .preview-table td {
    padding: 0.6rem;
    font-size: 0.9rem;
  }
  
  .preview-title {
    font-size: 1.3rem;
  }
  
  .resumen-totales {
    grid-template-columns: 1fr;
  }
  
  .total-item .value {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .preview-header h2 {
    font-size: 1.3rem;
  }
  
  .preview-table {
    min-width: 500px;
  }
  
  .preview-table th,
  .preview-table td {
    padding: 0.5rem;
    font-size: 0.8rem;
  }
  
  .preview-title {
    font-size: 1.2rem;
    padding-bottom: 0.5rem;
  }
  
  .total-item .value {
    font-size: 1.3rem;
  }
}

/* Estilos de impresión */
@media print {
  .preview-header,
  .buttons-container,
  body > *:not(.impresion-container),
  #app > *:not(.content-wrapper) {
    display: none !important;
  }
  
  .impresion-container {
    padding: 0;
    margin: 0;
    max-width: none;
    background-color: white;
    min-height: auto;
  }
  
  .pdf-preview {
    border: none;
    box-shadow: none;
    background: white;
  }
  
  .preview-content {
    padding: 0;
  }

  .preview-table {
    page-break-inside: avoid;
  }

  .preview-table th,
  .preview-table td {
    font-size: 12pt;
    border: 1pt solid #000;
    -webkit-print-color-adjust: exact;
    color-adjust: exact;
  }

  .fila-totales td {
    background-color: #2c3e50 !important;
    color: white !important;
  }

  .resumen-totales {
    background: #667eea !important;
    -webkit-print-color-adjust: exact;
    color-adjust: exact;
  }

  @page {
    size: landscape;
    margin: 1cm;
  }
}
</style> 