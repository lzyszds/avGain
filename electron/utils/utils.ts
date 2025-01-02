import { shell, dialog, Notification } from 'electron';
import fs from 'fs'
import path, { join } from 'node:path'
import sudo from 'sudo-prompt'
import { download, CancelError } from 'electron-dl';
import superagent from 'superagent';
import m3u8Parser from 'm3u8-parser'
import URL from 'url';

//存储文件时先判断当前路径是否存在文件夹，不存在先创建
export function mkdirsSync(dirname) {
  // 判断目录是否存在
  if (fs.existsSync(dirname)) {
    // 如果目录已存在，直接返回 true，表示目录创建成功
    return false;
  } else {
    // 如果目录不存在，递归创建上级目录
    if (fs.existsSync(path.dirname(dirname))) {
      // 上级目录创建成功后，创建当前目录
      fs.mkdirSync(dirname);
      // 返回 true，表示目录创建成功
      return true;
    } else {
      fs.mkdirSync(path.dirname(dirname));
      return false
    }
  }
}

//创建系统存储
export const createSystemStore = (app) => {
  const systemStore = join(app.getPath('documents'), 'javPlayer')
  mkdirsSync(systemStore)
  //创建data下载进度文件夹
  if (!fs.existsSync(join(systemStore, 'data'))) {
    mkdirsSync(join(systemStore, 'data'))
  }

  //创建系统存储文件夹 如果不存在 则创建 并写入文件
  if (!fs.existsSync(join(systemStore, 'storeLog.json'))) {
    fs.writeFileSync(join(systemStore, 'storeLog.json'), `{
      "coverPath": "",
      "previewPath": "",
      "videoPath": "",
      "downloadPath": "",
      "starArr": []
    }`, 'utf-8')
  }
  return systemStore
}

//将数据存储到系统存储文件中
export const storeData = (app: any, data: object) => {
  const systemStore = join(app.getPath('documents'), 'javPlayer')
  const config = join(systemStore, 'storeLog.json')
  //在原来的数据基础上进行合并
  let dataStr = JSON.stringify(data)
  if (fs.existsSync(config)) {
    let oldData = fs.readFileSync(config, 'utf-8')
    let oldDataObj = JSON.parse(oldData)
    dataStr = JSON.stringify({ ...oldDataObj, ...data })
  }
  fs.writeFileSync(config, dataStr, 'utf-8')
}

//获取系统存储数据
export const getStoreData = (app: any) => {
  const systemStore = join(app.getPath('documents'), 'javPlayer')
  const config = join(systemStore, 'storeLog.json')
  if (fs.existsSync(config)) {
    let data = fs.readFileSync(config, 'utf-8')
    return JSON.parse(data)
  }
  return {}
}

//计算文件夹的大小
export function getFolderSize(dirname) {
  let size = 0;
  const files = fs.readdirSync(dirname);
  files.forEach(file => {
    const filePath = path.join(dirname, file);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      size += stat.size;
    } else if (stat.isDirectory()) {
      size += getFolderSize(filePath);
    }
  });
  return size;
}



export const checkFileFoundError = {
  /**
 * 辅助函数：检测错误提示中是否包含 "no such file or directory" 字符串
 * @param {string | Error} e - 错误提示字符串或错误对象
 * @returns {boolean} - 如果包含 "no such file or directory" 则返回 true，否则返回 false
 */
  checkFileNotFoundError(e): boolean {
    const errorMessage = typeof e === 'string' ? e : e.message;
    return errorMessage.includes("no such file or directory");
  },

  /**
   * 辅助函数：检测错误提示中是否包含 "permission denied" 字符串
   * @param {string | Error} e - 错误提示字符串或错误对象
   * @returns {boolean} - 如果包含 "permission denied" 则返回 true，否则返回 false
   */
  checkPermissionDeniedError(e): boolean {
    const errorMessage = typeof e === 'string' ? e : e.message;
    return errorMessage.includes("permission denied");
  }
}

//格式化文件大小
export function formatFileSize(fileSize: any) {

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

//electorn读取本地视频资源
export function getMp4File(item, type) {
  const fileBuffer = fs.readFileSync(item);
  const blob = new Blob([fileBuffer], { type });
  //@ts-ignore
  const videoUrl = URL.createObjectURL(blob);
  return videoUrl
}
//排序
export function quickSortByTimestamp(arr: any, key: string, isIncremental: boolean = true): any {
  if (arr.length <= 1) {
    return arr;
  }

  const pivot = arr[Math.floor(arr.length / 2)];
  const less: any = [];
  const equal: any = [];
  const greater: any = [];

  for (const element of arr) {
    if (!element) break;
    if (element[key] < pivot[key]) {
      less.push(element);
    } else if (element[key] > pivot[key]) {
      greater.push(element);
    } else {
      equal.push(element);
    }
  }
  if (isIncremental) {
    return [...quickSortByTimestamp(less, key, isIncremental), ...equal, ...quickSortByTimestamp(greater, key, isIncremental)];
  } else {
    return [...quickSortByTimestamp(greater, key, isIncremental), ...equal, ...quickSortByTimestamp(less, key, isIncremental)];
  }
}

import { exec } from 'child_process';


//IDM版本
// export async function downloadM3U8(url, headers, outputPath, app): Promise<string> {

//   const dataDir = fs.readdirSync(outputPath + "\\data")
//   const isExistArr: boolean[] = []
//   dataDir.forEach(async item => {
//     isExistArr.push(url.includes(item))
//   })

//   if (!isExistArr.includes(true)) {
//     const pathToIDM = 'K:\\IDM 6.39.8 mod\\IDM 6.39.8 mod\\IDMan.exe' // IDM安装程序的实际路径
//     await child_process.spawn(pathToIDM, ['/d', url, '/n', '/p', outputPath + "\\data"])
//   }

//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       fs.readdir(outputPath + "\\data", (err, files) => {
//         if (err) {
//           reject(err);
//         } else {
//           const fileInfos: any[] = []
//           //根据时间获取最新的文件内容
//           files.forEach((file, index) => {
//             const fileInfo = fs.statSync(outputPath + "\\data\\" + file)
//             if (fileInfo.isFile()) {
//               fileInfos.push({
//                 name: file,
//                 time: fileInfo.birthtimeMs
//               })
//             }
//           });

//           //返回时间最大的文件
//           const fileInfo = quickSortByTimestamp(fileInfos, 'time', false)[0]
//           const res = fs.readFileSync(outputPath + "\\data\\" + fileInfo.name, "utf-8")
//           resolve(res)
//         }
//       });
//     }, 5000);
//   });


// }

export async function downloadM3U8(): Promise<string> {
  const { designation } = this.downLoadConfig;
  const that = this
  const downloadDir = that.docPath + "\\data"
  const m3u8Path = downloadDir + `\\${designation}.m3u8`
  return new Promise(async (resolve, reject) => {
    if (!fs.existsSync(m3u8Path)) {
      await handelLzyDownload.bind(that)(downloadDir)
    }
    const fileInfo = fs.readFileSync(m3u8Path, "utf-8")

    //通过日志提醒用户下载完成m3u8文件
    handleLog.set("📋 m3u8文件下载完成，准备开始下载视频 <br/>", that.docPath + '\\log.txt')
    resolve(fileInfo)
  });
}

//使用lzyDownload下载
export async function handelLzyDownload(downloadDir) {
  const { url, designation } = this.downLoadConfig;
  await lzyDownload(this.win, {
    url: url,
    filename: designation + '.m3u8',
    directory: downloadDir
  })
}


//使用aria2c下载
export function aria2cDownload(option: {
  url: string,
  directory: string,
  filename: string
}) {
  const { url, directory, filename } = option
  const headers = '--header="Accept: */*" --header="accept-language: zh-CN,zh;q=0.9,en;q=0.8" --header="Referer: https://emturbovid.com/" --header="Referrer-Policy: strict-origin-when-cross-origin"'
  return new Promise((resolve, reject) => {
    exec(`aria2c -d ${directory} -o ${filename} ${headers} ${url}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }
      if (stderr) {
        //弹出错误信息
        dialog.showErrorBox('错误', stderr)
        reject(stderr);
      }
      resolve(true);
    });
  });
}


//设置系统日志功能
export const handleLog = {
  set: (text: string, path: string, isProgress: boolean = false) => {
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, text, 'utf-8')
    }
    if (isProgress) {
      // 定义用于匹配特定合成成功信息的正则表达式。
      var regex = /(\🟢 合成成功 )(\d+)(%)/;
      try {
        // 读取指定路径的文件内容。
        var data = fs.readFileSync(path, 'utf-8');
        // 将文件内容按'<br/>'分隔为行数组。
        var lines = data.split('<br/>');
        // 过滤掉包含特定合成成功信息的行。
        lines = lines.filter(line => {
          return !regex.test(line);
        });
        // 将过滤后的行数组重新组合，并写回原文件。
        fs.writeFileSync(path, lines.join('<br/>'), 'utf-8');
      } catch (err) {
        // 如果在读写文件过程中出现错误，打印错误信息。
        console.log(err);
      }
    }
    fs.appendFileSync(path, text + '<br/>')
    return text
  },
  get: (path) => {
    //如果文件不存在则创建
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, '', 'utf-8')
    } else {
      return fs.readFileSync(path, 'utf-8')
    }
  },
  clear: (path) => {
    fs.writeFileSync(path, '', 'utf-8')
  }
}


/**
 *  使用lzyDownload下载
 * @param win
 * @param options url: 下载地址 directory: 下载路径 filename: 下载文件名(番号)
 * return Promise
  */
export async function lzyDownload(win, options: {
  url: string,
  directory: string,
  filename: string,
}) {
  try {
    await download(win, options.url, {
      directory: options.directory,
      filename: options.filename,
    })
  } catch (error) {
    if (error instanceof CancelError) {
      return console.info('item.cancel() was called');
    }
    console.error(error);
    handleLog.set(options.filename + '下载失败,即将更换aria2c下载', join(options.directory, 'log.txt'))
    // 更换下载方式
    await aria2cDownload(options)

  }
}



//检查是否安装了aria2c 检查环境变量
export async function inspectEnv(app: any) {
  await exec('aria2c --help', async (error, stdout, stderr) => {
    if (error || stderr) {
      //提醒用户安装aria2c 并跳转到下载页面
      const result = await dialog.showMessageBox({
        type: 'info',
        title: '提示',
        message: 'aria2c不存在，请安装aria2c并配置环境变量',
        buttons: ['前往下载', '已安装进行环境配置'],
        cancelId: 0,
        defaultId: 0,
      })

      if (result.response === 0) {
        shell.openExternal('https://github.com/aria2/aria2/releases/')
      } else {
        //选择安装路径 新增至环境变量中
        const res = await dialog.showOpenDialog({
          title: '选择aria2c安装路径',
          properties: ['openDirectory'],
        })
        if (!res.canceled) {
          const path = res.filePaths
          sudo.exec(`setx /M PATH "%PATH%;${path}"`, {
            name: 'AvGain'
          }, (error, stdout, stderr) => {
            if (stderr) {
              dialog.showErrorBox('错误', stderr + "")
            }
            dialog.showMessageBox({
              type: 'info',
              title: '提示',
              message: '环境变量配置成功，请重启软件',
              buttons: ['确定'],
              cancelId: 0,
              defaultId: 0,
            }).then(result => {
              if (result.response === 0) {
                app.relaunch()
              }
            })
          })
        }
      }
    }
  });
}




//新线程池下载方式 下载任务函数
async function downloadSegment(m3u8Url, segmentUrl, outputPath) {
  try {
    const response = await superagent.get(segmentUrl);
    fs.writeFileSync(outputPath, response.body);
    return outputPath;
  } catch (error) {
    throw new Error(`Failed to download segment from ${segmentUrl}: ${error.message}`);
  }
}


//识别视频番号
export function getVideoId(val: string) {
  return val.split(' ')[0].replace('[无码破解]', "")
}

//将数组拆分为相等的块
export function splitArrayIntoEqualChunks(array: string[], numberOfChunks: number) {
  const chunkSize = Math.ceil(array.length / numberOfChunks);
  const result: any = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}

//将m3u8中的数据进行清洗 意思是将已经下载视频的值删除
export function cleanM3u8Data(dataArr: string[], downloadPath: string) {
  const files = fs.readdirSync(downloadPath);
  const match = /(\d{1,4}).(jpg|jpeg|png|ts)$/g;
  const mapArr = new Map()
  //将下载的文件名存入map中
  dataArr.forEach((item) => {

    let m3u8Name = ''
    try {
      m3u8Name = path.basename(item).match(match)[0].split(".")[0]
    } catch (e) {
      m3u8Name = path.basename(item)
    }
    mapArr.set(m3u8Name, item)
  })
  //将已经下载的文件名删除
  files.forEach((file) => {
    const fileName = file.split(".")[0]
    if (mapArr.has(fileName)) {
      mapArr.delete(fileName)
    }
  })
  //map数组转换为数组
  return Array.from(mapArr.values())
}

//同步阻塞系统
export function sleep(timer: number) {
  return new Promise<string>((resolve, reject) => {
    setTimeout(() => {
      resolve('')
    }, timer)
  })
}
// 把清洗和处理名称的逻辑抽离为一个单独的函数。
export function sanitizeVideoName(name) {
  // 替换掉名字中的非法字符
  return name.replace('[无码破解]', '')
    // 保留中文、日文字符，删除其他非字母数字字符。
    .replaceAll(/[^\u4E00-\u9FA5\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9Fa-zA-Z0-9/-]/g, '')
    .replaceAll(/[\·\・\●\/]/g, '')
    .replaceAll(' ', '');
}

/**
 * 处理M3U8文件的逻辑。
 * 
 * @param url M3U8文件的URL地址。
 * @param headers 请求M3U8文件时的HTTP头信息。
 * @param docPath 保存下载文件的文档路径。
 * @param app 用于下载文件的应用上下文（可能用于鉴权等）。
 * @returns 返回一个Promise，解析为一个对象，包含视频名称、URL前缀和未下载的段数据数组。
 */
export async function processM3u8(this) {
  const { url, designation } = this.downLoadConfig;

  try {
    // 下载M3U8文件
    const m3u8Data = await downloadM3U8.bind(this)();
    // 解析M3U8文件
    const myParser = new m3u8Parser.Parser();
    myParser.push(m3u8Data);
    myParser.end();

    // 初始化并获取过滤后的段数据
    let dataArr = myParser.manifest.segments || [];
    debugger
    const dataCount = dataArr.length;
    const filePath = path.join(this.pathJson.downloadPath, designation);
    // 使用异步方式读取目录避免性能问题
    const files = fs.readdirSync(filePath);
    // files.forEach((file) => {
    //   dataArr = dataArr.filter((item) => {
    //     const fileName = path.basename(item.uri);
    //     return fileName.replace(/[^\d]/g, '') !== file.replace(/[^\d]/g, '');
    //   });
    // });
    dataArr = dataArr.map((item) => {
      return URL.resolve(url, item.uri);
    })
    return { dataArr, dataCount };
  } catch (e) {
    // 异步日志记录
    await handleLog.set(`🔴 下载出错: ${e} <br/>`, `${this.docPath}/log.txt`);
    // 出错时返回空的段数据数组
    return { dataArr: [], dataCount: 0 };
  }
}


//清空文件夹内容
export function deleteDirFile(path: string, retries = 3, delay = 3000) {
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


//获取请求头
export function getHeaders(resource) {
  let headers = {
    "accept": "*/*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
  }
  if (resource === 'SuperJav') {
    Object.assign(headers, {
      "Referer": "https://emturbovid.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    })
  } else {
    Object.assign(headers, {
      "Referer": "https://missav.com/cn/pppd-985-uncensored-leak",
      "Origin": "https://missav.com"
    })
  }
  return headers
}



export // 定义任务队列类
  class TaskQueue {
  private queue: (() => void)[] = [];
  private isProcessing: boolean = false;

  constructor(private maxThreads: number) { }

  addTask(task: () => void) {
    this.queue.push(task);
    if (!this.isProcessing) {
      this.processTasks();
    }
  }

  private async processTasks() {
    this.isProcessing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
      }
    }
    this.isProcessing = false;
  }
}
