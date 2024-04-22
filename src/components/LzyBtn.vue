<script setup lang="ts">
const props = defineProps({
  title: String,
  icon: String,
  tipsContent: String,
  handle: Function,
});
</script>

<template>
  <button class="button" @click="props.handle">
    <LzyIcon :name="props.icon" :style="{ 'vertical-align': '-5px' }" />
    <span>{{ props.title }}</span>
    <span v-if="props.tipsContent" class="tips">{{ props.tipsContent }}</span>
  </button>
</template>

<style lang="scss" scoped>
.button {
  position: relative;
  padding: 5px 12px;
  border-radius: 6px;
  border: none;
  color: #fff;
  cursor: pointer;
  background-color: var(--plyr-color-main);
  transition: all 0.2s ease;
  &:active {
    transform: scale(0.96);
  }
  &:hover .tips {
    opacity: 1;
    top: 35px;
    left: -5px;
    animation: bounceInDown 0.1s cubic-bezier(0.215, 0.61, 0.355, 1);
  }
  .tips {
    opacity: 0;
    width: 60px;
    height: 20px;
    line-height: 20px;
    border-radius: 3px;
    text-align: center;
    color: #fff;
    font-size: 12px;
    font-family: "dindin";
    background-color: var(--plyr-color-main);
    position: absolute;
    top: 0;
    left: 0;
    transition: 0.06s;
  }
}

.button:before,
.button:after {
  position: absolute;
  content: "";
  width: 150%;
  left: 50%;
  height: 100%;
  transform: translateX(-50%);
  z-index: -1000;
  background-repeat: no-repeat;
}

.button:hover:before {
  top: -70%;
  background-image: radial-gradient(circle, var(--plyr-color-main) 20%, transparent 20%),
    radial-gradient(circle, transparent 20%, var(--plyr-color-main) 20%, transparent 30%),
    radial-gradient(circle, var(--plyr-color-main) 20%, transparent 20%),
    radial-gradient(circle, var(--plyr-color-main) 20%, transparent 20%),
    radial-gradient(circle, transparent 10%, var(--plyr-color-main) 15%, transparent 20%),
    radial-gradient(circle, var(--plyr-color-main) 20%, transparent 20%),
    radial-gradient(circle, var(--plyr-color-main) 20%, transparent 20%),
    radial-gradient(circle, var(--plyr-color-main) 20%, transparent 20%),
    radial-gradient(circle, var(--plyr-color-main) 20%, transparent 20%);
  background-size: 10% 10%, 20% 20%, 15% 15%, 20% 20%, 18% 18%, 10% 10%, 15% 15%, 10% 10%,
    18% 18%;
  background-position: 50% 120%;
  animation: greentopBubbles 0.6s ease;
}

@keyframes greentopBubbles {
  0% {
    background-position: 5% 90%, 10% 90%, 10% 90%, 15% 90%, 25% 90%, 25% 90%, 40% 90%,
      55% 90%, 70% 90%;
  }

  50% {
    background-position: 0% 80%, 0% 20%, 10% 40%, 20% 0%, 30% 30%, 22% 50%, 50% 50%,
      65% 20%, 90% 30%;
  }

  100% {
    background-position: 0% 70%, 0% 10%, 10% 30%, 20% -10%, 30% 20%, 22% 40%, 50% 40%,
      65% 10%, 90% 20%;
    background-size: 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%;
  }
}

.button:hover::after {
  bottom: -70%;
  background-image: radial-gradient(circle, var(--plyr-color-main) 20%, transparent 20%),
    radial-gradient(circle, var(--plyr-color-main) 20%, transparent 20%),
    radial-gradient(circle, transparent 10%, var(--plyr-color-main) 15%, transparent 20%),
    radial-gradient(circle, var(--plyr-color-main) 20%, transparent 20%),
    radial-gradient(circle, var(--plyr-color-main) 20%, transparent 20%),
    radial-gradient(circle, var(--plyr-color-main) 20%, transparent 20%),
    radial-gradient(circle, var(--plyr-color-main) 20%, transparent 20%);
  background-size: 15% 15%, 20% 20%, 18% 18%, 20% 20%, 15% 15%, 20% 20%, 18% 18%;
  background-position: 50% 0%;
  animation: greenbottomBubbles 0.6s ease;
}

@keyframes greenbottomBubbles {
  0% {
    background-position: 10% -10%, 30% 10%, 55% -10%, 70% -10%, 85% -10%, 70% -10%, 70% 0%;
  }

  50% {
    background-position: 0% 80%, 20% 80%, 45% 60%, 60% 100%, 75% 70%, 95% 60%, 105% 0%;
  }

  100% {
    background-position: 0% 90%, 20% 90%, 45% 70%, 60% 110%, 75% 80%, 95% 70%, 110% 10%;
    background-size: 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%, 0% 0%;
  }
}

@keyframes bounceInDown {
  0%,
  60%,
  75%,
  90%,
  to {
    -webkit-animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
    animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
  }

  0% {
    opacity: 0;
    -webkit-transform: translate3d(0, -3000px, 0) scaleY(3);
    transform: translate3d(0, -3000px, 0) scaleY(3);
  }

  60% {
    opacity: 1;
    -webkit-transform: translate3d(0, 25px, 0) scaleY(0.9);
    transform: translate3d(0, 25px, 0) scaleY(0.9);
  }

  75% {
    -webkit-transform: translate3d(0, -10px, 0) scaleY(0.95);
    transform: translate3d(0, -10px, 0) scaleY(0.95);
  }

  90% {
    -webkit-transform: translate3d(0, 5px, 0) scaleY(0.985);
    transform: translate3d(0, 5px, 0) scaleY(0.985);
  }

  to {
    -webkit-transform: translateZ(0);
    transform: translateZ(0);
  }
}

.animate__bounceInDown {
  -webkit-animation-name: bounceInDown;
  animation-name: bounceInDown;
}
</style>
