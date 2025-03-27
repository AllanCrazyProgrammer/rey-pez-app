<template>
    <div class="modal-overlay" v-if="mostrar" @click.self="cerrar">
        <div class="modal-contenido">
            <div class="modal-header">
                <h3>{{ titulo }}</h3>
                <button @click="cerrar" class="btn-cerrar-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <slot></slot>
            </div>
            <div class="modal-footer">
                <button @click="cerrar" class="btn btn-secondary">Cancelar</button>
                <button @click="confirmar" class="btn btn-primary">{{ textoBotonConfirmar }}</button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'BaseModal',
    props: {
        mostrar: {
            type: Boolean,
            required: true
        },
        titulo: {
            type: String,
            default: 'Modal'
        },
        textoBotonConfirmar: {
            type: String,
            default: 'Guardar'
        }
    },
    methods: {
        cerrar() {
            this.$emit('cerrar');
        },
        confirmar() {
            this.$emit('confirmar');
        }
    }
}
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-contenido {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    width: 300px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    position: relative;
    z-index: 1001;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.modal-header h3 {
    margin: 0;
}

.btn-cerrar-modal {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #6c757d;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}

.btn {
    cursor: pointer;
    transition: background-color 0.3s;
    border: none;
    padding: 8px 16px;
    border-radius: 5px;
}

.btn-primary {
    background-color: #007bff;
    color: #fff;
}

.btn-secondary {
    background-color: #6c757d;
    color: #fff;
}
</style>