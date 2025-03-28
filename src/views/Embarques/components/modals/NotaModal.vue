<template>
    <BaseModal :mostrar="mostrar" titulo="Establecer Nota" @cerrar="$emit('cerrar')" @confirmar="guardarNota">
        <div class="form-group">
            <label for="notaInput">Nota:</label>
            <textarea id="notaInput" v-model="notaLocal" class="form-control" placeholder="Ingrese la nota" rows="4"
                ref="notaInput"></textarea>
        </div>
    </BaseModal>
</template>

<script>
import BaseModal from '../BaseModal.vue';

export default {
    name: 'NotaModal',
    components: {
        BaseModal
    },
    props: {
        mostrar: {
            type: Boolean,
            required: true
        },
        nota: {
            type: String,
            default: ''
        }
    },
    data() {
        return {
            notaLocal: ''
        };
    },
    watch: {
        mostrar(newVal) {
            if (newVal) {
                this.notaLocal = this.nota;
                this.$nextTick(() => {
                    this.$refs.notaInput?.focus();
                });
            }
        },
        nota(newVal) {
            this.notaLocal = newVal;
        }
    },
    methods: {
        guardarNota() {
            this.$emit('guardar', this.notaLocal.trim());
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
    resize: vertical;
    min-height: 80px;
}
</style>