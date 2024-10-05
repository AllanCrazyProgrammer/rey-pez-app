import Vue from 'vue';
import Router from 'vue-router';
import Home from './views/Home.vue';
import NoteMenu from './views/NoteMenu.vue'; // Asegúrate de que la ruta sea correcta
import SaleNote from '@/views/SaleNote.vue'; // Asegúrate de que la ruta de importación sea correcta
import AddClient from '@/components/AddClient.vue';
import  Sacadas from '@/views/Sacadas.vue';
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
import EmbarquesMenu from '@/views/Embarques/EmbarquesMenu.vue'; // Asegúrate de que esta ruta de importación sea correcta
import VentasYGananciasCatarro from '@/views/CuentasClientes/VentasYGananciasCatarro.vue'; // Asegúrate de crear este componente

Vue.use(Router);

const routes = [
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
    path: '/embarques-menu',
    name: 'EmbarquesMenu',
    component: EmbarquesMenu
  },
  {
    path: "/ventas-ganancias-catarro",
    name: 'VentasYGananciasCatarro',
    component: VentasYGananciasCatarro
  }
];

const router = new Router({
  routes,
});

export default router;