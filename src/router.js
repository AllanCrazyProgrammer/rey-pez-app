import Vue from "vue";
import VueRouter from "vue-router";
import Pesadas from "./views/Pesadas.vue";
import Home from "./views/Home.vue";
import Login from "./views/Login";
import Register from "./views/Register";

Vue.use(VueRouter);

const routes = [
  {
    path: "/pesadas",
    name: "pesadas",
    component: Pesadas,
  },
  { path: "/login", component: Login },
  { path: "/register", component: Register },
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
