"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { C } from "../lib/colors";
import { glass, toolbarBtn } from "../lib/styles";
import { I } from "../lib/icons";
import directus from "../lib/directus";
import { readItems, createItem, updateItem, deleteItem } from "@directus/sdk";
import type { CanvasBlock } from "../lib/directus";

interface CanvasEditorProps {
  workspaceId: string;
}

type BlockType = "heading" | "subheading" | "text" | "image" | "youtube";

const BLOCK_STYLES: Record<BlockType, React.CSSProperties> = {
  heading: {
    fontFamily: "'Clash Display'",
    fontSize: 32,
    fontWeight: 700,
    color: C.cr,
    lineHeight: 1.3,
  },
  subheading: {
    fontFamily: "'Clash Display'",
    fontSize: 24,
    fontWeight: 600,
    color: C.cr2,
    lineHeight: 1.4,
  },
  text: {
    fontFamily: "'Satoshi'",
    fontSize: 20,
    fontWeight: 400,
    color: C.tx,
    lineHeight: 1.7,
  },
  image: {},
  youtube: {},
};

const PLACEHOLDER: Record<BlockType, string> = {
  heading: "Heading…",
  subheading: "Subheading…",
  text: "Start typing…",
  image: "https://example.com/image.jpg",
  youtube: "dQw4w9WgXcQ",
};

function CanvasEditor({ workspaceId }: CanvasEditorProps) {
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const editRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const fetchBlocks = useCallback(async () => {
    try {
      const data = await directus.request(
        readItems("canvas_blocks", {
          filter: { workspace_id: { _eq: workspaceId } },
          sort: ["sort_order"],
        })
      );
      setBlocks(data as CanvasBlock[]);
    } catch (err) {
      console.error("Failed to fetch canvas blocks:", err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  const addBlock = async (type: BlockType) => {
    const maxOrder = blocks.length > 0
      ? Math.max(...blocks.map((b) => b.sort_order))
      : 0;
    const newBlock: Partial<CanvasBlock> = {
      workspace_id: workspaceId,
      type,
      content: "",
      sort_order: maxOrder + 1,
    };
    try {
      const created = await directus.request(
        createItem("canvas_blocks", newBlock)
      );
      setBlocks((prev) => [...prev, created as CanvasBlock]);
    } catch (err) {
      console.error("Failed to create block:", err);
    }
  };

  const saveContent = async (id: string, content: string) => {
    setSavingIds((prev) => new Set(prev).add(id));
    try {
      await directus.request(updateItem("canvas_blocks", id, { content }));
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, content } : b))
      );
    } catch (err) {
      console.error("Failed to save block:", err);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const removeBlock = async (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    try {
      await directus.request(deleteItem("canvas_blocks", id));
    } catch (err) {
      console.error("Failed to delete block:", err);
      fetchBlocks();
    }
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = async (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }

    const reordered = [...blocks];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    const updated = reordered.map((b, i) => ({ ...b, sort_order: i + 1 }));
    setBlocks(updated);
    setDragIdx(null);
    setDragOverIdx(null);

    try {
      await Promise.all(
        updated.map((b) =>
          directus.request(
            updateItem("canvas_blocks", b.id, { sort_order: b.sort_order })
          )
        )
      );
    } catch (err) {
      console.error("Failed to reorder blocks:", err);
      fetchBlocks();
    }
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleTextBlur = (block: CanvasBlock) => {
    const el = editRefs.current.get(block.id);
    if (!el) return;
    const newContent = el.innerText;
    if (newContent !== block.content) {
      saveContent(block.id, newContent);
    }
  };

  const renderTextBlock = (block: CanvasBlock) => {
    const type = block.type as BlockType;
    return (
      <div
        ref={(el) => {
          if (el) editRefs.current.set(block.id, el);
          else editRefs.current.delete(block.id);
        }}
        contentEditable
        suppressContentEditableWarning
        onBlur={() => handleTextBlur(block)}
        style={{
          ...BLOCK_STYLES[type],
          outline: "none",
          minHeight: type === "heading" ? 42 : type === "subheading" ? 32 : 28,
          padding: "4px 0",
          cursor: "text",
        }}
        data-placeholder={PLACEHOLDER[type]}
      >
        {block.content}
      </div>
    );
  };

  const renderImageBlock = (block: CanvasBlock) => (
    <div>
      {block.content ? (
        <img
          src={block.content}
          alt=""
          style={{
            maxWidth: "100%",
            borderRadius: 12,
            border: `1px solid ${C.glassBrd}`,
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}
      <input
        type="text"
        defaultValue={block.content}
        placeholder={PLACEHOLDER.image}
        onBlur={(e) => {
          if (e.target.value !== block.content) {
            saveContent(block.id, e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        style={{
          width: "100%",
          marginTop: block.content ? 8 : 0,
          padding: "10px 14px",
          background: C.ob2,
          border: `1px solid ${C.glassBrd}`,
          borderRadius: 10,
          color: C.tx2,
          fontFamily: "'JetBrains Mono'",
          fontSize: 14,
          outline: "none",
        }}
      />
    </div>
  );

  const renderYoutubeBlock = (block: CanvasBlock) => (
    <div>
      {block.content ? (
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 12, overflow: "hidden" }}>
          <iframe
            src={`https://www.youtube.com/embed/${block.content}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: "none",
            }}
          />
        </div>
      ) : null}
      <input
        type="text"
        defaultValue={block.content}
        placeholder={PLACEHOLDER.youtube}
        onBlur={(e) => {
          if (e.target.value !== block.content) {
            saveContent(block.id, e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        style={{
          width: "100%",
          marginTop: block.content ? 8 : 0,
          padding: "10px 14px",
          background: C.ob2,
          border: `1px solid ${C.glassBrd}`,
          borderRadius: 10,
          color: C.tx2,
          fontFamily: "'JetBrains Mono'",
          fontSize: 14,
          outline: "none",
        }}
      />
    </div>
  );

  const renderBlock = (block: CanvasBlock) => {
    const type = block.type as BlockType;
    switch (type) {
      case "heading":
      case "subheading":
      case "text":
        return renderTextBlock(block);
      case "image":
        return renderImageBlock(block);
      case "youtube":
        return renderYoutubeBlock(block);
      default:
        return renderTextBlock(block);
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "heading": return "H1";
      case "subheading": return "H2";
      case "text": return "Text";
      case "image": return "Image";
      case "youtube": return "Video";
      default: return type;
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 64 }}>
        <span className="spin" style={{ color: C.rg, display: "flex" }}>{I.loader}</span>
        <span style={{ marginLeft: 12, fontFamily: "'Satoshi'", fontSize: 16, color: C.tx3 }}>
          Loading blocks…
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, height: "100%" }}>
      {/* Toolbar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          ...glass({
            borderRadius: "12px",
            padding: "8px 12px",
            display: "flex",
            gap: "6px",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 20,
          }),
        }}
      >
        <button
          onClick={() => addBlock("heading")}
          style={toolbarBtn({ color: C.tx2 })}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.glass; e.currentTarget.style.color = C.cr; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.tx2; }}
          title="Add Heading"
        >
          {I.h1}
          <span>Heading</span>
        </button>

        <button
          onClick={() => addBlock("subheading")}
          style={toolbarBtn({ color: C.tx2 })}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.glass; e.currentTarget.style.color = C.cr; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.tx2; }}
          title="Add Subheading"
        >
          {I.h1}
          <span>Sub</span>
        </button>

        <button
          onClick={() => addBlock("text")}
          style={toolbarBtn({ color: C.tx2 })}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.glass; e.currentTarget.style.color = C.cr; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.tx2; }}
          title="Add Text"
        >
          {I.list}
          <span>Text</span>
        </button>

        <button
          onClick={() => addBlock("image")}
          style={toolbarBtn({ color: C.tx2 })}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.glass; e.currentTarget.style.color = C.cr; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.tx2; }}
          title="Add Image"
        >
          {I.img}
          <span>Image</span>
        </button>

        <button
          onClick={() => addBlock("youtube")}
          style={toolbarBtn({ color: C.tx2 })}
          onMouseEnter={(e) => { e.currentTarget.style.background = C.glass; e.currentTarget.style.color = C.cr; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.tx2; }}
          title="Add YouTube"
        >
          {I.yt}
          <span>Video</span>
        </button>

        <div style={{ width: 1, height: 24, background: C.glassBrd, margin: "0 4px" }} />

        <button
          style={toolbarBtn({ color: C.rg })}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${C.rg}14`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          title="Context"
        >
          {I.ctx}
          <span>Context</span>
        </button>
      </div>

      {/* Block list */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {blocks.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 80,
              gap: 16,
            }}
          >
            <span style={{ color: C.rg, display: "flex" }}>{I.pen}</span>
            <span
              style={{
                fontFamily: "'Satoshi'",
                fontSize: 20,
                color: C.tx3,
                textAlign: "center",
              }}
            >
              Start writing — add a block from the toolbar above
            </span>
          </div>
        ) : (
          blocks.map((block, idx) => (
            <div
              key={block.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={() => handleDrop(idx)}
              onDragEnd={handleDragEnd}
              onMouseEnter={() => setHoveredId(block.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                ...glass({
                  padding: "16px 20px",
                  position: "relative",
                  transition: "all 0.2s ease",
                  opacity: dragIdx === idx ? 0.4 : 1,
                  borderColor:
                    dragOverIdx === idx
                      ? C.rg
                      : savingIds.has(block.id)
                        ? `${C.rg}40`
                        : C.glassBrd,
                }),
                cursor: "grab",
              }}
            >
              {/* Block type label + drag handle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: C.tx4, display: "flex" }}>{I.move}</span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono'",
                      fontSize: 11,
                      fontWeight: 600,
                      color: C.tx4,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {typeLabel(block.type)}
                  </span>
                  {savingIds.has(block.id) && (
                    <span className="spin" style={{ color: C.rg, display: "flex", marginLeft: 4 }}>
                      {I.loader}
                    </span>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => removeBlock(block.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: C.tx4,
                    padding: 4,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    opacity: hoveredId === block.id ? 1 : 0,
                    transition: "opacity 0.15s, color 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = C.red; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = C.tx4; }}
                  title="Delete block"
                >
                  {I.trash}
                </button>
              </div>

              {/* Block content */}
              {renderBlock(block)}
            </div>
          ))
        )}
      </div>

      {/* Spin animation style */}
      <style>{`
        .spin { animation: canvasSpin 0.8s linear infinite; }
        @keyframes canvasSpin { to { transform: rotate(360deg); } }
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: ${C.tx4};
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

export default CanvasEditor;
