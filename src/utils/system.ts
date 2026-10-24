import * as os from "os";
import * as path from "path";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import { FileCategory } from "../types";
import { CATEGORY_EXTENSIONS } from "../constants";

const execAsync = promisify(exec);

export function resolveHomePath(filePath: string): string {
  if (filePath.startsWith("~/") || filePath === "~") {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDate(date: Date): string {
  return date.toLocaleString();
}

export function getFileCategory(ext: string): FileCategory {
  const cleanExt = ext.toLowerCase().replace(/^\./, "");
  for (const [category, extensions] of Object.entries(CATEGORY_EXTENSIONS)) {
    if (extensions.includes(cleanExt)) {
      return category as FileCategory;
    }
  }
  return "all";
}

export async function checkCliTool(toolName: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`which ${toolName}`);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export function runCommandWithTimeout(
  cmd: string,
  args: string[],
  timeoutMs = 5000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Exit code ${code}: ${stderr}`));
      }
    });
  });
}

export function runCommandBinary(
  cmd: string,
  args: string[],
  timeoutMs = 5000
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let stderr = "";

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`Exit code ${code}: ${stderr}`));
      }
    });
  });
}
