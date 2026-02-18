<template>
    <div class="producto" :data-es-venta="producto.esVenta" :class="{
        'reporte-completo': coincideTarasYBolsas,
        'reporte-incompleto': !coincideTarasYBolsas && tieneAlgunReporte,
        'taras-reportadas': coincideTaras,
        'taras-no-reportadas': totalTaras > 0 && !coincideTaras,
        'producto-en-cero': totalTaras === 0 && totalTarasReportadas === 0,
        'medida-vacia': !producto.medida
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
                        <span v-if="producto.nombreAlternativoPDF" class="pdf-badge"
                            title="Nombre personalizado para PDF">PDF</span>
                    </template>
                    <template v-else>
                        {{ producto.nombreAlternativoPDF || producto.medida || 'Sin Medida' }}
                        - {{ obtenerTipoProducto }}
                        <span v-if="producto.nombreAlternativoPDF" class="pdf-badge"
                            title="Nombre personalizado para PDF">PDF</span>
                    </template>
                </span>
                <PedidoReferencia
                    :pedido-referencia="producto.pedidoReferencia"
                    :total-kilos="totalesCompartidos.totalKilos"
                    :total-taras="totalesCompartidos.totalTaras"
                />
            </div>
            <span v-if="producto.precio" class="precio-tag">${{ producto.precio }}</span>
        </h2>
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
                <div v-if="mostrarSugerencias && (sugerenciasMedidas.length > 0 || medidasConfiguracion.length > 0)" class="sugerencias-container">
                    <!-- Medidas configuradas que coinciden -->
                    <div v-if="medidasConfiguradas.length > 0" class="sugerencias-seccion">
                        <div class="sugerencias-titulo">Medidas configuradas:</div>
                        <div v-for="medida in medidasConfiguradas" :key="'config-' + medida" class="sugerencia-item config-medida"
                            @mousedown="seleccionarMedida(medida)">
                            <i class="fas fa-star"></i> {{ medida }}
                        </div>
                    </div>
                    <!-- Medidas usadas anteriormente -->
                    <div v-if="sugerenciasMedidas.length > 0" class="sugerencias-seccion">
                        <div class="sugerencias-titulo">Medidas usadas anteriormente:</div>
                        <div v-for="medida in sugerenciasMedidas" :key="'hist-' + medida" class="sugerencia-item hist-medida"
                            @mousedown="seleccionarMedida(medida)">
                            <i class="fas fa-history"></i> {{ medida }}
                        </div>
                    </div>
                    <!-- Todas las medidas configuradas cuando el campo está vacío -->
                    <div v-if="!producto.medida && medidasConfiguracion.length > 0" class="sugerencias-seccion">
                        <div class="sugerencias-titulo">Todas las medidas disponibles:</div>
                        <div v-for="medida in medidasConfiguracion" :key="'all-' + medida" class="sugerencia-item all-medida"
                            @mousedown="seleccionarMedida(medida)">
                            {{ medida }}
                        </div>
                    </div>
                </div>
            </div>
            
            <select v-model="producto.tipo" class="form-control tipo-select" @change="onTipoChange" :class="{
                'tipo-azul': producto.tipo === 'c/h20',
                'tipo-verde': producto.tipo === 's/h20'
            }" :disabled="embarqueBloqueado">
                <option value="">Seleccionar</option>
                <option value="s/h20">S/H20</option>
                <option value="c/h20">C/H20</option>
                <option value="otro">Otro</option>
            </select>

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
                        placeholder="Tara" :size="String(producto.taras[taraIndex] || '').length || 1"
                        @focus="onTaraFocus(taraIndex, $event)" 
                        @blur="onTaraBlur(taraIndex)"
                        :disabled="embarqueBloqueado"
                        @input="onTaraInput(taraIndex)">
                    <button type="button" @click="eliminarTara(taraIndex)" class="btn btn-danger btn-sm"
                        :disabled="embarqueBloqueado">-</button>
                </div>
                <div v-for="(taraExtra, taraExtraIndex) in producto.tarasExtra" :key="'extra-' + taraExtraIndex"
                    class="input-group">
                    <input v-model.number="producto.tarasExtra[taraExtraIndex]" type="tel"
                        class="form-control tara-input" placeholder="Tara Extra"
                        :size="String(producto.tarasExtra[taraExtraIndex] || '').length || 1"
                        @focus="$event.target.select()" :disabled="embarqueBloqueado">
                    <button type="button" @click="eliminarTaraExtra(taraExtraIndex)" class="btn btn-danger btn-sm"
                        :disabled="embarqueBloqueado">-</button>
                </div>
                <div class="botones-tara">
                    <button type="button" @click="agregarTara" class="btn btn-success btn-sm agregar-tara"
                        :disabled="embarqueBloqueado">+</button>
                    <button type="button" @click="agregarTaraExtra" class="btn btn-warning btn-sm agregar-tara-extra"
                        :disabled="embarqueBloqueado">+ Extra</button>
                </div>
                <div class="total">Total: {{ totalTaras }}</div>
            </div>
            <div class="columna">
                <h5>Kilos</h5>
                <div v-for="(kilo, kiloIndex) in producto.kilos" :key="kiloIndex" class="input-group">
                    <input v-model.number="producto.kilos[kiloIndex]" type="tel" class="form-control kilo-input"
                        placeholder="Kilos" :size="String(producto.kilos[kiloIndex] || '').length || 1"
                        @focus="onKiloFocus(kiloIndex, $event)" 
                        @blur="onKiloBlur(kiloIndex)"
                        :disabled="embarqueBloqueado" 
                        @input="onKiloInput(kiloIndex)">
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
                        @focus="$event.target.select()" :disabled="embarqueBloqueado" @input="actualizarProducto">
                    <button type="button" @click="eliminarReporteTara(index)" class="btn btn-danger btn-sm"
                        :disabled="embarqueBloqueado">-</button>
                </div>
                <button type="button" @click="agregarReporteTara" class="btn btn-success btn-sm"
                    :disabled="embarqueBloqueado">+</button>
                <div class="total-taras-reporte" :class="{ 'coincide': coincideTaras, 'no-coincide': !coincideTaras }">
                    Reportadas: {{ totalTarasReportadas }}
                </div>
            </div>
            <div class="reporte-item">
                <h5>Bolsas</h5>
                <div v-for="(bolsa, index) in producto.reporteBolsas" :key="index" class="input-group mb-2">
                    <input type="tel" v-model="producto.reporteBolsas[index]" class="form-control reporte-input"
                        @focus="$event.target.select()" :disabled="embarqueBloqueado" @input="actualizarProducto">
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
import { obtenerPrecioParaMedida, normalizarMedida } from '@/utils/preciosHistoricos';
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
        totalesAgrupadosPorClave: {
            type: Object,
            default: () => ({})
        }
    },

    data() {
        return {
            mostrarSugerencias: false,
            sugerenciasMedidas: []
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
            const valor = this.producto.medida.toLowerCase();
            return this.medidasConfiguracion.filter(m =>
                m.toLowerCase().includes(valor) &&
                m.toLowerCase() !== valor
            );
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

            // Intentar con la medida real del producto
            let referencia = buscarReferenciaPorMedida(this.producto.medida);

            // Si no se encontró y tiene nombreAlternativoPDF, intentar con el nombre alternativo
            if (!referencia && this.producto.nombreAlternativoPDF) {
                referencia = buscarReferenciaPorMedida(this.producto.nombreAlternativoPDF);
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
            if (!this.producto.medida) {
                return;
            }

            const nombreCliente = this.nombreCliente.trim().toLowerCase();
            
            // Lógica especial para Ozuna: si no es venta (maquila), precio siempre 21
            // Nota: aquí NO respetamos `precioBorradoManualmente` porque en maquila queremos:
            // - Default: 21
            // - Si el usuario editó el precio, conservarlo (persistido en `precioMaquila`)
            if (nombreCliente === 'ozuna' && !this.producto.esVenta) {
                // Si existe precio de maquila personalizado, usarlo
                if (this.producto.precioMaquila !== null && this.producto.precioMaquila !== undefined && this.producto.precioMaquila !== '') {
                    const pm = Number(this.producto.precioMaquila);
                    if (!Number.isNaN(pm) && pm > 0) {
                        this.producto.precio = pm;
                    } else {
                        this.producto.precio = 21;
                    }
                } else {
                    // Default duro a 21 para maquila Ozuna; migrar valores previos (20) al nuevo default
                    this.producto.precio = 21;
                    this.$set(this.producto, 'precioMaquila', 21);
                }
                
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
            
            
            
            const precioHistorico = obtenerPrecioParaMedida(
                this.preciosActuales, 
                this.producto.medida, 
                fechaParaPrecios, 
                clienteId
            );
            
            if (precioHistorico) {
                this.producto.precio = precioHistorico;
                
                
                // Emitir evento para notificar que se asignó precio automáticamente
                this.$emit('precio-asignado-automaticamente', {
                    medida: this.producto.medida,
                    cliente: nombreCliente,
                    precio: precioHistorico,
                    fecha: fechaParaPrecios,
                    esMismoDiaActual: fechaParaPrecios === obtenerFechaActualISO(),
                    clienteId: clienteId
                });
            } else {
            }
        },

        // Métodos para el manejo de la medida
        onMedidaInput(event) {
            const valor = event.target.value.toLowerCase();
            this.mostrarSugerencias = true;

            if (valor) {
                // Filtrar medidas usadas que coincidan (excluyendo medidas configuradas para evitar duplicados)
                this.sugerenciasMedidas = this.medidasUsadas.filter(m =>
                    m.toLowerCase().includes(valor) &&
                    m.toLowerCase() !== valor &&
                    !this.medidasConfiguracion.some(mc => mc.toLowerCase() === m.toLowerCase())
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
    padding: 8px;
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
</style>
