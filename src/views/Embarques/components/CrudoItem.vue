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
                        <PedidoReferencia :pedido-referencia="item.pedidoReferencia" />
                        <select v-model="item.talla" class="form-control talla-select" @change="onTallaCrudoChange(item)"
                            :disabled="embarqueBloqueado">
                            <option value="">Elige talla</option>
                            <option value="Chico c/c">Chico c/c</option>
                            <option value="Med c/c">Med c/c</option>
                            <option value="Med-Esp c/c">Med-Esp c/c</option>
                            <option value="Med-Gde c/c">Med-Gde c/c</option>
                            <option value="Gde c/c">Gde c/c</option>
                            <option value="Gde c/ Extra">Gde c/ Extra c/c</option>
                            <option value="Extra c/c">Extra c/c</option>
                            <option value="Jumbo c/c">Jumbo c/c</option>
                            <option value="Linea">Linea</option>
                            <option value="Lag gde c/c">Lag gde c/c</option>
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
                return total + taras + sobrante;
            }, 0);
        },

        // Verificar si el cliente es Ozuna
        isClienteOzuna() {
            return this.clienteId === '4' || this.clienteId === 4 || 
                   (this.$parent && this.$parent.nombreCliente && 
                    this.$parent.nombreCliente.toLowerCase().includes('ozuna'));
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
                precio: null,
                mostrarSobrante: false,
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
            // Cambiar el estado de mostrarSobrante directamente
            if (this.crudoData.items && this.crudoData.items.length > itemIndex) {
                this.crudoData.items[itemIndex].mostrarSobrante = !this.crudoData.items[itemIndex].mostrarSobrante;
                
                // Si se oculta el sobrante, limpiar su valor
                if (!this.crudoData.items[itemIndex].mostrarSobrante) {
                    this.crudoData.items[itemIndex].sobrante = '';
                }
                
                // Actualizar el componente padre
                this.actualizarCrudo();
            }
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
</style>