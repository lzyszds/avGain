import fs from "fs";
import path from "path";
import { exec } from "child_process";
// merge('IPX-005リピーター続出！噂の本番できちゃうおっパブ店 Fカップ巨乳嬢を味わい尽くせ桃乃木かな')
export async function merge(name: any, downPath: string, videoPath: string, thread: number) {
  let filenames
  for (let i = 0; i < thread; i++) {
    const has = fs.existsSync(path.join(downPath, `/${i}.ts`));
    if (has) {
      if (i === 0) {
        filenames = "0.ts"
      } else {
        filenames += `|${i}.ts`
      }
    }
  }
  if (filenames === undefined) return
  const max = {
    // 一次性最大缓存 不限制
    maxBuffer: 1024 * 1024 * 1024,
    cwd: downPath
  }

  const cmd = `cd ${downPath} && ffmpeg -i "concat:${filenames}" -c copy -bsf:a aac_adtstoasc -movflags +faststart ${videoPath}/${name}.mp4`
  exec(cmd, max, (err, stdout, stderr) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log("合成成功");
    // 删除文件v
    for (let i = 0; i < 20; i++) {
      try {
        fs.unlinkSync(downPath + `/${i}.ts`);
      }
      catch (e) {
        // console.log();
      }
    }

  });
  return '合成成功'
}
