// ── 60 Watts of Clarity — Directus Client ──

import { createDirectus, rest, authentication } from "@directus/sdk";

// ── Collection Types ──

export interface Workspace {
  id: string;
  name: string;
  description: string;
  status: string;
  sort: number;
  user_created: string;
  date_created: string;
  user_updated: string;
  date_updated: string;
}

// ── Base Library Item ──
export interface BaseLibraryItem {
  id: string;
  sort: number;
  tags?: unknown[]; // M2M -> kb_tags
  user_created: string;
  date_created: string;
  user_updated: string;
  date_updated: string;
}

// ── Global Library Collections ──
export interface KBFile extends BaseLibraryItem {
  name: string;
  type: string;
  size: number;
  data: string;
  textContent: string | null;
  uploadedAt: string;
}

export interface KBResearch extends BaseLibraryItem {
  title: string;
  url: string;
  source: string;
  author: string;
  published_date: string;
  summary: string;
  notes: string;
  file: string; // M2O -> directus_files
}

export interface KBVideo extends BaseLibraryItem {
  title: string;
  url: string;
  video_id: string;
  platform: string;
  channel: string;
  duration: number;
  thumbnail_url: string;
  summary: string;
  notes: string;
}

export interface KBDesign extends BaseLibraryItem {
  title: string;
  description: string;
  html: string;
  css: string;
  js: string;
  thumbnail: string; // M2O -> directus_files
  ai_image: string; // M2O -> directus_files
}

export interface KBCanvas extends BaseLibraryItem {
  title: string;
  image: string; // M2O -> directus_files
  prompt: string;
  model: string;
  parameters: Record<string, unknown>;
  description: string;
}

export interface KBDrawer extends BaseLibraryItem {
  title: string;
  source_query: string;
  source_url: string;
  snippet: string;
  content: string;
  suggested_type: string;
  ai_reason: string;
  reviewed: boolean;
}

export interface KBTag {
  id: string;
  name: string;
  color: string;
  description: string;
}

// ── Workspace Pinning / Junction Table ──
export interface WorkspaceItem {
  id: string;
  sort: number;
  workspace_id: string;
  item_type: string; // enum: 'kb_files', 'kb_research', etc.
  item_id: string;
  workspace_notes: string;
  pinned_at: string;
  pinned_by: string;
  user_created: string;
  date_created: string;
  user_updated: string;
  date_updated: string;
}

// ── AI Chat History ──
export interface AIThread {
  id: string;
  workspace_id: string | null; // Nullable to support Global "Home Screen" Manager AI chats
  title: string;
  agent_id: string | null;
  status: string; // 'active', 'archived'
  summary: string | null; // Rolling summary so AI can rejoin long threads cheaply
  last_message_at: string | null; // For sorting threads by recency
  thread_type: string; // e.g., 'profe_general', 'document_chat', 'web_search', 'context_search'
  context_item_id: string | null; // The UUID of the document or canvas item this chat belongs to
  user_created: string;
  date_created: string;
  user_updated: string;
  date_updated: string;
}

export interface AIMessage {
  id: string;
  thread_id: string;
  sort: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  kb_references: unknown[] | null; // JSON array of {type, id} pointing at library items used as context
  attachments: unknown[] | null; // M2M -> directus_files (images/files explicitly referenced)
  error: string | null; // Populated if the AI request failed
  metadata: Record<string, unknown> | null; // JSON
  user_created: string;
  date_created: string;
  user_updated: string;
  date_updated: string;
}

export interface AIAgent {
  id: string;
  name: string; // Display name ("Profé", "Context Searcher")
  provider: string;
  model: string | null;
  system_prompt: string | null;
  temperature: number | null;
  icon: string | null;
  enabled: boolean;
  sort: number;
  user_created: string;
  date_created: string;
  user_updated: string;
  date_updated: string;
}

export interface UserApiKey {
  id: string;
  user_id: string;
  provider: string;
  api_key: string;
}

export interface CanvasBlock {
  id: string;
  workspace_id: string;
  type: string;
  content: string;
  sort_order: number;
}

export interface Schema {
  workspaces: Workspace[];
  kb_files: KBFile[];
  kb_research: KBResearch[];
  kb_videos: KBVideo[];
  kb_designs: KBDesign[];
  kb_canvas: KBCanvas[];
  kb_drawer: KBDrawer[];
  kb_tags: KBTag[];
  workspace_items: WorkspaceItem[];
  ai_threads: AIThread[];
  ai_messages: AIMessage[];
  ai_agents: AIAgent[];
  user_api_keys: UserApiKey[];
  canvas_blocks: CanvasBlock[];
}

// ── Client ──

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

const directus = createDirectus<Schema>(directusUrl)
  .with(authentication("json"))
  .with(rest());

export default directus;
