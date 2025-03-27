<template>
    <BaseModal :mostrar="mostrar" titulo="Nombre para PDF" @cerrar="$emit('cerrar')" @confirmar="guardarNombre">
        <div class="form-group">
            <label for="nombreAlternativoPDF">Nombre que aparecerá en el PDF:</label>
            <input type="text" id="nombreAlternativoPDF" v-model="nombreLocal" class="form-control"
                placeholder="Ingrese el nombre para el PDF" @keyup.enter="guardarNombre" ref="nombreInput">
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
            nombreLocal: ''
        };
    },
    watch: {
        mostrar(newVal) {
            if (newVal) {
                // Usar el nombre alternativo si existe, o el nombre original como valor inicial
                this.nombreLocal = this.nombreAlternativo || this.nombreOriginal;
                this.$nextTick(() => {
                    this.$refs.nombreInput?.focus();
                });
            }
        },
        nombreAlternativo(newVal) {
            if (this.mostrar) {
                this.nombreLocal = newVal || this.nombreOriginal;
            }
        }
    },
    methods: {
        guardarNombre() {
            this.$emit('guardar', this.nombreLocal.trim());
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