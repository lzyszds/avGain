<template>
  <div style="display: grid;grid-template-columns: 22% 1fr 24%;padding:10px 0">
    <ul class="dirState">
      <li>
        <lzy-icon name="solar:folder-with-files-broken" style="width: 12px;vertical-align: -6px;" />
        {{ downPath }}
      </li>
      <li class="dirContent" v-for="(item, index) in fileDirlist" :key="index">
        <span>
          <lzy-icon name="ph:file-ts"></lzy-icon>
          {{ item.name }}
        </span>
        <span>{{ formatFileSize(item.state.size) }}</span>
      </li>
      <li>
        <LzyBtn :handle="getDownloadListContent" title="刷新" icon="ant-design:reload-outlined"></LzyBtn>
        <LzyBtn :handle="deleteDirFile" title="清空" icon="ant-design:delete-twotone"></LzyBtn>
      </li>
    </ul>
    <div class="addMain">
      <h1 style="text-align: center;padding-bottom: 20px;">
        欢迎使用
        <img src="../../public/logo.png" width="40" height="40">
        <span class="av">AudioVideo_Gain</span>
      </h1>
      <el-form ref="form" :model="sizeForm" label-width="auto" label-position="left" size="large">
        <el-form-item label="资源来路">
          <el-radio-group v-model="sizeForm.resource">
            <el-radio border label="SuperJav" />
            <el-radio border label="MissJav" />
          </el-radio-group>
        </el-form-item>
        <el-form-item label="番号名字">
          <el-input v-model="sizeForm.name" />
        </el-form-item>
        <el-form-item label="下载地址">
          <el-input v-model="sizeForm.url" :autosize="{ minRows: 3, maxRows: 5 }" type="textarea" />
        </el-form-item>
        <el-form-item label="下载线程">
          <el-input v-model="sizeForm.thread" type="number" />
        </el-form-item>
        <el-form-item class="sumbit">
          <!-- v-show="speedDownload" -->
          <span style="text-align: left;">{{ speedDownload }}/s</span>
          <el-progress :text-inside="true" :percentage="percentage" color="#fe638f" />
          <span>{{ progress[0] }}/{{ progress[1] }}</span>
          <button class="button download" @click="onSubmit" type="button">
            <span class="button__text">Add Item</span>
            <span class="button__icon"><svg class="svg" fill="none" height="24" stroke="currentColor"
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24"
                xmlns="http://www.w3.org/2000/svg">
                <line x1="12" x2="12" y1="5" y2="19"></line>
                <line x1="5" x2="19" y1="12" y2="12"></line>
              </svg></span>
          </button>
        </el-form-item>
      </el-form>
    </div>
    <div class="footer">
      <el-collapse class="collapse" v-model="activeNames" :accordion="true">
        <el-collapse-item v-for="(item, index) in downloadHistory" :key="index" :title="item.name" :name="index">
          <div>
            {{ item.url }}
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue'
import { ElNotification } from 'element-plus'
import LzyIcon from '@/components/LzyIcon.vue';
const el = window.myElectron

const downPath = await el.onHandleStoreData("downloadPath")
const previewPath = await el.onHandleStoreData("previewPath")
const coverPath = await el.onHandleStoreData("coverPath")
const videoPath = await el.onHandleStoreData("videoPath")
const rawData = await el.onHandleStoreData('downloadHistory');
const downloadHistory = ref(JSON.parse(rawData || '[]'));
const sizeForm = reactive({
  resource: 'SuperJav',
  name: '',
  url: '',
  thread: 10,
})
const percentage = ref(0)
const progress = ref<number[]>([])

const fileDirlist = ref<any>([])
const speedDownload = ref<string>()

const DownLoadForm = await el.onHandleStoreData('DownLoadForm')
if (DownLoadForm) {
  Object.assign(sizeForm, JSON.parse(DownLoadForm || ''))
}
const activeNames = ref(['1'])


async function onSubmit() {

  if (!hasName(sizeForm.name)) {
    el.onHandleStoreData({ DownLoadForm: JSON.stringify({ ...sizeForm }) })
    downloadHistory.value.unshift({ ...sizeForm })
    el.onHandleStoreData({ downloadHistory: JSON.stringify(downloadHistory.value) })
  }
  let timer

  el.downloadVideoEvent({
    ...sizeForm, downPath, previewPath, coverPath, videoPath
  }).then(res => {
    ElNotification({
      title: '下载提示：',
      message: res + ':' + sizeForm.name,
      position: 'bottom-left',
      duration: 0
    })
    clearInterval(timer)
  })
  timer = setInterval(async () => {
    const arr = await el.getDownloadSpeed()
    percentage.value = Number((arr[0] / arr[1] * 100).toFixed(2))
    progress.value = [arr[0], arr[1]]
    getDownloadListContent()
    speedDownloadHanlde()
  }, 500)
}

function hasName(name) {
  let result = false
  downloadHistory.value.forEach((res) => {
    if (res.name == name) {
      result = true
    }
  })
  return result
}
//获取下载目录的内容，将其展示在系统上
getDownloadListContent()
async function getDownloadListContent() {
  fileDirlist.value = await el.getDownloadListContent(downPath)
}

function deleteDirFile() {
  el.deleteDirFile(downPath)
  getDownloadListContent()
}


function formatFileSize(fileSize: any) {

  const units = [
    'B',
    'KB',
    'MB',
    'GB',
    'TB'
  ];
  let index = 0;

  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024;
    index++;
  }

  return fileSize.toFixed(2) + units[index];
}

let oldSize = 0
//获取下载速度
const speedDownloadHanlde = () => {
  let newSize = 0
  fileDirlist.value.forEach((res) => {
    newSize += res.state.size
  })
  console.log(newSize, oldSize);
  speedDownload.value = Number(formatFileSize((newSize - oldSize) * 2)) == 0 ? speedDownload.value : formatFileSize((newSize - oldSize) * 2)
  oldSize = newSize
}

</script>

<style scoped lang="scss">
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

ul {
  padding: 0;

  li {
    list-style: none;
  }
}

.dirState {
  padding: 0 20px;
  height: calc(100vh - 60px);
  font-size: 17px;

  li {

    &:first-child {
      font-size: 12px;
      border-bottom: 1px solid #eee;
      margin-bottom: 10px;
    }

    &.dirContent {
      display: flex;
      justify-content: space-between;

      span:last-child {
        font-size: 12px;
        line-height: 25px;
      }
    }

    &:last-child {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }

  }

}


.addMain {
  height: 93%;
  margin: auto;
  border-radius: 10px;
  display: grid;
  grid-template-rows: 60px 345px 1fr;
  gap: 10px;
  user-select: none !important;
  box-shadow: var(--el-box-shadow-lighter);
  padding: 30px;

  h1 {
    margin: 0;
  }

  input {
    user-select: auto !important;
  }

  .collapse,
  :deep(.el-collapse-item__content) {
    user-select: auto !important;
  }

  .sumbit :deep(.el-form-item__content) {
    justify-content: end;
    gap: 10px;
    display: grid;
    grid-template-columns: 60px 1fr 50px 160px;

    span {
      text-align: center;
    }
  }
}

.footer {
  overflow-y: scroll;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 10px;
  height: calc(100vh - 60px);

  :deep(.el-collapse-item) {
    button {
      font-size: 11px;
      line-height: 14px;
      text-align: left;
      user-select: all;
      cursor: text;
      word-wrap: break-word;
    }

    .el-collapse-item__content div {
      word-wrap: break-word;
      user-select: all;
    }
  }
}

.el-progress--line {
  width: 330px;

  :deep(.el-progress-bar__outer) {
    height: 20px !important;

    .el-progress-bar__innerText {
      // color: var(--hoverColor);
    }
  }
}

.download.button {
  --main-focus: #2d8cf0;
  --font-color: #323232;
  --bg-color-sub: #dedede;
  --bg-color: #eee;
  --main-color: #323232;
  position: relative;
  width: 150px;
  height: 40px;
  cursor: pointer;
  display: flex;
  align-items: center;
  border: 2px solid var(--main-color);
  box-shadow: 4px 4px var(--main-color);
  background-color: var(--bg-color);
  border-radius: 10px;
  overflow: hidden;

  &,
  .button__icon,
  .button__text {
    transition: all 0.3s;
  }

  & .button__text {
    transform: translateX(22px);
    color: var(--font-color);
    font-weight: 600;
  }

  & .button__icon {
    position: absolute;
    transform: translateX(100px);
    height: 100%;
    width: 40px;
    background-color: var(--bg-color-sub);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  & .svg {
    width: 20px;
    fill: var(--main-color);
  }

  &:hover {
    background: var(--bg-color);
    padding: 0;
  }

  &:hover .button__text {
    color: transparent;
  }

  &:hover .button__icon {
    width: 148px;
    transform: translateX(0);
  }

  &:active {
    transform: translate(3px, 3px);
    box-shadow: 0px 0px var(--main-color);
  }
}
</style>
