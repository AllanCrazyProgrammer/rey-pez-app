<template>
  <div class="cuenta-fletes">
    <div class="header-section">
      <button 
        class="btn-volver"
        @click="volverMenu"
      >
        ← Volver al Menú
      </button>
      <h2>Cuenta de Fletes</h2>
    </div>
    
    <!-- Selector de Chofer -->
    <div class="chofer-selector">
      <button 
        :class="['btn-chofer', { active: choferSeleccionado === 'Caminante' }]"
        @click="choferSeleccionado = 'Caminante'"
      >
        Caminante
      </button>
      <button 
        :class="['btn-chofer', { active: choferSeleccionado === 'Porro' }]"
        @click="choferSeleccionado = 'Porro'"
      >
        Porro
      </button>
      <button 
        class="btn-imprimir"
        @click="generarPDF"
      >
        Imprimir Cuenta Pendiente
      </button>
    </div>

    <!-- Sección de Abonos -->
    <div class="abonos-section">
      <h3>Registrar Abono</h3>
      <div class="abono-inputs">
        <div class="input-group">
          <label>Monto del Abono:</label>
          <input 
            type="number" 
            v-model="nuevoAbono.monto" 
            placeholder="Cantidad"
            class="input-abono"
          >
        </div>
        <div class="input-group">
          <label>Fecha del Abono:</label>
          <input 
            type="date" 
            v-model="nuevoAbono.fecha"
            class="input-fecha"
          >
        </div>
        <div class="input-group">
          <label>Descripción:</label>
          <input 
            type="text" 
            v-model="nuevoAbono.descripcion"
            placeholder="Descripción del abono"
            class="input-descripcion"
          >
        </div>
        <button 
          @click="agregarAbono" 
          class="btn-agregar-abono"
          :disabled="!nuevoAbono.monto || !nuevoAbono.fecha"
        >
          Agregar Abono
        </button>
      </div>
    </div>

    <!-- Tabla de Fletes -->
    <div class="tabla-container">
      <div class="tabla-desktop">
        <table class="tabla-fletes">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th colspan="2">Joselito</th>
              <th colspan="2">Lorena</th>
              <th>Total Taras</th>
              <th>Monto del Día</th>
              <th>Deuda Acumulada</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
            <tr>
              <th></th>
              <th></th>
              <th>Limpio</th>
              <th>Crudo</th>
              <th>Limpio</th>
              <th>Crudo</th>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="item in itemsOrdenados">
              <tr 
                :key="item.id"
                :class="{ 'fila-abono': item.tipo === 'abono' }"
              >
                <td>{{ formatearFecha(item.fecha) }}</td>
                <td>{{ item.tipo === 'abono' ? 'Abono' : 'Flete' }}</td>
                <td>{{ item.tipo === 'abono' ? '-' : item.tarasLimpioJoselito }}</td>
                <td>{{ item.tipo === 'abono' ? '-' : item.tarasCrudoJoselito }}</td>
                <td>{{ item.tipo === 'abono' ? '-' : (item.tarasLimpioVeronica || 0) }}</td>
                <td>{{ item.tipo === 'abono' ? '-' : (item.tarasCrudoVeronica || 0) }}</td>
                <td>{{ item.tipo === 'abono' ? '-' : ((item.tarasLimpioJoselito + item.tarasCrudoJoselito) + ((item.tarasLimpioVeronica || 0) + (item.tarasCrudoVeronica || 0))) }}</td>
                <td>{{ item.tipo === 'abono' ? 
                  formatearMonto(-item.monto) : 
                  formatearMonto(calcularMontoDia(item)) }}</td>
                <td>{{ formatearMonto(deudaAcumuladaPorId[item.id] || 0) }}</td>
                <td>
                  <span v-if="item.tipo === 'flete'" :class="['estado', item.pagado ? 'pagado' : 'pendiente']">
                    {{ item.pagado ? 'Pagado' : 'Pendiente' }}
                  </span>
                  <span v-else class="estado abono">Abono</span>
                </td>
                <td>
                  <button v-if="item.tipo === 'flete'"
                    :class="['btn-pago', item.pagado ? 'btn-marcar-pendiente' : 'btn-marcar-pagado']"
                    @click="togglePago(item)"
                  >
                    {{ item.pagado ? 'Marcar Pendiente' : 'Marcar Pagado' }}
                  </button>
                  <button v-else
                    class="btn-eliminar-abono"
                    @click="eliminarAbono(item)"
                  >
                    Eliminar Abono
                  </button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Vista móvil actualizada -->
      <div class="tabla-mobile">
        <div v-for="item in itemsOrdenados" 
             :key="item.id" 
             class="flete-card"
             :class="{ 'pagado': item.pagado, 'abono': item.tipo === 'abono' }">
          <div class="flete-header">
            <span class="fecha">{{ formatearFecha(item.fecha) }}</span>
            <span v-if="item.tipo === 'flete'" 
                  :class="['estado', item.pagado ? 'pagado' : 'pendiente']">
              {{ item.pagado ? 'Pagado' : 'Pendiente' }}
            </span>
            <span v-else class="estado abono">Abono</span>
          </div>
          <div class="flete-body">
            <div class="flete-row">
              <span class="label">Tipo:</span>
              <span class="value">{{ item.tipo === 'abono' ? 'Abono' : 'Flete' }}</span>
            </div>
            <template v-if="item.tipo === 'flete'">
              <div class="cliente-section">
                <h4 class="cliente-title">Joselito</h4>
                <div class="flete-row">
                  <span class="label">Taras Limpio:</span>
                  <span class="value">{{ item.tarasLimpioJoselito }}</span>
                </div>
                <div class="flete-row">
                  <span class="label">Taras Crudo:</span>
                  <span class="value">{{ item.tarasCrudoJoselito }}</span>
                </div>
              </div>
              <div class="cliente-section">
                <h4 class="cliente-title">Lorena</h4>
                <div class="flete-row">
                  <span class="label">Taras Limpio:</span>
                  <span class="value">{{ item.tarasLimpioVeronica || 0 }}</span>
                </div>
                <div class="flete-row">
                  <span class="label">Taras Crudo:</span>
                  <span class="value">{{ item.tarasCrudoVeronica || 0 }}</span>
                </div>
                <div class="flete-row total-row">
                  <span class="label">Total Taras:</span>
                  <span class="value">{{ (item.tarasLimpioJoselito + item.tarasCrudoJoselito) + ((item.tarasLimpioVeronica || 0) + (item.tarasCrudoVeronica || 0)) }}</span>
                </div>
              </div>
            </template>
            <div class="flete-row">
              <span class="label">{{ item.tipo === 'abono' ? 'Monto Abonado:' : 'Monto del Día:' }}</span>
              <span class="value">{{ item.tipo === 'abono' ? 
                formatearMonto(-item.monto) : 
                formatearMonto(calcularMontoDia(item)) }}</span>
            </div>
            <div class="flete-row">
              <span class="label">Deuda Acumulada:</span>
              <span class="value">{{ formatearMonto(deudaAcumuladaPorId[item.id] || 0) }}</span>
            </div>
          </div>
          <div class="flete-footer">
            <button v-if="item.tipo === 'flete'"
              :class="['btn-pago', item.pagado ? 'btn-marcar-pendiente' : 'btn-marcar-pagado']"
              @click="togglePago(item)"
            >
              {{ item.pagado ? 'Marcar Pendiente' : 'Marcar Pagado' }}
            </button>
            <button v-else
              class="btn-eliminar-abono"
              @click="eliminarAbono(item)"
            >
              Eliminar Abono
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Resumen -->
    <div class="resumen">
      <h3>Resumen de Cuenta</h3>
      <div class="resumen-detalles">
        <div class="resumen-cliente">
          <h4>Cliente Joselito</h4>
          <div class="resumen-grid">
            <div class="resumen-card">
              <span class="resumen-label">Taras Limpio:</span>
              <span class="resumen-value">{{ totalTarasLimpioJoselito }}</span>
            </div>
            <div class="resumen-card">
              <span class="resumen-label">Taras Crudo:</span>
              <span class="resumen-value">{{ totalTarasCrudoJoselito }}</span>
            </div>
            <div class="resumen-card">
              <span class="resumen-label">Total:</span>
              <span class="resumen-value">{{ totalTarasLimpioJoselito + totalTarasCrudoJoselito }}</span>
            </div>
          </div>
        </div>
        
        <div class="resumen-cliente">
          <h4>Cliente Lorena</h4>
          <div class="resumen-grid">
            <div class="resumen-card">
              <span class="resumen-label">Taras Limpio:</span>
              <span class="resumen-value">{{ totalTarasLimpioVeronica }}</span>
            </div>
            <div class="resumen-card">
              <span class="resumen-label">Taras Crudo:</span>
              <span class="resumen-value">{{ totalTarasCrudoVeronica }}</span>
            </div>
            <div class="resumen-card">
              <span class="resumen-label">Total:</span>
              <span class="resumen-value">{{ totalTarasLimpioVeronica + totalTarasCrudoVeronica }}</span>
            </div>
          </div>
        </div>
        
        <div class="resumen-totales">
          <h4>Totales Generales</h4>
          <div class="resumen-grid">
            <div class="resumen-card">
              <span class="resumen-label">Deuda Total:</span>
              <span class="resumen-value">{{ formatearMonto(deudaTotal) }}</span>
            </div>
            <div class="resumen-card">
              <span class="resumen-label">Monto Pagado:</span>
              <span class="resumen-value">{{ formatearMonto(montoPagado) }}</span>
            </div>
            <div class="resumen-card saldo-pendiente">
              <span class="resumen-label">Saldo Pendiente:</span>
              <span class="resumen-value">{{ formatearMonto(saldoPendiente) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import html2pdf from 'html2pdf.js';

export default {
  name: 'CuentaFletes',
  data() {
    return {
      fletes: [],
      abonos: [],
      choferSeleccionado: 'Caminante',
      costoTaraLimpio: 70,
      costoTaraCrudo: 60,
      cargando: false,
      imprimiendo: false,
      nuevoAbono: {
        monto: null,
        fecha: new Date().toISOString().split('T')[0],
        descripcion: ''
      }
    }
  },
  computed: {
    fletesFiltrados() {
      return this.fletes.filter(flete => 
        flete.cargaCon?.toLowerCase().includes(this.choferSeleccionado.toLowerCase())
      );
    },
    abonosFiltrados() {
      return this.abonos.filter(abono => 
        abono.chofer.toLowerCase() === this.choferSeleccionado.toLowerCase()
      );
    },
    itemsOrdenados() {
      const items = [
        ...this.fletesFiltrados.map(f => ({ ...f, tipo: 'flete' })),
        ...this.abonosFiltrados.map(a => ({ ...a, tipo: 'abono' }))
      ];
      return items.sort((a, b) => b.fecha - a.fecha);
    },
    deudaAcumuladaPorId() {
      const itemsCronologicos = [...this.itemsOrdenados]
        .sort((a, b) => a.fecha - b.fecha);

      const acumulados = {};
      let total = 0;

      itemsCronologicos.forEach((item) => {
        if (item.tipo === 'abono') {
          total -= item.monto;
        } else {
          const montoDia = this.calcularMontoDia(item);
          total += (item.pagado ? 0 : montoDia);
        }
        acumulados[item.id] = total;
      });

      return acumulados;
    },
    totalTarasLimpioJoselito() {
      return this.fletesFiltrados.reduce((total, flete) => total + flete.tarasLimpioJoselito, 0);
    },
    totalTarasCrudoJoselito() {
      return this.fletesFiltrados.reduce((total, flete) => total + flete.tarasCrudoJoselito, 0);
    },
    totalTarasLimpioVeronica() {
      return this.fletesFiltrados.reduce((total, flete) => total + (flete.tarasLimpioVeronica || 0), 0);
    },
    totalTarasCrudoVeronica() {
      return this.fletesFiltrados.reduce((total, flete) => total + (flete.tarasCrudoVeronica || 0), 0);
    },
    deudaTotal() {
      return this.fletesFiltrados.reduce((total, flete) => 
        total + this.calcularMontoDia(flete), 0
      );
    },
    montoPagado() {
      return this.fletesFiltrados.reduce((total, flete) => 
        total + (flete.pagado ? this.calcularMontoDia(flete) : 0), 0
      );
    },
    saldoPendiente() {
      return this.deudaTotal - this.montoPagado;
    },
    fletesPendientes() {
      return this.fletesFiltrados.filter(flete => !flete.pagado);
    }
  },
  methods: {
    async cargarFletes() {
      this.cargando = true;
      try {
        const db = getFirestore();
        // Cargar fletes
        const embarquesRef = collection(db, 'embarques');
        const embarquesSnapshot = await getDocs(embarquesRef);
        
        const fletesBase = embarquesSnapshot.docs
          .map(doc => {
            const data = doc.data();
            
            // Filtrar embarques marcados como "No enviado a México"
            if (data.noEnviadoMexico === true) {
              console.log(`[FLETE FILTRADO] Embarque ${doc.id} marcado como NO enviado a México - Se excluye de la cuenta`);
              return null;
            }
            
            let fecha = data.fecha.toDate ? data.fecha.toDate() : new Date(data.fecha);
            
            // Buscar clientes Joselito y Verónica con identificación precisa
            const normalize = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            
            // Identificación precisa de Joselito (ID: 1)
            const clienteJoselito = data.clientes?.find(cliente => {
              const id = cliente.id?.toString();
              const nombre = normalize(cliente.nombre || '');
              return id === '1' || nombre === 'joselito';
            });
            
            // Identificación precisa de Verónica (ID: 5, también puede aparecer como 'Lorena' en notas)
            const clienteVeronica = data.clientes?.find(cliente => {
              const id = cliente.id?.toString();
              const nombre = normalize(cliente.nombre || '');
              const nombreNotas = normalize(cliente.nombreNotas || '');
              return id === '5' || nombre === 'veronica' || nombre === 'lorena' || nombreNotas === 'lorena';
            });
            
            let tarasLimpioJoselito = 0;
            let tarasCrudoJoselito = 0;
            let tarasLimpioVeronica = 0;
            let tarasCrudoVeronica = 0;

            // Calcular taras de Joselito (ID: 1) - Se incluirán junto con las de Verónica
            if (clienteJoselito) {
              console.log('Cliente Joselito encontrado:', {
                id: clienteJoselito.id,
                nombre: clienteJoselito.nombre
              });
              
              // Calcular taras de limpio Joselito
              if (clienteJoselito.productos && Array.isArray(clienteJoselito.productos)) {
                tarasLimpioJoselito = clienteJoselito.productos.reduce((total, producto) => {
                  let tarasProducto = 0;
                  if (Array.isArray(producto.taras)) {
                    tarasProducto += producto.taras.reduce((sum, tara) => 
                      sum + (parseInt(tara) || 0), 0);
                  }
                  if (Array.isArray(producto.tarasExtra)) {
                    tarasProducto += producto.tarasExtra.reduce((sum, tara) => 
                      sum + (parseInt(tara) || 0), 0);
                  }
                  return total + tarasProducto;
                }, 0);
              }

              // Calcular taras de crudo Joselito
              if (clienteJoselito.crudos && Array.isArray(clienteJoselito.crudos)) {
                tarasCrudoJoselito = clienteJoselito.crudos.reduce((total, crudo) => {
                  if (!Array.isArray(crudo.items)) return total;
                  
                  return total + crudo.items.reduce((itemTotal, item) => {
                    let tarasItem = 0;
                    if (item.taras) {
                      const [cantidad] = item.taras.split('-');
                      tarasItem += parseInt(cantidad) || 0;
                    }
                    if (item.sobrante) {
                      const [cantidadSobrante] = item.sobrante.split('-');
                      tarasItem += parseInt(cantidadSobrante) || 0;
                    }
                    return itemTotal + tarasItem;
                  }, 0);
                }, 0);
              }
              
              console.log('Taras calculadas para Joselito:', {
                limpio: tarasLimpioJoselito,
                crudo: tarasCrudoJoselito,
                total: tarasLimpioJoselito + tarasCrudoJoselito
              });
            }

            // Calcular taras de Verónica (ID: 5) - Se incluirán junto con las de Joselito
            if (clienteVeronica) {
              console.log('Cliente Verónica encontrado:', {
                id: clienteVeronica.id,
                nombre: clienteVeronica.nombre,
                nombreNotas: clienteVeronica.nombreNotas
              });
              
              // Calcular taras de limpio Verónica
              if (clienteVeronica.productos && Array.isArray(clienteVeronica.productos)) {
                tarasLimpioVeronica = clienteVeronica.productos.reduce((total, producto) => {
                  let tarasProducto = 0;
                  if (Array.isArray(producto.taras)) {
                    tarasProducto += producto.taras.reduce((sum, tara) => 
                      sum + (parseInt(tara) || 0), 0);
                  }
                  if (Array.isArray(producto.tarasExtra)) {
                    tarasProducto += producto.tarasExtra.reduce((sum, tara) => 
                      sum + (parseInt(tara) || 0), 0);
                  }
                  return total + tarasProducto;
                }, 0);
              }

              // Calcular taras de crudo Verónica
              if (clienteVeronica.crudos && Array.isArray(clienteVeronica.crudos)) {
                tarasCrudoVeronica = clienteVeronica.crudos.reduce((total, crudo) => {
                  if (!Array.isArray(crudo.items)) return total;
                  
                  return total + crudo.items.reduce((itemTotal, item) => {
                    let tarasItem = 0;
                    if (item.taras) {
                      const [cantidad] = item.taras.split('-');
                      tarasItem += parseInt(cantidad) || 0;
                    }
                    if (item.sobrante) {
                      const [cantidadSobrante] = item.sobrante.split('-');
                      tarasItem += parseInt(cantidadSobrante) || 0;
                    }
                    return itemTotal + tarasItem;
                  }, 0);
                }, 0);
              }
              
              console.log('Taras calculadas para Verónica:', {
                limpio: tarasLimpioVeronica,
                crudo: tarasCrudoVeronica,
                total: tarasLimpioVeronica + tarasCrudoVeronica
              });
            }

            // Validación: Verificar que solo se procesen Joselito (ID: 1) y Verónica (ID: 5)
            const clientesPermitidos = ['1', '5'];
            const clientesNoPermitidos = (data.clientes || []).filter(cliente => {
              const id = cliente.id?.toString();
              return !clientesPermitidos.includes(id);
            });
            
            if (clientesNoPermitidos.length > 0) {
              console.warn('Embarque con clientes adicionales detectado. Solo se procesarán Joselito y Verónica:', {
                embarqueId: doc.id,
                clientesNoPermitidos: clientesNoPermitidos.map(c => ({ id: c.id, nombre: c.nombre })),
                clientesPermitidos: (data.clientes || []).filter(c => clientesPermitidos.includes(c.id?.toString()))
              });
            }

            // Log resumen de ambos clientes procesados
            console.log('Resumen de taras procesadas:', {
              embarqueId: doc.id,
              fecha: fecha.toLocaleDateString(),
              joselito: {
                limpio: tarasLimpioJoselito,
                crudo: tarasCrudoJoselito,
                total: tarasLimpioJoselito + tarasCrudoJoselito
              },
              veronica: {
                limpio: tarasLimpioVeronica,
                crudo: tarasCrudoVeronica,
                total: tarasLimpioVeronica + tarasCrudoVeronica
              },
              totalGeneral: (tarasLimpioJoselito + tarasCrudoJoselito) + (tarasLimpioVeronica + tarasCrudoVeronica)
            });

            // Guardar fletes que tengan datos de al menos uno de los clientes
            if (clienteJoselito || clienteVeronica) {
              return {
                id: doc.id,
                fecha,
                tarasLimpioJoselito,
                tarasCrudoJoselito,
                tarasLimpioVeronica,
                tarasCrudoVeronica,
                cargaCon: data.cargaCon || 'No especificado',
                pagado: data.fletePagado || false
              };
            }
            return null;
          })
          .filter(flete => flete !== null);

        const obtenerFechaISO = (fecha) => {
          if (!fecha) return '';
          const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
          if (Number.isNaN(fechaObj.getTime())) return '';
          return fechaObj.toISOString().split('T')[0];
        };

        const fletesAgrupados = new Map();
        fletesBase.forEach(flete => {
          const fechaISO = obtenerFechaISO(flete.fecha);
          const cargaCon = flete.cargaCon || 'No especificado';
          const key = `${fechaISO}__${cargaCon}`;
          const existente = fletesAgrupados.get(key);

          if (!existente) {
            fletesAgrupados.set(key, {
              id: key,
              ids: [flete.id],
              fecha: flete.fecha,
              tarasLimpioJoselito: flete.tarasLimpioJoselito,
              tarasCrudoJoselito: flete.tarasCrudoJoselito,
              tarasLimpioVeronica: flete.tarasLimpioVeronica,
              tarasCrudoVeronica: flete.tarasCrudoVeronica,
              cargaCon,
              pagado: flete.pagado
            });
            return;
          }

          existente.ids.push(flete.id);
          existente.tarasLimpioJoselito += flete.tarasLimpioJoselito;
          existente.tarasCrudoJoselito += flete.tarasCrudoJoselito;
          existente.tarasLimpioVeronica += flete.tarasLimpioVeronica;
          existente.tarasCrudoVeronica += flete.tarasCrudoVeronica;
          existente.pagado = existente.pagado && flete.pagado;
        });

        this.fletes = Array.from(fletesAgrupados.values())
          .map(flete => ({
            ...flete,
            id: flete.ids.length === 1 ? flete.ids[0] : flete.id
          }))
          .sort((a, b) => b.fecha - a.fecha);

        // Cargar abonos
        const abonosRef = collection(db, 'abonos');
        const abonosSnapshot = await getDocs(abonosRef);
        this.abonos = abonosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          fecha: doc.data().fecha.toDate()
        }));

      } catch (error) {
        console.error('Error al cargar los datos:', error);
      } finally {
        this.cargando = false;
      }
    },
    formatearFecha(fecha) {
      const fechaAjustada = new Date(fecha);
      fechaAjustada.setDate(fechaAjustada.getDate() + 1);
      
      return fechaAjustada.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },
    formatearMonto(monto) {
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(monto);
    },
    calcularMontoDia(flete) {
      const limpioJos = flete.tarasLimpioJoselito || 0;
      const crudoJos = flete.tarasCrudoJoselito || 0;
      const limpioVer = flete.tarasLimpioVeronica || 0;
      const crudoVer = flete.tarasCrudoVeronica || 0;
      return (limpioJos * this.costoTaraLimpio) +
             (crudoJos * this.costoTaraCrudo) +
             (limpioVer * this.costoTaraLimpio) +
             (crudoVer * this.costoTaraCrudo);
    },
    async togglePago(flete) {
      try {
        const db = getFirestore();
        const ids = Array.isArray(flete.ids) && flete.ids.length > 0 ? flete.ids : [flete.id];
        const nuevoEstado = !flete.pagado;

        await Promise.all(ids.map(id => {
          const embarqueRef = doc(db, 'embarques', id);
          return updateDoc(embarqueRef, { fletePagado: nuevoEstado });
        }));
        
        // Actualizar el estado local
        const fleteLocal = this.fletes.find(f => f.id === flete.id);
        if (fleteLocal) {
          fleteLocal.pagado = nuevoEstado;
        }
      } catch (error) {
        console.error('Error al actualizar el estado de pago:', error);
        alert('Error al actualizar el estado de pago. Por favor, intente de nuevo.');
      }
    },
    async agregarAbono() {
      if (!this.nuevoAbono.monto || !this.nuevoAbono.fecha) {
        alert('Por favor complete todos los campos del abono');
        return;
      }

      try {
        const db = getFirestore();
        const abonosRef = collection(db, 'abonos');
        
        const nuevoAbono = {
          monto: Number(this.nuevoAbono.monto),
          fecha: new Date(this.nuevoAbono.fecha),
          chofer: this.choferSeleccionado,
          descripcion: this.nuevoAbono.descripcion || 'Abono realizado',
          createdAt: new Date()
        };

        const docRef = await addDoc(abonosRef, nuevoAbono);
        
        // Agregar el abono a la lista local
        this.abonos.push({
          id: docRef.id,
          ...nuevoAbono
        });

        // Limpiar el formulario
        this.nuevoAbono = {
          monto: null,
          fecha: new Date().toISOString().split('T')[0],
          descripcion: ''
        };

        alert('Abono registrado correctamente');
      } catch (error) {
        console.error('Error al agregar el abono:', error);
        alert('Error al registrar el abono');
      }
    },
    async eliminarAbono(abono) {
      if (!confirm('¿Está seguro de eliminar este abono?')) return;

      try {
        const db = getFirestore();
        await deleteDoc(doc(db, 'abonos', abono.id));
        
        // Eliminar de la lista local
        this.abonos = this.abonos.filter(a => a.id !== abono.id);
        
        alert('Abono eliminado correctamente');
      } catch (error) {
        console.error('Error al eliminar el abono:', error);
        alert('Error al eliminar el abono');
      }
    },
    async generarPDF() {
      this.imprimiendo = true;
      
      // Crear el contenido HTML para el PDF
      const contenido = document.createElement('div');
      contenido.innerHTML = `
        <div class="pdf-container">
          <h2>Cuenta de Fletes - ${this.choferSeleccionado}</h2>
          <p class="fecha-impresion">Fecha de impresión: ${new Date().toLocaleDateString('es-ES')}</p>
          
          <!-- Tabla de Fletes Pendientes -->
          <h3>Fletes Pendientes</h3>
          <table class="tabla-pdf">
            <thead>
              <tr>
                <th>Fecha</th>
                <th colspan="2">Joselito</th>
                <th colspan="2">Lorena</th>
                <th>Total Taras</th>
                <th>Monto</th>
              </tr>
              <tr>
                <th></th>
                <th>Limpio</th>
                <th>Crudo</th>
                <th>Limpio</th>
                <th>Crudo</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${this.fletesPendientes.map(flete => `
                <tr>
                  <td>${this.formatearFecha(flete.fecha)}</td>
                  <td>${flete.tarasLimpioJoselito}</td>
                  <td>${flete.tarasCrudoJoselito}</td>
                  <td>${flete.tarasLimpioVeronica || 0}</td>
                  <td>${flete.tarasCrudoVeronica || 0}</td>
                  <td>${(flete.tarasLimpioJoselito + flete.tarasCrudoJoselito) + ((flete.tarasLimpioVeronica || 0) + (flete.tarasCrudoVeronica || 0))}</td>
                  <td>${this.formatearMonto(this.calcularMontoDia(flete))}</td>
                </tr>
              `).join('')}
              <tr class="fila-total">
                <td><strong>TOTAL</strong></td>
                <td><strong>${this.fletesPendientes.reduce((sum, f) => sum + f.tarasLimpioJoselito, 0)}</strong></td>
                <td><strong>${this.fletesPendientes.reduce((sum, f) => sum + f.tarasCrudoJoselito, 0)}</strong></td>
                <td><strong>${this.fletesPendientes.reduce((sum, f) => sum + (f.tarasLimpioVeronica || 0), 0)}</strong></td>
                <td><strong>${this.fletesPendientes.reduce((sum, f) => sum + (f.tarasCrudoVeronica || 0), 0)}</strong></td>
                <td><strong>${this.fletesPendientes.reduce((sum, f) => 
                  sum + (f.tarasLimpioJoselito + f.tarasCrudoJoselito) + ((f.tarasLimpioVeronica || 0) + (f.tarasCrudoVeronica || 0)), 0)}</strong></td>
                <td><strong>${this.formatearMonto(
                  this.fletesPendientes.reduce((sum, f) => sum + this.calcularMontoDia(f), 0)
                )}</strong></td>
              </tr>
            </tbody>
          </table>

          ${this.abonosFiltrados.length > 0 ? `
            <!-- Tabla de Abonos -->
            <h3>Abonos Realizados</h3>
            <table class="tabla-pdf">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th colspan="5">Descripción</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                ${this.abonosFiltrados.map(abono => `
                  <tr class="fila-abono">
                    <td>${this.formatearFecha(abono.fecha)}</td>
                    <td colspan="5">${abono.descripcion || 'Abono realizado'}</td>
                    <td>${this.formatearMonto(abono.monto)}</td>
                  </tr>
                `).join('')}
                <tr class="fila-total">
                  <td colspan="6"><strong>TOTAL ABONOS</strong></td>
                  <td><strong>${this.formatearMonto(
                    this.abonosFiltrados.reduce((sum, a) => sum + a.monto, 0)
                  )}</strong></td>
                </tr>
              </tbody>
            </table>
          ` : ''}

          <div class="resumen-pdf">
            <h3>Resumen de Cuenta</h3>
            <div class="resumen-grid">
              <div class="resumen-clientes">
                <div class="cliente-column">
                  <h4>Cliente Joselito</h4>
                  <p><strong>Taras Limpio:</strong> ${this.fletesPendientes.reduce((sum, f) => sum + f.tarasLimpioJoselito, 0)}</p>
                  <p><strong>Taras Crudo:</strong> ${this.fletesPendientes.reduce((sum, f) => sum + f.tarasCrudoJoselito, 0)}</p>
                  <p><strong>Total Taras Joselito:</strong> ${this.fletesPendientes.reduce((sum, f) => 
                    sum + f.tarasLimpioJoselito + f.tarasCrudoJoselito, 0)}</p>
                </div>
                <div class="cliente-column">
                  <h4>Cliente Lorena</h4>
                  <p><strong>Taras Limpio:</strong> ${this.fletesPendientes.reduce((sum, f) => sum + (f.tarasLimpioVeronica || 0), 0)}</p>
                  <p><strong>Taras Crudo:</strong> ${this.fletesPendientes.reduce((sum, f) => sum + (f.tarasCrudoVeronica || 0), 0)}</p>
                  <p><strong>Total Taras Lorena:</strong> ${this.fletesPendientes.reduce((sum, f) => 
                    sum + ((f.tarasLimpioVeronica || 0) + (f.tarasCrudoVeronica || 0)), 0)}</p>
                </div>
              </div>
              
              <h4>Totales Generales</h4>
              <p><strong>Total Taras Limpio:</strong> ${this.fletesPendientes.reduce((sum, f) => 
                sum + f.tarasLimpioJoselito + (f.tarasLimpioVeronica || 0), 0)}</p>
              <p><strong>Total Taras Crudo:</strong> ${this.fletesPendientes.reduce((sum, f) => 
                sum + f.tarasCrudoJoselito + (f.tarasCrudoVeronica || 0), 0)}</p>
              <p><strong>Monto Total Fletes:</strong> ${this.formatearMonto(
                this.fletesPendientes.reduce((sum, f) => sum + this.calcularMontoDia(f), 0)
              )}</p>
              ${this.abonosFiltrados.length > 0 ? `
                <p><strong>Total Abonado:</strong> ${this.formatearMonto(
                  this.abonosFiltrados.reduce((sum, a) => sum + a.monto, 0)
                )}</p>
              ` : ''}
              <p class="total-final"><strong>Saldo Pendiente:</strong> ${this.formatearMonto(
                this.fletesPendientes.reduce((sum, f) => sum + this.calcularMontoDia(f), 0) -
                this.abonosFiltrados.reduce((sum, a) => sum + a.monto, 0)
              )}</p>
            </div>
          </div>
        </div>
      `;

      // Estilos para el PDF
      const style = document.createElement('style');
      style.textContent = `
        .pdf-container {
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .fecha-impresion {
          color: #666;
          margin-bottom: 20px;
        }
        h3 {
          color: #333;
          margin: 20px 0 10px 0;
        }
        h4 {
          color: #333;
          margin: 15px 0 5px 0;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .tabla-pdf {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .tabla-pdf th, .tabla-pdf td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .tabla-pdf th {
          background-color: #f8f9fa;
        }
        .fila-total {
          background-color: #f8f9fa;
          border-top: 2px solid #ddd;
        }
        .fila-total td {
          font-size: 1.1em;
        }
        .fila-abono {
          background-color: #e8f5e9;
        }
        .resumen-pdf {
          margin-top: 30px;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 5px;
        }
        .resumen-grid {
          display: grid;
          gap: 10px;
        }
        .total-final {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 2px solid #ddd;
        }
        .footer-pdf {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
        }
        .resumen-clientes {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          gap: 15px;
        }
        .cliente-column {
          flex: 1;
          padding: 10px;
          background-color: #f9f9f9;
          border-radius: 5px;
          border: 1px solid #eee;
        }
        .cliente-column h4 {
          text-align: center;
          margin-top: 0;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
      `;
      contenido.appendChild(style);

      // Opciones para el PDF
      const opciones = {
        margin: 10,
        filename: `cuenta_fletes_${this.choferSeleccionado.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      try {
        await html2pdf().from(contenido).set(opciones).save();
      } catch (error) {
        console.error('Error al generar el PDF:', error);
        alert('Error al generar el PDF. Por favor, intente de nuevo.');
      } finally {
        this.imprimiendo = false;
      }
    },
    volverMenu() {
      this.$router.push({ name: 'EmbarquesMenu' });
    }
  },
  mounted() {
    this.cargarFletes();
  }
}
</script>

<style scoped>
.cuenta-fletes {
  padding: 15px;
  max-width: 100%;
  margin: 0 auto;
  min-height: 100vh;
}

.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.header-section h2 {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;
}

.btn-volver {
  padding: 12px 24px;
  font-size: 16px;
  background-color: rgba(255,255,255,0.2);
  color: white;
  border: 2px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
}

.btn-volver:hover {
  background-color: rgba(255,255,255,0.3);
  border-color: rgba(255,255,255,0.5);
  transform: translateY(-2px);
}

.chofer-selector {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 25px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}

.btn-chofer {
  padding: 15px 30px;
  font-size: 16px;
  font-weight: 600;
  border: 2px solid #667eea;
  background-color: white;
  color: #667eea;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s;
  min-width: 120px;
}

.btn-chofer.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.3);
}

.btn-chofer:hover:not(.active) {
  background-color: #f8f9ff;
  transform: translateY(-1px);
}

/* Siempre mostrar formato de tabla */
.tabla-desktop {
  display: block !important;
}

.tabla-mobile {
  display: none !important;
}

.tabla-container {
  overflow-x: auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  margin-bottom: 25px;
  /* Asegurar scroll horizontal suave */
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: #667eea #f1f3f4;
}

.tabla-container::-webkit-scrollbar {
  height: 8px;
}

.tabla-container::-webkit-scrollbar-track {
  background: #f1f3f4;
  border-radius: 4px;
}

.tabla-container::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
}

.tabla-container::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}

.tabla-fletes {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.tabla-fletes th,
.tabla-fletes td {
  padding: 16px 12px;
  text-align: left;
  border-bottom: 1px solid #e8eaed;
  vertical-align: middle;
}

.tabla-fletes th {
  background: linear-gradient(135deg, #f8f9ff 0%, #e8eaff 100%);
  font-weight: 600;
  color: #5f6368;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tabla-fletes tbody tr {
  transition: all 0.2s;
}

.tabla-fletes tbody tr:hover {
  background-color: #f8f9ff;
  transform: scale(1.01);
}

/* Estilos para móvil optimizados */
.flete-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.08);
  margin-bottom: 16px;
  padding: 20px;
  transition: all 0.3s;
}

.flete-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.12);
}

.flete-card.pagado {
  border-left: 6px solid #4CAF50;
  background: linear-gradient(135deg, #ffffff 0%, #f1f8e9 100%);
}

.flete-card.abono {
  border-left: 6px solid #2196F3;
  background: linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%);
}

.flete-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e8eaed;
}

.fecha {
  font-weight: 700;
  font-size: 1.2em;
  color: #1a73e8;
}

.flete-body {
  margin-bottom: 20px;
}

.flete-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.flete-row:last-child {
  border-bottom: none;
}

.label {
  color: #5f6368;
  font-size: 0.95em;
  font-weight: 500;
}

.value {
  font-weight: 700;
  color: #202124;
}

.flete-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.estado {
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.estado.pagado {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
}

.estado.pendiente {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: white;
}

.estado.abono {
  background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
  color: white;
}

.btn-pago {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
  min-width: 140px;
}

.btn-marcar-pagado {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
}

.btn-marcar-pagado:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.3);
}

.btn-marcar-pendiente {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: white;
}

.btn-marcar-pendiente:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(244, 67, 54, 0.3);
}

/* Estilos del resumen optimizados */
.resumen {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
  padding: 30px;
  border-radius: 16px;
  margin-top: 30px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.08);
}

.resumen h3 {
  margin-top: 0;
  margin-bottom: 25px;
  color: #202124;
  text-align: center;
  font-size: 1.8rem;
  font-weight: 700;
}

.resumen-detalles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.resumen-card {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.3s;
}

.resumen-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}

.resumen-label {
  color: #5f6368;
  font-size: 0.95em;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.resumen-value {
  font-size: 1.4em;
  font-weight: 700;
  color: #1a73e8;
}

/* Media queries optimizados para Galaxy Fold - Siempre tabla */
@media (max-width: 820px) and (orientation: portrait) {
  /* Modo plegado - mantener tabla pero optimizada */
  .cuenta-fletes {
    padding: 10px;
  }

  /* Forzar que siempre se muestre la tabla */
  .tabla-desktop {
    display: block !important;
  }

  .tabla-mobile {
    display: none !important;
  }

  /* Hacer la tabla más compacta en móvil */
  .tabla-fletes {
    font-size: 12px;
  }

  .tabla-fletes th,
  .tabla-fletes td {
    padding: 8px 4px;
    font-size: 12px;
  }

  /* Ajustar ancho de columnas para móvil */
  .tabla-fletes th:nth-child(1), /* Fecha */
  .tabla-fletes td:nth-child(1) {
    min-width: 80px;
  }

  .tabla-fletes th:nth-child(2), /* Tipo */
  .tabla-fletes td:nth-child(2) {
    min-width: 50px;
  }

  .tabla-fletes th:nth-child(3), /* Limpio */
  .tabla-fletes td:nth-child(3) {
    min-width: 40px;
  }

  .tabla-fletes th:nth-child(4), /* Crudo */
  .tabla-fletes td:nth-child(4) {
    min-width: 40px;
  }

  .tabla-fletes th:nth-child(5), /* Total Taras */
  .tabla-fletes td:nth-child(5) {
    min-width: 50px;
  }

  .tabla-fletes th:nth-child(6), /* Monto */
  .tabla-fletes td:nth-child(6) {
    min-width: 80px;
  }

  .tabla-fletes th:nth-child(7), /* Deuda */
  .tabla-fletes td:nth-child(7) {
    min-width: 80px;
  }

  .tabla-fletes th:nth-child(8), /* Estado */
  .tabla-fletes td:nth-child(8) {
    min-width: 70px;
  }

  .tabla-fletes th:nth-child(9), /* Acciones */
  .tabla-fletes td:nth-child(9) {
    min-width: 100px;
  }

  /* Botones más pequeños en móvil */
  .btn-pago {
    padding: 6px 8px;
    font-size: 11px;
    min-width: 90px;
  }

  .btn-eliminar-abono {
    padding: 6px 8px;
    font-size: 11px;
  }

  .estado {
    padding: 4px 6px;
    font-size: 10px;
  }

  .chofer-selector {
    flex-direction: column;
    gap: 12px;
  }

  .btn-chofer, .btn-imprimir {
    width: 100%;
    padding: 16px;
  }

  .header-section {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
    gap: 15px;
  }

  .header-section h2 {
    font-size: 1.5rem;
  }

  .btn-volver {
    width: 100%;
    padding: 16px;
  }
}

@media (min-width: 821px) and (max-width: 1200px) {
  /* Modo desplegado - aprovecha el ancho */
  .cuenta-fletes {
    padding: 20px;
  }

  .tabla-fletes {
    font-size: 15px;
  }

  .tabla-fletes th,
  .tabla-fletes td {
    padding: 18px 14px;
  }

  .resumen-detalles {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1201px) {
  /* Pantallas grandes */
  .cuenta-fletes {
    max-width: 1400px;
    padding: 25px;
  }

  .tabla-fletes {
    font-size: 16px;
  }

  .tabla-fletes th,
  .tabla-fletes td {
    padding: 20px 16px;
  }

  .resumen-detalles {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 480px) {
  /* Asegurar que la tabla siga siendo visible en pantallas muy pequeñas */
  .tabla-desktop {
    display: block !important;
  }

  .tabla-mobile {
    display: none !important;
  }

  /* Tabla aún más compacta para pantallas muy pequeñas */
  .tabla-fletes {
    font-size: 10px;
  }

  .tabla-fletes th,
  .tabla-fletes td {
    padding: 6px 2px;
    font-size: 10px;
  }

  .btn-pago {
    padding: 4px 6px;
    font-size: 9px;
    min-width: 70px;
  }

  .btn-eliminar-abono {
    padding: 4px 6px;
    font-size: 9px;
  }

  .estado {
    padding: 2px 4px;
    font-size: 8px;
  }

  .header-section {
    padding: 15px;
  }

  .header-section h2 {
    font-size: 1.3rem;
  }
}

.btn-imprimir {
  padding: 15px 30px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 200px;
}

.btn-imprimir:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 152, 0, 0.3);
}

.abonos-section {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
  padding: 25px;
  border-radius: 16px;
  margin-bottom: 25px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.08);
}

.abono-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr auto;
  gap: 20px;
  align-items: end;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-group label {
  font-size: 14px;
  font-weight: 600;
  color: #5f6368;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-abono,
.input-fecha,
.input-descripcion {
  padding: 12px 16px;
  border: 2px solid #e8eaed;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s;
  background: white;
}

.input-abono:focus,
.input-fecha:focus,
.input-descripcion:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-agregar-abono {
  padding: 12px 24px;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 600;
  height: 48px;
}

.btn-agregar-abono:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.3);
}

.btn-agregar-abono:disabled {
  background: linear-gradient(135deg, #cccccc 0%, #999999 100%);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.fila-abono {
  background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
}

.btn-eliminar-abono {
  padding: 10px 16px;
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 600;
}

.btn-eliminar-abono:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.3);
}

.cliente-section {
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #f9f9f9 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid #e8eaed;
}

.cliente-title {
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #e8eaed;
  font-size: 1.1em;
  font-weight: 700;
  color: #202124;
}

.total-row {
  font-weight: 700;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 2px solid #e8eaed;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  border-radius: 8px;
  padding: 15px;
}

.resumen-cliente, .resumen-totales {
  margin-bottom: 25px;
  padding: 25px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.08);
}

.resumen-cliente h4, .resumen-totales h4 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #202124;
  text-align: center;
  padding-bottom: 12px;
  border-bottom: 2px solid #e8eaed;
  font-size: 1.4rem;
  font-weight: 700;
}

.resumen-totales {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%);
}

.saldo-pendiente {
  border-left: 6px solid #f44336;
  background: linear-gradient(135deg, #ffffff 0%, #ffebee 100%);
}

.saldo-pendiente .resumen-value {
  color: #f44336;
  font-size: 1.6em;
}

/* Media queries específicos para Galaxy Fold */
@media (max-width: 820px) and (orientation: portrait) {
  .abono-inputs {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .btn-agregar-abono {
    width: 100%;
    height: 52px;
  }

  .btn-imprimir {
    width: 100%;
  }
}

@media (min-width: 821px) and (max-width: 1200px) {
  .abono-inputs {
    grid-template-columns: 1fr 1fr 1fr auto;
  }
}

@media (min-width: 1201px) {
  .abono-inputs {
    grid-template-columns: 200px 200px 1fr auto;
  }
}

@media (max-width: 992px) {
  .resumen-detalles {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
}

@media (min-width: 993px) {
  .resumen-detalles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 25px;
  }
  
  .resumen-totales {
    grid-column: 1 / -1;
  }
}
</style> 
