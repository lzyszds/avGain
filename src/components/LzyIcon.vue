<script setup lang="ts" name="lzyIcon">
import { Icon } from "@iconify/vue";
import { ref } from "vue";
interface Props {
  name: string;
  width?: string;
  height?: string;
  style?: string | Object;
  tip?: string;
  isAnimate?: boolean;
  tipPosition?: string;
  title?: string;
}

const props = defineProps<Props>();
const width = ref(props.width ?? "20px");
const height = ref(props.height ?? "20px");

const handleClick = (event) => {
  if (!props.isAnimate) return;
  const path = event.target;
  path.classList.add("animate"); // 添加 animate 类名
  path.addEventListener(
    "animationend",
    () => {
      path.classList.remove("animate"); // 动画完成后移除 animate 类名
    },
    { once: true }
  ); // 添加 { once: true } 选项，确保事件只会触发一次
};
</script>

<template>
  <span
    class="lzyIcon"
    :class="props.tipPosition ?? 'top'"
    @click="handleClick"
    :data-tip="props.tip"
    :title="props.title"
  >
    <Icon
      :icon="name"
      :width="width"
      :height="height"
      align="verticalAlign"
      :inline="true"
      :style="props.style"
      style="vertical-align: -5px"
    >
    </Icon>
  </span>
</template>

<style scoped>
.lzyIcon {
  cursor: pointer;
  position: relative;
}

.lzyIcon:hover::after {
  opacity: 1;
}

.lzyIcon::after {
  content: attr(data-tip);
  position: absolute;
  width: auto;
  white-space: nowrap;
  padding: 0 5px;

  left: 50%;
  transform: translateX(-50%);
  border-radius: 5px;
  background-color: #000;
  color: #fff;
  font-size: 12px;
  font-family: "dindin";
  pointer-events: none;
  z-index: 999;
  transition: 0.3s;
  opacity: 0;
}

.lzyIcon.top::after {
  top: -20px;
}

.lzyIcon.bottom::after {
  bottom: -20px;
}

svg {
  display: inline;
}

.animate {
  color: rgb(255, 60, 60);
  animation: stroke-a155e2fc 0.7s 1 linear;
  animation-fill-mode: forwards;
}

@keyframes stroke-a155e2fc {
  0% {
    fill: rgba(72, 138, 20, 0);
    stroke: #ffffff;
    stroke-dashoffset: 25%;
    stroke-dasharray: 0 50%;
    stroke-width: 10;
  }

  70% {
    fill: rgba(72, 138, 20, 0);
    stroke: #ffffff;
    stroke-width: 2;
  }

  85% {
    fill: rgba(72, 138, 20, 0);
    stroke: #ffffff;
    stroke-width: 1;
  }

  95%,
  100% {
    fill: #ffffff;
    stroke: rgba(54, 95, 160, 0);
    stroke-dashoffset: -25%;
    stroke-dasharray: 30% 0;
    stroke-width: 50;
  }
}
</style>
