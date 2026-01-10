<template>
  <div class="sacadas-container" v-if="isLoaded">
    <div class="back-button-container">
      <BackButton to="/sacadas" />
      <button v-if="tienePedidoOrigen" @click="regresarAlPedido" class="btn-regresar-pedido">Regresar al Pedido</button>
    </div>
    <h2 class="date-header">{{ formattedDate }}</h2>
    <div class="date-selector">
      <input type="date" v-model="selectedDate" @change="updateCurrentDate">
    </div>
    <div class="sacadas-content">
      <div class="salidas-section">
        <h3>Salidas</h3>
        <div class="input-group">
          <select v-model="newSalida.tipo" required @change="resetSalidaSelections">
            <option value="">Tipo</option>
            <option value="proveedor">Proveedor</option>
            <option value="maquila">Maquila</option>
          </select>
          <select v-model="newSalida.proveedor" required>
            <option value="">{{ newSalida.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}</option>
            <option v-for="prov in filteredProveedoresSalida" :key="prov.id" :value="prov.nombre">
              {{ prov.nombre }}
            </option>
          </select>
          <select v-model="newSalida.medida" required>
            <option value="">Medida</option>
            <option v-for="medida in filteredMedidasSalida" :key="medida.id" :value="medida.nombre">
              {{ medida.nombre }}
            </option>
          </select>
          <select v-model="newSalida.cuartoFrio">
            <option value="Todos los cuartos">Cuarto frío (opcional)</option>
            <option v-for="cuarto in cuartosDisponiblesSalida" :key="cuarto" :value="cuarto">
              {{ cuarto }}
            </option>
          </select>
          <input 
            v-model.number="newSalida.kilos" 
            type="number" 
            inputmode="decimal" 
            step="0.1" 
            pattern="[0-9]*" 
            placeholder="Kilos" 
            required 
          />
          <button @click="addSalida" :disabled="!isSalidaValid || newSalida.kilos > kilosDisponibles">Agregar Salida</button>
          <button @click="limpiarSeleccionSalida" class="clear-button" v-if="newSalida.proveedor">🗑️ Limpiar</button>
          <button @click="refrescarMedidasManual" class="refresh-button" v-if="newSalida.proveedor && newSalida.tipo === 'proveedor'">🔄 Refrescar</button>
        </div>
        <p v-if="kilosDisponibles !== null" class="kilos-disponibles">
          Kilos disponibles: <span :class="{ 'low-stock': kilosDisponibles < 100 }">{{ formatNumber(kilosDisponibles) }} kg</span>
        </p>
        <ul class="list">
          <li v-for="(salida, index) in salidas" :key="'salida-' + index">
            <span>
              {{ salida.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}: {{ salida.proveedor }} - {{ salida.medida }}{{ salida.precio ? ` ($${salida.precio})` : '' }}: {{ formatNumber(salida.kilos) }} kg
              <template v-if="salida.cuartoFrio"> - Cuarto: {{ salida.cuartoFrio }}</template>
            </span>
            <div class="action-buttons">
              <button @click="removeSalida(index)" class="delete-btn">&times;</button>
            </div>
          </li>
        </ul>
        <p class="total">Total Salidas: {{ formatNumber(totalSalidas) }} kg</p>
      </div>
      
      <div class="entradas-section">
        <h3>Entradas</h3>
        <div class="input-group">
          <select v-model="newEntrada.tipo" required @change="resetEntradaSelections">
            <option value="">Tipo</option>
            <option value="proveedor">Proveedor</option>
            <option value="maquila">Maquila</option>
          </select>
          <select v-model="newEntrada.proveedor" required>
            <option value="">{{ newEntrada.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}</option>
            <option v-for="prov in filteredProveedoresEntrada" :key="prov.id" :value="prov.nombre">
              {{ prov.nombre }}
            </option>
          </select>
          <select v-model="newEntrada.medida" required>
            <option value="">Medida</option>
            <option v-for="medida in filteredMedidasEntrada" :key="medida.id" :value="medida.nombre">
              {{ medida.nombre }}
            </option>
          </select>
          <select v-model="newEntrada.cuartoFrio">
            <option value="">Cuarto frío (opcional)</option>
            <option value="Cuarto 1">Cuarto 1</option>
            <option value="Cuarto 2">Cuarto 2</option>
            <option value="Cuarto 3">Cuarto 3</option>
            <option value="Cuarto 4">Cuarto 4</option>
            <option value="Cuarto 5">Cuarto 5</option>
          </select>
          <input 
            v-model.number="newEntrada.kilos" 
            type="number" 
            inputmode="decimal" 
            step="0.1" 
            pattern="[0-9]*" 
            placeholder="Kilos" 
            required 
          />
          <input 
            v-model.number="newEntrada.precio" 
            type="number" 
            inputmode="decimal" 
            step="0.01" 
            pattern="[0-9]*" 
            placeholder="Precio (opcional)" 
          />
          <button @click="addEntrada">Agregar Entrada</button>
        </div>
        <ul class="list">
          <li v-for="(entrada, index) in entradas" :key="'entrada-' + index">
            <span>
              {{ entrada.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}: {{ entrada.proveedor }} - {{ entrada.medida }}{{ entrada.precio ? ` ($${entrada.precio})` : '' }}: {{ formatNumber(entrada.kilos) }} kg
              <template v-if="entrada.cuartoFrio"> - Cuarto: {{ entrada.cuartoFrio }}</template>
            </span>
            <div class="action-buttons">
              <button @click="editarEntrada(index)" class="edit-btn" title="Editar">✏️</button>
              <button @click="removeEntrada(index)" class="delete-btn">&times;</button>
            </div>
          </li>
        </ul>
        <p class="total">Total Entradas: {{ formatNumber(totalEntradas) }} kg</p>
      </div>
    </div>
    
    <div class="summary">
      <h3>Resumen del Día</h3>
      <p>Total Entradas: {{ formatNumber(totalEntradas) }} kg</p>
      <p>Total Salidas: {{ formatNumber(totalSalidas) }} kg</p>
      
      <h4>Salidas clientes:</h4>
      <table class="medidas-summary">
        <thead>
          <tr>
            <th>Medida</th>
            <th>Total (kg)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, key) in salidasProveedoresPorMedida" :key="key">
            <td>{{ item.medida }} ({{ item.proveedor }})</td>
            <td>{{ formatNumber(item.total) }}</td>
          </tr>
        </tbody>
      </table>

      <h4>Salidas maquilas:</h4>
      <table class="medidas-summary">
        <thead>
          <tr>
            <th>Maquila</th>
            <th>Medida</th>
            <th>Total (kg)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fila in salidasMaquilasFlat" :key="fila.key">
            <td>{{ fila.maquila }}</td>
            <td>{{ fila.medida }}</td>
            <td>{{ formatNumber(fila.total) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <button @click="saveReport" class="save-button">{{ isEditing ? 'Actualizar' : 'Guardar' }} Informe del Día</button>
    
    <!-- Modal de Edición de Entrada -->
    <div v-if="editandoEntrada" class="modal-overlay" @click.self="cancelarEdicionEntrada">
      <div class="modal-content">
        <h3>Editar Entrada</h3>
        <div v-if="entradaEditIndex !== null" class="modal-info">
          <p><strong>Proveedor:</strong> {{ entradas[entradaEditIndex].proveedor }}</p>
          <p><strong>Medida:</strong> {{ entradas[entradaEditIndex].medida }}</p>
        </div>
        <div class="modal-form">
          <label>
            Kilos:
            <input 
              v-model.number="entradaEditData.kilos" 
              type="number" 
              inputmode="decimal" 
              step="0.1" 
              pattern="[0-9]*" 
              placeholder="Kilos" 
              required 
            />
          </label>
          <label>
            Precio (opcional):
            <input 
              v-model.number="entradaEditData.precio" 
              type="number" 
              inputmode="decimal" 
              step="0.01" 
              pattern="[0-9]*" 
              placeholder="Precio" 
            />
          </label>
          <label>
            Cuarto frío (opcional):
            <select v-model="entradaEditData.cuartoFrio">
              <option value="">Sin cuarto</option>
              <option value="Cuarto 1">Cuarto 1</option>
              <option value="Cuarto 2">Cuarto 2</option>
              <option value="Cuarto 3">Cuarto 3</option>
              <option value="Cuarto 4">Cuarto 4</option>
              <option value="Cuarto 5">Cuarto 5</option>
            </select>
          </label>
        </div>
        <div class="modal-actions">
          <button @click="guardarEdicionEntrada" class="btn-guardar">Guardar</button>
          <button @click="cancelarEdicionEntrada" class="btn-cancelar">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, query, where } from 'firebase/firestore';
import BackButton from '../components/BackButton.vue';
import moment from 'moment';

export default {
  name: 'Sacadas',
  components: {
    BackButton
  },
  data() {
    return {
      currentDate: moment(),
      selectedDate: moment().format('YYYY-MM-DD'),
      entradas: [],
      salidas: [],
      proveedores: [],
      medidas: [],
      medidasConPrecio: [],
      medidasMaquilaDisponibles: [],
      newEntrada: { tipo: 'proveedor', proveedor: '', medida: '', kilos: null, precio: null, cuartoFrio: '' },
      newSalida: { tipo: 'proveedor', proveedor: '', medida: '', kilos: null, cuartoFrio: '' },
      isEditing: false,
      sacadaId: null,
      isLoaded: false,
      kilosDisponibles: null,
      editandoEntrada: false,
      entradaEditIndex: null,
      entradaEditData: { kilos: null, precio: null, cuartoFrio: '' }
    };
  },
  computed: {
    tienePedidoOrigen() {
      return !!(this.$route.query && (this.$route.query.pedidoFecha || this.$route.query.pedidoId))
    },
    formattedDate() {
      return this.currentDate.format('DD/MM/YYYY');
    },
    filteredProveedoresEntrada() {
      return this.proveedores.filter(p => p.tipo === this.newEntrada.tipo);
    },
    filteredProveedoresSalida() {
      return this.proveedores.filter(p => p.tipo === this.newSalida.tipo);
    },
    filteredMedidasEntrada() {
      if (this.newEntrada.tipo === 'maquila') {
        const maquila = this.proveedores.find(p => p.nombre === this.newEntrada.proveedor);
        return maquila ? this.medidas.filter(m => m.tipo === 'maquila' && m.maquilaId === maquila.id) : [];
      } else {
        const proveedor = this.proveedores.find(p => p.nombre === this.newEntrada.proveedor);
        return proveedor 
          ? this.medidas.filter(m => m.proveedorId === proveedor.id || (!m.proveedorId && m.tipo === 'general'))
          : this.medidas.filter(m => m.tipo === 'general');
      }
    },
    cuartosDisponiblesSalida() {
      const medidaSeleccionada = (this.filteredMedidasSalida || []).find(
        op => op.nombre === this.newSalida.medida
      );
      const lista = ['Todos los cuartos'];

      if (!medidaSeleccionada || !medidaSeleccionada.cuartos) {
        lista.push('s/c');
        return lista;
      }

      medidaSeleccionada.cuartos
        .map(c => this.normalizeCuarto(c.nombre))
        .forEach(cuarto => {
          if (!lista.includes(cuarto)) {
            lista.push(cuarto);
          }
        });

      if (lista.length === 1) {
        lista.push('s/c');
      }

      return lista;
    },
    filteredMedidasSalida() {
      if (this.newSalida.tipo === 'maquila') {
        if (!this.newSalida.proveedor) {
          return [];
        }
        return this.medidasMaquilaDisponibles;
      } else {
        const proveedor = this.proveedores.find(p => p.nombre === this.newSalida.proveedor);
        if (!proveedor) return [];

        // Solo usar las medidas con precio que tienen existencias
        return this.medidasConPrecio.sort((a, b) => {
          const getMedidaBase = (nombre) => nombre.split(' ')[0];
          const baseCmp = getMedidaBase(a.nombre).localeCompare(getMedidaBase(b.nombre));
          if (baseCmp !== 0) return baseCmp;
          const cuartoA = a.cuartoFrio || '';
          const cuartoB = b.cuartoFrio || '';
          return cuartoA.localeCompare(cuartoB);
        });
      }
    },
    totalEntradas() {
      return Number(this.entradas.reduce((total, entrada) => total + entrada.kilos, 0).toFixed(1));
    },
    totalSalidas() {
      return Number(this.salidas.reduce((total, salida) => total + salida.kilos, 0).toFixed(1));
    },
    salidasProveedoresPorMedida() {
      const salidas = this.salidas
        .filter(salida => salida.tipo === 'proveedor')
        .reduce((acc, salida) => {
          const key = `${salida.medida}-${salida.proveedor}`;
          if (!acc[key]) {
            acc[key] = {
              medida: salida.medida,
              proveedor: salida.proveedor,
              total: 0,
              displayName: salida.precio ? `${salida.medida} ($${salida.precio})` : salida.medida
            };
          }
          acc[key].total += salida.kilos;
          return acc;
        }, {});
      
      // Convertir a array y ordenar por medida
      return Object.values(salidas).sort((a, b) => {
        // Extraer solo la parte de la medida sin el precio para ordenar
        const medidaA = a.medida.split(' ($')[0];
        const medidaB = b.medida.split(' ($')[0];
        return medidaA.localeCompare(medidaB);
      });
    },
    salidasMaquilasPorMedida() {
      const salidas = this.salidas
        .filter(salida => salida.tipo === 'maquila')
        .reduce((acc, salida) => {
          if (!acc[salida.proveedor]) {
            acc[salida.proveedor] = {};
          }
          const medidaKey = salida.precio ? `${salida.medida} ($${salida.precio})` : salida.medida;
          if (!acc[salida.proveedor][medidaKey]) {
            acc[salida.proveedor][medidaKey] = 0;
          }
          acc[salida.proveedor][medidaKey] += salida.kilos;
          return acc;
        }, {});

      // Ordenar las medidas dentro de cada maquila
      for (const maquila in salidas) {
        const medidasOrdenadas = {};
        Object.keys(salidas[maquila])
          .sort((a, b) => {
            // Extraer solo la parte de la medida sin el precio para ordenar
            const medidaA = a.split(' ($')[0];
            const medidaB = b.split(' ($')[0];
            return medidaA.localeCompare(medidaB);
          })
          .forEach(medida => {
            medidasOrdenadas[medida] = salidas[maquila][medida];
          });
        salidas[maquila] = medidasOrdenadas;
      }

      return salidas;
    },
    salidasMaquilasFlat() {
      const filas = [];
      Object.entries(this.salidasMaquilasPorMedida).forEach(([maquila, medidas]) => {
        Object.entries(medidas).forEach(([medida, total]) => {
          filas.push({
            key: `${maquila}-${medida}`,
            maquila: maquila,
            medida: medida,
            total: total
          });
        });
      });
      return filas;
    },
    isSalidaValid() {
      return this.newSalida.tipo && 
             this.newSalida.proveedor && 
             this.newSalida.medida && 
             this.newSalida.kilos && 
             this.newSalida.kilos > 0 &&
             this.kilosDisponibles !== null &&
             this.newSalida.kilos <= this.kilosDisponibles;
    }
  },
  methods: {
    regresarAlPedido() {
      const tipo = this.$route.query.pedidoTipo || 'limpio'
      const fecha = this.$route.query.pedidoFecha
      const id = this.$route.query.pedidoId
      if (tipo === 'limpio') {
        const query = id ? { edit: 'true', id, fecha } : { fecha }
        this.$router.push({ path: '/procesos/pedidos/limpio', query })
      } else if (tipo === 'crudo') {
        const query = id ? { edit: 'true', id, fecha } : { fecha }
        this.$router.push({ path: '/procesos/pedidos/crudo', query })
      } else {
        this.$router.push('/procesos/pedidos')
      }
    },
    async loadProveedores() {
      const querySnapshot = await getDocs(collection(db, 'proveedores'));
      this.proveedores = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    async loadMedidas() {
      const querySnapshot = await getDocs(collection(db, 'medidas'));
      this.medidas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    async checkExistingSacada() {
      const sacadasRef = collection(db, 'sacadas');
      const startOfDay = this.currentDate.clone().startOf('day');
      const endOfDay = this.currentDate.clone().endOf('day');
      
      const q = query(sacadasRef, 
        where('fecha', '>=', startOfDay.toDate()),
        where('fecha', '<=', endOfDay.toDate())
      );
      
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    },
    resetEntradaSelections() {
      this.newEntrada.proveedor = '';
      this.newEntrada.medida = '';
    },
    resetSalidaSelections() {
      this.newSalida.proveedor = '';
      this.newSalida.medida = '';
      this.kilosDisponibles = null;
      this.medidasConPrecio = [];
      this.medidasMaquilaDisponibles = [];
    },
    limpiarSeleccionSalida() {
      this.newSalida = { tipo: 'proveedor', proveedor: '', medida: '', kilos: null, cuartoFrio: '' };
      this.kilosDisponibles = null;
      this.medidasConPrecio = [];
      this.medidasMaquilaDisponibles = [];
    },
    async refrescarMedidasDespuesSalida(proveedor) {
      // Forzar recálculo completo
      this.medidasConPrecio = [];
      await this.$nextTick();
      
      this.medidasConPrecio = await this.getMedidasConPrecio(proveedor);
      this.newSalida.cuartoFrio = '';
      
      return this.medidasConPrecio;
    },
    async refrescarMedidasManual() {
      if (this.newSalida.proveedor && this.newSalida.tipo === 'proveedor') {
        await this.refrescarMedidasDespuesSalida(this.newSalida.proveedor);
        
        // También actualizar kilos disponibles si hay una medida seleccionada
        if (this.newSalida.medida) {
          this.setCuartoPorDefecto();
          await this.updateKilosDisponibles();
        }
      }
    },
    resetCuartoSalida() {
      this.newSalida.cuartoFrio = '';
    },
    setCuartoPorDefecto() {
      const cuartos = this.cuartosDisponiblesSalida;
      if (cuartos.length) {
        this.newSalida.cuartoFrio = cuartos[0];
      } else {
        this.newSalida.cuartoFrio = '';
      }
    },
    normalizeCuarto(cuarto) {
      const valor = cuarto && cuarto.trim() ? cuarto.trim() : 's/c';
      return valor.toLowerCase() === 'sin cuarto designado' ? 's/c' : valor;
    },
    parseSalidaMedida(display) {
      if (!display) {
        return { medidaBase: '', precio: null, cuartoFrio: this.normalizeCuarto('') };
      }
      let texto = display.trim();
      if (texto.startsWith('🕐 ')) {
        texto = texto.substring(2).trim();
      }

      let cuartoFrio = null;
      if (texto.includes(' - Cuarto: ')) {
        const partes = texto.split(' - Cuarto: ');
        texto = partes[0].trim();
        cuartoFrio = partes[1] ? partes[1].trim() : null;
      }

      let medidaBase = texto;
      let precio = null;

      if (texto.includes(' ($')) {
        const precioMatch = texto.match(/\(\$(\d+(?:\.\d+)?)\)/);
        if (precioMatch) {
          precio = Number(precioMatch[1]);
          medidaBase = texto.split(' ($')[0];
        }
      } else if (texto.includes(' - (')) {
        medidaBase = texto.split(' - (')[0];
        precio = null;
      }

      return { medidaBase, precio, cuartoFrio: this.normalizeCuarto(cuartoFrio) };
    },
    async addEntrada() {
      if (this.newEntrada.tipo && this.newEntrada.proveedor && this.newEntrada.medida && this.newEntrada.kilos) {
        // Guardar datos antes de resetear
        const proveedorEntrada = this.newEntrada.proveedor;
        const tipoEntrada = this.newEntrada.tipo;
        const cuartoFrioEntrada = this.newEntrada.cuartoFrio;

        this.entradas.push({
          tipo: this.newEntrada.tipo,
          proveedor: this.newEntrada.proveedor,
          medida: this.newEntrada.medida,
          kilos: Number(this.newEntrada.kilos.toFixed(1)),
          precio: this.newEntrada.precio ? Number(this.newEntrada.precio.toFixed(2)) : null,
          cuartoFrio: cuartoFrioEntrada || ''
        });
        
        // Resetear pero mantener proveedor y tipo para facilitar más entradas
        this.newEntrada = { 
          tipo: tipoEntrada, 
          proveedor: proveedorEntrada, 
          medida: '', 
          kilos: null, 
          precio: null,
          cuartoFrio: cuartoFrioEntrada || '' 
        };
        
        // Si el proveedor de entrada es el mismo que el de salida, actualizar medidas disponibles para salidas
        if (this.newSalida.proveedor === proveedorEntrada) {
          if (this.newSalida.tipo === 'proveedor') {
            this.medidasConPrecio = await this.getMedidasConPrecio(proveedorEntrada);
          } else if (this.newSalida.tipo === 'maquila') {
            this.medidasMaquilaDisponibles = await this.getMedidasDisponiblesMaquila(proveedorEntrada);
          }
        }
        
        await this.updateKilosDisponibles();
      }
    },
    async addSalida() {
      // VALIDACIÓN PREVIA: Verificar si el precio seleccionado no es el más antiguo
      if (this.isSalidaValid && this.newSalida.kilos <= this.kilosDisponibles) {
        // Extraer información de la medida seleccionada
        const { medidaBase, precio, cuartoFrio } = this.parseSalidaMedida(this.newSalida.medida);
        const cuartoSeleccionado = this.normalizeCuarto(this.newSalida.cuartoFrio || cuartoFrio);
        let esPrecioMasAntiguo = false;
        
        // Verificar si la cadena original traía el emoji de más antiguo
        esPrecioMasAntiguo = this.newSalida.medida.startsWith('🕐 ');

        // VALIDACIÓN: Mostrar alerta si no es el precio más antiguo
        if (!esPrecioMasAntiguo && this.newSalida.tipo === 'proveedor' && precio !== null) {
          // Buscar si existe una medida más antigua con el mismo nombre base
          const medidaMasAntigua = this.medidasConPrecio.find(m => 
            m.nombreOriginal.split(' ($')[0] === medidaBase && m.esElMasAntiguo
          );
          
          if (medidaMasAntigua) {
            const confirmar = confirm(
              `⚠️ ADVERTENCIA: Estás registrando una salida con precio que NO es el más antiguo.\n\n` +
              `Medida seleccionada: ${medidaBase} ($${precio})\n` +
              `Existe una más antigua disponible: ${medidaMasAntigua.nombre.replace('🕐 ', '').split(' - (')[0]}\n\n` +
              `Se recomienda usar primero el precio más antiguo para un mejor control de inventario FIFO.\n\n` +
              `¿Deseas continuar registrando esta salida?`
            );
            
            if (!confirmar) {
              return; // Cancelar la operación
            }
          }
        }

        // Guardar el proveedor antes de resetear
        const proveedorAnterior = this.newSalida.proveedor;
        const tipoAnterior = this.newSalida.tipo;

        this.salidas.push({
          tipo: this.newSalida.tipo,
          proveedor: this.newSalida.proveedor,
          medida: medidaBase,
          precio: precio,
          kilos: Number(this.newSalida.kilos.toFixed(1)),
          cuartoFrio: cuartoSeleccionado
        });
        
        // Resetear pero mantener proveedor y tipo para facilitar más salidas
        this.newSalida = { 
          tipo: tipoAnterior, 
          proveedor: proveedorAnterior, 
          medida: '', 
          kilos: null,
          cuartoFrio: ''
        };
        
        // Actualizar las medidas disponibles después de la salida
        if (proveedorAnterior) {
          if (tipoAnterior === 'proveedor') {
            await this.refrescarMedidasDespuesSalida(proveedorAnterior);
          } else if (tipoAnterior === 'maquila') {
            this.medidasMaquilaDisponibles = await this.getMedidasDisponiblesMaquila(proveedorAnterior);
          }

          // Resetear los kilos disponibles para forzar recálculo
          this.kilosDisponibles = null;
        }

        await this.updateKilosDisponibles();
      } else if (this.newSalida.kilos > this.kilosDisponibles) {
        alert(`No hay suficientes kilos disponibles. Kilos disponibles: ${this.kilosDisponibles.toFixed(1)} kg`);
      }
    },
    async updateKilosDisponibles() {
      if (this.newSalida.proveedor && this.newSalida.medida) {
        this.kilosDisponibles = await this.getKilosDisponibles(
          this.newSalida.proveedor,
          this.newSalida.medida,
          this.newSalida.cuartoFrio
        );
      } else {
        this.kilosDisponibles = null;
      }
    },
    async getKilosDisponibles(proveedor, medidaDisplay, cuartoSeleccionado = '') {
      let kilosDisponibles = 0;
      let totalEntradas = 0;
      let totalSalidas = 0;

      const todosLosCuartosLabel = 'Todos los cuartos';
      const { medidaBase, precio, cuartoFrio } = this.parseSalidaMedida(medidaDisplay);
      const cuartoParsed = this.normalizeCuarto(cuartoSeleccionado || cuartoFrio);
      const sumarTodosLosCuartos = !cuartoSeleccionado || cuartoSeleccionado === todosLosCuartosLabel;

      const sacadasRef = collection(db, 'sacadas');
      const querySnapshot = await getDocs(sacadasRef);

      const sacadasOrdenadas = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.fecha.toDate() - b.fecha.toDate());

      const fechaActual = this.currentDate.clone().endOf('day');
      sacadasOrdenadas.forEach((sacada) => {
        const sacadaFecha = sacada.fecha instanceof Date ? sacada.fecha : sacada.fecha.toDate();
        
        if (moment(sacadaFecha).isSameOrBefore(fechaActual)) {
          sacada.entradas.forEach(entrada => {
            // Comparar medida, precio y cuarto correctamente
            const medidaCoincide = entrada.proveedor === proveedor && entrada.medida === medidaBase;
            const precioCoincide = precio === null ? 
              (entrada.precio === null || entrada.precio === undefined) : 
              entrada.precio === precio;
            const cuartoCoincide = sumarTodosLosCuartos
              ? true
              : this.normalizeCuarto(entrada.cuartoFrio) === cuartoParsed;
              
            if (medidaCoincide && precioCoincide && cuartoCoincide) {
              kilosDisponibles += entrada.kilos;
              totalEntradas += entrada.kilos;
            }
          });

          sacada.salidas.forEach(salida => {
            // Comparar medida, precio y cuarto correctamente
            const medidaCoincide = salida.proveedor === proveedor && salida.medida === medidaBase;
            const precioCoincide = precio === null ? 
              (salida.precio === null || salida.precio === undefined) : 
              salida.precio === precio;
            const cuartoCoincide = sumarTodosLosCuartos
              ? true
              : this.normalizeCuarto(salida.cuartoFrio) === cuartoParsed;
              
            if (medidaCoincide && precioCoincide && cuartoCoincide) {
              kilosDisponibles -= salida.kilos;
              totalSalidas += salida.kilos;
            }
          });
        }
      });

      return Number(kilosDisponibles.toFixed(1));
    },
    editarEntrada(index) {
      this.entradaEditIndex = index;
      const entrada = this.entradas[index];
      this.entradaEditData = {
        kilos: entrada.kilos,
        precio: entrada.precio,
        cuartoFrio: entrada.cuartoFrio || ''
      };
      this.editandoEntrada = true;
    },
    cancelarEdicionEntrada() {
      this.editandoEntrada = false;
      this.entradaEditIndex = null;
      this.entradaEditData = { kilos: null, precio: null, cuartoFrio: '' };
    },
    async guardarEdicionEntrada() {
      if (this.entradaEditIndex !== null && this.entradaEditData.kilos && this.entradaEditData.kilos > 0) {
        const entrada = this.entradas[this.entradaEditIndex];
        const proveedorEntrada = entrada.proveedor;
        
        // Actualizar la entrada
        entrada.kilos = Number(this.entradaEditData.kilos.toFixed(1));
        entrada.precio = this.entradaEditData.precio ? Number(this.entradaEditData.precio.toFixed(2)) : null;
        entrada.cuartoFrio = this.entradaEditData.cuartoFrio || '';
        
        // Si el proveedor es el mismo que el de salida, actualizar medidas disponibles
        if (this.newSalida.proveedor === proveedorEntrada) {
          if (this.newSalida.tipo === 'proveedor') {
            this.medidasConPrecio = await this.getMedidasConPrecio(proveedorEntrada);
          } else if (this.newSalida.tipo === 'maquila') {
            this.medidasMaquilaDisponibles = await this.getMedidasDisponiblesMaquila(proveedorEntrada);
          }
        }
        
        await this.updateKilosDisponibles();
        this.cancelarEdicionEntrada();
      }
    },
    async removeEntrada(index) {
      const entradaEliminada = this.entradas[index];
      this.entradas.splice(index, 1);
      
      // Si el proveedor eliminado es el mismo que el de salida, actualizar medidas disponibles
      if (this.newSalida.proveedor === entradaEliminada.proveedor) {
        if (this.newSalida.tipo === 'proveedor') {
          this.medidasConPrecio = await this.getMedidasConPrecio(entradaEliminada.proveedor);
        } else if (this.newSalida.tipo === 'maquila') {
          this.medidasMaquilaDisponibles = await this.getMedidasDisponiblesMaquila(entradaEliminada.proveedor);
        }
      }
      
      await this.updateKilosDisponibles();
    },
    async removeSalida(index) {
      const salidaEliminada = this.salidas[index];
      this.salidas.splice(index, 1);
      
      // Si el proveedor eliminado es el mismo que el seleccionado, actualizar medidas disponibles
      if (this.newSalida.proveedor === salidaEliminada.proveedor) {
        if (this.newSalida.tipo === 'proveedor') {
          this.medidasConPrecio = await this.getMedidasConPrecio(salidaEliminada.proveedor);
        } else if (this.newSalida.tipo === 'maquila') {
          this.medidasMaquilaDisponibles = await this.getMedidasDisponiblesMaquila(salidaEliminada.proveedor);
        }
      }
      
      await this.updateKilosDisponibles();
    },
    formatNumber(value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    },
    async loadSacada(id) {
      const docRef = doc(db, 'sacadas', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.currentDate = moment(data.fecha.toDate());
        this.entradas = data.entradas || [];
        this.salidas = data.salidas || [];
        this.sacadaId = id;
        this.isEditing = true;
        await this.updateKilosDisponibles();
      }
    },
    async saveReport() {
      try {
        if (!this.isEditing) {
          const existingSacada = await this.checkExistingSacada();
          if (existingSacada) {
            alert("Ya existe un registro de sacada para esta fecha. No se puede crear uno nuevo.");
            return;
          }
        }

        const reportData = {
          fecha: this.currentDate.toDate(),
          entradas: this.entradas,
          salidas: this.salidas,
          totalEntradas: this.totalEntradas,
          totalSalidas: this.totalSalidas
        };

        if (this.isEditing) {
          await updateDoc(doc(db, 'sacadas', this.sacadaId), reportData);
          alert("Informe del día actualizado exitosamente");
        } else {
          await addDoc(collection(db, 'sacadas'), reportData);
          alert("Informe del día guardado exitosamente");
        }
        this.$router.push('/sacadas');
      } catch (error) {
        console.error("Error al guardar/actualizar el documento: ", error);
        alert("Error al guardar/actualizar el informe del día: " + error.message);
      }
    },
    updateCurrentDate() {
      this.currentDate = moment(this.selectedDate);
    },
    async getMedidasConPrecio(proveedor) {
      const medidasDisponibles = new Map();
      const fechaActual = this.currentDate.clone().endOf('day');
      const normalizeCuarto = this.normalizeCuarto;

      // Obtenemos las sacadas anteriores
      const sacadasRef = collection(db, 'sacadas');
      const querySnapshot = await getDocs(sacadasRef);
      const sacadasOrdenadas = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.fecha.toDate() - b.fecha.toDate());

      // Función para actualizar el balance de una medida y rastrear fechas (cuartos incluidos)
      const actualizarBalance = (medida, precio, kilos, fecha, esEntrada = true, cuartoFrio = '') => {
        const precioNormalizado = precio !== null && precio !== undefined ? precio : null;
        const medidaKey = precioNormalizado !== null ? `${medida} ($${precioNormalizado})` : medida;
        const cuartoNormalizado = normalizeCuarto(cuartoFrio);

        if (!medidasDisponibles.has(medidaKey)) {
          medidasDisponibles.set(medidaKey, {
            medida,
            precio: precioNormalizado,
            kilos: 0,
            nombre: medidaKey,
            primeraFecha: null,
            esElMasAntiguo: false,
            cuartos: new Map()
          });
        }

        const datos = medidasDisponibles.get(medidaKey);
        datos.kilos += esEntrada ? kilos : -kilos;

        const kilosCuarto = datos.cuartos.get(cuartoNormalizado) || 0;
        datos.cuartos.set(cuartoNormalizado, kilosCuarto + (esEntrada ? kilos : -kilos));

        if (esEntrada && precioNormalizado !== null && (datos.primeraFecha === null || fecha < datos.primeraFecha)) {
          datos.primeraFecha = fecha;
        }
      };

      // Procesar todas las sacadas anteriores hasta el día ANTERIOR al actual (NO incluir el día actual)
      const inicioDiaActual = this.currentDate.clone().startOf('day');
      
      sacadasOrdenadas.forEach(sacada => {
        const sacadaFecha = sacada.fecha instanceof Date ? sacada.fecha : sacada.fecha.toDate();
        const momentSacada = moment(sacadaFecha);
        
        if (momentSacada.isBefore(inicioDiaActual)) {
          
          sacada.entradas.forEach(entrada => {
            if (entrada.proveedor === proveedor) {
              actualizarBalance(entrada.medida, entrada.precio, entrada.kilos, sacadaFecha, true, entrada.cuartoFrio || '');
            }
          });

          sacada.salidas.forEach(salida => {
            if (salida.proveedor === proveedor) {
              actualizarBalance(salida.medida, salida.precio, salida.kilos, sacadaFecha, false, salida.cuartoFrio || '');
            }
          });
        }
      });

      // Procesar entradas y salidas del día actual SOLO desde arrays locales
      this.entradas.forEach((entrada) => {
        if (entrada.proveedor === proveedor) {
          const fechaHoy = this.currentDate.toDate();
          actualizarBalance(entrada.medida, entrada.precio, entrada.kilos, fechaHoy, true, entrada.cuartoFrio || '');
        }
      });

      this.salidas.forEach((salida) => {
        if (salida.proveedor === proveedor) {
          const fechaHoy = this.currentDate.toDate();
          actualizarBalance(salida.medida, salida.precio, salida.kilos, fechaHoy, false, salida.cuartoFrio || '');
        }
      });

      // Encontrar cuál es el precio más antiguo para cada medida base (solo para medidas con precio)
      const medidasPorBase = new Map();
      for (const [_, datos] of medidasDisponibles) {
        if (datos.kilos > 0 && datos.precio !== null && datos.primeraFecha !== null) {
          const medidaBase = datos.medida;
          if (!medidasPorBase.has(medidaBase)) {
            medidasPorBase.set(medidaBase, []);
          }
          medidasPorBase.get(medidaBase).push(datos);
        }
      }

      // Marcar cuál es el más antiguo para cada medida base (solo para medidas con precio)
      for (const [_, grupoMedidas] of medidasPorBase) {
        if (grupoMedidas.length > 1) {
          const masAntiguo = grupoMedidas.reduce((min, actual) => 
            actual.primeraFecha < min.primeraFecha ? actual : min
          );
          masAntiguo.esElMasAntiguo = true;
        }
      }

      // Convertir TODAS las medidas con existencias positivas a opciones (con precio y sin precio)
      const medidasConPrecio = [];
      for (const [_, datos] of medidasDisponibles) {
        if (datos.kilos > 0) {
          
          let nombreDisplay = datos.nombre;
          
          // Agregar indicadores visuales solo para medidas con precio
          if (datos.precio !== null && datos.primeraFecha !== null) {
            const fechaStr = moment(datos.primeraFecha).format('DD/MM/YY');
            if (datos.esElMasAntiguo) {
              nombreDisplay = `🕐 ${datos.medida} ($${datos.precio}) - Más antiguo (${fechaStr})`;
            } else {
              nombreDisplay = `${datos.medida} ($${datos.precio}) - (${fechaStr})`;
            }
          } else if (datos.precio === null) {
            nombreDisplay = `${datos.medida} - (Sin precio)`;
          }
          
          medidasConPrecio.push({
            id: datos.nombre,
            nombre: nombreDisplay,
            nombreOriginal: datos.nombre,
            tipo: 'general',
            precio: datos.precio,
            kilos: datos.kilos,
            primeraFecha: datos.primeraFecha,
            esElMasAntiguo: datos.esElMasAntiguo || false,
            cuartos: Array.from(datos.cuartos.entries())
              .filter(([, k]) => k > 0)
              .map(([c, k]) => ({ nombre: c, kilos: Number(k.toFixed(1)) }))
          });
        }
      }

      // Ordenar: primero por medida base, luego sin precio primero, después por fecha (más antiguo primero)
      return medidasConPrecio.sort((a, b) => {
        const medidaBaseA = a.nombreOriginal.split(' ($')[0];
        const medidaBaseB = b.nombreOriginal.split(' ($')[0];
        
        if (medidaBaseA !== medidaBaseB) {
          return medidaBaseA.localeCompare(medidaBaseB);
        }
        
        if (a.precio === null && b.precio !== null) return -1;
        if (a.precio !== null && b.precio === null) return 1;
        
        if (a.primeraFecha && b.primeraFecha) {
          return a.primeraFecha - b.primeraFecha;
        }
        
        return 0;
      });
    },
    async getMedidasDisponiblesMaquila(maquilaNombre) {
      const maquila = this.proveedores.find(
        proveedor => proveedor.nombre === maquilaNombre && proveedor.tipo === 'maquila'
      );

      if (!maquila) {
        return [];
      }

      const medidasMaquila = this.medidas.filter(
        medida => medida.tipo === 'maquila' && medida.maquilaId === maquila.id
      );

      if (!medidasMaquila.length) {
        return [];
      }

      const existenciasPorMedida = new Map(); // medida -> { cuartos: Map }
      const acumularKilos = (medidaNombre, kilosDelta, cuartoFrio = '') => {
        if (!medidaNombre) return;
        if (!existenciasPorMedida.has(medidaNombre)) {
          existenciasPorMedida.set(medidaNombre, { cuartos: new Map() });
        }
        const data = existenciasPorMedida.get(medidaNombre);
        const cuarto = this.normalizeCuarto(cuartoFrio);
        const kilosActuales = data.cuartos.get(cuarto) || 0;
        data.cuartos.set(cuarto, kilosActuales + (Number(kilosDelta) || 0));
      };

      const sacadasRef = collection(db, 'sacadas');
      const querySnapshot = await getDocs(sacadasRef);
      const sacadasOrdenadas = querySnapshot.docs
        .map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }))
        .sort((a, b) => a.fecha.toDate() - b.fecha.toDate());

      const inicioDiaActual = this.currentDate.clone().startOf('day');

      sacadasOrdenadas.forEach(sacada => {
        const fechaSacada = sacada.fecha instanceof Date ? sacada.fecha : sacada.fecha.toDate();
        const momentoSacada = moment(fechaSacada);

        if (!momentoSacada.isBefore(inicioDiaActual)) {
          return;
        }

        (sacada.entradas || []).forEach(entrada => {
          if (entrada.tipo === 'maquila' && entrada.proveedor === maquilaNombre) {
            acumularKilos(entrada.medida, entrada.kilos, entrada.cuartoFrio);
          }
        });

        (sacada.salidas || []).forEach(salida => {
          if (salida.tipo === 'maquila' && salida.proveedor === maquilaNombre) {
            acumularKilos(salida.medida, -(salida.kilos || 0), salida.cuartoFrio);
          }
        });
      });

      this.entradas.forEach(entrada => {
        if (entrada.tipo === 'maquila' && entrada.proveedor === maquilaNombre) {
          acumularKilos(entrada.medida, entrada.kilos, entrada.cuartoFrio);
        }
      });

      this.salidas.forEach(salida => {
        if (salida.tipo === 'maquila' && salida.proveedor === maquilaNombre) {
          acumularKilos(salida.medida, -(salida.kilos || 0), salida.cuartoFrio);
        }
      });

      const resultado = [];
      medidasMaquila.forEach(medida => {
        const registro = existenciasPorMedida.get(medida.nombre);
        if (!registro) return;

        const cuartos = Array.from(registro.cuartos.entries())
          .filter(([, k]) => k > 0)
          .map(([nombreCuarto, k]) => ({
            nombre: nombreCuarto,
            kilos: Number(Number(k).toFixed(1))
          }));

        const kilosTotales = cuartos.reduce((sum, c) => sum + c.kilos, 0);
        if (kilosTotales > 0) {
          resultado.push({
            ...medida,
            id: medida.id || medida.nombre,
            cuartos,
            kilos: kilosTotales
          });
        }
      });

      return resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
    },
  },
  async created() {
    // Si viene fecha desde el pedido, usarla como seleccionada
    if (this.$route.query && this.$route.query.fecha) {
      this.selectedDate = this.$route.query.fecha
      this.updateCurrentDate()
    }
    await this.loadProveedores();
    await this.loadMedidas();
    if (this.$route.params.id) {
      await this.loadSacada(this.$route.params.id);
    }
    this.isLoaded = true;
  },
  watch: {
    'newSalida.medida': function () {
      this.resetCuartoSalida();
      this.setCuartoPorDefecto();
      this.updateKilosDisponibles();
    },
    'newSalida.kilos': 'updateKilosDisponibles',
    'newSalida.cuartoFrio': 'updateKilosDisponibles',
    async 'newSalida.proveedor'(newProveedor) {
      this.resetCuartoSalida();
      this.updateKilosDisponibles();
      const tipoActual = this.newSalida.tipo;

      if (!newProveedor) {
        this.medidasConPrecio = [];
        this.medidasMaquilaDisponibles = [];
        return;
      }

      if (tipoActual === 'proveedor') {
        this.medidasMaquilaDisponibles = [];
        this.medidasConPrecio = await this.getMedidasConPrecio(newProveedor);
      } else if (tipoActual === 'maquila') {
        this.medidasConPrecio = [];
        this.medidasMaquilaDisponibles = await this.getMedidasDisponiblesMaquila(newProveedor);
      } else {
        this.medidasConPrecio = [];
        this.medidasMaquilaDisponibles = [];
      }
    }
  }
};
</script>

<style scoped>
.sacadas-container {
  max-width: 1200px;  /* Aumentamos el ancho máximo */
  margin: 0 auto;
  padding: 20px;
  background-color: #e8f0fe;
  border-radius: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.date-header {
  text-align: center;
  color: #3760b0;
  font-size: 1.5em;
  margin-bottom: 20px;
}

.sacadas-content {
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.salidas-section, .entradas-section {
  flex: 1;
  min-width: 0;  /* Esto ayuda a prevenir que el contenido se desborde */
}

h3 {
  color: #3760b0;
  border-bottom: 2px solid #3760b0;
  padding-bottom: 10px;
}

.input-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.input-group select,
.input-group input {
  flex: 1;
  min-width: 120px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.input-group select {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 10px top 50%;
  background-size: 12px auto;
  padding-right: 30px;
}

button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.1s;
  font-size: 14px;
}

button:hover {
  background-color: #2a4a87;
}

button:active {
  transform: scale(0.98);
}

.clear-button {
  background-color: #dc3545;
  margin-left: 10px;
  padding: 8px 12px;
  font-size: 12px;
}

.clear-button:hover {
  background-color: #c82333;
}

.refresh-button {
  background-color: #17a2b8;
  margin-left: 10px;
  padding: 8px 12px;
  font-size: 12px;
}

.refresh-button:hover {
  background-color: #138496;
}

.list {
  list-style-type: none;
  padding: 0;
}

.list li {
  background-color: white;
  margin-bottom: 10px;
  padding: 12px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  gap: 5px;
  align-items: center;
}

.edit-btn {
  background-color: transparent;
  color: #ffa500;
  border: none;
  font-size: 1.1em;
  cursor: pointer;
  padding: 0 5px;
  transition: color 0.3s, transform 0.2s;
}

.edit-btn:hover {
  color: #ff8c00;
  transform: scale(1.1);
}

.delete-btn {
  background-color: transparent;
  color: #ff4136;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  padding: 0 5px;
  transition: color 0.3s;
}

.delete-btn:hover {
  color: #d50000;
}

.total {
  font-weight: bold;
  color: #3760b0;
  font-size: 16px;
  margin-top: 15px;
}

.summary {
  margin-top: 30px;
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.summary h3 {
  color: #3760b0;
  border-bottom: none;
  margin-bottom: 15px;
}

.summary h4 {
  margin-top: 20px;
  color: #3760b0;
}

.summary p {
  margin: 10px 0;
  font-size: 16px;
}

.save-button {
  display: block;
  width: 100%;
  margin-top: 20px;
  padding: 12px;
  font-size: 1.1em;
  background-color: #28a745;
}

.save-button:hover {
  background-color: #218838;
}

.medidas-summary {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.medidas-summary th,
.medidas-summary td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.medidas-summary th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.medidas-summary tr:nth-child(even) {
  background-color: #f9f9f9;
}

.medidas-summary tr:hover {
  background-color: #f5f5f5;
}

/* Estilos específicos para Galaxy Fold (ancho plegado ~375px, desplegado ~667px) */
@media (min-width: 375px) and (max-width: 667px) {
  .sacadas-container {
    padding: 15px;
    max-width: 100%;
  }

  .sacadas-content {
    display: flex;
    flex-direction: row;
    gap: 10px;
    justify-content: space-between;
  }

  .entradas-section, .salidas-section {
    flex: 1;
    min-width: 0;
    margin-bottom: 0;
  }

  .input-group {
    flex-direction: column;
    gap: 8px;
  }

  .input-group select,
  .input-group input {
    width: 100%;
    padding: 8px;
    font-size: 12px;
    min-width: auto;
  }

  .input-group button {
    width: 100%;
    padding: 8px;
    font-size: 12px;
  }

  .clear-button,
  .refresh-button {
    margin-left: 0;
    margin-top: 5px;
    padding: 6px 10px;
    font-size: 11px;
  }

  .list li {
    padding: 8px;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .total {
    font-size: 14px;
    margin-top: 10px;
  }

  .kilos-disponibles {
    font-size: 1em;
    padding: 8px;
    margin-bottom: 10px;
  }

  .medidas-summary {
    font-size: 11px;
  }
  
  .medidas-summary th,
  .medidas-summary td {
    padding: 4px;
  }

  .date-header {
    font-size: 1.3em;
    margin-bottom: 15px;
  }

  h3 {
    font-size: 1.1em;
    margin-bottom: 10px;
  }

  .summary h4 {
    font-size: 1em;
    margin-top: 15px;
  }

  .summary {
    padding: 15px;
    margin-top: 20px;
  }

  .save-button {
    padding: 10px;
    font-size: 1em;
  }
}

/* Para pantallas más pequeñas que el Galaxy Fold plegado */
@media (max-width: 374px) {
  .sacadas-content {
    flex-direction: column;
  }

  .entradas-section, .salidas-section {
    width: 100%;
    margin-bottom: 30px;
  }

  .input-group {
    flex-direction: column;
  }

  .input-group select,
  .input-group input,
  .input-group button {
    width: 100%;
  }

  .clear-button,
  .refresh-button {
    margin-left: 0;
    margin-top: 5px;
  }

  .medidas-summary {
    font-size: 14px;
  }
  
  .medidas-summary th,
  .medidas-summary td {
    padding: 6px;
  }
}

/* Para pantallas más grandes que el Galaxy Fold desplegado */
@media (min-width: 668px) and (max-width: 768px) {
  .sacadas-content {
    display: flex;
    flex-direction: row;
    gap: 15px;
  }

  .entradas-section, .salidas-section {
    flex: 1;
    min-width: 0;
  }

  .input-group {
    flex-wrap: wrap;
    gap: 8px;
  }

  .input-group select,
  .input-group input {
    flex: 1;
    min-width: 100px;
    font-size: 13px;
  }
}

.date-selector {
  text-align: center;
  margin-bottom: 20px;
}

.date-selector input {
  padding: 8px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.kilos-disponibles {
  font-size: 1.2em;
  font-weight: bold;
  color: #3760b0;
  margin-bottom: 15px;
  padding: 10px;
  background-color: #f0f4ff;
  border-radius: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.low-stock {
  color: #ff4136;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

button:disabled:hover {
  background-color: #cccccc;
}

/* Estilos para indicadores de precio más antiguo */
.input-group select option[value*="🕐"] {
  background-color: #fff3cd;
  color: #856404;
  font-weight: bold;
}

.precio-mas-antiguo {
  background-color: #fff3cd !important;
  color: #856404 !important;
  font-weight: bold !important;
}

/* Estilos para el modal de edición */
.modal-overlay {
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
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h3 {
  color: #3760b0;
  margin-bottom: 20px;
  border-bottom: 2px solid #3760b0;
  padding-bottom: 10px;
}

.modal-info {
  background-color: #f0f4ff;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.modal-info p {
  margin: 5px 0;
  color: #3760b0;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
}

.modal-form label {
  display: flex;
  flex-direction: column;
  font-weight: bold;
  color: #3760b0;
  gap: 5px;
}

.modal-form input {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.modal-form input:focus {
  outline: none;
  border-color: #3760b0;
  box-shadow: 0 0 5px rgba(55, 96, 176, 0.3);
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-guardar {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.1s;
  font-size: 14px;
  font-weight: bold;
}

.btn-guardar:hover {
  background-color: #218838;
}

.btn-cancelar {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.1s;
  font-size: 14px;
  font-weight: bold;
}

.btn-cancelar:hover {
  background-color: #c82333;
}

/* Responsive para modal */
@media (max-width: 600px) {
  .modal-content {
    padding: 20px;
    width: 95%;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn-guardar,
  .btn-cancelar {
    width: 100%;
  }
}
</style>
