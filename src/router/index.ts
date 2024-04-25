import { createRouter } from "vue-router";
import { createWebHashHistory } from "vue-router";
import Home from "@/views/Home.vue";
import Add from "@/views/Add.vue";

const routes = [
  {
    path: "/home",
    name: "首页",
    component: Home, //注意，没有重定向就会出现两个一模一样的home页面
  },
  {
    path: "/",
    name: "添加",
    component: Add,
  }

];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export { router, routes };

