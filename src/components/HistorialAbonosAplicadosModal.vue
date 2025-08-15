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
          <tr v-for="(h, index) in historial" :key="`row-${index}-${h.id}`">
            <td v-if="h.esFila">{{ formatearFecha(h.aplicacionIndividual.fechaCuenta || h.fechaOriginal) }}</td>
            <td v-else>{{ formatearFecha(h.fechaCuenta) }}</td>
            
            <td>{{ h.descripcion }}</td>
            
            <td v-if="h.esFila">${{ formatNumber(h.aplicacionIndividual.montoAplicado) }}</td>
            <td v-else>${{ formatNumber(h.monto) }}</td>
            
            <td>{{ formatearFechaHora(h.fechaAplicacion) }}</td>
            
            <td v-if="h.esFila">
              <button class="btn-danger" @click="eliminarAbonoAplicado(h, h.aplicacionIndividual)">Borrar</button>
            </td>
            <td v-else>
              <button class="btn-danger" @click="eliminarAbono(h)">Borrar</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="no-items">No hay abonos aplicados</div>

      <div class="pagination">
        <button class="btn" :disabled="!hasPrevPage || isLoading" @click="prevPage">Anterior</button>
        <span class="page-info">Página {{ currentPage }}</span>
        <button class="btn" :disabled="!hasNextPage || isLoading" @click="nextPage">Siguiente</button>
      </div>

      <div class="modal-footer">
        <button class="btn" @click="$emit('cerrar')">Cerrar</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { db } from '@/firebase'
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, orderBy, limit, startAfter, endBefore, limitToLast } from 'firebase/firestore'

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
    const pageSize = ref(8)
    const currentPage = ref(1)
    const hasNextPage = ref(false)
    const hasPrevPage = computed(() => currentPage.value > 1)

    const getCuentasCollectionName = () => {
      const capitalized = props.cliente.charAt(0).toUpperCase() + props.cliente.slice(1)
      return `cuentas${capitalized}`
    }

    const buildBaseQuery = () => {
      const col = collection(db, `abonosAplicados_${props.cliente}`)
      
      // Filtro por rango de aplicación
      if (filtroFechaInicio.value && filtroFechaFin.value) {
        const inicioIso = `${filtroFechaInicio.value}T00:00:00.000Z`
        const finIso = `${filtroFechaFin.value}T23:59:59.999Z`
        return query(col, where('fechaAplicacion', '>=', inicioIso), where('fechaAplicacion', '<=', finIso), orderBy('fechaAplicacion', 'desc'))
      }
      
      return query(col, orderBy('fechaAplicacion', 'desc'))
    }

    const cargarHistorial = async () => {
      try {
        isLoading.value = true
        
        // Cargar TODOS los datos sin límite para hacer ordenamiento local
        const col = collection(db, `abonosAplicados_${props.cliente}`)
        let qRef = query(col)
        
        // Aplicar filtros si están presentes
        if (filtroFechaInicio.value && filtroFechaFin.value) {
          const inicioIso = `${filtroFechaInicio.value}T00:00:00.000Z`
          const finIso = `${filtroFechaFin.value}T23:59:59.999Z`
          qRef = query(col, where('fechaAplicacion', '>=', inicioIso), where('fechaAplicacion', '<=', finIso))
        }
        
        const snap = await getDocs(qRef)
        let todosDatos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        
        // Expandir registros con múltiples aplicaciones en filas individuales
        let filasExpandidas = []
        for (const registro of todosDatos) {
          if (registro.aplicaciones && registro.aplicaciones.length > 0) {
            // Cada aplicación es una fila
            for (const ap of registro.aplicaciones) {
              filasExpandidas.push({
                ...registro,
                aplicacionIndividual: ap,
                fechaOrden: registro.fechaAplicacion,
                esFila: true
              })
            }
          } else {
            // Registro sin aplicaciones múltiples
            filasExpandidas.push({
              ...registro,
              fechaOrden: registro.fechaAplicacion,
              esFila: false
            })
          }
        }
        
        // Debug: Ver qué datos tenemos antes de ordenar
        console.log('Datos antes de ordenar:', filasExpandidas.map(f => ({
          fecha: f.fechaOrden,
          desc: f.descripcion,
          monto: f.esFila ? f.aplicacionIndividual?.montoAplicado : f.monto
        })))
        
        // Ordenamiento local FORZADO por fechaAplicacion descendente
        filasExpandidas.sort((a, b) => {
          const fechaA = new Date(a.fechaOrden || '1970-01-01')
          const fechaB = new Date(b.fechaOrden || '1970-01-01')
          return fechaB.getTime() - fechaA.getTime()
        })
        
        // Debug: Ver qué datos tenemos después de ordenar
        console.log('Datos después de ordenar:', filasExpandidas.map(f => ({
          fecha: f.fechaOrden,
          desc: f.descripcion,
          monto: f.esFila ? f.aplicacionIndividual?.montoAplicado : f.monto
        })))
        
        // Resetear a página 1 al cargar
        currentPage.value = 1
        
        // Tomar solo las primeras 8 FILAS (paginación manual)
        const inicio = (currentPage.value - 1) * pageSize.value
        const fin = inicio + pageSize.value
        historial.value = filasExpandidas.slice(inicio, fin)
        
        // Configurar paginación
        hasNextPage.value = fin < filasExpandidas.length
        
        console.log('Total FILAS:', filasExpandidas.length)
        console.log('Mostrando filas:', inicio + 1, 'al', Math.min(fin, filasExpandidas.length))
        console.log('Primera fila fecha:', historial.value[0]?.fechaOrden)
        console.log('Última fila fecha:', historial.value[historial.value.length - 1]?.fechaOrden)
        
        // Guardar todos los datos expandidos para paginación
        window._historialCompleto = filasExpandidas
        
      } catch (error) {
        console.error('Error cargando historial:', error)
      } finally {
        isLoading.value = false
      }
    }

    const nextPage = () => {
      if (!hasNextPage.value) return
      
      currentPage.value += 1
      
      // Usar los datos expandidos ya cargados
      const filasExpandidas = window._historialCompleto || []
      const inicio = (currentPage.value - 1) * pageSize.value
      const fin = inicio + pageSize.value
      
      historial.value = filasExpandidas.slice(inicio, fin)
      hasNextPage.value = fin < filasExpandidas.length
      
      console.log('Página siguiente:', currentPage.value)
      console.log('Mostrando filas:', inicio + 1, 'al', Math.min(fin, filasExpandidas.length))
    }

    const prevPage = () => {
      if (currentPage.value <= 1) return
      
      currentPage.value -= 1
      
      // Usar los datos expandidos ya cargados
      const filasExpandidas = window._historialCompleto || []
      const inicio = (currentPage.value - 1) * pageSize.value
      const fin = inicio + pageSize.value
      
      historial.value = filasExpandidas.slice(inicio, fin)
      hasNextPage.value = fin < filasExpandidas.length
      
      console.log('Página anterior:', currentPage.value)
      console.log('Mostrando filas:', inicio + 1, 'al', Math.min(fin, filasExpandidas.length))
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

    return { historial, isLoading, filtroFechaInicio, filtroFechaFin, cargarHistorial, eliminarAbono, eliminarAbonoAplicado, formatearFecha, formatearFechaHora, formatNumber, nextPage, prevPage, hasNextPage, hasPrevPage, currentPage }
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
.pagination { display: flex; gap: 10px; align-items: center; justify-content: center; margin-top: 12px; flex-wrap: wrap; }
.page-info { color: #444; font-weight: 600; }
@media (max-width: 600px) {
  .btn, .btn-danger { padding: 8px; }
  th, td { padding: 8px; }
}
</style>

