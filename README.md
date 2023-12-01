# 功能介绍

### AV 爬取软件 只支持两个平台

1. https://supjav.com
2. https://missav.com

# 注意事项

1. vite-plugin-electron 这个依赖要装新版本的，不然在 viteconfig 里面导入会报错

2. electron 不能使用 pnpm 来安装，只能使用 npm 或者 yarn 来安装，不然打包会找不到依赖

# 使用步骤

1. 必须要先设置存储路径,不然所有功能都不能使用
   ![初始界面](/public/image.png)
2. 前往指定平台拿到需要爬取的数据的 url 名字
   ![添加界面](/public/image-1.png)
3. 添加界面，添加具体需要爬取的数据详情 点击 add item 等待爬取即可
   ![Alt text](/public/image-2.png)
