import { runCommandWithTimeout } from "../../utils/system";

export async function getSqlitePreview(filePath: string): Promise<{ markdown: string }> {
  try {
    const tablesOutput = await runCommandWithTimeout("sqlite3", [filePath, ".tables"], 3000);
    const tables = tablesOutput.trim().split(/\s+/).filter(Boolean);

    if (tables.length === 0) {
      return {
        markdown: `> 🗄️ **SQLite Database**\n\n*No tables found in this database.*`
      };
    }

    const schemaOutput = await runCommandWithTimeout(
      "sqlite3",
      [filePath, ".schema --indent"],
      3000
    );

    const schemaSnippet = schemaOutput.split("\n").slice(0, 35).join("\n");

    const md = `### 🗄️ SQLite Database (${tables.length} tables)\n\n` +
      `**Tables:** \`${tables.join("`, `")}\`\n\n` +
      `**Schema Preview:**\n\`\`\`sql\n${schemaSnippet}\n\`\`\``;

    return {
      markdown: md
    };
  } catch {
    return {
      markdown: `> 🗄️ **SQLite Database**\n\n*Unable to query schema (sqlite3 required).*`
    };
  }
}
