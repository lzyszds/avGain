const superagent = require("superagent");
const fs = require("fs");

// 封装递归方法
/* 
  url:视频地址
  i:视频的索引
  index:当前线程的索引
  flag:是否显示进度条
  urlPrefix:视频地址前缀
  headers:请求头
  path:保存文件夹路径
*/
function getVideo(urlData, i, index, urlPrefix, headers, path, docPath) {
  return new Promise(async (resolve, reject) => {
    const appPath = __dirname + `../../../electron/`
    let resa
    try {
      resa = await superagent.get(urlPrefix + urlData[i]).set(headers);

      // 获取文件夹的存储大小
      // 将视频流生成二进制数据
      const buffer = Buffer.from(resa.body);
      // 将二进制数据写入文件
      // 判断当前文件夹中是否有该文件
      // 如果有就直接写入
      fs.appendFile(`${path}/${i}.ts`, buffer, async (err) => {
        if (err) {
          reject(err); // 将错误传递给 Promise 的拒绝处理
          return;
        }
        if (i < urlData.length) {
          try {
            const dataPath = docPath + `/data/data${index}.json`
            let data = fs.readFileSync(dataPath, 'utf-8')
            data = JSON.parse(data)
            data.push(i)
            fs.writeFileSync(dataPath, JSON.stringify(data), 'utf-8')
            await getVideo(urlData, ++i, index, urlPrefix, headers, path, docPath);

          } catch (error) {
            reject(error); // 将错误传递给 Promise 的拒绝处理
          }
        } else { // 提示用户下载完成
          resolve('下载完成')
        }
      });
    } catch (e) {
      reject('下载完成' + index + e)
      // console.log('superagent的问题|下载完成' + index,);
    }
  })
}
export default getVideo;
