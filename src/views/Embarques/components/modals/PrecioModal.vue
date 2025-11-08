<template>
    <BaseModal :mostrar="mostrar" titulo="Establecer Precio" @cerrar="$emit('cerrar')" @confirmar="guardarPrecio">
        <div class="form-group">
            <label for="precioInput">Precio:</label>
            <input type="number" id="precioInput" v-model="precioLocal" class="form-control"
                placeholder="Ingrese el precio" @keyup.enter="guardarPrecio" ref="precioInput" :disabled="guardando">
            <div v-if="guardando" class="guardando-indicador">
                <div class="spinner"></div>
                <span>Guardando...</span>
            </div>
        </div>
    </BaseModal>
</template>

<script>
import BaseModal from '../BaseModal.vue';

export default {
    name: 'PrecioModal',
    components: {
        BaseModal
    },
    props: {
        mostrar: {
            type: Boolean,
            required: true
        },
        precio: {
            type: [Number, String],
            default: ''
        },
        guardando: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            precioLocal: ''
        };
    },
    watch: {
        mostrar(newVal) {
            if (newVal) {
                this.precioLocal = this.precio;
                this.$nextTick(() => {
                    this.$refs.precioInput?.focus();
                });
            }
        },
        precio(newVal) {
            this.precioLocal = newVal;
        }
    },
    methods: {
        guardarPrecio() {
            const precio = parseFloat(this.precioLocal);
            if (!isNaN(precio)) {
                this.$emit('guardar', precio);
            } else if (this.precioLocal === '') {
                // Si está vacío, permitir borrar el precio
                this.$emit('guardar', null);
            }
        }
    }
}
</script>

<style scoped>
.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
}

.form-control {
    width: 100%;
    padding: 10px;
    font-size: 1rem;
    border-radius: 5px;
    border: 1px solid #ccc;
    text-align: right;
}

.form-control:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
    opacity: 0.7;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
}

.guardando-indicador {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    padding: 10px;
    background-color: #e3f2fd;
    border-radius: 5px;
    color: #1976d2;
    font-weight: 500;
}

.spinner {
    border: 3px solid #f3f3f3;
    border-top: 3px solid #1976d2;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>