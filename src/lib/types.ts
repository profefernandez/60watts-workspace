// ── 60 Watts of Clarity — TypeScript Interfaces ──

export interface Block {
  id: string;
  type: "heading" | "subheading" | "text" | "image" | "youtube";
  content: string;
  imageUrl?: string;
  prompt?: string;
  url?: string;
  videoId?: string;
}

export interface KBFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string;
  uploadedAt: string;
  textContent: string | null;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  image?: string;
  imgPr?: string;
}

export type Tab = "canvas" | "prototype" | "kb" | "research" | "youtube";

export type PrototypeMode = "split" | "code" | "preview";
