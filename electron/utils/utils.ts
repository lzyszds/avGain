import fs from 'fs'
import path, { join } from 'node:path'
import os from 'os'

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
    for (let i = 1; i <= 20; i++) {
      const documentsPath = path.join(os.homedir(), 'Documents');
      const docPath = path.join(documentsPath, 'javPlayer')
      try {
        fs.writeFile(docPath + `/data/data${i}.json`, `[]`, (err) => {
          if (err) {
            console.log(err);
            throw err;
          }
          console.log(`data${i}.json创建成功`);
        })
      } catch (e) {
        //将文件夹data删除后重新创建
        fs.rmdirSync(join(systemStore, 'data'), { recursive: true });
        createSystemStore(app)
      }
    }
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
