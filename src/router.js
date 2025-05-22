import Vue from 'vue';
import Router from 'vue-router';
import { useAuthStore } from './stores/auth';
import Home from './views/Home.vue';
import NoteMenu from './views/NoteMenu.vue'; // Asegúrate de que la ruta sea correcta
import SaleNote from '@/views/SaleNote.vue'; // Asegúrate de que la ruta de importación sea correcta
import AddClient from '@/components/AddClient.vue';
import Sacadas from '@/views/Sacadas.vue';
import SacadasMenu from '@/views/SacadasMenu.vue'
import GestionarProductos from '@/components/GestionarProductos.vue'
import GestionarMedidas from '@/components/GestionarMedidas.vue'
import GestionarProveedores from '@/components/GestionarProveedores.vue'
import Existencias from '@/components/Existencias.vue'
import CuentasMexico from '@/views/CuentasMexico.vue'
import OzunaCuentasMenu from '@/views/CuentasClientes/OzunaCuentasMenu.vue'
import CuentasOzuna from '@/views/CuentasClientes/CuentasOzuna.vue'
import CatarroCuentasMenu from '@/views/CuentasClientes/CatarroCuentasMenu.vue'
import CuentasCatarro from '@/views/CuentasClientes/CuentasCatarro.vue'
import JoselitoCuentasMenu from '@/views/CuentasClientes/JoselitoCuentasMenu.vue'
import CuentasJoselito from '@/views/CuentasClientes/CuentasJoselito.vue'
import EmbarquesMenu from '@/views/Embarques/EmbarquesMenu.vue'; // Asegúrate de que esta ruta de importación sea correcta
import VentasYGananciasCatarro from '@/views/CuentasClientes/VentasYGananciasCatarro.vue'; // Asegúrate de crear este componente
import VentasYGananciasJoselito from '@/views/CuentasClientes/VentasYGananciasJoselito.vue';
import ListaEmbarques from '@/views/Embarques/ListaEmbarques.vue';
import NuevoEmbarque from '@/views/Embarques/NuevoEmbarque.vue';
import Rendimientos from '@/views/Embarques/Rendimientos.vue';
import CuentaFletes from '@/views/Embarques/CuentaFletes.vue';
import Login from './views/Login.vue';
import OtilioCuentasMenu from '@/views/CuentasClientes/OtilioCuentasMenu.vue'
import CuentasOtilio from '@/views/CuentasClientes/CuentasOtilio.vue'
import OtilioIndependienteCuentasMenu from '@/views/CuentasClientes/OtilioIndependienteCuentasMenu.vue'
import CuentasOtilioIndependiente from '@/views/CuentasClientes/CuentasOtilioIndependiente.vue'
import ProcesosMenu from '@/views/Procesos/ProcesosMenu.vue'
import Preparacion from '@/views/Procesos/Preparacion.vue'
import PedidosMenu from '@/views/Procesos/PedidosMenu.vue'
import Pedidos from '@/views/Procesos/Pedidos.vue'
import PedidosCrudo from '@/views/Procesos/PedidosCrudo.vue'
import PedidoCrudosImpresion from '@/views/Procesos/PedidoCrudosImpresion.vue'
import PedidosLimpio from '@/views/Procesos/PedidosLimpio.vue'
import PedidoLimpioImpresion from '@/views/Procesos/PedidoLimpioImpresion.vue'
import Bitacoras from '@/views/Procesos/Bitacoras.vue'
import DeudasMenu from '@/views/Procesos/DeudasMenu.vue'
import NuevaDeuda from '@/views/Procesos/NuevaDeuda.vue'
import ListaDeudas from '@/views/Procesos/ListaDeudas.vue'

Vue.use(Router);

const routes = [
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
    path: '/cuentas-mexico',
    name: 'CuentasMexico',
    component: CuentasMexico
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
    component: CuentasCatarro
  },
  {
    path: '/cuentas-catarro/:id',
    name: 'ver-cuenta-catarro',
    component: CuentasCatarro
  },
  {
    path: '/cuentas-catarro/:id?',
    name: 'CuentasCatarro',
    component: CuentasCatarro
  },
  {
    path: '/cuentas-joselito',
    name: 'joselito-cuentas-menu',
    component: JoselitoCuentasMenu
  },
  {
    path: '/cuentas-joselito/nueva',
    name: 'nueva-cuenta-joselito',
    component: CuentasJoselito
  },
  {
    path: '/cuentas-joselito/:id',
    name: 'ver-cuenta-joselito',
    component: CuentasJoselito
  },
  {
    path: '/cuentas-joselito/:id?',
    name: 'CuentasJoselito',
    component: CuentasJoselito
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
    path: "/embarques",
    name: 'ListaEmbarques',
    component: ListaEmbarques
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
    path: '/cuenta-fletes',
    name: 'CuentaFletes',
    component: CuentaFletes
  },
  {
    path: '/cuentas-otilio',
    name: 'otilio-cuentas-menu',
    component: OtilioCuentasMenu
  },
  {
    path: '/cuentas-otilio/nueva',
    name: 'nueva-cuenta-otilio',
    component: CuentasOtilio
  },
  {
    path: '/cuentas-otilio/:id',
    name: 'ver-cuenta-otilio',
    component: CuentasOtilio
  },
  {
    path: '/cuentas-otilio/:id?',
    name: 'CuentasOtilio',
    component: CuentasOtilio
  },
  {
    path: '/cuentas-otilio-independiente',
    name: 'otilio-independiente-cuentas-menu',
    component: OtilioIndependienteCuentasMenu
  },
  {
    path: '/cuentas-otilio-independiente/nueva',
    name: 'nueva-cuenta-otilio-independiente',
    component: CuentasOtilioIndependiente
  },
  {
    path: '/cuentas-otilio-independiente/:id',
    name: 'ver-cuenta-otilio-independiente',
    component: CuentasOtilioIndependiente
  },
  {
    path: '/cuentas-otilio-independiente/:id?',
    name: 'CuentasOtilioIndependiente',
    component: CuentasOtilioIndependiente
  },
  {
    path: '/procesos',
    name: 'ProcesosMenu',
    component: ProcesosMenu
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
  }
];

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
});

// Navigation guard
router.beforeEach((to, from, next) => {
  // Necesitamos acceder al store después de que la app se haya montado
  const store = localStorage.getItem('user');
  const isAuthenticated = store ? true : false;

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
});

export default router;
