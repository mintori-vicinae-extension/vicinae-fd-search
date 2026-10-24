import * as fs from "fs";

export function getImagePreview(filePath: string): { markdown: string } {
  // Raycast/Vicinae supports file:// URIs directly in markdown images
  const encodedPath = encodeURI(filePath);
  return {
    markdown: `![Image Preview](file://${encodedPath})`
  };
}
