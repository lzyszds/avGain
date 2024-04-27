const fs = require('fs')

let template = `
const { parentPort } = require("worker_threads");
const getVideo = require("./getVideo.js");
parentPort.on("message", (limit) => {
  const { urlData, urlPrefix,index, headers, downPath, docPath } = limit;
  if (!urlData) {
    return parentPort.postMessage({ msg: '1', result: '下载完成' })
  }
  try {
    getVideo(urlData, 0 ,index, urlPrefix, headers, downPath, docPath)
      .then(res => { }).catch(e => { })
      .finally(() => {
        parentPort.postMessage(index)
      })
  } catch (e) {
    parentPort.postMessage(e)
  }
});
`
// 在文件夹seprate中创建多个文件，每个文件都是一个线程
for (let i = 1; i <= 50; i++) {

  fs.writeFile(`./electron/seprate/seprateThread${i}.js`, template, (err) => {
    if (err) {
      console.log(err);
      throw err;
    }
    console.log(`seprateThread${i}.js创建成功`);
  })
}



