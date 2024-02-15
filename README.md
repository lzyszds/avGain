# AV 爬取软件

## 功能介绍

### AV 爬取软件 只支持两个平台

1. https://supjav.com
2. https://missav.com

## 注意事项

1. vite-plugin-electron 这个依赖要装新版本的，不然在 viteconfig 里面导入会报错

2. electron 不能使用 pnpm 来安装，只能使用 npm 或者 yarn 来安装，不然打包会找不到依赖

## 使用步骤

必须先安装 ffmpeg 不然无法转换视频格式
安装方法
<https://ffmpeg.org/download.html#build-windows>
下载完成，直接导入进环境变量即可
在终端中输入 ffmpeg -version 查看是否安装成功

1. 必须要先设置存储路径,不然所有功能都不能使用
   ![初始界面](/public/image.png)
2. 前往指定平台拿到需要爬取的数据的 url 名字
   ![添加界面](/public/image-1.png)
3. 添加界面，添加具体需要爬取的数据详情 点击 add item 等待爬取即可
   ![Alt text](/public/image-2.png)
4. 必须要使用 cloudflare warp 来进行网络加速，不然会很慢 会出问题
   ![Alt text](/public/image-3.png)

## 未来功能

1. 优化下载速度 下载进度(打包后下载进度不显示的问题)
2. 提供一次性存放下载多个视频的功能:参考地址 https://www.bilibili.com/video/BV18U421Z7Vu/?spm_id_from=333.1007.tianma.1-3-3.click&vd_source=8a482a2fb14954000737d525b2ad633c

