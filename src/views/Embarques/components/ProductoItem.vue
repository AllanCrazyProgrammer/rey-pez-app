<template>
    <div class="producto" :data-es-venta="producto.esVenta" @keydown="handleCalculadoraC" :class="{
        'reporte-completo': coincideTarasYBolsas,
        'reporte-incompleto': !coincideTarasYBolsas && tieneAlgunReporte,
        'taras-reportadas': totalTaras > 0 && coincideTaras,
        'taras-no-reportadas': totalTaras > 0 && !coincideTaras,
        'producto-en-cero': totalTaras === 0 && totalTarasReportadas === 0,
        'medida-vacia': !producto.medida,
        'pedido-cubierto': tienePedidoReferencia && pedidoCubierto,
        'pedido-pendiente': tienePedidoReferencia && !pedidoCubierto,
        'selector-medidas-abierto': mostrarSugerencias === true && (sugerenciasMedidas.length > 0 || medidasConfiguracion.length > 0),
        'selector-tipo-abierto': mostrarSugerencias === 'tipo'
    }">
        <!-- Checkbox de venta para Ozuna -->
        <div v-if="isClienteOzuna" class="venta-checkbox-container">
            <input type="checkbox" v-model="producto.esVenta" class="form-check-input venta-checkbox"
                :id="'ventaCheck-' + producto.id" :disabled="embarqueBloqueado" @change="actualizarProducto">
            <label :for="'ventaCheck-' + producto.id">Venta</label>
        </div>

        <!-- Encabezado de la medida y selección -->
        <h2 class="encabezado-medida">
            <div class="botones-encabezado">
                <div class="botones-fila-superior">
                    <button @click="abrirModalPrecio" class="btn-precio" :class="{ 'tiene-precio': producto.precio }">
                        $
                    </button>
                    <button @click="abrirModalHilos" class="btn-hilos" :class="{ 'tiene-hilos': producto.hilos }">
                        H
                    </button>
                </div>
                <div class="botones-fila-inferior">
                    <button @click="abrirModalNota" class="btn-nota" :class="{ 'tiene-nota': producto.nota }">
                        N
                    </button>
                    <div class="kg-radio">
                        <input type="checkbox" v-model="producto.noSumarKilos" class="kg-checkbox"
                            :id="'kg-' + producto.id" :disabled="embarqueBloqueado">
                        <label :for="'kg-' + producto.id">kg</label>
                    </div>
                </div>
            </div>
            <div class="medida-texto-container">
                <span class="medida-texto" @click="handleNombreAlternativoClick" :class="{
                    'disabled': embarqueBloqueado,
                    'tiene-nombre-alternativo': producto.nombreAlternativoPDF
                }">
                    <template v-if="producto.tipo === 'c/h20'">
                        {{ producto.nombreAlternativoPDF || producto.medida || 'Sin Medida' }}
                        <span class="ch20-text">c/h20</span>
                        <span v-if="producto.nombreAlternativoPDF" class="pdf-identidad"
                            title="Nombre personalizado para PDF y medida original">
                            <span class="pdf-badge">PDF</span>
                            <span class="medida-original">{{ producto.medida }}</span>
                        </span>
                    </template>
                    <template v-else>
                        {{ producto.nombreAlternativoPDF || producto.medida || 'Sin Medida' }}
                        - {{ obtenerTipoProducto }}
                        <span v-if="producto.nombreAlternativoPDF" class="pdf-identidad"
                            title="Nombre personalizado para PDF y medida original">
                            <span class="pdf-badge">PDF</span>
                            <span class="medida-original">{{ producto.medida }}</span>
                        </span>
                    </template>
                </span>
            </div>
        </h2>
        <div v-if="mostrarIndicadoresProducto" class="producto-indicadores">
            <PedidoReferencia
                :pedido-referencia="producto.pedidoReferencia"
                :total-kilos="totalesCompartidos.totalKilos"
                :total-taras="totalesCompartidos.totalTaras"
            />
            <span
                v-if="producto.precio"
                class="precio-tag"
                :class="{ 'precio-tag-especifico': producto.precioOrigen === 'especifico' }"
            >
                <span class="precio-tag-valor">
                    <span class="precio-tag-label">Venta</span>
                    <strong>${{ producto.precio }}</strong>
                </span>
                <small v-if="descripcionPrecio" class="precio-tag-origen">{{ descripcionPrecio }}</small>
            </span>
        </div>
        <div class="producto-header">
            <div class="medida-input-container">
                <input 
                    type="text" 
                    v-model="producto.medida" 
                    class="medida-input" 
                    placeholder="Medida"
                    @input="onMedidaInput" 
                    @blur="onMedidaBlur" 
                    @focus="onMedidaFocus"
                    :disabled="embarqueBloqueado"
                    autocomplete="off"
                >
                <button @click="abrirModalAlt" class="btn-alt" :class="{ 'tiene-alt': producto.textoAlternativo }"
                    :disabled="embarqueBloqueado">
                    Alt
                </button>
                <!-- Sugerencias de medidas personalizadas y dropdown -->
                <div v-if="mostrarSugerencias === true && (sugerenciasMedidas.length > 0 || medidasConfiguracion.length > 0)" class="sugerencias-container">
                    <!-- Medidas configuradas que coinciden -->
                    <div v-if="medidasConfiguradas.length > 0" class="sugerencias-seccion">
                        <div class="sugerencias-titulo">Medidas configuradas:</div>
                        <div v-for="medida in medidasConfiguradas" :key="'config-' + medida" class="sugerencia-item config-medida"
                            @pointerdown.prevent="seleccionarMedida(medida)">
                            <i class="fas fa-star"></i> {{ medida }}
                        </div>
                    </div>
                    <!-- Medidas usadas anteriormente -->
                    <div v-if="sugerenciasMedidas.length > 0" class="sugerencias-seccion">
                        <div class="sugerencias-titulo">Medidas usadas anteriormente:</div>
                        <div v-for="medida in sugerenciasMedidas" :key="'hist-' + medida" class="sugerencia-item hist-medida"
                            @pointerdown.prevent="seleccionarMedida(medida)">
                            <i class="fas fa-history"></i> {{ medida }}
                        </div>
                    </div>
                    <!-- Todas las medidas configuradas cuando el campo está vacío -->
                    <div v-if="mostrarTodasLasMedidasDisponibles" class="sugerencias-seccion">
                        <div class="sugerencias-titulo">Todas las medidas disponibles:</div>
                        <div v-for="medida in medidasConfiguracion" :key="'all-' + medida" class="sugerencia-item all-medida"
                            @pointerdown.prevent="seleccionarMedida(medida)">
                            {{ medida }}
                        </div>
                    </div>
                </div>
            </div>
            
            <div
                class="tipo-dropdown"
                :class="{
                    'tipo-c-h20': producto.tipo === 'c/h20',
                    'tipo-s-h20': producto.tipo === 's/h20',
                    'tipo-otro': producto.tipo === 'otro',
                    'abierto': mostrarSugerencias === 'tipo'
                }"
                @focusout="!$event.currentTarget.contains($event.relatedTarget) && (mostrarSugerencias = false)"
                @keydown.esc.stop="mostrarSugerencias = false"
            >
                <button
                    type="button"
                    class="tipo-trigger"
                    :disabled="embarqueBloqueado"
                    :aria-expanded="mostrarSugerencias === 'tipo' ? 'true' : 'false'"
                    aria-haspopup="listbox"
                    @click="mostrarSugerencias = mostrarSugerencias === 'tipo' ? false : 'tipo'"
                >
                    <span class="tipo-dot"></span>
                    <span class="tipo-trigger-texto">
                        {{ producto.tipo === 's/h20' ? 'S/H20' : producto.tipo === 'c/h20' ? 'C/H20' : producto.tipo === 'otro' ? 'Otro' : 'Seleccionar' }}
                    </span>
                    <i class="fas fa-chevron-down tipo-chevron"></i>
                </button>
                <transition name="tipo-menu">
                    <div v-if="mostrarSugerencias === 'tipo'" class="tipo-menu" role="listbox" aria-label="Tipo de producto">
                        <button
                            type="button"
                            class="tipo-opcion tipo-neutro"
                            :class="{ 'activa': producto.tipo === '' }"
                            role="option"
                            :aria-selected="producto.tipo === '' ? 'true' : 'false'"
                            @click="producto.tipo = ''; mostrarSugerencias = false; onTipoChange()"
                        >
                            <span class="tipo-opcion-dot"></span>
                            <span>Seleccionar</span>
                            <i v-if="producto.tipo === ''" class="fas fa-check"></i>
                        </button>
                        <button
                            type="button"
                            class="tipo-opcion tipo-s-h20"
                            :class="{ 'activa': producto.tipo === 's/h20' }"
                            role="option"
                            :aria-selected="producto.tipo === 's/h20' ? 'true' : 'false'"
                            @click="producto.tipo = 's/h20'; mostrarSugerencias = false; onTipoChange()"
                        >
                            <span class="tipo-opcion-dot"></span>
                            <span>S/H20</span>
                            <i v-if="producto.tipo === 's/h20'" class="fas fa-check"></i>
                        </button>
                        <button
                            type="button"
                            class="tipo-opcion tipo-c-h20"
                            :class="{ 'activa': producto.tipo === 'c/h20' }"
                            role="option"
                            :aria-selected="producto.tipo === 'c/h20' ? 'true' : 'false'"
                            @click="producto.tipo = 'c/h20'; mostrarSugerencias = false; onTipoChange()"
                        >
                            <span class="tipo-opcion-dot"></span>
                            <span>C/H20</span>
                            <i v-if="producto.tipo === 'c/h20'" class="fas fa-check"></i>
                        </button>
                        <button
                            type="button"
                            class="tipo-opcion tipo-otro"
                            :class="{ 'activa': producto.tipo === 'otro' }"
                            role="option"
                            :aria-selected="producto.tipo === 'otro' ? 'true' : 'false'"
                            @click="producto.tipo = 'otro'; mostrarSugerencias = false; onTipoChange()"
                        >
                            <span class="tipo-opcion-dot"></span>
                            <span>Otro</span>
                            <i v-if="producto.tipo === 'otro'" class="fas fa-check"></i>
                        </button>
                    </div>
                </transition>
            </div>

            <input v-if="producto.tipo === 'otro'" type="text" v-model="producto.tipoPersonalizado"
                class="form-control tipo-input" placeholder="Especificar" :disabled="embarqueBloqueado">
            <button type="button" @click="eliminarProducto" class="btn btn-danger btn-sm eliminar-producto"
                :disabled="embarqueBloqueado">X</button>
        </div>
        
        <!-- Checkbox de refrigeración - Solo para clientes agregados -->
        <div v-if="esClienteAgregado" class="refrigeracion-checkbox-container">
            <input type="checkbox" v-model="producto.refrigerar" class="form-check-input refrigeracion-checkbox"
                :id="'refrigerarCheck-' + producto.id" :disabled="embarqueBloqueado"
                @change="actualizarProducto">
            <label :for="'refrigerarCheck-' + producto.id" class="refrigeracion-label">
                🧊 Refrigerar
            </label>
        </div>
        
        <!-- Mostrar valor neto debajo del tipo -->
        <div v-if="producto.tipo === 'c/h20'" class="valores-container-debajo">
            <div class="valor-neto-container">
                <label>Valor neto:</label>
                <input type="number" v-model="producto.camaronNeto" class="camaron-neto-input ios-numeric"
                    step="0.01" min="0" max="1" inputmode="numeric" pattern="[0-9]*" :disabled="embarqueBloqueado">
            </div>
        </div>
        
        <div class="sumas-verticales">
            <div class="columna">
                <div class="taras-header">
                    <h5>Taras</h5>
                    <div class="checkbox-container">
                        <input type="checkbox" v-model="producto.restarTaras" :disabled="embarqueBloqueado">
                        <label>-3</label>
                    </div>
                </div>
                <div v-for="(tara, taraIndex) in producto.taras" :key="taraIndex" class="input-group">
                    <input v-model.number="producto.taras[taraIndex]" type="tel" class="form-control tara-input"
                        ref="taraInputs"
                        placeholder="Tara" :size="String(producto.taras[taraIndex] || '').length || 1"
                        @focus="onTaraFocus(taraIndex, $event)"
                        @blur="onTaraBlur(taraIndex)"
                        :disabled="embarqueBloqueado"
                        @input="onTaraInput(taraIndex)"
                        @keydown.tab="handleTaraTab($event, taraIndex)">
                    <button type="button" @click="eliminarTara(taraIndex)" class="btn btn-danger btn-sm"
                        tabindex="-1" :disabled="embarqueBloqueado">-</button>
                </div>
                <div v-for="(taraExtra, taraExtraIndex) in producto.tarasExtra" :key="'extra-' + taraExtraIndex"
                    class="input-group">
                    <input v-model.number="producto.tarasExtra[taraExtraIndex]" type="tel"
                        class="form-control tara-input" placeholder="Tara Extra"
                        ref="taraExtraInputs"
                        :size="String(producto.tarasExtra[taraExtraIndex] || '').length || 1"
                        @focus="$event.target.select()" :disabled="embarqueBloqueado">
                    <button type="button" @click="eliminarTaraExtra(taraExtraIndex)" class="btn btn-danger btn-sm"
                        tabindex="-1" :disabled="embarqueBloqueado">-</button>
                </div>
                <div class="botones-tara">
                    <button type="button" @click="agregarTara" class="btn btn-success btn-sm agregar-tara"
                        tabindex="-1" :disabled="embarqueBloqueado">+</button>
                    <button type="button" @click="agregarTaraExtra" class="btn btn-warning btn-sm agregar-tara-extra"
                        tabindex="-1" :disabled="embarqueBloqueado">+ Extra</button>
                </div>
                <div class="total">Total: {{ totalTaras }}</div>
            </div>
            <div class="columna">
                <h5>Kilos</h5>
                <div v-for="(kilo, kiloIndex) in producto.kilos" :key="kiloIndex" class="input-group">
                    <input v-model.number="producto.kilos[kiloIndex]" type="tel" class="form-control kilo-input"
                        ref="kiloInputs"
                        placeholder="Kilos" :size="String(producto.kilos[kiloIndex] || '').length || 1"
                        @focus="onKiloFocus(kiloIndex, $event)"
                        @blur="onKiloBlur(kiloIndex)"
                        :disabled="embarqueBloqueado"
                        @input="onKiloInput(kiloIndex)"
                        @keydown.tab="handleKiloTab($event, kiloIndex)">
                </div>
                <div style="height: 38px"></div>
                <div class="total">Total: {{ totalKilos }}</div>
            </div>
        </div>
        <div class="reporte-taras-bolsas">
            <div class="reporte-item">
                <h5>Taras</h5>
                <div v-for="(tara, index) in producto.reporteTaras" :key="index" class="input-group mb-2">
                    <input type="tel" v-model="producto.reporteTaras[index]" class="form-control reporte-input"
                        ref="reporteTaraInputs"
                        @focus="$event.target.select()" :disabled="embarqueBloqueado" @input="actualizarProducto"
                        @keydown.tab="handleReporteTaraTab($event, index)">
                    <button type="button" @click="eliminarReporteTara(index)" class="btn btn-danger btn-sm"
                        tabindex="-1" :disabled="embarqueBloqueado">-</button>
                </div>
                <button type="button" @click="agregarReporteTara" class="btn btn-success btn-sm"
                    tabindex="-1" :disabled="embarqueBloqueado">+</button>
                <div class="total-taras-reporte" :class="{ 'coincide': coincideTaras, 'no-coincide': !coincideTaras }">
                    Reportadas: {{ totalTarasReportadas }}
                </div>
            </div>
            <div class="reporte-item">
                <h5>Bolsas</h5>
                <div v-for="(bolsa, index) in producto.reporteBolsas" :key="index" class="input-group mb-2">
                    <input type="tel" v-model="producto.reporteBolsas[index]" class="form-control reporte-input"
                        ref="reporteBolsaInputs"
                        @focus="$event.target.select()" :disabled="embarqueBloqueado" @input="actualizarProducto"
                        @keydown.tab="handleReporteBolsaTab($event, index)">
                </div>
                <div style="height: 31px"></div>
                <div class="total-bolsas-reporte">
                    Bolsas: {{ totalBolsasReportadas }}
                </div>
            </div>
        </div>
        <div v-if="reporteExcedeTresParentesis" class="reporte-extenso">
            {{ generarReporteExtenso }}
        </div>
    </div>
</template>


<script>
import PedidoReferencia from './PedidoReferencia.vue';
import {
    obtenerDetallePrecioParaMedida,
    normalizarMedida,
    PRECIO_MAQUILA_OZUNA_FALLBACK
} from '@/utils/preciosHistoricos';
import { normalizarFechaISO, obtenerFechaActualISO } from '@/utils/dateUtils';

export default {
    name: 'ProductoItem',
    components: {
        PedidoReferencia
    },
    props: {
        producto: {
            type: Object,
            required: true
        },
        embarqueBloqueado: {
            type: Boolean,
            default: false
        },
        medidasUsadas: {
            type: Array,
            default: () => []
        },
        medidasConfiguracion: {
            type: Array,
            default: () => []
        },
        pedidoReferenciaCliente: {
            type: Object,
            default: null
        },
        nombreCliente: {
            type: String,
            default: ''
        },
        preciosActuales: {
            type: Array,
            default: () => []
        },
        fechaEmbarque: {
            type: String,
            default: ''
        },
        precioMaquilaOzunaDefault: {
            type: Number,
            default: PRECIO_MAQUILA_OZUNA_FALLBACK
        },
        totalesAgrupadosPorClave: {
            type: Object,
            default: () => ({})
        }
    },

    data() {
        return {
            mostrarSugerencias: false,
            sugerenciasMedidas: [],
            // Solo la medida operativa determina el precio. El nombre para PDF
            // nunca modifica esta referencia.
            medidaPrecioAnteriorNormalizada: normalizarMedida(this.producto?.medida)
        };
    },

    emits: [
        'update:producto',
        'eliminar-producto',
        'mostrar-modal-precio',
        'mostrar-modal-hilos',
        'mostrar-modal-nota',
        'mostrar-modal-nombre-alternativo',
        'mostrar-modal-alt',
        'actualizar-medidas-usadas',
        'seleccionar-medida',
        'activar-incluir-precios-catarro',
        'precio-asignado-automaticamente'
    ],

    computed: {
        // Detectar si el cliente es Ozuna
        isClienteOzuna() {
            return this.nombreCliente.toLowerCase() === 'ozuna';
        },

        // Medidas configuradas que coinciden con la búsqueda actual
        medidasConfiguradas() {
            if (!this.producto.medida) return [];
            const valor = this.normalizarTextoBusqueda(this.producto.medida);
            return this.medidasConfiguracion.filter(m =>
                this.medidaCoincideConBusqueda(m, valor) &&
                this.normalizarTextoBusqueda(m) !== valor
            );
        },

        mostrarTodasLasMedidasDisponibles() {
            return this.medidasConfiguracion.length > 0 &&
                (!this.producto.medida || (this.medidasConfiguradas.length === 0 && this.sugerenciasMedidas.length === 0));
        },

        // Detectar si es un cliente agregado (no predefinido)
        esClienteAgregado() {
            const clientesPredefinidos = ['joselito', 'catarro', 'ozuna', 'otilio', 'elizabeth', 'veronica', 'lorena'];
            return !clientesPredefinidos.includes(this.nombreCliente.toLowerCase());
        },

        // Cálculo del total de taras
        totalTaras() {
            const tarasNormales = (this.producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
            const tarasExtra = (this.producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
            return tarasNormales + tarasExtra;
        },

        // Cálculo del total de kilos
        totalKilos() {
            const sumaKilos = (this.producto.kilos || []).reduce((sum, kilo) => sum + (kilo || 0), 0);
            const sumaTarasNormales = (this.producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
            // No incluimos las taras extra en el descuento
            const descuentoTaras = this.producto.restarTaras ? sumaTarasNormales * 3 : 0;
            const resultado = Number((sumaKilos - descuentoTaras).toFixed(1));
            return resultado;
        },

        // Obtiene el tipo de producto
        obtenerTipoProducto() {
            if (this.producto.tipo === 'otro') {
                return this.producto.tipoPersonalizado || 'Otro';
            }
            return this.producto.tipo || 'Sin Tipo';
        },

        claveReferenciaProducto() {
            // Usar nombreAlternativoPDF como medida efectiva para agrupar con el producto del pedido
            const medidaEfectiva = this.producto.nombreAlternativoPDF || this.producto.medida;
            const { medida, tipoDetectado } = this.normalizarMedidaParaReferencia(medidaEfectiva);
            if (!medida) return null;
            const tipoBase = (this.producto.tipo || tipoDetectado || '').toString().trim().toLowerCase();
            const tipoPersonalizado = (this.producto.tipoPersonalizado || '').toString().trim().toLowerCase();
            const tipoPersonalizadoKey = tipoBase === 'otro' ? tipoPersonalizado : '';
            return `${medida}__${tipoBase}__${tipoPersonalizadoKey}`;
        },

        totalesCompartidos() {
            if (!this.claveReferenciaProducto || !this.totalesAgrupadosPorClave[this.claveReferenciaProducto]) {
                return { totalKilos: this.totalKilos, totalTaras: this.totalTaras };
            }
            return this.totalesAgrupadosPorClave[this.claveReferenciaProducto];
        },

        tienePedidoReferencia() {
            const referencia = this.producto.pedidoReferencia || {};
            const normalizar = valor => Number(
                typeof valor === 'string' ? valor.replace(',', '.') : (valor || 0)
            ) || 0;
            return normalizar(referencia.kilos) > 0 || normalizar(referencia.taras) > 0;
        },

        pedidoCubierto() {
            if (!this.tienePedidoReferencia) return false;

            const referencia = this.producto.pedidoReferencia || {};
            const normalizar = valor => Number(
                typeof valor === 'string' ? valor.replace(',', '.') : (valor || 0)
            ) || 0;
            const kilosPedido = normalizar(referencia.kilos);
            const tarasPedido = normalizar(referencia.taras);

            if (kilosPedido > 0) {
                return this.totalesCompartidos.totalKilos >= kilosPedido;
            }
            return this.totalesCompartidos.totalTaras >= tarasPedido;
        },

        mostrarIndicadoresProducto() {
            return Boolean(this.producto.precio) || this.tienePedidoReferencia;
        },

        descripcionPrecio() {
            const origen = this.producto.precioOrigen;
            if (origen === 'manual') return 'Manual';
            if (origen === 'maquila') return 'Maquila';

            const alcance = origen === 'especifico'
                ? 'Específico'
                : (origen === 'general' ? 'General' : '');
            const fecha = this.formatearFechaPrecio(this.producto.precioFecha);
            return [alcance, fecha].filter(Boolean).join(' · ');
        },

        // Total de taras reportadas
        totalTarasReportadas() {
            return (this.producto.reporteTaras || []).reduce((total, tara) => {
                return total + (parseInt(tara) || 0);
            }, 0);
        },

        // Total de bolsas reportadas
        totalBolsasReportadas() {
            const bolsas = Array.isArray(this.producto.reporteBolsas) ? this.producto.reporteBolsas : [];

            return (this.producto.reporteTaras || []).reduce((total, tara, index) => {
                const taraNum = parseInt(tara, 10) || 0;
                const bolsaNum = parseInt(bolsas[index], 10) || 0;
                return total + (taraNum * bolsaNum);
            }, 0);
        },

        // Verificar si las taras coinciden
        coincideTaras() {
            return this.totalTarasReportadas === this.totalTaras;
        },

        // Verificar si taras y bolsas coinciden
        coincideTarasYBolsas() {
            const totalTarasRegistradas = this.totalTaras;
            const totalTarasReportadas = this.totalTarasReportadas;

            // Si no hay taras registradas ni reportadas, considerarlo como incompleto (sin borde verde)
            if (totalTarasRegistradas === 0 && totalTarasReportadas === 0) {
                return false;
            }

            return totalTarasRegistradas === totalTarasReportadas;
        },

        // Verificar si tiene algún reporte
        tieneAlgunReporte() {
            return (this.producto.reporteTaras || []).some(tara => tara) ||
                (this.producto.reporteBolsas || []).some(bolsa => bolsa);
        },

        // Verificar si el reporte excede tres paréntesis
        reporteExcedeTresParentesis() {
            const reporte = this.combinarTarasBolsas();
            return (reporte.match(/\(/g) || []).length > 3;
        },

        // Generar reporte extenso
        generarReporteExtenso() {
            const reporte = this.combinarTarasBolsas();
            return reporte.replace(/\) /g, ')\n');
        }
    },

    mounted() {
        // Asignar precio automático para todos los clientes
        this.asignarPrecioAutomatico();
        this.actualizarPedidoReferencia();
        
        if (this.nombreCliente.trim().toLowerCase().includes('catarro')) {
            this.$emit('activar-incluir-precios-catarro');
        }
    },
    watch: {
        'producto.medida': function() {
            this.asignarPrecioAutomatico();
            this.actualizarPedidoReferencia();
        },
        'producto.tipo': function() {
            this.actualizarPedidoReferencia();
        },
        'producto.tipoPersonalizado': function() {
            this.actualizarPedidoReferencia();
        },
        'producto.nombreAlternativoPDF': function() {
            // El alias es exclusivamente visual/PDF. No recalcular contra el
            // alias: el precio debe seguir ligado a producto.medida.
            this.actualizarPedidoReferencia();
        },
        nombreCliente: function() {
            this.asignarPrecioAutomatico();
            if (this.nombreCliente.trim().toLowerCase().includes('catarro')) {
                this.$emit('activar-incluir-precios-catarro');
            }
        },
        preciosActuales: {
            handler() {
                this.asignarPrecioAutomatico();
            },
            deep: true
        },
        precioMaquilaOzunaDefault() {
            if (this.isClienteOzuna) {
                this.asignarPrecioAutomatico();
            }
        },
        fechaEmbarque: {
            handler(newVal) {
                if (newVal) {
                    this.asignarPrecioAutomatico();
                }
            }
        },
        pedidoReferenciaCliente: {
            handler() {
                this.actualizarPedidoReferencia();
            },
            deep: true
        },
        'producto.esVenta': {
            handler() {
                // Cuando cambie el estado de venta, recalcular precio automáticamente
                // Especialmente importante para Ozuna (maquila vs venta)
                if (this.isClienteOzuna) {
                    // Resetear la bandera de precio borrado manualmente para permitir reasignación
                    if (this.producto.precioBorradoManualmente) {
                        this.producto.precioBorradoManualmente = false;
                    }
                    this.asignarPrecioAutomatico();
                }
            }
        }
    },

    methods: {
        // Método para actualizar el componente padre
        actualizarProducto() {
            this.$emit('update:producto', this.producto);
        },
        formatearFechaPrecio(fecha) {
            const match = String(fecha || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
            return match ? `${match[3]}/${match[2]}/${match[1].slice(2)}` : '';
        },
        establecerDatoPrecio(campo, valor) {
            this.$set(this.producto, campo, valor);
        },
        limpiarDatosPrecioAutomatico({ conservarPrecio = false } = {}) {
            if (!conservarPrecio) {
                this.$delete(this.producto, 'precio');
            }
            ['precioOrigen', 'precioFecha', 'precioClienteId', 'precioMedidaBase'].forEach((campo) => {
                this.$delete(this.producto, campo);
            });
        },
        normalizarMedidaParaReferencia(valor) {
            const texto = (valor || '').toString();
            let medida = texto.toLowerCase();
            let tipoDetectado = '';

            if (medida.includes('s/h20') || medida.includes('s/h2o')) {
                tipoDetectado = 's/h20';
                medida = medida.replace(/s\/h2o|s\/h20/gi, ' ');
            }
            if (medida.includes('c/h20') || medida.includes('c/h2o')) {
                tipoDetectado = 'c/h20';
                medida = medida.replace(/c\/h2o|c\/h20/gi, ' ');
            }

            medida = medida.replace(/\s+/g, ' ').trim();
            return { medida, tipoDetectado };
        },
        actualizarPedidoReferencia() {
            const referenciaCliente = this.pedidoReferenciaCliente;
            if (!referenciaCliente || !this.producto) {
                this.producto.pedidoReferencia = null;
                return;
            }

            const tipoPersonalizado = (this.producto.tipoPersonalizado || '').toString().trim().toLowerCase();

            const buscarReferenciaPorMedida = (medidaTexto) => {
                const { medida, tipoDetectado } = this.normalizarMedidaParaReferencia(medidaTexto);
                if (!medida) return null;

                const tipoBase = (this.producto.tipo || tipoDetectado || '').toString().trim().toLowerCase();

                let ref = null;
                if (tipoBase) {
                    const tipoPersonalizadoKey = tipoBase === 'otro' ? tipoPersonalizado : '';
                    const clave = `${medida}__${tipoBase}__${tipoPersonalizadoKey}`;
                    ref = referenciaCliente.porClave?.[clave] || null;
                }

                if (!ref && !tipoBase) {
                    ref = referenciaCliente.porMedida?.[medida] || null;
                }

                return ref;
            };

            // Usar nombreAlternativoPDF como medida efectiva cuando exista,
            // para mantener consistente la referencia con lo mostrado en el encabezado.
            let referencia = null;
            if (this.producto.nombreAlternativoPDF) {
                referencia = buscarReferenciaPorMedida(this.producto.nombreAlternativoPDF);
            }

            if (!referencia) {
                referencia = buscarReferenciaPorMedida(this.producto.medida);
            }

            this.producto.pedidoReferencia = referencia
                ? { kilos: referencia.kilos || 0, taras: referencia.taras || 0 }
                : null;
        },

        // Métodos para manejar edición de kilos
        onKiloFocus(kiloIndex, event) {
            event.target.select();
            this.$emit('marcar-campo-edicion', { 
                productoId: this.producto.id, 
                campo: `kilos-${kiloIndex}` 
            });
        },

        onKiloBlur(kiloIndex) {
            this.$emit('desmarcar-campo-edicion', { 
                productoId: this.producto.id, 
                campo: `kilos-${kiloIndex}` 
            });
            this.actualizarProducto();
        },

        onKiloInput(kiloIndex) {
            // No llamar actualizarProducto inmediatamente para evitar guardado frecuente
            // Solo actualizar cuando el usuario termine de escribir (onBlur)
        },

        // Métodos para manejar edición de taras
        onTaraFocus(taraIndex, event) {
            event.target.select();
            this.$emit('marcar-campo-edicion', { 
                productoId: this.producto.id, 
                campo: `taras-${taraIndex}` 
            });
        },

        onTaraBlur(taraIndex) {
            this.$emit('desmarcar-campo-edicion', { 
                productoId: this.producto.id, 
                campo: `taras-${taraIndex}` 
            });
            this.actualizarProducto();
        },

        onTaraInput(taraIndex) {
            // No llamar actualizarProducto inmediatamente
        },

        // Hace que Tab alterne entre la tara y el kilo de la misma fila
        enfocarInput(inputs, index) {
            const input = Array.isArray(inputs) ? inputs[index] : null;
            if (input) {
                input.focus();
            }
        },

        esTeclaAvanceCalculadora(event) {
            if (!event || event.ctrlKey || event.metaKey || event.altKey) return false;

            const tecla = String(event.key || '').toLowerCase();
            const codigo = String(event.code || '').toLowerCase();
            const codigoLegado = Number(event.keyCode || event.which || 0);
            const esUbicacionNumpad = event.location === 3 || codigo.startsWith('numpad');

            // La tecla rotulada "C" en numpads tipo calculadora no siempre
            // envía KeyC. Este dispositivo la reporta como Escape; otros
            // pueden enviarla como Clear, NumLock/Clear o 12/144.
            if (
                tecla === 'escape' || tecla === 'clear' || tecla === 'numlock' ||
                codigo === 'escape' || codigo === 'numpadclear' || codigo === 'numlock' ||
                codigoLegado === 12 || codigoLegado === 27 || codigoLegado === 144
            ) {
                return true;
            }

            // Algunos numpads económicos asignan C a borrar. Solo aceptamos
            // Backspace/Delete cuando el navegador confirma origen numérico,
            // para no alterar esas teclas en el teclado principal.
            return esUbicacionNumpad && (
                tecla === 'backspace' || tecla === 'delete' ||
                codigo === 'backspace' || codigo === 'delete' ||
                codigoLegado === 8 || codigoLegado === 46
            );
        },

        obtenerIndiceInput(inputs, inputActual) {
            if (!Array.isArray(inputs)) return -1;
            return inputs.indexOf(inputActual);
        },

        enfocarSiguienteInputNumerico(inputActual) {
            if (typeof document === 'undefined' || !inputActual) return;

            const selector = [
                '.producto .camaron-neto-input:not([disabled])',
                '.producto .tara-input:not([disabled])',
                '.producto .kilo-input:not([disabled])',
                '.producto .reporte-input:not([disabled])'
            ].join(', ');
            const inputs = Array.from(document.querySelectorAll(selector))
                .filter(input => input.offsetParent !== null);
            const indiceActual = inputs.indexOf(inputActual);
            const siguiente = indiceActual >= 0 ? inputs[indiceActual + 1] : null;

            if (siguiente) {
                siguiente.focus();
                if (typeof siguiente.select === 'function') siguiente.select();
            }
        },

        // Algunos teclados numéricos de calculadora envían "C" o "Clear".
        // En los campos de captura se interpreta como Tab y nunca se escribe.
        handleCalculadoraC(event) {
            if (!this.esTeclaAvanceCalculadora(event) || event.repeat) return;

            const inputActual = event.target;
            if (!(inputActual instanceof HTMLInputElement)) return;
            if (!inputActual.matches('.camaron-neto-input, .tara-input, .kilo-input, .reporte-input')) return;

            event.preventDefault();
            event.stopPropagation();

            const taraIndex = this.obtenerIndiceInput(this.$refs.taraInputs, inputActual);
            if (taraIndex >= 0) {
                this.enfocarInput(this.$refs.kiloInputs, taraIndex);
                return;
            }

            const kiloIndex = this.obtenerIndiceInput(this.$refs.kiloInputs, inputActual);
            if (kiloIndex >= 0) {
                const siguienteTara = kiloIndex + 1;
                if (siguienteTara < (this.producto.taras || []).length) {
                    this.enfocarInput(this.$refs.taraInputs, siguienteTara);
                } else if (Array.isArray(this.$refs.reporteTaraInputs) && this.$refs.reporteTaraInputs[0]) {
                    this.$refs.reporteTaraInputs[0].focus();
                } else {
                    this.enfocarSiguienteInputNumerico(inputActual);
                }
                return;
            }

            const reporteTaraIndex = this.obtenerIndiceInput(this.$refs.reporteTaraInputs, inputActual);
            if (reporteTaraIndex >= 0) {
                this.enfocarInput(this.$refs.reporteBolsaInputs, reporteTaraIndex);
                return;
            }

            const reporteBolsaIndex = this.obtenerIndiceInput(this.$refs.reporteBolsaInputs, inputActual);
            if (reporteBolsaIndex >= 0) {
                const siguienteReporteIndex = reporteBolsaIndex + 1;
                if (siguienteReporteIndex < (this.producto.reporteTaras || []).length) {
                    this.enfocarInput(this.$refs.reporteTaraInputs, siguienteReporteIndex);
                } else {
                    // En la última bolsa, la tecla C/Escape replica el botón "+":
                    // crea otro par Taras/Bolsas y enfoca la nueva tara.
                    this.agregarReporteTara();
                }
                return;
            }

            this.enfocarSiguienteInputNumerico(inputActual);
        },

        handleTaraTab(event, taraIndex) {
            if (event.shiftKey) {
                if (taraIndex > 0) {
                    event.preventDefault();
                    this.enfocarInput(this.$refs.kiloInputs, taraIndex - 1);
                }
                return;
            }
            event.preventDefault();
            this.enfocarInput(this.$refs.kiloInputs, taraIndex);
        },

        handleKiloTab(event, kiloIndex) {
            if (event.shiftKey) {
                event.preventDefault();
                this.enfocarInput(this.$refs.taraInputs, kiloIndex);
                return;
            }
            const siguienteTaraIndex = kiloIndex + 1;
            if (siguienteTaraIndex < (this.producto.taras || []).length) {
                event.preventDefault();
                this.enfocarInput(this.$refs.taraInputs, siguienteTaraIndex);
            }
        },

        handleReporteTaraTab(event, index) {
            if (event.shiftKey) {
                if (index > 0) {
                    event.preventDefault();
                    this.enfocarInput(this.$refs.reporteBolsaInputs, index - 1);
                }
                return;
            }
            event.preventDefault();
            this.enfocarInput(this.$refs.reporteBolsaInputs, index);
        },

        handleReporteBolsaTab(event, index) {
            if (event.shiftKey) {
                event.preventDefault();
                this.enfocarInput(this.$refs.reporteTaraInputs, index);
                return;
            }
            const siguienteIndex = index + 1;
            if (siguienteIndex < (this.producto.reporteTaras || []).length) {
                event.preventDefault();
                this.enfocarInput(this.$refs.reporteTaraInputs, siguienteIndex);
            }
        },

        // Método para manejar el clic en el nombre para abrir el modal
        handleNombreAlternativoClick() {
            if (!this.embarqueBloqueado) {
                this.abrirModalNombreAlternativo();
            }
        },

        // Métodos para taras
        agregarTara() {
            this.producto.taras.push(null);
            this.producto.kilos.push(null);
            this.actualizarProducto();
            this.$nextTick(() => {
                const inputs = this.$refs.taraInputs;
                const ultimoInput = Array.isArray(inputs) ? inputs[inputs.length - 1] : inputs;
                if (ultimoInput) {
                    ultimoInput.focus();
                }
            });
        },

        eliminarTara(index) {
            this.producto.taras.splice(index, 1);
            this.producto.kilos.splice(index, 1);
            this.actualizarProducto();
        },

        agregarTaraExtra() {
            if (!Array.isArray(this.producto.tarasExtra)) {
                this.$set(this.producto, 'tarasExtra', []);
            }
            this.producto.tarasExtra.push(null);
            this.actualizarProducto();
            this.$nextTick(() => {
                const inputs = this.$refs.taraExtraInputs;
                const ultimoInput = Array.isArray(inputs) ? inputs[inputs.length - 1] : inputs;
                if (ultimoInput) {
                    ultimoInput.focus();
                }
            });
        },

        eliminarTaraExtra(index) {
            this.producto.tarasExtra.splice(index, 1);
            this.actualizarProducto();
        },

        // Métodos para reportes
        agregarReporteTara() {
            if (!Array.isArray(this.producto.reporteTaras)) {
                this.$set(this.producto, 'reporteTaras', []);
            }
            if (!Array.isArray(this.producto.reporteBolsas)) {
                this.$set(this.producto, 'reporteBolsas', []);
            }
            this.producto.reporteTaras.push(null);
            this.producto.reporteBolsas.push(null);
            this.actualizarProducto();
            this.$nextTick(() => {
                const inputs = this.$refs.reporteTaraInputs;
                const ultimoInput = Array.isArray(inputs) ? inputs[inputs.length - 1] : inputs;
                if (ultimoInput) {
                    ultimoInput.focus();
                }
            });
        },

        eliminarReporteTara(index) {
            this.producto.reporteTaras.splice(index, 1);
            this.producto.reporteBolsas.splice(index, 1);
            this.actualizarProducto();
        },

        // Método para combinar taras y bolsas
        combinarTarasBolsas() {
            const combinado = {};
            const taras = this.producto.reporteTaras || [];
            const bolsas = this.producto.reporteBolsas || [];

            taras.forEach((tara, index) => {
                const bolsa = bolsas[index] || '';
                const key = bolsa;
                combinado[key] = (combinado[key] || 0) + parseInt(tara || 1);
            });

            return Object.entries(combinado)
                .map(([bolsa, count]) => `(${count}-${bolsa})`)
                .join(' ');
        },

        // Método para asignar el precio automáticamente según la medida y el cliente
        asignarPrecioAutomatico() {
            const medidaBasePrecio = this.producto.medida;
            const medidaNormalizada = normalizarMedida(medidaBasePrecio);
            const medidaCambio = Boolean(
                this.medidaPrecioAnteriorNormalizada &&
                this.medidaPrecioAnteriorNormalizada !== medidaNormalizada
            );

            if (!medidaBasePrecio) {
                if (medidaCambio) this.limpiarDatosPrecioAutomatico();
                this.medidaPrecioAnteriorNormalizada = medidaNormalizada;
                return;
            }

            // Un precio capturado con el botón "$" pertenece a la medida
            // operativa. Cambiar solo nombreAlternativoPDF lo conserva.
            const esManualMismaMedida = this.producto.precioOrigen === 'manual' &&
                normalizarMedida(this.producto.precioMedidaBase) === medidaNormalizada;
            if (esManualMismaMedida) {
                this.medidaPrecioAnteriorNormalizada = medidaNormalizada;
                return;
            }

            const nombreCliente = this.nombreCliente.trim().toLowerCase();
            
            // Lógica especial para Ozuna: si no es venta (maquila), usar precio por defecto configurable (modal Precios)
            // Nota: aquí NO respetamos `precioBorradoManualmente` porque en maquila queremos:
            // - Default: precioMaquilaOzunaDefault (Firestore "Precio maquila Ozuna" o fallback 21)
            // - Si el usuario editó el precio, conservarlo (persistido en `precioMaquila`)
            if (nombreCliente === 'ozuna' && !this.producto.esVenta) {
                const def = this.precioMaquilaOzunaDefault;
                // Si existe precio de maquila personalizado, usarlo
                if (this.producto.precioMaquila !== null && this.producto.precioMaquila !== undefined && this.producto.precioMaquila !== '') {
                    const pm = Number(this.producto.precioMaquila);
                    if (!Number.isNaN(pm) && pm > 0) {
                        this.producto.precio = pm;
                    } else {
                        this.producto.precio = def;
                    }
                } else {
                    this.producto.precio = def;
                    // No persistir precioMaquila aquí: si solo es el default global, las líneas
                    // siguen al precio del modal cuando cambie (ver precioMaquila en edición manual).
                }

                this.establecerDatoPrecio('precioOrigen', 'maquila');
                this.establecerDatoPrecio('precioFecha', this.fechaEmbarque || obtenerFechaActualISO());
                this.establecerDatoPrecio('precioClienteId', 'ozuna');
                this.establecerDatoPrecio('precioMedidaBase', medidaBasePrecio);
                this.medidaPrecioAnteriorNormalizada = medidaNormalizada;
                
                // Emitir evento para notificar que se asignó precio automáticamente
                this.$emit('precio-asignado-automaticamente', {
                    medida: this.producto.medida,
                    cliente: nombreCliente,
                    precio: this.producto.precio,
                    fecha: this.fechaEmbarque || obtenerFechaActualISO(),
                    esMaquila: true,
                    clienteId: 'ozuna'
                });
                return;
            }

            // Si el precio fue borrado manualmente por el usuario, no asignar automáticamente
            if (this.producto.precioBorradoManualmente) {
                return;
            }
            
            // Para el resto de casos (incluyendo Ozuna con venta marcada), buscar precios históricos
            const clienteIdMap = {
                'catarro': 'catarro',
                'joselito': 'joselito', 
                'otilio': 'otilio',
                'ozuna': 'ozuna',
                'veronica': 'veronica',
                'lorena': 'veronica'  // Lorena es la misma que Verónica
            };
            
            const clienteId = clienteIdMap[nombreCliente] || null;
            
            // Usar las nuevas utilidades para normalizar fecha
            const fechaParaPrecios = this.fechaEmbarque ? normalizarFechaISO(this.fechaEmbarque) : obtenerFechaActualISO();

            const detallePrecio = obtenerDetallePrecioParaMedida(
                this.preciosActuales, 
                medidaBasePrecio,
                fechaParaPrecios, 
                clienteId
            );
            
            if (detallePrecio && detallePrecio.precio !== null && detallePrecio.precio !== undefined) {
                this.producto.precio = detallePrecio.precio;
                this.establecerDatoPrecio('precioOrigen', detallePrecio.origen);
                this.establecerDatoPrecio('precioFecha', detallePrecio.fecha);
                this.establecerDatoPrecio('precioClienteId', detallePrecio.clienteId);
                this.establecerDatoPrecio('precioMedidaBase', medidaBasePrecio);

                // Emitir evento para notificar que se asignó precio automáticamente
                this.$emit('precio-asignado-automaticamente', {
                    medida: medidaBasePrecio,
                    cliente: nombreCliente,
                    precio: detallePrecio.precio,
                    fecha: fechaParaPrecios,
                    esMismoDiaActual: fechaParaPrecios === obtenerFechaActualISO(),
                    clienteId: clienteId,
                    origen: detallePrecio.origen
                });
            } else if (medidaCambio || (this.preciosActuales.length > 0 && navigator.onLine)) {
                // Una medida sin coincidencia no debe heredar el valor de la
                // medida anterior. En modo offline se conserva el último valor
                // conocido hasta recuperar el catálogo.
                this.limpiarDatosPrecioAutomatico();
            }

            this.medidaPrecioAnteriorNormalizada = medidaNormalizada;
        },

        // Métodos para el manejo de la medida
        onMedidaInput(event) {
            const valor = this.normalizarTextoBusqueda(event.target.value);
            this.mostrarSugerencias = true;

            if (valor) {
                // Filtrar medidas usadas que coincidan (excluyendo medidas configuradas para evitar duplicados)
                this.sugerenciasMedidas = this.medidasUsadas.filter(m =>
                    this.medidaCoincideConBusqueda(m, valor) &&
                    this.normalizarTextoBusqueda(m) !== valor &&
                    !this.medidasConfiguracion.some(mc => this.normalizarTextoBusqueda(mc) === this.normalizarTextoBusqueda(m))
                );
            } else {
                this.sugerenciasMedidas = [];
            }

            this.producto.isEditing = true;
            
            // Resetear la bandera de precio borrado manualmente cuando se cambia la medida
            // para permitir asignación automática para la nueva medida
            if (this.producto.precioBorradoManualmente) {
                this.producto.precioBorradoManualmente = false;
            }
            
            this.asignarPrecioAutomatico();
            this.actualizarPedidoReferencia();
            this.actualizarProducto();
        },

        normalizarTextoBusqueda(valor) {
            return (valor || '')
                .toString()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();
        },

        medidaCoincideConBusqueda(medida, busquedaNormalizada) {
            const medidaNormalizada = this.normalizarTextoBusqueda(medida);
            if (!busquedaNormalizada) return true;
            return medidaNormalizada.includes(busquedaNormalizada) ||
                busquedaNormalizada.includes(medidaNormalizada);
        },

        onMedidaBlur() {
            // Dar un pequeño delay antes de ocultar las sugerencias para permitir clicks
            setTimeout(() => {
                this.mostrarSugerencias = false;
            }, 200);

            this.actualizarProducto();
        },

        onMedidaFocus() {
            this.mostrarSugerencias = true;
            // Si el campo está vacío, no filtrar las sugerencias para mostrar todas las opciones
            if (!this.producto.medida) {
                this.sugerenciasMedidas = [];
            }
        },

        seleccionarMedida(medida) {
            this.producto.medida = medida;
            this.mostrarSugerencias = false;
            
            // Resetear la bandera de precio borrado manualmente cuando se selecciona una nueva medida
            if (this.producto.precioBorradoManualmente) {
                this.producto.precioBorradoManualmente = false;
            }
            
            this.asignarPrecioAutomatico();
            this.actualizarPedidoReferencia();
            this.actualizarProducto();
            this.$emit('seleccionar-medida', this.producto, medida);
        },

        onTipoChange() {
            if (this.producto.tipo !== 'otro') {
                this.producto.tipoPersonalizado = '';
            }
            if (this.producto.tipo === 'c/h20' && !this.producto.camaronNeto) {
                this.producto.camaronNeto = 0.65;
            }
            
            // Resetear la bandera de precio borrado manualmente cuando se cambia el tipo
            // ya que esto podría afectar el precio del producto
            if (this.producto.precioBorradoManualmente) {
                this.producto.precioBorradoManualmente = false;
            }
            
            this.asignarPrecioAutomatico();
            this.actualizarPedidoReferencia();
            this.actualizarProducto();
        },

        // Métodos para abrir modales
        abrirModalPrecio() {
            this.$emit('mostrar-modal-precio', this.producto);
        
        },

        abrirModalHilos() {
            this.$emit('mostrar-modal-hilos', this.producto);
        },

        abrirModalNota() {
            this.$emit('mostrar-modal-nota', this.producto);
        },

        abrirModalNombreAlternativo() {
            this.$emit('mostrar-modal-nombre-alternativo', this.producto);
        },

        abrirModalAlt() {
            this.$emit('mostrar-modal-alt', this.producto);
        },

        // Método para eliminar el producto
        eliminarProducto() {
            this.$emit('eliminar-producto', this.producto);
        }
    }
}

</script>

<style scoped>
/* Estilos específicos del componente ProductoItem */
.productos-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
    padding: 8px;
}

.producto {
    flex: 0 0 calc(25% - 6px);
    margin: 0 0 8px 0;
    padding: 12px;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 5px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: relative;
    box-sizing: border-box;
}

.producto.reporte-completo {
    border-left: 4px solid #2ecc71;
}

.producto.reporte-incompleto {
    border-left: 4px solid #f39c12;
}

.producto.taras-reportadas {
    border: 2px solid #2ecc71;
}

.producto.taras-no-reportadas {
    border: 4px solid #9b59b6;
}

.producto.producto-en-cero {
    border: 2px solid #e74c3c;
}

.producto.medida-vacia {
    border: 2px solid #e74c3c;
}

.encabezado-medida {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
}

.medida-texto-container {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 2px;
    min-width: 0;
}

.medida-texto {
    font-size: 1.3rem;
    font-weight: 600;
    cursor: pointer;
}

.medida-texto:hover:not(.disabled) {
    color: #3498db;
}

.medida-texto.tiene-nombre-alternativo {
    color: #2ecc71;
}

.medida-texto .ch20-text {
    color: #3498db;
    font-weight: normal;
}

.pdf-badge {
    background-color: #3498db;
    color: white;
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 0.8rem;
    margin-left: 5px;
}

.pdf-identidad {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 6px;
    white-space: nowrap;
}

.pdf-identidad .pdf-badge {
    margin-left: 0;
}

.medida-original {
    padding: 2px 5px;
    color: rgba(226, 245, 250, .78);
    border: 1px solid rgba(184, 244, 255, .18);
    border-radius: 6px;
    background: rgba(2, 14, 24, .25);
    font-size: .70rem;
    font-weight: 750;
    letter-spacing: .01em;
    line-height: 1.15;
}

.precio-tag {
    color: #27ae60;
    font-weight: bold;
    padding: 0 10px;
    font-size: 1.1rem;
}

.producto-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
}

.medida-input-container {
    position: relative;
    flex-grow: 1;
}

.medida-input {
    width: 100%;
    padding: 8px 52px 8px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.btn-alt {
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    background: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 3px;
    padding: 2px 5px;
    cursor: pointer;
    font-size: 0.8em;
}

.btn-alt.tiene-alt {
    background: #3498db;
    color: white;
    border-color: #2980b9;
}

.sugerencias-container {
    position: absolute;
    width: 100%;
    max-height: 250px;
    overflow-y: auto;
    background: white;
    border: 1px solid #ddd;
    border-top: none;
    border-radius: 0 0 4px 4px;
    z-index: 10;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.sugerencias-seccion {
    border-bottom: 1px solid #eee;
}

.sugerencias-seccion:last-child {
    border-bottom: none;
}

.sugerencias-titulo {
    padding: 6px 12px;
    background-color: #f8f9fa;
    font-size: 12px;
    font-weight: bold;
    color: #6c757d;
    border-bottom: 1px solid #eee;
}

.sugerencia-item {
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
}

.sugerencia-item:hover {
    background-color: #f0f0f0;
}

.config-medida {
    color: #007bff;
}

.config-medida:hover {
    background-color: #e7f3ff;
}

.hist-medida {
    color: #6c757d;
}

.hist-medida:hover {
    background-color: #f5f5f5;
}

.all-medida {
    color: #333;
}

.all-medida:hover {
    background-color: #f0f0f0;
}

.sugerencia-item i {
    font-size: 12px;
    width: 12px;
}

.tipo-select {
    width: auto;
    min-width: 120px;
}

.tipo-azul {
    background-color: #e6f7ff;
    border-color: #3498db;
}

.tipo-verde {
    background-color: #e6fff7;
    border-color: #2ecc71;
}

.tipo-input {
    width: 120px;
}

.eliminar-producto {
    padding: 2px 8px;
}

.botones-encabezado {
    display: flex;
    flex-direction: column;
    margin-right: 15px;
}

.botones-fila-superior,
.botones-fila-inferior {
    display: flex;
    gap: 5px;
    margin-bottom: 5px;
}

.btn-precio,
.btn-hilos,
.btn-nota {
    width: 24px;
    height: 24px;
    font-size: 14px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid #ddd;
    background: #f8f9fa;
    border-radius: 3px;
    cursor: pointer;
}

.btn-precio.tiene-precio {
    background: #27ae60;
    color: white;
    border-color: #219653;
}

.btn-hilos.tiene-hilos {
    background: #f1c40f;
    color: white;
    border-color: #f39c12;
}

.btn-nota.tiene-nota {
    background: #e67e22;
    color: white;
    border-color: #d35400;
}

.kg-radio {
    display: flex;
    align-items: center;
    font-size: 14px;
}

.sumas-verticales {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
}

.columna {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.taras-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.taras-header h5,
.columna h5 {
    margin: 0;
    font-size: 1.1rem;
}

.checkbox-container {
    display: flex;
    align-items: center;
    font-size: 0.9rem;
}

.input-group {
    display: flex;
    margin-bottom: 5px;
    flex-wrap: nowrap !important; /* Sobreescribe cualquier flex-wrap heredado */
}

.tara-input,
.kilo-input {
    flex-grow: 1;
    padding: 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-right: 5px;
}

.botones-tara {
    display: flex;
    gap: 5px;
    margin-bottom: 10px;
}

.total {
    font-weight: bold;
    padding: 5px 0;
    font-size: 1.1rem;
}

.reporte-taras-bolsas {
    display: flex;
    gap: 20px;
    margin-bottom: 15px;
    padding-top: 10px;
    border-top: 1px solid #eee;
}

.reporte-item {
    flex: 1;
}

.reporte-input {
    width: 100%;
    padding: 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.total-taras-reporte,
.total-bolsas-reporte {
    margin-top: 10px;
    font-weight: bold;
    font-size: 1.1rem;
}

.total-taras-reporte.coincide {
    color: #2ecc71;
}

.total-taras-reporte.no-coincide {
    color: #e74c3c;
}

.reporte-extenso {
    background-color: #f9f9f9;
    padding: 10px;
    border-radius: 4px;
    margin-top: 10px;
    white-space: pre-line;
    font-size: 1rem;
}

.venta-checkbox-container {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    gap: 5px;
}

.venta-checkbox-container label {
    font-size: 13px;
    color: #07711e;
    font-weight: bold;
    margin: 0;
}

.venta-checkbox {
    cursor: pointer;
    height: 16px;
    width: 16px;
    margin: 0;
}

.refrigeracion-checkbox-container {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    padding: 5px;
    background-color: #e3f2fd;
    border-radius: 4px;
    gap: 5px;
}

.refrigeracion-label {
    font-size: 13px;
    color: #1976d2;
    font-weight: bold;
    margin: 0;
    cursor: pointer;
    user-select: none;
}

.refrigeracion-checkbox {
    cursor: pointer;
    height: 16px;
    width: 16px;
    margin: 0;
}

.valores-container-debajo {
    display: flex;
    align-items: center;
    margin-top: 10px;
    margin-bottom: 10px;
    padding: 5px;
    background-color: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #e9ecef;
}

.valor-neto-container {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.95rem;
}

.camaron-neto-input {
    width: 60px;
    padding: 4px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

/* Ajustes responsive */
@media screen and (max-width: 1400px) {
    .producto {
        flex: 0 0 calc(33.33% - 6px);
        max-width: calc(33.33% - 6px);
    }
}

/* Ajuste específico para Galaxy Z Fold 5 y pantallas similares */
@media screen and (max-width: 900px) {
    .producto {
        flex: 0 0 calc(50% - 8px) !important;
        max-width: calc(50% - 8px) !important;
    }
    
    .medida-texto {
        font-size: 1rem;
    }
    
    .tipo-select {
        min-width: 90px;
    }
    
    .botones-encabezado {
        margin-right: 8px;
    }

    .btn-precio,
    .btn-hilos,
    .btn-nota {
        width: 20px;
        height: 20px;
        font-size: 12px;
    }

    .input-group {
        margin-bottom: 4px;
    }

    .tara-input,
    .kilo-input,
    .reporte-input {
        padding: 4px;
        font-size: 0.9rem;
    }
}

/* Solo para pantallas muy pequeñas */
@media screen and (max-width: 480px) {
    .producto {
        flex: 0 0 100% !important;
        max-width: 100% !important;
    }
}

/* Estilos para indicadores de venta */
.producto[data-es-venta="true"] {
    border-left: 4px solid #07711e;
    background-color: rgba(7, 113, 30, 0.05);
}

/* Tarjeta técnica de producto */
.producto {
    overflow: hidden;
    padding: 15px;
    color: #172033;
    border: 1px solid rgba(255,255,255,.9);
    border-radius: 18px;
    background:
        linear-gradient(145deg, rgba(255,255,255,.98), rgba(236,242,250,.96)),
        #f5f8fc;
    box-shadow: 0 14px 30px rgba(0, 6, 18, .18), inset 0 1px rgba(255,255,255,.9);
    transition: transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s ease, border-color .25s ease;
}

.producto::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
    background: linear-gradient(118deg, transparent 30%, rgba(255,255,255,.72) 48%, transparent 66%);
    transform: translateX(-120%);
    transition: transform .7s ease;
}

.producto:hover {
    z-index: 2;
    transform: translateY(-4px);
    border-color: rgba(56, 217, 255, .5);
    box-shadow: 0 22px 44px rgba(0, 6, 18, .25), 0 0 24px rgba(56,217,255,.08);
}

.producto:hover::after { transform: translateX(120%); }
.producto > * { position: relative; z-index: 1; }

.encabezado-medida {
    align-items: flex-start;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-color: #dce4ef;
}

.medida-texto {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    align-items: center;
    flex-wrap: wrap;
    padding: 8px 11px;
    color: #ecfbff;
    border: 1px solid rgba(56,217,255,.5);
    border-radius: 11px;
    background: linear-gradient(135deg, #0b5f78, #07364d);
    box-shadow: 0 8px 18px rgba(6,78,99,.22), 0 0 18px rgba(56,217,255,.16), inset 0 1px rgba(255,255,255,.13);
    font-size: 1.22rem;
    font-weight: 900;
    letter-spacing: -.015em;
    line-height: 1.1;
}

.medida-texto:hover:not(.disabled) {
    color: #fff;
    border-color: #8eeeff;
    box-shadow: 0 10px 22px rgba(6,78,99,.27), 0 0 25px rgba(56,217,255,.25), inset 0 1px rgba(255,255,255,.16);
}

.medida-texto .ch20-text {
    margin-left: 5px;
    color: #9bedff;
    font-weight: 800;
}

.medida-texto.tiene-nombre-alternativo {
    color: #effff8;
    border-color: rgba(52,211,153,.58);
    background: linear-gradient(135deg, #08765a, #064d3d);
    box-shadow: 0 8px 18px rgba(4,120,87,.22), 0 0 18px rgba(52,211,153,.17), inset 0 1px rgba(255,255,255,.13);
}

.precio-tag {
    display: inline-flex;
    min-height: 40px;
    align-items: flex-end;
    flex-direction: column;
    gap: 4px;
    padding: 7px;
    color: #065f46;
    border: 1px solid rgba(16,185,129,.28);
    border-radius: 9px;
    background: linear-gradient(135deg, rgba(209,250,229,.94), rgba(236,253,245,.96));
    box-shadow: inset 0 1px rgba(255,255,255,.8), 0 5px 12px rgba(5,150,105,.08);
    font-size: .78rem;
    line-height: 1;
    white-space: nowrap;
}

.precio-tag-valor {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.precio-tag-label {
    color: #568074;
    font-size: .64rem;
    font-weight: 850;
    letter-spacing: .08em;
    text-transform: uppercase;
}

.precio-tag strong {
    color: #047857;
    font-size: 1.18rem;
    font-weight: 950;
}

.precio-tag-origen {
    color: #5f7f76;
    font-size: .60rem;
    font-weight: 750;
    letter-spacing: .01em;
}

.precio-tag.precio-tag-especifico {
    color: #5b21b6;
    border-color: rgba(124,58,237,.38);
    background: linear-gradient(135deg, rgba(237,233,254,.97), rgba(245,243,255,.98));
    box-shadow: inset 0 1px rgba(255,255,255,.86), 0 6px 15px rgba(109,40,217,.13);
}

.precio-tag-especifico .precio-tag-label,
.precio-tag-especifico .precio-tag-origen {
    color: #7c3aed;
}

.precio-tag-especifico strong {
    color: #5b21b6;
}

.producto-indicadores {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: nowrap;
    gap: 3px;
    margin: -5px 0 10px;
    padding: 4px;
    border: 1px solid #dfe7f0;
    border-radius: 11px;
    background: rgba(237,242,248,.68);
}

.producto-indicadores > * {
    flex: 0 1 auto;
    min-width: 0;
}

.botones-encabezado {
    margin-right: 10px;
    padding: 5px;
    border: 1px solid #dce4ef;
    border-radius: 11px;
    background: #edf2f8;
}

.botones-fila-superior,
.botones-fila-inferior { margin-bottom: 3px; }

.btn-precio,
.btn-hilos,
.btn-nota {
    width: 26px;
    height: 26px;
    color: #52627a;
    border-color: #d3dce9;
    border-radius: 8px;
    background: #fff;
    font-size: .68rem;
    font-weight: 800;
    transition: transform .18s ease, box-shadow .18s ease;
}

.btn-precio:hover,
.btn-hilos:hover,
.btn-nota:hover { transform: translateY(-1px); box-shadow: 0 5px 10px rgba(30,41,59,.12); }

.kg-radio { color: #617087; font-size: .66rem; }
.kg-checkbox { accent-color: #38a9c7; }

.producto-header {
    align-items: stretch;
    flex-wrap: wrap;
    gap: 7px;
    margin-bottom: 13px;
}

.producto-header .medida-input-container {
    width: 100%;
    flex: 1 0 100%;
}

.producto-header .tipo-input {
    min-width: 0;
    flex: 1 1 120px;
}

.medida-input,
.form-control,
.tara-input,
.kilo-input,
.reporte-input,
.camaron-neto-input {
    min-height: 38px;
    color: #172033;
    border: 1px solid #d5deea;
    border-radius: 10px;
    outline: 0;
    background: rgba(255,255,255,.92);
    box-shadow: inset 0 1px 2px rgba(15,23,42,.04);
    transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
}

.medida-input:focus,
.form-control:focus,
.tara-input:focus,
.kilo-input:focus,
.reporte-input:focus,
.camaron-neto-input:focus {
    border-color: #22b8dc;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(34,184,220,.13), 0 5px 14px rgba(15,23,42,.07);
}

.tipo-select {
    min-width: 104px;
    font-size: .78rem;
    font-weight: 700;
}

.tipo-azul {
    color: #075985;
    border-color: rgba(14,165,233,.35);
    background: #e8f7ff;
}

.tipo-verde {
    color: #047857;
    border-color: rgba(16,185,129,.32);
    background: #eafbf4;
}

.tipo-dropdown {
    position: relative;
    min-width: 0;
    flex: 1 1 140px;
}

.tipo-trigger {
    display: flex;
    width: 100%;
    min-height: 38px;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    color: #53647a;
    border: 1px solid #d5deea;
    border-radius: 10px;
    background: linear-gradient(135deg, #fff, #eef3f8);
    box-shadow: inset 0 1px rgba(255,255,255,.9), 0 5px 12px rgba(15,23,42,.05);
    cursor: pointer;
    font-size: .78rem;
    font-weight: 850;
    letter-spacing: .015em;
    transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease, background .18s ease;
}

.tipo-trigger:hover:not(:disabled),
.tipo-dropdown.abierto .tipo-trigger {
    transform: translateY(-1px);
    border-color: rgba(56,217,255,.52);
    box-shadow: 0 7px 17px rgba(15,23,42,.11), 0 0 0 3px rgba(56,217,255,.08);
}

.tipo-trigger:disabled { opacity: .58; cursor: not-allowed; }

.tipo-dot,
.tipo-opcion-dot {
    width: 8px;
    height: 8px;
    flex: 0 0 8px;
    border-radius: 50%;
    background: #94a3b8;
    box-shadow: 0 0 0 4px rgba(148,163,184,.12);
}

.tipo-trigger-texto {
    overflow: hidden;
    flex: 1;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.tipo-chevron {
    color: currentColor;
    font-size: .62rem;
    transition: transform .18s ease;
}

.tipo-dropdown.abierto .tipo-chevron { transform: rotate(180deg); }

.tipo-dropdown.tipo-c-h20 .tipo-trigger {
    color: #eaf8ff;
    border-color: #38bdf8;
    background: linear-gradient(135deg, #0f79b5, #075985);
    box-shadow: 0 7px 16px rgba(2,132,199,.2), inset 0 1px rgba(255,255,255,.16);
}

.tipo-dropdown.tipo-c-h20 .tipo-dot,
.tipo-opcion.tipo-c-h20 .tipo-opcion-dot {
    background: #38bdf8;
    box-shadow: 0 0 0 4px rgba(56,189,248,.16), 0 0 13px rgba(56,189,248,.7);
}

.tipo-dropdown.tipo-s-h20 .tipo-trigger {
    color: #ecfdf5;
    border-color: #34d399;
    background: linear-gradient(135deg, #0c8b68, #047857);
    box-shadow: 0 7px 16px rgba(5,150,105,.18), inset 0 1px rgba(255,255,255,.16);
}

.tipo-dropdown.tipo-s-h20 .tipo-dot,
.tipo-opcion.tipo-s-h20 .tipo-opcion-dot {
    background: #34d399;
    box-shadow: 0 0 0 4px rgba(52,211,153,.15), 0 0 13px rgba(52,211,153,.6);
}

.tipo-dropdown.tipo-otro .tipo-trigger {
    color: #f5f3ff;
    border-color: #a78bfa;
    background: linear-gradient(135deg, #7c3aed, #5b21b6);
    box-shadow: 0 7px 16px rgba(124,58,237,.18), inset 0 1px rgba(255,255,255,.16);
}

.tipo-dropdown.tipo-otro .tipo-dot,
.tipo-opcion.tipo-otro .tipo-opcion-dot {
    background: #a78bfa;
    box-shadow: 0 0 0 4px rgba(167,139,250,.15), 0 0 13px rgba(167,139,250,.6);
}

.tipo-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    left: 0;
    z-index: 95;
    display: grid;
    min-width: 170px;
    gap: 4px;
    padding: 6px;
    color: #dce7f6;
    border: 1px solid rgba(148,163,184,.22);
    border-radius: 12px;
    background: linear-gradient(145deg, rgba(18,30,52,.99), rgba(7,14,27,.99));
    box-shadow: 0 20px 42px rgba(2,6,23,.42), inset 0 1px rgba(255,255,255,.07), 0 0 20px rgba(56,217,255,.07);
    backdrop-filter: blur(18px);
}

.tipo-opcion {
    display: flex;
    width: 100%;
    min-height: 36px;
    align-items: center;
    gap: 9px;
    padding: 7px 9px;
    color: #b9c7da;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    font-size: .76rem;
    font-weight: 800;
    text-align: left;
    transition: border-color .16s ease, background .16s ease, color .16s ease, transform .16s ease;
}

.tipo-opcion span:nth-child(2) { flex: 1; }
.tipo-opcion i { color: #a8efff; font-size: .65rem; }

.tipo-opcion:hover,
.tipo-opcion.activa {
    transform: translateX(2px);
    color: #fff;
    border-color: rgba(148,163,184,.18);
    background: rgba(255,255,255,.07);
}

.tipo-opcion.tipo-c-h20:hover,
.tipo-opcion.tipo-c-h20.activa {
    color: #dff6ff;
    border-color: rgba(56,189,248,.32);
    background: rgba(14,165,233,.14);
}

.tipo-opcion.tipo-s-h20:hover,
.tipo-opcion.tipo-s-h20.activa {
    color: #dcfce7;
    border-color: rgba(52,211,153,.3);
    background: rgba(16,185,129,.13);
}

.tipo-opcion.tipo-otro:hover,
.tipo-opcion.tipo-otro.activa {
    color: #ede9fe;
    border-color: rgba(167,139,250,.32);
    background: rgba(139,92,246,.14);
}

.tipo-menu-enter-active,
.tipo-menu-leave-active { transition: opacity .15s ease, transform .15s ease; }
.tipo-menu-enter,
.tipo-menu-leave-to { opacity: 0; transform: translateY(-5px) scale(.98); }

.producto.selector-tipo-abierto {
    z-index: 72;
    overflow: visible;
}

.producto.selector-tipo-abierto .producto-header { z-index: 78; }
.producto.selector-tipo-abierto::after { display: none; }

.btn-alt {
    right: 6px;
    color: #52627a;
    border: 0;
    border-radius: 7px;
    background: #e8eef6;
    font-weight: 750;
}

.sugerencias-container {
    top: calc(100% + 4px);
    right: 0;
    left: 0;
    overflow: hidden auto;
    width: 100%;
    margin-top: 0;
    color: #1e293b;
    border: 1px solid #cfd9e6;
    border-radius: 12px;
    background: rgba(255,255,255,.98);
    box-shadow: 0 18px 42px rgba(15,23,42,.2);
    z-index: 80;
}

/* El menú debe escapar de la tarjeta y quedar sobre Taras/Kilos y las
   tarjetas vecinas. La clase solo se activa mientras existen sugerencias. */
.producto.selector-medidas-abierto {
    z-index: 70;
    overflow: visible;
}

.producto.selector-medidas-abierto .producto-header {
    z-index: 75;
}

.producto.selector-medidas-abierto::after {
    display: none;
}

.sugerencias-titulo {
    color: #64748b;
    background: #edf2f7;
    letter-spacing: .05em;
    text-transform: uppercase;
}

.sugerencia-item:hover { background: #eaf8fc; }

.eliminar-producto,
.input-group .btn,
.botones-tara .btn,
.reporte-item > .btn {
    min-width: 34px;
    min-height: 34px;
    padding: 5px 9px;
    border: 0;
    border-radius: 9px;
    box-shadow: none;
    font-weight: 800;
}

.eliminar-producto,
.input-group .btn-danger {
    color: #be123c;
    background: #ffe4e9;
}

.botones-tara .btn-success,
.reporte-item > .btn-success {
    color: #047857;
    background: #d9f8eb;
}

.botones-tara .btn-warning {
    color: #92400e;
    background: #fff1c7;
}

.sumas-verticales {
    gap: 8px;
    margin-bottom: 12px;
}

.columna {
    min-width: 0;
    padding: 10px;
    border: 1px solid #dfe6ef;
    border-radius: 13px;
    background: rgba(236, 242, 248, .74);
}

.taras-header h5,
.columna h5,
.reporte-item h5 {
    color: #506078;
    font-size: .69rem;
    font-weight: 850;
    letter-spacing: .1em;
    text-transform: uppercase;
}

.checkbox-container { color: #68788f; font-size: .72rem; }
.checkbox-container input { accent-color: #22a6c8; }

.tara-input,
.kilo-input,
.reporte-input {
    min-width: 0;
    min-height: 34px;
    padding: 6px 8px;
    font-weight: 700;
}

.total {
    margin-top: auto;
    padding: 11px 12px;
    color: #e9fbff;
    border: 1px solid rgba(56,217,255,.48);
    border-radius: 11px;
    background: linear-gradient(135deg, #0b536b, #073449);
    box-shadow: 0 8px 18px rgba(6,78,99,.24), inset 0 1px rgba(255,255,255,.13), 0 0 16px rgba(56,217,255,.12);
    font-size: 1.02rem;
    font-weight: 900;
    letter-spacing: .01em;
    text-align: center;
}

.reporte-taras-bolsas {
    gap: 10px;
    margin: 0;
    padding: 12px;
    color: #dbe7f8;
    border: 0;
    border-radius: 14px;
    background: linear-gradient(135deg, #111d31, #0a1425);
    box-shadow: inset 0 1px rgba(255,255,255,.06);
}

.reporte-item { min-width: 0; }
.reporte-item h5 { color: #91a2bc; }

.total-taras-reporte,
.total-bolsas-reporte {
    margin-top: 8px;
    padding: 8px 9px;
    color: #dffaff;
    border: 1px solid rgba(56,217,255,.22);
    border-radius: 9px;
    background: rgba(56,217,255,.09);
    box-shadow: 0 0 14px rgba(56,217,255,.07);
    font-size: .88rem;
    font-weight: 850;
    text-align: center;
}

.reporte-extenso {
    color: #334155;
    border: 1px solid #dbe4ee;
    border-radius: 11px;
    background: #edf3f8;
}

.refrigeracion-checkbox-container,
.valores-container-debajo,
.venta-checkbox-container {
    border: 1px solid rgba(14,165,233,.14);
    border-radius: 10px;
    background: rgba(14,165,233,.07);
}

.producto[data-es-venta="true"] {
    border-left: 4px solid #10b981;
    background: linear-gradient(145deg, #f3fff9, #eaf8f1);
}

/* Estado del pedido de la medida: contorno completo y fácil de identificar. */
.producto.pedido-cubierto {
    border: 3px solid #10b981;
    box-shadow:
        0 0 0 2px rgba(16,185,129,.22),
        0 16px 34px rgba(5,150,105,.20),
        inset 0 1px rgba(255,255,255,.9);
}

.producto.pedido-pendiente {
    border: 3px solid #ef4444;
    box-shadow:
        0 0 0 2px rgba(239,68,68,.20),
        0 16px 34px rgba(220,38,38,.18),
        inset 0 1px rgba(255,255,255,.9);
}

/* Un reporte de taras incompleto siempre debe advertirse en rojo, aunque
   la cantidad solicitada del pedido ya se encuentre cubierta. */
.producto.taras-no-reportadas {
    border: 3px solid #ef4444;
    box-shadow:
        0 0 0 2px rgba(239,68,68,.24),
        0 16px 34px rgba(220,38,38,.22),
        inset 0 1px rgba(255,255,255,.9);
}

/* El reporte completo gobierna el contorno de la tarjeta. El indicador
   PEDIDO conserva por separado su rojo hasta cubrir la cantidad solicitada. */
.producto.taras-reportadas {
    border: 3px solid #10b981;
    box-shadow:
        0 0 0 2px rgba(16,185,129,.24),
        0 16px 34px rgba(5,150,105,.22),
        inset 0 1px rgba(255,255,255,.9);
}

@media screen and (min-width: 1101px) {
    .producto {
        flex: 0 0 calc(25% - 10px) !important;
        max-width: calc(25% - 10px) !important;
    }
}

@media screen and (max-width: 1100px) {
    .producto { flex-basis: calc(50% - 7px); max-width: calc(50% - 7px); }
}

@media screen and (max-width: 620px) {
    .producto { flex-basis: 100% !important; max-width: 100% !important; }
}
</style>
