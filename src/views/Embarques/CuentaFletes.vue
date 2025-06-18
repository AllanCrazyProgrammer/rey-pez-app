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
              <th></th>
              <th></th>
              <th></th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(item, index) in itemsOrdenados">
              <tr 
                :key="item.id"
                :class="{ 'fila-abono': item.tipo === 'abono' }"
              >
                <td>{{ formatearFecha(item.fecha) }}</td>
                <td>{{ item.tipo === 'abono' ? 'Abono' : 'Flete' }}</td>
                <td>{{ item.tipo === 'abono' ? '-' : item.tarasLimpioJoselito }}</td>
                <td>{{ item.tipo === 'abono' ? '-' : item.tarasCrudoJoselito }}</td>
                <td>{{ item.tipo === 'abono' ? '-' : (item.tarasLimpioJoselito + item.tarasCrudoJoselito) }}</td>
                <td>{{ item.tipo === 'abono' ? 
                  formatearMonto(-item.monto) : 
                  formatearMonto(calcularMontoDia(item)) }}</td>
                <td>{{ formatearMonto(calcularDeudaAcumulada(index)) }}</td>
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
        <div v-for="(item, index) in itemsOrdenados" 
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
                <div class="flete-row">
                  <span class="label">Total Taras:</span>
                  <span class="value">{{ item.tarasLimpioJoselito + item.tarasCrudoJoselito }}</span>
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
              <span class="value">{{ formatearMonto(calcularDeudaAcumulada(index)) }}</span>
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
    totalTarasLimpioJoselito() {
      return this.fletesFiltrados.reduce((total, flete) => total + flete.tarasLimpioJoselito, 0);
    },
    totalTarasCrudoJoselito() {
      return this.fletesFiltrados.reduce((total, flete) => total + flete.tarasCrudoJoselito, 0);
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
        
        const fletesData = embarquesSnapshot.docs
          .map(doc => {
            const data = doc.data();
            let fecha = data.fecha.toDate ? data.fecha.toDate() : new Date(data.fecha);
            
            // Buscar cliente Joselito
            const clienteJoselito = data.clientes?.find(cliente => 
              cliente.id === '1' || cliente.id === 1 || cliente.nombre === 'Joselito'
            );
            
            let tarasLimpioJoselito = 0;
            let tarasCrudoJoselito = 0;

            // Calcular taras de Joselito
            if (clienteJoselito) {
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
            }

            // Solo guardar fletes que tengan datos de Joselito
            if (clienteJoselito) {
              return {
                id: doc.id,
                fecha,
                tarasLimpioJoselito,
                tarasCrudoJoselito,
                cargaCon: data.cargaCon || 'No especificado',
                pagado: data.fletePagado || false
              };
            }
            return null;
          })
          .filter(flete => flete !== null)
          .sort((a, b) => b.fecha - a.fecha);
        
        this.fletes = fletesData;

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
      return (flete.tarasLimpioJoselito * this.costoTaraLimpio) + 
             (flete.tarasCrudoJoselito * this.costoTaraCrudo);
    },
    calcularDeudaAcumulada(index) {
      const itemsCronologicos = [...this.itemsOrdenados]
        .sort((a, b) => a.fecha - b.fecha);
      
      const itemActual = this.itemsOrdenados[index];
      
      return itemsCronologicos
        .filter(item => item.fecha <= itemActual.fecha)
        .reduce((total, item) => {
          if (item.tipo === 'abono') {
            return total - item.monto;
          } else {
            const montoDia = this.calcularMontoDia(item);
            return total + (item.pagado ? 0 : montoDia);
          }
        }, 0);
    },
    async togglePago(flete) {
      try {
        const db = getFirestore();
        const embarqueRef = doc(db, 'embarques', flete.id);
        
        // Actualizar en Firestore
        await updateDoc(embarqueRef, {
          fletePagado: !flete.pagado
        });
        
        // Actualizar el estado local
        const fleteLocal = this.fletes.find(f => f.id === flete.id);
        if (fleteLocal) {
          fleteLocal.pagado = !fleteLocal.pagado;
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
                <th>Total Taras</th>
                <th>Monto</th>
              </tr>
              <tr>
                <th></th>
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
                  <td>${flete.tarasLimpioJoselito + flete.tarasCrudoJoselito}</td>
                  <td>${this.formatearMonto(this.calcularMontoDia(flete))}</td>
                </tr>
              `).join('')}
              <tr class="fila-total">
                <td><strong>TOTAL</strong></td>
                <td><strong>${this.fletesPendientes.reduce((sum, f) => sum + f.tarasLimpioJoselito, 0)}</strong></td>
                <td><strong>${this.fletesPendientes.reduce((sum, f) => sum + f.tarasCrudoJoselito, 0)}</strong></td>
                <td><strong>${this.fletesPendientes.reduce((sum, f) => 
                  sum + f.tarasLimpioJoselito + f.tarasCrudoJoselito, 0)}</strong></td>
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
              </div>
              
              <h4>Totales Generales</h4>
              <p><strong>Total Taras Limpio:</strong> ${this.fletesPendientes.reduce((sum, f) => 
                sum + f.tarasLimpioJoselito, 0)}</p>
              <p><strong>Total Taras Crudo:</strong> ${this.fletesPendientes.reduce((sum, f) => 
                sum + f.tarasCrudoJoselito, 0)}</p>
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
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.header-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.header-section h2 {
  margin: 0;
}

.btn-volver {
  padding: 8px 16px;
  font-size: 14px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-volver:hover {
  background-color: #1976D2;
}

.chofer-selector {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
}

.btn-chofer {
  padding: 10px 20px;
  font-size: 16px;
  border: 2px solid #2196F3;
  background-color: white;
  color: #2196F3;
  cursor: pointer;
  border-radius: 5px;
  transition: all 0.3s;
}

.btn-chofer.active {
  background-color: #2196F3;
  color: white;
}

/* Estilos para desktop */
.tabla-desktop {
  display: block;
}

.tabla-mobile {
  display: none;
}

.tabla-container {
  overflow-x: auto;
}

.tabla-fletes {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 30px;
}

.tabla-fletes th,
.tabla-fletes td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

.tabla-fletes th {
  background-color: #f8f9fa;
  font-weight: bold;
}

/* Estilos para móvil */
.flete-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 16px;
  padding: 16px;
}

.flete-card.pagado {
  border-left: 4px solid #4CAF50;
}

.flete-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.fecha {
  font-weight: bold;
  font-size: 1.1em;
}

.flete-body {
  margin-bottom: 16px;
}

.flete-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.flete-row:last-child {
  border-bottom: none;
}

.label {
  color: #666;
  font-size: 0.9em;
}

.value {
  font-weight: bold;
}

.flete-footer {
  display: flex;
  justify-content: flex-end;
}

.estado {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
}

.estado.pagado {
  background-color: #4CAF50;
  color: white;
}

.estado.pendiente {
  background-color: #f44336;
  color: white;
}

.btn-pago {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
  width: 100%;
}

.btn-marcar-pagado {
  background-color: #4CAF50;
  color: white;
}

.btn-marcar-pendiente {
  background-color: #f44336;
  color: white;
}

/* Estilos del resumen */
.resumen {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-top: 30px;
}

.resumen h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  text-align: center;
}

.resumen-detalles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.resumen-card {
  background: white;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resumen-label {
  color: #666;
  font-size: 0.9em;
}

.resumen-value {
  font-size: 1.2em;
  font-weight: bold;
  color: #333;
}

/* Media queries para responsividad */
@media (max-width: 768px) {
  .cuenta-fletes {
    padding: 10px;
  }

  .tabla-desktop {
    display: none;
  }

  .tabla-mobile {
    display: block;
  }

  .chofer-selector {
    flex-direction: column;
    gap: 10px;
  }

  .btn-chofer, .btn-imprimir {
    width: 100%;
  }

  .resumen {
    padding: 15px;
  }

  .resumen-detalles {
    grid-template-columns: 1fr;
  }

  .resumen-card {
    text-align: center;
  }

  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .btn-volver {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .flete-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .estado {
    align-self: flex-end;
  }

  .btn-pago {
    padding: 12px;
    font-size: 16px;
  }
}

.btn-imprimir {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #FF9800;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-imprimir:hover {
  background-color: #F57C00;
}

.abonos-section {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.abono-inputs {
  display: flex;
  gap: 20px;
  align-items: flex-end;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.input-group label {
  font-size: 14px;
  color: #666;
}

.input-abono,
.input-fecha,
.input-descripcion {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  width: 100%;
}

.input-descripcion {
  min-width: 200px;
}

.btn-agregar-abono {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  height: 40px;
}

.btn-agregar-abono:hover {
  background-color: #45a049;
}

.btn-agregar-abono:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.fila-abono {
  background-color: #e8f5e9;
}

.btn-eliminar-abono {
  padding: 6px 12px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn-eliminar-abono:hover {
  background-color: #d32f2f;
}

.estado.abono {
  background-color: #4CAF50;
  color: white;
}

.flete-card.abono {
  border-left: 4px solid #4CAF50;
  background-color: #e8f5e9;
}

@media (max-width: 768px) {
  .abono-inputs {
    flex-direction: column;
    gap: 15px;
  }

  .input-group {
    width: 100%;
  }

  .input-descripcion {
    min-width: unset;
  }

  .btn-agregar-abono {
    width: 100%;
  }
}

.cliente-section {
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 6px;
}

.cliente-title {
  margin: 0 0 10px 0;
  padding-bottom: 5px;
  border-bottom: 1px solid #ddd;
  font-size: 1em;
  color: #333;
}

.total-row {
  font-weight: bold;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 2px solid #ddd;
}

.resumen-cliente, .resumen-totales {
  margin-bottom: 25px;
  padding: 15px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.resumen-cliente h4, .resumen-totales h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  text-align: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #ddd;
}

.resumen-totales {
  background-color: #f8f9fa;
}

.saldo-pendiente {
  border-left: 4px solid #f44336;
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
    gap: 20px;
  }
  
  .resumen-totales {
    grid-column: 1 / -1;
  }
}
</style> 