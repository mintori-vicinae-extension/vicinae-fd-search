import { exec } from "child_process";
import * as path from "path";
import { open as raycastOpen, showToast, Toast } from "@raycast/api";

export async function openFileWithDefaultApp(filePath: string): Promise<void> {
  const commands = [
    `xdg-open "${filePath}"`,
    `gio open "${filePath}"`,
    `gnome-open "${filePath}"`,
    `open "${filePath}"`
  ];

  for (const cmd of commands) {
    try {
      await runExec(cmd);
      return;
    } catch {
      // Try next fallback
    }
  }

  // Fallback to Raycast native API
  try {
    await raycastOpen(filePath);
  } catch (err: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Không thể mở file",
      message: err?.message || "Không tìm thấy chương trình xử lý thích hợp"
    });
  }
}

export async function revealInFileManager(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  const commands = [
    `dbus-send --session --dest=org.freedesktop.FileManager1 --type=method_call /org/freedesktop/FileManager1 org.freedesktop.FileManager1.ShowItems array:string:"file://${filePath}" string:""`,
    `xdg-open "${dir}"`,
    `gio open "${dir}"`,
    `open "${dir}"`
  ];

  for (const cmd of commands) {
    try {
      await runExec(cmd);
      return;
    } catch {}
  }

  try {
    await raycastOpen(dir);
  } catch (err: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Không thể mở thư mục",
      message: err?.message
    });
  }
}

function runExec(cmd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(cmd, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
