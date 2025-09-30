<template>
  <div v-if="mostrar" class="modal-overlay" @click="cerrarModal">
    <div class="modal-content historial-abonos-modal" @click.stop>
      <div class="modal-header">
        <h2>Historial de Abonos - {{ proveedor?.nombre }}</h2>
        <button @click="$emit('cerrar')" class="close-button">×</button>
      </div>
      
      <div class="modal-body">
        <!-- Filtros y estadísticas -->
        <div class="filtros-container">
          <div class="filtros-row">
            <div class="filtro-grupo">
              <label for="filtroFechaDesde">Desde:</label>
              <input 
                id="filtroFechaDesde" 
                type="date" 
                v-model="filtros.fechaDesde"
                @change="aplicarFiltros"
              >
            </div>
            
            <div class="filtro-grupo">
              <label for="filtroFechaHasta">Hasta:</label>
              <input 
                id="filtroFechaHasta" 
                type="date" 
                v-model="filtros.fechaHasta"
                @change="aplicarFiltros"
              >
            </div>
            
            <div class="filtro-grupo">
              <label for="filtroTipo">Tipo:</label>
              <select id="filtroTipo" v-model="filtros.tipo" @change="aplicarFiltros">
                <option value="">Todos</option>
                <option value="individual">Individual</option>
                <option value="general">Abono General</option>
              </select>
            </div>
            
            <div class="filtro-grupo">
              <button @click="limpiarFiltros" class="btn-limpiar">
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        <!-- Estadísticas -->
        <div class="estadisticas-container">
          <div class="estadistica-card">
            <div class="estadistica-valor">${{ formatNumber(estadisticas.totalAbonos) }}</div>
            <div class="estadistica-label">Total Abonos</div>
          </div>
          
          <div class="estadistica-card">
            <div class="estadistica-valor">{{ estadisticas.cantidadAbonos }}</div>
            <div class="estadistica-label">Cantidad de Abonos</div>
          </div>
          
          <div class="estadistica-card">
            <div class="estadistica-valor">${{ formatNumber(estadisticas.promedioAbono) }}</div>
            <div class="estadistica-label">Promedio por Abono</div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="cargando" class="loading-container">
          <div class="spinner"></div>
          <p>Cargando historial de abonos...</p>
        </div>

        <!-- Lista de abonos -->
        <div v-else-if="abonosAgrupados.length > 0" class="abonos-container">
          <div class="paginacion-info">
            <p>
              Mostrando
              <span v-if="rangoPaginacion.inicio > 0">
                {{ rangoPaginacion.inicio }} - {{ rangoPaginacion.fin }}
              </span>
              <span v-else>0</span>
              de {{ abonosAgrupados.length }} movimientos
            </p>
          </div>

          <div class="abonos-list">
            <div
              v-for="grupo in abonosPaginados"
              :key="grupo.id"
              class="abono-item"
              :class="{
                'abono-general': grupo.esAbonoGeneral,
                'abono-expandido': esDesgloseVisible(grupo.id)
              }"
            >
              <div class="abono-header" @click="toggleDesglose(grupo.id)">
                <div class="abono-header-info">
                  <div class="abono-fecha">
                    <i class="fas fa-calendar-alt"></i>
                    {{ formatearFecha(grupo.fecha) }}
                  </div>
                  <div class="abono-descripcion-resumen">
                    <i class="fas fa-comment-alt"></i>
                    {{ grupo.descripcion || 'Sin descripción' }}
                  </div>
                </div>
                
                <div class="abono-header-actions">
                  <div class="abono-monto">
                    ${{ formatNumber(grupo.montoTotal) }}
                  </div>
                  <div class="abono-tipo">
                    <span :class="grupo.esAbonoGeneral ? 'tipo-general' : 'tipo-individual'">
                      {{ grupo.esAbonoGeneral ? 'General' : 'Individual' }}
                    </span>
                  </div>
                  <button
                    class="btn-toggle-desglose"
                    type="button"
                    @click.stop="toggleDesglose(grupo.id)"
                    :aria-expanded="esDesgloseVisible(grupo.id)"
                  >
                    <i :class="['fas', esDesgloseVisible(grupo.id) ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
                  </button>
                </div>
              </div>

              <transition name="fade">
                <div v-if="esDesgloseVisible(grupo.id)" class="abono-desglose">
                  <div class="abono-desglose-resumen">
                    <span>{{ grupo.items.length }} {{ grupo.items.length === 1 ? 'movimiento' : 'movimientos' }}</span>
                    <span>Registrado: {{ formatearFechaHora(grupo.ultimaCreacion) }}</span>
                  </div>

                  <div
                    v-for="detalle in grupo.items"
                    :key="`${detalle.deudaId}-${detalle.id}`"
                    class="abono-detalle-item"
                  >
                      <div class="detalle-izquierda">
                        <div class="detalle-descripcion">{{ detalle.descripcion || 'Sin descripción' }}</div>
                        <div class="detalle-deuda">
                          <span>Deuda del {{ formatearFecha(detalle.deudaFecha) }}</span>
                          <span>Total deuda: ${{ formatNumber(detalle.deudaTotal) }}</span>
                        </div>
                        <div class="detalle-registrado">
                          <template v-if="detalle.editandoFecha">
                            <label class="editar-fecha-label">
                              Nueva fecha de registro:
                              <input
                                type="datetime-local"
                                v-model="detalle.fechaCreacionEditable"
                                class="input-fecha-registro"
                              >
                            </label>
                            <div class="acciones-edicion-fecha">
                              <button
                                class="btn-guardar-fecha"
                                :disabled="detalle.guardandoFecha || !detalle.fechaCreacionEditable"
                                @click.stop="guardarFechaRegistro(detalle)"
                              >
                                {{ detalle.guardandoFecha ? 'Guardando...' : 'Guardar' }}
                              </button>
                              <button
                                class="btn-cancelar-fecha"
                                :disabled="detalle.guardandoFecha"
                                @click.stop="cancelarEdicionFecha(detalle)"
                              >
                                Cancelar
                              </button>
                            </div>
                          </template>
                          <template v-else>
                            <span>Registrado: {{ formatearFechaHora(detalle.fechaCreacion) }}</span>
                            <button
                              class="btn-editar-fecha"
                              title="Editar fecha de registro"
                              @click.stop="iniciarEdicionFecha(detalle)"
                            >
                              <i class="fas fa-edit"></i>
                            </button>
                          </template>
                        </div>
                      </div>
                      <div class="detalle-derecha">
                        <span class="detalle-monto">${{ formatNumber(detalle.monto) }}</span>
                        <button
                          @click.stop="confirmarEliminarAbono(detalle)"
                          class="btn-eliminar-abono"
                          title="Eliminar abono"
                        >
                          <i class="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                </div>
              </transition>
            </div>
          </div>

          <!-- Paginación -->
          <div class="paginacion-container" v-if="totalPaginas > 1">
            <button 
              @click="cambiarPagina(paginaActual - 1)" 
              :disabled="paginaActual === 1"
              class="btn-paginacion"
            >
              <i class="fas fa-chevron-left"></i> Anterior
            </button>
            
            <div class="paginas-numeros">
              <button 
                v-for="pagina in paginasVisibles" 
                :key="pagina"
                @click="cambiarPagina(pagina)"
                :class="['btn-pagina', { 'activa': pagina === paginaActual }]"
              >
                {{ pagina }}
              </button>
            </div>
            
            <button 
              @click="cambiarPagina(paginaActual + 1)" 
              :disabled="paginaActual === totalPaginas"
              class="btn-paginacion"
            >
              Siguiente <i class="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- No data -->
        <div v-else class="no-data">
          <div class="no-data-icon">
            <i class="fas fa-money-bill-wave"></i>
          </div>
          <h3>No hay abonos registrados</h3>
          <p v-if="Object.values(filtros).some(f => f)">
            No se encontraron abonos con los filtros aplicados.
          </p>
          <p v-else>
            Este proveedor no tiene abonos registrados aún.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs, query, where, orderBy, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';

export default {
  name: 'HistorialAbonosModal',
  props: {
    mostrar: {
      type: Boolean,
      required: true
    },
    proveedor: {
      type: Object,
      required: true
    }
  },
  emits: ['cerrar', 'abono-eliminado'],
  data() {
    return {
      cargando: false,
      abonos: [],
      abonosFiltrados: [],
      desglosesVisibles: {},
      
      // Paginación
      paginaActual: 1,
      abonosPorPagina: 10,
      
      // Filtros
      filtros: {
        fechaDesde: '',
        fechaHasta: '',
        tipo: ''
      }
    };
  },
  computed: {
    abonosAgrupados() {
      const gruposMapa = new Map();

      for (const abono of this.abonosFiltrados) {
        const esGeneral = Boolean(abono.esAbonoGeneral);
        const fechaClave = abono.fecha || this.obtenerFechaDesdeTimestamp(abono.fechaCreacion);
        const baseDescripcion = esGeneral
          ? this.normalizarDescripcionGeneral(abono.descripcion)
          : (abono.descripcion || 'Abono');
        const loteTimestamp = this.parseTimestamp(abono.fechaCreacion);
        const loteId = loteTimestamp ? Math.floor(loteTimestamp.getTime() / 60000) : 'sin-lote';
        const clave = esGeneral
          ? `${fechaClave || 'sin-fecha'}||${baseDescripcion || 'general'}||${loteId}`
          : `${abono.deudaId}-${abono.id}`;

        if (!gruposMapa.has(clave)) {
          gruposMapa.set(clave, {
            id: clave,
            esAbonoGeneral: esGeneral,
            fecha: fechaClave,
            fechaDate: this.parseFecha(fechaClave, abono.fechaCreacion),
            descripcion: baseDescripcion || (esGeneral ? 'Abono general' : 'Abono'),
            items: [],
            montoTotal: 0,
            ultimaCreacion: this.parseTimestamp(abono.fechaCreacion)
          });
        }

        const grupo = gruposMapa.get(clave);
        grupo.items.push(abono);
        grupo.montoTotal += Number(abono.monto) || 0;

        const fechaItem = this.parseFecha(abono.fecha, abono.fechaCreacion);
        if (fechaItem && (!grupo.fechaDate || fechaItem > grupo.fechaDate)) {
          grupo.fechaDate = fechaItem;
          grupo.fecha = abono.fecha || grupo.fecha;
        }

        const creado = this.parseTimestamp(abono.fechaCreacion);
        if (creado && (!grupo.ultimaCreacion || creado > grupo.ultimaCreacion)) {
          grupo.ultimaCreacion = creado;
        }

        if (!grupo.descripcion) {
          grupo.descripcion = baseDescripcion || (esGeneral ? 'Abono general' : 'Abono');
        }
      }

      const grupos = Array.from(gruposMapa.values());

      grupos.forEach(grupo => {
        grupo.items.sort((a, b) => {
          const fechaA = this.parseFecha(a.fecha, a.fechaCreacion);
          const fechaB = this.parseFecha(b.fecha, b.fechaCreacion);

          if (fechaA && fechaB && fechaA.getTime() !== fechaB.getTime()) {
            return fechaB - fechaA;
          }

          if (!fechaA && fechaB) return 1;
          if (fechaA && !fechaB) return -1;

          const creacionA = this.parseTimestamp(a.fechaCreacion);
          const creacionB = this.parseTimestamp(b.fechaCreacion);

          if (creacionA && creacionB && creacionA.getTime() !== creacionB.getTime()) {
            return creacionB - creacionA;
          }

          return (Number(b.monto) || 0) - (Number(a.monto) || 0);
        });
      });

      grupos.sort((a, b) => {
        if (a.fechaDate && b.fechaDate && a.fechaDate.getTime() !== b.fechaDate.getTime()) {
          return b.fechaDate - a.fechaDate;
        }

        if (!a.fechaDate && b.fechaDate) return 1;
        if (a.fechaDate && !b.fechaDate) return -1;

        if (a.ultimaCreacion && b.ultimaCreacion && a.ultimaCreacion.getTime() !== b.ultimaCreacion.getTime()) {
          return b.ultimaCreacion - a.ultimaCreacion;
        }

        return 0;
      });

      return grupos;
    },
    totalPaginas() {
      return Math.ceil(this.abonosAgrupados.length / this.abonosPorPagina);
    },
    
    abonosPaginados() {
      const inicio = (this.paginaActual - 1) * this.abonosPorPagina;
      const fin = inicio + this.abonosPorPagina;
      return this.abonosAgrupados.slice(inicio, fin);
    },

    rangoPaginacion() {
      if (!this.abonosAgrupados.length) {
        return { inicio: 0, fin: 0 };
      }

      const inicio = (this.paginaActual - 1) * this.abonosPorPagina + 1;
      const fin = Math.min(this.paginaActual * this.abonosPorPagina, this.abonosAgrupados.length);
      return { inicio, fin };
    },
    
    paginasVisibles() {
      const paginas = [];
      const totalPaginas = this.totalPaginas;
      const actual = this.paginaActual;
      
      // Mostrar máximo 5 páginas
      let inicio = Math.max(1, actual - 2);
      let fin = Math.min(totalPaginas, inicio + 4);
      
      // Ajustar si estamos cerca del final
      if (fin - inicio < 4) {
        inicio = Math.max(1, fin - 4);
      }
      
      for (let i = inicio; i <= fin; i++) {
        paginas.push(i);
      }
      
      return paginas;
    },
    
    estadisticas() {
      const totalAbonos = this.abonosFiltrados.reduce((sum, abono) => sum + (Number(abono.monto) || 0), 0);
      const cantidadAbonos = this.abonosFiltrados.length;
      const promedioAbono = cantidadAbonos > 0 ? totalAbonos / cantidadAbonos : 0;
      
      return {
        totalAbonos,
        cantidadAbonos,
        promedioAbono
      };
    }
  },
  methods: {
    cerrarModal(event) {
      if (event.target === event.currentTarget) {
        this.$emit('cerrar');
      }
    },

    toggleDesglose(grupoId) {
      const estadoActual = this.desglosesVisibles[grupoId] || false;
      this.$set(this.desglosesVisibles, grupoId, !estadoActual);
    },

    esDesgloseVisible(grupoId) {
      return Boolean(this.desglosesVisibles[grupoId]);
    },
    
    cambiarPagina(pagina) {
      if (pagina >= 1 && pagina <= this.totalPaginas) {
        this.paginaActual = pagina;
      }
    },
    
    ordenarAbonosPorFecha(lista) {
      return lista.slice().sort((a, b) => {
        const fechaA = this.parseFecha(a.fecha, a.fechaCreacion);
        const fechaB = this.parseFecha(b.fecha, b.fechaCreacion);

        if (fechaA && fechaB && fechaA.getTime() !== fechaB.getTime()) {
          return fechaB - fechaA;
        }

        if (!fechaA && fechaB) return 1;
        if (fechaA && !fechaB) return -1;

        const creacionA = this.parseTimestamp(a.fechaCreacion);
        const creacionB = this.parseTimestamp(b.fechaCreacion);

        if (creacionA && creacionB && creacionA.getTime() !== creacionB.getTime()) {
          return creacionB - creacionA;
        }

        return (Number(b.monto) || 0) - (Number(a.monto) || 0);
      });
    },

    async cargarHistorialAbonos() {
      if (!this.proveedor?.id) return;
      
      try {
        this.cargando = true;
        this.abonos = [];
        
        // Obtener todas las deudas del proveedor
        const deudasQuery = query(
          collection(db, 'deudas'),
          where('proveedorId', '==', this.proveedor.id)
        );
        
        const deudasSnapshot = await getDocs(deudasQuery);
        const deudas = deudasSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Para cada deuda, obtener sus abonos
        for (const deuda of deudas) {
          const abonosQuery = query(
            collection(db, 'deudas', deuda.id, 'abonos'),
            orderBy('fechaCreacion', 'desc')
          );
          
          const abonosSnapshot = await getDocs(abonosQuery);
          const abonosDeuda = abonosSnapshot.docs.map(doc => ({
            id: doc.id,
            deudaId: deuda.id,
            deudaFecha: deuda.fecha,
            deudaTotal: deuda.total,
            editandoFecha: false,
            guardandoFecha: false,
            fechaCreacionEditable: '',
            ...doc.data()
          }));
          
          this.abonos.push(...abonosDeuda);
        }
        
        // Ordenar todos los abonos priorizando la fecha del movimiento
        this.abonos = this.ordenarAbonosPorFecha(this.abonos);
        
        // Aplicar filtros iniciales
        this.aplicarFiltros();

      } catch (error) {
        console.error('Error al cargar historial de abonos:', error);
        alert('Error al cargar el historial de abonos');
      } finally {
        this.cargando = false;
      }
    },
    
    aplicarFiltros() {
      const filtrados = this.abonos.filter(abono => {
        // Filtro por fecha desde
        if (this.filtros.fechaDesde && abono.fecha < this.filtros.fechaDesde) {
          return false;
        }
        
        // Filtro por fecha hasta
        if (this.filtros.fechaHasta && abono.fecha > this.filtros.fechaHasta) {
          return false;
        }
        
        // Filtro por tipo
        if (this.filtros.tipo) {
          if (this.filtros.tipo === 'general' && !abono.esAbonoGeneral) {
            return false;
          }
          if (this.filtros.tipo === 'individual' && abono.esAbonoGeneral) {
            return false;
          }
        }
        
        return true;
      });
      
      this.abonosFiltrados = this.ordenarAbonosPorFecha(filtrados);
      this.desglosesVisibles = {};
      // Resetear paginación
      this.paginaActual = 1;
    },
    
    limpiarFiltros() {
      this.filtros = {
        fechaDesde: '',
        fechaHasta: '',
        tipo: ''
      };
      this.aplicarFiltros();
    },

    parseFecha(fechaString, fallbackTimestamp) {
      if (fechaString) {
        const fecha = new Date(`${fechaString}T00:00:00`);
        if (!Number.isNaN(fecha.getTime())) {
          return fecha;
        }
      }

      return this.parseTimestamp(fallbackTimestamp);
    },

    parseTimestamp(valor) {
      if (!valor) return null;

      if (typeof valor.toDate === 'function') {
        const fecha = valor.toDate();
        return Number.isNaN(fecha?.getTime()) ? null : fecha;
      }

      const fecha = new Date(valor);
      return Number.isNaN(fecha.getTime()) ? null : fecha;
    },

    obtenerFechaDesdeTimestamp(timestamp) {
      const fecha = this.parseTimestamp(timestamp);
      if (!fecha) return '';

      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    normalizarDescripcionGeneral(descripcion = '') {
      if (!descripcion) return '';
      return descripcion.replace(/\s*\(Abono General(?:[^)]*)?\)\s*$/i, '').trim();
    },
    
    formatNumber(number) {
      return number ? number.toLocaleString('es-MX', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }) : '0.00';
    },
    
    formatearFecha(fechaString) {
      if (!fechaString) return '';
      
      const fecha = new Date(fechaString + 'T00:00:00');
      const opciones = { day: 'numeric', month: 'short', year: 'numeric' };
      return fecha.toLocaleDateString('es-ES', opciones);
    },
    
    formatearFechaHora(timestamp) {
      if (!timestamp) return '';
      
      const fecha = timestamp?.toDate?.() || new Date(timestamp);
      const opciones = { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      return fecha.toLocaleDateString('es-ES', opciones);
    },

    formatearFechaHoraEditable(timestamp) {
      const fecha = this.parseTimestamp(timestamp);
      if (!fecha) return '';

      const pad = valor => String(valor).padStart(2, '0');
      const year = fecha.getFullYear();
      const month = pad(fecha.getMonth() + 1);
      const day = pad(fecha.getDate());
      const hours = pad(fecha.getHours());
      const minutes = pad(fecha.getMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    },
    
    confirmarEliminarAbono(abono) {
      const mensaje = `¿Está seguro de que desea eliminar este abono?\n\n` +
                     `Fecha: ${this.formatearFecha(abono.fecha)}\n` +
                     `Monto: $${this.formatNumber(abono.monto)}\n` +
                     `Tipo: ${abono.esAbonoGeneral ? 'Abono General' : 'Individual'}\n` +
                     `Descripción: ${abono.descripcion}\n\n` +
                     `Esta acción no se puede deshacer y afectará el saldo de la deuda.`;
                     
      if (confirm(mensaje)) {
        this.eliminarAbono(abono);
      }
    },
    
    async eliminarAbono(abono) {
      try {
        // Obtener la deuda actual para calcular el nuevo saldo
        const deudaRef = doc(db, 'deudas', abono.deudaId);
        const deudaDoc = await getDoc(deudaRef);
        
        if (!deudaDoc.exists()) {
          alert('Error: No se encontró la deuda asociada a este abono.');
          return;
        }
        
        const deudaData = deudaDoc.data();
        const saldoActual = deudaData.saldoPendiente || 0;
        const montoTotal = deudaData.total || 0;
        const nuevoSaldo = saldoActual + abono.monto; // Devolver el monto al saldo
        
        // Determinar el nuevo estado de la deuda basado en el nuevo saldo
        let nuevoEstado;
        if (nuevoSaldo <= 0) {
          nuevoEstado = 'pagado'; // Si no queda saldo, está pagado
        } else {
          nuevoEstado = 'pendiente'; // Si queda saldo, está pendiente
        }
        
        console.log('=== ELIMINANDO ABONO ===');
        console.log('Deuda ID:', abono.deudaId);
        console.log('Monto total de la deuda:', montoTotal);
        console.log('Saldo antes de eliminar:', saldoActual);
        console.log('Monto del abono eliminado:', abono.monto);
        console.log('Nuevo saldo calculado:', nuevoSaldo);
        console.log('Estado actual:', deudaData.estado);
        console.log('Nuevo estado calculado:', nuevoEstado);
        
        // Eliminar el abono de la subcolección
        const abonoRef = doc(db, 'deudas', abono.deudaId, 'abonos', abono.id);
        await deleteDoc(abonoRef);
        console.log('Abono eliminado de Firebase');
        
        // Crear el objeto de actualización con validación adicional
        const actualizacionDeuda = {
          saldoPendiente: Math.max(0, nuevoSaldo), // Asegurar que el saldo no sea negativo
          estado: nuevoEstado,
          fechaActualizacion: new Date().toISOString()
        };
        
        // Si el saldo nuevo es mayor que el total, algo está mal, usar el total como saldo
        if (nuevoSaldo > montoTotal) {
          console.warn('Saldo calculado mayor que el total, ajustando...');
          actualizacionDeuda.saldoPendiente = montoTotal;
          actualizacionDeuda.estado = 'pendiente';
        }
        
        console.log('Datos que se actualizarán en Firebase:', actualizacionDeuda);
        
        // Actualizar la deuda con el nuevo saldo y estado
        await updateDoc(deudaRef, actualizacionDeuda);
        console.log('Deuda actualizada en Firebase exitosamente');
        
        // Verificar que la actualización se aplicó correctamente
        const deudaVerificacion = await getDoc(deudaRef);
        if (deudaVerificacion.exists()) {
          const datosVerificacion = deudaVerificacion.data();
          console.log('=== VERIFICACIÓN POST-ACTUALIZACIÓN ===');
          console.log('Estado en Firebase:', datosVerificacion.estado);
          console.log('Saldo Pendiente en Firebase:', datosVerificacion.saldoPendiente);
          console.log('Fecha actualización:', datosVerificacion.fechaActualizacion);
          
          if (datosVerificacion.estado !== nuevoEstado) {
            console.error('¡ALERTA! El estado no se actualizó correctamente en Firebase');
            console.error('Esperado:', nuevoEstado, 'Encontrado:', datosVerificacion.estado);
          }
          
          if (Math.abs(datosVerificacion.saldoPendiente - actualizacionDeuda.saldoPendiente) > 0.01) {
            console.error('¡ALERTA! El saldo pendiente no se actualizó correctamente en Firebase');
            console.error('Esperado:', actualizacionDeuda.saldoPendiente, 'Encontrado:', datosVerificacion.saldoPendiente);
          }
        }
        
        // Mostrar mensaje de éxito con información detallada
        alert(`Abono eliminado exitosamente.\n\nDetalles:\n• Nuevo saldo pendiente: $${this.formatNumber(actualizacionDeuda.saldoPendiente)}\n• Estado: ${nuevoEstado.toUpperCase()}\n• Fecha: ${new Date().toLocaleString('es-MX')}`);
        
        // Recargar el historial de abonos
        await this.cargarHistorialAbonos();
        
        // Emitir evento para actualizar la lista de deudas en el componente padre
        this.$emit('abono-eliminado', {
          deudaId: abono.deudaId,
          proveedorId: this.proveedor.id,
          nuevoSaldo: actualizacionDeuda.saldoPendiente,
          nuevoEstado: nuevoEstado
        });
        
      } catch (error) {
        console.error('Error al eliminar el abono:', error);
        alert('Error al eliminar el abono. Por favor, intente de nuevo.');
      }
    },

    iniciarEdicionFecha(detalle) {
      this.$set(detalle, 'editandoFecha', true);
      this.$set(detalle, 'guardandoFecha', false);
      this.$set(detalle, 'fechaCreacionEditable', this.formatearFechaHoraEditable(detalle.fechaCreacion));
    },

    cancelarEdicionFecha(detalle) {
      this.$set(detalle, 'editandoFecha', false);
      this.$set(detalle, 'guardandoFecha', false);
      this.$set(detalle, 'fechaCreacionEditable', '');
    },

    async guardarFechaRegistro(detalle) {
      if (!detalle.fechaCreacionEditable) {
        alert('Selecciona una fecha y hora válidas.');
        return;
      }

      const nuevaFecha = new Date(detalle.fechaCreacionEditable);
      if (Number.isNaN(nuevaFecha.getTime())) {
        alert('La fecha ingresada no es válida.');
        return;
      }

      this.$set(detalle, 'guardandoFecha', true);

      try {
        const abonoRef = doc(db, 'deudas', detalle.deudaId, 'abonos', detalle.id);
        await updateDoc(abonoRef, { fechaCreacion: nuevaFecha });

        this.$set(detalle, 'fechaCreacion', nuevaFecha);
        this.$set(detalle, 'fechaCreacionEditable', this.formatearFechaHoraEditable(nuevaFecha));
        this.$set(detalle, 'editandoFecha', false);

        this.abonos = this.ordenarAbonosPorFecha(this.abonos);
        this.abonosFiltrados = this.ordenarAbonosPorFecha(this.abonosFiltrados);

        alert('Fecha de registro actualizada.');
      } catch (error) {
        console.error('Error al actualizar la fecha del abono:', error);
        alert('No fue posible actualizar la fecha. Intenta de nuevo.');
      } finally {
        this.$set(detalle, 'guardandoFecha', false);
      }
    }
  },
  
  watch: {
    mostrar(newVal) {
      if (newVal && this.proveedor) {
        this.cargarHistorialAbonos();
        this.limpiarFiltros();
      }
    }
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.historial-abonos-modal {
  background: white;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  max-width: 900px;
  width: 95%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 2px solid #e9ecef;
  background: linear-gradient(135deg, #9b59b6, #8e44ad);
  color: white;
  border-radius: 15px 15px 0 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5em;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  color: white;
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.modal-body {
  padding: 25px;
}

.filtros-container {
  background: #f8f9fa;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.filtros-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  align-items: end;
}

.filtro-grupo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filtro-grupo label {
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.9em;
}

.filtro-grupo input,
.filtro-grupo select {
  padding: 8px 12px;
  border: 2px solid #e9ecef;
  border-radius: 6px;
  font-size: 0.9em;
  transition: border-color 0.3s;
}

.filtro-grupo input:focus,
.filtro-grupo select:focus {
  outline: none;
  border-color: #9b59b6;
}

.btn-limpiar {
  padding: 8px 15px;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s;
}

.btn-limpiar:hover {
  background: #7f8c8d;
}

.estadisticas-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}

.estadistica-card {
  background: linear-gradient(135deg, #fff, #f8f9fa);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  border-left: 4px solid #9b59b6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.estadistica-valor {
  font-size: 1.8em;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 8px;
}

.estadistica-label {
  color: #7f8c8d;
  font-weight: 500;
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.5px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #7f8c8d;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e9ecef;
  border-top: 4px solid #9b59b6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.paginacion-info {
  margin-bottom: 15px;
  color: #7f8c8d;
  font-size: 0.9em;
}

.abonos-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.abono-item {
  background: white;
  border-radius: 10px;
  border: 2px solid #e9ecef;
  overflow: hidden;
  transition: all 0.3s ease;
}

.abono-item:hover {
  border-color: #9b59b6;
  box-shadow: 0 4px 12px rgba(155, 89, 182, 0.1);
}

.abono-general {
  border-left: 4px solid #f39c12;
}

.abono-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-bottom: 1px solid #e9ecef;
  gap: 15px;
  cursor: pointer;
}

.abono-header-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.abono-descripcion-resumen {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #34495e;
  font-size: 0.95em;
}

.abono-fecha {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #2c3e50;
}

.abono-header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.abono-monto {
  font-size: 1.3em;
  font-weight: 700;
  color: #27ae60;
}

.abono-tipo {
  display: flex;
  align-items: center;
}

.btn-toggle-desglose {
  background: white;
  border: 1px solid #d5d8dc;
  color: #7f8c8d;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-toggle-desglose:hover {
  border-color: #9b59b6;
  color: #9b59b6;
}

.abono-expandido {
  border-color: #9b59b6;
  box-shadow: 0 6px 14px rgba(155, 89, 182, 0.18);
}

.abono-desglose {
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: #fbfbfd;
}

.abono-desglose-resumen {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  color: #7f8c8d;
}

.abono-detalle-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid #e9ecef;
}

.abono-detalle-item:first-of-type {
  border-top: none;
}

.detalle-izquierda {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #2c3e50;
}

.detalle-deuda {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.9em;
  color: #7f8c8d;
}

.detalle-registrado {
  font-size: 0.85em;
  color: #95a5a6;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detalle-registrado > span {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-editar-fecha {
  background: none;
  border: none;
  color: #7f8c8d;
  cursor: pointer;
  font-size: 1em;
  transition: color 0.2s ease;
}

.btn-editar-fecha:hover {
  color: #9b59b6;
}

.editar-fecha-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #7f8c8d;
}

.input-fecha-registro {
  padding: 6px 10px;
  border: 1px solid #ccd1d9;
  border-radius: 6px;
  font-size: 0.9em;
}

.input-fecha-registro:focus {
  outline: none;
  border-color: #9b59b6;
  box-shadow: 0 0 0 2px rgba(155, 89, 182, 0.15);
}

.acciones-edicion-fecha {
  display: flex;
  gap: 10px;
}

.btn-guardar-fecha,
.btn-cancelar-fecha {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.85em;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-guardar-fecha {
  background: linear-gradient(135deg, #27ae60, #219150);
  color: white;
  box-shadow: 0 2px 6px rgba(39, 174, 96, 0.3);
}

.btn-guardar-fecha:disabled {
  background: #b8e1c6;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-guardar-fecha:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(39, 174, 96, 0.35);
}

.btn-cancelar-fecha {
  background: #ecf0f1;
  color: #7f8c8d;
}

.btn-cancelar-fecha:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(127, 140, 141, 0.25);
}

.detalle-derecha {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  min-width: 140px;
}

.detalle-monto {
  font-size: 1.1em;
  font-weight: 600;
  color: #27ae60;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.tipo-general {
  background: #f39c12;
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.8em;
  font-weight: 500;
}

.tipo-individual {
  background: #3498db;
  color: white;
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.8em;
  font-weight: 500;
}

.abono-acciones {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-eliminar-abono {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(231, 76, 60, 0.3);
  position: relative;
  overflow: hidden;
}

.btn-eliminar-abono::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.btn-eliminar-abono:hover::before {
  left: 100%;
}

.btn-eliminar-abono:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
  background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
}

.btn-eliminar-abono:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(231, 76, 60, 0.3);
}

.btn-eliminar-abono i {
  font-size: 1em;
}

.abono-body {
  padding: 15px 20px;
}

.abono-descripcion {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-weight: 500;
  color: #2c3e50;
}

.abono-deuda-info {
  display: flex;
  justify-content: space-between;
  color: #7f8c8d;
  font-size: 0.9em;
}

.abono-footer {
  padding: 10px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.fecha-creacion {
  color: #95a5a6;
  font-size: 0.8em;
  text-align: right;
}

.paginacion-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #e9ecef;
}

.btn-paginacion {
  padding: 8px 15px;
  background: #ecf0f1;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-paginacion:hover:not(:disabled) {
  background: #bdc3c7;
}

.btn-paginacion:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.paginas-numeros {
  display: flex;
  gap: 5px;
}

.btn-pagina {
  padding: 8px 12px;
  background: #ecf0f1;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-pagina:hover {
  background: #bdc3c7;
}

.btn-pagina.activa {
  background: #9b59b6;
  color: white;
}

.no-data {
  text-align: center;
  padding: 60px 20px;
  color: #7f8c8d;
}

.no-data-icon {
  font-size: 4em;
  margin-bottom: 20px;
  opacity: 0.3;
}

.no-data h3 {
  margin: 0 0 10px 0;
  color: #95a5a6;
}

.no-data p {
  margin: 5px 0;
  font-size: 0.9em;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .historial-abonos-modal {
    width: 98%;
    margin: 10px;
  }
  
  .filtros-row {
    grid-template-columns: 1fr;
  }
  
  .estadisticas-container {
    grid-template-columns: 1fr;
  }
  
  .abono-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .abono-acciones {
    align-self: flex-end;
    margin-top: 10px;
  }
  
  .btn-eliminar-abono {
    padding: 10px 14px;
    font-size: 1em;
  }
  
  .abono-deuda-info {
    flex-direction: column;
    gap: 5px;
  }
  
  .paginacion-container {
    flex-direction: column;
    gap: 15px;
  }
}
</style>
