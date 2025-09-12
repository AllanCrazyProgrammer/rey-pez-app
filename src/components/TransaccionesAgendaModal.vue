<template>
  <div v-if="mostrar" class="modal-overlay">
    <div class="modal-agenda">
      <div class="modal-header">
        <h3>Agenda de Transacciones</h3>
        <button @click="$emit('cerrar')" class="btn-cerrar">×</button>
      </div>
      
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
            <div v-if="tieneRegistros(dia.fecha)" class="indicador-registros"></div>
          </div>
        </div>
      </div>
      
      <div class="transacciones-container" v-if="diaSeleccionado">
        <div class="dia-seleccionado-header">
          <h4>{{ formatoFechaCompleta }}</h4>
          <button @click="mostrarFormulario = true" class="btn-agregar">+ Agregar transacción</button>
        </div>
        
        <div v-if="transaccionesDia.length > 0 && !mostrarFormulario" class="resumen-dia">
          <div class="resumen-dia-item">
            <span>Total del día:</span>
            <span>${{ formatearNumero(calcularTotalDia()) }}</span>
          </div>
          <div class="resumen-dia-item">
            <span>Depósitos:</span>
            <span class="color-deposito">${{ formatearNumero(calcularTotalDiaPorTipo('deposito')) }}</span>
          </div>
          <div class="resumen-dia-item">
            <span>Transferencias:</span>
            <span class="color-transferencia">${{ formatearNumero(calcularTotalDiaPorTipo('transferencia')) }}</span>
          </div>
          <div class="resumen-dia-item">
            <span>Transacciones:</span>
            <span>{{ transaccionesDia.length }}</span>
          </div>
        </div>
        
        <div v-if="transaccionesDia.length === 0 && !mostrarFormulario" class="sin-transacciones">
          No hay transacciones registradas para este día.
        </div>
        
        <div v-if="mostrarFormulario" class="formulario-transaccion">
          <div class="form-group">
            <label for="cliente">Cliente:</label>
            <select id="cliente" v-model="nuevaTransaccion.cliente" class="input-field">
              <option value="mexico">México</option>
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
          <div class="fila-clientes">
            <div class="cliente-card cliente-card-otilio">
              <div class="cliente-header cliente-otilio">
                <h4>Otilio</h4>
                <div class="cliente-total" v-if="clientesAgrupados.otilio && clientesAgrupados.otilio.length > 0">
                  Total: ${{ formatearNumero(calcularTotalCliente('otilio')) }}
                </div>
                <div class="cliente-total sin-datos" v-else>Sin transacciones</div>
              </div>
              <div class="cliente-resumen" v-if="clientesAgrupados.otilio && clientesAgrupados.otilio.length > 0">
                <div class="resumen-item tipo-deposito">
                  <span>Depósitos:</span>
                  <span>${{ formatearNumero(calcularTotalPorTipo('otilio', 'deposito')) }}</span>
                </div>
                <div class="resumen-item tipo-transferencia">
                  <span>Transferencias:</span>
                  <span>${{ formatearNumero(calcularTotalPorTipo('otilio', 'transferencia')) }}</span>
                </div>
              </div>
              <div class="cliente-contador" v-if="clientesAgrupados.otilio && clientesAgrupados.otilio.length > 0">
                {{ clientesAgrupados.otilio.length }} transacción(es)
              </div>
              <div class="cliente-transacciones" v-if="clientesAgrupados.otilio && clientesAgrupados.otilio.length > 0">
                <div 
                  v-for="(transaccion, index) in clientesAgrupados.otilio" 
                  :key="'otilio-'+index" 
                  class="transaccion-mini"
                  :class="'tipo-' + transaccion.tipo"
                >
                  <div class="transaccion-mini-header">
                    <span>{{ obtenerTipoTexto(transaccion.tipo) }}</span>
                    <span>${{ formatearNumero(transaccion.monto) }}</span>
                  </div>
                  <div class="transaccion-mini-hora">{{ formatearHora(transaccion.timestamp) }}</div>
                  <div class="transaccion-mini-acciones">
                    <button @click="editarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini">Editar</button>
                    <button @click="eliminarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini btn-mini-eliminar">Eliminar</button>
                  </div>
                </div>
              </div>
              <div class="cliente-vacio" v-else>
                <button @click="nuevaTransaccion.cliente = 'otilio'; mostrarFormulario = true" class="btn-agregar-mini cliente-otilio">
                  + Agregar transacción para Otilio
                </button>
              </div>
            </div>
            
            <div class="cliente-card cliente-card-joselito">
              <div class="cliente-header cliente-joselito">
                <h4>Joselito</h4>
                <div class="cliente-total" v-if="clientesAgrupados.joselito && clientesAgrupados.joselito.length > 0">
                  Total: ${{ formatearNumero(calcularTotalCliente('joselito')) }}
                </div>
                <div class="cliente-total sin-datos" v-else>Sin transacciones</div>
              </div>
              <div class="cliente-resumen" v-if="clientesAgrupados.joselito && clientesAgrupados.joselito.length > 0">
                <div class="resumen-item tipo-deposito">
                  <span>Depósitos:</span>
                  <span>${{ formatearNumero(calcularTotalPorTipo('joselito', 'deposito')) }}</span>
                </div>
                <div class="resumen-item tipo-transferencia">
                  <span>Transferencias:</span>
                  <span>${{ formatearNumero(calcularTotalPorTipo('joselito', 'transferencia')) }}</span>
                </div>
              </div>
              <div class="cliente-contador" v-if="clientesAgrupados.joselito && clientesAgrupados.joselito.length > 0">
                {{ clientesAgrupados.joselito.length }} transacción(es)
              </div>
              <div class="cliente-transacciones" v-if="clientesAgrupados.joselito && clientesAgrupados.joselito.length > 0">
                <div 
                  v-for="(transaccion, index) in clientesAgrupados.joselito" 
                  :key="'joselito-'+index" 
                  class="transaccion-mini"
                  :class="'tipo-' + transaccion.tipo"
                >
                  <div class="transaccion-mini-header">
                    <span>{{ obtenerTipoTexto(transaccion.tipo) }}</span>
                    <span>${{ formatearNumero(transaccion.monto) }}</span>
                  </div>
                  <div class="transaccion-mini-hora">{{ formatearHora(transaccion.timestamp) }}</div>
                  <div class="transaccion-mini-acciones">
                    <button @click="editarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini">Editar</button>
                    <button @click="eliminarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini btn-mini-eliminar">Eliminar</button>
                  </div>
                </div>
              </div>
              <div class="cliente-vacio" v-else>
                <button @click="nuevaTransaccion.cliente = 'joselito'; mostrarFormulario = true" class="btn-agregar-mini cliente-joselito">
                  + Agregar transacción para Joselito
                </button>
              </div>
            </div>
          </div>
          
          <div class="fila-clientes">
            <div class="cliente-card cliente-card-catarro">
              <div class="cliente-header cliente-catarro">
                <h4>Catarro</h4>
                <div class="cliente-total" v-if="clientesAgrupados.catarro && clientesAgrupados.catarro.length > 0">
                  Total: ${{ formatearNumero(calcularTotalCliente('catarro')) }}
                </div>
                <div class="cliente-total sin-datos" v-else>Sin transacciones</div>
              </div>
              <div class="cliente-resumen" v-if="clientesAgrupados.catarro && clientesAgrupados.catarro.length > 0">
                <div class="resumen-item tipo-deposito">
                  <span>Depósitos:</span>
                  <span>${{ formatearNumero(calcularTotalPorTipo('catarro', 'deposito')) }}</span>
                </div>
                <div class="resumen-item tipo-transferencia">
                  <span>Transferencias:</span>
                  <span>${{ formatearNumero(calcularTotalPorTipo('catarro', 'transferencia')) }}</span>
                </div>
              </div>
              <div class="cliente-contador" v-if="clientesAgrupados.catarro && clientesAgrupados.catarro.length > 0">
                {{ clientesAgrupados.catarro.length }} transacción(es)
              </div>
              <div class="cliente-transacciones" v-if="clientesAgrupados.catarro && clientesAgrupados.catarro.length > 0">
                <div 
                  v-for="(transaccion, index) in clientesAgrupados.catarro" 
                  :key="'catarro-'+index" 
                  class="transaccion-mini"
                  :class="'tipo-' + transaccion.tipo"
                >
                  <div class="transaccion-mini-header">
                    <span>{{ obtenerTipoTexto(transaccion.tipo) }}</span>
                    <span>${{ formatearNumero(transaccion.monto) }}</span>
                  </div>
                  <div class="transaccion-mini-hora">{{ formatearHora(transaccion.timestamp) }}</div>
                  <div class="transaccion-mini-acciones">
                    <button @click="editarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini">Editar</button>
                    <button @click="eliminarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini btn-mini-eliminar">Eliminar</button>
                  </div>
                </div>
              </div>
              <div class="cliente-vacio" v-else>
                <button @click="nuevaTransaccion.cliente = 'catarro'; mostrarFormulario = true" class="btn-agregar-mini cliente-catarro">
                  + Agregar transacción para Catarro
                </button>
              </div>
            </div>
            
            <div class="cliente-card cliente-card-ozuna">
              <div class="cliente-header cliente-ozuna">
                <h4>Ozuna</h4>
                <div class="cliente-total" v-if="clientesAgrupados.ozuna && clientesAgrupados.ozuna.length > 0">
                  Total: ${{ formatearNumero(calcularTotalCliente('ozuna')) }}
                </div>
                <div class="cliente-total sin-datos" v-else>Sin transacciones</div>
              </div>
              <div class="cliente-resumen" v-if="clientesAgrupados.ozuna && clientesAgrupados.ozuna.length > 0">
                <div class="resumen-item tipo-deposito">
                  <span>Depósitos:</span>
                  <span>${{ formatearNumero(calcularTotalPorTipo('ozuna', 'deposito')) }}</span>
                </div>
                <div class="resumen-item tipo-transferencia">
                  <span>Transferencias:</span>
                  <span>${{ formatearNumero(calcularTotalPorTipo('ozuna', 'transferencia')) }}</span>
                </div>
              </div>
              <div class="cliente-contador" v-if="clientesAgrupados.ozuna && clientesAgrupados.ozuna.length > 0">
                {{ clientesAgrupados.ozuna.length }} transacción(es)
              </div>
              <div class="cliente-transacciones" v-if="clientesAgrupados.ozuna && clientesAgrupados.ozuna.length > 0">
                <div 
                  v-for="(transaccion, index) in clientesAgrupados.ozuna" 
                  :key="'ozuna-'+index" 
                  class="transaccion-mini"
                  :class="'tipo-' + transaccion.tipo"
                >
                  <div class="transaccion-mini-header">
                    <span>{{ obtenerTipoTexto(transaccion.tipo) }}</span>
                    <span>${{ formatearNumero(transaccion.monto) }}</span>
                  </div>
                  <div class="transaccion-mini-hora">{{ formatearHora(transaccion.timestamp) }}</div>
                  <div class="transaccion-mini-acciones">
                    <button @click="editarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini">Editar</button>
                    <button @click="eliminarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini btn-mini-eliminar">Eliminar</button>
                  </div>
                </div>
              </div>
              <div class="cliente-vacio" v-else>
                <button @click="nuevaTransaccion.cliente = 'ozuna'; mostrarFormulario = true" class="btn-agregar-mini cliente-ozuna">
                  + Agregar transacción para Ozuna
                </button>
              </div>
            </div>
            
            <div class="cliente-card cliente-card-veronica">
              <div class="cliente-header cliente-veronica">
                <h4>Verónica</h4>
                <div class="cliente-total" v-if="clientesAgrupados.veronica && clientesAgrupados.veronica.length > 0">
                  Total: ${{ formatearNumero(calcularTotalCliente('veronica')) }}
                </div>
                <div class="cliente-total sin-datos" v-else>Sin transacciones</div>
              </div>
              <div class="cliente-resumen" v-if="clientesAgrupados.veronica && clientesAgrupados.veronica.length > 0">
                <div class="resumen-item tipo-deposito">
                  <span>Depósitos:</span>
                  <span>${{ formatearNumero(calcularTotalPorTipo('veronica', 'deposito')) }}</span>
                </div>
                <div class="resumen-item tipo-transferencia">
                  <span>Transferencias:</span>
                  <span>${{ formatearNumero(calcularTotalPorTipo('veronica', 'transferencia')) }}</span>
                </div>
              </div>
              <div class="cliente-contador" v-if="clientesAgrupados.veronica && clientesAgrupados.veronica.length > 0">
                {{ clientesAgrupados.veronica.length }} transacción(es)
              </div>
              <div class="cliente-transacciones" v-if="clientesAgrupados.veronica && clientesAgrupados.veronica.length > 0">
                <div 
                  v-for="(transaccion, index) in clientesAgrupados.veronica" 
                  :key="'veronica-'+index" 
                  class="transaccion-mini"
                  :class="'tipo-' + transaccion.tipo"
                >
                  <div class="transaccion-mini-header">
                    <span>{{ obtenerTipoTexto(transaccion.tipo) }}</span>
                    <span>${{ formatearNumero(transaccion.monto) }}</span>
                  </div>
                  <div class="transaccion-mini-hora">{{ formatearHora(transaccion.timestamp) }}</div>
                  <div class="transaccion-mini-acciones">
                    <button @click="editarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini">Editar</button>
                    <button @click="eliminarTransaccion(obtenerIndiceTransaccion(transaccion))" class="btn-mini btn-mini-eliminar">Eliminar</button>
                  </div>
                </div>
              </div>
              <div class="cliente-vacio" v-else>
                <button @click="nuevaTransaccion.cliente = 'veronica'; mostrarFormulario = true" class="btn-agregar-mini cliente-veronica">
                  + Agregar transacción para Verónica
                </button>
              </div>
            </div>
          </div>
          
          <div class="cambiar-vista">
            <button @click="mostrarVistaLista = !mostrarVistaLista" class="btn-cambiar-vista">
              Ver lista completa
            </button>
          </div>
        </div>
        
        <div v-if="transaccionesDia.length > 0 && mostrarVistaLista && !mostrarFormulario" class="lista-transacciones">
          <div 
            v-for="(transaccion, index) in transaccionesDia" 
            :key="index" 
            class="transaccion-item"
            :class="'tipo-' + transaccion.tipo"
          >
            <div class="transaccion-header">
              <div class="transaccion-tipo">{{ obtenerTipoTexto(transaccion.tipo) }}</div>
              <div class="transaccion-monto">${{ formatearNumero(transaccion.monto) }}</div>
            </div>
            <div class="transaccion-cliente">Cliente: {{ obtenerClienteTexto(transaccion.cliente) }}</div>
            <div class="transaccion-descripcion">{{ transaccion.descripcion }}</div>
            <div class="transaccion-hora">{{ formatearHora(transaccion.timestamp) }}</div>
            <div class="transaccion-acciones">
              <button @click="editarTransaccion(index)" class="btn-editar">Editar</button>
              <button @click="eliminarTransaccion(index)" class="btn-eliminar">Eliminar</button>
            </div>
          </div>
          
          <div class="cambiar-vista">
            <button @click="mostrarVistaLista = !mostrarVistaLista" class="btn-cambiar-vista">
              Ver agrupado por cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';

export default {
  name: 'TransaccionesAgendaModal',
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
      
      return this.transacciones.filter(t => 
        this.esMismaFecha(new Date(t.timestamp), this.diaSeleccionado.fecha)
      );
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
      return this.transacciones.some(t => 
        this.esMismaFecha(new Date(t.timestamp), fecha)
      );
    },
    formatearNumero(num) {
      return num.toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
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
        const transaccionData = {
          ...this.nuevaTransaccion,
          monto: parseFloat(this.nuevaTransaccion.monto),
          timestamp: this.nuevaTransaccion.timestamp || new Date().toISOString(),
          fecha: this.diaSeleccionado.fecha.toISOString().split('T')[0]
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
      if (confirm('¿Estás seguro de que deseas eliminar esta transacción?')) {
        try {
          const transaccionId = this.transaccionesDia[index].id;
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
        
        const primerDiaStr = primerDiaMes.toISOString().split('T')[0];
        const ultimoDiaStr = ultimoDiaMes.toISOString().split('T')[0];
        
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
      } catch (error) {
        console.error('Error al cargar las transacciones:', error);
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
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
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
  border-bottom: 1px solid #ddd;
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

.transacciones-container {
  flex: 1;
  padding: 15px;
  overflow-y: auto;
  max-height: 400px;
}

.dia-seleccionado-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
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

.cliente-header h4 {
  margin: 0;
  color: #3760b0;
  font-size: 1.1em;
}

.cliente-total {
  font-weight: bold;
  color: #27ae60;
}

.cliente-resumen {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 5px 0;
  border-bottom: 1px dashed #ddd;
}

.resumen-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px 10px;
  background-color: white;
  border-radius: 4px;
  font-size: 0.85em;
  transition: all 0.2s ease;
}

.resumen-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1);
}

.resumen-item.tipo-deposito span:last-child {
  color: #27ae60;
  font-weight: bold;
}

.resumen-item.tipo-transferencia span:last-child {
  color: #3498db;
  font-weight: bold;
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

.resumen-dia-item span:last-child {
  font-weight: bold;
  color: #3760b0;
  font-size: 1.1em;
}

.resumen-dia-item span.color-deposito {
  color: #27ae60;
}

.resumen-dia-item span.color-transferencia {
  color: #3498db;
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
  
  .cliente-card {
    margin-bottom: 10px;
  }
  
  .cliente-resumen {
    flex-wrap: wrap;
    gap: 5px;
  }
  
  .resumen-item {
    flex: 1;
    min-width: 100px;
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

.cambiar-vista {
  display: flex;
  justify-content: center;
  margin-top: 15px;
}

.btn-cambiar-vista {
  background-color: #3760b0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 15px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cambiar-vista:hover {
  background-color: #2c4d8e;
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