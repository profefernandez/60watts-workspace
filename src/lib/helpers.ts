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
export const formatSize = fmtSz;

/**
 * Sanitize a plain-text string by stripping HTML tags (multi-pass).
 * For plain text extraction only — does NOT produce safe HTML.
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
 * Sanitize HTML using DOMPurify. Safe for rendering user/AI-generated HTML.
 * Async because DOMPurify is dynamically imported (client-side only).
 */
export const sanitizeHtml = async (input: string): Promise<string> => {
  if (typeof window !== "undefined") {
    try {
      const DOMPurify = (await import("dompurify")).default;
      return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [
          "b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li",
          "code", "pre", "blockquote", "h1", "h2", "h3", "h4", "span",
        ],
        ALLOWED_ATTR: ["href", "target", "rel", "class"],
      });
    } catch {
      return sanitize(input);
    }
  }
  return sanitize(input);
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
