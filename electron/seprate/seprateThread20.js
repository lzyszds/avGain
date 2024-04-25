
const { parentPort } = require("worker_threads");
const getVideo = require("./getVideo.js");
parentPort.on("message", (limit) => {
  const { urlData, urlPrefix, headers, downPath } = limit;
  if (!urlData) {
    return parentPort.postMessage({ msg: '1', result: '下载完成' })
  }
  try {
    getVideo(urlData, 0, urlPrefix, headers, downPath)
      .then(res => { }).catch(e => { })
      .finally(() => {
        parentPort.postMessage(index)
      })
  } catch (e) {
    parentPort.postMessage(e)
  }
});
