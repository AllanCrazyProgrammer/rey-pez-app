<template>
  <div class="registro-crudos-container" v-if="isLoaded">
    <div class="back-button-container">
      <BackButton to="/existencias-crudos" />
    </div>
    <h2 class="date-header">{{ formattedDate }}</h2>
    <div class="date-selector">
      <input type="date" v-model="selectedDate" @change="updateCurrentDate">
    </div>
    
    <div class="registro-content">
      <div class="entradas-section">
        <h3>Entradas de Crudos</h3>
        <div class="form-section">
          <div class="input-group">
            <select v-model="newEntrada.proveedor" required @change="resetProductoEntrada">
              <option value="">Seleccionar Proveedor</option>
              <option v-for="proveedor in proveedoresCrudos" :key="proveedor.id" :value="proveedor.nombre">
                {{ proveedor.nombre }}
              </option>
              <option value="__nuevo__">+ Nuevo Proveedor</option>
            </select>
            
            <input 
              v-if="newEntrada.proveedor === '__nuevo__'"
              v-model="nuevoProveedorEntrada" 
              type="text" 
              placeholder="Nombre del nuevo proveedor" 
              class="input-nuevo-proveedor"
            />
          </div>
          
          <div class="entrada-form">
            <div class="input-group">
              <input 
                v-model.number="newEntrada.kilos" 
                type="number" 
                inputmode="decimal" 
                step="0.1" 
                placeholder="Kilos" 
                required 
              />
              <select 
                v-if="newEntrada.proveedor && newEntrada.proveedor !== '__nuevo__'"
                v-model="newEntrada.producto" 
                required
              >
                <option value="">Seleccionar Medida/Producto</option>
                <option v-for="medida in medidasDelProveedorEntrada" :key="medida.id" :value="medida.nombre">
                  {{ medida.nombre }}
                  <span v-if="medida.precioReferencia"> - Ref: ${{ formatearPrecio(medida.precioReferencia) }}</span>
                </option>
                <option value="__custom__">+ Otro producto/medida</option>
              </select>
              <input 
                v-else
                v-model="newEntrada.producto" 
                type="text" 
                placeholder="Producto/Medida" 
                required 
              />
              <input 
                v-model.number="newEntrada.precio" 
                type="number" 
                inputmode="decimal" 
                step="0.01" 
                placeholder="Precio (opcional)" 
              />
            <select v-model="newEntrada.cuartoFrio">
              <option value="">Cuarto frío (opcional)</option>
              <option value="Cuarto 1">Cuarto 1</option>
              <option value="Cuarto 2">Cuarto 2</option>
              <option value="Cuarto 3">Cuarto 3</option>
              <option value="Cuarto 4">Cuarto 4</option>
              <option value="Cuarto 5">Cuarto 5</option>
            </select>
              <button @click="addEntrada" :disabled="!isEntradaValida">Agregar Entrada</button>
            </div>
            
            <!-- Campo personalizado para productos no listados -->
            <div v-if="newEntrada.producto === '__custom__'" class="input-group">
              <input 
                v-model="customProducto" 
                type="text" 
                placeholder="Nombre del producto/medida personalizada" 
                class="input-nuevo-proveedor"
              />
            </div>
          </div>
        </div>
        
        <ul class="list">
          <li v-for="(entrada, index) in entradas" :key="'entrada-' + index">
            <div class="item-info">
              <strong>{{ entrada.proveedor }}</strong> - {{ entrada.producto }}
              <span v-if="entrada.precio" class="precio-info"> (${{ formatearPrecio(entrada.precio) }})</span>
              : {{ formatNumber(entrada.kilos) }} kg
              <span v-if="entrada.precio" class="total-info"> - Total: ${{ formatearPrecio(entrada.kilos * entrada.precio) }}</span>
              <span v-if="entrada.cuartoFrio" class="total-info"> - Cuarto: {{ entrada.cuartoFrio }}</span>
            </div>
            <div class="entry-actions">
              <button @click="editarEntrada(index)" class="edit-btn" title="Editar">✏️</button>
              <button @click="removeEntrada(index)" class="delete-btn">&times;</button>
            </div>
          </li>
        </ul>
        <p class="total">Total Entradas: {{ formatNumber(totalEntradas) }} kg</p>
      </div>
      
      <div class="salidas-section">
        <h3>Salidas de Crudos</h3>
        <div class="form-section">
          <div class="input-group">
            <select v-model="newSalida.proveedor" required @change="resetProductoSalida">
              <option value="">Seleccionar Proveedor</option>
              <option v-for="proveedor in proveedoresDisponibles" :key="proveedor" :value="proveedor">
                {{ proveedor }}
              </option>
            </select>
          </div>
          
          <div v-if="newSalida.proveedor" class="productos-disponibles">
            <h4>Productos Disponibles - {{ newSalida.proveedor }}</h4>
            <div v-if="productosDelProveedorSeleccionado.length === 0" class="no-productos">
              No hay productos disponibles para este proveedor.
            </div>
            <div v-else class="productos-grid">
              <div 
                v-for="producto in productosDelProveedorSeleccionado" 
                :key="producto.nombre"
                class="producto-card"
                @click="seleccionarProductoSalida(producto)"
                :class="{ 'selected': newSalida.producto === producto.nombre }"
              >
                <div class="producto-info">
                  <h5>{{ producto.nombre }}</h5>
                  <p class="kilos-disponibles">{{ formatNumber(producto.kilosDisponibles) }} kg disponibles</p>
                  <p v-if="producto.ultimoPrecio" class="ultimo-precio">Último precio: ${{ formatearPrecio(producto.ultimoPrecio) }}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="newSalida.producto" class="salida-form">
            <div class="input-group">
              <input 
                v-model.number="newSalida.kilos" 
                type="number" 
                inputmode="decimal" 
                step="0.1" 
                :max="kilosDisponiblesSeleccionados"
                placeholder="Kilos" 
                required 
              />
              <select v-model="newSalida.cuartoFrio">
                <option value="Todos los cuartos">Todos los cuartos</option>
                <option 
                  v-for="cuarto in cuartosDisponiblesSalida" 
                  :key="cuarto" 
                  :value="cuarto"
                >
                  {{ cuarto }}
                </option>
              </select>
              <button @click="addSalida" :disabled="!isSalidaValida">Agregar Salida</button>
            </div>
            <p class="disponibles-info">
              Disponibles: {{ formatNumber(kilosDisponiblesSeleccionados) }} kg
            </p>
          </div>
        </div>
        
        <ul class="list">
          <li v-for="(salida, index) in salidas" :key="'salida-' + index">
            <div class="item-info">
              <strong>{{ salida.proveedor }}</strong> - {{ salida.producto }}: {{ formatNumber(salida.kilos) }} kg
              <span v-if="salida.cuartoFrio" class="total-info"> - Cuarto: {{ salida.cuartoFrio }}</span>
            </div>
            <button @click="removeSalida(index)" class="delete-btn">&times;</button>
          </li>
        </ul>
        <p class="total">Total Salidas: {{ formatNumber(totalSalidas) }} kg</p>
      </div>
    </div>
    
    <div class="summary">
      <h3>Resumen del Día</h3>
      <p>Total Entradas: {{ formatNumber(totalEntradas) }} kg</p>
      <p>Total Salidas: {{ formatNumber(totalSalidas) }} kg</p>
      <p>Diferencia: {{ formatNumber(totalEntradas - totalSalidas) }} kg</p>
    </div>
    
    <button @click="saveReport" class="save-button">{{ isEditing ? 'Actualizar' : 'Guardar' }} Registro</button>

    <!-- Modal edición entrada -->
    <div v-if="editandoEntrada" class="modal-overlay" @click.self="cancelarEdicionEntrada">
      <div class="modal-content">
        <h3>Editar Entrada</h3>
        <div v-if="entradaEditIndex !== null" class="modal-info">
          <p><strong>Proveedor:</strong> {{ entradas[entradaEditIndex].proveedor }}</p>
          <p><strong>Producto:</strong> {{ entradas[entradaEditIndex].producto }}</p>
        </div>
        <div class="modal-form">
          <label>
            Kilos:
            <input 
              v-model.number="entradaEditData.kilos"
              type="number"
              inputmode="decimal"
              step="0.1"
              placeholder="Kilos"
            />
          </label>
          <label>
            Cuarto frío (opcional):
            <select v-model="entradaEditData.cuartoFrio">
              <option value="Sin cuarto designado">Sin cuarto designado</option>
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
  name: 'RegistroCrudos',
  components: {
    BackButton
  },
  data() {
    return {
      currentDate: moment(),
      selectedDate: moment().format('YYYY-MM-DD'),
      entradas: [],
      salidas: [],
      proveedoresCrudos: [],
      medidasCrudos: [],
      newEntrada: { 
        proveedor: '', 
        producto: '', 
        kilos: null, 
        precio: null,
        cuartoFrio: ''
      },
      newSalida: { 
        proveedor: '', 
        producto: '', 
        kilos: null,
        cuartoFrio: 'Todos los cuartos'
      },
      nuevoProveedorEntrada: '',
      customProducto: '',
      isEditing: false,
      registroId: null,
      isLoaded: false,
      productosDisponibles: [],
      kilosDisponiblesSeleccionados: 0,
      editandoEntrada: false,
      entradaEditIndex: null,
      entradaEditData: { kilos: null, cuartoFrio: '' }
    };
  },
  computed: {
    formattedDate() {
      return this.currentDate.format('DD/MM/YYYY');
    },
    totalEntradas() {
      return Number(this.entradas.reduce((total, entrada) => total + entrada.kilos, 0).toFixed(1));
    },
    totalSalidas() {
      return Number(this.salidas.reduce((total, salida) => total + salida.kilos, 0).toFixed(1));
    },
    isEntradaValida() {
      const proveedorValido = this.newEntrada.proveedor === '__nuevo__' 
        ? this.nuevoProveedorEntrada.trim()
        : this.newEntrada.proveedor;
      
      const productoValido = this.newEntrada.producto === '__custom__'
        ? this.customProducto.trim()
        : this.newEntrada.producto;
      
      return proveedorValido &&
             productoValido &&
             this.newEntrada.kilos &&
             this.newEntrada.kilos > 0;
    },
    isSalidaValida() {
      return this.newSalida.proveedor &&
             this.newSalida.producto &&
             this.newSalida.kilos &&
             this.newSalida.kilos > 0 &&
             this.newSalida.kilos <= this.kilosDisponiblesSeleccionados;
    },
    proveedoresDisponibles() {
      const proveedores = new Set();
      this.productosDisponibles.forEach(producto => {
        if (producto.kilosDisponibles > 0) {
          proveedores.add(producto.proveedor);
        }
      });
      return Array.from(proveedores).sort();
    },
    productosDelProveedorSeleccionado() {
      return this.productosDisponibles.filter(producto => 
        producto.proveedor === this.newSalida.proveedor && producto.kilosDisponibles > 0
      );
    },
    cuartosDisponiblesSalida() {
      const productoSel = this.productosDelProveedorSeleccionado.find(
        p => p.nombre === this.newSalida.producto
      );
      if (!productoSel || !productoSel.cuartos) return [];
      return ['Todos los cuartos', ...productoSel.cuartos.map(c => c.nombre)];
    },
    medidasDelProveedorEntrada() {
      if (!this.newEntrada.proveedor || this.newEntrada.proveedor === '__nuevo__') {
        return [];
      }
      const proveedorId = this.proveedoresCrudos.find(p => p.nombre === this.newEntrada.proveedor)?.id;
      return this.medidasCrudos.filter(m => m.proveedorId === proveedorId);
    }
  },
  methods: {
    async loadProveedoresCrudos() {
      try {
        const querySnapshot = await getDocs(collection(db, 'proveedoresCrudos'));
        this.proveedoresCrudos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        this.proveedoresCrudos.sort((a, b) => a.nombre.localeCompare(b.nombre));
      } catch (error) {
        console.error('Error al cargar proveedores de crudos:', error);
        this.proveedoresCrudos = [];
      }
    },

    async loadMedidasCrudos() {
      try {
        const querySnapshot = await getDocs(collection(db, 'medidasCrudos'));
        this.medidasCrudos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error('Error al cargar medidas de crudos:', error);
        this.medidasCrudos = [];
      }
    },

    async loadProductosDisponibles() {
      try {
        const registrosSnapshot = await getDocs(collection(db, 'existenciasCrudos'));
        const disponibilidades = {};
        const normalizeCuarto = (c) => (c && c.trim()) ? c.trim() : 'Sin cuarto designado';

        const registrosOrdenados = registrosSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            const fechaA = a.fecha instanceof Date ? a.fecha : a.fecha.toDate();
            const fechaB = b.fecha instanceof Date ? b.fecha : b.fecha.toDate();
            return fechaA - fechaB;
          });

        const fechaLimite = this.isEditing 
          ? this.currentDate.clone().subtract(1, 'day').endOf('day')
          : this.currentDate.clone().endOf('day');

        registrosOrdenados.forEach(registro => {
          const registroFecha = registro.fecha instanceof Date ? registro.fecha : registro.fecha.toDate();
          
          if (this.isEditing && registro.id === this.registroId) {
            return;
          }
          
          if (moment(registroFecha).isSameOrBefore(fechaLimite)) {
            if (registro.entradas) {
              registro.entradas.forEach(entrada => {
                const key = `${entrada.proveedor}|${entrada.producto}`;
                const cuarto = normalizeCuarto(entrada.cuartoFrio);
                if (!disponibilidades[key]) {
                  disponibilidades[key] = {
                    proveedor: entrada.proveedor,
                    nombre: entrada.producto,
                    ultimoPrecio: 0,
                    cuartos: {}
                  };
                }
                const prod = disponibilidades[key];
                prod.cuartos[cuarto] = (prod.cuartos[cuarto] || 0) + entrada.kilos;
                if (entrada.precio) {
                  prod.ultimoPrecio = entrada.precio;
                }
              });
            }

            if (registro.salidas) {
              registro.salidas.forEach(salida => {
                const key = `${salida.proveedor}|${salida.producto}`;
                const cuarto = normalizeCuarto(salida.cuartoFrio);
                if (!disponibilidades[key]) {
                  disponibilidades[key] = {
                    proveedor: salida.proveedor,
                    nombre: salida.producto,
                    ultimoPrecio: 0,
                    cuartos: {}
                  };
                }
                const prod = disponibilidades[key];
                prod.cuartos[cuarto] = (prod.cuartos[cuarto] || 0) - salida.kilos;
                if (salida.precio) {
                  prod.ultimoPrecio = salida.precio;
                }
              });
            }
          }
        });

        this.entradas.forEach(entrada => {
          const key = `${entrada.proveedor}|${entrada.producto}`;
          const cuarto = normalizeCuarto(entrada.cuartoFrio);
          if (!disponibilidades[key]) {
            disponibilidades[key] = {
              proveedor: entrada.proveedor,
              nombre: entrada.producto,
              ultimoPrecio: entrada.precio || 0,
              cuartos: {}
            };
          }
          const prod = disponibilidades[key];
          prod.cuartos[cuarto] = (prod.cuartos[cuarto] || 0) + entrada.kilos;
          if (entrada.precio) {
            prod.ultimoPrecio = entrada.precio;
          }
        });

        this.salidas.forEach(salida => {
          const key = `${salida.proveedor}|${salida.producto}`;
          const cuarto = normalizeCuarto(salida.cuartoFrio);
          if (!disponibilidades[key]) return;
          const prod = disponibilidades[key];
          prod.cuartos[cuarto] = (prod.cuartos[cuarto] || 0) - salida.kilos;
        });

        this.productosDisponibles = Object.values(disponibilidades)
          .map(prod => {
            const cuartosArr = Object.entries(prod.cuartos || {})
              .filter(([, k]) => k > 0)
              .map(([nombre, kilos]) => ({
                nombre,
                kilos: Number(Number(kilos).toFixed(1))
              }));
            const total = cuartosArr.reduce((sum, c) => sum + c.kilos, 0);
            return {
              ...prod,
              cuartos: cuartosArr,
              kilosDisponibles: total
            };
          })
          .filter(producto => producto.kilosDisponibles > 0);

        if (this.newSalida.producto) {
          this.actualizarKilosDisponiblesSeleccionados();
        }

      } catch (error) {
        console.error('Error al cargar productos disponibles:', error);
        this.productosDisponibles = [];
      }
    },

    resetProductoEntrada() {
      this.newEntrada.producto = '';
      this.newEntrada.kilos = null;
      this.newEntrada.precio = null;
      this.nuevoProveedorEntrada = '';
      this.customProducto = '';
      this.newEntrada.cuartoFrio = '';
    },

    resetProductoSalida() {
      this.newSalida.producto = '';
      this.newSalida.kilos = null;
      this.newSalida.cuartoFrio = 'Todos los cuartos';
      this.kilosDisponiblesSeleccionados = 0;
    },

    seleccionarProductoSalida(producto) {
      this.newSalida.producto = producto.nombre;
      this.newSalida.cuartoFrio = 'Todos los cuartos';
      this.actualizarKilosDisponiblesSeleccionados(producto);
    },
    actualizarKilosDisponiblesSeleccionados(productoRef = null) {
      const producto = productoRef || this.productosDelProveedorSeleccionado.find(p => p.nombre === this.newSalida.producto);
      if (!producto) {
        this.kilosDisponiblesSeleccionados = 0;
        return;
      }
      if (this.newSalida.cuartoFrio === 'Todos los cuartos') {
        this.kilosDisponiblesSeleccionados = producto.kilosDisponibles;
      } else {
        const cuarto = producto.cuartos.find(c => c.nombre === this.newSalida.cuartoFrio);
        this.kilosDisponiblesSeleccionados = cuarto ? cuarto.kilos : 0;
      }
    },
    normalizeCuarto(cuarto) {
      return cuarto && cuarto.trim() ? cuarto.trim() : 'Sin cuarto designado';
    },

    async addEntrada() {
      if (!this.isEntradaValida) return;

      const proveedorNombre = this.newEntrada.proveedor === '__nuevo__' 
        ? this.nuevoProveedorEntrada.trim()
        : this.newEntrada.proveedor;

      const productoNombre = this.newEntrada.producto === '__custom__'
        ? this.customProducto.trim()
        : this.newEntrada.producto;

      // Buscar precio de referencia si existe en las medidas
      let precioReferencia = this.newEntrada.precio;
      if (!precioReferencia && this.newEntrada.proveedor !== '__nuevo__') {
        const medidaEncontrada = this.medidasDelProveedorEntrada.find(m => m.nombre === productoNombre);
        if (medidaEncontrada && medidaEncontrada.precioReferencia) {
          precioReferencia = medidaEncontrada.precioReferencia;
        }
      }

      this.entradas.push({
        proveedor: proveedorNombre,
        producto: productoNombre,
        kilos: Number(this.newEntrada.kilos.toFixed(1)),
        precio: precioReferencia ? Number(precioReferencia.toFixed(2)) : null,
        cuartoFrio: this.normalizeCuarto(this.newEntrada.cuartoFrio)
      });

      // Agregar nuevo proveedor a la colección si es necesario
      if (this.newEntrada.proveedor === '__nuevo__' && 
          !this.proveedoresCrudos.find(p => p.nombre === proveedorNombre)) {
        try {
          const docData = {
            nombre: proveedorNombre,
            fechaCreacion: new Date(),
            tipo: 'crudos'
          };
          const docRef = await addDoc(collection(db, 'proveedoresCrudos'), docData);
          this.proveedoresCrudos.push({
            id: docRef.id,
            ...docData
          });
        } catch (error) {
          console.error('Error al agregar proveedor:', error);
        }
      }

      // Agregar nueva medida si es personalizada
      if (this.newEntrada.producto === '__custom__' && this.newEntrada.proveedor !== '__nuevo__') {
        const proveedorId = this.proveedoresCrudos.find(p => p.nombre === proveedorNombre)?.id;
        if (proveedorId && !this.medidasCrudos.find(m => m.nombre === productoNombre && m.proveedorId === proveedorId)) {
          try {
            const docData = {
              nombre: productoNombre,
              proveedorId: proveedorId,
              proveedorNombre: proveedorNombre,
              precioReferencia: precioReferencia || null,
              fechaCreacion: new Date(),
              tipo: 'crudos'
            };
            const docRef = await addDoc(collection(db, 'medidasCrudos'), docData);
            this.medidasCrudos.push({
              id: docRef.id,
              ...docData
            });
          } catch (error) {
            console.error('Error al agregar medida:', error);
          }
        }
      }

      this.resetProductoEntrada();
      await this.loadProductosDisponibles();
    },

    editarEntrada(index) {
      this.entradaEditIndex = index;
      const entrada = this.entradas[index];
      this.entradaEditData = {
        kilos: entrada.kilos,
        cuartoFrio: this.normalizeCuarto(entrada.cuartoFrio)
      };
      this.editandoEntrada = true;
    },
    cancelarEdicionEntrada() {
      this.editandoEntrada = false;
      this.entradaEditIndex = null;
      this.entradaEditData = { kilos: null, cuartoFrio: '' };
    },
    async guardarEdicionEntrada() {
      if (this.entradaEditIndex === null) return;
      const nuevaCantidad = Number(this.entradaEditData.kilos);
      if (!nuevaCantidad || nuevaCantidad <= 0) return;

      const entrada = this.entradas[this.entradaEditIndex];
      entrada.kilos = Number(nuevaCantidad.toFixed(1));
      entrada.cuartoFrio = this.normalizeCuarto(this.entradaEditData.cuartoFrio);

      this.cancelarEdicionEntrada();
      await this.loadProductosDisponibles();
    },

    addSalida() {
      if (!this.isSalidaValida) return;

      this.salidas.push({
        proveedor: this.newSalida.proveedor,
        producto: this.newSalida.producto,
        kilos: Number(this.newSalida.kilos.toFixed(1)),
        cuartoFrio: this.newSalida.cuartoFrio
      });

      this.resetProductoSalida();
      this.loadProductosDisponibles();
    },

    async removeEntrada(index) {
      this.entradas.splice(index, 1);
      await this.loadProductosDisponibles();
    },

    async removeSalida(index) {
      this.salidas.splice(index, 1);
      await this.loadProductosDisponibles();
    },

    formatNumber(value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    },

    formatearPrecio(precio) {
      return precio ? precio.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
    },

    async loadRegistro(id) {
      console.log("Cargando registro con ID:", id);
      const docRef = doc(db, 'existenciasCrudos', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        this.currentDate = moment(data.fecha.toDate());
        this.selectedDate = this.currentDate.format('YYYY-MM-DD');
        const normalizeCuarto = this.normalizeCuarto;
        this.entradas = (data.entradas || []).map(e => ({
          ...e,
          cuartoFrio: normalizeCuarto(e.cuartoFrio)
        }));
        this.salidas = (data.salidas || []).map(s => ({
          ...s,
          cuartoFrio: normalizeCuarto(s.cuartoFrio)
        }));
        this.registroId = id;
        this.isEditing = true;
        await this.loadProductosDisponibles();
      } else {
        console.log("No se encontró el documento con ID:", id);
      }
    },

    async saveReport() {
      try {
        if (!this.isEditing) {
          const existingQuery = query(
            collection(db, 'existenciasCrudos'),
            where('fecha', '>=', this.currentDate.clone().startOf('day').toDate()),
            where('fecha', '<=', this.currentDate.clone().endOf('day').toDate())
          );
          const existingSnapshot = await getDocs(existingQuery);
          
          if (!existingSnapshot.empty) {
            alert("Ya existe un registro para esta fecha. No se puede crear uno nuevo.");
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
          await updateDoc(doc(db, 'existenciasCrudos', this.registroId), reportData);
          alert("Registro de crudos actualizado exitosamente");
        } else {
          await addDoc(collection(db, 'existenciasCrudos'), reportData);
          alert("Registro de crudos guardado exitosamente");
        }
        
        this.$router.push('/existencias-crudos');
      } catch (error) {
        console.error("Error al guardar/actualizar el registro: ", error);
        alert("Error al guardar/actualizar el registro: " + error.message);
      }
    },

    updateCurrentDate() {
      this.currentDate = moment(this.selectedDate);
      this.loadProductosDisponibles();
    }
  },

  watch: {
    'newSalida.cuartoFrio'() {
      this.actualizarKilosDisponiblesSeleccionados();
    }
  },

  async created() {
    await Promise.all([
      this.loadProveedoresCrudos(),
      this.loadMedidasCrudos()
    ]);
    await this.loadProductosDisponibles();
    
    if (this.$route.params.id) {
      await this.loadRegistro(this.$route.params.id);
    }
    
    this.isLoaded = true;
  }
};
</script>

<style scoped>
.registro-crudos-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  background-color: #e8f0fe;
  border-radius: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.back-button-container {
  margin-bottom: 20px;
}

.date-header {
  text-align: center;
  color: #3760b0;
  font-size: 1.5em;
  margin-bottom: 20px;
}

.date-selector {
  text-align: center;
  margin-bottom: 30px;
}

.date-selector input {
  padding: 8px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.registro-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
}

.entradas-section,
.salidas-section {
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h3 {
  color: #3760b0;
  border-bottom: 2px solid #3760b0;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.form-section {
  margin-bottom: 20px;
}

.input-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.input-group select,
.input-group input,
.input-group button {
  flex: 1;
  min-width: 120px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}

.input-nuevo-proveedor {
  animation: slideDown 0.3s ease-in-out;
  background-color: #f0f8ff;
  border-color: #3760b0;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.productos-disponibles {
  margin: 20px 0;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.productos-disponibles h4 {
  color: #3760b0;
  margin-bottom: 15px;
}

.productos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.producto-card {
  background-color: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.producto-card:hover {
  border-color: #3760b0;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.producto-card.selected {
  border-color: #28a745;
  background-color: #f8fff9;
}

.producto-info h5 {
  margin: 0 0 8px 0;
  color: #3760b0;
  font-size: 14px;
}

.kilos-disponibles {
  margin: 5px 0;
  font-weight: bold;
  color: #28a745;
  font-size: 13px;
}

.ultimo-precio {
  margin: 5px 0 0 0;
  color: #666;
  font-size: 12px;
}

.salida-form {
  margin-top: 15px;
  padding: 15px;
  background-color: #f0f8ff;
  border-radius: 8px;
}

.disponibles-info {
  color: #3760b0;
  font-weight: bold;
  margin-top: 10px;
  font-size: 14px;
}

.list {
  list-style-type: none;
  padding: 0;
  margin-bottom: 20px;
}

.list li {
  background-color: #f8f9fa;
  margin-bottom: 8px;
  padding: 12px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 4px solid #3760b0;
}

.item-info {
  flex-grow: 1;
}

.precio-info {
  color: #28a745;
  font-weight: bold;
}

.total-info {
  color: #3760b0;
  font-weight: bold;
}

.delete-btn {
  background-color: transparent;
  color: #f44336;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  padding: 5px;
  border-radius: 3px;
  transition: background-color 0.3s;
}

.delete-btn:hover {
  background-color: #f44336;
  color: white;
}

.entry-actions {
  display: flex;
  gap: 8px;
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
  transform: scale(1.05);
}

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
  padding: 24px;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-info p {
  margin: 4px 0;
  color: #3760b0;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0;
}

.modal-form label {
  display: flex;
  flex-direction: column;
  font-weight: bold;
  color: #3760b0;
  gap: 6px;
}

.modal-form input,
.modal-form select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
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
  padding: 10px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-cancelar {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.total {
  font-weight: bold;
  color: #3760b0;
  font-size: 16px;
  text-align: right;
  padding: 10px;
  background-color: #f0f4f8;
  border-radius: 6px;
}

.summary {
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.summary h3 {
  color: #3760b0;
  margin-bottom: 15px;
}

.summary p {
  margin: 10px 0;
  font-size: 16px;
}

.save-button {
  display: block;
  width: 100%;
  padding: 15px;
  font-size: 1.2em;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.save-button:hover {
  background-color: #218838;
}

button {
  background-color: #3760b0;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover {
  background-color: #2a4a87;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.no-productos {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 20px;
}

@media (max-width: 1024px) {
  .registro-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .input-group {
    flex-direction: column;
  }

  .input-group select,
  .input-group input,
  .input-group button {
    width: 100%;
    min-width: unset;
  }

  .productos-grid {
    grid-template-columns: 1fr;
  }
}
</style> 