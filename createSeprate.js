const fs = require('fs')

let template = `
const { parentPort } = require("worker_threads");
const getVideo = require("./getVideo.js");
parentPort.on("message", (limit) => {
  const { urlData, i, urlPrefix, headers, downPath } = limit;
  if (!urlPrefix || !urlData[i]) {
    return parentPort.postMessage({ msg: '1', result: '下载完成' })
  }
  try {
    getVideo(urlData, 0, i, urlPrefix, headers, downPath)
      .then(res => {
      }).catch(e => {
      }).finally(() => {
        parentPort.postMessage(i)
      })
  } catch (e) {
    parentPort.postMessage(e)
  }
});
`

for (let i = 0; i < 20; i++) {
  fs.writeFile(`./electron/data/data${i}.json`, `[]`, (err) => {
    if (err) {
      console.log(err);
      throw err;
    }
    console.log(`data${i}.json创建成功`);
  })
}


return


// 在文件夹seprate中创建多个文件，每个文件都是一个线程
for (let i = 1; i < 20; i++) {

  fs.writeFile(`./electron/seprate/seprateThread${i}.js`, template, (err) => {
    if (err) {
      console.log(err);
      throw err;
    }
    console.log(`seprateThread${i}.js创建成功`);
  })
}



