// ── 60 Watts of Clarity — Data Store with localStorage Fallback ──
// Tries Directus first; falls back to localStorage when unreachable.

import directus from "./directus";
import type { Workspace, CanvasBlock, KBFile } from "./directus";
import {
  readItems,
  createItem,
  updateItem,
  deleteItem,
  aggregate,
  uploadFiles,
  deleteFile,
} from "@directus/sdk";

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

/** Reset connection state (e.g. after config change). */
export function resetConnectionState() {
  _offline = null;
}

export function isStoreOffline(): boolean {
  return _offline === true;
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
//  Workspaces
// ═══════════════════════════════════════════════

export async function fetchWorkspaces(): Promise<Workspace[]> {
  if (await isOffline()) {
    return lsGet<Workspace[]>("workspaces", []);
  }
  const items = await directus.request(readItems("workspaces", { sort: ["-updated_at"] }));
  return items as Workspace[];
}

export async function createWorkspace(data: {
  name: string;
  description: string;
  user_id?: string;
}): Promise<Workspace> {
  if (await isOffline()) {
    const ws: Workspace = {
      id: localId(),
      name: data.name,
      description: data.description,
      user_id: data.user_id || "local",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const all = lsGet<Workspace[]>("workspaces", []);
    all.unshift(ws);
    lsSet("workspaces", all);
    return ws;
  }
  const result = await directus.request(
    createItem("workspaces", data)
  );
  return result as Workspace;
}

export async function getWorkspaceFileCounts(
  workspaces: Workspace[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (await isOffline()) {
    for (const ws of workspaces) {
      const files = lsGet<KBFile[]>(`kb_files_${ws.id}`, []);
      counts[ws.id] = files.length;
    }
    return counts;
  }
  for (const ws of workspaces) {
    try {
      const result = await directus.request(
        aggregate("kb_files", {
          aggregate: { count: "*" },
          query: { filter: { workspace_id: { _eq: ws.id } } },
        })
      );
      counts[ws.id] = Number(result[0]?.count ?? 0);
    } catch {
      counts[ws.id] = 0;
    }
  }
  return counts;
}

// ═══════════════════════════════════════════════
//  Canvas Blocks
// ═══════════════════════════════════════════════

export async function fetchCanvasBlocks(workspaceId: string): Promise<CanvasBlock[]> {
  if (await isOffline()) {
    return lsGet<CanvasBlock[]>(`canvas_${workspaceId}`, []);
  }
  const items = await directus.request(
    readItems("canvas_blocks", {
      filter: { workspace_id: { _eq: workspaceId } },
      sort: ["sort_order"],
    })
  );
  return items as CanvasBlock[];
}

export async function createCanvasBlock(data: {
  workspace_id: string;
  type: string;
  content: string;
  sort_order: number;
  pos_x?: number | null;
  pos_y?: number | null;
  width?: number | null;
  height?: number | null;
  format?: string | null;
}): Promise<CanvasBlock> {
  if (await isOffline()) {
    const block: CanvasBlock = {
      id: localId(),
      workspace_id: data.workspace_id,
      type: data.type,
      content: data.content,
      sort_order: data.sort_order,
      pos_x: data.pos_x ?? null,
      pos_y: data.pos_y ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      format: data.format ?? null,
    };
    const all = lsGet<CanvasBlock[]>(`canvas_${data.workspace_id}`, []);
    all.push(block);
    lsSet(`canvas_${data.workspace_id}`, all);
    return block;
  }
  const result = await directus.request(createItem("canvas_blocks", data));
  return result as CanvasBlock;
}

export async function updateCanvasBlock(
  id: string,
  data: Partial<CanvasBlock>,
  workspaceId?: string
): Promise<void> {
  if (await isOffline()) {
    if (!workspaceId) return;
    const all = lsGet<CanvasBlock[]>(`canvas_${workspaceId}`, []);
    const updated = all.map((b) => (b.id === id ? { ...b, ...data } : b));
    lsSet(`canvas_${workspaceId}`, updated);
    return;
  }
  await directus.request(updateItem("canvas_blocks", id, data));
}

export async function deleteCanvasBlock(
  id: string,
  workspaceId?: string
): Promise<void> {
  if (await isOffline()) {
    if (!workspaceId) return;
    const all = lsGet<CanvasBlock[]>(`canvas_${workspaceId}`, []);
    lsSet(`canvas_${workspaceId}`, all.filter((b) => b.id !== id));
    return;
  }
  await directus.request(deleteItem("canvas_blocks", id));
}

// ═══════════════════════════════════════════════
//  KB Files
// ═══════════════════════════════════════════════

export interface KBFileDisplay {
  id: string;
  workspace_id: string;
  file: string;
  category: string;
  created_at: string;
  filename: string;
  filesize: number;
  mime_type: string;
}

export async function fetchKBFiles(workspaceId: string): Promise<KBFileDisplay[]> {
  if (await isOffline()) {
    return lsGet<KBFileDisplay[]>(`kb_files_${workspaceId}`, []);
  }
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
  const items = await directus.request(
    readItems("kb_files", {
      filter: { workspace_id: { _eq: workspaceId } },
      sort: ["-created_at"],
      fields: ["id", "workspace_id", "file", "category", "created_at"],
    })
  );
  const displays: KBFileDisplay[] = [];
  for (const item of items as KBFile[]) {
    try {
      const res = await fetch(`${directusUrl}/files/${item.file}`);
      if (res.ok) {
        const fileData = await res.json();
        const d = fileData.data || fileData;
        displays.push({
          id: item.id,
          workspace_id: item.workspace_id,
          file: item.file,
          category: item.category || "Documents",
          created_at: item.created_at,
          filename: d.filename_download || d.title || "Untitled",
          filesize: Number(d.filesize) || 0,
          mime_type: d.type || "application/octet-stream",
        });
      }
    } catch {
      displays.push({
        id: item.id,
        workspace_id: item.workspace_id,
        file: item.file,
        category: item.category || "Documents",
        created_at: item.created_at,
        filename: "Unknown file",
        filesize: 0,
        mime_type: "application/octet-stream",
      });
    }
  }
  return displays;
}

export async function uploadKBFile(
  workspaceId: string,
  file: File,
  category: string
): Promise<KBFileDisplay> {
  if (await isOffline()) {
    const display: KBFileDisplay = {
      id: localId(),
      workspace_id: workspaceId,
      file: localId(),
      category,
      created_at: new Date().toISOString(),
      filename: file.name,
      filesize: file.size,
      mime_type: file.type || "application/octet-stream",
    };
    const all = lsGet<KBFileDisplay[]>(`kb_files_${workspaceId}`, []);
    all.unshift(display);
    lsSet(`kb_files_${workspaceId}`, all);
    return display;
  }
  const formData = new FormData();
  formData.append("file", file);
  const uploaded = await directus.request(uploadFiles(formData));
  const fileId = (uploaded as { id: string }).id;
  const result = await directus.request(
    createItem("kb_files", { workspace_id: workspaceId, file: fileId, category })
  );
  return {
    ...(result as KBFile),
    filename: file.name,
    filesize: file.size,
    mime_type: file.type || "application/octet-stream",
  } as KBFileDisplay;
}

export async function deleteKBFile(
  file: { id: string; file: string },
  workspaceId?: string
): Promise<void> {
  if (await isOffline()) {
    if (!workspaceId) return;
    const all = lsGet<KBFileDisplay[]>(`kb_files_${workspaceId}`, []);
    lsSet(`kb_files_${workspaceId}`, all.filter((f) => f.id !== file.id));
    return;
  }
  await directus.request(deleteItem("kb_files", file.id));
  await directus.request(deleteFile(file.file));
}

export async function updateKBFileCategory(
  fileId: string,
  newCategory: string,
  workspaceId?: string
): Promise<void> {
  if (await isOffline()) {
    if (!workspaceId) return;
    const all = lsGet<KBFileDisplay[]>(`kb_files_${workspaceId}`, []);
    const updated = all.map((f) => (f.id === fileId ? { ...f, category: newCategory } : f));
    lsSet(`kb_files_${workspaceId}`, updated);
    return;
  }
  await directus.request(updateItem("kb_files", fileId, { category: newCategory }));
}

// ═══════════════════════════════════════════════
//  Context building (for Profé / AI)
// ═══════════════════════════════════════════════

export async function fetchCanvasContext(
  workspaceId: string
): Promise<CanvasBlock[]> {
  if (await isOffline()) {
    return lsGet<CanvasBlock[]>(`canvas_${workspaceId}`, []).slice(0, 20);
  }
  const items = await directus.request(
    readItems("canvas_blocks", {
      filter: { workspace_id: { _eq: workspaceId } },
      sort: ["sort_order"],
      limit: 20,
    })
  );
  return items as CanvasBlock[];
}

export async function fetchKBContext(
  workspaceId: string
): Promise<KBFile[]> {
  if (await isOffline()) {
    const displays = lsGet<KBFileDisplay[]>(`kb_files_${workspaceId}`, []).slice(0, 20);
    return displays.map((d) => ({
      id: d.id,
      workspace_id: d.workspace_id,
      file: d.file,
      category: d.category,
      created_at: d.created_at,
    }));
  }
  const items = await directus.request(
    readItems("kb_files", {
      filter: { workspace_id: { _eq: workspaceId } },
      limit: 20,
    })
  );
  return items as KBFile[];
}

export async function fetchAllKBImages(): Promise<KBFileDisplay[]> {
  if (await isOffline()) {
    const allImages: KBFileDisplay[] = [];
    if (typeof window === "undefined") return allImages;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("60w_kb_files_")) {
        const files = lsGet<KBFileDisplay[]>(key.replace("60w_", ""), []);
        allImages.push(...files.filter((f) => f.mime_type.startsWith("image/")));
      }
    }
    return allImages.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }
  const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";
  const items = await directus.request(
    readItems("kb_files", {
      filter: { category: { _eq: "Images" } },
      sort: ["-created_at"],
      fields: ["id", "workspace_id", "file", "category", "created_at"],
    })
  );
  const displays: KBFileDisplay[] = [];
  for (const item of items as KBFile[]) {
    try {
      const res = await fetch(`${directusUrl}/files/${item.file}`);
      if (res.ok) {
        const fileData = await res.json();
        const d = fileData.data || fileData;
        displays.push({
          id: item.id,
          workspace_id: item.workspace_id,
          file: item.file,
          category: "Images",
          created_at: item.created_at,
          filename: d.filename_download || d.title || "Untitled",
          filesize: Number(d.filesize) || 0,
          mime_type: d.type || "image/jpeg",
        });
      }
    } catch {
      // Skip files whose metadata can't be fetched
    }
  }
  return displays;
}
