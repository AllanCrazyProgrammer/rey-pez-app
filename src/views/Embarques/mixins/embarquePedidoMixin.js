import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { crearNuevoProducto } from '@/constants.js/embarque';

export const embarquePedidoMixin = {
  data() {
    return {
      pedidoReferenciaPorCliente: {},
      pedidoReferenciaCrudosPorCliente: {},
      pedidoReferenciaFecha: '',
      pedidoReferenciaCargando: false,
    };
  },

  methods: {
    normalizarTexto(texto) {
      return (texto || '').toString().trim().toLowerCase();
    },

    normalizarCantidadPedido(valor) {
      if (valor === null || valor === undefined || valor === '') return 0;
      const limpio = typeof valor === 'string' ? valor.replace(',', '.') : valor;
      const numero = Number(limpio);
      return Number.isNaN(numero) ? 0 : numero;
    },

    normalizarTipoPedido(tipo) {
      const tipoTexto = (tipo || '').toString().trim();
      const valor = tipoTexto.toLowerCase();
      if (valor === 's/h20' || valor === 's/h2o') return { tipo: 's/h20', tipoPersonalizado: '' };
      if (valor === 'c/h20' || valor === 'c/h2o') return { tipo: 'c/h20', tipoPersonalizado: '' };
      if (!valor) return { tipo: '', tipoPersonalizado: '' };
      return { tipo: 'otro', tipoPersonalizado: tipoTexto };
    },

    resolverClienteIdPedido(nombreCliente) {
      const normalizado = this.normalizarTexto(nombreCliente);
      const mapaPredefinidos = {
        joselito: '1', '8a': '1', catarro: '2', otilio: '3',
        ozuna: '4', veronica: '5', lorena: '5',
      };
      if (mapaPredefinidos[normalizado]) return mapaPredefinidos[normalizado];

      const clientePersonalizado = (this.clientesPersonalizados || []).find(
        cliente => this.normalizarTexto(cliente?.nombre) === normalizado
      );
      return clientePersonalizado ? clientePersonalizado.id.toString() : null;
    },

    construirIndicePedidoReferencia(pedidos = []) {
      const referencias = {};
      const clientesLimpios = ['joselito', 'catarro', 'otilio', 'ozuna', 'lorena', 'veronica'];

      const asegurarCliente = (clienteId) => {
        if (!referencias[clienteId]) referencias[clienteId] = { porClave: {}, porMedida: {} };
        return referencias[clienteId];
      };

      const agregarReferencia = (clienteId, medida, tipoData, cantidad, esTara) => {
        const medidaNormalizada = this.normalizarTexto(medida);
        if (!medidaNormalizada || !clienteId) return;

        const tipoNormalizado = this.normalizarTexto(tipoData?.tipo);
        const tipoPersonalizado = this.normalizarTexto(tipoData?.tipoPersonalizado);
        const clave = `${medidaNormalizada}__${tipoNormalizado}__${tipoPersonalizado}`;

        const referenciaCliente = asegurarCliente(clienteId);
        const referenciaClave = referenciaCliente.porClave[clave] || { kilos: 0, taras: 0 };
        const referenciaMedida = referenciaCliente.porMedida[medidaNormalizada] || { kilos: 0, taras: 0 };

        if (esTara) {
          referenciaClave.taras += cantidad;
          referenciaMedida.taras += cantidad;
        } else {
          referenciaClave.kilos += cantidad;
          referenciaMedida.kilos += cantidad;
        }

        referenciaCliente.porClave[clave] = referenciaClave;
        referenciaCliente.porMedida[medidaNormalizada] = referenciaMedida;
      };

      pedidos
        .filter(pedido => this.normalizarTexto(pedido?.tipo) === 'limpio')
        .forEach(pedido => {
          clientesLimpios.forEach(claveCliente => {
            const itemsCliente = Array.isArray(pedido?.[claveCliente]) ? pedido[claveCliente] : [];
            if (!itemsCliente.length) return;

            const clienteId = this.resolverClienteIdPedido(claveCliente);
            if (!clienteId) return;

            itemsCliente.forEach(item => {
              if (!item) return;
              const medida = (item.medida || '').toString().trim();
              if (!medida) return;
              const cantidad = this.normalizarCantidadPedido(item.kilos);
              if (cantidad <= 0) return;
              agregarReferencia(clienteId, medida, this.normalizarTipoPedido(item.tipo), cantidad, item.esTara);
            });
          });

          if (pedido?.clientesTemporales && typeof pedido.clientesTemporales === 'object') {
            Object.values(pedido.clientesTemporales).forEach(cliente => {
              if (!cliente || !cliente.nombre || !Array.isArray(cliente.pedidos)) return;
              const clienteId = this.resolverClienteIdPedido(cliente.nombre);
              if (!clienteId) return;
              cliente.pedidos.forEach(item => {
                if (!item) return;
                const medida = (item.medida || '').toString().trim();
                if (!medida) return;
                const cantidad = this.normalizarCantidadPedido(item.kilos);
                if (cantidad <= 0) return;
                agregarReferencia(clienteId, medida, this.normalizarTipoPedido(item.tipo), cantidad, item.esTara);
              });
            });
          }
        });

      return referencias;
    },

    construirIndicePedidoReferenciaCrudos(pedidos = []) {
      const crudoClientesMap = {
        '8a': '1', joselito: '1', catarro: '2', otilio: '3',
        ozuna: '4', veronica: '5', lorena: '5',
      };
      const medidasCrudosMap = {
        chico: 'Chico c/c', med: 'Med c/c', 'med-esp': 'Med-Esp c/c',
        'med-gde': 'Med-Gde c/c', gde: 'Gde c/c', 'gde c/ extra': 'Gde c/ Extra c/c',
        extra: 'Extra c/c', jumbo: 'Jumbo c/c', linea: 'Linea',
        'lag gde': 'Lag gde c/c', acamaya: 'Acamaya', rechazo: 'Rechazo', 'cam s/c': 'Cam s/c',
      };

      const referencias = {};

      pedidos
        .filter(pedido => this.normalizarTexto(pedido?.tipo) === 'crudo')
        .forEach(pedido => {
          if (!pedido.pedidos || typeof pedido.pedidos !== 'object') return;
          Object.entries(pedido.pedidos).forEach(([nombreCliente, medidasCliente]) => {
            const clienteKey = this.normalizarTexto(nombreCliente);
            const clienteId = crudoClientesMap[clienteKey];
            if (!clienteId || !medidasCliente || typeof medidasCliente !== 'object') return;
            if (!referencias[clienteId]) referencias[clienteId] = {};
            Object.entries(medidasCliente).forEach(([medida, cantidad]) => {
              const cantidadNum = this.normalizarCantidadPedido(cantidad);
              if (cantidadNum <= 0) return;
              const medidaKey = medida.toString().trim().toLowerCase();
              const tallaNormalizada = medidasCrudosMap[medidaKey] || medida.toString().trim();
              if (!referencias[clienteId][tallaNormalizada]) {
                referencias[clienteId][tallaNormalizada] = { taras: 0 };
              }
              referencias[clienteId][tallaNormalizada].taras += cantidadNum;
            });
          });
        });

      return referencias;
    },

    async cargarPedidoReferenciaDelDia(fecha = this.embarque.fecha) {
      const fechaConsulta = (fecha || '').toString().trim();
      if (!fechaConsulta || !navigator.onLine) {
        this.pedidoReferenciaPorCliente = {};
        this.pedidoReferenciaCrudosPorCliente = {};
        this.pedidoReferenciaFecha = fechaConsulta;
        return;
      }
      if (this.pedidoReferenciaCargando) return;
      if (this.pedidoReferenciaFecha === fechaConsulta && Object.keys(this.pedidoReferenciaPorCliente).length > 0) return;

      this.pedidoReferenciaCargando = true;
      try {
        const db = getFirestore();
        const q = query(collection(db, 'pedidos'), where('fecha', '==', fechaConsulta));
        const snapshot = await getDocs(q);
        const pedidos = snapshot.docs.map(d => d.data());
        this.pedidoReferenciaPorCliente = this.construirIndicePedidoReferencia(pedidos);
        this.pedidoReferenciaCrudosPorCliente = this.construirIndicePedidoReferenciaCrudos(pedidos);
        this.pedidoReferenciaFecha = fechaConsulta;
      } catch (error) {
        console.error('[NuevoEmbarque] Error al cargar pedidos para referencia:', error);
        this.pedidoReferenciaPorCliente = {};
        this.pedidoReferenciaCrudosPorCliente = {};
      } finally {
        this.pedidoReferenciaCargando = false;
      }
    },

    productoTieneContenido(producto) {
      if (!producto) return false;
      const tieneMedida = producto.medida && producto.medida.toString().trim() !== '';
      const tieneKilos = Array.isArray(producto.kilos) && producto.kilos.some(k => Number(k) > 0);
      const tieneTaras = Array.isArray(producto.taras) && producto.taras.some(t => Number(t) > 0);
      const tieneTarasExtra = Array.isArray(producto.tarasExtra) && producto.tarasExtra.some(t => Number(t) > 0);
      const tieneReportes =
        (Array.isArray(producto.reporteTaras) && producto.reporteTaras.some(t => Number(t) > 0)) ||
        (Array.isArray(producto.reporteBolsas) && producto.reporteBolsas.some(b => Number(b) > 0));
      return tieneMedida || tieneKilos || tieneTaras || tieneTarasExtra || tieneReportes;
    },

    limpiarProductosSinMedida() {
      if (!Array.isArray(this.embarque.productos) || this.embarque.productos.length === 0) return;
      const removibles = this.embarque.productos.filter(producto => {
        const medida = (producto?.medida || '').toString().trim();
        return !medida && !this.productoTieneContenido(producto);
      });
      if (!removibles.length) return;
      if (!this.productosEliminadosLocalmente) this.productosEliminadosLocalmente = new Set();
      removibles.forEach(producto => {
        if (producto?.id !== undefined && producto?.id !== null) {
          this.productosEliminadosLocalmente.add(producto.id);
        }
      });
      this.embarque.productos = this.embarque.productos.filter(p => !removibles.includes(p));
    },

    aplicarEsqueletoDesdePedido(esqueletoPorCliente) {
      if (!esqueletoPorCliente || typeof esqueletoPorCliente !== 'object') {
        console.warn('[aplicarEsqueletoDesdePedido] Datos de esqueleto inválidos:', esqueletoPorCliente);
        return;
      }

      const clientesIds = Object.keys(esqueletoPorCliente).filter(
        clienteId => Array.isArray(esqueletoPorCliente[clienteId])
      );

      if (!clientesIds.length) {
        this.mostrarMensaje('No se encontraron medidas en los pedidos para generar el esqueleto.');
        return;
      }

      const clientesConDefiniciones = clientesIds.filter(
        clienteId => esqueletoPorCliente[clienteId].length > 0
      );

      if (!clientesConDefiniciones.length) {
        this.mostrarMensaje('Los pedidos no tienen medidas registradas para los clientes predeterminados.');
        return;
      }

      this.limpiarProductosSinMedida();
      if (!this.productosNuevosPendientes) this.productosNuevosPendientes = new Map();

      const nuevosProductos = [];
      const nuevosCrudosPorCliente = {};

      const construirClaveProducto = (entrada = {}) => {
        const medida = (entrada.medida || '').toString().trim().toLowerCase();
        const tipo = (entrada.tipo || '').toString().trim().toLowerCase();
        const tipoPersonalizado = (entrada.tipoPersonalizado || '').toString().trim().toLowerCase();
        const nota = (entrada.nota || '').toString().trim().toLowerCase();
        const esOzuna = (entrada.clienteId || '').toString() === '4';
        const ventaKey = esOzuna && typeof entrada.esVenta === 'boolean'
          ? (entrada.esVenta ? 'venta' : 'maquila') : '';
        if (!medida) return '';
        return `${medida}__${tipo}__${tipoPersonalizado}__${ventaKey}__${nota}`;
      };

      const construirClaveCrudo = (entrada = {}) => {
        return (entrada.medida || entrada.talla || '').toString().trim().toLowerCase() || '';
      };

      clientesConDefiniciones.forEach(clienteId => {
        const definiciones = esqueletoPorCliente[clienteId] || [];
        const nombreCliente = this.obtenerNombreCliente(clienteId);
        const clienteIdStr = clienteId.toString();

        const productosExistentes = (this.embarque.productos || []).filter(
          p => p.clienteId?.toString() === clienteIdStr
        );
        const clavesProductos = new Set(productosExistentes.map(construirClaveProducto).filter(Boolean));

        const crudosCliente = this.clienteCrudos[clienteIdStr] || [];
        const clavesCrudos = new Set(
          crudosCliente.flatMap(crudo => (crudo.items || []).map(construirClaveCrudo).filter(Boolean))
        );

        definiciones.forEach(definicion => {
          if (definicion.tipo === 'crudo') {
            const claveCrudo = construirClaveCrudo(definicion);
            if (!claveCrudo || clavesCrudos.has(claveCrudo)) return;
            clavesCrudos.add(claveCrudo);
            if (!nuevosCrudosPorCliente[clienteIdStr]) nuevosCrudosPorCliente[clienteIdStr] = [];
            nuevosCrudosPorCliente[clienteIdStr].push({
              talla: definicion.medida || '',
              medida: definicion.medida || '',
              barco: '', taras: null, sobrante: null, mostrarSobrante: false, precio: null,
              pedidoReferencia: definicion.pedidoReferencia
                ? { taras: definicion.pedidoReferencia.taras || 0 } : null,
            });
          } else {
            const claveProducto = construirClaveProducto(definicion);
            if (!claveProducto || clavesProductos.has(claveProducto)) return;
            clavesProductos.add(claveProducto);

            const nuevoProducto = crearNuevoProducto(clienteIdStr);
            nuevoProducto.nombreCliente = nombreCliente;
            nuevoProducto.medida = (definicion.medida || '').toString().trim();

            if (definicion.pedidoReferencia) {
              nuevoProducto.pedidoReferencia = {
                kilos: definicion.pedidoReferencia.kilos || 0,
                taras: definicion.pedidoReferencia.taras || 0,
              };
            }
            if (definicion.tipo === 'c/h20' || definicion.tipo === 's/h20') {
              nuevoProducto.tipo = definicion.tipo;
            } else if (definicion.tipo === 'otro') {
              nuevoProducto.tipo = 'otro';
              nuevoProducto.tipoPersonalizado = (definicion.tipoPersonalizado || '').toString();
            } else if (definicion.tipo) {
              nuevoProducto.tipo = definicion.tipo;
            } else {
              this.setTipoDefaultParaCliente(nuevoProducto);
            }
            if (definicion.nota) nuevoProducto.nota = definicion.nota;
            if (definicion.tipo === 'c/h20' && definicion.camaronNeto) {
              nuevoProducto.camaronNeto = definicion.camaronNeto;
            }
            if (typeof definicion.esVenta === 'boolean') nuevoProducto.esVenta = definicion.esVenta;

            this.productosNuevosPendientes.set(nuevoProducto.id, { ...nuevoProducto });
            nuevosProductos.push(nuevoProducto);
          }
        });
      });

      const totalCrudosNuevos = Object.values(nuevosCrudosPorCliente).reduce(
        (sum, arr) => sum + arr.reduce((s, c) => s + (c ? 1 : 0), 0), 0
      );

      if (!nuevosProductos.length && !totalCrudosNuevos) {
        this.mostrarMensaje('No se agregaron medidas nuevas porque ya estaban registradas.');
        return;
      }

      if (nuevosProductos.length) this.embarque.productos.push(...nuevosProductos);

      Object.entries(nuevosCrudosPorCliente).forEach(([clienteId, crudos]) => {
        if (!this.clienteCrudos[clienteId]) this.$set(this.clienteCrudos, clienteId, []);
        if (!this.clienteCrudos[clienteId].length) this.clienteCrudos[clienteId].push({ items: [] });
        if (!Array.isArray(this.clienteCrudos[clienteId][0].items)) {
          this.$set(this.clienteCrudos[clienteId][0], 'items', []);
        }
        this.clienteCrudos[clienteId][0].items.push(...crudos);
        this.$set(this.clientesModificados, clienteId, true);
      });

      nuevosProductos.forEach(producto => {
        const clienteId = producto.clienteId?.toString();
        if (clienteId) this.$set(this.clientesModificados, clienteId, true);
      });

      if (!this.guardadoAutomaticoActivo && this.embarqueId) this.guardadoAutomaticoActivo = true;

      this.actualizarMedidasUsadas();
      this.$forceUpdate();
      if (this.embarqueId) this.guardarCambiosEnTiempoReal();

      const mensaje = [];
      if (nuevosProductos.length) mensaje.push(`${nuevosProductos.length} producto(s) limpio(s)`);
      if (totalCrudosNuevos) mensaje.push(`${totalCrudosNuevos} medida(s) de crudo(s)`);
      this.mostrarMensaje(`Esqueleto generado: ${mensaje.join(' y ')}.`);

      if (clientesConDefiniciones.length) this.clienteActivo = clientesConDefiniciones[0];
    },
  },
};
