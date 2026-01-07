<template>
  <div v-if="mostrar" class="modal-overlay">
    <div class="modal-agenda">
      <div class="modal-header">
        <h3>Agenda de Transacciones</h3>
        <button @click="$emit('cerrar')" class="btn-cerrar">×</button>
      </div>
      
      <div class="modal-body">
      <div class="calendario-container">
        <div class="selector-fecha">
          <button @click="cambiarMes(-1)" class="btn-nav">&lt;</button>
          <span class="mes-anio">{{ nombreMes }} {{ anioActual }}</span>
          <button @click="cambiarMes(1)" class="btn-nav">&gt;</button>
        </div>
        
        <div class="dias-semana">
          <div v-for="dia in diasSemana" :key="dia" class="dia-nombre">{{ dia }}</div>
        </div>
        
        <div class="calendario">
          <div 
            v-for="(dia, index) in diasCalendario" 
            :key="index" 
            class="dia-celda" 
            :class="{ 
              'otro-mes': !dia.esMesActual,
              'dia-actual': dia.esHoy,
              'tiene-registros': tieneRegistros(dia.fecha),
              'seleccionado': esDiaSeleccionado(dia.fecha)
            }"
            @click="seleccionarDia(dia)"
          >
            <span class="numero-dia">{{ dia.numero }}</span>
            <div v-if="tieneRegistros(dia.fecha)" class="indicadores-clientes">
              <div 
                v-for="cliente in obtenerClientesConTransacciones(dia.fecha)" 
                :key="cliente" 
                class="indicador-cliente"
                :class="'indicador-' + cliente"
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="transacciones-container">
        <div v-if="diaSeleccionado">
        <div class="dia-seleccionado-header">
          <h4>{{ formatoFechaCompleta }}</h4>
          <div class="acciones-dia">
            <PdfResumenDiaButton
              v-if="transaccionesDia.length > 0"
              :fecha-legible="formatoFechaCompleta"
              :fecha-iso="diaSeleccionado ? toISODateLocal(diaSeleccionado.fecha) : ''"
              :total-dia="calcularTotalDia()"
              :monto-efectivo="montoEfectivoDia"
              :monto-cuentas="montoCuentasDia"
              :transacciones="transaccionesDia"
              :clientes-agrupados="clientesAgrupados"
            />
            <button @click="mostrarFormulario = true" class="btn-agregar">+ Agregar transacción</button>
          </div>
        </div>
        
        <div v-if="transaccionesDia.length > 0 && !mostrarFormulario" class="resumen-dia">
          <div class="resumen-dia-item">
            <span>Total del día:</span>
            <span>${{ formatearNumero(calcularTotalDia()) }}</span>
          </div>
          <div class="resumen-dia-item">
            <span>Transacciones:</span>
            <span class="resumen-dia-metric">
              <span class="resumen-dia-num">{{ transaccionesDia.length }}</span>
              <span class="resumen-dia-extra">Efectivo: ${{ formatearNumero(montoEfectivoDia) }}</span>
              <span class="resumen-dia-extra">Cuentas: ${{ formatearNumero(montoCuentasDia) }}</span>
            </span>
          </div>
        </div>
        
        <div v-if="transaccionesDia.length === 0 && !mostrarFormulario" class="sin-transacciones">
          No hay transacciones registradas para este día.
        </div>
        
        <div v-if="mostrarFormulario" class="formulario-transaccion">
          <div class="form-group">
            <label for="cliente">Cliente:</label>
            <select id="cliente" v-model="nuevaTransaccion.cliente" class="input-field">
              <option value="ozuna">Ozuna</option>
              <option value="catarro">Catarro</option>
              <option value="joselito">Joselito</option>
              <option value="otilio">Otilio</option>
              <option value="veronica">Verónica</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="tipo">Tipo de transacción:</label>
            <select id="tipo" v-model="nuevaTransaccion.tipo" class="input-field">
              <option value="deposito">Depósito</option>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="monto">Monto:</label>
            <input 
              type="number" 
              id="monto" 
              v-model="nuevaTransaccion.monto" 
              placeholder="Monto en pesos" 
              class="input-field">
          </div>
          
          <div class="form-group">
            <label for="descripcion">Descripción:</label>
            <textarea 
              id="descripcion" 
              v-model="nuevaTransaccion.descripcion" 
              placeholder="Detalles de la transacción" 
              class="input-field textarea"></textarea>
          </div>
          
          <div class="buttons-container">
            <button 
              @click="guardarTransaccion" 
              class="btn-guardar" 
              :disabled="!esFormularioValido">
              Guardar
            </button>
            <button 
              @click="cancelarFormulario" 
              class="btn-cancelar">
              Cancelar
            </button>
          </div>
        </div>
        
        <div v-if="!mostrarFormulario && !mostrarVistaLista" class="transacciones-agrupadas">
          <div class="clientes-con-transacciones">
            <!-- Otilio -->
            <div v-if="clientesAgrupados.otilio && clientesAgrupados.otilio.length > 0" class="cliente-card cliente-card-otilio">
              <button
                type="button"
                class="cliente-header cliente-otilio"
                :aria-expanded="esAcordeonClienteAbierto('otilio') ? 'true' : 'false'"
                @click="toggleAcordeonCliente('otilio')"
              >
                <div class="cliente-titulo">
                  <h4>Otilio</h4>
                  <span
                    v-if="tieneEfectivoPendiente('otilio')"
                    class="badge-efectivo-pendiente"
                    :title="`Efectivo pendiente: ${contarEfectivoPendiente('otilio')}`"
                  >
                    {{ contarEfectivoPendiente('otilio') }}
                  </span>
                </div>
                <div class="cliente-total">
                  Total: ${{ formatearNumero(calcularTotalCliente('otilio')) }}
                </div>
                <span class="cliente-header-chevron" aria-hidden="true">▾</span>
              </button>
              <div v-show="esAcordeonClienteAbierto('otilio')">
                <div class="cliente-contador">
                  {{ clientesAgrupados.otilio.length }} transacción(es)
                </div>
                <div class="cliente-transacciones">
                <div 
                  v-for="(transaccion, index) in clientesAgrupados.otilio" 
                  :key="'otilio-'+index" 
                  class="transaccion-mini"
                  :class="['tipo-' + transaccion.tipo, { 'es-stash': transaccion.esStash }]"
                >
                  <div class="transaccion-mini-header">
                    <span>
                      <template v-if="transaccion.esStash">
                        {{ transaccion.descripcion }}
                        <span class="badge-stash">📦</span>
                      </template>
                      <template v-else>
                        {{ obtenerTipoTexto(transaccion.tipo) }}
                      </template>
                    </span>
                    <span>${{ formatearNumero(transaccion.monto) }}</span>
                  </div>
                  <div class="transaccion-mini-hora">{{ formatearHora(transaccion.timestamp) }}</div>
                  <div class="transaccion-mini-acciones">
                    <label
                      v-if="transaccion.tipo === 'efectivo'"
                      class="entregado-toggle"
                    >
                      <input
                        type="checkbox"
                        :checked="!!transaccion.efectivoEntregado"
                        @change="actualizarEfectivoEntregado(transaccion, $event.target.checked)"
                      />
                      Entregado
                    </label>
                    <button v-if="!transaccion.esStash" @click="editarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini">Editar</button>
                    <button v-if="!transaccion.esStash" @click="eliminarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini btn-mini-eliminar">Eliminar</button>
                    <span v-if="transaccion.esStash" class="texto-info-stash">Ver en Stash</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
            
            <!-- Joselito -->
            <div v-if="clientesAgrupados.joselito && clientesAgrupados.joselito.length > 0" class="cliente-card cliente-card-joselito">
              <button
                type="button"
                class="cliente-header cliente-joselito"
                :aria-expanded="esAcordeonClienteAbierto('joselito') ? 'true' : 'false'"
                @click="toggleAcordeonCliente('joselito')"
              >
                <div class="cliente-titulo">
                  <h4>Joselito</h4>
                  <span
                    v-if="tieneEfectivoPendiente('joselito')"
                    class="badge-efectivo-pendiente"
                    :title="`Efectivo pendiente: ${contarEfectivoPendiente('joselito')}`"
                  >
                    {{ contarEfectivoPendiente('joselito') }}
                  </span>
                </div>
                <div class="cliente-total">
                  Total: ${{ formatearNumero(calcularTotalCliente('joselito')) }}
                </div>
                <span class="cliente-header-chevron" aria-hidden="true">▾</span>
              </button>
              <div v-show="esAcordeonClienteAbierto('joselito')">
                <div class="cliente-contador">
                  {{ clientesAgrupados.joselito.length }} transacción(es)
                </div>
                <div class="cliente-transacciones">
                <div 
                  v-for="(transaccion, index) in clientesAgrupados.joselito" 
                  :key="'joselito-'+index" 
                  class="transaccion-mini"
                  :class="['tipo-' + transaccion.tipo, { 'es-stash': transaccion.esStash }]"
                >
                  <div class="transaccion-mini-header">
                    <span>
                      <template v-if="transaccion.esStash">
                        {{ transaccion.descripcion }}
                        <span class="badge-stash">📦</span>
                      </template>
                      <template v-else>
                        {{ obtenerTipoTexto(transaccion.tipo) }}
                      </template>
                    </span>
                    <span>${{ formatearNumero(transaccion.monto) }}</span>
                  </div>
                  <div class="transaccion-mini-hora">{{ formatearHora(transaccion.timestamp) }}</div>
                  <div class="transaccion-mini-acciones">
                    <label
                      v-if="transaccion.tipo === 'efectivo'"
                      class="entregado-toggle"
                    >
                      <input
                        type="checkbox"
                        :checked="!!transaccion.efectivoEntregado"
                        @change="actualizarEfectivoEntregado(transaccion, $event.target.checked)"
                      />
                      Entregado
                    </label>
                    <button v-if="!transaccion.esStash" @click="editarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini">Editar</button>
                    <button v-if="!transaccion.esStash" @click="eliminarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini btn-mini-eliminar">Eliminar</button>
                    <span v-if="transaccion.esStash" class="texto-info-stash">Ver en Stash</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
            
            <!-- Catarro -->
            <div v-if="clientesAgrupados.catarro && clientesAgrupados.catarro.length > 0" class="cliente-card cliente-card-catarro">
              <button
                type="button"
                class="cliente-header cliente-catarro"
                :aria-expanded="esAcordeonClienteAbierto('catarro') ? 'true' : 'false'"
                @click="toggleAcordeonCliente('catarro')"
              >
                <div class="cliente-titulo">
                  <h4>Catarro</h4>
                  <span
                    v-if="tieneEfectivoPendiente('catarro')"
                    class="badge-efectivo-pendiente"
                    :title="`Efectivo pendiente: ${contarEfectivoPendiente('catarro')}`"
                  >
                    {{ contarEfectivoPendiente('catarro') }}
                  </span>
                </div>
                <div class="cliente-total">
                  Total: ${{ formatearNumero(calcularTotalCliente('catarro')) }}
                </div>
                <span class="cliente-header-chevron" aria-hidden="true">▾</span>
              </button>
              <div v-show="esAcordeonClienteAbierto('catarro')">
                <div class="cliente-contador">
                  {{ clientesAgrupados.catarro.length }} transacción(es)
                </div>
                <div class="cliente-transacciones">
                <div 
                  v-for="(transaccion, index) in clientesAgrupados.catarro" 
                  :key="'catarro-'+index" 
                  class="transaccion-mini"
                  :class="['tipo-' + transaccion.tipo, { 'es-stash': transaccion.esStash }]"
                >
                  <div class="transaccion-mini-header">
                    <span>
                      <template v-if="transaccion.esStash">
                        {{ transaccion.descripcion }}
                        <span class="badge-stash">📦</span>
                      </template>
                      <template v-else>
                        {{ obtenerTipoTexto(transaccion.tipo) }}
                      </template>
                    </span>
                    <span>${{ formatearNumero(transaccion.monto) }}</span>
                  </div>
                  <div class="transaccion-mini-hora">{{ formatearHora(transaccion.timestamp) }}</div>
                  <div class="transaccion-mini-acciones">
                    <label
                      v-if="transaccion.tipo === 'efectivo'"
                      class="entregado-toggle"
                    >
                      <input
                        type="checkbox"
                        :checked="!!transaccion.efectivoEntregado"
                        @change="actualizarEfectivoEntregado(transaccion, $event.target.checked)"
                      />
                      Entregado
                    </label>
                    <button v-if="!transaccion.esStash" @click="editarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini">Editar</button>
                    <button v-if="!transaccion.esStash" @click="eliminarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini btn-mini-eliminar">Eliminar</button>
                    <span v-if="transaccion.esStash" class="texto-info-stash">Ver en Stash</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
            
            <!-- Ozuna -->
            <div v-if="clientesAgrupados.ozuna && clientesAgrupados.ozuna.length > 0" class="cliente-card cliente-card-ozuna">
              <button
                type="button"
                class="cliente-header cliente-ozuna"
                :aria-expanded="esAcordeonClienteAbierto('ozuna') ? 'true' : 'false'"
                @click="toggleAcordeonCliente('ozuna')"
              >
                <div class="cliente-titulo">
                  <h4>Ozuna</h4>
                  <span
                    v-if="tieneEfectivoPendiente('ozuna')"
                    class="badge-efectivo-pendiente"
                    :title="`Efectivo pendiente: ${contarEfectivoPendiente('ozuna')}`"
                  >
                    {{ contarEfectivoPendiente('ozuna') }}
                  </span>
                </div>
                <div class="cliente-total">
                  Total: ${{ formatearNumero(calcularTotalCliente('ozuna')) }}
                </div>
                <span class="cliente-header-chevron" aria-hidden="true">▾</span>
              </button>
              <div v-show="esAcordeonClienteAbierto('ozuna')">
                <div class="cliente-contador">
                  {{ clientesAgrupados.ozuna.length }} transacción(es)
                </div>
                <div class="cliente-transacciones">
                <div 
                  v-for="(transaccion, index) in clientesAgrupados.ozuna" 
                  :key="'ozuna-'+index" 
                  class="transaccion-mini"
                  :class="['tipo-' + transaccion.tipo, { 'es-stash': transaccion.esStash }]"
                >
                  <div class="transaccion-mini-header">
                    <span>
                      <template v-if="transaccion.esStash">
                        {{ transaccion.descripcion }}
                        <span class="badge-stash">📦</span>
                      </template>
                      <template v-else>
                        {{ obtenerTipoTexto(transaccion.tipo) }}
                      </template>
                    </span>
                    <span>${{ formatearNumero(transaccion.monto) }}</span>
                  </div>
                  <div class="transaccion-mini-hora">{{ formatearHora(transaccion.timestamp) }}</div>
                  <div class="transaccion-mini-acciones">
                    <label
                      v-if="transaccion.tipo === 'efectivo'"
                      class="entregado-toggle"
                    >
                      <input
                        type="checkbox"
                        :checked="!!transaccion.efectivoEntregado"
                        @change="actualizarEfectivoEntregado(transaccion, $event.target.checked)"
                      />
                      Entregado
                    </label>
                    <button v-if="!transaccion.esStash" @click="editarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini">Editar</button>
                    <button v-if="!transaccion.esStash" @click="eliminarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini btn-mini-eliminar">Eliminar</button>
                    <span v-if="transaccion.esStash" class="texto-info-stash">Ver en Stash</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
            
            <!-- Verónica -->
            <div v-if="clientesAgrupados.veronica && clientesAgrupados.veronica.length > 0" class="cliente-card cliente-card-veronica">
              <button
                type="button"
                class="cliente-header cliente-veronica"
                :aria-expanded="esAcordeonClienteAbierto('veronica') ? 'true' : 'false'"
                @click="toggleAcordeonCliente('veronica')"
              >
                <div class="cliente-titulo">
                  <h4>Verónica</h4>
                  <span
                    v-if="tieneEfectivoPendiente('veronica')"
                    class="badge-efectivo-pendiente"
                    :title="`Efectivo pendiente: ${contarEfectivoPendiente('veronica')}`"
                  >
                    {{ contarEfectivoPendiente('veronica') }}
                  </span>
                </div>
                <div class="cliente-total">
                  Total: ${{ formatearNumero(calcularTotalCliente('veronica')) }}
                </div>
                <span class="cliente-header-chevron" aria-hidden="true">▾</span>
              </button>
              <div v-show="esAcordeonClienteAbierto('veronica')">
                <div class="cliente-contador">
                  {{ clientesAgrupados.veronica.length }} transacción(es)
                </div>
                <div class="cliente-transacciones">
                <div 
                  v-for="(transaccion, index) in clientesAgrupados.veronica" 
                  :key="'veronica-'+index" 
                  class="transaccion-mini"
                  :class="['tipo-' + transaccion.tipo, { 'es-stash': transaccion.esStash }]"
                >
                  <div class="transaccion-mini-header">
                    <span>
                      <template v-if="transaccion.esStash">
                        {{ transaccion.descripcion }}
                        <span class="badge-stash">📦</span>
                      </template>
                      <template v-else>
                        {{ obtenerTipoTexto(transaccion.tipo) }}
                      </template>
                    </span>
                    <span>${{ formatearNumero(transaccion.monto) }}</span>
                  </div>
                  <div class="transaccion-mini-hora">{{ formatearHora(transaccion.timestamp) }}</div>
                  <div class="transaccion-mini-acciones">
                    <label
                      v-if="transaccion.tipo === 'efectivo'"
                      class="entregado-toggle"
                    >
                      <input
                        type="checkbox"
                        :checked="!!transaccion.efectivoEntregado"
                        @change="actualizarEfectivoEntregado(transaccion, $event.target.checked)"
                      />
                      Entregado
                    </label>
                    <button v-if="!transaccion.esStash" @click="editarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini">Editar</button>
                    <button v-if="!transaccion.esStash" @click="eliminarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini btn-mini-eliminar">Eliminar</button>
                    <span v-if="transaccion.esStash" class="texto-info-stash">Ver en Stash</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
          
        </div>
        
        <div v-if="transaccionesDia.length > 0 && mostrarVistaLista && !mostrarFormulario" class="lista-transacciones">
          <div 
            v-for="(transaccion, index) in transaccionesDia" 
            :key="index" 
            class="transaccion-item"
            :class="['tipo-' + transaccion.tipo, { 'es-stash': transaccion.esStash }]"
          >
            <div class="transaccion-header">
              <div class="transaccion-tipo">
                <template v-if="transaccion.esStash">
                  {{ transaccion.descripcion }}
                  <span class="badge-stash">📦</span>
                </template>
                <template v-else>
                  {{ obtenerTipoTexto(transaccion.tipo) }}
                </template>
              </div>
              <div class="transaccion-monto">${{ formatearNumero(transaccion.monto) }}</div>
            </div>
            <div class="transaccion-cliente">Cliente: {{ obtenerClienteTexto(transaccion.cliente) }}</div>
            <div v-if="!transaccion.esStash" class="transaccion-descripcion">{{ transaccion.descripcion }}</div>
            <div class="transaccion-hora">{{ formatearHora(transaccion.timestamp) }}</div>
            <div class="transaccion-acciones">
              <label
                v-if="transaccion.tipo === 'efectivo'"
                class="entregado-toggle"
              >
                <input
                  type="checkbox"
                  :checked="!!transaccion.efectivoEntregado"
                  @change="actualizarEfectivoEntregado(transaccion, $event.target.checked)"
                />
                Entregado
              </label>
              <button v-if="!transaccion.esStash" @click="editarTransaccion(index)" class="btn-editar">Editar</button>
              <button v-if="!transaccion.esStash" @click="eliminarTransaccion(index)" class="btn-eliminar">Eliminar</button>
              <span v-if="transaccion.esStash" class="texto-info-stash">Esta transacción proviene del Stash y debe gestionarse desde allí</span>
            </div>
          </div>
          
        </div>
        </div>
        <div v-else class="sin-transacciones">
          Selecciona un día para ver las transacciones.
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, deleteDoc, updateDoc, orderBy, limit } from 'firebase/firestore';
import PdfResumenDiaButton from './PdfResumenDiaButton.vue';

export default {
  name: 'TransaccionesAgendaModal',
  components: {
    PdfResumenDiaButton
  },
  props: {
    mostrar: {
      type: Boolean,
      required: true
    },
    cliente: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      mesActual: new Date().getMonth(),
      anioActual: new Date().getFullYear(),
      diasSemana: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
      meses: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
      diaSeleccionado: null,
      mostrarFormulario: false,
      mostrarVistaLista: false,
      clientesAcordeonAbiertos: [],
      transacciones: [],
      nuevaTransaccion: {
        tipo: 'deposito',
        monto: '',
        descripcion: '',
        timestamp: null,
        cliente: ''
      },
      editandoIndex: -1
    }
  },
  computed: {
    nombreMes() {
      return this.meses[this.mesActual];
    },
    diasCalendario() {
      const dias = [];
      const primerDiaMes = new Date(this.anioActual, this.mesActual, 1);
      const ultimoDiaMes = new Date(this.anioActual, this.mesActual + 1, 0);
      const hoy = new Date();
      
      // Días del mes anterior para completar la primera semana
      const diaSemana = primerDiaMes.getDay();
      if (diaSemana > 0) {
        const ultimoDiaMesAnterior = new Date(this.anioActual, this.mesActual, 0);
        for (let i = diaSemana - 1; i >= 0; i--) {
          const dia = ultimoDiaMesAnterior.getDate() - i;
          const fecha = new Date(this.anioActual, this.mesActual - 1, dia);
          dias.push({
            numero: dia,
            fecha: fecha,
            esMesActual: false,
            esHoy: this.esMismaFecha(fecha, hoy)
          });
        }
      }
      
      // Días del mes actual
      for (let dia = 1; dia <= ultimoDiaMes.getDate(); dia++) {
        const fecha = new Date(this.anioActual, this.mesActual, dia);
        dias.push({
          numero: dia,
          fecha: fecha,
          esMesActual: true,
          esHoy: this.esMismaFecha(fecha, hoy)
        });
      }
      
      // Días del mes siguiente para completar la última semana
      const diasFaltantes = 42 - dias.length; // 6 semanas completas en el calendario
      for (let dia = 1; dia <= diasFaltantes; dia++) {
        const fecha = new Date(this.anioActual, this.mesActual + 1, dia);
        dias.push({
          numero: dia,
          fecha: fecha,
          esMesActual: false,
          esHoy: this.esMismaFecha(fecha, hoy)
        });
      }
      
      return dias;
    },
    transaccionesDia() {
      if (!this.diaSeleccionado) return [];

      const diaISO = this.toISODateLocal(this.diaSeleccionado.fecha);

      return this.transacciones.filter(t => {
        // Preferir el campo 'fecha' (YYYY-MM-DD) para evitar desfases por zona horaria
        if (t.fecha) {
          const fechaT = typeof t.fecha === 'string' ? t.fecha : this.toISODateLocal(this.parseFechaSeguro(t.fecha));
          return fechaT === diaISO;
        }
        const ts = this.parseFechaSeguro(t.timestamp);
        return ts ? this.toISODateLocal(ts) === diaISO : false;
      });
    },
    montoEfectivoDia() {
      if (!this.diaSeleccionado) return 0;
      return this.transaccionesDia
        .filter(t => t.tipo === 'efectivo')
        .reduce((total, t) => total + (parseFloat(t.monto) || 0), 0);
    },
    montoCuentasDia() {
      if (!this.diaSeleccionado) return 0;
      // Cuentas = total del día - efectivo
      const totalDia = this.transaccionesDia.reduce((total, t) => total + (parseFloat(t.monto) || 0), 0);
      return Math.max(0, totalDia - this.montoEfectivoDia);
    },
    formatoFechaCompleta() {
      if (!this.diaSeleccionado) return '';
      
      const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      return this.diaSeleccionado.fecha.toLocaleDateString('es-ES', opciones);
    },
    esFormularioValido() {
      return this.nuevaTransaccion.tipo && 
             this.nuevaTransaccion.monto > 0 &&
             this.nuevaTransaccion.cliente;
    },
    clientesAgrupados() {
      if (!this.diaSeleccionado) return {};
      
      const agrupados = {
        otilio: [],
        joselito: [],
        catarro: [],
        ozuna: [],
        veronica: [],
        mexico: []
      };
      
      this.transaccionesDia.forEach(transaccion => {
        if (transaccion.cliente && agrupados[transaccion.cliente]) {
          agrupados[transaccion.cliente].push(transaccion);
        }
      });
      
      return agrupados;
    }
  },
  methods: {
    toggleAcordeonCliente(clienteKey) {
      const abiertos = new Set(this.clientesAcordeonAbiertos);
      if (abiertos.has(clienteKey)) {
        abiertos.delete(clienteKey);
      } else {
        abiertos.add(clienteKey);
      }
      this.clientesAcordeonAbiertos = Array.from(abiertos);
    },
    esAcordeonClienteAbierto(clienteKey) {
      return this.clientesAcordeonAbiertos.includes(clienteKey);
    },
    contarEfectivoPendiente(clienteKey) {
      const lista = this.clientesAgrupados?.[clienteKey] || [];
      return lista.filter(t => t.tipo === 'efectivo' && !t.efectivoEntregado).length;
    },
    tieneEfectivoPendiente(clienteKey) {
      return this.contarEfectivoPendiente(clienteKey) > 0;
    },
    // --- Helpers de fecha (evitan desfases UTC y parseos ambiguos) ---
    toISODateLocal(date) {
      if (!(date instanceof Date)) return '';
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    },
    parseFechaSeguro(valor) {
      if (!valor) return null;

      // Firestore Timestamp
      if (typeof valor === 'object' && typeof valor.toDate === 'function') {
        const d = valor.toDate();
        return d instanceof Date && !isNaN(d) ? d : null;
      }

      if (valor instanceof Date) {
        return !isNaN(valor) ? valor : null;
      }

      // Epoch
      if (typeof valor === 'number') {
        const d = new Date(valor);
        return !isNaN(d) ? d : null;
      }

      if (typeof valor !== 'string') return null;

      const s = valor.trim();

      // YYYY-MM-DD (interpretarlo como fecha LOCAL para evitar UTC midnight shift)
      const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (mIso) {
        const y = Number(mIso[1]);
        const mo = Number(mIso[2]);
        const da = Number(mIso[3]);
        return new Date(y, mo - 1, da, 12, 0, 0); // mediodía local reduce edge cases
      }

      // DD/MM/YYYY (muy común en MX)
      const mLatam = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (mLatam) {
        const da = Number(mLatam[1]);
        const mo = Number(mLatam[2]);
        const y = Number(mLatam[3]);
        return new Date(y, mo - 1, da, 12, 0, 0);
      }

      // ISO con hora (YYYY-MM-DDTHH:mm...)
      const d = new Date(s);
      return !isNaN(d) ? d : null;
    },
    cambiarMes(delta) {
      let nuevoMes = this.mesActual + delta;
      
      if (nuevoMes > 11) {
        this.mesActual = 0;
        this.anioActual++;
      } else if (nuevoMes < 0) {
        this.mesActual = 11;
        this.anioActual--;
      } else {
        this.mesActual = nuevoMes;
      }
      
      this.cargarTransacciones();
    },
    seleccionarDia(dia) {
      this.diaSeleccionado = dia;
      this.mostrarFormulario = false;
    },
    esMismaFecha(fecha1, fecha2) {
      return fecha1.getDate() === fecha2.getDate() &&
             fecha1.getMonth() === fecha2.getMonth() &&
             fecha1.getFullYear() === fecha2.getFullYear();
    },
    esDiaSeleccionado(fecha) {
      if (!this.diaSeleccionado) return false;
      return this.esMismaFecha(fecha, this.diaSeleccionado.fecha);
    },
    tieneRegistros(fecha) {
      const diaISO = this.toISODateLocal(fecha);
      return this.transacciones.some(t => {
        if (t.fecha) {
          const fechaT = typeof t.fecha === 'string' ? t.fecha : this.toISODateLocal(this.parseFechaSeguro(t.fecha));
          return fechaT === diaISO;
        }
        const ts = this.parseFechaSeguro(t.timestamp);
        return ts ? this.toISODateLocal(ts) === diaISO : false;
      });
    },
    obtenerClientesConTransacciones(fecha) {
      const diaISO = this.toISODateLocal(fecha);
      const clientesSet = new Set();
      
      this.transacciones.forEach(t => {
        let coincide = false;
        if (t.fecha) {
          const fechaT = typeof t.fecha === 'string' ? t.fecha : this.toISODateLocal(this.parseFechaSeguro(t.fecha));
          coincide = fechaT === diaISO;
        } else {
          const ts = this.parseFechaSeguro(t.timestamp);
          coincide = ts ? this.toISODateLocal(ts) === diaISO : false;
        }
        
        if (coincide && t.cliente) {
          clientesSet.add(t.cliente);
        }
      });
      
      // Ordenar clientes en un orden específico para consistencia visual
      const ordenClientes = ['otilio', 'joselito', 'catarro', 'ozuna', 'veronica', 'mexico'];
      return ordenClientes.filter(c => clientesSet.has(c));
    },
    formatearNumero(num) {
      return num.toLocaleString('es-MX', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    },
    formatearHora(timestamp) {
      const fecha = new Date(timestamp);
      return fecha.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
      });
    },
    obtenerTipoTexto(tipo) {
      const tipos = {
        deposito: 'Depósito',
        transferencia: 'Transferencia',
        efectivo: 'Efectivo',
        otro: 'Otro'
      };
      return tipos[tipo] || 'Otro';
    },
    obtenerClienteTexto(cliente) {
      const clientes = {
        mexico: 'México',
        ozuna: 'Ozuna',
        catarro: 'Catarro',
        joselito: 'Joselito',
        otilio: 'Otilio',
        veronica: 'Verónica'
      };
      return clientes[cliente] || cliente;
    },
    cancelarFormulario() {
      this.mostrarFormulario = false;
      this.nuevaTransaccion = {
        tipo: 'deposito',
        monto: '',
        descripcion: '',
        timestamp: null,
        cliente: ''
      };
      this.editandoIndex = -1;
    },
    async guardarTransaccion() {
      if (!this.esFormularioValido) return;
      
      try {
        const transaccionActual = this.editandoIndex >= 0 ? this.transaccionesDia[this.editandoIndex] : null;
        const transaccionData = {
          ...this.nuevaTransaccion,
          monto: parseFloat(this.nuevaTransaccion.monto),
          timestamp: this.nuevaTransaccion.timestamp || new Date().toISOString(),
          fecha: this.diaSeleccionado.fecha.toISOString().split('T')[0],
          // Solo aplica para tipo efectivo (se usa para marcar si ya fue entregado)
          efectivoEntregado: this.nuevaTransaccion.tipo === 'efectivo'
            ? (transaccionActual?.efectivoEntregado ?? false)
            : false
        };
        
        if (this.editandoIndex >= 0) {
          // Actualizar transacción existente
          const transaccionId = this.transaccionesDia[this.editandoIndex].id;
          const transaccionRef = doc(db, 'transacciones', transaccionId);
          await updateDoc(transaccionRef, transaccionData);
          
          // Actualizar el arreglo local
          this.transacciones = this.transacciones.map(t => 
            t.id === transaccionId ? { ...transaccionData, id: transaccionId } : t
          );
        } else {
          // Crear nueva transacción
          const docRef = await addDoc(collection(db, 'transacciones'), transaccionData);
          this.transacciones.push({ ...transaccionData, id: docRef.id });
        }
        
        this.cancelarFormulario();
      } catch (error) {
        console.error('Error al guardar la transacción:', error);
        alert('Ocurrió un error al guardar la transacción. Por favor intenta de nuevo.');
      }
    },
    editarTransaccion(index) {
      const transaccion = this.transaccionesDia[index];
      
      // No permitir editar transacciones del stash desde aquí
      if (transaccion.esStash) {
        alert('Las transacciones del Stash deben editarse desde el modal de Stash.');
        return;
      }
      
      this.nuevaTransaccion = {
        tipo: transaccion.tipo,
        monto: transaccion.monto,
        descripcion: transaccion.descripcion,
        timestamp: transaccion.timestamp,
        cliente: transaccion.cliente || this.cliente
      };
      this.editandoIndex = index;
      this.mostrarFormulario = true;
    },
    async eliminarTransaccion(index) {
      const transaccion = this.transaccionesDia[index];
      
      // No permitir eliminar transacciones del stash desde aquí
      if (transaccion.esStash) {
        alert('Las transacciones del Stash deben eliminarse desde el modal de Stash.');
        return;
      }
      
      if (confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
        try {
          const transaccionId = transaccion.id;
          await deleteDoc(doc(db, 'transacciones', transaccionId));
          
          // Actualizar el arreglo local
          this.transacciones = this.transacciones.filter(t => t.id !== transaccionId);
        } catch (error) {
          console.error('Error al eliminar la transacción:', error);
          alert('Ocurrió un error al eliminar la transacción. Por favor intenta de nuevo.');
        }
      }
    },
    async cargarTransacciones() {
      try {
        // Obtener el primer y último día del mes actual para filtrar
        const primerDiaMes = new Date(this.anioActual, this.mesActual, 1);
        const ultimoDiaMes = new Date(this.anioActual, this.mesActual + 1, 0);
        
        // Importante: no usar toISOString() (UTC) porque puede mover el día
        const primerDiaStr = this.toISODateLocal(primerDiaMes);
        const ultimoDiaStr = this.toISODateLocal(ultimoDiaMes);
        
        // Cargar transacciones regulares
        const q = query(
          collection(db, 'transacciones'),
          where('fecha', '>=', primerDiaStr),
          where('fecha', '<=', ultimoDiaStr)
        );
        
        const querySnapshot = await getDocs(q);
        this.transacciones = [];
        
        querySnapshot.forEach((doc) => {
          this.transacciones.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Cargar transacciones del stash (stash_<cliente>) para que se vean en la agenda del día
        // y guardar índice de entregas por si se requiere en el historial.
        this._stashEntregadoIndex = await this.cargarTransaccionesStashPorClientes(primerDiaStr, ultimoDiaStr);

        // Mantener historial de abonos aplicados del stash (Verónica + Joselito + compatibilidad México)
        const clientesHistorial = ['veronica', 'joselito'];
        if (this.cliente === 'mexico') {
          clientesHistorial.push('mexico');
        }
        await Promise.all(
          clientesHistorial.map((clienteKey) =>
            this.cargarTransaccionesHistorialStashCliente(clienteKey, primerDiaStr, ultimoDiaStr, this._stashEntregadoIndex)
          )
        );
      } catch (error) {
        console.error('Error al cargar las transacciones:', error);
      }
    },
    async cargarTransaccionesStashPorClientes(primerDiaStr, ultimoDiaStr) {
      const clientes = ['otilio', 'joselito', 'catarro', 'ozuna', 'veronica', 'mexico'];
      const results = await Promise.all(
        clientes.map(clienteKey => this.cargarTransaccionesStashCliente(clienteKey, primerDiaStr, ultimoDiaStr))
      );
      return results.reduce((acc, item) => Object.assign(acc, item || {}), {});
    },
    async cargarTransaccionesStashCliente(clienteKey, primerDiaStr, ultimoDiaStr) {
      try {
        const entregadoIndex = {};
        const qStash = query(
          collection(db, `stash_${clienteKey}`),
          where('fecha', '>=', primerDiaStr),
          where('fecha', '<=', ultimoDiaStr)
        );

        const stashSnapshot = await getDocs(qStash);

        stashSnapshot.forEach((doc) => {
          const stashData = doc.data() || {};
          const fechaBase = stashData.fechaCreacion || stashData.fecha || new Date().toISOString();
          const fechaDate = this.parseFechaSeguro(fechaBase);
          const fechaISO = fechaDate ? this.toISODateLocal(fechaDate) : stashData.fecha;
          const esEfectivo = !!stashData.esEfectivo;
          const stashDocId = doc.id;

          this.transacciones.push({
            id: `stash_${clienteKey}_${doc.id}`,
            cliente: clienteKey,
            tipo: esEfectivo ? 'efectivo' : 'deposito',
            monto: stashData.monto || 0,
            descripcion: `Stash: ${stashData.descripcion || 'Sin descripción'}`,
            timestamp: fechaDate ? fechaDate.toISOString() : fechaBase,
            fecha: fechaISO || stashData.fecha,
            esStash: true,
            stashEsEfectivo: esEfectivo,
            stashDocId,
            efectivoEntregado: !!stashData.efectivoEntregado
          });

          entregadoIndex[`${clienteKey}:${stashDocId}`] = {
            efectivoEntregado: !!stashData.efectivoEntregado
          };
        });

        return entregadoIndex;
      } catch (error) {
        console.error(`Error al cargar transacciones del stash de ${clienteKey}:`, error);
        return {};
      }
    },
    async cargarTransaccionesHistorialStashCliente(clienteKey, primerDiaStr, ultimoDiaStr, stashEntregadoIndex = {}) {
      // Los abonos aplicados del stash se guardan en cuentas<Cliente> dentro del array "abonos" de cada cuenta.
      // Usamos la fecha original del stash (fechaOriginalStash) para ubicarlos en el calendario.
      try {
        const collectionName = `cuentas${clienteKey.charAt(0).toUpperCase()}${clienteKey.slice(1)}`;
        const qCuentas = query(collection(db, collectionName), orderBy('fecha', 'desc'), limit(100));
        
        const snapshot = await getDocs(qCuentas);
        
        const grupos = new Map();

        const limpiarDescripcion = (descripcion) => {
          if (!descripcion) return 'Abono aplicado';
          return String(descripcion).replace(/\s*\(Aplicación Individual\)\s*$/i, '').trim();
        };

        snapshot.forEach((docSnap) => {
          const cuentaData = docSnap.data();
          const cuentaId = docSnap.id;
          const abonos = cuentaData.abonos || [];
          
          abonos.forEach((abono, idx) => {
            // Prioridad de fecha: fechaOriginalStash > fecha > fechaAplicacion
            // fechaOriginalStash es la fecha REAL en que se registró el abono en el stash
            const fechaBase = abono.fechaOriginalStash || abono.fecha || abono.fechaAplicacion;
            if (!fechaBase) return;
            
            const fechaDate = this.parseFechaSeguro(fechaBase);
            if (!fechaDate) return;
            
            const fechaISO = this.toISODateLocal(fechaDate);
            
            // Filtrar por rango del mes
            if (fechaISO < primerDiaStr || fechaISO > ultimoDiaStr) return;

            const stashItemId = abono.stashItemId || null;
            const tipo = abono.esEfectivo ? 'efectivo' : 'deposito';
            const descripcionLimpia = limpiarDescripcion(abono.descripcion || 'Abono aplicado');
            const groupKey = stashItemId
              ? `stashItem:${stashItemId}`
              : `fallback:${fechaISO}:${tipo}:${descripcionLimpia}`;

            if (!grupos.has(groupKey)) {
              const entregado = stashItemId
                ? (stashEntregadoIndex?.[`${clienteKey}:${stashItemId}`]?.efectivoEntregado ?? false)
                : false;

              grupos.set(groupKey, {
                id: stashItemId ? `stash_hist_${clienteKey}_${stashItemId}` : `stash_hist_${clienteKey}_${fechaISO}_${idx}`,
                cliente: clienteKey,
                tipo,
                monto: 0,
                descripcion: descripcionLimpia,
                timestamp: fechaDate.toISOString(),
                fecha: fechaISO,
                esStash: true,
                origenHistorial: true,
                stashDocId: stashItemId || null,
                efectivoEntregado: !!entregado,
                cuentaIds: new Set()
              });
            }

            const grupo = grupos.get(groupKey);
            grupo.monto += (parseFloat(abono.monto) || 0);
            grupo.cuentaIds.add(cuentaId);
          });
        });

        // Emitir transacciones agrupadas (una por stashItemId / fallback)
        grupos.forEach((t) => {
          // Evitar duplicados por id
          if (this.transacciones.some(x => x.id === t.id)) return;
          this.transacciones.push({
            id: t.id,
            cliente: t.cliente,
            tipo: t.tipo,
            monto: t.monto,
            descripcion: t.descripcion,
            timestamp: t.timestamp,
            fecha: t.fecha,
            esStash: true,
            origenHistorial: true,
            stashDocId: t.stashDocId,
            efectivoEntregado: t.efectivoEntregado,
            cuentaIds: Array.from(t.cuentaIds)
          });
        });
      } catch (error) {
        console.error('Error al cargar abonos de cuentas Verónica:', error);
      }
    },
    calcularTotalCliente(cliente) {
      if (!this.clientesAgrupados[cliente]) return 0;
      
      return this.clientesAgrupados[cliente].reduce((total, transaccion) => {
        return total + (parseFloat(transaccion.monto) || 0);
      }, 0);
    },
    calcularTotalPorTipo(cliente, tipo) {
      if (!this.clientesAgrupados[cliente]) return 0;
      
      return this.clientesAgrupados[cliente]
        .filter(t => t.tipo === tipo)
        .reduce((total, transaccion) => {
          return total + (parseFloat(transaccion.monto) || 0);
        }, 0);
    },
    obtenerIndiceTransaccion(transaccion) {
      return this.transaccionesDia.findIndex(t => t.id === transaccion.id);
    },
    async actualizarEfectivoEntregado(transaccion, entregado) {
      if (!transaccion || !transaccion.id) return;

      try {
        if (transaccion.esStash) {
          // Persistir en stash_<cliente>
          if (!transaccion.cliente || !transaccion.stashDocId) return;
          const stashRef = doc(db, `stash_${transaccion.cliente}`, transaccion.stashDocId);
          await updateDoc(stashRef, { efectivoEntregado: !!entregado });
        } else {
          const transaccionRef = doc(db, 'transacciones', transaccion.id);
          await updateDoc(transaccionRef, { efectivoEntregado: !!entregado });
        }

        // Actualizar estado local
        this.transacciones = this.transacciones.map(t =>
          t.id === transaccion.id ? { ...t, efectivoEntregado: !!entregado } : t
        );
      } catch (error) {
        console.error('Error al actualizar el estado de entrega:', error);
        alert('No se pudo actualizar el estado de entrega. Intenta de nuevo.');
      }
    },
    calcularTotalDia() {
      return this.transaccionesDia.reduce((total, transaccion) => {
        return total + (parseFloat(transaccion.monto) || 0);
      }, 0);
    },
    calcularTotalDiaPorTipo(tipo) {
      return this.transaccionesDia
        .filter(t => t.tipo === tipo)
        .reduce((total, transaccion) => {
          return total + (parseFloat(transaccion.monto) || 0);
        }, 0);
    }
  },
  watch: {
    mostrar(newVal) {
      if (newVal) {
        this.mesActual = new Date().getMonth();
        this.anioActual = new Date().getFullYear();
        this.diaSeleccionado = {
          fecha: new Date(),
          numero: new Date().getDate(),
          esMesActual: true,
          esHoy: true
        };
        this.cargarTransacciones();
      }
    },
    cliente(newVal) {
      if (this.mostrar) {
        this.nuevaTransaccion.cliente = newVal;
        this.cargarTransacciones();
      }
    }
  },
  created() {
    this.nuevaTransaccion.cliente = this.cliente;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-agenda {
  background-color: white;
  border-radius: 10px;
  width: 96vw;
  max-width: 1400px;
  height: 94vh;
  max-height: 94vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.modal-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.modal-header {
  padding: 15px 20px;
  background-color: #3760b0;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5em;
}

.btn-cerrar {
  background: none;
  border: none;
  color: white;
  font-size: 1.8em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
}

.btn-cerrar:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.calendario-container {
  padding: 15px;
  border-right: 1px solid #ddd;
  flex: 1 1 50%;
  overflow-y: auto;
  min-width: 360px;
}

.selector-fecha {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.mes-anio {
  font-size: 1.3em;
  font-weight: bold;
  color: #2c3e50;
}

.btn-nav {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: bold;
}

.btn-nav:hover {
  background-color: #e0e0e0;
}

.dias-semana {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 5px;
}

.dia-nombre {
  padding: 5px;
  font-weight: bold;
  color: #555;
}

.calendario {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-template-rows: repeat(6, 1fr);
  gap: 5px;
}

.dia-celda {
  position: relative;
  border: 1px solid #ddd;
  border-radius: 5px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.dia-celda:hover {
  background-color: #f0f0f0;
}

.otro-mes {
  color: #aaa;
  background-color: #f9f9f9;
}

.dia-actual {
  border: 2px solid #3498db;
  color: #3498db;
  font-weight: bold;
}

.seleccionado {
  background-color: #3760b0;
  color: white;
  font-weight: bold;
}

.seleccionado .indicador-registros {
  background-color: white;
}

.tiene-registros .indicador-registros {
  position: absolute;
  bottom: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #3760b0;
}

.indicadores-clientes {
  position: absolute;
  bottom: 3px;
  display: flex;
  gap: 2px;
  justify-content: center;
  flex-wrap: wrap;
  max-width: 90%;
}

.indicador-cliente {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.indicador-otilio {
  background-color: #FFD700;
}

.indicador-joselito {
  background-color: #3498db;
}

.indicador-catarro {
  background-color: #e74c3c;
}

.indicador-ozuna {
  background-color: #27ae60;
}

.indicador-veronica {
  background-color: #e67e22;
}

.indicador-mexico {
  background-color: #3760b0;
}

.seleccionado .indicador-cliente {
  box-shadow: 0 0 0 1px white;
}

.transacciones-container {
  flex: 1 1 50%;
  min-width: 0;
  padding: 15px;
  overflow-y: auto;
}

.dia-seleccionado-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.acciones-dia {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.dia-seleccionado-header h4 {
  margin: 0;
  font-size: 1.2em;
  color: #2c3e50;
  text-transform: capitalize;
}

.btn-agregar {
  background-color: #07711e;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
}

.btn-agregar:hover {
  background-color: #06601a;
}

.sin-transacciones {
  text-align: center;
  padding: 20px;
  color: #777;
  font-style: italic;
}

.formulario-transaccion {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 15px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.input-field {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.input-field:focus {
  border-color: #3760b0;
  box-shadow: 0 0 0 2px rgba(55, 96, 176, 0.2);
  outline: none;
  transition: all 0.3s ease;
}

.textarea {
  min-height: 80px;
  resize: vertical;
}

.buttons-container {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-guardar,
.btn-cancelar,
.btn-editar,
.btn-eliminar {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s ease;
}

.btn-guardar {
  background-color: #3498db;
  color: white;
}

.btn-guardar:disabled {
  background-color: #95a5a6;
  cursor: not-allowed;
}

.btn-guardar:hover {
  background-color: #2980b9;
}

.btn-cancelar {
  background-color: #95a5a6;
  color: white;
}

.btn-cancelar:hover {
  background-color: #7f8c8d;
}

.btn-editar {
  background-color: #f39c12;
  color: white;
}

.btn-editar:hover {
  background-color: #e68a00;
}

.btn-eliminar {
  background-color: #e74c3c;
  color: white;
}

.btn-eliminar:hover {
  background-color: #c0392b;
}

.lista-transacciones {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.transaccion-item {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
  border-left: 5px solid #ddd;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.transaccion-item.es-stash {
  background-color: #fff8e1;
  border-left-color: #ff9800;
}

.tipo-deposito {
  border-left-color: #27ae60;
}

.tipo-transferencia {
  border-left-color: #3498db;
}

.tipo-efectivo {
  border-left-color: #f39c12;
}

.tipo-otro {
  border-left-color: #95a5a6;
}

.transaccion-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.transaccion-tipo {
  font-weight: bold;
  color: #2c3e50;
}

.transaccion-monto {
  font-weight: bold;
  color: #27ae60;
}

.transaccion-cliente {
  font-weight: bold;
  color: #3760b0;
  margin-bottom: 5px;
}

.transaccion-descripcion {
  color: #555;
  margin-bottom: 10px;
  font-size: 0.95em;
}

.transaccion-hora {
  font-size: 0.85em;
  color: #777;
  margin-bottom: 10px;
}

.transaccion-acciones {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.transacciones-agrupadas {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.clientes-con-transacciones {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 15px;
  width: 100%;
}

.fila-clientes {
  display: flex;
  gap: 15px;
  width: 100%;
}

.cliente-card {
  flex: 1;
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  min-width: 0;
  transition: all 0.3s ease;
  border: 1px solid #eee;
}

.cliente-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.cliente-card-joselito {
  border-left: 4px solid #3498db;
}

.cliente-card-catarro {
  border-left: 4px solid #e74c3c;
}

.cliente-card-otilio {
  border-left: 4px solid #f39c12;
}

.cliente-card-ozuna {
  border-left: 4px solid #27ae60;
}

.cliente-card-veronica {
  border-left: 4px solid #e67e22;
}

.cliente-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ddd;
}

.cliente-header {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.cliente-header:focus-visible {
  outline: 2px solid rgba(55, 96, 176, 0.45);
  outline-offset: 3px;
  border-radius: 6px;
}

.cliente-header-chevron {
  margin-left: 10px;
  font-size: 1.1em;
  line-height: 1;
  opacity: 0.75;
  transition: transform 0.2s ease;
}

.cliente-header[aria-expanded="true"] .cliente-header-chevron {
  transform: rotate(180deg);
}

.cliente-titulo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.badge-efectivo-pendiente {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background-color: #e74c3c;
  color: white;
  font-size: 0.75em;
  font-weight: 700;
  line-height: 1;
}

.cliente-header h4 {
  margin: 0;
  color: #3760b0;
  font-size: 1.1em;
}

.cliente-total {
  font-weight: bold;
  color: #27ae60;
}

.cliente-transacciones {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 250px;
  overflow-y: auto;
}

.transaccion-mini {
  background-color: white;
  border-radius: 6px;
  padding: 8px;
  border-left: 4px solid #ddd;
  font-size: 0.9em;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.transaccion-mini:hover {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transform: translateX(2px);
}

.transaccion-mini-header {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  margin-bottom: 5px;
}

.transaccion-mini-header span:first-child {
  font-size: 0.9em;
}

.transaccion-mini-header span:last-child {
  font-weight: bold;
}

.transaccion-mini.tipo-deposito .transaccion-mini-header span:last-child {
  color: #27ae60;
}

.transaccion-mini.tipo-transferencia .transaccion-mini-header span:last-child {
  color: #3498db;
}

.transaccion-mini.tipo-efectivo .transaccion-mini-header span:last-child {
  color: #f39c12;
}

.transaccion-mini.tipo-otro .transaccion-mini-header span:last-child {
  color: #95a5a6;
}

.cliente-contador {
  font-size: 0.8em;
  color: #777;
  text-align: right;
  margin-bottom: 5px;
}

.cliente-vacio {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
}

.btn-agregar-mini {
  background-color: #07711e;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 0.9em;
  cursor: pointer;
}

.btn-agregar-mini.cliente-joselito {
  background-color: #3498db;
}

.btn-agregar-mini.cliente-catarro {
  background-color: #e74c3c;
}

.btn-agregar-mini.cliente-otilio {
  background-color: #f39c12;
  color: #333;
}

.btn-agregar-mini.cliente-ozuna {
  background-color: #27ae60;
}

.btn-agregar-mini.cliente-veronica {
  background-color: #e67e22;
}

.btn-agregar-mini:hover {
  opacity: 0.9;
}

.sin-datos {
  color: #95a5a6;
  font-style: italic;
}

.resumen-dia {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background: linear-gradient(to right, #f5f9ff, #e6f0ff);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border-radius: 8px;
  padding: 10px 15px;
  margin-bottom: 15px;
  border: 1px solid #d1e1ff;
}

.resumen-dia:hover {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

.resumen-dia-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px 10px;
  background-color: white;
  border-radius: 6px;
  min-width: 100px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.resumen-dia-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

.resumen-dia-item span:first-child {
  font-size: 0.8em;
  color: #555;
}

.resumen-dia-item > span:last-child {
  font-weight: bold;
  color: #3760b0;
  font-size: 1.1em;
}

.resumen-dia-metric {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  font-weight: 400;
}

.resumen-dia-item > .resumen-dia-metric {
  font-weight: 400;
}

.resumen-dia-num {
  font-weight: 800;
  color: #3760b0;
  font-size: 1.1em;
}

.resumen-dia-extra {
  font-size: 0.8em;
  font-weight: 600;
  color: #2c3e50;
  background: rgba(55, 96, 176, 0.08);
  border: 1px solid rgba(55, 96, 176, 0.18);
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.cliente-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ddd;
}

.cliente-joselito {
  border-bottom: 2px solid #3498db;
  background-color: rgba(52, 152, 219, 0.1);
  padding: 8px;
  border-radius: 6px 6px 0 0;
}

.cliente-joselito h4 {
  color: #3498db;
}

.cliente-catarro {
  border-bottom: 2px solid #e74c3c;
  background-color: rgba(231, 76, 60, 0.1);
  padding: 8px;
  border-radius: 6px 6px 0 0;
}

.cliente-catarro h4 {
  color: #e74c3c;
}

.cliente-otilio {
  border-bottom: 2px solid #f39c12;
  background-color: rgba(243, 156, 18, 0.1);
  padding: 8px;
  border-radius: 6px 6px 0 0;
}

.cliente-otilio h4 {
  color: #f39c12;
}

.cliente-ozuna {
  border-bottom: 2px solid #27ae60;
  background-color: rgba(39, 174, 96, 0.1);
  padding: 8px;
  border-radius: 6px 6px 0 0;
}

.cliente-ozuna h4 {
  color: #27ae60;
}

.cliente-veronica {
  border-bottom: 2px solid #e67e22;
  background-color: rgba(230, 126, 34, 0.1);
  padding: 8px;
  border-radius: 6px 6px 0 0;
}

.cliente-veronica h4 {
  color: #e67e22;
}

.transaccion-cliente {
  font-weight: bold;
  margin-bottom: 5px;
}

.transaccion-cliente.cliente-joselito {
  color: #3498db;
  background-color: transparent;
  border: none;
  padding: 0;
  border-radius: 0;
}

.transaccion-cliente.cliente-catarro {
  color: #e74c3c;
  background-color: transparent;
  border: none;
  padding: 0;
  border-radius: 0;
}

.transaccion-cliente.cliente-otilio {
  color: #f39c12;
  background-color: transparent;
  border: none;
  padding: 0;
  border-radius: 0;
}

.transaccion-cliente.cliente-veronica {
  color: #e67e22;
  background-color: transparent;
  border: none;
  padding: 0;
  border-radius: 0;
}

.cliente-vacio button.btn-agregar-mini.cliente-joselito {
  background-color: #3498db;
}

.cliente-vacio button.btn-agregar-mini.cliente-catarro {
  background-color: #e74c3c;
}

.cliente-vacio button.btn-agregar-mini.cliente-otilio {
  background-color: #f39c12;
}

.cliente-vacio button.btn-agregar-mini.cliente-ozuna {
  background-color: #27ae60;
}

.cliente-vacio button.btn-agregar-mini.cliente-veronica {
  background-color: #e67e22;
}

@media (max-width: 768px) {
  .modal-agenda {
    width: 95%;
    max-height: 95vh;
  }

  .modal-body {
    flex-direction: column;
  }
  
  .calendario-container {
    flex: 0 0 auto;
    min-width: 0;
    border-right: none;
    border-bottom: 1px solid #ddd;
  }
  
  .dia-celda {
    height: 35px;
  }
  
  .transaccion-header {
    flex-direction: column;
  }
  
  .dia-seleccionado-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .acciones-dia {
    width: 100%;
    justify-content: flex-start;
  }

  .acciones-dia .btn-agregar {
    width: 100%;
    text-align: center;
  }
  
  .transaccion-acciones {
    flex-direction: column;
    gap: 5px;
  }
  
  .btn-editar,
  .btn-eliminar {
    width: 100%;
    text-align: center;
  }
  
  .fila-clientes {
    flex-direction: column;
  }
  
  .clientes-con-transacciones {
    grid-template-columns: 1fr;
  }
  
  .cliente-card {
    margin-bottom: 10px;
  }
  
  .resumen-dia {
    flex-direction: column;
    padding: 10px;
  }
  
  .resumen-dia-item {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
  }
}

/* Colores para las transacciones según tipo */
.transaccion-mini.tipo-deposito {
  border-left-color: #27ae60;
}

.transaccion-mini.tipo-transferencia {
  border-left-color: #3498db;
}

.transaccion-mini.tipo-efectivo {
  border-left-color: #f39c12;
}

.transaccion-mini.tipo-otro {
  border-left-color: #95a5a6;
}

.transaccion-mini-hora {
  font-size: 0.8em;
  color: #777;
  margin-bottom: 5px;
}

.transaccion-mini-acciones {
  display: flex;
  justify-content: flex-end;
  gap: 5px;
}

.entregado-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8em;
  color: #2c3e50;
  background: rgba(7, 113, 30, 0.08);
  border: 1px solid rgba(7, 113, 30, 0.22);
  padding: 3px 8px;
  border-radius: 999px;
  margin-right: 6px;
  user-select: none;
}

.entregado-toggle input {
  width: 14px;
  height: 14px;
  accent-color: #07711e;
}

.btn-mini {
  padding: 3px 6px;
  font-size: 0.8em;
  border: none;
  border-radius: 3px;
  background-color: #f39c12;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-mini:hover {
  transform: scale(1.05);
}

.btn-mini-eliminar {
  background-color: #e74c3c;
}

/* Estilos para transacciones del stash */
.transaccion-mini.es-stash {
  background-color: #fff8e1;
  border-left-color: #ff9800;
}

.badge-stash {
  display: inline-block;
  background-color: #ff9800;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75em;
  margin-left: 5px;
  font-weight: bold;
}

.texto-info-stash {
  font-size: 0.75em;
  color: #ff9800;
  font-style: italic;
}

.transaccion-cliente.cliente-ozuna {
  color: #27ae60;
  background-color: transparent;
  border: none;
  padding: 0;
  border-radius: 0;
}

/* Estilos para el resumen del día */
.resumen-dia {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background: linear-gradient(to right, #f5f9ff, #e6f0ff);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border-radius: 8px;
  padding: 10px 15px;
  margin-bottom: 15px;
  border: 1px solid #d1e1ff;
}

.resumen-dia:hover {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

.resumen-dia-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px 10px;
  background-color: white;
  border-radius: 6px;
  min-width: 100px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.resumen-dia-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

/* Mejoras para los colores de cliente */
.cliente-card-joselito .cliente-total {
  color: #3498db;
}

.cliente-card-catarro .cliente-total {
  color: #e74c3c;
}

.cliente-card-otilio .cliente-total {
  color: #f39c12;
}

.cliente-card-ozuna .cliente-total {
  color: #27ae60;
}

.cliente-card-veronica .cliente-total {
  color: #e67e22;
}

/* Mejoras para las transacciones mini */
.transaccion-mini {
  background-color: white;
  border-radius: 6px;
  padding: 8px;
  border-left: 4px solid #ddd;
  font-size: 0.9em;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.transaccion-mini:hover {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transform: translateX(2px);
}

.transaccion-mini-header span:first-child {
  font-size: 0.9em;
}

.transaccion-mini-header span:last-child {
  font-weight: bold;
}

.transaccion-mini.tipo-deposito .transaccion-mini-header span:last-child {
  color: #27ae60;
}

.transaccion-mini.tipo-transferencia .transaccion-mini-header span:last-child {
  color: #3498db;
}

.transaccion-mini.tipo-efectivo .transaccion-mini-header span:last-child {
  color: #f39c12;
}

.transaccion-mini.tipo-otro .transaccion-mini-header span:last-child {
  color: #95a5a6;
}

/* Mejoras para el calendario */
.dia-celda.tiene-registros.seleccionado .indicador-registros {
  background-color: white;
  width: 8px;
  height: 8px;
}

.dia-celda.tiene-registros .indicador-registros {
  position: absolute;
  bottom: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #3760b0;
  transition: all 0.2s ease;
}

.dia-celda:hover .indicador-registros {
  transform: scale(1.2);
}

.dia-celda.seleccionado {
  transform: scale(1.05);
  font-weight: bold;
  transition: all 0.2s ease;
}

/* Mejoras para el formulario */
.input-field:focus {
  border-color: #3760b0;
  box-shadow: 0 0 0 2px rgba(55, 96, 176, 0.2);
  outline: none;
  transition: all 0.3s ease;
}

.btn-guardar, .btn-cancelar {
  transition: all 0.2s ease;
}

.btn-guardar:hover {
  background-color: #2980b9;
}

.btn-cancelar:hover {
  background-color: #7f8c8d;
}
</style>