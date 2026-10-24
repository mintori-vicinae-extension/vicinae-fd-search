import { FileCategory } from "./types";

export const CATEGORY_EXTENSIONS: Record<Exclude<FileCategory, "all">, string[]> = {
  image: ["png", "jpg", "jpeg", "svg", "webp", "gif", "bmp", "ico", "avif", "tiff"],
  video: ["mp4", "mkv", "avi", "mov", "webm", "flv", "wmv", "m4v"],
  audio: ["mp3", "flac", "wav", "ogg", "m4a", "aac", "wma", "opus"],
  document: ["pdf", "epub", "docx", "xlsx", "pptx", "doc", "xls", "ppt", "odt", "ods", "odp", "txt", "rtf"],
  code: [
    "ts", "tsx", "js", "jsx", "py", "rs", "go", "c", "cpp", "h", "hpp", "java", "kt",
    "html", "css", "scss", "json", "yaml", "yml", "toml", "md", "sh", "bash", "zsh", "sql", "lua",
    "xml", "conf", "config", "ini", "env", "diff", "patch", "log", "properties", "gradle", "cmake",
    "makefile", "dockerfile", "graphql", "gql", "proto", "vue", "svelte", "swift", "rb", "php", "r", "dart", "zig"
  ],
  archive: ["zip", "tar", "gz", "tgz", "7z", "rar", "bz2", "xz"]
};

export const PREFIX_MAP: Record<string, FileCategory> = {
  "img:": "image",
  "image:": "image",
  "photo:": "image",
  "vid:": "video",
  "video:": "video",
  "movie:": "video",
  "music:": "audio",
  "audio:": "audio",
  "sound:": "audio",
  "doc:": "document",
  "document:": "document",
  "code:": "code",
  "src:": "code",
  "zip:": "archive",
  "archive:": "archive"
};

export const DEFAULT_EXCLUDED_DIRS = [
  "node_modules",
  ".git",
  ".cache",
  ".local/share/Trash",
  "target",
  "dist",
  "build",
  ".venv",
  "venv",
  "__pycache__",
  ".cargo",
  ".npm"
];

export const MAX_PREVIEW_TEXT_BYTES = 64 * 1024; // 64 KB
export const MAX_PREVIEW_LINES = 100;
export const PDF_CACHE_DIR = "/tmp/vicinae-pdf-cache";
export const EPUB_CACHE_DIR = "/tmp/vicinae-epub-cache";
export const MEDIA_CACHE_DIR = "/tmp/vicinae-media-cache";
export const FONT_CACHE_DIR = "/tmp/vicinae-font-cache";
