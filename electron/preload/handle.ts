
import { contextBridge, ipcRenderer } from 'electron'


const validChannels = [
  // 窗口操作
  'onHandleWin',
  // 获取文件夹路径
  'onHandleOpenDir',
  //存储数据进入系统存储文件夹
  'onHandleStoreData',
  //获取视频列表数据
  'onGetListData',
  //下载视频
  'downloadVideoEvent',
  //暂停下载
  'pauseDownloadEvent',
  //获取下载目录内容
  'getDownloadListContent',
  //清除文件夹内的内容
  'deleteDirFile',
  //创建文件夹
  'onCreateDir',
  //删除视频文件
  'onHandleDeleteFile',
  //合并视频
  'onMergeVideo',
  //打开文件夹
  'onOpenDir',
  //收藏视频
  'onHandleStarVideo',
  //获取当前所有的文件夹配置路径
  'onGetAllDirPath',
  //当添加页面初始进来时，发送下载的进度和总数回去
  'onGetDownloadProgress',
  // 获取系统日志
  'onGetSystemLog',
  //清空系统日志
  'onClearSystemLog'
]
console.log(`lzy  validChannels:`, validChannels)

const myElectron = {}
validChannels.forEach((channel) => {
  myElectron[channel] = (...args) => ipcRenderer.invoke(channel, ...args)
})


contextBridge.exposeInMainWorld('myElectron', myElectron)

ipcRenderer.on('download-progress', (event, progress) => {
  console.log(`lzy  progress:`, progress)

});






