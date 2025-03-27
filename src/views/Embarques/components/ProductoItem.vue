<template>
    <div class="producto" :data-es-venta="producto.esVenta" :class="{
        'reporte-completo': coincideTarasYBolsas,
        'reporte-incompleto': !coincideTarasYBolsas && tieneAlgunReporte
    }">
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
            <span v-if="producto.precio" class="precio-tag">${{ producto.precio }}</span>
        </h2>
        <div class="producto-header">
            <div class="medida-input-container">
                <input type="text" v-model="producto.medida" class="medida-input" placeholder="Medida"
                    @input="onMedidaInput" @blur="onMedidaBlur" :disabled="embarqueBloqueado">
                <button @click="abrirModalAlt" class="btn-alt" :class="{ 'tiene-alt': producto.textoAlternativo }"
                    :disabled="embarqueBloqueado">
                    Alt
                </button>
                <!-- Sugerencias de medidas -->
                <div v-if="editandoMedida && sugerenciasMedidas.length > 0" class="sugerencias-container">
                    <div v-for="medida in sugerenciasMedidas" :key="medida" class="sugerencia-item"
                        @mousedown="seleccionarMedida(medida)">
                        {{ medida }}
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

            <!-- Checkbox de venta para Ozuna -->
            <div v-if="isClienteOzuna" class="venta-checkbox-container">
                <input type="checkbox" v-model="producto.esVenta" class="form-check-input venta-checkbox"
                    :id="'ventaCheck-' + producto.id" :disabled="embarqueBloqueado">
                <label :for="'ventaCheck-' + producto.id">Venta</label>
            </div>

            <input v-if="producto.tipo === 'otro'" type="text" v-model="producto.tipoPersonalizado"
                class="form-control tipo-input" placeholder="Especificar" :disabled="embarqueBloqueado">
            <button type="button" @click="eliminarProducto" class="btn btn-danger btn-sm eliminar-producto"
                :disabled="embarqueBloqueado">X</button>
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
                        @focus="$event.target.select()" :disabled="embarqueBloqueado">
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
                        @focus="$event.target.select()" :disabled="embarqueBloqueado" @input="actualizarProducto">
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
                <div style="height: 38px"></div>
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
export default {
    name: 'ProductoItem',
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
        nombreCliente: {
            type: String,
            default: ''
        }
    },

    data() {
        return {
            editandoMedida: false,
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
        'seleccionar-medida'
    ],

    computed: {
        // Detectar si el cliente es Ozuna
        isClienteOzuna() {
            return this.nombreCliente.toLowerCase() === 'ozuna';
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

        // Total de taras reportadas
        totalTarasReportadas() {
            return (this.producto.reporteTaras || []).reduce((total, tara) => {
                return total + (parseInt(tara) || 0);
            }, 0);
        },

        // Total de bolsas reportadas
        totalBolsasReportadas() {
            return (this.producto.reporteTaras || []).reduce((total, tara, index) => {
                const taraNum = parseInt(tara) || 0;
                const bolsaNum = parseInt(this.producto.reporteBolsas[index]) || 0;
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

            // Si no hay taras registradas ni reportadas, retornar false
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

    methods: {
        // Método para actualizar el componente padre
        actualizarProducto() {
            this.$emit('update:producto', this.producto);
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

        // Métodos para el manejo de la medida
        onMedidaInput(event) {
            const valor = event.target.value.toLowerCase();
            this.editandoMedida = true;

            if (valor) {
                this.sugerenciasMedidas = this.medidasUsadas.filter(m =>
                    m.toLowerCase().includes(valor) &&
                    m.toLowerCase() !== valor
                );
            } else {
                this.sugerenciasMedidas = [];
            }

            this.producto.isEditing = true;
            this.actualizarProducto();
        },

        onMedidaBlur() {
            // Dar un pequeño delay antes de ocultar las sugerencias para permitir clicks
            setTimeout(() => {
                this.editandoMedida = false;
            }, 200);

            // Solo quitar la marca de edición si tiene tanto medida como tipo
            if (this.producto.medida && this.producto.medida.length > 0 && this.producto.tipo) {
                this.producto.isEditing = false;
                this.producto.isNew = false;
            }

            this.actualizarProducto();
        },

        seleccionarMedida(medida) {
            this.producto.medida = medida;
            this.editandoMedida = false;
            this.$emit('seleccionar-medida', this.producto, medida);
        },

        onTipoChange() {
            if (this.producto.tipo !== 'otro') {
                this.producto.tipoPersonalizado = '';
            }
            if (this.producto.tipo === 'c/h20' && !this.producto.camaronNeto) {
                this.producto.camaronNeto = 0.65;
            }

            // Marcar temporalmente como editando para evitar ordenamiento inmediato
            this.producto.isEditing = true;
            this.$nextTick(() => {
                // Después de un breve retraso, permitir el ordenamiento
                setTimeout(() => {
                    if (this.producto.medida && this.producto.tipo) {
                        this.producto.isEditing = false;
                    }
                    this.actualizarProducto();
                }, 100);
            });

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
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
    padding: 8px;
}

.producto {
    flex: 0 0 calc(25% - 6px); /* Exactamente 25% menos el gap */
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

.encabezado-medida {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
}

.medida-texto {
    flex-grow: 1;
    font-size: 1.2rem;
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
    font-size: 0.7rem;
    margin-left: 5px;
}

.precio-tag {
    color: #27ae60;
    font-weight: bold;
    padding: 0 10px;
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
    max-height: 150px;
    overflow-y: auto;
    background: white;
    border: 1px solid #ddd;
    border-top: none;
    border-radius: 0 0 4px 4px;
    z-index: 10;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.sugerencia-item {
    padding: 8px 12px;
    cursor: pointer;
}

.sugerencia-item:hover {
    background-color: #f0f0f0;
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
    background: #9b59b6;
    color: white;
    border-color: #8e44ad;
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
    font-size: 1rem;
}

.checkbox-container {
    display: flex;
    align-items: center;
    font-size: 14px;
}

.input-group {
    display: flex;
    margin-bottom: 5px;
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
    font-size: 0.9em;
}

.venta-checkbox-container {
    display: flex;
    align-items: center;
    margin-right: 10px;
    font-size: 14px;
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
    font-size: 14px;
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

@media screen and (max-width: 1100px) {
    .producto {
        flex: 0 0 calc(50% - 4px);
        max-width: calc(50% - 4px);
    }
}

@media screen and (max-width: 768px) {
    .producto {
        flex: 0 0 100%;
        max-width: 100%;
    }
}
</style>