<template>
  <div class="existencias-page">
    <div class="existencias-container">
      <div class="header">
        <h1>Reporte de Existencias</h1>
        <button @click="imprimirReporte" class="print-button">
          Imprimir Reporte
        </button>
      </div>
      
      <div class="filters">
        <input v-model="search" placeholder="Buscar por proveedor o medida" class="search-input" />
        <label class="cuarto-toggle">
          <input type="checkbox" v-model="filtroCuarto" />
          <span>Agrupar por cuarto frío (incluye "s/c")</span>
        </label>
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
                      ({{ formatFecha(item.fechaEntrada) }})
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
                  <tr v-for="medida in proveedorData.items" :key="`${medida.medida}-${medida.proveedor}-${medida.precio || 'sin-precio'}`" v-if="medida.kilos > 0">
                    <td>
                      {{ medida.medida }}
                      <span class="fecha-entrada" v-if="medida.fechaEntrada">
                        ({{ formatFecha(medida.fechaEntrada) }})
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
                <td class="fecha-entrada">{{ item.fechaEntrada ? formatFecha(item.fechaEntrada) : '' }}</td>
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
                <tr v-for="salida in salidasProveedoresDiaSiguiente" :key="`${salida.proveedor}-${salida.medida}-${salida.precio || 'sin-precio'}`">
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
                <tr v-for="salida in salidasMaquilasDiaSiguiente" :key="`${salida.proveedor}-${salida.medida}-${salida.precio || 'sin-precio'}`">
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

export default {
  name: 'Existencias',
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
      const sacadasOrdenadas = sacadasSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const fechaA = a.fecha instanceof Date ? a.fecha : a.fecha.toDate();
          const fechaB = b.fecha instanceof Date ? b.fecha : b.fecha.toDate();
          return fechaA - fechaB;
        });

      // Procesar entradas y salidas directamente - sin FIFO
      sacadasOrdenadas.forEach(sacada => {
        const sacadaFecha = sacada.fecha instanceof Date ? sacada.fecha : sacada.fecha.toDate();
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
            kilos: entrada.kilos,
            fechaEntrada: sacadaFecha,
            cuartoFrio: cuarto
          });
          registro.kilos = (registro.kilos || 0) + entrada.kilos;
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

    const formatNumber = (value) => {
      return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const formatFecha = (fecha) => {
      if (!fecha) return '';
      const fechaObj = fecha instanceof Date ? fecha : fecha.toDate();
      return moment(fechaObj).format('DD/MM');
    };

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
                          ${salida.fechaEntrada ? `<span class="fecha-entrada">(${formatFecha(salida.fechaEntrada)})</span>` : ''}
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
                          ${salida.fechaEntrada ? `<span class="fecha-entrada">(${formatFecha(salida.fechaEntrada)})</span>` : ''}
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
                                ${item.fechaEntrada ? `<span class="fecha-entrada">(${formatFecha(item.fechaEntrada)})</span>` : ''}
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
                                    ${medida.fechaEntrada ? `<span class="fecha-entrada">(${formatFecha(medida.fechaEntrada)})</span>` : ''}
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
      formatFecha,
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
  min-height: 100vh;
  background-color: #f8f9fa;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 20px;
}

.existencias-container {
  max-width: 1200px;
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

h1 {
  color: #2c3e50;
  margin: 0;
  font-size: 24px;
}

.print-button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.print-button:hover {
  background-color: #2980b9;
}

.filters {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  padding: 10px;
  border: 2px solid #3498db;
  border-radius: 5px;
  font-size: 16px;
}

.cuarto-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  color: #2c3e50;
  font-size: 14px;
}

.cuarto-toggle input {
  accent-color: #3498db;
}

.existencias-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
}

.proveedor-card {
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.proveedor-card h2 {
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.medidas-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.medida-item {
  margin-bottom: 10px;
}

.medida-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.medida-nombre {
  font-weight: bold;
  color: #2c3e50;
}

.medida-kilos {
  font-weight: bold;
  color: #000000;
}

.medida-bar-container {
  height: 20px;
  background-color: #ecf0f1;
  border-radius: 5px;
  overflow: hidden;
}

.medida-bar {
  height: 100%;
  background-color: #3498db;
  transition: width 0.3s ease;
}

.proveedor-total {
  text-align: right;
  font-weight: bold;
  margin-top: 10px;
  color: #2c3e50;
}

.valor-total {
  margin-top: 20px;
  text-align: right;
  font-size: 26px;
  font-weight: bold;
  color: #27ae60;
}

.valor-total h2 {
  margin: 0;
  font-size: 26px;
}

.saldo-pendiente-deudas {
  margin-top: 10px;
  text-align: right;
  font-size: 24px;
  font-weight: bold;
  color: #e74c3c;
}

.saldo-pendiente-deudas h2 {
  margin: 0;
  font-size: 24px;
}

.valor-libre {
  margin-top: 10px;
  text-align: right;
  font-size: 26px;
  font-weight: bold;
  color: #3498db;
  border-top: 2px solid #3498db;
  padding-top: 10px;
}

.valor-libre h2 {
  margin: 0;
  font-size: 26px;
}

.total-general {
  margin-top: 10px;
  text-align: right;
  font-size: 26px;
  font-weight: bold;
  color: #000000;
}

.total-general h2 {
  margin: 0;
  font-size: 26px;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .print-button {
    margin-top: 10px;
  }

  .existencias-grid {
    grid-template-columns: 1fr;
  }

  .valor-total h2,
  .saldo-pendiente-deudas h2,
  .valor-libre h2,
  .total-general h2 {
    font-size: 20px;
  }
}

.medida-card {
  background-color: white;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.medida-card h2 {
  color: #2c3e50;
  border-bottom: 2px solid #3498db;
  padding-bottom: 10px;
  margin-bottom: 15px;
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
  font-size: 13px;
  color: #2c3e50;
  margin-left: auto;
}

.agrupar-toggle input {
  accent-color: #3498db;
}

.proveedores-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.proveedor-item {
  margin-bottom: 10px;
}

.proveedor-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.proveedor-nombre {
  font-weight: bold;
  color: #2c3e50;
}

.proveedor-kilos {
  font-weight: bold;
  color: #000000;
}

.medida-total {
  text-align: right;
  font-weight: bold;
  margin-top: 10px;
  color: #2c3e50;
}

.ozuna-card {
  background-color: #f8f9fa;
  border: 2px solid #3498db;
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
  border-bottom: 1px solid #ddd;
}

.medida-table th {
  background-color: #f8f9fa;
  font-weight: bold;
  color: #2c3e50;
}

.medida-table .kilos-cell {
  text-align: right;
  font-weight: bold;
}

.medida-table .total-row {
  background-color: #f8f9fa;
  font-weight: bold;
}

.medida-table .total-row td {
  border-top: 2px solid #3498db;
}

.precio-cell {
  text-align: center;
  color: #27ae60;
  font-weight: bold;
  font-size: 14px;
}

.cuarto-cell {
  text-align: center;
  font-weight: 600;
  color: #2c3e50;
}

.fecha-entrada {
  color: #6c757d;
  font-size: 11px;
  font-weight: normal;
  opacity: 0.7;
  margin-left: 5px;
}

.promedio-combinado {
  display: block;
  color: #e74c3c;
  font-size: 14px;
  font-weight: bold;
  margin: 5px 0;
  background-color: rgba(231, 76, 60, 0.1);
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-block;
}

.precio-promedio {
  color: #27ae60;
  font-size: 16px;
  font-weight: normal;
  margin-left: 10px;
  opacity: 0.9;
}

.precio-promedio-proveedor {
  color: #27ae60;
  font-size: 14px;
  font-weight: normal;
  margin-left: 10px;
  opacity: 0.8;
}

.proveedor-section {
  margin-bottom: 15px;
  border-left: 3px solid #3498db;
  padding-left: 10px;
}

.proveedor-header {
  color: #2c3e50;
  font-size: 18px;
  margin: 10px 0 8px 0;
  border-bottom: 1px solid #bdc3c7;
  padding-bottom: 5px;
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
  margin-top: 10px;
  padding: 10px;
  background-color: #3498db;
  color: white;
  text-align: center;
  border-radius: 5px;
}

.total-medida-kilos {
  font-size: 16px;
  margin-bottom: 5px;
}

.total-medida-valor {
  font-size: 16px;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.15);
  padding: 5px 10px;
  border-radius: 4px;
  display: inline-block;
}

.total-maquila-valor {
  margin-top: 8px;
  padding: 8px;
  background-color: #f39c12;
  color: white;
  text-align: center;
  border-radius: 5px;
  font-size: 16px;
}

@media (max-width: 768px) {
  .precio-promedio {
    display: block;
    font-size: 14px;
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
    font-size: 16px;
  }
  
  .total-medida {
    padding: 8px;
  }
  
  .total-medida-kilos {
    font-size: 14px;
    margin-bottom: 4px;
  }
  
  .total-medida-valor {
    font-size: 14px;
    padding: 4px 8px;
  }
  
  .total-maquila-valor {
    font-size: 14px;
    padding: 6px;
    margin-top: 6px;
  }
  
  .total-medida-valor {
    font-size: 16px;
  }
  
  .total-maquila-valor {
    font-size: 16px;
  }

  .medida-header {
    align-items: flex-start;
  }

  .agrupar-toggle {
    margin-left: 0;
  }
}

/* Estilos para la sección de salidas del día siguiente */
.salidas-dia-siguiente {
  margin-top: 30px;
  padding: 20px;
  background-color: #f8f9fa;
  border: 2px solid #6c757d;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.salidas-dia-siguiente h2 {
  color: #495057;
  text-align: center;
  margin: 0 0 20px 0;
  font-size: 24px;
  border-bottom: 2px solid #6c757d;
  padding-bottom: 10px;
}

.salidas-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.salidas-proveedores, .salidas-maquilas {
  background-color: white;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.salidas-proveedores h3, .salidas-maquilas h3 {
  color: #495057;
  margin: 0 0 15px 0;
  font-size: 18px;
  border-bottom: 2px solid #6c757d;
  padding-bottom: 8px;
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
  border-bottom: 1px solid #ddd;
  font-size: 14px;
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
  background-color: #f9f9f9;
}

.salidas-table tr:hover {
  background-color: #f5f5f5;
}

.salidas-table .kilos-cell {
  text-align: right;
  font-weight: bold;
  color: #2c3e50;
}

.salidas-table .precio-cell {
  text-align: center;
  color: #27ae60;
  font-weight: bold;
}

.total-salidas-siguiente {
  text-align: center;
  margin-top: 20px;
  padding: 15px;
  background-color: white;
  border: 2px solid #6c757d;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.total-salidas-siguiente h3 {
  color: #495057;
  margin: 0;
  font-size: 22px;
  font-weight: bold;
}

@media (max-width: 768px) {
  .salidas-grid {
    grid-template-columns: 1fr;
  }
  
  .salidas-dia-siguiente {
    margin: 20px 10px;
    padding: 15px;
  }
  
  .salidas-dia-siguiente h2 {
    font-size: 20px;
  }
  
  .salidas-table th,
  .salidas-table td {
    padding: 8px 6px;
    font-size: 13px;
  }
  
  .total-salidas-siguiente h3 {
    font-size: 18px;
  }
}

@media print {
  .medida-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .valor-total,
  .saldo-pendiente-deudas,
  .valor-libre,
  .total-general,
  .salidas-dia-siguiente {
    break-before: avoid;
    page-break-before: avoid;
  }
  .salidas-dia-siguiente {
    background-color: #f8f9fa !important;
    border: 2px solid #6c757d !important;
  }
}
</style>
