import { parentPort } from 'worker_threads';
import superagent from 'superagent';
import fs from "fs";
import path from 'path';
import axios from 'axios';

//设置系统日志功能
const handleLog = {
  set: (text, path) => {
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, text, 'utf-8')
    }
    fs.appendFileSync(path, text + '\n')
  }
}

const axiosFunction = {
  //axios请求方式
  axios: (url) => {
    return axios.get(url, {
      responseType: 'arraybuffer',
      headers: parasData.headers,
    })
  },
  //superagent请求方式
  superagent: (url) => {
    return superagent.get(url).set(parasData.headers)
      .responseType('buffer')
  },
  //检查当前视频片段是否已经下载（非并发下载）
  inspectDownAxios: async function (url) {
    if (!url) return '';
    // if (!url) return handleLog.set(`🟢 某线程所有内容下载完成 <br/>`, parasData.docPath)
    const logPath = parasData.docPath
    let match = url.match(/(\d{1,4}).(jpg|jpeg|png)$/);
    if (!match) {
      handleLog.set(`🔴 没法获取:${url} <br/>`, logPath)
    }
    const videoSegmentPath = `${parasData.downPath}/${match[1]}.ts`
    //如果当前视频片段不存在则进行下载
    if (fs.existsSync(videoSegmentPath)) {
      await this.inspectDownAxios(parasData.urlData[++parasData.count])
    } else {
      await this.downloadSegmentAxios(url, videoSegmentPath);
    }
  },
  downloadSegmentAxios: async function (url, videoSegmentPath) {
    let { urlData, docPath, headers } = parasData;
    try {
      const { data } = await this[parasData.resource](url)
      await mergeTs(data, videoSegmentPath)
      if (++parasData.count === urlData.length) {
        return handleLog.set(`🟢 某线程所有内容下载完成 <br/>`, docPath)
      }
    } catch (e) {
      console.error(`worker.js 98行`, e.message)
      if (e.message === 'Internal Server Error') {
        handleLog.set(`🔴 片段下载出错，即将跨过此下载<br/>`, docPath)
      }
    } finally {
      await axiosFunction.inspectDownAxios(urlData[++parasData.count]);
    }
  },
  //检查当前视频片段是否已经下载（并发下载）
  inspectDownAxiosConcurrency: async function (urls) {
    const that = this
    if (!urls) return handleLog.set(`🟢 某线程所有内容下载完成 <br/>`, parasData.docPath)
    const urlsName = []
    const request = urls.map(url => {
      if (!url) return handleLog.set(`🟢 某线程所有内容下载完成 <br/>`, parasData.docPath)
      const logPath = parasData.docPath
      let match = url.match(/(\d{1,4}).(jpg|jpeg|png)$/);
      if (!match) {
        handleLog.set(`🔴 没法获取:${url} <br/>`, logPath)
      }
      const videoSegmentPath = `${parasData.downPath}/${match[1]}.ts`
      urlsName.push(videoSegmentPath)
      return that[parasData.resource](url)
    })
    const result = await Promise.allSettled(request)

    result.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        const suffix = parasData.resource == 'axios' ? 'data' : 'body'
        mergeTs(res.value[suffix], urlsName[index])
      } else {
        handleLog.set(`🔴 ${res.reason} <br/>`, parasData.docPath)
      }
    })
    if (parasData.count < parasData.urlData.length) {
      that.inspectDownAxiosConcurrency(parasData.newUrls[++parasData.count])
    } else {
      handleLog.set(`🟢 下载完成 <br/>`, parasData.docPath)
    }
  },
  //将集合分成n个小集合  
  sliceDown: function () {
    const n = 3;
    const result = [];
    for (let i = 0; i < parasData.urlData.length; i += n) {
      result.push(parasData.urlData.slice(i, i + n));
    }
    return result;
  }
}

let parasData

parentPort.on("message", async (paras) => {
  let { urlData, downPath, docPath, headers, sizeData } = paras;
  if (!urlData) return
  parasData = {
    urlData,// 视频片段的url集合
    newUrls: [],// 将urlData分成n个小集合
    downPath,// 视频片段的存储路径
    docPath: path.join(docPath, 'log.txt'),// 日志文件的存储路径
    headers, // 下载片段视频的请求头
    count: 0, // 计数器
    resource: sizeData.resource, // 请求方式
    isConcurrency: sizeData.isConcurrency,// isConcurrency 是否并发下载
  }
  try {
    // isConcurrency 是否并发下载
    if (parasData.isConcurrency) {
      parasData.newUrls = axiosFunction.sliceDown()
      axiosFunction.inspectDownAxiosConcurrency(parasData.newUrls[parasData.count])
    } else {
      axiosFunction.inspectDownAxios(urlData[0])
    }
  } catch (e) {
    console.error(`worker.js 31行`, e)
    // handleLog.set(`🔴 ${e} <br/>`, parasData.docPath)
  }
});

async function mergeTs(data, videoSegmentPath) {
  // 将视频流生成二进制数据
  const buffer = Buffer.from(data);

  // 1.将二进制数据写入文件 2.判断当前文件夹中是否有该文件 3.如果有就直接写入
  try {
    await fs.writeFileSync(videoSegmentPath, buffer);
  } catch (err) {
    if (err) {
      handleLog.set(`🔴 ${err} <br/>`, parasData.docPath)
      console.error(`worker.js 80行`, err)
    }
  }
}
