import { runCommandWithTimeout } from "../../utils/system";

export async function getArchivePreview(filePath: string, ext: string): Promise<{ markdown: string }> {
  const cleanExt = ext.toLowerCase().replace(/^\./, "");
  let itemsList = "";

  try {
    if (cleanExt === "zip") {
      const output = await runCommandWithTimeout("unzip", ["-l", filePath], 3000);
      const lines = output.split("\n");
      // unzip -l has header lines and footer lines
      const dataLines = lines.slice(3, -3).map((l) => l.trim().split(/\s+/).slice(3).join(" ")).filter(Boolean);
      itemsList = formatArchiveItems(dataLines);
    } else if (cleanExt.startsWith("tar") || cleanExt === "tgz" || cleanExt === "gz") {
      const output = await runCommandWithTimeout("tar", ["-tf", filePath], 3000);
      const lines = output.split("\n").filter(Boolean);
      itemsList = formatArchiveItems(lines);
    } else if (cleanExt === "7z" || cleanExt === "rar") {
      const output = await runCommandWithTimeout("7z", ["l", "-ba", filePath], 3000);
      const lines = output.split("\n").map((l) => l.trim().split(/\s+/).pop()).filter(Boolean) as string[];
      itemsList = formatArchiveItems(lines);
    }
  } catch (err) {
    // CLI tool not available or archive corrupt
  }

  if (itemsList) {
    return {
      markdown: itemsList
    };
  }

  return {
    markdown: `> [!NOTE]\n> **File Nén (Archive)**\n> Không thể đọc cấu trúc bên trong (Cần cài đặt \`unzip\`, \`tar\`, hoặc \`7z\`).`
  };
}

function formatArchiveItems(items: string[]): string {
  const maxDisplay = 25;
  const count = items.length;
  const slice = items.slice(0, maxDisplay);

  let md = `### 📦 Archive Structure (${Math.min(count, maxDisplay)} / ${count} items)\n\n\`\`\`text\n`;
  for (const item of slice) {
    const isDir = item.endsWith("/");
    md += `${isDir ? "📁" : "📄"} ${item}\n`;
  }
  if (count > maxDisplay) {
    md += `... (+${count - maxDisplay} more files)\n`;
  }
  md += `\`\`\``;
  return md;
}
