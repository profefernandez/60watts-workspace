// ── 60 Watts of Clarity — Directus Client ──

import { createDirectus, rest, authentication } from "@directus/sdk";

// ── Collection Types ──

export interface Workspace {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface KBFile {
  id: string;
  workspace_id: string;
  file: string;
  category: string;
  created_at: string;
}

export interface AgentConfig {
  id: string;
  workspace_id: string;
  provider: string;
  agent_id: string;
  display_name: string;
  is_active: boolean;
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

export interface ContextSuggestion {
  id: string;
  workspace_id: string;
  source_type: "research" | "kb" | "youtube" | "web";
  source_id: string;
  title: string;
  content: string;
  relevance_note: string;
  status: "pending" | "accepted" | "dismissed";
  created_at: string;
  applied_at: string | null;
}

export interface Schema {
  workspaces: Workspace[];
  kb_files: KBFile[];
  agent_configs: AgentConfig[];
  user_api_keys: UserApiKey[];
  canvas_blocks: CanvasBlock[];
  context_suggestions: ContextSuggestion[];
}

// ── Client ──

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

const directus = createDirectus<Schema>(directusUrl)
  .with(authentication("json"))
  .with(rest());

export default directus;
