import Vue from 'vue';
import Router from 'vue-router';
import Login from '@/views/Login.vue';

Vue.use(Router);
const movimientos = () => import('./MovimientosInventario.vue');
const sacadas = () => import('./EditorLimpios');
const crudos = () => import('./EditorCrudos');
const editorProps = tipo => route => ({ soloInventario: true, modoModal: true, [tipo === 'limpios' ? 'sacadaIdProp' : 'registroIdProp']: route.params.id || null });

const router = new Router({
  mode: 'hash',
  routes: [
    { path: '/login', component: Login },
    { path: '/', component: () => import('./InventariosInicio.vue') },
    { path: '/existencias', component: () => import('./InventarioLimpios.vue'), meta: { titulo: 'Inventario de limpios', grupo: 'limpios' } },
    { path: '/sacadas', component: movimientos, props: { tipo: 'limpios' }, meta: { titulo: 'Movimientos de limpios', grupo: 'limpios' } },
    { path: '/sacadas/new', component: sacadas, props: editorProps('limpios'), meta: { titulo: 'Entradas y salidas de limpios', grupo: 'limpios' } },
    { path: '/sacadas/:id', component: sacadas, props: editorProps('limpios'), meta: { titulo: 'Entradas y salidas de limpios', grupo: 'limpios' } },
    { path: '/existencias-crudos', component: () => import('./InventarioCrudos.vue'), props: { soloInventario: true }, meta: { titulo: 'Inventario de crudos', grupo: 'crudos' } },
    { path: '/movimientos-crudos', component: movimientos, props: { tipo: 'crudos' }, meta: { titulo: 'Movimientos de crudos', grupo: 'crudos' } },
    { path: '/existencias-crudos/new', component: crudos, props: editorProps('crudos'), meta: { titulo: 'Entradas y salidas de crudos', grupo: 'crudos' } },
    { path: '/existencias-crudos/:id', component: crudos, props: editorProps('crudos'), meta: { titulo: 'Entradas y salidas de crudos', grupo: 'crudos' } },
    { path: '*', redirect: '/' }
  ],
  scrollBehavior: () => ({ x: 0, y: 0 })
});

// Conservar el acceso actual también en las compilaciones de prueba Android.
router.beforeEach((to, from, next) => {
  let usuario = null;
  try { usuario = JSON.parse(localStorage.getItem('user')); } catch (_) { localStorage.removeItem('user'); }
  const autenticado = Boolean(usuario && usuario.username && usuario.userId);
  if (!autenticado && to.path !== '/login') return next('/login');
  if (autenticado && to.path === '/login') return next('/');
  next();
});
export default router;
