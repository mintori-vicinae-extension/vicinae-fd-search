import { runCommandWithTimeout } from "../../utils/system";

export async function getOfficePreview(filePath: string, ext: string): Promise<{ markdown: string }> {
  const cleanExt = ext.toLowerCase().replace(/^\./, "");
  try {
    // OpenXML formats (.docx, .pptx, .xlsx) contain docProps/core.xml with metadata
    if (["docx", "pptx", "xlsx"].includes(cleanExt)) {
      const xml = await runCommandWithTimeout("unzip", ["-p", filePath, "docProps/core.xml"], 2000);
      const titleMatch = xml.match(/<dc:title>(.*?)<\/dc:title>/i);
      const creatorMatch = xml.match(/<dc:creator>(.*?)<\/dc:creator>/i);
      const descMatch = xml.match(/<dc:description>(.*?)<\/dc:description>/i);

      let md = `### 📑 Office Document (${cleanExt.toUpperCase()})\n\n`;
      if (titleMatch && titleMatch[1]) md += `- **Title:** ${titleMatch[1]}\n`;
      if (creatorMatch && creatorMatch[1]) md += `- **Author:** ${creatorMatch[1]}\n`;
      if (descMatch && descMatch[1]) md += `- **Description:** ${descMatch[1]}\n`;

      if (cleanExt === "docx") {
        // Try reading sample text from word/document.xml
        try {
          const docXml = await runCommandWithTimeout("unzip", ["-p", filePath, "word/document.xml"], 2000);
          const textPieces = docXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (textPieces) {
            md += `\n**Sample Content:**\n> ${textPieces.slice(0, 300)}...`;
          }
        } catch {}
      }

      return { markdown: md };
    }
  } catch {}

  return {
    markdown: `> 📑 **Office Document (${cleanExt.toUpperCase()})**\n\nOpen file to view full contents.`
  };
}
