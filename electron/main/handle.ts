import { ipcMain, dialog, nativeTheme, BrowserWindow, OpenDialogSyncOptions } from 'electron';
import type { App } from 'electron';
import fs from 'fs';
import path from 'path';
import https from 'https'
import { mkdirsSync, createSystemStore, formatFileSize, quickSortByTimestamp } from '../utils/utils'; // 假设您有一个名为 'utils' 的模块用于创建目录
import { dayjs } from 'element-plus'
import axios from 'axios'
import getVideo from '../utils/getVideo'
// const getVideo = require("");
import { Worker } from "worker_threads";
import { merge } from '../utils/merge'

/**
 * @export
 * @class WindowManager
 */
export class WindowManager {
  private win: BrowserWindow;
  private app: App;
  private pathJson: {
    coverPath: string,
    previewPath: string,
    videoPath: string,
    videoDownload: string
  };
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
    this.pathJson = {
      coverPath: '',
      previewPath: '',
      videoPath: '',
      videoDownload: ''
    }
    //下载计划数组
    this.downloadPlanArr = []
    // 注册事件监听
    // 窗口操作
    this.registerHandleWin();
    this.registerHandleOpenDir()
    this.registerHandleStoreData()
    this.registerGetListData()
    this.registerDownloadVideoEvent()
    this.registerGetDownloadSpeed()
    this.registerGetDownloadListContent()
    this.registerDeleteDirFile()
    this.registerCreateDir()
    this.registerHandleDeleteFile()
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
    const storePath = path.join(this.app.getPath('documents'), 'javPlayer')
    const storeFilePath = path.join(storePath, 'storeLog.json')
    const storeFile = fs.readFileSync(storeFilePath, 'utf-8')
    const json = JSON.parse(storeFile)
    const { coverPath, previewPath, videoPath } = json
    this.pathJson = json
    //获取视频列表 解决有些视频没有封面的问题
    // const existArr = fs.readdirSync(videoPath)
    const coverList = fs.readdirSync(coverPath).map((file: any) => {
      if (!file.startsWith('.') && file.indexOf('Thumbs') == 0) return null
      if (file.indexOf('.png') == -1) {
        const name = file.split('.jpg')[0]
        //如果视频存在封面，将封面从数组中删除 以备后续下载
        // if (existArr.indexOf(`${name}.mp4`) != -1) {
        //   existArr.splice(existArr.indexOf(`${name}.mp4`), 1)
        // }

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
          datails
        }
      } else {
        return null
      }
    }).filter((item) => item !== null);
    //将没有封面的视频封面进行下载
    // console.log(existArr);
    // existArr.forEach((item: any) => {
    //   const videoId = getVideoId(item)
    //   if (videoId) {
    //     const name = item.split('.mp4')[0]
    //     getPreviewVideo(videoId, name, 0, previewPath, coverPath)
    //   }
    // })
    return quickSortByTimestamp(coverList.filter((res) => res), 'stampTime', false)
  }
  //注册onGetListData事件监听
  private registerGetListData(): void {
    ipcMain.handle('onGetListData', this.onGetListData.bind(this));
  }

  //处理downloadVideoEvent
  private onDownloadVideoEvent(event: Electron.IpcMainInvokeEvent, arg: any) {
    const that = this
    return new Promise(async (resolve, reject) => {
      const appPath = __dirname + `../../../electron/`
      //清除进度条数据
      fs.readdirSync(appPath + '/data').forEach(file => {
        fs.writeFileSync(appPath + '/data/' + file, '[]', 'utf-8')
      })
      //获取解构子进程前端传入的参数
      let { resource, name, url, thread, downPath, previewPath, coverPath, videoPath } = arg
      const headers = getHeaders(resource)  //分辨->获取请求头
      name = name.replace('[无码破解]', '')
      //截取番号出来
      const designation = getIdNumber(name)
      //替换名字非法字符 保留日语和中文字符，并删除其他非字母数字字符
      name = name.replace(/[^\u4E00-\u9FA5\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9Fa-zA-Z0-9/-][\·\・]/g, '').replaceAll(' ', '')
      //下载计算器 用于计算下载进度
      let downLoadPlan = 0, timer: any = null
      //计算需要下载的文件 url是一个m3u8文件
      const videoName = url.split('/')[url.split('/').length - 1].split('.')[0]
      const urlPrefix = url.split('/').splice(0, url.split('/').length - 1).join('/') + '/'
      const { data: m3u8Data } = await axios(url, {
        method: 'get', headers, httpsAgent: new https.Agent({
          rejectUnauthorized: false  // 禁用 SSL 证书验证
        })
      }) as any

      const dataArr = m3u8Data.split('\n').filter((res: any) => res.indexOf(videoName) === 0)
      const countArr = splitArrayIntoEqualChunks(dataArr, thread)

      that.downloadPlanArr = countArr
      let isFirstCertificate = false
      getVideo(countArr[0], 0, 0, urlPrefix, headers, downPath).then()
        .catch((e: any) => {
          if (e.indexOf('unable to verify the first certificate') != -1) {
            isFirstCertificate = true
          }
        }).finally(() => {
          ++downLoadPlan
        })

      // await sleep(10 * 1000) //阻塞20秒
      if (isFirstCertificate) {
        console.log('无法验证第一个证书');
        return resolve('无法验证第一个证书')
      }
      let getCoverIndex = 0 //第几次尝试下载图片的索引
      for (let i = 1; i < thread; i++) {
        const seprateThread = new Worker(appPath + `/seprate/seprateThread${i}.js`);
        seprateThread.on("message", async () => {
          ++downLoadPlan
          //如果当前卡住在15个线程以后，等待5分钟后，
          //如果还是没有下载完毕，就合并，不管有没有下载完毕
          timer && clearTimeout(timer)
          timer = setTimeout(() => {
            if (downLoadPlan >= 15) {
              merge(name, downPath, videoPath, thread).then(resultext => {
                if (resultext === '合成成功') {
                  // res.send('合体成功，但是有部分视频没有下载完全')
                  getPreviewVideo(designation, name, getCoverIndex, previewPath, coverPath)
                  // getCoverImg(id, name, cover, getCoverIndex)//获取封面图片
                }
              })
              return resolve('下载完成，但是有部分视频没有下载完全')
            }
          }, 3 * 60 * 1000)
          if (downLoadPlan >= thread) {
            merge(name, downPath, videoPath, thread).then(resultext => {
              timer && clearTimeout(timer)
              if (resultext === '合成成功') {
                getPreviewVideo(designation, name, getCoverIndex, previewPath, coverPath)
                // getCoverImg(id, name, cover, getCoverIndex)//获取封面图片
                // return res.send(resultext)
                return resolve('下载完成')
              }
            })
          }
        });
        seprateThread.postMessage({ urlData: countArr[i], i, headers, urlPrefix, downPath });
      }
    })
  }
  //注册downloadVideoEvent事件监听
  private registerDownloadVideoEvent(): void {
    ipcMain.handle('downloadVideoEvent', this.onDownloadVideoEvent.bind(this));
  }

  //处理逻辑getDownloadSpeed
  private onGetDownloadSpeed(event: Electron.IpcMainInvokeEvent, arg: any) {
    const appPath = __dirname + `../../../electron/`
    let speedValue = 0
    //清除进度条数据
    fs.readdirSync(appPath + '/data').forEach((file) => {
      const arr = fs.readFileSync(appPath + '/data/' + file, 'utf-8')
      //如果内容为空则return
      if (arr === '[]') return
      speedValue += JSON.parse(arr).length
    })
    let sums = 0
    this.downloadPlanArr.forEach(element => {
      sums += element.length
    });
    return [speedValue, sums || 1000]
  }
  private registerGetDownloadSpeed(): void {
    ipcMain.handle('getDownloadSpeed', this.onGetDownloadSpeed.bind(this));
  }
  //处理逻辑getDownloadSpeed
  private onGetDownloadListContent(event: Electron.IpcMainInvokeEvent, arg: any) {
    let arr: any = []
    //arg传入下载路径
    if (arg) {
      arr = fs.readdirSync(arg).map(file => {
        return {
          state: fs.statSync(arg + '/' + file),
          name: file
        }
      })
    }
    return arr
  }

  private registerGetDownloadListContent(): void {
    ipcMain.handle('getDownloadListContent', this.onGetDownloadListContent.bind(this));
  }

  //处理逻辑deleteDirFile
  private onDeleteDirFile(event: Electron.IpcMainInvokeEvent, arg: any) {
    //arg传入下载路径
    if (arg) {
      fs.readdirSync(arg).forEach(async (file) => {
        await fs.unlinkSync(arg + '/' + file)
      })
    }
  }

  private registerDeleteDirFile(): void {
    ipcMain.handle('deleteDirFile', this.onDeleteDirFile.bind(this));
  }

  //处理逻辑deleteDirFile
  private onCreateDir(event: Electron.IpcMainInvokeEvent, arg: any) {
    console.log(`lzy  arg:`, arg)
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
      fs.unlinkSync(`${videoPath}/${name}.mp4`)
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


function getIdNumber(val: string) {
  const index = val.indexOf(' ')
  return val.slice(0, index)
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
  const host = 'https://eightcha.com/'

  //将id转换为小写
  id = id.toLowerCase()
  let getHoverCoverIndex = 0 //第几次尝试下载hover图片的索引
  if (getCoverIndex >= 5 || getHoverCoverIndex >= 5) return
  /* 获取图片，图片来自missav.com中，因为这个网站没做拦截 */
  const url = host + `${id}/cover.jpg?class=normal`
  console.log(`lzy  url:`, url);
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
}




//获取视频封面
function getCoverImg(id: string, name: string, cover2: string, getCoverIndex: number) {
  let getHoverCoverIndex = 0 //第几次尝试下载hover图片的索引
  if (getCoverIndex >= 5 || getHoverCoverIndex >= 5) return
  /* 获取图片，图片来自missav.com中，因为这个网站没做拦截 */
  const url = `https://cdn82.bestjavcdn.com/${id}/cover.jpg?class=normal`
  https.get(url, (response) => {
    const localPath = './public/cover/' + name + '.jpg'
    const fileStream = fs.createWriteStream(localPath);
    response.pipe(fileStream);
    fileStream.on('finish', () => {
      console.log('图片1下载成功');
      fileStream.close();
      //下载第二张封面。hover中的封面
      function getHoverCoverImg(index: number) {
        https.get(cover2, (response) => {
          const localPath = './public/cover/' + name + '.png'
          const fileStream = fs.createWriteStream(localPath);
          response.pipe(fileStream);
          fileStream.on('finish', () => {
            console.log('图片2下载成功');
            fileStream.close();
          });
        }).on('error', (error) => {
          getHoverCoverImg(++index)
          console.error('(即将重试)下载出错:', error);
        });
      }
      getHoverCoverImg(getHoverCoverIndex)
    });
  }).on('error', (error) => {
    getCoverImg(id, name, cover2, ++getCoverIndex)
    console.error('(即将重试)下载出错:', error);
  });

}
