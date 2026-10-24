export type FileCategory =
  | "all"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "code"
  | "archive";

export interface FileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  mtime: Date;
  extension: string;
  category: FileCategory;
  isDirectory: boolean;
}

export interface ExtensionPreferences {
  rootPath?: string;
  maxResults?: string;
  showHidden?: boolean;
  usePlocate?: boolean;
  excludedDirs?: string;
}

export interface ParsedQuery {
  rawQuery: string;
  searchTerm: string;
  categoryPrefix?: FileCategory;
  customExtension?: string;
}

export interface PreviewData {
  title: string;
  markdownContent?: string;
  metadata?: {
    size?: string;
    mtime?: string;
    path: string;
    type?: string;
    permissions?: string;
    dimensions?: string;
    duration?: string;
    extra?: Record<string, string>;
  };
  isLoading?: boolean;
}
