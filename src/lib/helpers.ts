import { I } from "./icons";

// ── Unique ID generator ──
export const uid = (prefix = "b"): string =>
  `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

// ── File icon resolver ──
export const fileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image")) return I.img;
  if (mimeType.startsWith("video")) return I.yt;
  return I.file;
};

// ── File category resolver ──
export const fileCat = (mimeType: string): string => {
  if (mimeType.startsWith("image")) return "Images";
  if (mimeType.startsWith("video")) return "Videos";
  if (mimeType.startsWith("audio")) return "Audio";
  if (mimeType.includes("pdf")) return "PDFs";
  return "Documents";
};

// ── Format file size ──
export const fmtSz = (bytes: number): string => {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / 1048576).toFixed(1) + "MB";
};

/**
 * Sanitize a plain-text string by stripping HTML tags (multi-pass).
 * WARNING: This is NOT safe for rendering user-generated HTML.
 * It does not decode HTML entities or handle all XSS vectors.
 * For rendering untrusted HTML, use DOMPurify or a similar library.
 */
export const sanitize = (input: string): string => {
  let result = input;
  let previous: string;
  do {
    previous = result;
    result = result.replace(/<[^>]*>/g, "");
  } while (result !== previous);
  return result.trim();
};

/**
 * Validate that a URL is an allowed protocol (http/https only).
 * Returns the URL if valid, or an empty string if not.
 */
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
    return "";
  } catch {
    return "";
  }
};
