# Canvas Redesign: Document Editor with Floating Media

**Date:** 2026-04-04
**Status:** Approved
**Author:** Jason Fernandez + Claude

## Summary

Redesign the Canvas from a toolbar-driven block inserter into a zero-friction document editor. Users click anywhere to start typing. Text blocks are auto-created and flow vertically. Images and YouTube embeds float freely on their own layer, draggable and resizable. A floating draggable toolbar provides formatting and media insertion. An image gallery modal integrates with the Knowledge Base for upload, URL paste, and recent image selection.

## Goals

- **Zero friction** — click the canvas and you're typing. No toolbar hunting, no block insertion steps.
- **Natural document feel** — blocks exist under the hood for persistence, but the user experiences a continuous document.
- **Free-floating media** — images and YouTube embeds live on their own layer, positioned anywhere, resizable with aspect ratio lock.
- **Image library** — all images flow through the KB, creating a reusable library across workspaces.
- **Security** — DOMPurify sanitizes pasted HTML content.

## Non-Goals

- Rich text beyond bold, italic, underline, strikethrough, H1, H2 (no tables, lists, code blocks in this iteration).
- Text wrapping around images (media floats on a separate layer, text does not reflow).
- Collaborative editing / real-time sync.
- Markdown shortcuts (e.g., `# ` for headings) — may be added later.

## Design

### 1. Document Editor

The canvas area is a single scrollable region. Text blocks flow vertically using `sort_order`. The user never manually creates a block.

**Interactions:**

| Action | Result |
|--------|--------|
| Click empty canvas | Text block auto-created at click position, cursor ready |
| Click between existing blocks | New text block inserted at that gap |
| Press Enter at end of block | New text block created below, cursor moves there |
| Press Enter in middle of block | Splits block at cursor — text after cursor moves to new block below |
| Shift+Enter | Inserts a soft line break (`<br>`) within the current block |
| Enter on a heading block | New block below is always `text` type (not another heading) |
| Backspace at start of empty block | Deletes the empty block, cursor moves to end of block above |
| Select text | Floating toolbar auto-opens near selection |
| Click `Aa` pill | Toolbar opens, draggable to any position |
| H1/H2 in toolbar | Converts current block to heading/subheading |
| Camera icon in toolbar | Opens image gallery modal |
| Play icon in toolbar | Opens YouTube URL modal |
| Paste from web | DOMPurify sanitizes HTML, clean content inserted |
| Auto-save | Debounced (1s), save dot indicator in top-right |

**Text block types:**
- `text` — body text, Satoshi 20px, cream color
- `heading` — H1 (Clash Display 40px) or H2 (Clash Display 26px), rose gold

### 2. Floating Toolbar

A draggable, toggleable formatting bar.

**Collapsed state:** A small `Aa` pill with rose gold styling. Draggable — user parks it wherever they want.

**Expanded state:** Opens into a horizontal bar with:
- Drag handle (`⁞⁞`) on the left
- Text formatting: **B**, *I*, U, ~~S~~
- Heading toggles: H1, H2
- Media insert: Camera (image), Play (YouTube)
- Close button (X) to collapse back to pill

**Trigger behaviors:**
- Click the `Aa` pill → toggles open/closed
- Select text → auto-opens near selection
- Click X or click away → collapses to pill
- Draggable in both states — position persists during session

### 3. Image Gallery Modal

Triggered by clicking the camera icon in the toolbar, or double-clicking an existing image on the canvas.

**Three tabs:**

#### Upload Tab (default)
- Drag-and-drop zone or click to browse
- Accepts PNG, JPG, GIF, WebP up to 10MB
- Uploaded image is saved to KB image library automatically
- Image then placed on canvas as free-floating element

#### Paste URL Tab
- Text input for image URL
- Live preview below the input
- Insert button places image on canvas

#### Recent Tab
- Grid of images from KB (filtered to Images category)
- Search bar to filter by filename
- Click to select, Insert button to place
- Shows images from all workspaces (shared library)

**Replace mode:** When opened via double-click on an existing canvas image, the modal works the same but replaces the existing image instead of inserting a new one.

### 4. YouTube Embed Modal

Triggered by clicking the play icon in the toolbar, or double-clicking an existing YouTube embed.

- Text input for YouTube URL (supports youtube.com/watch, youtu.be, embed URLs)
- Live preview with video thumbnail, title, and channel name
- Insert button places embed on canvas as free-floating element
- Double-click existing embed → reopens modal to change URL

### 5. Free-Floating Media

Images and YouTube embeds are absolutely-positioned elements on a layer above the text flow.

**Drag:** Click and drag to reposition anywhere on the canvas.

**Resize:** Corner handle (bottom-right). Aspect ratio locked by default. Hold Shift to unlock and stretch freely.

**Position storage:** `pos_x` is stored as a percentage of the canvas container width (0–100). `pos_y` is stored as an absolute pixel offset from the top of the scrollable content area (not a percentage of height, since canvas height grows with content). On window resize, `pos_x` reflows horizontally but `pos_y` stays anchored to the same vertical document position.

**Selection state:** Clicking a media element shows a subtle border highlight and the resize handle. Clicking elsewhere deselects.

**Double-click:** Reopens the relevant modal (image gallery or YouTube) in replace mode.

### 6. KB Integration

The Knowledge Base gains explicit image library support:

- Images uploaded via the Canvas gallery modal are saved as KB files with category `"Images"`
- The Recent tab in the gallery pulls from KB files filtered by Images category
- Images are shared across workspaces within the KB
- A new store function `fetchAllKBImages()` queries KB files with category `"Images"` across all workspaces (in offline mode, iterates localStorage keys matching `60w_kb_files_*`)
- Existing KB file upload/delete/category flows remain unchanged

## Data Model

Extend the existing `CanvasBlock` interface with nullable fields for media positioning:

```typescript
interface CanvasBlock {
  id: string;
  workspace_id: string;
  type: string;          // "text" | "heading" | "image" | "youtube"
  content: string;       // sanitized HTML for text/heading, or media reference (see below)
  sort_order: number;    // vertical order for text blocks
  // New fields (nullable — only used by image/youtube)
  pos_x: number | null;  // percentage of canvas width (0-100)
  pos_y: number | null;  // absolute pixel offset from top of scroll content
  width: number | null;  // percentage of canvas width
  height: number | null; // percentage of canvas width (derived from aspect ratio)
  format: string | null; // heading level ("h1"/"h2") or future formatting
}
```

**Field usage by block type:**

| Block Type | content | pos_x/y | width/height | format |
|------------|---------|---------|--------------|--------|
| text | HTML text | null (flows) | null | null |
| heading | Heading text | null (flows) | null | "h1" or "h2" |
| image | Image URL or KB file ID | x% of width, y px offset | width/height % | null |
| youtube | YouTube URL | x% of width, y px offset | width/height % | null |

The `subheading` block type is removed — headings are unified under `heading` type with `format` distinguishing H1 vs H2.

**Migration:** Existing `subheading` blocks are converted on read: if `type === "subheading"`, treat as `type: "heading"` with `format: "h2"`. No write-time migration script needed — blocks are updated lazily on next save.

**Content format for text/heading blocks:** The `content` field stores DOMPurify-sanitized HTML (not plain text). Allowed tags: `<b>`, `<i>`, `<u>`, `<s>`, `<br>`, `<strong>`, `<em>`. All other tags and attributes are stripped. This is a change from the current implementation which uses `textContent` (plain text).

**Content format for image blocks:** The `content` field uses a prefix convention:
- URLs start with `http` — rendered directly as `<img src="...">`
- KB file IDs (anything else) — rendered as `<img src="${directusUrl}/assets/${content}">` when online, or looked up from localStorage when offline

**Content format for youtube blocks:** The `content` field stores the YouTube URL. The video ID is extracted at render time using the existing `extractYouTubeId()` helper.

## Dependencies

- **DOMPurify** (~7KB) — sanitizes pasted HTML content to prevent XSS and layout corruption
- No other new dependencies. Drag, resize, toolbar, modals all built custom.

## Files Affected

- `src/components/CanvasView.tsx` — complete rewrite (current: ~540 lines)
- `src/lib/directus.ts` — update `CanvasBlock` interface with new fields
- `src/lib/types.ts` — update `Block` interface to match new schema
- `src/lib/store.ts` — update localStorage fallback for new fields; add `fetchAllKBImages()` function
- `src/components/KBView.tsx` — minor: ensure Images category filter works for gallery integration
- `src/app/globals.css` — add canvas-specific styles (floating toolbar, media layer, gallery modal)
- `directus-schema.json` — add `pos_x`, `pos_y`, `width`, `height`, `format` columns to `canvas_blocks` collection (all nullable floats/strings)

## Design System Compliance

- All glassmorphism surfaces use `glass()` helper or equivalent inline: `rgba(255,255,255,0.04)` background, `blur(24px)`, `1px solid rgba(255,255,255,0.06)` border, `16px` border radius
- Fonts: Clash Display for headings, Satoshi for body/UI, JetBrains Mono for code only
- Colors: obsidian backgrounds, rose gold accents (`#E8A87C`), cream text (`#FAF5EF`)
- Minimum font sizes respected: body 20px, headings 26px+, labels 13px minimum
- No component libraries — all UI custom-built
