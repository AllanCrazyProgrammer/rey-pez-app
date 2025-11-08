<template>
    <BaseModal :mostrar="mostrar" titulo="Establecer Nota" @cerrar="$emit('cerrar')" @confirmar="guardarNota">
        <div class="form-group">
            <label for="notaInput">Nota:</label>
            <textarea id="notaInput" v-model="notaLocal" class="form-control" placeholder="Ingrese la nota" rows="4"
                ref="notaInput" :disabled="guardando"></textarea>
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
        },
        guardando: {
            type: Boolean,
            default: false
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

.form-control:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
    opacity: 0.7;
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