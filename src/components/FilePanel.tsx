"use client";

import React, { useState, useRef, useEffect, CSSProperties } from "react";
import { C } from "../lib/colors";
import { glass } from "../lib/styles";
import { I } from "../lib/icons";
import type { WorkspaceFile } from "../lib/directus";

// ── Props ──────────────────────────────────────────────────────────────────

interface FilePanelProps {
  files: WorkspaceFile[];
  activeFileId: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectFile: (file: WorkspaceFile) => void;
  onCreateFile: (type: "design" | "document") => void;
  onRenameFile: (id: string, name: string) => void;
  onDeleteFile: (id: string) => void;
  onDuplicateFile: (id: string) => void;
}

// ── Chevron SVGs ───────────────────────────────────────────────────────────

const ChevronLeft = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRight = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Component ──────────────────────────────────────────────────────────────

export const FilePanel: React.FC<FilePanelProps> = ({
  files,
  activeFileId,
  collapsed,
  onToggleCollapse,
  onSelectFile,
  onCreateFile,
  onRenameFile,
  onDeleteFile,
  onDuplicateFile,
}) => {
  const [newDropOpen, setNewDropOpen] = useState(false);
  const [overflowOpenId, setOverflowOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const panelRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setNewDropOpen(false);
        setOverflowOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus rename input when entering rename mode
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  function startRename(file: WorkspaceFile) {
    setOverflowOpenId(null);
    setRenamingId(file.id);
    setRenameValue(file.name);
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      onRenameFile(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  // ── Collapsed rail ───────────────────────────────────────────────────────

  if (collapsed) {
    return (
      <div
        style={{
          width: 40,
          minWidth: 40,
          height: "100%",
          background: C.ob2,
          borderRight: `1px solid ${C.glassBrd}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: 16,
          flexShrink: 0,
        }}
      >
        <button
          onClick={onToggleCollapse}
          title="Expand panel"
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: C.tx4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            padding: 0,
            transition: "color .2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = C.cr;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = C.tx4;
          }}
        >
          <ChevronRight />
        </button>
      </div>
    );
  }

  // ── Expanded panel ───────────────────────────────────────────────────────

  return (
    <div
      ref={panelRef}
      style={{
        width: 240,
        minWidth: 240,
        height: "100%",
        background: C.ob2,
        borderRight: `1px solid ${C.glassBrd}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        fontFamily: "'Satoshi'",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 12px 10px",
          borderBottom: `1px solid ${C.glassBrd}`,
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: C.tx3,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "'Satoshi'",
          }}
        >
          Your Work
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* + New button */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => {
                setNewDropOpen((v) => !v);
                setOverflowOpenId(null);
              }}
              title="New file"
              style={{
                background: "transparent",
                border: `1px solid ${C.glassBrd}`,
                borderRadius: 8,
                cursor: "pointer",
                color: C.tx2,
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                fontSize: 13,
                fontFamily: "'Satoshi'",
                fontWeight: 500,
                transition: "all .2s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = C.glass;
                el.style.color = C.cr;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = "transparent";
                el.style.color = C.tx2;
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span>
              <span>New</span>
            </button>

            {/* New file dropdown */}
            {newDropOpen && (
              <div
                style={{
                  ...glass({
                    borderRadius: 12,
                    padding: "6px",
                  }),
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  zIndex: 200,
                  minWidth: 180,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                <DropItem
                  icon={I.pen}
                  label="Design Studio"
                  onClick={() => {
                    onCreateFile("design");
                    setNewDropOpen(false);
                  }}
                />
                <DropItem
                  icon={I.file}
                  label="Document"
                  onClick={() => {
                    onCreateFile("document");
                    setNewDropOpen(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* Collapse chevron */}
          <button
            onClick={onToggleCollapse}
            title="Collapse panel"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: C.tx4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              borderRadius: 6,
              padding: 0,
              transition: "color .2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = C.cr;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = C.tx4;
            }}
          >
            <ChevronLeft />
          </button>
        </div>
      </div>

      {/* File list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 0",
        }}
      >
        {files.length === 0 ? (
          <div
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: C.tx4,
              fontSize: 13,
              fontFamily: "'Satoshi'",
              lineHeight: 1.6,
            }}
          >
            No files yet.
            <br />
            Click &lsquo;+ New&rsquo; to start.
          </div>
        ) : (
          files.map((file) => {
            const isActive = file.id === activeFileId;
            const isRenaming = file.id === renamingId;
            const overflowOpen = file.id === overflowOpenId;

            return (
              <div
                key={file.id}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 0,
                  margin: "1px 6px",
                  borderRadius: 10,
                  borderLeft: isActive ? `2px solid ${C.rg}` : "2px solid transparent",
                  background: isActive
                    ? `rgba(232,168,124,0.07)`
                    : "transparent",
                  cursor: isRenaming ? "default" : "pointer",
                  transition: "background .15s",
                }}
                onClick={() => {
                  if (!isRenaming) onSelectFile(file);
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "rgba(255,255,255,0.03)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLDivElement).style.background =
                      "transparent";
                  }
                }}
              >
                {/* File info */}
                <div
                  style={{
                    flex: 1,
                    padding: "8px 6px 8px 10px",
                    minWidth: 0,
                  }}
                >
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") cancelRename();
                      }}
                      onBlur={commitRename}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: "100%",
                        background: C.ob4,
                        border: `1px solid ${C.rg}`,
                        borderRadius: 6,
                        color: C.cr,
                        fontSize: 13,
                        fontFamily: "'Satoshi'",
                        padding: "2px 6px",
                        outline: "none",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? C.cr : C.tx2,
                        fontFamily: "'Satoshi'",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: 1.4,
                      }}
                    >
                      {file.name}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 3,
                    }}
                  >
                    {/* Type badge */}
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "'Satoshi'",
                        fontWeight: 500,
                        color: file.type === "design" ? C.rg : C.tx4,
                        background:
                          file.type === "design"
                            ? `rgba(232,168,124,0.12)`
                            : "rgba(255,255,255,0.05)",
                        border: `1px solid ${
                          file.type === "design"
                            ? "rgba(232,168,124,0.2)"
                            : C.glassBrd
                        }`,
                        borderRadius: 4,
                        padding: "1px 5px",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {file.type === "design" ? "Design" : "Doc"}
                    </span>

                    {/* Last edited */}
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "'Satoshi'",
                        color: C.tx4,
                      }}
                    >
                      {fmtDate(file.updated_at)}
                    </span>
                  </div>
                </div>

                {/* Overflow menu button */}
                {!isRenaming && (
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOverflowOpenId((prev) =>
                          prev === file.id ? null : file.id
                        );
                        setNewDropOpen(false);
                      }}
                      title="File options"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: C.tx4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        padding: 0,
                        marginRight: 6,
                        fontSize: 16,
                        lineHeight: 1,
                        opacity: overflowOpen ? 1 : undefined,
                        transition: "color .15s, opacity .15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = C.cr;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = C.tx4;
                      }}
                    >
                      ⋮
                    </button>

                    {/* Overflow dropdown */}
                    {overflowOpen && (
                      <div
                        style={{
                          ...glass({
                            borderRadius: 10,
                            padding: "4px",
                          }),
                          position: "absolute",
                          top: "calc(100% + 4px)",
                          right: 0,
                          zIndex: 300,
                          minWidth: 140,
                          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <OverflowItem
                          label="Rename"
                          onClick={() => startRename(file)}
                        />
                        <OverflowItem
                          label="Duplicate"
                          onClick={() => {
                            onDuplicateFile(file.id);
                            setOverflowOpenId(null);
                          }}
                        />
                        <div
                          style={{
                            height: 1,
                            background: C.glassBrd,
                            margin: "3px 4px",
                          }}
                        />
                        <OverflowItem
                          label="Delete"
                          danger
                          onClick={() => {
                            onDeleteFile(file.id);
                            setOverflowOpenId(null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

interface DropItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const DropItem: React.FC<DropItemProps> = ({ icon, label, onClick }) => {
  const [hovered, setHovered] = useState(false);

  const style: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 8,
    cursor: "pointer",
    color: hovered ? C.cr : C.tx2,
    background: hovered ? "rgba(255,255,255,0.06)" : "transparent",
    fontSize: 14,
    fontFamily: "'Satoshi'",
    fontWeight: 500,
    transition: "all .15s",
    border: "none",
    width: "100%",
    textAlign: "left",
  };

  return (
    <button
      style={style}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ color: hovered ? C.rg : C.tx3, display: "flex" }}>
        {icon}
      </span>
      {label}
    </button>
  );
};

interface OverflowItemProps {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

const OverflowItem: React.FC<OverflowItemProps> = ({
  label,
  onClick,
  danger = false,
}) => {
  const [hovered, setHovered] = useState(false);

  const style: CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: "7px 10px",
    borderRadius: 6,
    cursor: "pointer",
    color: hovered
      ? danger
        ? C.red
        : C.cr
      : danger
      ? `${C.red}CC`
      : C.tx2,
    background: hovered
      ? danger
        ? `rgba(232,93,93,0.1)`
        : "rgba(255,255,255,0.06)"
      : "transparent",
    fontSize: 13,
    fontFamily: "'Satoshi'",
    fontWeight: 500,
    transition: "all .15s",
    border: "none",
    width: "100%",
    textAlign: "left",
  };

  return (
    <button
      style={style}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
};

export default FilePanel;
