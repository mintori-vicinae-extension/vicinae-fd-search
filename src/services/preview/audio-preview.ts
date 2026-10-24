import { runCommandWithTimeout } from "../../utils/system";

export async function getAudioPreview(filePath: string): Promise<{
  markdown: string;
  metadata?: Record<string, string>;
}> {
  try {
    const raw = await runCommandWithTimeout(
      "ffprobe",
      [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        filePath
      ],
      3000
    );

    const data = JSON.parse(raw);
    const format = data.format || {};
    const tags = format.tags || {};

    const title = tags.title || tags.TITLE || "Unknown";
    const artist = tags.artist || tags.ARTIST || "Unknown";
    const album = tags.album || tags.ALBUM || "Unknown";
    const durationSec = Math.floor(parseFloat(format.duration || "0"));
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    const duration = `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    const bitrate = format.bit_rate ? `${Math.round(parseInt(format.bit_rate) / 1000)} kbps` : "N/A";

    const md = `### 🎵 Audio Information\n\n` +
      `- **Title:** ${title}\n` +
      `- **Artist:** ${artist}\n` +
      `- **Album:** ${album}\n` +
      `- **Duration:** ${duration}\n` +
      `- **Bitrate:** ${bitrate}\n`;

    return {
      markdown: md,
      metadata: {
        Title: title,
        Artist: artist,
        Album: album,
        Duration: duration,
        Bitrate: bitrate
      }
    };
  } catch {
    return {
      markdown: `> 🎵 **Audio File**\n\n*Unable to extract audio tags.*`
    };
  }
}
