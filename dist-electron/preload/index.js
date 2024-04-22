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
  //下载进度获取
  "getDownloadSpeed",
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
  "onGetAllDirPath"
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzIjpbIi4uLy4uL2VsZWN0cm9uL3ByZWxvYWQvaGFuZGxlLnRzIiwiLi4vLi4vZWxlY3Ryb24vcHJlbG9hZC9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJcbmltcG9ydCB7IGNvbnRleHRCcmlkZ2UsIGlwY1JlbmRlcmVyIH0gZnJvbSAnZWxlY3Ryb24nXG5cblxuY29uc3QgdmFsaWRDaGFubmVscyA9IFtcbiAgLy8g56qX5Y+j5pON5L2cXG4gICdvbkhhbmRsZVdpbicsXG4gIC8vIOiOt+WPluaWh+S7tuWkuei3r+W+hFxuICAnb25IYW5kbGVPcGVuRGlyJyxcbiAgLy/lrZjlgqjmlbDmja7ov5vlhaXns7vnu5/lrZjlgqjmlofku7blpLlcbiAgJ29uSGFuZGxlU3RvcmVEYXRhJyxcbiAgLy/ojrflj5bop4bpopHliJfooajmlbDmja5cbiAgJ29uR2V0TGlzdERhdGEnLFxuICAvL+S4i+i9veinhumikVxuICAnZG93bmxvYWRWaWRlb0V2ZW50JyxcbiAgLy/kuIvovb3ov5vluqbojrflj5ZcbiAgJ2dldERvd25sb2FkU3BlZWQnLFxuICAvL+iOt+WPluS4i+i9veebruW9leWGheWuuVxuICAnZ2V0RG93bmxvYWRMaXN0Q29udGVudCcsXG4gIC8v5riF6Zmk5paH5Lu25aS55YaF55qE5YaF5a65XG4gICdkZWxldGVEaXJGaWxlJyxcbiAgLy/liJvlu7rmlofku7blpLlcbiAgJ29uQ3JlYXRlRGlyJyxcbiAgLy/liKDpmaTop4bpopHmlofku7ZcbiAgJ29uSGFuZGxlRGVsZXRlRmlsZScsXG4gIC8v5ZCI5bm26KeG6aKRXG4gICdvbk1lcmdlVmlkZW8nLFxuICAvL+aJk+W8gOaWh+S7tuWkuVxuICAnb25PcGVuRGlyJyxcbiAgLy/mlLbol4/op4bpopFcbiAgJ29uSGFuZGxlU3RhclZpZGVvJyxcbiAgLy/ojrflj5blvZPliY3miYDmnInnmoTmlofku7blpLnphY3nva7ot6/lvoRcbiAgJ29uR2V0QWxsRGlyUGF0aCcsXG5dXG5cbmNvbnN0IG15RWxlY3Ryb24gPSB7fVxudmFsaWRDaGFubmVscy5mb3JFYWNoKChjaGFubmVsKSA9PiB7XG4gIG15RWxlY3Ryb25bY2hhbm5lbF0gPSAoLi4uYXJncykgPT4gaXBjUmVuZGVyZXIuaW52b2tlKGNoYW5uZWwsIC4uLmFyZ3MpXG59KVxuXG5cbmNvbnRleHRCcmlkZ2UuZXhwb3NlSW5NYWluV29ybGQoJ215RWxlY3Ryb24nLCBteUVsZWN0cm9uKVxuXG5pcGNSZW5kZXJlci5vbignZG93bmxvYWQtcHJvZ3Jlc3MnLCAoZXZlbnQsIHByb2dyZXNzKSA9PiB7XG4gIGNvbnNvbGUubG9nKGBsenkgIHByb2dyZXNzOmAsIHByb2dyZXNzKVxuXG59KTtcblxuXG5cblxuXG5cbiIsImltcG9ydCAnLi9oYW5kbGUnXHJcblxyXG5cclxuXHJcblxyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbmZ1bmN0aW9uIGRvbVJlYWR5KGNvbmRpdGlvbjogRG9jdW1lbnRSZWFkeVN0YXRlW10gPSBbJ2NvbXBsZXRlJywgJ2ludGVyYWN0aXZlJ10pIHtcclxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgIGlmIChjb25kaXRpb24uaW5jbHVkZXMoZG9jdW1lbnQucmVhZHlTdGF0ZSkpIHtcclxuICAgICAgcmVzb2x2ZSh0cnVlKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncmVhZHlzdGF0ZWNoYW5nZScsICgpID0+IHtcclxuICAgICAgICBpZiAoY29uZGl0aW9uLmluY2x1ZGVzKGRvY3VtZW50LnJlYWR5U3RhdGUpKSB7XHJcbiAgICAgICAgICByZXNvbHZlKHRydWUpXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gIH0pXHJcbn1cclxuXHJcbmNvbnN0IHNhZmVET00gPSB7XHJcbiAgYXBwZW5kKHBhcmVudDogSFRNTEVsZW1lbnQsIGNoaWxkOiBIVE1MRWxlbWVudCkge1xyXG4gICAgaWYgKCFBcnJheS5mcm9tKHBhcmVudC5jaGlsZHJlbikuZmluZChlID0+IGUgPT09IGNoaWxkKSkge1xyXG4gICAgICByZXR1cm4gcGFyZW50LmFwcGVuZENoaWxkKGNoaWxkKVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgcmVtb3ZlKHBhcmVudDogSFRNTEVsZW1lbnQsIGNoaWxkOiBIVE1MRWxlbWVudCkge1xyXG4gICAgaWYgKEFycmF5LmZyb20ocGFyZW50LmNoaWxkcmVuKS5maW5kKGUgPT4gZSA9PT0gY2hpbGQpKSB7XHJcbiAgICAgIHJldHVybiBwYXJlbnQucmVtb3ZlQ2hpbGQoY2hpbGQpXHJcbiAgICB9XHJcbiAgfSxcclxufVxyXG5cclxuLyoqXHJcbiAqIGh0dHBzOi8vdG9iaWFzYWhsaW4uY29tL3NwaW5raXRcclxuICogaHR0cHM6Ly9jb25ub3JhdGhlcnRvbi5jb20vbG9hZGVyc1xyXG4gKiBodHRwczovL3Byb2plY3RzLmx1a2VoYWFzLm1lL2Nzcy1sb2FkZXJzXHJcbiAqIGh0dHBzOi8vbWF0ZWprdXN0ZWMuZ2l0aHViLmlvL1NwaW5UaGF0U2hpdFxyXG4gKi9cclxuZnVuY3Rpb24gdXNlTG9hZGluZygpIHtcclxuICBjb25zdCBjbGFzc05hbWUgPSBgbG9hZGVycy1jc3NfX3NxdWFyZS1zcGluYFxyXG4gIGNvbnN0IHN0eWxlQ29udGVudCA9IGBcclxuQGtleWZyYW1lcyBzcXVhcmUtc3BpbiB7XHJcbiAgMjUlIHsgdHJhbnNmb3JtOiBwZXJzcGVjdGl2ZSgxMDBweCkgcm90YXRlWCgxODBkZWcpIHJvdGF0ZVkoMCk7IH1cclxuICA1MCUgeyB0cmFuc2Zvcm06IHBlcnNwZWN0aXZlKDEwMHB4KSByb3RhdGVYKDE4MGRlZykgcm90YXRlWSgxODBkZWcpOyB9XHJcbiAgNzUlIHsgdHJhbnNmb3JtOiBwZXJzcGVjdGl2ZSgxMDBweCkgcm90YXRlWCgwKSByb3RhdGVZKDE4MGRlZyk7IH1cclxuICAxMDAlIHsgdHJhbnNmb3JtOiBwZXJzcGVjdGl2ZSgxMDBweCkgcm90YXRlWCgwKSByb3RhdGVZKDApOyB9XHJcbn1cclxuLiR7Y2xhc3NOYW1lfSA+IGRpdiB7XHJcbiAgYW5pbWF0aW9uLWZpbGwtbW9kZTogYm90aDtcclxuICB3aWR0aDogNTBweDtcclxuICBoZWlnaHQ6IDUwcHg7XHJcbiAgYmFja2dyb3VuZDogI2ZmZjtcclxuICBhbmltYXRpb246IHNxdWFyZS1zcGluIDNzIDBzIGN1YmljLWJlemllcigwLjA5LCAwLjU3LCAwLjQ5LCAwLjkpIGluZmluaXRlO1xyXG59XHJcbi5hcHAtbG9hZGluZy13cmFwIHtcclxuICBwb3NpdGlvbjogZml4ZWQ7XHJcbiAgdG9wOiAwO1xyXG4gIGxlZnQ6IDA7XHJcbiAgd2lkdGg6IDEwMHZ3O1xyXG4gIGhlaWdodDogMTAwdmg7XHJcbiAgZGlzcGxheTogZmxleDtcclxuICBhbGlnbi1pdGVtczogY2VudGVyO1xyXG4gIGp1c3RpZnktY29udGVudDogY2VudGVyO1xyXG4gIGJhY2tncm91bmQ6ICMyODJjMzQ7XHJcbiAgei1pbmRleDogOTtcclxufVxyXG4gICAgYFxyXG4gIGNvbnN0IG9TdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJylcclxuICBjb25zdCBvRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JylcclxuXHJcbiAgb1N0eWxlLmlkID0gJ2FwcC1sb2FkaW5nLXN0eWxlJ1xyXG4gIG9TdHlsZS5pbm5lckhUTUwgPSBzdHlsZUNvbnRlbnRcclxuICBvRGl2LmNsYXNzTmFtZSA9ICdhcHAtbG9hZGluZy13cmFwJ1xyXG4gIG9EaXYuaW5uZXJIVE1MID0gYDxkaXYgY2xhc3M9XCIke2NsYXNzTmFtZX1cIj48ZGl2PjwvZGl2PjwvZGl2PmBcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGFwcGVuZExvYWRpbmcoKSB7XHJcbiAgICAgIHNhZmVET00uYXBwZW5kKGRvY3VtZW50LmhlYWQsIG9TdHlsZSlcclxuICAgICAgc2FmZURPTS5hcHBlbmQoZG9jdW1lbnQuYm9keSwgb0RpdilcclxuICAgIH0sXHJcbiAgICByZW1vdmVMb2FkaW5nKCkge1xyXG4gICAgICBzYWZlRE9NLnJlbW92ZShkb2N1bWVudC5oZWFkLCBvU3R5bGUpXHJcbiAgICAgIHNhZmVET00ucmVtb3ZlKGRvY3VtZW50LmJvZHksIG9EaXYpXHJcbiAgICB9LFxyXG4gIH1cclxufVxyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5jb25zdCB7IGFwcGVuZExvYWRpbmcsIHJlbW92ZUxvYWRpbmcgfSA9IHVzZUxvYWRpbmcoKVxyXG5kb21SZWFkeSgpLnRoZW4oYXBwZW5kTG9hZGluZylcclxuXHJcblxyXG53aW5kb3cub25tZXNzYWdlID0gKGV2KSA9PiB7XHJcbiAgZXYuZGF0YS5wYXlsb2FkID09PSAncmVtb3ZlTG9hZGluZycgJiYgcmVtb3ZlTG9hZGluZygpXHJcbn1cclxuXHJcbnNldFRpbWVvdXQocmVtb3ZlTG9hZGluZywgMjAwMClcclxuXHJcblxyXG4iXSwibmFtZXMiOlsiaXBjUmVuZGVyZXIiLCJjb250ZXh0QnJpZGdlIl0sIm1hcHBpbmdzIjoiOztBQUlBLE1BQU0sZ0JBQWdCO0FBQUE7QUFBQSxFQUVwQjtBQUFBO0FBQUEsRUFFQTtBQUFBO0FBQUEsRUFFQTtBQUFBO0FBQUEsRUFFQTtBQUFBO0FBQUEsRUFFQTtBQUFBO0FBQUEsRUFFQTtBQUFBO0FBQUEsRUFFQTtBQUFBO0FBQUEsRUFFQTtBQUFBO0FBQUEsRUFFQTtBQUFBO0FBQUEsRUFFQTtBQUFBO0FBQUEsRUFFQTtBQUFBO0FBQUEsRUFFQTtBQUFBO0FBQUEsRUFFQTtBQUFBO0FBQUEsRUFFQTtBQUNGO0FBRUEsTUFBTSxhQUFhLENBQUE7QUFDbkIsY0FBYyxRQUFRLENBQUMsWUFBWTtBQUN0QixhQUFBLE9BQU8sSUFBSSxJQUFJLFNBQVNBLHFCQUFZLE9BQU8sU0FBUyxHQUFHLElBQUk7QUFDeEUsQ0FBQztBQUdEQyxTQUFBQSxjQUFjLGtCQUFrQixjQUFjLFVBQVU7QUFFeERELFNBQUEsWUFBWSxHQUFHLHFCQUFxQixDQUFDLE9BQU8sYUFBYTtBQUMvQyxVQUFBLElBQUksa0JBQWtCLFFBQVE7QUFFeEMsQ0FBQztBQ3ZDRCxTQUFTLFNBQVMsWUFBa0MsQ0FBQyxZQUFZLGFBQWEsR0FBRztBQUN4RSxTQUFBLElBQUksUUFBUSxDQUFDLFlBQVk7QUFDOUIsUUFBSSxVQUFVLFNBQVMsU0FBUyxVQUFVLEdBQUc7QUFDM0MsY0FBUSxJQUFJO0FBQUEsSUFBQSxPQUNQO0FBQ0ksZUFBQSxpQkFBaUIsb0JBQW9CLE1BQU07QUFDbEQsWUFBSSxVQUFVLFNBQVMsU0FBUyxVQUFVLEdBQUc7QUFDM0Msa0JBQVEsSUFBSTtBQUFBLFFBQ2Q7QUFBQSxNQUFBLENBQ0Q7QUFBQSxJQUNIO0FBQUEsRUFBQSxDQUNEO0FBQ0g7QUFFQSxNQUFNLFVBQVU7QUFBQSxFQUNkLE9BQU8sUUFBcUIsT0FBb0I7QUFDMUMsUUFBQSxDQUFDLE1BQU0sS0FBSyxPQUFPLFFBQVEsRUFBRSxLQUFLLENBQUEsTUFBSyxNQUFNLEtBQUssR0FBRztBQUNoRCxhQUFBLE9BQU8sWUFBWSxLQUFLO0FBQUEsSUFDakM7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPLFFBQXFCLE9BQW9CO0FBQzFDLFFBQUEsTUFBTSxLQUFLLE9BQU8sUUFBUSxFQUFFLEtBQUssQ0FBQSxNQUFLLE1BQU0sS0FBSyxHQUFHO0FBQy9DLGFBQUEsT0FBTyxZQUFZLEtBQUs7QUFBQSxJQUNqQztBQUFBLEVBQ0Y7QUFDRjtBQVFBLFNBQVMsYUFBYTtBQUNwQixRQUFNLFlBQVk7QUFDbEIsUUFBTSxlQUFlO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsR0FPcEIsU0FBUztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBb0JKLFFBQUEsU0FBUyxTQUFTLGNBQWMsT0FBTztBQUN2QyxRQUFBLE9BQU8sU0FBUyxjQUFjLEtBQUs7QUFFekMsU0FBTyxLQUFLO0FBQ1osU0FBTyxZQUFZO0FBQ25CLE9BQUssWUFBWTtBQUNaLE9BQUEsWUFBWSxlQUFlLFNBQVM7QUFFbEMsU0FBQTtBQUFBLElBQ0wsZ0JBQWdCO0FBQ04sY0FBQSxPQUFPLFNBQVMsTUFBTSxNQUFNO0FBQzVCLGNBQUEsT0FBTyxTQUFTLE1BQU0sSUFBSTtBQUFBLElBQ3BDO0FBQUEsSUFDQSxnQkFBZ0I7QUFDTixjQUFBLE9BQU8sU0FBUyxNQUFNLE1BQU07QUFDNUIsY0FBQSxPQUFPLFNBQVMsTUFBTSxJQUFJO0FBQUEsSUFDcEM7QUFBQSxFQUFBO0FBRUo7QUFHQSxNQUFNLEVBQUUsZUFBZSxrQkFBa0I7QUFDekMsV0FBVyxLQUFLLGFBQWE7QUFHN0IsT0FBTyxZQUFZLENBQUMsT0FBTztBQUN0QixLQUFBLEtBQUssWUFBWSxtQkFBbUIsY0FBYztBQUN2RDtBQUVBLFdBQVcsZUFBZSxHQUFJOyJ9
