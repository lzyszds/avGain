import { ElMessage, ElMessageBox } from "element-plus"
import type { messageType } from "element-plus"

export const LzyConfirm = ({
  title = 'Warning',
  content = 'proxy will permanently delete the file. Continue?',
  confirmButtonText = 'OK',
  cancelButtonText = 'Cancel',
  type = 'warning' as messageType,
  confirm = () => { },
  error = () => { },
}) => {
  return ElMessageBox.confirm(
    content,
    title,
    {
      confirmButtonText,
      cancelButtonText,
      type,
    }
  ).then(confirm).catch(error)
}


export const LzyAlert = ({
  title = 'Warning',
  content = 'proxy will permanently delete the file. Continue?',
  confirmButtonText = 'OK',
  type = 'warning' as messageType,
  confirm = () => { },
}) => {
  return ElMessageBox.alert(
    content,
    title,
    {
      confirmButtonText,
      type,
    }
  ).then(confirm)
}
