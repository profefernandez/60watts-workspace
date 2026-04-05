import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock localStorage ──
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });
Object.defineProperty(globalThis, "window", { value: globalThis, writable: true });

// ── Force offline mode so tests exercise localStorage ──
vi.mock("../lib/directus", () => ({
  default: {},
}));

// Patch fetch to always fail so isOffline() returns true
globalThis.fetch = async () => { throw new Error("offline"); };

import { describe as _d, it as _i, expect as _e } from "vitest";
import {
  fetchWorkspaceFiles,
  getWorkspaceFile,
  createWorkspaceFile,
  updateWorkspaceFile,
  deleteWorkspaceFile,
  duplicateWorkspaceFile,
} from "../lib/workspace-files";

// Reset 60w_ keys before each test
beforeEach(() => {
  Object.keys(store)
    .filter((k) => k.startsWith("60w_"))
    .forEach((k) => delete store[k]);
  // Reset the offline cache inside the module between tests by clearing fetch
  globalThis.fetch = async () => { throw new Error("offline"); };
});

const WS_ID = "ws-test-001";

describe("workspace-files store (localStorage fallback)", () => {
  describe("fetchWorkspaceFiles", () => {
    it("returns empty array for a fresh workspace", async () => {
      const files = await fetchWorkspaceFiles(WS_ID);
      expect(files).toEqual([]);
    });
  });

  describe("createWorkspaceFile + fetchWorkspaceFiles round-trip", () => {
    it("creates a document and reads it back", async () => {
      const created = await createWorkspaceFile({
        workspace_id: WS_ID,
        name: "My Notes",
        type: "document",
      });

      expect(created.id).toBeTruthy();
      expect(created.name).toBe("My Notes");
      expect(created.type).toBe("document");
      expect(created.workspace_id).toBe(WS_ID);
      expect(created.content).toBe("[]"); // default for documents

      const files = await fetchWorkspaceFiles(WS_ID);
      expect(files).toHaveLength(1);
      expect(files[0].id).toBe(created.id);
    });

    it("creates a design and reads it back", async () => {
      const created = await createWorkspaceFile({
        workspace_id: WS_ID,
        name: "Landing Page",
        type: "design",
      });

      expect(created.content).toBe(""); // default for designs

      const files = await fetchWorkspaceFiles(WS_ID);
      expect(files).toHaveLength(1);
      expect(files[0].type).toBe("design");
    });
  });

  describe("getWorkspaceFile", () => {
    it("retrieves a file by id", async () => {
      const created = await createWorkspaceFile({
        workspace_id: WS_ID,
        name: "Lookup Test",
        type: "document",
      });

      const found = await getWorkspaceFile(created.id, WS_ID);
      expect(found).not.toBeNull();
      expect(found!.name).toBe("Lookup Test");
    });

    it("returns null for unknown id", async () => {
      const found = await getWorkspaceFile("nonexistent-id", WS_ID);
      expect(found).toBeNull();
    });
  });

  describe("updateWorkspaceFile", () => {
    it("updates the file name", async () => {
      const created = await createWorkspaceFile({
        workspace_id: WS_ID,
        name: "Old Name",
        type: "document",
      });

      await updateWorkspaceFile(created.id, { name: "New Name" }, WS_ID);

      const found = await getWorkspaceFile(created.id, WS_ID);
      expect(found!.name).toBe("New Name");
    });

    it("updates updated_at timestamp", async () => {
      const created = await createWorkspaceFile({
        workspace_id: WS_ID,
        name: "Timestamp Test",
        type: "document",
      });

      const originalUpdatedAt = created.updated_at;

      // Wait a tick to ensure timestamp changes
      await new Promise((r) => setTimeout(r, 2));

      await updateWorkspaceFile(created.id, { name: "Renamed" }, WS_ID);

      const found = await getWorkspaceFile(created.id, WS_ID);
      expect(found!.updated_at).not.toBe(originalUpdatedAt);
    });
  });

  describe("deleteWorkspaceFile", () => {
    it("removes the file from the store", async () => {
      const created = await createWorkspaceFile({
        workspace_id: WS_ID,
        name: "To Delete",
        type: "design",
      });

      let files = await fetchWorkspaceFiles(WS_ID);
      expect(files).toHaveLength(1);

      await deleteWorkspaceFile(created.id, WS_ID);

      files = await fetchWorkspaceFiles(WS_ID);
      expect(files).toHaveLength(0);
    });

    it("leaves other files intact", async () => {
      const a = await createWorkspaceFile({ workspace_id: WS_ID, name: "Keep", type: "document" });
      const b = await createWorkspaceFile({ workspace_id: WS_ID, name: "Delete Me", type: "design" });

      await deleteWorkspaceFile(b.id, WS_ID);

      const files = await fetchWorkspaceFiles(WS_ID);
      expect(files).toHaveLength(1);
      expect(files[0].id).toBe(a.id);
    });
  });

  describe("document content stores as JSON string", () => {
    it("stores default document content as JSON string '[]'", async () => {
      const created = await createWorkspaceFile({
        workspace_id: WS_ID,
        name: "Doc",
        type: "document",
      });
      expect(created.content).toBe("[]");
      expect(typeof created.content).toBe("string");
    });

    it("stores custom JSON content as a string", async () => {
      const jsonContent = JSON.stringify([{ type: "paragraph", text: "Hello" }]);
      const created = await createWorkspaceFile({
        workspace_id: WS_ID,
        name: "Rich Doc",
        type: "document",
        content: jsonContent,
      });
      expect(created.content).toBe(jsonContent);
      // Verify it parses back correctly
      const parsed = JSON.parse(created.content);
      expect(parsed[0].type).toBe("paragraph");
    });
  });

  describe("design content stores as HTML string", () => {
    it("stores default design content as empty string", async () => {
      const created = await createWorkspaceFile({
        workspace_id: WS_ID,
        name: "Design",
        type: "design",
      });
      expect(created.content).toBe("");
    });

    it("stores HTML content as a string", async () => {
      const html = "<div class='hero'><h1>Hello World</h1></div>";
      const created = await createWorkspaceFile({
        workspace_id: WS_ID,
        name: "HTML Design",
        type: "design",
        content: html,
      });
      expect(created.content).toBe(html);
      expect(typeof created.content).toBe("string");
    });
  });

  describe("duplicateWorkspaceFile", () => {
    it("creates a copy with '(copy)' suffix", async () => {
      const original = await createWorkspaceFile({
        workspace_id: WS_ID,
        name: "Original",
        type: "document",
        content: '["block1"]',
      });

      const copy = await duplicateWorkspaceFile(original.id, WS_ID);

      expect(copy).not.toBeNull();
      expect(copy!.name).toBe("Original (copy)");
      expect(copy!.type).toBe("document");
      expect(copy!.content).toBe('["block1"]');
      expect(copy!.id).not.toBe(original.id);
    });

    it("returns null for unknown id", async () => {
      const result = await duplicateWorkspaceFile("nonexistent", WS_ID);
      expect(result).toBeNull();
    });
  });
});
