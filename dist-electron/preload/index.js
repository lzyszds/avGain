"use strict";const a=require("electron"),s=["onHandleWin","onHandleOpenDir","onHandleStoreData","onGetListData","downloadVideoEvent","pauseDownloadEvent","getDownloadListContent","deleteDirFile","onCreateDir","onHandleDeleteFile","onMergeVideo","onOpenDir","onHandleStarVideo","onGetAllDirPath","onGetDownloadProgress","onGetSystemLog","onClearSystemLog"],i={};s.forEach(e=>{i[e]=(...n)=>a.ipcRenderer.invoke(e,...n)});a.contextBridge.exposeInMainWorld("myElectron",i);a.ipcRenderer.on("download-progress",(e,n)=>{console.log("lzy  progress:",n)});function c(e=["complete","interactive"]){return new Promise(n=>{e.includes(document.readyState)?n(!0):document.addEventListener("readystatechange",()=>{e.includes(document.readyState)&&n(!0)})})}const r={append(e,n){if(!Array.from(e.children).find(t=>t===n))return e.appendChild(n)},remove(e,n){if(Array.from(e.children).find(t=>t===n))return e.removeChild(n)}};function l(){const e="loaders-css__square-spin",n=`
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${e} > div {
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
    `,t=document.createElement("style"),o=document.createElement("div");return t.id="app-loading-style",t.innerHTML=n,o.className="app-loading-wrap",o.innerHTML=`<div class="${e}"><div></div></div>`,{appendLoading(){r.append(document.head,t),r.append(document.body,o)},removeLoading(){r.remove(document.head,t),r.remove(document.body,o)}}}const{appendLoading:p,removeLoading:d}=l();c().then(p);window.onmessage=e=>{e.data.payload==="removeLoading"&&d()};setTimeout(d,2e3);
