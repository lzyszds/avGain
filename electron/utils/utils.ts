import { shell, dialog, Notification } from 'electron';
import fs from 'fs'
import path, { join } from 'node:path'
import sudo from 'sudo-prompt'
import { download, CancelError } from 'electron-dl';

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
  let isExistArr = false
  const dataDir = fs.readdirSync(downloadDir)
  dataDir.forEach(async item => {
    if (item.includes(designation)) {
      return isExistArr = true
    }
  })
  return new Promise(async (resolve, reject) => {
    if (!isExistArr) {
      await handelLzyDownload.bind(that)(downloadDir)
    }

    fs.readdir(downloadDir, (err, files) => {
      if (err) {
        reject(err);
      } else {
        const fileInfos: any[] = []
        //根据时间获取最新的文件内容
        files.forEach((file, index) => {
          const fileInfo = fs.statSync(that.docPath + "\\data\\" + file)
          if (fileInfo.isFile()) {
            fileInfos.push({
              name: file,
              time: fileInfo.birthtimeMs
            })
          }
        });

        //返回时间最大的文件
        const fileInfo = quickSortByTimestamp(fileInfos, 'time', false)[0]
        const res = fs.readFileSync(that.docPath + "\\data\\" + fileInfo.name, "utf-8")
        //通过日志提醒用户下载完成m3u8文件
        handleLog.set("📋 m3u8文件下载完成，准备开始下载视频 <br/>", that.docPath + '\\log.txt')
        resolve(res)
      }
    });
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
export function aria2cDownload(url, headers, outputPath, designation) {
  headers = '--header="Accept: */*" --header="accept-language: zh-CN,zh;q=0.9,en;q=0.8" --header="Referer: https://emturbovid.com/" --header="Referrer-Policy: strict-origin-when-cross-origin"'
  return new Promise((resolve, reject) => {
    let o = designation + '.m3u8'
    exec(`aria2c -d ${outputPath} -o ${o} ${headers} ${url}`, (error, stdout, stderr) => {
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


export async function lzyDownload(win, options: {
  url: string,
  directory?: string,
  filename?: string,
}) {
  try {
    await download(win, options.url, {
      directory: options.directory,
      filename: options.filename,
    })
  } catch (error) {
    if (error instanceof CancelError) {
      console.info('item.cancel() was called');
    } else {
      console.error(error);
    }
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
