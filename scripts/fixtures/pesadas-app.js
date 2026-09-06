import Vue from 'vue';
import Router from 'vue-router';
import { createPinia, PiniaVuePlugin } from 'pinia';
import NavBar from '../../src/NavBar.vue';
import Dia from '../../src/views/Pesadas/PesadasDia.vue';
import Historial from '../../src/views/Pesadas/PesadasHistorial.vue';
Vue.use(Router);
Vue.use(PiniaVuePlugin);
new Vue({
  pinia: createPinia(),
  router: new Router({ mode: 'history', routes: [
    { path: '/pesadas', component: Historial },
    { path: '/pesadas/:fecha', component: Dia, props: true }
  ] }),
  render: h => h('div', [h(NavBar), h('router-view')])
}).$mount('#app');
