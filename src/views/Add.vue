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
      <li class="tools">
        <LzyBtn :handle="getDownloadListContent" title="刷新" icon="ant-design:reload-outlined"></LzyBtn>
        <LzyBtn :handle="deleteDirFile" title="清空" icon="ant-design:delete-twotone"></LzyBtn>
        <LzyBtn :title="getDownloadSize()" icon="ic:baseline-insert-chart-outlined"></LzyBtn>

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
          <el-input v-model="sizeForm.url" :autosize="{ minRows: 3, maxRows: 5 }" type="textarea" spellcheck="false" />
        </el-form-item>
        <el-form-item label="下载线程">
          <el-input v-model="sizeForm.thread" type="number" max="20" min="1" />
        </el-form-item>
        <el-form-item class="sumbit">
          <!-- v-show="speedDownload" -->
          <span style="text-align: left;">{{ speedDownload }}/s</span>
          <el-progress :text-inside="true" :percentage="percentage" color="#fe638f" />
          <span>{{ progress[0] }}/{{ progress[1] }}</span>
          <button class="button download" @click="onSubmit" type="button">
            <span class="button__text">开始下载</span>
            <span class="button__icon"><svg class="svg" fill="none" height="24" stroke="currentColor"
                stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="24"
                xmlns="http://www.w3.org/2000/svg">
                <line x1="12" x2="12" y1="5" y2="19"></line>
                <line x1="5" x2="19" y1="12" y2="12"></line>
              </svg></span>
          </button>
        </el-form-item>
      </el-form>
      <el-button @click="addAlternate">添加备选</el-button>
      <div class="alternateList">
        <el-card shadow="never" v-for="(item, index) in alternateArr" :key="index">
          <p>{{ index + 1 }}</p>
          <el-form-item label="番号名字">
            <div class="alterTools">
              <el-input v-model="item.name" spellcheck="false" />
              <el-button type="primary" @click="useAlternate(item)">更换备选</el-button>
            </div>
          </el-form-item>
          <el-form-item label="下载地址">
            <div class="alterTools">
              <el-input v-model="item.url" spellcheck="false" />
              <el-button type="primary" @click="() => alternateArr.splice(index, 1)">删除</el-button>
            </div>
          </el-form-item>
        </el-card>
      </div>
    </div>
    <div class="footer">
      <el-collapse class="collapse" v-model="activeNames" :accordion="true">
        <el-collapse-item v-for="( item, index ) in  downloadHistory " :key="index" :title="item.name" :name="index">
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
import { useStorage } from '@vueuse/core'
const el = window.myElectron

const downPath = await el.onHandleStoreData("downloadPath")
const previewPath = await el.onHandleStoreData("previewPath")
const coverPath = await el.onHandleStoreData("coverPath")
const videoPath = await el.onHandleStoreData("videoPath")
const rawData = await el.onHandleStoreData('downloadHistory');
const downloadHistory = ref(JSON.parse(rawData || '[]'));
const sizeForm = useStorage('sizeForm', {
  resource: 'SuperJav',
  name: '',
  url: '',
  thread: 10,
})
const alternateArr = useStorage('alternateArr', [
  { name: '', url: '' }
])

const percentage = ref(0)
const progress = ref<number[]>([])

const fileDirlist = ref<any>([])
const speedDownload = ref<string>()

const activeNames = ref(['1'])


async function onSubmit() {

  if (!hasName(sizeForm.value.name)) {
    el.onHandleStoreData({ DownLoadForm: JSON.stringify({ ...sizeForm }) })
    downloadHistory.value.unshift({ ...sizeForm })
    el.onHandleStoreData({ downloadHistory: JSON.stringify(downloadHistory.value) })
  }
  let timer

  el.downloadVideoEvent({
    ...sizeForm.value, downPath, previewPath, coverPath, videoPath
  }).then(res => {
    console.log(`lzy  res:`, res)
    ElNotification({
      title: '下载提示：',
      message: res + ':' + sizeForm.value.name,
      position: 'bottom-left',
      duration: 0
    })
    clearInterval(timer)
    setTimeout(() => {
      //将备选内容第一个赋值给sizeForm 并删除备选内容 然后开始下载下一个
      if (alternateArr.value.length > 0) {
        sizeForm.value.name = alternateArr[0].name
        sizeForm.value.url = alternateArr[0].url
        alternateArr.value.splice(0, 1)
        onSubmit()
      }
    }, 10000)
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
  speedDownload.value = newSize == oldSize ? speedDownload.value : formatFileSize((newSize - oldSize) * 2)
  oldSize = newSize
}

//获取总下载内容大小
const getDownloadSize = () => {
  let newSize = 0
  fileDirlist.value.forEach((res) => {
    newSize += res.state.size
  })
  return formatFileSize(newSize)
}
//添加备选 
const addAlternate = () => {
  alternateArr.value.push({ name: '', url: '' })
}
//使用备选
const useAlternate = (item) => {
  sizeForm.value.name = item.name
  sizeForm.value.url = item.url
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

    &.tools {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 10px;

      button:nth-child(3) {
        grid-column: 1 / 3;
      }
    }
  }

}


.addMain {
  height: 93%;
  margin: auto;
  border-radius: 10px;
  display: grid;
  grid-template-rows: 60px 345px 30px 1fr;
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
    gap: 20px;
    display: grid;
    grid-template-columns: 60px 1fr 60px 150px;

    span {
      text-align: center;
    }
  }

  .alternateList {
    overflow-y: scroll;
    height: 450px;

    .el-card {
      margin-bottom: 10px;
      position: relative;

      :deep(.el-card__body) {
        display: grid;
        grid-template-columns: 50px 1fr;
        justify-content: center;
        align-items: center;
        gap: 10px;

        .el-form-item {
          margin: 0;
        }
      }

      p {
        text-align: center;
        font-family: 'dindin';
        font-size: 2rem;
        margin: 0;
        grid-row: 1 / 3;
        border-radius: 10px;
      }

      .alterTools {
        display: grid;
        gap: 10px;
        grid-template-columns: 1fr 100px;
        width: 100%;
      }
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
