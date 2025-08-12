<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <h3>Historial de Abonos Aplicados</h3>
      <div class="filtros">
        <input type="date" v-model="filtroFechaInicio" class="input" />
        <input type="date" v-model="filtroFechaFin" class="input" />
        <button class="btn" @click="cargarHistorial">Filtrar</button>
      </div>

      <div v-if="isLoading" class="loading">Cargando...</div>
      <table v-else-if="historial.length > 0">
        <thead>
          <tr>
            <th>Fecha Cuenta</th>
            <th>Descripción</th>
            <th>Monto</th>
            <th>Aplicado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="h in historial">
            <tr v-if="!(h.aplicaciones && h.aplicaciones.length)" :key="`single-${h.id}`">
              <td>{{ formatearFecha(h.fechaCuenta) }}</td>
              <td>{{ h.descripcion }}</td>
              <td>${{ formatNumber(h.monto) }}</td>
              <td>{{ formatearFechaHora(h.fechaAplicacion) }}</td>
              <td>
                <button class="btn-danger" @click="eliminarAbono(h)">Borrar</button>
              </td>
            </tr>
            <tr v-else v-for="ap in h.aplicaciones" :key="ap.abonoId">
              <td>{{ formatearFecha(ap.fechaCuenta || h.fechaOriginal) }}</td>
              <td>{{ h.descripcion }}</td>
              <td>${{ formatNumber(ap.montoAplicado) }}</td>
              <td>{{ formatearFechaHora(h.fechaAplicacion) }}</td>
              <td>
                <button class="btn-danger" @click="eliminarAbonoAplicado(h, ap)">Borrar</button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-else class="no-items">No hay abonos aplicados</div>

      <div class="modal-footer">
        <button class="btn" @click="$emit('cerrar')">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import { db } from '@/firebase'
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore'

export default {
  name: 'HistorialAbonosAplicadosModal',
  props: {
    cliente: { type: String, required: true }
  },
  setup(props, { emit }) {
    const historial = ref([])
    const isLoading = ref(false)
    const filtroFechaInicio = ref('')
    const filtroFechaFin = ref('')

    const getCuentasCollectionName = () => {
      const capitalized = props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)
      return `cuentas${capitalized}`
    }

    const cargarHistorial = async () => {
      try {
        isLoading.value = true
        const col = collection(db, `abonosAplicados_${props.cliente}`)
        let qRef = query(col)

        // Filtros de fecha opcionales (por fechaCuenta)
        if (filtroFechaInicio.value && filtroFechaFin.value) {
          qRef = query(col, where('fechaCuenta', '>=', filtroFechaInicio.value), where('fechaCuenta', '<=', filtroFechaFin.value))
        }
        const snap = await getDocs(qRef)
        historial.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      } finally {
        isLoading.value = false
      }
    }

    const eliminarAbono = async (h) => {
      if (!confirm('¿Eliminar este abono del historial y de la cuenta?')) return
      try {
        // Eliminar de la cuenta correspondiente
        const collectionName = getCuentasCollectionName()
        const cuentaRef = doc(db, collectionName, h.cuentaId)
        const cuentaDoc = await (await import('firebase/firestore')).getDoc(cuentaRef)
        if (cuentaDoc.exists()) {
          const data = cuentaDoc.data()
          const nuevosAbonos = (data.abonos || []).filter(a => a.id !== h.abonoId)
          await updateDoc(cuentaRef, { abonos: nuevosAbonos, ultimaActualizacion: new Date().toISOString() })
        }

        // Eliminar del historial
        await deleteDoc(doc(db, `abonosAplicados_${props.cliente}`, h.id))
        await cargarHistorial()
      } catch (error) {
        console.error('Error eliminando abono del historial:', error)
        alert('No se pudo eliminar. Revisa la consola.')
      }
    }

    const eliminarAbonoAplicado = async (h, ap) => {
      if (!confirm('¿Eliminar este abono aplicado y revertirlo de la cuenta?')) return
      try {
        const collectionName = getCuentasCollectionName()
        const cuentaRef = doc(db, collectionName, ap.cuentaId)
        const cuentaDoc = await (await import('firebase/firestore')).getDoc(cuentaRef)
        if (cuentaDoc.exists()) {
          const data = cuentaDoc.data()
          const nuevosAbonos = (data.abonos || []).filter(a => a.id !== ap.abonoId)
          await updateDoc(cuentaRef, { abonos: nuevosAbonos, ultimaActualizacion: new Date().toISOString() })
        }
        // Eliminar entrada del historial; si era un registro con múltiples aplicaciones, elimina solo esa aplicación
        if (h.aplicaciones && h.aplicaciones.length > 1) {
          const nuevasAplicaciones = h.aplicaciones.filter(x => x.abonoId !== ap.abonoId)
          await updateDoc(doc(db, `abonosAplicados_${props.cliente}`, h.id), { aplicaciones: nuevasAplicaciones })
        } else {
          await deleteDoc(doc(db, `abonosAplicados_${props.cliente}`, h.id))
        }
        await cargarHistorial()
      } catch (error) {
        console.error('Error revirtiendo abono aplicado:', error)
        alert('No se pudo revertir. Revisa la consola.')
      }
    }

    const formatearFecha = (fecha) => {
      const [y, m, d] = fecha.split('-')
      const dt = new Date(y, m - 1, d)
      return dt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    }

    const formatearFechaHora = (iso) => {
      const dt = new Date(iso)
      return dt.toLocaleString('es-ES')
    }

    const formatNumber = (value) => {
      if (value === null || value === undefined) return '0.00'
      return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    cargarHistorial()

    return { historial, isLoading, filtroFechaInicio, filtroFechaFin, cargarHistorial, eliminarAbono, eliminarAbonoAplicado, formatearFecha, formatearFechaHora, formatNumber }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}
.modal-content {
  background: #fff;
  width: 95%;
  max-width: 800px;
  border-radius: 10px;
  padding: 16px;
}
.filtros { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.input { padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; }
.btn { background: #1565c0; color: #fff; border: none; border-radius: 4px; padding: 8px 12px; }
.btn-danger { background: #d32f2f; color: #fff; border: none; border-radius: 4px; padding: 6px 10px; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px; border-bottom: 1px solid #eee; text-align: left; }
th { background: #f7f7f7; }
.no-items { text-align: center; padding: 16px; color: #666; }
.modal-footer { display: flex; justify-content: flex-end; margin-top: 12px; }
@media (max-width: 600px) {
  .btn, .btn-danger { padding: 8px; }
  th, td { padding: 8px; }
}
</style>

