/**
 * 60 Watts of Clarity — Helper Utilities
 * File categorization, formatting, and ID generation.
 */

// ── Unique ID generator ──
let counter = 0;
export const uid = (prefix = "b"): string =>
  `${prefix}-${++counter}-${Date.now()}`;

// ── File categorization ──

/** Map a MIME type to a human-readable category. */
export const fileCat = (mimeType: string): string => {
  if (mimeType.startsWith("image")) return "Images";
  if (mimeType.startsWith("video")) return "Videos";
  if (mimeType.startsWith("audio")) return "Audio";
  if (mimeType.includes("pdf")) return "PDFs";
  return "Documents";
};

/** Format a byte count to a human-readable size string. */
export const fmtSz = (bytes: number): string => {
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + "KB";
  return (bytes / 1048576).toFixed(1) + "MB";
};

/**
 * Sanitize a string for safe rendering.
 * Strips HTML tags and trims whitespace.
 */
export const sanitize = (input: string): string =>
  input.replace(/<[^>]*>/g, "").trim();

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
