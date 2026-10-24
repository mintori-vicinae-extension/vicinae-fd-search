import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { FileCategory, FileItem } from "../../types";
import { CATEGORY_EXTENSIONS } from "../../constants";
import { getFileCategory } from "../../utils/system";

export function searchWithFd(options: {
  searchTerm: string;
  rootPath: string;
  category: FileCategory;
  showHidden: boolean;
  excludedDirs: string[];
  maxResults: number;
  onItem: (item: FileItem) => void;
  onError: (err: Error) => void;
  onFinish: () => void;
}): () => void {
  const {
    searchTerm,
    rootPath,
    category,
    showHidden,
    excludedDirs,
    maxResults,
    onItem,
    onError,
    onFinish,
  } = options;

  const args: string[] = [
    "--type", "f",
    "--color", "never",
    "--no-ignore-vcs",
    "--full-path"
  ];

  if (showHidden) {
    args.push("--hidden");
  }

  for (const dir of excludedDirs) {
    const trimmed = dir.trim();
    if (trimmed) {
      args.push("--exclude", trimmed);
    }
  }

  if (category !== "all" && CATEGORY_EXTENSIONS[category]) {
    for (const ext of CATEGORY_EXTENSIONS[category]) {
      args.push("-e", ext);
    }
  }

  args.push("--max-results", maxResults.toString());

  if (searchTerm) {
    // If user enters multiple words separated by spaces, match all words across path/filename
    const words = searchTerm.trim().split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      // Regex pattern: word1.*word2.*word3
      const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
      args.push(pattern);
    } else {
      args.push(searchTerm);
    }
  } else {
    args.push(".");
  }

  args.push(rootPath);

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

  proc.stdout.on("data", (chunk: Buffer) => {
    if (isCancelled) return;
    lineBuffer += chunk.toString();
    const lines = lineBuffer.split("\n");
    lineBuffer = lines.pop() || "";

    for (const line of lines) {
      const filePath = line.trim();
      if (!filePath) continue;

      try {
        const stats = fs.statSync(filePath);
        const ext = path.extname(filePath);
        const item: FileItem = {
          id: filePath,
          name: path.basename(filePath),
          path: filePath,
          size: stats.size,
          mtime: stats.mtime,
          extension: ext,
          category: getFileCategory(ext),
          isDirectory: stats.isDirectory(),
        };
        onItem(item);
      } catch {
        // file could be inaccessible or removed
      }
    }
  });

  proc.stderr.on("data", () => {
    // Ignore fd non-critical permission errors
  });

  proc.on("error", (err) => {
    if (!isCancelled) onError(err);
  });

  proc.on("close", () => {
    if (!isCancelled) {
      if (lineBuffer.trim()) {
        try {
          const filePath = lineBuffer.trim();
          const stats = fs.statSync(filePath);
          const ext = path.extname(filePath);
          onItem({
            id: filePath,
            name: path.basename(filePath),
            path: filePath,
            size: stats.size,
            mtime: stats.mtime,
            extension: ext,
            category: getFileCategory(ext),
            isDirectory: stats.isDirectory(),
          });
        } catch {}
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
