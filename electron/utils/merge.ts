import fs from "fs";
import path from "path";
import { exec } from "child_process";
// merge('IPX-005リピーター続出！噂の本番できちゃうおっパブ店 Fカップ巨乳嬢を味わい尽くせ桃乃木かな')
export async function merge(name: any, downPath: string, videoPath: string, thread: number, event: any) {
  let filenames
  for (let i = 1; i <= thread; i++) {
    const has = fs.existsSync(path.join(downPath, `/${i}.ts`));
    if (has) {
      if (i === 1) {
        filenames = "1.ts"
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
  try {
    await exec(cmd, max);
    return "合成成功"
  } catch (e) {
    console.log(e);
    return "合成失败"
  }
}
