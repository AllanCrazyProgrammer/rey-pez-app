<template>
    <BaseModal :mostrar="mostrar" titulo="Nombre Alternativo para PDF" @cerrar="$emit('cerrar')"
        @confirmar="guardarAlt">
        <div class="form-group">
            <label for="altInput">Nombre alternativo:</label>
            <input type="text" id="altInput" v-model="altLocal" class="form-control"
                placeholder="Ingrese el nombre alternativo para PDF" 
                @keyup.enter="guardarAlt" 
                @input="onInputUsuario"
                @keydown="onInputUsuario"
                @focus="onInputUsuario"
                ref="altInput"
                :disabled="guardando">
            <small class="form-text text-muted">
                Este nombre solo se mostrará en el PDF de resumen de embarque.
            </small>
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
    name: 'AltModal',
    components: {
        BaseModal
    },
    props: {
        mostrar: {
            type: Boolean,
            required: true
        },
        alt: {
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
            altLocal: '',
            usuarioEditando: false,
            timeoutEdicion: null
        };
    },
    watch: {
        mostrar(newVal) {
            if (newVal) {
                // Resetear estado de edición cuando se abre el modal
                this.usuarioEditando = false;
                if (this.timeoutEdicion) {
                    clearTimeout(this.timeoutEdicion);
                    this.timeoutEdicion = null;
                }
                
                this.altLocal = this.alt;
                this.$nextTick(() => {
                    this.$refs.altInput?.focus();
                });
            } else {
                // Limpiar estado cuando se cierra el modal
                this.usuarioEditando = false;
                if (this.timeoutEdicion) {
                    clearTimeout(this.timeoutEdicion);
                    this.timeoutEdicion = null;
                }
            }
        },
        alt(newVal) {
            // Solo actualizar si el modal está visible y el usuario NO está editando activamente
            if (this.mostrar && !this.usuarioEditando) {
                this.altLocal = newVal;
            }
        }
    },
    methods: {
        guardarAlt() {
            // Limpiar timeout si existe
            if (this.timeoutEdicion) {
                clearTimeout(this.timeoutEdicion);
                this.timeoutEdicion = null;
            }
            // Marcar que el usuario ya no está editando
            this.usuarioEditando = false;
            this.$emit('guardar', this.altLocal.trim());
        },

        onInputUsuario() {
            // Marcar que el usuario está editando activamente
            this.usuarioEditando = true;
            
            // Limpiar timeout anterior si existe
            if (this.timeoutEdicion) {
                clearTimeout(this.timeoutEdicion);
            }
            
            // Establecer un timeout para marcar que el usuario dejó de editar
            // después de 2 segundos de inactividad
            this.timeoutEdicion = setTimeout(() => {
                this.usuarioEditando = false;
                this.timeoutEdicion = null;
            }, 2000);
        }
    },

    beforeDestroy() {
        // Limpiar timeout al destruir el componente
        if (this.timeoutEdicion) {
            clearTimeout(this.timeoutEdicion);
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

.form-control:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
    opacity: 0.7;
}

.form-text.text-muted {
    font-size: 0.85rem;
    color: #6c757d;
    margin-top: 5px;
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