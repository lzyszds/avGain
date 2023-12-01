"use strict";const r=require("electron"),s=["onHandleWin","onHandleOpenDir","onHandleStoreData","onGetListData","downloadVideoEvent","getDownloadSpeed","getDownloadListContent","deleteDirFile","onCreateDir"],i={};s.forEach(e=>{i[e]=(...t)=>r.ipcRenderer.invoke(e,...t)});r.contextBridge.exposeInMainWorld("myElectron",i);function c(e=["complete","interactive"]){return new Promise(t=>{e.includes(document.readyState)?t(!0):document.addEventListener("readystatechange",()=>{e.includes(document.readyState)&&t(!0)})})}const a={append(e,t){if(!Array.from(e.children).find(n=>n===t))return e.appendChild(t)},remove(e,t){if(Array.from(e.children).find(n=>n===t))return e.removeChild(t)}};function p(){const e="loaders-css__square-spin",t=`
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
    `,n=document.createElement("style"),o=document.createElement("div");return n.id="app-loading-style",n.innerHTML=t,o.className="app-loading-wrap",o.innerHTML=`<div class="${e}"><div></div></div>`,{appendLoading(){a.append(document.head,n),a.append(document.body,o)},removeLoading(){a.remove(document.head,n),a.remove(document.body,o)}}}const{appendLoading:l,removeLoading:d}=p();c().then(l);window.onmessage=e=>{e.data.payload==="removeLoading"&&d()};setTimeout(d,2e3);
