import Vue from "vue";
import VueRouter from "vue-router";
import Pesadas from "./views/Pesadas.vue";
import Home from "./views/Home.vue";

Vue.use(VueRouter);

const routes = [
  {
    path: "/pesadas",
    name: "pesadas",
    component: Pesadas,
  },
  {
    path: "/",
    name: "home",
    component: Home,
  },
];
const router = new VueRouter({
  mode: "history",
  routes,
});

export default router;
