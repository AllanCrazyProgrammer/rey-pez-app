<template>
    <div class="producto crudo">
        <h2 class="crudo-header">Crudos</h2>

        <div class="crudo-items">
            <div v-for="(item, itemIndex) in crudoData.items || []" :key="'item-' + itemIndex" class="crudo-item">
                <div class="crudo-talla-container">
                    <button @click="abrirModalPrecio(item)" class="btn-precio" :class="{ 'tiene-precio': item.precio }"
                        :disabled="embarqueBloqueado">
                        $
                    </button>
                    <select v-model="item.talla" class="form-control talla-select" @change="onTallaCrudoChange(item)"
                        :disabled="embarqueBloqueado">
                        <option value="">Elige talla</option>
                        <option value="Med c/c">Med c/c</option>
                        <option value="Med-Esp c/c">Med-Esp c/c</option>
                        <option value="Med-gde c/c">Med-gde c/c</option>
                        <option value="Gde c/c">Gde c/c</option>
                        <option value="Gde c/ Extra">Gde c/ Extra c/c</option>
                        <option value="Extra c/c">Extra c/c</option>
                        <option value="Jumbo c/c">Jumbo c/c</option>
                        <option value="Linea">Linea</option>
                        <option value="Lag gde c/c">Lag gde c/c</option>
                        <option value="Rechazo">Rechazo</option>
                    </select>
                    <span v-if="item.precio" class="precio-tag">${{ item.precio }}</span>

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

export default {
    name: 'CrudoItem',
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
            },
            immediate: true
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
            // Asegurarse de que el item tenga todas las propiedades necesarias
            if (!item.medida) {
                item.medida = item.talla;
            }
            this.actualizarCrudo();
        },

        agregarCrudoItem() {
            // Agregar nuevo elemento vacío al array
            if (!this.crudoData.items) {
                this.crudoData.items = [];
            }
            
            this.crudoData.items.push({
                talla: '',
                barco: '',
                taras: '',
                sobrante: '',
                precio: null,
                mostrarSobrante: false
            });
            
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
        }
    }
}

</script>


<style scoped>
.producto.crudo {
    flex: 0 0 calc(25% - 6px); /* Exactamente 25% menos el gap */
    margin: 0 0 8px 0;
    padding: 12px;
    background-color: #f8f9fa;
    border-left: 4px solid #3498db;
    border-radius: 5px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    box-sizing: border-box;
}

/* Ajustes responsive */
@media screen and (max-width: 1400px) {
    .producto.crudo {
        flex: 0 0 calc(33.33% - 6px);
        max-width: calc(33.33% - 6px);
    }
}

@media screen and (max-width: 1100px) {
    .producto.crudo {
        flex: 0 0 calc(50% - 4px);
        max-width: calc(50% - 4px);
    }
}

@media screen and (max-width: 768px) {
    .producto.crudo {
        flex: 0 0 100%;
        max-width: 100%;
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
</style>