"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { C } from "../lib/colors";
import { I } from "../lib/icons";
import directus from "../lib/directus";
import type { CanvasBlock } from "../lib/directus";
import { readItems, createItem, updateItem, deleteItem } from "@directus/sdk";

interface Props {
  workspaceId: string;
}

type BlockType = "heading" | "subheading" | "text" | "image" | "youtube";

const BLOCK_STYLES: Record<BlockType, React.CSSProperties> = {
  heading: {
    fontFamily: "'Clash Display'",
    fontSize: 40,
    fontWeight: 700,
    color: C.cr,
    letterSpacing: "-0.03em",
    lineHeight: 1.2,
  },
  subheading: {
    fontFamily: "'Clash Display'",
    fontSize: 26,
    fontWeight: 600,
    color: C.cr,
    letterSpacing: "-0.02em",
    lineHeight: 1.3,
  },
  text: {
    fontFamily: "'Satoshi'",
    fontSize: 20,
    fontWeight: 400,
    color: C.cr,
    lineHeight: 1.7,
  },
  image: {},
  youtube: {},
};

const TOOLBAR_ITEMS: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: "heading", label: "H1", icon: I.h1 },
  { type: "subheading", label: "H2", icon: I.h1 },
  { type: "text", label: "Text", icon: I.list },
  { type: "image", label: "Image", icon: I.img },
  { type: "youtube", label: "YouTube", icon: I.yt },
];

// ── Save indicator dot ──
function SaveDot({ saving }: { saving: boolean }) {
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: saving ? C.green : C.tx4,
        transition: "background 0.3s",
        boxShadow: saving ? `0 0 8px ${C.green}` : "none",
      }}
    />
  );
}

// ── Single Block component ──
function BlockEditor({
  block,
  onUpdate,
  onDelete,
}: {
  block: CanvasBlock;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const type = block.type as BlockType;

  // For image blocks
  if (type === "image") {
    return (
      <div style={{ position: "relative", marginBottom: 8 }}>
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            border: `2px dashed transparent`,
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${C.rg}60`)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
        >
          {block.content ? (
            <img
              src={block.content}
              alt=""
              style={{ width: "100%", borderRadius: 12, display: "block" }}
            />
          ) : (
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onUpdate(block.id, e.currentTarget.textContent || "")}
              style={{
                ...BLOCK_STYLES.text,
                padding: "24px",
                background: C.glass,
                borderRadius: 12,
                color: C.tx3,
                fontSize: 16,
                minHeight: 80,
                outline: "none",
              }}
              data-placeholder="Paste image URL…"
            />
          )}
        </div>
        <button
          onClick={() => onDelete(block.id)}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: `${C.ob1}CC`,
            border: "none",
            borderRadius: 6,
            padding: 4,
            cursor: "pointer",
            color: C.tx3,
            opacity: 0.6,
          }}
        >
          {I.trash}
        </button>
      </div>
    );
  }

  // For youtube blocks
  if (type === "youtube") {
    const videoId = extractYouTubeId(block.content);
    return (
      <div style={{ position: "relative", marginBottom: 8 }}>
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            border: `2px dashed transparent`,
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${C.rg}60`)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
        >
          {videoId ? (
            <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: 12,
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => onUpdate(block.id, e.currentTarget.textContent || "")}
              style={{
                ...BLOCK_STYLES.text,
                padding: "24px",
                background: C.glass,
                borderRadius: 12,
                color: C.tx3,
                fontSize: 16,
                minHeight: 80,
                outline: "none",
              }}
              data-placeholder="Paste YouTube URL…"
            />
          )}
        </div>
        <button
          onClick={() => onDelete(block.id)}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: `${C.ob1}CC`,
            border: "none",
            borderRadius: 6,
            padding: 4,
            cursor: "pointer",
            color: C.tx3,
            opacity: 0.6,
          }}
        >
          {I.trash}
        </button>
      </div>
    );
  }

  // Text-based blocks (heading, subheading, text)
  return (
    <div style={{ position: "relative", marginBottom: 4 }}>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => {
          if (ref.current) onUpdate(block.id, ref.current.textContent || "");
        }}
        onFocus={(e) => (e.currentTarget.style.outline = `2px solid ${C.rg}`)}
        onBlur={(e) => (e.currentTarget.style.outline = "none")}
        onMouseEnter={(e) => {
          if (document.activeElement !== e.currentTarget)
            e.currentTarget.style.outline = `2px dashed ${C.rg}60`;
        }}
        onMouseLeave={(e) => {
          if (document.activeElement !== e.currentTarget)
            e.currentTarget.style.outline = "none";
        }}
        style={{
          ...BLOCK_STYLES[type],
          padding: "8px 12px",
          borderRadius: 8,
          outline: "none",
          transition: "outline-color 0.15s",
          minHeight: type === "text" ? 32 : 40,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
        dangerouslySetInnerHTML={{ __html: block.content || "" }}
      />
      <button
        onClick={() => onDelete(block.id)}
        style={{
          position: "absolute",
          top: 4,
          right: -32,
          background: "transparent",
          border: "none",
          padding: 4,
          cursor: "pointer",
          color: C.tx4,
          opacity: 0,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
        className="block-delete"
      >
        {I.trash}
      </button>
    </div>
  );
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

// ── Main Canvas View ──
export default function CanvasView({ workspaceId }: Props) {
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Fetch blocks on mount / workspace change
  const fetchBlocks = useCallback(async () => {
    try {
      const items = await directus.request(
        readItems("canvas_blocks", {
          filter: { workspace_id: { _eq: workspaceId } },
          sort: ["sort_order"],
        })
      );
      setBlocks(items as CanvasBlock[]);
    } catch {
      // Directus may not be connected
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  // Debounced auto-save per block
  const handleUpdate = useCallback(
    (id: string, content: string) => {
      // Update local state immediately
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, content } : b))
      );

      // Clear previous timer for this block
      if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);

      // Set new debounced save
      saveTimers.current[id] = setTimeout(async () => {
        try {
          setSaving(true);
          await directus.request(updateItem("canvas_blocks", id, { content }));
        } catch (err) {
          console.error("Auto-save failed:", err);
        } finally {
          setTimeout(() => setSaving(false), 600);
        }
      }, 1000);
    },
    []
  );

  // Add new block
  const addBlock = async (type: BlockType) => {
    try {
      const maxSort = blocks.length > 0 ? Math.max(...blocks.map((b) => b.sort_order)) : 0;
      const newBlock = await directus.request(
        createItem("canvas_blocks", {
          workspace_id: workspaceId,
          type,
          content: "",
          sort_order: maxSort + 1,
        })
      );
      setBlocks((prev) => [...prev, newBlock as CanvasBlock]);
    } catch (err) {
      console.error("Failed to add block:", err);
    }
  };

  // Delete block
  const handleDelete = async (id: string) => {
    try {
      await directus.request(deleteItem("canvas_blocks", id));
      setBlocks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Failed to delete block:", err);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Canvas Toolbar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 0",
          marginBottom: 16,
          borderBottom: `1px solid ${C.glassBrd}`,
        }}
      >
        {TOOLBAR_ITEMS.map((item) => (
          <button
            key={item.type}
            onClick={() => addBlock(item.type)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              border: `1px solid ${C.glassBrd}`,
              borderRadius: 8,
              background: "transparent",
              color: C.tx2,
              fontSize: 14,
              fontFamily: "'Satoshi'",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.glass;
              e.currentTarget.style.color = C.rg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = C.tx2;
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        {/* Save indicator */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <SaveDot saving={saving} />
          <span style={{ fontSize: 13, color: C.tx4 }}>
            {saving ? "Saving…" : `${blocks.length} blocks`}
          </span>
        </div>
      </div>

      {/* ── Block List ── */}
      <div style={{ flex: 1, overflow: "auto", paddingRight: 40 }}>
        {blocks.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "60%",
              gap: 16,
            }}
          >
            <div style={{ color: C.tx4, opacity: 0.5 }}>{I.board}</div>
            <p style={{ fontSize: 18, color: C.tx3 }}>
              Empty canvas — add a block from the toolbar above
            </p>
          </div>
        ) : (
          blocks.map((block) => (
            <BlockEditor
              key={block.id}
              block={block}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
