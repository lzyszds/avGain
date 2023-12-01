<script setup lang="ts">
import { routes } from "@/router/index";
import { watch, ref } from "vue";
import { RouterView, useRoute } from "vue-router";
import NavTop from "@/components/NavTop.vue";
const router = useRoute();
const pathActive = ref<number>(0);
pathActive.value = routes.findIndex((item) => item.path === router.path);
//监听路由变化 从而改变pathActive 从而改变样式
watch(
  () => router.path,
  (newVal) => {
    pathActive.value = routes.findIndex((item) => item.path === newVal);
  }
);
</script>

<template>
  <Suspense>
    <NavTop></NavTop>
  </Suspense>
  <Suspense>
    <main>
      <RouterView />
    </main>
  </Suspense>
</template>

<style lang="scss">
main {
  height: calc(100vh - 40px);
  overflow: hidden;
}
</style>
