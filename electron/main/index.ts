import { app, BrowserWindow, shell, ipcMain } from 'electron' // 引入electron模块
import { release } from 'node:os' // 引入node:os模块中的release函数
import { join } from 'node:path' // 引入node:path模块中的join函数
import remote from '@electron/remote/main' // 引入@electron/remote/main模块
import { WindowManager } from './handle' // 引入./handle模块中的WindowManager类
import { mkdirsSync, createSystemStore } from '../utils/utils'; // 引入../utils/utils模块中的mkdirsSync和createSystemStore函数

//构建的目录结构
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..') // 设置环境变量DIST_ELECTRON为当前目录的上级目录
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist') // 设置环境变量DIST为DIST_ELECTRON的上级目录的dist目录
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// 在主进程中创建全局变量 根路径
global.appRootPath = join(__dirname, '../../'); // 设置全局变量appRootPath为当前目录的上上级目录

//禁用Windows 7的GPU加速
if (release().startsWith('6.1')) app.disableHardwareAcceleration() // 如果操作系统版本号以'6.1'开头，则禁用GPU加速

//为Windows 10+通知设置应用程序名称
if (process.platform === 'win32') app.setAppUserModelId(app.getName()) // 如果操作系统为win32，则设置应用程序名称为app的名称

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}
//如果你已经使用 chcp 65001 将控制台的字符编码设置为 UTF-8，并且在应用程序中使用了正确的 UTF-8 编码，
//但仍然遇到输出中文字符乱码的问题，可能是 Electron 应用程序的配置或其他因素导致的
//尝试在 Electron 应用程序的主进程中设置以下环境变量：
app.commandLine.appendSwitch('enable-experimental-web-platform-features', 'true'); // 在命令行中添加开关，启用实验性的Web平台特性

//删除电子安全警告
//此警告仅在开发模式中显示
//在上阅读更多信息https://www.electronjs.org/docs/latest/tutorial/security
//process.env[ELECTRON_DISABLE_SECURITY_WARNINGS']='true'

let win: BrowserWindow | null = null // 声明变量win，类型为BrowserWindow或null
let loadingWindow: BrowserWindow | null = null
//在这里，您还可以使用其他预加载
const preload = join(__dirname, '../preload/index.js') // 设置preload变量为preload目录下的index.js文件的路径
const url = process.env.VITE_DEV_SERVER_URL // 设置url变量为环境变量VITE_DEV_SERVER_URL的值
const indexHtml = join(process.env.DIST, 'index.html') // 设置indexHtml变量为DIST目录下的index.html文件的路径

//写入系统存储文件夹以及文件
createSystemStore(app) // 创建系统存储文件夹和文件

remote.initialize() // 初始化remote模块
async function createWindow() {


  win = new BrowserWindow({
    width: 1800,
    height: 1000,
    minWidth: 1260,
    minHeight: 800,
    title: 'avGain',
    autoHideMenuBar: true,//隐藏菜单栏
    show: true, // 先不显示
    frame: false,//隐藏窗口标题栏
    icon: join(process.env.PUBLIC, 'logo.png'),
    webPreferences: {
      devTools: true,
      preload,
      webSecurity: false,
      //警告：启用nodeIntegration和禁用contextIsolation在生产中不安全
      //考虑使用contextBridge.exxposeInMainWorld
      //在上阅读更多信息https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) { // 如果环境变量VITE_DEV_SERVER_URL存在
    win.loadURL(url) // 加载url
    // 如果应用程序未打包，请打开devTool
    win.webContents.openDevTools() // 打开开发者工具
  } else {
    win.loadFile(indexHtml) // 加载indexHtml文件
  }

  // 测试向电子渲染器主动推送消息
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString()) // 发送消息给渲染器进程
  })

  // 使用浏览器而不是应用程序打开所有链接
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url) // 如果url以'https:'开头，则使用浏览器打开外部链接
    return { action: 'deny' }
  })
  remote.enable(win.webContents) // 启用remote模块
  // win.webContents.on('will-navigate', (event, url) => { }) #344



  return win
}
// 预加载（孤立世界）




app.whenReady().then(async () => {
  createLoadingWindow() // 创建加载窗口
  setTimeout(async () => {
    const mainWindow = await createWindow();
    //对窗口进行操作（放大缩小关闭）在此操作自定义属性
    new WindowManager(win!, app, mainWindow);
    loadingWindow?.close()
  }, 2000)

})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    //如果用户试图打开另一个主窗口，请将注意力集中在主窗口上
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

//新窗口示例arg:New windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

// 创建加载窗口函数
function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 400, // 设置窗口宽度为400
    height: 600, // 设置窗口高度为600
    frame: false, // 窗口无边框
    skipTaskbar: false, // 不在任务栏显示窗口
    transparent: true, // 窗口透明
    resizable: false, // 窗口不可调整大小
    icon: join(process.env.PUBLIC, 'logo.png'),

    webPreferences: {
      experimentalFeatures: true, // 启用实验性特性
      // 根据环境设置preload路径
      preload: process.env.NODE_ENV === 'development'
        ? join(app.getAppPath(), 'preload.js') // 开发环境下的preload路径
        : join(app.getAppPath(), 'dist/electron/main/preload.js') // 生产环境下的preload路径
    }
  });
  // 加载包含加载动画的 HTML 文件
  loadingWindow.loadFile(join(global.appRootPath, '/loader.html'));
  loadingWindow.on('closed', () => {
    loadingWindow = null;
  });
}
