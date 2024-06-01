<script setup lang="ts">
import { onMounted, ref, reactive, watch } from "vue";
import Plyr from "plyr";
import { useRouter } from "vue-router";
import LzyIcon from "@/components/LzyIcon.vue";
import { ElMessage } from "element-plus";
import { Videodatalist } from "./Home";
import type { listVideoHasObj } from "./Home";
import { LzyAlert, LzyConfirm } from "@/utils/index";

const {
  onHandleStoreData,
  onHandleOpenDir,
  onGetListData,
  onCreateDir,
  onHandleDeleteFile,
  onHandleStarVideo,
  onGetAllDirPath,
  onRepairCover,
} = window.myElectron;

onMounted(() => {
  let player: any;
  try {
    player = new Plyr("#video", {
      disableContextMenu: false,
      /* selected：默认播放速度。options：在 UI 中显示的速度选项。YouTube 和 Vimeo 将忽略 0.5-2 范围之外的任何选项，因此该范围之外的选项将自动隐藏。 */
      // selected: 1,
      // options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 4],
      /* enabled：允许使用本地存储来存储用户设置。key：要使用的键名称。 */
      enabled: true,
      displayDuration: false,
      // key: "plyr",
      /* 将当前时间显示为倒计时而不是增量计数器。 */
      invertTime: true,
      //快捷键 启用
      keyboard: {
        focused: true,
        global: true,
      },
      storage: {
        enabled: true,
        key: "plyr",
      },
      /* 默认音量 */
      volume: 0.5,
      /* 快进时间 */
      seekTime: 10,
      /* 播放速度 */
      speed: {
        selected: 1,
        options: [0.75, 1, 1.5, 2, 2.5],
      },
    });
  } catch (err) {
    console.log(err);
  }
  window!.player = player;
  setTimeout(async () => {
    //获取video元素
    const videoElement = document.getElementById("video");
    if (videoElement instanceof HTMLVideoElement) {
      videoElement.style.display = "block";
      const div = document.createElement("div");
      div.classList.add("plyr__title");
      div.innerText = videoElement.title;
      videoElement.insertAdjacentElement("afterend", div);
    }

    // 监听播放速度的改变事件
    player.on("ratechange", function () {
      // 将新的播放速度保存到localStorage
      localStorage.setItem("playbackRate", player.speed);
    });

    //判断是否存在文件夹路径 存在则获取视频数据
    if (dirPath.cover.path && dirPath.video.path && dirPath.preview.path) {
      // 初始化数据
      await configVideoListData();
    } else {
      setDialog.value = true;
    }

    player.speed = localStorage.getItem("playbackRate") || 1.25;
  }, 500);
});
const router = useRouter(); //路由
const setDialog = ref(false); //设置弹窗
const listDialog = ref(false); //目录弹窗
const video = ref(""); //视频
const videoDataList = ref<Videodatalist[]>([]); //视频列表
const listVideoHasObj = reactive<listVideoHasObj>({
  //视频目录列表
  showPreview: [],
  filters: [],
});
const search = ref(""); //搜索

const toolHandle = [
  {
    tipsContent: "添加",
    icon: "basil:add-outline",
    handle: () => {
      router.push("/add");
    },
  },
  {
    tipsContent: "修复封面",
    icon: "basil:slack-outline",
    handle: () => {
      onRepairCover();
    },
  },
  {
    tipsContent: "目录列表",
    icon: "basil:book-outline",
    handle: () => {
      listDialog.value = true;
    },
  },
  {
    tipsContent: "设置",
    icon: "basil:settings-alt-outline",
    handle: () => {
      setDialog.value = true;
    },
  },
];

// 获取当前所有的文件夹配置路径 如果不存在则弹出设置弹窗
const dirPathArr = await onGetAllDirPath();
if (!dirPathArr.coverPath) {
  setDialog.value = true;
}

//获取本地存储的数据
const dirPath = reactive<{
  [key: string]: { path: string; name: string; icon: string };
  cover: { path: string; name: string; icon: string };
  preview: { path: string; name: string; icon: string };
  video: { path: string; name: string; icon: string };
  videoDownload: { path: string; name: string; icon: string };
}>({
  cover: {
    path: (await onHandleStoreData("coverPath")) || "",
    name: "封面文件夹地址",
    icon: "basil:folder-open-outline",
  },
  preview: {
    path: (await onHandleStoreData("previewPath")) || "",
    name: "预览文件夹地址",
    icon: "basil:folder-open-outline",
  },
  video: {
    path: (await onHandleStoreData("videoPath")) || "",
    name: "视频文件夹地址",
    icon: "basil:folder-open-outline",
  },
  videoDownload: {
    path: (await onHandleStoreData("downloadPath")) || "",
    name: "下载文件夹地址",
    icon: "basil:folder-open-outline",
  },
});

//获取文件夹路径 并存储到本地
const getDirPath = async (type: string | number) => {
  dirPath[type].path = (await onHandleOpenDir()) || dirPath[type].path;
};
// 将目录路径保存到存储
const saveDirPath = async () => {
  await onHandleStoreData({ coverPath: dirPath.cover.path });
  await onHandleStoreData({ previewPath: dirPath.preview.path });
  await onHandleStoreData({ videoPath: dirPath.video.path });
  await onHandleStoreData({ downloadPath: dirPath.videoDownload.path });
  setDialog.value = false;
  // 刷新视频数据
  await configVideoListData();
};

//创建文件夹
const createDirFn = async () => {
  let userSelectPath = await onHandleOpenDir();
  for (let key of ["cover", "preview", "video", "videoDownload"]) {
    await onCreateDir(userSelectPath + "\\" + key);
    dirPath[key].path = userSelectPath + "\\" + key;
  }
  await saveDirPath();
};

//选中父目录
const selectDir = async () => {
  let userSelectPath = await onHandleOpenDir();
  for (let key of ["cover", "preview", "video", "videoDownload"]) {
    dirPath[key].path = userSelectPath + "\\" + key;
  }
  await saveDirPath();
};

//鼠标移入移出事件
const handleMouse = (type: string, index: number) => {
  if (type === "enter") {
    listVideoHasObj.showPreview[index] = true;
  } else if (type === "leave") {
    listVideoHasObj.showPreview[index] = false;
  } else if (type === "click") {
    video.value = videoDataList.value[index].url;
    listDialog.value = false;
    document.querySelector(".plyr__title")!.innerHTML =
      videoDataList.value[index].name;
  }
};

const searchHandle = () => {
  // 循环使用videoDataList数组，并为过滤器数组分配一个新值
  videoDataList.value.forEach((item, index) => {
    // 如果项目名称包含搜索值，则指定true，否则指定false
    listVideoHasObj.filters[index] = item.name.includes(search.value);
  });
};
async function configVideoListData() {
  // 获取视频数据
  try {
    videoDataList.value = await onGetListData();
    console.log(`lzy  videoDataList.value:`, videoDataList.value);
  } catch (err) {
    LzyAlert({
      title: "温馨提示",
      content: "视频文件夹路径错误，请重新设置",
      type: "warning",
      confirmButtonText: "确定",
      confirm: () => {
        setDialog.value = true;
      },
    });
  }
  // 初始化视频数据
  listVideoHasObj.showPreview.length = videoDataList.value.length;
  listVideoHasObj.filters.length = videoDataList.value.length;
  listVideoHasObj.filters.fill(true);
  // 初始化视频播放
  video.value = videoDataList.value[0].url;
  document.querySelector(".plyr__title")!.innerHTML =
    videoDataList.value[0].name;
}

const deleteFile = (item: any, index: any) => {
  LzyConfirm({
    title: "温馨提示",
    content: "是否删除该视频",
    type: "error",
    confirmButtonText: "确定",
    confirm: async () => {
      await onHandleDeleteFile(item.url);
      ElMessage({
        type: "success",
        message: "删除成功",
      });
      await configVideoListData();
    },
    error: () => {
      ElMessage({
        type: "error",
        message: "删除失败",
      });
    },
  });
};
//收藏视频
const starVideo = async (item: Videodatalist) => {
  onHandleStarVideo(item.name);
  ElMessage({
    type: "success",
    message: "收藏成功",
  });
  await configVideoListData();
};
</script>

<template>
  <div class="common-layout">
    <el-container>
      <el-main>
        <div class="toHref">
          <LzyBtn
            v-for="(item, index) in toolHandle"
            :key="index"
            :icon="item.icon"
            :tipsContent="item.tipsContent"
            :handle="item.handle"
          ></LzyBtn>
          <div class="search">
            <ElInput
              v-model="search"
              @keydown.enter="searchHandle"
              size="small"
            >
            </ElInput>
            <LzyBtn
              class="lzyIcon"
              icon="basil:search-outline"
              :handle="searchHandle"
            ></LzyBtn>
          </div>
        </div>
        <div class="videoContent">
          <video
            id="video"
            :src="video"
            style="display: none"
            controls
            crossorigin=""
            playsinline
            poster=""
          >
            <source type="video/mp4" />
          </video>
        </div>
      </el-main>
      <el-aside class="coverList" width="400px">
        <ul>
          <li
            v-for="(item, index) in videoDataList"
            :key="index"
            @mouseenter="handleMouse('enter', index)"
            @mouseleave="handleMouse('leave', index)"
            @click="handleMouse('click', index)"
            v-show="listVideoHasObj.filters[index]"
            :class="{ star: item.isStar, acitve: item.url == video }"
          >
            <video
              v-if="listVideoHasObj.showPreview[index]"
              autoplay
              muted
              :src="item.preview"
            ></video>
            <img v-lazy v-else :src="item.cover" alt="" />
            <h4>
              {{ item.name }}
            </h4>
            <span class="index">
              <span> {{ index }}</span>
              <span>{{ item.datails.time }}</span>
              <span>{{ item.datails.size }}</span>
            </span>
            <div class="videoTools">
              <button class="starVideo" @click="starVideo(item)">
                <LzyIcon name="system-uicons:star-outline" />{{
                  item.isStar ? "取消收藏" : "收藏"
                }}
              </button>
              <button class="deleteFile" @click="deleteFile(item, index)">
                删除
              </button>
            </div>
          </li>
        </ul>
      </el-aside>
    </el-container>
    <el-dialog
      v-model="setDialog"
      :close-on-click-modal="false"
      title="设置"
      width="40%"
    >
      <div class="content">
        <p v-for="(item, index) in dirPath" :key="index">
          <span>{{ item.name }}</span>
          <input @click="getDirPath(index)" v-model="item.path" />
          <LzyIcon
            :name="item.icon"
            title="打开文件夹"
            style="vertical-align: -7.5"
          />
        </p>
      </div>
      <template #footer>
        <LzyBtn
          @click="createDirFn"
          title="一键生成文件夹"
          icon="system-uicons:episodes"
        ></LzyBtn>
        <LzyBtn
          @click="saveDirPath"
          title="保存"
          icon="basil:save-outline"
        ></LzyBtn>
        <LzyBtn
          @click="selectDir"
          title="选择文件夹"
          icon="basil:folder-open-solid"
        ></LzyBtn>
      </template>
    </el-dialog>
    <el-dialog
      class="listContent"
      v-model="listDialog"
      :fullscreen="true"
      title="Warning"
      width="100%"
      align-center
    >
      <ul>
        <li
          v-for="(item, index) in videoDataList"
          :key="index"
          @mouseenter="handleMouse('enter', index)"
          @mouseleave="handleMouse('leave', index)"
          @click="handleMouse('click', index)"
          v-show="listVideoHasObj.filters[index]"
          :class="{ star: item.isStar }"
        >
          <video
            v-if="listVideoHasObj.showPreview[index]"
            autoplay
            muted
            :src="item.preview"
          ></video>
          <img v-else :src="item.cover" alt="" />

          <h4>
            {{ item.name }}
          </h4>
          <span class="index">
            <span> {{ index }}</span>
            <span>{{ item.datails.time }}</span>
            <span>{{ item.datails.size }}</span>
          </span>
        </li>
      </ul>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.el-main {
  padding: 10px;
  background-color: #000;
  border-radius: 10px;
}

.videoContent {
  position: relative;
  border-radius: 10px;

  #video {
    width: 100%;
    object-fit: contain;
    aspect-ratio: 16/9;
    /* 设置纵横比为 16:9 */
  }

  :deep(.plyr) {
    border-radius: 10px;
  }

  :deep(.plyr__title) {
    position: absolute;
    top: 0;
    left: 0;
    padding: 10px 15px;
    font-size: 16px;
    width: 100%;
    height: 50px;
    background: linear-gradient(to top, #0000, #000000bf);
    transition: opacity 0.4s ease-in-out, transform 0.4s ease-in-out;
    z-index: 2;
    color: #fff;
    user-select: all;
  }

  :deep(.plyr--hide-controls .plyr__title) {
    opacity: 0;
    pointer-events: none;
    transform: translateY(-100%);
  }
}

.toHref {
  height: 60px;
  display: flex;
  // place-items: center;
  padding-top: 10px;
  gap: 10px;

  .el-input,
  button {
    height: 30px;
  }
}

.search {
  position: relative;
  display: flex;

  .el-input {
    width: 400px;
  }

  .lzyIcon {
    position: absolute;
    right: 0;
    top: 10%;
    transform: translateY(-15%);
    margin: auto;
    padding: 0 5px;
    color: #000;
    background-color: transparent;
  }
}

.common-layout :deep(.el-overlay) {
  .el-dialog {
    background: #eee;
    border-radius: 10px;

    .el-dialog__body {
      background-color: #fff;

      // border-radius: 0 0 10px 10px;
      .content {
        height: 55vh;
        font-family: "dindin";
        font-size: 17px;

        p {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #e8e8e8;
          padding-bottom: 10px;

          span {
            flex: 1;
            user-select: none;
          }

          .lzyIcon {
            display: block;
            flex: 0.15;
          }

          input {
            flex: 2;
            border: 0;
            border-bottom: 1px solid var(--hoverColor);
            outline: initial;
            font-family: "dindin";
            color: var(--hoverColor);
          }
        }
      }
    }

    .el-dialog__footer {
      display: flex;
      gap: 10px;
      justify-content: space-between;
      padding: 10px 20px;
      border-top: 1px solid #e8e8e8;
    }
  }
}

.coverList {
  overflow: hidden;
  padding: 10px;
  padding-top: 0;
  height: 100vh;
  ::-webkit-scrollbar {
    width: 20px;
    height: 8px;
    background-color: rgb(245, 245, 245);
  }
}

:deep(.listContent) {
  ul {
    grid-template-columns: repeat(5, 1fr);
    height: calc(100vh - 100px);

    li {
      display: grid;
      grid-template-rows: 200px 1fr 20px;
    }
  }

  & > div.el-dialog__body {
    height: 93vh;
    padding: 5px;
  }
}

ul {
  height: calc(100vh - 65px);
  user-select: none;
  display: grid;
  gap: 10px;
  overflow: hidden;
  border-radius: 10px;
  padding: 5px 0;
  overflow-y: scroll;
  overflow-x: hidden;

  li {
    list-style: none;
    flex-shrink: 0;
    /* 设置为 0，禁止收缩 */
    cursor: pointer;
    border-radius: 10px;
    padding: 5px;
    position: relative;
    margin: 0 5px;
    box-shadow: 0 2px 3px rgba(0, 0, 0, 0.1), 0 -1px 1px rgba(0, 0, 0, 0.1);
    border: 3px solid transparent;
    display: grid;
    grid-template-rows: 210px 1fr 20px 30px;
    gap: 10px;

    &.star {
      border: 3px solid #db4080;

      &::after {
        content: "收藏";
        position: absolute;
        top: 0;
        right: 0;
        background-color: #db4080;
        color: #fff;
        font-size: 15px;
        font-family: "almama";
        padding: 0 20px;
        border-radius: 0 0 0 10px;
      }
    }

    &.acitve {
      border: 3px solid var(--themeColor);
    }

    video,
    img {
      height: 210px;
      width: 328px;
    }

    .videoTools {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      padding: 0 5px;

      .starVideo {
        background-color: var(--themeColor);
      }

      .deleteFile {
        background-color: rgb(255, 74, 74);
      }

      button {
        color: #fff;
        border-radius: 0.5rem;

        &:hover {
          backdrop-filter: brightness(11);
        }
      }
    }

    h4 {
      /* height: 135px; */
      font-size: 14px;
      color: #000;
      border-radius: 10px;
      transform: translateY(0);
      transition: 0.3s transform ease-in-out;
      user-select: text;
      margin: 0;
      word-break: break-all;
    }

    & :where(img, video) {
      width: 100%;
      height: 200px;
      border-radius: 10px;
      object-fit: cover;
    }

    .index {
      display: flex;
      justify-content: space-between;
      background-color: #000000;
      height: 20px;
      font-size: 12px;
      padding: 0 5px;
      border-radius: 5px;
      text-align: center;
      line-height: 20px;
      color: #fff;
    }
  }
}
</style>
