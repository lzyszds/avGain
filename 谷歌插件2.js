// ==UserScript==
// @name        New script missav.com
// @namespace   Violentmonkey Scripts
// @match       https://missav.com/dm*/*
// @match       https://supjav.com/zh*
// @grant       none
// @version     1.0
// @author      -
// @description 2024/5/1 00:07:07
// ==/UserScript==

document.querySelectorAll(".thumbnail ").forEach(res => {
    if (res.querySelector("a").getAttribute("alt").indexOf("uncensored") < 0) {
        if (location.pathname.indexOf("uncensored") < 0) {
            res.querySelector("a").parentNode.parentNode.parentNode.remove()
        }
    }
})


document.querySelectorAll("div.post").forEach((res) => {
    if (!res.querySelector("h3").innerText.includes("无码破解")) {
        res.style.display = "none"
    }
})

//如果页面的路由为数字.html则自动播放
// 获取当前页面的 url
let url = window.location.href;

// 使用正则表达式检查 url 是否包含数字.html
let regex = /\d+\.html$/;
console.log(regex.test(url))
// 如果 url 合法，自动播放视频
if (regex.test(url)) {
    setTimeout(() => {
        document.querySelector("#vserver").click()
        setTimeout(() => {
            console.log(window.m3u8Url)
        }, 5000)
    }, 500)

}


