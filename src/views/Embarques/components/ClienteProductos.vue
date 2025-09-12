<template>
    <div class="cliente-grupo" v-show="clienteActivo === clienteId || clienteActivo === null">
        <div class="cliente-header sticky-header" :data-cliente="nombreCliente">
            <div class="cliente-info">
                <h3>
                    {{ nombreCliente || 'Cliente Desconocido' }}
                    <button @click.stop="$emit('generar-pdf', 'cliente', clienteId)" class="btn-pdf-mini"
                        title="Vista previa PDF">
                        <i class="fas fa-eye"></i>
                    </button>
                </h3>
                <div class="cliente-totales">
                    <span>Limpio: {{ calcularTotalLimpioCliente }}T / {{ formatearKilos(calcularKilosLimpioCliente)
                        }}Kg</span>
                    <span>Crudo: {{ calcularTotalCrudoCliente }}T / {{ formatearKilos(calcularKilosCrudoCliente)
                        }}Kg</span>
                </div>
            </div>
            <div class="cliente-header-controls">
                <div class="juntar-medidas-checkbox">
                    <input type="checkbox" :id="'juntar-medidas-' + clienteId"
                        v-model="clientesJuntarMedidas[clienteId]" @change="handleJuntarMedidasChange" @click.stop
                        :disabled="embarqueBloqueado">
                    <label :for="'juntar-medidas-' + clienteId" @click.stop>Juntar medidas</label>
                </div>
                
                <!-- Checkbox para regla de Otilio (sumar 0.5 kg por cada 100 kg) -->
                <div v-if="esClienteOtilio" class="regla-otilio-checkbox">
                    <input type="checkbox" :id="'regla-otilio-' + clienteId"
                        v-model="clientesReglaOtilio[clienteId]" @change="handleReglaOtilioChange" @click.stop
                        :disabled="embarqueBloqueado">
                    <label :for="'regla-otilio-' + clienteId" @click.stop>Sumar 0.5 kg por cada 100 kg</label>
                </div>
                
                <!-- Checkbox para incluir precios en PDF (específico para Catarro) -->
                <div class="incluir-precios-checkbox">
                    <input type="checkbox" :id="'incluir-precios-' + clienteId"
                        v-model="clientesIncluirPrecios[clienteId]" @change="handleIncluirPreciosChange" @click.stop
                        :disabled="embarqueBloqueado">
                    <label :for="'incluir-precios-' + clienteId" @click.stop>Incluir precios en PDF</label>
                </div>
                
                <!-- Checkbox para hacer cálculos en PDF (solo si incluir precios está activado) -->
                <div v-if="clientesIncluirPrecios[clienteId]" class="cuenta-en-pdf-checkbox">
                    <input type="checkbox" :id="'cuenta-en-pdf-' + clienteId"
                        v-model="clientesCuentaEnPdf[clienteId]" @change="handleCuentaEnPdfChange" @click.stop
                        :disabled="embarqueBloqueado">
                    <label :for="'cuenta-en-pdf-' + clienteId" @click.stop>Cuenta en PDF</label>
                </div>
                
                <!-- Checkbox para sumar 1 kg (específico para Catarro) -->
                <div v-if="esClienteCatarro" class="sumar-kg-catarro-checkbox">
                    <input type="checkbox" :id="'sumar-kg-catarro-' + clienteId"
                        v-model="clientesSumarKgCatarro[clienteId]" @change="handleSumarKgCatarroChange" @click.stop
                        :disabled="embarqueBloqueado">
                    <label :for="'sumar-kg-catarro-' + clienteId" @click.stop">Sumar 1 kg</label>
                </div>
                
                <button type="button" @click.stop="$emit('generar-pdf', 'cliente', clienteId)"
                    class="btn btn-primary btn-sm generar-pdf-cliente" title="Generar Nota de Venta PDF (incluye página sin precios)"
                    :disabled="isGeneratingPdf">
                    <span v-if="isGeneratingPdf && pdfType === 'cliente-' + clienteId" class="loader-inline"></span>
                    <i v-else class="fas fa-file-pdf"></i> Generar Nota PDF
                </button>

                <!-- Botón para crear cuenta de Joselito -->
                <button v-if="esClienteJoselito" type="button" @click.stop="crearCuentaJoselito"
                    class="btn btn-success btn-sm crear-cuenta-joselito" title="Crear Cuenta para Joselito"
                    :disabled="isCreatingAccount">
                    <span v-if="isCreatingAccount" class="loader-inline"></span>
                    <i v-else class="fas fa-plus-circle"></i> Crear Cuenta
                </button>

                <!-- Botón para crear cuenta de Catarro -->
                <button v-if="esClienteCatarro" type="button" @click.stop="crearCuentaCatarro"
                    class="btn btn-success btn-sm crear-cuenta-catarro" title="Crear Cuenta para Catarro"
                    :disabled="isCreatingAccount">
                    <span v-if="isCreatingAccount" class="loader-inline"></span>
                    <i v-else class="fas fa-plus-circle"></i> Crear Cuenta
                </button>

                <!-- Botón para crear cuenta de Ozuna -->
                <button v-if="esClienteOzuna" type="button" @click.stop="crearCuentaOzuna"
                    class="btn btn-success btn-sm crear-cuenta-ozuna" title="Crear Cuenta para Ozuna"
                    :disabled="isCreatingAccount">
                    <span v-if="isCreatingAccount" class="loader-inline"></span>
                    <i v-else class="fas fa-plus-circle"></i> Crear Cuenta
                </button>

                <!-- Botón para crear cuenta de Otilio -->
                <button v-if="esClienteOtilio" type="button" @click.stop="crearCuentaOtilio"
                    class="btn btn-success btn-sm crear-cuenta-otilio" title="Crear Cuenta para Otilio"
                    :disabled="isCreatingAccount">
                    <span v-if="isCreatingAccount" class="loader-inline"></span>
                    <i v-else class="fas fa-plus-circle"></i> Crear Cuenta
                </button>

                <!-- Botón para crear cuenta de Veronica -->
                <button v-if="esClienteVeronica" type="button" @click.stop="crearCuentaVeronica"
                    class="btn btn-success btn-sm crear-cuenta-veronica" title="Crear Cuenta para Veronica"
                    :disabled="isCreatingAccount">
                    <span v-if="isCreatingAccount" class="loader-inline"></span>
                    <i v-else class="fas fa-plus-circle"></i> Crear Cuenta
                </button>

                <button type="button" @click.stop="$emit('eliminar-cliente', clienteId)"
                    class="btn btn-danger btn-sm eliminar-cliente" :disabled="embarqueBloqueado">Eliminar
                    Cliente</button>
            </div>
        </div>

        <div class="productos-container">
            <!-- Lista de productos -->
            <ProductoItem v-for="(producto, index) in productos" :key="index" :producto="producto"
                :embarque-bloqueado="embarqueBloqueado" :medidas-usadas="medidasUsadas" :medidas-configuracion="medidasConfiguracion" :nombre-cliente="nombreCliente"
                :precios-actuales="preciosActuales" :fecha-embarque="fechaEmbarque"
                @update:producto="actualizarProducto" @eliminar-producto="$emit('eliminar-producto', producto)"
                @mostrar-modal-precio="$emit('mostrar-modal-precio', $event)"
                @mostrar-modal-hilos="$emit('mostrar-modal-hilos', $event)"
                @mostrar-modal-nota="$emit('mostrar-modal-nota', $event)"
                @mostrar-modal-nombre-alternativo="$emit('mostrar-modal-nombre-alternativo', $event)"
                @mostrar-modal-alt="$emit('mostrar-modal-alt', $event)" @seleccionar-medida="seleccionarMedida"
                @activar-incluir-precios-catarro="activarIncluirPreciosCatarro"
                @marcar-campo-edicion="$emit('marcar-campo-edicion', $event.productoId, $event.campo)"
                @desmarcar-campo-edicion="$emit('desmarcar-campo-edicion', $event.productoId, $event.campo)" />

            <!-- Lista de crudos -->
            <CrudoItem v-for="(crudo, index) in crudos" :key="'crudo-' + index" :crudo="crudo"
                :embarque-bloqueado="embarqueBloqueado" :cliente-id="clienteId" :crudo-index="index"
                :precios-actuales="preciosActuales" :fecha-embarque="fechaEmbarque" :nombre-cliente="nombreCliente"
                @update:crudo="actualizarCrudo(index, $event)"
                @eliminar-crudo="$emit('eliminar-crudo', $event, clienteId)"
                @eliminar-crudo-item="$emit('eliminar-crudo-item', clienteId, ...$event)"
                @agregar-crudo-item="$emit('agregar-crudo-item', clienteId, $event)"
                @toggle-sobrante="$emit('toggle-sobrante', clienteId, ...$event)"
                @mostrar-modal-precio="$emit('mostrar-modal-precio', $event)" />
        </div>

        <div class="botones-agregar">
            <button type="button" @click="$emit('agregar-producto', clienteId)"
                class="btn btn-primary btn-sm agregar-producto" :disabled="embarqueBloqueado">Agregar Producto</button>
            <button type="button" @click="$emit('agregar-crudo', clienteId)" class="btn btn-info btn-sm agregar-crudo" s
                :disabled="embarqueBloqueado">Agregar Crudos</button>
        </div>
    </div>
</template>

<script>

import ProductoItem from './ProductoItem.vue';
import CrudoItem from './CrudoItem.vue';

export default {
    name: 'ClienteProductos',
    components: {
        ProductoItem,
        CrudoItem
    },
    props: {
        clienteId: {
            type: [String, Number],
            required: true
        },
        productos: {
            type: Array,
            default: () => []
        },
        crudos: {
            type: Array,
            default: () => []
        },
        clientesJuntarMedidas: {
            type: Object,
            default: () => ({})
        },
        clientesReglaOtilio: {
            type: Object,
            default: () => ({})
        },
        clientesIncluirPrecios: {
            type: Object,
            default: () => ({})
        },
        clientesCuentaEnPdf: {
            type: Object,
            default: () => ({})
        },
        clientesSumarKgCatarro: {
            type: Object,
            default: () => ({})
        },
        nombreCliente: {
            type: String,
            required: true,
            default: 'Cliente Desconocido'
        },
        clienteActivo: {
            type: [String, Number, null],
            default: null
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
        isGeneratingPdf: {
            type: Boolean,
            default: false
        },
        pdfType: {
            type: String,
            default: ''
        },
        isCreatingAccount: {
            type: Boolean,
            default: false
        },
        preciosActuales: {
            type: Array,
            default: () => []
        },
        fechaEmbarque: {
            type: String,
            default: ''
        }
    },

    emits: [
        'update:productos',
        'update:crudos',
        'juntarMedidas-change',
        'reglaOtilio-change',
        'incluirPrecios-change',
        'sumarKgCatarro-change',
        'eliminar-cliente',
        'eliminar-producto',
        'eliminar-crudo',
        'eliminar-crudo-item',
        'agregar-producto',
        'agregar-crudo',
        'agregar-crudo-item',
        'toggle-sobrante',
        'mostrar-modal-precio',
        'mostrar-modal-hilos',
        'mostrar-modal-nota',
        'mostrar-modal-nombre-alternativo',
        'mostrar-modal-alt',
        'seleccionar-medida',
        'generar-pdf',
        'crear-cuenta-joselito',
        'crear-cuenta-catarro',
        'crear-cuenta-ozuna',
        'crear-cuenta-otilio'
    ],

    computed: {
        // Verificar si el cliente es Joselito
        esClienteJoselito() {
            return this.nombreCliente && this.nombreCliente.toLowerCase().includes('joselito');
        },

        // Verificar si el cliente es Catarro
        esClienteCatarro() {
            return this.nombreCliente && this.nombreCliente.toLowerCase().includes('catarro');
        },

        // Verificar si el cliente es Ozuna
        esClienteOzuna() {
            return this.nombreCliente && this.nombreCliente.toLowerCase().includes('ozuna');
        },

        // Verificar si el cliente es Otilio
        esClienteOtilio() {
            return this.nombreCliente && this.nombreCliente.toLowerCase().includes('otilio');
        },

        // Verificar si el cliente es Veronica
        esClienteVeronica() {
            return this.nombreCliente && (this.nombreCliente.toLowerCase().includes('veronica') || this.nombreCliente.toLowerCase().includes('lorena'));
        },

        // Calcular totales de limpio
        calcularTotalLimpioCliente() {
            return this.productos.reduce((total, producto) => {
                const tarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
                const tarasExtra = (producto.tarasExtra || []).reduce((sum, tara) => sum + (tara || 0), 0);
                return total + tarasNormales + tarasExtra;
            }, 0);
        },

        calcularKilosLimpioCliente() {
            return this.productos.reduce((total, producto) => {
                if (producto.tipo === 'c/h20') {
                    // Para productos c/h20, calcular con el valor neto
                    const reporteTaras = producto.reporteTaras || [];
                    const reporteBolsas = producto.reporteBolsas || [];
                    let sumaTotalKilos = 0;

                    for (let i = 0; i < reporteTaras.length; i++) {
                        const taras = parseInt(reporteTaras[i]) || 0;
                        const bolsa = parseInt(reporteBolsas[i]) || 0;
                        sumaTotalKilos += taras * bolsa;
                    }

                    // Multiplicar por el valor neto (0.65 por defecto)
                    const kilosReales = sumaTotalKilos * (producto.camaronNeto || 0.65);
                    return total + kilosReales;
                } else {
                    // Para otros productos, mantener el cálculo original
                    const sumaKilos = (producto.kilos || []).reduce((sum, kilo) => sum + (kilo || 0), 0);
                    const sumaTarasNormales = (producto.taras || []).reduce((sum, tara) => sum + (tara || 0), 0);
                    // No incluimos las taras extra en el descuento
                    const descuentoTaras = producto.restarTaras ? sumaTarasNormales * 3 : 0;
                    const resultado = Number((sumaKilos - descuentoTaras).toFixed(1));
                    return total + resultado;
                }
            }, 0);
        },

        // Calcular totales de crudo
        calcularTotalCrudoCliente() {
            return this.crudos.reduce((total, crudo) => {
                if (!crudo || !crudo.items || !Array.isArray(crudo.items)) {
                    return total;
                }
                return total + crudo.items.reduce((itemTotal, item) => {
                    let taras = this.extraerNumero(item.taras);
                    let sobrante = this.extraerNumero(item.sobrante);
                    return itemTotal + taras + sobrante;
                }, 0);
            }, 0);
        },

        calcularKilosCrudoCliente() {
            return this.crudos.reduce((total, crudo) => {
                if (!crudo || !crudo.items || !Array.isArray(crudo.items)) {
                    return total;
                }
                return total + crudo.items.reduce((itemTotal, item) => {
                    return itemTotal + this.calcularKilosCrudos(item);
                }, 0);
            }, 0);
        }
    },

    methods: {
        extraerNumero(valor) {
            if (!valor) return 0;
            const match = valor.toString().match(/^(\d+)/);
            return match ? parseInt(match[1]) : 0;
        },

        actualizarProducto(producto) {
            this.$emit('update:productos', this.productos.map(p =>
                p.id === producto.id ? producto : p
            ));
        },

        actualizarCrudo(index, crudo) {
            const nuevosCrudos = [...this.crudos];
            nuevosCrudos[index] = crudo;
            this.$emit('update:crudos', nuevosCrudos);
        },

        seleccionarMedida(producto, medida) {
            producto.medida = medida;
            this.actualizarProducto(producto);
            this.$emit('seleccionar-medida', producto, medida);
        },

        calcularKilosCrudos(item) {
            let kilosTotales = 0;

            // Procesar taras
            if (item.taras) {
                // Verificar si la tara tiene formato "5-19" o similar
                const formatoGuion = /^(\d+)-(\d+)$/.exec(item.taras);
                if (formatoGuion) {
                    const cantidad = parseInt(formatoGuion[1]) || 0;
                    let medida = parseInt(formatoGuion[2]) || 0;

                    // Si la medida es 19, sustituirla por 20
                    if (medida === 19) {
                        medida = 20;
                    }

                    kilosTotales += cantidad * medida;
                } else {
                    // Formato original si no coincide con el patrón
                    const [cantidad, medida] = item.taras.split('-').map(Number);
                    kilosTotales += cantidad * medida;
                }
            }

            // Procesar sobrante
            if (item.sobrante) {
                // Verificar si el sobrante tiene formato "5-19" o similar
                const formatoGuion = /^(\d+)-(\d+)$/.exec(item.sobrante);
                if (formatoGuion) {
                    const cantidadSobrante = parseInt(formatoGuion[1]) || 0;
                    let medidaSobrante = parseInt(formatoGuion[2]) || 0;

                    // Si la medida es 19, sustituirla por 20
                    if (medidaSobrante === 19) {
                        medidaSobrante = 20;
                    }

                    kilosTotales += cantidadSobrante * medidaSobrante;
                } else {
                    // Formato original si no coincide con el patrón
                    const [cantidadSobrante, medidaSobrante] = item.sobrante.split('-').map(Number);
                    kilosTotales += cantidadSobrante * medidaSobrante;
                }
            }

            return kilosTotales;
        },

        formatearKilos(kilos) {
            return kilos.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 1
            });
        },

        handleJuntarMedidasChange(event) {
            this.$emit('juntarMedidas-change', this.clienteId, event.target.checked);
        },

        handleReglaOtilioChange(event) {
            this.$emit('reglaOtilio-change', this.clienteId, event.target.checked);
        },

        handleIncluirPreciosChange(event) {
            this.$emit('incluirPrecios-change', this.clienteId, event.target.checked);
        },

        handleCuentaEnPdfChange(event) {
            this.$emit('cuentaEnPdf-change', this.clienteId, event.target.checked);
        },

        handleSumarKgCatarroChange(event) {
            console.log('[DEBUG] Checkbox Sumar Kg Catarro cambiado:', {
                clienteId: this.clienteId,
                checked: event.target.checked,
                nombreCliente: this.nombreCliente
            });
            this.$emit('sumarKgCatarro-change', this.clienteId, event.target.checked);
        },

        crearCuentaJoselito() {
            this.$emit('crear-cuenta-joselito', this.clienteId, this.productos, this.crudos);
        },

        crearCuentaCatarro() {
            this.$emit('crear-cuenta-catarro', this.clienteId, this.productos, this.crudos);
        },

        crearCuentaOzuna() {
            this.$emit('crear-cuenta-ozuna', this.clienteId, this.productos, this.crudos);
        },

        crearCuentaOtilio() {
            this.$emit('crear-cuenta-otilio', this.clienteId, this.productos, this.crudos);
        },

        crearCuentaVeronica() {
            this.$emit('crear-cuenta-veronica', this.clienteId, this.productos, this.crudos);
        },

        activarIncluirPreciosCatarro() {
            if (this.esClienteCatarro && !this.clientesIncluirPrecios[this.clienteId]) {
                this.$set(this.clientesIncluirPrecios, this.clienteId, true);
            }
        }
    }
}

</script>


<style scoped>
.cliente-grupo {
    margin-bottom: 30px;
    background-color: #fff;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.cliente-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background-color: #f8f9fa;
    border-bottom: 1px solid #e1e4e8;
    border-radius: 6px 6px 0 0;
    position: sticky;
    top: 0;
    z-index: 10;
}

.cliente-header.sticky-header {
    transition: box-shadow 0.3s ease;
}

.cliente-header.sticky-header[data-scrolled="true"] {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.cliente-info {
    flex: 1;
    
}

.cliente-info h3 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.3rem;
}

.btn-pdf-mini {
    background: none;
    border: none;
    color: #6c757d;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 3px 6px;
    border-radius: 3px;
}

.btn-pdf-mini:hover {
    color: #3498db;
    background-color: rgba(52, 152, 219, 0.1);
}

.cliente-totales {
    display: flex;
    gap: 15px;
    margin-top: 5px;
    font-size: 0.9rem;
    color: #6c757d;
}

.cliente-header-controls {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}

.juntar-medidas-checkbox {
    display: flex;
    align-items: center;
    margin-right: 10px;
    font-size: 0.9rem;
}

.regla-otilio-checkbox {
    display: flex;
    align-items: center;
    margin-right: 10px;
    font-size: 0.9rem;
}

.incluir-precios-checkbox {
    display: flex;
    align-items: center;
    margin-right: 10px;
    font-size: 0.9rem;
}

.cuenta-en-pdf-checkbox {
    display: flex;
    align-items: center;
    margin-right: 10px;
    font-size: 0.9rem;
}

.sumar-kg-catarro-checkbox {
    display: flex;
    align-items: center;
    margin-right: 10px;
    font-size: 0.9rem;
}

.generar-pdf-cliente,
.crear-cuenta-joselito,
.crear-cuenta-catarro,
.eliminar-cliente {
    font-size: 0.85rem;
    padding: 4px 8px;
    display: flex;
    align-items: center;
    gap: 5px;
}

.loader-inline {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.productos-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 15px;
    width: 100%;
    box-sizing: border-box;
}

.botones-agregar {
    display: flex;
    justify-content: flex-start;
    gap: 10px;
    padding: 0 15px 15px;
}

.agregar-producto,
.agregar-crudo {
    font-size: 0.9rem;
    padding: 5px 10px;
}

/* Estilos para el cliente seleccionado */
.cliente-seleccionado {
    background-color: rgba(52, 152, 219, 0.1);
    animation: highlight 2s ease-out;
}

@keyframes highlight {
    0% {
        background-color: rgba(52, 152, 219, 0.3);
    }

    100% {
        background-color: rgba(52, 152, 219, 0.1);
    }
}

/* Estilos para estados disabled */
button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

/* Estilos específicos para botones de crear cuenta */
.crear-cuenta-veronica {
    background-color: #ff8c00 !important;
    border-color: #ff8c00 !important;
    color: #fff !important;
}

.crear-cuenta-veronica:hover {
    background-color: #e07600 !important;
    border-color: #e07600 !important;
}

/* Estilos específicos para cada cliente */
.cliente-header[data-cliente="Joselito"] {
    background-color: rgba(52, 152, 219, 0.1);
    border-left: 10px solid #3498db;
}

.cliente-header[data-cliente="Catarro"] {
    background-color: rgba(231, 76, 60, 0.1);
    border-left: 10px solid #e74c3c;
}

.cliente-header[data-cliente="Otilio"] {
    background-color: rgba(241, 196, 15, 0.1);
    border-left: 10px solid #f1c40f;
}

.cliente-header[data-cliente="Ozuna"] {
    background-color: rgba(46, 204, 113, 0.1);
    border-left: 10px solid #2ecc71;
}

.cliente-header[data-cliente="Canelo"] {
    background-color: rgba(156, 91, 182, 0.332);
    border-left: 10px solid #7e3a99;
}

/* Veronica / Lorena (naranja) */
.cliente-header[data-cliente="Veronica"] {
    background-color: rgba(230, 126, 34, 0.1);
    border-left: 10px solid #e67e22;
}

.cliente-header[data-cliente="Lorena"] {
    background-color: rgba(230, 126, 34, 0.1);
    border-left: 10px solid #e67e22;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .cliente-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .cliente-header-controls {
        margin-top: 10px;
        width: 100%;
        justify-content: space-between;
    }

    .cliente-totales {
        flex-direction: column;
        gap: 5px;
    }
}
</style>