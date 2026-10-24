import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { MEDIA_CACHE_DIR } from "../../constants";
import { runCommandWithTimeout } from "../../utils/system";

function getFreedesktopThumbnail(filePath: string): string | null {
  try {
    const fileUri = `file://${path.resolve(filePath)}`;
    const md5Hash = crypto.createHash("md5").update(fileUri).digest("hex");
    const home = os.homedir();
    const candidates = [
      path.join(home, ".cache/thumbnails/x-large", `${md5Hash}.png`),
      path.join(home, ".cache/thumbnails/large", `${md5Hash}.png`),
      path.join(home, ".cache/thumbnails/normal", `${md5Hash}.png`)
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return cand;
      }
    }
  } catch {}
  return null;
}

export interface VideoInfo {
  markdown: string;
  duration?: string;
  resolution?: string;
  codec?: string;
  title?: string;
}

export async function getVideoPreview(filePath: string): Promise<VideoInfo> {
  // Ensure media cache dir exists
  if (!fs.existsSync(MEDIA_CACHE_DIR)) {
    try {
      fs.mkdirSync(MEDIA_CACHE_DIR, { recursive: true });
    } catch {}
  }

  const hash = crypto.createHash("md5").update(filePath).digest("hex");
  const targetThumbnail = path.join(MEDIA_CACHE_DIR, `${hash}.jpg`);

  let thumbnailPath = getFreedesktopThumbnail(filePath);

  // If already generated in cache
  if (!thumbnailPath && fs.existsSync(targetThumbnail)) {
    thumbnailPath = targetThumbnail;
  }

  // Probe video specs in parallel or fast
  let resolution: string | undefined;
  let duration: string | undefined;
  let codec: string | undefined;
  let videoTitle: string | undefined;

  try {
    const probeRaw = await runCommandWithTimeout(
      "ffprobe",
      [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        filePath
      ],
      2500
    );
    const data = JSON.parse(probeRaw);
    const vStream = data.streams?.find((s: any) => s.codec_type === "video");
    if (vStream) {
      if (vStream.width && vStream.height) {
        resolution = `${vStream.width} × ${vStream.height}`;
      }
      if (vStream.codec_name) {
        codec = vStream.codec_name.toUpperCase();
      }
    }

    const fmt = data.format;
    if (fmt) {
      if (fmt.duration) {
        const totalSecs = Math.floor(parseFloat(fmt.duration));
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        if (hours > 0) {
          duration = `${hours}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
        } else {
          duration = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
        }
      }
      if (fmt.tags?.title || fmt.tags?.TITLE) {
        videoTitle = fmt.tags.title || fmt.tags.TITLE;
      }
    }
  } catch {}

  // If no thumbnail yet, try extract with ffmpeg
  if (!thumbnailPath) {
    try {
      await runCommandWithTimeout(
        "ffmpeg",
        ["-ss", "00:00:01", "-i", filePath, "-vframes", "1", "-q:v", "2", targetThumbnail, "-y"],
        3000
      );
      if (fs.existsSync(targetThumbnail)) {
        thumbnailPath = targetThumbnail;
      }
    } catch {}
  }

  // Fallback to ffmpegthumbnailer
  if (!thumbnailPath) {
    try {
      await runCommandWithTimeout(
        "ffmpegthumbnailer",
        ["-i", filePath, "-o", targetThumbnail, "-s", "600"],
        3000
      );
      if (fs.existsSync(targetThumbnail)) {
        thumbnailPath = targetThumbnail;
      }
    } catch {}
  }

  let md = "";
  if (thumbnailPath) {
    md = `![Thumbnail](file://${encodeURI(thumbnailPath)})\n`;
  }

  return {
    markdown: md,
    duration,
    resolution,
    codec,
    title: videoTitle
  };
}
