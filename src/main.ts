import { createApp } from 'vue'
import 'element-plus/dist/index.css'
import '@/assets/style/style.css'
import '@/assets/style/plyr.css'
import '@/assets/style/elementLzy.scss'
import '@/assets/font/font.css'
import '@/assets/style/animate.min.css'


import LzyIcon from '@/components/LzyIcon.vue';
import App from './App.vue'
//导入element-plus
import ElementPlus from 'element-plus'
import VueJsTour from '@globalhive/vuejs-tour';
import '@globalhive/vuejs-tour/dist/style.css';

import { router } from "@/router/index";
import BtnVue from './components/Btn.vue'


createApp(App)
  .component('LzyIcon', LzyIcon)
  .component('LzyBtn', BtnVue)
  .use(router).use(ElementPlus).use(VueJsTour)
  .mount('#app')


