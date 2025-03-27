<template>
    <BaseModal :mostrar="mostrar" titulo="Establecer Hilos" @cerrar="$emit('cerrar')" @confirmar="guardarHilos">
        <div class="form-group">
            <label for="hilosInput">Hilos:</label>
            <input type="text" id="hilosInput" v-model="hilosLocal" class="form-control" placeholder="Ingrese los hilos"
                @keyup.enter="guardarHilos" ref="hilosInput">
        </div>
    </BaseModal>
</template>

<script>
import BaseModal from '../BaseModal.vue';

export default {
    name: 'HilosModal',
    components: {
        BaseModal
    },
    props: {
        mostrar: {
            type: Boolean,
            required: true
        },
        hilos: {
            type: String,
            default: ''
        }
    },
    data() {
        return {
            hilosLocal: ''
        };
    },
    watch: {
        mostrar(newVal) {
            if (newVal) {
                this.hilosLocal = this.hilos;
                this.$nextTick(() => {
                    this.$refs.hilosInput?.focus();
                });
            }
        },
        hilos(newVal) {
            this.hilosLocal = newVal;
        }
    },
    methods: {
        guardarHilos() {
            // Guardar el valor como string, incluso si está vacío
            this.$emit('guardar', this.hilosLocal.trim());
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