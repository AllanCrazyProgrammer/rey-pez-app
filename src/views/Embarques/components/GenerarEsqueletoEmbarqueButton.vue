<template>
  <button
    class="btn btn-outline-primary btn-esqueleto"
    :disabled="isDisabled || loading"
    @click="handleClick"
    title="Generar el esqueleto del embarque desde los pedidos limpios y crudos"
  >
    <span v-if="loading" class="loader-inline"></span>
    <template v-else>
      <i class="fas fa-layer-group"></i>
      Esqueleto Embarque
    </template>
  </button>
</template>

<script>
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const LIMPIO_CLIENTES_MAP = {
  joselito: '1',
  catarro: '2',
  otilio: '3',
  ozuna: '4',
  lorena: '5'
};

const CRUDO_CLIENTES_MAP = {
  '8a': '1',
  'catarro': '2',
  'otilio': '3',
  'ozuna': '4',
  'veronica': '5'
};

// Mapeo de medidas del pedido de crudos al formato del embarque
const MEDIDAS_CRUDOS_MAP = {
  'chico': 'Chico c/c',
  'med': 'Med c/c',
  'med-esp': 'Med-Esp c/c',
  'med-gde': 'Med-Gde c/c',
  'gde': 'Gde c/c',
  'gde c/ extra': 'Gde c/ Extra c/c',
  'extra': 'Extra c/c',
  'jumbo': 'Jumbo c/c',
  'linea': 'Linea',
  'lag gde': 'Lag gde c/c',
  'acamaya': 'Acamaya',
  'rechazo': 'Rechazo'
};

export default {
  name: 'GenerarEsqueletoEmbarqueButton',
  props: {
    fechaEmbarque: {
      type: String,
      default: ''
    },
    embarqueBloqueado: {
      type: Boolean,
      default: false
    }
  },
  emits: ['esqueleto-generado', 'error'],
  data() {
    return {
      loading: false
    };
  },
  computed: {
    isDisabled() {
      return this.embarqueBloqueado || !this.fechaEmbarque;
    }
  },
  methods: {
    async handleClick() {
      if (this.loading || this.isDisabled) {
        return;
      }

      this.loading = true;
      try {
        const [pedidosLimpios, pedidosCrudos] = await Promise.all([
          this.obtenerPedidosLimpios(),
          this.obtenerPedidosCrudos()
        ]);

        if (pedidosLimpios.length === 0 && pedidosCrudos.length === 0) {
          this.emitirError('No se encontraron pedidos (limpios o crudos) para la fecha seleccionada.');
          return;
        }

        const esqueletoPorCliente = this.construirEsqueletoPorCliente(pedidosLimpios);
        this.agregarCrudosAlEsqueleto(esqueletoPorCliente, pedidosCrudos);
        
        const tieneDatos = Object.values(esqueletoPorCliente).some(listado => listado.length > 0);

        if (!tieneDatos) {
          this.emitirError('Los pedidos no contienen medidas para los clientes predeterminados.');
          return;
        }

        this.$emit('esqueleto-generado', esqueletoPorCliente);
      } catch (error) {
        console.error('[GenerarEsqueletoEmbarqueButton] Error al generar esqueleto:', error);
        this.emitirError('Ocurrió un error al generar el esqueleto del embarque. Intente nuevamente.');
      } finally {
        this.loading = false;
      }
    },
    async obtenerPedidosLimpios() {
      const db = getFirestore();
      const pedidosRef = collection(db, 'pedidos');
      const q = query(pedidosRef, where('fecha', '==', this.fechaEmbarque));
      const snapshot = await getDocs(q);

      return snapshot.docs
        .map(doc => doc.data())
        .filter(pedido => (pedido.tipo || '').toLowerCase() === 'limpio');
    },
    async obtenerPedidosCrudos() {
      const db = getFirestore();
      const pedidosRef = collection(db, 'pedidos');
      const q = query(pedidosRef, where('fecha', '==', this.fechaEmbarque));
      const snapshot = await getDocs(q);

      return snapshot.docs
        .map(doc => doc.data())
        .filter(pedido => (pedido.tipo || '').toLowerCase() === 'crudo');
    },
    construirEsqueletoPorCliente(pedidos) {
      const acumuladoPorCliente = {};

      pedidos.forEach(pedido => {
        Object.entries(LIMPIO_CLIENTES_MAP).forEach(([clavePedido, clienteId]) => {
          const itemsCliente = Array.isArray(pedido[clavePedido]) ? pedido[clavePedido] : [];
          if (itemsCliente.length === 0) {
            return;
          }

          if (!acumuladoPorCliente[clienteId]) {
            acumuladoPorCliente[clienteId] = new Map();
          }

          itemsCliente.forEach(item => {
            if (!item) {
              return;
            }

            const medida = (item.medida || '').toString().trim();
            if (!medida) {
              return;
            }

            const tipoNormalizado = this.normalizarTipo(item.tipo);
            const clave = `${medida}__${tipoNormalizado.tipo || ''}__${tipoNormalizado.tipoPersonalizado || ''}`;

            if (!acumuladoPorCliente[clienteId].has(clave)) {
              acumuladoPorCliente[clienteId].set(clave, {
                medida,
                tipo: tipoNormalizado.tipo,
                tipoPersonalizado: tipoNormalizado.tipoPersonalizado || ''
              });
            }
          });
        });
      });

      const esqueletoPorCliente = {};
      Object.entries(acumuladoPorCliente).forEach(([clienteId, mapa]) => {
        esqueletoPorCliente[clienteId] = Array.from(mapa.values());
      });

      return esqueletoPorCliente;
    },
    agregarCrudosAlEsqueleto(esqueletoPorCliente, pedidosCrudos) {
      pedidosCrudos.forEach(pedido => {
        if (!pedido.pedidos) {
          return;
        }

        // Iterar sobre cada cliente en el pedido de crudos
        Object.entries(pedido.pedidos).forEach(([nombreCliente, medidasCliente]) => {
          // Normalizar el nombre del cliente para buscar en el mapa
          const clienteKey = nombreCliente.toLowerCase();
          const clienteId = CRUDO_CLIENTES_MAP[clienteKey];
          
          if (!clienteId) {
            return; // Cliente no mapeado, ignorar
          }

          // Inicializar el array del cliente si no existe
          if (!esqueletoPorCliente[clienteId]) {
            esqueletoPorCliente[clienteId] = [];
          }

          // Iterar sobre cada medida del cliente
          Object.entries(medidasCliente).forEach(([medida, cantidad]) => {
            // Solo agregar si hay cantidad (ignorar valores vacíos, 0, etc)
            if (!cantidad || parseFloat(cantidad) === 0) {
              return;
            }

            // Normalizar el nombre de la medida usando el mapa
            const medidaLowerCase = medida.toLowerCase().trim();
            const medidaNormalizada = MEDIDAS_CRUDOS_MAP[medidaLowerCase] || medida;
            
            // Crear clave única para crudo: usar "crudo" como tipo
            const claveCrudo = `${medidaNormalizada}__crudo__`;

            // Verificar si ya existe esta medida como crudo
            const yaExiste = esqueletoPorCliente[clienteId].some(item => {
              const claveExistente = `${item.medida}__${item.tipo || ''}__${item.tipoPersonalizado || ''}`;
              return claveExistente === claveCrudo;
            });

            // Solo agregar si no existe
            if (!yaExiste) {
              esqueletoPorCliente[clienteId].push({
                medida: medidaNormalizada,
                tipo: 'crudo',
                tipoPersonalizado: ''
              });
            }
          });
        });
      });
    },
    normalizarTipo(tipo) {
      const tipoTexto = (tipo || '').toString().trim();
      const valor = tipoTexto.toLowerCase();

      if (valor === 's/h20' || valor === 's/h2o') {
        return { tipo: 's/h20' };
      }
      if (valor === 'c/h20' || valor === 'c/h2o') {
        return { tipo: 'c/h20' };
      }
      if (valor === 'crudo') {
        return { tipo: 'crudo' };
      }
      if (!valor) {
        return { tipo: '' };
      }
      return {
        tipo: 'otro',
        tipoPersonalizado: tipoTexto
      };
    },
    emitirError(mensaje) {
      this.$emit('error', mensaje);
      if (this.$toast) {
        this.$toast.error(mensaje, { duration: 4000 });
      } else {
        console.warn(`[GenerarEsqueletoEmbarqueButton] ${mensaje}`);
      }
    }
  }
};
</script>

<style scoped>
.btn-esqueleto {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-esqueleto .loader-inline {
  width: 16px;
  height: 16px;
}
</style>
