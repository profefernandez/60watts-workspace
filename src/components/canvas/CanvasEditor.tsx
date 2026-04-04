"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { C } from "../../lib/colors";
import type { CanvasBlock } from "../../lib/directus";
import {
  fetchCanvasBlocks,
  createCanvasBlock,
  updateCanvasBlock,
  deleteCanvasBlock,
  isStoreOffline,
} from "../../lib/store";
import TextBlock from "./TextBlock";
import FloatingMedia from "./FloatingMedia";
import FloatingToolbar from "./FloatingToolbar";
import ImageGalleryModal from "./ImageGalleryModal";
import YouTubeModal from "./YouTubeModal";

interface Props {
  workspaceId: string;
}

let localIdCounter = 0;
const localId = () => `local-${++localIdCounter}-${Date.now()}`;

export default function CanvasEditor({ workspaceId }: Props) {
  const [blocks, setBlocks] = useState<CanvasBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const [editingMedia, setEditingMedia] = useState<CanvasBlock | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(720);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    fetchCanvasBlocks(workspaceId)
      .then((items) => {
        const migrated = items.map((b) => {
          if (b.type === "subheading") {
            return { ...b, type: "heading", format: "h2" };
          }
          return b;
        });
        setBlocks(migrated);
      })
      .catch(() => {});
  }, [workspaceId]);

  const textBlocks = blocks
    .filter((b) => b.type === "text" || b.type === "heading")
    .sort((a, b) => a.sort_order - b.sort_order);

  const mediaBlocks = blocks.filter(
    (b) => b.type === "image" || b.type === "youtube"
  );

  const nextSortOrder = () =>
    blocks.length > 0 ? Math.max(...blocks.map((b) => b.sort_order)) + 1 : 1;

  const addTextBlock = useCallback(
    async (afterId?: string, content = "", type = "text", format: string | null = null) => {
      let sortOrder: number;
      if (afterId) {
        const idx = textBlocks.findIndex((b) => b.id === afterId);
        const current = textBlocks[idx]?.sort_order ?? 0;
        const next = textBlocks[idx + 1]?.sort_order ?? current + 2;
        sortOrder = (current + next) / 2;
      } else {
        sortOrder = nextSortOrder();
      }

      const newBlock: CanvasBlock = {
        id: localId(),
        workspace_id: workspaceId,
        type,
        content,
        sort_order: sortOrder,
        pos_x: null,
        pos_y: null,
        width: null,
        height: null,
        format,
      };

      setBlocks((prev) => [...prev, newBlock]);
      setLastAddedId(newBlock.id);

      try {
        const created = await createCanvasBlock({
          workspace_id: workspaceId,
          type,
          content,
          sort_order: sortOrder,
          format,
        });
        setBlocks((prev) =>
          prev.map((b) => (b.id === newBlock.id ? { ...created, format } : b))
        );
        setLastAddedId(created.id);
      } catch {
        // Keep local block
      }

      return newBlock.id;
    },
    [workspaceId, textBlocks, blocks]
  );

  const handleUpdate = useCallback(
    (id: string, content: string) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, content } : b))
      );

      if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(async () => {
        try {
          setSaving(true);
          await updateCanvasBlock(id, { content }, workspaceId);
        } catch {
          // Silent
        } finally {
          setTimeout(() => setSaving(false), 600);
        }
      }, 1000);
    },
    [workspaceId]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setBlocks((prev) => prev.filter((b) => b.id !== id));
      try {
        await deleteCanvasBlock(id, workspaceId);
      } catch {
        // Silent
      }
    },
    [workspaceId]
  );

  const handleSplit = useCallback(
    (id: string, beforeHtml: string, afterHtml: string) => {
      handleUpdate(id, beforeHtml);
      addTextBlock(id, afterHtml);
    },
    [handleUpdate, addTextBlock]
  );

  const handleMergeUp = useCallback(
    (id: string) => {
      const idx = textBlocks.findIndex((b) => b.id === id);
      if (idx <= 0) return;
      const block = textBlocks[idx];
      if ((block.content || "").trim().length === 0) {
        handleDelete(id);
      }
    },
    [textBlocks, handleDelete]
  );

  const handleNewBlockBelow = useCallback(
    (id: string) => {
      addTextBlock(id, "", "text", null);
    },
    [addTextBlock]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      addTextBlock();
    },
    [addTextBlock]
  );

  const handleMediaPosition = useCallback(
    (id: string, pos_x: number, pos_y: number) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, pos_x, pos_y } : b))
      );
      if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(async () => {
        try {
          await updateCanvasBlock(id, { pos_x, pos_y }, workspaceId);
        } catch {}
      }, 500);
    },
    [workspaceId]
  );

  const handleMediaSize = useCallback(
    (id: string, width: number, height: number) => {
      setBlocks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, width, height } : b))
      );
      if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
      saveTimers.current[id] = setTimeout(async () => {
        try {
          await updateCanvasBlock(id, { width, height }, workspaceId);
        } catch {}
      }, 500);
    },
    [workspaceId]
  );

  const handleMediaDoubleClick = useCallback((block: CanvasBlock) => {
    setEditingMedia(block);
    if (block.type === "image") setShowImageGallery(true);
    if (block.type === "youtube") setShowYouTube(true);
  }, []);

  const handleFormat = useCallback((action: string) => {
    switch (action) {
      case "bold": document.execCommand("bold"); break;
      case "italic": document.execCommand("italic"); break;
      case "underline": document.execCommand("underline"); break;
      case "strikethrough": document.execCommand("strikeThrough"); break;
    }
  }, []);

  const handleHeading = useCallback(
    (level: "h1" | "h2") => {
      const active = document.activeElement;
      if (!active) return;
      const blockEl = active.closest("[data-block-id]");
      if (!blockEl) return;
      const id = blockEl.getAttribute("data-block-id");
      if (!id) return;

      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== id) return b;
          if (b.type === "heading" && b.format === level) {
            return { ...b, type: "text", format: null };
          }
          return { ...b, type: "heading", format: level };
        })
      );

      const block = blocks.find((b) => b.id === id);
      if (block) {
        const newType = block.type === "heading" && block.format === level ? "text" : "heading";
        const newFormat = block.type === "heading" && block.format === level ? null : level;
        updateCanvasBlock(id, { type: newType, format: newFormat }, workspaceId).catch(() => {});
      }
    },
    [blocks, workspaceId]
  );

  const handleInsert = useCallback((action: "image" | "youtube") => {
    setEditingMedia(null);
    if (action === "image") setShowImageGallery(true);
    if (action === "youtube") setShowYouTube(true);
  }, []);

  const handleImageInsert = useCallback(
    async (imageSource: string) => {
      setShowImageGallery(false);

      if (editingMedia) {
        handleUpdate(editingMedia.id, imageSource);
        setEditingMedia(null);
        return;
      }

      const newBlock: CanvasBlock = {
        id: localId(),
        workspace_id: workspaceId,
        type: "image",
        content: imageSource,
        sort_order: nextSortOrder(),
        pos_x: 60,
        pos_y: 100,
        width: 25,
        height: 20,
        format: null,
      };
      setBlocks((prev) => [...prev, newBlock]);

      try {
        const created = await createCanvasBlock({
          workspace_id: workspaceId,
          type: "image",
          content: imageSource,
          sort_order: newBlock.sort_order,
          pos_x: 60,
          pos_y: 100,
          width: 25,
          height: 20,
        });
        setBlocks((prev) =>
          prev.map((b) => (b.id === newBlock.id ? created : b))
        );
      } catch {}
    },
    [workspaceId, editingMedia, handleUpdate, blocks]
  );

  const handleYouTubeInsert = useCallback(
    async (youtubeUrl: string) => {
      setShowYouTube(false);

      if (editingMedia) {
        handleUpdate(editingMedia.id, youtubeUrl);
        setEditingMedia(null);
        return;
      }

      const newBlock: CanvasBlock = {
        id: localId(),
        workspace_id: workspaceId,
        type: "youtube",
        content: youtubeUrl,
        sort_order: nextSortOrder(),
        pos_x: 55,
        pos_y: 100,
        width: 35,
        height: 20,
        format: null,
      };
      setBlocks((prev) => [...prev, newBlock]);

      try {
        const created = await createCanvasBlock({
          workspace_id: workspaceId,
          type: "youtube",
          content: youtubeUrl,
          sort_order: newBlock.sort_order,
          pos_x: 55,
          pos_y: 100,
          width: 35,
          height: 20,
        });
        setBlocks((prev) =>
          prev.map((b) => (b.id === newBlock.id ? created : b))
        );
      } catch {}
    },
    [workspaceId, editingMedia, handleUpdate, blocks]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Save indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
          padding: "8px 0",
          marginBottom: 8,
        }}
      >
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
        <span style={{ fontSize: 12, color: C.tx4 }}>
          {saving ? "Saving..." : "Saved"}
        </span>
        {isStoreOffline() && (
          <span
            style={{
              fontSize: 11,
              color: C.rg,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 4,
              background: `${C.rg}14`,
            }}
          >
            Local
          </span>
        )}
      </div>

      {/* Canvas area */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          flex: 1,
          overflow: "auto",
          position: "relative",
          cursor: "text",
          maxWidth: 720,
          width: "100%",
          margin: "0 auto",
          paddingRight: 40,
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          {textBlocks.length === 0 ? (
            <div
              style={{
                padding: "8px 12px",
                fontSize: 20,
                color: "rgba(250,245,239,0.15)",
                fontFamily: "'Satoshi'",
                lineHeight: 1.7,
                minHeight: 200,
              }}
            >
              Click anywhere to start writing...
            </div>
          ) : (
            textBlocks.map((block, idx) => (
              <React.Fragment key={block.id}>
                {idx > 0 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      const prevId = textBlocks[idx - 1].id;
                      addTextBlock(prevId);
                    }}
                    style={{
                      height: 12,
                      cursor: "text",
                      borderRadius: 4,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = C.glass)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  />
                )}
                <div data-block-id={block.id}>
                  <TextBlock
                    block={block}
                    autoFocus={block.id === lastAddedId}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onSplit={handleSplit}
                    onMergeUp={handleMergeUp}
                    onNewBlockBelow={handleNewBlockBelow}
                  />
                </div>
              </React.Fragment>
            ))
          )}

          {textBlocks.length > 0 && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                addTextBlock();
              }}
              style={{
                minHeight: 120,
                cursor: "text",
                borderRadius: 8,
              }}
            />
          )}
        </div>

        {mediaBlocks.map((block) => (
          <FloatingMedia
            key={block.id}
            block={block}
            canvasWidth={canvasWidth}
            onUpdatePosition={handleMediaPosition}
            onUpdateSize={handleMediaSize}
            onDoubleClick={handleMediaDoubleClick}
          />
        ))}
      </div>

      <FloatingToolbar
        onFormat={handleFormat}
        onHeading={handleHeading}
        onInsert={handleInsert}
      />

      {showImageGallery && (
        <ImageGalleryModal
          workspaceId={workspaceId}
          onInsert={handleImageInsert}
          onClose={() => {
            setShowImageGallery(false);
            setEditingMedia(null);
          }}
          replaceMode={!!editingMedia}
        />
      )}
      {showYouTube && (
        <YouTubeModal
          onInsert={handleYouTubeInsert}
          onClose={() => {
            setShowYouTube(false);
            setEditingMedia(null);
          }}
          initialUrl={editingMedia?.content}
        />
      )}
    </div>
  );
}
