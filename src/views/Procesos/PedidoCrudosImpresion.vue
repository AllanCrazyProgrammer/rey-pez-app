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
    <section v-if="barcosListos" class="escala-impresion">
      <h3>Tamaño de la tabla para imprimir</h3>
      <label for="escala-tabla">Escala: {{ Math.round(escala * 100) }}%</label>
      <input id="escala-tabla" type="range" :min="escalaMin * 100" :max="escalaMaxima * 100" step="1" :value="Math.round(escala * 100)" @input="cambiarEscala">
      <button type="button" @click="ajustarAutomatico">Ajustar automático</button>
      <div ref="hojaContenedor" class="hoja-contenedor" :style="{ height: (595.28 * factorHoja) + 'px' }">
        <div class="hoja-impresion" :style="{ transform: 'scale(' + factorHoja + ')' }">
          <div class="hoja-titulo">{{ datosImpresion.titulo }}</div>
          <table class="hoja-tabla" :style="{ fontSize: parametrosImpresion.fontSize + 'px', '--padding-tabla': parametrosImpresion.padding + 'px' }">
            <colgroup><col v-for="(ancho, i) in anchosImpresion" :key="i" :style="{ width: ancho + 'px' }"></colgroup>
            <thead><tr><th v-for="(texto, i) in datosImpresion.encabezados" :key="i">{{ texto }}</th></tr></thead>
            <tbody>
              <tr v-for="fila in datosImpresion.filas" :key="fila.cliente">
                <td :style="{ backgroundColor: fila.fillColor, color: fila.color }">{{ fila.cliente }}</td>
                <td v-for="(celda, i) in fila.celdas" :key="i"><span v-if="celda.texto" class="hoja-cantidad" :style="{ gap: parametrosImpresion.gap + 'px' }">{{ celda.texto }}<svg :width="parametrosImpresion.casilla" :height="parametrosImpresion.casilla" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="black"/><path v-if="celda.marcada" d="M2 5 L4 8 L8 2" fill="none" stroke="black"/></svg></span></td>
              </tr>
              <tr class="hoja-total"><td>Total</td><td v-for="(valor, i) in datosImpresion.taras" :key="i"><i>{{ valor }}</i></td></tr>
              <tr class="hoja-total"><td>Kilos</td><td v-for="(valor, i) in datosImpresion.kilos" :key="i">{{ valor }}</td></tr>
            </tbody>
          </table>
          <div class="hoja-barcos"><div v-for="barco in datosImpresion.barcos" :key="barco.etiqueta" class="hoja-barco"><span>{{ barco.etiqueta }}</span><span>{{ barco.texto || ' ' }}</span></div></div>
        </div>
      </div>
    </section>
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
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import { HOJA, ESCALA_MIN, parametrosTabla, escalaMaximaQueCabe, escalaAutoAjuste, normalizarEscala, leerEscalaGuardada, guardarEscala, anchosTabla, construirDocumentoPedidoCrudos } from '@/utils/pedidosCrudoEscalaImpresion'
import { calcularTotalesPedidosCrudo } from '@/utils/pedidosCrudoTotales'
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
      escala: 1,
      factorHoja: 1,
      escalaMin: ESCALA_MIN,
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
    datosImpresion() {
      return {
        titulo: `Pedido de Crudos - ${this.obtenerDiaSemana(this.fechaVisible)} ${this.fechaVisible}`,
        encabezados: ['Cliente', ...this.columnasConDatos.map(formatearMedidaPedidoCrudo)],
        filas: this.clientesConDatos.map(cliente => ({
          cliente, fillColor: this.obtenerColorCliente(cliente), color: this.obtenerColorTextoCliente(cliente),
          celdas: this.columnasConDatos.map(columna => ({ texto: String(this.cantidadCelda(cliente, columna)), marcada: !!this.tarasPreparadas[this.claveTara(cliente, columna)] }))
        })),
        taras: this.columnasConDatos.map(this.calcularTotalColumna),
        kilos: this.columnasConDatos.map(this.calcularKilosColumna),
        barcos: this.columnasConDatos.map(columna => ({ etiqueta: formatearMedidaPedidoCrudo(columna), texto: (this.barcos[columna] || '').trim() }))
      }
    },
    escalaMaxima() {
      const d = this.datosImpresion
      return Math.floor(escalaMaximaQueCabe(d.encabezados, d.filas, d.taras, d.kilos) * 100) / 100
    },
    parametrosImpresion() { return parametrosTabla(this.escala, this.columnasConDatos.length) },
    anchosImpresion() {
      const d = this.datosImpresion
      return anchosTabla(d.encabezados, d.filas, this.escala, d.taras, d.kilos).map(ancho => ancho + this.parametrosImpresion.padding * 2 + 1)
    },
    totalesColumnas() {
      return calcularTotalesPedidosCrudo(this.pedidosVisibles, this.columnasVisibles)
    },
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
  watch: {
    barcosListos(listos) { if (listos) this.inicializarEscala() },
    escalaMaxima() { this.escala = normalizarEscala(this.escala, this.escalaMaxima) }
  },
  mounted() {
    this.inicializarEscala()
    window.addEventListener('resize', this.medirHoja)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.medirHoja)
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
    almacenamientoEscala() {
      try { return window.localStorage } catch (_) { return null }
    },
    inicializarEscala() {
      if (!this.barcosListos) return
      const guardada = leerEscalaGuardada(this.almacenamientoEscala())
      if (guardada === null) this.ajustarAutomatico()
      else this.escala = normalizarEscala(guardada, this.escalaMaxima)
      this.$nextTick(this.medirHoja)
    },
    medirHoja() {
      if (this.$refs.hojaContenedor) this.factorHoja = Math.min(1, this.$refs.hojaContenedor.clientWidth / HOJA.ancho)
    },
    cambiarEscala(event) {
      this.escala = normalizarEscala(Number(event.target.value) / 100, this.escalaMaxima)
      guardarEscala(this.almacenamientoEscala(), this.escala)
    },
    ajustarAutomatico() {
      const d = this.datosImpresion
      this.escala = escalaAutoAjuste(d.encabezados, d.filas, d.barcos, d.taras, d.kilos)
      guardarEscala(this.almacenamientoEscala(), this.escala)
    },
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
      return this.totalesColumnas[columna.toLowerCase()].taras
    },
    calcularKilosColumna(columna) {
      return this.totalesColumnas[columna.toLowerCase()].kilos
    },
    generarPDF() {
      if (!this.barcosListos) return
      const docDefinition = construirDocumentoPedidoCrudos({ ...this.datosImpresion, escala: this.escala })

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
.escala-impresion { min-width: 0; margin-top: 12px; padding: 12px; background: #fff; color: #2c3e50; border: 1px solid #ddd; border-radius: 6px; }
.escala-impresion h3 { margin: 0 0 6px; font-size: 18px; }
.escala-impresion label { font-weight: bold; }
.escala-impresion button { padding: 8px 14px; min-height: 40px; border: none; border-radius: 4px; background: #34495e; color: #fff; cursor: pointer; }
.hoja-contenedor { border: 1px solid #bbb; box-shadow: 0 1px 4px rgba(0,0,0,.2); }
.escala-impresion input { max-width: 100%; vertical-align: middle; margin: 12px; }
/* La hoja va fuera del flujo: su ancho real (841.89px) no debe ensanchar la pantalla en el celular. */
.hoja-contenedor { position: relative; width: 100%; max-width: 100%; overflow: hidden; margin-top: 16px; }
.hoja-impresion { position: absolute; top: 0; left: 0; box-sizing: border-box; width: 841.89px; height: 595.28px; padding: 40px; background: white; color: black; transform-origin: top left; font-family: Roboto, sans-serif; font-weight: 500; }
.hoja-titulo { font-size: 34px; line-height: 1.172; text-align: center; margin-bottom: 20px; }
.hoja-tabla { width: 761.89px; table-layout: fixed; border-collapse: collapse; line-height: 1.172; }
.hoja-tabla th, .hoja-tabla td { border: 1px solid black; padding: var(--padding-tabla); vertical-align: top; text-align: center; overflow-wrap: normal; font-weight: inherit; }
.hoja-tabla td:first-child { text-align: left; }
.hoja-tabla th { background: #f2f2f2; }
.hoja-cantidad { display: flex; align-items: center; justify-content: center; }
.hoja-cantidad svg { flex-shrink: 0; }
.hoja-total { background: #f8f9fa; border-top: 2px solid black; border-bottom: 2px solid black; }
.hoja-barcos { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px; margin-top: 8px; font-size: 11px; font-weight: 400; }
.hoja-barco { display: flex; align-items: baseline; gap: 6px; }
.hoja-barco span:first-child { font-size: 9px; white-space: nowrap; }
.hoja-barco span:last-child { flex: 1; min-width: 0; border-bottom: .5px solid black; white-space: pre-wrap; overflow-wrap: anywhere; }

.impresion-container {
  /* min-width: 0 evita que la tabla ensanche el contenedor flex en el celular. */
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
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

@media screen and (max-width: 420px) {
  .barcos {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media print {
  .escala-impresion { display: none !important; }
  .barcos {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

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
