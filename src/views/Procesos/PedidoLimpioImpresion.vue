<template>
  <div class="impresion-container">
    <h2>Vista previa de impresión - Pedido de Camarón Limpio</h2>
    <div class="buttons-container">
      <button @click="generarPDF" class="btn-generar">
        <span class="icon">📄</span> Generar PDF
      </button>
      <button @click="$router.push('/procesos/pedidos')" class="btn-volver">
        Volver
      </button>
    </div>
    <div id="pdfPreview" class="pdf-preview">
      <!-- Vista previa de Otilio -->
      <div class="preview-page">
        <h3 class="cliente-header otilio-header">Otilio</h3>
        <table class="preview-table">
          <thead>
            <tr>
              <th>Kilos/Taras</th>
              <th>Medida</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in pedidoOtilio" :key="'otilio-'+index">
              <td>{{ item.kilos }}<i v-if="item.esTara">T</i></td>
              <td>{{ item.medida }}</td>
              <td :class="{ 'text-blue': item.tipo === 'C/H20' }">{{ item.tipo }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Vista previa de otros clientes -->
      <div class="preview-page">
        <!-- Joselito -->
        <div class="cliente-seccion">
          <h4 class="cliente-header joselito-header">Joselito</h4>
          <table class="preview-table">
            <thead>
              <tr>
                <th>Kilos/Taras</th>
                <th>Medida</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in pedidoJoselito" :key="'joselito-'+index">
                <td>{{ item.kilos }}<i v-if="item.esTara">T</i></td>
                <td>{{ item.medida }}</td>
                <td :class="{ 'text-blue': item.tipo === 'C/H20' }">{{ item.tipo }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="bottom-section">
          <!-- Catarro -->
          <div class="bottom-cliente">
            <h4 class="cliente-header catarro-header">Catarro</h4>
            <table class="preview-table">
              <thead>
                <tr>
                  <th>Kilos/Taras</th>
                  <th>Medida</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in pedidoCatarro" :key="'catarro-'+index">
                  <td>{{ item.kilos }}<i v-if="item.esTara">T</i></td>
                  <td>{{ item.medida }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Ozuna -->
          <div class="bottom-cliente">
            <h4 class="cliente-header ozuna-header">Ozuna</h4>
            <table class="preview-table">
              <thead>
                <tr>
                  <th>Kilos/Taras</th>
                  <th>Medida</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in pedidoOzuna" :key="'ozuna-'+index">
                  <td>{{ item.kilos }}<i v-if="item.esTara">T</i></td>
                  <td>{{ item.medida }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
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
  name: 'PedidoLimpioImpresion',
  props: {
    fecha: {
      type: String,
      required: true
    },
    pedidoOtilio: {
      type: Array,
      required: true
    },
    pedidoCatarro: {
      type: Array,
      required: true
    },
    pedidoJoselito: {
      type: Array,
      required: true
    },
    pedidoOzuna: {
      type: Array,
      required: true
    }
  },
  methods: {
    obtenerDiaSemana(fecha) {
      const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const date = new Date(fecha);
      return dias[date.getDay()];
    },
    generarTablaCliente(items, fontSize = 16) {
      if (!items || items.length === 0) return null;

      const body = items.map(item => [
        { 
          text: item.kilos ? (item.esTara ? [
            { text: item.kilos.toString(), fontSize: fontSize * 2 },
            { text: 'T', fontSize: fontSize * 2, italics: true }
          ] : item.kilos.toString()) : '', 
          fontSize: fontSize * 2 
        },
        { text: item.medida || '', fontSize: fontSize * 2 },
        { 
          text: item.tipo || '', 
          fontSize: fontSize * 2,
          color: item.tipo === 'C/H20' ? '#3498db' : undefined 
        }
      ]);

      return {
        table: {
          widths: ['*', '*', '*'],
          body
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 12,
          paddingRight: () => 12,
          paddingTop: () => 16,
          paddingBottom: () => 16
        }
      };
    },
    generarPDF() {
      const diaSemana = this.obtenerDiaSemana(this.fecha);
      
      const docDefinition = {
        pageSize: 'letter',
        pageOrientation: 'portrait',
        pageMargins: [10, 0, 10, 0],
        content: [
          // Primera página - Otilio
          {
            text: 'OTILIO',
            style: 'clienteHeader',
            fontSize: 48,
            margin: [0, 0, 0, 0],
            background: '#FFEB3B'
          },
          this.generarTablaCliente(this.pedidoOtilio, 26),
          { text: '', pageBreak: 'after' },

          // Segunda página
          // Joselito
          {
            text: 'JOSELITO',
            style: 'clienteHeader',
            fontSize: 48,
            margin: [0, 0, 0, 0],
            background: '#2196F3'
          },
          this.generarTablaCliente(this.pedidoJoselito, 26),
          { text: '', margin: [0, 30, 0, 0] },
          // Línea horizontal que separa Joselito de la sección inferior
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 592, y2: 0, lineWidth: 2 }] },
          { text: '', margin: [0, 30, 0, 0] },

          // Sección inferior
          {
            columns: [
              // Catarro
              {
                stack: [
                  {
                    text: 'CATARRO',
                    style: 'clienteHeader',
                    fontSize: 36,
                    margin: [0, 0, 0, 0],
                    background: '#FF5252'
                  },
                  this.generarTablaClienteReducido(this.pedidoCatarro, 26)
                ],
                width: '47%'
              },
              // Línea vertical
              {
                stack: [
                  { canvas: [{ type: 'line', x1: 15, y1: 0, x2: 15, y2: 300, lineWidth: 1.5 }] }
                ],
                width: '6%',
                margin: [0, 20, 0, 0]
              },
              // Ozuna
              {
                stack: [
                  {
                    text: 'OZUNA',
                    style: 'clienteHeader',
                    fontSize: 36,
                    margin: [0, 0, 0, 0],
                    background: '#4CAF50'
                  },
                  this.generarTablaClienteReducido(this.pedidoOzuna, 26)
                ],
                width: '47%'
              }
            ]
          }
        ],
        styles: {
          header: {
            alignment: 'center',
            margin: [0, 0, 0, 20],
            bold: true
          },
          clienteHeader: {
            bold: true,
            alignment: 'center'
          }
        },
        defaultStyle: {
          font: 'Roboto'
        }
      };

      pdfMake.createPdf(docDefinition).download('Ped-limpio-' + this.fecha + '.pdf');
    },
    generarTablaClienteReducido(items, fontSize = 16) {
      if (!items || items.length === 0) return null;

      const body = items.map(item => [
        { 
          text: item.kilos ? (item.esTara ? [
            { text: item.kilos.toString(), fontSize: fontSize * 2 },
            { text: 'T', fontSize: fontSize * 2, italics: true }
          ] : item.kilos.toString()) : '', 
          fontSize: fontSize * 2,
          margin: [0, 0, 0, 0]
        },
        { 
          text: item.medida || '', 
          fontSize: fontSize * 2,
          margin: [0, 0, 0, 0]
        }
      ]);

      return {
        table: {
          widths: ['45%', '55%'],
          body
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 4,
          paddingRight: () => 4,
          paddingTop: () => 8,
          paddingBottom: () => 8
        }
      };
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
}

.preview-page {
  margin-bottom: 40px;
  page-break-after: always;
  position: relative;
}

.preview-page:last-child {
  page-break-after: avoid;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.cliente-seccion {
  margin-bottom: 30px;
  position: relative;
}

.bottom-section {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  position: relative;
  padding-top: 20px;
  border-top: 2px solid #000;
}

.bottom-cliente {
  width: 47%;
  position: relative;
}

.bottom-cliente:first-child {
  margin-right: 5%;
}

.bottom-cliente:last-child {
  margin-left: 5%;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 5px;
  margin-bottom: 10px;
}

.preview-table th,
.preview-table td {
  border: 1px solid #000;
  padding: 8px;
  text-align: center;
}

.preview-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

h3 {
  text-align: center;
  margin-bottom: 20px;
  font-size: 24px;
  color: #2c3e50;
}

h4 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 20px;
}

@media print {
  .buttons-container {
    display: none !important;
  }

  .impresion-container > h2 {
    display: none;
  }

  .pdf-preview {
    border: none;
    padding: 0;
  }

  .preview-page {
    page-break-after: always;
  }

  .bottom-section {
    border-top: 2px solid #000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    justify-content: space-between;
    align-items: flex-start;
  }
  
  .bottom-cliente:first-child {
    margin-right: 5%;
  }
  
  .bottom-cliente:last-child {
    margin-left: 5%;
  }
}

.text-blue {
  color: #3498db;
}

.cliente-separator {
  border: none;
  height: 1px;
  background-color: #000;
  margin: 30px 0;
}

@media print {
  .cliente-separator {
    background-color: #000;
    height: 1px;
    margin: 30px 0;
  }
}

.cliente-header {
  padding: 8px;
  border-radius: 8px;
  margin-bottom: 15px;
  color: #000;
}

.otilio-header {
  background-color: #FFEB3B; /* Amarillo */
}

h4.cliente-header.catarro-header {
  background-color: #FF5252; /* Rojo */
}

h4.cliente-header.joselito-header {
  background-color: #2196F3; /* Azul */
}

h4.cliente-header.ozuna-header {
  background-color: #4CAF50; /* Verde */
}

/* Asegurar contraste y legibilidad */
.cliente-header {
  text-shadow: 1px 1px 1px rgba(255, 255, 255, 0.5);
  font-weight: bold;
}

@media print {
  .cliente-header {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style> 