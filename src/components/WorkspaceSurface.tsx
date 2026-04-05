"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../lib/colors";
import { glass, glassBtn } from "../lib/styles";
import type { WorkspaceFile } from "../lib/directus";
import {
  fetchWorkspaceFiles,
  createWorkspaceFile,
  updateWorkspaceFile,
  deleteWorkspaceFile,
  duplicateWorkspaceFile,
} from "../lib/workspace-files";
import FilePanel from "./FilePanel";
import CanvasView from "./CanvasView";
import PrototypeView from "./PrototypeView";
import DesignStudioView from "./DesignStudioView";

// ── Props ──────────────────────────────────────────────────────────────────

interface WorkspaceSurfaceProps {
  workspaceId: string;
  workspaceName: string;
  onVisitSource?: (url: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

const LS_COLLAPSED_KEY = "60w_file_panel_collapsed";

export default function WorkspaceSurface({
  workspaceId,
  workspaceName,
  onVisitSource,
}: WorkspaceSurfaceProps) {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(LS_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [saving, setSaving] = useState(false);
  const [saveLabel, setSaveLabel] = useState<"idle" | "saving" | "saved">("idle");

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevWorkspaceIdRef = useRef<string>(workspaceId);

  // ── Load files when workspaceId changes ──────────────────────────────────

  useEffect(() => {
    // Reset state on workspace change
    if (prevWorkspaceIdRef.current !== workspaceId) {
      prevWorkspaceIdRef.current = workspaceId;
      setActiveFileId(null);
      setFiles([]);
      setSaveLabel("idle");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    }

    let cancelled = false;
    fetchWorkspaceFiles(workspaceId).then((fetched) => {
      if (cancelled) return;
      setFiles(fetched);
      // Auto-select first file
      if (fetched.length > 0) {
        setActiveFileId((prev) => {
          // Keep current selection if it's still valid
          if (prev && fetched.some((f) => f.id === prev)) return prev;
          return fetched[0].id;
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  // ── Persist collapsed state ───────────────────────────────────────────────

  useEffect(() => {
    try {
      localStorage.setItem(LS_COLLAPSED_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  // ── Derived active file ───────────────────────────────────────────────────

  const activeFile = files.find((f) => f.id === activeFileId) ?? null;

  // ── Debounced content save ────────────────────────────────────────────────

  const handleContentChange = useCallback(
    (content: string) => {
      if (!activeFileId) return;

      // Update local state immediately
      setFiles((prev) =>
        prev.map((f) =>
          f.id === activeFileId
            ? { ...f, content, updated_at: new Date().toISOString() }
            : f
        )
      );

      // Debounce the actual save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);

      setSaving(true);
      setSaveLabel("saving");

      saveTimerRef.current = setTimeout(async () => {
        try {
          await updateWorkspaceFile(activeFileId, { content }, workspaceId);
        } finally {
          setSaving(false);
          setSaveLabel("saved");
          savedTimerRef.current = setTimeout(() => {
            setSaveLabel("idle");
          }, 2000);
        }
      }, 1000);
    },
    [activeFileId, workspaceId]
  );

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleCreateFile = useCallback(
    async (type: "design" | "html" | "document") => {
      const typeLabel =
        type === "design" ? "Design Studio" : type === "html" ? "HTML Render" : "Document";
      const input = window.prompt(`Name your new ${typeLabel}:`);
      if (input === null) return; // user cancelled
      const name = input.trim() || `Untitled ${typeLabel}`;
      const created = await createWorkspaceFile({
        workspace_id: workspaceId,
        name,
        type,
      });
      setFiles((prev) => [created, ...prev]);
      setActiveFileId(created.id);
    },
    [workspaceId]
  );

  const handleSelectFile = useCallback((file: WorkspaceFile) => {
    setActiveFileId(file.id);
  }, []);

  const handleRenameFile = useCallback(
    async (id: string, name: string) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, name, updated_at: new Date().toISOString() } : f
        )
      );
      await updateWorkspaceFile(id, { name }, workspaceId);
    },
    [workspaceId]
  );

  const handleDeleteFile = useCallback(
    async (id: string) => {
      setFiles((prev) => {
        const remaining = prev.filter((f) => f.id !== id);
        // Adjust active file if deleted was active
        setActiveFileId((cur) => {
          if (cur === id) return remaining.length > 0 ? remaining[0].id : null;
          return cur;
        });
        return remaining;
      });
      await deleteWorkspaceFile(id, workspaceId);
    },
    [workspaceId]
  );

  const handleDuplicateFile = useCallback(
    async (id: string) => {
      const duped = await duplicateWorkspaceFile(id, workspaceId);
      if (duped) {
        setFiles((prev) => [duped, ...prev]);
        setActiveFileId(duped.id);
      }
    },
    [workspaceId]
  );

  // ── Mode tab type override ────────────────────────────────────────────────

  const handleSetType = useCallback(
    async (type: "design" | "html" | "document") => {
      if (!activeFileId) return;
      setFiles((prev) =>
        prev.map((f) =>
          f.id === activeFileId
            ? { ...f, type, updated_at: new Date().toISOString() }
            : f
        )
      );
      try {
        await updateWorkspaceFile(activeFileId, { type }, workspaceId);
      } catch {
        // ignore if backend doesn't support type changes
      }
    },
    [activeFileId, activeFile?.name, workspaceId]
  );

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((v) => !v);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100%",
        width: "100%",
        background: C.ob1,
        overflow: "hidden",
        fontFamily: "'Satoshi'",
      }}
    >
      {/* File panel */}
      <FilePanel
        files={files}
        activeFileId={activeFileId}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        onSelectFile={handleSelectFile}
        onCreateFile={handleCreateFile}
        onRenameFile={handleRenameFile}
        onDeleteFile={handleDeleteFile}
        onDuplicateFile={handleDuplicateFile}
      />

      {/* Main content area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {activeFile ? (
          <>
            {/* Mode tab bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "10px 16px",
                borderBottom: `1px solid ${C.glassBrd}`,
                background: C.ob2,
                flexShrink: 0,
              }}
            >
              {/* Document tab */}
              <TabButton
                label="Document"
                active={activeFile.type === "document"}
                onClick={() => handleSetType("document")}
              />

              {/* Design Studio tab */}
              <TabButton
                label="Design Studio"
                active={activeFile.type === "design"}
                onClick={() => handleSetType("design")}
              />

              {/* HTML Render tab */}
              <TabButton
                label="HTML Render"
                active={activeFile.type === "html"}
                onClick={() => handleSetType("html")}
              />

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Save indicator */}
              {saveLabel !== "idle" && (
                <span
                  style={{
                    fontSize: 13,
                    fontFamily: "'Satoshi'",
                    color: saveLabel === "saving" ? C.tx4 : C.green,
                    transition: "color .3s",
                    letterSpacing: "0.02em",
                  }}
                >
                  {saveLabel === "saving" ? "Saving…" : "Saved"}
                </span>
              )}

              {/* File name display */}
              <span
                style={{
                  fontSize: 13,
                  fontFamily: "'Satoshi'",
                  color: C.tx3,
                  fontWeight: 500,
                  maxWidth: 200,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {activeFile.name}
              </span>
            </div>

            {/* Work surface */}
            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
              {activeFile.type === "document" ? (
                <CanvasView
                  workspaceId={workspaceId}
                  content={activeFile.content}
                  onContentChange={handleContentChange}
                  onVisitSource={onVisitSource}
                />
              ) : activeFile.type === "html" ? (
                <PrototypeView
                  code={activeFile.content}
                  onCodeChange={handleContentChange}
                />
              ) : (
                <DesignStudioView
                  content={activeFile.content}
                  onContentChange={handleContentChange}
                />
              )}
            </div>
          </>
        ) : (
          /* Empty state */
          <EmptyState
            workspaceName={workspaceName}
            onCreateFile={handleCreateFile}
          />
        )}
      </div>
    </div>
  );
}

// ── TabButton ──────────────────────────────────────────────────────────────

interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, active, onClick }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "5px 14px",
        borderRadius: 10,
        border: active
          ? `1px solid rgba(232,168,124,0.3)`
          : `1px solid ${C.glassBrd}`,
        background: active
          ? `rgba(232,168,124,0.1)`
          : hovered
          ? C.glass
          : "transparent",
        color: active ? C.rg : hovered ? C.tx2 : C.tx4,
        fontSize: 14,
        fontFamily: "'Satoshi'",
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        transition: "all .2s",
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
};

// ── EmptyState ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  workspaceName: string;
  onCreateFile: (type: "design" | "html" | "document") => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  workspaceName,
  onCreateFile,
}) => {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        padding: 48,
        background: C.ob1,
        height: "100%",
      }}
    >
      {/* Ambient orbs */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "30%",
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${C.rgGlow} 0%, transparent 70%)`,
            filter: "blur(60px)",
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            right: "25%",
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(120,80,200,0.15) 0%, transparent 70%)`,
            filter: "blur(60px)",
            opacity: 0.4,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "15%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(200,140,60,0.1) 0%, transparent 70%)`,
            filter: "blur(50px)",
            opacity: 0.35,
          }}
        />
      </div>

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontFamily: "'Clash Display'",
            fontSize: 28,
            fontWeight: 700,
            color: C.cr,
            margin: 0,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          {workspaceName}
        </h2>

        <p
          style={{
            fontFamily: "'Satoshi'",
            fontSize: 18,
            color: C.tx3,
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Create something new
        </p>

        {/* Action buttons */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 8,
          }}
        >
          <button
            onClick={() => onCreateFile("document")}
            style={{
              ...glassBtn({
                padding: "12px 24px",
                fontSize: 15,
                borderRadius: 14,
              }),
              color: C.rg,
              border: `1px solid rgba(232,168,124,0.25)`,
              background: `rgba(232,168,124,0.08)`,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                `rgba(232,168,124,0.15)`;
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                `rgba(232,168,124,0.4)`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                `rgba(232,168,124,0.08)`;
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                `rgba(232,168,124,0.25)`;
            }}
          >
            Document
          </button>

          <button
            onClick={() => onCreateFile("design")}
            style={{
              ...glassBtn({
                padding: "12px 24px",
                fontSize: 15,
                borderRadius: 14,
              }),
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                C.glassB;
              (e.currentTarget as HTMLButtonElement).style.color = C.cr;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                C.glass;
              (e.currentTarget as HTMLButtonElement).style.color = C.tx2;
            }}
          >
            Design Studio
          </button>

          <button
            onClick={() => onCreateFile("html")}
            style={{
              ...glassBtn({
                padding: "12px 24px",
                fontSize: 15,
                borderRadius: 14,
              }),
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                C.glassB;
              (e.currentTarget as HTMLButtonElement).style.color = C.cr;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                C.glass;
              (e.currentTarget as HTMLButtonElement).style.color = C.tx2;
            }}
          >
            HTML Render
          </button>
        </div>
      </div>
    </div>
  );
};
