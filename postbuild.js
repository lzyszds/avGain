/**
 * 打包完成后，将打包好的文件复制到electron_nsis_UI文件夹下，
 * 然后运行bat脚本生成安装包
 *  */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
const workingDir = path.join(process.cwd(), '../electron_nsis_UI')

const filesToInstall = path.join(workingDir, 'filesToInstall')


//清空文件夹
emptyDir(filesToInstall).then(res => {
  emptyDir(path.join(workingDir, 'Output')).then(res => {
    console.log(res, '即将清空Output文件夹')
  })
  console.log(res, '即将复制文件夹');
  //复制文件夹
  copyDir(path.join(process.cwd(), 'build/win-unpacked'), filesToInstall)
    .then(item => {
      console.log(item, '即将生成安装包');
      //运行bat脚本，生成exe安装包
      // 执行 .bat 文件
      const process = spawn('cmd.exe', ['/c', 'build-songliwu-nozip.bat'], {
        cwd: workingDir // 设置工作目录
      });

      process.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
      });

      process.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });

      process.on('close', (code) => {
        console.log(`安装包生成成功`);
      });

    })
});



//清空文件夹
function emptyDir(dirPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dirPath)) {
      fs.readdirSync(dirPath).forEach((file) => {
        const currentPath = path.join(dirPath, file);
        if (fs.lstatSync(currentPath).isDirectory()) {
          // 递归删除子文件夹
          emptyDir(currentPath);
          fs.rmdirSync(currentPath);
        } else {
          // 删除文件
          fs.unlinkSync(currentPath);
        }
      });
      resolve("文件夹清空成功");
    } else {
      console.log("文件夹不存在");
      resolve("文件夹不存在");
    }
  })
}

//复制文件夹
function copyDir(src, dest) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest);
    }

    fs.readdirSync(src).forEach((file) => {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);

      if (fs.lstatSync(srcPath).isDirectory()) {
        // 递归复制子文件夹
        copyDir(srcPath, destPath);
      } else {
        // 复制文件
        fs.copyFileSync(srcPath, destPath);
      }
    });
    resolve("文件夹复制成功");
  })
}
