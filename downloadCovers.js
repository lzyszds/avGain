const fs = require('fs')
const videoArr = fs.readdirSync("H:/av/public/video")
const coverArr = fs.readdirSync("H:/av/public/cover")
const coverIdArr = coverArr.map((item) => {
  return getVideoId(item)
})
//根据视频文件夹来获取没有封面的视频
coverArr.forEach((item) => {
  const name = item.split('.jpg')[0]
  const index = videoArr.indexOf(name + '.mp4')
  if (index > -1) {
    videoArr.splice(index, 1)
  }
})

console.log("没有封面的视频", videoArr);
console.log("重复的封面", findRepeat(coverIdArr));
//找出只有封面没有视频的番号
const existArr = coverIdArr.filter((item) => {
  if (item) {
    const videoId = getVideoId(item)
    return videoArr.indexOf(videoId) !== -1
  } else {
    return true
  }
})
console.log("只有封面没有视频的番号", existArr, coverIdArr.length);
//找出一个数组中重复出现的元素
function findRepeat(arr) {
  const result = []
  arr.forEach((item, index) => {
    if (arr.indexOf(item) !== index && result.indexOf(item) === -1) {
      result.push(item)
    }
  })
  return result
}




//将没有封面的视频封面进行下载
// existArr.forEach((item) => {
//   const videoId = getVideoId(item)
//   if (videoId) {
//     const name = item.split('.mp4')[0]
//     getPreviewVideo(videoId, name, 0, previewPath, coverPath)
//   }
// })
//识别视频番号
function getVideoId(val) {
  //使用正则
  const reg = /[a-zA-Z]{2,6}-\d{3}/
  const result = val.match(reg)
  return result ? result[0] : null
}
