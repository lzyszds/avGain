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
*/
function getVideo(urlData, i, urlPrefix, headers, path) {
  if (!urlData[i]) return '没有视频了'
  const match = urlData[i].match(/(\d{4}).jpg$/);
  //如果当前视频节点已经下载完成，就跳过  
  if (fs.existsSync(`${path}/${match[1]}.ts`)) {
    return getVideo(urlData, ++i, urlPrefix, headers, path);
  }

  return new Promise(async (resolve, reject) => {
    let res
    res = await requestWithRetry(urlPrefix + urlData[i], headers)
    if (res.statusCode !== 200) {
      await getVideo(urlData, ++i, urlPrefix, headers, path);
    }
    // 获取文件夹的存储大小
    // 将视频流生成二进制数据
    const buffer = Buffer.from(res.body);

    // 将二进制数据写入文件
    // 判断当前文件夹中是否有该文件
    // 如果有就直接写入
    fs.appendFile(`${path}/${match[1]}.ts`, buffer, async (err) => {
      if (err) {
        reject(err); // 将错误传递给 Promise 的拒绝处理
        return;
      }
      if (i < urlData.length) {
        await getVideo(urlData, ++i, urlPrefix, headers, path);
      } else { // 提示用户下载完成
        resolve('下载完成')
      }
    });
  })
}
module.exports = getVideo;


const requestWithRetry = async (url, headers, retryCount = 3) => {
  while (retryCount--) {
    try {
      const res = await superagent
        .get(url)
        .set(headers)
        .timeout({
          response: 1000 * 5,  //等待服务器响应的时间
          deadline: 1000 * 30, //整个请求完成的时间
        })
      return res;
    } catch (err) {
      if (retryCount === 0 || !err.timeout) return err;
      console.log('请求超时，正在尝试再次请求...');
    }
  }
};
