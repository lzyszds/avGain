import { parentPort } from 'worker_threads';
import superagent from 'superagent';
import fs from "fs";
import path from 'path';

//设置系统日志功能
const handleLog = {
  set: (text, path) => {
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, text, 'utf-8')
    }
    fs.appendFileSync(path, text + '\n')
  }
}

let parasData

parentPort.on("message", async (paras) => {
  let { urlData, downPath, docPath, headers } = paras;
  if (!urlData) return
  parasData = {
    urlData,// 视频片段的url集合
    newUrls: [],// 将urlData分成n个小集合
    downPath,// 视频片段的存储路径
    docPath: path.join(docPath, 'log.txt'),// 日志文件的存储路径
    headers, // 下载片段视频的请求头
    count: 0 // 计数器
  }
  try {
    parasData.newUrls = sliceDown()
    multitask(parasData.newUrls[parasData.count])
  } catch (e) {
    console.error(`worker.js 31行`, e)
    // handleLog.set(`🔴 ${e} <br/>`, parasData.docPath)
  }
});

//将集合分成n个小集合  
function sliceDown() {
  const n = 3;
  const result = [];
  for (let i = 0; i < parasData.urlData.length; i += n) {
    result.push(parasData.urlData.slice(i, i + n));
  }
  return result;
}

// //将小集合里的片段使用Promise.all下载 返回一个结果数组
// async function downSegmentArr(urlArr) {
//   return await Promise.all(urlArr.map(url => {
//     return superagent.get(url).set(parasData.headers)
//       .timeout({ response: 1000 * 5 })
//       .responseType('buffer')
//   }))
// }



//检查当前视频片段是否已经下载
async function inspectDown() {
  // if (!url) return handleLog.set(`🟢 某线程所有内容下载完成 <br/>`, parasData.docPath)

  // //如果当前视频片段不存在则进行下载
  // if (fs.existsSync(videoSegmentPath)) {
  //   return await inspectDown(parasData.urlData[++parasData.count])
  // } else {
  //   return await downloadSegment(url, videoSegmentPath);
  // }
  const newUrls = sliceDown()
  console.log(`lzy  newUrls:`, newUrls)
  multitask(newUrls[parasData.count])
}



//下载视频片段
async function downloadSegment(url, videoSegmentPath) {
  let res = ""
  let { urlData, docPath, headers } = parasData;
  try {
    res = await superagent.get(url).set(headers)
      .timeout({ response: 1000 * 5 })
      .responseType('buffer');
  } catch (e) {
    // console.error(`worker.js 66行`, e)
    if (e.message === 'Internal Server Error') {
      handleLog.set(`🔴 片段下载出错，即将跨过此下载<br/>`, docPath)
    }
    // else {
    //   handleLog.set(`🔴 worker.js 66行 ${e}  <br/>`, docPath)
    // }
    return await inspectDown(urlData[++parasData.count]);
  }
  // 将视频流生成二进制数据
  const buffer = Buffer.from(res.body);

  // 1.将二进制数据写入文件 2.判断当前文件夹中是否有该文件 3.如果有就直接写入
  try {
    await fs.writeFileSync(videoSegmentPath, buffer);
  } catch (err) {
    if (err) {
      handleLog.set(`🔴 ${err} <br/>`, docPath)
      // console.error(`worker.js 80行`, err)
    }
  } finally {
    if (parasData.count < urlData.length) {
      inspectDown(urlData[parasData.count]);
    } else {
      handleLog.set(`🟢 下载完成 <br/>`, docPath)
    }
  }
}




async function multitask(urls) {
  if (!urls) return handleLog.set(`🟢 某线程所有内容下载完成 <br/>`, parasData.docPath)
  const urlsName = []
  const request = urls.map(url => {
    const logPath = parasData.docPath
    let match = url.match(/(\d{1,4}).(jpg|jpeg|png)$/);
    if (!match) {
      handleLog.set(`🔴 没法获取:${url} <br/>`, logPath)
    }
    const videoSegmentPath = `${parasData.downPath}/${match[1]}.ts`
    urlsName.push(videoSegmentPath)
    return superagent.get(url).set(parasData.headers)
      .timeout({ response: 1000 * 5 })
      .responseType('buffer')
  })
  const result = await Promise.allSettled(request)

  result.forEach((res, index) => {
    if (res.status === 'fulfilled') {
      mergeTs(res.value, urlsName[index])
    } else {
      handleLog.set(`🔴 ${res.reason} <br/>`, parasData.docPath)
    }
  })
  if (parasData.count < parasData.urlData.length) {
    multitask(parasData.newUrls[++parasData.count])
  } else {
    handleLog.set(`🟢 下载完成 <br/>`, parasData.docPath)
  }
}

async function mergeTs(res, videoSegmentPath) {
  // 将视频流生成二进制数据
  const buffer = Buffer.from(res.body);

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
