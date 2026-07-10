<template>
  <div class="analisis-stock-page">
    <div class="analisis-stock-container">
      <div class="header">
        <div class="header-left">
          <BackButton to="/existencias" />
          <h1>Análisis de Stock</h1>
        </div>
      </div>

      <div class="vista-tabs">
        <button
          type="button"
          class="vista-tab-btn"
          :class="{ active: vistaActiva === 'plan' }"
          @click="seleccionarVista('plan')"
        >
          📦 Plan de Compra
        </button>
        <button
          type="button"
          class="vista-tab-btn"
          :class="{ active: vistaActiva === 'consulta' }"
          @click="seleccionarVista('consulta')"
        >
          🔍 Consultar una Medida
        </button>
        <button
          type="button"
          class="vista-tab-btn"
          :class="{ active: vistaActiva === 'asesor' }"
          @click="seleccionarVista('asesor')"
        >
          🦐 Asesor Experto
        </button>
      </div>

      <template v-if="vistaActiva === 'plan'">
      <div class="form-card" key="plan-form-card">
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

        <div class="modo-selector">
          <span class="modo-selector-label">Modo de cálculo</span>
          <div class="modo-opciones">
            <label class="modo-opcion" :class="{ active: modo === 'demanda' }">
              <input type="radio" value="demanda" v-model="modo" />
              <span>
                <strong>Por demanda (simple)</strong>
                <small>Proporcional al % de ventas de cada medida</small>
              </span>
            </label>
            <label class="modo-opcion" :class="{ active: modo === 'cobertura' }">
              <input type="radio" value="cobertura" v-model="modo" />
              <span>
                <strong>Por días de cobertura (recomendado)</strong>
                <small>Prioriza medidas con menos días de stock según su consumo diario</small>
              </span>
            </label>
          </div>
          <label v-if="modo === 'cobertura'" class="meta-dias-label">
            Meta de días de cobertura
            <input
              v-model.number="metaDiasCobertura"
              type="number"
              inputmode="decimal"
              min="1"
              step="1"
            />
          </label>
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
          <template v-if="resultado.modo === 'cobertura'">
            Meta de cobertura: <strong>{{ resultado.metaDiasCobertura }} días</strong>.
          </template>
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
                <template v-if="resultado.modo === 'demanda'">
                  <th class="num">% Demanda</th>
                </template>
                <template v-else>
                  <th class="num">Consumo diario</th>
                  <th class="num">Te dura el stock</th>
                  <th class="num">Te falta para {{ resultado.metaDiasCobertura }}d</th>
                </template>
                <th class="num compra-col">Compra recomendada</th>
                <th class="num">Stock actual</th>
                <th class="num">Stock post-compra</th>
                <th v-if="resultado.modo === 'cobertura'" class="num">Cobertura resultante</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="fila in resultado.filas" :key="fila.medida">
                <td>{{ fila.medida }}</td>
                <td class="num">{{ formatNumber(fila.vendido) }} kg</td>
                <template v-if="resultado.modo === 'demanda'">
                  <td class="num">{{ fila.porcentaje.toFixed(1) }}%</td>
                </template>
                <template v-else>
                  <td class="num">{{ formatNumber(fila.consumoDiario) }} kg/d</td>
                  <td class="num">{{ fila.diasCobertura.toFixed(1) }} d</td>
                  <td class="num" :class="{ 'deficit-urgente': fila.deficit > 0 }">
                    {{ fila.deficit > 0 ? formatNumber(fila.deficit) + ' kg' : '—' }}
                  </td>
                </template>
                <td class="num compra-col">
                  <div class="compra-editable">
                    <input
                      type="number"
                      class="compra-input"
                      :class="{ 'compra-editada': fila.compraManual !== null }"
                      :value="fila.compra"
                      min="0"
                      step="1"
                      :title="fila.compraManual !== null ? 'Cantidad editada manualmente' : 'Compra recomendada (editable)'"
                      @input="onCompraEditada(fila, $event.target.value)"
                    />
                    <span class="compra-unidad">kg</span>
                  </div>
                </td>
                <td class="num" :class="{ 'stock-negativo': fila.stockActual < 0 }">
                  {{ formatNumber(fila.stockActual) }} kg
                </td>
                <td class="num"><strong>{{ formatNumber(fila.stockPostCompra) }} kg</strong></td>
                <td v-if="resultado.modo === 'cobertura'" class="num">
                  {{ fila.coberturaResultante.toFixed(1) }} d
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td class="num"><strong>{{ formatNumber(resultado.totalVendido) }} kg</strong></td>
                <template v-if="resultado.modo === 'demanda'">
                  <td class="num"><strong>100%</strong></td>
                </template>
                <template v-else>
                  <td class="num"></td>
                  <td class="num"></td>
                  <td class="num" :class="{ 'deficit-urgente': resultado.totalDeficit > 0 }">
                    <strong>{{ formatNumber(resultado.totalDeficit) }} kg</strong>
                  </td>
                </template>
                <td class="num compra-col"><strong>{{ formatNumber(resultado.totalCompra) }} kg</strong></td>
                <td class="num"><strong>{{ formatNumber(resultado.totalStockActual) }} kg</strong></td>
                <td class="num"><strong>{{ formatNumber(resultado.totalStockActual + resultado.totalCompra) }} kg</strong></td>
                <td v-if="resultado.modo === 'cobertura'" class="num"></td>
              </tr>
            </tfoot>
          </table>
          <p class="compra-nota">
            ✏️ Puedes editar la compra de una medida (por ejemplo, si solo hay cierta cantidad
            disponible en el mercado); el resto se reparte entre las demás medidas. Borra el
            valor para volver a la recomendación automática.
          </p>

          <div v-if="resultado.modo === 'cobertura'" class="explicaciones-cobertura">
            <h4>¿Por qué esta cantidad?</h4>
            <ul>
              <li v-for="fila in resultado.filas" :key="'exp-' + fila.medida">
                {{ explicacionFila(fila) }}
              </li>
            </ul>
          </div>
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
      </template>

      <template v-else-if="vistaActiva === 'consulta'">
        <div class="form-card" key="consulta-form-card">
          <h2>Consultar una Medida</h2>
          <p class="form-descripcion">
            Elige una o varias medidas para ver cuánto durará su stock, cuándo convendría
            resurtir y otros datos útiles para decidir. Por default se consultan todos los
            proveedores juntos, para saber cuánto se desplazó una medida sin importar de quién vino.
            Puedes cambiar de proveedor para revisar sus medidas sin perder lo que ya
            marcaste de otros proveedores.
          </p>
          <div class="form-grid">
            <label>
              Proveedor
              <select v-model="consultaProveedor" @change="cargarMedidasConsulta">
                <option value="">Todos los proveedores</option>
                <option v-for="prov in proveedores" :key="prov" :value="prov">
                  {{ prov }}
                </option>
              </select>
            </label>
            <label>
              Días de historial
              <select v-model.number="consultaDiasHistorial">
                <option :value="10">10 días</option>
                <option :value="15">15 días</option>
                <option :value="30">30 días</option>
                <option :value="60">60 días</option>
                <option :value="90">90 días</option>
              </select>
            </label>
            <label>
              Meta de días de cobertura
              <input
                v-model.number="consultaMetaDias"
                type="number"
                inputmode="decimal"
                min="1"
                step="1"
              />
            </label>
            <button
              class="calcular-btn"
              :disabled="consultaSeleccion.length === 0 || consultaCargando"
              @click="analizarMedida"
            >
              {{ consultaCargando ? 'Analizando...' : 'Analizar' }}
            </button>
          </div>

          <div class="medidas-selector">
            <div class="medidas-selector-header">
              <span>Medidas a consultar{{ consultaProveedor ? ` — ${consultaProveedor}` : ' — todos los proveedores' }}</span>
              <div v-if="consultaMedidasDisponibles.length > 0" class="medidas-selector-acciones">
                <button type="button" @click="seleccionarTodasVisibles">
                  Todas
                </button>
                <button type="button" @click="deseleccionarTodasVisibles">
                  Ninguna
                </button>
              </div>
            </div>

            <input
              v-if="consultaMedidasDisponibles.length > 0"
              v-model="consultaFiltroMedida"
              type="text"
              class="medidas-filtro"
              placeholder="Filtrar por medida (ej: 71/90)"
            />

            <div v-if="consultaCargandoMedidas" class="medidas-mensaje">Cargando medidas...</div>
            <div v-else-if="consultaMedidasDisponibles.length === 0" class="medidas-mensaje">
              No se encontraron medidas{{ consultaProveedor ? ` para ${consultaProveedor}` : '' }}.
            </div>
            <div v-else-if="consultaMedidasFiltradas.length === 0" class="medidas-mensaje">
              Ninguna medida coincide con "{{ consultaFiltroMedida }}".
            </div>
            <div v-else class="medidas-checkbox-grid">
              <label v-for="medida in consultaMedidasFiltradas" :key="medida.nombre" class="medida-checkbox">
                <input
                  type="checkbox"
                  :checked="estaSeleccionada(medida.nombre)"
                  @change="toggleSeleccion(medida.nombre)"
                />
                <span class="medida-nombre">{{ medida.nombre }}</span>
                <span class="medida-stock-hint">{{ formatNumber(medida.stockActual) }} kg</span>
              </label>
            </div>
          </div>

          <div v-if="consultaSeleccion.length > 0" class="seleccion-resumen">
            <span class="seleccion-resumen-label">Seleccionadas ({{ consultaSeleccion.length }}):</span>
            <span v-for="(item, idx) in consultaSeleccion" :key="idx" class="seleccion-chip">
              {{ item.medida }}
              <small>({{ item.proveedor || 'todos' }})</small>
              <button type="button" @click="quitarSeleccion(idx)">×</button>
            </span>
          </div>
        </div>

        <div v-if="consultaError" class="error-box">{{ consultaError }}</div>

        <div
          v-for="grupo in consultaGruposResultados"
          :key="grupo.medida"
          class="resultado-card"
        >
          <div v-if="grupo.items.length > 1" class="resultado-tabs">
            <button
              v-for="item in grupo.items"
              :key="item.proveedor"
              type="button"
              class="resultado-tab-btn"
              :class="{ active: grupo.activo.proveedor === item.proveedor }"
              @click="seleccionarTabResultado(grupo.medida, item.proveedor)"
            >
              {{ item.proveedor }}
            </button>
          </div>

          <h2>{{ grupo.medida }} — {{ grupo.activo.proveedor }}</h2>

          <div class="consulta-metricas">
            <div class="metrica-card">
              <span class="metrica-label">Stock actual</span>
              <span class="metrica-valor">{{ formatNumber(grupo.activo.stockActual) }} kg</span>
            </div>
            <div class="metrica-card">
              <span class="metrica-label">Vendido ({{ grupo.activo.diasHistorial }}d)</span>
              <span class="metrica-valor">{{ formatNumber(grupo.activo.vendidoPeriodo) }} kg</span>
            </div>
            <div class="metrica-card">
              <span class="metrica-label">Consumo diario ({{ grupo.activo.diasHistorial }}d)</span>
              <span class="metrica-valor">{{ formatNumber(grupo.activo.consumoDiario) }} kg/d</span>
            </div>
            <div class="metrica-card" v-if="grupo.activo.diasCobertura !== null">
              <span class="metrica-label">Te dura el stock</span>
              <span class="metrica-valor">{{ grupo.activo.diasCobertura.toFixed(1) }} días</span>
            </div>
            <div class="metrica-card" v-if="grupo.activo.ultimoPrecio">
              <span class="metrica-label">Último precio registrado</span>
              <span class="metrica-valor">${{ formatNumber(grupo.activo.ultimoPrecio) }}</span>
            </div>
          </div>

          <div v-if="grupo.activo.diasCobertura === null" class="sin-datos">
            No hay salidas registradas en los últimos {{ grupo.activo.diasHistorial }} días
            para estimar el consumo, así que no se puede calcular cuánto durará el stock.
          </div>

          <template v-else>
            <div class="agotamiento-info">
              <p>
                Con tu consumo actual (<strong>{{ formatNumber(grupo.activo.consumoDiario) }} kg/día</strong>),
                el stock se agotaría alrededor del <strong>{{ grupo.activo.fechaAgotamiento }}</strong>.
              </p>
              <p :class="grupo.activo.diasParaResurtir > 0 ? 'resurtir-ok' : 'resurtir-urgente'">
                <template v-if="grupo.activo.diasParaResurtir > 0">
                  📅 Conviene resurtir a partir del <strong>{{ grupo.activo.fechaResurtir }}</strong>
                  (en {{ grupo.activo.diasParaResurtir.toFixed(1) }} días), para mantener al menos
                  {{ grupo.activo.metaDiasCobertura }} días de cobertura.
                </template>
                <template v-else>
                  ⚠️ Ya deberías resurtir esta medida: tu cobertura está por debajo de tu meta de
                  {{ grupo.activo.metaDiasCobertura }} días
                  ({{ formatNumber(-grupo.activo.diasParaResurtir, 1) }} días de atraso).
                </template>
              </p>
            </div>

            <p class="tendencia-info">
              Tendencia de consumo:
              <strong>
                <template v-if="grupo.activo.tendencia === 'subiendo'">📈 subiendo</template>
                <template v-else-if="grupo.activo.tendencia === 'bajando'">📉 bajando</template>
                <template v-else>➡️ estable</template>
              </strong>
              (últimos 7 días: {{ formatNumber(grupo.activo.consumoReciente) }} kg/d
              vs. promedio de {{ grupo.activo.diasHistorial }}d:
              {{ formatNumber(grupo.activo.consumoDiario) }} kg/d)
            </p>
          </template>

          <div v-if="grupo.activo.ultimasEntradas.length > 0" class="ultimas-entradas">
            <h4>Últimas entradas registradas</h4>
            <table class="resultado-tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th class="num">Kilos</th>
                  <th class="num">Precio</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(entrada, idx) in grupo.activo.ultimasEntradas" :key="idx">
                  <td>{{ entrada.fecha }}</td>
                  <td>{{ entrada.proveedor || '—' }}</td>
                  <td class="num">{{ formatNumber(entrada.kilos) }} kg</td>
                  <td class="num">{{ entrada.precio ? '$' + formatNumber(entrada.precio) : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <template v-else>
        <AsesorStock
          key="asesor-card"
          :obtener-contexto="construirContextoInventario"
          :dias-contexto="30"
        />
      </template>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import moment from 'moment';
import BackButton from '@/components/BackButton.vue';
import AsesorStock from '@/components/AsesorStock.vue';
import { formatNumber } from '@/utils/formatters';

export default {
  name: 'AnalisisStock',
  components: {
    BackButton,
    AsesorStock
  },
  data() {
    return {
      vistaActiva: 'plan', // 'plan' | 'consulta' | 'asesor'
      kilosDisponibles: null,
      proveedorSeleccionado: '',
      diasHistorial: 30,
      modo: 'demanda', // 'demanda' | 'cobertura'
      metaDiasCobertura: 12,
      proveedores: [],
      proveedoresObjetos: [],
      medidasDisponibles: [],
      medidasSeleccionadas: [],
      cargandoMedidas: false,
      cargando: false,
      error: '',
      resultado: null,
      // Snapshot de la última consulta a Firestore, para poder recalcular al
      // instante al cambiar de modo o de meta de cobertura sin releer datos.
      datosCalculo: null,
      // Compras editadas a mano por el usuario (medida -> kilos), por si solo
      // hay cierta cantidad disponible de esa medida. Se conservan aunque se
      // cambie de modo o de meta, y se limpian solo con un nuevo cálculo.
      comprasManualPorMedida: {},

      // Estado de la vista "Consultar una Medida"
      consultaProveedor: '',
      // Selección acumulada de { proveedor, medida }. No se reinicia al
      // cambiar el filtro de proveedor, para poder ir marcando medidas de
      // varios proveedores distintos (o de "todos") antes de analizar.
      consultaSeleccion: [],
      consultaFiltroMedida: '',
      consultaDiasHistorial: 30,
      consultaMetaDias: 12,
      consultaMedidasDisponibles: [],
      consultaCargandoMedidas: false,
      consultaCargando: false,
      consultaError: '',
      consultaResultados: [],
      // Pestaña activa por medida cuando hay resultados de la misma medida
      // de más de un proveedor (medida -> proveedor mostrado actualmente).
      consultaTabActivoPorMedida: {}
    };
  },
  watch: {
    modo() {
      this.recalcularResultado();
    },
    metaDiasCobertura() {
      if (this.modo === 'cobertura') {
        this.recalcularResultado();
      }
    }
  },
  computed: {
    puedeCalcular() {
      return this.proveedorSeleccionado &&
             this.kilosDisponibles &&
             this.kilosDisponibles > 0 &&
             this.medidasSeleccionadas.length > 0;
    },
    consultaMedidasFiltradas() {
      const filtro = this.consultaFiltroMedida.trim().toLowerCase();
      if (!filtro) return this.consultaMedidasDisponibles;
      return this.consultaMedidasDisponibles.filter(
        m => m.nombre.toLowerCase().includes(filtro)
      );
    },
    // Agrupa consultaResultados por medida, para poder mostrar los
    // resultados de una misma medida de varios proveedores como pestañas
    // dentro de una sola tarjeta en vez de tarjetas repetidas.
    consultaGruposResultados() {
      const grupos = [];
      const indicePorMedida = {};

      this.consultaResultados.forEach(item => {
        if (indicePorMedida[item.medida] === undefined) {
          indicePorMedida[item.medida] = grupos.length;
          grupos.push({ medida: item.medida, items: [] });
        }
        grupos[indicePorMedida[item.medida]].items.push(item);
      });

      grupos.forEach(grupo => {
        const proveedorActivo = this.consultaTabActivoPorMedida[grupo.medida] || grupo.items[0].proveedor;
        grupo.activo = grupo.items.find(item => item.proveedor === proveedorActivo) || grupo.items[0];
      });

      return grupos;
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

    normalizarCuartoStock(cuarto) {
      const valor = (cuarto && cuarto.trim()) ? cuarto.trim() : 's/c';
      return valor.toLowerCase() === 'sin cuarto designado' ? 's/c' : valor;
    },

    // Lee la colección 'sacadas' una vez y calcula, para el proveedor dado,
    // el stock actual por medida y, si se pasan fechas, la demanda (salidas)
    // dentro de ese periodo.
    //
    // El stock se calcula replicando la lógica de la vista de Existencias:
    // se bucketiza cada movimiento por (medida + precio + cuarto), las
    // salidas se restan por FIFO dentro del bucket exacto que las alimentó, y
    // lo que sobra de una salida sin lote propio se descarta silenciosamente
    // en lugar de generar negativos falsos. Así los totales por medida cuadran
    // con lo que muestra Existencias aunque haya salidas registradas con
    // nombres/precios/cuartos que no coinciden con sus entradas.
    async obtenerMovimientosProveedor(proveedorNombre, fechaInicio, fechaFin) {
      const snapshot = await getDocs(collection(db, 'sacadas'));
      const demandaPorMedida = {};
      let totalVendido = 0;

      // Ordenar sacadas cronológicamente (el FIFO depende de que las entradas
      // hayan quedado registradas antes que las salidas que las consumen).
      const sacadasOrdenadas = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, data: docSnap.data() }))
        .map(item => ({ ...item, fecha: this.parseFechaSacada(item.data.fecha) }))
        .filter(item => item.fecha)
        .sort((a, b) => a.fecha - b.fecha);

      // buckets[clave] = { medida, lotes: [{ kilos }] } donde clave =
      // `${medida}_$${precio}__${cuarto}` (o `${medida}__${cuarto}` sin precio).
      // La misma fórmula que usa Existencias.vue en ambos lados.
      const buckets = {};

      const claveBucket = (medida, precio, cuarto) => {
        const c = this.normalizarCuartoStock(cuarto);
        return precio !== null && precio !== undefined
          ? `${medida}_$${precio}__${c}`
          : `${medida}__${c}`;
      };

      sacadasOrdenadas.forEach(({ data: sacada, fecha }) => {
        const enPeriodo = fechaInicio && fechaFin
          ? moment(fecha).isBetween(fechaInicio, fechaFin, undefined, '[]')
          : false;

        (sacada.entradas || []).forEach(entrada => {
          if (!this.coincideProveedor(entrada.proveedor, proveedorNombre)) return;
          const medida = String(entrada.medida || '').trim();
          if (!medida) return;
          const kilos = Number(entrada.kilos) || 0;
          if (kilos <= 0) return;
          const precio = entrada.precio !== null && entrada.precio !== undefined
            ? entrada.precio
            : null;
          const clave = claveBucket(medida, precio, entrada.cuartoFrio);
          if (!buckets[clave]) buckets[clave] = { medida, lotes: [] };
          buckets[clave].lotes.push({ kilos });
        });

        (sacada.salidas || []).forEach(salida => {
          if (!this.coincideProveedor(salida.proveedor, proveedorNombre)) return;
          const medida = String(salida.medida || '').trim();
          if (!medida) return;
          const kilos = Number(salida.kilos) || 0;
          if (kilos <= 0) return;

          const precio = salida.precio !== null && salida.precio !== undefined
            ? salida.precio
            : null;
          const clave = claveBucket(medida, precio, salida.cuartoFrio);
          if (!buckets[clave]) buckets[clave] = { medida, lotes: [] };

          // FIFO clampado a cero por lote: los kilos que no encuentran lote
          // propio se descartan (mismo comportamiento que Existencias.vue).
          let restante = kilos;
          for (let i = 0; i < buckets[clave].lotes.length && restante > 0; i += 1) {
            const lote = buckets[clave].lotes[i];
            if (lote.kilos >= restante) {
              lote.kilos -= restante;
              restante = 0;
            } else {
              restante -= lote.kilos;
              lote.kilos = 0;
            }
          }

          // La demanda del periodo sí cuenta la salida completa (aunque no
          // haya encontrado lote propio): representa lo que sí se vendió.
          if (enPeriodo) {
            demandaPorMedida[medida] = (demandaPorMedida[medida] || 0) + kilos;
            totalVendido += kilos;
          }
        });
      });

      // Sumar los residuos positivos de cada bucket por nombre de medida.
      const stockPorMedida = {};
      Object.values(buckets).forEach(bucket => {
        const disponible = bucket.lotes.reduce(
          (sum, lote) => sum + Math.max(0, lote.kilos),
          0
        );
        if (disponible <= 0) return;
        stockPorMedida[bucket.medida] = (stockPorMedida[bucket.medida] || 0) + disponible;
      });

      return { demandaPorMedida, stockPorMedida, totalVendido };
    },

    // Devuelve las medidas "disponibles" de un proveedor: las de su catálogo
    // (colección 'medidas') más cualquiera con movimiento histórico, cada una
    // con su stock actual. Si no se pasa proveedorNombre, agrega el catálogo y
    // el stock de todos los proveedores juntos. Se reutiliza tanto para el
    // plan de compra como para la consulta individual de una medida.
    async obtenerMedidasParaProveedor(proveedorNombre) {
      const proveedorObj = proveedorNombre
        ? this.proveedoresObjetos.find(p => p.nombre === proveedorNombre)
        : null;
      const nombresCatalogo = new Set();

      if (!proveedorNombre || proveedorObj) {
        const medidasSnapshot = await getDocs(collection(db, 'medidas'));
        medidasSnapshot.docs.forEach(docSnap => {
          const medida = docSnap.data();
          if (!medida.nombre) return;
          if (!proveedorNombre || medida.proveedorId === proveedorObj.id) {
            nombresCatalogo.add(String(medida.nombre).trim());
          }
        });
      }

      const { stockPorMedida } = await this.obtenerMovimientosProveedor(proveedorNombre || '', null, null);
      Object.keys(stockPorMedida).forEach(medida => nombresCatalogo.add(medida));

      return Array.from(nombresCatalogo)
        .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
        .map(nombre => ({
          nombre,
          stockActual: Number((stockPorMedida[nombre] || 0).toFixed(1))
        }));
    },

    async cargarMedidasProveedor() {
      this.medidasDisponibles = [];
      this.medidasSeleccionadas = [];
      this.resultado = null;
      this.datosCalculo = null;
      this.comprasManualPorMedida = {};
      this.error = '';

      if (!this.proveedorSeleccionado) return;

      this.cargandoMedidas = true;
      try {
        const lista = await this.obtenerMedidasParaProveedor(this.proveedorSeleccionado);
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

    // No reinicia consultaSeleccion a propósito: cambiar el filtro de
    // proveedor solo refresca la lista de medidas mostradas, para poder
    // seguir marcando medidas de otros proveedores sin perder lo ya elegido.
    async cargarMedidasConsulta() {
      this.consultaMedidasDisponibles = [];
      this.consultaError = '';

      this.consultaCargandoMedidas = true;
      try {
        this.consultaMedidasDisponibles = await this.obtenerMedidasParaProveedor(this.consultaProveedor);
      } catch (error) {
        console.error('Error al cargar medidas para consulta:', error);
        this.consultaMedidasDisponibles = [];
      } finally {
        this.consultaCargandoMedidas = false;
      }
    },

    estaSeleccionada(medidaNombre) {
      return this.consultaSeleccion.some(
        s => s.proveedor === this.consultaProveedor && s.medida === medidaNombre
      );
    },

    toggleSeleccion(medidaNombre) {
      const idx = this.consultaSeleccion.findIndex(
        s => s.proveedor === this.consultaProveedor && s.medida === medidaNombre
      );
      if (idx >= 0) {
        this.consultaSeleccion.splice(idx, 1);
      } else {
        this.consultaSeleccion.push({ proveedor: this.consultaProveedor, medida: medidaNombre });
      }
    },

    // "Visibles" respeta el filtro de texto: Todas/Ninguna solo tocan las
    // medidas que el usuario está viendo en este momento.
    seleccionarTodasVisibles() {
      this.consultaMedidasFiltradas.forEach(m => {
        if (!this.estaSeleccionada(m.nombre)) {
          this.consultaSeleccion.push({ proveedor: this.consultaProveedor, medida: m.nombre });
        }
      });
    },

    deseleccionarTodasVisibles() {
      const visibles = new Set(this.consultaMedidasFiltradas.map(m => m.nombre));
      this.consultaSeleccion = this.consultaSeleccion.filter(
        s => !(s.proveedor === this.consultaProveedor && visibles.has(s.medida))
      );
    },

    quitarSeleccion(idx) {
      this.consultaSeleccion.splice(idx, 1);
    },

    seleccionarTabResultado(medida, proveedor) {
      this.consultaTabActivoPorMedida = {
        ...this.consultaTabActivoPorMedida,
        [medida]: proveedor
      };
    },

    seleccionarVista(vista) {
      this.vistaActiva = vista;
      if (vista === 'consulta' && this.consultaMedidasDisponibles.length === 0 && !this.consultaCargandoMedidas) {
        this.cargarMedidasConsulta();
      }
    },

    // Lee la colección 'sacadas' una sola vez y devuelve el historial completo
    // de entradas y salidas (con fecha) de cada una de las medidas pedidas,
    // filtradas por proveedor (o de todos si proveedorNombre viene vacío),
    // para poder analizarlas individualmente (consumo, tendencia, precios).
    async obtenerHistorialMedidas(proveedorNombre, medidasNombres) {
      const snapshot = await getDocs(collection(db, 'sacadas'));
      const historialPorMedida = {};
      medidasNombres.forEach(nombre => {
        historialPorMedida[nombre] = { entradas: [], salidas: [] };
      });

      snapshot.docs.forEach(docSnap => {
        const sacada = docSnap.data();
        const fecha = this.parseFechaSacada(sacada.fecha);
        if (!fecha) return;

        (sacada.entradas || []).forEach(entrada => {
          if (!this.coincideProveedor(entrada.proveedor, proveedorNombre)) return;
          const medida = String(entrada.medida || '').trim();
          if (!historialPorMedida[medida]) return;
          historialPorMedida[medida].entradas.push({
            fecha,
            kilos: Number(entrada.kilos) || 0,
            precio: entrada.precio ?? null,
            proveedor: entrada.proveedor || ''
          });
        });

        (sacada.salidas || []).forEach(salida => {
          if (!this.coincideProveedor(salida.proveedor, proveedorNombre)) return;
          const medida = String(salida.medida || '').trim();
          if (!historialPorMedida[medida]) return;
          historialPorMedida[medida].salidas.push({ fecha, kilos: Number(salida.kilos) || 0 });
        });
      });

      Object.values(historialPorMedida).forEach(({ entradas, salidas }) => {
        entradas.sort((a, b) => b.fecha - a.fecha);
        salidas.sort((a, b) => b.fecha - a.fecha);
      });

      return historialPorMedida;
    },

    // Arma el resumen de inventario que se le manda al asesor experto (Cloud
    // Function + Claude): stock FIFO, ventas de 30 días, consumo diario,
    // cobertura y último precio de compra por medida, de todos los proveedores.
    async construirContextoInventario() {
      const dias = 30;
      const fin = moment().endOf('day');
      const inicio = moment().subtract(dias, 'days').startOf('day');

      const { demandaPorMedida, stockPorMedida, totalVendido } =
        await this.obtenerMovimientosProveedor('', inicio, fin);

      const nombres = Array.from(
        new Set([...Object.keys(stockPorMedida), ...Object.keys(demandaPorMedida)])
      );
      const historialPorMedida = await this.obtenerHistorialMedidas('', nombres);
      const hace7 = moment().subtract(7, 'days').startOf('day');

      const medidas = nombres
        .map(nombre => {
          const stockKg = Number((stockPorMedida[nombre] || 0).toFixed(1));
          const vendido30dKg = Number((demandaPorMedida[nombre] || 0).toFixed(1));
          const consumoDiarioKg = Number((vendido30dKg / dias).toFixed(2));
          const { entradas, salidas } = historialPorMedida[nombre] || { entradas: [], salidas: [] };
          const vendido7dKg = Number(
            salidas
              .filter(s => moment(s.fecha).isSameOrAfter(hace7))
              .reduce((sum, s) => sum + s.kilos, 0)
              .toFixed(1)
          );
          const entradaConPrecio = entradas.find(e => e.precio !== null && e.precio !== undefined);
          const ultimaEntrada = entradas[0] || null;

          return {
            medida: nombre,
            stockKg,
            vendido30dKg,
            vendido7dKg,
            consumoDiarioKg,
            diasCobertura: consumoDiarioKg > 0
              ? Number((stockKg / consumoDiarioKg).toFixed(1))
              : null,
            ultimoPrecioCompra: entradaConPrecio ? entradaConPrecio.precio : null,
            ultimaEntrada: ultimaEntrada
              ? {
                  fecha: moment(ultimaEntrada.fecha).format('YYYY-MM-DD'),
                  kilos: Number(ultimaEntrada.kilos.toFixed(1)),
                  proveedor: ultimaEntrada.proveedor || null
                }
              : null
          };
        })
        .filter(m => m.stockKg > 0 || m.vendido30dKg > 0)
        .sort((a, b) => b.vendido30dKg - a.vendido30dKg);

      if (this.proveedores.length === 0) {
        await this.loadProveedores();
      }

      return {
        fecha: moment().format('YYYY-MM-DD'),
        periodoDias: dias,
        totalVendido30dKg: Number(totalVendido.toFixed(1)),
        totalStockKg: Number(medidas.reduce((sum, m) => sum + m.stockKg, 0).toFixed(1)),
        proveedores: this.proveedores,
        medidas
      };
    },

    // Calcula las métricas de una medida (consumo, cobertura, tendencia,
    // últimas entradas) a partir de su stock actual y su historial ya
    // filtrado. No sabe de proveedores: eso lo agrega quien la llama.
    calcularAnalisisMedida(stockActual, entradas, salidas, dias, meta) {
      const sumaSalidasDesde = (diasAtras) => {
        const desde = moment().subtract(diasAtras, 'days').startOf('day');
        return salidas
          .filter(s => moment(s.fecha).isSameOrAfter(desde))
          .reduce((sum, s) => sum + s.kilos, 0);
      };

      const vendidoPeriodo = Number(sumaSalidasDesde(dias).toFixed(1));
      const consumoDiario = Number((vendidoPeriodo / dias).toFixed(2));

      const vendidoReciente = Number(sumaSalidasDesde(7).toFixed(1));
      const consumoReciente = Number((vendidoReciente / 7).toFixed(2));

      let diasCobertura = null;
      let fechaAgotamiento = null;
      let diasParaResurtir = null;
      let fechaResurtir = null;

      if (consumoDiario > 0) {
        diasCobertura = Number((stockActual / consumoDiario).toFixed(1));
        fechaAgotamiento = moment().add(diasCobertura, 'days').format('DD/MM/YYYY');
        diasParaResurtir = Number((diasCobertura - meta).toFixed(1));
        fechaResurtir = moment().add(diasParaResurtir, 'days').format('DD/MM/YYYY');
      }

      let tendencia = 'estable';
      if (consumoDiario > 0) {
        if (consumoReciente > consumoDiario * 1.15) tendencia = 'subiendo';
        else if (consumoReciente < consumoDiario * 0.85) tendencia = 'bajando';
      }

      const entradaConPrecio = entradas.find(e => e.precio !== null && e.precio !== undefined);

      return {
        diasHistorial: dias,
        stockActual,
        vendidoPeriodo,
        consumoDiario,
        vendidoReciente,
        consumoReciente,
        tendencia,
        diasCobertura,
        fechaAgotamiento,
        metaDiasCobertura: meta,
        diasParaResurtir,
        fechaResurtir,
        ultimoPrecio: entradaConPrecio ? entradaConPrecio.precio : null,
        ultimasEntradas: entradas.slice(0, 5).map(e => ({
          fecha: moment(e.fecha).format('DD/MM/YYYY'),
          kilos: Number(e.kilos.toFixed(1)),
          precio: e.precio,
          proveedor: e.proveedor
        }))
      };
    },

    async analizarMedida() {
      if (this.consultaSeleccion.length === 0 || this.consultaCargando) return;
      this.consultaCargando = true;
      this.consultaError = '';
      this.consultaResultados = [];

      try {
        const dias = this.consultaDiasHistorial;
        const meta = Number(this.consultaMetaDias) || 0;

        // Agrupar la selección por proveedor (clave '' = todos), para no
        // repetir lecturas a Firestore cuando varias medidas comparten el
        // mismo proveedor.
        const medidasPorProveedor = {};
        this.consultaSeleccion.forEach(item => {
          const clave = item.proveedor || '';
          if (!medidasPorProveedor[clave]) medidasPorProveedor[clave] = [];
          if (!medidasPorProveedor[clave].includes(item.medida)) {
            medidasPorProveedor[clave].push(item.medida);
          }
        });

        const resultadoPorClave = {};
        for (const proveedor of Object.keys(medidasPorProveedor)) {
          const medidasDelGrupo = medidasPorProveedor[proveedor];
          const [{ stockPorMedida }, historialPorMedida] = await Promise.all([
            this.obtenerMovimientosProveedor(proveedor, null, null),
            this.obtenerHistorialMedidas(proveedor, medidasDelGrupo)
          ]);

          medidasDelGrupo.forEach(medidaNombre => {
            const stockActual = Number((stockPorMedida[medidaNombre] || 0).toFixed(1));
            const { entradas, salidas } = historialPorMedida[medidaNombre];
            resultadoPorClave[`${proveedor}::${medidaNombre}`] = {
              proveedor: proveedor || 'Todos los proveedores',
              medida: medidaNombre,
              ...this.calcularAnalisisMedida(stockActual, entradas, salidas, dias, meta)
            };
          });
        }

        // Conservar el orden en el que el usuario fue marcando las medidas.
        this.consultaResultados = this.consultaSeleccion.map(
          item => resultadoPorClave[`${item.proveedor || ''}::${item.medida}`]
        );
      } catch (error) {
        console.error('Error al analizar las medidas:', error);
        this.consultaError = 'No se pudieron analizar las medidas: ' + error.message;
      } finally {
        this.consultaCargando = false;
      }
    },

    // Reparte totalKilos en bloques de "bloque" kg entre los items, en
    // proporción a su "idealKg" (el kilaje ideal ya calculado por el modo
    // activo), usando el método de restos mayores para que cada compra sea
    // un múltiplo cerrado y la suma cuadre con totalKilos.
    redondearABloques(items, totalKilos, bloque = 500) {
      const totalBloques = Math.round(totalKilos / bloque);

      if (items.length === 0 || totalBloques <= 0) {
        return items.map(item => ({ ...item, compra: 0 }));
      }

      const sumaIdeal = items.reduce((sum, item) => sum + item.idealKg, 0);

      if (sumaIdeal <= 0) {
        const base = Math.floor(totalBloques / items.length);
        const resto = totalBloques % items.length;
        return items.map((item, index) => ({
          ...item,
          compra: (base + (index < resto ? 1 : 0)) * bloque
        }));
      }

      const conBloques = items.map(item => {
        const exacto = (item.idealKg / sumaIdeal) * totalBloques;
        return { ...item, bloquesExactos: exacto, bloques: Math.floor(exacto) };
      });

      const asignados = conBloques.reduce((sum, item) => sum + item.bloques, 0);
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
      this.datosCalculo = null;
      this.comprasManualPorMedida = {};

      try {
        const proveedor = this.proveedorSeleccionado;
        const dias = this.diasHistorial;
        const fechaInicio = moment().subtract(dias, 'days').startOf('day');
        const fechaFin = moment().endOf('day');

        const { demandaPorMedida, stockPorMedida } = await this.obtenerMovimientosProveedor(
          proveedor, fechaInicio, fechaFin
        );

        this.datosCalculo = {
          proveedor,
          dias,
          fechaInicioTexto: fechaInicio.format('DD/MM/YYYY'),
          fechaFinTexto: fechaFin.format('DD/MM/YYYY'),
          demandaPorMedida,
          stockPorMedida,
          medidasSeleccionadas: [...this.medidasSeleccionadas],
          kilosAComprar: Number(this.kilosDisponibles) || 0
        };

        this.recalcularResultado();
      } catch (error) {
        console.error('Error al calcular la distribución:', error);
        this.error = 'No se pudo calcular la distribución: ' + error.message;
      } finally {
        this.cargando = false;
      }
    },

    // Recalcula la tabla de resultados a partir de los datos ya consultados
    // (this.datosCalculo), aplicando el modo de cálculo activo. Se usa tanto
    // al terminar calcular() como al cambiar de modo o la meta de cobertura,
    // para que el resultado se actualice al instante sin releer Firestore.
    recalcularResultado() {
      if (!this.datosCalculo) return;

      const {
        proveedor, dias, fechaInicioTexto, fechaFinTexto,
        demandaPorMedida, stockPorMedida, medidasSeleccionadas, kilosAComprar
      } = this.datosCalculo;

      const metaDias = Number(this.metaDiasCobertura) || 0;

      const filasBase = medidasSeleccionadas
        .filter(medida => demandaPorMedida[medida])
        .map(medida => {
          const vendido = Number(demandaPorMedida[medida].toFixed(1));
          const stockActual = Number((stockPorMedida[medida] || 0).toFixed(1));
          const consumoDiario = Number((vendido / dias).toFixed(2));
          const diasCobertura = Number((stockActual / consumoDiario).toFixed(1));
          const deficit = Math.max(0, Number(((metaDias - diasCobertura) * consumoDiario).toFixed(1)));
          return { medida, vendido, stockActual, consumoDiario, diasCobertura, deficit };
        });

      const totalVendido = filasBase.reduce((sum, fila) => sum + fila.vendido, 0);
      const totalDeficit = Number(filasBase.reduce((sum, fila) => sum + fila.deficit, 0).toFixed(1));

      let itemsConIdeal;
      if (this.modo === 'cobertura') {
        if (totalDeficit > 0 && totalDeficit > kilosAComprar) {
          // Los déficits superan lo disponible: repartir proporcional al
          // tamaño del déficit para priorizar las medidas más urgentes.
          itemsConIdeal = filasBase.map(fila => ({ ...fila, idealKg: fila.deficit }));
        } else {
          // Alcanza para cubrir todos los déficits; lo que sobra se reparte
          // proporcionalmente al consumo mensual de cada medida.
          const kilosRestantes = kilosAComprar - totalDeficit;
          const totalConsumoMensual = filasBase.reduce((sum, fila) => sum + fila.consumoDiario * 30, 0);
          itemsConIdeal = filasBase.map(fila => {
            const consumoMensual = fila.consumoDiario * 30;
            const shareRemanente = totalConsumoMensual > 0
              ? kilosRestantes * (consumoMensual / totalConsumoMensual)
              : 0;
            return { ...fila, idealKg: fila.deficit + shareRemanente };
          });
        }
      } else {
        // Modo por demanda: reparto proporcional al % de ventas de cada medida
        itemsConIdeal = filasBase.map(fila => ({ ...fila, idealKg: fila.vendido }));
      }

      const filas = this.redondearABloques(itemsConIdeal, kilosAComprar, 500)
        .map(fila => {
          const stockPostCompra = Number((fila.stockActual + fila.compra).toFixed(1));
          return {
            ...fila,
            porcentaje: totalVendido > 0 ? (fila.vendido / totalVendido) * 100 : 0,
            stockPostCompra,
            // Para cuántos días te alcanzaría el stock después de esta compra
            coberturaResultante: Number((stockPostCompra / fila.consumoDiario).toFixed(1)),
            // Compra editada a mano por el usuario para esta medida, si la hay
            // (persiste aunque se cambie de modo o de meta de cobertura).
            compraManual: Object.prototype.hasOwnProperty.call(this.comprasManualPorMedida, fila.medida)
              ? this.comprasManualPorMedida[fila.medida]
              : null
          };
        })
        .sort((a, b) => b.vendido - a.vendido);

      // Medidas seleccionadas sin demanda en el periodo: no reciben compra,
      // pero se muestran aparte para que no queden ocultas.
      const sinVentas = medidasSeleccionadas
        .filter(medida => !demandaPorMedida[medida])
        .map(medida => ({ medida, stockActual: Number((stockPorMedida[medida] || 0).toFixed(1)) }))
        .sort((a, b) => b.stockActual - a.stockActual);

      this.resultado = {
        proveedor,
        diasHistorial: dias,
        fechaInicio: fechaInicioTexto,
        fechaFin: fechaFinTexto,
        modo: this.modo,
        metaDiasCobertura: metaDias,
        totalVendido: Number(totalVendido.toFixed(1)),
        totalDeficit,
        totalCompra: filas.reduce((sum, fila) => sum + fila.compra, 0),
        totalStockActual: Number(
          filas.reduce((sum, fila) => sum + fila.stockActual, 0).toFixed(1)
        ),
        filas,
        sinVentas
      };

      // Si había compras editadas a mano, respetarlas y repartir el resto
      // entre las medidas que siguen en automático.
      this.aplicarBloqueosYRedistribuir();
    },

    // Se ejecuta cada vez que el usuario edita (o borra) la compra de una
    // medida. Las medidas con un valor manual quedan "bloqueadas" y no se
    // tocan al editar otra; las demás se reparten proporcionalmente entre sí
    // con los kilos que sobran después de restar lo bloqueado.
    onCompraEditada(fila, valorTexto) {
      if (!this.resultado) return;

      let valor = null;
      if (valorTexto !== '' && valorTexto !== null && valorTexto !== undefined) {
        const parsed = Number(valorTexto);
        valor = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
      }

      fila.compraManual = valor;
      if (valor === null) {
        this.comprasManualPorMedida = { ...this.comprasManualPorMedida };
        delete this.comprasManualPorMedida[fila.medida];
      } else {
        this.comprasManualPorMedida = { ...this.comprasManualPorMedida, [fila.medida]: valor };
      }

      this.aplicarBloqueosYRedistribuir();
    },

    aplicarBloqueosYRedistribuir() {
      if (!this.resultado || !this.datosCalculo) return;

      const filas = this.resultado.filas;
      const bloqueadas = filas.filter(fila => fila.compraManual !== null);
      const libres = filas.filter(fila => fila.compraManual === null);

      const totalBloqueado = bloqueadas.reduce((sum, fila) => sum + fila.compraManual, 0);
      const kilosRestantes = Math.max(0, this.datosCalculo.kilosAComprar - totalBloqueado);

      const repartidas = this.redondearABloques(libres, kilosRestantes, 500);

      const compraPorMedida = {};
      bloqueadas.forEach(fila => { compraPorMedida[fila.medida] = fila.compraManual; });
      repartidas.forEach(fila => { compraPorMedida[fila.medida] = fila.compra; });

      filas.forEach(fila => {
        fila.compra = compraPorMedida[fila.medida];
        fila.stockPostCompra = Number((fila.stockActual + fila.compra).toFixed(1));
        if (fila.consumoDiario) {
          fila.coberturaResultante = Number((fila.stockPostCompra / fila.consumoDiario).toFixed(1));
        }
      });

      this.resultado.totalCompra = filas.reduce((sum, fila) => sum + fila.compra, 0);
    },

    // Texto breve explicando, para una medida, por qué se le asignó (o le
    // falta) esta cantidad en modo "por días de cobertura".
    explicacionFila(fila) {
      const meta = this.resultado.metaDiasCobertura;
      const dura = fila.diasCobertura.toFixed(1);
      const resultante = fila.coberturaResultante.toFixed(1);

      if (fila.compraManual !== null) {
        return `${fila.medida}: cantidad editada a mano (${this.formatNumber(fila.compra)} kg), por ejemplo por disponibilidad ` +
          `en el mercado. Te duraba ${dura}d antes de comprar; con esto te quedarían ${resultante}d de cobertura.`;
      }

      if (fila.deficit > 0 && fila.compra < fila.deficit) {
        return `${fila.medida}: te dura ${dura}d y necesitarías ${this.formatNumber(fila.deficit)} kg para llegar a ${meta}d, ` +
          `pero no alcanzó el presupuesto; con lo asignado (${this.formatNumber(fila.compra)} kg) te quedarían ${resultante}d de cobertura.`;
      }

      if (fila.deficit > 0) {
        return `${fila.medida}: te dura solo ${dura}d, así que primero se cubrió su déficit de ${this.formatNumber(fila.deficit)} kg ` +
          `para llegar a tu meta de ${meta}d; el resto de tu compra se sumó según su consumo mensual, dejándote ${resultante}d de cobertura.`;
      }

      return `${fila.medida}: ya te duraba ${dura}d (más que tu meta de ${meta}d), así que no tenía déficit; ` +
        `esta cantidad es su parte del sobrante repartida según su consumo mensual, dejándote ${resultante}d de cobertura.`;
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

.vista-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 18px;
  border-bottom: 2px solid #dee2e6;
}

.vista-tab-btn {
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  padding: 10px 16px;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: 15px;
  font-weight: bold;
  color: #666;
  transition: color 0.2s, border-color 0.2s;
}

.vista-tab-btn:hover {
  color: #2c3e50;
}

.vista-tab-btn.active {
  color: #3498db;
  border-bottom-color: #3498db;
}

.form-card,
.resultado-card {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.resultado-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.resultado-tab-btn {
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 16px;
  padding: 5px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  color: #666;
  transition: color 0.2s, border-color 0.2s, background-color 0.2s;
}

.resultado-tab-btn:hover {
  border-color: #3498db;
  color: #3498db;
}

.resultado-tab-btn.active {
  background-color: #3498db;
  border-color: #3498db;
  color: white;
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

.modo-selector {
  margin-top: 18px;
  padding-top: 15px;
  border-top: 1px solid #dee2e6;
}

.modo-selector-label {
  display: block;
  font-weight: bold;
  color: #2c3e50;
  font-size: 14px;
  margin-bottom: 10px;
}

.modo-opciones {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
}

.modo-opcion {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background-color: white;
  border: 2px solid #dee2e6;
  border-radius: 6px;
  padding: 10px 12px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.modo-opcion.active {
  border-color: #3498db;
  background-color: rgba(52, 152, 219, 0.06);
}

.modo-opcion input {
  margin-top: 3px;
  accent-color: #3498db;
}

.modo-opcion strong {
  display: block;
  color: #2c3e50;
  font-size: 14px;
}

.modo-opcion small {
  display: block;
  color: #666;
  font-size: 12px;
  margin-top: 2px;
}

.meta-dias-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-weight: bold;
  color: #2c3e50;
  font-size: 14px;
  margin-top: 12px;
  max-width: 220px;
}

.meta-dias-label input {
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
  font-size: 16px;
}

.deficit-urgente {
  color: #c0392b;
  font-weight: bold;
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

.medidas-filtro {
  width: 100%;
  box-sizing: border-box;
  margin: 10px 0;
  padding: 8px 10px;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  font-size: 14px;
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

.seleccion-resumen {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #dee2e6;
}

.seleccion-resumen-label {
  color: #2c3e50;
  font-weight: bold;
  font-size: 14px;
}

.seleccion-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #eaf3fb;
  border: 1px solid #b8d9ef;
  border-radius: 14px;
  padding: 4px 6px 4px 12px;
  font-size: 13px;
  color: #2c3e50;
}

.seleccion-chip small {
  color: #7a8a99;
}

.seleccion-chip button {
  background: none;
  border: none;
  color: #7a8a99;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 2px 6px;
}

.seleccion-chip button:hover {
  color: #c0392b;
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

.compra-editable {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.compra-input {
  width: 90px;
  text-align: right;
  padding: 6px 8px;
  border: 1px solid #3498db;
  border-radius: 4px;
  font-size: 15px;
  font-weight: bold;
  color: #2c3e50;
  background-color: white;
}

.compra-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.35);
}

.compra-input.compra-editada {
  border-color: #e67e22;
  background-color: #fff8ee;
  color: #e67e22;
}

.compra-unidad {
  color: #666;
  font-size: 13px;
}

.compra-nota {
  margin-top: 12px;
  color: #666;
  font-size: 13px;
  font-style: italic;
}

.explicaciones-cobertura {
  margin-top: 15px;
  padding: 12px 15px;
  background-color: #f0f7ff;
  border: 1px solid #bcd9f5;
  border-radius: 8px;
}

.explicaciones-cobertura h4 {
  color: #2c3e50;
  margin: 0 0 8px 0;
  font-size: 14px;
}

.explicaciones-cobertura ul {
  margin: 0;
  padding-left: 20px;
}

.explicaciones-cobertura li {
  color: #444;
  font-size: 13px;
  margin-bottom: 6px;
  line-height: 1.4;
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

.consulta-metricas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.metrica-card {
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px 15px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metrica-label {
  color: #666;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.metrica-valor {
  color: #2c3e50;
  font-size: 20px;
  font-weight: bold;
}

.agotamiento-info {
  background-color: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px 15px;
  margin-bottom: 12px;
}

.agotamiento-info p {
  margin: 0 0 8px 0;
  color: #444;
  font-size: 14px;
}

.agotamiento-info p:last-child {
  margin-bottom: 0;
}

.agotamiento-info p.resurtir-ok {
  color: #1e7a34;
}

.agotamiento-info p.resurtir-urgente {
  color: #c0392b;
  font-weight: bold;
}

.tendencia-info {
  color: #444;
  font-size: 14px;
  margin: 0 0 18px 0;
}

.ultimas-entradas h4 {
  color: #2c3e50;
  margin: 0 0 10px 0;
  font-size: 14px;
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
