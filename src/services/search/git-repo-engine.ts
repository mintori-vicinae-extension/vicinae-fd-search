import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { FileItem } from "../../types";

export function searchGitRepositories(options: {
  searchTerm: string;
  rootPath: string;
  maxResults: number;
  onItem: (item: FileItem) => void;
  onError: (err: Error) => void;
  onFinish: () => void;
}): () => void {
  const { searchTerm, rootPath, maxResults, onItem, onError, onFinish } = options;

  // Search for directories named exactly ".git"
  // --hidden is needed because .git begins with a dot
  // --type d matches directory
  // Exclude trash and temporary cache dirs if needed, but fd ignores .gitignore by default unless specified
  const args: string[] = [
    "-H",
    "-t", "d",
    "^\\.git$",
    "--color", "never",
    "--max-results", maxResults.toString(),
    "--exclude", ".local/share/Trash",
    "--exclude", ".cache",
    rootPath
  ];

  let proc: ChildProcessWithoutNullStreams | null = null;
  let isCancelled = false;

  try {
    proc = spawn("fd", args);
  } catch (err: any) {
    onError(err);
    onFinish();
    return () => {};
  }

  let lineBuffer = "";

  const processGitPath = (gitDirPath: string) => {
    // gitDirPath is /path/to/repo/.git or /path/to/repo/.git/
    const repoPath = path.dirname(gitDirPath.replace(/\/+$/, ""));
    const repoName = path.basename(repoPath);

    // If there is a searchTerm, filter by repo name or relative path
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const lowerRepoName = repoName.toLowerCase();
      const lowerRepoPath = repoPath.toLowerCase();

      // Check if search term matches repo name or path
      const searchWords = lowerSearch.split(/\s+/).filter(Boolean);
      const matches = searchWords.every(
        (word) => lowerRepoName.includes(word) || lowerRepoPath.includes(word)
      );
      if (!matches) {
        return;
      }
    }

    try {
      const stats = fs.statSync(repoPath);
      const item: FileItem = {
        id: repoPath,
        name: repoName,
        path: repoPath,
        size: stats.size,
        mtime: stats.mtime,
        extension: "",
        category: "git",
        isDirectory: true
      };
      onItem(item);
    } catch {
      // Inaccessible repo directory
    }
  };

  proc.stdout.on("data", (chunk: Buffer) => {
    if (isCancelled) return;
    lineBuffer += chunk.toString();
    const lines = lineBuffer.split("\n");
    lineBuffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      processGitPath(trimmed);
    }
  });

  proc.stderr.on("data", () => {
    // Ignore fd permission errors
  });

  proc.on("error", (err) => {
    if (!isCancelled) onError(err);
  });

  proc.on("close", () => {
    if (!isCancelled) {
      if (lineBuffer.trim()) {
        processGitPath(lineBuffer.trim());
      }
      onFinish();
    }
  });

  return () => {
    isCancelled = true;
    if (proc && !proc.killed) {
      proc.kill("SIGTERM");
    }
  };
}
