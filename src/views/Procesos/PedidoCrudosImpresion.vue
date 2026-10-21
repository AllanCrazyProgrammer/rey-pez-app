<template>
  <div class="impresion-container">
    <h2>Vista previa de impresión - Pedido de Camarón Crudo</h2>
    <div class="buttons-container">
      <button @click="generarPDF" class="btn-generar" :disabled="!barcosListos">
        <span class="icon">📄</span> Generar PDF
      </button>
      <button @click="$router.push('/procesos/pedidos')" class="btn-volver">
        Volver
      </button>
    </div>
    <p v-if="!barcosListos" class="estado-carga">Cargando pedido…</p>
    <p v-if="errorCarga" class="barco-error" role="alert">{{ errorCarga }}</p>
    <div v-if="barcosListos" id="pdfPreview" class="pdf-preview">
      <h3>Pedido de Crudos - {{ fechaVisible }}</h3>
      <div class="tabla-scroll">
        <table class="preview-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th v-for="columna in columnasConDatos" :key="columna">
                {{ formatearMedidaPedidoCrudo(columna) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cliente in clientesConDatos" :key="cliente">
              <td 
                :style="{
                  backgroundColor: obtenerColorCliente(cliente),
                  color: obtenerColorTextoCliente(cliente)
                }"
              >
                {{ cliente }}
              </td>
              <td v-for="columna in columnasConDatos" :key="columna">
                <label v-if="cantidadCelda(cliente, columna)" class="tara-preparada">
                  {{ cantidadCelda(cliente, columna) }}
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
              <td v-for="columna in columnasConDatos" :key="columna + '-total'">
                {{ calcularTotalColumna(columna) }}
              </td>
            </tr>
            <tr class="fila-kilos">
              <td><strong>Kilos</strong></td>
              <td v-for="columna in columnasConDatos" :key="columna + '-kilos'">
                {{ calcularKilosColumna(columna) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="barcos">
        <FilaBarcoMedida
          v-for="columna in columnasConDatos"
          :key="columna"
          :etiqueta="formatearMedidaPedidoCrudo(columna)"
          :value="barcos[columna] || ''"
          @input="onBarcoInput(columna, $event)"
          @blur="onBarcoBlur(columna)"
        />
        <p v-if="errorGuardado" class="barco-error" role="alert">{{ errorGuardado }}</p>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase'
import { doc, getDoc, updateDoc, FieldPath } from 'firebase/firestore'
import { crearPdfConFuentesLocales } from '@/utils/pdf/config'
import { formatearMedidaPedidoCrudo } from '@/utils/medidasPedidoCrudo'
import {
  barcoInicial,
  cambioBarcoPorMedida,
  claveBarcoPorMedida,
  debePersistirBarco,
  textoGuardadoBarco
} from '@/utils/barcosPorMedida'
import FilaBarcoMedida from './components/FilaBarcoMedida.vue'

const ESPERA_GUARDADO_MS = 500
const ORDEN_CLIENTES = ['8a', 'catarro', 'otilio', 'ozuna', 'veronica']

export default {
  name: 'PedidoCrudosImpresion',
  components: {
    FilaBarcoMedida
  },
  props: {
    fecha: {
      type: String,
      default: ''
    },
    pedidos: {
      type: Object,
      default: () => ({})
    },
    columnas: {
      type: Array,
      default: () => []
    },
    barcosPorPedido: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      tarasPreparadas: {},
      barcos: {},
      barcosEditados: {},
      ultimoGuardado: {},
      guardadosSeq: {},
      temporizadores: {},
      pedidoId: '',
      pedidoRemoto: null,
      barcosListos: false,
      errorCarga: '',
      errorGuardado: ''
    }
  },
  computed: {
    fechaVisible() {
      return this.pedidoRemoto?.fecha || this.fecha || ''
    },
    pedidosVisibles() {
      return this.pedidoRemoto?.pedidos || this.pedidos || {}
    },
    columnasVisibles() {
      const remotas = this.pedidoRemoto?.columnas
      if (Array.isArray(remotas) && remotas.length) return remotas
      return this.columnas || []
    },
    barcosPorPedidoVisibles() {
      return this.pedidoRemoto?.barcosPorPedido || this.barcosPorPedido || {}
    },
    clientesConDatos() {
      return Object.keys(this.pedidosVisibles).filter(cliente => {
        const fila = this.pedidosVisibles[cliente]
        if (!fila || typeof fila !== 'object') return false
        return Object.values(fila).some(valor => this.tieneCantidad(valor))
      }).sort((a, b) => {
        const ia = ORDEN_CLIENTES.indexOf(a.toLowerCase())
        const ib = ORDEN_CLIENTES.indexOf(b.toLowerCase())
        const ra = ia === -1 ? ORDEN_CLIENTES.length : ia
        const rb = ib === -1 ? ORDEN_CLIENTES.length : ib
        if (ra !== rb) return ra - rb
        return a.localeCompare(b, 'es')
      })
    },
    columnasConDatos() {
      return this.columnasVisibles.filter(columna => {
        return this.clientesConDatos.some(cliente => this.tieneCantidad(this.cantidadCelda(cliente, columna)))
      })
    }
  },
  created() {
    const id = this.$route.query.id
    this.pedidoId = typeof id === 'string' ? id : ''
    if (this.pedidoId) {
      this.cargarPedido(this.pedidoId)
    } else {
      this.aplicarBarcos()
      this.barcosListos = true
    }
  },
  beforeDestroy() {
    Object.keys(this.temporizadores).forEach(columna => clearTimeout(this.temporizadores[columna]))
  },
  async beforeRouteLeave(to, from, next) {
    try {
      await this.flushBarcosEditados()
    } catch (error) {
      console.error('Error al guardar barcos al salir:', error)
    }
    next()
  },
  methods: {
    formatearMedidaPedidoCrudo,
    claveTara(cliente, columna) {
      return JSON.stringify([cliente, columna])
    },
    tieneCantidad(valor) {
      const numero = parseFloat(valor)
      return valor !== null && valor !== '' && !isNaN(numero) && numero > 0
    },
    cantidadCelda(cliente, columna) {
      const fila = this.pedidosVisibles[cliente]
      if (!fila || typeof fila !== 'object') return ''
      return fila[columna.toLowerCase()] || ''
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
      return Object.keys(this.pedidosVisibles).reduce((sum, cliente) => {
        const fila = this.pedidosVisibles[cliente] || {}
        const valor = parseFloat(fila[col]) || 0;
        return sum + valor;
      }, 0);
    },
    calcularKilosColumna(columna) {
      const totalTaras = this.calcularTotalColumna(columna);
      return totalTaras * 19;
    },
    generarPDF() {
      if (!this.barcosListos) return
      const clientesConDatos = this.clientesConDatos
      const columnasConDatos = this.columnasConDatos
      const diaSemana = this.obtenerDiaSemana(this.fechaVisible)
      const fontSize = columnasConDatos.length > 4 ? 28 : 34
      
      const body = clientesConDatos.map(cliente => {
        const fila = [cliente]
        columnasConDatos.forEach(columna => {
          const valor = this.cantidadCelda(cliente, columna)
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
            text: `Pedido de Crudos - ${diaSemana} ${this.fechaVisible}`,
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
            margin: [0, 8, 0, 0],
            fontSize: 11,
            bold: false,
            table: {
              widths: ['*', '*'],
              dontBreakRows: true,
              body: Array.from({ length: Math.ceil(columnasConDatos.length / 2) }, (_, fila) =>
                [0, 1].map(offset => {
                  const columna = columnasConDatos[fila * 2 + offset]
                  if (columna === undefined) return { text: '' }
                  return {
                    stack: [
                      { text: `${formatearMedidaPedidoCrudo(columna)} — Barco:`, fontSize: 9 },
                      {
                        table: {
                          widths: ['*'],
                          body: [[{
                            text: this.barcos[columna]?.trim() || ' ',
                            border: [false, false, false, true],
                            margin: [0, 1, 0, 0]
                          }]]
                        },
                        layout: {
                          hLineWidth: () => 0.5,
                          paddingLeft: () => 0,
                          paddingRight: () => 0,
                          paddingTop: () => 0,
                          paddingBottom: () => 1
                        }
                      }
                    ],
                    margin: [0, 0, 8, 4]
                  }
                })
              )
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

      crearPdfConFuentesLocales(docDefinition).download('Ped-crudos-' + this.fechaVisible + '.pdf')
    },
    async cargarPedido(id) {
      this.errorCarga = ''
      try {
        const snap = await getDoc(doc(db, 'pedidos', id))
        if (!snap.exists()) {
          this.errorCarga = 'No se encontró el pedido.'
          this.aplicarBarcos()
          return
        }
        this.pedidoRemoto = snap.data()
        this.aplicarBarcos()
        await this.flushBarcosEditados()
      } catch (error) {
        console.error('Error al cargar el pedido de crudos:', error)
        this.errorCarga = 'No se pudieron cargar los barcos guardados. Se muestran los datos disponibles.'
        this.aplicarBarcos()
      } finally {
        this.barcosListos = true
      }
    },
    aplicarBarcos() {
      const fuentes = {
        barcosPorMedida: this.pedidoRemoto?.barcosPorMedida,
        barcosPorPedido: this.barcosPorPedidoVisibles
      }
      this.columnasConDatos.forEach(columna => {
        if (this.barcosEditados[columna]) return
        this.$set(this.barcos, columna, barcoInicial(columna, fuentes))
        const guardado = textoGuardadoBarco(fuentes.barcosPorMedida, columna)
        if (guardado !== null) {
          this.$set(this.ultimoGuardado, claveBarcoPorMedida(columna), guardado)
        }
      })
    },
    onBarcoInput(columna, valor) {
      this.$set(this.barcos, columna, valor)
      this.$set(this.barcosEditados, columna, true)
      this.programarGuardado(columna)
    },
    onBarcoBlur(columna) {
      if (!this.barcosEditados[columna]) return
      const recortado = String(this.barcos[columna] ?? '').trim()
      if (recortado !== this.barcos[columna]) this.$set(this.barcos, columna, recortado)
      this.cancelarTemporizador(columna)
      this.guardarBarco(columna)
    },
    programarGuardado(columna) {
      this.cancelarTemporizador(columna)
      const temporizador = setTimeout(() => {
        this.$delete(this.temporizadores, columna)
        this.guardarBarco(columna)
      }, ESPERA_GUARDADO_MS)
      this.$set(this.temporizadores, columna, temporizador)
    },
    cancelarTemporizador(columna) {
      if (!this.temporizadores[columna]) return
      clearTimeout(this.temporizadores[columna])
      this.$delete(this.temporizadores, columna)
    },
    async flushBarcosEditados() {
      const columnas = Object.keys(this.temporizadores)
      columnas.forEach(columna => this.cancelarTemporizador(columna))
      const pendientes = Object.keys(this.barcosEditados).filter(columna => this.barcosEditados[columna])
      await Promise.all(pendientes.map(columna => this.guardarBarco(columna)))
    },
    async guardarBarco(columna) {
      const cambio = cambioBarcoPorMedida(columna, this.barcos[columna])
      if (!debePersistirBarco({
        editado: this.barcosEditados[columna],
        pedidoId: this.pedidoId,
        valor: cambio.valor,
        ultimoGuardado: this.ultimoGuardado[cambio.clave]
      })) return

      const seq = (this.guardadosSeq[cambio.clave] || 0) + 1
      this.$set(this.guardadosSeq, cambio.clave, seq)
      try {
        await updateDoc(
          doc(db, 'pedidos', this.pedidoId),
          new FieldPath(cambio.campo, cambio.clave),
          cambio.valor
        )
        if (this.guardadosSeq[cambio.clave] !== seq) return
        this.$set(this.ultimoGuardado, cambio.clave, cambio.valor)
        this.errorGuardado = ''
      } catch (error) {
        console.error('No se pudo guardar el barco de', cambio.clave, error)
        if (this.guardadosSeq[cambio.clave] === seq) {
          this.errorGuardado = 'No se pudo guardar el barco. Revisa la conexión e inténtalo de nuevo.'
        }
      }
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

.btn-generar:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.tabla-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
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

.casilla-impresa {
  display: none;
}

.barcos {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 6px 12px;
  margin-top: 10px;
}

.barcos > .barco-error {
  grid-column: 1 / -1;
}

.estado-carga,
.barco-error {
  margin: 12px 0;
  font-size: 15px;
}

.barco-error {
  color: #8a1f11;
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

@media (max-width: 640px) {
  .impresion-container {
    padding: 12px;
  }

  .buttons-container {
    flex-wrap: wrap;
  }

  .btn-generar,
  .btn-volver {
    flex: 1 1 140px;
    justify-content: center;
    min-height: 44px;
  }

  .preview-table th,
  .preview-table td {
    padding: 8px 6px;
    font-size: 15px;
  }
}

@media print {
  .tara-preparada input {
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

  .estado-carga,
  .barco-error {
    display: none !important;
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
