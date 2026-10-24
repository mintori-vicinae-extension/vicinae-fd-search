import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { PDF_CACHE_DIR } from "../../constants";
import { runCommandWithTimeout } from "../../utils/system";

export async function getPdfPreview(filePath: string): Promise<{ markdown: string }> {
  // Ensure cache dir exists
  if (!fs.existsSync(PDF_CACHE_DIR)) {
    try {
      fs.mkdirSync(PDF_CACHE_DIR, { recursive: true });
    } catch {}
  }

  const hash = crypto.createHash("md5").update(filePath).digest("hex");
  const outputPrefix = path.join(PDF_CACHE_DIR, hash);
  const targetImage = `${outputPrefix}-1.png`;

  if (fs.existsSync(targetImage)) {
    return {
      markdown: `![PDF Page 1](file://${encodeURI(targetImage)})\n`
    };
  }

  // Generate thumbnail using pdftoppm (first page only)
  try {
    await runCommandWithTimeout(
      "pdftoppm",
      ["-png", "-f", "1", "-l", "1", "-scale-to", "600", filePath, outputPrefix],
      4000
    );

    if (fs.existsSync(targetImage)) {
      return {
        markdown: `![PDF Page 1](file://${encodeURI(targetImage)})\n`
      };
    }
  } catch {}

  // Fallback: extract text from page 1 using pdftotext
  try {
    const text = await runCommandWithTimeout("pdftotext", ["-f", "1", "-l", "1", filePath, "-"], 3000);
    if (text.trim()) {
      const truncated = text.split("\n").slice(0, 30).join("\n");
      return {
        markdown: `> 📄 **Trích đoạn nội dung trang 1:**\n\n\`\`\`text\n${truncated}\n\`\`\``
      };
    }
  } catch {}

  return {
    markdown: `> [!NOTE]\n> **PDF Document**\n> Install \`poppler-utils\` (pdftoppm) for visual first-page previews.`
  };
}
