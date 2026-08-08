<template>
  <div v-if="mostrar" class="analisis-overlay" @click.self="cerrar">
    <section class="analisis-modal" role="dialog" aria-modal="true" aria-labelledby="analisis-titulo">
      <header class="analisis-header">
        <div class="header-icono"><i class="fas fa-chart-pie"></i></div>
        <div class="header-texto">
          <p>Estadísticas históricas</p>
          <h2 id="analisis-titulo">Análisis de Pedido Limpio</h2>
          <span>Consulta cuánto se pidió por medida dentro de un rango de fechas.</span>
        </div>
        <button type="button" class="btn-cerrar-modal" aria-label="Cerrar" @click="cerrar">&times;</button>
      </header>

      <div class="analisis-contenido">
        <section class="panel-filtros">
          <div class="filtros-titulo">
            <span><i class="far fa-calendar-alt"></i></span>
            <div>
              <h3>1. Elige el periodo</h3>
              <p>Se tomarán únicamente pedidos limpios guardados.</p>
            </div>
          </div>

          <div class="rango-controles">
            <label>
              <span>Desde</span>
              <input v-model="fechaInicioInput" type="date" :max="fechaFinInput || undefined">
            </label>
            <span class="rango-flecha"><i class="fas fa-arrow-right"></i></span>
            <label>
              <span>Hasta</span>
              <input v-model="fechaFinInput" type="date" :min="fechaInicioInput || undefined">
            </label>
            <button type="button" class="btn-aplicar" @click="aplicarRango">
              <i class="fas fa-search"></i> Buscar medidas
            </button>
          </div>
          <p v-if="errorRango" class="error-rango"><i class="fas fa-exclamation-circle"></i> {{ errorRango }}</p>
        </section>

        <section class="panel-medidas">
          <div class="medidas-encabezado">
            <div class="filtros-titulo compacto">
              <span><i class="fas fa-ruler-combined"></i></span>
              <div>
                <h3>2. Selecciona las medidas</h3>
                <p>{{ medidasDisponibles.length }} medidas encontradas en el periodo.</p>
              </div>
            </div>
            <div v-if="medidasDisponibles.length" class="medidas-acciones">
              <button type="button" @click="seleccionarTodas">Seleccionar todas</button>
              <button type="button" @click="limpiarSeleccion">Limpiar</button>
            </div>
          </div>

          <p class="nota-exclusion">
            <i class="fas fa-info-circle"></i>
            En venta se omite la maquila marcada de Ozuna y solo “macuil/maquila” de Joselito; sus demás medidas sí cuentan.
          </p>

          <div v-if="medidasDisponibles.length" class="buscador-medida">
            <i class="fas fa-search"></i>
            <input v-model="busquedaMedida" type="search" placeholder="Buscar medida...">
            <span>{{ medidasSeleccionadas.length }} seleccionadas</span>
          </div>

          <div v-if="medidasDisponibles.length" class="medidas-grid">
            <label
              v-for="medida in medidasFiltradas"
              :key="medida.clave"
              class="medida-chip"
              :class="{ seleccionada: estaSeleccionada(medida.clave) }"
            >
              <input
                type="checkbox"
                :checked="estaSeleccionada(medida.clave)"
                @change="alternarMedida(medida.clave)"
              >
              <span class="chip-check"><i class="fas fa-check"></i></span>
              <span>{{ medida.nombre }}</span>
            </label>
          </div>

          <div v-else class="estado-vacio compacto-vacio">
            <i class="fas fa-calendar-times"></i>
            <p>No hay medidas con kilos pedidos dentro de este periodo.</p>
          </div>
        </section>

        <template v-if="hayResultados">
          <section class="resumen-cards">
            <article class="stat-card stat-kilos">
              <span class="stat-icon"><i class="fas fa-weight-hanging"></i></span>
              <div><small>Kilos pedidos</small><strong>{{ formatoNumero(analisis.resumen.kilosTotal) }}</strong><em>kg</em></div>
            </article>
            <article class="stat-card stat-taras">
              <span class="stat-icon"><i class="fas fa-boxes"></i></span>
              <div><small>Taras estimadas</small><strong>{{ formatoNumero(analisis.resumen.tarasTotal) }}</strong><em>T</em></div>
            </article>
            <article class="stat-card stat-pedidos">
              <span class="stat-icon"><i class="fas fa-clipboard-list"></i></span>
              <div><small>Pedidos incluidos</small><strong>{{ analisis.resumen.pedidos }}</strong><em>notas</em></div>
            </article>
            <article class="stat-card stat-promedio">
              <span class="stat-icon"><i class="fas fa-chart-line"></i></span>
              <div><small>Promedio por día</small><strong>{{ formatoNumero(analisis.resumen.promedioDiario) }}</strong><em>kg</em></div>
            </article>
          </section>

          <section class="insights-grid">
            <article class="insight-card">
              <span class="insight-etiqueta">Medida con mayor volumen</span>
              <strong>{{ analisis.resumen.medidaPrincipal.nombre }}</strong>
              <p>{{ formatoNumero(analisis.resumen.medidaPrincipal.kilos) }} kg · {{ formatoNumero(analisis.resumen.medidaPrincipal.porcentaje) }}% del total</p>
            </article>
            <article v-if="analisis.resumen.diaPico" class="insight-card">
              <span class="insight-etiqueta">Día con mayor pedido</span>
              <strong>{{ formatoFecha(analisis.resumen.diaPico.fecha) }}</strong>
              <p>{{ formatoNumero(analisis.resumen.diaPico.kilos) }} kg en las medidas seleccionadas</p>
            </article>
            <article class="insight-card">
              <span class="insight-etiqueta">Días con actividad</span>
              <strong>{{ analisis.resumen.diasConPedido }}</strong>
              <p>Días distintos con pedido dentro del rango</p>
            </article>
          </section>

          <section class="graficas-grid">
            <article class="grafica-card">
              <div class="seccion-titulo">
                <div><span>Distribución</span><h3>Participación por medida</h3></div>
                <i class="fas fa-chart-doughnut"></i>
              </div>
              <div class="canvas-contenedor"><canvas ref="graficaMedidas"></canvas></div>
            </article>
            <article class="grafica-card">
              <div class="seccion-titulo">
                <div><span>Tendencia</span><h3>Kilos pedidos por día</h3></div>
                <i class="fas fa-chart-bar"></i>
              </div>
              <div class="canvas-contenedor"><canvas ref="graficaFechas"></canvas></div>
            </article>
          </section>

          <section class="detalle-grid">
            <article class="tabla-card tabla-medidas">
              <div class="seccion-titulo">
                <div><span>Detalle</span><h3>Totales por medida</h3></div>
              </div>
              <div class="tabla-scroll">
                <table>
                  <thead><tr><th>Medida</th><th>Kilos</th><th>Taras</th><th>Pedidos</th><th>%</th></tr></thead>
                  <tbody>
                    <tr v-for="fila in analisis.porMedida" :key="fila.clave">
                      <td>
                        <strong>{{ fila.nombre }}</strong>
                        <span class="barra-participacion"><i :style="{ width: `${fila.porcentaje}%` }"></i></span>
                      </td>
                      <td>{{ formatoNumero(fila.kilos) }}</td>
                      <td>{{ formatoNumero(fila.taras) }}</td>
                      <td>{{ fila.pedidos }}</td>
                      <td>{{ formatoNumero(fila.porcentaje) }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>

            <article class="tabla-card tabla-clientes">
              <div class="seccion-titulo">
                <div><span>Pedido completo del rango</span><h3>Totales por cliente</h3></div>
              </div>
              <details class="calculo-ayuda">
                <summary><i class="fas fa-calculator"></i> ¿Cómo se calcula?</summary>
                <p>Esta sección suma todas las medidas y maquilas de cada cliente dentro del rango, sin aplicar la selección de medidas. Los kilos usan el tipo y factor de agua; las taras son las capturadas o la estimación correspondiente.</p>
              </details>
              <p class="cliente-instruccion"><i class="fas fa-hand-pointer"></i> Toca un cliente y después un día para ver su desglose.</p>
              <div class="clientes-lista">
                <div v-for="cliente in analisis.porCliente" :key="cliente.nombre" class="cliente-grupo">
                  <button type="button" class="cliente-fila" @click="alternarCliente(cliente.nombre)">
                    <span class="cliente-avatar">{{ iniciales(cliente.nombre) }}</span>
                    <span class="cliente-datos"><strong>{{ cliente.nombre }}</strong><small>{{ cliente.pedidos }} pedidos · {{ cliente.dias.length }} días</small></span>
                    <span class="cliente-totales"><strong>{{ formatoNumero(cliente.kilos) }} kg</strong><small>{{ formatoNumero(cliente.taras) }} T</small></span>
                    <i :class="['fas', clienteExpandido === cliente.nombre ? 'fa-chevron-up' : 'fa-chevron-down', 'cliente-chevron']"></i>
                  </button>

                  <div v-if="clienteExpandido === cliente.nombre" class="cliente-dias">
                    <div v-for="dia in cliente.dias" :key="dia.fecha" class="dia-grupo">
                      <button type="button" class="dia-fila" @click="alternarDia(cliente.nombre, dia.fecha)">
                        <span><i class="far fa-calendar-alt"></i> {{ formatoFecha(dia.fecha) }}</span>
                        <small>{{ dia.pedidos }} {{ dia.pedidos === 1 ? 'pedido' : 'pedidos' }}</small>
                        <strong>{{ formatoNumero(dia.kilos) }} kg</strong>
                        <small>{{ formatoNumero(dia.taras) }} T</small>
                        <i :class="['fas', diaEstaExpandido(cliente.nombre, dia.fecha) ? 'fa-minus' : 'fa-plus']"></i>
                      </button>
                      <div v-if="diaEstaExpandido(cliente.nombre, dia.fecha)" class="dia-desglose">
                        <div v-for="medida in dia.medidas" :key="medida.clave" class="dia-medida">
                          <span>{{ medida.nombre }}</span>
                          <strong>{{ formatoNumero(medida.kilos) }} kg</strong>
                          <small>{{ formatoNumero(medida.taras) }} T</small>
                        </div>
                        <div class="dia-suma">
                          <span>Total del día</span>
                          <strong>{{ formatoNumero(dia.kilos) }} kg</strong>
                          <small>{{ formatoNumero(dia.taras) }} T</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </section>
        </template>

        <section v-else-if="medidasDisponibles.length && medidasSeleccionadas.length === 0" class="estado-vacio">
          <i class="fas fa-mouse-pointer"></i>
          <h3>Selecciona al menos una medida</h3>
          <p>Los totales y las gráficas se actualizarán automáticamente.</p>
        </section>
      </div>

      <footer class="analisis-footer">
        <div class="footer-rango">
          <i class="far fa-calendar-check"></i>
          {{ formatoFecha(fechaInicioAplicada) }} — {{ formatoFecha(fechaFinAplicada) }}
        </div>
        <div class="footer-botones">
          <button type="button" class="btn-footer btn-secundario" @click="cerrar">Cerrar</button>
          <button type="button" class="btn-footer btn-pdf" :disabled="!hayResultados || exportandoPdf" @click="exportarPDF">
            <i :class="['fas', exportandoPdf ? 'fa-spinner fa-spin' : 'fa-file-pdf']"></i>
            {{ exportandoPdf ? 'Generando...' : 'Imprimir análisis PDF' }}
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<script>
import Chart from 'chart.js/auto'
import {
  construirAnalisisPedidosLimpio,
  obtenerMedidasPedidosLimpio
} from '@/utils/analisisPedidosLimpio'
import { generarAnalisisPedidosLimpioPDF } from '@/utils/pdf/analisisPedidosLimpio'

const COLORES = [
  '#18a6e8', '#f26a21', '#36c18a', '#8566d8', '#f3b33d',
  '#e55278', '#38b7b1', '#6887d8', '#93bd42', '#b968cc'
]

export default {
  name: 'AnalisisPedidoLimpioModal',
  props: {
    mostrar: { type: Boolean, default: false },
    pedidos: { type: Array, default: () => [] }
  },
  emits: ['cerrar'],
  data() {
    return {
      fechaInicioInput: '',
      fechaFinInput: '',
      fechaInicioAplicada: '',
      fechaFinAplicada: '',
      medidasSeleccionadas: [],
      busquedaMedida: '',
      errorRango: '',
      exportandoPdf: false,
      clienteExpandido: '',
      diasExpandidos: {},
      graficaMedidasInstancia: null,
      graficaFechasInstancia: null
    }
  },
  computed: {
    fechasConPedidoLimpio() {
      return [...new Set(
        this.pedidos
          .filter(pedido => pedido?.tipo === 'limpio' && /^\d{4}-\d{2}-\d{2}$/.test(pedido.fecha || ''))
          .map(pedido => pedido.fecha)
      )].sort()
    },
    medidasDisponibles() {
      if (!this.fechaInicioAplicada || !this.fechaFinAplicada) return []
      return obtenerMedidasPedidosLimpio(
        this.pedidos,
        this.fechaInicioAplicada,
        this.fechaFinAplicada
      )
    },
    medidasFiltradas() {
      const busqueda = this.busquedaMedida.trim().toLocaleLowerCase('es')
      if (!busqueda) return this.medidasDisponibles
      return this.medidasDisponibles.filter(medida => medida.nombre.toLocaleLowerCase('es').includes(busqueda))
    },
    analisis() {
      return construirAnalisisPedidosLimpio(this.pedidos, {
        fechaInicio: this.fechaInicioAplicada,
        fechaFin: this.fechaFinAplicada,
        medidasSeleccionadas: this.medidasSeleccionadas
      })
    },
    hayResultados() {
      return this.medidasSeleccionadas.length > 0 && this.analisis.resumen.kilosTotal > 0
    }
  },
  watch: {
    mostrar(visible) {
      this.actualizarEstadoPagina(visible)
      if (visible) {
        this.inicializarRango()
      } else {
        this.destruirGraficas()
      }
    },
    analisis: {
      deep: true,
      handler() {
        if (this.mostrar) this.$nextTick(this.actualizarGraficas)
      }
    }
  },
  mounted() {
    this.actualizarEstadoPagina(this.mostrar)
    if (this.mostrar) this.inicializarRango()
  },
  beforeDestroy() {
    this.actualizarEstadoPagina(false)
    this.destruirGraficas()
  },
  methods: {
    actualizarEstadoPagina(abierto) {
      if (typeof document === 'undefined') return
      document.body.classList.toggle('analisis-pedido-modal-abierto', abierto)
    },
    inicializarRango() {
      const ultimaFecha = this.fechasConPedidoLimpio[this.fechasConPedidoLimpio.length - 1]
        || new Date().toISOString().slice(0, 10)
      const inicio = new Date(`${ultimaFecha}T00:00:00`)
      inicio.setDate(inicio.getDate() - 29)

      this.fechaFinInput = ultimaFecha
      this.fechaInicioInput = inicio.toISOString().slice(0, 10)
      this.busquedaMedida = ''
      this.clienteExpandido = ''
      this.diasExpandidos = {}
      this.aplicarRango()
    },
    aplicarRango() {
      this.errorRango = ''
      if (!this.fechaInicioInput || !this.fechaFinInput) {
        this.errorRango = 'Selecciona ambas fechas para continuar.'
        return
      }
      if (this.fechaInicioInput > this.fechaFinInput) {
        this.errorRango = 'La fecha inicial no puede ser posterior a la fecha final.'
        return
      }

      this.fechaInicioAplicada = this.fechaInicioInput
      this.fechaFinAplicada = this.fechaFinInput
      this.$nextTick(() => {
        this.medidasSeleccionadas = this.medidasDisponibles.map(medida => medida.clave)
      })
    },
    seleccionarTodas() {
      this.medidasSeleccionadas = this.medidasDisponibles.map(medida => medida.clave)
    },
    limpiarSeleccion() {
      this.medidasSeleccionadas = []
    },
    estaSeleccionada(clave) {
      return this.medidasSeleccionadas.includes(clave)
    },
    alternarMedida(clave) {
      if (this.estaSeleccionada(clave)) {
        this.medidasSeleccionadas = this.medidasSeleccionadas.filter(item => item !== clave)
      } else {
        this.medidasSeleccionadas = [...this.medidasSeleccionadas, clave]
      }
    },
    alternarCliente(nombre) {
      this.clienteExpandido = this.clienteExpandido === nombre ? '' : nombre
    },
    claveDia(cliente, fecha) {
      return `${cliente}__${fecha}`
    },
    diaEstaExpandido(cliente, fecha) {
      return Boolean(this.diasExpandidos[this.claveDia(cliente, fecha)])
    },
    alternarDia(cliente, fecha) {
      const clave = this.claveDia(cliente, fecha)
      this.$set(this.diasExpandidos, clave, !this.diasExpandidos[clave])
    },
    formatoNumero(valor) {
      return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(Number(valor) || 0)
    },
    formatoFecha(valor) {
      if (!valor) return '—'
      return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
      }).format(new Date(`${valor}T00:00:00Z`))
    },
    iniciales(nombre) {
      return String(nombre || '')
        .split(/\s+/)
        .slice(0, 2)
        .map(parte => parte.charAt(0).toUpperCase())
        .join('')
    },
    destruirGraficas() {
      if (this.graficaMedidasInstancia) this.graficaMedidasInstancia.destroy()
      if (this.graficaFechasInstancia) this.graficaFechasInstancia.destroy()
      this.graficaMedidasInstancia = null
      this.graficaFechasInstancia = null
    },
    actualizarGraficas() {
      this.destruirGraficas()
      if (!this.hayResultados || !this.$refs.graficaMedidas || !this.$refs.graficaFechas) return

      const medidas = this.analisis.porMedida
      this.graficaMedidasInstancia = new Chart(this.$refs.graficaMedidas, {
        type: 'doughnut',
        data: {
          labels: medidas.map(item => item.nombre),
          datasets: [{
            data: medidas.map(item => item.kilos),
            backgroundColor: medidas.map((_, index) => COLORES[index % COLORES.length]),
            borderColor: '#101e33',
            borderWidth: 3,
            hoverOffset: 7
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '61%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#c9d8ea', boxWidth: 12, padding: 13, font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: contexto => ` ${contexto.label}: ${this.formatoNumero(contexto.raw)} kg`
              }
            }
          }
        }
      })

      const fechas = this.analisis.porFecha
      this.graficaFechasInstancia = new Chart(this.$refs.graficaFechas, {
        type: 'bar',
        data: {
          labels: fechas.map(item => this.formatoFecha(item.fecha).replace(/ de /g, ' ')),
          datasets: [{
            label: 'Kilos pedidos',
            data: fechas.map(item => item.kilos),
            backgroundColor: 'rgba(242, 106, 33, 0.78)',
            borderColor: '#ff8a45',
            borderWidth: 1,
            borderRadius: 7,
            maxBarThickness: 42
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { color: '#9eb1c9', maxRotation: 45, minRotation: 0 },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              ticks: { color: '#9eb1c9', callback: valor => `${this.formatoNumero(valor)} kg` },
              grid: { color: 'rgba(145, 168, 197, 0.12)' }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: contexto => ` ${this.formatoNumero(contexto.raw)} kg` } }
          }
        }
      })
    },
    async exportarPDF() {
      if (!this.hayResultados || this.exportandoPdf) return
      this.exportandoPdf = true
      try {
        await this.$nextTick()
        generarAnalisisPedidosLimpioPDF(this.analisis)
      } catch (error) {
        console.error('Error al generar el análisis PDF:', error)
        alert('No se pudo generar el PDF del análisis. Intenta nuevamente.')
      } finally {
        this.exportandoPdf = false
      }
    },
    cerrar() {
      this.$emit('cerrar')
    }
  }
}
</script>

<style scoped>
.analisis-overlay {
  position: fixed;
  inset: 0;
  z-index: 10030;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background: rgba(3, 8, 20, 0.82);
  backdrop-filter: blur(7px);
}

.analisis-modal {
  display: flex;
  flex-direction: column;
  width: min(1180px, 100%);
  max-height: calc(100vh - 44px);
  overflow: hidden;
  color: #eaf2fc;
  background: #091425;
  border: 1px solid rgba(102, 153, 211, 0.27);
  border-radius: 22px;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.58);
}

.analisis-header {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 21px 25px;
  background: linear-gradient(120deg, #132743, #0d1b30 72%, #123326);
  border-bottom: 1px solid rgba(114, 159, 208, 0.2);
}

.header-icono,
.filtros-titulo > span {
  display: grid;
  place-items: center;
  width: 49px;
  height: 49px;
  color: #061b2e;
  font-size: 21px;
  background: linear-gradient(135deg, #4cddff, #51e8a7);
  border-radius: 14px;
}

.header-texto p,
.header-texto h2,
.header-texto span,
.filtros-titulo h3,
.filtros-titulo p {
  margin: 0;
}

.header-texto p {
  color: #65dcb1;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .11em;
  text-transform: uppercase;
}

.header-texto h2 { margin: 3px 0 4px; font-size: 24px; }
.header-texto span { color: #9eb1c9; font-size: 13px; }

.btn-cerrar-modal {
  align-self: start;
  padding: 0;
  color: #91a8c5;
  font-size: 31px;
  line-height: 31px;
  background: transparent;
  border: 0;
}

.analisis-contenido {
  flex: 1;
  overflow-y: auto;
  padding: 22px 24px 30px;
}

.panel-filtros,
.panel-medidas,
.grafica-card,
.tabla-card,
.insight-card {
  background: rgba(18, 34, 57, 0.84);
  border: 1px solid rgba(112, 152, 198, 0.18);
  border-radius: 16px;
}

.panel-filtros { padding: 18px 20px; }
.panel-medidas { margin-top: 14px; padding: 18px 20px; }

.filtros-titulo { display: flex; gap: 12px; align-items: center; }
.filtros-titulo > span { width: 38px; height: 38px; font-size: 16px; border-radius: 11px; }
.filtros-titulo h3 { font-size: 16px; }
.filtros-titulo p { margin-top: 3px; color: #8fa5bf; font-size: 12px; }

.rango-controles {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) auto minmax(160px, 1fr) auto;
  gap: 12px;
  align-items: end;
  margin-top: 16px;
}

.rango-controles label { display: grid; gap: 6px; }
.rango-controles label > span { color: #91a8c5; font-size: 11px; font-weight: 800; text-transform: uppercase; }
.rango-controles input,
.buscador-medida input {
  min-height: 43px;
  padding: 9px 12px;
  color: #eaf2fc;
  color-scheme: dark;
  background: #081426;
  border: 1px solid #2a4567;
  border-radius: 10px;
  outline: none;
}
.rango-controles input:focus,
.buscador-medida input:focus { border-color: #35bde9; box-shadow: 0 0 0 3px rgba(53, 189, 233, .12); }
.rango-flecha { align-self: center; color: #69809d; padding-top: 17px; }

.btn-aplicar {
  min-height: 43px;
  padding: 10px 18px;
  color: #061b2e;
  font-weight: 800;
  background: linear-gradient(135deg, #4cddff, #51e8a7);
  border: 0;
  border-radius: 10px;
}

.error-rango { margin: 11px 0 0; color: #ff9aa9; font-size: 13px; }
.medidas-encabezado { display: flex; justify-content: space-between; gap: 14px; align-items: center; }
.nota-exclusion { margin: 10px 0 0; color: #8fa5bf; font-size: 11px; }
.nota-exclusion i { margin-right: 5px; color: #55d8ae; }
.medidas-acciones { display: flex; gap: 8px; }
.medidas-acciones button {
  padding: 7px 10px;
  color: #b9cbe0;
  font-size: 11px;
  font-weight: 700;
  background: #172b46;
  border: 1px solid #2b4668;
  border-radius: 8px;
}

.buscador-medida {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  margin-top: 15px;
  color: #7f95af;
}
.buscador-medida input { min-height: 38px; width: 100%; }
.buscador-medida span { color: #67dcb2; font-size: 12px; font-weight: 700; }

.medidas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  max-height: 190px;
  margin-top: 12px;
  padding-right: 4px;
  overflow-y: auto;
}

.medida-chip {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 38px;
  padding: 8px 10px;
  color: #b7c7da;
  cursor: pointer;
  background: #0a182a;
  border: 1px solid #263c59;
  border-radius: 9px;
  transition: .18s ease;
}
.medida-chip input { position: absolute; opacity: 0; pointer-events: none; }
.chip-check { display: grid; width: 18px; height: 18px; place-items: center; color: transparent; font-size: 9px; border: 1px solid #526a87; border-radius: 5px; }
.medida-chip.seleccionada { color: #e8f6ff; background: rgba(24, 166, 232, .14); border-color: #2fb5ec; }
.medida-chip.seleccionada .chip-check { color: #062033; background: #4cd9ff; border-color: #4cd9ff; }

.resumen-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px; }
.stat-card { display: flex; gap: 13px; align-items: center; min-height: 92px; padding: 15px; background: linear-gradient(145deg, #152a46, #101e33); border: 1px solid rgba(115, 159, 208, .2); border-radius: 15px; }
.stat-icon { display: grid; flex: 0 0 42px; width: 42px; height: 42px; place-items: center; border-radius: 12px; }
.stat-card small { display: block; color: #91a6bf; font-size: 10px; font-weight: 800; text-transform: uppercase; }
.stat-card strong { display: inline-block; margin-top: 4px; font-size: 25px; line-height: 1; }
.stat-card em { margin-left: 5px; color: #8298b3; font-size: 12px; font-style: normal; }
.stat-kilos .stat-icon { color: #66dfff; background: rgba(24, 166, 232, .16); }
.stat-taras .stat-icon { color: #ff9a5e; background: rgba(242, 106, 33, .16); }
.stat-pedidos .stat-icon { color: #65e1b0; background: rgba(54, 193, 138, .16); }
.stat-promedio .stat-icon { color: #b8a1ff; background: rgba(133, 102, 216, .18); }

.insights-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
.insight-card { padding: 14px 16px; }
.insight-etiqueta { color: #7f96b1; font-size: 10px; font-weight: 800; text-transform: uppercase; }
.insight-card strong { display: block; margin-top: 5px; color: #64dcff; font-size: 18px; }
.insight-card p { margin: 4px 0 0; color: #9caec2; font-size: 11px; }

.graficas-grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: 12px; margin-top: 12px; }
.grafica-card, .tabla-card { padding: 17px; min-width: 0; }
.seccion-titulo { display: flex; justify-content: space-between; align-items: center; margin-bottom: 13px; }
.seccion-titulo span { color: #56d9ae; font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.seccion-titulo h3 { margin: 3px 0 0; font-size: 15px; }
.seccion-titulo > i { color: #496583; }
.canvas-contenedor { position: relative; height: 285px; }

.detalle-grid { display: grid; grid-template-columns: 1.35fr .65fr; gap: 12px; margin-top: 12px; }
.tabla-scroll { max-height: 360px; overflow: auto; }
.tabla-card table { width: 100%; margin: 0; border-collapse: collapse; }
.tabla-card th { padding: 9px 8px; color: #8197b1; font-size: 9px; text-align: right; text-transform: uppercase; background: transparent; border-bottom: 1px solid #2a405e; }
.tabla-card th:first-child, .tabla-card td:first-child { text-align: left; }
.tabla-card td { padding: 11px 8px; color: #c8d6e7; font-size: 12px; text-align: right; border-bottom: 1px solid rgba(91, 119, 153, .16); }
.barra-participacion { display: block; width: 90px; height: 3px; margin-top: 5px; background: #263b58; border-radius: 3px; }
.barra-participacion i { display: block; height: 100%; max-width: 100%; background: linear-gradient(90deg, #23aee8, #55e2ac); border-radius: 3px; }
.calculo-ayuda { margin-bottom: 9px; padding: 9px 10px; color: #9cb0c8; font-size: 10px; background: rgba(59, 93, 131, .13); border: 1px solid rgba(104, 143, 187, .18); border-radius: 9px; }
.calculo-ayuda summary { color: #62dab4; font-weight: 800; cursor: pointer; }
.calculo-ayuda summary i { margin-right: 5px; }
.calculo-ayuda p { margin: 8px 0 0; line-height: 1.5; }
.cliente-instruccion { margin: 0 0 5px; color: #778da7; font-size: 9px; }
.cliente-instruccion i { margin-right: 4px; }
.clientes-lista { max-height: 430px; overflow-y: auto; }
.cliente-grupo { border-bottom: 1px solid rgba(91, 119, 153, .16); }
.cliente-fila { display: grid; width: 100%; grid-template-columns: auto 1fr auto auto; gap: 10px; align-items: center; padding: 10px 2px; color: inherit; text-align: left; cursor: pointer; background: transparent; border: 0; }
.cliente-fila:hover { background: rgba(77, 127, 180, .08); }
.cliente-avatar { display: grid; width: 33px; height: 33px; place-items: center; color: #0a2237; font-size: 11px; font-weight: 900; background: #64dafe; border-radius: 10px; }
.cliente-datos strong, .cliente-datos small, .cliente-totales strong, .cliente-totales small { display: block; }
.cliente-datos strong, .cliente-totales strong { font-size: 12px; }
.cliente-datos small, .cliente-totales small { margin-top: 3px; color: #8298b3; font-size: 10px; }
.cliente-totales { text-align: right; }
.cliente-chevron { color: #58718f; font-size: 9px; }
.cliente-dias { margin: 0 0 9px 43px; overflow: hidden; background: #0b192b; border: 1px solid #213955; border-radius: 9px; }
.dia-grupo + .dia-grupo { border-top: 1px solid rgba(91, 119, 153, .16); }
.dia-fila { display: grid; width: 100%; grid-template-columns: minmax(115px, 1fr) auto auto auto auto; gap: 7px; align-items: center; padding: 9px; color: #a9bbd0; font-size: 9px; text-align: left; cursor: pointer; background: transparent; border: 0; }
.dia-fila > span { color: #d4e1ef; font-weight: 700; }
.dia-fila > span i { margin-right: 4px; color: #55dcae; }
.dia-fila > strong { color: #eef5ff; font-size: 10px; }
.dia-fila > i { color: #5dcff2; font-size: 8px; }
.dia-desglose { padding: 0 9px 8px; }
.dia-medida, .dia-suma { display: grid; grid-template-columns: 1fr auto auto; gap: 12px; padding: 6px 8px; color: #8298b3; font-size: 9px; border-top: 1px dashed rgba(105, 139, 177, .17); }
.dia-medida strong, .dia-suma strong { color: #c8d9ea; }
.dia-suma { color: #62dab4; font-weight: 800; background: rgba(74, 205, 163, .06); }

.estado-vacio { margin-top: 16px; padding: 36px 20px; color: #8298b3; text-align: center; background: rgba(17, 32, 54, .7); border: 1px dashed #314b6b; border-radius: 15px; }
.estado-vacio > i { color: #476887; font-size: 28px; }
.estado-vacio h3 { margin: 10px 0 4px; color: #c9d8e9; }
.estado-vacio p { margin: 5px 0 0; }
.compacto-vacio { margin-top: 14px; padding: 18px; }
.compacto-vacio > i { font-size: 20px; }

.analisis-footer { display: flex; justify-content: space-between; gap: 15px; align-items: center; padding: 15px 24px; background: #0d1c30; border-top: 1px solid rgba(112, 152, 198, .18); }
.footer-rango { color: #8fa5bf; font-size: 12px; }
.footer-rango i { margin-right: 6px; color: #55dcae; }
.footer-botones { display: flex; gap: 9px; }
.btn-footer { min-height: 41px; padding: 9px 16px; font-weight: 800; border-radius: 10px; }
.btn-secundario { color: #b8c8db; background: #182a43; border: 1px solid #2e4868; }
.btn-pdf { color: white; background: linear-gradient(135deg, #db3d4d, #f06b40); border: 0; }
.btn-pdf:disabled { cursor: not-allowed; opacity: .45; }

@media (max-width: 850px) {
  .resumen-cards { grid-template-columns: repeat(2, 1fr); }
  .graficas-grid, .detalle-grid { grid-template-columns: 1fr; }
  .insights-grid { grid-template-columns: 1fr; }
}

@media (max-width: 620px) {
  .analisis-overlay { align-items: flex-end; padding: 0; }
  .analisis-modal { width: 100%; max-height: 100vh; border-radius: 18px 18px 0 0; }
  .analisis-header { padding: 15px; }
  .header-icono { width: 42px; height: 42px; }
  .header-texto h2 { font-size: 18px; }
  .header-texto span { display: none; }
  .analisis-contenido { padding: 14px; }
  .rango-controles { grid-template-columns: 1fr 1fr; }
  .rango-controles label { min-width: 0; }
  .rango-controles input { width: 100%; min-width: 0; box-sizing: border-box; }
  .rango-flecha { display: none; }
  .btn-aplicar { grid-column: 1 / -1; width: 100%; }
  .medidas-encabezado { align-items: flex-start; flex-direction: column; }
  .buscador-medida { grid-template-columns: auto 1fr; }
  .buscador-medida span { grid-column: 2; }
  .medidas-grid { grid-template-columns: repeat(2, 1fr); }
  .resumen-cards { grid-template-columns: 1fr 1fr; gap: 8px; }
  .stat-card { min-height: 78px; padding: 11px; }
  .stat-icon { display: none; }
  .stat-card strong { font-size: 20px; }
  .canvas-contenedor { height: 250px; }
  .analisis-footer { align-items: stretch; flex-direction: column; padding: 12px 14px; }
  .footer-botones { display: grid; grid-template-columns: 1fr 1.5fr; }
}
</style>

<style>
body.analisis-pedido-modal-abierto {
  overflow: hidden;
}

/* La barra principal vive en un contexto de apilamiento superior al
   router-view; ocultarla mientras el modal está abierto evita que tape su
   encabezado, especialmente en pantallas pequeñas. */
body.analisis-pedido-modal-abierto .predator-nav-wrapper {
  visibility: hidden;
}
</style>
