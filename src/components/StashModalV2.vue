<template>
  <span>
    <button v-if="renderTrigger" type="button" @click="abrirModal" class="stash-button">
      Stash
    </button>

    <!-- Modal Principal a nivel de página -->
    <div v-if="showModal" class="modal-overlay" @click.self="cerrarModal">
        <div class="modal-content" @click.stop>
          <h3>Sistema de Abonos - {{ clienteNombre }}</h3>
          
          <!-- Resumen del Estado Actual -->
          <div class="estado-actual">
            <h4>Estado Actual</h4>
            <div class="estado-cards">
              <div class="card-estado">
                <span class="label">Saldo Actual</span>
                <span class="value" :class="{ negativo: saldoActual > 0, positivo: saldoActual <= 0 }">
                  ${{ formatNumber(saldoActual) }}
                </span>
              </div>
              <div class="card-estado">
                <span class="label">Total en Stash</span>
                <span class="value verde">${{ formatNumber(totalStash) }}</span>
              </div>
              <div class="card-estado">
                <span class="label">Estado</span>
                <span class="value" :class="{ pagado: saldoActual <= 0, pendiente: saldoActual > 0 }">
                  {{ saldoActual <= 0 ? 'PAGADO' : 'PENDIENTE' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Formulario para Agregar al Stash -->
          <div class="seccion-agregar">
            <h4>Agregar Nuevo Abono al Stash</h4>
            <div class="form-row">
              <input 
                type="date" 
                v-model="nuevoAbono.fecha" 
                class="input-field"
              >
              <select
                v-model="nuevoAbono.metodo"
                class="input-field"
                aria-label="Método de abono"
              >
                <option v-for="opcion in metodosPago" :key="opcion" :value="opcion">
                  {{ opcion }}
                </option>
              </select>
              <input 
                type="text" 
                v-model="nuevoAbono.descripcion" 
                placeholder="Descripción (ej: SPEI, Efectivo, etc.)"
                class="input-field"
              >
              <input 
                type="number" 
                v-model.number="nuevoAbono.monto" 
                placeholder="Monto"
                class="input-field"
                step="0.01"
              >
              <button @click="agregarAlStash" class="btn-primary">
                Agregar
              </button>
            </div>
          </div>

          <!-- Lista del Stash -->
          <div class="seccion-stash">
            <h4>Abonos en Stash ({{ stashItems.length }})</h4>
            
            <!-- Información de distribución en cascada -->
            <div v-if="stashItems.length > 0 && distribucionAbonos.distribucion.length > 0" class="distribucion-cascada-info">
              <div class="info-header">
                <span class="icono">💧</span>
                <span class="texto">Distribución en Cascada (${{ formatNumber(totalStash) }}):</span>
              </div>
              
              <div class="distribucion-lista">
                <div v-for="(item, index) in distribucionAbonos.distribucion" :key="index" class="distribucion-item">
                  <div class="distribucion-cuenta">
                    <span class="fecha">{{ item.cuenta.fechaFormateada }}</span>
                    <span class="monto">${{ formatNumber(item.montoAAplicar) }}</span>
                  </div>
                  <div class="distribucion-detalle">
                    Saldo: ${{ formatNumber(item.saldoAntes) }} → ${{ formatNumber(item.saldoDespues) }}
                  </div>
                </div>
              </div>
              
              <div v-if="distribucionAbonos.sobrante > 0" class="sobrante-info">
                ⚠️ Sobrante sin aplicar: ${{ formatNumber(distribucionAbonos.sobrante) }}
              </div>
            </div>
            
            <div v-if="stashItems.length === 0" class="empty-state">
              No hay abonos en el stash
            </div>
            <div v-else class="stash-list">
              <div v-for="item in stashItems" :key="item.id" class="stash-item">
                <div class="item-info">
                  <span class="fecha">{{ formatearFecha(item.fecha) }}</span>
                  <span class="descripcion">{{ item.descripcion }}</span>
                  <span v-if="item.esEfectivo" class="badge-efectivo">Efectivo</span>
                  <span class="monto">${{ formatNumber(item.monto) }}</span>
                </div>
                <div class="item-actions">
                  <div class="fecha-aplicacion">
                    <label class="fecha-label">Aplicar a:</label>
                    <select 
                      v-model="fechasAplicacion[item.id]" 
                      class="select-fecha"
                      @change="onFechaAplicacionChange(item.id)"
                    >
                      <option value="">Seleccionar fecha...</option>
                      <option 
                        v-for="cuenta in cuentasDisponibles" 
                        :key="cuenta.id" 
                        :value="cuenta.id"
                      >
                        {{ cuenta.fechaFormateada }} - ${{ formatNumber(cuenta.totalGeneralVenta) }}
                      </option>
                    </select>
                  </div>
                  <button @click="eliminarDelStash(item.id)" class="btn-danger-small">
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Vista Previa de Aplicación -->
          <div v-if="stashItems.length > 0 && saldoActual > 0" class="seccion-preview">
            <h4>Vista Previa de Aplicación</h4>
            <div class="preview-info">
              <p>Aplicaciones programadas:</p>
              <div class="aplicaciones-preview">
                <div v-for="item in stashItems" :key="item.id" class="aplicacion-item">
                  <div class="aplicacion-info">
                    <span class="aplicacion-descripcion">{{ item.descripcion }}</span>
                    <span class="aplicacion-monto">${{ formatNumber(item.monto) }}</span>
                  </div>
                  <div class="aplicacion-fecha">
                    <span v-if="fechasAplicacion[item.id] && fechasAplicacion[item.id] !== ''" class="fecha-seleccionada">
                      → {{ obtenerFechaCuenta(fechasAplicacion[item.id]) }}
                    </span>
                    <span v-else class="fecha-pendiente">
                      ⚠️ Sin fecha seleccionada
                    </span>
                  </div>
                </div>
              </div>
              <div class="preview-calc">
                <div class="calc-row">
                  <span>Saldo Actual:</span>
                  <span>${{ formatNumber(saldoActual) }}</span>
                </div>
                <div class="calc-row">
                  <span>Total Abonos:</span>
                  <span class="verde">-${{ formatNumber(totalStash) }}</span>
                </div>
                <div class="calc-row resultado">
                  <span>Resultado:</span>
                  <span :class="{ positivo: saldoResultante <= 0, negativo: saldoResultante > 0 }">
                    ${{ formatNumber(saldoResultante) }}
                  </span>
                </div>
              </div>
              <div v-if="saldoResultante < 0" class="warning-box">
                ⚠️ Habrá un sobrante de ${{ formatNumber(Math.abs(saldoResultante)) }}
              </div>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="modal-actions">
            <button 
              v-if="stashItems.length > 0 && saldoActual > 0" 
              @click="validarYMostrarConfirmacion" 
              class="btn-aplicar"
              :disabled="isAplicando || !todasFechasSeleccionadas"
            >
              {{ isAplicando ? 'Aplicando...' : 'Aplicar Abonos al Saldo' }}
            </button>
            
            <!-- Botón para aplicar en cascada -->
            <button 
              v-if="stashItems.length > 0 && distribucionAbonos.distribucion.length > 0" 
              @click="aplicarACuentaMasAntigua" 
              class="btn-auto-aplicar"
              :disabled="isAplicando"
              :title="`Aplicar $${formatNumber(totalStash)} en cascada a ${distribucionAbonos.distribucion.length} cuenta(s)`"
            >
              {{ isAplicando ? 'Aplicando...' : '💧 Aplicar en Cascada' }}
              <span v-if="distribucionAbonos.distribucion.length > 1" class="cascada-count">
                ({{ distribucionAbonos.distribucion.length }} cuentas)
              </span>
            </button>
            
            <button @click="verHistorial = true" class="btn-secondary">
              Historial de Abonos
            </button>
            <button @click="cerrarModal" class="btn-secondary">
              Cerrar
            </button>
          </div>
        </div>
      </div>

    <!-- Modal de Confirmación a nivel de página -->
    <div v-if="mostrarConfirmacion" class="modal-overlay" @click.self="mostrarConfirmacion = false">
        <div class="modal-content confirmacion" @click.stop>
            <h3>⚠️ Confirmación de Aplicación</h3>
            
            <div class="confirmacion-detalle">
              <p><strong>Está a punto de aplicar los siguientes abonos:</strong></p>
              
              <div class="lista-confirmacion">
                <div v-for="item in stashItems" :key="item.id" class="item-confirmacion">
                  <div class="confirmacion-item-info">
                    <span>{{ formatearFecha(item.fecha) }} - {{ item.descripcion }}</span>
                    <span class="confirmacion-fecha-aplicacion">
                      → Aplicar a: {{ obtenerFechaCuenta(fechasAplicacion[item.id]) }}
                    </span>
                  </div>
                  <span>${{ formatNumber(item.monto) }}</span>
                </div>
              </div>
              
              <div class="resumen-confirmacion">
                <p><strong>Resumen:</strong></p>
                <ul>
                  <li>Se aplicará un total de: <strong>${{ formatNumber(totalStash) }}</strong></li>
                  <li>A {{ Object.keys(fechasAplicacion).length }} {{ Object.keys(fechasAplicacion).length === 1 ? 'cuenta' : 'cuentas' }} diferentes</li>
                  <li>Resultado estimado del saldo: <strong :class="{ positivo: saldoResultante <= 0 }">${{ formatNumber(saldoResultante) }}</strong></li>
                </ul>
              </div>
            </div>

            <div class="confirmacion-actions">
              <button @click="aplicarAbonosIndividuales" class="btn-danger">
                Confirmar y Aplicar
              </button>
              <button @click="mostrarConfirmacion = false" class="btn-secondary">
                Cancelar
              </button>
            </div>
        </div>
      </div>

    <!-- Modal de Historial a nivel de página -->
    <div v-if="verHistorial" class="modal-overlay" @click.self="verHistorial = false">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Historial de Abonos</h3>
            <button @click="verHistorial = false" class="btn-close-modal" title="Cerrar">
              ✕
            </button>
          </div>
          
          <div v-if="todosLosAbonos.length === 0" class="empty-state">
            No hay abonos registrados
          </div>
          
          <div v-else>
            <div class="historial-info">
              <p>Mostrando {{ ((paginaActual - 1) * 7) + 1 }}-{{ Math.min(paginaActual * 7, historialPorFecha.length) }} de {{ historialPorFecha.length }} registros</p>
            </div>
            
            <div class="historial-grupos">
              <div
                v-for="grupo in historialPaginado"
                :key="grupo.id"
                class="historial-grupo"
                :class="{ 'grupo-expandido': esGrupoExpandido(grupo.id) }"
              >
              <div class="grupo-header" @click="toggleGrupoHistorial(grupo.id)">
                <div class="grupo-fecha">
                  <span class="grupo-fecha-texto">{{ grupo.fechaLabel }}</span>
                  <span class="grupo-meta">{{ grupo.abonos.length }} {{ grupo.abonos.length === 1 ? 'abono' : 'abonos' }}</span>
                </div>
                <div class="grupo-total">${{ formatNumber(grupo.totalMonto) }}</div>
                <button class="grupo-toggle" type="button" :aria-expanded="esGrupoExpandido(grupo.id)">
                  <i :class="['fas', esGrupoExpandido(grupo.id) ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
                </button>
              </div>
              <transition name="fade">
                <div v-if="esGrupoExpandido(grupo.id)" class="grupo-detalle">
                  <div v-if="grupo.cuentas.length" class="grupo-resumen">
                    <div
                      v-for="cuenta in grupo.cuentas"
                      :key="cuenta.id"
                      class="grupo-resumen-item"
                    >
                      <div class="resumen-cuenta-info">
                        <span class="resumen-cuenta-fecha">{{ cuenta.fechaCuentaFormateada }}</span>
                        <span class="resumen-cuenta-saldo" v-if="cuenta.saldoAntes !== null">
                          Saldo antes: ${{ formatNumber(cuenta.saldoAntes) }}
                        </span>
                        <span class="resumen-cuenta-saldo" v-if="cuenta.saldoDespues !== null">
                          Saldo después: ${{ formatNumber(cuenta.saldoDespues) }}
                        </span>
                      </div>
                      <div class="resumen-cuenta-monto">
                        ${{ formatNumber(cuenta.total) }}
                      </div>
                    </div>
                  </div>
                  <div class="grupo-abonos">
                    <div
                      v-for="abono in grupo.abonos"
                      :key="abono.uniqueId"
                      class="abono-item"
                    >
                      <div class="abono-main">
                        <div class="abono-left">
                          <div class="abono-fecha">
                            <span class="fecha-cuenta">{{ abono.fechaCuentaFormateada }}</span>
                            <div class="historial-fecha-aplicacion">
                              <template v-if="abono.editandoFecha">
                                <label class="editar-fecha-label">
                                  Fecha de registro
                                  <input
                                    type="datetime-local"
                                    v-model="abono.fechaEditable"
                                    class="input-fecha-registro"
                                  >
                                </label>
                                <div class="acciones-edicion-fecha">
                                  <button
                                    class="btn-guardar-fecha"
                                    :disabled="abono.guardandoFecha || !abono.fechaEditable"
                                    @click.stop="guardarFechaHistorial(abono)"
                                  >
                                    {{ abono.guardandoFecha ? 'Guardando...' : 'Guardar' }}
                                  </button>
                                  <button
                                    class="btn-cancelar-fecha"
                                    :disabled="abono.guardandoFecha"
                                    @click.stop="cancelarEdicionFechaHistorial(abono)"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </template>
                              <template v-else>
                                <span>{{ formatearFechaHora(abono.fechaAplicacion) }}</span>
                                <button
                                  class="btn-editar-fecha"
                                  title="Editar fecha de registro"
                                  @click.stop="iniciarEdicionFechaHistorial(abono)"
                                >
                                  Editar
                                </button>
                              </template>
                            </div>
                          </div>
                          <div class="abono-descripcion">{{ abono.descripcion }}</div>
                          <div class="abono-aplicacion">
                            Aplicado a: {{ abono.fechaCuentaFormateada || 'Sin nota' }}
                          </div>
                          <div v-if="abono.origenDescripcion" class="abono-origen">{{ abono.origenDescripcion }}</div>
                        </div>
                        <div class="abono-right">
                          <div class="abono-monto">${{ formatNumber(abono.monto) }}</div>
                          <button 
                            @click.stop="eliminarAbonoIndividual(abono)" 
                            class="btn-eliminar-abono"
                            title="Eliminar abono"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>
          
          <!-- Controles de Paginación -->
          <div v-if="totalPaginas > 1" class="paginacion">
            <button 
              @click="paginaAnterior" 
              :disabled="paginaActual === 1"
              class="btn-paginacion"
            >
              ← Anterior
            </button>
            
            <div class="paginas-numeros">
              <button
                v-for="pagina in totalPaginas"
                :key="pagina"
                @click="cambiarPagina(pagina)"
                :class="['btn-numero-pagina', { 'activa': pagina === paginaActual }]"
              >
                {{ pagina }}
              </button>
            </div>
            
            <button 
              @click="paginaSiguiente" 
              :disabled="paginaActual === totalPaginas"
              class="btn-paginacion"
            >
              Siguiente →
            </button>
          </div>
          </div>
          
          <div class="modal-actions">
            <button @click="verHistorial = false" class="btn-secondary">
              Cerrar
            </button>
        </div>
        </div>
      </div>
  </span>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { collection, addDoc, deleteDoc, doc, getDocs, getDoc, query, orderBy, limit, where, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'

export default {
  name: 'StashModalV2',
  props: {
    cliente: {
      type: String,
      required: true
    },
    renderTrigger: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    // Estados principales
    const showModal = ref(false)
    const mostrarConfirmacion = ref(false)
    const verHistorial = ref(false)
    const isAplicando = ref(false)
    const mostrarSeleccionFechas = ref(false)
    const paginaActual = ref(1)
    const elementosPorPagina = 7
    
    // Datos
    const stashItems = ref([])
    const saldoActual = ref(0)
    const historialAplicaciones = ref([])
    const cuentasDisponibles = ref([])
    const fechasAplicacion = ref({}) // { itemId: cuentaId }
    const todosLosAbonos = ref([]) // Lista de todos los abonos aplicados
    
    // Función para obtener fecha actual en zona horaria local
    const obtenerFechaLocal = () => {
      const fecha = new Date()
      const year = fecha.getFullYear()
      const month = String(fecha.getMonth() + 1).padStart(2, '0')
      const day = String(fecha.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    // Formularios
    const metodosPago = ['Transferencia', 'Deposito', 'Efectivo']

    const nuevoAbono = ref({
      fecha: obtenerFechaLocal(),
      metodo: metodosPago[0],
      descripcion: '',
      monto: null,
      esEfectivo: false
    })
    
    // Computed
    const clienteNombre = computed(() => {
      return props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)
    })
    
    const totalStash = computed(() => {
      return stashItems.value.reduce((sum, item) => sum + (item.monto || 0), 0)
    })
    
    const saldoResultante = computed(() => {
      return saldoActual.value - totalStash.value
    })
    
    const todasFechasSeleccionadas = computed(() => {
      return stashItems.value.every(item => fechasAplicacion.value[item.id] && fechasAplicacion.value[item.id] !== '')
    })
    
    const cuentaMasAntiguaNoPagada = computed(() => {
      if (cuentasDisponibles.value.length === 0) return null
      // Ordenar por fecha ascendente para obtener la más antigua
      const cuentasOrdenadas = [...cuentasDisponibles.value].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      return cuentasOrdenadas[0] || null
    })
    
    const cuentasOrdenadasPorFecha = computed(() => {
      return [...cuentasDisponibles.value].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    })
    
    const distribucionAbonos = computed(() => {
      if (stashItems.value.length === 0 || cuentasOrdenadasPorFecha.value.length === 0) {
        return { distribucion: [], totalAplicado: 0, sobrante: 0 }
      }
      
      const totalStashValue = totalStash.value
      let montoRestante = totalStashValue
      const distribucion = []
      
      // Simular la distribución en cascada con los saldos actuales disponibles
      for (const cuenta of cuentasOrdenadasPorFecha.value) {
        if (montoRestante <= 0) break
        
        // Usar el saldo actual de la cuenta
        const saldoCuenta = cuenta.nuevoSaldoAcumulado
        
        // Solo procesar cuentas que tengan saldo pendiente
        if (saldoCuenta <= 0) continue
        
        // Calcular cuánto se puede aplicar a esta cuenta
        const montoAAplicar = Math.min(montoRestante, saldoCuenta)
        
        if (montoAAplicar > 0) {
          distribucion.push({
            cuenta,
            montoAAplicar: Math.round(montoAAplicar * 100) / 100, // Redondear a 2 decimales
            saldoAntes: saldoCuenta,
            saldoDespues: Math.max(0, saldoCuenta - montoAAplicar) // Asegurar que no sea negativo
          })
          montoRestante -= montoAAplicar
        }
      }
      
      return {
        distribucion,
        totalAplicado: Math.round((totalStashValue - montoRestante) * 100) / 100,
        sobrante: Math.round(montoRestante * 100) / 100
      }
    })

    const historialPorFecha = computed(() => {
      const gruposMap = new Map()

      todosLosAbonos.value.forEach(abono => {
        const fechaClave = obtenerClaveFecha(
          abono.fechaOriginalStash || abono.fecha || abono.fechaAplicacion || abono.fechaCuenta
        )
        if (!fechaClave) return

        if (!gruposMap.has(fechaClave)) {
          gruposMap.set(fechaClave, {
            id: fechaClave,
            fechaISO: fechaClave,
            totalMonto: 0,
            abonos: [],
            cuentas: new Map()
          })
        }

        const grupo = gruposMap.get(fechaClave)
        const monto = Number(abono.monto) || 0
        grupo.totalMonto += monto
        grupo.abonos.push(abono)

        const cuentaKey = abono.cuentaId || `sin-cuenta-${abono.uniqueId}`
        if (!grupo.cuentas.has(cuentaKey)) {
          grupo.cuentas.set(cuentaKey, {
            id: cuentaKey,
            cuentaId: abono.cuentaId,
            fechaCuentaFormateada: abono.fechaCuentaFormateada,
            total: 0,
            saldoAntes: abono.cuentaSaldoAnterior ?? null,
            saldoDespues: abono.cuentaSaldoDespues ?? null
          })
        }

        const resumenCuenta = grupo.cuentas.get(cuentaKey)
        resumenCuenta.total += monto

        if (resumenCuenta.saldoAntes === null && abono.cuentaSaldoAnterior !== undefined) {
          resumenCuenta.saldoAntes = abono.cuentaSaldoAnterior ?? null
        }
        if (resumenCuenta.saldoDespues === null && abono.cuentaSaldoDespues !== undefined) {
          resumenCuenta.saldoDespues = abono.cuentaSaldoDespues ?? null
        }
      })

      const grupos = Array.from(gruposMap.values()).map(grupo => ({
        id: grupo.id,
        fechaISO: grupo.fechaISO,
        fechaLabel: formatearFechaHistorialCabecera(grupo.fechaISO),
        totalMonto: grupo.totalMonto,
        cuentas: Array.from(grupo.cuentas.values()),
        abonos: grupo.abonos.sort((a, b) => new Date(b.fechaAplicacion) - new Date(a.fechaAplicacion))
      }))

      return grupos.sort((a, b) => new Date(b.fechaISO) - new Date(a.fechaISO))
    })

    const totalPaginas = computed(() => {
      return Math.ceil(historialPorFecha.value.length / elementosPorPagina)
    })

    const historialPaginado = computed(() => {
      const inicio = (paginaActual.value - 1) * elementosPorPagina
      const fin = inicio + elementosPorPagina
      return historialPorFecha.value.slice(inicio, fin)
    })
    
    // Métodos
    const formatNumber = (value) => {
      if (value === null || value === undefined) return '0.00'
      return Math.abs(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }
    
    const esFechaSoloDia = (valor) => /^\d{4}-\d{2}-\d{2}$/.test(String(valor || '').trim())

    const parseFechaLocalSeguro = (valor) => {
      if (!valor) return null
      const str = String(valor).trim()
      if (esFechaSoloDia(str)) {
        const [y, m, d] = str.split('-').map(Number)
        return new Date(y, m - 1, d, 0, 0, 0, 0)
      }
      const dt = new Date(str)
      return Number.isNaN(dt.getTime()) ? null : dt
    }

    const formatearFecha = (fecha) => {
      if (!fecha) return ''
      const dt = parseFechaLocalSeguro(fecha)
      if (!dt) return ''
      return dt.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    }
    
    const formatearFechaHora = (fecha) => {
      if (!fecha) return ''
      const dateObj = parseFechaLocalSeguro(fecha)
      if (!dateObj) return ''
      const esFechaPlano =
        dateObj.getHours() === 0 &&
        dateObj.getMinutes() === 0 &&
        dateObj.getSeconds() === 0

      if (esFechaPlano) {
        return dateObj.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      }

      return dateObj.toLocaleString('es-ES')
    }

    const formatearFechaHistorialCabecera = (fecha) => {
      if (!fecha) return ''
      const dateObj = new Date(fecha)
      if (Number.isNaN(dateObj.getTime())) {
        return ''
      }
      return dateObj.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      })
    }

    const formatearFechaDia = (fecha) => {
      if (!fecha) return ''
      const dt = new Date(fecha)
      const hoy = new Date()
      const ayer = new Date(hoy)
      ayer.setDate(ayer.getDate() - 1)
      
      // Comparar solo fecha sin hora usando UTC para evitar desfase
      const fechaDt = new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())
      const fechaHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
      const fechaAyer = new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate())
      
      if (fechaDt.getTime() === fechaHoy.getTime()) {
        return 'Hoy'
      } else if (fechaDt.getTime() === fechaAyer.getTime()) {
        return 'Ayer'
      } else {
        return dt.toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: dt.getUTCFullYear() !== hoy.getFullYear() ? 'numeric' : undefined,
          timeZone: 'UTC'
        })
      }
    }
    
    const formatearHora = (fecha) => {
      if (!fecha) return ''
      return new Date(fecha).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    const normalizarFechaSeleccionada = (fecha) => {
      if (!fecha) {
        return new Date().toISOString()
      }

      if (fecha.includes('T')) {
        return fecha
      }

      const [year, month, day] = fecha.split('-').map(Number)
      if (!year || !month || !day) {
        return new Date().toISOString()
      }

      const pad = (value) => String(value).padStart(2, '0')
      return `${year}-${pad(month)}-${pad(day)}T00:00:00`
    }

    const obtenerClaveFecha = (fecha) => {
      if (!fecha) return ''
      const dateObj = parseFechaLocalSeguro(fecha)
      if (!dateObj) return ''
      const pad = (value) => String(value).padStart(2, '0')
      const year = dateObj.getUTCFullYear()
      const month = pad(dateObj.getUTCMonth() + 1)
      const day = pad(dateObj.getUTCDate())
      return `${year}-${month}-${day}`
    }

    const formatearFechaHoraEditable = (fecha) => {
      if (!fecha) return ''
      const dateObj = new Date(fecha)
      if (Number.isNaN(dateObj.getTime())) {
        return ''
      }

      const pad = (value) => String(value).padStart(2, '0')
      const year = dateObj.getFullYear()
      const month = pad(dateObj.getMonth() + 1)
      const day = pad(dateObj.getDate())
      const hours = pad(dateObj.getHours())
      const minutes = pad(dateObj.getMinutes())
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }
    
    const verDetalleHistorial = (registro) => {
      registro.mostrarDetalle = !registro.mostrarDetalle
    }
    
    const obtenerFechaCuenta = (cuentaId) => {
      if (!cuentaId || cuentaId === '') return 'Sin fecha seleccionada'
      const cuenta = cuentasDisponibles.value.find(c => c.id === cuentaId)
      return cuenta ? cuenta.fechaFormateada : 'Fecha no encontrada'
    }
    
    const onFechaAplicacionChange = (itemId) => {
      // Forzar actualización reactiva
      const valorSeleccionado = fechasAplicacion.value[itemId]
      console.log(`Fecha de aplicación cambiada para item ${itemId}:`, valorSeleccionado)
      
      // Trigger reactivity update
      fechasAplicacion.value = { ...fechasAplicacion.value }
    }
    
    const cargarStash = async () => {
      try {
        const q = query(
          collection(db, `stash_${props.cliente}`),
          orderBy('fecha', 'desc')
        )
        const snapshot = await getDocs(q)
        stashItems.value = snapshot.docs.map(doc => {
          const data = doc.data() || {}
          return {
            id: doc.id,
            ...data,
            esEfectivo: !!data.esEfectivo
          }
        })
        
        // Inicializar fechasAplicacion para nuevos items
        stashItems.value.forEach(item => {
          if (!fechasAplicacion.value[item.id]) {
            fechasAplicacion.value[item.id] = ''
          }
        })
      } catch (error) {
        console.error('Error cargando stash:', error)
      }
    }
    
    const cargarSaldoActual = async () => {
      try {
        const collectionName = `cuentas${props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)}`
        const q = query(
          collection(db, collectionName),
          orderBy('fecha', 'desc'),
          limit(1)
        )
        const snapshot = await getDocs(q)
        
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data()
          // Usar el campo persistido o calcularlo
          if (typeof data.nuevoSaldoAcumulado === 'number') {
            saldoActual.value = data.nuevoSaldoAcumulado
          } else {
            const totalCobros = (data.cobros || []).reduce((s, c) => s + (parseFloat(c.monto) || 0), 0)
            const totalAbonos = (data.abonos || []).reduce((s, a) => s + (parseFloat(a.monto) || 0), 0)
            const totalDia = (data.totalGeneralVenta || 0) - totalCobros - totalAbonos
            saldoActual.value = (data.saldoAcumuladoAnterior || 0) + totalDia
          }
        } else {
          saldoActual.value = 0
        }
      } catch (error) {
        console.error('Error cargando saldo:', error)
        saldoActual.value = 0
      }
    }
    
    const cargarHistorial = async () => {
      try {
        const q = query(
          collection(db, `historial_aplicaciones_${props.cliente}`),
          orderBy('fechaAplicacion', 'desc'),
          limit(20)
        )
        const snapshot = await getDocs(q)
        historialAplicaciones.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          mostrarDetalle: false  // Agregar estado para expandir/colapsar
        }))
      } catch (error) {
        console.error('Error cargando historial:', error)
      }
    }
    
    const cargarTodosLosAbonos = async () => {
      try {
        const collectionName = `cuentas${props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)}`
        const q = query(
          collection(db, collectionName),
          orderBy('fecha', 'desc'),
          limit(50) // Cargar las últimas 50 cuentas para buscar abonos
        )
        const snapshot = await getDocs(q)
        
        const abonos = []
        
        snapshot.docs.forEach(doc => {
          const cuentaData = doc.data()
          const cuentaId = doc.id
          const fechaCuenta = cuentaData.fecha
          const fechaCuentaFormateada = formatearFecha(fechaCuenta)
          
          if (cuentaData.abonos && cuentaData.abonos.length > 0) {
            cuentaData.abonos.forEach((abono, index) => {
              const fechaBase =
                abono.fechaOriginalStash ||
                abono.fecha ||
                abono.fechaAplicacion ||
                fechaCuenta ||
                new Date().toISOString()

              const fechaAplicacion = normalizarFechaSeleccionada(fechaBase)

              abonos.push({
                uniqueId: `${cuentaId}_${index}_${abono.id || Date.now()}`,
                cuentaId,
                fechaCuenta,
                fechaCuentaFormateada,
                fechaAplicacion,
                fechaOriginal: fechaBase,
                fechaOriginalStash: abono.fechaOriginalStash || null,
                cuentaTotal: cuentaData.totalGeneralVenta || 0,
                cuentaSaldoAnterior: typeof cuentaData.saldoAcumuladoAnterior === 'number' ? cuentaData.saldoAcumuladoAnterior : null,
                cuentaSaldoDespues: typeof cuentaData.nuevoSaldoAcumulado === 'number' ? cuentaData.nuevoSaldoAcumulado : null,
                descripcion: abono.descripcion || 'Sin descripción',
                monto: abono.monto || 0,
                abonoId: abono.id,
                abonoIndex: index,
                esAplicacionIndividual: abono.esAplicacionIndividual || false,
                origenDescripcion: abono.fechaOriginalStash
                  ? `Stash (${formatearFecha(abono.fechaOriginalStash)})`
                  : (abono.esAplicacionIndividual ? 'Aplicación individual' : 'Aplicación en cascada')
              })
            })
          }
        })
        
        // Ordenar por fecha de aplicación más reciente
        const ordenados = abonos.sort((a, b) => 
          new Date(b.fechaAplicacion) - new Date(a.fechaAplicacion)
        )

        todosLosAbonos.value = ordenados.map(item => ({
          ...item,
          fechaAplicacion: item.fechaAplicacion,
          fechaEditable: formatearFechaHoraEditable(item.fechaAplicacion),
          editandoFecha: false,
          guardandoFecha: false
        }))

        historialGruposExpandidos.value = {}

      } catch (error) {
        console.error('Error cargando todos los abonos:', error)
      }
    }
    
    const cargarCuentasDisponibles = async () => {
      try {
        const collectionName = `cuentas${props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)}`
        const q = query(
          collection(db, collectionName),
          orderBy('fecha', 'desc'),
          limit(50) // Aumentar límite para tener más opciones antes del filtro
        )
        const snapshot = await getDocs(q)
        // Filtrar solo las cuentas que NO están pagadas
        cuentasDisponibles.value = snapshot.docs
          .map(doc => ({
            id: doc.id,
            fecha: doc.data().fecha,
            totalGeneralVenta: doc.data().totalGeneralVenta || 0,
            fechaFormateada: formatearFecha(doc.data().fecha),
            estadoPagado: doc.data().estadoPagado,
            nuevoSaldoAcumulado: doc.data().nuevoSaldoAcumulado || 0
          }))
          .filter(cuenta => {
            // Filtrar cuentas que NO estén pagadas
            return !cuenta.estadoPagado && cuenta.nuevoSaldoAcumulado > 0
          })
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      } catch (error) {
        console.error('Error cargando cuentas disponibles:', error)
      }
    }
    
    const construirDescripcionAutomatica = () => {
      const fecha = nuevoAbono.value.fecha || obtenerFechaLocal()
      const metodo = (nuevoAbono.value.metodo || '').trim()
      return metodo ? `${fecha} - ${metodo}` : `${fecha}`
    }

    const actualizarDescripcionAutomatica = () => {
      nuevoAbono.value.descripcion = construirDescripcionAutomatica()
      nuevoAbono.value.esEfectivo = nuevoAbono.value.metodo === 'Efectivo'
    }

    const agregarAlStash = async () => {
      if (!nuevoAbono.value.fecha || !nuevoAbono.value.descripcion || !nuevoAbono.value.monto) {
        alert('Por favor complete todos los campos')
        return
      }
      
      try {
        const fechaNormalizada = normalizarFechaSeleccionada(nuevoAbono.value.fecha)
        const docRef = await addDoc(collection(db, `stash_${props.cliente}`), {
          fecha: nuevoAbono.value.fecha,
          descripcion: nuevoAbono.value.descripcion,
          monto: Number(nuevoAbono.value.monto),
          fechaCreacion: fechaNormalizada,
          esEfectivo: !!nuevoAbono.value.esEfectivo,
          metodo: nuevoAbono.value.metodo || ''
        })
        
        const nuevoItem = {
          id: docRef.id,
          fecha: nuevoAbono.value.fecha,
          descripcion: nuevoAbono.value.descripcion,
          monto: Number(nuevoAbono.value.monto),
          esEfectivo: !!nuevoAbono.value.esEfectivo,
          metodo: nuevoAbono.value.metodo || ''
        }
        
        stashItems.value.unshift(nuevoItem)
        
        // Inicializar fecha de aplicación para el nuevo item
        fechasAplicacion.value[docRef.id] = ''
        
        // Limpiar formulario
        nuevoAbono.value = {
          fecha: obtenerFechaLocal(),
          metodo: metodosPago[0],
          descripcion: '',
          monto: null,
          esEfectivo: false
        }

        actualizarDescripcionAutomatica()
        
        alert('Abono agregado al stash')
      } catch (error) {
        console.error('Error agregando al stash:', error)
        alert('Error al agregar el abono')
      }
    }
    
    const eliminarDelStash = async (id) => {
      if (!confirm('¿Eliminar este abono del stash?')) return
      
      try {
        await deleteDoc(doc(db, `stash_${props.cliente}`, id))
        stashItems.value = stashItems.value.filter(item => item.id !== id)
        delete fechasAplicacion.value[id]
      } catch (error) {
        console.error('Error eliminando del stash:', error)
        alert('Error al eliminar')
      }
    }
    
    const validarYMostrarConfirmacion = () => {
      if (!todasFechasSeleccionadas.value) {
        alert('Por favor selecciona una fecha de aplicación para todos los abonos del stash.')
        return
      }
      mostrarConfirmacion.value = true
    }
    
    const aplicarACuentaMasAntigua = async () => {
      if (!cuentaMasAntiguaNoPagada.value) {
        alert('No hay cuentas pendientes de pago disponibles.')
        return
      }
      
      if (stashItems.value.length === 0) {
        alert('No hay abonos en el stash para aplicar.')
        return
      }
      
      const distribucion = distribucionAbonos.value
      
      // Crear mensaje de confirmación detallado
      let mensajeConfirmacion = `Se aplicarán $${formatNumber(totalStash.value)} del stash de la siguiente manera:\n\n`
      
      distribucion.distribucion.forEach((item, index) => {
        mensajeConfirmacion += `${index + 1}. ${item.cuenta.fechaFormateada}: $${formatNumber(item.montoAAplicar)}\n`
        mensajeConfirmacion += `   Saldo antes: $${formatNumber(item.saldoAntes)}\n`
        mensajeConfirmacion += `   Saldo después: $${formatNumber(item.saldoDespues)}\n\n`
      })
      
      if (distribucion.sobrante > 0) {
        mensajeConfirmacion += `⚠️ Sobrante sin aplicar: $${formatNumber(distribucion.sobrante)}\n`
        mensajeConfirmacion += `(No hay más cuentas pendientes)\n\n`
      }
      
      mensajeConfirmacion += '¿Continuar con la aplicación?'
      
      const confirmacion = confirm(mensajeConfirmacion)
      if (!confirmacion) return
      
      try {
        await aplicarAbonosEnCascada()
        
        let mensajeExito = `Abonos aplicados exitosamente:\n`
        distribucion.distribucion.forEach((item, index) => {
          mensajeExito += `• ${item.cuenta.fechaFormateada}: $${formatNumber(item.montoAAplicar)}\n`
        })
        
        if (distribucion.sobrante > 0) {
          mensajeExito += `\n⚠️ Sobrante: $${formatNumber(distribucion.sobrante)}`
        }
        
        alert(mensajeExito)
      } catch (error) {
        console.error('Error aplicando abonos en cascada:', error)
        alert('Error al aplicar los abonos. Por favor, intente nuevamente.')
      }
    }
    
    const aplicarAbonosEnCascada = async () => {
      if (isAplicando.value) return
      
      isAplicando.value = true
      
      try {
        const collectionName = `cuentas${props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)}`
        const abonosAplicados = []
        
        // Obtener cuentas ordenadas por fecha (más antigua primero)
        const cuentasOrdenadas = [...cuentasOrdenadasPorFecha.value]
        
        // Crear una cola de abonos pendientes (copiar el stash)
        const abonosPendientes = stashItems.value.map(item => ({
          ...item,
          montoRestante: item.monto
        }))
        
        console.log('Iniciando aplicación en cascada:', {
          totalStash: totalStash.value,
          cuentasDisponibles: cuentasOrdenadas.length,
          abonosPendientes: abonosPendientes.length
        })
        
        // Procesar cada cuenta secuencialmente
        for (const cuenta of cuentasOrdenadas) {
          // Si ya no hay abonos pendientes, terminar
          if (abonosPendientes.length === 0) break
          
          // Obtener el saldo actual de la cuenta desde la base de datos
          const cuentaRef = doc(db, collectionName, cuenta.id)
          const cuentaDoc = await getDoc(cuentaRef)
          
          if (!cuentaDoc.exists()) {
            console.warn(`Cuenta ${cuenta.id} no encontrada, saltando...`)
            continue
          }
          
          const cuentaData = cuentaDoc.data()
          
          // Recalcular el saldo actual de esta cuenta
          const totalAbonos = (cuentaData.abonos || []).reduce((sum, abono) => sum + (abono.monto || 0), 0)
          const totalCobros = (cuentaData.cobros || []).reduce((sum, cobro) => sum + (cobro.monto || 0), 0)
          const totalDia = (cuentaData.totalGeneralVenta || 0) - totalCobros - totalAbonos
          let saldoActualCuenta = (cuentaData.saldoAcumuladoAnterior || 0) + totalDia
          
          console.log(`Procesando cuenta ${cuenta.id}:`, {
            fechaCuenta: cuenta.fecha,
            saldoInicial: saldoActualCuenta,
            abonosPendientes: abonosPendientes.length
          })
          
          // Si la cuenta ya está pagada (saldo <= 0), saltar
          if (saldoActualCuenta <= 0) {
            console.log(`Cuenta ${cuenta.id} ya está pagada, saltando...`)
            continue
          }
          
          // Aplicar abonos completos secuencialmente hasta que la cuenta esté pagada o se acaben los abonos
          const abonosParaCuenta = []
          let totalAplicadoCuenta = 0
          
          let i = 0
          while (i < abonosPendientes.length && saldoActualCuenta > 0) {
            const abonoActual = abonosPendientes[i]
            
            // Determinar cuánto aplicar de este abono
            const montoAAplicar = Math.min(abonoActual.montoRestante, saldoActualCuenta)
            
            if (montoAAplicar > 0.01) {
              // Crear el abono para esta cuenta
              abonosParaCuenta.push({
                descripcion: abonoActual.descripcion,
                monto: Math.round(montoAAplicar * 100) / 100,
                fecha: normalizarFechaSeleccionada(abonoActual.fecha),
                fechaOriginalStash: abonoActual.fecha,
                esEfectivo: !!abonoActual.esEfectivo,
                stashItemId: abonoActual.id
              })
              
              totalAplicadoCuenta += Math.round(montoAAplicar * 100) / 100
              saldoActualCuenta -= Math.round(montoAAplicar * 100) / 100
              abonoActual.montoRestante -= Math.round(montoAAplicar * 100) / 100
              
              console.log(`  Aplicando ${montoAAplicar} de abono "${abonoActual.descripcion}"`, {
                montoRestanteAbono: abonoActual.montoRestante,
                saldoRestanteCuenta: saldoActualCuenta
              })
            }
            
            // Si este abono se agotó completamente, eliminarlo de la cola
            if (abonoActual.montoRestante <= 0.01) {
              abonosPendientes.splice(i, 1)
              // No incrementar i porque el siguiente abono ahora está en la misma posición
            } else {
              // Si el abono aún tiene saldo, pasar al siguiente (la cuenta se pagó)
              i++
            }
          }
          
          // Aplicar los abonos a esta cuenta específica
          if (abonosParaCuenta.length > 0) {
            const saldoAntes = (cuentaData.saldoAcumuladoAnterior || 0) + totalDia
            const saldoDespues = saldoAntes - totalAplicadoCuenta
            
            console.log(`Aplicando ${abonosParaCuenta.length} abonos a cuenta ${cuenta.id}:`, {
              totalAplicado: totalAplicadoCuenta,
              saldoAntes: saldoAntes,
              saldoDespues: saldoDespues
            })
            
            await aplicarAbonosACuenta(cuenta.id, abonosParaCuenta, collectionName)
            
            abonosAplicados.push({
              cuentaId: cuenta.id,
              fecha: cuenta.fecha,
              abonos: abonosParaCuenta,
              totalAplicado: totalAplicadoCuenta,
              saldoAntes: saldoAntes,
              saldoDespues: Math.max(0, saldoDespues)
            })
          }
        }
        
        const totalAplicado = abonosAplicados.reduce((sum, item) => sum + item.totalAplicado, 0)
        const sobrante = abonosPendientes.reduce((sum, abono) => sum + abono.montoRestante, 0)
        
        console.log('Aplicación en cascada completada:', {
          totalAplicado: totalAplicado,
          sobrante: sobrante,
          cuentasAfectadas: abonosAplicados.length
        })
        
        // Registrar en el historial
        await registrarEnHistorial(abonosAplicados, 'cascada')
        
        // Limpiar el stash
        await limpiarStash()
        
        // Recargar datos
        await Promise.all([
          cargarStash(),
          cargarSaldoActual(),
          cargarCuentasDisponibles()
        ])
        
      } catch (error) {
        console.error('Error en aplicación en cascada:', error)
        throw error
      } finally {
        isAplicando.value = false
      }
    }
    
    const aplicarAbonosACuenta = async (cuentaId, abonos, collectionName) => {
      const cuentaRef = doc(db, collectionName, cuentaId)
      const cuentaDoc = await getDoc(cuentaRef)
      
      if (!cuentaDoc.exists()) {
        throw new Error(`Cuenta ${cuentaId} no encontrada`)
      }
      
      const cuentaData = cuentaDoc.data()
      const abonosExistentes = cuentaData.abonos || []
      const nuevosAbonos = [...abonosExistentes, ...abonos]
      
      // Calcular nuevo saldo
      const totalAbonos = nuevosAbonos.reduce((sum, abono) => sum + (abono.monto || 0), 0)
      const totalCobros = (cuentaData.cobros || []).reduce((sum, cobro) => sum + (cobro.monto || 0), 0)
      const totalDia = (cuentaData.totalGeneralVenta || 0) - totalCobros - totalAbonos
      const nuevoSaldoAcumulado = (cuentaData.saldoAcumuladoAnterior || 0) + totalDia
      
      await updateDoc(cuentaRef, {
        abonos: nuevosAbonos,
        nuevoSaldoAcumulado: Math.max(0, nuevoSaldoAcumulado),
        estadoPagado: nuevoSaldoAcumulado <= 0,
        ultimaActualizacion: new Date().toISOString()
      })
    }
    
    const registrarEnHistorial = async (abonosAplicados, tipo = 'cascada') => {
      try {
        await addDoc(collection(db, `historial_aplicaciones_${props.cliente}`), {
          tipo,
          fecha: new Date().toISOString(),
          abonosAplicados,
          totalAplicado: abonosAplicados.reduce((sum, item) => sum + item.totalAplicado, 0),
          cuentasAfectadas: abonosAplicados.length,
          descripcion: `Aplicación en ${tipo} a ${abonosAplicados.length} cuenta(s)`
        })
      } catch (error) {
        console.error('Error registrando en historial:', error)
      }
    }
    
    const limpiarStash = async () => {
      try {
        // Eliminar todos los items del stash
        await Promise.all(
          stashItems.value.map(item => 
            deleteDoc(doc(db, `stash_${props.cliente}`, item.id))
          )
        )
        
        // Limpiar el estado local
        stashItems.value = []
        fechasAplicacion.value = {}
      } catch (error) {
        console.error('Error limpiando stash:', error)
        throw error
      }
    }
    
    const aplicarAbonosIndividuales = async () => {
      if (isAplicando.value) return
      
      isAplicando.value = true
      mostrarConfirmacion.value = false
      
      try {
        const collectionName = `cuentas${props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)}`
        const abonosAplicados = []
        const cuentasAfectadas = []
        
        // Agrupar abonos por cuenta de destino
        const abonosPorCuenta = {}
        stashItems.value.forEach(item => {
          const cuentaId = fechasAplicacion.value[item.id]
          if (!abonosPorCuenta[cuentaId]) {
            abonosPorCuenta[cuentaId] = []
          }
          abonosPorCuenta[cuentaId].push(item)
        })
        
        // Aplicar abonos a cada cuenta
        for (const [cuentaId, abonos] of Object.entries(abonosPorCuenta)) {
          const cuentaRef = doc(db, collectionName, cuentaId)
          const cuentaDoc = await getDoc(cuentaRef)
          
          if (!cuentaDoc.exists()) {
            throw new Error(`No se encontró la cuenta con ID: ${cuentaId}`)
          }
          
          const cuentaData = cuentaDoc.data()
          
          // Crear abonos individuales para esta cuenta
          const nuevosAbonos = [...(cuentaData.abonos || [])]
          
          abonos.forEach(item => {
            const abonoId = `stash_individual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            const abonoIndividual = {
              id: abonoId,
              descripcion: `${item.descripcion} (Aplicación Individual)`,
              monto: item.monto,
              fecha: normalizarFechaSeleccionada(item.fecha),
              fechaOriginalStash: item.fecha,
              esAplicacionIndividual: true,
              esEfectivo: !!item.esEfectivo,
              stashItemId: item.id
            }
            
            nuevosAbonos.push(abonoIndividual)
            abonosAplicados.push({
              ...item,
              abonoId: abonoId,
              cuentaId: cuentaId,
              fechaAplicacion: cuentaData.fecha
            })
          })
          
          // Actualizar la cuenta
          await updateDoc(cuentaRef, {
            abonos: nuevosAbonos,
            ultimaActualizacion: new Date().toISOString()
          })
          
          cuentasAfectadas.push({
            id: cuentaId,
            fecha: cuentaData.fecha,
            abonos: abonos.length
          })
        }
        
        // Registrar en historial
        await addDoc(collection(db, `historial_aplicaciones_${props.cliente}`), {
          fechaAplicacion: new Date().toISOString(),
          modo: 'individual',
          montoTotal: totalStash.value,
          items: abonosAplicados,
          cuentasAfectadas: cuentasAfectadas,
          exitoso: true,
          saldoAnterior: saldoActual.value,
          saldoNuevo: saldoResultante.value
        })
        
        // Limpiar stash
        for (const item of stashItems.value) {
          await deleteDoc(doc(db, `stash_${props.cliente}`, item.id))
        }
        
        stashItems.value = []
        fechasAplicacion.value = {}
        await cargarSaldoActual()
        await cargarHistorial()
        
        alert(`✅ Abonos aplicados correctamente de forma individual\n\nTotal aplicado: $${formatNumber(totalStash.value)}\nAplicados a ${Object.keys(abonosPorCuenta).length} cuentas diferentes\nNuevo saldo: $${formatNumber(saldoActual.value)}`)
        
      } catch (error) {
        console.error('Error aplicando abonos individuales:', error)
        alert('Error al aplicar los abonos: ' + error.message)
        
        // Registrar error en historial
        await addDoc(collection(db, `historial_aplicaciones_${props.cliente}`), {
          fechaAplicacion: new Date().toISOString(),
          modo: 'individual',
          montoTotal: totalStash.value,
          items: stashItems.value,
          exitoso: false,
          error: error.message
        })
      } finally {
        isAplicando.value = false
      }
    }
    
    const eliminarDelHistorial = async (registro) => {
      const esIndividual = registro.modo === 'individual'
      const mensaje = esIndividual
        ? `¿Eliminar este registro del historial y revertir los abonos individuales?\n\nEsto eliminará ${registro.items?.length || 0} abonos de las cuentas afectadas.`
        : `¿Eliminar este registro del historial y revertir el abono de $${formatNumber(registro.montoTotal)}?\n\nEsto eliminará el abono de la cuenta y actualizará el saldo.`
      
      if (!confirm(mensaje)) {
        return
      }
      
      try {
        const collectionName = `cuentas${props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)}`
        
        if (esIndividual && registro.items) {
          // Revertir abonos individuales
          for (const item of registro.items) {
            if (item.cuentaId && item.abonoId) {
              const cuentaRef = doc(db, collectionName, item.cuentaId)
              const cuentaDoc = await getDoc(cuentaRef)
              
              if (cuentaDoc.exists()) {
                const cuentaData = cuentaDoc.data()
                const nuevosAbonos = (cuentaData.abonos || []).filter(
                  abono => abono.id !== item.abonoId
                )
                
                await updateDoc(cuentaRef, {
                  abonos: nuevosAbonos,
                  ultimaActualizacion: new Date().toISOString()
                })
              }
            }
          }
        } else if (registro.cuentaAfectada && registro.abonoId) {
          // Revertir abono consolidado (modo anterior)
          const cuentaRef = doc(db, collectionName, registro.cuentaAfectada)
          const cuentaDoc = await getDoc(cuentaRef)
          
          if (cuentaDoc.exists()) {
            const cuentaData = cuentaDoc.data()
            const nuevosAbonos = (cuentaData.abonos || []).filter(
              abono => abono.id !== registro.abonoId
            )
            
            await updateDoc(cuentaRef, {
              abonos: nuevosAbonos,
              ultimaActualizacion: new Date().toISOString()
            })
          }
        }
        
        // Eliminar el registro del historial
        await deleteDoc(doc(db, `historial_aplicaciones_${props.cliente}`, registro.id))
        
        // Recargar datos
        await cargarSaldoActual()
        await cargarHistorial()
        
        const mensajeExito = esIndividual
          ? `✅ Registro eliminado del historial y abonos individuales revertidos\n\nMonto revertido: $${formatNumber(registro.montoTotal)}`
          : `✅ Registro eliminado del historial y abono revertido\n\nMonto revertido: $${formatNumber(registro.montoTotal)}`
        
        alert(mensajeExito)
        
      } catch (error) {
        console.error('Error eliminando del historial:', error)
        alert('Error al eliminar el registro: ' + error.message)
      }
    }
    
    const eliminarAbonoIndividual = async (abono) => {
      const confirmacion = confirm(
        `¿Eliminar este abono?\n\n` +
        `Cuenta: ${abono.fechaCuentaFormateada}\n` +
        `Descripción: ${abono.descripcion}\n` +
        `Monto: $${formatNumber(abono.monto)}\n\n` +
        `Esta acción actualizará el saldo de la cuenta.`
      )
      
      if (!confirmacion) return
      
      try {
        const collectionName = `cuentas${props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)}`
        const cuentaRef = doc(db, collectionName, abono.cuentaId)
        const cuentaDoc = await getDoc(cuentaRef)
        
        if (!cuentaDoc.exists()) {
          alert('Error: No se encontró la cuenta.')
          return
        }
        
        const cuentaData = cuentaDoc.data()
        let nuevosAbonos = [...(cuentaData.abonos || [])]
        
        // Eliminar el abono específico
        if (abono.abonoId) {
          // Si tiene ID específico, eliminar por ID
          nuevosAbonos = nuevosAbonos.filter(a => a.id !== abono.abonoId)
        } else {
          // Si no tiene ID, eliminar por índice
          nuevosAbonos.splice(abono.abonoIndex, 1)
        }
        
        // Recalcular saldo
        const totalAbonos = nuevosAbonos.reduce((sum, a) => sum + (a.monto || 0), 0)
        const totalCobros = (cuentaData.cobros || []).reduce((sum, c) => sum + (c.monto || 0), 0)
        const totalDia = (cuentaData.totalGeneralVenta || 0) - totalCobros - totalAbonos
        const nuevoSaldoAcumulado = (cuentaData.saldoAcumuladoAnterior || 0) + totalDia
        
        // Actualizar la cuenta
        await updateDoc(cuentaRef, {
          abonos: nuevosAbonos,
          nuevoSaldoAcumulado: Math.max(0, nuevoSaldoAcumulado),
          estadoPagado: nuevoSaldoAcumulado <= 0,
          ultimaActualizacion: new Date().toISOString()
        })
        
        // Registrar la eliminación en el historial
        await addDoc(collection(db, `historial_aplicaciones_${props.cliente}`), {
          fechaAplicacion: new Date().toISOString(),
          modo: 'eliminacion_abono',
          abonoEliminado: {
            descripcion: abono.descripcion,
            monto: abono.monto,
            fechaCuenta: abono.fechaCuenta,
            fechaCuentaFormateada: abono.fechaCuentaFormateada
          },
          cuentaAfectada: abono.cuentaId,
          nuevoSaldo: nuevoSaldoAcumulado,
          exitoso: true
        })
        
        // Recargar datos
        await Promise.all([
          cargarTodosLosAbonos(),
          cargarSaldoActual(),
          cargarCuentasDisponibles()
        ])
        
        alert(`✅ Abono eliminado exitosamente\n\nSe eliminó: $${formatNumber(abono.monto)}\nDe la cuenta: ${abono.fechaCuentaFormateada}`)
        
      } catch (error) {
        console.error('Error eliminando abono:', error)
        alert('Error al eliminar el abono: ' + error.message)
      }
    }

    const historialGruposExpandidos = ref({})

    const iniciarEdicionFechaHistorial = (abono) => {
      abono.editandoFecha = true
      abono.guardandoFecha = false
      abono.fechaEditable = formatearFechaHoraEditable(abono.fechaAplicacion)
    }

    const cancelarEdicionFechaHistorial = (abono) => {
      abono.editandoFecha = false
      abono.guardandoFecha = false
      abono.fechaEditable = formatearFechaHoraEditable(abono.fechaAplicacion)
    }

    const guardarFechaHistorial = async (abono) => {
      if (!abono || !abono.cuentaId) {
        alert('No se pudo identificar la cuenta del abono.')
        return
      }

      if (!abono.fechaEditable) {
        alert('Selecciona una fecha y hora válidas.')
        return
      }

      const fechaValidacion = new Date(abono.fechaEditable)
      if (Number.isNaN(fechaValidacion.getTime())) {
        alert('La fecha ingresada no es válida.')
        return
      }

      if (abono.guardandoFecha) return

      abono.guardandoFecha = true

      try {
        const fechaNormalizada = normalizarFechaSeleccionada(abono.fechaEditable)
        const collectionName = `cuentas${props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)}`
        const cuentaRef = doc(db, collectionName, abono.cuentaId)
        const cuentaDoc = await getDoc(cuentaRef)

        if (!cuentaDoc.exists()) {
          throw new Error('No se encontró la cuenta asociada al abono.')
        }

        const cuentaData = cuentaDoc.data()
        const abonosCuenta = [...(cuentaData.abonos || [])]

        let indiceAbono = -1
        if (abono.abonoId) {
          indiceAbono = abonosCuenta.findIndex(item => item.id === abono.abonoId)
        }

        if (indiceAbono === -1) {
          indiceAbono = abono.abonoIndex ?? -1
        }

        if (indiceAbono < 0 || !abonosCuenta[indiceAbono]) {
          throw new Error('No se pudo localizar el abono dentro de la cuenta.')
        }

        const abonoActualizado = {
          ...abonosCuenta[indiceAbono],
          fecha: fechaNormalizada,
          fechaAplicacion: fechaNormalizada
        }

        abonosCuenta.splice(indiceAbono, 1, abonoActualizado)

        await updateDoc(cuentaRef, {
          abonos: abonosCuenta,
          ultimaActualizacion: new Date().toISOString()
        })

        abono.fechaAplicacion = fechaNormalizada
        abono.fechaOriginal = fechaNormalizada
        abono.fechaEditable = formatearFechaHoraEditable(fechaNormalizada)
        abono.editandoFecha = false

        // Reordenar historial para reflejar la nueva fecha
        todosLosAbonos.value = [...todosLosAbonos.value]
          .map(item => item.uniqueId === abono.uniqueId ? { ...item, ...abono } : item)
          .sort((a, b) => new Date(b.fechaAplicacion) - new Date(a.fechaAplicacion))

        alert('Fecha de registro actualizada.')
      } catch (error) {
        console.error('Error al actualizar la fecha del abono:', error)
        alert('No fue posible actualizar la fecha. Intenta nuevamente.')
      } finally {
        abono.guardandoFecha = false
      }
    }

    const toggleGrupoHistorial = (grupoId) => {
      const actual = !!historialGruposExpandidos.value[grupoId]
      historialGruposExpandidos.value = {
        ...historialGruposExpandidos.value,
        [grupoId]: !actual
      }
    }

    const esGrupoExpandido = (grupoId) => !!historialGruposExpandidos.value[grupoId]

    const cambiarPagina = (numeroPagina) => {
      if (numeroPagina >= 1 && numeroPagina <= totalPaginas.value) {
        paginaActual.value = numeroPagina
      }
    }

    const paginaAnterior = () => {
      if (paginaActual.value > 1) {
        paginaActual.value--
      }
    }

    const paginaSiguiente = () => {
      if (paginaActual.value < totalPaginas.value) {
        paginaActual.value++
      }
    }

    const abrirModal = async () => {
      showModal.value = true;
      // Bloquear scroll del fondo mientras el modal está abierto
      try {
        const body = document && document.body
        if (body) {
          body.dataset.prevOverflow = body.style.overflow || ''
          body.style.overflow = 'hidden'
        }
      } catch (e) {
        // no-op en entornos sin document
      }
      try {
        await Promise.all([
          cargarStash(),
          cargarSaldoActual(),
          cargarCuentasDisponibles(),
          cargarTodosLosAbonos(),
          cargarHistorial()
        ])
      } catch (error) {
        console.error('Error al preparar el modal de stash:', error)
      }
    }

    const cerrarModal = () => {
      showModal.value = false
      mostrarConfirmacion.value = false
      verHistorial.value = false
      paginaActual.value = 1 // Resetear paginación al cerrar
      // Restaurar scroll del fondo
      try {
        const body = document && document.body
        if (body) {
          body.style.overflow = body.dataset.prevOverflow || ''
          delete body.dataset.prevOverflow
        }
      } catch (e) {
        // no-op en entornos sin document
      }
    }
    
    // Cargar datos al abrir
    onMounted(() => {
      cargarStash()
      cargarSaldoActual()
      cargarHistorial()
      cargarCuentasDisponibles()
      cargarTodosLosAbonos()
    })

    watch(
      () => [nuevoAbono.value.fecha, nuevoAbono.value.metodo],
      () => {
        actualizarDescripcionAutomatica()
      },
      { immediate: true }
    )
    
    
    return {
      // Estados
      showModal,
      mostrarConfirmacion,
      verHistorial,
      isAplicando,
      mostrarSeleccionFechas,
      
      // Datos
      stashItems,
      saldoActual,
      historialAplicaciones,
      cuentasDisponibles,
      fechasAplicacion,
      nuevoAbono,
      todosLosAbonos,
      metodosPago,
      
      // Computed
      clienteNombre,
      totalStash,
      saldoResultante,
      todasFechasSeleccionadas,
      cuentaMasAntiguaNoPagada,
      cuentasOrdenadasPorFecha,
      distribucionAbonos,
      historialPorFecha,
      historialPaginado,
      totalPaginas,
      paginaActual,
      
      // Métodos
      formatNumber,
      formatearFecha,
      formatearFechaHora,
      formatearFechaHistorialCabecera,
      formatearFechaDia,
      formatearHora,
      verDetalleHistorial,
      obtenerFechaCuenta,
      onFechaAplicacionChange,
      cargarStash,
      cargarSaldoActual,
      cargarCuentasDisponibles,
      construirDescripcionAutomatica,
      actualizarDescripcionAutomatica,
      agregarAlStash,
      eliminarDelStash,
      validarYMostrarConfirmacion,
      aplicarACuentaMasAntigua,
      aplicarAbonosIndividuales,
      eliminarDelHistorial,
      eliminarAbonoIndividual,
      iniciarEdicionFechaHistorial,
      cancelarEdicionFechaHistorial,
      guardarFechaHistorial,
      toggleGrupoHistorial,
      esGrupoExpandido,
      cargarTodosLosAbonos,
      abrirModal,
      cerrarModal,
      cambiarPagina,
      paginaAnterior,
      paginaSiguiente
    }
  }
}
</script>

<style scoped>
.stash-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
}

.stash-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease;
  padding: 20px;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  overscroll-behavior: contain;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  margin: auto;
  position: relative;
}

.modal-content.confirmacion {
  max-width: 600px;
}

/* Header del modal con botón de cerrar */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

h3 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.btn-close-modal {
  background: #f5f5f5;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 24px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}

.btn-close-modal:hover {
  background: #e0e0e0;
  color: #333;
  transform: rotate(90deg);
}

h4 {
  margin: 20px 0 12px 0;
  color: #555;
  font-size: 18px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 8px;
}

/* Estado actual */
.estado-actual {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.estado-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.card-estado {
  background: white;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.card-estado .label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.card-estado .value {
  display: block;
  font-size: 20px;
  font-weight: bold;
}

.value.negativo { color: #d32f2f; }
.value.positivo { color: #2e7d32; }
.value.verde { color: #2e7d32; }
.value.pagado { color: #2e7d32; }
.value.pendiente { color: #ff9800; }

/* Formularios */
.form-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.checkbox-field {
  display: flex;
  align-items: center;
  min-width: 140px;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #f8f9fa;
  color: #333;
  font-size: 14px;
  user-select: none;
}

.checkbox-input {
  width: 16px;
  height: 16px;
}

.badge-efectivo {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(76, 175, 80, 0.12);
  border: 1px solid rgba(76, 175, 80, 0.35);
  color: #2e7d32;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.input-field {
  flex: 1;
  min-width: 150px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.input-field:focus {
  outline: none;
  border-color: #667eea;
}

/* Botones */
.btn-primary {
  background: #667eea;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #5a67d8;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin: 0 5px;
}

.btn-danger {
  background: #dc3545;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-danger-small {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
}

.btn-aplicar {
  background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 16px;
}

.btn-aplicar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-auto-aplicar {
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  min-width: 220px;
  box-shadow: 0 4px 6px rgba(255, 152, 0, 0.3);
}

.btn-auto-aplicar:hover:not(:disabled) {
  background: linear-gradient(135deg, #F57C00 0%, #E65100 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(255, 152, 0, 0.4);
}

.btn-auto-aplicar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 6px rgba(255, 152, 0, 0.2);
}

.cuenta-mas-antigua-info {
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border: 2px solid #FF9800;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(255, 152, 0, 0.1);
}

.cuenta-mas-antigua-info .info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.cuenta-mas-antigua-info .icono {
  font-size: 18px;
  color: #FF9800;
}

.cuenta-mas-antigua-info .texto {
  font-weight: 600;
  color: #E65100;
  font-size: 14px;
}

.cuenta-mas-antigua-info .info-detalle {
  color: #BF360C;
  font-size: 14px;
  padding-left: 26px;
}

.distribucion-cascada-info {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border: 2px solid #2196F3;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(33, 150, 243, 0.1);
}

.distribucion-cascada-info .info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.distribucion-cascada-info .icono {
  font-size: 18px;
  color: #2196F3;
}

.distribucion-cascada-info .texto {
  font-weight: 600;
  color: #1565C0;
  font-size: 14px;
}

.distribucion-lista {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.distribucion-item {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 6px;
  padding: 8px;
  border-left: 3px solid #2196F3;
}

.distribucion-cuenta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #1565C0;
  margin-bottom: 4px;
}

.distribucion-cuenta .fecha {
  font-size: 14px;
}

.distribucion-cuenta .monto {
  font-size: 14px;
  color: #2E7D32;
}

.distribucion-detalle {
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.sobrante-info {
  background: rgba(255, 193, 7, 0.2);
  border: 1px solid #FFC107;
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
  color: #F57F17;
  font-weight: 600;
  font-size: 12px;
  text-align: center;
}

.cascada-count {
  font-size: 12px;
  opacity: 0.8;
  font-weight: normal;
}

/* Pestañas del historial */
.historial-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;
}

.tab-button {
  background: none;
  border: none;
  padding: 12px 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
}

.tab-button:hover {
  background: rgba(33, 150, 243, 0.1);
  color: #2196F3;
}

.tab-button.active {
  color: #2196F3;
  border-bottom-color: #2196F3;
  background: rgba(33, 150, 243, 0.05);
}

/* Lista de abonos individuales */
.abonos-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 8px;
}

.abono-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border-left: 4px solid #2196F3;
  transition: all 0.3s ease;
}

.abono-item:hover {
  background: #e3f2fd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.abono-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.abono-left {
  flex: 1;
  min-width: 0;
}

.abono-fecha {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
}

.fecha-cuenta {
  font-weight: 600;
  color: #1565C0;
  font-size: 14px;
}

.fecha-aplicacion {
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.historial-fecha-aplicacion {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.historial-fecha-aplicacion span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-editar-fecha {
  padding: 4px 10px;
  border: 1px solid #b0bec5;
  border-radius: 14px;
  background: #eceff1;
  color: #455a64;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-editar-fecha:hover {
  background: #dfe6eb;
  border-color: #78909c;
}

.editar-fecha-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 11px;
  color: #607d8b;
}

.input-fecha-registro {
  padding: 6px 10px;
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  font-size: 12px;
}

.input-fecha-registro:focus {
  outline: none;
  border-color: #5c6bc0;
  box-shadow: 0 0 0 2px rgba(92, 107, 192, 0.15);
}

.acciones-edicion-fecha {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-guardar-fecha,
.btn-cancelar-fecha {
  padding: 5px 12px;
  border: none;
  border-radius: 14px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-guardar-fecha {
  background: linear-gradient(135deg, #43a047, #2e7d32);
  color: white;
  box-shadow: 0 2px 6px rgba(46, 125, 50, 0.3);
}

.btn-guardar-fecha:disabled {
  background: #a5d6a7;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-guardar-fecha:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(46, 125, 50, 0.35);
}

.btn-cancelar-fecha {
  background: #eceff1;
  color: #546e7a;
}

.btn-cancelar-fecha:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(84, 110, 122, 0.25);
}

.historial-grupos {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.historial-grupo {
  border: 1px solid #e1e5ee;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.historial-grupo.grupo-expandido {
  border-color: #5c6bc0;
  box-shadow: 0 6px 18px rgba(92, 107, 192, 0.18);
}

.grupo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: linear-gradient(135deg, #f4f7fb, #eceff5);
  cursor: pointer;
  gap: 12px;
}

.grupo-fecha {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.grupo-fecha-texto {
  font-weight: 700;
  color: #1e3c72;
  font-size: 15px;
}

.grupo-meta {
  font-size: 12px;
  color: #607d8b;
}

.grupo-total {
  font-weight: 700;
  color: #2e7d32;
  font-size: 16px;
}

.grupo-toggle {
  border: none;
  background: #fff;
  color: #5c6bc0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(92, 107, 192, 0.25);
  transition: transform 0.2s ease;
}

.grupo-toggle:hover {
  transform: translateY(-2px);
}

.grupo-detalle {
  padding: 16px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grupo-resumen {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.grupo-resumen-item {
  background: #f1f4fb;
  border: 1px solid #d8deed;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.resumen-cuenta-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #455a64;
  font-size: 12px;
}

.resumen-cuenta-fecha {
  font-weight: 600;
  color: #1e3c72;
  font-size: 13px;
}

.resumen-cuenta-saldo {
  font-size: 11px;
}

.resumen-cuenta-monto {
  font-weight: 700;
  color: #2e7d32;
  font-size: 15px;
}

.grupo-abonos {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.abono-origen {
  font-size: 11px;
  color: #78909c;
  background: #eceff1;
  padding: 4px 8px;
  border-radius: 12px;
  width: fit-content;
}

.abono-descripcion {
  color: #333;
  font-size: 14px;
  word-wrap: break-word;
  line-height: 1.4;
}
.abono-aplicacion {
  font-size: 12px;
  color: #2e7d32;
  margin: 4px 0;
  font-weight: 600;
}

.abono-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.abono-monto {
  font-weight: 600;
  color: #2E7D32;
  font-size: 16px;
}

.btn-eliminar-abono {
  background: #f44336;
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-eliminar-abono:hover {
  background: #d32f2f;
  transform: scale(1.1);
}

/* Listas del Stash con selección de fechas */
.stash-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px;
}

.stash-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #e8e8e8;
}

.item-info {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 8px;
}

.item-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.fecha-aplicacion {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.fecha-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  min-width: 60px;
}

.select-fecha {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  background: white;
}

.select-fecha:focus {
  outline: none;
  border-color: #667eea;
}

.fecha {
  font-size: 13px;
  color: #666;
  min-width: 100px;
}

.descripcion {
  flex: 1;
  font-weight: 500;
}

.monto {
  font-weight: bold;
  color: #2e7d32;
}

/* Vista previa con aplicaciones individuales */
.preview-info {
  background: #f0f7ff;
  border: 1px solid #bbdefb;
  border-radius: 8px;
  padding: 16px;
}

.aplicaciones-preview {
  margin: 12px 0;
  background: white;
  border-radius: 6px;
  padding: 8px;
  border: 1px solid #e0e0e0;
}

.aplicacion-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.aplicacion-item:last-child {
  border-bottom: none;
}

.aplicacion-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.aplicacion-descripcion {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.aplicacion-monto {
  font-size: 16px;
  font-weight: bold;
  color: #2e7d32;
}

.aplicacion-fecha {
  text-align: right;
}

.fecha-seleccionada {
  font-size: 12px;
  color: #2e7d32;
  font-weight: 500;
}

.fecha-pendiente {
  font-size: 12px;
  color: #ff9800;
  font-weight: 500;
}

.preview-calc {
  margin: 12px 0;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.calc-row.resultado {
  border-bottom: none;
  border-top: 2px solid #333;
  margin-top: 8px;
  padding-top: 12px;
  font-weight: bold;
  font-size: 18px;
}

.warning-box {
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 8px 12px;
  margin-top: 12px;
  color: #856404;
}

/* Confirmación mejorada */
.confirmacion-detalle {
  margin: 20px 0;
}

.lista-confirmacion {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
  margin: 12px 0;
  max-height: 200px;
  overflow-y: auto;
}

.item-confirmacion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e0e0e0;
}

.item-confirmacion:last-child {
  border-bottom: none;
}

.confirmacion-item-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.confirmacion-fecha-aplicacion {
  font-size: 12px;
  color: #2e7d32;
  font-style: italic;
}

.resumen-confirmacion {
  background: #e3f2fd;
  border-radius: 6px;
  padding: 12px;
  margin: 16px 0;
}

.resumen-confirmacion ul {
  margin: 8px 0;
  padding-left: 20px;
}

/* Modal actions */
.modal-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.confirmacion-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

/* Historial mejorado */
.historial-list {
  max-height: 500px;
  overflow-y: auto;
  padding: 4px;
}

.historial-item {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.historial-item:hover {
  border-color: #d0d0d0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.historial-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  gap: 16px;
}

.historial-left {
  flex: 1;
  display: flex;
  gap: 24px;
  align-items: center;
}

.historial-fecha {
  display: flex;
  flex-direction: column;
  min-width: 80px;
}

.fecha-dia {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}

.fecha-hora {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.historial-monto-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.historial-monto {
  font-size: 22px;
  font-weight: 700;
  color: #2e7d32;
}

.historial-estado {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
}

.historial-estado.exitoso {
  background: #e8f5e9;
  color: #2e7d32;
}

.historial-estado.error {
  background: #ffebee;
  color: #c62828;
}

.historial-right {
  display: flex;
  gap: 8px;
}

.btn-detalle,
.btn-eliminar-hist {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-detalle {
  background: #f0f0f0;
  color: #555;
}

.btn-detalle:hover {
  background: #e0e0e0;
}

.btn-eliminar-hist {
  background: #ffebee;
  color: #c62828;
}

.btn-eliminar-hist:hover {
  background: #ffcdd2;
}

.desktop-text {
  display: inline;
}

.mobile-text {
  display: none;
  font-size: 18px;
}

/* Detalles expandidos mejorados */
.historial-detalle-expandido {
  background: #f8f9fa;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 500px;
  }
}

.detalle-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.detalle-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detalle-label {
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detalle-valor {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.items-aplicados {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.items-titulo {
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-bottom: 8px;
}

.item-aplicado {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: white;
  border-radius: 6px;
  margin-bottom: 6px;
  border: 1px solid #f0f0f0;
  transition: all 0.2s ease;
}

.item-aplicado:hover {
  border-color: #e0e0e0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.item-info-detalle {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.item-fecha {
  font-size: 11px;
  color: #888;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.item-descripcion {
  font-size: 13px;
  color: #555;
  font-weight: 500;
}

.item-fecha-aplicacion {
  font-size: 11px;
  color: #2e7d32;
  font-weight: 500;
  font-style: italic;
}

.item-monto {
  font-weight: 700;
  color: #2e7d32;
  font-size: 14px;
  white-space: nowrap;
}

/* Información del historial */
.historial-info {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 10px 16px;
  margin-bottom: 16px;
  text-align: center;
}

.historial-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
  font-weight: 500;
}

/* Paginación */
.paginacion {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 2px solid #f0f0f0;
  flex-wrap: wrap;
}

.btn-paginacion {
  background: #667eea;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  min-width: 100px;
}

.btn-paginacion:hover:not(:disabled) {
  background: #5a67d8;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}

.btn-paginacion:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.5;
}

.paginas-numeros {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-numero-pagina {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-numero-pagina:hover {
  background: #f0f4ff;
  transform: scale(1.1);
}

.btn-numero-pagina.activa {
  background: #667eea;
  color: white;
  transform: scale(1.15);
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
}

/* Estados vacíos */
.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

/* Animaciones */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Responsive */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    padding: 16px;
    max-height: 90vh;
  }
  
  .estado-cards {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    flex-direction: column;
  }
  
  .input-field {
    width: 100%;
  }
  
  .item-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .grupo-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .grupo-total {
    font-size: 14px;
  }

  .grupo-resumen {
    grid-template-columns: 1fr;
  }

  .grupo-toggle {
    align-self: flex-end;
  }

  .fecha-aplicacion {
    flex-direction: column;
    align-items: stretch;
  }
  
  .fecha-label {
    min-width: auto;
  }
  
  .aplicacion-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .aplicacion-fecha {
    text-align: left;
  }
  
  .historial-main {
    padding: 12px;
    flex-direction: column;
    gap: 12px;
  }
  
  .historial-left {
    width: 100%;
    justify-content: space-between;
  }
  
  .historial-right {
    width: 100%;
    justify-content: center;
  }
  
  .desktop-text {
    display: none;
  }
  
  .mobile-text {
    display: inline;
  }
  
  .btn-detalle,
  .btn-eliminar-hist {
    padding: 8px;
  }
  
  .btn-auto-aplicar {
    min-width: auto;
    font-size: 14px;
    padding: 10px 16px;
  }
  
  .cuenta-mas-antigua-info .info-detalle {
    padding-left: 0;
    margin-top: 5px;
  }
  
  .distribucion-cascada-info {
    padding: 10px;
  }
  
  .distribucion-cuenta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .distribucion-cuenta .fecha,
  .distribucion-cuenta .monto {
    font-size: 13px;
  }
  
  .cascada-count {
    display: block;
    margin-top: 2px;
  }
  
  .historial-tabs {
    flex-direction: column;
    gap: 8px;
  }
  
  .tab-button {
    padding: 10px 16px;
    font-size: 14px;
  }
  
  .abono-main {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .abono-right {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  
  .abono-monto {
    font-size: 15px;
  }
  
  .btn-eliminar-abono {
    width: 28px;
    height: 28px;
    font-size: 12px;
    min-width: 40px;
  }
  
  .detalle-grid {
    grid-template-columns: 1fr;
  }

  .modal-header {
    flex-direction: row;
    align-items: center;
    padding-bottom: 8px;
  }

  .modal-header h3 {
    font-size: 20px;
  }

  .btn-close-modal {
    width: 32px;
    height: 32px;
    font-size: 20px;
  }

  .paginacion {
    gap: 8px;
    padding-top: 12px;
  }

  .btn-paginacion {
    font-size: 12px;
    padding: 8px 12px;
    min-width: 80px;
  }

  .btn-numero-pagina {
    width: 36px;
    height: 36px;
    font-size: 13px;
  }

  .historial-info p {
    font-size: 13px;
  }
}
</style>
