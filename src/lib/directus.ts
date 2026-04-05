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
  pos_x?: number | null;
  pos_y?: number | null;
  width?: number | null;
  height?: number | null;
  format?: string | null;
}

export interface WorkspaceFile {
  id: string;
  workspace_id: string;
  name: string;
  type: "design" | "html" | "document";
  content: string;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  sort_order: number;
}

export interface Schema {
  workspaces: Workspace[];
  kb_files: KBFile[];
  agent_configs: AgentConfig[];
  user_api_keys: UserApiKey[];
  canvas_blocks: CanvasBlock[];
  workspace_files: WorkspaceFile[];
}

// ── Client ──

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

const directus = createDirectus<Schema>(directusUrl)
  .with(authentication("json"))
  .with(rest());

export default directus;
