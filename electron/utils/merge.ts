import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { handleLog } from "./utils.js";
const ffmpeg = 'ffmpeg';  // 替换你的ffmpeg程序的完整路径，如果ffmpeg在环境变量中，直接写'ffmpeg'即可。

//fs获取用户文档路径
const userDocPath = path.join(process.env.USERPROFILE!, 'Documents');
const logPath = path.join(userDocPath, 'javPlayer', 'log.txt');

export async function merge(name: string, downPath: string, videoPath: string): Promise<any> {
  let filenames = fs.readdirSync(downPath)
    .filter(file => fs.existsSync(path.join(downPath, file)));

  if (!filenames.length) return handleLog.set('🔴 没有找到文件 <br/>', logPath);

  filenames.sort((a, b) => parseInt(a.split('.')[0]) - parseInt(b.split('.')[0]))

  const batchSize = 50; // adjust this to whatever works on your system
  const outputFiles: string[] = [];

  try {
    // 创建一个空的input.txt文件
    fs.writeFileSync(`${downPath}/input.txt`, '');
    for (let i = 0; i < filenames.length; i += batchSize) {
      const batch = filenames.slice(i, i + batchSize);
      const batchFile = `${downPath}/${name}${i / batchSize}.mp4`;
      const options = ['-i', `concat:${batch.join("|")}`, '-c', 'copy', batchFile]

      await processQueue(options, downPath);
      outputFiles.push(batchFile); // keep track of the output files
      //将合并后的文件名添加进当前目录下的input
      fs.appendFileSync(`${downPath}/input.txt`, `file '${name}${i / batchSize}.mp4'\n`);
      //进度显示
      const count = Math.floor((i / filenames.length) * 100)
      handleLog.set(`🟢 合成成功 ${count}% <br/>`, logPath, true);
    }

    // 最后合并批处理的文件
    const mergeOptions = generateOptions(`${videoPath}/${name}.mp4`);
    return await processQueue(mergeOptions, downPath);
  } catch (error) {
    return "合成失败";
  }
}

function generateOptions(outputFile: string): string[] {
  return ['-f', 'concat', '-safe', '0', '-i', 'input.txt', '-c', 'copy', outputFile]
}

function processQueue(options: string[], cwd: string) {
  return new Promise((resolve, reject) => {
    execFile(ffmpeg, options, { cwd: cwd, maxBuffer: 2048 * 2048 * 2048 }, (error, stdout, stderr) => {
      if (error) {
        handleLog.set('合成失败' + error, logPath);
        console.log(`lzy  error:`, error)
        reject('合成失败');
      }
      resolve('合成成功');
    });
  });
}
