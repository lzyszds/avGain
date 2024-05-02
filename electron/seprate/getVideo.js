const superagent = require("superagent");
const fs = require("fs");
const { exec } = require('child_process');


// 封装递归方法
/* 
  url:视频地址
  i:当前视频所在数组中的索引
  index:当前线程的索引
  urlPrefix:视频地址前缀
  headers:请求头
  path:保存文件夹路径
*/
function getVideo(urlData, i, index, urlPrefix, headers, path, docPath) {
  if (!urlData[i]) return '没有视频了'
  const source = urlData[i].uri.indexOf('video') === 0 ? 'av' : 'super';
  let match
  if (source === 'av') {
    match = urlData[i].uri.match(/(\d+).jpeg$/);
  } else {
    match = urlData[i].uri.match(/(\d{4}).jpg$/);
  }

  //如果当前视频节点已经下载完成，就跳过  
  if (fs.existsSync(`${path}/${match[1]}.ts`)) {
    return getVideo(urlData, ++i, index, urlPrefix, headers, path, docPath);
  }

  return new Promise(async (resolve, reject) => {
    let res
    try {
      res = await requestWithRetryLocal(
        urlPrefix + urlData[i].uri,
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
      return await getVideo(urlData, ++i, index, urlPrefix, headers, path, docPath);
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
        await getVideo(urlData, ++i, index, urlPrefix, headers, path, docPath);
      } else { // 提示用户下载完成
        resolve('下载完成')
      }
    });
  })
}
module.exports = getVideo;

//aria2c版本
const requestWithRetry = (url, headers, path) => {
  return new Promise(async (resolve, reject) => {
    try {
      await aria2cDownload(url, headers, path)
    } catch (err) {
      reject(err)
    }
  })
};



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
    //查看错误信息
    handleLog.set(`🔴 ${err.response.status + "错误信息：" + err.response.error} <br/>`, docPath + '/log.txt')
    return "";
  }
};




//使用aria2c下载
function aria2cDownload(url, headers, outputPath) {
  headers = `-H "Accept: */*" -H "accept-language: zh-CN,zh;q=0.9,en;q=0.8" -H "Referer: https://emturbovid.com/" -H "Referrer-Policy: strict-origin-when-cross-origin"`;
  let name = url.match(/(\d{4}).jpg$/)[1];

  return new Promise((resolve, reject) => {
    exec(`curl -L -o ${outputPath}/${name}.ts ${headers} ${url}`, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      }
      if (stderr) {
        //弹出错误信息
        reject(stderr);
      }
      resolve(true);
    });
  });
}


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
