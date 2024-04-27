"use strict";
const electron = require("electron");
const validChannels = [
  // 窗口操作
  "onHandleWin",
  // 获取文件夹路径
  "onHandleOpenDir",
  //存储数据进入系统存储文件夹
  "onHandleStoreData",
  //获取视频列表数据
  "onGetListData",
  //下载视频
  "downloadVideoEvent",
  //暂停下载
  "pauseDownloadEvent",
  //获取下载目录内容
  "getDownloadListContent",
  //清除文件夹内的内容
  "deleteDirFile",
  //创建文件夹
  "onCreateDir",
  //删除视频文件
  "onHandleDeleteFile",
  //合并视频
  "onMergeVideo",
  //打开文件夹
  "onOpenDir",
  //收藏视频
  "onHandleStarVideo",
  //获取当前所有的文件夹配置路径
  "onGetAllDirPath",
  //当添加页面初始进来时，发送下载的进度和总数回去
  "onGetDownloadProgress",
  // 获取系统日志
  "onGetSystemLog",
  //清空系统日志
  "onClearSystemLog"
];
const myElectron = {};
validChannels.forEach((channel) => {
  myElectron[channel] = (...args) => electron.ipcRenderer.invoke(channel, ...args);
});
electron.contextBridge.exposeInMainWorld("myElectron", myElectron);
electron.ipcRenderer.on("download-progress", (event, progress) => {
  console.log(`lzy  progress:`, progress);
});
function domReady(condition = ["complete", "interactive"]) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true);
    } else {
      document.addEventListener("readystatechange", () => {
        if (condition.includes(document.readyState)) {
          resolve(true);
        }
      });
    }
  });
}
const safeDOM = {
  append(parent, child) {
    if (!Array.from(parent.children).find((e) => e === child)) {
      return parent.appendChild(child);
    }
  },
  remove(parent, child) {
    if (Array.from(parent.children).find((e) => e === child)) {
      return parent.removeChild(child);
    }
  }
};
function useLoading() {
  const className = `loaders-css__square-spin`;
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `;
  const oStyle = document.createElement("style");
  const oDiv = document.createElement("div");
  oStyle.id = "app-loading-style";
  oStyle.innerHTML = styleContent;
  oDiv.className = "app-loading-wrap";
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`;
  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle);
      safeDOM.append(document.body, oDiv);
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle);
      safeDOM.remove(document.body, oDiv);
    }
  };
}
const { appendLoading, removeLoading } = useLoading();
domReady().then(appendLoading);
window.onmessage = (ev) => {
  ev.data.payload === "removeLoading" && removeLoading();
};
setTimeout(removeLoading, 2e3);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uLy4uL2VsZWN0cm9uL3ByZWxvYWQvaGFuZGxlLnRzIiwiLi4vLi4vZWxlY3Ryb24vcHJlbG9hZC9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7IGNvbnRleHRCcmlkZ2UsIGlwY1JlbmRlcmVyIH0gZnJvbSAnZWxlY3Ryb24nXG5cblxuY29uc3QgdmFsaWRDaGFubmVscyA9IFtcbiAgLy8g56qX5Y+j5pON5L2cXG4gICdvbkhhbmRsZVdpbicsXG4gIC8vIOiOt+WPluaWh+S7tuWkuei3r+W+hFxuICAnb25IYW5kbGVPcGVuRGlyJyxcbiAgLy/lrZjlgqjmlbDmja7ov5vlhaXns7vnu5/lrZjlgqjmlofku7blpLlcbiAgJ29uSGFuZGxlU3RvcmVEYXRhJyxcbiAgLy/ojrflj5bop4bpopHliJfooajmlbDmja5cbiAgJ29uR2V0TGlzdERhdGEnLFxuICAvL+S4i+i9veinhumikVxuICAnZG93bmxvYWRWaWRlb0V2ZW50JyxcbiAgLy/mmoLlgZzkuIvovb1cbiAgJ3BhdXNlRG93bmxvYWRFdmVudCcsXG4gIC8v6I635Y+W5LiL6L2955uu5b2V5YaF5a65XG4gICdnZXREb3dubG9hZExpc3RDb250ZW50JyxcbiAgLy/muIXpmaTmlofku7blpLnlhoXnmoTlhoXlrrlcbiAgJ2RlbGV0ZURpckZpbGUnLFxuICAvL+WIm+W7uuaWh+S7tuWkuVxuICAnb25DcmVhdGVEaXInLFxuICAvL+WIoOmZpOinhumikeaWh+S7tlxuICAnb25IYW5kbGVEZWxldGVGaWxlJyxcbiAgLy/lkIjlubbop4bpopFcbiAgJ29uTWVyZ2VWaWRlbycsXG4gIC8v5omT5byA5paH5Lu25aS5XG4gICdvbk9wZW5EaXInLFxuICAvL+aUtuiXj+inhumikVxuICAnb25IYW5kbGVTdGFyVmlkZW8nLFxuICAvL+iOt+WPluW9k+WJjeaJgOacieeahOaWh+S7tuWkuemFjee9rui3r+W+hFxuICAnb25HZXRBbGxEaXJQYXRoJyxcbiAgLy/lvZPmt7vliqDpobXpnaLliJ3lp4vov5vmnaXml7bvvIzlj5HpgIHkuIvovb3nmoTov5vluqblkozmgLvmlbDlm57ljrtcbiAgJ29uR2V0RG93bmxvYWRQcm9ncmVzcycsXG4gIC8vIOiOt+WPluezu+e7n+aXpeW/l1xuICAnb25HZXRTeXN0ZW1Mb2cnLFxuICAvL+a4heepuuezu+e7n+aXpeW/l1xuICAnb25DbGVhclN5c3RlbUxvZydcbl1cblxuY29uc3QgbXlFbGVjdHJvbiA9IHt9XG52YWxpZENoYW5uZWxzLmZvckVhY2goKGNoYW5uZWwpID0+IHtcbiAgbXlFbGVjdHJvbltjaGFubmVsXSA9ICguLi5hcmdzKSA9PiBpcGNSZW5kZXJlci5pbnZva2UoY2hhbm5lbCwgLi4uYXJncylcbn0pXG5cblxuY29udGV4dEJyaWRnZS5leHBvc2VJbk1haW5Xb3JsZCgnbXlFbGVjdHJvbicsIG15RWxlY3Ryb24pXG5cbmlwY1JlbmRlcmVyLm9uKCdkb3dubG9hZC1wcm9ncmVzcycsIChldmVudCwgcHJvZ3Jlc3MpID0+IHtcbiAgY29uc29sZS5sb2coYGx6eSAgcHJvZ3Jlc3M6YCwgcHJvZ3Jlc3MpXG5cbn0pO1xuXG5cblxuXG5cblxuIiwiaW1wb3J0ICcuL2hhbmRsZSdcclxuXHJcblxyXG5cclxuXHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuZnVuY3Rpb24gZG9tUmVhZHkoY29uZGl0aW9uOiBEb2N1bWVudFJlYWR5U3RhdGVbXSA9IFsnY29tcGxldGUnLCAnaW50ZXJhY3RpdmUnXSkge1xyXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgaWYgKGNvbmRpdGlvbi5pbmNsdWRlcyhkb2N1bWVudC5yZWFkeVN0YXRlKSkge1xyXG4gICAgICByZXNvbHZlKHRydWUpXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdyZWFkeXN0YXRlY2hhbmdlJywgKCkgPT4ge1xyXG4gICAgICAgIGlmIChjb25kaXRpb24uaW5jbHVkZXMoZG9jdW1lbnQucmVhZHlTdGF0ZSkpIHtcclxuICAgICAgICAgIHJlc29sdmUodHJ1ZSlcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfSlcclxufVxyXG5cclxuY29uc3Qgc2FmZURPTSA9IHtcclxuICBhcHBlbmQocGFyZW50OiBIVE1MRWxlbWVudCwgY2hpbGQ6IEhUTUxFbGVtZW50KSB7XHJcbiAgICBpZiAoIUFycmF5LmZyb20ocGFyZW50LmNoaWxkcmVuKS5maW5kKGUgPT4gZSA9PT0gY2hpbGQpKSB7XHJcbiAgICAgIHJldHVybiBwYXJlbnQuYXBwZW5kQ2hpbGQoY2hpbGQpXHJcbiAgICB9XHJcbiAgfSxcclxuICByZW1vdmUocGFyZW50OiBIVE1MRWxlbWVudCwgY2hpbGQ6IEhUTUxFbGVtZW50KSB7XHJcbiAgICBpZiAoQXJyYXkuZnJvbShwYXJlbnQuY2hpbGRyZW4pLmZpbmQoZSA9PiBlID09PSBjaGlsZCkpIHtcclxuICAgICAgcmV0dXJuIHBhcmVudC5yZW1vdmVDaGlsZChjaGlsZClcclxuICAgIH1cclxuICB9LFxyXG59XHJcblxyXG4vKipcclxuICogaHR0cHM6Ly90b2JpYXNhaGxpbi5jb20vc3BpbmtpdFxyXG4gKiBodHRwczovL2Nvbm5vcmF0aGVydG9uLmNvbS9sb2FkZXJzXHJcbiAqIGh0dHBzOi8vcHJvamVjdHMubHVrZWhhYXMubWUvY3NzLWxvYWRlcnNcclxuICogaHR0cHM6Ly9tYXRlamt1c3RlYy5naXRodWIuaW8vU3BpblRoYXRTaGl0XHJcbiAqL1xyXG5mdW5jdGlvbiB1c2VMb2FkaW5nKCkge1xyXG4gIGNvbnN0IGNsYXNzTmFtZSA9IGBsb2FkZXJzLWNzc19fc3F1YXJlLXNwaW5gXHJcbiAgY29uc3Qgc3R5bGVDb250ZW50ID0gYFxyXG5Aa2V5ZnJhbWVzIHNxdWFyZS1zcGluIHtcclxuICAyNSUgeyB0cmFuc2Zvcm06IHBlcnNwZWN0aXZlKDEwMHB4KSByb3RhdGVYKDE4MGRlZykgcm90YXRlWSgwKTsgfVxyXG4gIDUwJSB7IHRyYW5zZm9ybTogcGVyc3BlY3RpdmUoMTAwcHgpIHJvdGF0ZVgoMTgwZGVnKSByb3RhdGVZKDE4MGRlZyk7IH1cclxuICA3NSUgeyB0cmFuc2Zvcm06IHBlcnNwZWN0aXZlKDEwMHB4KSByb3RhdGVYKDApIHJvdGF0ZVkoMTgwZGVnKTsgfVxyXG4gIDEwMCUgeyB0cmFuc2Zvcm06IHBlcnNwZWN0aXZlKDEwMHB4KSByb3RhdGVYKDApIHJvdGF0ZVkoMCk7IH1cclxufVxyXG4uJHtjbGFzc05hbWV9ID4gZGl2IHtcclxuICBhbmltYXRpb24tZmlsbC1tb2RlOiBib3RoO1xyXG4gIHdpZHRoOiA1MHB4O1xyXG4gIGhlaWdodDogNTBweDtcclxuICBiYWNrZ3JvdW5kOiAjZmZmO1xyXG4gIGFuaW1hdGlvbjogc3F1YXJlLXNwaW4gM3MgMHMgY3ViaWMtYmV6aWVyKDAuMDksIDAuNTcsIDAuNDksIDAuOSkgaW5maW5pdGU7XHJcbn1cclxuLmFwcC1sb2FkaW5nLXdyYXAge1xyXG4gIHBvc2l0aW9uOiBmaXhlZDtcclxuICB0b3A6IDA7XHJcbiAgbGVmdDogMDtcclxuICB3aWR0aDogMTAwdnc7XHJcbiAgaGVpZ2h0OiAxMDB2aDtcclxuICBkaXNwbGF5OiBmbGV4O1xyXG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XHJcbiAganVzdGlmeS1jb250ZW50OiBjZW50ZXI7XHJcbiAgYmFja2dyb3VuZDogIzI4MmMzNDtcclxuICB6LWluZGV4OiA5O1xyXG59XHJcbiAgICBgXHJcbiAgY29uc3Qgb1N0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKVxyXG4gIGNvbnN0IG9EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxyXG5cclxuICBvU3R5bGUuaWQgPSAnYXBwLWxvYWRpbmctc3R5bGUnXHJcbiAgb1N0eWxlLmlubmVySFRNTCA9IHN0eWxlQ29udGVudFxyXG4gIG9EaXYuY2xhc3NOYW1lID0gJ2FwcC1sb2FkaW5nLXdyYXAnXHJcbiAgb0Rpdi5pbm5lckhUTUwgPSBgPGRpdiBjbGFzcz1cIiR7Y2xhc3NOYW1lfVwiPjxkaXY+PC9kaXY+PC9kaXY+YFxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgYXBwZW5kTG9hZGluZygpIHtcclxuICAgICAgc2FmZURPTS5hcHBlbmQoZG9jdW1lbnQuaGVhZCwgb1N0eWxlKVxyXG4gICAgICBzYWZlRE9NLmFwcGVuZChkb2N1bWVudC5ib2R5LCBvRGl2KVxyXG4gICAgfSxcclxuICAgIHJlbW92ZUxvYWRpbmcoKSB7XHJcbiAgICAgIHNhZmVET00ucmVtb3ZlKGRvY3VtZW50LmhlYWQsIG9TdHlsZSlcclxuICAgICAgc2FmZURPTS5yZW1vdmUoZG9jdW1lbnQuYm9keSwgb0RpdilcclxuICAgIH0sXHJcbiAgfVxyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbmNvbnN0IHsgYXBwZW5kTG9hZGluZywgcmVtb3ZlTG9hZGluZyB9ID0gdXNlTG9hZGluZygpXHJcbmRvbVJlYWR5KCkudGhlbihhcHBlbmRMb2FkaW5nKVxyXG5cclxuXHJcbndpbmRvdy5vbm1lc3NhZ2UgPSAoZXYpID0+IHtcclxuICBldi5kYXRhLnBheWxvYWQgPT09ICdyZW1vdmVMb2FkaW5nJyAmJiByZW1vdmVMb2FkaW5nKClcclxufVxyXG5cclxuc2V0VGltZW91dChyZW1vdmVMb2FkaW5nLCAyMDAwKVxyXG5cclxuXHJcbiJdLCJuYW1lcyI6WyJpcGNSZW5kZXJlciIsImNvbnRleHRCcmlkZ2UiXSwibWFwcGluZ3MiOiI7O0FBSUEsTUFBTSxnQkFBZ0I7QUFBQTtBQUFBLEVBRXBCO0FBQUE7QUFBQSxFQUVBO0FBQUE7QUFBQSxFQUVBO0FBQUE7QUFBQSxFQUVBO0FBQUE7QUFBQSxFQUVBO0FBQUE7QUFBQSxFQUVBO0FBQUE7QUFBQSxFQUVBO0FBQUE7QUFBQSxFQUVBO0FBQUE7QUFBQSxFQUVBO0FBQUE7QUFBQSxF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
