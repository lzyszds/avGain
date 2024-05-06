const superagent = require("superagent");
const fs = require("fs");

// 封装递归方法
/* 
  url:视频地址
  i:当前视频所在数组中的索引
  index:当前线程的索引
  urlPrefix:视频地址前缀
  headers:请求头
  path:保存文件夹路径
  docPath:日志文件路径
*/
function getVideo(urlData, i, index, headers, path, docPath) {
  if (!urlData[i]) return '没有视频了'
  let match = urlData[i].match(/(\d{1,4}).(jpg|jpeg|png)$/);
  if (!match) {
    handleLog.set(`🔴 没法获取(getVideo.js):${urlData[i]} <br/>`, docPath + '/log.txt')
  }

  //如果当前视频节点已经下载完成，就跳过  
  if (fs.existsSync(`${path}/${match[1]}.ts`)) {
    return getVideo(urlData, ++i, index, headers, path, docPath);
  }

  return new Promise(async (resolve, reject) => {
    let res
    try {
      res = await requestWithRetryLocal(
        urlData[i],
        headers,
        path,
        docPath,
        match[1],
        index
      )
    } catch (e) {
      handleLog.set(`🔴 ${e} <br/>`, docPath + '\\log.txt')
    }

    if (!res) {
      return await getVideo(urlData, ++i, index, headers, path, docPath);
    }
    // 获取文件夹的存储大小
    // 将视频流生成二进制数据
    const buffer = Buffer.from(res);

    // 将二进制数据写入文件
    // 判断当前文件夹中是否有该文件
    // 如果有就直接写入
    fs.appendFile(`${path}/${match[1]}.ts`, buffer, async (err) => {
      if (err) {
        reject(err); // 将错误传递给 Promise 的拒绝处理
        handleLog.set(`🔴 ${err} <br/>`, docPath + '\\log.txt')
        return;
      }
      if (i < urlData.length) {
        await getVideo(urlData, ++i, index, headers, path, docPath);
      } else { // 提示用户下载完成
        resolve('下载完成')
      }
    });
  })
}
module.exports = getVideo;

const requestWithRetryLocal = async (url, headers, path, docPath, name, index) => {
  handleLog.set(`🟢 正在下载：${name} ${index}线程 <br/>`, docPath + '/log.txt')
  try {
    const res = await superagent
      .get(url)
      .set(headers)
      .timeout({
        response: 1000 * 5,  //等待服务器响应的时间
      })
      .responseType('buffer');
    return res.body;
  } catch (err) {
    if (err.response) {
      //查看错误信息
      handleLog.set(`🔴 ${err.response.status + "错误信息：" + err.response.error} <br/>`, docPath + '/log.txt')
    } else {
      handleLog.set(`🔴 错误信息：${err} <br/>`, docPath + '/log.txt')
    }
    return "";
  }
};

//设置系统日志功能
const handleLog = {
  set: (text, path) => {
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, text, 'utf-8')
    }
    fs.appendFileSync(path, text + '\n')
  },
  get: (path) => {
    //如果文件不存在则创建
    if (!fs.existsSync(path)) {
      fs.writeFileSync(path, '', 'utf-8')
    } else {
      return fs.readFileSync(path, 'utf-8')
    }
  }
}
