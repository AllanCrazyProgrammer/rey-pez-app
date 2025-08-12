<template>
  <div>
    <button @click="showModal = true" class="stash-button">
      Stash
    </button>

    <!-- Modal para agregar/ver stash -->
    <div v-if="showModal" class="modal">
      <div class="modal-content">
        <h3>Stash de Abonos</h3>
        
        <!-- Formulario para nuevo stash -->
        <div class="stash-form">
          <input 
            type="date" 
            v-model="newStash.fecha" 
            class="stash-input"
          >
          <input 
            type="text" 
            v-model="newStash.descripcion" 
            placeholder="Descripción"
            class="stash-input"
          >
          <input 
            type="number" 
            v-model.number="newStash.cantidad" 
            placeholder="Cantidad"
            class="stash-input"
          >
          <button @click="agregarStash" class="add-button">
            Agregar
          </button>
          <button @click="aplicarAlSaldo" class="apply-button" :disabled="isApplying || stashItems.length === 0">
            {{ isApplying ? 'Aplicando...' : 'Aplicar al saldo' }}
          </button>
          <button @click="showHistory = true" class="history-button">
            Historial
          </button>
        </div>

        <!-- Resumen de saldo con stash -->
        <div class="saldo-resumen" v-if="saldoActual !== null">
          <div class="saldo-card">
            <span class="label">Saldo acumulado actual</span>
            <span class="value">${{ formatNumber(saldoActual) }}</span>
          </div>
          <div class="saldo-card">
            <span class="label">Total abonos en stash</span>
            <span class="value verde">-${{ formatNumber(totalStash) }}</span>
          </div>
          <div class="saldo-card">
            <span class="label">Resultado si aplicas</span>
            <span class="value resultado" :class="{ positivo: saldoSimulado <= 0, negativo: saldoSimulado > 0 }">
              ${{ formatNumber(saldoSimulado) }}
            </span>
          </div>
        </div>

        <!-- Lista de stash -->
        <div class="stash-list">
          <table v-if="stashItems.length > 0">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in stashItems" :key="index">
                <td>{{ formatearFecha(item.fecha) }}</td>
                <td>{{ item.descripcion }}</td>
                <td>${{ formatNumber(item.cantidad) }}</td>
                <td>
                  <button @click="eliminarStash(index)" class="delete-button">
                    Eliminar
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2"><strong>Total:</strong></td>
                <td colspan="2"><strong>${{ formatNumber(totalStash) }}</strong></td>
              </tr>
            </tfoot>
          </table>
          <p v-else class="no-items">No hay items en el stash</p>
        </div>

        <div class="modal-footer">
          <button @click="showModal = false" class="close-button">
            Cerrar
          </button>
        </div>
      </div>
    </div>

    <!-- Historial de abonos aplicados -->
    <HistorialAbonosAplicadosModal v-if="showHistory" :cliente="cliente" @cerrar="showHistory = false" />
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { collection, addDoc, deleteDoc, doc, getDocs, query, orderBy, limit, where, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import HistorialAbonosAplicadosModal from './HistorialAbonosAplicadosModal.vue'

export default {
  name: 'StashModal',
  props: {
    cliente: {
      type: String,
      required: true
    }
  },
  components: { HistorialAbonosAplicadosModal },
  setup(props) {
    const showModal = ref(false)
    const stashItems = ref([])
    const saldoActual = ref(null)
    const isApplying = ref(false)
    const showHistory = ref(false)
    const newStash = ref({
      fecha: new Date().toISOString().split('T')[0],
      descripcion: '',
      cantidad: null
    })

    const totalStash = computed(() => {
      return stashItems.value.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0)
    })

    const saldoSimulado = computed(() => {
      return (Number(saldoActual.value) || 0) - (Number(totalStash.value) || 0)
    })

    const cargarStash = async () => {
      try {
        const q = query(collection(db, `stash_${props.cliente}`))
        const querySnapshot = await getDocs(q)
        stashItems.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (error) {
        console.error('Error al cargar stash:', error)
      }
    }

    const getCuentasCollectionName = () => {
      // Mapear nombre de colección a partir del cliente
      // Ejemplos: catarro -> cuentasCatarro, joselito -> cuentasJoselito, otilioIndependiente -> cuentasOtilioIndependiente
      const capitalized = props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)
      return `cuentas${capitalized}`
    }

    const cargarSaldoActual = async () => {
      try {
        const collectionName = getCuentasCollectionName()
        const q = query(collection(db, collectionName), orderBy('fecha', 'desc'), limit(1))
        const snap = await getDocs(q)
        if (!snap.empty) {
          const data = snap.docs[0].data()
          // Preferir campo persistido; fallback a cálculo del día
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
        console.error('Error al cargar saldo actual:', error)
        saldoActual.value = 0
      }
    }

    const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36)

    const aplicarAlSaldo = async () => {
      if (stashItems.value.length === 0) return
      if (!confirm('¿Aplicar todos los abonos del stash a las notas más antiguas con saldo?')) return
      isApplying.value = true
      try {
        const collectionName = getCuentasCollectionName()

        // Cargar notas ordenadas por fecha ascendente (más antiguas primero)
        const cuentasSnap = await getDocs(query(collection(db, collectionName), orderBy('fecha', 'asc'), limit(500)))
        const cuentas = cuentasSnap.docs.map(d => ({ id: d.id, data: d.data() }))

        // Encontrar el último punto donde el saldo acumulado estuvo en cero (reinicio)
        let lastZeroIndex = -1
        let runningSaldo = 0
        for (let i = 0; i < cuentas.length; i++) {
          const c = cuentas[i].data
          // Preferir campo persistido si existe
          if (typeof c.nuevoSaldoAcumulado === 'number') {
            runningSaldo = c.nuevoSaldoAcumulado
          } else {
            const totalCobrosI = (c.cobros || []).reduce((s, x) => s + (parseFloat(x.monto) || 0), 0)
            const totalAbonosI = (c.abonos || []).reduce((s, x) => s + (parseFloat(x.monto) || 0), 0)
            const totalDiaI = (c.totalGeneralVenta || 0) - totalCobrosI - totalAbonosI
            runningSaldo += totalDiaI
          }
          if (runningSaldo <= 0) {
            lastZeroIndex = i
          }
        }
        const startIndex = Math.min(cuentas.length - 1, Math.max(0, lastZeroIndex + 1))
        const cuentasDesdeCrecimiento = cuentas.slice(startIndex)

        const calcularSaldoVigente = (cuenta) => {
          const totalCobros = (cuenta.data.cobros || []).reduce((s, c) => s + (parseFloat(c.monto) || 0), 0)
          const totalAbonos = (cuenta.data.abonos || []).reduce((s, a) => s + (parseFloat(a.monto) || 0), 0)
          const saldo = (cuenta.data.totalGeneralVenta || 0) - totalCobros - totalAbonos
          return Math.max(0, Number(saldo) || 0)
        }

        for (const item of [...stashItems.value]) {
          let restante = Number(item.cantidad) || 0
          const aplicaciones = []
          if (restante <= 0) continue

          for (const cuenta of cuentasDesdeCrecimiento) {
            if (restante <= 0) break
            let saldo = calcularSaldoVigente(cuenta)
            if (saldo <= 0) continue

            const aplicar = Math.min(restante, saldo)
            const abonoId = uid()
            const nuevoAbono = { id: abonoId, descripcion: item.descripcion, monto: aplicar }
            const nuevosAbonos = [ ...(cuenta.data.abonos || []), nuevoAbono ]

            await updateDoc(doc(db, collectionName, cuenta.id), {
              abonos: nuevosAbonos,
              ultimaActualizacion: new Date().toISOString()
            })

            // Actualizar estado local para siguientes iteraciones
            cuenta.data.abonos = nuevosAbonos
            saldo -= aplicar
            restante -= aplicar
            aplicaciones.push({ cuentaId: cuenta.id, fechaCuenta: cuenta.data.fecha, abonoId, montoAplicado: aplicar })
          }

          // Registrar historial consolidado del item
          if (aplicaciones.length > 0) {
            await addDoc(collection(db, `abonosAplicados_${props.cliente}`), {
              aplicaciones,
              descripcion: item.descripcion,
              montoOriginal: Number(item.cantidad) || 0,
              fechaOriginal: item.fecha,
              fechaAplicacion: new Date().toISOString()
            })
          }

          // Borrar del stash siempre que se haya aplicado algo (o si ya estaba en 0)
          await deleteDoc(doc(db, `stash_${props.cliente}`, item.id))
          const idx = stashItems.value.findIndex(s => s.id === item.id)
          if (idx !== -1) stashItems.value.splice(idx, 1)
        }

        await cargarSaldoActual()
      } finally {
        isApplying.value = false
      }
    }

    const agregarStash = async () => {
      if (!newStash.value.fecha || !newStash.value.descripcion || !newStash.value.cantidad) {
        alert('Por favor complete todos los campos')
        return
      }

      try {
        const [year, month, day] = newStash.value.fecha.split('-').map(Number)
        const fechaAjustada = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        const docRef = await addDoc(collection(db, `stash_${props.cliente}`), {
          fecha: fechaAjustada,
          descripcion: newStash.value.descripcion,
          cantidad: Number(newStash.value.cantidad)
        })

        stashItems.value.push({
          id: docRef.id,
          fecha: fechaAjustada,
          descripcion: newStash.value.descripcion,
          cantidad: Number(newStash.value.cantidad)
        })

        // Limpiar el formulario
        newStash.value = {
          fecha: new Date().toISOString().split('T')[0],
          descripcion: '',
          cantidad: null
        }
      } catch (error) {
        console.error('Error al agregar stash:', error)
        alert('Error al guardar el stash')
      }
    }

    const eliminarStash = async (index) => {
      try {
        const item = stashItems.value[index]
        await deleteDoc(doc(db, `stash_${props.cliente}`, item.id))
        stashItems.value.splice(index, 1)
      } catch (error) {
        console.error('Error al eliminar stash:', error)
        alert('Error al eliminar el stash')
      }
    }

    const formatearFecha = (fecha) => {
      // Crear fecha usando la fecha local sin ajustes de zona horaria
      const [year, month, day] = fecha.split('-')
      const fechaLocal = new Date(year, month - 1, day)
      return fechaLocal.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    const formatNumber = (value) => {
      if (value === null || value === undefined) return '0.00'
      return value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    // Cargar datos al montar y cuando se abre el modal
    cargarStash()
    cargarSaldoActual()

    watch(showModal, (open) => {
      if (open) {
        cargarStash()
        cargarSaldoActual()
      }
    })

    return {
      showModal,
      stashItems,
      newStash,
      totalStash,
      saldoActual,
      saldoSimulado,
      isApplying,
      showHistory,
      agregarStash,
      aplicarAlSaldo,
      eliminarStash,
      formatearFecha,
      formatNumber
    }
  }
}
</script>

<style scoped>
.stash-button {
  background-color: #9c27b0;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.stash-button:hover {
  background-color: #7b1fa2;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.saldo-resumen {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.saldo-card {
  background: #f7f7f7;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.saldo-card .label {
  font-size: 12px;
  color: #666;
}

.saldo-card .value {
  font-size: 18px;
  font-weight: 600;
}

.saldo-card .value.verde { color: #2e7d32; }
.saldo-card .value.resultado { color: #d32f2f; }
.saldo-card .value.resultado.positivo { color: #2e7d32; }
.saldo-card .value.resultado.negativo { color: #d32f2f; }

.stash-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stash-input {
  flex: 1;
  min-width: 120px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.add-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.add-button:hover {
  background-color: #45a049;
}

.apply-button {
  background-color: #1565c0;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
}

.apply-button:disabled { opacity: 0.6; cursor: not-allowed; }

.history-button {
  background-color: #455a64;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f5f5f5;
  font-weight: bold;
}

.delete-button {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.delete-button:hover {
  background-color: #da190b;
}

.close-button {
  background-color: #808080;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.close-button:hover {
  background-color: #666666;
}

.no-items {
  text-align: center;
  color: #666;
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

@media (max-width: 600px) {
  .stash-form {
    flex-direction: column;
  }

  .stash-input {
    width: 100%;
  }

  .modal-content {
    width: 95%;
    padding: 15px;
  }

  .saldo-resumen {
    grid-template-columns: 1fr;
  }

  th, td {
    padding: 8px;
    font-size: 14px;
  }
}
</style> 