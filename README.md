# vicinae-fd-search

Blazing fast file search extension for [Vicinae](https://vicinae.com) (compatible with Raycast API) powered by `fd`. Features rich file previews, category filtering, graceful multi-tier fallbacks, and customizable directory exclusion.

---

## Features

- **Blazing Fast Search**: Uses `fd` (`/usr/bin/fd`) with debounced streaming, sub-millisecond responsiveness, and full-path/name pattern matching.
- **Rich File Previews**:
  - **Images**: Direct markdown image rendering (`.png`, `.jpg`, `.svg`, `.webp`, `.gif`, etc.).
  - **Code & Text**: Syntax-highlighted code blocks for over 25+ programming languages, with a safe 64KB / 100-line truncated preview.
  - **Videos**: Instant thumbnail extraction via standard FreeDesktop cache (`~/.cache/thumbnails/`) or dynamic fallback to `ffmpeg` / `ffmpegthumbnailer`.
  - **PDFs**: High-resolution first-page thumbnails rendered by `pdftoppm` (cached in `/tmp/vicinae-pdf-cache`), with text extract fallback.
  - **Archives**: Interactive tree/list view of internal file structures for `.zip`, `.tar`, `.tar.gz`, `.7z`, and `.rar`.
  - **Audio**: Tag metadata inspection (Title, Artist, Album, Duration, Bitrate) via `ffprobe`.
  - **Office Documents**: XML metadata and snippet extraction for `.docx`, `.xlsx`, `.pptx`.
  - **Databases**: SQLite schema and table inspection via `sqlite3`.
  - **Fonts**: Typography preview rendering via ImageMagick (`magick`).
- **Category & Multi-Prefix Filtering**:
  - Dropdown filter: `All Files`, `Images`, `Videos`, `Audio`, `Documents`, `Code`, `Archives`.
  - Fast prefix syntax right from the search bar:
    - Standard categories: `img:`, `vid:`, `video:`, `music:`, `audio:`, `doc:`, `code:`, `zip:`, `git:`.
    - Single extension: `epub:`, `pdf:`, `docx:`, `ts:`.
    - **Multi-prefix search**: `video,epub: query`, `pdf,docx: report`, `code,zip: test`.
    - **Hidden files search & toggle**:
      - Prefix `hidden:` or `h:` (e.g. `hidden: config` or `hidden,code: env`).
      - Toggle hidden files with shortcut `Ctrl+H` directly in the action menu.
- **Directory Exclusion (Ignore Folders)**:
  - Smart default exclusion list: `node_modules`, `.git`, `.cache`, `.local/share/Trash`, `target`, `dist`, `build`, `.venv`, `venv`, `__pycache__`, `.cargo`, `.npm`.
  - Configurable via extension preferences.
  - Bypasses VCS `.gitignore` to ensure project files can still be discovered.
- **Multi-Tier Fallback Architecture**:
  - Search: `fd` ➔ `plocate` (hybrid index) ➔ `find` (POSIX).
  - Open File: `xdg-open` ➔ `gio open` ➔ `gnome-open` ➔ `open` (macOS).

---

## Dependencies

### System & CLI Tools

- **Runtime / Build**: `node` (Node.js 22+), `npm`
- **Search Engines**:
  - `fd` — Primary fast file & Git repository search engine (falls back to `find` if unavailable)
  - `plocate` (`locate`) — *Optional*, for hybrid disk-wide index search
- **Rich Previews** *(optional — each preview degrades gracefully if the tool is missing)*:
  - `ffmpeg` / `ffprobe` / `ffmpegthumbnailer` — Video thumbnails and audio/video metadata
  - `poppler-utils` (`pdftoppm`, `pdftotext`) — PDF page thumbnails and text extraction
  - `unzip`, `tar`, `7z` — Archive listing, EPUB metadata/covers, and Office (`.docx`, `.xlsx`, `.pptx`) XML previews
  - `sqlite3` — SQLite database tables and schema inspection
  - `magick` (ImageMagick) — Font typography preview rendering
  - `git` — Git repository branch, status, and recent commits preview (`git:` prefix)

### NPM Packages

- **Dependencies**: `@raycast/api`, `react`, `react-dom`
- **Dev Dependencies**: `typescript`, `esbuild`, `@types/node`, `@types/react`

### Quick Install (System Dependencies)

- **Ubuntu / Debian**:

  ```bash
  sudo apt update && sudo apt install -y fd-find plocate ffmpeg ffmpegthumbnailer poppler-utils unzip tar p7zip-full sqlite3 imagemagick git nodejs npm
  # Ubuntu/Debian names the fd binary `fdfind`; symlink it to `fd`:
  sudo ln -s "$(which fdfind)" /usr/local/bin/fd
  ```

- **Arch Linux**:

  ```bash
  sudo pacman -S --needed fd plocate ffmpeg ffmpegthumbnailer poppler unzip tar 7zip sqlite imagemagick git nodejs npm
  ```

- **Fedora**:

  ```bash
  sudo dnf install -y fd-find plocate ffmpeg-free ffmpegthumbnailer poppler-utils unzip tar p7zip p7zip-plugins sqlite ImageMagick git nodejs npm
  ```

---

## Installation & Setup

1. Clone or place this repository into your Vicinae extensions folder:

   ```bash
   cd ~/.local/share/vicinae/extensions # or your configured extensions path
   git clone https://github.com/mintori-vicinae-extension/vicinae-fd-search.git
   cd vicinae-fd-search
   npm install
   npm run build
   ```

2. Open Vicinae and search for **Search Files**.

---

## Preferences

- **Search Root Directory**: Path where the search begins (Default: `~`).
- **Max Results**: Maximum number of search results to display (Default: `100`).
- **Show Hidden Files**: Toggle inclusion of hidden files (`.dotfiles`).
- **Excluded Directories**: Comma-separated list of directories to exclude from search.
- **Use System Index (plocate)**: Hybrid mode for instant disk-wide lookups using `locate`.

---

## License

MIT
