# Context Search — Design Spec

**Status:** Approved  
**Date:** 2026-04-04  
**Author:** Jason Fernandez + Claude

## Overview

Context Search is a hallmark feature of 60 Watts that lets users search the web from within their workspace and — critically — lets Profé intelligently find information relevant to what the user is currently working on. Results appear as draggable cards that can be placed on the canvas and extracted into document content with Profé's help.

## Core Concepts

**Two search modes, one result format:**

- **Go (manual search):** User types a query in the search bar and clicks Go. The query is sent to a Perplexity-backed LaunchLemonade search agent. Results appear as cards in a floating panel.
- **Context Search:** User clicks Context Search (no typing needed). Profé reads the current canvas blocks and KB files, understands what the user is working on, generates targeted search queries, sends them to the search agent, and returns results filtered for relevance — with placement suggestions.

Both modes produce the same draggable card format. The only difference is who writes the query.

## Architecture

### Approach: Two Separate API Routes

Two purpose-built routes, cleanly separated:

**`/api/search`** — Go mode
- Accepts: `{ query: string }`
- Sends query to LaunchLemonade search agent (Perplexity-backed)
- Returns: array of `SearchCard` objects

**`/api/context-search`** — Context Search mode
- Accepts: `{ canvasBlocks: Block[], kbFiles: KBFile[] }` (current workspace context)
- Sends context to LaunchLemonade chat agent (Profé) which analyzes the workspace, generates search queries, calls the search agent, and filters results for relevance
- Returns: array of `SearchCard` objects with additional `relevance` and `suggested_location` fields

### Agent Routing

One LaunchLemonade API key, two agent IDs:

| Purpose | Config Key | Route |
|---------|-----------|-------|
| Profé chat | `ll_chat_agent_id` (existing) | `/api/chat` |
| Perplexity search | `ll_search_agent_id` (new) | `/api/search`, `/api/context-search` |

The chat agent ID is already configured in Settings. The search agent ID is new.

### Data Shape

```typescript
interface SearchCard {
  id: string;                    // unique card ID
  title: string;                 // result title
  snippet: string;               // result summary/excerpt
  source_url: string;            // original source URL
  source_domain: string;         // display domain (e.g., "pubmed.gov")
  relevance?: string;            // Context Search only — why this matters to the user's work
  suggested_location?: string;   // Context Search only — where Profé suggests placing it
}
```

## UI Components

### 1. Search Bar (top navigation, centered)

- Centered in the top nav bar between logo and right-side controls
- Contains: text input (placeholder "Search the web..."), "Go" button (rose gold accent), "Context Search" button (violet accent)
- Go button sends the typed query to `/api/search`
- Context Search button ignores the text input, reads workspace context, hits `/api/context-search`
- Context Search shows a loading state while Profé analyzes the workspace

### 2. Floating Search Results Panel

- Appears overlaid on the workspace after a search completes
- **Draggable** — user can reposition anywhere on the canvas
- **Minimizable** — collapses to a small bar showing result count
- **Closable** — dismisses the panel entirely
- **Distinct color scheme** — cool navy/steel-blue palette to visually separate from the warm main app:
  - Background: `rgba(18, 22, 35, 0.97)` (deep navy)
  - Accent: `#7B93DB` (steel blue)
  - Text: `#B8C8F0` (ice blue)
  - Profé suggestions: `#C77DBA` (violet, shared with main app)
- Contains scrollable list of SearchCard components
- Shows result count in header

### 3. Search Card

Each card in the results panel displays:
- Title and snippet
- Source domain
- "Drag to Canvas" affordance (cursor: grab)
- "Visit Source" link → opens embedded source browser

**Context Search cards** additionally show:
- Purple Profé accent indicator
- Relevance explanation (why this matters)
- Suggested location (where it should go in the document)

**Card lifecycle:**
1. **In panel** — card lives in the floating results panel
2. **Dragged to canvas** — becomes a **pinned card** (a styled placeholder block on the canvas, visually distinct with cool blue border)
3. **Extract** — user clicks Extract on a pinned card. Profé reads the card content + surrounding canvas context, transforms the information per the user's extraction style preference (configured in Settings), and replaces the card with proper document content

**Pinned card on canvas shows:**
- Title + condensed snippet
- Source URL (clickable → embedded browser)
- Extract button
- Visit Source button
- Remove button
- Draggable to reposition

### 4. Source Browser (Embedded Viewer)

When user clicks "Visit Source" on any card:
- Opens as a **navigation view** inside the workspace (replaces canvas temporarily, like navigating to a new page)
- Shows a toolbar with: back/forward buttons, URL display, "Sandboxed" security badge, "Back to Canvas" button
- Content loads in a sandboxed iframe
- Falls back to "Open in new tab" if the site blocks iframing

## Security — Iframe Guardrails

Iframes are an attack vector. The embedded source browser implements these protections:

### Sandbox Restrictions
```html
<iframe
  sandbox="allow-scripts allow-same-origin"
  referrerpolicy="no-referrer"
  loading="lazy"
>
```
- `allow-scripts` — needed for most sites to render
- `allow-same-origin` — needed for sites that check origin
- **Blocked:** `allow-forms`, `allow-popups`, `allow-top-navigation`, `allow-modals`

### URL Validation
- HTTPS only — reject all HTTP URLs
- Run through `sanitizeUrl()` before loading
- Block dangerous schemes: `javascript:`, `data:`, `blob:`, `file:`
- Validate URL structure (must be a valid URL with a real domain)

### CSP Headers
- Update `next.config.js` to add `frame-src` directive
- Whitelist known safe domains or use `frame-src https:` to allow all HTTPS sources
- Set `frame-ancestors 'none'` to prevent 60 Watts itself from being iframed

### Privacy
- `referrerpolicy="no-referrer"` — don't leak workspace URLs to external sites
- No cookies sent to iframed sites
- Iframe has no access to parent window state

### Fallback Handling
- Detect X-Frame-Options / CSP `frame-ancestors` blocking (via `onload`/`onerror` detection)
- Show graceful message: "This site can't be embedded. Open in a new tab?"
- Loading timeout of 10 seconds before showing fallback

## Settings

New section in the Settings panel — **Context Search**:

| Setting | Type | Description |
|---------|------|-------------|
| Search Agent ID | text input | LaunchLemonade agent ID for Perplexity search (masked like existing API key field) |
| Extraction Style | toggle | "Light Touch" (clean up, format to match doc style) vs "Full Rewrite" (rewrite in user's voice to blend seamlessly) |
| Source Browser | toggle | "Embedded" (default, sandboxed iframe) vs "External" (open in new browser tab) |

These sit alongside the existing LaunchLemonade API key and chat agent ID fields.

## New Files

### API Routes (2 new)
- `src/app/api/search/route.ts` — Go mode endpoint
- `src/app/api/context-search/route.ts` — Context Search endpoint

### Components (4 new)
- `src/components/SearchBar.tsx` — centered nav search input with Go + Context Search buttons
- `src/components/SearchResultsPanel.tsx` — floating, draggable, minimizable results panel
- `src/components/SearchCard.tsx` — individual result card (in-panel and pinned-on-canvas states)
- `src/components/SourceBrowser.tsx` — sandboxed iframe viewer with toolbar and security controls

### Modified Files
- `src/components/AppInner.tsx` — add SearchBar to nav, manage search/card state, handle card placement on canvas
- `src/app/api/` settings handling — add search agent ID, extraction style, source browser preference
- `next.config.js` — update CSP headers for `frame-src`

### No New Dependencies
- Dragging reuses existing `useDrag` hook
- Iframe is native browser API
- LaunchLemonade client already exists
- URL sanitization uses existing `sanitizeUrl()` helper

## Edge Cases

- **Empty canvas on Context Search:** If the canvas is blank and KB is empty, show a message: "Nothing to analyze yet. Try adding some content first, or use Go to search manually."
- **Search agent not configured:** If `ll_search_agent_id` is not set in Settings, disable both search buttons and show a tooltip: "Configure your Search Agent ID in Settings."
- **Rate limiting:** Debounce Go searches (300ms). Disable Context Search button during processing with a loading indicator.
- **Large canvas context:** Truncate canvas content sent to `/api/context-search` to a reasonable token limit (e.g., last 20 blocks or ~4000 characters) to avoid excessive API costs.
- **Card persistence:** Pinned cards on the canvas are stored as canvas blocks with `type: "search_card"` and the full SearchCard data in the block's content field. They persist across sessions.
- **Multiple search panels:** Only one floating results panel at a time. A new search replaces the previous results.
- **Extract routing:** The Extract action sends the card content + surrounding canvas context to `/api/chat` (existing Profé route) with a system prompt that includes the user's extraction style preference. No new route needed.
- **LaunchLemonade API errors:** If the LaunchLemonade API returns an error or times out, show an inline error message in the results panel (e.g., "Search failed — check your connection and API key"). Do not use disruptive modals.
- **`search_card` block rendering:** AppInner's canvas rendering logic needs a new branch for `type: "search_card"` blocks. These blocks participate in normal block ordering but are visually distinct and support Extract/Remove/Visit Source actions instead of text editing. They are excluded from document export.
