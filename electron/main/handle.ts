import { ipcMain, dialog, nativeTheme, BrowserWindow, OpenDialogSyncOptions, shell } from 'electron';
import type { App } from 'electron';
import fs from 'fs';
import path from 'path';
import https from 'https'
import {
  mkdirsSync,
  createSystemStore, formatFileSize, quickSortByTimestamp, storeData, getStoreData,
  checkFileFoundError, getFolderSize, downloadM3U8,
  handleLog, sanitizeVideoName, getVideoId, processM3u8, cleanM3u8Data, splitArrayIntoEqualChunks, getHeaders
} from '../utils/utils';
import { dayjs } from 'element-plus'
import { Worker } from "worker_threads";
import { merge } from '../utils/merge'


/**
 * @export
 * @class WindowManager
 */
export class WindowManager {
  private win: BrowserWindow;
  public app: App;
  public mainWindow: BrowserWindow
  public pathJson: {
    coverPath: string,
    previewPath: string,
    videoPath: string,
    downloadPath: string
  };  // 下载配置路径
  public workerArr: Worker[]; // 线程池
  public docPath: string;  //文档路径
  public appPath: string;  //应用路径
  public setLog: (msg: string) => void // 日志
  public taskArray: number[] = [] //任务id
  public downLoadConfig = { //下载任务的配置
    url: '', //视频url
    name: '', //视频名称
    designation: ''   //视频番号
  }

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
    this.appPath = app.getAppPath()
    this.workerArr = []
    this.pathJson = {
      coverPath: '',
      previewPath: '',
      videoPath: '',
      downloadPath: ''
    }
    //文档路径
    this.docPath = path.join(this.app.getPath('documents'), 'javPlayer')
    this.setLog = (msg: string) => handleLog.set(msg, this.docPath + '\\log.txt')
    this.registerEvents()//注册事件
  }

  // 在你的主线程中
  private async terminateAllWorkers() {
    const that = this;
    await Promise.all(that.workerArr.map(worker => new Promise((resolve) => {
      worker.on('exit', resolve);
      worker.terminate();
    })));
    that.workerArr = [];
  }

  private registerEvents() {
    const events = this.eventExample();
    for (const key in events) {
      ipcMain.handle(key, events[key]);
    }
  }

  private eventExample() {
    return {
      // 处理窗口操作请求
      onHandleWin: async (event: Electron.IpcMainInvokeEvent, arg: string) => {
        switch (arg) {
          case 'openDev':
            this.win.webContents.openDevTools(); // 打开开发者工具
            break;
          case 'close':
            this.win = null!;
            if (process.platform !== 'darwin') this.app.quit(); // 关闭窗口
            break;
          case 'minimize':
            this.win?.minimize(); // 最小化窗口
            break;
          case 'maximize':
            // 最大化/还原窗口
            if (this.win?.isMaximized()) {
              this.win?.unmaximize();
            } else {
              this.win?.maximize();
            }
            break;
          default:
            throw new Error('Invalid action');
        }
        return 'success'
      },
      //获取文件夹路径
      onHandleOpenDir: async (event: Electron.IpcMainInvokeEvent, arg: string) => {
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
      },
      onHandleStoreData: async (event: Electron.IpcMainInvokeEvent, arg: object | string) => {
        /**
         * 1.如果是获取数据 则arg为string
         * 2.如果是存储数据 则arg为object
         **/
        let data = arg, newdata

        const storeFilePath = path.join(this.docPath, 'storeLog.json')
        const storeFile = fs.readFileSync(storeFilePath, 'utf-8')
        //如果是获取数据
        if (typeof data === 'string') {
          if (!storeFile) return null
          const json = JSON.parse(storeFile)
          return json[data]
        } else {
          //如果是存储数据
          if (storeFile) {
            const storeData = JSON.parse(storeFile)
            newdata = Object.assign(storeData, data)
          } else {
            createSystemStore(this.app)
            newdata = data
          }
          fs.writeFileSync(storeFilePath, JSON.stringify(newdata), 'utf-8')
        }
      },
      onGetListData: async (event: Electron.IpcMainInvokeEvent, arg: string) => {
        const { coverPath,
          previewPath,
          videoPath,
          starArr
        } = await this.eventExample().onGetAllDirPath(event, 'all')

        const that = this

        //获取视频列表 解决有些视频没有封面的问题
        const existArr = fs.readdirSync(videoPath)
        const coverList = fs.readdirSync(coverPath).map((file: any) => {

          if (!file.startsWith('.') && file.indexOf('Thumbs') == 0) return null
          if (file.indexOf('.png') == -1) {
            const name = file.split('.jpg')[0]
            //如果视频存在封面，将封面从数组中删除 以备后续下载
            if (existArr.includes(`${name}.mp4`)) {
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
            that.getPreviewVideo(videoId, name, previewPath, coverPath,)
          }
        })
        const videoListData = quickSortByTimestamp(coverList.filter((res) => res), 'stampTime', false)
        //如果是收藏视频，将收藏视频放在最后面
        return videoListData.filter((res) => !res.isStar).concat(videoListData.filter((res) => res.isStar))
      },
      //下载视频
      onDownloadVideo: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
        const that = this;
        return new Promise(async (resolve, reject) => {
          // 解构从前端进程传入的参数。 resource:资源请求方式
          let { name, url, thread, downPath } = arg;
          // 获取HTTP请求头信息。
          const headers = getHeaders("SuperJav");
          //截取番号出来
          const designation = getVideoId(name)
          // 清洗和处理视频名称。
          name = sanitizeVideoName(name);

          this.downLoadConfig = {
            url,
            name,
            designation: designation!,
          }

          downPath = downPath + `/${designation}`;
          mkdirsSync(downPath);


          // 从M3U8 URL计算出需要下载的视频文件信息。
          let { dataArr, dataCount } = await processM3u8.bind(that)();
          dataArr = cleanM3u8Data(dataArr, downPath);
          if (dataArr.length <= thread) {
            thread = dataArr.length;
            arg.isConcurrency = false;
          }
          //将视频数量存入store中
          storeData(this.app, {
            'downloadCount': dataCount
          })

          // 检验SSL证书。
          if (dataArr.length === 0) {
            this.setLog('🔴 无法验证第一个证书 <br/>');
            return resolve('无法验证第一个证书');
          }

          // 将M3U8数据分割为等份，按线程数分配。
          const countArr = splitArrayIntoEqualChunks(dataArr, thread);

          //创建进程之前删除旧的进程
          this.workerArr.forEach((worker) => {
            worker.terminate()
          })

          await this.terminateAllWorkers();

          for (let i = 0; i < thread; i++) {
            const separateThread = new Worker(path.join(this.appPath, 'electron/seprate/worker.js'));
            this.workerArr.push(separateThread);
            // 创建一个新的Worker线程实例，用于处理下载任务。
            // 向Worker线程发送任务信息，启动下载。
            separateThread.postMessage({
              urlData: countArr[i],
              downPath: that.pathJson.downloadPath + `/${designation}`,
              docPath: that.docPath,
              headers,
              sizeData: { ...arg }
            });
          }
        });
      },
      //暂停下载
      pauseDownloadEvent: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
        this.workerArr.forEach((worker) => {
          worker.terminate()
        })
        this.workerArr = []
        //发送日志提醒
        this.setLog("🟡 下载任务已暂停<br/>")
      },
      //获取下载目录内容
      getDownloadListContent: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
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
      },
      //清空文件夹内容 不删除父文件夹
      deleteDirFile: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
        //arg传入下载路径
        if (arg) {
          try {
            fs.readdirSync(arg).forEach((file) => {
              //判断当前文件是否是文件夹
              if (fs.statSync(arg + '/' + file).isDirectory()) {
                fs.rmSync(arg + '/' + file, { recursive: true })
              } else {
                fs.unlinkSync(arg + '/' + file)
              }
            })
            return this.setLog('🟡 清空文件夹成功 <br/>')
          } catch (e: any) {
            return this.setLog(`🔴 清空文件夹失败 ${e} <br/>`)
          }
        }
      },
      //创建文件夹
      onCreateDir: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
        //arg传入下载路径
        if (arg) {
          fs.mkdirSync(arg)
        }
      },
      //删除视频文件
      onHandleDeleteFile: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
        const name = arg.split('/')[1].split('.mp4')[0]

        const setLog = this.setLog

        const { videoPath, previewPath, coverPath } = this.pathJson
        fs.access(`${videoPath}/${name}.mp4`, (err) => {
          if (err) return setLog('🔴 文件不存在 <br/>')
          try {
            fs.unlinkSync(`${videoPath}/${name}.mp4`)
          } catch (e: any) {
            //如果删除文件失败(文件占用)，就等待2分钟后再次删除
            if (e) setLog('🔴 文件占用，等待2分钟后再次删除 <br/>')
            setTimeout(() => {
              fs.unlinkSync(`${videoPath}/${name}.mp4`)
            }, 500)
          }
        })

        fs.access(`${previewPath}/${name}.mp4`, (err) => {
          if (err) return setLog('🔴 文件不存在 <br/>')
          fs.unlinkSync(`${previewPath}/${name}.mp4`)
        })
        fs.access(`${coverPath}/${name}.jpg`, (err) => {
          if (err) return setLog('🔴 文件不存在 <br/>')
          fs.unlinkSync(`${coverPath}/${name}.jpg`)
        })
      },
      //合并视频
      onMergeVideo: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
        this.setLog(`🟢 开始合并视频 <br/> `)
        const { previewPath, coverPath, downloadPath, videoPath } = this.pathJson
        let { name } = arg
        //截取番号出来
        const designation = getVideoId(name)
        //替换名字非法字符 保留日语和中文字符，并删除其他非字母数字字符
        const newname = sanitizeVideoName(name)

        if (!designation) return this.setLog(`🔴 未找到番号 <br/>`)

        //判断当前视频是否存在
        const existArr = fs.existsSync(videoPath + '/' + newname + '.mp4')
        if (existArr) {
          this.setLog(`🟢 视频已存在 无需进行合并 <br/>`)
          return;
        }

        const resulted = await merge(newname, downloadPath + `/${designation}`, videoPath)
        if (resulted === '合成成功') {
          //视频合并成功后，下载封面和预览视频
          await this.getPreviewVideo(designation, newname, previewPath, coverPath)
          //删除下载的视频片段
          fs.rm(downloadPath + `/${designation}`, { recursive: true }, (err) => {
            if (err) return this.setLog(`🔴 视频片段删除失败:${err} <br/>`)
            this.setLog(`🟢 视频合并成功,视频片段已删除 <br/>`)
          })

          // 完成下载任务，返回结果。
          return designation
        } else {
          // 如果合并失败，返回错误信息。
          return resulted
        }
      },
      //打开文件夹
      onOpenDir: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
        shell.showItemInFolder(arg)
      },
      //收藏视频
      onHandleStarVideo: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
        const storeFilePath = path.join(this.docPath, 'storeLog.json')
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
      },
      //获取当前所有的文件夹配置路径
      onGetAllDirPath: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
        const storeFilePath = path.join(this.docPath, 'storeLog.json')
        const storeFile = fs.readFileSync(storeFilePath, 'utf-8')
        //如果没有存储文件数据，则创建一个空的存储文件
        if (!storeFile) {
          createSystemStore(this.app)
          return this.eventExample().onGetAllDirPath(event, arg)
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
      },
      //当添加页面初始进来时，发送下载的进度和总数回去
      onGetDownloadProgress: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
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
      },
      //获取系统日志
      onGetSystemLog: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
        const logFilePath = path.join(this.docPath, 'log.txt')
        try {
          const logFile = handleLog.get(logFilePath)
          return logFile
        } catch (e) {
          return `🔴 获取日志失败 <br/>`
        }
      },
      //清空系统日志
      onClearSystemLog: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
        const logFilePath = path.join(this.docPath, 'log.txt')
        try {
          handleLog.clear(logFilePath)
          return this.setLog(`🟡 清空日志成功 <br/>`)
        } catch (e) {
          return this.setLog(`🔴 清空日志失败 <br/>`)
        }
      },
      //查询番号是否存在
      onInspectId: (event: Electron.IpcMainInvokeEvent, arg: any) => {
        return new Promise<boolean>((resolve, reject) => {
          fs.readdirSync(this.pathJson.coverPath).forEach((file) => {
            if (file.includes(arg)) {
              resolve(true)
            }
          })
          resolve(false)
        })
      },
      //修复封面和预览
      onRepairCover: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
        const { coverPath, previewPath, videoPath } = this.pathJson
        const that = this
        const items = []
        fs.readdirSync(videoPath).forEach((video) => {
          items.push(video)
          fs.readdirSync(previewPath).forEach((preview) => {
            if (video === preview) items.splice(items.indexOf(video), 1)
          })
        })
        console.log(`lzy  items:`, items)
        items.forEach((item) => {
          const videoId = getVideoId(item)
          if (videoId) {
            const name = item.split('.mp4')[0]
            that.getPreviewVideo(videoId, name, previewPath, coverPath)
          }
        })
      },
      //获取预览视频
      onGetPreviewVideo: async (event: Electron.IpcMainInvokeEvent, arg: any) => {
        const { designation, name, index } = arg
        const { previewPath, coverPath } = this.pathJson
        return this.getPreviewVideo(designation, name, previewPath, coverPath, index, index,)
      }
    }
  }
  private downloadFile(url: string, localPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        const fileStream = fs.createWriteStream(localPath);
        if (response.statusCode !== 200 || Number(response.headers['content-length']) < 100) {
          return reject(response.statusCode)
        }
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
        fileStream.on('error', reject);
      }).on('error', reject);
    });
  }

  private getPreviewVideo(id: string, name: string, previewPath: string, coverPath: string, coverIndex: number = 0, hoverIndex: number = 0,): Promise<Boolean> {
    if (name.indexOf('desktop') == 0) return

    const maxRetries = 3;
    const host = 'https://eightcha.com/';
    id = id.toLowerCase();

    const coverUrl = host + `${id}-uncensored-leak/cover.jpg?class=normal`;
    const coverLocalPath = `${coverPath}/${name}.jpg`;
    const previewUrl = host + `${id}-uncensored-leak/preview.mp4`;
    const previewLocalPath = `${previewPath}/${name}.mp4`;
    const downloadWithRetry = (url: string, localPath: string, index: number): Promise<void> => {
      if (index == 1) url = url.replace('?class=normal', '')
      else if (index == 2) url = url.replace('-uncensored-leak', '')
      console.log(`lzy  url:`, url)
      return this.downloadFile(url, localPath).catch((error) => {
        this.setLog(`🔴 (即将重试)下载出错: ${error} <br/>`);
        if (index < maxRetries) {
          return downloadWithRetry(url, localPath, index + 1);
        } else {
          return Promise.reject(new Error(`Failed after ${maxRetries} attempts`));
        }
      });
    };

    return downloadWithRetry(coverUrl, coverLocalPath, coverIndex)
      .then(() => {
        this.setLog(`🟢 封面下载成功 <br/>`);
        return downloadWithRetry(previewUrl, previewLocalPath, hoverIndex);
      })
      .then(() => {
        this.setLog(`🟢 预览视频下载成功 <br/>`);
        return true;
      })
      .catch((error) => {
        this.setLog(`🔴 下载失败: ${error} <br/>`);
        return false;
      });
  }

}


