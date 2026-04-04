# Canvas Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Canvas from a toolbar-driven block inserter into a zero-friction document editor with free-floating media, a draggable formatting toolbar, and a KB-integrated image gallery.

**Architecture:** Custom `contentEditable` blocks with debounced auto-save. Text blocks flow vertically; image/YouTube blocks are absolutely-positioned on a separate layer. A floating draggable toolbar provides formatting and media insertion. DOMPurify sanitizes pasted HTML. The store layer gains new fields for position/size and a cross-workspace image query.

**Tech Stack:** React 18, TypeScript, Next.js 15, DOMPurify (new), custom drag/resize handlers, existing store layer (Directus + localStorage fallback).

**Spec:** `docs/superpowers/specs/2026-04-04-canvas-redesign-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/canvas/CanvasEditor.tsx` | Main canvas editor — document area, block rendering, click-to-create, auto-save |
| `src/components/canvas/FloatingToolbar.tsx` | Draggable Aa pill + expanded formatting bar |
| `src/components/canvas/ImageGalleryModal.tsx` | Tabbed modal: Upload, Paste URL, Recent |
| `src/components/canvas/YouTubeModal.tsx` | YouTube URL input with preview |
| `src/components/canvas/FloatingMedia.tsx` | Free-floating image/YouTube wrapper with drag + resize |
| `src/components/canvas/TextBlock.tsx` | Single contentEditable text/heading block |
| `src/components/canvas/useDrag.ts` | Custom hook for pointer-based drag |
| `src/components/canvas/useResize.ts` | Custom hook for aspect-ratio-locked resize |

### Modified Files
| File | Changes |
|------|---------|
| `src/lib/directus.ts` | Add `pos_x`, `pos_y`, `width`, `height`, `format` to `CanvasBlock` interface |
| `src/lib/types.ts` | Update `Block` interface to match new fields |
| `src/lib/store.ts` | Add `fetchAllKBImages()`, update localStorage handling for new fields |
| `src/components/CanvasView.tsx` | Replace contents — thin wrapper that renders `CanvasEditor` |
| `src/app/globals.css` | Add canvas-specific animations and placeholder styles |
| `package.json` | Add `dompurify` + `@types/dompurify` |
| `directus-schema.json` | Add new columns to `canvas_blocks` collection |

---

## Task 1: Install DOMPurify and Update Data Model

**Files:**
- Modify: `package.json`
- Modify: `src/lib/directus.ts:40-46`
- Modify: `src/lib/types.ts:3-11`
- Modify: `directus-schema.json`

- [ ] **Step 1: Install DOMPurify**

```bash
npm install dompurify && npm install -D @types/dompurify
```

- [ ] **Step 2: Update CanvasBlock interface in directus.ts**

In `src/lib/directus.ts`, replace the `CanvasBlock` interface:

```typescript
export interface CanvasBlock {
  id: string;
  workspace_id: string;
  type: string;          // "text" | "heading" | "image" | "youtube"
  content: string;       // sanitized HTML for text/heading, URL or KB file ID for media
  sort_order: number;
  pos_x?: number | null;  // percentage of canvas width (0-100), media only
  pos_y?: number | null;  // absolute pixel offset from top of scroll content, media only
  width?: number | null;  // percentage of canvas width, media only
  height?: number | null; // percentage of canvas width (derived from aspect ratio), media only
  format?: string | null; // "h1" or "h2" for heading blocks
}
```

- [ ] **Step 3: Update Block interface in types.ts**

In `src/lib/types.ts`, update the `Block` interface to include the new fields:

```typescript
export interface Block {
  id: string;
  type: "heading" | "text" | "image" | "youtube";
  content: string;
  imageUrl?: string;
  prompt?: string;
  url?: string;
  videoId?: string;
  pos_x?: number | null;
  pos_y?: number | null;
  width?: number | null;
  height?: number | null;
  format?: string | null;
}
```

Note: `"subheading"` removed from the type union.

- [ ] **Step 4: Update directus-schema.json**

Add the new fields to the `canvas_blocks` collection in `directus-schema.json`. Each field is nullable:

```json
{
  "field": "pos_x",
  "type": "float",
  "meta": { "interface": "input", "hidden": true },
  "schema": { "is_nullable": true, "default_value": null }
},
{
  "field": "pos_y",
  "type": "float",
  "meta": { "interface": "input", "hidden": true },
  "schema": { "is_nullable": true, "default_value": null }
},
{
  "field": "width",
  "type": "float",
  "meta": { "interface": "input", "hidden": true },
  "schema": { "is_nullable": true, "default_value": null }
},
{
  "field": "height",
  "type": "float",
  "meta": { "interface": "input", "hidden": true },
  "schema": { "is_nullable": true, "default_value": null }
},
{
  "field": "format",
  "type": "string",
  "meta": { "interface": "input", "hidden": true },
  "schema": { "is_nullable": true, "default_value": null }
}
```

- [ ] **Step 5: Run type-check**

```bash
npm run type-check
```

Expected: PASS (no errors). The new nullable fields are backward-compatible — existing code that reads `CanvasBlock` just gets `undefined` for the new fields from old data.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/directus.ts src/lib/types.ts directus-schema.json
git commit -m "feat: add DOMPurify and extend CanvasBlock data model with position/format fields"
```

---

## Task 2: Update Store Layer

**Files:**
- Modify: `src/lib/store.ts`

- [ ] **Step 1: Update createCanvasBlock to include new fields**

In `src/lib/store.ts`, update the `createCanvasBlock` function signature to accept the new fields:

```typescript
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
```

- [ ] **Step 2: Add fetchAllKBImages function**

Add this function at the end of the KB Files section in `src/lib/store.ts`:

```typescript
export async function fetchAllKBImages(): Promise<KBFileDisplay[]> {
  if (await isOffline()) {
    // Iterate all localStorage keys matching kb_files_*
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
```

- [ ] **Step 3: Run type-check**

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat: update store with new CanvasBlock fields and fetchAllKBImages"
```

---

## Task 3: Custom Drag and Resize Hooks

**Files:**
- Create: `src/components/canvas/useDrag.ts`
- Create: `src/components/canvas/useResize.ts`

- [ ] **Step 1: Create useDrag hook**

Create `src/components/canvas/useDrag.ts`:

```typescript
import { useCallback, useRef } from "react";

interface DragState {
  startX: number;
  startY: number;
  origX: number;
  origY: number;
}

/**
 * Custom drag hook using pointer events.
 * Returns an onPointerDown handler to attach to the draggable element.
 * Calls onDrag with (x, y) in pixels during drag, onDragEnd on release.
 */
export function useDrag(opts: {
  onDrag: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  getInitial: () => { x: number; y: number };
}) {
  const dragging = useRef<DragState | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const initial = opts.getInitial();
      dragging.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: initial.x,
        origY: initial.y,
      };
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        if (!dragging.current) return;
        const dx = ev.clientX - dragging.current.startX;
        const dy = ev.clientY - dragging.current.startY;
        const nx = dragging.current.origX + dx;
        const ny = dragging.current.origY + dy;
        opts.onDrag(nx, ny);
      };

      const onUp = (ev: PointerEvent) => {
        if (dragging.current) {
          const dx = ev.clientX - dragging.current.startX;
          const dy = ev.clientY - dragging.current.startY;
          const nx = dragging.current.origX + dx;
          const ny = dragging.current.origY + dy;
          opts.onDragEnd?.(nx, ny);
        }
        dragging.current = null;
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    },
    [opts]
  );

  return { onPointerDown };
}
```

- [ ] **Step 2: Create useResize hook**

Create `src/components/canvas/useResize.ts`:

```typescript
import { useCallback, useRef } from "react";

interface ResizeState {
  startX: number;
  startY: number;
  origW: number;
  origH: number;
  aspect: number;
}

/**
 * Custom resize hook with aspect-ratio lock.
 * Hold Shift during resize to unlock aspect ratio.
 * Returns an onPointerDown handler for the resize handle.
 */
export function useResize(opts: {
  onResize: (w: number, h: number) => void;
  onResizeEnd?: (w: number, h: number) => void;
  getInitial: () => { w: number; h: number };
  minW?: number;
  minH?: number;
}) {
  const state = useRef<ResizeState | null>(null);
  const minW = opts.minW ?? 80;
  const minH = opts.minH ?? 60;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const initial = opts.getInitial();
      state.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: initial.w,
        origH: initial.h,
        aspect: initial.w / (initial.h || 1),
      };
      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        if (!state.current) return;
        const dx = ev.clientX - state.current.startX;
        let nw = Math.max(minW, state.current.origW + dx);
        let nh: number;

        if (ev.shiftKey) {
          // Unlock aspect ratio
          const dy = ev.clientY - state.current.startY;
          nh = Math.max(minH, state.current.origH + dy);
        } else {
          // Lock aspect ratio
          nh = nw / state.current.aspect;
          if (nh < minH) {
            nh = minH;
            nw = nh * state.current.aspect;
          }
        }
        opts.onResize(nw, nh);
      };

      const onUp = (ev: PointerEvent) => {
        if (state.current) {
          const dx = ev.clientX - state.current.startX;
          let nw = Math.max(minW, state.current.origW + dx);
          let nh: number;
          if (ev.shiftKey) {
            const dy = ev.clientY - state.current.startY;
            nh = Math.max(minH, state.current.origH + dy);
          } else {
            nh = nw / state.current.aspect;
            if (nh < minH) { nh = minH; nw = nh * state.current.aspect; }
          }
          opts.onResizeEnd?.(nw, nh);
        }
        state.current = null;
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    },
    [opts, minW, minH]
  );

  return { onPointerDown };
}
```

- [ ] **Step 3: Run type-check**

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/
git commit -m "feat: add custom useDrag and useResize hooks for floating media"
```

---

## Task 4: TextBlock Component

**Files:**
- Create: `src/components/canvas/TextBlock.tsx`

- [ ] **Step 1: Create TextBlock component**

Create `src/components/canvas/TextBlock.tsx`. This is a single contentEditable block for text and headings:

```typescript
"use client";
import React, { useRef, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { C } from "../../lib/colors";
import type { CanvasBlock } from "../../lib/directus";

const PURIFY_CONFIG = {
  ALLOWED_TAGS: ["b", "i", "u", "s", "br", "strong", "em"],
  ALLOWED_ATTR: [] as string[],
};

const STYLES: Record<string, React.CSSProperties> = {
  text: {
    fontFamily: "'Satoshi'",
    fontSize: 20,
    fontWeight: 400,
    color: C.cr,
    lineHeight: 1.7,
  },
  h1: {
    fontFamily: "'Clash Display'",
    fontSize: 40,
    fontWeight: 700,
    color: C.rg,
    letterSpacing: "-0.03em",
    lineHeight: 1.2,
  },
  h2: {
    fontFamily: "'Clash Display'",
    fontSize: 26,
    fontWeight: 600,
    color: C.rg,
    letterSpacing: "-0.02em",
    lineHeight: 1.3,
  },
};

function getStyle(block: CanvasBlock): React.CSSProperties {
  if (block.type === "heading") {
    return STYLES[block.format || "h1"] || STYLES.h1;
  }
  return STYLES.text;
}

const PLACEHOLDERS: Record<string, string> = {
  text: "Start writing...",
  h1: "Heading",
  h2: "Subheading",
};

function getPlaceholder(block: CanvasBlock): string {
  if (block.type === "heading") return PLACEHOLDERS[block.format || "h1"];
  return PLACEHOLDERS.text;
}

interface Props {
  block: CanvasBlock;
  autoFocus?: boolean;
  onUpdate: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onSplit: (id: string, beforeHtml: string, afterHtml: string) => void;
  onMergeUp: (id: string) => void;
  onNewBlockBelow: (id: string) => void;
}

export default function TextBlock({
  block,
  autoFocus,
  onUpdate,
  onDelete,
  onSplit,
  onMergeUp,
  onNewBlockBelow,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Set initial content once — after that the DOM owns the text
  useEffect(() => {
    if (ref.current && !initializedRef.current) {
      // Migrate subheading blocks on read
      const sanitized = DOMPurify.sanitize(block.content || "", PURIFY_CONFIG);
      ref.current.innerHTML = sanitized;
      initializedRef.current = true;
    }
  }, [block.id]); // Re-initialize only when block ID changes

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      // Move cursor to end
      const sel = window.getSelection();
      if (sel && ref.current.childNodes.length > 0) {
        sel.selectAllChildren(ref.current);
        sel.collapseToEnd();
      }
    }
  }, [autoFocus]);

  const handleInput = useCallback(() => {
    if (ref.current) {
      const html = DOMPurify.sanitize(ref.current.innerHTML, PURIFY_CONFIG);
      onUpdate(block.id, html);
    }
  }, [block.id, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const sel = window.getSelection();
        if (!sel || !ref.current) {
          onNewBlockBelow(block.id);
          return;
        }

        // Split at cursor position
        const range = sel.getRangeAt(0);
        range.deleteContents();

        // Get content before and after cursor
        const beforeRange = document.createRange();
        beforeRange.setStart(ref.current, 0);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        const beforeFrag = beforeRange.cloneContents();
        const beforeDiv = document.createElement("div");
        beforeDiv.appendChild(beforeFrag);

        const afterRange = document.createRange();
        afterRange.setStart(range.endContainer, range.endOffset);
        afterRange.setEndAfter(ref.current.lastChild || ref.current);
        const afterFrag = afterRange.cloneContents();
        const afterDiv = document.createElement("div");
        afterDiv.appendChild(afterFrag);

        const beforeHtml = DOMPurify.sanitize(beforeDiv.innerHTML, PURIFY_CONFIG);
        const afterHtml = DOMPurify.sanitize(afterDiv.innerHTML, PURIFY_CONFIG);

        onSplit(block.id, beforeHtml, afterHtml);
      }

      if (e.key === "Backspace") {
        const sel = window.getSelection();
        if (!sel || !ref.current) return;
        // If cursor is at position 0 and block is empty, delete block
        const content = ref.current.textContent || "";
        if (content.length === 0) {
          e.preventDefault();
          onMergeUp(block.id);
        }
      }
    },
    [block.id, onSplit, onMergeUp, onNewBlockBelow]
  );

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
      handleInput();
    },
    [handleInput]
  );

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
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={(e) => (e.currentTarget.style.outline = `2px solid ${C.rg}`)}
        onBlur={(e) => (e.currentTarget.style.outline = "none")}
        style={{
          ...getStyle(block),
          padding: "8px 12px",
          borderRadius: 8,
          outline: "none",
          transition: "outline-color 0.15s",
          minHeight: block.type === "heading" ? 40 : 32,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
        data-placeholder={getPlaceholder(block)}
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
        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/TextBlock.tsx
git commit -m "feat: add TextBlock component with contentEditable, split, merge, paste sanitization"
```

---

## Task 5: FloatingMedia Component

**Files:**
- Create: `src/components/canvas/FloatingMedia.tsx`

- [ ] **Step 1: Create FloatingMedia component**

Create `src/components/canvas/FloatingMedia.tsx`. This wraps an image or YouTube embed with drag and resize:

```typescript
"use client";
import React, { useState, useCallback, useEffect } from "react";
import { C } from "../../lib/colors";
import type { CanvasBlock } from "../../lib/directus";
import { useDrag } from "./useDrag";
import { useResize } from "./useResize";

interface Props {
  block: CanvasBlock;
  canvasWidth: number;
  onUpdatePosition: (id: string, pos_x: number, pos_y: number) => void;
  onUpdateSize: (id: string, width: number, height: number) => void;
  onDoubleClick: (block: CanvasBlock) => void;
}

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

function getImageSrc(content: string): string {
  if (content.startsWith("http")) return content;
  if (content.startsWith("data:")) return content;
  return `${directusUrl}/assets/${content}`;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export default function FloatingMedia({
  block,
  canvasWidth,
  onUpdatePosition,
  onUpdateSize,
  onDoubleClick,
}: Props) {
  const [selected, setSelected] = useState(false);

  // Convert percentage pos_x to pixels, pos_y is already pixels
  const pxX = ((block.pos_x ?? 50) / 100) * canvasWidth;
  const pxY = block.pos_y ?? 100;
  const pxW = ((block.width ?? 25) / 100) * canvasWidth;
  const pxH = ((block.height ?? 20) / 100) * canvasWidth;

  const [localX, setLocalX] = useState(pxX);
  const [localY, setLocalY] = useState(pxY);
  const [localW, setLocalW] = useState(pxW);
  const [localH, setLocalH] = useState(pxH);

  // Sync local state when props change (e.g., server round-trip ID swap)
  useEffect(() => { setLocalX(pxX); }, [pxX]);
  useEffect(() => { setLocalY(pxY); }, [pxY]);
  useEffect(() => { setLocalW(pxW); }, [pxW]);
  useEffect(() => { setLocalH(pxH); }, [pxH]);

  const { onPointerDown: onDragDown } = useDrag({
    getInitial: () => ({ x: localX, y: localY }),
    onDrag: (x, y) => {
      setLocalX(Math.max(0, x));
      setLocalY(Math.max(0, y));
    },
    onDragEnd: (x, y) => {
      const px = Math.max(0, Math.min(100, (x / canvasWidth) * 100));
      const py = Math.max(0, y);
      onUpdatePosition(block.id, px, py);
    },
  });

  const { onPointerDown: onResizeDown } = useResize({
    getInitial: () => ({ w: localW, h: localH }),
    onResize: (w, h) => {
      setLocalW(w);
      setLocalH(h);
    },
    onResizeEnd: (w, h) => {
      const wp = (w / canvasWidth) * 100;
      const hp = (h / canvasWidth) * 100;
      onUpdateSize(block.id, wp, hp);
    },
  });

  const videoId = block.type === "youtube" ? extractYouTubeId(block.content) : null;

  return (
    <div
      style={{
        position: "absolute",
        left: localX,
        top: localY,
        width: localW,
        height: localH,
        cursor: "grab",
        zIndex: selected ? 20 : 10,
        borderRadius: 12,
        overflow: "visible",
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(true);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick(block);
      }}
      onPointerDown={onDragDown}
    >
      {/* Content */}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: `0 8px 24px rgba(0,0,0,0.4)`,
          border: selected ? `2px solid ${C.rg}` : "2px solid transparent",
          transition: "border-color 0.15s",
        }}
      >
        {block.type === "image" ? (
          <img
            src={getImageSrc(block.content)}
            alt=""
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              pointerEvents: "none",
            }}
          />
        ) : videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              pointerEvents: selected ? "auto" : "none",
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: C.glass,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.tx4,
              fontSize: 14,
            }}
          >
            {block.type === "youtube" ? "Invalid YouTube URL" : "No image"}
          </div>
        )}
      </div>

      {/* Resize handle — only when selected */}
      {selected && (
        <div
          onPointerDown={onResizeDown}
          style={{
            position: "absolute",
            bottom: -4,
            right: -4,
            width: 16,
            height: 16,
            cursor: "nwse-resize",
            zIndex: 30,
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 10,
              height: 10,
              borderRight: `2px solid ${C.rg}`,
              borderBottom: `2px solid ${C.rg}`,
            }}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/FloatingMedia.tsx
git commit -m "feat: add FloatingMedia component with drag, resize, and double-click replace"
```

---

## Task 6: FloatingToolbar Component

**Files:**
- Create: `src/components/canvas/FloatingToolbar.tsx`

- [ ] **Step 1: Create FloatingToolbar component**

Create `src/components/canvas/FloatingToolbar.tsx`:

```typescript
"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { C } from "../../lib/colors";
import { I } from "../../lib/icons";
import { useDrag } from "./useDrag";

type FormatAction = "bold" | "italic" | "underline" | "strikethrough";
type HeadingAction = "h1" | "h2";
type InsertAction = "image" | "youtube";

interface Props {
  onFormat: (action: FormatAction) => void;
  onHeading: (action: HeadingAction) => void;
  onInsert: (action: InsertAction) => void;
}

export default function FloatingToolbar({ onFormat, onHeading, onInsert }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [posX, setPosX] = useState<number | null>(null);
  const [posY, setPosY] = useState<number | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Initialize position to bottom-right on mount
  useEffect(() => {
    if (posX === null) {
      setPosX(window.innerWidth - 200);
      setPosY(window.innerHeight - 80);
    }
  }, [posX]);

  // Auto-open on text selection
  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        // Position near selection
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setPosX(rect.left + rect.width / 2 - 150);
        setPosY(rect.top - 52);
        setExpanded(true);
      }
    };

    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, []);

  const { onPointerDown } = useDrag({
    getInitial: () => ({ x: posX ?? 0, y: posY ?? 0 }),
    onDrag: (x, y) => {
      setPosX(x);
      setPosY(y);
    },
  });

  const formatBtn = (
    label: React.ReactNode,
    action: FormatAction,
    style?: React.CSSProperties
  ) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault(); // Keep text selection
        onFormat(action);
      }}
      style={{
        padding: "5px 9px",
        borderRadius: 7,
        fontSize: 14,
        color: C.cr,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        ...style,
      }}
    >
      {label}
    </button>
  );

  const sep = (
    <span
      style={{
        width: 1,
        height: 18,
        background: "rgba(255,255,255,0.08)",
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  );

  if (!expanded) {
    // Collapsed pill
    return (
      <div
        ref={toolbarRef}
        onPointerDown={onPointerDown}
        onClick={() => setExpanded(true)}
        style={{
          position: "fixed",
          left: posX ?? undefined,
          top: posY ?? undefined,
          background: "rgba(232,168,124,0.15)",
          border: `1px solid rgba(232,168,124,0.3)`,
          borderRadius: 20,
          padding: "6px 14px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "grab",
          userSelect: "none",
          zIndex: 100,
        }}
      >
        <span style={{ fontSize: 15, color: C.rg, fontWeight: 600 }}>Aa</span>
      </div>
    );
  }

  // Expanded toolbar
  return (
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        left: posX ?? undefined,
        top: posY ?? undefined,
        background: "rgba(20,22,28,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        gap: 2,
        zIndex: 100,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        userSelect: "none",
      }}
    >
      {/* Drag handle */}
      <span
        onPointerDown={onPointerDown}
        style={{
          padding: "4px 6px",
          fontSize: 12,
          color: "#555",
          cursor: "grab",
          letterSpacing: 1,
        }}
      >
        ⁞⁞
      </span>
      {sep}

      {/* Text formatting */}
      {formatBtn(<strong>B</strong>, "bold", { fontWeight: 700 })}
      {formatBtn(<em>I</em>, "italic", { fontStyle: "italic" })}
      {formatBtn(<u>U</u>, "underline", { textDecoration: "underline" })}
      {formatBtn(<s>S</s>, "strikethrough", { textDecoration: "line-through" })}
      {sep}

      {/* Headings */}
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onHeading("h1");
        }}
        style={{
          padding: "5px 9px",
          borderRadius: 7,
          fontSize: 14,
          fontWeight: 600,
          color: C.cr,
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        H1
      </button>
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          onHeading("h2");
        }}
        style={{
          padding: "5px 9px",
          borderRadius: 7,
          fontSize: 14,
          fontWeight: 600,
          color: C.cr,
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        H2
      </button>
      {sep}

      {/* Media insert */}
      <button
        onClick={() => onInsert("image")}
        style={{
          padding: "5px 9px",
          borderRadius: 7,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: C.rg,
          display: "flex",
        }}
      >
        {I.img}
      </button>
      <button
        onClick={() => onInsert("youtube")}
        style={{
          padding: "5px 9px",
          borderRadius: 7,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: C.rg,
          display: "flex",
        }}
      >
        {I.yt}
      </button>
      {sep}

      {/* Close */}
      <button
        onClick={() => setExpanded(false)}
        style={{
          padding: "5px 8px",
          borderRadius: 7,
          fontSize: 13,
          color: "#555",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        ✕
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/FloatingToolbar.tsx
git commit -m "feat: add FloatingToolbar with drag, auto-open on selection, formatting actions"
```

---

## Task 7: ImageGalleryModal Component

**Files:**
- Create: `src/components/canvas/ImageGalleryModal.tsx`

- [ ] **Step 1: Create ImageGalleryModal component**

Create `src/components/canvas/ImageGalleryModal.tsx`:

```typescript
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { C } from "../../lib/colors";
import { glass } from "../../lib/styles";
import { fileCat } from "../../lib/helpers";
import { fetchAllKBImages, uploadKBFile } from "../../lib/store";

type Tab = "upload" | "url" | "recent";

interface KBImage {
  id: string;
  file: string;
  filename: string;
  mime_type: string;
  created_at: string;
  workspace_id: string;
}

interface Props {
  workspaceId: string;
  onInsert: (imageSource: string) => void;
  onClose: () => void;
  /** If set, we're replacing an existing image */
  replaceMode?: boolean;
}

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

function getThumbUrl(file: string): string {
  if (file.startsWith("http")) return file;
  return `${directusUrl}/assets/${file}?width=200&height=200&fit=cover`;
}

export default function ImageGalleryModal({
  workspaceId,
  onInsert,
  onClose,
  replaceMode,
}: Props) {
  const [tab, setTab] = useState<Tab>("upload");
  const [url, setUrl] = useState("");
  const [urlPreview, setUrlPreview] = useState("");
  const [recentImages, setRecentImages] = useState<KBImage[]>([]);
  const [selectedRecent, setSelectedRecent] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch recent images from KB
  useEffect(() => {
    fetchAllKBImages()
      .then((imgs) =>
        setRecentImages(
          imgs.map((i) => ({
            id: i.id,
            file: i.file,
            filename: i.filename,
            mime_type: i.mime_type,
            created_at: i.created_at,
            workspace_id: i.workspace_id,
          }))
        )
      )
      .catch(() => {});
  }, []);

  // URL preview debounce
  useEffect(() => {
    if (!url.startsWith("http")) {
      setUrlPreview("");
      return;
    }
    const t = setTimeout(() => setUrlPreview(url), 500);
    return () => clearTimeout(t);
  }, [url]);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const category = fileCat(file.type);
        const result = await uploadKBFile(workspaceId, file, category);
        onInsert(result.file); // KB file ID
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [workspaceId, onInsert]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) return;
      setUploading(true);
      try {
        const category = fileCat(file.type);
        const result = await uploadKBFile(workspaceId, file, category);
        onInsert(result.file);
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
      }
    },
    [workspaceId, onInsert]
  );

  const filteredRecent = search
    ? recentImages.filter((i) =>
        i.filename.toLowerCase().includes(search.toLowerCase())
      )
    : recentImages;

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1,
    textAlign: "center",
    padding: 11,
    fontSize: 14,
    fontFamily: "'Satoshi'",
    color: tab === t ? C.rg : C.tx4,
    borderBottom: tab === t ? `2px solid ${C.rg}` : "2px solid transparent",
    fontWeight: tab === t ? 600 : 400,
    cursor: "pointer",
    background: "transparent",
    border: "none",
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...glass(),
          background: "rgba(20,22,28,0.96)",
          width: 500,
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${C.glassBrd}`,
          }}
        >
          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: C.cr,
              fontFamily: "'Satoshi'",
            }}
          >
            {replaceMode ? "Replace Image" : "Insert Image"}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: C.tx4,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: `1px solid ${C.glassBrd}`,
          }}
        >
          <button onClick={() => setTab("upload")} style={tabStyle("upload")}>
            Upload
          </button>
          <button onClick={() => setTab("url")} style={tabStyle("url")}>
            Paste URL
          </button>
          <button onClick={() => setTab("recent")} style={tabStyle("recent")}>
            Recent
          </button>
        </div>

        {/* Tab content */}
        <div style={{ padding: 24, overflow: "auto", flex: 1 }}>
          {tab === "upload" && (
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed rgba(232,168,124,0.3)`,
                  borderRadius: 12,
                  padding: 36,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>
                  {uploading ? "⏳" : "📷"}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: C.cr,
                    fontFamily: "'Satoshi'",
                  }}
                >
                  {uploading
                    ? "Uploading..."
                    : "Drop image here or click to browse"}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: C.tx4,
                    marginTop: 6,
                    fontFamily: "'Satoshi'",
                  }}
                >
                  PNG, JPG, GIF, WebP up to 10MB
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                style={{ display: "none" }}
              />
              <div
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  color: C.tx4,
                  textAlign: "center",
                  fontFamily: "'Satoshi'",
                }}
              >
                Images are saved to your Knowledge Base
              </div>
            </>
          )}

          {tab === "url" && (
            <>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  style={{
                    flex: 1,
                    background: C.glass,
                    border: `1px solid ${C.glassBrd}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    fontSize: 14,
                    color: C.cr,
                    fontFamily: "'Satoshi'",
                    outline: "none",
                  }}
                />
                <button
                  onClick={() => {
                    if (url.startsWith("http")) onInsert(url);
                  }}
                  style={{
                    background: "rgba(232,168,124,0.15)",
                    border: `1px solid rgba(232,168,124,0.3)`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    fontSize: 14,
                    color: C.rg,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "'Satoshi'",
                  }}
                >
                  Insert
                </button>
              </div>
              {urlPreview && (
                <div
                  style={{
                    marginTop: 16,
                    borderRadius: 10,
                    overflow: "hidden",
                    border: `1px solid ${C.glassBrd}`,
                  }}
                >
                  <img
                    src={urlPreview}
                    alt="Preview"
                    style={{ width: "100%", display: "block" }}
                    onError={() => setUrlPreview("")}
                  />
                </div>
              )}
            </>
          )}

          {tab === "recent" && (
            <>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search images..."
                style={{
                  width: "100%",
                  background: C.glass,
                  border: `1px solid ${C.glassBrd}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 14,
                  color: C.cr,
                  fontFamily: "'Satoshi'",
                  outline: "none",
                  marginBottom: 16,
                  boxSizing: "border-box",
                }}
              />
              {filteredRecent.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    color: C.tx4,
                    fontSize: 15,
                    padding: 32,
                    fontFamily: "'Satoshi'",
                  }}
                >
                  No images in your library yet
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 10,
                    }}
                  >
                    {filteredRecent.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => setSelectedRecent(img.file)}
                        style={{
                          aspectRatio: "1",
                          borderRadius: 10,
                          overflow: "hidden",
                          cursor: "pointer",
                          border:
                            selectedRecent === img.file
                              ? `2px solid ${C.rg}`
                              : "2px solid transparent",
                          transition: "border-color 0.15s",
                        }}
                      >
                        <img
                          src={getThumbUrl(img.file)}
                          alt={img.filename}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {selectedRecent && (
                    <div
                      style={{
                        marginTop: 16,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        onClick={() => onInsert(selectedRecent)}
                        style={{
                          background: "rgba(232,168,124,0.15)",
                          border: `1px solid rgba(232,168,124,0.3)`,
                          borderRadius: 10,
                          padding: "8px 20px",
                          fontSize: 14,
                          color: C.rg,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "'Satoshi'",
                        }}
                      >
                        Insert
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/ImageGalleryModal.tsx
git commit -m "feat: add ImageGalleryModal with Upload, URL, and Recent tabs"
```

---

## Task 8: YouTubeModal Component

**Files:**
- Create: `src/components/canvas/YouTubeModal.tsx`

- [ ] **Step 1: Create YouTubeModal component**

Create `src/components/canvas/YouTubeModal.tsx`:

```typescript
"use client";
import React, { useState, useEffect } from "react";
import { C } from "../../lib/colors";
import { glass } from "../../lib/styles";

interface Props {
  onInsert: (youtubeUrl: string) => void;
  onClose: () => void;
  initialUrl?: string;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export default function YouTubeModal({ onInsert, onClose, initialUrl }: Props) {
  const [url, setUrl] = useState(initialUrl || "");
  const [videoId, setVideoId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setVideoId(extractYouTubeId(url));
    }, 400);
    return () => clearTimeout(t);
  }, [url]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...glass(),
          background: "rgba(20,22,28,0.96)",
          width: 480,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${C.glassBrd}`,
          }}
        >
          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: C.cr,
              fontFamily: "'Satoshi'",
            }}
          >
            {initialUrl ? "Replace YouTube Video" : "Insert YouTube Video"}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: C.tx4,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              autoFocus
              style={{
                flex: 1,
                background: C.glass,
                border: `1px solid ${C.glassBrd}`,
                borderRadius: 10,
                padding: "12px 14px",
                fontSize: 14,
                color: C.cr,
                fontFamily: "'Satoshi'",
                outline: "none",
              }}
            />
            <button
              onClick={() => {
                if (videoId) onInsert(url);
              }}
              style={{
                background: videoId
                  ? "rgba(232,168,124,0.15)"
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${
                  videoId ? "rgba(232,168,124,0.3)" : C.glassBrd
                }`,
                borderRadius: 10,
                padding: "12px 16px",
                fontSize: 14,
                color: videoId ? C.rg : C.tx4,
                fontWeight: 600,
                cursor: videoId ? "pointer" : "default",
                fontFamily: "'Satoshi'",
              }}
            >
              Insert
            </button>
          </div>

          {/* Preview */}
          {videoId && (
            <div
              style={{
                borderRadius: 10,
                overflow: "hidden",
                background: "#111",
              }}
            >
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  border: "none",
                  display: "block",
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          )}

          {url && !videoId && (
            <div
              style={{
                textAlign: "center",
                color: C.tx4,
                fontSize: 14,
                padding: 24,
                fontFamily: "'Satoshi'",
              }}
            >
              Paste a valid YouTube URL to see a preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/YouTubeModal.tsx
git commit -m "feat: add YouTubeModal with URL input and live preview"
```

---

## Task 9: Main CanvasEditor Component

**Files:**
- Create: `src/components/canvas/CanvasEditor.tsx`

- [ ] **Step 1: Create CanvasEditor component**

Create `src/components/canvas/CanvasEditor.tsx`. This is the main orchestrator:

```typescript
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

  // Track canvas width for media positioning
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

  // Fetch blocks on mount
  useEffect(() => {
    fetchCanvasBlocks(workspaceId)
      .then((items) => {
        // Migrate subheading → heading on read
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

  // Helpers
  const textBlocks = blocks
    .filter((b) => b.type === "text" || b.type === "heading")
    .sort((a, b) => a.sort_order - b.sort_order);

  const mediaBlocks = blocks.filter(
    (b) => b.type === "image" || b.type === "youtube"
  );

  const nextSortOrder = () =>
    blocks.length > 0 ? Math.max(...blocks.map((b) => b.sort_order)) + 1 : 1;

  // ── CRUD ──

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
        // Replace local ID with server ID
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
      // Update current block with "before" content
      handleUpdate(id, beforeHtml);
      // Create new text block below with "after" content
      addTextBlock(id, afterHtml);
    },
    [handleUpdate, addTextBlock]
  );

  const handleMergeUp = useCallback(
    (id: string) => {
      const idx = textBlocks.findIndex((b) => b.id === id);
      if (idx <= 0) return; // Nothing above to merge into
      const block = textBlocks[idx];
      if ((block.content || "").trim().length === 0) {
        // Just delete the empty block
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

  // ── Canvas click: create block ──

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      addTextBlock();
    },
    [addTextBlock]
  );

  // ── Media position/size updates ──

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

  // ── Toolbar actions ──

  const handleFormat = useCallback((action: string) => {
    switch (action) {
      case "bold":
        document.execCommand("bold");
        break;
      case "italic":
        document.execCommand("italic");
        break;
      case "underline":
        document.execCommand("underline");
        break;
      case "strikethrough":
        document.execCommand("strikeThrough");
        break;
    }
  }, []);

  const handleHeading = useCallback(
    (level: "h1" | "h2") => {
      // Find the focused block
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
            // Toggle off — back to text
            return { ...b, type: "text", format: null };
          }
          return { ...b, type: "heading", format: level };
        })
      );

      // Persist
      const block = blocks.find((b) => b.id === id);
      if (block) {
        const newType =
          block.type === "heading" && block.format === level
            ? "text"
            : "heading";
        const newFormat =
          block.type === "heading" && block.format === level ? null : level;
        updateCanvasBlock(
          id,
          { type: newType, format: newFormat },
          workspaceId
        ).catch(() => {});
      }
    },
    [blocks, workspaceId]
  );

  const handleInsert = useCallback((action: "image" | "youtube") => {
    setEditingMedia(null);
    if (action === "image") setShowImageGallery(true);
    if (action === "youtube") setShowYouTube(true);
  }, []);

  // ── Insert media callbacks ──

  const handleImageInsert = useCallback(
    async (imageSource: string) => {
      setShowImageGallery(false);

      if (editingMedia) {
        // Replace existing image
        handleUpdate(editingMedia.id, imageSource);
        setEditingMedia(null);
        return;
      }

      // New image
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

  // Deselect media when clicking canvas background
  const handleCanvasMouseDown = useCallback(() => {
    // Handled by FloatingMedia's onClick stopPropagation
  }, []);

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

      {/* Canvas area — relative for floating media */}
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
        {/* Text blocks layer */}
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
                {/* Inter-block click zone — click between blocks to insert */}
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

          {/* Click zone below last block */}
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

        {/* Floating media layer */}
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

      {/* Floating toolbar */}
      <FloatingToolbar
        onFormat={handleFormat}
        onHeading={handleHeading}
        onInsert={handleInsert}
      />

      {/* Modals */}
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
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/canvas/CanvasEditor.tsx
git commit -m "feat: add CanvasEditor orchestrator with click-to-create, media management, toolbar integration"
```

---

## Task 10: Wire Up CanvasView and Global Styles

**Files:**
- Modify: `src/components/CanvasView.tsx` (replace contents)
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace CanvasView.tsx with thin wrapper**

Replace the entire contents of `src/components/CanvasView.tsx`:

```typescript
"use client";
import React from "react";
import CanvasEditor from "./canvas/CanvasEditor";

interface Props {
  workspaceId: string;
}

export default function CanvasView({ workspaceId }: Props) {
  return <CanvasEditor workspaceId={workspaceId} />;
}
```

- [ ] **Step 2: Add canvas placeholder styles to globals.css**

Add to the end of `src/app/globals.css`:

```css
/* ── Canvas Editor ── */
[contenteditable]:empty:before {
  content: attr(data-placeholder);
  color: rgba(250, 245, 239, 0.15);
  pointer-events: none;
}

[contenteditable]:focus:empty:before {
  color: rgba(250, 245, 239, 0.25);
}
```

Check if these rules already exist in globals.css — if so, skip this step to avoid duplication.

- [ ] **Step 3: Run type-check**

```bash
npm run type-check
```

Expected: PASS.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: PASS. All pages compile, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/CanvasView.tsx src/app/globals.css
git commit -m "feat: wire CanvasEditor into CanvasView, add canvas placeholder styles"
```

---

## Task 11: Manual Smoke Test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test core flows**

Open the app in a browser and verify:

1. **Click canvas** → text block auto-created, cursor active
2. **Type text** → content appears, save dot flashes green
3. **Press Enter** → new text block below, cursor moves there
4. **Select text** → floating toolbar auto-opens
5. **Click B/I/U** → formatting applies to selected text
6. **Click H1/H2** → block converts to heading style
7. **Click Aa pill** → toolbar expands, drag it around
8. **Click camera icon** → image gallery modal opens with 3 tabs
9. **Upload tab** → drag or click to upload, image appears floating on canvas
10. **Drag image** → repositions freely
11. **Resize image** → corner handle, aspect ratio locked
12. **Double-click image** → gallery reopens in replace mode
13. **Click YouTube icon** → YouTube modal opens
14. **Paste YouTube URL** → preview shows, Insert places floating embed
15. **Backspace on empty block** → block deleted, cursor moves up
16. **Paste from web** → HTML sanitized, clean text inserted

- [ ] **Step 3: Fix any issues found during testing**

Address any visual or functional issues discovered. This is expected — iterate until all 16 checks pass.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: polish canvas editor after smoke testing"
```

---

## Task 12: Final Type-Check and Build Verification

- [ ] **Step 1: Run full checks**

```bash
npm run type-check && npm run lint && npm run build
```

Expected: All three pass with zero errors.

- [ ] **Step 2: Commit any remaining fixes**

If lint or type-check caught anything, fix and commit:

```bash
git add -A
git commit -m "fix: address lint and type-check issues"
```
