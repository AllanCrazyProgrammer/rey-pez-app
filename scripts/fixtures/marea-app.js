import Vue from 'vue';
import Router from 'vue-router';
import Menu from '../../src/views/Procesos/ProcesosMenu.vue';
import Arcade from '../../src/views/Procesos/MareaArcade.vue';
Vue.use(Router);
new Vue({ router: new Router({ mode: 'history', routes: [
  { path: '/procesos', component: Menu },
  { path: '/procesos/arcade', component: Arcade }
] }), render: h => h('router-view') }).$mount('#app');
