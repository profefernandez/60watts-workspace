// ── 60 Watts of Clarity — TypeScript Interfaces ──

export interface Block {
  id: string;
  type: "heading" | "text" | "image" | "youtube" | "search_card";
  content: string;
  imageUrl?: string;
  prompt?: string;
  url?: string;
  videoId?: string;
  pos_x?: number | null;
  pos_y?: number | null;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  searchData?: SearchCardData;
}

export interface SearchCardData {
  id: string;
  title: string;
  snippet: string;
  source_url: string;
  source_domain: string;
  relevance?: string;
  suggested_location?: string;
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

export interface ResearchResult {
  title: string;
  summary: string;
  source: string;
}

export interface YouTubeResult {
  title: string;
  channelName: string;
  videoId: string;
  description: string;
}

export interface ThemeColors {
  bg: string; bg2: string; bg3: string;
  surface: string; surfR: string; surfA: string;
  brd: string; brdS: string; brdF: string;
  tx: string; tx2: string; tx3: string; tx4: string;
  navBg: string; navBrd: string; navH: string; navA: string;
  navTx: string; navTxActive: string; navTxMuted: string;
  inBg: string; inBrd: string;
  aiU: string; aiA: string;
  aiBg: string; aiBrd: string; aiHeaderBg: string; aiSurfA: string;
  aiInBg: string; aiInBrd: string;
  aiTx: string; aiTx2: string; aiTx3: string;
  aiMsgBg: string; aiUserBg: string;
  centerBg: string; headerBg: string; toolbarBg: string;
  sh: string; shL: string; ov: string; grid: string;
  accent: string; accentText: string;
}

export type Tab = "home" | "workspace" | "kb" | "research" | "videos" | "settings";

export type PrototypeMode = "split" | "code" | "preview";

export type WorkspaceFileType = "design" | "document";
