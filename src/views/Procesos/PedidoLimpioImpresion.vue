<template>
  <div class="impresion-container">
    <h2>Vista previa de impresión - Pedido de Camarón Limpio</h2>
    <div class="buttons-container">
      <button @click="generarPDF" class="btn-generar">
        <span class="icon">📄</span> Generar PDF
      </button>
      <button @click="$router.push('/procesos/pedidos')" class="btn-menu">
        Menú
      </button>
      <button @click="$emit('volver')" class="btn-volver">
        Volver al Pedido
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
              <td>
                {{ item.medida }}
                <span v-if="item.proveedor" class="proveedor-tag">{{ item.proveedor }}</span>
              </td>
              <td :class="{ 
                'text-blue': item.tipo === 'C/H20', 
                'text-blue compact': item.tipo === '1.35 y .15' 
              }">
                {{ item.tipo }}
                <span v-if="item.nota" class="nota-tag">{{ item.nota }}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Clientes Temporales -->
        <template v-for="(cliente, id) in clientesTemporales">
          <div :key="id" class="cliente-seccion temporal">
            <h3 class="cliente-header temporal-header">{{ cliente.nombre }}</h3>
            <table class="preview-table">
              <thead>
                <tr>
                  <th>Kilos/Taras</th>
                  <th>Medida</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in cliente.pedidos" :key="'temp-'+id+'-'+index">
                  <td>{{ item.kilos }}<i v-if="item.esTara">T</i></td>
                  <td>
                    {{ item.medida }}
                    <span v-if="item.proveedor" class="proveedor-tag">{{ item.proveedor }}</span>
                  </td>
                  <td :class="{ 
                    'text-blue': item.tipo === 'C/H20', 
                    'text-blue compact': item.tipo === '1.35 y .15' 
                  }">
                    {{ item.tipo }}
                    <span v-if="item.nota" class="nota-tag">{{ item.nota }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>

      <!-- Vista previa de otros clientes -->
      <div class="preview-page">
        <!-- Joselito -->
        <div class="cliente-seccion" :class="{ compacto: pedidoJoselito.length >= 5 }">
          <h4 class="cliente-header joselito-header" :class="{ compacto: pedidoJoselito.length >= 5 }">Joselito</h4>
          <table class="preview-table" :class="{ compacto: pedidoJoselito.length >= 5 }">
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
                <td>
                  {{ item.medida }}
                  <span v-if="item.proveedor" class="proveedor-tag">{{ item.proveedor }}</span>
                </td>
                <td :class="{ 
                  'text-blue': item.tipo === 'C/H20', 
                  'text-blue compact': item.tipo === '1.35 y .15' 
                }">
                  {{ item.tipo }}
                  <span v-if="item.nota" class="nota-tag">{{ item.nota }}</span>
                </td>
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
                  <td>
                    {{ item.medida }}
                    <span v-if="item.proveedor" class="proveedor-tag">{{ item.proveedor }}</span>
                  </td>
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
                  <td>
                    {{ item.medida }}
                    <span v-if="item.proveedor" class="proveedor-tag">{{ item.proveedor }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Sección de resumen por medida (solo en vista previa) -->
      <div class="resumen-medidas">
        <h3 class="resumen-header">Resumen por Medida</h3>
        <table class="resumen-table">
          <thead>
            <tr>
              <th>Medida</th>
              <th>Total Kilos</th>
              <th>Rendimientos</th>
              <th>Masters</th>
              <th>Cajas</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(medida, index) in calcularTotalesPorMedida()" :key="index">
              <td>{{ medida.medida }}</td>
              <td>{{ medida.total }} kg</td>
              <td>
                <div class="rendimientos-column">
                  <input 
                    type="number" 
                    step="0.01"
                    v-model="rendimientos[medida.medida]"
                    @input="calcularRendimiento(medida)"
                    placeholder="1.00"
                    class="rendimiento-box"
                  >
                  <div v-if="rendimientos[medida.medida]" class="rendimiento-total">
                    {{ Math.round(medida.total * rendimientos[medida.medida]) }}
                  </div>
                </div>
              </td>
              <td>
                <div v-if="esMedidaGranja(medida.medida)" class="checkbox-group">
                  <label>
                    <input 
                      type="radio" 
                      :name="'master-' + medida.medida"
                      :checked="divisores[medida.medida] === 20"
                      @change="toggleDivisor(medida.medida, 20)"
                    >
                    20
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      :name="'master-' + medida.medida"
                      :checked="divisores[medida.medida] === 22"
                      @change="toggleDivisor(medida.medida, 22)"
                    >
                    22
                  </label>
                </div>
              </td>
              <td>
                <template v-if="rendimientos[medida.medida]">
                  <span v-if="esMedidaGranja(medida.medida) && divisores[medida.medida]" class="cajas-result">
                    {{ Math.round((medida.total * rendimientos[medida.medida]) / divisores[medida.medida]) }}
                  </span>
                  <span v-else class="cajas-result">
                    {{ Math.round(medida.total * rendimientos[medida.medida]) }} kg
                  </span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
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
    },
    clientesTemporales: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      rendimientos: {},
      divisores: {}
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

      const reducirEspacio = items.length > 7;
      const paddingValue = reducirEspacio ? 2 : 16;

      const body = items.map(item => [
        { 
          text: item.kilos ? (item.esTara ? [
            { text: item.kilos.toString(), fontSize: fontSize * 1.6 },
            { text: 'T', fontSize: fontSize * 1.6, italics: true }
          ] : item.kilos.toString()) : '', 
          fontSize: fontSize * 1.6,
          margin: [0, 2, 0, 2]
        },
        { 
          stack: [
            { text: item.medida || '', fontSize: fontSize * 1.8 },
            item.proveedor ? { 
              text: item.proveedor, 
              fontSize: fontSize * 1.1,
              color: '#FFFFFF',
              background: '#FF0000',
              margin: [0, 2, 0, 0],
              padding: [2, 1],
              alignment: 'center'
            } : ''
          ],
          margin: [0, 2, 0, 2]
        },
        { 
          stack: [
            { 
              text: [
                { 
                  text: item.tipo || '', 
                  fontSize: fontSize * (item.tipo === '1.35 y .15' ? 1.5 : 1.8),
                  color: (item.tipo === 'C/H20' || item.tipo === '1.35 y .15') ? '#0000FF' : undefined,
                  margin: item.tipo === '1.35 y .15' ? [0, 0, 0, 0] : [0, 2, 0, 2]
                }
              ]
            },
            item.nota ? { 
              text: item.nota, 
              fontSize: fontSize * 1.1,
              margin: [0, 1, 0, 0],
              padding: [1, 1]
            } : ''
          ],
          margin: [0, 2, 0, 2]
        }
      ]);

      return {
        table: {
          widths: ['30%', '35%', '35%'],
          body
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => paddingValue,
          paddingBottom: () => paddingValue
        }
      };
    },
    generarPDF() {
      const diaSemana = this.obtenerDiaSemana(this.fecha);
      const necesitaCompacto = this.pedidoJoselito.length >= 5;
      const espaciadoReducido = necesitaCompacto ? 0.5 : 30;
      const fontSizeJoselito = necesitaCompacto ? 22 : 26;
      const fontSizeInferior = necesitaCompacto ? 24 : 36;
      
      const docDefinition = {
        pageSize: 'letter',
        pageOrientation: 'portrait',
        pageMargins: [10, 10, 10, 10],
        content: [
          // Primera página - Otilio
          {
            columns: [
              {
                text: 'OTILIO',
                style: 'clienteHeader',
                fontSize: 48,
                width: '*',
                alignment: 'left',
                background: '#FFEB3B'
              },
              {
                text: this.fecha,
                fontSize: 36,
                italics: true,
                width: 'auto',
                alignment: 'right'
              }
            ],
            margin: [0, 0, 0, 10]
          },
          this.generarTablaCliente(this.pedidoOtilio, 26),
          { text: '', pageBreak: 'after' },

          // Segunda página
          // Joselito
          {
            text: 'JOSELITO',
            style: 'clienteHeader',
            fontSize: necesitaCompacto ? 24 : 48,
            margin: [0, 0, 0, necesitaCompacto ? 0.5 : 0],
            background: '#2196F3'
          },
          this.generarTablaCliente(this.pedidoJoselito, fontSizeJoselito),
          { text: '', margin: [0, espaciadoReducido, 0, 0] },
          { canvas: [{ 
            type: 'line', 
            x1: 0, 
            y1: 0, 
            x2: 592, 
            y2: 0, 
            lineWidth: necesitaCompacto ? 0.3 : 2 
          }] },
          { text: '', margin: [0, espaciadoReducido, 0, 0] },

          // Sección inferior
          {
            columns: [
              // Catarro
              {
                stack: [
                  {
                    text: 'CATARRO',
                    style: 'clienteHeader',
                    fontSize: fontSizeInferior,
                    margin: [0, 0, 0, necesitaCompacto ? 1 : 0],
                    background: '#FF5252'
                  },
                  this.generarTablaClienteReducido(this.pedidoCatarro, fontSizeJoselito)
                ],
                width: '47%'
              },
              // Línea vertical
              {
                stack: [
                  { canvas: [{ 
                    type: 'line', 
                    x1: 10,
                    y1: 0, 
                    x2: 10, 
                    y2: necesitaCompacto ? 30 : 150,
                    lineWidth: necesitaCompacto ? 0.3 : 1.5 
                  }] }
                ],
                width: '6%',
                margin: [0, necesitaCompacto ? 2 : 20, 0, 0]
              },
              // Ozuna
              {
                stack: [
                  {
                    text: 'OZUNA',
                    style: 'clienteHeader',
                    fontSize: fontSizeInferior,
                    margin: [0, 0, 0, necesitaCompacto ? 1 : 0],
                    background: '#4CAF50'
                  },
                  this.generarTablaClienteReducido(this.pedidoOzuna, fontSizeJoselito)
                ],
                width: '47%'
              }
            ]
          },
          { text: '', pageBreak: 'after' },

          // Tercera página - Clientes Temporales
          ...Object.entries(this.clientesTemporales).map(([clienteId, cliente]) => [
            {
              text: cliente.nombre.toUpperCase(),
              style: 'clienteHeader',
              fontSize: 36,
              margin: [0, 0, 0, 10],
              background: '#95a5a6'
            },
            this.generarTablaCliente(cliente.pedidos, 22),
            { text: '', margin: [0, 20, 0, 20] }
          ]).flat()
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
          },
          tableHeader: {
            bold: true,
            fontSize: 14,
            color: 'black',
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
            { text: item.kilos.toString(), fontSize: fontSize * 1.4 },
            { text: 'T', fontSize: fontSize * 1.4, italics: true }
          ] : item.kilos.toString()) : '', 
          fontSize: fontSize * 1.4,
          margin: [0, 1, 0, 1]
        },
        { 
          stack: [
            { text: item.medida || '', fontSize: fontSize * 1.6 },
            item.proveedor ? { 
              text: item.proveedor, 
              fontSize: fontSize * 0.9,
              color: '#FFFFFF',
              background: '#FF0000',
              padding: [2, 1],
              alignment: 'center'
            } : '',
            item.nota ? { 
              text: item.nota, 
              fontSize: fontSize * 0.9,
              padding: [1, 0]
            } : ''
          ],
          margin: [0, 1, 0, 1]
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
          paddingLeft: () => 1,
          paddingRight: () => 1,
          paddingTop: () => 1,
          paddingBottom: () => 1
        }
      };
    },
    obtenerNombreCliente(clienteId) {
      // Convertir el ID a un nombre más presentable
      return clienteId.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    },
    calcularTotalesTemporales(clienteId) {
      if (!this.clientesTemporales[clienteId]) return { tarasTotal: '0', kilosTotal: '0' };

      let tarasDirectas = 0;
      let kilosSinH2O = 0;
      let kilosConH2O = 0;
      let kilosTaras = 0;

      this.clientesTemporales[clienteId].forEach(item => {
        if (item.kilos) {
          if (item.esTara) {
            tarasDirectas += Number(item.kilos);
            if (item.tipo === 'C/H20') {
              kilosConH2O += Number(item.kilos) * 30 * 0.65;
            } else {
              kilosTaras += Number(item.kilos) * 30;
            }
          } else if (item.tipo === 'S/H20') {
            kilosSinH2O += Number(item.kilos);
          } else if (item.tipo === 'C/H20') {
            kilosConH2O += Number(item.kilos);
          }
        }
      });

      const tarasPorKilos = kilosSinH2O / 27;
      const tarasTotal = Math.round(tarasDirectas + tarasPorKilos);
      const totalKilosSinH2O = kilosSinH2O + kilosTaras;
      const kilosTotal = Math.round(totalKilosSinH2O + kilosConH2O);

      return {
        tarasTotal: tarasTotal.toString(),
        kilosTotal: kilosTotal.toString()
      };
    },
    calcularTotalesPorMedida() {
      const medidasMap = new Map();
      
      const procesarPedido = (pedido) => {
        pedido.forEach(item => {
          if (!item.medida) return;
          
          const medida = item.medida;
          const key = medida.toLowerCase().trim();
          
          if (!medidasMap.has(key)) {
            medidasMap.set(key, {
              medida: medida,
              total: 0,
              kilosNetos: 0
            });
          }
          
          const registro = medidasMap.get(key);
          const kilos = Number(item.kilos) || 0;
          
          if (item.esTara) {
            if (item.tipo === 'C/H20') {
              registro.kilosNetos += kilos * 30 * 0.65;
            } else {
              registro.kilosNetos += kilos * 30;
            }
          } else {
            if (item.tipo === 'S/H20') {
              registro.total += kilos;
            } else if (item.tipo === 'C/H20') {
              registro.total += kilos * 0.65;
            } else if (item.tipo === '1.35 y .15') {
              registro.total += kilos * 1.35;
            }
          }
        });
      };

      // Procesar todos los pedidos
      procesarPedido(this.pedidoOtilio);
      procesarPedido(this.pedidoCatarro);
      procesarPedido(this.pedidoJoselito);
      procesarPedido(this.pedidoOzuna);
      
      // Procesar clientes temporales
      Object.values(this.clientesTemporales).forEach(cliente => {
        procesarPedido(cliente.pedidos);
      });

      // Calcular totales finales
      const resultados = [];
      for (const [key, value] of medidasMap) {
        const totalFinal = Math.round(value.total + value.kilosNetos);
        resultados.push({
          medida: value.medida,
          total: totalFinal
        });
      }

      return resultados.sort((a, b) => a.medida.localeCompare(b.medida));
    },
    calcularRendimiento(medida) {
      // Asegurarse de que el valor sea numérico
      const valor = parseFloat(this.rendimientos[medida.medida]);
      if (isNaN(valor)) {
        this.rendimientos[medida.medida] = '';
      }
    },
    toggleDivisor(medida, valor) {
      // Si el valor seleccionado es el mismo que ya está, lo deseleccionamos
      if (this.divisores[medida] === valor) {
        this.$set(this.divisores, medida, null)
      } else {
        // Si no, establecemos el nuevo valor
        this.$set(this.divisores, medida, valor)
      }
    },
    esMedidaGranja(medida) {
      // Verifica si la medida comienza con un número
      return /^\d/.test(medida);
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
.btn-menu,
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

.btn-menu {
  background-color: #95a5a6;
  color: white;
}

.btn-menu:hover {
  background-color: #7f8c8d;
}

.btn-volver {
  background-color: #3498db;
  color: white;
}

.btn-volver:hover {
  background-color: #2980b9;
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

.cliente-seccion.compacto {
  margin-bottom: 8px;
}

.bottom-section {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
  position: relative;
  padding-top: 20px;
  border-top: none;
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

.preview-table.compacto {
  margin-top: 1px;
  margin-bottom: 2px;
}

.preview-table th,
.preview-table td {
  border: 1px solid #000;
  padding: 8px;
  text-align: center;
}

.preview-table.compacto th,
.preview-table.compacto td {
  padding: 2px;
  font-size: 0.9em;
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
  color: #0000FF;
}

.text-blue.compact {
  font-size: 0.9em;
  margin-left: -5px;
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

.cliente-header.compacto {
  padding: 4px;
  margin-bottom: 5px;
  font-size: 0.9em;
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

/* Estilos para dispositivos móviles pequeños */
@media (max-width: 375px) {
  .bottom-section {
    flex-direction: column;
    gap: 20px;
    border-top: none;
    padding-top: 0;
  }

  .bottom-cliente {
    width: 100%;
    margin: 0 !important;
    padding: 15px 0;
    border-top: none;
  }

  .preview-table {
    font-size: 14px;
  }

  .preview-table th,
  .preview-table td {
    padding: 4px;
  }

  h4.cliente-header {
    font-size: 18px;
    text-align: center;
    margin-bottom: 15px;
  }
}

/* Estilos para las etiquetas de proveedor y notas */
.proveedor-tag {
  display: block;
  background-color: #9b59b6;
  color: white;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.8em;
  margin-top: 2px;
}

.nota-tag {
  display: block;
  background-color: #e74c3c;
  color: white;
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.8em;
  margin-top: 2px;
}

/* Ajustes responsivos para las etiquetas */
@media (max-width: 375px) {
  .proveedor-tag,
  .nota-tag {
    font-size: 0.7em;
    padding: 1px 2px;
  }
}

.seccion-cliente.temporal {
  border: 2px solid #95a5a6;
  background-color: #f8f9fa;
}

.seccion-cliente.temporal h3 {
  color: #7f8c8d;
}

.cliente-seccion.temporal {
  margin-top: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #95a5a6;
}

.temporal-header {
  background-color: #95a5a6;
  color: white;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 15px;
}

@media print {
  .cliente-seccion.temporal {
    page-break-inside: avoid;
    border: 2px solid #95a5a6 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .temporal-header {
    background-color: #95a5a6 !important;
    color: white !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

.preview-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.preview-table.compacto th,
.preview-table.compacto td {
  padding: 4px;
}

.resumen-medidas {
  margin-top: 30px;
  page-break-before: avoid;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.resumen-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  margin-left: auto;
  margin-right: auto;
}

/* Ajustar los anchos de las columnas */
.resumen-table th:nth-child(1),
.resumen-table td:nth-child(1) {
  width: 15%; /* Columna de Medida */
}

.resumen-table th:nth-child(2),
.resumen-table td:nth-child(2) {
  width: 15%; /* Columna de Total Kilos */
}

.resumen-table th:nth-child(3),
.resumen-table td:nth-child(3) {
  width: 35%; /* Aumentada ligeramente para acomodar el input más grande */
}

.resumen-table th:nth-child(4),
.resumen-table td:nth-child(4) {
  width: 18%; /* Reducida ligeramente */
}

.resumen-table th:nth-child(5),
.resumen-table td:nth-child(5) {
  width: 17%; /* Reducida ligeramente */
}

.resumen-table th,
.resumen-table td {
  padding: 8px;
  vertical-align: middle;
  text-align: center;
  border: 1px solid #ddd;
}

.resumen-table th {
  background-color: #f2f2f2;
  font-weight: bold;
  color: #333;
}

.rendimientos-column {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  justify-content: center;
  flex-wrap: nowrap;
  margin: 0 auto;
  width: fit-content;
}

.rendimiento-box {
  width: 80px;
  min-width: 80px;
  max-width: 80px;
  padding: 6px 8px;
  font-size: 16px;
  border: 2px solid #4CAF50;
  border-radius: 4px;
  color: #4CAF50;
  text-align: center;
  outline: none;
  box-sizing: border-box;
}

.rendimiento-total {
  min-width: 60px;
  font-size: 16px;
  color: #666;
}

.checkbox-group {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 0 auto;
  width: fit-content;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
}

.checkbox-group input[type="radio"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
  margin: 0;
}

.cajas-result {
  display: block;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
  color: #2196F3;
}

.cajas-result:not([data-granja]) {
  color: #4CAF50;
}

/* Ajustes responsivos */
@media (max-width: 375px) {
  .resumen-table td {
    padding: 4px 2px;
    font-size: 11px;
  }

  .rendimientos-column {
    gap: 5px;
  }

  .rendimiento-box {
    width: 60px;
    min-width: 60px;
    max-width: 60px;
    font-size: 12px;
    padding: 4px 6px;
  }

  .rendimiento-total {
    min-width: 40px;
    font-size: 12px;
  }

  .checkbox-group {
    gap: 8px;
  }

  .checkbox-group label {
    font-size: 11px;
  }

  .checkbox-group input[type="radio"] {
    width: 12px;
    height: 12px;
  }

  .cajas-result {
    font-size: 14px;
  }
}

/* Ajustes para impresión */
@media print {
  .rendimiento-box {
    border: none;
    background: none;
  }
}

.resumen-header {
  background-color: #343a40;
  color: white;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 15px;
}

@media print {
  .resumen-medidas {
    display: none; /* Ocultar en impresión */
  }
}
</style> 