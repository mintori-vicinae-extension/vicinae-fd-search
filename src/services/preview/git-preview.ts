import { runCommandWithTimeout } from "../../utils/system";

export interface GitRepoDetails {
  branch?: string;
  remoteUrl?: string;
  webUrl?: string;
  statusSummary?: string;
  dirtyFilesCount?: number;
  recentCommits: string[];
}

export function parseRemoteWebUrl(remoteUrl: string): string | null {
  const trimmed = remoteUrl.trim();
  if (!trimmed) return null;

  // SSH style: git@github.com:owner/repo.git or ssh://git@github.com/owner/repo.git
  if (trimmed.startsWith("git@") || trimmed.includes("@")) {
    const match = trimmed.match(/@([^:]+):(.+?)(\.git)?$/);
    if (match) {
      const host = match[1];
      const repoPath = match[2];
      return `https://${host}/${repoPath}`;
    }
  }

  // HTTP/HTTPS style: https://github.com/owner/repo.git
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\.git$/, "");
  }

  return null;
}

export async function getGitRepoPreview(repoPath: string): Promise<{
  markdown: string;
  metadata?: Record<string, string>;
  webUrl?: string;
}> {
  let branch = "";
  let remoteUrl = "";
  let statusLines: string[] = [];
  let recentCommits: string[] = [];

  // Run git commands in parallel with safe timeouts
  const results = await Promise.allSettled([
    runCommandWithTimeout("git", ["-C", repoPath, "branch", "--show-current"], 2000),
    runCommandWithTimeout("git", ["-C", repoPath, "remote", "get-url", "origin"], 2000),
    runCommandWithTimeout("git", ["-C", repoPath, "status", "--porcelain=v1"], 3000),
    runCommandWithTimeout("git", ["-C", repoPath, "log", "-n", "5", "--pretty=format:%h - %an: %s (%cr)"], 3000)
  ]);

  if (results[0].status === "fulfilled") {
    branch = results[0].value.trim();
  }
  if (results[1].status === "fulfilled") {
    remoteUrl = results[1].value.trim();
  }
  if (results[2].status === "fulfilled") {
    statusLines = results[2].value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }
  if (results[3].status === "fulfilled") {
    recentCommits = results[3].value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  const webUrl = remoteUrl ? parseRemoteWebUrl(remoteUrl) || undefined : undefined;
  const isDirty = statusLines.length > 0;
  const statusDisplay = isDirty ? `⚠️ Uncommitted changes (${statusLines.length})` : "✅ Working tree clean";

  // Markdown builder
  let md = `## 📦 Git Repository\n\n`;
  md += `**Branch:** \`${branch || "detached / unknown"}\`\n\n`;
  md += `**Status:** ${statusDisplay}\n\n`;

  if (remoteUrl) {
    if (webUrl) {
      md += `**Remote:** [${remoteUrl}](${webUrl})\n\n`;
    } else {
      md += `**Remote:** \`${remoteUrl}\`\n\n`;
    }
  }

  if (recentCommits.length > 0) {
    md += `### 🕒 Recent Commits\n\n`;
    for (const commit of recentCommits) {
      md += `- \`${commit}\`\n`;
    }
    md += `\n`;
  }

  if (isDirty) {
    md += `### 📝 Changed Files (${statusLines.length})\n\n`;
    md += `\`\`\`diff\n`;
    const previewChanges = statusLines.slice(0, 15);
    md += previewChanges.join("\n");
    if (statusLines.length > 15) {
      md += `\n... and ${statusLines.length - 15} more files`;
    }
    md += `\n\`\`\`\n`;
  }

  const metadata: Record<string, string> = {
    "Branch": branch || "None",
    "Working Tree": isDirty ? `${statusLines.length} dirty files` : "Clean"
  };

  if (remoteUrl) {
    metadata["Remote URL"] = remoteUrl;
  }

  return {
    markdown: md,
    metadata,
    webUrl
  };
}
