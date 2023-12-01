import { globalShortcut } from 'electron'

// 注册全局快捷键
export function startRecordShortcut(fn) {
  globalShortcut.register('CommandOrControl+Alt+F', fn)
}
