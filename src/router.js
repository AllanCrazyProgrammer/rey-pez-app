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
import RecuperacionEmergencia from '@/views/Embarques/RecuperacionEmergencia.vue';
import GestionCostos from '@/components/GestionCostos.vue';
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
import PrestamosMenu from '@/views/Procesos/PrestamosMenu.vue'
import PrestamosDespicadoras from '@/views/Procesos/PrestamosDespicadoras.vue'
import PrestamosTrabajadores from '@/views/Procesos/PrestamosTrabajadores.vue'
import ExistenciasCrudos from '@/views/ExistenciasCrudos.vue'
import RegistroCrudos from '@/views/RegistroCrudos.vue'
import BarcosMenu from '@/views/Barcos/BarcosMenu.vue'
import NuevaDeudaBarco from '@/views/Barcos/NuevaDeudaBarco.vue'
import ListaDeudasBarcos from '@/views/Barcos/ListaDeudasBarcos.vue'
import ResumenMensualBarcos from '@/views/Barcos/ResumenMensualBarcos.vue'
import GestionTripulantes from '@/views/Barcos/GestionTripulantes.vue'

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
  }
];

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
});

// Navigation guard
router.beforeEach((to, from, next) => {
  try {
    // MODO DESARROLLO: Comentar/descomentar las siguientes líneas para bypassing temporal
    if (process.env.NODE_ENV === 'development') {
      console.log('Modo desarrollo - Bypassing auth guard');
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
        console.log('Limpiando localStorage corrupto');
        localStorage.removeItem('user');
        isAuthenticated = false;
      }
    }

    // Logging para depuración
    console.log('Navigation Guard:', {
      to: to.path,
      from: from.path,
      isAuthenticated,
      userString: userString ? 'exists' : 'null',
      userParsed: userString ? JSON.parse(userString) : null
    });

    // Si la ruta es login y el usuario está autenticado, redirigir al home
    if (to.path === '/login' && isAuthenticated) {
      console.log('Redirigiendo a home porque ya está autenticado');
      next('/');
      return;
    }

    // Si la ruta no es login y el usuario no está autenticado, redirigir a login
    if (to.path !== '/login' && !isAuthenticated) {
      console.log('Redirigiendo a login porque no está autenticado');
      next('/login');
      return;
    }

    console.log('Permitiendo navegación normal');
    next();
  } catch (error) {
    console.error('Error en navigation guard:', error);
    // En caso de error, permitir navegación a login
    if (to.path === '/login') {
      next();
    } else {
      next('/login');
    }
  }
});

export default router;
