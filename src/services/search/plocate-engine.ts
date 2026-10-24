import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { FileCategory, FileItem } from "../../types";
import { CATEGORY_EXTENSIONS } from "../../constants";
import { getFileCategory } from "../../utils/system";

export function searchWithPlocate(options: {
  searchTerm: string;
  rootPath: string;
  category: FileCategory;
  customExtension?: string;
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
    customExtension,
    showHidden,
    excludedDirs,
    maxResults,
    onItem,
    onError,
    onFinish
  } = options;

  const args: string[] = ["-i", "-l", (maxResults * 3).toString()];

  if (searchTerm) {
    args.push(searchTerm);
  } else {
    args.push(rootPath);
  }

  let proc: ChildProcessWithoutNullStreams | null = null;
  let isCancelled = false;
  let resultCount = 0;

  try {
    proc = spawn("locate", args);
  } catch (err: any) {
    onError(err);
    onFinish();
    return () => {};
  }

  let lineBuffer = "";
  const categoryExts = customExtension
    ? [customExtension.toLowerCase()]
    : category !== "all"
    ? CATEGORY_EXTENSIONS[category]
    : null;

  proc.stdout.on("data", (chunk: Buffer) => {
    if (isCancelled || resultCount >= maxResults) return;
    lineBuffer += chunk.toString();
    const lines = lineBuffer.split("\n");
    lineBuffer = lines.pop() || "";

    for (const line of lines) {
      if (resultCount >= maxResults) break;
      const filePath = line.trim();
      if (!filePath) continue;

      // Filter by rootPath
      if (!filePath.startsWith(rootPath)) continue;

      // Filter excluded dirs
      const isExcluded = excludedDirs.some((dir) => filePath.includes(`/${dir}/`) || filePath.endsWith(`/${dir}`));
      if (isExcluded) continue;

      const base = path.basename(filePath);
      if (!showHidden && base.startsWith(".")) continue;

      const ext = path.extname(filePath).replace(/^\./, "").toLowerCase();
      if (categoryExts && !categoryExts.includes(ext)) continue;

      try {
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) continue;

        resultCount++;
        onItem({
          id: filePath,
          name: base,
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
