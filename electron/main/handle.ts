import { ipcMain, dialog, nativeTheme, BrowserWindow, OpenDialogSyncOptions } from 'electron';
import type { App } from 'electron';
import fs from 'fs';
import path from 'path';
import https from 'https'
import {
  mkdirsSync,
  createSystemStore, formatFileSize, quickSortByTimestamp, storeData, getStoreData,
  checkFileFoundError, getFolderSize, downloadM3U8
} from '../utils/utils'; // 假设您有一个名为 'utils' 的模块用于创建目录
import { dayjs } from 'element-plus'
import { Worker } from "worker_threads";
import { merge } from '../utils/merge'
import m3u8Parser from 'm3u8-parser'

/**
 * @export
 * @class WindowManager
 */
export class WindowManager {
  private win: BrowserWindow;
  private app: App;
  private mainWindow: BrowserWindow
  private pathJson: {
    coverPath: string,
    previewPath: string,
    videoPath: string,
    downloadPath: string
  };
  private workerArr: Worker[];
  private downloadPlanArr: any;

  /**
   * Creates an instance of WindowManager.
   * @param {BrowserWindow} win
   * @param {App} app
   * @param {BrowserWindow} mainWindow
   * @memberof WindowManager
   */
  constructor(win: BrowserWindow, app: App, mainWindow: BrowserWindow) {
    this.win = win;
    this.app = app;
    this.mainWindow = mainWindow
    this.workerArr = []
    this.pathJson = {
      coverPath: '',
      previewPath: '',
      videoPath: '',
      downloadPath: ''
    }
    //下载计划数组
    this.downloadPlanArr = []
    // 注册事件监听
    this.registerHandleWin();//窗口操作
    this.registerHandleOpenDir()//获取文件夹路径
    this.registerHandleStoreData()//存储数据进入系统存储文件夹
    this.registerGetListData()//获取视频列表数据
    this.registerDownloadVideoEvent()//下载视频
    this.registerPauseDownload //暂停下载
    this.registerGetDownloadListContent()//获取下载目录内容
    this.registerDeleteDirFile()//清除文件夹内的内容
    this.registerCreateDir()//创建文件夹
    this.registerHandleDeleteFile()//删除视频文件
    this.registeronMergeVideo()//合并视频
    this.registerOpenDir()//打开文件夹
    this.registerHandleStarVideo()//收藏视频
    this.registerGetAllDirPath()//获取当前所有的文件夹配置路径
    this.registerGetDownloadProgress()//获取当前所有的视频路径
  }

  // 处理窗口操作请求
  private handleWinAction(arg: string): Promise<string> {
    return new Promise((resolve, reject) => {
      switch (arg) {
        case 'close':
          this.closeWindow(); // 关闭窗口
          resolve('success');
          break;
        case 'minimize':
          this.minimizeWindow(); // 最小化窗口
          resolve('success');
          break;
        case 'maximize':
          this.toggleMaximize(); // 最大化/还原窗口
          resolve('success');
          break;
        case 'changeTheme':
          this.toggleTheme(); // 切换主题
          resolve('success');
          break;
        default:
          reject(new Error('Invalid action'));
      }
    });
  }

  // 处理 onHandleWin 请求
  private onHandleWin(event: Electron.IpcMainInvokeEvent, arg: string): void {
    this.handleWinAction(arg)
      .then((response) => {
        event.sender.send('onHandleWin', response)
      })
      .catch((error) => {
        event.sender.send('onHandleWin', { error: error.message })
      });
  }

  // 注册 onHandleWin 事件监听
  private registerHandleWin(): void {
    ipcMain.handle('onHandleWin', this.onHandleWin.bind(this));
  }

  // 关闭窗口
  private closeWindow(): void {
    this.win = null!;
    if (process.platform !== 'darwin') this.app.quit();
  }

  // 最小化窗口
  private minimizeWindow(): void {
    this.win?.minimize();
  }

  // 切换最大化/还原窗口
  private toggleMaximize(): void {
    if (this.win?.isMaximized()) {
      this.win?.unmaximize();
    } else {
      this.win?.maximize();
    }
  }

  // 切换主题
  private toggleTheme(): void {
    nativeTheme.themeSource = nativeTheme.shouldUseDarkColors ? 'light' : 'dark';
  }

  //处理onHandleOpenDir事件
  private async onHandleOpenDir(event: Electron.IpcMainInvokeEvent, arg: string) {
    const paths = dialog.showOpenDialogSync(this.win, {
      title: '选择文件夹',
      properties: ['openDirectory'],
      modal: true  // 重要：确保模态对话框
    } as OpenDialogSyncOptions);

    // 如果用户点击了取消按钮或关闭了对话框，paths可能为undefined
    if (paths && paths.length > 0) {
      const selectedPath = paths[0];
      return selectedPath;
    } else {
      // 用户取消了选择，你可以在这里进行相应的处理
      return null; // 或者返回其他默认值或处理逻辑
    }
  }

  //注册onHandleOpenDir事件监听
  private registerHandleOpenDir(): void {
    ipcMain.handle('onHandleOpenDir', this.onHandleOpenDir.bind(this));
  }


  /**
   *  处理onHandleStoreData事件
   * @private
   * @param {Electron.IpcMainInvokeEvent} event
   * @param {(object | string)} arg
   * 1.如果是获取数据 则arg为string
   * 2.如果是存储数据 则arg为object
   */
  private async onHandleStoreData(event: Electron.IpcMainInvokeEvent, arg: object | string) {
    let data = arg, newdata

    const storePath = path.join(this.app.getPath('documents'), 'javPlayer')
    //如果是获取数据
    if (typeof data === 'string') {
      const storeFilePath = path.join(storePath, 'storeLog.json')
      const storeFile = fs.readFileSync(storeFilePath, 'utf-8')
      if (!storeFile) return null
      const json = JSON.parse(storeFile)
      return json[data]
    } else {
      //如果是存储数据
      // mkdirsSync(storePath)
      const storeFilePath = path.join(storePath, 'storeLog.json')
      const storeFile = fs.readFileSync(storeFilePath, 'utf-8')
      if (storeFile) {
        const storeData = JSON.parse(storeFile)
        newdata = Object.assign(storeData, data)
      } else {
        createSystemStore(this.app)
        newdata = data
      }
      fs.writeFileSync(storeFilePath, JSON.stringify(newdata), 'utf-8')
    }
  }
  //注册onHandleStoreData事件监听
  private registerHandleStoreData(): void {
    ipcMain.handle('onHandleStoreData', this.onHandleStoreData.bind(this));
  }
  //处理onGetListData事件
  private async onGetListData(event: Electron.IpcMainInvokeEvent, arg: string) {

    const { coverPath,
      previewPath,
      videoPath,
      starArr
    } = this.onGetAllDirPath(event, 'all')

    //获取视频列表 解决有些视频没有封面的问题
    const existArr = fs.readdirSync(videoPath)
    const coverList = fs.readdirSync(coverPath).map((file: any) => {
      if (!file.startsWith('.') && file.indexOf('Thumbs') == 0) return null
      if (file.indexOf('.png') == -1) {
        const name = file.split('.jpg')[0]
        //如果视频存在封面，将封面从数组中删除 以备后续下载
        if (existArr.indexOf(`${name}.mp4`) != -1) {
          existArr.splice(existArr.indexOf(`${name}.mp4`), 1)
        }

        let stat: any = null, datails: any = null
        try {
          stat = fs.statSync(`${videoPath}/${name}.mp4`)
          datails = {
            time: dayjs(stat.birthtimeMs).format("YYYY-MM-DD HH:mm"),
            size: formatFileSize(stat.size),
          }
        } catch (e) {
          stat = fs.statSync(`${coverPath}/${name}.jpg`)
          datails = {
            time: dayjs(stat.birthtimeMs).format("YYYY-MM-DD HH:mm"),
            size: formatFileSize(stat.size),
          }
        }
        return {
          stampTime: stat ? stat!.birthtimeMs : null,
          name: name,
          cover: `${coverPath}/${name}.jpg`,
          preview: `${previewPath}/${name}.mp4`,
          url: `${videoPath}/${name}.mp4`,
          datails,
          isStar: starArr.indexOf(name) != -1
        }
      } else {
        return null
      }
    }).filter((item) => item !== null);
    //将没有封面的视频封面进行下载
    existArr.forEach((item: any) => {
      const videoId = getVideoId(item)
      if (videoId) {
        const name = item.split('.mp4')[0]
        getPreviewVideo(videoId, name, 0, previewPath, coverPath)
      }
    })
    const videoListData = quickSortByTimestamp(coverList.filter((res) => res), 'stampTime', false)
    //如果是收藏视频，将收藏视频放在最后面
    return videoListData.filter((res) => !res.isStar).concat(videoListData.filter((res) => res.isStar))
  }
  //注册onGetListData事件监听
  private registerGetListData(): void {
    ipcMain.handle('onGetListData', this.onGetListData.bind(this));
  }

  // 处理在Electron应用中的视频下载事件的函数。
  private onDownloadVideoEvent(event: Electron.IpcMainInvokeEvent, arg: any) {
    const that = this;
    return new Promise(async (resolve, reject) => {
      // 设置应用和文档路径。
      const appPath = path.join(__dirname, `../../electron`);
      const docPath = path.join(this.app.getPath('documents'), 'javPlayer');

      // 解构从前端进程传入的参数。
      let { resource, name, url, thread, downPath, previewPath, coverPath, videoPath } = arg;
      // 获取HTTP请求头信息。
      const headers = getHeaders(resource);

      // 清洗和处理视频名称。
      name = sanitizeVideoName(name);

      //截取番号出来
      const designation = getVideoId(name)
      downPath = downPath + `/${designation}`;
      mkdirsSync(downPath);


      // 从M3U8 URL计算出需要下载的视频文件信息。
      const { urlPrefix, dataArr } = await processM3u8(url, headers, docPath);

      //将视频数量存入store中
      storeData(this.app, {
        'downloadCount': dataArr.length
      })

      // 检验SSL证书。
      if (dataArr.length === 0) {
        console.log('无法验证第一个证书');
        return resolve('无法验证第一个证书');
      }
      // 将M3U8数据分割为等份，按线程数分配。
      const countArr = splitArrayIntoEqualChunks(dataArr, thread);

      // 设置下载计划数组。
      that.downloadPlanArr = countArr;

      // 为不同的下载线程初始化Worker线程。
      for (let i = 0; i < thread; i++) {
        // 创建一个新的Worker线程实例，用于处理下载任务。
        const separateThread = new Worker(appPath + `\\seprate\\seprateThread${i + 1}.js`);
        // 向Worker线程发送任务信息，启动下载。
        separateThread.postMessage({
          urlData: countArr[i],
          index: i + 1,
          headers: headers,
          urlPrefix: urlPrefix,
          downPath: downPath,
          docPath: docPath
        });
        that.workerArr.push(separateThread);
      }
    });
  }
  //注册downloadVideoEvent事件监听
  private registerDownloadVideoEvent(): void {
    ipcMain.handle('downloadVideoEvent', this.onDownloadVideoEvent.bind(this));
  }


  //暂停下载
  private onPauseDownload(event: Electron.IpcMainInvokeEvent, arg: any) {
    //arg传入下载路径
    if (arg) {
      this.workerArr.forEach((worker) => {
        worker.terminate()
      })
    }
  }
  private registerPauseDownload(): void {
    ipcMain.handle('pauseDownload', this.onPauseDownload.bind(this));
  }

  //获取下载目录内容
  private onGetDownloadListContent(event: Electron.IpcMainInvokeEvent, arg: any) {
    let arr: any = []
    //arg传入下载路径
    if (arg) {
      arr = fs.readdirSync(arg).map(file => {
        return {
          state: getFolderSize(arg + "/" + file),
          name: file,
          downloadTime: dayjs(fs.statSync(arg + "/" + file).birthtimeMs).format("X")
        }
      })
    }
    return arr
  }

  private registerGetDownloadListContent(): void {
    ipcMain.handle('getDownloadListContent', this.onGetDownloadListContent.bind(this));
  }

  //清空文件夹内容 不删除父文件夹
  private onDeleteDirFile(event: Electron.IpcMainInvokeEvent, arg: any) {
    //arg传入下载路径
    if (arg) {
      try {
        fs.readdirSync(arg).forEach((file) => {
          //判断当前文件是否是文件夹
          if (fs.statSync(arg + '/' + file).isDirectory()) {
            fs.rmdirSync(arg + '/' + file, { recursive: true })
          } else {
            fs.unlinkSync(arg + '/' + file)
          }
        })
        return '删除成功'
      } catch (e: any) {
        return '删除失败'
      }
    }
  }

  private registerDeleteDirFile(): void {
    ipcMain.handle('deleteDirFile', this.onDeleteDirFile.bind(this));
  }

  //处理逻辑deleteDirFile
  private onCreateDir(event: Electron.IpcMainInvokeEvent, arg: any) {
    //arg传入下载路径
    if (arg) {
      fs.mkdirSync(arg)
    }
  }

  private registerCreateDir(): void {
    ipcMain.handle('onCreateDir', this.onCreateDir.bind(this));
  }

  private onHandleDeleteFile(event: Electron.IpcMainInvokeEvent, arg: any) {
    const name = arg
    const { videoPath, previewPath, coverPath } = this.pathJson
    fs.access(`${videoPath}/${name}.mp4`, (err) => {
      if (err) return console.log('文件不存在')
      try {
        fs.unlinkSync(`${videoPath}/${name}.mp4`)
      } catch (e: any) {
        //如果删除文件失败(文件占用)，就等待2分钟后再次删除
        if (e) console.log('删除文件失败', e.message)
        setTimeout(() => {
          fs.unlinkSync(`${videoPath}/${name}.mp4`)
        }, 500)
      }
    })

    fs.access(`${previewPath}/${name}.mp4`, (err) => {
      if (err) return console.log('文件不存在')
      fs.unlinkSync(`${previewPath}/${name}.mp4`)
    })
    fs.access(`${coverPath}/${name}.jpg`, (err) => {
      if (err) return console.log('文件不存在')
      fs.unlinkSync(`${coverPath}/${name}.jpg`)
    })


  }

  private registerHandleDeleteFile(): void {
    ipcMain.handle('onHandleDeleteFile', this.onHandleDeleteFile.bind(this));
  }

  //合并视频的逻辑
  private async onMergeVideo(event: Electron.IpcMainInvokeEvent, arg: any) {
    let getCoverIndex = 0 //第几次尝试下载图片的索引
    const { previewPath, coverPath, downloadPath, videoPath } = this.pathJson
    let { name } = arg
    //替换名字非法字符 保留日语和中文字符，并删除其他非字母数字字符
    name = sanitizeVideoName(name)
    //截取番号出来
    const designation = getVideoId(name)
    if (!designation) return '番号不正确'

    //判断当前视频是否存在
    const existArr = fs.existsSync(videoPath + '/' + name + '.mp4')
    if (existArr) return '视频已经存在，无需合并'

    const resulted = await merge(name, downloadPath + `/${designation}`, videoPath)
    if (resulted === '合成成功') {
      // 如果所有线程完成下载，尝试合并视频片段。
      await getPreviewVideo(designation, name, getCoverIndex, previewPath, coverPath)
      await fs.rmSync(downloadPath + `/${designation}`, { recursive: true })
      // 完成下载任务，返回结果。
      return name
    } else {
      // 如果合并失败，返回错误信息。
      return resulted
    }
  }
  private registeronMergeVideo(): void {
    ipcMain.handle('onMergeVideo', this.onMergeVideo.bind(this));
  }

  //打开文件夹
  private onOpenDir(event: Electron.IpcMainInvokeEvent, arg: any) {
    const { shell } = require('electron')
    shell.showItemInFolder(arg)
  }
  private registerOpenDir(): void {
    ipcMain.handle('onOpenDir', this.onOpenDir.bind(this));
  }

  //收藏视频
  private onHandleStarVideo(event: Electron.IpcMainInvokeEvent, arg: any) {
    const storePath = path.join(this.app.getPath('documents'), 'javPlayer')
    const storeFilePath = path.join(storePath, 'storeLog.json')
    const storeFile = fs.readFileSync(storeFilePath, 'utf-8')
    const storeData = JSON.parse(storeFile)
    let starArr = storeData.starArr

    //如果还未收藏过任何视频
    if (!starArr) {
      starArr = [arg]
    } else {
      //如果已经收藏过了 就将其取消收藏
      if (starArr.indexOf(arg) != -1) {
        starArr.splice(starArr.indexOf(arg), 1)
        return fs.writeFileSync(storeFilePath, JSON.stringify(Object.assign(storeData, {
          starArr: starArr
        })), 'utf-8')
      }
      //进行收藏
      starArr.push(arg)
    }

    fs.writeFileSync(storeFilePath, JSON.stringify(Object.assign(storeData, {
      starArr: starArr
    })), 'utf-8')
  }
  private registerHandleStarVideo(): void {
    ipcMain.handle('onHandleStarVideo', this.onHandleStarVideo.bind(this));
  }

  //获取当前所有的文件夹配置路径
  private onGetAllDirPath(event: Electron.IpcMainInvokeEvent, arg: any) {
    const storePath = path.join(this.app.getPath('documents'), 'javPlayer')
    const storeFilePath = path.join(storePath, 'storeLog.json')
    const storeFile = fs.readFileSync(storeFilePath, 'utf-8')
    //如果没有存储文件数据，则创建一个空的存储文件
    if (!storeFile) {
      createSystemStore(this.app)
      return this.onGetAllDirPath(event, arg)
    }
    const json = JSON.parse(storeFile)
    const { coverPath, previewPath, videoPath, downloadPath } = json
    this.pathJson = {
      coverPath,
      previewPath,
      videoPath,
      downloadPath
    }
    //如果传入的参数是all 则返回所有的路径
    if (arg === 'all') {
      return json
    }
    return this.pathJson
  }
  private registerGetAllDirPath(): void {
    ipcMain.handle('onGetAllDirPath', this.onGetAllDirPath.bind(this));
  }

  //当添加页面初始进来时，发送下载的进度和总数回去
  private onGetDownloadProgress(event: Electron.IpcMainInvokeEvent, arg: any) {
    //获取当前页面中Av的下载列表 arg 是av名称
    //先将番号提取处理
    const designation = getVideoId(arg)
    //从文件夹中获取数据
    const { downloadPath } = this.pathJson
    const storeData = getStoreData(this.app)
    try {
      const avList = fs.readdirSync(downloadPath + '/' + designation)
      storeData.downLoadAfter = avList.length
    } catch (e) {
      if (checkFileFoundError.checkFileNotFoundError(e)) {
        storeData.downLoadAfter = 0
      }
    }
    return storeData
  }

  private registerGetDownloadProgress(): void {
    ipcMain.handle('onGetDownloadProgress', this.onGetDownloadProgress.bind(this));
  }
}



function getHeaders(resource) {
  let headers = {
    "accept": "*/*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "sec-ch-ua": "\"Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"115\", \"Chromium\";v=\"115\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
  }
  if (resource === 'SuperJav') {
    Object.assign(headers, {
      "Referer": "https://emturbovid.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    })
  } else {
    Object.assign(headers, {
      "Origin": "https://missav.com",
      "Referer": "https://missav.com/cn/pppd-985-uncensored-leak"
    })
  }
  return headers
}



//识别视频番号
function getVideoId(val: string) {
  //使用正则
  const reg = /[a-zA-Z]{2,6}-\d{3}/
  const result = val.match(reg)
  return result ? result[0] : null
}

//将数组拆分为相等的块
function splitArrayIntoEqualChunks(array: string[], numberOfChunks: number) {
  const chunkSize = Math.ceil(array.length / numberOfChunks);
  const result: any = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }

  return result;
}
//同步阻塞系统
function sleep(timer: number) {
  return new Promise<string>((resolve, reject) => {
    setTimeout(() => {
      resolve('')
    }, timer)
  })
}
function getPreviewVideo(id: string, name: string, getCoverIndex: number, previewPath: string, coverPath: string) {
  return new Promise<Boolean>((resolve, reject) => {
    const host = 'https://eightcha.com/'

    //将id转换为小写
    id = id.toLowerCase()
    let getHoverCoverIndex = 0 //第几次尝试下载hover图片的索引
    if (getCoverIndex >= 5 || getHoverCoverIndex >= 5) return
    /* 获取图片，图片来自missav.com中，因为这个网站没做拦截 */
    const url = host + `${id}/cover.jpg?class=normal`
    https.get(url, (response) => {
      const localPath = coverPath + '/' + name + '.jpg'
      const fileStream = fs.createWriteStream(localPath);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        console.log('图片下载成功');
        fileStream.close();
        //下载第二张封面。hover中的封面
        function getHoverCoverImg(index: number) {
          const urlVideo = host + `${id}/preview.mp4`
          https.get(urlVideo, (response) => {
            const localPath = previewPath + '/' + name + '.mp4'
            const fileStream = fs.createWriteStream(localPath);
            response.pipe(fileStream);
            fileStream.on('finish', () => {
              console.log('预告片下载成功');
              fileStream.close();
              resolve(true)
            });
          }).on('error', (error) => {
            getHoverCoverImg(++index)
            console.error('(即将重试)下载出错:', error);
          });
        }
        getHoverCoverImg(getHoverCoverIndex)
      });
    }).on('error', (error) => {
      getPreviewVideo(id, name, ++getCoverIndex, previewPath, coverPath)
      console.error('(即将重试,如果还是不行,就可能是来源有问题https://missav.com/查看图片路径)下载出错:', error);
    });
  })

}






// 把清洗和处理名称的逻辑抽离为一个单独的函数。
function sanitizeVideoName(name) {
  // 替换掉名字中的非法字符
  return name.replace('[无码破解]', '')
    // 保留中文、日文字符，删除其他非字母数字字符。
    .replaceAll(/[^\u4E00-\u9FA5\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9Fa-zA-Z0-9/-]/g, '')
    .replaceAll(/[\·\・\●\/]/g, '')
    .replaceAll(' ', '');
}

// 把处理M3U8的逻辑抽离为一个单独的函数。
async function processM3u8(url, headers, docPath) {
  let videoName = url.split('/')[url.split('/').length - 1].split('.')[0];
  let urlPrefix = url.split('/').splice(0, url.split('/').length - 1).join('/') + '/';
  try {
    // const { default: got } = await import('got');

    const m3u8Data = await downloadM3U8(url, docPath);
    const myParser = new m3u8Parser.Parser();
    myParser.push(m3u8Data);
    myParser.end();
    // 要获取数据，
    let dataArr = myParser.manifest.segments

    return { videoName, urlPrefix, dataArr };
  } catch (e: any) {
    console.error('处理M3U8文件出错:', e.message);
    return { videoName, urlPrefix, dataArr: [] };
  }

}



//清空文件夹内容
function deleteDirFile(path: string, retries = 3, delay = 3000) {
  if (path) {
    fs.readdirSync(path).forEach((file) => {
      try {
        //如果文件不存在
        if (!fs.existsSync(path + '/' + file)) return

        fs.unlink(path + '/' + file, (err) => {
          if (!err) return
          if (err.code === 'EBUSY' && retries > 0) {
            if (file.indexOf('.ts') == -1) {
              console.log(`文件正被占用，${4 - retries}次重试`)
            }
            setTimeout(() => {
              deleteDirFile(path, retries - 1, delay);
            }, delay);
          }
        })
      } catch (e) { }
    })
  }
}





