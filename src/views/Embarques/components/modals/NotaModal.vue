<template>
    <BaseModal
        :mostrar="mostrar"
        titulo="Establecer Nota"
        :textoBotonConfirmar="guardando ? 'Guardando...' : 'Guardar'"
        :deshabilitarConfirmar="guardando || !notaValida"
        @cerrar="$emit('cerrar')"
        @confirmar="guardarNota"
    >
        <div class="form-group">
            <label for="notaInput">Nota:</label>
            <textarea
                id="notaInput"
                v-model="notaLocal"
                class="form-control"
                placeholder="Ingrese la nota"
                rows="5"
                maxlength="500"
                ref="notaInput"
                :disabled="guardando"
            ></textarea>
            <div class="nota-meta">
                <small class="hint">Máximo 500 caracteres</small>
                <small :class="{ 'cerca-limite': caracteresRestantes <= 40 }">
                    Restantes: {{ caracteresRestantes }}
                </small>
            </div>
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
    computed: {
        notaValida() {
            return this.notaLocal.trim().length > 0;
        },
        caracteresRestantes() {
            return 500 - this.notaLocal.length;
        }
    },
    methods: {
        guardarNota() {
            if (!this.notaValida || this.guardando) {
                return;
            }
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
    color: #3ef8ff;
    text-shadow: 0 0 8px rgba(62, 248, 255, 0.45);
}

.form-control {
    width: 100%;
    padding: 10px;
    font-size: 1rem;
    border-radius: 5px;
    border: 1px solid rgba(62, 248, 255, 0.38);
    background: rgba(10, 14, 38, 0.88);
    color: #f7eeff;
    resize: vertical;
    min-height: 80px;
}

.nota-meta {
    margin-top: 6px;
    display: flex;
    justify-content: space-between;
    gap: 10px;
    color: rgba(245, 236, 255, 0.78);
}

.hint {
    opacity: 0.85;
}

.cerca-limite {
    color: #ff6f91;
    font-weight: 600;
}

.form-control:disabled {
    background-color: rgba(46, 52, 82, 0.75);
    cursor: not-allowed;
    opacity: 0.7;
}

.guardando-indicador {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    padding: 10px;
    background: linear-gradient(135deg, rgba(255, 95, 217, 0.2), rgba(62, 248, 255, 0.17));
    border: 1px solid rgba(62, 248, 255, 0.32);
    border-radius: 5px;
    color: #3ef8ff;
    font-weight: 500;
}

@media (max-width: 768px) {
    .form-control {
        font-size: 0.95rem;
    }
}

.spinner {
    border: 3px solid rgba(248, 241, 255, 0.32);
    border-top: 3px solid #ff5fd9;
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