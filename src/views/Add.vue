<script lang="ts" setup>
import { computed, reactive, ref, watch } from "vue";
import { ElNotification, dayjs } from "element-plus";
import LzyIcon from "@/components/LzyIcon.vue";
import { useStorage } from "@vueuse/core";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

const el = window.myElectron;

await el.onGetAllDirPath();

// setInterval(() => {
//   console.log(ipcRenderer);
// }, 1000);

const downPath = await el.onHandleStoreData("downloadPath");
const previewPath = await el.onHandleStoreData("previewPath");
const coverPath = await el.onHandleStoreData("coverPath");
const videoPath = await el.onHandleStoreData("videoPath");
const rawData = await el.onHandleStoreData("downloadHistory");
const downloadHistory = ref(JSON.parse(rawData || "[]"));

//将历史记录里面的空数据删除
downloadHistory.value = downloadHistory.value.filter((res) => res.name);

const sizeForm = useStorage("sizeForm", {
  resource: "SuperJav",
  name: "",
  url: "",
  thread: 10,
});

//获取本地存储中的下载进度
const storeData = ref(await el.onGetDownloadProgress(sizeForm.value.name));

const alternateArr = useStorage("alternateArr", [{ name: "", url: "" }]);
const percentage = computed(() => {
  if (storeData.value.downLoadAfter === 0) return 0;
  return Number(
    (
      (storeData.value.downLoadAfter / storeData.value.downloadCount) *
      100
    ).toFixed(2)
  );
});

const fileDirlist = ref<any>([]);
const speedDownload = ref<string>();

const activeNames = ref(["1"]);

//判断是否正在下载
const isStartDown = ref(false);

//历史记录当前页数
const newPage = ref(1);

let timer,
  downLoadAfterCopy: number[] = [];
//下载时间计时器
const counter = ref(0);

const downloadTime = computed(() => {
  return dayjs.duration(counter.value, "seconds").format("HH:mm:ss");
});

async function onSubmit() {
  isStartDown.value = !isStartDown.value;
  if (!isStartDown.value) {
    timer && clearInterval(timer);
    await el.pauseDownloadEvent();
    return ElNotification({
      title: "下载已暂停",
      message: sizeForm.value.name,
      type: "warning",
    });
  }
  timer && clearInterval(timer);
  const { name, url } = sizeForm.value;
  if (!name || !url) return;
  ElNotification({
    title: "下载提示：",
    message: "开始下载：" + name,
    type: "success",
  });

  const appStoreData = (key, value) => {
    el.onHandleStoreData({ [key]: JSON.stringify(value) });
  };

  if (!hasName(name)) {
    // 将对象转换为JSON字符串，并通过onHandleStoreData方法传递给el
    appStoreData("DownLoadForm", { ...sizeForm.value });
    downloadHistory.value.unshift({ ...sizeForm.value });
    appStoreData("downloadHistory", downloadHistory.value);
  }
  timer = setInterval(async () => {
    storeData.value = await el.onGetDownloadProgress(name);
    const { downLoadAfter: after, downloadCount: count } = storeData.value;
    if (!downLoadAfterCopy[after]) {
      downLoadAfterCopy[after] = 1;
    } else {
      downLoadAfterCopy[after] += 1;
    }
    //如果下载不动 时间超过60秒，则重新开始下载
    if (downLoadAfterCopy[after] > 15) {
      ElNotification({
        title: "下载提示：",
        message: "下载异常，已停止下载",
        type: "error",
      });
      downLoadAfterCopy = [];
      isStartDown.value = false;
      timer && clearInterval(timer);
      //重新开始下载
      return onSubmit();
    } else {
      // 更新下载列表内容
      getDownloadListContent();
      updateSpeedDownload();
    }
    counter.value++;

    // 判断是否下载完成
    if (after == count || downLoadAfterCopy.length === 0) {
      timer && clearInterval(timer);
      //视频下载完成后，将视频进行合并
      await onMergeVideo();
      counter.value = 0;
      isStartDown.value = false;

      setTimeout(() => {
        getDownloadListContent();
        updateSpeedDownload();
      }, 1000);
    }
  }, 1000);
  try {
    // 使用 await 处理 promise
    const res = await el.downloadVideoEvent({
      ...sizeForm.value,
      downPath,
      previewPath,
      coverPath,
      videoPath,
    });

    ElNotification({
      title: "下载提示：",
      message: res + ":" + name + "等待10秒后开始下载下一个任务",
      duration: 10000,
    });

    setTimeout(() => {
      // 将备选内容第一个赋值给sizeForm 并删除备选内容 然后开始下载下一个
      if (alternateArr.value.length > 0) {
        sizeForm.value.name = alternateArr.value[0].name;
        sizeForm.value.url = alternateArr.value[0].url;
        alternateArr.value.splice(0, 1);

        const timerItem = setInterval(() => {
          if (getDownloadSize() == "0.00B") {
            clearInterval(timer);
            onSubmit();
            clearInterval(timerItem);
          }
        }, 1000);
      }
    }, 1000 * 10);
  } catch (err) {
    console.error(err);
  }
}

function hasName(name) {
  let result = false;
  downloadHistory.value.forEach((res) => {
    if (res.name == name) {
      result = true;
    }
  });
  return result;
}
//获取下载目录的内容，将其展示在系统上
getDownloadListContent();
async function getDownloadListContent() {
  fileDirlist.value = await el.getDownloadListContent(downPath);
  //将其中的数据根据name进行排序
  fileDirlist.value.sort((a, b) => {
    return a.downloadTime - b.downloadTime;
  });
}
//清空下载路径
function deleteDirFile() {
  el.deleteDirFile(downPath);
  getDownloadListContent();
}
//合并视频（以解决视频不合并的问题）
async function onMergeVideo() {
  const { name } = sizeForm.value;
  const msg = await el.onMergeVideo({
    name,
  });
}
function formatFileSize(fileSize: any) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;

  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024;
    index++;
  }

  return fileSize.toFixed(2) + units[index];
}

let oldSize = 0;
// 更新速度下载值的函数
const updateSpeedDownload = () => {
  let totalSize = 0;
  fileDirlist.value.forEach((res) => {
    totalSize += res.state;
  });
  // 如果新的总大小与旧的总大小相同，则不更新速度下载值
  if (totalSize === oldSize) {
    return;
  }
  const size = formatFileSize(totalSize - oldSize);
  const sizeName = size;
  // 格式化文件大小并更新速度下载值
  speedDownload.value =
    Number(size.replace(/[KMGT]B/, "")) > 0 ? sizeName : "0.00B";

  oldSize = totalSize;
};

//获取总下载内容大小
const getDownloadSize = () => {
  let newSize = 0;
  fileDirlist.value.forEach((res) => {
    newSize += res.state;
  });
  return formatFileSize(newSize);
};
//打开下载目录
function onOpenDir() {
  el.onOpenDir(downPath);
}

//添加备选
const addAlternate = () => {
  alternateArr.value.push({ name: "", url: "" });
};
//使用备选
const useAlternate = (item) => {
  sizeForm.value.name = item.name;
  sizeForm.value.url = item.url;
};
//根据页面高度进行分页
const reactivePage = ref(window.innerHeight / 55);

//监听页面高度
window.addEventListener("resize", () => {
  reactivePage.value = window.innerHeight / 55;
});

//对历史记录进行分页
function handleHistory(currentPage: number = 1): any {
  const history = downloadHistory.value;
  const len = history.length;
  //根据页面高度进行分页
  const pageSize = reactivePage.value;
  const page = Math.ceil(len / pageSize);
  const result: string[] = [];
  for (let i = 0; i < page; i++) {
    result.push(history.slice(i * pageSize, (i + 1) * pageSize));
  }
  return result[currentPage - 1];
}

const logData = reactive({
  value: "", //日志内容
  logTimer: null as any, //日志定时器
  isOnScroll: true, //是否自动滚动
});
const getSystemLog = async () => {
  const systemLog = document.querySelector(".systemLog > div") as HTMLElement;
  // await el.onClearSystemLog();
  logData.logTimer && clearInterval(logData.logTimer);
  logData.logTimer = setInterval(async () => {
    const res = await el.onGetSystemLog();
    logData.value = res.split("<br/>");
    //如果日志内容超过100条，则只显示最新的100条
    if (logData.value.length > 100) {
      logData.value = logData.value.slice(logData.value.length - 100);
    }
    console.log(`lzy  logData.isOnScroll:`, logData.isOnScroll);
    //如果自动滚动条开启，则将滚动条滚动到最底部
    if (!logData.isOnScroll) return;
    //将滚动条滚动到最底部
    systemLog.scrollTop = systemLog.scrollHeight;
  }, 500);
};
await getSystemLog();
</script>
<template>
  <div class="addWhole">
    <ul class="dirState">
      <li>
        <lzy-icon
          name="solar:folder-with-files-broken"
          style="width: 12px; vertical-align: -6px"
        />
        {{ downPath }}
      </li>
      <li class="dirContent" v-for="(item, index) in fileDirlist" :key="index">
        <span>
          <lzy-icon name="ph:file-ts"></lzy-icon>
          {{ item.name }}
        </span>
        <span>{{ formatFileSize(item.state) }}</span>
      </li>
      <li class="tools">
        <LzyBtn
          :handle="getDownloadListContent"
          title="刷新"
          icon="ant-design:reload-outlined"
        ></LzyBtn>
        <LzyBtn
          :handle="deleteDirFile"
          title="清空"
          icon="ant-design:delete-twotone"
        ></LzyBtn>
        <LzyBtn
          :title="getDownloadSize()"
          :handle="onOpenDir"
          icon="ic:baseline-insert-chart-outlined"
        ></LzyBtn>
        <LzyBtn
          :handle="onMergeVideo"
          title="合成"
          icon="gg:merge-horizontal"
        ></LzyBtn>
      </li>
      <div class="systemLog">
        <div>
          <p v-for="(item, index) in logData.value" :key="index">{{ item }}</p>
        </div>
        <section>
          <LzyBtn
            icon="icon-park:file-code"
            :title="(logData.isOnScroll ? '关闭' : '开启') + '日志滚动'"
            @click="logData.isOnScroll = !logData.isOnScroll"
          ></LzyBtn>
          <LzyBtn
            icon="icon-park:clear"
            title="清空日志"
            @click="el.onClearSystemLog()"
          ></LzyBtn>
        </section>
      </div>
    </ul>
    <div class="addMain">
      <h1 style="text-align: center; padding-bottom: 20px">
        欢迎使用
        <img src="../../public/logo.png" width="40" height="40" />
        <span class="av">AudioVideo_Gain</span>
      </h1>
      <el-form
        ref="form"
        :model="sizeForm"
        label-width="auto"
        label-position="left"
        size="large"
      >
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
          <el-input
            v-model="sizeForm.url"
            :autosize="{ minRows: 3, maxRows: 5 }"
            type="textarea"
            spellcheck="false"
          />
        </el-form-item>
        <el-form-item label="下载线程">
          <el-input v-model="sizeForm.thread" type="number" max="50" min="1" />
        </el-form-item>
        <el-form-item class="sumbit">
          <!-- v-show="speedDownload" -->
          <span style="text-align: left">下载速度：{{ speedDownload }}/s</span>
          <el-progress :text-inside="true" :percentage="percentage" />
          <div class="timeSpeed">
            <p>{{ storeData.downLoadAfter }}/{{ storeData.downloadCount }}</p>
            <p>{{ downloadTime }}</p>
          </div>

          <button class="button download" @click="onSubmit" type="button">
            <span class="button__text"
              >{{ isStartDown ? "暂停" : "开始" }}下载</span
            >
            <span class="button__icon">
              <svg
                class="svg"
                fill="none"
                height="24"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <line x1="12" x2="12" y1="5" y2="19"></line>
                <line x1="5" x2="19" y1="12" y2="12"></line>
              </svg>
            </span>
          </button>
        </el-form-item>
      </el-form>
      <el-button
        @click="addAlternate"
        type="primary"
        style="border-radius: 10px"
      >
        添加备选(备选内容会在下载完成后进行按顺序下载)
      </el-button>
      <div class="alternateList">
        <el-card
          shadow="never"
          v-for="(item, index) in alternateArr"
          :key="index"
        >
          <p>{{ index + 1 }}</p>
          <el-form-item label="番号名字">
            <div class="alterTools">
              <el-input v-model="item.name" spellcheck="false" />
              <el-button type="primary" @click="useAlternate(item)"
                >更换备选</el-button
              >
            </div>
          </el-form-item>
          <el-form-item label="下载地址">
            <div class="alterTools">
              <el-input v-model="item.url" spellcheck="false" />
              <el-button
                type="primary"
                @click="() => alternateArr.splice(index, 1)"
              >
                删除
              </el-button>
            </div>
          </el-form-item>
        </el-card>
      </div>
    </div>
    <div class="footer">
      <el-collapse class="collapse" v-model="activeNames" :accordion="true">
        <el-collapse-item
          v-for="(item, index) in handleHistory(newPage)"
          :key="index"
          :title="item.name"
          :name="index"
        >
          <div>
            {{ item.url }}
          </div>
        </el-collapse-item>
      </el-collapse>
      <!-- 分页按钮 -->
      <div style="text-align: center; margin-top: 10px">
        <el-pagination
          layout="prev, pager, next"
          :total="downloadHistory.length"
          :page-size="15"
          @current-change="newPage = $event"
        />
      </div>
    </div>
  </div>
</template>

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
  position: relative;

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
    }
  }
  .systemLog {
    position: absolute;
    bottom: 20px;
    display: grid;
    gap: 5px;
    width: 100%;
    & > div {
      overflow: auto;
      height: 200px;
      border: 2px solid var(--themeColor);
      border-radius: 10px;
      font-size: 12px;
      p {
        margin: 0;
        text-wrap: nowrap;
      }
    }
    & > section {
      display: grid;
      gap: 10px;
      grid-template-columns: 1fr 1fr;
    }
  }
}

.addWhole {
  display: grid;
  grid-template-columns: 300px 1fr 400px;
  padding: 10px 0;
}

.addMain {
  height: 93%;
  display: grid;
  grid-template-rows: 60px 345px 1fr;
  gap: 20px;
  user-select: none !important;
  padding: 30px;
  padding-top: 0;

  h1 {
    margin: 0;
    text-align: center;
    padding-bottom: 20px;
    background: var(--themeColor);
    color: #fff;
    line-height: 60px;
    border-radius: 10px;
  }

  input {
    user-select: auto !important;
  }

  :deep(.el-collapse-item__content) {
    user-select: auto !important;
  }

  .el-form {
    padding-top: 20px;
  }

  .sumbit :deep(.el-form-item__content) {
    justify-content: end;
    gap: 10px;
    display: grid;
    grid-template-columns: 160px 1fr 80px 130px;
    span {
      text-align: center;
      color: #fff;
    }
    .timeSpeed {
      height: 30px;
      display: grid;
      grid-template-rows: 1fr 1fr;
      text-align: center;
      box-shadow: 3px 2px 1px #000;
      border: 1px solid #000;
      border-radius: 5px;
      background-color: #eeeeee;
      padding: 2.5px;
      p {
        margin: 0;
        height: 15px;
        line-height: 15px;
        font-family: "almama";
        color: #000;
      }
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
        font-family: "dindin";
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

  :deep(.el-form-item--large) {
    .el-form-item__label,
    span {
      font-family: "almama";
      color: #000 !important;
    }
  }
}

.footer {
  // overflow-y: scroll;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 10px;
  height: calc(100vh - 60px);
  display: grid;
  grid-template-rows: 1fr 40px;

  :deep(.el-collapse) {
    height: 720px;

    .el-collapse-item {
      width: 380px;

      button {
        font-size: 11px;
        line-height: 15px;
        text-align: left;
        user-select: all;
        cursor: text;
        word-wrap: break-word;
        /* 超出两行则显示省略号 */
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
      }

      .el-collapse-item__content div {
        word-wrap: break-word;
        user-select: all;
      }
    }
  }

  :deep(.el-pagination) {
    justify-content: center;
  }
}

.el-progress--line {
  :deep(.el-progress-bar__outer) {
    height: 20px !important;
    background-color: #000;

    .el-progress-bar__inner {
      background-image: linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%);
      margin: 3px;
      max-width: 99%;
      height: 70%;
    }

    .el-progress-bar__innerText {
      // color: var(--hoverColor);
      &::before {
        content: "下载进度：";
        font-family: "almama";
      }
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
  transform: scale(0.7);

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

.el-button,
.button {
  width: 100%;
  font-family: "dindin";
}
</style>
