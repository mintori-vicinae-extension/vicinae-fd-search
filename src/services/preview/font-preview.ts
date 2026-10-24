import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { FONT_CACHE_DIR } from "../../constants";
import { runCommandWithTimeout } from "../../utils/system";

export async function getFontPreview(filePath: string): Promise<{ markdown: string }> {
  if (!fs.existsSync(FONT_CACHE_DIR)) {
    try {
      fs.mkdirSync(FONT_CACHE_DIR, { recursive: true });
    } catch {}
  }

  const hash = crypto.createHash("md5").update(filePath).digest("hex");
  const targetImage = path.join(FONT_CACHE_DIR, `${hash}.png`);

  if (fs.existsSync(targetImage)) {
    return {
      markdown: `![Font Preview](file://${encodeURI(targetImage)})\n\n> 🔤 **Mẫu Phông Chữ**`
    };
  }

  // Use ImageMagick to render font sample
  try {
    const textSample = "The quick brown fox jumps over the lazy dog\n0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    await runCommandWithTimeout(
      "magick",
      [
        "-size", "600x120",
        "xc:white",
        "-font", filePath,
        "-pointsize", "22",
        "-fill", "#222222",
        "-gravity", "center",
        "-annotate", "+0+0", textSample,
        targetImage
      ],
      3000
    );

    if (fs.existsSync(targetImage)) {
      return {
        markdown: `![Font Preview](file://${encodeURI(targetImage)})\n\n> 🔤 **Mẫu Phông Chữ**`
      };
    }
  } catch {}

  return {
    markdown: `> 🔤 **Font File (${path.extname(filePath)})**\n\n*Install ImageMagick for visual typography previews.*`
  };
}
