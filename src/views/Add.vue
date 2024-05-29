<script lang="ts" setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { ElNotification, dayjs } from "element-plus";
import LzyIcon from "@/components/LzyIcon.vue";
import { useStorage } from "@vueuse/core";
import duration from "dayjs/plugin/duration";
import {
  formatFileSize,
  handleLogData,
  handleEchart,
  getVideoId,
} from "@/utils";

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
downloadHistory.value = downloadHistory.value.filter((res: any) => res.name);

const sizeForm = useStorage("sizeForm", {
  resource: "axios", //来源
  name: "", //视频名称
  url: "", //m3u8链接
  thread: 50, //下载进程数量
  isAutoTask: true, //是否开启自动替换任务
  isConcurrency: true, //是否开启高并发下载
  outTimer: 10, //超时重下时间
});
const codeValue = reactive({
  value: "",
  isShow: false,
});
//检测番号是否存在
const onInspectId = async (name?: string, index?: number) => {
  let id = typeof name === "string" ? name : codeValue.value;
  if (!id) return;
  id = getVideoId(id)!;

  //如果存在番号，则将isShow设置为true
  codeValue.isShow = await el.onInspectId(id);
  if (name && codeValue.isShow) {
    return ElNotification({
      title: "番号检测",
      message: `番号已存在-${index ? index : "未知"}:${id}`,
      type: "error",
    });
  } else if (!name) {
    ElNotification({
      title: "番号检测",
      message: codeValue.isShow ? "番号已存在" : "番号不存在",
      type: codeValue.isShow ? "error" : "success",
    });
  }
};
//检测所有备选番号在视频文件夹中是否存在
const inspectAllId = async () => {
  alternateArr.value.forEach(async (res, index) => {
    await onInspectId(res.name, index + 1);
  });
};

//获取本地存储中的下载进度
const storeData = ref(await el.onGetDownloadProgress(sizeForm.value.name));

const alternateArr = useStorage("alternateArr", [{ name: "", url: "" }]);

// 监听 alternateArr.value 的变化
watch(
  () => alternateArr.value,
  (val) => {
    // 过滤掉没有 name 属性的项
    const arr = val.filter((res) => {
      if (res.name) {
        return res;
      }
    });
    // 获取过滤后数组的最后一个元素
    const afterValue = arr[arr.length - 1];
    if (!afterValue) return;
    // 根据最后一个元素的 name 获取视频 ID
    const afterId = getVideoId(afterValue.name)!;
    // 如果无法获取到 ID，则直接返回
    if (!afterId) return;

    // 遍历数组，检查新增的内容是否已经存在于数组中（除最后一个元素）
    arr.forEach((res, index) => {
      if (index === arr.length - 1) return; // 跳过最后一个元素
      // 获取当前元素基于 name 的视频 ID
      const id = getVideoId(res.name)!;
      // 如果当前元素的 name 存在，并且其 ID 与最后一个元素的 ID 相同
      if (res.name && id == afterId) {
        // 显示错误通知，提示该视频 ID 已存在于备选中的某个位置
        ElNotification({
          title: "番号检测",
          message: afterId + "番号已存在与备选中;位置在" + (index + 1) + "号",
          type: "error",
        });
      }
    });
    //将所有内容存入系统文件存储中
    appStoreData("alternateArr", arr);
  },
  {
    deep: true, // 深度监听 alternateArr.value 的变化
  }
);

/**
 * 计算并返回下载进度的百分比。
 * 该计算属性不接受任何参数。
 *
 * @returns {Number} 返回下载进度的百分比。如果未开始下载或下载量为0，则返回0。
 */
const percentage = computed(() => {
  // 如果下载后文件大小为0，直接返回0，表示没有下载进度
  if (storeData.value.downLoadAfter === 0) return 0;
  // 计算下载进度的百分比，并保留两位小数
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

let timer: any;

//下载时间计时器
const counter = reactive({
  oldValue: 0,
  newValue: 0,
  videoName: "",
});

const downloadTime = computed(() => {
  return dayjs
    .duration(Math.max(0, counter.newValue - counter.oldValue), "seconds")
    .format("HH:mm:ss");
});

//将下载数据存入系统文件存储中
const appStoreData = (key: string, value: any) => {
  el.onHandleStoreData({ [key]: JSON.stringify(value) });
};

async function onSubmit() {
  let downLoadAfterCopy: number[] = [];
  isStartDown.value = !isStartDown.value;
  timer && clearInterval(timer);
  if (!isStartDown.value) {
    await el.pauseDownloadEvent();
    return "";
  }

  const { name, url } = sizeForm.value;
  if (!name || !url) return;
  if (!hasName(name)) {
    // 将对象转换为JSON字符串，并通过onHandleStoreData方法传递给el
    appStoreData("DownLoadForm", { ...sizeForm.value });
    downloadHistory.value.unshift({ ...sizeForm.value });
    appStoreData("downloadHistory", downloadHistory.value);
  }
  if (counter.videoName != name) {
    counter.oldValue = dayjs().unix();
    counter.videoName = name;
  }
  let downLoadAfterNumber = 0;
  timer = setInterval(async () => {
    // 等待元素的下载进度信息
    storeData.value = await el.onGetDownloadProgress(name);
    // 从返回的进度信息中解构出当前下次数量和需要下载总数量
    const { downLoadAfter: after, downloadCount: count } = storeData.value;
    // 如果下载完成时间的计数器不存在，则初始化为1；否则，计数器加1
    if (!downLoadAfterCopy[after]) {
      downLoadAfterCopy[after] = 1;
    } else {
      downLoadAfterCopy[after] += 1;
    }
    // 设置当前时间戳为计数器的新值
    counter.newValue = dayjs().unix();
    //如果downLoadAfterCopy的前五项之和 超过outTimer，则重新开始下载
    const newTimer = downLoadAfterCopy
      .slice()
      .sort((a, b) => b - a)
      .slice(0, 5)
      .reduce((a, b) => a + b, 0);
    console.log(`lzy  newTimer:`, newTimer);
    if (newTimer > sizeForm.value.outTimer) {
      timer && clearInterval(timer);
      isStartDown.value = false;
      //重新开始下载
      return onSubmit();
    } else {
      // 更新下载列表内容
      getDownloadListContent();
      updateSpeedDownload();
      downLoadAfterNumber = storeData.value.downLoadAfter;
    }

    // 判断是否下载完成
    if (after == count || downLoadAfterCopy.length === 0) {
      timer && clearInterval(timer);
      //视频下载完成后，将视频进行合并
      await onMergeVideo();
      counter.oldValue = 0;
      counter.newValue = 0;
      isStartDown.value = false;

      setTimeout(() => {
        getDownloadListContent(); //更新下载列表
        updateSpeedDownload(); //更新下载速度
        // el.onClearSystemLog(); // 清空日志
        onAutoReplaceTask(); //判断是否开启自动替换任务
      }, 1000);
    }
  }, 1000);
  try {
    //开始下载任务
    await el.downloadVideoEvent({
      ...sizeForm.value,
      downPath,
      previewPath,
      coverPath,
      videoPath,
    });
  } catch (err) {
    console.error(err);
  }
}

//下载完成后自动替换名字链接
function onAutoReplaceTask() {
  // 将备选内容第一个赋值给sizeForm 并删除备选内容 然后开始下载下一个
  if (alternateArr.value.length > 0 && sizeForm.value.isAutoTask) {
    sizeForm.value.name = alternateArr.value[0].name;
    sizeForm.value.url = alternateArr.value[0].url;
    alternateArr.value.splice(0, 1);
    onSubmit();
  }
}

//判断是否已经存在该名称
function hasName(name: string) {
  let result = false;
  downloadHistory.value.forEach((res: any) => {
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
  fileDirlist.value.sort((a: any, b: any) => {
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
  console.log(`lzy  name:`, name);
  const msg = await el.onMergeVideo({
    name,
  });
}

let oldSize = 0;
// 更新速度下载值的函数
const updateSpeedDownload = () => {
  let totalSize = 0;
  fileDirlist.value.forEach((res: any) => {
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
  fileDirlist.value.forEach((res: any) => {
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
const useAlternate = (item: any) => {
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
  arr: [] as any[], //日志数组
  workerEchart: null as any, //echart图表
});

const getSystemLog = async () => {
  const systemLog = document.querySelector(".systemLog > div") as HTMLElement;
  // await el.onClearSystemLog();
  logData.logTimer && clearInterval(logData.logTimer);
  logData.logTimer = setInterval(async () => {
    const res = await el.onGetSystemLog();
    logData.value = res.split("<br/>");
    logData.arr = res
      .split("<br/>")
      .filter((res: any) => res.includes("正在下载"));
    //如果日志内容超过100条，则只显示最新的100条
    if (logData.value.length > 100) {
      logData.value = logData.value.slice(logData.value.length - 100);
    }
    //@ts-ignore
    logData.value.reverse();
    //如果自动滚动条开启，则将滚动条滚动到最底部
    if (!logData.isOnScroll) return;
    //将滚动条滚动到最底部
    try {
      systemLog.scrollTop = systemLog.scrollHeight;
    } catch (e) {}
    //设置进程下载进度echart图表
    logData.workerEchart.setOption({
      series: [
        {
          data: handleLogData(logData.arr),
        },
      ],
    });
  }, 500);
};
await getSystemLog();

onMounted(() => {
  logData.workerEchart = handleEchart(sizeForm.value, logData);
});

onBeforeUnmount(async () => {
  //将日志定时器清除
  logData.logTimer && clearInterval(logData.logTimer);
  timer && clearInterval(timer);
  if (isStartDown.value) {
    //暂停下载
    await el.pauseDownloadEvent();
  }
});
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
      <li class="dirContent">
        <p class="text" v-for="(item, index) in fileDirlist" :key="index">
          <span>
            <lzy-icon name="ph:file-ts"></lzy-icon>
            {{ item.name }}
          </span>
          <span>{{ formatFileSize(item.state) }}</span>
        </p>
      </li>
      <li class="tools">
        <LzyBtn
          @click="getDownloadListContent"
          title="刷新"
          icon="ant-design:reload-outlined"
        ></LzyBtn>
        <LzyBtn
          @click="deleteDirFile"
          title="清空"
          icon="ant-design:delete-twotone"
        ></LzyBtn>
        <LzyBtn
          :title="getDownloadSize()"
          @click="onOpenDir"
          icon="ic:baseline-insert-chart-outlined"
        ></LzyBtn>
        <LzyBtn
          @click="onMergeVideo()"
          title="合成"
          icon="gg:merge-horizontal"
        ></LzyBtn>
      </li>
      <div class="systemLog">
        <div class="speedEcharts"></div>
        <div class="logContent">
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
      <!-- <h1 style="text-align: center; padding-bottom: 20px">
        欢迎使用
        <img src="../../public/logo.png" width="40" height="40" />
        <span class="av">AudioVideo_Gain</span>
      </h1> -->
      <el-form
        ref="form"
        :model="sizeForm"
        label-width="auto"
        label-position="left"
        size="large"
      >
        <el-form-item label="资源来路">
          <el-radio-group v-model="sizeForm.resource">
            <el-radio border label="axios" />
            <el-radio border label="superagent" />
            <el-input
              v-model="codeValue.value"
              placeholder="输入番号检测"
              style="display: inline; width: 30%"
              @keyup.enter="onInspectId"
            />
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
        <el-form-item label="下载线程" class="downloadSet">
          <el-input v-model="sizeForm.thread" type="number" max="50" min="1" />
          <div class="outTimer">
            超时时间
            <el-input v-model="sizeForm.outTimer" type="number">
              <template #append>s</template>
            </el-input>
          </div>
          <div class="isAutoTask">
            自动替换
            <el-switch
              v-model="sizeForm.isAutoTask"
              active-text="是"
              inactive-text="否"
            />
          </div>
          <div class="isConcurrency">
            高并发
            <el-switch
              v-model="sizeForm.isConcurrency"
              active-text="是"
              inactive-text="否"
            />
          </div>
        </el-form-item>
        <el-form-item class="sumbit">
          <!-- v-show="speedDownload" -->
          <span style="text-align: left">下载速度：{{ speedDownload }}/s</span>
          <el-progress :text-inside="true" :percentage="percentage" />
          <div class="timeSpeed">
            <p>{{ storeData.downLoadAfter }}/{{ storeData.downloadCount }}</p>
            <p>{{ downloadTime }}</p>
          </div>
        </el-form-item>
        <ElFormItem>
          <button
            :class="['button', 'download', isStartDown ? 'start' : 'stop']"
            @click="onSubmit"
            type="button"
          >
            <lzy-icon
              :name="
                isStartDown
                  ? 'solar:play-circle-broken'
                  : 'solar:download-square-broken'
              "
              style="font-weight: 600"
            ></lzy-icon>
            <span>{{ isStartDown ? "暂停" : "开始" }}下载</span>
          </button>
        </ElFormItem>
      </el-form>
      <div class="alternateTools">
        <el-button
          @click="addAlternate"
          type="primary"
          style="border-radius: 10px"
        >
          添加备选(备选内容会在下载完成后进行按顺序下载)
        </el-button>
        <el-button
          @click="inspectAllId"
          type="primary"
          style="border-radius: 10px"
        >
          检查备选({{ alternateArr.length }}条)
        </el-button>
      </div>
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
      <div class="echartMain"></div>
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
      display: grid;
      max-height: 300px;
      overflow-y: scroll;

      p.text {
        width: 95%;
        margin: 0;
        display: flex;
        justify-content: space-between;
      }
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
    div.speedEcharts {
      height: 200px;
      border: 2px solid var(--themeColor);
      border-radius: 10px;
    }
    & > div.logContent {
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
  height: 98%;
  display: grid;
  grid-template-rows: 325px 30px 440px 1fr;
  gap: 10px;
  user-select: none !important;
  padding: 0 30px;

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
  .downloadSet :deep(.el-form-item__content) {
    display: grid;
    grid-template-columns: 100px 200px 180px 150px;
    gap: 10px;
    font-family: "almama";
    color: #000 !important;
    div.isAutoTask,
    div.isConcurrency {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
    }
    .outTimer {
      display: flex;
      gap: 10px;
      .el-input {
        width: 65%;
      }
    }
  }

  .sumbit :deep(.el-form-item__content) {
    justify-content: end;
    gap: 10px;
    display: grid;
    grid-template-columns: 160px 1fr 80px;
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
  .alternateTools {
    display: grid;
    gap: 10px;
    grid-template-columns: 1fr 1fr;
  }
  .alternateList {
    overflow-y: scroll;
    &::-webkit-scrollbar {
      width: 11px;
    }
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
    margin-bottom: 10px;
    .el-form-item__label,
    span {
      font-family: "almama";
      color: #000 !important;
    }
  }

  .echartMain {
    height: calc(100% - 10px);
    border-radius: 10px;
    box-shadow: 0 0 1px 1px rgba(59, 48, 78, 0.3);
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
      margin: 2px;
      max-width: 99%;
      height: 75%;
    }

    .el-progress-bar__innerText {
      // color: var(--hoverColor);
      &::before {
        content: "下载进度：";
        font-family: "almama";
      }
      span {
        color: #fff !important;
      }
    }
  }
}

.download.button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 17px;
  padding: 10px 20px;
  color: white;
  background: var(--themeColor);
  border: none;
  box-shadow: 0 0.17em 1px 1px rgba(59, 48, 78, 1);
  letter-spacing: 0.05em;
  border-radius: 8px;
  position: relative;
  justify-content: center;
  transition: all 0.3s;
  &.start {
    background: #22ffa3;
    color: #000;
  }

  svg {
    margin-right: 8px;
    width: 25px;
  }
  span {
    color: #fff !important;
  }

  &:hover {
    box-shadow: 0 0.5em 1.5em -0.5em rgba(88, 71, 116, 0.627);
  }

  &:active {
    box-shadow: 0 0.3em 1em -0.5em rgba(88, 71, 116, 0.627);
  }

  &::before {
    content: "";
    width: 5px;
    height: 40%;
    background-color: white;
    position: absolute;
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
    left: 0;
    transition: all 0.2s;
    box-shadow: 0 0.5em 1.5em -0.5em rgba(88, 71, 116, 0.627);
  }

  &::after {
    content: "";
    width: 5px;
    height: 40%;
    background-color: white;
    position: absolute;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
    right: 0;
    transition: all 0.2s;
    box-shadow: 0 0.5em 1.5em -0.5em rgba(88, 71, 116, 0.627);
  }

  &:hover {
    &::before,
    &::after {
      height: 60%;
      background-color: var(--hoverColor2);
    }
  }
}
</style>
