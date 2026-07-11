<template>
  <div class="existencias-page">
    <FondoMatrix class="matrix-bg" :opacity="0.4" />
    <div class="crt-overlay" aria-hidden="true"></div>

    <div class="existencias-container">
      <div class="consola-bar">
        <span class="consola-dots" aria-hidden="true">
          <span class="dot dot-rojo"></span>
          <span class="dot dot-ambar"></span>
          <span class="dot dot-verde"></span>
        </span>
        <span class="consola-title">root@rey-pez:~/inventario# ./reporte_existencias --live</span>
        <span class="consola-net">
          <span class="led" aria-hidden="true"></span> SINCRONIZADO
        </span>
      </div>

      <div class="header">
        <div class="header-titulo">
          <span class="sonar" aria-hidden="true">
            <span class="sonar-anillos"></span>
            <span class="sonar-haz"></span>
          </span>
          <div>
            <h1 aria-label="Reporte de Existencias">
              <span class="glitch" aria-hidden="true" data-text="REPORTE_EXISTENCIAS">REPORTE_EXISTENCIAS</span>
              <span class="cursor-blink" aria-hidden="true">▊</span>
            </h1>
            <span class="titulo-sub">// inventario en tiempo real · rey-pez</span>
          </div>
        </div>
        <div class="header-actions">
          <router-link to="/analisis-stock" class="analisis-button">
            <span class="btn-icono" aria-hidden="true">📊</span> Análisis de Stock
          </router-link>
          <router-link to="/asesor-experto" class="asesor-button">
            <span class="btn-icono" aria-hidden="true">🦐</span> Asesor Experto
          </router-link>
          <button @click="imprimirReporte" class="print-button">
            <span class="btn-icono" aria-hidden="true">⎙</span> Imprimir Reporte
          </button>
        </div>
      </div>

      <div class="hud-strip">
        <div class="hud-tile">
          <span class="hud-label">KILOS_TOTALES</span>
          <span class="hud-valor">{{ formatNumber(totalGeneral) }} kg</span>
        </div>
        <div class="hud-tile" v-if="tienePrecio">
          <span class="hud-label">VALOR_TOTAL</span>
          <span class="hud-valor">${{ formatNumber(valorTotal) }}</span>
        </div>
        <div class="hud-tile hud-rojo" v-if="tienePrecio">
          <span class="hud-label">SALDO_DEUDAS</span>
          <span class="hud-valor">${{ formatNumber(saldoPendienteDeudas) }}</span>
        </div>
        <div class="hud-tile hud-cian" v-if="tienePrecio">
          <span class="hud-label">VALOR_LIBRE</span>
          <span class="hud-valor">${{ formatNumber(valorLibre) }}</span>
        </div>
      </div>

      <div class="filters">
        <label class="input-wrap">
          <span class="input-prompt" aria-hidden="true">&gt;_</span>
          <input v-model="search" placeholder="Buscar por proveedor o medida" class="search-input" />
          <span v-if="search" class="filtro-tag">FILTRO ACTIVO</span>
        </label>
        <label class="cuarto-toggle">
          <input type="checkbox" v-model="filtroCuarto" />
          <span>Agrupar por cuarto frío (incluye "s/c")</span>
        </label>
      </div>

      <div v-if="!filtroCuarto && Object.keys(filteredExistencias).length === 0" class="existencias-vacio">
        <p>Sin existencias disponibles. Las salidas registradas pueden haber consumido todo el inventario.</p>
      </div>

      <div class="existencias-grid" v-if="!filtroCuarto">
        <div v-for="(datos, medidaKey) in filteredExistencias" :key="medidaKey" class="medida-card" :class="{ 'maquila-card': medidaKey === 'Ozuna' || medidaKey === 'Joselito' }">
          <!-- Para maquilas (Ozuna y Joselito) -->
          <template v-if="medidaKey === 'Ozuna' || medidaKey === 'Joselito'">
            <h2>
              {{ medidaKey }} (Maquila)
              <span v-if="tienePrecio && datos.precioPromedio" class="precio-promedio">
                - Promedio: ${{ datos.precioPromedio.toFixed(2) }}
              </span>
            </h2>
            <table class="medida-table">
              <thead>
                <tr>
                  <th>Medida</th>
                  <th v-if="tienePrecio">Precio</th>
                  <th v-if="tieneCuarto(datos.items)">Cuarto</th>
                  <th class="kilos-cell">Kilos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, itemKey) in datos.items" :key="itemKey" v-if="item.kilos > 0">
                  <td>
                    {{ item.medida }}
                    <span class="fecha-entrada" v-if="item.fechaEntrada">
                      ({{ formatearFecha(item.fechaEntrada) }})
                    </span>
                  </td>
                  <td v-if="tienePrecio" class="precio-cell">{{ item.precio ? `$${item.precio}` : '-' }}</td>
                    <td v-if="tieneCuarto(datos.items)" class="cuarto-cell">{{ item.cuartoFrio || '-' }}</td>
                  <td class="kilos-cell">{{ formatNumber(item.kilos) }}</td>
                </tr>
                <tr class="total-row">
                  <td><strong>Total {{ medidaKey }}</strong></td>
                  <td v-if="tienePrecio"></td>
                  <td class="kilos-cell">
                    <strong>{{ formatNumber(Object.values(datos.items).reduce((sum, item) => sum + item.kilos, 0)) }}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
          
          <!-- Para medidas normales con proveedores -->
          <template v-else>
            <h2 class="medida-header">
              <span class="medida-title">
                {{ medidaKey }}
                <div v-if="medidaKey === '51/60' && promedioCombinado516141" class="promedio-combinado">
                  Promedio 51,61 y 41 (Selecta): ${{ promedioCombinado516141.toFixed(2) }}
                </div>
                <span v-if="tienePrecio && datos.precioPromedioGeneral" class="precio-promedio">
                  - Promedio General: ${{ datos.precioPromedioGeneral.toFixed(2) }}
                </span>
              </span>
              <label class="agrupar-toggle">
                <input type="checkbox" v-model="agruparMedidasIguales" />
                <span>Agrupar iguales</span>
              </label>
            </h2>
            
            <!-- Mostrar cada proveedor por separado -->
            <div v-for="(proveedorData, proveedor) in datos.proveedores" :key="proveedor" class="proveedor-section">
              <h3 class="proveedor-header">
                {{ proveedor }}
                <span v-if="tienePrecio && proveedorData.precioPromedio" class="precio-promedio-proveedor">
                  - Promedio: ${{ proveedorData.precioPromedio.toFixed(2) }}
                </span>
              </h3>
              <table class="medida-table">
                <thead>
                  <tr>
                    <th>Medida</th>
                    <th v-if="tienePrecio">Precio</th>
                    <th v-if="tieneCuarto(proveedorData.items)">Cuarto</th>
                    <th class="kilos-cell">Kilos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(medida, medidaIdx) in proveedorData.items" :key="`${medida.medida}-${medida.proveedor}-${medida.precio || 'sin-precio'}-${medidaIdx}`" v-if="medida.kilos > 0">
                    <td>
                      {{ medida.medida }}
                      <span class="fecha-entrada" v-if="medida.fechaEntrada">
                        ({{ formatearFecha(medida.fechaEntrada) }})
                      </span>
                    </td>
                    <td v-if="tienePrecio" class="precio-cell">{{ medida.precio ? `$${medida.precio}` : '-' }}</td>
                    <td v-if="tieneCuarto(proveedorData.items)" class="cuarto-cell">{{ medida.cuartoFrio || '-' }}</td>
                    <td class="kilos-cell">{{ formatNumber(medida.kilos) }}</td>
                  </tr>
                  <tr class="subtotal-row">
                    <td><strong>Total {{ proveedor }}</strong></td>
                    <td v-if="tienePrecio"></td>
                    <td class="kilos-cell">
                      <strong>{{ formatNumber(proveedorData.items.reduce((sum, item) => sum + item.kilos, 0)) }}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- Total general de la medida -->
            <div class="total-medida">
              <div class="total-medida-kilos">
                <strong>Total {{ medidaKey }}: {{ formatNumber(Object.values(datos.proveedores).reduce((total, prov) => total + prov.items.reduce((sum, item) => sum + item.kilos, 0), 0)) }} kg</strong>
              </div>
              <div v-if="tienePrecio && Object.values(datos.proveedores).some(prov => prov.items.some(item => item.precio))" class="total-medida-valor">
                <strong>Valor Total: ${{ formatNumber(Object.values(datos.proveedores).reduce((total, prov) => 
                  total + prov.items.reduce((sum, item) => item.precio ? sum + (item.precio * item.kilos) : sum, 0), 0)) }}</strong>
              </div>
            </div>
          </template>
          
          <!-- Valor total para maquilas -->
          <div v-if="(medidaKey === 'Ozuna' || medidaKey === 'Joselito') && tienePrecio && Object.values(datos.items).some(item => item.precio)" class="total-maquila-valor">
            <strong>Valor Total: ${{ formatNumber(Object.values(datos.items).reduce((sum, item) => 
              item.precio ? sum + (item.precio * item.kilos) : sum, 0)) }}</strong>
          </div>
        </div>
      </div>

      <div class="existencias-grid" v-else>
        <div v-for="(items, cuartoKey) in filteredExistenciasPorCuarto" :key="cuartoKey" class="medida-card">
          <h2>{{ cuartoKey }}</h2>
          <table class="medida-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Medida</th>
                <th v-if="tienePrecio">Precio</th>
                <th class="kilos-cell">Kilos</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in items" :key="`${cuartoKey}-${idx}-${item.medida}-${item.proveedor}`">
                <td>{{ item.proveedor }}</td>
                <td>{{ item.medida }}</td>
                <td v-if="tienePrecio" class="precio-cell">{{ item.precio ? `$${item.precio}` : '-' }}</td>
                <td class="kilos-cell">{{ formatNumber(item.kilos) }}</td>
                <td class="fecha-entrada">{{ item.fechaEntrada ? formatearFecha(item.fechaEntrada) : '' }}</td>
              </tr>
              <tr class="total-row">
                <td :colspan="tienePrecio ? 3 : 2"><strong>Total {{ cuartoKey }}</strong></td>
                <td class="kilos-cell">
                  <strong>{{ formatNumber(items.reduce((sum, item) => sum + item.kilos, 0)) }}</strong>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="resumen-sistema">
        <p class="resumen-cmd"><span class="prompt-char">$</span> cat resumen.log</p>

        <div class="valor-total" v-if="tienePrecio">
          <h2>Valor Total: ${{ formatNumber(valorTotal) }}</h2>
        </div>

        <div class="saldo-pendiente-deudas" v-if="tienePrecio">
          <h2>Saldo Pendiente Deudas: ${{ formatNumber(saldoPendienteDeudas) }}</h2>
        </div>

        <div class="valor-libre" v-if="tienePrecio">
          <h2>Valor Libre: ${{ formatNumber(valorLibre) }}</h2>
        </div>

        <div class="total-general">
          <h2>Kilos Totales: {{ formatNumber(totalGeneral) }}</h2>
        </div>
      </div>

      <!-- Sección de salidas para el día siguiente -->
      <div class="salidas-dia-siguiente" v-if="salidasDiaSiguiente.length > 0">
        <h2>Apartado para Mañana ({{ fechaDiaSiguiente }})</h2>
        <div class="salidas-grid">
          <div class="salidas-proveedores" v-if="salidasProveedoresDiaSiguiente.length > 0">
            <h3>Clientes</h3>
            <table class="salidas-table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Medida</th>
                  <th v-if="tienePrecio">Precio</th>
                  <th class="kilos-cell">Kilos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(salida, salidaIdx) in salidasProveedoresDiaSiguiente" :key="`${salida.proveedor}-${salida.medida}-${salida.precio || 'sin-precio'}-${salidaIdx}`">
                  <td>{{ salida.proveedor }}</td>
                  <td>{{ salida.medida }}</td>
                  <td v-if="tienePrecio" class="precio-cell">{{ salida.precio ? `$${salida.precio}` : '-' }}</td>
                  <td class="kilos-cell">{{ formatNumber(salida.kilos) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div class="salidas-maquilas" v-if="salidasMaquilasDiaSiguiente.length > 0">
            <h3>Maquilas</h3>
            <table class="salidas-table">
              <thead>
                <tr>
                  <th>Maquila</th>
                  <th>Medida</th>
                  <th v-if="tienePrecio">Precio</th>
                  <th class="kilos-cell">Kilos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(salida, salidaIdx) in salidasMaquilasDiaSiguiente" :key="`${salida.proveedor}-${salida.medida}-${salida.precio || 'sin-precio'}-${salidaIdx}`">
                  <td>{{ salida.proveedor }}</td>
                  <td>{{ salida.medida }}</td>
                  <td v-if="tienePrecio" class="precio-cell">{{ salida.precio ? `$${salida.precio}` : '-' }}</td>
                  <td class="kilos-cell">{{ formatNumber(salida.kilos) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="total-salidas-siguiente">
          <h3>Total Apartado: {{ formatNumber(totalSalidasDiaSiguiente) }} kg</h3>
        </div>
      </div>

      <div class="total-general">
        <h2>Kilos Totales: {{ formatNumber(totalGeneral) }}</h2>
      </div>
    </div>
  </div>
</template>
<script>
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue';
import { db } from '@/firebase';
import { collection, getDocs, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import moment from 'moment';
import { formatearFecha, formatNumber } from '@/utils/formatters';
import FondoMatrix from '@/components/FondoMatrix.vue';

export default {
  name: 'Existencias',
  components: {
    FondoMatrix
  },
  setup() {
    const existencias = ref({});
    const search = ref('');
    const tienePrecio = ref(false);
    const filtroCuarto = ref(false);
    const agruparMedidasIguales = ref(false);
    const deudas = ref([]);
    const salidasDiaSiguiente = ref([]);

    // Función para implementar FIFO: encuentra la entrada más antigua para una salida
    const procesarSalidaFIFO = (entradas, salida) => {
      // Esta función ya no se necesita - respetamos la selección manual del usuario
      return 0;
    };

    const normalizeCuarto = (c) => {
      const valor = (c && c.trim()) ? c.trim() : 's/c';
      return valor.toLowerCase() === 'sin cuarto designado' ? 's/c' : valor;
    };

    const loadExistencias = async () => {
      const sacadasSnapshot = await getDocs(collection(db, 'sacadas'));
      const newExistencias = {};
      let hayPrecios = false;
      
      console.log('=== Rastreando Selecta 51/60 1ra Nacional ===');
      let totalSelecta5160 = 0;

      // Ordenar las sacadas por fecha
      const parseFechaSacada = (fecha) => {
        if (!fecha) return new Date(0);
        if (fecha instanceof Date) return fecha;
        if (typeof fecha.toDate === 'function') return fecha.toDate();
        const d = new Date(fecha);
        return isNaN(d.getTime()) ? new Date(0) : d;
      };

      const sacadasOrdenadas = sacadasSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => parseFechaSacada(a.fecha) - parseFechaSacada(b.fecha));

      // Procesar entradas y salidas directamente - sin FIFO
      sacadasOrdenadas.forEach(sacada => {
        const sacadaFecha = parseFechaSacada(sacada.fecha);
        const momentFecha = moment(sacadaFecha);

        // Procesar entradas
        sacada.entradas.forEach(entrada => {
          // Mostrar precios si están disponibles
          const usarPrecio = entrada.precio !== null && entrada.precio !== undefined;
          
          if (usarPrecio) {
            hayPrecios = true;
          }

          if (entrada.proveedor === 'Selecta' && entrada.medida === '51/60 1ra Nacional') {
            totalSelecta5160 += entrada.kilos;
            console.log(`Entrada: ${entrada.kilos} kg - Fecha: ${momentFecha.format('DD/MM/YYYY')} - Precio: ${entrada.precio || 'N/A'}`);
          }

          if (!newExistencias[entrada.proveedor]) {
            newExistencias[entrada.proveedor] = {};
          }

          const precio = usarPrecio ? entrada.precio : null;
          const cuarto = normalizeCuarto(entrada.cuartoFrio);
          // Crear clave única que incluye precio y cuarto
          const medidaKey = precio !== null
            ? `${entrada.medida}_$${precio}__${cuarto}`
            : `${entrada.medida}__${cuarto}`;

          if (!newExistencias[entrada.proveedor][medidaKey]) {
            newExistencias[entrada.proveedor][medidaKey] = {
              medida: entrada.medida,
              precio: precio,
              lotes: []
            };
          }

          const registro = newExistencias[entrada.proveedor][medidaKey];
          registro.lotes.push({
            kilos: Number(entrada.kilos) || 0,
            fechaEntrada: sacadaFecha,
            cuartoFrio: cuarto
          });
          registro.kilos = (registro.kilos || 0) + (Number(entrada.kilos) || 0);
        });

        // Procesar salidas - respetando la selección exacta del usuario
        sacada.salidas.forEach(salida => {
          // Mostrar precios si están disponibles
          const usarPrecio = salida.precio !== null && salida.precio !== undefined;

          if (salida.proveedor === 'Selecta' && salida.medida === '51/60 1ra Nacional') {
            totalSelecta5160 -= salida.kilos;
            console.log(`Salida: ${salida.kilos} kg - Fecha: ${momentFecha.format('DD/MM/YYYY')} - Precio: ${salida.precio || 'N/A'}`);
          }

          if (!newExistencias[salida.proveedor]) {
            newExistencias[salida.proveedor] = {};
          }

          const precio = usarPrecio ? salida.precio : null;
          const cuarto = normalizeCuarto(salida.cuartoFrio);
          // Crear la misma clave que usó el usuario al seleccionar (con cuarto)
          const medidaKey = precio !== null
            ? `${salida.medida}_$${precio}__${cuarto}`
            : `${salida.medida}__${cuarto}`;

          if (!newExistencias[salida.proveedor][medidaKey]) {
            newExistencias[salida.proveedor][medidaKey] = {
              medida: salida.medida,
              precio: precio,
              lotes: []
            };
          }

          const registroSalida = newExistencias[salida.proveedor][medidaKey];
          let kilosPendientes = salida.kilos;

          // Restar siguiendo FIFO para reflejar consumo desde las entradas más antiguas
          for (let i = 0; i < registroSalida.lotes.length && kilosPendientes > 0; i += 1) {
            const lote = registroSalida.lotes[i];
            if (lote.kilos >= kilosPendientes) {
              lote.kilos -= kilosPendientes;
              kilosPendientes = 0;
            } else {
              kilosPendientes -= lote.kilos;
              lote.kilos = 0;
            }
          }

          // Eliminar lotes agotados y actualizar el total restante
          registroSalida.lotes = registroSalida.lotes.filter(lote => lote.kilos > 0);
          registroSalida.kilos = registroSalida.lotes.reduce((sum, lote) => sum + lote.kilos, 0);

          if (kilosPendientes > 0) {
            console.warn('[Existencias] Salida sin suficientes lotes registrados', {
              proveedor: salida.proveedor,
              medida: salida.medida,
              precio,
              kilosPendientes
            });
          }
        });
      });

      console.log(`=== Total final Selecta 51/60 1ra Nacional: ${totalSelecta5160} kg ===`);

      // Filtrar proveedores y medidas con 0 kilos o menos
      Object.keys(newExistencias).forEach(proveedor => {
        Object.entries(newExistencias[proveedor]).forEach(([key, datos]) => {
          if (!datos.lotes) {
            datos.lotes = [];
          }

          datos.lotes = datos.lotes.filter(lote => lote.kilos > 0);
          datos.kilos = datos.lotes.reduce((sum, lote) => sum + lote.kilos, 0);

          if (datos.kilos <= 0) {
            delete newExistencias[proveedor][key];
          }
        });

        if (Object.keys(newExistencias[proveedor]).length === 0) {
          delete newExistencias[proveedor];
        }
      });

      existencias.value = newExistencias;
      tienePrecio.value = hayPrecios;
    };

    const loadDeudas = async () => {
      try {
        const querySnapshot = await getDocs(
          query(collection(db, 'deudas'), orderBy('fecha', 'desc'))
        );
        
        deudas.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error al cargar deudas: ", error);
      }
    };

    const loadSalidasDiaSiguiente = async () => {
      try {
        const hoy = moment();
        const diaSiguiente = hoy.clone().add(1, 'day');
        const inicioDiaSiguiente = diaSiguiente.startOf('day').toDate();
        const finDiaSiguiente = diaSiguiente.endOf('day').toDate();

        const sacadasSnapshot = await getDocs(
          query(
            collection(db, 'sacadas'),
            where('fecha', '>=', inicioDiaSiguiente),
            where('fecha', '<=', finDiaSiguiente)
          )
        );

        const salidasFuturas = [];
        sacadasSnapshot.docs.forEach(doc => {
          const sacada = doc.data();
          if (sacada.salidas && sacada.salidas.length > 0) {
            sacada.salidas.forEach(salida => {
              salidasFuturas.push({
                ...salida,
                fecha: sacada.fecha.toDate()
              });
            });
          }
        });

        // Agrupar por proveedor y medida
        const salidasAgrupadas = salidasFuturas.reduce((acc, salida) => {
          const key = `${salida.proveedor}-${salida.medida}${salida.precio ? `-$${salida.precio}` : ''}`;
          if (!acc[key]) {
            acc[key] = {
              proveedor: salida.proveedor,
              medida: salida.medida,
              precio: salida.precio,
              kilos: 0,
              tipo: salida.tipo || 'proveedor'
            };
          }
          acc[key].kilos += salida.kilos;
          return acc;
        }, {});

        salidasDiaSiguiente.value = Object.values(salidasAgrupadas)
          .filter(item => item.kilos > 0)
          .sort((a, b) => {
            // Ordenar por tipo (proveedor primero), luego por proveedor, luego por medida
            if (a.tipo !== b.tipo) {
              return a.tipo === 'proveedor' ? -1 : 1;
            }
            if (a.proveedor !== b.proveedor) {
              return a.proveedor.localeCompare(b.proveedor);
            }
            return a.medida.localeCompare(b.medida);
          });

      } catch (error) {
        console.error("Error al cargar salidas del día siguiente: ", error);
      }
    };

    // Función para calcular precio promedio ponderado
    const calcularPrecioPromedio = (items) => {
      if (!Array.isArray(items)) return null;
      
      const itemsConPrecio = items.filter(item => item.precio && item.precio > 0);
      if (itemsConPrecio.length === 0) return null;
      
      const totalValor = itemsConPrecio.reduce((sum, item) => sum + (item.precio * item.kilos), 0);
      const totalKilos = itemsConPrecio.reduce((sum, item) => sum + item.kilos, 0);
      
      return totalKilos > 0 ? totalValor / totalKilos : null;
    };

    // Función para calcular precio promedio para maquilas
    const calcularPrecioPromedioMaquila = (medidas) => {
      const itemsConPrecio = Object.values(medidas).filter(item => item.precio && item.precio > 0);
      if (itemsConPrecio.length === 0) return null;
      
      const totalValor = itemsConPrecio.reduce((sum, item) => sum + (item.precio * item.kilos), 0);
      const totalKilos = itemsConPrecio.reduce((sum, item) => sum + item.kilos, 0);
      
      return totalKilos > 0 ? totalValor / totalKilos : null;
    };

    // Calcular promedio combinado de medidas 51/60, 61/70 y 41/50 SOLO para proveedor Selecta
    const promedioCombinado516141 = computed(() => {
      if (!tienePrecio.value) return null;
      
      const medidasObjetivo = ['51/60', '61/70', '41/50'];
      let totalValor = 0;
      let totalKilos = 0;
      
      // Recorrer todas las existencias para calcular promedio combinado SOLO de Selecta
      Object.entries(existencias.value).forEach(([proveedor, medidas]) => {
        if (proveedor === 'Selecta') {
          Object.entries(medidas).forEach(([medidaKey, datos]) => {
            // Obtener medida base
            const medidaBase = datos.medida.split(' ')[0];
            if (medidasObjetivo.includes(medidaBase) && datos.kilos > 0 && datos.precio && datos.precio > 0) {
              totalValor += datos.precio * datos.kilos;
              totalKilos += datos.kilos;
            }
          });
        }
      });
      
      return totalKilos > 0 ? totalValor / totalKilos : null;
    });

    const toDateValue = (value) => {
      if (!value) return null;
      if (value instanceof Date) return value;
      if (value.toDate) return value.toDate();
      return null;
    };

    const ordenarItems = (items) => {
      return [...items].sort((a, b) => {
        // Ordenar por fecha de entrada (más antiguas primero)
        const fechaA = toDateValue(a.fechaEntrada);
        const fechaB = toDateValue(b.fechaEntrada);
        if (fechaA && fechaB) {
          return fechaA - fechaB;
        }
        // Si no hay fechas, ordenar por precio
        if (a.precio === null && b.precio === null) return 0;
        if (a.precio === null) return 1;
        if (b.precio === null) return -1;
        return a.precio - b.precio;
      });
    };

    const agruparItemsPorMedidaYPrecio = (items) => {
      const agrupados = {};

      items.forEach(item => {
        const precioKey = item.precio !== null && item.precio !== undefined ? item.precio : 'sin-precio';
        const key = `${item.medida}__${precioKey}`;
        const fechaItem = toDateValue(item.fechaEntrada);

        if (!agrupados[key]) {
          agrupados[key] = {
            ...item,
            kilos: 0,
            _fechaMin: fechaItem,
            _fechaMax: fechaItem,
            _cuartos: new Set(item.cuartoFrio ? [item.cuartoFrio] : [])
          };
        }

        agrupados[key].kilos += item.kilos;

        if (fechaItem) {
          if (!agrupados[key]._fechaMin || fechaItem < agrupados[key]._fechaMin) {
            agrupados[key]._fechaMin = fechaItem;
          }
          if (!agrupados[key]._fechaMax || fechaItem > agrupados[key]._fechaMax) {
            agrupados[key]._fechaMax = fechaItem;
          }
        }

        if (item.cuartoFrio) {
          agrupados[key]._cuartos.add(item.cuartoFrio);
        }
      });

      return Object.values(agrupados).map(item => {
        const { _fechaMin, _fechaMax, _cuartos, ...rest } = item;
        const cuartos = Array.from(_cuartos).filter(Boolean);
        const cuartoUnico = cuartos.length === 1 ? cuartos[0] : (cuartos.length > 1 ? 'varios' : null);

        return {
          ...rest,
          fechaEntrada: _fechaMin || rest.fechaEntrada || null,
          cuartoFrio: cuartoUnico
        };
      });
    };

    const filteredExistencias = computed(() => {
      const searchLower = search.value.toLowerCase();
      
      // Separar Ozuna y Joselito (maquilas) del resto de proveedores
      const maquilas = {};
      const otrosProveedores = {};
      
      // Primero procesar los proveedores no maquila
      Object.entries(existencias.value).forEach(([proveedor, medidas]) => {
        if (proveedor !== 'Ozuna' && proveedor !== 'Joselito') {
          otrosProveedores[proveedor] = medidas;
        }
      });

      // Procesar las maquilas después
      const procesarMaquila = (nombre) => {
        if (!existencias.value[nombre]) return;

        const medidasProcesadas = Object.entries(existencias.value[nombre])
          .flatMap(([medidaKey, datos]) => {
            const lotes = Array.isArray(datos.lotes) && datos.lotes.length > 0
              ? datos.lotes
              : [{ kilos: datos.kilos || 0, fechaEntrada: datos.fechaEntrada }];

            return lotes
              .filter(lote => lote.kilos > 1)
              .map((lote, index) => {
                const key = `${medidaKey}__${index}`;
                return [key, {
                  medida: datos.medida,
                  precio: datos.precio,
                  kilos: lote.kilos,
                  fechaEntrada: lote.fechaEntrada,
                  cuartoFrio: lote.cuartoFrio || null
                }];
              });
          })
          .sort(([_, datosA], [__, datosB]) => {
            if (datosA.fechaEntrada && datosB.fechaEntrada) {
              const fechaA = datosA.fechaEntrada instanceof Date ? datosA.fechaEntrada : datosA.fechaEntrada.toDate();
              const fechaB = datosB.fechaEntrada instanceof Date ? datosB.fechaEntrada : datosB.fechaEntrada.toDate();
              return fechaA - fechaB;
            }
            const numA = parseInt(datosA.medida.split('/')[0]);
            const numB = parseInt(datosB.medida.split('/')[0]);
            return numA - numB;
          })
          .reduce((acc, [key, datos]) => {
            acc[key] = datos;
            return acc;
          }, {});

        if (Object.keys(medidasProcesadas).length > 0) {
          maquilas[nombre] = medidasProcesadas;
        }
      };

      procesarMaquila('Ozuna');
      procesarMaquila('Joselito');

      // Agrupar por medida base y luego por proveedor
      const medidasAgrupadas = {};
      Object.entries(otrosProveedores).forEach(([proveedor, medidas]) => {
        Object.entries(medidas).forEach(([medidaKey, datos]) => {
          const lotes = Array.isArray(datos.lotes) && datos.lotes.length > 0
            ? datos.lotes
            : [{ kilos: datos.kilos || 0, fechaEntrada: datos.fechaEntrada }];

          const lotesActivos = lotes.filter(lote => lote.kilos > 1);
          // Si no hay lotes activos, omitir
          if (lotesActivos.length === 0) {
            return;
          }

          const medidaBase = datos.medida.split(' ')[0];
          if (!medidasAgrupadas[medidaBase]) {
            medidasAgrupadas[medidaBase] = {};
          }
          if (!medidasAgrupadas[medidaBase][proveedor]) {
            medidasAgrupadas[medidaBase][proveedor] = [];
          }

          lotesActivos.forEach(lote => {
            medidasAgrupadas[medidaBase][proveedor].push({
              proveedor,
              medida: datos.medida,
              precio: datos.precio,
              kilos: lote.kilos,
              fechaEntrada: lote.fechaEntrada,
              cuartoFrio: lote.cuartoFrio || null
            });
          });
        });
      });

      // Ordenar y filtrar según la búsqueda
      const resultado = {};
      
      // Primero agregar las medidas agrupadas
      Object.entries(medidasAgrupadas)
        .sort(([medidaA], [medidaB]) => {
          const numA = parseInt(medidaA.split('/')[0]);
          const numB = parseInt(medidaB.split('/')[0]);
          return numA - numB;
        })
        .forEach(([medidaBase, proveedores]) => {
          // Verificar si hay datos válidos para esta medida
          const tieneProveedoresValidos = Object.values(proveedores).some(items => 
            items.some(item => item.kilos > 1)
          );
          
          if (tieneProveedoresValidos && (!searchLower || 
              medidaBase.toLowerCase().includes(searchLower) ||
              Object.entries(proveedores).some(([proveedor, items]) => 
                proveedor.toLowerCase().includes(searchLower) || 
                items.some(item => item.medida.toLowerCase().includes(searchLower))
              ))) {
            
            // Procesar cada proveedor dentro de la medida
            const proveedoresProcesados = {};
            Object.entries(proveedores).forEach(([proveedor, items]) => {
              const itemsFiltrados = items.filter(item => item.kilos > 1);

              if (itemsFiltrados.length > 0) {
                const itemsOrdenados = ordenarItems(itemsFiltrados);
                const itemsProcesados = agruparMedidasIguales.value
                  ? ordenarItems(agruparItemsPorMedidaYPrecio(itemsOrdenados))
                  : itemsOrdenados;

                proveedoresProcesados[proveedor] = {
                  items: itemsProcesados,
                  precioPromedio: calcularPrecioPromedio(itemsOrdenados)
                };
              }
            });

            // Solo agregar la medida si tiene proveedores válidos
            if (Object.keys(proveedoresProcesados).length > 0) {
              resultado[medidaBase] = {
                proveedores: proveedoresProcesados,
                // Calcular precio promedio general de la medida
                precioPromedioGeneral: (() => {
                  const todosLosItems = Object.values(proveedoresProcesados)
                    .flatMap(p => p.items);
                  return calcularPrecioPromedio(todosLosItems);
                })()
              };
            }
          }
        });

      // Después agregar las maquilas
      Object.entries(maquilas).forEach(([proveedor, medidas]) => {
        if (!searchLower || proveedor.toLowerCase().includes(searchLower)) {
          // Filtrar medidas con 0 kilos y ordenar por fecha
          if (Object.keys(medidas).length > 0) {
            // Calcular precio promedio para la maquila
            const precioPromedio = calcularPrecioPromedioMaquila(medidas);
            resultado[proveedor] = {
              items: medidas,
              precioPromedio: precioPromedio
            };
          }
        }
      });

      return resultado;
    });

    const filteredExistenciasPorCuarto = computed(() => {
      const resultado = {};
      const searchLower = search.value.toLowerCase();

      Object.entries(existencias.value).forEach(([proveedor, medidas]) => {
        Object.entries(medidas).forEach(([_, datos]) => {
          const lotes = Array.isArray(datos.lotes) && datos.lotes.length > 0
            ? datos.lotes
            : [{ kilos: datos.kilos || 0, fechaEntrada: datos.fechaEntrada, cuartoFrio: datos.cuartoFrio }];

          lotes
            .filter(lote => lote.kilos > 1)
            .forEach(lote => {
              const key = normalizeCuarto(lote.cuartoFrio);
              const coincideBusqueda = !searchLower ||
                proveedor.toLowerCase().includes(searchLower) ||
                datos.medida.toLowerCase().includes(searchLower) ||
                key.toLowerCase().includes(searchLower);

              if (!coincideBusqueda) return;

              if (!resultado[key]) resultado[key] = [];

              resultado[key].push({
                proveedor,
                medida: datos.medida,
                precio: datos.precio,
                kilos: lote.kilos,
                fechaEntrada: lote.fechaEntrada,
                cuartoFrio: key
              });
            });
        });
      });

      const ordenado = {};
      Object.keys(resultado)
        .sort()
        .forEach(cuarto => {
          ordenado[cuarto] = resultado[cuarto].sort((a, b) => {
            if (a.proveedor !== b.proveedor) return a.proveedor.localeCompare(b.proveedor);
            return a.medida.localeCompare(b.medida);
          });
        });

      return ordenado;
    });

    const maxKilos = computed(() => {
      let max = 0;
      let maxOzuna = 0;
      Object.entries(existencias.value).forEach(([proveedor, medidas]) => {
        Object.values(medidas).forEach(datos => {
          if (proveedor.toLowerCase() === 'ozuna') {
            if (datos.kilos > maxOzuna) maxOzuna = datos.kilos;
          } else {
            if (datos.kilos > max) max = datos.kilos;
          }
        });
      });
      return { normal: max, ozuna: maxOzuna };
    });

    const totalGeneral = computed(() => {
      return Object.entries(filteredExistencias.value).reduce((total, [key, datos]) => {
        if (key === 'Ozuna' || key === 'Joselito') {
          // Para maquilas, los datos tienen la estructura { items: {...}, precioPromedio: ... }
          return total + Object.values(datos.items).reduce((sum, item) => sum + item.kilos, 0);
        } else {
          // Para medidas agrupadas, los datos tienen la estructura { proveedores: {...}, precioPromedioGeneral: ... }
          return total + Object.values(datos.proveedores).reduce((medidaTotal, proveedorData) => {
            return medidaTotal + proveedorData.items.reduce((sum, item) => sum + item.kilos, 0);
          }, 0);
        }
      }, 0);
    });

    const valorTotal = computed(() => {
      return Object.entries(filteredExistencias.value).reduce((total, [key, datos]) => {
        if (key === 'Ozuna' || key === 'Joselito') {
          // Para maquilas, los datos tienen la estructura { items: {...}, precioPromedio: ... }
          return total + Object.values(datos.items).reduce((sum, item) => {
            if (item.precio && item.precio > 0) {
              return sum + (item.kilos * item.precio);
            }
            return sum;
          }, 0);
        } else {
          // Para medidas agrupadas, los datos tienen la estructura { proveedores: {...}, precioPromedioGeneral: ... }
          return total + Object.values(datos.proveedores).reduce((medidaTotal, proveedorData) => {
            return medidaTotal + proveedorData.items.reduce((sum, item) => {
              if (item.precio && item.precio > 0) {
                return sum + (item.kilos * item.precio);
              }
              return sum;
            }, 0);
          }, 0);
        }
      }, 0);
    });

    const saldoPendienteDeudas = computed(() => {
      return deudas.value
        .filter(deuda => deuda.estado === 'pendiente')
        .reduce((sum, deuda) => sum + (deuda.saldoPendiente || 0), 0);
    });

    const valorLibre = computed(() => {
      if (!tienePrecio.value) return 0;
      return valorTotal.value - saldoPendienteDeudas.value;
    });

    const fechaDiaSiguiente = computed(() => {
      return moment().add(1, 'day').format('DD/MM/YYYY');
    });

    const salidasProveedoresDiaSiguiente = computed(() => {
      return salidasDiaSiguiente.value.filter(salida => salida.tipo === 'proveedor');
    });

    const salidasMaquilasDiaSiguiente = computed(() => {
      return salidasDiaSiguiente.value.filter(salida => salida.tipo === 'maquila');
    });

    const totalSalidasDiaSiguiente = computed(() => {
      return salidasDiaSiguiente.value.reduce((total, salida) => total + salida.kilos, 0);
    });

    const tieneCuarto = (items) => {
      if (!items) return false;
      const lista = Array.isArray(items) ? items : Object.values(items);
      return lista.some(item => !!item.cuartoFrio);
    };

    const imprimirReporte = () => {
      const fechaActual = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const columnasPrecio = tienePrecio.value ? `
        <th>Precio</th>
      ` : '';

      const celdaPrecio = tienePrecio.value ? `
        <td class="precio-cell">{{ datos.precio ? '$' + datos.precio : '-' }}</td>
      ` : '';

      // Calcular valores para el PDF
      const valorTotalPdf = valorTotal.value;
      const saldoPendientePdf = saldoPendienteDeudas.value;
      const valorLibrePdf = valorLibre.value;

      const estilos = `
        <style>
          @page { 
            size: A4 landscape; 
            margin: 0.3cm 0.3cm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 16pt;
            line-height: 1.0;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .header {
            margin-bottom: 4px;
            padding-bottom: 1px;
          }
          h1 {
            font-size: 20pt;
            margin: 0;
            padding: 0;
          }
          .fecha-reporte {
            font-size: 14pt;
          }
          .existencias-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 3px;
            margin-top: 4px;
          }
          .medida-card {
            padding: 4px;
          }
          .medida-card h2 {
            font-size: 16pt;
            margin: 0 0 3px 0;
            padding-bottom: 2px;
          }
          th, td {
            padding: 2px 4px;
            font-size: 14pt;
          }
          .precio-cell {
            text-align: center;
            color: #27ae60;
            font-weight: bold;
          }
          .fecha-entrada {
            color: #6c757d;
            font-size: 11pt;
            font-weight: normal;
            opacity: 0.7;
            margin-left: 3px;
          }
          .precio-promedio {
            color: #27ae60;
            font-size: 14pt;
            font-weight: normal;
            margin-left: 10px;
            opacity: 0.9;
          }
          .precio-promedio-proveedor {
            color: #27ae60;
            font-size: 12pt;
            font-weight: normal;
            margin-left: 8px;
            opacity: 0.8;
          }
          .proveedor-section {
            margin-bottom: 12px;
            border-left: 3px solid #3498db;
            padding-left: 8px;
          }
          .proveedor-header {
            color: #2c3e50;
            font-size: 16pt;
            margin: 8px 0 6px 0;
            border-bottom: 1px solid #bdc3c7;
            padding-bottom: 3px;
          }
          .subtotal-row {
            background-color: #ecf0f1 !important;
            border-top: 1px solid #3498db;
          }
          .subtotal-row td {
            font-weight: bold;
            color: #2c3e50;
          }
          .total-medida {
            margin-top: 8px;
            padding: 8px;
            background-color: #3498db;
            color: white;
            text-align: center;
            border-radius: 3px;
            font-size: 14pt;
          }
          @media print {
            .existencias-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
            }
            .medida-card {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
          .valor-total {
            margin-top: 4px;
            padding: 2px;
            text-align: right;
          }
          .valor-total h2 {
            font-size: 20pt;
            color: #27ae60;
            margin: 0;
          }
          .saldo-pendiente-deudas {
            margin-top: 2px;
            padding: 2px;
            text-align: right;
          }
          .saldo-pendiente-deudas h2 {
            font-size: 18pt;
            color: #e74c3c;
            margin: 0;
          }
          .valor-libre {
            margin-top: 2px;
            padding: 2px;
            text-align: right;
            border-top: 2px solid #3498db;
          }
          .valor-libre h2 {
            font-size: 20pt;
            color: #3498db;
            margin: 0;
          }
          .total-general {
            margin-top: 2px;
            padding: 2px;
          }
          .total-general h2 {
            font-size: 20pt;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 3px;
            border: 1px solid #2c3e50;
          }
          th {
            background-color: #2c3e50;
            color: white;
            text-align: left;
            padding: 2px 4px;
            font-size: 14pt;
            border: 1px solid #2c3e50;
          }
          td {
            padding: 2px 4px;
            font-size: 14pt;
            border: 1px solid #bdc3c7;
          }
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .kilos-cell {
            text-align: right;
            font-weight: bold;
            color: #2c3e50;
          }
          .total-row {
            background-color: #ecf0f1 !important;
            border-top: 1px solid #2c3e50;
          }
          .total-row td {
            font-weight: bold;
            color: #2c3e50;
          }
          .medida-card {
            padding: 4px;
            border: 1px solid #bdc3c7;
            background-color: white;
          }
          .maquila-card {
            background-color: white;
            border: 1px solid #f39c12;
          }
          .maquila-card h2 {
            color: #d35400;
            border-bottom: 1px solid #f39c12;
            padding-bottom: 1px;
          }
          .maquila-card th {
            background-color: #f39c12;
            border-color: #f39c12;
          }
          .maquila-card .total-row {
            background-color: #f8f9fa !important;
            border-top: 1px solid #f39c12;
          }
          .maquila-card .total-row td {
            color: #d35400;
            font-weight: bold;
          }
          .salidas-dia-siguiente {
            margin-top: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border: 2px solid #6c757d;
            border-radius: 8px;
          }
          .salidas-dia-siguiente h2 {
            color: #495057;
            font-size: 18pt;
            margin: 0 0 10px 0;
            text-align: center;
            border-bottom: 2px solid #6c757d;
            padding-bottom: 5px;
          }
          .salidas-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 10px;
          }
          .salidas-proveedores, .salidas-maquilas {
            background-color: white;
            padding: 10px;
            border-radius: 5px;
            border: 1px solid #ddd;
          }
          .salidas-proveedores h3, .salidas-maquilas h3 {
            color: #495057;
            font-size: 16pt;
            margin: 0 0 8px 0;
            border-bottom: 1px solid #6c757d;
            padding-bottom: 3px;
          }
          .salidas-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14pt;
          }
          .salidas-table th, .salidas-table td {
            border: 1px solid #ddd;
            padding: 5px 8px;
            text-align: left;
          }
          .salidas-table th {
            background-color: #6c757d;
            color: white;
            font-weight: bold;
          }
          .salidas-table th.kilos-cell {
            color: white;
          }
          .salidas-table tr:nth-child(even) {
            background-color: #fafafa;
          }

          .total-salidas-siguiente {
            text-align: center;
            margin-top: 10px;
            padding: 8px;
            background-color: #fff;
            border: 1px solid #6c757d;
            border-radius: 5px;
          }
          .total-salidas-siguiente h3 {
            color: #495057;
            font-size: 16pt;
            margin: 0;
          }
          @media print {
            .medida-card {
              box-shadow: none;
              border: 1px solid #bdc3c7;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .maquila-card {
              background-color: white;
              border: 1px solid #f39c12;
            }
            table {
              page-break-inside: avoid;
            }
            .valor-total, .total-general, .salidas-dia-siguiente {
              page-break-before: avoid;
              break-before: avoid;
            }
            .salidas-dia-siguiente {
              background-color: #f8f9fa !important;
              border: 2px solid #6c757d !important;
            }
            .salidas-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
          }
        </style>
      `;

      // Crear el contenido HTML completo
      const valorTotalHtml = tienePrecio.value ? `
        <div class="valor-total">
          <h2>Valor Total: $${formatNumber(valorTotalPdf)}</h2>
        </div>
      ` : '';

      const saldoPendienteHtml = tienePrecio.value ? `
        <div class="saldo-pendiente-deudas">
          <h2>Saldo Pendiente Deudas: $${formatNumber(saldoPendientePdf)}</h2>
        </div>
      ` : '';

      const valorLibreHtml = tienePrecio.value ? `
        <div class="valor-libre">
          <h2>Valor Libre: $${formatNumber(valorLibrePdf)}</h2>
        </div>
      ` : '';

      const kilosTotalesHtml = `
        <div class="total-general">
          <h2>Kilos Totales: ${formatNumber(totalGeneral.value)}</h2>
        </div>
      `;

      // Generar HTML para salidas del día siguiente
      const salidasDiaSiguienteHtml = salidasDiaSiguiente.value.length > 0 ? `
        <div class="salidas-dia-siguiente">
          <h2>Apartado para Mañana (${fechaDiaSiguiente.value})</h2>
          <div class="salidas-grid">
            ${salidasProveedoresDiaSiguiente.value.length > 0 ? `
              <div class="salidas-proveedores">
                <h3>Clientes</h3>
                <table class="salidas-table">
                  <thead>
                    <tr>
                      <th>Proveedor</th>
                      <th>Medida</th>
                      ${tienePrecio.value ? '<th>Precio</th>' : ''}
                      <th class="kilos-cell">Kilos</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${salidasProveedoresDiaSiguiente.value.map(salida => `
                      <tr>
                        <td>${salida.proveedor}</td>
                        <td>
                          ${salida.medida}
                          ${salida.fechaEntrada ? `<span class="fecha-entrada">(${formatearFecha(salida.fechaEntrada)})</span>` : ''}
                        </td>
                        ${tienePrecio.value ? `<td class="precio-cell">${salida.precio ? '$' + salida.precio : '-'}</td>` : ''}
                        <td class="kilos-cell">${formatNumber(salida.kilos)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
            
            ${salidasMaquilasDiaSiguiente.value.length > 0 ? `
              <div class="salidas-maquilas">
                <h3>Maquilas</h3>
                <table class="salidas-table">
                  <thead>
                    <tr>
                      <th>Maquila</th>
                      <th>Medida</th>
                      ${tienePrecio.value ? '<th>Precio</th>' : ''}
                      <th class="kilos-cell">Kilos</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${salidasMaquilasDiaSiguiente.value.map(salida => `
                      <tr>
                        <td>${salida.proveedor}</td>
                        <td>
                          ${salida.medida}
                          ${salida.fechaEntrada ? `<span class="fecha-entrada">(${formatearFecha(salida.fechaEntrada)})</span>` : ''}
                        </td>
                        ${tienePrecio.value ? `<td class="precio-cell">${salida.precio ? '$' + salida.precio : '-'}</td>` : ''}
                        <td class="kilos-cell">${formatNumber(salida.kilos)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
          </div>
          
          <div class="total-salidas-siguiente">
            <h3>Total Apartado: ${formatNumber(totalSalidasDiaSiguiente.value)} kg</h3>
          </div>
        </div>
      ` : '';

      const htmlCompleto = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte de Existencias</title>
          ${estilos}
        </head>
        <body>
          <div class="header">
            <h1>Reporte de Existencias</h1>
            <div class="fecha-reporte">Fecha: ${fechaActual}</div>
          </div>
          <div class="existencias-grid">
            ${Object.entries(filteredExistencias.value).map(([medidaKey, datos]) => {
              if (medidaKey === 'Ozuna' || medidaKey === 'Joselito') {
                // Para maquilas
                return `
                  <div class="medida-card maquila-card">
                    <h2>
                      ${medidaKey} (Maquila)
                      ${tienePrecio.value && datos.precioPromedio ? `<span class="precio-promedio">- Promedio: $${datos.precioPromedio.toFixed(2)}</span>` : ''}
                    </h2>
                    <table class="medida-table">
                      <thead>
                        <tr>
                          <th>Medida</th>
                          ${tienePrecio.value ? '<th>Precio</th>' : ''}
                          <th class="kilos-cell">Kilos</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${Object.entries(datos.items).map(([itemKey, item]) => 
                          item.kilos > 0 ? `
                            <tr>
                              <td>
                                ${item.medida}
                                ${item.fechaEntrada ? `<span class="fecha-entrada">(${formatearFecha(item.fechaEntrada)})</span>` : ''}
                              </td>
                              ${tienePrecio.value ? `<td class="precio-cell">${item.precio ? '$' + item.precio : '-'}</td>` : ''}
                              <td class="kilos-cell">${formatNumber(item.kilos)}</td>
                            </tr>
                          ` : ''
                        ).join('')}
                        <tr class="total-row">
                          <td><strong>Total ${medidaKey}</strong></td>
                          ${tienePrecio.value ? '<td></td>' : ''}
                          <td class="kilos-cell">
                            <strong>${formatNumber(Object.values(datos.items).reduce((sum, item) => sum + item.kilos, 0))}</strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    ${(medidaKey === 'Ozuna' || medidaKey === 'Joselito') && tienePrecio.value && Object.values(datos.items).some(item => item.precio) ? `
                      <div style="margin-top: 8px; padding: 8px; background-color: #f39c12; color: white; text-align: center; border-radius: 5px; font-size: 16px;">
                        <strong>Valor Total: $${formatNumber(Object.values(datos.items).reduce((sum, item) => 
                          item.precio ? sum + (item.precio * item.kilos) : sum, 0))}</strong>
                      </div>
                    ` : ''}
                  </div>
                `;
              } else {
                // Para medidas normales con proveedores
                return `
                  <div class="medida-card">
                    <h2>
                      ${medidaKey}
                      ${medidaKey === '51/60' && promedioCombinado516141.value ? `
                        <div style="display: block; color: #e74c3c; font-size: 12pt; font-weight: bold; margin: 3px 0; background-color: rgba(231, 76, 60, 0.1); padding: 2px 6px; border-radius: 3px; display: inline-block;">
                          Promedio 51,61 y 41 (Selecta): $${promedioCombinado516141.value.toFixed(2)}
                        </div>
                      ` : ''}
                      ${tienePrecio.value && datos.precioPromedioGeneral ? `<span class="precio-promedio">- Promedio General: $${datos.precioPromedioGeneral.toFixed(2)}</span>` : ''}
                    </h2>
                    ${Object.entries(datos.proveedores).map(([proveedor, proveedorData]) => `
                      <div class="proveedor-section">
                        <h3 class="proveedor-header">
                          ${proveedor}
                          ${tienePrecio.value && proveedorData.precioPromedio ? `<span class="precio-promedio-proveedor">- Promedio: $${proveedorData.precioPromedio.toFixed(2)}</span>` : ''}
                        </h3>
                        <table class="medida-table">
                          <thead>
                            <tr>
                              <th>Medida</th>
                              ${tienePrecio.value ? '<th>Precio</th>' : ''}
                              <th class="kilos-cell">Kilos</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${proveedorData.items.map(medida => 
                              medida.kilos > 0 ? `
                                <tr>
                                  <td>
                                    ${medida.medida}
                                    ${medida.fechaEntrada ? `<span class="fecha-entrada">(${formatearFecha(medida.fechaEntrada)})</span>` : ''}
                                  </td>
                                  ${tienePrecio.value ? `<td class="precio-cell">${medida.precio ? '$' + medida.precio : '-'}</td>` : ''}
                                  <td class="kilos-cell">${formatNumber(medida.kilos)}</td>
                                </tr>
                              ` : ''
                            ).join('')}
                            <tr class="subtotal-row">
                              <td><strong>Total ${proveedor}</strong></td>
                              ${tienePrecio.value ? '<td></td>' : ''}
                              <td class="kilos-cell">
                                <strong>${formatNumber(proveedorData.items.reduce((sum, item) => sum + item.kilos, 0))}</strong>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    `).join('')}
                    <div class="total-medida" style="padding: 10px;">
                      <div style="font-size: 16px; margin-bottom: 5px;">
                        <strong>Total ${medidaKey}: ${formatNumber(Object.values(datos.proveedores).reduce((total, prov) => total + prov.items.reduce((sum, item) => sum + item.kilos, 0), 0))} kg</strong>
                      </div>
                      ${tienePrecio.value && Object.values(datos.proveedores).some(prov => prov.items.some(item => item.precio)) ? `
                        <div style="font-size: 16px; color: #fff; background-color: rgba(0, 0, 0, 0.15); padding: 5px 10px; border-radius: 4px; display: inline-block;">
                          <strong>Valor Total: $${formatNumber(Object.values(datos.proveedores).reduce((total, prov) => 
                            total + prov.items.reduce((sum, item) => item.precio ? sum + (item.precio * item.kilos) : sum, 0), 0))}</strong>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }
            }).join('')}
          </div>
          ${valorTotalHtml}
          ${saldoPendienteHtml}
          ${valorLibreHtml}
          ${salidasDiaSiguienteHtml}
          ${kilosTotalesHtml}
        </body>
        </html>
      `;

      // Configurar la impresión
      const ventanaImpresion = window.open('', '_blank');
      ventanaImpresion.document.write(htmlCompleto);
      ventanaImpresion.document.close();

      // Esperar a que los estilos se carguen
      setTimeout(() => {
        ventanaImpresion.print();
        ventanaImpresion.close();
      }, 250);
    };

    let unsubscribe;

    onMounted(() => {
      loadExistencias();
      loadDeudas();
      loadSalidasDiaSiguiente();
      
      unsubscribe = onSnapshot(collection(db, 'sacadas'), () => {
        loadExistencias();
        loadSalidasDiaSiguiente();
      });
      
      // También escuchar cambios en deudas
      const unsubscribeDeudas = onSnapshot(collection(db, 'deudas'), () => {
        loadDeudas();
      });
      
      // Guardar ambos unsubscribers
      const originalUnsubscribe = unsubscribe;
      unsubscribe = () => {
        originalUnsubscribe();
        unsubscribeDeudas();
      };
    });

    onUnmounted(() => {
      if (unsubscribe) {
        unsubscribe();
      }
    });

    watchEffect(() => {
      console.log('Existencias actualizadas:', existencias.value);
    });

    return {
      existencias,
      filteredExistencias,
      filteredExistenciasPorCuarto,
      search,
      filtroCuarto,
      maxKilos,
      totalGeneral,
      valorTotal,
      saldoPendienteDeudas,
      valorLibre,
      tienePrecio,
      formatNumber,
      formatearFecha,
      imprimirReporte,
      salidasDiaSiguiente,
      fechaDiaSiguiente,
      salidasProveedoresDiaSiguiente,
      salidasMaquilasDiaSiguiente,
      totalSalidasDiaSiguiente,
      promedioCombinado516141,
      tieneCuarto,
      agruparMedidasIguales
    };
  }
};
</script>

<style scoped>
.existencias-page {
  --verde: #00ff66;
  --verde-claro: #a8ffcb;
  --verde-dim: rgba(0, 255, 102, 0.45);
  --verde-tenue: rgba(0, 255, 102, 0.12);
  --cian: #00e5ff;
  --violeta: #b16cff;
  --ambar: #ffb347;
  --rojo: #ff4d4d;
  --texto: #d7ffe9;
  --mono: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'SF Mono', Menlo, Consolas,
    'Courier New', monospace;

  position: relative;
  min-height: 100vh;
  background: radial-gradient(ellipse at 50% -10%, #07160d 0%, #020805 60%);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
  font-family: var(--mono);
  overflow-x: hidden;
}

.existencias-page ::selection {
  background: rgba(0, 255, 102, 0.35);
  color: #eafff2;
}

.matrix-bg {
  z-index: 0;
}

/* Capa CRT: scanlines, viñeta y barrido de luz. */
.crt-overlay {
  position: fixed;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.16) 0px,
    rgba(0, 0, 0, 0.16) 1px,
    transparent 1px,
    transparent 3px
  );
}

.crt-overlay::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 55%, rgba(0, 0, 0, 0.38) 100%);
}

.crt-overlay::after {
  content: '';
  position: absolute;
  top: -140px;
  left: 0;
  right: 0;
  height: 140px;
  background: linear-gradient(180deg, transparent, rgba(0, 255, 102, 0.05), transparent);
  animation: barrido 9s linear infinite;
  will-change: transform;
}

/* Anima transform (compositor) en vez de top para no forzar reflow continuo. */
@keyframes barrido {
  0% { transform: translateY(0); }
  100% { transform: translateY(calc(100vh + 280px)); }
}

/* Contenedor como ventana de consola con resplandor pulsante. */
.existencias-container {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  width: 100%;
  background: rgba(3, 12, 7, 0.9);
  border: 1px solid var(--verde-tenue);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(3px);
  /* Sombra estática: animar box-shadow repinta todo el contenedor en cada frame. */
  box-shadow: 0 0 50px rgba(0, 255, 102, 0.14), 0 24px 70px rgba(0, 0, 0, 0.6);
}

.consola-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: -20px -20px 18px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.55);
  border-bottom: 1px solid var(--verde-tenue);
  border-radius: 11px 11px 0 0;
}

.consola-dots {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot-rojo {
  background: #ff5f57;
  box-shadow: 0 0 8px rgba(255, 95, 87, 0.8);
}

.dot-ambar {
  background: #febc2e;
  box-shadow: 0 0 8px rgba(254, 188, 46, 0.8);
}

.dot-verde {
  background: #28c840;
  box-shadow: 0 0 8px rgba(40, 200, 64, 0.8);
}

.consola-title {
  flex: 1;
  color: rgba(168, 255, 203, 0.7);
  font-size: 13px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.consola-net {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--verde);
  font-size: 11px;
  letter-spacing: 1.5px;
  flex-shrink: 0;
}

.led {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--verde);
  animation: pulso-led 1.6s ease-in-out infinite;
}

@keyframes pulso-led {
  0%, 100% { box-shadow: 0 0 4px var(--verde); opacity: 1; }
  50% { box-shadow: 0 0 14px var(--verde); opacity: 0.55; }
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.header-titulo {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

/* Sonar decorativo: anillos con haz giratorio y pulso expansivo. */
.sonar {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid var(--verde-dim);
  background:
    radial-gradient(circle, transparent 60%, rgba(0, 255, 102, 0.3) 62%, transparent 65%),
    radial-gradient(circle, transparent 36%, rgba(0, 255, 102, 0.25) 38%, transparent 41%),
    radial-gradient(circle, rgba(0, 255, 102, 0.5) 0 5%, transparent 7%);
  box-shadow: 0 0 18px rgba(0, 255, 102, 0.25), inset 0 0 12px rgba(0, 255, 102, 0.12);
  overflow: hidden;
}

.sonar-haz {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg, rgba(0, 255, 102, 0.55), transparent 80deg, transparent);
  animation: sonar-giro 3.2s linear infinite;
}

@keyframes sonar-giro {
  to { transform: rotate(360deg); }
}

.sonar-anillos {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(0, 255, 102, 0.6);
  animation: sonar-ping 2.4s ease-out infinite;
}

@keyframes sonar-ping {
  0% { transform: scale(0.25); opacity: 0.9; }
  100% { transform: scale(1.1); opacity: 0; }
}

h1 {
  margin: 0;
  color: var(--verde);
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 2px;
  text-shadow: 0 0 6px rgba(0, 255, 102, 0.9), 0 0 24px rgba(0, 255, 102, 0.4);
  white-space: nowrap;
}

.titulo-sub {
  display: block;
  margin-top: 2px;
  color: rgba(168, 255, 203, 0.55);
  font-size: 12px;
  letter-spacing: 1px;
}

.cursor-blink {
  animation: parpadeo 1s steps(1) infinite;
}

@keyframes parpadeo {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}

/* Efecto glitch del título: dos copias desplazadas que se recortan a ráfagas. */
.glitch {
  position: relative;
  display: inline-block;
}

.glitch::before,
.glitch::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  opacity: 0.8;
  /* Estado de reposo oculto: sin esto, con prefers-reduced-motion las dos
     copias de color quedarían visibles de forma permanente. */
  clip-path: inset(0 0 100% 0);
}

.glitch::before {
  color: var(--cian);
  animation: glitch-1 3.2s infinite steps(1);
}

.glitch::after {
  color: #ff2ea6;
  animation: glitch-2 2.7s infinite steps(1);
}

@keyframes glitch-1 {
  0%, 91%, 100% { clip-path: inset(0 0 100% 0); transform: none; }
  92% { clip-path: inset(10% 0 55% 0); transform: translate(-3px, -2px); }
  94% { clip-path: inset(60% 0 8% 0); transform: translate(3px, 1px); }
  96% { clip-path: inset(30% 0 45% 0); transform: translate(-2px, 2px); }
}

@keyframes glitch-2 {
  0%, 88%, 100% { clip-path: inset(0 0 100% 0); transform: none; }
  89% { clip-path: inset(65% 0 5% 0); transform: translate(3px, 2px); }
  92% { clip-path: inset(15% 0 70% 0); transform: translate(-3px, -1px); }
  95% { clip-path: inset(42% 0 30% 0); transform: translate(2px, -2px); }
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

/* Botones de acción: neón por color con destello que cruza al pasar el mouse. */
.analisis-button,
.asesor-button,
.print-button {
  position: relative;
  overflow: hidden;
  background: transparent;
  border: 1px solid;
  border-radius: 6px;
  padding: 9px 16px;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background-color 0.2s, box-shadow 0.2s;
}

.analisis-button::after,
.asesor-button::after,
.print-button::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -70%;
  width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.22), transparent);
  transform: skewX(-20deg);
  transition: left 0.45s ease;
}

.analisis-button:hover::after,
.asesor-button:hover::after,
.print-button:hover::after {
  left: 130%;
}

.btn-icono {
  filter: drop-shadow(0 0 6px currentColor);
}

.analisis-button {
  color: var(--violeta);
  border-color: rgba(177, 108, 255, 0.55);
  text-shadow: 0 0 10px rgba(177, 108, 255, 0.5);
}

.analisis-button:hover {
  background: rgba(177, 108, 255, 0.14);
  box-shadow: 0 0 20px rgba(177, 108, 255, 0.35);
}

.asesor-button {
  color: var(--ambar);
  border-color: rgba(255, 179, 71, 0.55);
  text-shadow: 0 0 10px rgba(255, 179, 71, 0.5);
}

.asesor-button:hover {
  background: rgba(255, 179, 71, 0.14);
  box-shadow: 0 0 20px rgba(255, 179, 71, 0.35);
}

.print-button {
  color: var(--cian);
  border-color: rgba(0, 229, 255, 0.55);
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
}

.print-button:hover {
  background: rgba(0, 229, 255, 0.14);
  box-shadow: 0 0 20px rgba(0, 229, 255, 0.35);
}

/* Tira HUD de métricas con brillo que recorre cada tarjeta. */
.hud-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.hud-tile {
  --acento-hud: var(--verde);
  position: relative;
  overflow: hidden;
  flex: 1 1 170px;
  padding: 10px 14px 10px 17px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--verde-tenue);
  border-radius: 8px;
}

.hud-tile::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--acento-hud);
  box-shadow: 0 0 12px var(--acento-hud);
}

.hud-tile::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -60%;
  width: 45%;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.08), transparent);
  transform: skewX(-20deg);
  animation: hud-brillo 5.5s ease-in-out infinite;
  will-change: transform;
}

/* translateX en % del propio ancho (45% del tile): 430% ≈ cruza todo el tile. */
@keyframes hud-brillo {
  0%, 60% { transform: skewX(-20deg) translateX(0); }
  85%, 100% { transform: skewX(-20deg) translateX(430%); }
}

.hud-label {
  display: block;
  font-size: 10px;
  letter-spacing: 2px;
  color: rgba(168, 255, 203, 0.7);
  margin-bottom: 4px;
}

.hud-valor {
  font-size: 20px;
  font-weight: 700;
  color: var(--acento-hud);
  text-shadow: 0 0 14px var(--acento-hud);
  white-space: nowrap;
}

.hud-rojo {
  --acento-hud: var(--rojo);
}

.hud-cian {
  --acento-hud: var(--cian);
}

.filters {
  margin-bottom: 20px;
}

.input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--verde-dim);
  border-radius: 6px;
  padding: 0 12px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-wrap:focus-within {
  border-color: var(--verde);
  box-shadow: 0 0 18px rgba(0, 255, 102, 0.25), inset 0 0 12px rgba(0, 255, 102, 0.06);
}

.input-prompt {
  color: var(--verde);
  font-weight: 700;
  text-shadow: 0 0 8px rgba(0, 255, 102, 0.7);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  width: 100%;
  padding: 11px 0;
  background: transparent;
  border: none;
  font-family: var(--mono);
  font-size: 15px;
  color: var(--verde-claro);
  caret-color: var(--verde);
}

.search-input::placeholder {
  color: rgba(168, 255, 203, 0.6);
}

.search-input:focus {
  outline: none;
}

.filtro-tag {
  flex-shrink: 0;
  color: var(--ambar);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  border: 1px solid rgba(255, 179, 71, 0.5);
  border-radius: 4px;
  padding: 3px 8px;
  animation: parpadeo-suave 1.4s ease-in-out infinite;
}

@keyframes parpadeo-suave {
  50% { opacity: 0.45; }
}

.cuarto-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  color: var(--verde-claro);
  font-size: 14px;
  cursor: pointer;
  width: fit-content;
}

/* Checkboxes como interruptores de terminal. */
.cuarto-toggle input,
.agrupar-toggle input {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  margin: 0;
  border: 1px solid var(--verde-dim);
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.cuarto-toggle input:focus-visible,
.agrupar-toggle input:focus-visible {
  outline: 2px solid var(--cian);
  outline-offset: 2px;
}

.cuarto-toggle input:checked,
.agrupar-toggle input:checked {
  border-color: var(--verde);
  box-shadow: 0 0 10px rgba(0, 255, 102, 0.4);
}

.cuarto-toggle input:checked::after,
.agrupar-toggle input:checked::after {
  content: '✓';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--verde);
  font-size: 12px;
  font-weight: 700;
  text-shadow: 0 0 6px rgba(0, 255, 102, 0.8);
}

.existencias-vacio {
  padding: 32px;
  text-align: center;
  color: var(--ambar);
  background: rgba(255, 179, 71, 0.06);
  border: 1px dashed rgba(255, 179, 71, 0.5);
  border-radius: 8px;
  margin: 20px 0;
  font-size: 1rem;
}

.existencias-vacio p::before {
  content: '[SIN_DATOS] ';
  font-weight: 700;
  text-shadow: 0 0 10px rgba(255, 179, 71, 0.6);
}

.existencias-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 10px;
}

/* Tarjetas de medida: paneles HUD con esquinas marcadas, entrada escalonada
   y barrido de escaneo al pasar el mouse. */
.medida-card {
  --acento: var(--verde);
  position: relative;
  overflow: hidden;
  background: rgba(2, 10, 6, 0.85);
  border: 1px solid var(--verde-tenue);
  border-radius: 10px;
  padding: 14px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  animation: aparecer-card 0.5s ease backwards;
}

.medida-card:nth-child(1) { animation-delay: 0.05s; }
.medida-card:nth-child(2) { animation-delay: 0.12s; }
.medida-card:nth-child(3) { animation-delay: 0.19s; }
.medida-card:nth-child(4) { animation-delay: 0.26s; }
.medida-card:nth-child(5) { animation-delay: 0.33s; }
.medida-card:nth-child(6) { animation-delay: 0.4s; }
.medida-card:nth-child(n+7) { animation-delay: 0.47s; }

@keyframes aparecer-card {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: none; }
}

.medida-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(var(--acento), var(--acento)),
    linear-gradient(var(--acento), var(--acento)),
    linear-gradient(var(--acento), var(--acento)),
    linear-gradient(var(--acento), var(--acento)),
    linear-gradient(var(--acento), var(--acento)),
    linear-gradient(var(--acento), var(--acento)),
    linear-gradient(var(--acento), var(--acento)),
    linear-gradient(var(--acento), var(--acento));
  background-position:
    left top, left top,
    right top, right top,
    left bottom, left bottom,
    right bottom, right bottom;
  background-size:
    18px 2px, 2px 18px,
    18px 2px, 2px 18px,
    18px 2px, 2px 18px,
    18px 2px, 2px 18px;
  background-repeat: no-repeat;
  opacity: 0.45;
  transition: opacity 0.25s;
}

.medida-card:hover::before {
  opacity: 1;
}

.medida-card::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 36%;
  background: linear-gradient(180deg, transparent, rgba(0, 255, 102, 0.07), transparent);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-110%);
}

.medida-card:hover::after {
  opacity: 1;
  animation: escaneo-card 1.6s linear infinite;
}

/* translateY en % del propio alto (36% de la tarjeta): 310% ≈ sale por abajo. */
@keyframes escaneo-card {
  from { transform: translateY(-110%); }
  to { transform: translateY(310%); }
}

.medida-card:hover {
  transform: translateY(-4px);
  border-color: var(--verde-dim);
  box-shadow: 0 0 30px rgba(0, 255, 102, 0.18), 0 14px 40px rgba(0, 0, 0, 0.5);
}

/* Maquilas (Ozuna / Joselito) con acento violeta. */
.maquila-card {
  --acento: var(--violeta);
  border-color: rgba(177, 108, 255, 0.25);
}

.maquila-card:hover {
  border-color: rgba(177, 108, 255, 0.5);
  box-shadow: 0 0 30px rgba(177, 108, 255, 0.2), 0 14px 40px rgba(0, 0, 0, 0.5);
}

.medida-card h2 {
  color: var(--acento);
  font-size: 22px;
  letter-spacing: 1px;
  text-shadow: 0 0 12px var(--acento);
  border-bottom: 1px solid var(--verde-tenue);
  padding-bottom: 10px;
  margin: 0 0 12px 0;
}

.medida-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.medida-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.agrupar-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0;
  color: rgba(168, 255, 203, 0.7);
  text-shadow: none;
  margin-left: auto;
  cursor: pointer;
}

.medida-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.medida-table th,
.medida-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid rgba(0, 255, 102, 0.08);
}

.medida-table th {
  background: rgba(0, 255, 102, 0.05);
  border-bottom: 1px solid var(--verde-dim);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: rgba(168, 255, 203, 0.65);
}

.medida-table td {
  color: var(--texto);
  font-size: 13.5px;
}

.medida-table tbody tr {
  transition: background-color 0.15s;
}

.medida-table tbody tr:hover {
  background: rgba(0, 255, 102, 0.06);
}

.medida-table .kilos-cell {
  text-align: right;
  font-weight: 700;
}

.medida-table td.kilos-cell {
  color: var(--verde);
  text-shadow: 0 0 10px rgba(0, 255, 102, 0.4);
}

.medida-table .total-row {
  background: rgba(0, 255, 102, 0.08);
  font-weight: 700;
}

.medida-table .total-row td {
  border-top: 1px solid var(--verde-dim);
  color: var(--verde-claro);
}

.precio-cell {
  text-align: center;
  color: var(--ambar);
  font-weight: 700;
  font-size: 13px;
  text-shadow: 0 0 8px rgba(255, 179, 71, 0.4);
}

.cuarto-cell {
  text-align: center;
  font-weight: 600;
  color: var(--cian);
}

.fecha-entrada {
  color: rgba(168, 255, 203, 0.68);
  font-size: 11px;
  font-weight: normal;
  margin-left: 5px;
}

.promedio-combinado {
  display: inline-block;
  color: var(--rojo);
  font-size: 13px;
  font-weight: 700;
  margin: 5px 0;
  background: rgba(255, 77, 77, 0.1);
  border: 1px solid rgba(255, 77, 77, 0.4);
  padding: 3px 8px;
  border-radius: 4px;
  text-shadow: 0 0 8px rgba(255, 77, 77, 0.5);
}

.precio-promedio {
  color: var(--verde-claro);
  font-size: 14px;
  font-weight: normal;
  letter-spacing: 0;
  margin-left: 10px;
  text-shadow: none;
  opacity: 0.9;
}

.precio-promedio-proveedor {
  color: rgba(168, 255, 203, 0.75);
  font-size: 13px;
  font-weight: normal;
  margin-left: 10px;
}

.proveedor-section {
  margin-bottom: 15px;
  border-left: 2px solid var(--verde-dim);
  padding-left: 10px;
}

.proveedor-header {
  color: var(--verde-claro);
  font-size: 16px;
  margin: 10px 0 8px 0;
  border-bottom: 1px solid var(--verde-tenue);
  padding-bottom: 5px;
}

.proveedor-header::before {
  content: '> ';
  color: var(--cian);
  font-weight: 700;
}

.subtotal-row {
  background: rgba(0, 255, 102, 0.06) !important;
}

.subtotal-row td {
  border-top: 1px solid var(--verde-dim);
  font-weight: 700;
  color: var(--verde-claro) !important;
}

/* Banda de total por medida con pulso de energía. */
.total-medida {
  margin-top: 12px;
  padding: 10px;
  background: linear-gradient(90deg, rgba(0, 255, 102, 0.16), rgba(0, 229, 255, 0.1));
  border: 1px solid var(--verde-dim);
  color: var(--verde-claro);
  text-align: center;
  border-radius: 6px;
  box-shadow: inset 0 0 20px rgba(0, 255, 102, 0.12);
}

.total-medida-kilos {
  font-size: 16px;
  margin-bottom: 5px;
  color: var(--verde);
  text-shadow: 0 0 12px rgba(0, 255, 102, 0.5);
}

.total-medida-valor {
  font-size: 14px;
  color: var(--cian);
  background: rgba(0, 0, 0, 0.3);
  padding: 5px 10px;
  border-radius: 4px;
  display: inline-block;
  text-shadow: 0 0 10px rgba(0, 229, 255, 0.5);
}

.total-maquila-valor {
  margin-top: 8px;
  padding: 8px;
  background: rgba(177, 108, 255, 0.12);
  border: 1px solid rgba(177, 108, 255, 0.45);
  color: var(--violeta);
  text-align: center;
  border-radius: 6px;
  font-size: 15px;
  text-shadow: 0 0 10px rgba(177, 108, 255, 0.5);
}

/* Resumen inferior como registro del sistema. */
.resumen-sistema {
  margin-top: 24px;
  padding: 16px 18px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--verde-tenue);
  border-radius: 10px;
}

.resumen-cmd {
  margin: 0 0 12px 0;
  color: var(--verde);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 0 10px rgba(0, 255, 102, 0.5);
}

.prompt-char {
  color: var(--cian);
  font-weight: 700;
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
}

.valor-total {
  text-align: right;
  color: var(--verde);
}

.valor-total h2 {
  margin: 0;
  font-size: 24px;
  text-shadow: 0 0 16px rgba(0, 255, 102, 0.5);
}

.saldo-pendiente-deudas {
  margin-top: 8px;
  text-align: right;
  color: var(--rojo);
}

.saldo-pendiente-deudas h2 {
  margin: 0;
  font-size: 21px;
  text-shadow: 0 0 14px rgba(255, 77, 77, 0.5);
}

.valor-libre {
  margin-top: 8px;
  text-align: right;
  color: var(--cian);
  border-top: 1px dashed rgba(0, 229, 255, 0.4);
  padding-top: 8px;
}

.valor-libre h2 {
  margin: 0;
  font-size: 24px;
  text-shadow: 0 0 16px rgba(0, 229, 255, 0.5);
}

.total-general {
  margin-top: 8px;
  text-align: right;
  color: #eafff2;
}

.total-general h2 {
  margin: 0;
  font-size: 24px;
  text-shadow: 0 0 16px rgba(0, 255, 102, 0.45);
}

/* Cola de salidas de mañana: panel ámbar con franja de precaución animada. */
.salidas-dia-siguiente {
  position: relative;
  overflow: hidden;
  margin-top: 30px;
  padding: 24px 20px 20px;
  background: rgba(20, 13, 2, 0.55);
  border: 1px solid rgba(255, 179, 71, 0.4);
  border-radius: 10px;
}

.salidas-dia-siguiente::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: repeating-linear-gradient(
    45deg,
    rgba(255, 179, 71, 0.75) 0 12px,
    transparent 12px 24px
  );
}

.salidas-dia-siguiente h2 {
  color: var(--ambar);
  text-align: center;
  margin: 0 0 20px 0;
  font-size: 21px;
  letter-spacing: 1px;
  text-shadow: 0 0 14px rgba(255, 179, 71, 0.5);
  border-bottom: 1px solid rgba(255, 179, 71, 0.35);
  padding-bottom: 10px;
}

.salidas-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.salidas-proveedores,
.salidas-maquilas {
  background: rgba(0, 0, 0, 0.4);
  padding: 15px;
  border-radius: 8px;
  border: 1px solid rgba(255, 179, 71, 0.25);
}

.salidas-proveedores h3,
.salidas-maquilas h3 {
  color: var(--ambar);
  margin: 0 0 15px 0;
  font-size: 16px;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(255, 179, 71, 0.35);
  padding-bottom: 8px;
}

.salidas-proveedores h3::before,
.salidas-maquilas h3::before {
  content: '> ';
  color: var(--cian);
}

.salidas-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.salidas-table th,
.salidas-table td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 179, 71, 0.12);
  font-size: 13.5px;
}

.salidas-table th {
  background: rgba(255, 179, 71, 0.1);
  border-bottom: 1px solid rgba(255, 179, 71, 0.45);
  color: rgba(255, 214, 165, 0.9);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.salidas-table td {
  color: var(--texto);
}

.salidas-table tbody tr {
  transition: background-color 0.15s;
}

.salidas-table tbody tr:hover {
  background: rgba(255, 179, 71, 0.07);
}

.salidas-table .kilos-cell {
  text-align: right;
  font-weight: 700;
}

.salidas-table td.kilos-cell {
  color: var(--ambar);
  text-shadow: 0 0 10px rgba(255, 179, 71, 0.4);
}

.salidas-table .precio-cell {
  text-align: center;
}

.total-salidas-siguiente {
  text-align: center;
  margin-top: 20px;
  padding: 12px;
  background: rgba(255, 179, 71, 0.08);
  border: 1px solid rgba(255, 179, 71, 0.4);
  border-radius: 8px;
}

.total-salidas-siguiente h3 {
  color: var(--ambar);
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  text-shadow: 0 0 14px rgba(255, 179, 71, 0.5);
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  h1 {
    font-size: 18px;
    white-space: normal;
  }

  .sonar {
    width: 44px;
    height: 44px;
  }

  .existencias-grid {
    grid-template-columns: 1fr;
  }

  .hud-valor {
    font-size: 17px;
  }

  .medida-card h2 {
    font-size: 19px;
  }

  .precio-promedio {
    display: block;
    font-size: 13px;
    margin-left: 0;
    margin-top: 5px;
  }

  .precio-promedio-proveedor {
    display: block;
    font-size: 12px;
    margin-left: 0;
    margin-top: 3px;
  }

  .proveedor-header {
    font-size: 15px;
  }

  .medida-header {
    align-items: flex-start;
  }

  .agrupar-toggle {
    margin-left: 0;
  }

  .valor-total h2,
  .saldo-pendiente-deudas h2,
  .valor-libre h2,
  .total-general h2 {
    font-size: 18px;
  }

  .salidas-grid {
    grid-template-columns: 1fr;
  }

  .salidas-dia-siguiente {
    padding: 20px 15px 15px;
  }

  .salidas-dia-siguiente h2 {
    font-size: 18px;
  }

  .salidas-table th,
  .salidas-table td {
    padding: 8px 6px;
    font-size: 12.5px;
  }

  .total-salidas-siguiente h3 {
    font-size: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .existencias-page *,
  .existencias-page *::before,
  .existencias-page *::after {
    animation: none !important;
    transition: none !important;
  }
}

/* La impresión del reporte usa una ventana aparte con su propio HTML
   (imprimirReporte), así que no depende de estos estilos. Este bloque solo
   cubre la impresión directa de la página desde el navegador: apaga el tema
   oscuro y los efectos para que salga legible en papel. */
@media print {
  .matrix-bg,
  .crt-overlay,
  .sonar,
  .consola-bar,
  .hud-strip,
  .cursor-blink,
  .titulo-sub,
  .resumen-cmd,
  .filtro-tag,
  .glitch::before,
  .glitch::after,
  .medida-card::before,
  .medida-card::after,
  .hud-tile::after,
  .salidas-dia-siguiente::before {
    display: none !important;
  }

  .cuarto-toggle input:checked::after,
  .agrupar-toggle input:checked::after {
    color: #000 !important;
    text-shadow: none !important;
  }

  .existencias-page,
  .existencias-page * {
    color: #000 !important;
    text-shadow: none !important;
    box-shadow: none !important;
    animation: none !important;
  }

  .existencias-page,
  .existencias-container,
  .medida-card,
  .resumen-sistema,
  .salidas-dia-siguiente,
  .salidas-proveedores,
  .salidas-maquilas,
  .total-medida,
  .total-maquila-valor,
  .total-salidas-siguiente {
    background: #fff !important;
    border-color: #999 !important;
  }

  .medida-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .resumen-sistema,
  .valor-total,
  .saldo-pendiente-deudas,
  .valor-libre,
  .total-general,
  .salidas-dia-siguiente {
    break-before: avoid;
    page-break-before: avoid;
  }
}
</style>
