<template>
  <div class="reporte-consumo">
    <div class="no-print back-row">
      <BackButton to="/existencias" />
    </div>

    <header class="reporte-header">
      <h1>Reporte de Consumo por Medida</h1>
      <p class="subtitulo">
        Entradas de producto del {{ formatearFechaCorta(fechaDesde) }} al {{ formatearFechaCorta(fechaHasta) }}
        · Rey Pez
      </p>
    </header>

    <div class="filtros no-print">
      <div class="filtro-fechas">
        <label>
          Desde
          <input type="date" v-model="fechaDesde" />
        </label>
        <label>
          Hasta
          <input type="date" v-model="fechaHasta" />
        </label>
      </div>
      <div class="filtro-rapidos">
        <button
          v-for="anio in aniosDisponibles"
          :key="anio"
          @click="seleccionarAnio(anio)"
          :class="{ activo: esRangoAnio(anio) }"
        >
          {{ anio }}
        </button>
        <button @click="seleccionarTodo" :class="{ activo: esRangoTodo }">2024–Hoy</button>
      </div>
      <div class="filtro-extra">
        <input
          type="text"
          v-model="busqueda"
          placeholder="Filtrar por medida o proveedor"
          class="busqueda-input"
        />
        <label class="check-precios">
          <input type="checkbox" v-model="mostrarPrecios" />
          Mostrar precio promedio
        </label>
        <button class="btn-imprimir" @click="imprimir">⎙ Imprimir</button>
        <button
          class="btn-pdf btn-pdf-detallado"
          :disabled="!!generandoPdf || cargando || !!errorCarga"
          @click="descargarPdf('detallado')"
        >
          {{ generandoPdf === 'detallado' ? 'Generando…' : '📊 PDF Detallado' }}
        </button>
        <button
          class="btn-pdf btn-pdf-resumen"
          :disabled="!!generandoPdf || cargando || !!errorCarga"
          @click="descargarPdf('resumen')"
        >
          {{ generandoPdf === 'resumen' ? 'Generando…' : '📄 PDF Resumen' }}
        </button>
      </div>
    </div>

    <div v-if="cargando" class="estado-carga">Cargando entradas…</div>
    <div v-else-if="errorCarga" class="estado-error">{{ errorCarga }}</div>

    <template v-else>
      <div class="tiles">
        <div class="tile">
          <span class="tile-label">Compras propias</span>
          <span class="tile-valor">{{ formatNumber(reporte.totalKilos, 0) }} kg</span>
          <span class="tile-sub">{{ reporte.totalEntradas }} entradas</span>
        </div>
        <div class="tile tile-maquila">
          <span class="tile-label">Maquila (Ozuna / Joselito)</span>
          <span class="tile-valor">{{ formatNumber(reporte.maquilaKilos, 0) }} kg</span>
          <span class="tile-sub">{{ reporte.maquilaEntradas }} entradas</span>
        </div>
        <div class="tile tile-total">
          <span class="tile-label">Volumen total procesado</span>
          <span class="tile-valor">{{ formatNumber(reporte.totalKilos + reporte.maquilaKilos, 0) }} kg</span>
          <span class="tile-sub">{{ reporte.totalEntradas + reporte.maquilaEntradas }} entradas</span>
        </div>
        <div class="tile" v-for="anio in reporte.anios" :key="`tile-${anio}`">
          <span class="tile-label">Compras {{ anio }}</span>
          <span class="tile-valor">{{ formatNumber(reporte.porAnio[anio] || 0, 0) }} kg</span>
        </div>
      </div>

      <!-- ============ GLOBAL POR MEDIDA ============ -->
      <section class="seccion">
        <h2>Global por medida <span class="seccion-nota">(compras propias, sin maquila)</span></h2>
        <div v-if="medidasFiltradas.length === 0" class="sin-datos">Sin entradas en este período.</div>
        <div class="medida-card" v-for="m in medidasFiltradas" :key="m.base">
          <div class="medida-card-header">
            <h3>{{ m.base }}</h3>
            <div class="medida-totales">
              <strong>{{ formatNumber(m.kilos, 0) }} kg</strong>
              · {{ formatNumber(porcentaje(m.kilos), 1) }}% del total
              · {{ m.entradas }} entradas
              <span v-if="mostrarPrecios && m.precioPromedio">
                · prom. ${{ formatNumber(m.precioPromedio) }}
              </span>
            </div>
          </div>
          <table class="tabla">
            <thead>
              <tr>
                <th class="col-nombre">Proveedor / Medida</th>
                <th v-for="anio in reporte.anios" :key="anio" class="col-num">{{ anio }}</th>
                <th class="col-num">Entradas</th>
                <th v-if="mostrarPrecios" class="col-num">Precio prom.</th>
                <th class="col-num">Kilos</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="prov in m.proveedores">
                <tr
                  class="fila-proveedor fila-clic"
                  :key="`${m.base}-${prov.nombre}`"
                  title="Clic para ver el desglose por fecha"
                  @click="abrirDetalle({ titulo: `${m.base} · ${prov.nombre}`, proveedor: prov.nombre, base: m.base, esMaquila: false })"
                >
                  <td class="col-nombre">{{ prov.nombre }}</td>
                  <td v-for="anio in reporte.anios" :key="anio" class="col-num">
                    {{ prov.porAnio[anio] ? formatNumber(prov.porAnio[anio], 0) : '—' }}
                  </td>
                  <td class="col-num">{{ prov.entradas }}</td>
                  <td v-if="mostrarPrecios" class="col-num precio">
                    {{ prov.precioPromedio ? `$${formatNumber(prov.precioPromedio)}` : '—' }}
                  </td>
                  <td class="col-num"><strong>{{ formatNumber(prov.kilos, 0) }}</strong></td>
                </tr>
                <tr
                  v-for="v in prov.variantes"
                  :key="`${m.base}-${prov.nombre}-${v.medida}`"
                  class="fila-variante fila-clic"
                  title="Clic para ver el desglose por fecha"
                  @click="abrirDetalle({ titulo: `${v.medida} · ${prov.nombre}`, proveedor: prov.nombre, medidaExacta: v.medida, esMaquila: false })"
                >
                  <td class="col-nombre variante-nombre">{{ v.medida }}</td>
                  <td v-for="anio in reporte.anios" :key="anio" class="col-num">
                    {{ v.porAnio[anio] ? formatNumber(v.porAnio[anio], 0) : '—' }}
                  </td>
                  <td class="col-num">{{ v.entradas }}</td>
                  <td v-if="mostrarPrecios" class="col-num precio">
                    {{ v.precioPromedio ? `$${formatNumber(v.precioPromedio)}` : '—' }}
                  </td>
                  <td class="col-num">{{ formatNumber(v.kilos, 0) }}</td>
                </tr>
              </template>
              <tr class="fila-total">
                <td class="col-nombre">Total {{ m.base }}</td>
                <td v-for="anio in reporte.anios" :key="anio" class="col-num">
                  {{ m.porAnio[anio] ? formatNumber(m.porAnio[anio], 0) : '—' }}
                </td>
                <td class="col-num">{{ m.entradas }}</td>
                <td v-if="mostrarPrecios" class="col-num precio">
                  {{ m.precioPromedio ? `$${formatNumber(m.precioPromedio)}` : '—' }}
                </td>
                <td class="col-num">{{ formatNumber(m.kilos, 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ============ POR PROVEEDOR ============ -->
      <section class="seccion">
        <h2>Por proveedor <span class="seccion-nota">(compras propias)</span></h2>
        <div v-if="proveedoresAgrupados.length === 0" class="sin-datos">Sin entradas en este período.</div>
        <div class="medida-card" v-for="prov in proveedoresAgrupados" :key="`prov-${prov.nombre}`">
          <div class="medida-card-header">
            <h3>{{ prov.nombre }}</h3>
            <div class="medida-totales">
              <strong>{{ formatNumber(prov.kilos, 0) }} kg</strong>
              · {{ formatNumber(porcentaje(prov.kilos), 1) }}% del total
              · {{ prov.entradas }} entradas
            </div>
          </div>
          <table class="tabla">
            <thead>
              <tr>
                <th class="col-nombre">Medida</th>
                <th v-for="anio in reporte.anios" :key="anio" class="col-num">{{ anio }}</th>
                <th class="col-num">Entradas</th>
                <th v-if="mostrarPrecios" class="col-num">Precio prom.</th>
                <th class="col-num">Kilos</th>
                <th class="col-num">% Prov.</th>
              </tr>
            </thead>
            <tbody>
              <!-- Proveedores individuales en el grupo (si hay) -->
              <template v-if="prov.proveedoresIndividuales">
                <template v-for="indiv in prov.proveedoresIndividuales">
                  <tr
                    :key="`prov-${indiv.nombre}`"
                    class="fila-proveedor"
                  >
                    <td class="col-nombre">{{ indiv.nombre }}</td>
                    <td v-for="anio in reporte.anios" :key="anio" class="col-num">
                      {{ indiv.porAnio[anio] ? formatNumber(indiv.porAnio[anio], 0) : '—' }}
                    </td>
                    <td class="col-num">{{ indiv.medidas.reduce((s, m) => s + m.entradas, 0) }}</td>
                    <td v-if="mostrarPrecios" class="col-num"></td>
                    <td class="col-num"><strong>{{ formatNumber(indiv.kilos, 0) }}</strong></td>
                    <td class="col-num">{{ formatNumber((indiv.kilos / prov.kilos) * 100, 1) }}%</td>
                  </tr>
                  <tr
                    v-for="med in indiv.medidas"
                    :key="`prov-${indiv.nombre}-${med.nombre}`"
                    class="fila-variante fila-clic"
                    title="Clic para ver el desglose por fecha"
                    @click="abrirDetalle({ titulo: `${indiv.nombre} · ${med.nombre}`, proveedor: indiv.nombre, grupo: med.nombre, esMaquila: false })"
                  >
                    <td class="col-nombre variante-nombre">{{ med.nombre }}</td>
                    <td v-for="anio in reporte.anios" :key="anio" class="col-num">
                      {{ med.porAnio[anio] ? formatNumber(med.porAnio[anio], 0) : '—' }}
                    </td>
                    <td class="col-num">{{ med.entradas }}</td>
                    <td v-if="mostrarPrecios" class="col-num precio">
                      {{ med.precioPromedio ? `$${formatNumber(med.precioPromedio)}` : '—' }}
                    </td>
                    <td class="col-num">{{ formatNumber(med.kilos, 0) }}</td>
                    <td class="col-num">
                      {{ indiv.kilos > 0 ? formatNumber((med.kilos / indiv.kilos) * 100, 1) : '0.0' }}%
                    </td>
                  </tr>
                </template>
              </template>
              <!-- Proveedores sin agrupar (mostrar medidas directamente) -->
              <template v-else>
                <tr
                  v-for="med in prov.medidas"
                  :key="`prov-${prov.nombre}-${med.nombre}`"
                  class="fila-clic"
                  title="Clic para ver el desglose por fecha"
                  @click="abrirDetalle({ titulo: `${prov.nombre} · ${med.nombre}`, proveedor: prov.nombre, grupo: med.nombre, esMaquila: false })"
                >
                  <td class="col-nombre">{{ med.nombre }}</td>
                  <td v-for="anio in reporte.anios" :key="anio" class="col-num">
                    {{ med.porAnio[anio] ? formatNumber(med.porAnio[anio], 0) : '—' }}
                  </td>
                  <td class="col-num">{{ med.entradas }}</td>
                  <td v-if="mostrarPrecios" class="col-num precio">
                    {{ med.precioPromedio ? `$${formatNumber(med.precioPromedio)}` : '—' }}
                  </td>
                  <td class="col-num">{{ formatNumber(med.kilos, 0) }}</td>
                  <td class="col-num">
                    {{ prov.kilos > 0 ? formatNumber((med.kilos / prov.kilos) * 100, 1) : '0.0' }}%
                  </td>
                </tr>
              </template>
              <tr class="fila-total">
                <td class="col-nombre">Total {{ prov.nombre }}</td>
                <td v-for="anio in reporte.anios" :key="anio" class="col-num">
                  {{ prov.porAnio[anio] ? formatNumber(prov.porAnio[anio], 0) : '—' }}
                </td>
                <td class="col-num">{{ prov.entradas }}</td>
                <td v-if="mostrarPrecios" class="col-num"></td>
                <td class="col-num">{{ formatNumber(prov.kilos, 0) }}</td>
                <td class="col-num">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ============ MAQUILA (APARTE) ============ -->
      <section class="seccion seccion-maquila">
        <h2>
          Maquila <span class="seccion-nota">(producto de terceros — no es compra propia; dimensiona la capacidad de trabajo)</span>
        </h2>
        <div v-if="maquilasFiltradas.length === 0" class="sin-datos">Sin entradas de maquila en este período.</div>
        <div class="medida-card" v-for="maq in maquilasFiltradas" :key="`maq-${maq.nombre}`">
          <div class="medida-card-header">
            <h3>{{ maq.nombre }} (Maquila)</h3>
            <div class="medida-totales">
              <strong>{{ formatNumber(maq.kilos, 0) }} kg</strong>
              · {{ maq.entradas }} entradas
            </div>
          </div>
          <table class="tabla">
            <thead>
              <tr>
                <th class="col-nombre">Medida</th>
                <th v-for="anio in reporte.anios" :key="anio" class="col-num">{{ anio }}</th>
                <th class="col-num">Entradas</th>
                <th class="col-num">Kilos</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="med in maq.medidas"
                :key="`maq-${maq.nombre}-${med.nombre}`"
                class="fila-clic"
                title="Clic para ver el desglose por fecha"
                @click="abrirDetalle({ titulo: `${maq.nombre} (Maquila) · ${med.nombre}`, proveedor: maq.nombre, medidaExacta: med.nombre, esMaquila: true })"
              >
                <td class="col-nombre">{{ med.nombre }}</td>
                <td v-for="anio in reporte.anios" :key="anio" class="col-num">
                  {{ med.porAnio[anio] ? formatNumber(med.porAnio[anio], 0) : '—' }}
                </td>
                <td class="col-num">{{ med.entradas }}</td>
                <td class="col-num">{{ formatNumber(med.kilos, 0) }}</td>
              </tr>
              <tr class="fila-total">
                <td class="col-nombre">Total {{ maq.nombre }}</td>
                <td v-for="anio in reporte.anios" :key="anio" class="col-num">
                  {{ maq.porAnio[anio] ? formatNumber(maq.porAnio[anio], 0) : '—' }}
                </td>
                <td class="col-num">{{ maq.entradas }}</td>
                <td class="col-num">{{ formatNumber(maq.kilos, 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </template>

    <!-- ============ MODAL DE DESGLOSE POR FECHA ============ -->
    <div v-if="detalle" class="detalle-overlay no-print" @click.self="cerrarDetalle">
      <div class="detalle-modal">
        <div class="detalle-header">
          <h3>{{ detalle.titulo }}</h3>
          <button class="detalle-cerrar" @click="cerrarDetalle" title="Cerrar">&times;</button>
        </div>
        <p class="detalle-sub">
          {{ detalleEntradas.length }} entradas
          · <strong>{{ formatNumber(detalleKilos, 0) }} kg</strong>
          <span v-if="detallePrecioPromedio"> · prom. ${{ formatNumber(detallePrecioPromedio) }}</span>
          · {{ formatearFechaCorta(fechaDesde) }} — {{ formatearFechaCorta(fechaHasta) }}
        </p>
        <div class="detalle-tabla-wrap">
          <table class="tabla">
            <thead>
              <tr>
                <th class="col-nombre">Fecha</th>
                <th class="col-nombre">Medida</th>
                <th v-if="detalleTienePrecio" class="col-num">Precio</th>
                <th class="col-num">Kilos</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(e, idx) in detalleEntradas" :key="`det-${idx}`">
                <td class="col-nombre">{{ formatearFechaDia(e.fecha) }}</td>
                <td class="col-nombre">{{ e.medida }}</td>
                <td v-if="detalleTienePrecio" class="col-num precio">
                  {{ e.precio !== null && e.precio > 0 ? `$${formatNumber(e.precio)}` : '—' }}
                </td>
                <td class="col-num">{{ formatNumber(e.kilos, 0) }}</td>
              </tr>
              <tr class="fila-total">
                <td class="col-nombre" :colspan="detalleTienePrecio ? 3 : 2">Total</td>
                <td class="col-num">{{ formatNumber(detalleKilos, 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { formatNumber } from '@/utils/formatters';
import BackButton from '@/components/BackButton.vue';

// Proveedores que trabajan producto de terceros: se reportan aparte.
const MAQUILAS = ['Ozuna', 'Joselito'];

// Depuración manual de medidas: medida exacta (tal como está guardada) →
// medida con la que debe reportarse. Útil para medidas que no empiezan con
// número (ej. 'Aarón': '51/60'); las que no estén aquí aparecen en la
// sección "Medidas a depurar".
const DEPURACION_MEDIDAS = {};

// Calificativos que SÍ marcan una variante real (se mantienen separados de
// la base). Cualquier otro calificativo ("chuy", "nueva", "gde", "café",
// "Tirado", etc.) se considera la misma medida original y se fusiona con la
// base. Para agregar una nueva variante a mantener aparte, añade su patrón
// aquí.
const VARIANTES_A_CONSERVAR = [
  { patron: /1ra\s+nacional/i, etiqueta: '1ra Nacional' },
  { patron: /cristal/i, etiqueta: 'Cristal' }
];

// Regla general de depuración: la primera palabra de la medida (ej. "51/60",
// "Mixta", "Piojo") es la base. Si el resto no coincide con ninguna
// variante de VARIANTES_A_CONSERVAR, se considera la medida original y se
// reporta solo con la base ("51/60 chuy", "Piojo gde", "Piojo café" →
// "51/60", "Piojo"). Si coincide, se conserva como esa variante, con el
// nombre normalizado ("Piojo cristal" → "Piojo Cristal").
function medidaDepurada(medida) {
  const manual = DEPURACION_MEDIDAS[medida];
  if (manual) return manual;
  const token = medida.split(/\s+/)[0];
  const variante = VARIANTES_A_CONSERVAR.find(v => v.patron.test(medida));
  return variante ? `${token} ${variante.etiqueta}` : token;
}

// Agrupación de proveedores: mapea nombres de proveedores a su grupo.
// En la sección "Por proveedor", los proveedores del mismo grupo se muestran
// juntos con desglose individual dentro del grupo.
// Ej: { 'Ahumada': 'Ahumada / Vayon', 'Vayon': 'Ahumada / Vayon' }
const PROVEEDORES_GRUPO = {
  'Ahumada': 'Ahumada / Vayon',
  'Vayon': 'Ahumada / Vayon'
};

function parseFechaSacada(fecha) {
  if (!fecha) return new Date(0);
  if (fecha instanceof Date) return fecha;
  if (typeof fecha.toDate === 'function') return fecha.toDate();
  const d = new Date(fecha);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

function fechaLocalISO(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function baseDeMedida(medida) {
  const token = medidaDepurada(medida).split(/\s+/)[0];
  return /\d/.test(token) ? token : null;
}

function nuevoAcumulador(extra = {}) {
  return { kilos: 0, entradas: 0, porAnio: {}, precioSum: 0, precioKilos: 0, ...extra };
}

function acumular(acc, entrada) {
  acc.kilos += entrada.kilos;
  acc.entradas += 1;
  acc.porAnio[entrada.anio] = (acc.porAnio[entrada.anio] || 0) + entrada.kilos;
  if (entrada.precio !== null && entrada.precio > 0) {
    acc.precioSum += entrada.precio * entrada.kilos;
    acc.precioKilos += entrada.kilos;
  }
}

function precioPromedio(acc) {
  return acc.precioKilos > 0 ? acc.precioSum / acc.precioKilos : null;
}

export default {
  name: 'ReporteConsumoMedidas',
  components: { BackButton },
  data() {
    return {
      cargando: true,
      errorCarga: null,
      entradas: [],
      fechaDesde: '2024-01-01',
      fechaHasta: fechaLocalISO(),
      busqueda: '',
      mostrarPrecios: false,
      detalle: null,
      generandoPdf: null
    };
  },
  computed: {
    aniosDisponibles() {
      const actual = new Date().getFullYear();
      const anios = [];
      for (let a = 2024; a <= actual; a += 1) anios.push(a);
      return anios;
    },
    esRangoTodo() {
      return this.fechaDesde === '2024-01-01' && this.fechaHasta === fechaLocalISO();
    },
    rangoFechas() {
      return {
        desde: this.fechaDesde ? new Date(`${this.fechaDesde}T00:00:00`) : null,
        hasta: this.fechaHasta ? new Date(`${this.fechaHasta}T23:59:59.999`) : null
      };
    },
    reporte() {
      const { desde, hasta } = this.rangoFechas;

      const r = {
        totalKilos: 0,
        totalEntradas: 0,
        porAnio: {},
        maquilaKilos: 0,
        maquilaEntradas: 0,
        anios: [],
        medidas: [],
        proveedores: [],
        maquilas: [],
        sinClasificar: []
      };

      const medidas = {};
      const proveedores = {};
      const maquilas = {};
      const sinClasificar = {};
      const anios = new Set();

      this.entradas.forEach(entrada => {
        if (desde && entrada.fecha < desde) return;
        if (hasta && entrada.fecha > hasta) return;
        anios.add(entrada.anio);

        const medida = medidaDepurada(entrada.medida);

        if (entrada.esMaquila) {
          r.maquilaKilos += entrada.kilos;
          r.maquilaEntradas += 1;
          if (!maquilas[entrada.proveedor]) {
            maquilas[entrada.proveedor] = nuevoAcumulador({ nombre: entrada.proveedor, medidas: {} });
          }
          const maq = maquilas[entrada.proveedor];
          acumular(maq, entrada);
          if (!maq.medidas[medida]) {
            maq.medidas[medida] = nuevoAcumulador({ nombre: medida });
          }
          acumular(maq.medidas[medida], entrada);
          return;
        }

        r.totalKilos += entrada.kilos;
        r.totalEntradas += 1;
        r.porAnio[entrada.anio] = (r.porAnio[entrada.anio] || 0) + entrada.kilos;

        const base = baseDeMedida(medida);
        const baseProveedor = base || medida;

        if (!proveedores[entrada.proveedor]) {
          proveedores[entrada.proveedor] = nuevoAcumulador({ nombre: entrada.proveedor, medidas: {} });
        }
        const prov = proveedores[entrada.proveedor];
        acumular(prov, entrada);
        if (!prov.medidas[baseProveedor]) {
          prov.medidas[baseProveedor] = nuevoAcumulador({ nombre: baseProveedor });
        }
        acumular(prov.medidas[baseProveedor], entrada);

        if (!base) {
          const clave = `${medida}||${entrada.proveedor}`;
          if (!sinClasificar[clave]) {
            sinClasificar[clave] = nuevoAcumulador({ medida, proveedor: entrada.proveedor });
          }
          acumular(sinClasificar[clave], entrada);
          return;
        }

        if (!medidas[base]) {
          medidas[base] = nuevoAcumulador({ base, proveedores: {} });
        }
        const med = medidas[base];
        acumular(med, entrada);
        if (!med.proveedores[entrada.proveedor]) {
          med.proveedores[entrada.proveedor] = nuevoAcumulador({ nombre: entrada.proveedor, variantes: {} });
        }
        const medProv = med.proveedores[entrada.proveedor];
        acumular(medProv, entrada);
        if (!medProv.variantes[medida]) {
          medProv.variantes[medida] = nuevoAcumulador({ medida });
        }
        acumular(medProv.variantes[medida], entrada);
      });

      const porKilosDesc = (a, b) => b.kilos - a.kilos;

      r.anios = Array.from(anios).sort();
      r.medidas = Object.values(medidas)
        .map(med => ({
          ...med,
          precioPromedio: precioPromedio(med),
          proveedores: Object.values(med.proveedores)
            .map(prov => ({
              ...prov,
              precioPromedio: precioPromedio(prov),
              variantes: Object.values(prov.variantes)
                .map(v => ({ ...v, precioPromedio: precioPromedio(v) }))
                .sort(porKilosDesc)
            }))
            .sort(porKilosDesc)
        }))
        .sort(porKilosDesc);
      r.proveedores = Object.values(proveedores)
        .map(prov => ({
          ...prov,
          medidas: Object.values(prov.medidas)
            .map(med => ({ ...med, precioPromedio: precioPromedio(med) }))
            .sort(porKilosDesc)
        }))
        .sort(porKilosDesc);
      r.maquilas = Object.values(maquilas)
        .map(maq => ({ ...maq, medidas: Object.values(maq.medidas).sort(porKilosDesc) }))
        .sort(porKilosDesc);
      r.sinClasificar = Object.values(sinClasificar).sort(porKilosDesc);

      return r;
    },
    medidasFiltradas() {
      const q = this.busqueda.trim().toLowerCase();
      if (!q) return this.reporte.medidas;
      return this.reporte.medidas.filter(m =>
        m.base.toLowerCase().includes(q) ||
        m.proveedores.some(prov =>
          prov.nombre.toLowerCase().includes(q) ||
          prov.variantes.some(v => v.medida.toLowerCase().includes(q))
        )
      );
    },
    proveedoresFiltrados() {
      const q = this.busqueda.trim().toLowerCase();
      if (!q) return this.reporte.proveedores;
      return this.reporte.proveedores.filter(prov =>
        prov.nombre.toLowerCase().includes(q) ||
        prov.medidas.some(med => med.nombre.toLowerCase().includes(q))
      );
    },
    maquilasFiltradas() {
      const q = this.busqueda.trim().toLowerCase();
      if (!q) return this.reporte.maquilas;
      return this.reporte.maquilas.filter(maq =>
        maq.nombre.toLowerCase().includes(q) ||
        maq.medidas.some(med => med.nombre.toLowerCase().includes(q))
      );
    },
    proveedoresAgrupados() {
      const grupos = {};
      const proveedoresIndividuales = [];

      this.proveedoresFiltrados.forEach(prov => {
        const nombreGrupo = PROVEEDORES_GRUPO[prov.nombre];
        if (nombreGrupo) {
          if (!grupos[nombreGrupo]) {
            grupos[nombreGrupo] = {
              nombre: nombreGrupo,
              kilos: 0,
              entradas: 0,
              porAnio: {},
              medidas: [],
              proveedoresIndividuales: []
            };
          }
          const grupo = grupos[nombreGrupo];
          grupo.kilos += prov.kilos;
          grupo.entradas += prov.entradas;
          Object.keys(prov.porAnio).forEach(anio => {
            grupo.porAnio[anio] = (grupo.porAnio[anio] || 0) + prov.porAnio[anio];
          });
          grupo.proveedoresIndividuales.push({
            nombre: prov.nombre,
            medidas: prov.medidas,
            kilos: prov.kilos,
            porAnio: prov.porAnio
          });
        } else {
          proveedoresIndividuales.push(prov);
        }
      });

      return [
        ...Object.values(grupos),
        ...proveedoresIndividuales
      ];
    },
    detalleEntradas() {
      if (!this.detalle) return [];
      const d = this.detalle;
      const { desde, hasta } = this.rangoFechas;
      return this.entradas
        .filter(e => {
          if (desde && e.fecha < desde) return false;
          if (hasta && e.fecha > hasta) return false;
          if (d.esMaquila !== undefined && e.esMaquila !== d.esMaquila) return false;
          if (d.proveedor && e.proveedor !== d.proveedor) return false;
          const medida = medidaDepurada(e.medida);
          if (d.medidaExacta && medida !== d.medidaExacta) return false;
          if (d.base && baseDeMedida(medida) !== d.base) return false;
          // "grupo" es la fila de la sección por proveedor: medida base, o la
          // medida completa cuando no se pudo clasificar.
          if (d.grupo && (baseDeMedida(medida) || medida) !== d.grupo) return false;
          return true;
        })
        .sort((a, b) => a.fecha - b.fecha);
    },
    detalleKilos() {
      return this.detalleEntradas.reduce((sum, e) => sum + e.kilos, 0);
    },
    detalleTienePrecio() {
      return this.detalleEntradas.some(e => e.precio !== null && e.precio > 0);
    },
    detallePrecioPromedio() {
      const conPrecio = this.detalleEntradas.filter(e => e.precio !== null && e.precio > 0);
      const kilos = conPrecio.reduce((sum, e) => sum + e.kilos, 0);
      if (kilos <= 0) return null;
      return conPrecio.reduce((sum, e) => sum + e.precio * e.kilos, 0) / kilos;
    }
  },
  async mounted() {
    this.onKeydown = (e) => {
      if (e.key === 'Escape') this.cerrarDetalle();
    };
    document.addEventListener('keydown', this.onKeydown);
    await this.cargarEntradas();
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.onKeydown);
  },
  methods: {
    formatNumber,
    formatearFechaCorta(iso) {
      if (!iso) return '';
      const [anio, mes, dia] = iso.split('-');
      return `${dia}/${mes}/${anio}`;
    },
    porcentaje(kilos) {
      return this.reporte.totalKilos > 0 ? (kilos / this.reporte.totalKilos) * 100 : 0;
    },
    formatearFechaDia(fecha) {
      const d = fecha instanceof Date ? fecha : new Date(fecha);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    },
    abrirDetalle(detalle) {
      this.detalle = detalle;
    },
    cerrarDetalle() {
      this.detalle = null;
    },
    seleccionarAnio(anio) {
      this.fechaDesde = `${anio}-01-01`;
      const hoy = fechaLocalISO();
      const finAnio = `${anio}-12-31`;
      this.fechaHasta = finAnio < hoy ? finAnio : hoy;
    },
    esRangoAnio(anio) {
      return this.fechaDesde === `${anio}-01-01` &&
        (this.fechaHasta === `${anio}-12-31` || (String(new Date().getFullYear()) === String(anio) && this.fechaHasta === fechaLocalISO()));
    },
    seleccionarTodo() {
      this.fechaDesde = '2024-01-01';
      this.fechaHasta = fechaLocalISO();
    },
    imprimir() {
      window.print();
    },
    async descargarPdf(tipo) {
      if (this.generandoPdf || this.cargando) return;
      this.generandoPdf = tipo;
      try {
        const modulo = await import(/* webpackChunkName: "pdf-reporte-consumo" */ '@/utils/pdf/reporteConsumo');
        const q = this.busqueda.trim().toLowerCase();
        const sinClasificar = q
          ? this.reporte.sinClasificar.filter(item =>
              item.medida.toLowerCase().includes(q) || item.proveedor.toLowerCase().includes(q)
            )
          : this.reporte.sinClasificar;
        const datos = {
          reporte: this.reporte,
          medidas: this.medidasFiltradas,
          sinClasificar,
          proveedores: this.proveedoresAgrupados,
          maquilas: this.maquilasFiltradas,
          fechaDesde: this.fechaDesde,
          fechaHasta: this.fechaHasta,
          mostrarPrecios: this.mostrarPrecios
        };
        if (tipo === 'detallado') {
          modulo.generarReporteConsumoDetalladoPDF(datos);
        } else {
          modulo.generarReporteConsumoResumenPDF(datos);
        }
      } catch (error) {
        console.error('Error al generar el PDF del reporte de consumo:', error);
        alert('No se pudo generar el PDF. Intenta de nuevo.');
      } finally {
        this.generandoPdf = null;
      }
    },
    async cargarEntradas() {
      this.cargando = true;
      this.errorCarga = null;
      try {
        const snapshot = await getDocs(collection(db, 'sacadas'));
        const entradas = [];
        snapshot.docs.forEach(docSnap => {
          const sacada = docSnap.data();
          const fecha = parseFechaSacada(sacada.fecha);
          (sacada.entradas || []).forEach(entrada => {
            const medida = String(entrada.medida || '').trim();
            const proveedor = String(entrada.proveedor || '').trim() || 'Sin proveedor';
            const kilos = Number(entrada.kilos) || 0;
            if (!medida || kilos <= 0) return;
            entradas.push({
              fecha,
              anio: fecha.getFullYear(),
              medida,
              proveedor,
              kilos,
              precio: entrada.precio !== null && entrada.precio !== undefined ? Number(entrada.precio) : null,
              esMaquila: entrada.tipo === 'maquila' || MAQUILAS.includes(proveedor)
            });
          });
        });
        this.entradas = entradas;
      } catch (error) {
        console.error('Error al cargar entradas para el reporte de consumo:', error);
        this.errorCarga = 'No se pudieron cargar las entradas. Revisa la conexión e intenta de nuevo.';
      } finally {
        this.cargando = false;
      }
    }
  }
};
</script>

<style scoped>
.reporte-consumo {
  max-width: 1100px;
  margin: 14px auto 50px;
  padding: 8px 20px 40px;
  background: #f7fafc;
  border-radius: 10px;
  color: #2c3e50;
  font-family: 'Segoe UI', Arial, sans-serif;
}

.back-row {
  padding-top: 4px;
}

.reporte-header {
  text-align: center;
  margin-bottom: 18px;
}

.reporte-header h1 {
  margin: 0 0 4px;
  font-size: 1.9rem;
  color: #1a5276;
}

.subtitulo {
  margin: 0;
  color: #6c7a89;
  font-size: 0.95rem;
}

.filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: center;
  background: #f4f8fb;
  border: 1px solid #d6e4ef;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.filtro-fechas {
  display: flex;
  gap: 12px;
}

.filtro-fechas label {
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
  color: #5d6d7e;
  gap: 2px;
}

.filtro-fechas input,
.busqueda-input {
  padding: 6px 8px;
  border: 1px solid #b0c4d4;
  border-radius: 5px;
  font-size: 0.9rem;
}

.filtro-rapidos {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filtro-rapidos button {
  padding: 6px 12px;
  border: 1px solid #2980b9;
  border-radius: 5px;
  background: white;
  color: #2980b9;
  cursor: pointer;
  font-weight: 600;
}

.filtro-rapidos button.activo,
.filtro-rapidos button:hover {
  background: #2980b9;
  color: white;
}

.filtro-extra {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.busqueda-input {
  min-width: 220px;
}

.check-precios {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #5d6d7e;
  cursor: pointer;
}

.btn-imprimir {
  padding: 7px 14px;
  border: none;
  border-radius: 5px;
  background: #27ae60;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.btn-imprimir:hover {
  background: #219653;
}

.btn-pdf {
  padding: 7px 14px;
  border: none;
  border-radius: 5px;
  color: white;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.btn-pdf:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-pdf:not(:disabled):hover {
  transform: translateY(-1px);
}

.btn-pdf-detallado {
  background: linear-gradient(90deg, #1a5276, #2980b9);
  box-shadow: 0 2px 6px rgba(26, 82, 118, 0.35);
}

.btn-pdf-detallado:not(:disabled):hover {
  box-shadow: 0 3px 10px rgba(26, 82, 118, 0.45);
}

.btn-pdf-resumen {
  background: linear-gradient(90deg, #6c3483, #8e44ad);
  box-shadow: 0 2px 6px rgba(108, 52, 131, 0.35);
}

.btn-pdf-resumen:not(:disabled):hover {
  box-shadow: 0 3px 10px rgba(108, 52, 131, 0.45);
}

.estado-carga,
.estado-error,
.sin-datos {
  text-align: center;
  padding: 30px 10px;
  color: #6c7a89;
}

.estado-error {
  color: #c0392b;
}

.tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 26px;
}

.tile {
  flex: 1 1 160px;
  background: #eaf2f8;
  border: 1px solid #c8dbe9;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tile-maquila {
  background: #fef5e7;
  border-color: #f5d9a8;
}

.tile-total {
  background: #e8f8f0;
  border-color: #b8e6ce;
}

.tile-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #5d6d7e;
}

.tile-valor {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1a5276;
}

.tile-sub {
  font-size: 0.8rem;
  color: #6c7a89;
}

.seccion {
  margin-bottom: 34px;
}

.seccion h2 {
  color: #1a5276;
  border-bottom: 2px solid #2980b9;
  padding-bottom: 6px;
  margin-bottom: 14px;
  font-size: 1.3rem;
}

.seccion-maquila h2 {
  color: #9c640c;
  border-bottom-color: #e67e22;
}

.seccion-nota {
  font-size: 0.8rem;
  font-weight: 400;
  color: #6c7a89;
}

.medida-card {
  background: white;
  border: 1px solid #d6e4ef;
  border-radius: 8px;
  padding: 12px 14px 6px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(26, 82, 118, 0.08);
}

.medida-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.medida-card-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #21618c;
}

.medida-totales {
  font-size: 0.9rem;
  color: #5d6d7e;
}

.medida-totales strong {
  color: #1a5276;
}

.tabla {
  width: 100%;
  border-collapse: collapse;
  background: white;
  font-size: 0.88rem;
  margin-bottom: 8px;
}

.tabla th {
  background: #f4f8fb;
  color: #34495e;
  text-align: left;
  padding: 6px 8px;
  border-bottom: 2px solid #d6e4ef;
}

.tabla td {
  padding: 5px 8px;
  border-bottom: 1px solid #edf3f8;
}

.col-num {
  text-align: right;
  white-space: nowrap;
}

th.col-num {
  text-align: right;
}

.fila-proveedor td {
  background: #f8fbfd;
  font-weight: 600;
  color: #21618c;
  border-top: 1px solid #d6e4ef;
}

.variante-nombre {
  padding-left: 24px;
  color: #5d6d7e;
}

.fila-total td {
  background: #eaf2f8;
  font-weight: 700;
  color: #1a5276;
  border-top: 2px solid #2980b9;
}

.precio {
  color: #27ae60;
  font-weight: 600;
}

.fila-clic {
  cursor: pointer;
}

.fila-clic:hover td {
  background: #d6eaf8;
}

.detalle-overlay {
  position: fixed;
  inset: 0;
  background: rgba(20, 40, 60, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.detalle-modal {
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
  width: min(680px, 100%);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  padding: 14px 18px 18px;
}

.detalle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.detalle-header h3 {
  margin: 0;
  color: #1a5276;
  font-size: 1.15rem;
}

.detalle-cerrar {
  border: none;
  background: transparent;
  font-size: 1.6rem;
  line-height: 1;
  color: #6c7a89;
  cursor: pointer;
  padding: 2px 6px;
}

.detalle-cerrar:hover {
  color: #c0392b;
}

.detalle-sub {
  margin: 4px 0 10px;
  font-size: 0.88rem;
  color: #5d6d7e;
}

.detalle-tabla-wrap {
  overflow-y: auto;
}

.detalle-tabla-wrap .tabla th {
  position: sticky;
  top: 0;
}

@media (max-width: 700px) {
  .tabla {
    font-size: 0.78rem;
  }

  .tabla th,
  .tabla td {
    padding: 4px 5px;
  }

  .reporte-header h1 {
    font-size: 1.4rem;
  }
}

@media print {
  .no-print {
    display: none !important;
  }

  .reporte-consumo {
    max-width: none;
    padding: 0;
  }

  .medida-card {
    box-shadow: none;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .tiles {
    gap: 6px;
  }

  .tabla {
    font-size: 10pt;
  }
}
</style>
