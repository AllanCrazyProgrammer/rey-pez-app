<template>
    <BaseModal :mostrar="mostrar" titulo="Establecer Precio" @cerrar="$emit('cerrar')" @confirmar="guardarPrecio">
        <div class="form-group">
            <label for="precioInput">Precio:</label>
            <input type="number" id="precioInput" v-model="precioLocal" class="form-control"
                placeholder="Ingrese el precio" @keyup.enter="guardarPrecio" ref="precioInput">
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

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

input[type="number"] {
    -moz-appearance: textfield;
    appearance: textfield;
}
</style>