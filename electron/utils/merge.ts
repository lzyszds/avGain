import fs from "fs";
import path from "path";
import { execFile } from "child_process";
const ffmpeg = 'ffmpeg';  // 替换你的ffmpeg程序的完整路径，如果ffmpeg在环境变量中，直接写'ffmpeg'即可。

// merge('IPX-005リピーター続出！噂の本番できちゃうおっパブ店 Fカップ巨乳嬢を味わい尽くせ桃乃木かな')
export function merge(name: any, downPath: string, videoPath: string) {
  // 获取ts文件并生成filenames数组
  const filenames = fs.readdirSync(downPath)
    .filter(file => fs.existsSync(path.join(downPath, file)))
    .map(file => file);

  if (!filenames.length) return "没有找到ts文件";

  const options = [
    '-i',
    `concat:${filenames.join('|')}`,
    '-c',
    'copy',
    '-bsf:a',
    'aac_adtstoasc',
    '-movflags',
    '+faststart',
    `${videoPath}/${name}.mp4`
  ];

  return new Promise((resolve, reject) => {
    execFile(ffmpeg, options, { cwd: downPath, maxBuffer: 1024 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`执行错误: ${error}`);
        reject('合成失败');
      } else {
        resolve('合成成功');
      }
    });
  });

}
