import { parentPort } from 'worker_threads';
import getVideo from "./getVideo.js"
parentPort.on("message", (limit) => {
  const { urlData, index, headers, downPath, docPath } = limit;
  if (!urlData) {
    return parentPort.postMessage({ msg: '1', result: '下载完成' })
  }
  try {
    getVideo(urlData, 0, index, headers, downPath, docPath)
      .then(res => { }).catch(e => { })
      .finally(() => {
        parentPort.postMessage(index)
      })
  } catch (e) {
    parentPort.postMessage(e)
  }
});
