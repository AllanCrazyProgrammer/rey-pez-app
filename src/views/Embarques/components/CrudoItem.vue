<template>
    <div class="producto crudo" :class="{'crudo-ozuna': isClienteOzuna}">
        <h2 class="crudo-header">Crudos</h2>

        <div class="crudo-items">
            <div v-for="(item, itemIndex) in crudoData.items || []" :key="'item-' + itemIndex" class="crudo-item"
                :data-es-venta="item.esVenta">
                <div class="crudo-talla-container">
                    <button @click="abrirModalPrecio(item)" class="btn-precio" :class="{ 'tiene-precio': item.precio }"
                        :disabled="embarqueBloqueado">
                        $
                    </button>
                    <div class="talla-referencia">
                        <PedidoReferencia
                            :pedido-referencia="pedidoReferenciaCrudos && item.talla ? (pedidoReferenciaCrudos[item.talla] || item.pedidoReferencia) : item.pedidoReferencia"
                            :total-taras="totalTarasPorTalla[item.talla] || 0"
                        />
                        <select v-model="item.talla" class="form-control talla-select" @change="onTallaCrudoChange(item)"
                            :disabled="embarqueBloqueado">
                            <option value="">Elige talla</option>
                            <option value="Med c/c">Med c/c</option>
                            <option value="Med-Esp c/c">Med-Esp c/c</option>
                            <option value="Lag gde c/c">Lag gde c/c</option>
                            <option value="Med-Gde c/c">Med-Gde c/c</option>
                            <option value="Gde c/c">Gde c/c</option>
                            <option value="Extra c/c">Extra c/c</option>
                            <option value="Chico c/c">Chico c/c</option>
                            <option value="Gde c/ Extra">Gde c/ Extra c/c</option>
                            <option value="Jumbo c/c">Jumbo c/c</option>
                            <option value="Linea">Linea</option>
                            <option value="Acamaya">Acamaya</option>
                            <option value="Cam s/c">Cam s/c</option>
                            <option value="Rechazo">Rechazo</option>
                        </select>
                    </div>
                    <span v-if="item.precio" class="precio-tag">${{ item.precio }}</span>

                    <!-- Checkbox de venta para Ozuna -->
                    <div v-if="isClienteOzuna" class="venta-checkbox-container" style="display: none;">
                        <input type="checkbox" v-model="item.esVenta" class="form-check-input venta-checkbox"
                            :id="'ventaCrudo-' + crudoIndex + '-' + itemIndex" :disabled="embarqueBloqueado" @change="actualizarCrudo">
                        <label :for="'ventaCrudo-' + crudoIndex + '-' + itemIndex">Venta</label>
                    </div>

                    <input type="text" v-model="item.barco" class="form-control barco-input" placeholder="Barco"
                        :disabled="embarqueBloqueado" @input="actualizarCrudo">
                </div>

                <div class="crudo-taras-container">
                    <div class="taras-wrapper">
                        <input type="text" v-model="item.taras" class="form-control taras-input" placeholder="Taras"
                            @input="actualizarCrudo" :disabled="embarqueBloqueado">
                        <input v-if="item.mostrarSobrante" type="text" v-model="item.sobrante"
                            class="form-control taras-input" placeholder="Sbrte" @input="actualizarCrudo"
                            :disabled="embarqueBloqueado">
                        <input v-if="item.mostrarSobrante2" type="text" v-model="item.sobrante2"
                            class="form-control taras-input" placeholder="Sbrte 2" @input="actualizarCrudo"
                            :disabled="embarqueBloqueado">
                    </div>
                    <div class="buttons-wrapper">
                        <button type="button" @click="eliminarCrudoItem(itemIndex)"
                            class="btn btn-danger btn-sm eliminar-crudo-item" :disabled="embarqueBloqueado">-</button>
                        <button type="button" @click="toggleSobrante(itemIndex)"
                            class="btn btn-success btn-sm agregar-sobrante" :disabled="embarqueBloqueado">+</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="crudo-footer">
            <button type="button" @click="agregarCrudoItem" class="btn btn-primary btn-sm agregar-crudo-item"
                :disabled="embarqueBloqueado">+ Agregar Talla/Taras</button>
            <button type="button" @click="eliminarCrudo" class="btn btn-danger btn-sm eliminar-crudo"
                :disabled="embarqueBloqueado">Eliminar Crudo</button>
            <div class="total-crudos">Total de taras: {{ calcularTotalCrudos }}</div>
        </div>
    </div>
</template>

<script>
import PedidoReferencia from './PedidoReferencia.vue';
import { obtenerPrecioParaMedida } from '@/utils/preciosHistoricos';
import { normalizarFechaISO, obtenerFechaActualISO } from '@/utils/dateUtils';

export default {
    name: 'CrudoItem',
    components: {
        PedidoReferencia
    },
    props: {
        crudo: {
            type: Object,
            default: () => ({ items: [] })
        },
        embarqueBloqueado: {
            type: Boolean,
            default: false
        },
        clienteId: {
            type: [String, Number],
            required: true
        },
        crudoIndex: {
            type: Number,
            required: true
        },
        preciosActuales: {
            type: Array,
            default: () => []
        },
        fechaEmbarque: {
            type: String,
            default: ''
        },
        nombreCliente: {
            type: String,
            default: ''
        },
        pedidoReferenciaCrudos: {
            type: Object,
            default: null
        }
    },

    emits: [
        'update:crudo',
        'eliminar-crudo',
        'eliminar-crudo-item',
        'agregar-crudo-item',
        'toggle-sobrante',
        'mostrar-modal-precio'
    ],

    data() {
        return {
            crudoData: this.crudo || { items: [] }
        };
    },

    watch: {
        crudo: {
            handler(newVal) {
                this.crudoData = newVal || { items: [] };
                
                // Si es cliente Ozuna, forzar esVenta=true para todos los items
                if (this.isClienteOzuna && this.crudoData.items) {
                    this.crudoData.items.forEach(item => {
                        if (item) {
                            this.$set(item, 'esVenta', true);
                        }
                    });
                }
                // Reintentar asignación de precios cuando cambie el objeto crudo
                this.asignarPrecioAutomaticoCrudo();
            },
            immediate: true
        },
        preciosActuales: {
            handler() {
                this.asignarPrecioAutomaticoCrudo();
            },
            deep: true
        },
        fechaEmbarque(newVal) {
            if (newVal) {
                this.asignarPrecioAutomaticoCrudo();
            }
        }
    },

    computed: {
        calcularTotalCrudos() {
            if (!this.crudoData || !this.crudoData.items || !Array.isArray(this.crudoData.items)) {
                return 0;
            }
            return this.crudoData.items.reduce((total, item) => {
                let taras = this.extraerNumero(item.taras);
                let sobrante = this.extraerNumero(item.sobrante);
                let sobrante2 = this.extraerNumero(item.sobrante2);
                return total + taras + sobrante + sobrante2;
            }, 0);
        },

        // Verificar si el cliente es Ozuna
        isClienteOzuna() {
            return this.clienteId === '4' || this.clienteId === 4 || 
                   (this.$parent && this.$parent.nombreCliente && 
                    this.$parent.nombreCliente.toLowerCase().includes('ozuna'));
        },

        // Suma de taras (+ sobrante) por talla para todos los items del crudo
        totalTarasPorTalla() {
            const mapa = {};
            (this.crudoData.items || []).forEach(item => {
                const talla = (item.talla || item.medida || '').toString().trim();
                if (!talla) return;
                const taras = this.extraerNumero(item.taras);
                const sobrante = this.extraerNumero(item.sobrante);
                const sobrante2 = this.extraerNumero(item.sobrante2);
                mapa[talla] = (mapa[talla] || 0) + taras + sobrante + sobrante2;
            });
            return mapa;
        }
    },

    methods: {
        extraerNumero(valor) {
            if (!valor) return 0;
            const match = valor.toString().match(/^(\d+)/);
            return match ? parseInt(match[1]) : 0;
        },

        actualizarCrudo() {
            this.$emit('update:crudo', this.crudoData);
        },

        abrirModalPrecio(item) {
            this.$emit('mostrar-modal-precio', item);
        },

        onTallaCrudoChange(item) {
            // Sincronizar medida con la talla seleccionada siempre
            item.medida = item.talla;
            // Permitir nueva asignación automática si se cambió la talla
            if (item.precioBorradoManualmente) {
                this.$set(item, 'precioBorradoManualmente', false);
            }
            this.asignarPrecioAutomaticoCrudo(item);
            this.actualizarCrudo();
        },

        agregarCrudoItem() {
            // Agregar nuevo elemento vacío al array
            if (!this.crudoData.items) {
                this.crudoData.items = [];
            }
            
            const nuevoItem = {
                talla: '',
                barco: '',
                taras: '',
                sobrante: '',
                sobrante2: '',
                precio: null,
                mostrarSobrante: false,
                mostrarSobrante2: false,
                esVenta: this.isClienteOzuna, // Auto-establecer esVenta a true para Ozuna
                pedidoReferencia: null
            };
            
            this.crudoData.items.push(nuevoItem);
            
            // Actualizar el componente padre
            this.actualizarCrudo();
        },

        eliminarCrudoItem(itemIndex) {
            // Eliminar el elemento del array
            if (this.crudoData.items && this.crudoData.items.length > itemIndex) {
                this.crudoData.items.splice(itemIndex, 1);
                
                // Actualizar el componente padre
                this.actualizarCrudo();
            }
        },

        eliminarCrudo() {
            this.$emit('eliminar-crudo', this.crudoIndex, this.clienteId);
        },

        toggleSobrante(itemIndex) {
            // Permite hasta 2 sobrantes por item, ciclando 0 -> 1 -> 2 -> 0
            if (!this.crudoData.items || this.crudoData.items.length <= itemIndex) return;

            const item = this.crudoData.items[itemIndex];
            const nivel = (item.mostrarSobrante ? 1 : 0) + (item.mostrarSobrante2 ? 1 : 0);

            if (nivel === 0) {
                this.$set(item, 'mostrarSobrante', true);
            } else if (nivel === 1) {
                this.$set(item, 'mostrarSobrante2', true);
            } else {
                this.$set(item, 'mostrarSobrante', false);
                this.$set(item, 'mostrarSobrante2', false);
                item.sobrante = '';
                item.sobrante2 = '';
            }

            // Actualizar el componente padre
            this.actualizarCrudo();
        },

        asignarPrecioAutomaticoCrudo(itemRef = null) {
            const nombre = (this.nombreCliente || '').trim().toLowerCase();
            const clienteIdMap = { 
                catarro: 'catarro', 
                joselito: 'joselito', 
                otilio: 'otilio', 
                ozuna: 'ozuna',
                veronica: 'veronica',
                lorena: 'veronica'  // Lorena es la misma que Verónica
            };
            const clienteId = clienteIdMap[nombre] || null;
            const fechaParaPrecios = this.fechaEmbarque ? normalizarFechaISO(this.fechaEmbarque) : obtenerFechaActualISO();

            const aplicar = (item) => {
                if (!item) return;
                const medida = item.medida || item.talla || '';
                if (!medida) return;
                if (item.precioBorradoManualmente) return;

                const precio = obtenerPrecioParaMedida(this.preciosActuales, medida, fechaParaPrecios, clienteId);
                if (precio !== null && precio !== undefined) {
                    this.$set(item, 'precio', precio);
                } else if (item.precio !== null && item.precio !== undefined) {
                    // Limpiar precio si no existe para la nueva talla para evitar valores obsoletos
                    this.$set(item, 'precio', null);
                }
            };

            if (itemRef) {
                aplicar(itemRef);
            } else if (this.crudoData && Array.isArray(this.crudoData.items)) {
                this.crudoData.items.forEach(aplicar);
            }
        }
    }
}

</script>


<style scoped>
.producto.crudo {
    flex: 0 0 calc(25% - 6px);
    margin: 0 0 8px 0;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: #f9f9f9;
    position: relative;
}

/* Ajustes responsive */
@media screen and (max-width: 1400px) {
    .producto.crudo {
        flex: 0 0 calc(33.33% - 6px);
        max-width: calc(33.33% - 6px);
    }
}

/* Ajuste específico para Galaxy Z Fold 5 y pantallas similares */
@media screen and (max-width: 900px) {
    .producto.crudo {
        flex: 0 0 calc(50% - 8px) !important;
        max-width: calc(50% - 8px) !important;
    }

    .crudo-header {
        font-size: 1rem;
    }

    .btn-precio {
        width: 20px;
        height: 20px;
        font-size: 12px;
    }

    .talla-select {
        min-width: 90px;
        font-size: 0.9rem;
    }

    .barco-input {
        min-width: 70px;
        font-size: 0.9rem;
    }

    .taras-input {
        padding: 4px;
        font-size: 0.9rem;
    }

    .crudo-items {
        gap: 8px;
    }

    .crudo-item {
        padding: 6px;
    }

    .crudo-talla-container {
        gap: 6px;
    }

    .crudo-taras-container {
        gap: 6px;
    }

    .buttons-wrapper {
        gap: 4px;
    }
}

/* Solo para pantallas muy pequeñas */
@media screen and (max-width: 480px) {
    .producto.crudo {
        flex: 0 0 100% !important;
        max-width: 100% !important;
    }
}

.crudo-header {
    font-size: 1.1rem; /* Reducir tamaño de fuente */
    font-weight: 600;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
    color: #3498db;
}

.crudo-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 12px;
}

.crudo-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    background-color: white;
    border-radius: 4px;
    border: 1px solid #e1e4e8;
}

.crudo-talla-container {
    display: flex;
    align-items: center;
    gap: 10px;
}

.talla-referencia {
    display: flex;
    flex-direction: column;
    flex: 1;
    gap: 4px;
    min-width: 0;
}

.btn-precio {
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

.talla-select {
    flex: 1;
    min-width: 100px;
    padding: 6px;
}

.barco-input {
    flex: 1;
    min-width: 80px;
    padding: 6px;
}

.precio-tag {
    color: #27ae60;
    font-weight: bold;
    padding: 0 10px;
}

.crudo-taras-container {
    display: flex;
    gap: 10px;
}

.taras-wrapper {
    display: flex;
    flex: 1;
    gap: 10px;
}

.taras-input {
    flex: 1;
    padding: 6px;
}

.buttons-wrapper {
    display: flex;
    gap: 5px;
}

.crudo-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
    padding-top: 10px;
    border-top: 1px solid #eee;
}

.total-crudos {
    font-weight: bold;
    margin-left: auto;
}

.agregar-crudo-item {
    margin-right: 10px;
}

.eliminar-crudo-item,
.agregar-sobrante {
    padding: 4px 8px;
}

/* Estilos para estados disabled */
select:disabled,
input:disabled,
button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

/* Estilos para indicadores de venta */
.venta-checkbox-container {
    display: flex;
    align-items: center;
    margin-left: 10px;
    gap: 5px;
}

.venta-checkbox-container label {
    font-size: 13px;
    color: #07711e;
    font-weight: bold;
}

.venta-checkbox {
    cursor: pointer;
    height: 16px;
    width: 16px;
}

/* Estilo para items marcados como venta */
.crudo-item[data-es-venta="true"] {
    border-left: 4px solid #07711e;
    background-color: rgba(7, 113, 30, 0.05);
}

/* Estilo para los crudos de Ozuna */
.crudo-ozuna {
    position: relative;
}

.crudo-ozuna::before {
    content: "VENTA";
    position: absolute;
    top: 5px;
    right: 5px;
    background-color: #07711e;
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
    opacity: 0.7;
}

/* Módulo de producto crudo */
.producto.crudo {
    overflow: hidden;
    padding: 15px;
    color: #172033;
    border: 1px solid rgba(255,255,255,.9);
    border-radius: 18px;
    background: linear-gradient(145deg, rgba(255,255,255,.98), rgba(236,242,250,.96));
    box-shadow: 0 14px 30px rgba(0, 6, 18, .18), inset 0 1px rgba(255,255,255,.9);
    transition: transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s ease, border-color .25s ease;
}

.producto.crudo:hover {
    z-index: 2;
    transform: translateY(-4px);
    border-color: rgba(139,92,246,.46);
    box-shadow: 0 22px 44px rgba(0, 6, 18, .25), 0 0 24px rgba(139,92,246,.1);
}

.crudo-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 12px;
    padding: 0 0 12px;
    color: #152037;
    border-color: #dce4ef;
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -.02em;
}

.crudo-header::before {
    content: '';
    width: 10px;
    height: 10px;
    border: 3px solid #8b5cf6;
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(139,92,246,.45);
}

.crudo-items { gap: 9px; }

.crudo-item {
    gap: 9px;
    padding: 10px;
    border: 1px solid #dde5ef;
    border-radius: 13px;
    background: rgba(237,242,248,.78);
    transition: border-color .2s ease, background .2s ease;
}

.crudo-item:focus-within {
    border-color: rgba(139,92,246,.42);
    background: #f6f3ff;
}

.crudo-talla-container,
.crudo-taras-container { gap: 7px; }

.form-control,
.talla-select,
.barco-input,
.taras-input {
    min-width: 0;
    min-height: 36px;
    padding: 6px 8px;
    color: #172033;
    border: 1px solid #d4deea;
    border-radius: 9px;
    outline: 0;
    background: #fff;
    font-size: .78rem;
    font-weight: 650;
    transition: border-color .18s ease, box-shadow .18s ease;
}

.form-control:focus,
.talla-select:focus,
.barco-input:focus,
.taras-input:focus {
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139,92,246,.11);
}

.talla-select { min-width: 90px; }
.taras-wrapper { gap: 6px; min-width: 0; }

.btn-precio {
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    color: #596981;
    border-color: #d5deea;
    border-radius: 9px;
    background: #fff;
    font-weight: 800;
}

.btn-precio.tiene-precio {
    color: #fff;
    border-color: #0f9f70;
    background: #10b981;
    box-shadow: 0 0 14px rgba(16,185,129,.25);
}

.precio-tag {
    padding: 4px 7px;
    color: #047857;
    border: 1px solid rgba(16,185,129,.18);
    border-radius: 7px;
    background: rgba(16,185,129,.08);
    font-size: .72rem;
}

.buttons-wrapper .btn {
    width: 34px;
    min-height: 34px;
    padding: 4px;
    border: 0;
    border-radius: 9px;
    font-weight: 850;
}

.buttons-wrapper .btn-danger {
    color: #be123c;
    background: #ffe4e9;
}

.buttons-wrapper .btn-success {
    color: #047857;
    background: #d9f8eb;
}

.crudo-footer {
    gap: 7px;
    margin-top: 13px;
    padding-top: 12px;
    border-color: #dce4ef;
}

.crudo-footer .btn {
    min-height: 36px;
    margin: 0;
    padding: 7px 10px;
    border: 0;
    border-radius: 10px;
    font-size: .72rem;
    font-weight: 750;
}

.agregar-crudo-item {
    color: #5b21b6;
    background: #ede8ff;
}

.eliminar-crudo {
    color: #be123c;
    background: #ffe4e9;
}

.total-crudos {
    padding: 10px 12px;
    color: #f5f1ff;
    border: 1px solid rgba(167,139,250,.5);
    border-radius: 10px;
    background: linear-gradient(135deg, #6d3fc0, #472481);
    box-shadow: 0 8px 18px rgba(76,29,149,.22), inset 0 1px rgba(255,255,255,.13), 0 0 16px rgba(139,92,246,.13);
    font-size: .9rem;
    font-weight: 900;
}

.crudo-item[data-es-venta="true"] {
    border-left: 4px solid #10b981;
    background: #effcf7;
}

.crudo-ozuna::before {
    top: 10px;
    right: 11px;
    padding: 4px 7px;
    color: #047857;
    border: 1px solid rgba(16,185,129,.2);
    background: #d9f8eb;
    font-weight: 850;
    letter-spacing: .08em;
    opacity: 1;
}

@media screen and (min-width: 1101px) {
    .producto.crudo {
        flex: 0 0 calc(25% - 10px) !important;
        max-width: calc(25% - 10px) !important;
    }
}

@media screen and (max-width: 1100px) {
    .producto.crudo { flex-basis: calc(50% - 7px); max-width: calc(50% - 7px); }
}

@media screen and (max-width: 620px) {
    .producto.crudo { flex-basis: 100% !important; max-width: 100% !important; }
    .crudo-footer { align-items: stretch; flex-wrap: wrap; }
    .total-crudos { width: 100%; margin: 0; text-align: center; }
}
</style>
