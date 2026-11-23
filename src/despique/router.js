// Router de la app de despique (docs/APP_DESPIQUE.md). Es la ÚNICA lista de pantallas que entra
// a esa APK: login, días de pesadas, modo rápido, pesada a granel, hoja del día y ajustes
// (medidas por defecto). Las demás áreas de Rey Pez no se importan aquí, así que ni siquiera se
// compilan dentro de la app (no hay forma de llegar a ellas).
// Cualquier otra ruta regresa a la lista de días.
import Vue from 'vue';
import Router from 'vue-router';
import Login from '@/views/Login.vue';

Vue.use(Router);

export const rutasDespique = [
  { path: '/login', name: 'Login', component: Login, meta: { publica: true } },
  { path: '/', redirect: '/pesadas' },
  { path: '/pesadas', name: 'PesadasHistorial', component: () => import('@/views/Pesadas/PesadasHistorial.vue') },
  // Modo rápido antes de /pesadas/:fecha, igual que en el router principal.
  { path: '/pesadas/:fecha/rapida', name: 'PesadasRapida', component: () => import('@/views/Pesadas/PesadasRapida.vue'), props: true },
  // Pesada a granel: sigue a "Terminé de pesar" (se puede saltar).
  { path: '/pesadas/:fecha/granel', name: 'PesadasGranel', component: () => import('@/views/Pesadas/PesadasGranel.vue'), props: true },
  // Ajustes de pesadas (engrane del historial): medidas por defecto de Pesar rápido. Antes de /pesadas/:fecha.
  { path: '/pesadas/ajustes', name: 'PesadasAjustes', component: () => import('@/views/Pesadas/PesadasAjustes.vue') },
  { path: '/pesadas/:fecha', name: 'PesadasDia', component: () => import('@/views/Pesadas/PesadasDia.vue'), props: true },
  { path: '*', redirect: '/pesadas' }
];

export function haySesion(storage = localStorage) {
  try {
    const user = JSON.parse(storage.getItem('user') || 'null');
    return Boolean(user && user.username);
  } catch (_error) {
    return false;
  }
}

const router = new Router({
  // En la APK no hay servidor que resuelva rutas: modo hash, como la app completa.
  mode: process.env.VUE_APP_TARGET === 'android' ? 'hash' : 'history',
  base: process.env.BASE_URL,
  routes: rutasDespique
});

router.beforeEach((to, from, next) => {
  const conSesion = haySesion();
  if (to.matched.some(ruta => ruta.meta.publica)) {
    next(conSesion && to.path === '/login' ? '/pesadas' : undefined);
    return;
  }
  next(conSesion ? undefined : '/login');
});

export default router;
