"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import DOMPurify from "dompurify";
import { C } from "../lib/colors";
import { I } from "../lib/icons";
import type { CanvasBlock } from "../lib/directus";
import {
  fetchCanvasBlocks,
  createCanvasBlock,
  updateCanvasBlock,
  deleteCanvasBlock,
  isStoreOffline,
} from "../lib/store";
import FloatingToolbar from "./canvas/FloatingToolbar";
import ImageGalleryModal from "./canvas/ImageGalleryModal";
import YouTubeModal from "./canvas/YouTubeModal";
import SearchCard from "./SearchCard";
import type { SearchCardData } from "@/lib/types";

// Extend CanvasBlock locally to support search_card blocks
type CanvasBlockExtended = CanvasBlock & { searchData?: SearchCardData };

interface Props {
  workspaceId: string;
  onVisitSource?: (url: string) => void;
  // Controlled mode: when both are provided, CanvasView manages blocks
  // from the content prop and calls onContentChange instead of the store.
  content?: string;
  onContentChange?: (content: string) => void;
}

type BlockType = "heading" | "subheading" | "text" | "image" | "youtube";

let localIdCounter = 0;
const localId = () => `local-${++localIdCounter}-${Date.now()}`;

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ["b", "i", "u", "s", "br", "strong", "em"],
  ALLOWED_ATTR: [] as string[],
};

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

const PLACEHOLDERS: Record<BlockType, string> = {
  heading: "Heading…",
  subheading: "Subheading…",
  text: "Start writing…",
  image: "Paste image URL…",
  youtube: "Paste YouTube URL…",
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

// ── Single Block component (FIXED: no dangerouslySetInnerHTML) ──
function BlockEditor({
  block,
  onUpdate,
  onDelete,
  autoFocus,
}: {
  block: CanvasBlock;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const type = block.type as BlockType;

  // Set initial content once — after that the DOM owns the text
  useEffect(() => {
    if (ref.current && !initializedRef.current) {
      ref.current.textContent = block.content || "";
      initializedRef.current = true;
    }
  }, [block.content]);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      const sel = window.getSelection();
      if (sel && ref.current.childNodes.length > 0) {
        sel.selectAllChildren(ref.current);
        sel.collapseToEnd();
      }
    }
  }, [autoFocus]);

  // Handle paste — sanitize
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const html = e.clipboardData.getData("text/html");
      const text = e.clipboardData.getData("text/plain");
      const clean = html
        ? DOMPurify.sanitize(html, PURIFY_CONFIG)
        : DOMPurify.sanitize(text, PURIFY_CONFIG);
      document.execCommand("insertHTML", false, clean);
      if (ref.current) onUpdate(block.id, ref.current.textContent || "");
    },
    [block.id, onUpdate]
  );

  // For image blocks
  if (type === "image") {
    return (
      <div style={{ position: "relative", marginBottom: 12, group: "true" } as React.CSSProperties}>
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            border: "2px dashed transparent",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${C.rg}60`)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
        >
          {block.content && (block.content.startsWith("http") || block.content.startsWith("data:")) ? (
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
              data-placeholder={PLACEHOLDERS.image}
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
      <div style={{ position: "relative", marginBottom: 12 }}>
        <div
          style={{
            borderRadius: 12,
            overflow: "hidden",
            border: "2px dashed transparent",
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
              data-placeholder={PLACEHOLDERS.youtube}
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

  // Text-based blocks (heading, subheading, text) — FIXED cursor behavior
  return (
    <div
      style={{ position: "relative", marginBottom: 4 }}
      onMouseEnter={(e) => {
        const del = e.currentTarget.querySelector(".block-delete") as HTMLElement;
        if (del) del.style.opacity = "0.6";
      }}
      onMouseLeave={(e) => {
        const del = e.currentTarget.querySelector(".block-delete") as HTMLElement;
        if (del) del.style.opacity = "0";
      }}
    >
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => {
          if (ref.current) onUpdate(block.id, ref.current.textContent || "");
        }}
        onPaste={handlePaste}
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
        data-placeholder={PLACEHOLDERS[type]}
      />
      <button
        onClick={() => onDelete(block.id)}
        className="block-delete"
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
export default function CanvasView({ workspaceId, onVisitSource, content, onContentChange }: Props) {
  const isControlled = content !== undefined && onContentChange !== undefined;
  const [blocks, setBlocks] = useState<CanvasBlockExtended[]>([]);
  const [saving, setSaving] = useState(false);
  const [useLocal, setUseLocal] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Fetch blocks on mount — fall back to local mode if store is offline
  const fetchBlocks = useCallback(async () => {
    try {
      const items = await fetchCanvasBlocks(workspaceId);
      setBlocks(items);
      if (isStoreOffline()) setUseLocal(true);
    } catch {
      setUseLocal(true);
    }
  }, [workspaceId]);

  // Listen for search cards added from SearchResultsPanel
  useEffect(() => {
    const handler = (e: Event) => {
      const card = (e as CustomEvent<SearchCardData>).detail;
      const newBlock: CanvasBlockExtended = {
        id: card.id,
        workspace_id: workspaceId,
        type: "search_card",
        content: card.title,
        sort_order: Date.now(),
        searchData: card,
      };
      setBlocks((prev) => [...prev, newBlock]);
    };
    window.addEventListener("60w:add-search-card", handler);
    return () => window.removeEventListener("60w:add-search-card", handler);
  }, [workspaceId]);

  // Standalone mode: fetch blocks from store on mount
  useEffect(() => {
    if (!isControlled) {
      fetchBlocks();
    }
  }, [isControlled, fetchBlocks]);

  // Controlled mode: sync blocks whenever the content prop changes
  useEffect(() => {
    if (!isControlled) return;
    try {
      const parsed = JSON.parse(content!) as CanvasBlockExtended[];
      setBlocks(Array.isArray(parsed) ? parsed : []);
    } catch {
      setBlocks([]);
    }
    // isControlled is stable for the lifetime of a given usage, so omitting it
    // from deps is safe. We only want to re-run when content changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  // Debounced auto-save per block
  const handleUpdate = useCallback(
    (id: string, blockContent: string) => {
      setBlocks((prev) => {
        const updated = prev.map((b) => (b.id === id ? { ...b, content: blockContent } : b));

        if (isControlled) {
          // Defer to avoid setState-in-render: parent's setFiles during child update
          queueMicrotask(() => {
            onContentChange!(JSON.stringify(updated));
            setSaving(true);
            setTimeout(() => setSaving(false), 400);
          });
        }

        return updated;
      });

      if (isControlled) return;

      if (useLocal) {
        setSaving(true);
        setTimeout(() => setSaving(false), 400);
        return;
      }

      if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(async () => {
        try {
          setSaving(true);
          await updateCanvasBlock(id, { content: blockContent }, workspaceId);
        } catch {
          // Silent fail
        } finally {
          setTimeout(() => setSaving(false), 600);
        }
      }, 1000);
    },
    [isControlled, onContentChange, useLocal, workspaceId]
  );

  // Add new block — Image and YouTube open modals, others create directly
  const addBlock = async (type: BlockType) => {
    if (type === "image") {
      setShowImageGallery(true);
      return;
    }
    if (type === "youtube") {
      setShowYouTube(true);
      return;
    }

    const maxSort = blocks.length > 0 ? Math.max(...blocks.map((b) => b.sort_order)) : 0;

    // Controlled mode: generate local ID and notify parent
    if (isControlled) {
      const newBlock: CanvasBlock = {
        id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        workspace_id: workspaceId,
        type,
        content: "",
        sort_order: maxSort + 1,
      };
      setBlocks((prev) => {
        const updated = [...prev, newBlock];
        queueMicrotask(() => onContentChange!(JSON.stringify(updated)));
        return updated;
      });
      setLastAddedId(newBlock.id);
      return;
    }

    if (useLocal) {
      const newBlock: CanvasBlock = {
        id: localId(),
        workspace_id: workspaceId,
        type,
        content: "",
        sort_order: maxSort + 1,
      };
      setBlocks((prev) => [...prev, newBlock]);
      setLastAddedId(newBlock.id);
      return;
    }

    try {
      const created = await createCanvasBlock({
        workspace_id: workspaceId,
        type,
        content: "",
        sort_order: maxSort + 1,
      });
      setBlocks((prev) => [...prev, created]);
      setLastAddedId(created.id);
      if (isStoreOffline()) setUseLocal(true);
    } catch {
      const newBlock: CanvasBlock = {
        id: localId(),
        workspace_id: workspaceId,
        type,
        content: "",
        sort_order: maxSort + 1,
      };
      setBlocks((prev) => [...prev, newBlock]);
      setLastAddedId(newBlock.id);
      setUseLocal(true);
    }
  };

  // Delete block
  const handleDelete = async (id: string) => {
    setBlocks((prev) => {
      const updated = prev.filter((b) => b.id !== id);
      if (isControlled) {
        queueMicrotask(() => onContentChange!(JSON.stringify(updated)));
      }
      return updated;
    });
    if (isControlled) return;
    try {
      await deleteCanvasBlock(id, workspaceId);
    } catch {
      // Silent fail
    }
  };

  // Image gallery insert
  const handleImageInsert = useCallback(
    async (imageSource: string) => {
      setShowImageGallery(false);
      const maxSort = blocks.length > 0 ? Math.max(...blocks.map((b) => b.sort_order)) : 0;

      if (isControlled) {
        const newBlock: CanvasBlock = {
          id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          workspace_id: workspaceId,
          type: "image",
          content: imageSource,
          sort_order: maxSort + 1,
        };
        setBlocks((prev) => {
          const updated = [...prev, newBlock];
          queueMicrotask(() => onContentChange!(JSON.stringify(updated)));
          return updated;
        });
        return;
      }

      const newBlock: CanvasBlock = {
        id: localId(),
        workspace_id: workspaceId,
        type: "image",
        content: imageSource,
        sort_order: maxSort + 1,
      };
      setBlocks((prev) => [...prev, newBlock]);
      try {
        const created = await createCanvasBlock({
          workspace_id: workspaceId,
          type: "image",
          content: imageSource,
          sort_order: maxSort + 1,
        });
        setBlocks((prev) =>
          prev.map((b) => (b.id === newBlock.id ? created : b))
        );
      } catch {}
    },
    [isControlled, onContentChange, workspaceId, blocks]
  );

  // YouTube insert
  const handleYouTubeInsert = useCallback(
    async (youtubeUrl: string) => {
      setShowYouTube(false);
      const maxSort = blocks.length > 0 ? Math.max(...blocks.map((b) => b.sort_order)) : 0;

      if (isControlled) {
        const newBlock: CanvasBlock = {
          id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          workspace_id: workspaceId,
          type: "youtube",
          content: youtubeUrl,
          sort_order: maxSort + 1,
        };
        setBlocks((prev) => {
          const updated = [...prev, newBlock];
          queueMicrotask(() => onContentChange!(JSON.stringify(updated)));
          return updated;
        });
        return;
      }

      const newBlock: CanvasBlock = {
        id: localId(),
        workspace_id: workspaceId,
        type: "youtube",
        content: youtubeUrl,
        sort_order: maxSort + 1,
      };
      setBlocks((prev) => [...prev, newBlock]);
      try {
        const created = await createCanvasBlock({
          workspace_id: workspaceId,
          type: "youtube",
          content: youtubeUrl,
          sort_order: maxSort + 1,
        });
        setBlocks((prev) =>
          prev.map((b) => (b.id === newBlock.id ? created : b))
        );
      } catch {}
    },
    [isControlled, onContentChange, workspaceId, blocks]
  );

  // Floating toolbar actions
  const handleFormat = useCallback((action: string) => {
    switch (action) {
      case "bold": document.execCommand("bold"); break;
      case "italic": document.execCommand("italic"); break;
      case "underline": document.execCommand("underline"); break;
      case "strikethrough": document.execCommand("strikeThrough"); break;
    }
  }, []);

  const handleHeading = useCallback(() => {
    // Heading toggle handled by toolbar buttons above
  }, []);

  const handleInsertFromToolbar = useCallback((action: "image" | "youtube") => {
    if (action === "image") setShowImageGallery(true);
    if (action === "youtube") setShowYouTube(true);
  }, []);

  // Click on empty canvas area to add a text block
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && blocks.length === 0) {
      addBlock("text");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Canvas Toolbar (original design) ── */}
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
            {saving ? "Saving…" : `${blocks.length} block${blocks.length !== 1 ? "s" : ""}`}
          </span>
          {useLocal && (
            <span style={{ fontSize: 11, color: C.rg, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${C.rg}14` }}>
              Local
            </span>
          )}
        </div>
      </div>

      {/* ── Block List (original design) ── */}
      <div
        style={{ flex: 1, overflow: "auto", paddingRight: 40, cursor: blocks.length === 0 ? "text" : "default" }}
        onClick={handleCanvasClick}
      >
        {blocks.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "60%",
              gap: 16,
              pointerEvents: "none",
            }}
          >
            <div style={{ color: C.tx4, opacity: 0.5 }}>{I.board}</div>
            <p style={{ fontSize: 20, color: C.tx3 }}>
              Click here or use the toolbar to start writing
            </p>
            <p style={{ fontSize: 15, color: C.tx4 }}>
              Add headings, text, images, and YouTube embeds
            </p>
          </div>
        ) : (
          <>
            {blocks.map((block) => {
              if (block.type === "search_card" && block.searchData) {
                return (
                  <SearchCard
                    key={block.id}
                    card={block.searchData}
                    mode="pinned"
                    onVisitSource={(url) => {
                      if (onVisitSource) {
                        onVisitSource(url);
                      } else {
                        window.open(url, "_blank", "noopener,noreferrer");
                      }
                    }}
                    onExtract={async (card) => {
                      const style = localStorage.getItem("60w_extraction_style") || "light";
                      const surroundingBlocks = blocks
                        .filter((b) => b.type !== "search_card")
                        .slice(-10)
                        .map((b) => b.content)
                        .join("\n");

                      const res = await fetch("/api/chat", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          messages: [
                            {
                              role: "user",
                              content: `Extract and integrate this search result into my document. Style: ${style === "full" ? "Full rewrite — rewrite in my voice to blend seamlessly" : "Light touch — clean up and format to match my document style"}.

SEARCH RESULT:
Title: ${card.title}
Content: ${card.snippet}
Source: ${card.source_url}

SURROUNDING DOCUMENT CONTEXT:
${surroundingBlocks}

Return ONLY the extracted text content, ready to be inserted. No meta-commentary.`,
                            },
                          ],
                        }),
                      });

                      if (res.ok) {
                        const data = await res.json();
                        setBlocks((prev) =>
                          prev.map((b) =>
                            b.id === card.id
                              ? { ...b, type: "text" as const, content: data.content, searchData: undefined }
                              : b
                          )
                        );
                      }
                    }}
                    onRemove={(cardId) => {
                      setBlocks((prev) => prev.filter((b) => b.id !== cardId));
                    }}
                  />
                );
              }
              return (
                <BlockEditor
                  key={block.id}
                  block={block}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  autoFocus={block.id === lastAddedId}
                />
              );
            })}
            {/* Click below last block to add new text block */}
            <div
              onClick={() => addBlock("text")}
              style={{
                minHeight: 120,
                cursor: "text",
                borderRadius: 8,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = `${C.glass}`)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            />
          </>
        )}
      </div>

      {/* ── Floating Formatting Toolbar (NEW) ── */}
      <FloatingToolbar
        onFormat={handleFormat}
        onHeading={handleHeading}
        onInsert={handleInsertFromToolbar}
      />

      {/* ── Image Gallery Modal (NEW) ── */}
      {showImageGallery && (
        <ImageGalleryModal
          workspaceId={workspaceId}
          onInsert={handleImageInsert}
          onClose={() => setShowImageGallery(false)}
        />
      )}

      {/* ── YouTube Modal (NEW) ── */}
      {showYouTube && (
        <YouTubeModal
          onInsert={handleYouTubeInsert}
          onClose={() => setShowYouTube(false)}
        />
      )}
    </div>
  );
}
