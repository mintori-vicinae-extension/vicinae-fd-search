import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { EPUB_CACHE_DIR } from "../../constants";
import { runCommandWithTimeout, runCommandBinary } from "../../utils/system";

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => {
      try {
        return String.fromCharCode(parseInt(dec, 10));
      } catch {
        return _;
      }
    });
}

function cleanText(text: string): string {
  return decodeXmlEntities(text.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function extractTagValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<(?:[a-zA-Z0-9_-]+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9_-]+:)?${tagName}>`, "i");
  const match = xml.match(regex);
  if (match && match[1]) {
    const val = cleanText(match[1]);
    return val || null;
  }
  return null;
}

export async function getEpubPreview(filePath: string): Promise<{
  markdown: string;
  metadata?: Record<string, string>;
}> {
  try {
    // 1. Locate the .opf rootfile path via META-INF/container.xml
    let opfPath = "";
    try {
      const containerXml = await runCommandWithTimeout("unzip", ["-p", filePath, "META-INF/container.xml"], 2000);
      const rootfileMatch = containerXml.match(/<rootfile[^>]+full-path=["']([^"']+)["']/i);
      if (rootfileMatch && rootfileMatch[1]) {
        opfPath = rootfileMatch[1].trim();
      }
    } catch {}

    // Fallback: search zip table of contents for .opf
    if (!opfPath) {
      try {
        const listOutput = await runCommandWithTimeout("unzip", ["-l", filePath], 2000);
        const opfMatch = listOutput.match(/[^\s]+\.opf/i);
        if (opfMatch) {
          opfPath = opfMatch[0].trim();
        }
      } catch {}
    }

    if (!opfPath) {
      return {
        markdown: `> 📖 **Sách điện tử (EPUB)**\n\nKhông thể định vị file thông tin gói sách (OPF).`
      };
    }

    // 2. Read OPF content
    const opfContent = await runCommandWithTimeout("unzip", ["-p", filePath, opfPath], 3000);
    const opfDir = path.dirname(opfPath);

    // 3. Extract metadata fields
    const title = extractTagValue(opfContent, "title") || "Không rõ";
    const author = extractTagValue(opfContent, "creator") || "Không rõ";
    const publisher = extractTagValue(opfContent, "publisher");
    const language = extractTagValue(opfContent, "language");
    const date = extractTagValue(opfContent, "date");
    const description = extractTagValue(opfContent, "description");

    // 4. Try extracting cover image
    let coverRelPath: string | null = null;

    // A. Parse <item> elements in manifest
    const items: Array<{ id: string; href: string; mediaType: string; properties: string }> = [];
    const itemRegex = /<item\b([^>]*?)\/?>/gi;
    let itemMatch: RegExpExecArray | null;
    while ((itemMatch = itemRegex.exec(opfContent)) !== null) {
      const attrs = itemMatch[1];
      const getId = attrs.match(/\bid=["']([^"']+)["']/i);
      const getHref = attrs.match(/\bhref=["']([^"']+)["']/i);
      const getMedia = attrs.match(/\bmedia-type=["']([^"']+)["']/i);
      const getProps = attrs.match(/\bproperties=["']([^"']+)["']/i);

      if (getHref) {
        items.push({
          id: getId ? getId[1] : "",
          href: getHref[1],
          mediaType: getMedia ? getMedia[1].toLowerCase() : "",
          properties: getProps ? getProps[1].toLowerCase() : ""
        });
      }
    }

    // Heuristic 1: meta name="cover"
    const metaCoverMatch = opfContent.match(/<meta\b[^>]*\bname=["']cover["'][^>]*\bcontent=["']([^"']+)["']/i) ||
      opfContent.match(/<meta\b[^>]*\bcontent=["']([^"']+)["'][^>]*\bname=["']cover["']/i);
    if (metaCoverMatch && metaCoverMatch[1]) {
      const covId = metaCoverMatch[1];
      const found = items.find((i) => i.id === covId);
      if (found) coverRelPath = found.href;
    }

    // Heuristic 2: properties="cover-image"
    if (!coverRelPath) {
      const found = items.find((i) => i.properties.split(/\s+/).includes("cover-image"));
      if (found) coverRelPath = found.href;
    }

    // Heuristic 3: item id includes "cover" and mediaType is image
    if (!coverRelPath) {
      const found = items.find((i) => i.id.toLowerCase().includes("cover") && i.mediaType.startsWith("image/"));
      if (found) coverRelPath = found.href;
    }

    // Heuristic 4: first image item in manifest
    if (!coverRelPath) {
      const found = items.find((i) => i.mediaType.startsWith("image/"));
      if (found) coverRelPath = found.href;
    }

    let coverImagePath: string | null = null;
    if (coverRelPath) {
      const normalizedPath = path.posix.normalize(opfDir ? `${opfDir}/${coverRelPath}` : coverRelPath);
      const hash = crypto.createHash("md5").update(`${filePath}:${normalizedPath}`).digest("hex");
      const ext = path.extname(coverRelPath) || ".jpg";

      if (!fs.existsSync(EPUB_CACHE_DIR)) {
        try {
          fs.mkdirSync(EPUB_CACHE_DIR, { recursive: true });
        } catch {}
      }

      const cachedImg = path.join(EPUB_CACHE_DIR, `${hash}${ext}`);
      if (fs.existsSync(cachedImg)) {
        coverImagePath = cachedImg;
      } else {
        try {
          // Extract cover image to cache
          const buffer = await runCommandBinary("unzip", ["-p", filePath, normalizedPath], 3000);
          if (buffer && buffer.length > 0) {
            fs.writeFileSync(cachedImg, buffer);
            coverImagePath = cachedImg;
          }
        } catch {}
      }
    }

    // 5. Build Markdown
    let md = "";
    if (coverImagePath) {
      md += `![Ảnh bìa sách](file://${encodeURI(coverImagePath)})\n\n`;
    }

    md += `### 📖 Thông tin Sách điện tử (EPUB)\n\n`;
    md += `- **Tiêu đề:** ${title}\n`;
    md += `- **Tác giả:** ${author}\n`;
    if (publisher) md += `- **Nhà xuất bản:** ${publisher}\n`;
    if (language) md += `- **Ngôn ngữ:** ${language}\n`;
    if (date) md += `- **Ngày xuất bản:** ${date.split("T")[0]}\n`;

    if (description) {
      const truncatedDesc = description.length > 500 ? `${description.slice(0, 500)}...` : description;
      md += `\n**Giới thiệu tóm tắt:**\n> ${truncatedDesc}\n`;
    }

    const metadataExtra: Record<string, string> = {
      "Tiêu đề": title,
      "Tác giả": author
    };
    if (publisher) metadataExtra["Nhà xuất bản"] = publisher;
    if (language) metadataExtra["Ngôn ngữ"] = language;
    if (date) metadataExtra["Ngày xuất bản"] = date.split("T")[0];

    return {
      markdown: md,
      metadata: metadataExtra
    };
  } catch (err: any) {
    return {
      markdown: `> 📖 **Sách điện tử (EPUB)**\n\nKhông thể giải nén thông tin EPUB: ${err?.message || "Lỗi đọc tệp"}`
    };
  }
}
