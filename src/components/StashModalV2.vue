<template>
  <div>
    <button @click="showModal = true" class="stash-button">
      Stash v2
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
              <button @click="eliminarDelStash(item.id)" class="btn-danger-small">
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- Vista Previa de Aplicación -->
        <div v-if="stashItems.length > 0 && saldoActual > 0" class="seccion-preview">
          <h4>Vista Previa de Aplicación</h4>
          <div class="preview-info">
            <p>Si aplicas todos los abonos del stash:</p>
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
            @click="mostrarConfirmacion = true" 
            class="btn-aplicar"
            :disabled="isAplicando"
          >
            {{ isAplicando ? 'Aplicando...' : 'Aplicar Abonos al Saldo' }}
          </button>
          <button @click="verHistorial = true" class="btn-secondary">
            Ver Historial
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
              <span>{{ formatearFecha(item.fecha) }} - {{ item.descripcion }}</span>
              <span>${{ formatNumber(item.monto) }}</span>
            </div>
          </div>
          
          <div class="resumen-confirmacion">
            <p><strong>Resumen:</strong></p>
            <ul>
              <li>Se aplicará un total de: <strong>${{ formatNumber(totalStash) }}</strong></li>
              <li>Al saldo actual de: <strong>${{ formatNumber(saldoActual) }}</strong></li>
              <li>Resultado final: <strong :class="{ positivo: saldoResultante <= 0 }">${{ formatNumber(saldoResultante) }}</strong></li>
            </ul>
          </div>


        </div>

        <div class="confirmacion-actions">
          <button @click="aplicarAbonos" class="btn-danger">
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
        <h3>Historial de Aplicaciones</h3>
        
        <div v-if="historialAplicaciones.length === 0" class="empty-state">
          No hay aplicaciones registradas
        </div>
        
        <div v-else class="historial-list">
          <div v-for="registro in historialAplicaciones" :key="registro.id" class="historial-item">
            <div class="historial-main">
              <div class="historial-left">
                <div class="historial-fecha">
                  <span class="fecha-dia">{{ formatearFechaDia(registro.fechaAplicacion) }}</span>
                  <span class="fecha-hora">{{ formatearHora(registro.fechaAplicacion) }}</span>
                </div>
                <div class="historial-monto-wrapper">
                  <span class="historial-monto">${{ formatNumber(registro.montoTotal) }}</span>
                  <span class="historial-estado" :class="{ exitoso: registro.exitoso, error: !registro.exitoso }">
                    {{ registro.exitoso ? '✓' : '✗' }}
                  </span>
                </div>
              </div>
              <div class="historial-right">
                <button 
                  @click="verDetalleHistorial(registro)"
                  class="btn-detalle"
                  title="Ver detalles"
                >
                  <span class="desktop-text">Detalles</span>
                  <span class="mobile-text">👁️</span>
                </button>
                <button 
                  @click="eliminarDelHistorial(registro)" 
                  class="btn-eliminar-hist"
                  title="Borrar y revertir"
                >
                  <span class="desktop-text">Borrar</span>
                  <span class="mobile-text">🗑️</span>
                </button>
              </div>
            </div>
            
            <!-- Detalles expandibles -->
            <div v-if="registro.mostrarDetalle" class="historial-detalle-expandido">
              <div class="detalle-grid">
                <div class="detalle-item">
                  <span class="detalle-label">Aplicado a:</span>
                  <span class="detalle-valor">{{ registro.cuentaAfectada ? 'Nota del ' + formatearFechaDia(obtenerFechaCuenta(registro.cuentaAfectada)) : 'No disponible' }}</span>
                </div>
                <div class="detalle-item">
                  <span class="detalle-label">Items aplicados:</span>
                  <span class="detalle-valor">{{ registro.items.length }} {{ registro.items.length === 1 ? 'abono' : 'abonos' }}</span>
                </div>
                <div class="detalle-item">
                  <span class="detalle-label">Saldo anterior:</span>
                  <span class="detalle-valor">${{ formatNumber(registro.saldoAnterior || 0) }}</span>
                </div>
                <div class="detalle-item">
                  <span class="detalle-label">Saldo después:</span>
                  <span class="detalle-valor">${{ formatNumber(registro.saldoNuevo || 0) }}</span>
                </div>
              </div>
              
              <div v-if="registro.items && registro.items.length > 0" class="items-aplicados">
                <p class="items-titulo">Abonos incluidos:</p>
                <div v-for="(item, idx) in registro.items" :key="idx" class="item-aplicado">
                  <span>{{ item.descripcion }}</span>
                  <span>${{ formatNumber(item.monto) }}</span>
                </div>
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
    
    // Datos
    const stashItems = ref([])
    const saldoActual = ref(0)
    const historialAplicaciones = ref([])
    
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
      // Por ahora retornamos una fecha dummy, idealmente buscaríamos la cuenta
      return new Date().toISOString()
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
        
        stashItems.value.unshift({
          id: docRef.id,
          fecha: nuevoAbono.value.fecha,
          descripcion: nuevoAbono.value.descripcion,
          monto: Number(nuevoAbono.value.monto)
        })
        
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
      } catch (error) {
        console.error('Error eliminando del stash:', error)
        alert('Error al eliminar')
      }
    }
    
    const aplicarAbonos = async () => {
      if (isAplicando.value) return
      
      isAplicando.value = true
      mostrarConfirmacion.value = false
      
      try {
        const collectionName = `cuentas${props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)}`
        
        // Aplicar todo al último registro (modo simple)
        const q = query(
          collection(db, collectionName),
          orderBy('fecha', 'desc'),
          limit(1)
        )
        const snapshot = await getDocs(q)
        
        if (snapshot.empty) {
          throw new Error('No se encontró ninguna cuenta')
        }
        
        const cuentaDoc = snapshot.docs[0]
        const cuentaData = cuentaDoc.data()
        
        // Crear un abono consolidado con ID único
        const abonoId = `stash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const abonoConsolidado = {
          id: abonoId,
          descripcion: `Aplicación de Stash (${stashItems.value.length} items)`,
          monto: totalStash.value,
          fecha: new Date().toISOString(),
          detalles: stashItems.value.map(item => ({
            fecha: item.fecha,
            descripcion: item.descripcion,
            monto: item.monto
          }))
        }
        
        // Actualizar la cuenta
        const nuevosAbonos = [...(cuentaData.abonos || []), abonoConsolidado]
        await updateDoc(doc(db, collectionName, cuentaDoc.id), {
          abonos: nuevosAbonos,
          ultimaActualizacion: new Date().toISOString()
        })
        
        // Registrar en historial con el ID del abono
        await addDoc(collection(db, `historial_aplicaciones_${props.cliente}`), {
          fechaAplicacion: new Date().toISOString(),
          modo: 'simple',
          montoTotal: totalStash.value,
          items: stashItems.value,
          cuentaAfectada: cuentaDoc.id,
          abonoId: abonoId,  // Guardar el ID del abono para poder eliminarlo después
          exitoso: true,
          saldoAnterior: saldoActual.value,
          saldoNuevo: saldoResultante.value
        })
        
        // Limpiar stash
        for (const item of stashItems.value) {
          await deleteDoc(doc(db, `stash_${props.cliente}`, item.id))
        }
        
        stashItems.value = []
        await cargarSaldoActual()
        await cargarHistorial()
        
        alert(`✅ Abonos aplicados correctamente\n\nTotal aplicado: $${formatNumber(totalStash.value)}\nNuevo saldo: $${formatNumber(saldoActual.value)}`)
        
      } catch (error) {
        console.error('Error aplicando abonos:', error)
        alert('Error al aplicar los abonos: ' + error.message)
        
        // Registrar error en historial
        await addDoc(collection(db, `historial_aplicaciones_${props.cliente}`), {
          fechaAplicacion: new Date().toISOString(),
          modo: 'simple',
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
      const mensaje = registro.cuentaAfectada && registro.abonoId
        ? `¿Eliminar este registro del historial y revertir el abono de $${formatNumber(registro.montoTotal)} de la nota?\n\nEsto eliminará el abono de la cuenta y actualizará el saldo.`
        : `¿Eliminar este registro del historial?\n\nNota: Este registro no tiene información de la cuenta afectada, solo se eliminará del historial.`
      
      if (!confirm(mensaje)) {
        return
      }
      
      try {
        const collectionName = `cuentas${props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)}`
        
        // Si tiene cuenta afectada y abonoId, eliminar el abono de la cuenta
        if (registro.cuentaAfectada && registro.abonoId) {
          const cuentaRef = doc(db, collectionName, registro.cuentaAfectada)
          const cuentaDoc = await getDoc(cuentaRef)
          
          if (cuentaDoc.exists()) {
            const cuentaData = cuentaDoc.data()
            // Filtrar el abono por su ID
            const nuevosAbonos = (cuentaData.abonos || []).filter(
              abono => abono.id !== registro.abonoId
            )
            
            // Actualizar la cuenta sin el abono
            await updateDoc(cuentaRef, {
              abonos: nuevosAbonos,
              ultimaActualizacion: new Date().toISOString()
            })
            
            console.log(`Abono ${registro.abonoId} eliminado de la cuenta ${registro.cuentaAfectada}`)
          }
        }
        
        // Eliminar el registro del historial
        await deleteDoc(doc(db, `historial_aplicaciones_${props.cliente}`, registro.id))
        
        // Recargar datos
        await cargarSaldoActual()
        await cargarHistorial()
        
        const mensajeExito = registro.cuentaAfectada && registro.abonoId
          ? `✅ Registro eliminado del historial y abono revertido de la nota\n\nMonto revertido: $${formatNumber(registro.montoTotal)}\nNuevo saldo: $${formatNumber(saldoActual.value)}`
          : `✅ Registro eliminado del historial\n\nNota: Solo se eliminó del historial ya que no tenía información de la cuenta.`
        
        alert(mensajeExito)
        
      } catch (error) {
        console.error('Error eliminando del historial:', error)
        alert('Error al eliminar el registro: ' + error.message)
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
    })
    
    return {
      // Estados
      showModal,
      mostrarConfirmacion,
      verHistorial,
      isAplicando,
      
      // Datos
      stashItems,
      saldoActual,
      historialAplicaciones,
      nuevoAbono,
      
      // Computed
      clienteNombre,
      totalStash,
      saldoResultante,
      
      // Métodos
      formatNumber,
      formatearFecha,
      formatearFechaHora,
      formatearFechaDia,
      formatearHora,
      verDetalleHistorial,
      obtenerFechaCuenta,
      cargarStash,
      cargarSaldoActual,
      agregarAlStash,
      eliminarDelStash,
      aplicarAbonos,
      eliminarDelHistorial,
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
  max-width: 700px;
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

/* Listas */
.stash-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px;
}

.stash-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  margin-bottom: 4px;
  background: #f8f9fa;
  border-radius: 4px;
}

.item-info {
  display: flex;
  gap: 16px;
  align-items: center;
  flex: 1;
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

/* Vista previa */
.preview-info {
  background: #f0f7ff;
  border: 1px solid #bbdefb;
  border-radius: 8px;
  padding: 16px;
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

/* Confirmación */
.confirmacion-detalle {
  margin: 20px 0;
}

.lista-confirmacion {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px;
  margin: 12px 0;
  max-height: 150px;
  overflow-y: auto;
}

.item-confirmacion {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #e0e0e0;
}

.item-confirmacion:last-child {
  border-bottom: none;
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

/* Historial */
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

/* Detalles expandidos */
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
  padding: 6px 8px;
  background: white;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 13px;
}

.item-aplicado span:first-child {
  color: #666;
}

.item-aplicado span:last-child {
  font-weight: 600;
  color: #2e7d32;
}

@media (max-width: 600px) {
  .historial-main {
    padding: 12px;
  }
  
  .historial-left {
    gap: 16px;
  }
  
  .historial-monto {
    font-size: 18px;
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
    min-width: 40px;
  }
  
  .detalle-grid {
    grid-template-columns: 1fr;
  }
  
  .historial-fecha {
    min-width: 60px;
  }
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
@media (max-width: 600px) {
  .estado-cards {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    flex-direction: column;
  }
  
  .input-field {
    width: 100%;
  }
  
  .modal-content {
    width: 95%;
    padding: 16px;
  }
}
</style>
