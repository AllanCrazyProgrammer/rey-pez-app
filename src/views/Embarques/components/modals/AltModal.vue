<template>
    <BaseModal :mostrar="mostrar" titulo="Nombre Alternativo para PDF" @cerrar="$emit('cerrar')"
        @confirmar="guardarAlt">
        <div class="form-group">
            <label for="altInput">Nombre alternativo:</label>
            <input type="text" id="altInput" v-model="altLocal" class="form-control"
                placeholder="Ingrese el nombre alternativo para PDF" @keyup.enter="guardarAlt" ref="altInput">
            <small class="form-text text-muted">
                Este nombre solo se mostrará en el PDF de resumen de embarque.
            </small>
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
        }
    },
    data() {
        return {
            altLocal: ''
        };
    },
    watch: {
        mostrar(newVal) {
            if (newVal) {
                this.altLocal = this.alt;
                this.$nextTick(() => {
                    this.$refs.altInput?.focus();
                });
            }
        },
        alt(newVal) {
            this.altLocal = newVal;
        }
    },
    methods: {
        guardarAlt() {
            this.$emit('guardar', this.altLocal.trim());
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