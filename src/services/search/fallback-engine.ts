import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { FileCategory, FileItem } from "../../types";
import { CATEGORY_EXTENSIONS } from "../../constants";
import { getFileCategory } from "../../utils/system";

export function searchWithFind(options: {
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
    onFinish
  } = options;

  const args: string[] = [rootPath];

  // Exclude directories
  if (excludedDirs.length > 0) {
    args.push("(");
    excludedDirs.forEach((dir, idx) => {
      if (idx > 0) args.push("-o");
      args.push("-name", dir);
    });
    args.push(")", "-prune", "-o");
  }

  // Type file
  args.push("-type", "f");

  // Hidden files
  if (!showHidden) {
    args.push("!", "-name", ".*");
  }

  // Search pattern across full path or filename
  if (searchTerm) {
    args.push("-ipath", `*${searchTerm}*`);
  }

  // Extensions
  if (category !== "all" && CATEGORY_EXTENSIONS[category]) {
    args.push("(");
    CATEGORY_EXTENSIONS[category].forEach((ext, idx) => {
      if (idx > 0) args.push("-o");
      args.push("-iname", `*.${ext}`);
    });
    args.push(")");
  }

  args.push("-print");

  let proc: ChildProcessWithoutNullStreams | null = null;
  let isCancelled = false;
  let resultCount = 0;

  try {
    proc = spawn("find", args);
  } catch (err: any) {
    onError(err);
    onFinish();
    return () => {};
  }

  let lineBuffer = "";

  proc.stdout.on("data", (chunk: Buffer) => {
    if (isCancelled || resultCount >= maxResults) return;
    lineBuffer += chunk.toString();
    const lines = lineBuffer.split("\n");
    lineBuffer = lines.pop() || "";

    for (const line of lines) {
      if (resultCount >= maxResults) {
        if (proc && !proc.killed) proc.kill("SIGTERM");
        break;
      }
      const filePath = line.trim();
      if (!filePath) continue;

      try {
        const stats = fs.statSync(filePath);
        resultCount++;
        onItem({
          id: filePath,
          name: path.basename(filePath),
          path: filePath,
          size: stats.size,
          mtime: stats.mtime,
          extension: path.extname(filePath),
          category: getFileCategory(path.extname(filePath)),
          isDirectory: false
        });
      } catch {}
    }
  });

  proc.on("error", (err) => {
    if (!isCancelled) onError(err);
  });

  proc.on("close", () => {
    if (!isCancelled) onFinish();
  });

  return () => {
    isCancelled = true;
    if (proc && !proc.killed) {
      proc.kill("SIGTERM");
    }
  };
}
