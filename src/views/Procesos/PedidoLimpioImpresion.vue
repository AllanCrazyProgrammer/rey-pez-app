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
        <h3>Otilio</h3>
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
        <!-- Catarro -->
        <div class="cliente-seccion">
          <h4>Catarro</h4>
          <table class="preview-table">
            <thead>
              <tr>
                <th>Kilos/Taras</th>
                <th>Medida</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in pedidoCatarro" :key="'catarro-'+index">
                <td>{{ item.kilos }}<i v-if="item.esTara">T</i></td>
                <td>{{ item.medida }}</td>
                <td :class="{ 'text-blue': item.tipo === 'C/H20' }">{{ item.tipo }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <hr class="cliente-separator">

        <!-- Joselito -->
        <div class="cliente-seccion">
          <h4>Joselito</h4>
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
        <hr class="cliente-separator">

        <!-- Ozuna -->
        <div class="cliente-seccion ozuna-seccion">
          <h4>Ozuna</h4>
          <table class="preview-table">
            <thead>
              <tr>
                <th>Kilos/Taras</th>
                <th>Medida</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in pedidoOzuna" :key="'ozuna-'+index">
                <td>{{ item.kilos }}<i v-if="item.esTara">T</i></td>
                <td>{{ item.medida }}</td>
                <td :class="{ 'text-blue': item.tipo === 'C/H20' }">{{ item.tipo }}</td>
              </tr>
            </tbody>
          </table>
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
        pageSize: 'A4',
        pageOrientation: 'portrait',
        pageMargins: [30, 0, 30, 0],
        content: [
          // Primera página - Otilio
          {
            text: 'OTILIO',
            style: 'clienteHeader',
            fontSize: 48,
            margin: [0, 0, 0, 0]
          },
          this.generarTablaCliente(this.pedidoOtilio, 20),
          { text: '', pageBreak: 'after' },

          // Segunda página - Otros clientes
          // Catarro
          {
            text: 'CATARRO',
            style: 'clienteHeader',
            fontSize: 40,
            margin: [0, 0, 0, 0]
          },
          this.generarTablaCliente(this.pedidoCatarro, 18),
          { text: '', margin: [0, 0, 0, 0] },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1 }] },
          { text: '', margin: [0, 20, 0, 0] },

          // Joselito
          {
            text: 'JOSELITO',
            style: 'clienteHeader',
            fontSize: 40,
            margin: [0, 0, 0, 0]
          },
          this.generarTablaCliente(this.pedidoJoselito, 18),
          { text: '', margin: [0, 0, 0, 0] },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 1 }] },
          { text: '', margin: [0, 20, 0, 0] },

          // Ozuna
          {
            text: 'OZUNA',
            style: 'clienteHeader',
            fontSize: 36,
            margin: [0, 0, 0, 0]
          },
          this.generarTablaCliente(this.pedidoOzuna, 16)
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
}

.preview-page:last-child {
  page-break-after: avoid;
}

.cliente-seccion {
  margin-bottom: 30px;
}

.ozuna-seccion {
  max-width: 800px;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
  margin-bottom: 20px;
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
</style> 