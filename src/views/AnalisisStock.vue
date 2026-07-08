<template>
  <div class="analisis-stock-page">
    <div class="analisis-stock-container">
      <div class="header">
        <div class="header-left">
          <BackButton to="/existencias" />
          <h1>Análisis de Stock</h1>
        </div>
      </div>

      <div class="form-card">
        <h2>Recomendación de Compra</h2>
        <p class="form-descripcion">
          Ingresa cuántos kilos puedes comprar y el proveedor; la distribución por medida se
          calcula con el historial de salidas de los últimos {{ diasHistorial }} días.
        </p>
        <div class="form-grid">
          <label>
            Kilos a comprar
            <input
              v-model.number="kilosDisponibles"
              type="number"
              inputmode="decimal"
              min="0"
              step="100"
              placeholder="Ej: 14,000"
            />
          </label>
          <label>
            Proveedor
            <select v-model="proveedorSeleccionado" @change="cargarMedidasProveedor">
              <option value="">Seleccionar proveedor</option>
              <option v-for="prov in proveedores" :key="prov" :value="prov">
                {{ prov }}
              </option>
            </select>
          </label>
          <label>
            Días de historial
            <select v-model.number="diasHistorial">
              <option :value="10">10 días</option>
              <option :value="15">15 días</option>
              <option :value="30">30 días</option>
              <option :value="60">60 días</option>
              <option :value="90">90 días</option>
            </select>
          </label>
          <button
            class="calcular-btn"
            :disabled="!puedeCalcular || cargando"
            @click="calcular"
          >
            {{ cargando ? 'Calculando...' : 'Calcular Distribución' }}
          </button>
        </div>

        <div class="medidas-selector">
          <div class="medidas-selector-header">
            <span>Medidas a incluir{{ proveedorSeleccionado ? ` — ${proveedorSeleccionado}` : '' }}</span>
            <div v-if="medidasDisponibles.length > 0" class="medidas-selector-acciones">
              <button type="button" @click="medidasSeleccionadas = medidasDisponibles.map(m => m.nombre)">
                Todas
              </button>
              <button type="button" @click="medidasSeleccionadas = []">
                Ninguna
              </button>
            </div>
          </div>

          <div v-if="cargandoMedidas" class="medidas-mensaje">Cargando medidas...</div>
          <div v-else-if="!proveedorSeleccionado" class="medidas-mensaje">
            Selecciona un proveedor para ver sus medidas disponibles.
          </div>
          <div v-else-if="medidasDisponibles.length === 0" class="medidas-mensaje">
            No se encontraron medidas para este proveedor.
          </div>
          <div v-else class="medidas-checkbox-grid">
            <label v-for="medida in medidasDisponibles" :key="medida.nombre" class="medida-checkbox">
              <input type="checkbox" :value="medida.nombre" v-model="medidasSeleccionadas" />
              <span class="medida-nombre">{{ medida.nombre }}</span>
              <span class="medida-stock-hint">{{ formatNumber(medida.stockActual) }} kg</span>
            </label>
          </div>
        </div>
      </div>

      <div v-if="error" class="error-box">{{ error }}</div>

      <div v-if="resultado" class="resultado-card">
        <h2>Distribución recomendada — {{ resultado.proveedor }}</h2>
        <p class="resultado-info">
          Basado en <strong>{{ formatNumber(resultado.totalVendido) }} kg</strong> de salidas
          entre el {{ resultado.fechaInicio }} y el {{ resultado.fechaFin }}
          ({{ resultado.diasHistorial }} días).
        </p>

        <div v-if="resultado.filas.length === 0" class="sin-datos">
          No se encontraron salidas de {{ resultado.proveedor }} en los últimos
          {{ resultado.diasHistorial }} días, así que no hay demanda con la cual distribuir.
        </div>

        <div v-else class="tabla-wrapper">
          <table class="resultado-tabla">
            <thead>
              <tr>
                <th>Medida</th>
                <th class="num">Vendido ({{ resultado.diasHistorial }}d)</th>
                <th class="num">% Demanda</th>
                <th class="num compra-col">Compra recomendada</th>
                <th class="num">Stock actual</th>
                <th class="num">Stock post-compra</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="fila in resultado.filas" :key="fila.medida">
                <td>{{ fila.medida }}</td>
                <td class="num">{{ formatNumber(fila.vendido) }} kg</td>
                <td class="num">{{ fila.porcentaje.toFixed(1) }}%</td>
                <td class="num compra-col"><strong>{{ formatNumber(fila.compra) }} kg</strong></td>
                <td class="num" :class="{ 'stock-negativo': fila.stockActual < 0 }">
                  {{ formatNumber(fila.stockActual) }} kg
                </td>
                <td class="num"><strong>{{ formatNumber(fila.stockPostCompra) }} kg</strong></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td class="num"><strong>{{ formatNumber(resultado.totalVendido) }} kg</strong></td>
                <td class="num"><strong>100%</strong></td>
                <td class="num compra-col"><strong>{{ formatNumber(resultado.totalCompra) }} kg</strong></td>
                <td class="num"><strong>{{ formatNumber(resultado.totalStockActual) }} kg</strong></td>
                <td class="num"><strong>{{ formatNumber(resultado.totalStockActual + resultado.totalCompra) }} kg</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div v-if="resultado.sinVentas.length > 0" class="sin-ventas-card">
          <h3>Medidas con stock pero sin ventas recientes</h3>
          <p class="sin-ventas-info">
            Estas medidas de {{ resultado.proveedor }} tienen existencias pero no registraron
            salidas en los últimos {{ resultado.diasHistorial }} días (no se les asignó compra):
          </p>
          <ul>
            <li v-for="item in resultado.sinVentas" :key="item.medida">
              {{ item.medida }}: <strong>{{ formatNumber(item.stockActual) }} kg</strong>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import moment from 'moment';
import BackButton from '@/components/BackButton.vue';
import { formatNumber } from '@/utils/formatters';

export default {
  name: 'AnalisisStock',
  components: {
    BackButton
  },
  data() {
    return {
      kilosDisponibles: null,
      proveedorSeleccionado: '',
      diasHistorial: 30,
      proveedores: [],
      proveedoresObjetos: [],
      medidasDisponibles: [],
      medidasSeleccionadas: [],
      cargandoMedidas: false,
      cargando: false,
      error: '',
      resultado: null
    };
  },
  computed: {
    puedeCalcular() {
      return this.proveedorSeleccionado &&
             this.kilosDisponibles &&
             this.kilosDisponibles > 0 &&
             this.medidasSeleccionadas.length > 0;
    }
  },
  methods: {
    formatNumber,

    parseFechaSacada(fecha) {
      if (!fecha) return null;
      if (fecha instanceof Date) return fecha;
      if (typeof fecha.toDate === 'function') return fecha.toDate();
      const d = new Date(fecha);
      return isNaN(d.getTime()) ? null : d;
    },

    coincideProveedor(proveedorMovimiento, proveedorBuscado) {
      return String(proveedorMovimiento || '')
        .toLowerCase()
        .includes(String(proveedorBuscado || '').toLowerCase());
    },

    async loadProveedores() {
      try {
        const querySnapshot = await getDocs(collection(db, 'proveedores'));
        this.proveedoresObjetos = querySnapshot.docs
          .map(docItem => ({ id: docItem.id, ...docItem.data() }))
          .filter(p => p.tipo === 'proveedor' && p.nombre)
          .sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.proveedores = this.proveedoresObjetos.map(p => p.nombre);
      } catch (error) {
        console.error('Error al cargar proveedores:', error);
        this.proveedoresObjetos = [];
        this.proveedores = [];
      }
    },

    // Lee la colección 'sacadas' una vez y calcula, para el proveedor dado,
    // el stock actual por medida (entradas - salidas de todo el histórico) y,
    // si se pasan fechas, la demanda (salidas) dentro de ese periodo.
    async obtenerMovimientosProveedor(proveedorNombre, fechaInicio, fechaFin) {
      const snapshot = await getDocs(collection(db, 'sacadas'));
      const demandaPorMedida = {};
      const stockPorMedida = {};
      let totalVendido = 0;

      snapshot.docs.forEach(docSnap => {
        const sacada = docSnap.data();
        const fecha = this.parseFechaSacada(sacada.fecha);
        if (!fecha) return;
        const enPeriodo = fechaInicio && fechaFin
          ? moment(fecha).isBetween(fechaInicio, fechaFin, undefined, '[]')
          : false;

        (sacada.entradas || []).forEach(entrada => {
          if (!this.coincideProveedor(entrada.proveedor, proveedorNombre)) return;
          const medida = String(entrada.medida || '').trim();
          if (!medida) return;
          stockPorMedida[medida] = (stockPorMedida[medida] || 0) + (Number(entrada.kilos) || 0);
        });

        (sacada.salidas || []).forEach(salida => {
          if (!this.coincideProveedor(salida.proveedor, proveedorNombre)) return;
          const medida = String(salida.medida || '').trim();
          if (!medida) return;
          const kilos = Number(salida.kilos) || 0;

          stockPorMedida[medida] = (stockPorMedida[medida] || 0) - kilos;

          if (enPeriodo && kilos > 0) {
            demandaPorMedida[medida] = (demandaPorMedida[medida] || 0) + kilos;
            totalVendido += kilos;
          }
        });
      });

      return { demandaPorMedida, stockPorMedida, totalVendido };
    },

    async cargarMedidasProveedor() {
      this.medidasDisponibles = [];
      this.medidasSeleccionadas = [];
      this.resultado = null;
      this.error = '';

      if (!this.proveedorSeleccionado) return;

      this.cargandoMedidas = true;
      try {
        const proveedorObj = this.proveedoresObjetos.find(p => p.nombre === this.proveedorSeleccionado);
        const nombresCatalogo = new Set();

        if (proveedorObj) {
          const medidasSnapshot = await getDocs(collection(db, 'medidas'));
          medidasSnapshot.docs.forEach(docSnap => {
            const medida = docSnap.data();
            if (medida.proveedorId === proveedorObj.id && medida.nombre) {
              nombresCatalogo.add(String(medida.nombre).trim());
            }
          });
        }

        const { stockPorMedida } = await this.obtenerMovimientosProveedor(this.proveedorSeleccionado, null, null);
        Object.keys(stockPorMedida).forEach(medida => nombresCatalogo.add(medida));

        const lista = Array.from(nombresCatalogo)
          .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
          .map(nombre => ({
            nombre,
            stockActual: Number((stockPorMedida[nombre] || 0).toFixed(1))
          }));

        this.medidasDisponibles = lista;
        // Por default, seleccionar las medidas que tenemos en existencia actual
        this.medidasSeleccionadas = lista.filter(m => m.stockActual > 1).map(m => m.nombre);
      } catch (error) {
        console.error('Error al cargar medidas del proveedor:', error);
        this.medidasDisponibles = [];
        this.medidasSeleccionadas = [];
      } finally {
        this.cargandoMedidas = false;
      }
    },

    // Reparte totalKilos en bloques de "bloque" kg entre las filas, en
    // proporción a su demanda, usando el método de restos mayores para que
    // cada compra sea un múltiplo cerrado y la suma cuadre con totalKilos.
    distribuirEnMultiplos(filas, totalKilos, bloque = 500) {
      const totalBloques = Math.round(totalKilos / bloque);

      if (filas.length === 0 || totalBloques <= 0) {
        return filas.map(fila => ({ ...fila, compra: 0 }));
      }

      const totalDemanda = filas.reduce((sum, fila) => sum + fila.vendido, 0);

      if (totalDemanda <= 0) {
        const base = Math.floor(totalBloques / filas.length);
        const resto = totalBloques % filas.length;
        return filas.map((fila, index) => ({
          ...fila,
          compra: (base + (index < resto ? 1 : 0)) * bloque
        }));
      }

      const conBloques = filas.map(fila => {
        const exacto = (fila.vendido / totalDemanda) * totalBloques;
        return { ...fila, bloquesExactos: exacto, bloques: Math.floor(exacto) };
      });

      const asignados = conBloques.reduce((sum, fila) => sum + fila.bloques, 0);
      const restantes = totalBloques - asignados;

      const ordenResiduo = [...conBloques].sort(
        (a, b) => (b.bloquesExactos - b.bloques) - (a.bloquesExactos - a.bloques)
      );
      for (let i = 0; i < restantes; i += 1) {
        ordenResiduo[i % ordenResiduo.length].bloques += 1;
      }

      return conBloques.map(({ bloquesExactos, bloques, ...resto }) => ({
        ...resto,
        compra: bloques * bloque
      }));
    },

    async calcular() {
      if (!this.puedeCalcular || this.cargando) return;
      this.cargando = true;
      this.error = '';
      this.resultado = null;

      try {
        const proveedor = this.proveedorSeleccionado;
        const dias = this.diasHistorial;
        const fechaInicio = moment().subtract(dias, 'days').startOf('day');
        const fechaFin = moment().endOf('day');

        const { demandaPorMedida, stockPorMedida } = await this.obtenerMovimientosProveedor(
          proveedor, fechaInicio, fechaFin
        );

        const seleccionadas = new Set(this.medidasSeleccionadas);
        const kilosAComprar = Number(this.kilosDisponibles) || 0;

        const filasBase = Object.entries(demandaPorMedida)
          .filter(([medida]) => seleccionadas.has(medida))
          .map(([medida, vendido]) => ({ medida, vendido: Number(vendido.toFixed(1)) }));

        const totalVendido = filasBase.reduce((sum, fila) => sum + fila.vendido, 0);

        // Compra recomendada en múltiplos cerrados de 500 kg
        const filas = this.distribuirEnMultiplos(filasBase, kilosAComprar, 500)
          .map(fila => {
            const stockActual = Number((stockPorMedida[fila.medida] || 0).toFixed(1));
            return {
              medida: fila.medida,
              vendido: fila.vendido,
              porcentaje: totalVendido > 0 ? (fila.vendido / totalVendido) * 100 : 0,
              compra: fila.compra,
              stockActual,
              stockPostCompra: Number((stockActual + fila.compra).toFixed(1))
            };
          })
          .sort((a, b) => b.vendido - a.vendido);

        // Medidas seleccionadas sin demanda en el periodo: no reciben compra,
        // pero se muestran aparte para que no queden ocultas.
        const sinVentas = this.medidasSeleccionadas
          .filter(medida => !demandaPorMedida[medida])
          .map(medida => ({ medida, stockActual: Number((stockPorMedida[medida] || 0).toFixed(1)) }))
          .sort((a, b) => b.stockActual - a.stockActual);

        this.resultado = {
          proveedor,
          diasHistorial: dias,
          fechaInicio: fechaInicio.format('DD/MM/YYYY'),
          fechaFin: fechaFin.format('DD/MM/YYYY'),
          totalVendido: Number(totalVendido.toFixed(1)),
          totalCompra: filas.reduce((sum, fila) => sum + fila.compra, 0),
          totalStockActual: Number(
            filas.reduce((sum, fila) => sum + fila.stockActual, 0).toFixed(1)
          ),
          filas,
          sinVentas
        };
      } catch (error) {
        console.error('Error al calcular la distribución:', error);
        this.error = 'No se pudo calcular la distribución: ' + error.message;
      } finally {
        this.cargando = false;
      }
    }
  },
  async created() {
    await this.loadProveedores();
  }
};
</script>

<style scoped>
.analisis-stock-page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
}

.analisis-stock-container {
  max-width: 1100px;
  width: 100%;
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

h1 {
  color: #2c3e50;
  margin: 0;
  font-size: 24px;
}

h2 {
  color: #2c3e50;
  margin: 0 0 10px 0;
  font-size: 20px;
  border-bottom: 2px solid #3498db;
  padding-bottom: 8px;
}

.form-card,
.resultado-card {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.form-descripcion {
  color: #666;
  margin: 0 0 15px 0;
  font-size: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  align-items: end;
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: bold;
  color: #2c3e50;
  font-size: 14px;
}

.form-grid input,
.form-grid select {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 16px;
  background-color: white;
}

.medidas-selector {
  margin-top: 18px;
  padding-top: 15px;
  border-top: 1px solid #dee2e6;
}

.medidas-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  font-weight: bold;
  color: #2c3e50;
  font-size: 14px;
}

.medidas-selector-acciones {
  display: flex;
  gap: 8px;
}

.medidas-selector-acciones button {
  background: none;
  border: 1px solid #3498db;
  color: #3498db;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
}

.medidas-selector-acciones button:hover {
  background-color: #3498db;
  color: white;
}

.medidas-mensaje {
  color: #666;
  font-size: 14px;
  font-style: italic;
  padding: 10px 0;
}

.medidas-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
  padding: 4px;
}

.medida-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  padding: 8px 10px;
  cursor: pointer;
  font-size: 14px;
}

.medida-checkbox input {
  flex-shrink: 0;
  accent-color: #3498db;
}

.medida-nombre {
  flex: 1;
  color: #2c3e50;
}

.medida-stock-hint {
  color: #888;
  font-size: 12px;
  white-space: nowrap;
}

.calcular-btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.3s;
}

.calcular-btn:hover {
  background-color: #2980b9;
}

.calcular-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.error-box {
  background-color: #fff1f0;
  border: 1px solid #f44336;
  color: #c62828;
  border-radius: 8px;
  padding: 12px 15px;
  margin-bottom: 20px;
  font-weight: bold;
}

.resultado-info {
  color: #555;
  margin: 0 0 15px 0;
  font-size: 14px;
}

.sin-datos {
  text-align: center;
  color: #666;
  padding: 20px;
  font-style: italic;
}

.tabla-wrapper {
  overflow-x: auto;
}

.resultado-tabla {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
  font-size: 15px;
}

.resultado-tabla th,
.resultado-tabla td {
  border: 1px solid #dee2e6;
  padding: 10px 12px;
  text-align: left;
}

.resultado-tabla th {
  background-color: #2c3e50;
  color: white;
}

.resultado-tabla .num {
  text-align: right;
}

.resultado-tabla tbody tr:nth-child(even) {
  background-color: #f8f9fa;
}

.resultado-tabla .compra-col {
  background-color: rgba(52, 152, 219, 0.08);
  color: #2c3e50;
}

.resultado-tabla th.compra-col {
  background-color: #3498db;
  color: white;
}

.resultado-tabla tfoot td {
  background-color: #ecf0f1;
  border-top: 2px solid #2c3e50;
}

.stock-negativo {
  color: #c62828;
  font-weight: bold;
}

.sin-ventas-card {
  margin-top: 20px;
  padding: 15px;
  background-color: #fff8e6;
  border: 1px solid #e6a700;
  border-radius: 8px;
}

.sin-ventas-card h3 {
  color: #8a6d00;
  margin: 0 0 8px 0;
  font-size: 16px;
}

.sin-ventas-info {
  color: #666;
  font-size: 13px;
  margin: 0 0 10px 0;
}

.sin-ventas-card ul {
  margin: 0;
  padding-left: 20px;
  columns: 2;
}

.sin-ventas-card li {
  margin-bottom: 4px;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .sin-ventas-card ul {
    columns: 1;
  }
}
</style>
