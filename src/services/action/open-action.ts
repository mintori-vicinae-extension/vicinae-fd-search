import { exec } from "child_process";
import * as path from "path";
import { open as raycastOpen, showToast, Toast } from "@raycast/api";

import { ApplicationPreference } from "../../types";

export function getApplicationName(app?: ApplicationPreference): string {
  if (!app) return "";
  if (typeof app === "string") {
    return path.basename(app).replace(/\.desktop$/, "");
  }
  return app.name || (app.path ? path.basename(app.path).replace(/\.desktop$/, "") : "");
}

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
      title: "Cannot open file",
      message: err?.message || "No handler found"
    });
  }
}

export async function openFileWithApp(
  filePath: string,
  app: ApplicationPreference
): Promise<void> {
  try {
    const appTarget = typeof app === "string" ? app : (app.path || app.bundleId || app.name || "");
    const appName = getApplicationName(app);

    // If it's a desktop file name or path (e.g. "code.desktop", "/usr/share/applications/code.desktop")
    const desktopFileName = path.basename(appTarget);
    if (desktopFileName.endsWith(".desktop")) {
      const commands = [
        `gio launch "${appTarget}" "${filePath}"`,
        `gio launch "${desktopFileName}" "${filePath}"`,
        `gtk-launch "${desktopFileName.replace(/\.desktop$/, "")}" "${filePath}"`
      ];
      for (const cmd of commands) {
        try {
          await runExec(cmd);
          return;
        } catch {}
      }
    }

    // Try executing via raycast open with app
    try {
      await raycastOpen(filePath, app as any);
      return;
    } catch {}

    // CLI invocation
    const cleanApp = appName || desktopFileName.replace(/\.desktop$/, "") || appTarget;
    await runExec(`"${cleanApp}" "${filePath}"`);
  } catch (err: any) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open with configured application",
      message: err?.message || String(err)
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

export async function openInTerminal(dirPath: string): Promise<void> {
  const terminals = [
    `kitty --directory "${dirPath}"`,
    `alacritty --working-directory "${dirPath}"`,
    `wezterm start --cwd "${dirPath}"`,
    `foot -D "${dirPath}"`,
    `ghostty --working-directory="${dirPath}"`,
    `xterm -e "cd '${dirPath}' && $SHELL"`
  ];

  for (const cmd of terminals) {
    try {
      await runExec(cmd);
      return;
    } catch {}
  }

  await showToast({
    style: Toast.Style.Failure,
    title: "Cannot open terminal",
    message: "No supported terminal emulator found"
  });
}

function runExec(cmd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(cmd, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
