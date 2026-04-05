// ── 60 Watts of Clarity — Workspace Files Store with localStorage Fallback ──
// Tries Directus first; falls back to localStorage when unreachable.

import directus from "./directus";
import type { WorkspaceFile } from "./directus";
import { readItems, createItem, updateItem, deleteItem } from "@directus/sdk";

// ── Connection state ──

let _offline: boolean | null = null;

/** Check if Directus is reachable (cached after first check). */
async function isOffline(): Promise<boolean> {
  if (_offline !== null) return _offline;
  try {
    const url = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
    const res = await fetch(`${url}/server/ping`, { signal: AbortSignal.timeout(3000) });
    _offline = !res.ok;
  } catch {
    _offline = true;
  }
  return _offline;
}

// ── localStorage helpers ──

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`60w_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`60w_${key}`, JSON.stringify(value));
}

let _idCounter = 0;
function localId(): string {
  return `local-${++_idCounter}-${Date.now()}`;
}

// ═══════════════════════════════════════════════
//  Workspace Files
// ═══════════════════════════════════════════════

/** Fetch all files for a workspace, sorted by most recently updated. */
export async function fetchWorkspaceFiles(workspaceId: string): Promise<WorkspaceFile[]> {
  if (await isOffline()) {
    return lsGet<WorkspaceFile[]>(`ws_files_${workspaceId}`, []);
  }
  const items = await directus.request(
    readItems("workspace_files", {
      filter: { workspace_id: { _eq: workspaceId } },
      sort: ["-updated_at"],
    })
  );
  return items as WorkspaceFile[];
}

/** Get a single workspace file by ID. */
export async function getWorkspaceFile(
  id: string,
  workspaceId: string
): Promise<WorkspaceFile | null> {
  if (await isOffline()) {
    const all = lsGet<WorkspaceFile[]>(`ws_files_${workspaceId}`, []);
    return all.find((f) => f.id === id) ?? null;
  }
  const items = await directus.request(
    readItems("workspace_files", {
      filter: { id: { _eq: id } },
      limit: 1,
    })
  );
  const results = items as WorkspaceFile[];
  return results[0] ?? null;
}

/** Create a new workspace file. Default content: "[]" for documents, "" for designs and html. */
export async function createWorkspaceFile(data: {
  workspace_id: string;
  name: string;
  type: "design" | "html" | "document";
  content?: string;
}): Promise<WorkspaceFile> {
  const defaultContent = data.content !== undefined
    ? data.content
    : data.type === "document"
    ? "[]"
    : "";

  if (await isOffline()) {
    const now = new Date().toISOString();
    const file: WorkspaceFile = {
      id: localId(),
      workspace_id: data.workspace_id,
      name: data.name,
      type: data.type,
      content: defaultContent,
      thumbnail: null,
      created_at: now,
      updated_at: now,
      sort_order: 0,
    };
    const all = lsGet<WorkspaceFile[]>(`ws_files_${data.workspace_id}`, []);
    all.unshift(file);
    lsSet(`ws_files_${data.workspace_id}`, all);
    return file;
  }

  const result = await directus.request(
    createItem("workspace_files", {
      workspace_id: data.workspace_id,
      name: data.name,
      type: data.type,
      content: defaultContent,
    })
  );
  return result as WorkspaceFile;
}

/** Update name, content, thumbnail, and/or sort_order of a workspace file. */
export async function updateWorkspaceFile(
  id: string,
  data: Partial<Pick<WorkspaceFile, "name" | "type" | "content" | "thumbnail" | "sort_order">>,
  workspaceId: string
): Promise<void> {
  if (await isOffline()) {
    const all = lsGet<WorkspaceFile[]>(`ws_files_${workspaceId}`, []);
    const updated = all.map((f) =>
      f.id === id ? { ...f, ...data, updated_at: new Date().toISOString() } : f
    );
    lsSet(`ws_files_${workspaceId}`, updated);
    return;
  }
  await directus.request(updateItem("workspace_files", id, data));
}

/** Delete a workspace file. */
export async function deleteWorkspaceFile(
  id: string,
  workspaceId: string
): Promise<void> {
  if (await isOffline()) {
    const all = lsGet<WorkspaceFile[]>(`ws_files_${workspaceId}`, []);
    lsSet(`ws_files_${workspaceId}`, all.filter((f) => f.id !== id));
    return;
  }
  await directus.request(deleteItem("workspace_files", id));
}

/** Duplicate a workspace file with a "(copy)" suffix on the name. */
export async function duplicateWorkspaceFile(
  id: string,
  workspaceId: string
): Promise<WorkspaceFile | null> {
  const original = await getWorkspaceFile(id, workspaceId);
  if (!original) return null;

  return createWorkspaceFile({
    workspace_id: workspaceId,
    name: `${original.name} (copy)`,
    type: original.type,
    content: original.content,
  });
}
