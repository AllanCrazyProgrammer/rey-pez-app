import Vue from 'vue';
import Router from 'vue-router';
import { useAuthStore } from './stores/auth';
const Home = () => import('./views/Home.vue');
const NoteMenu = () => import('./views/NoteMenu.vue');
const SaleNote = () => import('@/views/SaleNote.vue');
const AddClient = () => import('@/components/AddClient.vue');
const Sacadas = () => import('@/views/Sacadas.vue');
const SacadasMenu = () => import('@/views/SacadasMenu.vue');
const GestionarProductos = () => import('@/components/GestionarProductos.vue');
const GestionarMedidas = () => import('@/components/GestionarMedidas.vue');
const GestionarProveedores = () => import('@/components/GestionarProveedores.vue');
const Existencias = () => import('@/components/Existencias.vue');
const AnalisisStock = () => import('@/views/AnalisisStock.vue');
const AsesorExperto = () => import('@/views/AsesorExperto.vue');
const CuentasMexico = () => import('@/views/CuentasMexico.vue');
const OzunaCuentasMenu = () => import('@/views/CuentasClientes/OzunaCuentasMenu.vue');
const CuentasOzuna = () => import('@/views/CuentasClientes/CuentasOzuna.vue');
const CatarroCuentasMenu = () => import('@/views/CuentasClientes/CatarroCuentasMenu.vue');
const JoselitoCuentasMenu = () => import('@/views/CuentasClientes/JoselitoCuentasMenu.vue');
const EmbarquesMenu = () => import('@/views/Embarques/EmbarquesMenu.vue');
const VentasYGananciasCatarro = () => import('@/views/CuentasClientes/VentasYGananciasCatarro.vue');
const VentasYGananciasJoselito = () => import('@/views/CuentasClientes/VentasYGananciasJoselito.vue');
const VeronicaCuentasMenu = () => import('@/views/CuentasClientes/VeronicaCuentasMenu.vue');
const VentasYGananciasVeronica = () => import('@/views/CuentasClientes/VentasYGananciasVeronica.vue');
const ListaEmbarques = () => import('@/views/Embarques/ListaEmbarques.vue');
const NuevoEmbarque = () => import('@/views/Embarques/NuevoEmbarque.vue');
const Rendimientos = () => import('@/views/Embarques/Rendimientos.vue');
const RecuperacionEmergencia = () => import('@/views/Embarques/RecuperacionEmergencia.vue');
const GestionCostos = () => import('@/components/GestionCostos.vue');
import Login from './views/Login.vue';
const OtilioCuentasMenu = () => import('@/views/CuentasClientes/OtilioCuentasMenu.vue');
const OtilioIndependienteCuentasMenu = () => import('@/views/CuentasClientes/OtilioIndependienteCuentasMenu.vue');
const CuentaCliente = () => import('@/views/CuentasClientes/CuentaCliente.vue');
const CuentasAllanCamaron = () => import('@/views/CuentasClientes/CuentasAllanCamaron.vue');
const ProcesosMenu = () => import('@/views/Procesos/ProcesosMenu.vue');
const Preparacion = () => import('@/views/Procesos/Preparacion.vue');
const PedidosMenu = () => import('@/views/Procesos/PedidosMenu.vue');
const Pedidos = () => import('@/views/Procesos/Pedidos.vue');
const PedidosCrudo = () => import('@/views/Procesos/PedidosCrudo.vue');
const PedidoCrudosImpresion = () => import('@/views/Procesos/PedidoCrudosImpresion.vue');
const PedidosLimpio = () => import('@/views/Procesos/PedidosLimpio.vue');
const PedidoLimpioImpresion = () => import('@/views/Procesos/PedidoLimpioImpresion.vue');
const Bitacoras = () => import('@/views/Procesos/Bitacoras.vue');
const DeudasMenu = () => import('@/views/Procesos/DeudasMenu.vue');
const NuevaDeuda = () => import('@/views/Procesos/NuevaDeuda.vue');
const ListaDeudas = () => import('@/views/Procesos/ListaDeudas.vue');
const PrestamosMenu = () => import('@/views/Procesos/PrestamosMenu.vue');
const PrestamosDespicadoras = () => import('@/views/Procesos/PrestamosDespicadoras.vue');
const PrestamosTrabajadores = () => import('@/views/Procesos/PrestamosTrabajadores.vue');
const Taras = () => import('@/views/Procesos/Taras.vue');
const Alan = () => import('@/views/Procesos/Alan.vue');
const Marie = () => import('@/views/Procesos/Marie.vue');
const ExistenciasCrudos = () => import('@/views/ExistenciasCrudos.vue');
const RegistroCrudos = () => import('@/views/RegistroCrudos.vue');
const BarcosMenu = () => import('@/views/Barcos/BarcosMenu.vue');
const NuevaDeudaBarco = () => import('@/views/Barcos/NuevaDeudaBarco.vue');
const ListaDeudasBarcos = () => import('@/views/Barcos/ListaDeudasBarcos.vue');
const ResumenMensualBarcos = () => import('@/views/Barcos/ResumenMensualBarcos.vue');
const GestionTripulantes = () => import('@/views/Barcos/GestionTripulantes.vue');
const EntradaProductoBarco = () => import('@/views/Barcos/EntradaProductoBarco.vue');
const Journal = () => import('@/views/Procesos/Journal.vue');

Vue.use(Router);

const routes = [
  {
    path: '/pesadas',
    name: 'PesadasHistorial',
    component: () => import('@/views/Pesadas/PesadasHistorial.vue')
  },
  {
    path: '/pesadas/:fecha',
    name: 'PesadasDia',
    component: () => import('@/views/Pesadas/PesadasDia.vue'),
    props: true
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/noteMenu',
    name: 'NoteMenu',
    component: NoteMenu,
  },
  {
    path: '/',
    name: 'home',
    component: Home,
    meta: { public: true },
  },
  {
    path: '/sale-note/:noteId?',
    name: 'SaleNote',
    component: () => import('@/views/SaleNote.vue')
  },
  {
    path: '/add-client',
    name: 'AddClient',
    component: AddClient, // Asegúrate de que AddClient esté importado correctamente
  },
  {
    path: "/editar-nota/:noteId",
    name: "editar-nota",
    component: SaleNote,
    props: true
  },
  {
    path: '/sacadas',
    name: 'SacadasMenu',
    component: SacadasMenu
  },
  {
    path: '/sacadas/new',
    name: 'NuevaSacada',
    component: Sacadas
  },
  {
    path: '/sacadas/:id',
    name: 'DetalleSacada',
    component: Sacadas,
    props: true
  },
  {
    path: '/gestionar-productos',
    name: 'GestionarProductos',
    component: GestionarProductos
  },
  {
    path: '/gestionar-medidas',
    name: 'GestionarMedidas',
    component: GestionarMedidas
  },
  {
    path: '/gestionar-proveedores',
    name: 'GestionarProveedores',
    component: GestionarProveedores
  },
  {
    path: '/existencias',
    name: 'Existencias',
    component: Existencias
  },
  {
    path: '/analisis-stock',
    name: 'AnalisisStock',
    component: AnalisisStock
  },
  {
    path: '/reporte-consumo',
    name: 'ReporteConsumoMedidas',
    component: () => import('@/views/ReporteConsumoMedidas.vue')
  },
  {
    path: '/asesor-experto',
    name: 'AsesorExperto',
    component: AsesorExperto
  },
  {
    path: '/existencias-crudos',
    name: 'ExistenciasCrudos',
    component: ExistenciasCrudos
  },
  {
    path: '/existencias-crudos/new',
    name: 'NuevoRegistroCrudos',
    component: RegistroCrudos
  },
  {
    path: '/existencias-crudos/:id',
    name: 'EditarRegistroCrudos',
    component: RegistroCrudos,
    props: true
  },
  {
    path: '/cuentas-mexico',
    name: 'CuentasMexico',
    component: CuentasMexico
  },
  {
    path: '/cuentas-allan',
    name: 'CuentasAllanCamaron',
    component: CuentasAllanCamaron
  },
  {
    path: '/cuentas-ozuna',
    name: 'ozuna-cuentas-menu',
    component: OzunaCuentasMenu
  },
  {
    path: '/cuentas-ozuna/nueva',
    name: 'nueva-cuenta-ozuna',
    component: CuentasOzuna
  },
  {
    path: '/cuentas-ozuna/:id',
    name: 'ver-cuenta-ozuna',
    component: CuentasOzuna
  },
  {
    path: '/cuentas-ozuna/:id?',
    name: 'CuentasOzuna',
    component: CuentasOzuna
  },
  {
    path: '/cuentas-catarro',
    name: 'catarro-cuentas-menu',
    component: CatarroCuentasMenu
  },
  {
    path: '/cuentas-catarro/nueva',
    name: 'nueva-cuenta-catarro',
    component: CuentaCliente,
    props: { clienteId: 'catarro' },
  },
  {
    path: '/cuentas-catarro/:id',
    name: 'ver-cuenta-catarro',
    component: CuentaCliente,
    props: { clienteId: 'catarro' },
  },
  {
    path: '/cuentas-catarro/:id?',
    name: 'CuentasCatarro',
    component: CuentaCliente,
    props: { clienteId: 'catarro' },
  },
  {
    path: '/cuentas-joselito',
    name: 'joselito-cuentas-menu',
    component: JoselitoCuentasMenu
  },
  {
    path: '/cuentas-joselito/nueva',
    name: 'nueva-cuenta-joselito',
    component: CuentaCliente,
    props: { clienteId: 'joselito' },
  },
  {
    path: '/cuentas-joselito/:id',
    name: 'ver-cuenta-joselito',
    component: CuentaCliente,
    props: { clienteId: 'joselito' },
  },
  {
    path: '/cuentas-joselito/:id?',
    name: 'CuentasJoselito',
    component: CuentaCliente,
    props: { clienteId: 'joselito' },
  },
  {
    path: '/embarques-menu',
    name: 'EmbarquesMenu',
    component: EmbarquesMenu
  },
  {
    path: "/ventas-ganancias-catarro",
    name: 'VentasYGananciasCatarro',
    component: VentasYGananciasCatarro
  },
  {
    path: "/ventas-ganancias-joselito",
    name: 'VentasYGananciasJoselito',
    component: VentasYGananciasJoselito
  },
  {
    path: '/cuentas-veronica',
    name: 'veronica-cuentas-menu',
    component: VeronicaCuentasMenu
  },
  {
    path: '/cuentas-veronica/nueva',
    name: 'nueva-cuenta-veronica',
    component: CuentaCliente,
    props: { clienteId: 'veronica' },
  },
  {
    path: '/cuentas-veronica/:id',
    name: 'ver-cuenta-veronica',
    component: CuentaCliente,
    props: { clienteId: 'veronica' },
  },
  {
    path: '/cuentas-veronica/:id?',
    name: 'CuentasVeronica',
    component: CuentaCliente,
    props: { clienteId: 'veronica' },
  },
  {
    path: "/ventas-ganancias-veronica",
    name: 'VentasYGananciasVeronica',
    component: VentasYGananciasVeronica
  },
  
  {
    path: "/embarques",
    name: 'ListaEmbarques',
    component: ListaEmbarques
  },
  {
    path: "/embarques/recuperacion-emergencia",
    name: 'RecuperacionEmergencia',
    component: RecuperacionEmergencia
  },
  {
    path: "/embarques/:id",
    name: 'EditarEmbarque',
    component: NuevoEmbarque
  },
  {
    path: '/nuevo-embarque',
    name: 'NuevoEmbarque',
    component: NuevoEmbarque
  },
  {
    path: '/embarques/:id/rendimientos',
    name: 'Rendimientos', // Cambiamos 'rendimientos' a 'Rendimientos' con mayúscula
    component: Rendimientos,
    props: true
  },
  {
    path: '/embarques/:id/costos',
    name: 'GestionCostos',
    component: GestionCostos,
    props: true
  },
  {
    path: '/cuenta-fletes',
    name: 'CuentaFletes',
    component: () => import('@/views/Embarques/CuentaFletes.vue')
  },
  {
    path: '/cuentas-otilio',
    name: 'otilio-cuentas-menu',
    component: OtilioCuentasMenu
  },
  {
    path: '/cuentas-otilio/nueva',
    name: 'nueva-cuenta-otilio',
    component: CuentaCliente,
    props: { clienteId: 'otilio' },
  },
  {
    path: '/cuentas-otilio/:id',
    name: 'ver-cuenta-otilio',
    component: CuentaCliente,
    props: { clienteId: 'otilio' },
  },
  {
    path: '/cuentas-otilio/:id?',
    name: 'CuentasOtilio',
    component: CuentaCliente,
    props: { clienteId: 'otilio' },
  },
  {
    path: '/cuentas-otilio-independiente',
    name: 'otilio-independiente-cuentas-menu',
    component: OtilioIndependienteCuentasMenu
  },
  {
    path: '/cuentas-otilio-independiente/nueva',
    name: 'nueva-cuenta-otilio-independiente',
    component: CuentaCliente,
    props: { clienteId: 'otilioIndependiente' },
  },
  {
    path: '/cuentas-otilio-independiente/:id',
    name: 'ver-cuenta-otilio-independiente',
    component: CuentaCliente,
    props: { clienteId: 'otilioIndependiente' },
  },
  {
    path: '/cuentas-otilio-independiente/:id?',
    name: 'CuentasOtilioIndependiente',
    component: CuentaCliente,
    props: { clienteId: 'otilioIndependiente' },
  },
  {
    path: '/procesos',
    name: 'ProcesosMenu',
    component: ProcesosMenu
  },
  {
    path: '/procesos/arcade',
    name: 'MareaArcade',
    component: () => import(/* webpackChunkName: "marea-arcade" */ '@/views/Procesos/MareaArcade.vue')
  },
  {
    path: '/procesos/preparacion',
    name: 'Preparacion',
    component: Preparacion
  },
  {
    path: '/procesos/pedidos',
    name: 'PedidosMenu',
    component: PedidosMenu
  },
  {
    path: '/procesos/pedidos/nuevo',
    name: 'NuevoPedido',
    component: PedidosLimpio
  },
  {
    path: '/procesos/pedidos/crudo',
    name: 'PedidosCrudo',
    component: PedidosCrudo
  },
  {
    path: '/procesos/pedidos/limpio',
    name: 'PedidosLimpio',
    component: PedidosLimpio
  },
  {
    path: '/procesos/pedidos-crudos-impresion',
    name: 'PedidoCrudosImpresion',
    component: PedidoCrudosImpresion,
    props: true
  },
  {
    path: '/procesos/pedidos-limpio-impresion',
    name: 'PedidoLimpioImpresion',
    component: PedidoLimpioImpresion,
    props: true
  },
  {
    path: '/procesos/bitacoras',
    name: 'Bitacoras',
    component: Bitacoras
  },
  {
    path: '/procesos/journal',
    name: 'Journal',
    component: Journal
  },
  {
    path: '/procesos/journal/categoria/:id',
    name: 'JournalCategoria',
    component: Journal,
    props: true
  },
  {
    path: '/procesos/journal/entrada/:id',
    name: 'JournalEntrada',
    component: Journal,
    props: true
  },
  {
    path: '/procesos/deudas',
    name: 'DeudasMenu',
    component: DeudasMenu
  },
  {
    path: '/procesos/deudas/lista',
    name: 'ListaDeudas',
    component: ListaDeudas
  },
  {
    path: '/procesos/deudas/nueva',
    name: 'NuevaDeuda',
    component: NuevaDeuda
  },
  {
    path: '/procesos/prestamos',
    name: 'PrestamosMenu',
    component: PrestamosMenu
  },
  {
    path: '/procesos/prestamos/despicadoras',
    name: 'PrestamosDespicadoras',
    component: PrestamosDespicadoras
  },
  {
    path: '/procesos/prestamos/trabajadores',
    name: 'PrestamosTrabajadores',
    component: PrestamosTrabajadores
  },
  {
    path: '/procesos/taras',
    name: 'Taras',
    component: Taras
  },
  {
    path: '/procesos/descargas',
    name: 'Descargas',
    component: () => import('@/views/Procesos/Descargas.vue')
  },
  {
    path: '/procesos/alan',
    name: 'Alan',
    component: Alan
  },
  {
    path: '/procesos/alan/marie',
    name: 'Marie',
    component: Marie
  },
  {
    path: '/barcos',
    name: 'BarcosMenu',
    component: BarcosMenu
  },
  {
    path: '/barcos/deudas/nueva',
    name: 'NuevaDeudaBarco',
    component: NuevaDeudaBarco
  },
  {
    path: '/barcos/deudas/lista',
    name: 'ListaDeudasBarcos',
    component: ListaDeudasBarcos
  },
  {
    path: '/barcos/resumen-mensual',
    name: 'ResumenMensualBarcos',
    component: ResumenMensualBarcos
  },
  {
    path: '/barcos/tripulantes',
    name: 'GestionTripulantes',
    component: GestionTripulantes
  },
  {
    path: '/barcos/entrada-producto',
    name: 'EntradaProductoBarco',
    component: EntradaProductoBarco
  }
];

const router = new Router({
  mode: process.env.VUE_APP_TARGET === 'electron' ? 'hash' : 'history',
  base: process.env.BASE_URL,
  routes
});

// Navigation guard
router.beforeEach((to, from, next) => {
  try {
    // MODO DESARROLLO: Comentar/descomentar las siguientes líneas para bypassing temporal
    if (process.env.NODE_ENV === 'development') {
      next();
      return;
    }

    // Home es de acceso libre para que la calculadora pueda usarse sin
    // solicitar usuario y contraseña.
    if (to.matched.some(route => route.meta.public)) {
      next();
      return;
    }

    // Verificar autenticación de manera más robusta
    const userString = localStorage.getItem('user');
    let isAuthenticated = false;
    
    if (userString) {
      try {
        const user = JSON.parse(userString);
        isAuthenticated = user && user.username;
      } catch (e) {
        // Si hay error al parsear, limpiar localStorage corrupto
        
        localStorage.removeItem('user');
        isAuthenticated = false;
      }
    }

    // Logging para depuración
    

    // Si la ruta es login y el usuario está autenticado, redirigir al home
    if (to.path === '/login' && isAuthenticated) {
      
      next('/');
      return;
    }

    // Si la ruta no es login y el usuario no está autenticado, redirigir a login
    if (to.path !== '/login' && !isAuthenticated) {
      
      next('/login');
      return;
    }

    
    next();
  } catch (error) {
    console.error('Error en navigation guard:', error);
    // En caso de error, conservar accesibles login y las rutas públicas.
    if (to.path === '/login' || to.matched.some(route => route.meta.public)) {
      next();
    } else {
      next('/login');
    }
  }
});

export default router;
