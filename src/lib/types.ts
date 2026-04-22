// ── 60 Watts of Clarity — TypeScript Interfaces ──

// Re-export Directus collection types as the source of truth
export type {
  Workspace,
  KBFile as DirectusKBFile,
  AgentConfig,
  UserApiKey,
  CanvasBlock,
  ContextSuggestion,
} from "./directus";

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  conversationId?: string;
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

export interface ContextRequest {
  workspaceId: string;
  canvasContent: string;
  searchQuery?: string;
  sources: ContextSource[];
}

export type ContextSource = "canvas" | "kb" | "research" | "youtube";

export interface ContextResult {
  inserted: ContextInsert[];
  suggestions: ContextSuggestionItem[];
}

export interface ContextInsert {
  blockId: string;
  content: string;
  sourceType: ContextSource;
  sourceTitle: string;
}

export interface ContextSuggestionItem {
  id: string;
  sourceType: ContextSource;
  sourceId: string;
  title: string;
  content: string;
  relevanceNote: string;
}

export type Tab = "home" | "canvas" | "prototype" | "kb" | "research" | "youtube";

export type PrototypeMode = "split" | "code" | "preview";
