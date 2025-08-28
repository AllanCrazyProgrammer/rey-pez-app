<template>
    <BaseModal :mostrar="mostrar" titulo="Nombre para PDF" @cerrar="$emit('cerrar')" @confirmar="guardarNombre">
        <div class="form-group">
            <label for="nombreAlternativoPDF">Nombre que aparecerá en el PDF:</label>
            <input type="text" id="nombreAlternativoPDF" v-model="nombreLocal" class="form-control"
                placeholder="Ingrese el nombre para el PDF" 
                @keyup.enter="guardarNombre" 
                @input="onInputUsuario"
                @keydown="onInputUsuario"
                @focus="onInputUsuario"
                ref="nombreInput">
            <small class="form-text text-muted">
                Este nombre solo se mostrará en el PDF generado. El nombre original se mantendrá en la aplicación.
            </small>
        </div>
    </BaseModal>
</template>

<script>
import BaseModal from '../BaseModal.vue';

export default {
    name: 'NombreAlternativoModal',
    components: {
        BaseModal
    },
    props: {
        mostrar: {
            type: Boolean,
            required: true
        },
        nombreOriginal: {
            type: String,
            default: ''
        },
        nombreAlternativo: {
            type: String,
            default: ''
        }
    },
    data() {
        return {
            nombreLocal: '',
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
                
                // Usar el nombre alternativo si existe, o el nombre original como valor inicial
                this.nombreLocal = this.nombreAlternativo || this.nombreOriginal;
                this.$nextTick(() => {
                    if (this.$refs.nombreInput) {
                        this.$refs.nombreInput.focus();
                        this.$refs.nombreInput.select();
                    }
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
        nombreAlternativo(newVal) {
            // Solo actualizar si el modal está visible y el usuario NO está editando activamente
            if (this.mostrar && !this.usuarioEditando) {
                this.nombreLocal = newVal || this.nombreOriginal;
            }
        }
    },
    methods: {
        guardarNombre() {
            // Limpiar timeout si existe
            if (this.timeoutEdicion) {
                clearTimeout(this.timeoutEdicion);
                this.timeoutEdicion = null;
            }
            // Marcar que el usuario ya no está editando
            this.usuarioEditando = false;
            this.$emit('guardar', this.nombreLocal.trim());
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

.form-text.text-muted {
    font-size: 0.85rem;
    color: #6c757d;
    margin-top: 5px;
}
</style>