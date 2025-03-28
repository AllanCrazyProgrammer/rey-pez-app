<template>
    <BaseModal :mostrar="mostrar" titulo="Agregar Nuevo Cliente" texto-boton-confirmar="Agregar"
        @cerrar="$emit('cerrar')" @confirmar="agregarCliente">
        <div class="form-group">
            <label for="nombreCliente">Nombre del Cliente:</label>
            <input type="text" id="nombreCliente" v-model="nombreCliente" class="form-control"
                placeholder="Ingrese el nombre del cliente" @keyup.enter="agregarCliente" ref="nombreInput">
        </div>

        <!-- Se puede agregar aquí el selector de color si se necesita -->
    </BaseModal>
</template>

<script>
import BaseModal from '../BaseModal.vue';

export default {
    name: 'NuevoClienteModal',
    components: {
        BaseModal
    },
    props: {
        mostrar: {
            type: Boolean,
            required: true
        }
    },
    data() {
        return {
            nombreCliente: '',
            colorCliente: '#007bff' // Color por defecto
        };
    },
    watch: {
        mostrar(newVal) {
            if (newVal) {
                this.nombreCliente = '';
                this.$nextTick(() => {
                    this.$refs.nombreInput?.focus();
                });
            }
        }
    },
    methods: {
        agregarCliente() {
            if (this.nombreCliente.trim() === '') {
                alert('Por favor, ingrese un nombre para el nuevo cliente.');
                return;
            }

            this.$emit('agregar', {
                nombre: this.nombreCliente,
                color: this.colorCliente
            });

            this.nombreCliente = '';
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
}
</style>