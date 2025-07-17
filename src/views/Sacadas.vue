<template>
  <div class="sacadas-container" v-if="isLoaded">
    <div class="back-button-container">
      <BackButton to="/sacadas" />
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
        </div>
        <p v-if="kilosDisponibles !== null" class="kilos-disponibles">
          Kilos disponibles: <span :class="{ 'low-stock': kilosDisponibles < 100 }">{{ formatNumber(kilosDisponibles) }} kg</span>
        </p>
        <ul class="list">
          <li v-for="(salida, index) in salidas" :key="'salida-' + index">
            {{ salida.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}: {{ salida.proveedor }} - {{ salida.medida }}{{ salida.precio ? ` ($${salida.precio})` : '' }}: {{ formatNumber(salida.kilos) }} kg
            <button @click="removeSalida(index)" class="delete-btn">&times;</button>
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
            {{ entrada.tipo === 'maquila' ? 'Maquila' : 'Proveedor' }}: {{ entrada.proveedor }} - {{ entrada.medida }}{{ entrada.precio ? ` ($${entrada.precio})` : '' }}: {{ formatNumber(entrada.kilos) }} kg
            <button @click="removeEntrada(index)" class="delete-btn">&times;</button>
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
      newEntrada: { tipo: 'proveedor', proveedor: '', medida: '', kilos: null, precio: null },
      newSalida: { tipo: 'proveedor', proveedor: '', medida: '', kilos: null },
      isEditing: false,
      sacadaId: null,
      isLoaded: false,
      kilosDisponibles: null
    };
  },
  computed: {
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
    filteredMedidasSalida() {
      if (this.newSalida.tipo === 'maquila') {
        const maquila = this.proveedores.find(p => p.nombre === this.newSalida.proveedor);
        return maquila ? this.medidas.filter(m => m.tipo === 'maquila' && m.maquilaId === maquila.id).sort((a, b) => a.nombre.localeCompare(b.nombre)) : [];
      } else {
        const proveedor = this.proveedores.find(p => p.nombre === this.newSalida.proveedor);
        if (!proveedor) return [];

        // Solo usar las medidas con precio que tienen existencias
        return this.medidasConPrecio.sort((a, b) => {
          const getMedidaBase = (nombre) => nombre.split(' ')[0];
          return getMedidaBase(a.nombre).localeCompare(getMedidaBase(b.nombre));
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
    },
    async addEntrada() {
      if (this.newEntrada.tipo && this.newEntrada.proveedor && this.newEntrada.medida && this.newEntrada.kilos) {
        this.entradas.push({
          tipo: this.newEntrada.tipo,
          proveedor: this.newEntrada.proveedor,
          medida: this.newEntrada.medida,
          kilos: Number(this.newEntrada.kilos.toFixed(1)),
          precio: this.newEntrada.precio ? Number(this.newEntrada.precio.toFixed(2)) : null
        });
        this.newEntrada = { tipo: 'proveedor', proveedor: '', medida: '', kilos: null, precio: null };
        await this.updateKilosDisponibles();
      }
    },
    async addSalida() {
      if (this.isSalidaValid && this.newSalida.kilos <= this.kilosDisponibles) {
        // Extraer precio y medida base del formato del dropdown
        let precio = null;
        let medidaBase = this.newSalida.medida;
        let medidaParaParsear = this.newSalida.medida;
        
        // Primero, quitar el emoji si existe
        if (medidaParaParsear.startsWith('🕐 ')) {
          medidaParaParsear = medidaParaParsear.substring(2).trim();
        }
        
        // Si contiene " ($" es una medida con precio
        if (medidaParaParsear.includes(' ($')) {
          const precioMatch = medidaParaParsear.match(/\(\$(\d+(?:\.\d+)?)\)/);
          if (precioMatch) {
            precio = Number(precioMatch[1]);
            medidaBase = medidaParaParsear.split(' ($')[0];
          }
        } else if (medidaParaParsear.includes(' - (')) {
          // Si contiene " - (" es una medida sin precio o con fecha
          medidaBase = medidaParaParsear.split(' - (')[0];
          precio = null;
        }

        this.salidas.push({
          tipo: this.newSalida.tipo,
          proveedor: this.newSalida.proveedor,
          medida: medidaBase,
          precio: precio,
          kilos: Number(this.newSalida.kilos.toFixed(1))
        });
        this.newSalida = { tipo: 'proveedor', proveedor: '', medida: '', kilos: null };
        await this.updateKilosDisponibles();
      } else if (this.newSalida.kilos > this.kilosDisponibles) {
        alert(`No hay suficientes kilos disponibles. Kilos disponibles: ${this.kilosDisponibles.toFixed(1)} kg`);
      }
    },
    async updateKilosDisponibles() {
      if (this.newSalida.proveedor && this.newSalida.medida) {
        console.log(`[UPDATE] Actualizando kilos disponibles:`);
        console.log(`  Proveedor: "${this.newSalida.proveedor}"`);
        console.log(`  Medida seleccionada: "${this.newSalida.medida}"`);
        this.kilosDisponibles = await this.getKilosDisponibles(this.newSalida.proveedor, this.newSalida.medida);
        console.log(`  Kilos disponibles calculados: ${this.kilosDisponibles}`);
      } else {
        console.log('[UPDATE] No se puede actualizar kilos disponibles: falta proveedor o medida');
        console.log(`  Proveedor: "${this.newSalida.proveedor}"`);
        console.log(`  Medida: "${this.newSalida.medida}"`);
        this.kilosDisponibles = null;
      }
    },
    async getKilosDisponibles(proveedor, medida) {
      let kilosDisponibles = 0;
      let totalEntradas = 0;
      let totalSalidas = 0;

      // Extraer precio correctamente del formato de display
      let precio = null;
      let medidaBase = medida;
      
      // Primero, quitar el emoji si existe
      if (medida.startsWith('🕐 ')) {
        medida = medida.substring(2).trim();
      }
      
      // Si la medida contiene " ($" significa que tiene precio
      if (medida.includes(' ($')) {
        const precioMatch = medida.match(/\(\$(\d+(?:\.\d+)?)\)/);
        if (precioMatch) {
          precio = Number(precioMatch[1]);
          medidaBase = medida.split(' ($')[0];
        }
      } else if (medida.includes(' - (')) {
        // Si contiene " - (" pero no " ($", es una fecha o "Sin precio"
        medidaBase = medida.split(' - (')[0];
        precio = null;
      }

      const sacadasRef = collection(db, 'sacadas');
      const querySnapshot = await getDocs(sacadasRef);

      const sacadasOrdenadas = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.fecha.toDate() - b.fecha.toDate());

      console.log(`Calculando kilos disponibles para ${proveedor} - Medida original: "${medida}"`);
      console.log(`Medida base parseada: "${medidaBase}", Precio: ${precio}`);
      console.log(`Fecha actual: ${this.currentDate.format('YYYY-MM-DD')}`);

      const fechaActual = this.currentDate.clone().endOf('day');
      sacadasOrdenadas.forEach((sacada) => {
        const sacadaFecha = sacada.fecha instanceof Date ? sacada.fecha : sacada.fecha.toDate();
        
        if (moment(sacadaFecha).isSameOrBefore(fechaActual)) {
          console.log(`Procesando sacada del ${moment(sacadaFecha).format('YYYY-MM-DD')}`);
          
          sacada.entradas.forEach(entrada => {
            // Comparar medida y precio correctamente
            const medidaCoincide = entrada.proveedor === proveedor && entrada.medida === medidaBase;
            const precioCoincide = precio === null ? 
              (entrada.precio === null || entrada.precio === undefined) : 
              entrada.precio === precio;
              
            if (medidaCoincide && precioCoincide) {
              kilosDisponibles += entrada.kilos;
              totalEntradas += entrada.kilos;
              console.log(`  ✅ Entrada coincide: +${entrada.kilos} kg (medida: ${entrada.medida}, precio: ${entrada.precio || 'sin precio'})`);
            } else if (entrada.proveedor === proveedor && entrada.medida === medidaBase) {
              console.log(`  ❌ Entrada NO coincide por precio: ${entrada.kilos} kg (medida: ${entrada.medida}, precio entrada: ${entrada.precio}, precio buscado: ${precio})`);
            }
          });

          sacada.salidas.forEach(salida => {
            // Comparar medida y precio correctamente
            const medidaCoincide = salida.proveedor === proveedor && salida.medida === medidaBase;
            const precioCoincide = precio === null ? 
              (salida.precio === null || salida.precio === undefined) : 
              salida.precio === precio;
              
            if (medidaCoincide && precioCoincide) {
              kilosDisponibles -= salida.kilos;
              totalSalidas += salida.kilos;
              console.log(`  ✅ Salida coincide: -${salida.kilos} kg (medida: ${salida.medida}, precio: ${salida.precio || 'sin precio'})`);
            } else if (salida.proveedor === proveedor && salida.medida === medidaBase) {
              console.log(`  ❌ Salida NO coincide por precio: ${salida.kilos} kg (medida: ${salida.medida}, precio salida: ${salida.precio}, precio buscado: ${precio})`);
            }
          });

          console.log(`  Subtotal hasta ${moment(sacadaFecha).format('DD/MM/YYYY')}: ${kilosDisponibles.toFixed(1)} kg`);
        }
      });

      console.log(`\n📊 RESUMEN FINAL:`);
      console.log(`  Total entradas: ${totalEntradas.toFixed(1)} kg`);
      console.log(`  Total salidas: ${totalSalidas.toFixed(1)} kg`);
      console.log(`  Kilos disponibles: ${kilosDisponibles.toFixed(1)} kg`);

      return Number(kilosDisponibles.toFixed(1));
    },
    async removeEntrada(index) {
      this.entradas.splice(index, 1);
      await this.updateKilosDisponibles();
    },
    async removeSalida(index) {
      this.salidas.splice(index, 1);
      await this.updateKilosDisponibles();
    },
    formatNumber(value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    },
    async loadSacada(id) {
      console.log("Cargando sacada con ID:", id);
      const docRef = doc(db, 'sacadas', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        console.log("Documento encontrado:", docSnap.data());
        const data = docSnap.data();
        this.currentDate = moment(data.fecha.toDate());
        console.log("Fecha cargada:", this.currentDate);
        this.entradas = data.entradas || [];
        console.log("Entradas cargadas:", this.entradas);
        this.salidas = data.salidas || [];
        console.log("Salidas cargadas:", this.salidas);
        this.sacadaId = id;
        this.isEditing = true;
        await this.updateKilosDisponibles();
      } else {
        console.log("No se encontró el documento con ID:", id);
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
      let fechaActual = this.currentDate.clone().endOf('day');

      // Obtenemos las sacadas anteriores
      const sacadasRef = collection(db, 'sacadas');
      const querySnapshot = await getDocs(sacadasRef);
      const sacadasOrdenadas = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.fecha.toDate() - b.fecha.toDate());

      // Función para actualizar el balance de una medida y rastrear fechas
      const actualizarBalance = (medida, precio, kilos, fecha, esEntrada = true) => {
        // Normalizar precio: undefined se convierte en null
        const precioNormalizado = precio !== null && precio !== undefined ? precio : null;
        const medidaKey = precioNormalizado !== null ? `${medida} ($${precioNormalizado})` : medida;
        
        console.log(`[DEBUG] actualizarBalance - medida: ${medida}, precio original: ${precio}, precio normalizado: ${precioNormalizado}, medidaKey: ${medidaKey}`);
        
        if (!medidasDisponibles.has(medidaKey)) {
          medidasDisponibles.set(medidaKey, {
            medida: medida,
            precio: precioNormalizado,
            kilos: 0,
            nombre: medidaKey, // Este ya está construido correctamente con precioNormalizado
            primeraFecha: null,
            esElMasAntiguo: false
          });
        }
        
        const datos = medidasDisponibles.get(medidaKey);
        datos.kilos += esEntrada ? kilos : -kilos;
        
        // Rastrear la fecha de la primera entrada con este precio (solo si tiene precio)
        if (esEntrada && precioNormalizado !== null && (datos.primeraFecha === null || fecha < datos.primeraFecha)) {
          datos.primeraFecha = fecha;
        }
      };

      // Procesar todas las sacadas anteriores hasta la fecha actual
      sacadasOrdenadas.forEach(sacada => {
        const sacadaFecha = sacada.fecha instanceof Date ? sacada.fecha : sacada.fecha.toDate();
        
        if (moment(sacadaFecha).isSameOrBefore(fechaActual)) {
          sacada.entradas.forEach(entrada => {
            if (entrada.proveedor === proveedor) {
              console.log(`[DEBUG] Procesando entrada: ${entrada.medida}, precio: ${entrada.precio} (tipo: ${typeof entrada.precio})`);
              actualizarBalance(entrada.medida, entrada.precio, entrada.kilos, sacadaFecha, true);
            }
          });

          sacada.salidas.forEach(salida => {
            if (salida.proveedor === proveedor) {
              console.log(`[DEBUG] Procesando salida: ${salida.medida}, precio: ${salida.precio} (tipo: ${typeof salida.precio})`);
              actualizarBalance(salida.medida, salida.precio, salida.kilos, sacadaFecha, false);
            }
          });
        }
      });

      // Procesar entradas y salidas del día actual
      this.entradas.forEach(entrada => {
        if (entrada.proveedor === proveedor) {
          const fechaActual = this.currentDate.toDate();
          actualizarBalance(entrada.medida, entrada.precio, entrada.kilos, fechaActual, true);
        }
      });

      this.salidas.forEach(salida => {
        if (salida.proveedor === proveedor) {
          const fechaActual = this.currentDate.toDate();
          actualizarBalance(salida.medida, salida.precio, salida.kilos, fechaActual, false);
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
          // Encontrar el más antiguo
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
          console.log(`[DEBUG] Construyendo nombre para medida: ${datos.medida}, precio: ${datos.precio}, kilos: ${datos.kilos}`);
          
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
            // Indicar claramente que no tiene precio
            nombreDisplay = `${datos.medida} - (Sin precio)`;
          }
          
          console.log(`[DEBUG] Nombre final construido: ${nombreDisplay}`);

          medidasConPrecio.push({
            id: datos.nombre,
            nombre: nombreDisplay,
            nombreOriginal: datos.nombre,
            tipo: 'general',
            precio: datos.precio,
            kilos: datos.kilos,
            primeraFecha: datos.primeraFecha,
            esElMasAntiguo: datos.esElMasAntiguo || false
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
        
        // Si es la misma medida base, priorizar las sin precio primero
        if (a.precio === null && b.precio !== null) return -1;
        if (a.precio !== null && b.precio === null) return 1;
        
        // Si ambas tienen precio, ordenar por fecha (más antiguo primero)
        if (a.primeraFecha && b.primeraFecha) {
          return a.primeraFecha - b.primeraFecha;
        }
        
        return 0;
      });
    },
  },
  async created() {
    await this.loadProveedores();
    await this.loadMedidas();
    if (this.$route.params.id) {
      console.log("ID de la ruta encontrado:", this.$route.params.id);
      await this.loadSacada(this.$route.params.id);
    } else {
      console.log("No se encontró ID en la ruta");
    }
    this.isLoaded = true;
  },
  watch: {
    'newSalida.proveedor': 'updateKilosDisponibles',
    'newSalida.medida': 'updateKilosDisponibles',
    'newSalida.kilos': 'updateKilosDisponibles',
    async 'newSalida.proveedor'(newProveedor) {
      this.updateKilosDisponibles();
      if (newProveedor && this.newSalida.tipo === 'proveedor') {
        this.medidasConPrecio = await this.getMedidasConPrecio(newProveedor);
      } else {
        this.medidasConPrecio = [];
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

@media (max-width: 768px) {
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

  .medidas-summary {
    font-size: 14px;
  }
  
  .medidas-summary th,
  .medidas-summary td {
    padding: 6px;
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
</style>


