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

// ── Sanitize text input ──
export const sanitize = (input: string): string =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

// ── Sanitize URL ──
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.href;
  } catch {
    return "";
  }
};
