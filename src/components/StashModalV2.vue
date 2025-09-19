<template>
  <div>
    <button @click="showModal = true" class="stash-button">
      Stash
    </button>

    <!-- Modal Principal -->
    <div v-if="showModal" class="modal">
      <div class="modal-content">
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

    <!-- Modal de Confirmación -->
    <div v-if="mostrarConfirmacion" class="modal">
      <div class="modal-content confirmacion">
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

    <!-- Modal de Historial -->
    <div v-if="verHistorial" class="modal">
      <div class="modal-content">
        <h3>Historial de Abonos</h3>
        
        <div v-if="todosLosAbonos.length === 0" class="empty-state">
          No hay abonos registrados
        </div>
        
        <div v-else class="abonos-list">
          <div v-for="abono in todosLosAbonos" :key="abono.uniqueId" class="abono-item">
            <div class="abono-main">
              <div class="abono-left">
                <div class="abono-fecha">
                  <span class="fecha-cuenta">{{ abono.fechaCuentaFormateada }}</span>
                  <span class="fecha-aplicacion">{{ formatearFechaHora(abono.fechaAplicacion) }}</span>
                </div>
                <div class="abono-descripcion">{{ abono.descripcion }}</div>
              </div>
              <div class="abono-right">
                <div class="abono-monto">${{ formatNumber(abono.monto) }}</div>
                <button 
                  @click="eliminarAbonoIndividual(abono)" 
                  class="btn-eliminar-abono"
                  title="Eliminar abono"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-actions">
          <button @click="verHistorial = false" class="btn-secondary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { collection, addDoc, deleteDoc, doc, getDocs, getDoc, query, orderBy, limit, where, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'

export default {
  name: 'StashModalV2',
  props: {
    cliente: {
      type: String,
      required: true
    }
  },
  setup(props) {
    // Estados principales
    const showModal = ref(false)
    const mostrarConfirmacion = ref(false)
    const verHistorial = ref(false)
    const isAplicando = ref(false)
    const mostrarSeleccionFechas = ref(false)
    
    // Datos
    const stashItems = ref([])
    const saldoActual = ref(0)
    const historialAplicaciones = ref([])
    const cuentasDisponibles = ref([])
    const fechasAplicacion = ref({}) // { itemId: cuentaId }
    const todosLosAbonos = ref([]) // Lista de todos los abonos aplicados
    
    // Formularios
    const nuevoAbono = ref({
      fecha: new Date().toISOString().split('T')[0],
      descripcion: '',
      monto: null
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
      
      for (const cuenta of cuentasOrdenadasPorFecha.value) {
        if (montoRestante <= 0) break
        
        const saldoCuenta = cuenta.nuevoSaldoAcumulado
        const montoAAplicar = Math.min(montoRestante, saldoCuenta)
        
        if (montoAAplicar > 0) {
          distribucion.push({
            cuenta,
            montoAAplicar,
            saldoAntes: saldoCuenta,
            saldoDespues: saldoCuenta - montoAAplicar
          })
          montoRestante -= montoAAplicar
        }
      }
      
      return {
        distribucion,
        totalAplicado: totalStashValue - montoRestante,
        sobrante: montoRestante
      }
    })
    
    // Métodos
    const formatNumber = (value) => {
      if (value === null || value === undefined) return '0.00'
      return Math.abs(value).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }
    
    const formatearFecha = (fecha) => {
      if (!fecha) return ''
      const [year, month, day] = fecha.split('-')
      const dt = new Date(year, month - 1, day)
      return dt.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    }
    
    const formatearFechaHora = (fecha) => {
      if (!fecha) return ''
      return new Date(fecha).toLocaleString('es-ES')
    }
    
    const formatearFechaDia = (fecha) => {
      if (!fecha) return ''
      const dt = new Date(fecha)
      const hoy = new Date()
      const ayer = new Date(hoy)
      ayer.setDate(ayer.getDate() - 1)
      
      // Comparar solo fecha sin hora
      const fechaDt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
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
          year: dt.getFullYear() !== hoy.getFullYear() ? 'numeric' : undefined
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
        stashItems.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
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
              abonos.push({
                uniqueId: `${cuentaId}_${index}_${abono.id || Date.now()}`,
                cuentaId,
                fechaCuenta,
                fechaCuentaFormateada,
                fechaAplicacion: abono.fecha || abono.fechaAplicacion || new Date().toISOString(),
                descripcion: abono.descripcion || 'Sin descripción',
                monto: abono.monto || 0,
                abonoId: abono.id,
                abonoIndex: index,
                esAplicacionIndividual: abono.esAplicacionIndividual || false
              })
            })
          }
        })
        
        // Ordenar por fecha de aplicación más reciente
        todosLosAbonos.value = abonos.sort((a, b) => 
          new Date(b.fechaAplicacion) - new Date(a.fechaAplicacion)
        )
        
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
    
    const agregarAlStash = async () => {
      if (!nuevoAbono.value.fecha || !nuevoAbono.value.descripcion || !nuevoAbono.value.monto) {
        alert('Por favor complete todos los campos')
        return
      }
      
      try {
        const docRef = await addDoc(collection(db, `stash_${props.cliente}`), {
          fecha: nuevoAbono.value.fecha,
          descripcion: nuevoAbono.value.descripcion,
          monto: Number(nuevoAbono.value.monto),
          fechaCreacion: new Date().toISOString()
        })
        
        const nuevoItem = {
          id: docRef.id,
          fecha: nuevoAbono.value.fecha,
          descripcion: nuevoAbono.value.descripcion,
          monto: Number(nuevoAbono.value.monto)
        }
        
        stashItems.value.unshift(nuevoItem)
        
        // Inicializar fecha de aplicación para el nuevo item
        fechasAplicacion.value[docRef.id] = ''
        
        // Limpiar formulario
        nuevoAbono.value = {
          fecha: new Date().toISOString().split('T')[0],
          descripcion: '',
          monto: null
        }
        
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
        const distribucion = distribucionAbonos.value
        const abonosAplicados = []
        
        // Crear abonos proporcionales basados en la distribución
        let montoTotalStash = totalStash.value
        
        for (const itemDistribucion of distribucion.distribucion) {
          const { cuenta, montoAAplicar } = itemDistribucion
          
          if (montoAAplicar <= 0) continue
          
          // Calcular qué porcentaje del stash total va a esta cuenta
          const porcentajeParaCuenta = montoAAplicar / montoTotalStash
          
          // Distribuir cada stash item proporcionalmente
          const abonosParaCuenta = []
          let montoAcumuladoParaCuenta = 0
          
          stashItems.value.forEach((stashItem, index) => {
            let montoDelItem = stashItem.monto * porcentajeParaCuenta
            
            // En el último item de la distribución, ajustar cualquier diferencia por redondeo
            if (index === stashItems.value.length - 1) {
              montoDelItem = montoAAplicar - montoAcumuladoParaCuenta
            }
            
            if (montoDelItem > 0) {
              abonosParaCuenta.push({
                descripcion: `${stashItem.descripcion} (Cascada)`,
                monto: montoDelItem
              })
              montoAcumuladoParaCuenta += montoDelItem
            }
          })
          
          // Aplicar los abonos a esta cuenta específica
          if (abonosParaCuenta.length > 0) {
            await aplicarAbonosACuenta(cuenta.id, abonosParaCuenta, collectionName)
            
            abonosAplicados.push({
              cuentaId: cuenta.id,
              fecha: cuenta.fecha,
              abonos: abonosParaCuenta,
              totalAplicado: montoAAplicar
            })
          }
        }
        
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
              fecha: new Date().toISOString(),
              fechaOriginalStash: item.fecha,
              esAplicacionIndividual: true
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
    
    const cerrarModal = () => {
      showModal.value = false
      mostrarConfirmacion.value = false
      verHistorial.value = false
    }
    
    // Cargar datos al abrir
    onMounted(() => {
      cargarStash()
      cargarSaldoActual()
      cargarHistorial()
      cargarCuentasDisponibles()
      cargarTodosLosAbonos()
    })
    
    
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
      
      // Computed
      clienteNombre,
      totalStash,
      saldoResultante,
      todasFechasSeleccionadas,
      cuentaMasAntiguaNoPagada,
      cuentasOrdenadasPorFecha,
      distribucionAbonos,
      
      // Métodos
      formatNumber,
      formatearFecha,
      formatearFechaHora,
      formatearFechaDia,
      formatearHora,
      verDetalleHistorial,
      obtenerFechaCuenta,
      onFechaAplicacionChange,
      cargarStash,
      cargarSaldoActual,
      cargarCuentasDisponibles,
      agregarAlStash,
      eliminarDelStash,
      validarYMostrarConfirmacion,
      aplicarACuentaMasAntigua,
      aplicarAbonosIndividuales,
      eliminarDelHistorial,
      eliminarAbonoIndividual,
      cargarTodosLosAbonos,
      cerrarModal
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
}

.stash-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-content.confirmacion {
  max-width: 600px;
}

h3 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 24px;
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

.abono-descripcion {
  color: #333;
  font-size: 14px;
  word-wrap: break-word;
  line-height: 1.4;
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
}
</style>