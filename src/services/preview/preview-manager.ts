import * as fs from "fs";
import { FileItem, PreviewData } from "../../types";
import { formatBytes, formatDate } from "../../utils/system";
import { getImagePreview } from "./image-preview";
import { getTextPreview } from "./text-preview";
import { getVideoPreview } from "./video-preview";
import { getPdfPreview } from "./pdf-preview";
import { getArchivePreview } from "./archive-preview";
import { getAudioPreview } from "./audio-preview";
import { getSqlitePreview } from "./sqlite-preview";
import { getOfficePreview } from "./office-preview";
import { getFontPreview } from "./font-preview";
import { getEpubPreview } from "./epub-preview";

export async function generateFilePreview(item: FileItem): Promise<PreviewData> {
  const ext = item.extension.toLowerCase().replace(/^\./, "");

  let stats: fs.Stats | null = null;
  try {
    stats = fs.statSync(item.path);
  } catch {}

  const metadata: PreviewData["metadata"] = {
    path: item.path,
    size: stats ? formatBytes(stats.size) : formatBytes(item.size),
    mtime: stats ? formatDate(stats.mtime) : formatDate(item.mtime),
    type: ext ? ext.toUpperCase() : "File",
    permissions: stats ? (stats.mode & parseInt("777", 8)).toString(8) : undefined
  };

  let markdown = "";

  try {
    if (item.category === "image") {
      markdown = getImagePreview(item.path).markdown;
    } else if (ext === "pdf") {
      const res = await getPdfPreview(item.path);
      markdown = res.markdown;
    } else if (ext === "epub") {
      const res = await getEpubPreview(item.path);
      markdown = res.markdown;
      if (res.metadata) {
        metadata.extra = res.metadata;
      }
    } else if (item.category === "video") {
      const res = await getVideoPreview(item.path);
      markdown = res.markdown;
      const extra: Record<string, string> = {};
      if (res.title) extra["Video Title"] = res.title;
      if (res.resolution) extra["Resolution"] = res.resolution;
      if (res.duration) extra["Duration"] = res.duration;
      if (res.codec) extra["Codec"] = res.codec;
      if (Object.keys(extra).length > 0) {
        metadata.extra = extra;
      }
    } else if (item.category === "audio") {
      const res = await getAudioPreview(item.path);
      markdown = res.markdown;
      if (res.metadata) {
        metadata.extra = res.metadata;
      }
    } else if (item.category === "archive") {
      const res = await getArchivePreview(item.path, ext);
      markdown = res.markdown;
    } else if (["db", "sqlite", "sqlite3"].includes(ext)) {
      const res = await getSqlitePreview(item.path);
      markdown = res.markdown;
    } else if (["docx", "pptx", "xlsx", "odt", "ods"].includes(ext)) {
      const res = await getOfficePreview(item.path, ext);
      markdown = res.markdown;
    } else if (["ttf", "otf", "woff", "woff2"].includes(ext)) {
      const res = await getFontPreview(item.path);
      markdown = res.markdown;
    } else if (item.category === "code" || ext === "txt" || ext === "md" || ext === "log") {
      const res = await getTextPreview(item.path, ext);
      markdown = res.markdown;
    } else {
      // Fallback cho tất cả file types khác (những file chưa có previewer riêng):
      // Thử đọc dạng plaintext (tự động kiểm tra ký tự nhị phân / null byte bên trong)
      const res = await getTextPreview(item.path, ext);
      markdown = res.markdown;
    }
  } catch (err: any) {
    markdown = `> ⚠️ **Preview Error**\n\n${err?.message || "Could not read file preview"}`;
  }

  return {
    title: item.name,
    markdownContent: markdown,
    metadata
  };
}
