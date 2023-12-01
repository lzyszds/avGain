<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute, useRouter } from 'vue-router'
const webHeadTitle = ref(false)
const hasWebHeadTitle = ref(false)

const route = useRoute()
const router = useRouter()
const hasMaximize = ref<boolean>(false);
//监听路由变化 从而改变pathActive 从而改变样式
watch(
  () => route.path,
  (newVal) => {
    hasWebHeadTitle.value = newVal == '/add'
  }
);
//最小化窗
const minimize = async () => {
  await window.myElectron.onHandleWin("minimize");
};
//最大化窗口
const maximize = () => {
  hasMaximize.value = !hasMaximize.value;
  window.myElectron.onHandleWin("maximize");
};
//关闭窗口
const close = () => {
  window.myElectron.onHandleWin("close");
};

//鼠标进入顶部中心标题 事件返回顶部
const tipBackfn = (val) => {
  webHeadTitle.value = val
}
</script>

<template>
  <!-- 顶部导航栏 -->
  <nav class="navbar">
    <div class="logo " title="返回首页">
      <img src="/public/logo.png" width="24" height="24" />
      <span class="title">AV Gain</span>
    </div>
    <div v-if="hasWebHeadTitle" class="navbar-navTitle" @mouseover="tipBackfn(true)" @mouseout="tipBackfn(false)"
      @click="() => router.push('/')">
      <h4 :class="webHeadTitle ? 'tipBackclass animate__jackInTheBox' : ''">
        返回首页
      </h4>
    </div>
    <div class="tool animate__wobble">
      <button class="windHandleBtn hover:bg-[var(--setWindBtnColor)]" @click="minimize">
        <LzyIcon name="system-uicons:minus"></LzyIcon>
      </button>
      <button class="windHandleBtn" @click="maximize">
        <LzyIcon width="15px" height="15px" :name="hasMaximize ? 'mynaui:minimize' : 'mynaui:maximize'"></LzyIcon>
      </button>
      <button class="windHandleBtn" @click="close">
        <LzyIcon width="15px" height="15px" name="mynaui:x"></LzyIcon>
      </button>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  height: 30px;
  -webkit-app-region: drag;
  /* 使窗口可拖动 */
}

.logo {
  display: flex;
  align-items: center;
  padding-left: 10px;
  cursor: pointer;

  img {
    border-radius: 20%;
  }

  .title {
    margin-left: 10px;
    font-size: 16px;
    font-weight: 300;
    color: var(--reverColor);
    font-family: 'dindin';
  }
}

.navbar-navTitle {

  text-align: center;
  transition: .3s;
  font-size: 16px;
  font-family: "dindin";
  color: #fff;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
  -webkit-app-region: no-drag;
  cursor: pointer;
  display: flex;
  place-content: center;
  place-items: center;

  h4 {
    height: 25px;
    margin: 0;
    padding: 0 20px;
    border-radius: 20px;
    background-color: #fff;
    color: #000;
    line-height: 25px;

    &.tipBackclass {
      opacity: 1;
      animation-duration: .5s;
      animation-fill-mode: both;
    }
  }


}

.tool {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
  /* 使窗口可拖动 */
}

.windHandleBtn {
  height: 100%;
  width: 45px;
  // border-radius: 5px;
  text-align: center;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--bgColor);

  &:hover {
    background-color: #eee;
    color: #000;
  }

  &:last-child:hover {
    background-color: #ff0909;
    color: #fff;
  }
}

.active {
  color: var(--reverColor);
  background-color: var(--themeColor);
  border-radius: 5px;
}


@keyframes indistinct {
  0% {
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
    opacity: 1;
  }

  15% {
    -webkit-transform: translate3d(-25%, 0, 0) rotate(-5deg);
    transform: translate3d(-25%, 0, 0) rotate(-5deg);
  }

  30% {
    -webkit-transform: translate3d(20%, 0, 0) rotate(3deg);
    transform: translate3d(20%, 0, 0) rotate(3deg);
    opacity: 0;
  }

  45% {
    -webkit-transform: translate3d(-15%, 0, 0) rotate(-3deg);
    transform: translate3d(-15%, 0, 0) rotate(-3deg);
  }

  60% {
    -webkit-transform: translate3d(10%, 0, 0) rotate(2deg);
    transform: translate3d(10%, 0, 0) rotate(2deg);
  }

  75% {
    -webkit-transform: translate3d(-5%, 0, 0) rotate(-1deg);
    transform: translate3d(-5%, 0, 0) rotate(-1deg);
  }

  100% {
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
  }
}
</style>

