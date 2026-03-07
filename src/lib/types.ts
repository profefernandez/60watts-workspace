/**
 * 60 Watts of Clarity — Data Model Types
 * Shared interfaces for workspace entities.
 */

/** A content block in the Canvas editor. */
export interface Block {
  id: string;
  type: "heading" | "subheading" | "text" | "image" | "youtube";
  content: string;
  imageUrl?: string;
  prompt?: string;
  url?: string;
  videoId?: string;
}

/** A file stored in the Knowledge Base. */
export interface KBFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
  uploadedAt: string;
  textContent: string | null;
}

/** A message in the Profé AI chat. */
export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  image?: string;
  imgPr?: string;
}

/** Supported Canvas block types. */
export type BlockType = Block["type"];
