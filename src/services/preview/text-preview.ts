import * as fs from "fs";
import { MAX_PREVIEW_LINES, MAX_PREVIEW_TEXT_BYTES } from "../../constants";

export async function getTextPreview(
  filePath: string,
  extension: string
): Promise<{ markdown: string; lineCount: number }> {
  return new Promise((resolve) => {
    let buffer = Buffer.alloc(0);
    const stream = fs.createReadStream(filePath, {
      start: 0,
      end: MAX_PREVIEW_TEXT_BYTES
    });

    stream.on("data", (chunk: string | Buffer) => {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      buffer = Buffer.concat([buffer, buf]);
      if (buffer.length >= MAX_PREVIEW_TEXT_BYTES) {
        stream.destroy();
      }
    });

    stream.on("close", () => {
      finish();
    });

    stream.on("error", () => {
      resolve({
        markdown: "*Không thể đọc nội dung file văn bản này.*",
        lineCount: 0
      });
    });

    function finish() {
      // Check for binary null bytes
      let isBinary = false;
      const checkLen = Math.min(buffer.length, 1024);
      for (let i = 0; i < checkLen; i++) {
        if (buffer[i] === 0) {
          isBinary = true;
          break;
        }
      }

      if (isBinary) {
        resolve({
          markdown: `> [!NOTE]\n> **Binary File**\n> Text preview is not supported.`,
          lineCount: 0
        });
        return;
      }

      const text = buffer.toString("utf8");
      const lines = text.split("\n");
      const truncatedLines = lines.slice(0, MAX_PREVIEW_LINES);
      const wasTruncated = lines.length > MAX_PREVIEW_LINES || buffer.length >= MAX_PREVIEW_TEXT_BYTES;

      let lang = extension.replace(/^\./, "").toLowerCase();
      if (lang === "ts" || lang === "tsx") lang = "typescript";
      else if (lang === "js" || lang === "jsx") lang = "javascript";
      else if (lang === "py") lang = "python";
      else if (lang === "rs") lang = "rust";
      else if (lang === "md") lang = "markdown";
      else if (lang === "sh" || lang === "bash") lang = "bash";
      else if (lang === "yml") lang = "yaml";

      let content = `\`\`\`${lang}\n${truncatedLines.join("\n")}\n\`\`\``;
      if (wasTruncated) {
        content += `\n\n*... preview truncated (max ${MAX_PREVIEW_LINES} lines / 64KB) ...*`;
      }

      resolve({
        markdown: content,
        lineCount: lines.length
      });
    }
  });
}
